import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { ConfigManager } from '../config/manager.js';
import { McpHub } from '../mcp/hub.js';
import { LLMFactory } from '../llm/factory.js';
import { ChatEngine } from '../chat/engine.js';
import { WebServer } from '../web/server.js';
import { BatchProcessor } from '../batch/processor.js';
import { McpServerWithName } from '../types/index.js';

export class CLI {
  private configManager: ConfigManager;
  private mcpHub: McpHub;
  private chatEngine?: ChatEngine;

  constructor() {
    this.configManager = new ConfigManager();
    this.mcpHub = new McpHub();
  }

  async run(): Promise<void> {
    const program = new Command();

    program
      .name('mcp-lite')
      .description('A simple MCP host with LLM integration')
      .version('1.0.0');

    program
      .command('chat')
      .description('Start an interactive chat session')
      .option('-t, --temperature <number>', 'Temperature for LLM', '0.7')
      .option('-m, --max-tokens <number>', 'Maximum tokens', '2000')
      .option('--no-auto-tools', 'Disable automatic tool execution')
      .action(this.chatCommand.bind(this));

    program
      .command('web')
      .description('Start web-based chat interface')
      .option('-p, --port <number>', 'Port to run web server on', '3000')
      .action(this.webCommand.bind(this));

    program
      .command('servers')
      .description('Manage MCP servers')
      .action(this.serversCommand.bind(this));

    program
      .command('add-server')
      .description('Add a new MCP server')
      .action(this.addServerCommand.bind(this));

    program
      .command('config')
      .description('Show current configuration')
      .action(this.configCommand.bind(this));

    program
      .command('batch')
      .description('Process questions from CSV file in batch')
      .requiredOption('-i, --input <file>', 'Input CSV file path')
      .requiredOption('-o, --output <file>', 'Output file path')
      .option('-f, --format <format>', 'Output format: csv or json', 'csv')
      .option('-c, --concurrency <number>', 'Max concurrent requests', '1')
      .option('-t, --temperature <number>', 'Temperature for LLM', '0.7')
      .option('-m, --max-tokens <number>', 'Maximum tokens', '2000')
      .option('--no-context', 'Exclude context column from output')
      .option('--stop-on-error', 'Stop processing on first error')
      .action(this.batchCommand.bind(this));

    await program.parseAsync();
  }

