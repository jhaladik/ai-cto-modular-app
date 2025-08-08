import { Env } from '../types';
import { calculateCost as calculateAICost } from '../helpers/economy';

// AI Provider Types
export type AIProvider = 'openai' | 'claude' | 'cloudflare';

export interface AIModelConfig {
  provider: AIProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  systemPrompt?: string;
}

export interface AIResponse {
  content: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  model: string;
  provider: AIProvider;
  finishReason?: string;
  processingTimeMs?: number;
}

export interface AIProviderInterface {
  generateCompletion(prompt: string, config?: Partial<AIModelConfig>): Promise<AIResponse>;
  calculateCost(tokensUsed: { prompt: number; completion: number; total: number }, model?: string): number;
  isAvailable(): Promise<boolean>;
  getDefaultModel(): string;
  getSupportedModels(): string[];
}

// Base AI Provider class
export abstract class BaseAIProvider implements AIProviderInterface {
  protected env: Env;
  protected provider: AIProvider;
  
  constructor(env: Env, provider: AIProvider) {
    this.env = env;
    this.provider = provider;
  }
  
  abstract generateCompletion(prompt: string, config?: Partial<AIModelConfig>): Promise<AIResponse>;
  abstract calculateCost(tokensUsed: { prompt: number; completion: number; total: number }, model?: string): number;
  abstract isAvailable(): Promise<boolean>;
  abstract getDefaultModel(): string;
  abstract getSupportedModels(): string[];
  
  protected async measureTime<T>(operation: () => Promise<T>): Promise<{ result: T; timeMs: number }> {
    const startTime = Date.now();
    const result = await operation();
    const timeMs = Date.now() - startTime;
    return { result, timeMs };
  }
}

// OpenAI Provider Implementation
export class OpenAIProvider extends BaseAIProvider {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';
  
  constructor(env: Env) {
    super(env, 'openai');
    this.apiKey = env.OPENAI_API_KEY;
  }
  
  async generateCompletion(prompt: string, config?: Partial<AIModelConfig>): Promise<AIResponse> {
    const model = config?.model || this.getDefaultModel();
    const { result, timeMs } = await this.measureTime(async () => {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            ...(config?.systemPrompt ? [{ role: 'system', content: config.systemPrompt }] : []),
            { role: 'user', content: prompt }
          ],
          temperature: config?.temperature ?? 0.7,
          max_tokens: config?.maxTokens ?? 4000,
          top_p: config?.topP ?? 1,
          frequency_penalty: config?.frequencyPenalty ?? 0,
          presence_penalty: config?.presencePenalty ?? 0
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }
      
      return await response.json() as any;
    });
    
    return {
      content: result.choices[0].message.content,
      tokensUsed: {
        prompt: result.usage.prompt_tokens,
        completion: result.usage.completion_tokens,
        total: result.usage.total_tokens
      },
      model,
      provider: 'openai',
      finishReason: result.choices[0].finish_reason,
      processingTimeMs: timeMs
    };
  }
  
  calculateCost(tokensUsed: { prompt: number; completion: number; total: number }, model?: string): number {
    const modelName = model || this.getDefaultModel();
    const cost = calculateAICost('openai', modelName, tokensUsed);
    return cost.totalCost;
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  getDefaultModel(): string {
    return 'gpt-4o-mini';
  }
  
  getSupportedModels(): string[] {
    return ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];
  }
}

// Claude Provider Implementation (Anthropic)
export class ClaudeProvider extends BaseAIProvider {
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1';
  
  constructor(env: Env) {
    super(env, 'claude');
    this.apiKey = env.CLAUDE_API_KEY || '';
  }
  
