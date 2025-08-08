import { Env } from '../types';
import { GenerationConfig } from '../types/generation';

interface AIResponse {
  content: string;
  tokensInput: number;
  tokensOutput: number;
  cost: number;
  model: string;
  provider: string;
}

export class AIProviderService {
  constructor(private env: Env) {}

  async generateCompletion(
    prompt: string,
    config: GenerationConfig
  ): Promise<AIResponse> {
    const provider = config.aiProvider || this.getDefaultProvider();
    const model = config.aiModel || this.getDefaultModel(provider);
    const temperature = config.temperature ?? parseFloat(this.env.DEFAULT_TEMPERATURE || '0.7');
    const maxTokens = config.maxTokens ?? parseInt(this.env.MAX_TOKENS_PER_REQUEST || '4000');

    try {
      switch (provider) {
        case 'openai':
          return await this.generateWithOpenAI(prompt, model, temperature, maxTokens, config.systemPrompt);
        case 'claude':
          return await this.generateWithClaude(prompt, model, temperature, maxTokens, config.systemPrompt);
        case 'cloudflare':
          return await this.generateWithCloudflare(prompt, model, temperature, maxTokens);
        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }
    } catch (error) {
      console.error(`AI generation failed with ${provider}:`, error);
      
      // Try fallback provider
      if (provider !== 'cloudflare' && this.env.AI) {
        console.log('Falling back to Cloudflare AI');
        return await this.generateWithCloudflare(prompt, '@cf/meta/llama-3-8b-instruct', temperature, maxTokens);
      }
      
      throw error;
    }
  }

  private async generateWithOpenAI(
    prompt: string,
    model: string,
    temperature: number,
    maxTokens: number,
    systemPrompt?: string
  ): Promise<AIResponse> {
    if (!this.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const messages = [
      {
        role: 'system',
        content: systemPrompt || 'You are an expert educational content creator specializing in creating engaging and effective learning materials.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json() as any;
    const completion = data.choices[0].message.content;
    const usage = data.usage;

    // Calculate cost based on model
    const cost = this.calculateOpenAICost(model, usage.prompt_tokens, usage.completion_tokens);

    return {
      content: completion,
      tokensInput: usage.prompt_tokens,
      tokensOutput: usage.completion_tokens,
      cost,
      model,
      provider: 'openai',
    };
  }

  private async generateWithClaude(
    prompt: string,
    model: string,
    temperature: number,
    maxTokens: number,
    systemPrompt?: string
  ): Promise<AIResponse> {
    if (!this.env.CLAUDE_API_KEY) {
      throw new Error('Claude API key not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.env.CLAUDE_API_KEY,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-3-haiku-20240307',
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt || 'You are an expert educational content creator.',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${error}`);
    }

    const data = await response.json() as any;
    const completion = data.content[0].text;
    const usage = data.usage;

    // Calculate cost based on model
    const cost = this.calculateClaudeCost(model, usage.input_tokens, usage.output_tokens);

    return {
      content: completion,
      tokensInput: usage.input_tokens,
      tokensOutput: usage.output_tokens,
      cost,
      model,
      provider: 'claude',
    };
  }

  private async generateWithCloudflare(
    prompt: string,
    model: string,
    temperature: number,
    maxTokens: number
  ): Promise<AIResponse> {
    if (!this.env.AI) {
      throw new Error('Cloudflare AI not configured');
    }

    const messages = [
      {
        role: 'system',
        content: 'You are an expert educational content creator.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    try {
      const response = await this.env.AI.run(model || '@cf/meta/llama-3-8b-instruct', {
        messages,
        temperature,
        max_tokens: maxTokens,
      });

      // Cloudflare AI response format varies by model
      const content = response.response || response.result?.response || '';
      
      // Estimate tokens (Cloudflare doesn't always provide token counts)
      const estimatedInputTokens = Math.ceil(prompt.length / 4);
      const estimatedOutputTokens = Math.ceil(content.length / 4);

      return {
        content,
        tokensInput: estimatedInputTokens,
        tokensOutput: estimatedOutputTokens,
        cost: 0, // Cloudflare AI is free with Workers
        model,
        provider: 'cloudflare',
      };
    } catch (error) {
      console.error('Cloudflare AI error:', error);
      throw new Error(`Cloudflare AI generation failed: ${error}`);
    }
  }

  private getDefaultProvider(): string {
    if (this.env.OPENAI_API_KEY) return 'openai';
    if (this.env.CLAUDE_API_KEY) return 'claude';
    if (this.env.AI) return 'cloudflare';
    throw new Error('No AI provider configured');
  }

  private getDefaultModel(provider: string): string {
    switch (provider) {
      case 'openai':
        return this.env.DEFAULT_MODEL || 'gpt-4o-mini';
      case 'claude':
        return 'claude-3-haiku-20240307';
      case 'cloudflare':
        return '@cf/meta/llama-3-8b-instruct';
      default:
        return 'gpt-4o-mini';
    }
  }

  private calculateOpenAICost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 0.0025, output: 0.01 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    };

    const modelPricing = pricing[model] || pricing['gpt-4o-mini'];
    return (inputTokens / 1000) * modelPricing.input + (outputTokens / 1000) * modelPricing.output;
  }

  private calculateClaudeCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
      'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
      'claude-3-haiku': { input: 0.00025, output: 0.00125 },
      'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
    };

    const modelPricing = pricing[model] || pricing['claude-3-haiku-20240307'];
    return (inputTokens / 1000) * modelPricing.input + (outputTokens / 1000) * modelPricing.output;
  }

  async testConnection(): Promise<boolean> {
    try {
      const testPrompt = 'Say "Hello, World!" in exactly those words.';
      const response = await this.generateCompletion(testPrompt, {
        maxTokens: 10,
        temperature: 0,
      });
      return response.content.toLowerCase().includes('hello');
    } catch {
      return false;
    }
  }

  getAvailableProviders(): string[] {
    const providers = [];
    if (this.env.OPENAI_API_KEY) providers.push('openai');
    if (this.env.CLAUDE_API_KEY) providers.push('claude');
    if (this.env.AI) providers.push('cloudflare');
    return providers;
  }

  getAvailableModels(provider: string): string[] {
    switch (provider) {
      case 'openai':
        return ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'];
      case 'claude':
        return ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'];
      case 'cloudflare':
        return [
          '@cf/meta/llama-3-8b-instruct',
          '@cf/meta/llama-3-70b-instruct',
          '@cf/mistral/mistral-7b-instruct-v0.1',
        ];
      default:
        return [];
    }
  }
}