  private async chatCommand(options: any): Promise<void> {
    try {
      console.log(chalk.blue('🤖 Initializing MCP Lite...'));

      // Load configuration
      const config = await this.configManager.loadConfig();
      console.log(chalk.green(`📋 Loaded config: ${config.llmProvider} (${config.model})`));

      // Create LLM instance
      const llm = LLMFactory.create(config.llmProvider, config.apiKey, config.model);
      console.log(chalk.green('🧠 LLM initialized'));

      // Load and connect MCP servers
      const mcpServers = await this.configManager.loadMcpServers();
      for (const serverConfig of mcpServers) {
        try {
          await this.mcpHub.addServer(serverConfig);
        } catch (error) {
          console.log(chalk.yellow(`⚠️  Failed to connect to ${serverConfig.name}: ${error}`));
        }
      }

      // Create chat engine
      this.chatEngine = new ChatEngine(llm, this.mcpHub);

      console.log(chalk.green('✅ Ready for chat!'));
      console.log(chalk.gray('Type "exit" to quit, "help" for commands'));
      console.log();

      // Interactive chat loop
      while (true) {
        const { input } = await inquirer.prompt({
          type: 'input',
          name: 'input',
          message: chalk.blue('You:'),
        });

        if (input.toLowerCase() === 'exit') {
          break;
        }

        if (input.toLowerCase() === 'help') {
          this.showChatHelp();
          continue;
        }

        if (input.toLowerCase() === 'tools') {
          this.showAvailableTools();
          continue;
        }

        if (input.toLowerCase() === 'clear') {
          this.chatEngine.clearMessages();
          console.log(chalk.green('🧹 Chat history cleared'));
          continue;
        }

        try {
          console.log(chalk.yellow('🤔 Thinking...'));
          const response = await this.chatEngine.chat(input, {
            temperature: parseFloat(options.temperature),
            maxTokens: parseInt(options.maxTokens),
            autoExecuteTools: options.autoTools,
          });

          console.log(chalk.green('🤖 Assistant:'), response);
          console.log();
        } catch (error) {
          console.log(chalk.red('❌ Error:'), error instanceof Error ? error.message : String(error));
          console.log();
        }
      }

      await this.mcpHub.disconnect();
      console.log(chalk.blue('👋 Goodbye!'));

    } catch (error) {
      console.error(chalk.red('❌ Failed to start chat:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async serversCommand(): Promise<void> {
    const servers = await this.configManager.loadMcpServers();
    
    if (servers.length === 0) {
      console.log(chalk.yellow('📭 No MCP servers configured'));
      return;
    }

    console.log(chalk.blue('📡 Configured MCP Servers:'));
    for (const server of servers) {
      console.log(`  ${chalk.green('●')} ${chalk.bold(server.name)}`);
      console.log(`    Transport: ${server.type.toUpperCase()}`);
      console.log(`    Disabled: ${server.disabled ? 'Yes' : 'No'}`);
      console.log(`    Timeout: ${server.timeout}s`);
      
      if (server.type === 'stdio') {
        console.log(`    Command: ${server.command} ${server.args?.join(' ') || ''}`);
      } else if (server.type === 'sse' || server.type === 'http') {
        console.log(`    URL: ${server.url}`);
      }
      console.log();
    }
  }

  private async addServerCommand(): Promise<void> {
    const transportAnswer = await inquirer.prompt([
      {
        type: 'list',
        name: 'transport',
        message: 'Choose transport type:',
        choices: [
          { name: 'STDIO (Local process)', value: 'stdio' },
          { name: 'SSE (Server-Sent Events)', value: 'sse' },
          { name: 'HTTP (Streamable HTTP)', value: 'http' },
        ],
      },
    ]);

    let server: McpServerWithName;

    if (transportAnswer.transport === 'stdio') {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Server name:',
          validate: (input) => input.trim().length > 0 || 'Name is required',
        },
        {
          type: 'input',
          name: 'command',
          message: 'Command to run:',
          validate: (input) => input.trim().length > 0 || 'Command is required',
        },
        {
          type: 'input',
          name: 'args',
          message: 'Arguments (space-separated):',
          default: '',
        },
      ]);

      server = {
        name: answers.name.trim(),
        type: 'stdio',
        command: answers.command.trim(),
        args: answers.args.trim() ? answers.args.trim().split(/\\s+/) : [],
        disabled: false,
        timeout: 60,
        autoApprove: [],
      };
    } else if (transportAnswer.transport === 'sse') {
      // SSE transport
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Server name:',
          validate: (input) => input.trim().length > 0 || 'Name is required',
        },
        {
          type: 'input',
          name: 'url',
          message: 'SSE endpoint URL:',
          validate: (input) => {
            try {
              new URL(input.trim());
              return true;
            } catch {
              return 'Please enter a valid URL';
            }
          },
        },
      ]);

      server = {
        name: answers.name.trim(),
        type: 'sse',
        url: answers.url.trim(),
        disabled: false,
        timeout: 60,
        autoApprove: [],
      };
    } else {
      // HTTP transport
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Server name:',
          validate: (input) => input.trim().length > 0 || 'Name is required',
        },
        {
          type: 'input',
          name: 'url',
          message: 'HTTP endpoint URL:',
          validate: (input) => {
            try {
              new URL(input.trim());
              return true;
            } catch {
              return 'Please enter a valid URL';
            }
          },
        },
      ]);

      server = {
        name: answers.name.trim(),
        type: 'http',
        url: answers.url.trim(),
        disabled: false,
        timeout: 60,
        autoApprove: [],
      };
    }

    await this.configManager.addMcpServer(server);
    console.log(chalk.green(`✅ Added ${server.type.toUpperCase()} server: ${server.name}`));
  }

  private async webCommand(options: any): Promise<void> {
    try {
      const port = parseInt(options.port);
      
      console.log(chalk.blue(`🌐 Starting MCP Lite Web Server on port ${port}...`));
      
      const webServer = new WebServer(port);
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n🛑 Shutting down web server...'));
        await webServer.stop();
        console.log(chalk.green('👋 Goodbye!'));
        process.exit(0);
      });

      await webServer.start();

    } catch (error) {
      console.error(chalk.red('❌ Failed to start web server:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async configCommand(): Promise<void> {
    try {
      const config = await this.configManager.loadConfig();
      console.log(chalk.blue('⚙️  Current Configuration:'));
      console.log(`  LLM Provider: ${chalk.green(config.llmProvider)}`);
      console.log(`  Model: ${chalk.green(config.model)}`);
      console.log(`  API Key: ${chalk.green(config.apiKey ? '***' + config.apiKey.slice(-4) : 'Not set')}`);
      console.log(`  MCP Timeout: ${chalk.green(config.mcpTimeoutMs + 'ms')}`);
      console.log(`  Config Dir: ${chalk.gray(this.configManager.getConfigDir())}`);
    } catch (error) {
      console.error(chalk.red('❌ Failed to load config:'), error instanceof Error ? error.message : String(error));
    }
  }

  private async batchCommand(options: any): Promise<void> {
    try {
      console.log(chalk.blue('🚀 Initializing MCP Lite for batch processing...'));

      // Validate input file
      try {
        const fs = await import('fs/promises');
        await fs.access(options.input);
      } catch (error) {
        console.error(chalk.red('❌ Input file not found:'), options.input);
        process.exit(1);
      }

      // Validate output format
      if (options.format !== 'csv' && options.format !== 'json') {
        console.error(chalk.red('❌ Invalid format:'), options.format, '(must be csv or json)');
        process.exit(1);
      }

      // Load configuration
      const config = await this.configManager.loadConfig();
      console.log(chalk.green(`📋 Loaded config: ${config.llmProvider} (${config.model})`));

      // Create LLM instance
      const llm = LLMFactory.create(config.llmProvider, config.apiKey, config.model);
      console.log(chalk.green('🧠 LLM initialized'));

      // Load and connect MCP servers
      const mcpServers = await this.configManager.loadMcpServers();
      let connectedServers = 0;
      
      for (const serverConfig of mcpServers) {
        try {
          await this.mcpHub.addServer(serverConfig);
          connectedServers++;
          console.log(chalk.green(`✅ Connected to ${serverConfig.name}`));
        } catch (error) {
          console.log(chalk.yellow(`⚠️  Failed to connect to ${serverConfig.name}: ${error}`));
        }
      }

      if (connectedServers === 0) {
        console.log(chalk.yellow('⚠️  No MCP servers connected. Continuing with LLM-only processing.'));
      } else {
        console.log(chalk.green(`🔗 Connected to ${connectedServers} MCP server(s)`));
      }

      // Create chat engine and batch processor
      const chatEngine = new ChatEngine(llm, this.mcpHub);
      const batchProcessor = new BatchProcessor(chatEngine);

      console.log(chalk.green('✅ Batch processor ready!'));
      console.log();

      // Process batch
      const batchOptions = {
        maxConcurrency: parseInt(options.concurrency),
        temperature: parseFloat(options.temperature),
        maxTokens: parseInt(options.maxTokens),
        autoExecuteTools: true,
        outputFormat: options.format as 'csv' | 'json',
        includeContext: !options.noContext,
        continueOnError: !options.stopOnError,
      };

      console.log(chalk.blue('📊 Batch processing options:'));
      console.log(`  Input: ${chalk.cyan(options.input)}`);
      console.log(`  Output: ${chalk.cyan(options.output)}`);
      console.log(`  Format: ${chalk.cyan(options.format)}`);
      console.log(`  Concurrency: ${chalk.cyan(batchOptions.maxConcurrency)}`);
      console.log(`  Temperature: ${chalk.cyan(batchOptions.temperature)}`);
      console.log(`  Max Tokens: ${chalk.cyan(batchOptions.maxTokens)}`);
      console.log(`  Include Context: ${chalk.cyan(batchOptions.includeContext)}`);
      console.log(`  Continue on Error: ${chalk.cyan(batchOptions.continueOnError)}`);
      console.log();

      // Start processing
      await batchProcessor.processFromFile(
        options.input,
        options.output,
        batchOptions
      );

      // Disconnect from MCP servers
      await this.mcpHub.disconnect();
      console.log(chalk.green('\n🎯 Batch processing completed successfully!'));

    } catch (error) {
      console.error(chalk.red('❌ Batch processing failed:'), error instanceof Error ? error.message : String(error));
      
      // Cleanup
      try {
        await this.mcpHub.disconnect();
      } catch (cleanupError) {
        console.error(chalk.gray('Warning: Failed to cleanup MCP connections'));
      }
      
      process.exit(1);
    }
  }

  private showChatHelp(): void {
    console.log(chalk.blue('💡 Available commands:'));
    console.log('  help   - Show this help');
    console.log('  tools  - Show available MCP tools');
    console.log('  clear  - Clear chat history');
    console.log('  exit   - Exit chat');
    console.log();
  }

  private showAvailableTools(): void {
    const tools = this.mcpHub.getAvailableTools();
    const resources = this.mcpHub.getAvailableResources();

    console.log(chalk.blue('🔧 Available Tools:'));
    if (tools.length === 0) {
      console.log(chalk.gray('  No tools available'));
    } else {
      for (const tool of tools) {
        console.log(`  ${chalk.green('●')} ${chalk.bold(tool.name)}`);
        if (tool.description) {
          console.log(`    ${chalk.gray(tool.description)}`);
        }
      }
    }

    console.log();
    console.log(chalk.blue('📁 Available Resources:'));
    if (resources.length === 0) {
      console.log(chalk.gray('  No resources available'));
    } else {
      for (const resource of resources) {
        console.log(`  ${chalk.green('●')} ${chalk.bold(resource.uri)}`);
        if (resource.description) {
          console.log(`    ${chalk.gray(resource.description)}`);
        }
      }
    }
    console.log();
  }
}