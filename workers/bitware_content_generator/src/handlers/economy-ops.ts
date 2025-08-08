import { Env, AuthenticatedRequest } from '../types';
import { jsonResponse, parseRequestBody, getNumericQueryParam } from '../helpers/http';
import { DatabaseService } from '../services/database';

// Pricing data (can be moved to database or config)
const AI_PRICING = {
  openai: {
    'gpt-4o': {
      input: 0.0025,  // per 1K tokens
      output: 0.01,    // per 1K tokens
    },
    'gpt-4o-mini': {
      input: 0.00015,
      output: 0.0006,
    },
    'gpt-3.5-turbo': {
      input: 0.0005,
      output: 0.0015,
    },
  },
  claude: {
    'claude-3-5-sonnet': {
      input: 0.003,
      output: 0.015,
    },
    'claude-3-haiku': {
      input: 0.00025,
      output: 0.00125,
    },
  },
  cloudflare: {
    '@cf/meta/llama-3-8b-instruct': {
      input: 0,  // Free with Workers
      output: 0,
    },
    '@cf/meta/llama-3-70b-instruct': {
      input: 0,
      output: 0,
    },
  },
};

export async function handleGetPricing(
  env: Env,
  request: AuthenticatedRequest
): Promise<Response> {
  try {
    const providers = [];
    
    // Build pricing info based on available providers
    if (env.OPENAI_API_KEY) {
      providers.push({
        provider: 'openai',
        models: Object.entries(AI_PRICING.openai).map(([model, pricing]) => ({
          model,
          pricing: {
            promptPer1k: `$${pricing.input}`,
            completionPer1k: `$${pricing.output}`,
            promptRaw: pricing.input,
            completionRaw: pricing.output,
          },
          example1k: `$${(pricing.input + pricing.output).toFixed(4)}`,
          example10k: `$${((pricing.input + pricing.output) * 10).toFixed(4)}`,
        })),
      });
    }
    
    if (env.CLAUDE_API_KEY) {
      providers.push({
        provider: 'claude',
        models: Object.entries(AI_PRICING.claude).map(([model, pricing]) => ({
          model,
          pricing: {
            promptPer1k: `$${pricing.input}`,
            completionPer1k: `$${pricing.output}`,
            promptRaw: pricing.input,
            completionRaw: pricing.output,
          },
          example1k: `$${(pricing.input + pricing.output).toFixed(4)}`,
          example10k: `$${((pricing.input + pricing.output) * 10).toFixed(4)}`,
        })),
      });
    }
    
    if (env.AI) {
      providers.push({
        provider: 'cloudflare',
        models: Object.entries(AI_PRICING.cloudflare).map(([model, pricing]) => ({
          model,
          pricing: {
            promptPer1k: pricing.input === 0 ? 'Free' : `$${pricing.input}`,
            completionPer1k: pricing.output === 0 ? 'Free' : `$${pricing.output}`,
            promptRaw: pricing.input,
            completionRaw: pricing.output,
          },
          example1k: 'Free',
          example10k: 'Free',
        })),
      });
    }

    const recommendations = {
      costEffective: {
        provider: 'cloudflare',
        model: '@cf/meta/llama-3-8b-instruct',
        reason: 'Free with Workers subscription',
      },
      balanced: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        reason: 'Best balance of cost, quality, and speed for content generation',
      },
      highQuality: {
        provider: 'claude',
        model: 'claude-3-5-sonnet',
        reason: 'Excellent for creative and complex content',
      },
    };

    return jsonResponse({
      providers,
      recommendations,
      notes: {
        tokenEstimation: 'Roughly 750 words per 1000 tokens',
        typicalContent: {
          lesson: '1500-2000 tokens',
          module: '5000-8000 tokens',
          course: '50000-100000 tokens',
        },
      },
      lastUpdated: new Date().toISOString().split('T')[0],
    });
  } catch (error) {
    console.error('Error getting pricing:', error);
    return jsonResponse({ error: 'Failed to get pricing information' }, 500);
  }
}

