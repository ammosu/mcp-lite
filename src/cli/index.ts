import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { ConfigManager } from '../config/manager.js';
import { McpHub } from '../mcp/hub.js';
import { LLMFactory } from '../llm/factory.js';
import { ChatEngine } from '../chat/engine.js';
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
      } else if (server.type === 'sse') {
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
    } else {
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
    }

    await this.configManager.addMcpServer(server);
    console.log(chalk.green(`✅ Added ${server.type.toUpperCase()} server: ${server.name}`));
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