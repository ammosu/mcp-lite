import { BaseLLM } from './base.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { LLMProvider } from '../types/index.js';

export class LLMFactory {
  static create(provider: LLMProvider, apiKey: string, model: string): BaseLLM {
    switch (provider) {
      case 'openai':
        return new OpenAIProvider(apiKey, model);
      case 'anthropic':
        return new AnthropicProvider(apiKey, model);
      case 'google':
        throw new Error('Google provider not implemented yet');
      default:
        throw new Error(`Unknown LLM provider: ${provider}`);
    }
  }
}