export async function handleEstimateCost(
  env: Env,
  request: AuthenticatedRequest
): Promise<Response> {
  try {
    const body = await parseRequestBody(request);
    const { provider, model, structureType, estimatedTokens, wordCount } = body;

    // Calculate tokens from word count if not provided
    const tokens = estimatedTokens || Math.ceil((wordCount || 0) / 0.75);
    
    // Estimate input/output split (typically 20% input, 80% output for generation)
    const inputTokens = Math.ceil(tokens * 0.2);
    const outputTokens = Math.ceil(tokens * 0.8);

    // Get pricing for the model
    const providerPricing = AI_PRICING[provider as keyof typeof AI_PRICING];
    if (!providerPricing) {
      return jsonResponse({ error: 'Unknown provider' }, 400);
    }

    const modelPricing = providerPricing[model as keyof typeof providerPricing];
    if (!modelPricing) {
      return jsonResponse({ error: 'Unknown model' }, 400);
    }

    // Calculate cost
    const promptCost = (inputTokens / 1000) * modelPricing.input;
    const completionCost = (outputTokens / 1000) * modelPricing.output;
    const totalCost = promptCost + completionCost;

    // Get alternatives
    const alternatives = [];
    
    // Add cheaper alternatives
    if (provider !== 'cloudflare') {
      alternatives.push({
        provider: 'cloudflare',
        model: '@cf/meta/llama-3-8b-instruct',
        cost: 'Free',
        savings: `$${totalCost.toFixed(4)}`,
        note: 'Included with Workers subscription',
      });
    }
    
    if (provider === 'openai' && model !== 'gpt-4o-mini') {
      const miniPricing = AI_PRICING.openai['gpt-4o-mini'];
      const miniCost = (inputTokens / 1000) * miniPricing.input + 
                      (outputTokens / 1000) * miniPricing.output;
      alternatives.push({
        provider: 'openai',
        model: 'gpt-4o-mini',
        cost: `$${miniCost.toFixed(4)}`,
        savings: `$${(totalCost - miniCost).toFixed(4)}`,
        note: 'Faster and more cost-effective',
      });
    }

    return jsonResponse({
      estimate: {
        provider,
        model,
        structureType,
        tokens: {
          prompt: inputTokens,
          completion: outputTokens,
          total: tokens,
        },
        cost: {
          prompt: `$${promptCost.toFixed(4)}`,
          completion: `$${completionCost.toFixed(4)}`,
          total: `$${totalCost.toFixed(4)}`,
          totalRaw: totalCost,
        },
        pricing: {
          promptPer1k: `$${modelPricing.input}`,
          completionPer1k: `$${modelPricing.output}`,
        },
      },
      alternatives,
      assumptions: {
        inputOutputRatio: '20/80',
        wordsPerToken: 0.75,
        estimatedTime: `${Math.ceil(tokens / 500)} seconds`,
      },
    });
  } catch (error) {
    console.error('Error estimating cost:', error);
    return jsonResponse({ error: 'Failed to estimate cost' }, 500);
  }
}

