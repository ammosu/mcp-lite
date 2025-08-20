import { BaseLLM } from '../llm/base.js';
import { McpHub } from '../mcp/hub.js';
import {
  Message,
  ToolCall,
  ToolResult,
  McpToolCallRequest,
  McpResourceRequest,
} from '../types/index.js';

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  maxTurns?: number;
  autoExecuteTools?: boolean;
  onToolExecution?: (info: ToolExecutionInfo) => void;
}

export interface ToolExecutionInfo {
  type: 'tool_start' | 'tool_complete' | 'tool_error';
  toolName?: string;
  toolCallId?: string;
  message: string;
  input?: string;
  output?: string;
}

export class ChatEngine {
  private llm: BaseLLM;
  private mcpHub: McpHub;
  private messages: Message[] = [];

  constructor(llm: BaseLLM, mcpHub: McpHub) {
    this.llm = llm;
    this.mcpHub = mcpHub;
  }

  async addMessage(content: string, role: 'user' | 'system' = 'user'): Promise<void> {
    this.messages.push({
      role,
      content,
    });
  }

  async chat(userInput: string, options: ChatOptions = {}): Promise<string> {
    const {
      temperature = 0.7,
      maxTokens = 2000,
      maxTurns = 10,
      autoExecuteTools = true,
    } = options;

    // Add user message
    this.messages.push({
      role: 'user',
      content: userInput,
    });

    let turnCount = 0;
    let finalResponse = '';

    while (turnCount < maxTurns) {
      turnCount++;

      // Get available tools from MCP servers
      const availableTools = this.mcpHub.getAvailableTools();

      // Call LLM
      const response = await this.llm.chat(this.messages, availableTools, {
        temperature,
        maxTokens,
      });

      // Create assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.content,
        toolCalls: response.toolCalls,
      };

      finalResponse = response.content;

      // If no tool calls, we're done
      if (!response.toolCalls || response.toolCalls.length === 0) {
        this.messages.push(assistantMessage);
        break;
      }

      // Execute tool calls if auto-execution is enabled
      if (autoExecuteTools) {
        // Notify about tool execution start
        if (options.onToolExecution) {
          options.onToolExecution({
            type: 'tool_start',
            message: `🔧 Executing ${response.toolCalls.length} tool(s)...`
          });
        }

        const toolResults = await this.executeToolCalls(response.toolCalls, options.onToolExecution);
        assistantMessage.toolResults = toolResults;

        // Add assistant message with tool results
        this.messages.push(assistantMessage);

        // Notify about completion
        if (options.onToolExecution) {
          const successCount = toolResults.filter(r => !r.isError).length;
          const errorCount = toolResults.filter(r => r.isError).length;
          options.onToolExecution({
            type: 'tool_complete',
            message: `✅ Completed ${successCount} tool(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`
          });
        }

        // Continue the conversation with tool results
        console.log(`🔧 Executed ${toolResults.length} tool(s)`);
        for (const result of toolResults) {
          console.log(`   ${result.toolCallId}: ${result.isError ? '❌' : '✅'}`);
        }
      } else {
        // Manual tool execution mode
        this.messages.push(assistantMessage);
        console.log('\n🔧 Tool calls requested:');
        for (const call of response.toolCalls) {
          console.log(`   ${call.function.name}: ${call.function.arguments}`);
        }
        break;
      }
    }

    if (turnCount >= maxTurns) {
      console.log(`⚠️  Reached maximum turns (${maxTurns})`);
    }

    return finalResponse;
  }

  private async executeToolCalls(toolCalls: ToolCall[], onToolExecution?: (info: ToolExecutionInfo) => void): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const toolCall of toolCalls) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        
        // Notify about individual tool execution with input
        if (onToolExecution) {
          onToolExecution({
            type: 'tool_start',
            toolName: toolCall.function.name,
            toolCallId: toolCall.id,
            message: `   ${toolCall.function.name}: Starting...`,
            input: JSON.stringify(args, null, 2)
          });
        }

        const result = await this.executeToolCall(toolCall.function.name, args);
        
        results.push({
          toolCallId: toolCall.id,
          content: result,
          isError: false,
        });

        // Notify about successful completion with output
        if (onToolExecution) {
          onToolExecution({
            type: 'tool_complete',
            toolName: toolCall.function.name,
            toolCallId: toolCall.id,
            message: `   ${toolCall.id}: ✅`,
            output: result
          });
        }
      } catch (error) {
        results.push({
          toolCallId: toolCall.id,
          content: `Error: ${error instanceof Error ? error.message : String(error)}`,
          isError: true,
        });

        // Notify about error
        if (onToolExecution) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          onToolExecution({
            type: 'tool_error',
            toolName: toolCall.function.name,
            toolCallId: toolCall.id,
            message: `   ${toolCall.id}: ❌ ${errorMessage}`,
            input: toolCall.function.arguments,
            output: `Error: ${errorMessage}`
          });
        }
      }
    }

    return results;
  }

  private async executeToolCall(toolName: string, args: Record<string, unknown>): Promise<string> {
    // Find which server has this tool
    const availableTools = this.mcpHub.getAvailableTools();
    const tool = availableTools.find(t => t.name === toolName);
    
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    // Find the server that provides this tool
    const serverNames = this.mcpHub.getServerNames();
    let serverName: string | undefined;

    for (const name of serverNames) {
      // This is a simplification - in a real implementation, you'd track which server provides which tool
      try {
        const request: McpToolCallRequest = {
          serverName: name,
          toolName,
          arguments: args,
        };
        
        const result = await this.mcpHub.callTool(request);
        
        // Format the response
        return result.content
          .map(item => {
            if (item.type === 'text' && item.text) {
              return item.text;
            }
            return `[${item.type}]`;
          })
          .join('\n') || 'Tool executed successfully';
          
      } catch (error) {
        // Try next server
        continue;
      }
    }

    throw new Error(`No server could execute tool ${toolName}`);
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  clearMessages(): void {
    this.messages = [];
  }

  async executeToolManually(toolCallId: string, result: string, isError: boolean = false): Promise<void> {
    // Find the last assistant message with tool calls
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const message = this.messages[i];
      if (message.role === 'assistant' && message.toolCalls) {
        const toolCall = message.toolCalls.find(call => call.id === toolCallId);
        if (toolCall) {
          if (!message.toolResults) {
            message.toolResults = [];
          }
          message.toolResults.push({
            toolCallId,
            content: result,
            isError,
          });
          return;
        }
      }
    }
    throw new Error(`Tool call ${toolCallId} not found`);
  }
}