  async generateCompletion(prompt: string, config?: Partial<AIModelConfig>): Promise<AIResponse> {
    const model = config?.model || this.getDefaultModel();
    const { result, timeMs } = await this.measureTime(async () => {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          ...(config?.systemPrompt && { system: config.systemPrompt }),
          max_tokens: config?.maxTokens ?? 4000,
          temperature: config?.temperature ?? 0.7,
          top_p: config?.topP ?? 1
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error: ${error}`);
      }
      
      return await response.json() as any;
    });
    
    return {
      content: result.content[0].text,
      tokensUsed: {
        prompt: result.usage.input_tokens,
        completion: result.usage.output_tokens,
        total: result.usage.input_tokens + result.usage.output_tokens
      },
      model,
      provider: 'claude',
      finishReason: result.stop_reason,
      processingTimeMs: timeMs
    };
  }
  
  calculateCost(tokensUsed: { prompt: number; completion: number; total: number }, model?: string): number {
    const modelName = model || this.getDefaultModel();
    const cost = calculateAICost('claude', modelName, tokensUsed);
    return cost.totalCost;
  }
  
  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }
  
  getDefaultModel(): string {
    return 'claude-3-haiku-20240307';
  }
  
  getSupportedModels(): string[] {
    return [
      'claude-3-haiku-20240307',
      'claude-3-sonnet-20240229', 
      'claude-3-opus-20240229',
      'claude-3-5-sonnet-20241022'
    ];
  }
}

// Cloudflare AI Provider Implementation
export class CloudflareAIProvider extends BaseAIProvider {
  constructor(env: Env) {
    super(env, 'cloudflare');
  }
  
  async generateCompletion(prompt: string, config?: Partial<AIModelConfig>): Promise<AIResponse> {
    const model = config?.model || this.getDefaultModel();
    
    if (!this.env.AI) {
      throw new Error('Cloudflare AI binding not configured');
    }
    
    const { result, timeMs } = await this.measureTime(async () => {
      const messages = [
        ...(config?.systemPrompt ? [{ role: 'system', content: config.systemPrompt }] : []),
        { role: 'user', content: prompt }
      ];
      
      // Cloudflare AI uses a different API structure
      const response = await this.env.AI.run(model, {
        messages,
        temperature: config?.temperature,
        max_tokens: config?.maxTokens
      });
      
      return response as any;
    });
    
    // Estimate token usage for Cloudflare AI (not provided by API)
    const estimatedPromptTokens = Math.ceil(prompt.length / 4);
    const estimatedCompletionTokens = Math.ceil((result as any).response?.length || 100 / 4);
    
    return {
      content: (result as any).response || '',
      tokensUsed: {
        prompt: estimatedPromptTokens,
        completion: estimatedCompletionTokens,
        total: estimatedPromptTokens + estimatedCompletionTokens
      },
      model,
      provider: 'cloudflare',
      processingTimeMs: timeMs
    };
  }
  
  calculateCost(tokensUsed: { prompt: number; completion: number; total: number }, model?: string): number {
    const modelName = model || this.getDefaultModel();
    const cost = calculateAICost('cloudflare', modelName, tokensUsed);
    return cost.totalCost;
  }
  
  async isAvailable(): Promise<boolean> {
    return !!this.env.AI;
  }
  
  getDefaultModel(): string {
    return '@cf/meta/llama-3-8b-instruct';
  }
  
  getSupportedModels(): string[] {
    return [
      '@cf/meta/llama-3-8b-instruct',
      '@cf/meta/llama-2-7b-chat-int8',
      '@cf/mistral/mistral-7b-instruct-v0.1',
      '@cf/microsoft/phi-2'
    ];
  }
}

// AI Provider Factory
export class AIProviderFactory {
  static create(provider: AIProvider, env: Env): AIProviderInterface {
    switch (provider) {
      case 'openai':
        return new OpenAIProvider(env);
      case 'claude':
        return new ClaudeProvider(env);
      case 'cloudflare':
        return new CloudflareAIProvider(env);
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }
  
  static async getAvailableProviders(env: Env): Promise<AIProvider[]> {
    const providers: AIProvider[] = [];
    
    // Check each provider's availability
    const openai = new OpenAIProvider(env);
    if (await openai.isAvailable()) providers.push('openai');
    
    const claude = new ClaudeProvider(env);
    if (await claude.isAvailable()) providers.push('claude');
    
    const cloudflare = new CloudflareAIProvider(env);
    if (await cloudflare.isAvailable()) providers.push('cloudflare');
    
    return providers;
  }
  
  static async getBestAvailableProvider(env: Env, preferredProvider?: AIProvider): Promise<AIProviderInterface> {
    // If preferred provider is specified and available, use it
    if (preferredProvider) {
      const provider = AIProviderFactory.create(preferredProvider, env);
      if (await provider.isAvailable()) {
        return provider;
      }
    }
    
    // Otherwise, fallback to first available provider
    const availableProviders = await AIProviderFactory.getAvailableProviders(env);
    if (availableProviders.length === 0) {
      throw new Error('No AI providers available');
    }
    
    return AIProviderFactory.create(availableProviders[0], env);
  }
}