export async function handleGetResourceStats(
  env: Env,
  request: AuthenticatedRequest,
  url: URL
): Promise<Response> {
  try {
    const days = getNumericQueryParam(url, 'days', 7);
    
    const db = new DatabaseService(env);
    
    // Get resource consumption stats
    const stats = await env.DB.prepare(`
      SELECT 
        date,
        total_jobs,
        total_words_generated,
        total_tokens_used,
        total_cost_usd,
        avg_cost_per_1k_words,
        avg_tokens_per_1k_words,
        provider_stats,
        model_stats
      FROM generation_analytics
      WHERE date > date('now', '-' || ? || ' days')
      ORDER BY date DESC
    `).bind(days).all();

    // Calculate summary
    const summary = stats.results.reduce((acc: any, day: any) => {
      acc.totalCost += day.total_cost_usd || 0;
      acc.totalTokens += day.total_tokens_used || 0;
      acc.totalWords += day.total_words_generated || 0;
      acc.totalJobs += day.total_jobs || 0;
      return acc;
    }, {
      totalCost: 0,
      totalTokens: 0,
      totalWords: 0,
      totalJobs: 0,
    });

    // Add calculated fields
    summary.avgCostPer1kWords = summary.totalWords > 0 
      ? (summary.totalCost / (summary.totalWords / 1000)) 
      : 0;
    summary.avgTokensPer1kWords = summary.totalWords > 0 
      ? (summary.totalTokens / (summary.totalWords / 1000)) 
      : 0;

    // Get provider breakdown
    const providerBreakdown = await env.DB.prepare(`
      SELECT 
        provider,
        COUNT(*) as requests,
        SUM(total_tokens) as tokens,
        SUM(cost_usd) as total_cost,
        AVG(cost_usd / NULLIF(total_tokens, 0) * 1000) as avg_cost_per_1k,
        AVG(latency_ms) as avg_latency,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate
      FROM ai_provider_usage
      WHERE created_at > datetime('now', '-' || ? || ' days')
      GROUP BY provider
    `).bind(days).all();

    // Calculate potential savings
    const potentialSavings = calculatePotentialSavings(summary, providerBreakdown.results);

    return jsonResponse({
      period: `${days} days`,
      summary: {
        ...summary,
        totalCost: `$${summary.totalCost.toFixed(2)}`,
        totalCostRaw: summary.totalCost,
        potentialSavings: `$${potentialSavings.toFixed(2)}`,
      },
      dailyUsage: stats.results.map((day: any) => ({
        date: day.date,
        jobs: day.total_jobs,
        words: day.total_words_generated,
        tokens: day.total_tokens_used,
        cost: `$${day.total_cost_usd.toFixed(2)}`,
        costRaw: day.total_cost_usd,
        avgCostPer1kWords: day.avg_cost_per_1k_words,
      })),
      providerBreakdown: providerBreakdown.results.map((p: any) => ({
        provider: p.provider,
        requests: p.requests,
        tokens: p.tokens,
        totalCost: `$${p.total_cost.toFixed(2)}`,
        totalCostRaw: p.total_cost,
        avgCostPer1k: `$${(p.avg_cost_per_1k || 0).toFixed(4)}`,
        avgLatency: Math.round(p.avg_latency || 0),
        successRate: `${Math.round(p.success_rate || 0)}%`,
      })),
      recommendations: generateResourceRecommendations(summary, providerBreakdown.results),
    });
  } catch (error) {
    console.error('Error getting resource stats:', error);
    return jsonResponse({ error: 'Failed to get resource statistics' }, 500);
  }
}

function calculatePotentialSavings(summary: any, providers: any[]): number {
  // Calculate how much could be saved by using free Cloudflare AI
  const nonFreeProviders = providers.filter(p => p.provider !== 'cloudflare');
  const totalPaidCost = nonFreeProviders.reduce((sum, p) => sum + (p.total_cost || 0), 0);
  
  // Estimate that 50% of workloads could use free tier
  return totalPaidCost * 0.5;
}

function generateResourceRecommendations(summary: any, providers: any[]): string[] {
  const recommendations = [];
  
  if (summary.avgCostPer1kWords > 0.01) {
    recommendations.push('Consider using GPT-4o-mini or Claude Haiku for lower costs');
  }
  
  const cloudflareUsage = providers.find(p => p.provider === 'cloudflare');
  if (!cloudflareUsage || cloudflareUsage.requests < summary.totalJobs * 0.2) {
    recommendations.push('Increase usage of free Cloudflare AI models for suitable content');
  }
  
  if (summary.avgTokensPer1kWords > 1500) {
    recommendations.push('Token usage is high - consider optimizing prompts');
  }
  
  return recommendations;
}