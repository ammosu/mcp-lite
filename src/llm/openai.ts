import OpenAI from 'openai';
import { BaseLLM, LLMResponse } from './base.js';
import { Message, ToolCall, McpTool } from '../types/index.js';

export class OpenAIProvider extends BaseLLM {
  private client: OpenAI;

  constructor(apiKey: string, model: string = 'gpt-4o-mini') {
    super(apiKey, model);
    this.client = new OpenAI({ apiKey });
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
    const openaiMessages = this.convertMessages(messages);
    const openaiTools = tools ? this.formatToolsForProvider(tools) : undefined;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: openaiMessages,
      tools: openaiTools as OpenAI.Chat.ChatCompletionTool[],
      tool_choice: tools && tools.length > 0 ? 'auto' : undefined,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2000,
    });

    const choice = response.choices[0];
    if (!choice) {
      throw new Error('No response from OpenAI');
    }

    const toolCalls = choice.message.tool_calls?.map((call): ToolCall => ({
      id: call.id,
      type: 'function',
      function: {
        name: call.function.name,
        arguments: call.function.arguments,
      },
    }));

    return {
      content: choice.message.content || '',
      toolCalls,
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined,
    };
  }

  private convertMessages(messages: Message[]): OpenAI.Chat.ChatCompletionMessageParam[] {
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    for (const message of messages) {
      if (message.role === 'user' || message.role === 'system') {
        openaiMessages.push({
          role: message.role,
          content: message.content,
        });
      } else if (message.role === 'assistant') {
        openaiMessages.push({
          role: 'assistant',
          content: message.content,
          tool_calls: message.toolCalls?.map(call => ({
            id: call.id,
            type: 'function',
            function: {
              name: call.function.name,
              arguments: call.function.arguments,
            },
          })),
        });

        // Add tool results as separate messages
        if (message.toolResults) {
          for (const result of message.toolResults) {
            openaiMessages.push({
              role: 'tool',
              tool_call_id: result.toolCallId,
              content: result.content,
            });
          }
        }
      }
    }

    return openaiMessages;
  }
}