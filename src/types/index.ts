import { z } from 'zod';

// LLM Provider Types
export const LLMProviderSchema = z.enum(['openai', 'anthropic', 'google']);
export type LLMProvider = z.infer<typeof LLMProviderSchema>;

// Configuration Schema
export const ConfigSchema = z.object({
  llmProvider: LLMProviderSchema,
  apiKey: z.string().min(1, 'API key is required'),
  model: z.string().min(1, 'Model name is required'),
  mcpTimeoutMs: z.number().positive().default(30000),
});
export type Config = z.infer<typeof ConfigSchema>;

// MCP Server Configuration (Standard Format)
export const McpServerConfigSchema = z.object({
  // Standard MCP fields
  type: z.enum(['stdio', 'sse']).default('stdio'), // 'http' removed as it's typically 'sse'
  command: z.string().optional(), // Optional for SSE servers
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  url: z.string().optional(), // Required for SSE servers
  
  // Additional standard fields
  disabled: z.boolean().optional().default(false),
  timeout: z.number().positive().optional().default(60),
  autoApprove: z.array(z.string()).optional().default([]),
});
export type McpServerConfig = z.infer<typeof McpServerConfigSchema>;

// Standard MCP Servers configuration
export const McpServersConfigSchema = z.object({
  mcpServers: z.record(z.string(), McpServerConfigSchema),
});
export type McpServersConfig = z.infer<typeof McpServersConfigSchema>;

// Internal server representation (with name)
export const McpServerWithNameSchema = McpServerConfigSchema.extend({
  name: z.string(),
});
export type McpServerWithName = z.infer<typeof McpServerWithNameSchema>;

// Tool and Resource Types
export interface McpTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

export interface McpResource {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

// Conversation Message Types
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  toolCallId: string;
  content: string;
  isError?: boolean;
}

// MCP Operations
export interface McpToolCallRequest {
  serverName: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

export interface McpResourceRequest {
  serverName: string;
  uri: string;
}

export interface McpToolResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface McpResourceResponse {
  contents: Array<{
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  }>;
}