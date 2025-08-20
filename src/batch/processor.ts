import fs from 'fs/promises';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import chalk from 'chalk';
import { ChatEngine } from '../chat/engine.js';
import { ToolExecutionInfo } from '../chat/engine.js';

export interface BatchQuestion {
  id?: string;
  question: string;
  context?: string;
  expectedResult?: string;
}

export interface BatchResult {
  id: string;
  question: string;
  context?: string;
  expectedResult?: string;
  response: string;
  toolCalls: ToolCallRecord[];
  success: boolean;
  error?: string;
  processingTime: number; // in milliseconds
}

export interface ToolCallRecord {
  toolName: string;
  toolCallId: string;
  input: string;
  output: string;
  success: boolean;
  error?: string;
  timestamp: number;
}

export interface BatchOptions {
  maxConcurrency?: number;
  temperature?: number;
  maxTokens?: number;
  autoExecuteTools?: boolean;
  outputFormat?: 'csv' | 'json';
  includeContext?: boolean;
  continueOnError?: boolean;
}

export class BatchProcessor {
  private chatEngine: ChatEngine;
  private results: BatchResult[] = [];
  private currentToolCalls: ToolCallRecord[] = [];

  constructor(chatEngine: ChatEngine) {
    this.chatEngine = chatEngine;
  }

  async processFromFile(
    inputPath: string,
    outputPath: string,
    options: BatchOptions = {}
  ): Promise<BatchResult[]> {
    const {
      maxConcurrency = 1,
      outputFormat = 'csv',
      continueOnError = true,
    } = options;

    console.log(chalk.blue('📊 Loading questions from file...'));
    const questions = await this.loadQuestionsFromFile(inputPath);
    console.log(chalk.green(`✅ Loaded ${questions.length} questions`));

    console.log(chalk.blue('🚀 Starting batch processing...'));
    this.results = [];

    // Process questions with concurrency control
    if (maxConcurrency === 1) {
      // Sequential processing for better visibility
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        console.log(chalk.cyan(`\n🔄 Processing ${i + 1}/${questions.length}: ${question.question.slice(0, 50)}...`));
        
        try {
          const result = await this.processQuestion(question, i + 1);
          this.results.push(result);
          
          if (result.success) {
            console.log(chalk.green(`✅ Completed in ${result.processingTime}ms`));
          } else {
            console.log(chalk.red(`❌ Failed: ${result.error}`));
            if (!continueOnError) {
              console.log(chalk.red('🛑 Stopping due to error (continueOnError=false)'));
              break;
            }
          }
        } catch (error) {
          const errorResult: BatchResult = {
            id: `Q${i + 1}`,
            question: question.question,
            context: question.context,
            expectedResult: question.expectedResult,
            response: '',
            toolCalls: [],
            success: false,
            error: error instanceof Error ? error.message : String(error),
            processingTime: 0,
          };
          this.results.push(errorResult);
          
          console.log(chalk.red(`❌ Error: ${errorResult.error}`));
          if (!continueOnError) break;
        }

        // Clear chat history between questions for clean state
        this.chatEngine.clearMessages();
      }
    } else {
      // Concurrent processing (basic implementation)
      const chunks = this.chunkArray(questions, maxConcurrency);
      for (const chunk of chunks) {
        const promises = chunk.map((question, index) => 
          this.processQuestion(question, this.results.length + index + 1)
        );
        const chunkResults = await Promise.allSettled(promises);
        
        for (const result of chunkResults) {
          if (result.status === 'fulfilled') {
            this.results.push(result.value);
          } else {
            console.log(chalk.red(`❌ Concurrent processing error: ${result.reason}`));
          }
        }
      }
    }

    // Save results
    console.log(chalk.blue('\n💾 Saving results...'));
    await this.saveResults(outputPath, outputFormat, options);
    
    const successCount = this.results.filter(r => r.success).length;
    const errorCount = this.results.length - successCount;
    
    console.log(chalk.green(`\n🎉 Batch processing completed!`));
    console.log(chalk.green(`   ✅ Success: ${successCount}`));
    if (errorCount > 0) {
      console.log(chalk.red(`   ❌ Errors: ${errorCount}`));
    }
    console.log(chalk.blue(`   📄 Results saved to: ${outputPath}`));

