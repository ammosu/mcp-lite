import express, { Request, Response } from 'express';
import cors from 'cors';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConfigManager } from '../config/manager.js';
import { McpHub } from '../mcp/hub.js';
import { LLMFactory } from '../llm/factory.js';
import { ChatEngine } from '../chat/engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  response: string;
  sessionId: string;
  error?: string;
}

export interface CommandResponse {
  success: boolean;
  data?: any;
  message?: string;
}

export class WebServer {
  private app: express.Application;
  private configManager: ConfigManager;
  private mcpHub: McpHub;
  private chatEngines: Map<string, ChatEngine> = new Map();
  private port: number;

  constructor(port: number = 3000) {
    this.app = express();
    this.configManager = new ConfigManager();
    this.mcpHub = new McpHub();
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    // Serve static files from the public directory
    const publicPath = path.join(__dirname, 'public');
    console.log(`Serving static files from: ${publicPath}`);
    this.app.use(express.static(publicPath));
  }

  private setupRoutes(): void {
    // Serve the chat interface
    this.app.get('/', (req: Request, res: Response) => {
      const indexPath = path.join(__dirname, 'public', 'index.html');
      console.log(`Serving index.html from: ${indexPath}`);
      res.sendFile(indexPath);
    });

    // Chat endpoint
    this.app.post('/api/chat', this.handleChat.bind(this));

    // Streaming chat endpoint
    this.app.post('/api/chat/stream', this.handleStreamChat.bind(this));

    // Commands endpoint
    this.app.post('/api/command', this.handleCommand.bind(this));

    // Tools endpoint
    this.app.get('/api/tools', this.handleGetTools.bind(this));

    // Resources endpoint
    this.app.get('/api/resources', this.handleGetResources.bind(this));

    // Health check
    this.app.get('/api/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
  }

  private async handleChat(req: Request, res: Response): Promise<void> {
    try {
      const { message, sessionId = 'default' }: ChatRequest = req.body;

      if (!message) {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      // Get or create chat engine for this session
      let chatEngine = this.chatEngines.get(sessionId);
      if (!chatEngine) {
        chatEngine = await this.createChatEngine();
        this.chatEngines.set(sessionId, chatEngine);
      }

      // Handle special commands
      if (message.startsWith('/')) {
        const commandResult = await this.handleChatCommand(message, sessionId, chatEngine);
        res.json(commandResult);
        return;
      }

      // Regular chat
      const response = await chatEngine.chat(message);
      
      const chatResponse: ChatResponse = {
        response,
        sessionId
      };

      res.json(chatResponse);
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        sessionId: req.body.sessionId || 'default'
      });
    }
  }

