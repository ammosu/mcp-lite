import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { Config, ConfigSchema, McpServerConfig, McpServersConfig, McpServersConfigSchema, McpServerWithName } from '../types/index.js';
import { z } from 'zod';

// Legacy array format schema (for backward compatibility)
const LEGACY_MCP_SERVERS_SCHEMA = z.array(z.object({
  name: z.string(),
  command: z.string(),
  args: z.array(z.string()).default([]),
  env: z.record(z.string()).optional(),
  transport: z.enum(['stdio', 'http', 'sse']).default('stdio'),
  url: z.string().optional(),
}));

export class ConfigManager {
  private configDir: string;
  private configFile: string;
  private mcpServersFile: string;

  constructor() {
    this.configDir = join(homedir(), '.mcp-lite');
    this.configFile = join(this.configDir, 'config.json');
    this.mcpServersFile = join(this.configDir, 'mcp-servers.json');
  }

  async loadConfig(): Promise<Config> {
    // Load from environment variables first
    const config = {
      llmProvider: process.env.LLM_PROVIDER || 'openai',
      apiKey: this.getApiKey(),
      model: this.getModel(),
      mcpTimeoutMs: parseInt(process.env.MCP_TIMEOUT_MS || '30000'),
    };

    return ConfigSchema.parse(config);
  }

  private getApiKey(): string {
    const provider = process.env.LLM_PROVIDER || 'openai';
    
    switch (provider) {
      case 'openai':
        return process.env.OPENAI_API_KEY || '';
      case 'anthropic':
        return process.env.ANTHROPIC_API_KEY || '';
      case 'google':
        return process.env.GOOGLE_API_KEY || '';
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  private getModel(): string {
    const provider = process.env.LLM_PROVIDER || 'openai';
    
    switch (provider) {
      case 'openai':
        return process.env.OPENAI_MODEL || 'gpt-4o-mini';
      case 'anthropic':
        return process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
      case 'google':
        return process.env.GOOGLE_MODEL || 'gemini-1.5-pro';
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  async loadMcpServers(): Promise<McpServerWithName[]> {
    try {
      const content = await readFile(this.mcpServersFile, 'utf-8');
      const data = JSON.parse(content);
      
      // Try to parse as standard format first
      if (data.mcpServers) {
        const standardConfig = McpServersConfigSchema.parse(data);
        return Object.entries(standardConfig.mcpServers).map(([name, config]) => ({
          ...config,
          name,
        }));
      }
      
      // Fall back to legacy array format
      if (Array.isArray(data)) {
        const legacyConfig = LEGACY_MCP_SERVERS_SCHEMA.parse(data);
        return legacyConfig.map(server => ({
          ...server,
          type: server.transport as 'stdio' | 'sse',
          disabled: false,
          timeout: 60,
          autoApprove: [],
        }));
      }
      
      return [];
    } catch (error) {
      // Return empty array if file doesn't exist or is invalid
      return [];
    }
  }

  async saveMcpServers(servers: McpServerWithName[]): Promise<void> {
    await this.ensureConfigDir();
    
    // Convert to standard format
    const mcpServers: Record<string, McpServerConfig> = {};
    for (const server of servers) {
      const { name, ...config } = server;
      mcpServers[name] = config;
    }
    
    const standardConfig: McpServersConfig = { mcpServers };
    const validated = McpServersConfigSchema.parse(standardConfig);
    await writeFile(this.mcpServersFile, JSON.stringify(validated, null, 2));
  }

  async addMcpServer(server: McpServerWithName): Promise<void> {
    const servers = await this.loadMcpServers();
    const existingIndex = servers.findIndex(s => s.name === server.name);
    
    if (existingIndex >= 0) {
      servers[existingIndex] = server;
    } else {
      servers.push(server);
    }
    
    await this.saveMcpServers(servers);
  }

  async removeMcpServer(name: string): Promise<void> {
    const servers = await this.loadMcpServers();
    const filtered = servers.filter(s => s.name !== name);
    await this.saveMcpServers(filtered);
  }

  private async ensureConfigDir(): Promise<void> {
    try {
      await mkdir(this.configDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  getConfigDir(): string {
    return this.configDir;
  }
}