    return this.results;
  }

  private async processQuestion(question: BatchQuestion, questionNumber: number): Promise<BatchResult> {
    const startTime = Date.now();
    this.currentToolCalls = [];
    
    const id = question.id || `Q${questionNumber}`;
    
    try {
      // Add context if provided
      if (question.context) {
        await this.chatEngine.addMessage(question.context, 'system');
      }

      // Setup tool execution callback to track tool calls
      const onToolExecution = (info: ToolExecutionInfo) => {
        if (info.type === 'tool_start' && info.toolName) {
          // Only track individual tool executions, not batch messages
          if (info.toolCallId && info.toolName) {
            const existingRecord = this.currentToolCalls.find(
              record => record.toolCallId === info.toolCallId
            );
            
            if (!existingRecord) {
              this.currentToolCalls.push({
                toolName: info.toolName,
                toolCallId: info.toolCallId,
                input: info.input || '',
                output: '',
                success: false,
                timestamp: Date.now(),
              });
            }
          }
        } else if (info.type === 'tool_complete' && info.toolCallId) {
          const record = this.currentToolCalls.find(
            record => record.toolCallId === info.toolCallId
          );
          if (record) {
            record.output = info.output || '';
            record.success = true;
          }
        } else if (info.type === 'tool_error' && info.toolCallId) {
          const record = this.currentToolCalls.find(
            record => record.toolCallId === info.toolCallId
          );
          if (record) {
            record.output = info.output || '';
            record.error = info.message;
            record.success = false;
          }
        }
      };

      // Execute the question
      const response = await this.chatEngine.chat(question.question, {
        temperature: 0.7,
        maxTokens: 2000,
        autoExecuteTools: true,
        onToolExecution,
      });

      const processingTime = Date.now() - startTime;

      return {
        id,
        question: question.question,
        context: question.context,
        expectedResult: question.expectedResult,
        response,
        toolCalls: [...this.currentToolCalls],
        success: true,
        processingTime,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return {
        id,
        question: question.question,
        context: question.context,
        expectedResult: question.expectedResult,
        response: '',
        toolCalls: [...this.currentToolCalls],
        success: false,
        error: error instanceof Error ? error.message : String(error),
        processingTime,
      };
    }
  }

  private async loadQuestionsFromFile(filePath: string): Promise<BatchQuestion[]> {
    const content = await fs.readFile(filePath, 'utf8');
    
    // Parse CSV
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    return records.map((record: any, index: number) => ({
      id: record.id || `Q${index + 1}`,
      question: record.question || record.Question || '',
      context: record.context || record.Context || undefined,
      expectedResult: record.expectedResult || record.expected_result || record.Expected || undefined,
    }));
  }

  private async saveResults(outputPath: string, format: 'csv' | 'json', options: BatchOptions): Promise<void> {
    if (format === 'json') {
      await this.saveAsJSON(outputPath, options);
    } else {
      await this.saveAsCSV(outputPath, options);
    }
  }

  private async saveAsJSON(outputPath: string, options: BatchOptions): Promise<void> {
    const output = {
      metadata: {
        timestamp: new Date().toISOString(),
        totalQuestions: this.results.length,
        successCount: this.results.filter(r => r.success).length,
        errorCount: this.results.filter(r => !r.success).length,
        options,
      },
      results: this.results,
    };

    await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
  }

  private async saveAsCSV(outputPath: string, options: BatchOptions): Promise<void> {
    const { includeContext = true } = options;
    
    // Prepare CSV data
    const csvData = this.results.map(result => {
      const baseData = {
        id: result.id,
        question: result.question,
        response: result.response,
        success: result.success,
        error: result.error || '',
        processingTime: result.processingTime,
        toolCallCount: result.toolCalls.length,
        toolCallsSummary: result.toolCalls.map(tc => tc.toolName).join('; '),
      };

      if (includeContext) {
        return {
          ...baseData,
          context: result.context || '',
          expectedResult: result.expectedResult || '',
        };
      }

      return baseData;
    });

    const csvOutput = stringify(csvData, {
      header: true,
      quoted_string: true,
    });

    await fs.writeFile(outputPath, csvOutput);

    // Also save detailed tool calls if any exist
    const allToolCalls = this.results.flatMap(result => 
      result.toolCalls.map(tc => ({
        questionId: result.id,
        question: result.question,
        toolName: tc.toolName,
        toolCallId: tc.toolCallId,
        input: tc.input,
        output: tc.output,
        success: tc.success,
        error: tc.error || '',
        timestamp: new Date(tc.timestamp).toISOString(),
      }))
    );

    if (allToolCalls.length > 0) {
      const toolCallsPath = outputPath.replace(/\.csv$/i, '-tool-calls.csv');
      const toolCallsCSV = stringify(allToolCalls, {
        header: true,
        quoted_string: true,
      });
      await fs.writeFile(toolCallsPath, toolCallsCSV);
      console.log(chalk.gray(`   📋 Tool calls saved to: ${toolCallsPath}`));
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  getResults(): BatchResult[] {
    return [...this.results];
  }
}