  private async handleStreamChat(req: Request, res: Response): Promise<void> {
    try {
      const { message, sessionId = 'default' }: ChatRequest = req.body;

      if (!message) {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      // Set up SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      });

      // Get or create chat engine for this session
      let chatEngine = this.chatEngines.get(sessionId);
      if (!chatEngine) {
        chatEngine = await this.createChatEngine();
        this.chatEngines.set(sessionId, chatEngine);
      }

      // Handle special commands
      if (message.startsWith('/')) {
        const commandResult = await this.handleChatCommand(message, sessionId, chatEngine);
        res.write(`data: ${JSON.stringify({
          type: 'complete',
          content: commandResult.response,
          sessionId
        })}\n\n`);
        res.end();
        return;
      }

      // Stream the response
      try {
        let fullResponse = '';
        
        // Chat with tool execution callback
        const response = await chatEngine.chat(message, {
          temperature: 0.7,
          maxTokens: 2000,
          autoExecuteTools: true,
          onToolExecution: (info) => {
            // Send tool execution info to frontend
            res.write(`data: ${JSON.stringify({
              type: 'tool_info',
              toolInfo: info,
              sessionId
            })}\n\n`);
          }
        });
        
        fullResponse = response;
        
        // Send response in chunks to simulate streaming
        const words = response.split(' ');
        for (let i = 0; i < words.length; i++) {
          const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
          
          res.write(`data: ${JSON.stringify({
            type: 'chunk',
            content: chunk,
            sessionId
          })}\n\n`);
          
          // Small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Send completion signal
        res.write(`data: ${JSON.stringify({
          type: 'complete',
          content: '',
          sessionId,
          fullContent: fullResponse
        })}\n\n`);
        
      } catch (error) {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Internal server error',
          sessionId
        })}\n\n`);
      }

      res.end();
    } catch (error) {
      console.error('Stream chat error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        sessionId: req.body.sessionId || 'default'
      });
    }
  }

  private async handleChatCommand(command: string, sessionId: string, chatEngine: ChatEngine): Promise<ChatResponse> {
    const cmd = command.toLowerCase().trim();
    
    switch (cmd) {
      case '/help':
        return {
          response: `Available commands:
• /help - Show this help
• /tools - Show available MCP tools
• /clear - Clear chat history
• /status - Show session status

You can also use any available MCP tools by chatting normally!`,
          sessionId
        };

      case '/tools':
        const tools = this.mcpHub.getAvailableTools();
        const toolsList = tools.map(t => `• ${t.name} - ${t.description || 'No description'}`).join('\n');
        return {
          response: `Available MCP Tools:\n${toolsList || 'No tools available'}`,
          sessionId
        };

      case '/clear':
        chatEngine.clearMessages();
        return {
          response: '🧹 Chat history cleared!',
          sessionId
        };

      case '/status':
        const messages = chatEngine.getMessages();
        const resources = this.mcpHub.getAvailableResources();
        return {
          response: `Session Status:
• Messages in history: ${messages.length}
• Available tools: ${this.mcpHub.getAvailableTools().length}
• Available resources: ${resources.length}
• Connected MCP servers: ${this.mcpHub.getServerNames().length}`,
          sessionId
        };

      default:
        return {
          response: `Unknown command: ${command}. Type /help for available commands.`,
          sessionId
        };
    }
  }

  private async handleCommand(req: Request, res: Response): Promise<void> {
    try {
      const { command, sessionId = 'default' } = req.body;
      
      const chatEngine = this.chatEngines.get(sessionId);
      if (!chatEngine) {
        res.status(400).json({ success: false, message: 'No active chat session' });
        return;
      }

      const result = await this.handleChatCommand(command, sessionId, chatEngine);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Internal server error' 
      });
    }
  }

  private async handleGetTools(req: Request, res: Response): Promise<void> {
    try {
      const tools = this.mcpHub.getAvailableTools();
      res.json({ tools });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get tools' });
    }
  }

  private async handleGetResources(req: Request, res: Response): Promise<void> {
    try {
      const resources = this.mcpHub.getAvailableResources();
      res.json({ resources });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get resources' });
    }
  }

  private async createChatEngine(): Promise<ChatEngine> {
    // Load configuration
    const config = await this.configManager.loadConfig();
    
    // Create LLM instance
    const llm = LLMFactory.create(config.llmProvider, config.apiKey, config.model);
    
    // Create chat engine
    return new ChatEngine(llm, this.mcpHub);
  }

  async start(): Promise<void> {
    try {
      console.log(chalk.blue('🌐 Initializing MCP Lite Web Server...'));

      // Load and connect MCP servers
      const mcpServers = await this.configManager.loadMcpServers();
      for (const serverConfig of mcpServers) {
        try {
          await this.mcpHub.addServer(serverConfig);
          console.log(chalk.green(`✅ Connected to MCP server: ${serverConfig.name}`));
        } catch (error) {
          console.log(chalk.yellow(`⚠️  Failed to connect to ${serverConfig.name}: ${error}`));
        }
      }

      // Start the web server
      this.app.listen(this.port, () => {
        console.log(chalk.green(`🚀 MCP Lite Web Server running at http://localhost:${this.port}`));
        console.log(chalk.gray('Press Ctrl+C to stop the server'));
      });

    } catch (error) {
      console.error(chalk.red('❌ Failed to start web server:'), error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    await this.mcpHub.disconnect();
    this.chatEngines.clear();
  }
}