import { Env } from '../types';

export interface OpenAIResponse {
  content: string;
  tokensUsed: number;
  model: string;
}

export class OpenAIService {
  private apiKey: string;
  private model = 'gpt-4o-mini';
  private maxTokens = 4000;
  
  constructor(env: Env) {
    this.apiKey = env.OPENAI_API_KEY;
  }

  async generateStructure(prompt: string): Promise<OpenAIResponse> {
    const startTime = Date.now();
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert content structuring AI. Generate well-organized, comprehensive structures for educational and creative content. Always return valid JSON that can be parsed.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: this.maxTokens,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      const data = await response.json() as any;
      
      return {
        content: data.choices[0].message.content,
        tokensUsed: data.usage.total_tokens,
        model: data.model
      };
    } catch (error) {
      console.error('OpenAI API call failed:', error);
      throw new Error(`Failed to generate structure: ${error.message}`);
    }
  }

  async validateStructure(prompt: string): Promise<number> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert content quality validator. Analyze structures and provide numerical scores from 0-100 based on the criteria given. Only respond with a number.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 10
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const rawResponse = data.choices[0].message.content.trim();
      console.log(`[OPENAI] Raw validation response: "${rawResponse}"`);
      
      const score = parseFloat(rawResponse);
      
      if (isNaN(score) || score < 0 || score > 100) {
        console.error(`[OPENAI] Invalid score returned: ${rawResponse}, using default 75`);
        throw new Error('Invalid validation score returned');
      }
      
      console.log(`[OPENAI] Parsed score: ${score}`);
      return score;
    } catch (error) {
      console.error('[OPENAI] Validation failed:', error);
      console.error('[OPENAI] Returning default score: 75');
      // Return a default mid-range score if validation fails
      return 75;
    }
  }

  async estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  calculateCost(tokens: number): number {
    // GPT-4o-mini pricing (as of 2024)
    // Input: $0.15 / 1M tokens
    // Output: $0.60 / 1M tokens
    // Assuming roughly 30% input, 70% output
    const inputCost = (tokens * 0.3) * 0.00000015;
    const outputCost = (tokens * 0.7) * 0.00000060;
    return inputCost + outputCost;
  }
}