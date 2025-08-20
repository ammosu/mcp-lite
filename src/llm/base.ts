import { Message, ToolCall, McpTool } from '../types/index.js';

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export abstract class BaseLLM {
  protected apiKey: string;
  protected model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  abstract chat(
    messages: Message[],
    tools?: McpTool[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    }
  ): Promise<LLMResponse>;

  protected formatToolsForProvider(tools: McpTool[]): unknown[] {
    // Default implementation - each provider should override this
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description || '',
        parameters: tool.inputSchema,
      },
    }));
  }

  protected generateToolCallId(): string {
    return `call_${Math.random().toString(36).substring(2, 15)}`;
  }
}