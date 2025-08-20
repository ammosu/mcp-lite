import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { CallToolResultSchema, ListToolsResultSchema, ListResourcesResultSchema, ReadResourceResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { spawn, ChildProcess } from 'child_process';
import {
  McpServerWithName,
  McpTool,
  McpResource,
  McpToolCallRequest,
  McpResourceRequest,
  McpToolResponse,
  McpResourceResponse,
} from '../types/index.js';

interface McpConnection {
  config: McpServerWithName;
  client: Client;
  transport: StdioClientTransport | SSEClientTransport;
  process?: ChildProcess;
  connected: boolean;
  tools: McpTool[];
  resources: McpResource[];
}

export class McpHub {
  private connections = new Map<string, McpConnection>();
  private timeoutMs: number;

  constructor(timeoutMs: number = 30000) {
    this.timeoutMs = timeoutMs;
  }

  async addServer(config: McpServerWithName): Promise<void> {
    if (this.connections.has(config.name)) {
      await this.removeServer(config.name);
    }

    const connection = await this.createConnection(config);
    this.connections.set(config.name, connection);

    console.log(`✅ Connected to MCP server: ${config.name}`);
    console.log(`   Tools: ${connection.tools.map(t => t.name).join(', ') || 'none'}`);
    console.log(`   Resources: ${connection.resources.map(r => r.uri).join(', ') || 'none'}`);
  }

  async removeServer(name: string): Promise<void> {
    const connection = this.connections.get(name);
    if (!connection) return;

    await this.disconnectConnection(connection);
    this.connections.delete(name);
    console.log(`🔌 Disconnected from MCP server: ${name}`);
  }

  getServerNames(): string[] {
    return Array.from(this.connections.keys());
  }

  getAvailableTools(): McpTool[] {
    const tools: McpTool[] = [];
    for (const connection of this.connections.values()) {
      if (connection.connected) {
        tools.push(...connection.tools);
      }
    }
    return tools;
  }

  getAvailableResources(): McpResource[] {
    const resources: McpResource[] = [];
    for (const connection of this.connections.values()) {
      if (connection.connected) {
        resources.push(...connection.resources);
      }
    }
    return resources;
  }

  async callTool(request: McpToolCallRequest): Promise<McpToolResponse> {
    const connection = this.connections.get(request.serverName);
    if (!connection || !connection.connected) {
      throw new Error(`Server ${request.serverName} not connected`);
    }

    const tool = connection.tools.find(t => t.name === request.toolName);
    if (!tool) {
      throw new Error(`Tool ${request.toolName} not found on server ${request.serverName}`);
    }

    try {
      const result = await connection.client.request(
        {
          method: 'tools/call',
          params: {
            name: request.toolName,
            arguments: request.arguments,
          },
        },
        CallToolResultSchema
      );

      return {
        content: (result as any).content || [],
        isError: (result as any).isError || false,
      };
    } catch (error) {
      throw new Error(`Failed to call tool ${request.toolName}: ${error}`);
    }
  }

  async readResource(request: McpResourceRequest): Promise<McpResourceResponse> {
    const connection = this.connections.get(request.serverName);
    if (!connection || !connection.connected) {
      throw new Error(`Server ${request.serverName} not connected`);
    }

    try {
      const result = await connection.client.request(
        {
          method: 'resources/read',
          params: {
            uri: request.uri,
          },
        },
        ReadResourceResultSchema
      );

      return {
        contents: (result as any).contents || [],
      };
    } catch (error) {
      throw new Error(`Failed to read resource ${request.uri}: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    const promises = Array.from(this.connections.values()).map(connection =>
      this.disconnectConnection(connection)
    );
    await Promise.all(promises);
    this.connections.clear();
  }

  private async createConnection(config: McpServerWithName): Promise<McpConnection> {
    let process: ChildProcess | undefined;
    let transport: StdioClientTransport | SSEClientTransport;

    if (config.type === 'stdio') {
      if (!config.command) {
        throw new Error('STDIO transport requires a command');
      }
      transport = new StdioClientTransport({
        command: config.command,
        args: config.args || [],
        env: config.env,
      });
    } else if (config.type === 'sse') {
      if (!config.url) {
        throw new Error('SSE transport requires a URL in the config');
      }

      transport = new SSEClientTransport(new URL(config.url));
    } else {
      throw new Error(`Unknown transport type: ${config.type}`);
    }

    const client = new Client({
      name: 'mcp-lite',
      version: '1.0.0',
    }, {
      capabilities: {
        resources: {},
        tools: {},
      },
    });

    await client.connect(transport);

    // Get available tools and resources
    const [toolsResult, resourcesResult] = await Promise.all([
      client.request({ method: 'tools/list' }, ListToolsResultSchema),
      client.request({ method: 'resources/list' }, ListResourcesResultSchema)
        .catch(() => ({ resources: [] })), // Resources are optional
    ]);

    const tools: McpTool[] = (toolsResult as any).tools?.map((tool: any) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })) || [];

    const resources: McpResource[] = (resourcesResult as any).resources?.map((resource: any) => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType,
    })) || [];

    return {
      config,
      client,
      transport,
      process,
      connected: true,
      tools,
      resources,
    };
  }

  private async disconnectConnection(connection: McpConnection): Promise<void> {
    try {
      await connection.client.close();
    } catch (error) {
      console.error('Error closing client:', error);
    }

    if (connection.process && !connection.process.killed) {
      connection.process.kill();
    }

    connection.connected = false;
  }
}