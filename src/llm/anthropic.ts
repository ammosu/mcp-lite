import Anthropic from '@anthropic-ai/sdk';
import { BaseLLM, LLMResponse } from './base.js';
import { Message, ToolCall, McpTool } from '../types/index.js';

export class AnthropicProvider extends BaseLLM {
  private client: Anthropic;

  constructor(apiKey: string, model: string = 'claude-3-5-sonnet-20241022') {
    super(apiKey, model);
    this.client = new Anthropic({ apiKey });
  }

  async chat(
    messages: Message[],
    tools?: McpTool[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    }
  ): Promise<LLMResponse> {
    const { systemMessage, anthropicMessages } = this.convertMessages(messages);
    const anthropicTools = tools ? this.formatToolsForProvider(tools) : undefined;

    const response = await this.client.messages.create({
      model: this.model,
      messages: anthropicMessages,
      system: systemMessage,
      tools: anthropicTools as Anthropic.Tool[],
      max_tokens: options?.maxTokens ?? 2000,
      temperature: options?.temperature ?? 0.7,
    });

    let content = '';
    const toolCalls: ToolCall[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          type: 'function',
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input),
          },
        });
      }
    }

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: response.usage ? {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      } : undefined,
    };
  }

  private convertMessages(messages: Message[]): {
    systemMessage?: string;
    anthropicMessages: Anthropic.MessageParam[];
  } {
    let systemMessage: string | undefined;
    const anthropicMessages: Anthropic.MessageParam[] = [];

    for (const message of messages) {
      if (message.role === 'system') {
        systemMessage = message.content;
      } else if (message.role === 'user') {
        anthropicMessages.push({
          role: 'user',
          content: message.content,
        });
      } else if (message.role === 'assistant') {
        const content: (Anthropic.TextBlock | Anthropic.ToolUseBlock)[] = [];

        if (message.content) {
          content.push({
            type: 'text',
            text: message.content,
            citations: [],
          });
        }

        if (message.toolCalls) {
          for (const call of message.toolCalls) {
            content.push({
              type: 'tool_use',
              id: call.id,
              name: call.function.name,
              input: JSON.parse(call.function.arguments),
            });
          }
        }

        anthropicMessages.push({
          role: 'assistant',
          content,
        });

        // Add tool results as user messages
        if (message.toolResults) {
          const toolResultContent: Anthropic.ToolResultBlockParam[] = [];
          for (const result of message.toolResults) {
            toolResultContent.push({
              type: 'tool_result',
              tool_use_id: result.toolCallId,
              content: result.content,
              is_error: result.isError,
            });
          }

          if (toolResultContent.length > 0) {
            anthropicMessages.push({
              role: 'user',
              content: toolResultContent,
            });
          }
        }
      }
    }

    return { systemMessage, anthropicMessages };
  }

  protected formatToolsForProvider(tools: McpTool[]): Anthropic.Tool[] {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description || '',
      input_schema: {
        type: 'object',
        ...tool.inputSchema,
      } as Anthropic.Tool.InputSchema,
    }));
  }
}