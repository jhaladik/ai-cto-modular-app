import { Env, AuthenticatedRequest } from '../types';
import { jsonResponse } from '../helpers/http';
import { DatabaseService } from '../services/database';
import { formatCost, AI_PRICING } from '../helpers/economy';

export async function handleGetResourceStats(env: Env, request: AuthenticatedRequest): Promise<Response> {
  try {
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '7');
    
    const db = new DatabaseService(env);
    const stats = await db.getResourceConsumptionStats(days);
    
    // Calculate total costs and savings
    const totalCost = stats.providerComparison.reduce((sum: number, p: any) => sum + (p.total_cost || 0), 0);
    const cloudflareUsage = stats.providerComparison.find((p: any) => p.ai_provider === 'cloudflare');
    const potentialSavings = cloudflareUsage ? (totalCost * (cloudflareUsage.total_requests / 100)) : 0;
    
    return jsonResponse({
      period: `${days} days`,
      summary: {
        totalCost: formatCost(totalCost),
        totalCostRaw: totalCost,
        potentialSavings: formatCost(potentialSavings),
        totalRequests: stats.providerComparison.reduce((sum: number, p: any) => sum + (p.total_requests || 0), 0),
        totalTokens: stats.providerComparison.reduce((sum: number, p: any) => sum + (p.total_tokens || 0), 0)
      },
      dailyUsage: stats.dailyUsage.map((d: any) => ({
        date: d.date,
        provider: d.ai_provider,
        model: d.ai_model,
        requests: d.request_count,
        tokens: d.total_tokens,
        cost: formatCost(d.total_cost),
        costRaw: d.total_cost,
        avgProcessingTime: Math.round(d.avg_processing_time),
        throughput: Math.round(d.avg_throughput)
      })),
      providerBreakdown: stats.providerComparison.map((p: any) => ({
        provider: p.ai_provider,
        requests: p.total_requests,
        tokens: p.total_tokens,
        totalCost: formatCost(p.total_cost),
        totalCostRaw: p.total_cost,
        avgCostPer1k: formatCost(p.avg_cost_per_1k),
        avgProcessingTime: Math.round(p.avg_processing_time),
        efficiency: {
          high: p.high_efficiency_count,
          medium: p.medium_efficiency_count,
          low: p.low_efficiency_count
        }
      })),
      topModels: stats.modelPerformance.map((m: any) => ({
        model: m.ai_model,
        provider: m.ai_provider,
        usageCount: m.usage_count,
        avgCost: formatCost(m.avg_cost),
        avgCostRaw: m.avg_cost,
        avgTokens: Math.round(m.avg_tokens),
        avgTime: Math.round(m.avg_time_ms),
        throughput: Math.round(m.avg_throughput)
      }))
    });
  } catch (error) {
    console.error('Error fetching resource stats:', error);
    return jsonResponse({ error: 'Failed to fetch resource statistics' }, 500);
  }
}

export async function handleGetCostEstimate(env: Env, request: AuthenticatedRequest): Promise<Response> {
  try {
    const body = await request.json() as any;
    const { provider = 'openai', model, tokens = 1000, structureType = 'course', granularityLevel = 3 } = body;
    
    // Get model or use default
    const modelName = model || (provider === 'openai' ? 'gpt-4o-mini' : 
                                provider === 'claude' ? 'claude-3-haiku-20240307' : 
                                '@cf/meta/llama-3-8b-instruct');
    
    // Estimate tokens based on structure type and granularity
    const tokenMultiplier = 1 + (granularityLevel * 0.3);
    const baseTokens: Record<string, number> = {
      course: 3000,
      quiz: 2000,
      novel: 4000,
      workflow: 2500,
      knowledge_map: 3500,
      learning_path: 3000
    };
    
    const estimatedTokens = Math.round((baseTokens[structureType] || 3000) * tokenMultiplier);
    const promptTokens = Math.round(estimatedTokens * 0.3);
    const completionTokens = Math.round(estimatedTokens * 0.7);
    
    // Get pricing
    const providerPricing = AI_PRICING[provider as keyof typeof AI_PRICING];
    const pricing = providerPricing ? (providerPricing as any)[modelName] : undefined;
    
    if (!pricing) {
      return jsonResponse({ 
        error: `Pricing not available for ${provider}/${modelName}` 
      }, 400);
    }
    
    const promptCost = (promptTokens / 1000) * pricing.prompt;
    const completionCost = (completionTokens / 1000) * pricing.completion;
    const totalCost = promptCost + completionCost;
    
    return jsonResponse({
      estimate: {
        provider,
        model: modelName,
        structureType,
        granularityLevel,
        tokens: {
          prompt: promptTokens,
          completion: completionTokens,
          total: estimatedTokens
        },
        cost: {
          prompt: formatCost(promptCost),
          completion: formatCost(completionCost),
          total: formatCost(totalCost),
          totalRaw: totalCost
        },
        pricing: {
          promptPer1k: formatCost(pricing.prompt),
          completionPer1k: formatCost(pricing.completion)
        }
      },
      alternatives: [
        {
          provider: 'cloudflare',
          model: '@cf/meta/llama-3-8b-instruct',
          cost: 'Free',
          savings: formatCost(totalCost),
          note: 'Included with Workers subscription'
        },
        {
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          cost: formatCost((promptTokens / 1000) * 0.0005 + (completionTokens / 1000) * 0.0015),
          savings: formatCost(totalCost - ((promptTokens / 1000) * 0.0005 + (completionTokens / 1000) * 0.0015))
        }
      ]
    });
  } catch (error) {
    console.error('Error calculating cost estimate:', error);
    return jsonResponse({ error: 'Failed to calculate cost estimate' }, 500);
  }
}

export async function handleGetPricingInfo(env: Env): Promise<Response> {
  return jsonResponse({
    providers: Object.entries(AI_PRICING).map(([provider, models]) => ({
      provider,
      models: Object.entries(models).map(([model, pricing]) => ({
        model,
        pricing: {
          promptPer1k: formatCost(pricing.prompt),
          completionPer1k: formatCost(pricing.completion),
          promptRaw: pricing.prompt,
          completionRaw: pricing.completion
        },
        example1k: formatCost((300 / 1000) * pricing.prompt + (700 / 1000) * pricing.completion),
        example10k: formatCost((3000 / 1000) * pricing.prompt + (7000 / 1000) * pricing.completion)
      }))
    })),
    recommendations: {
      costEffective: {
        provider: 'cloudflare',
        model: '@cf/meta/llama-3-8b-instruct',
        reason: 'Free with Workers subscription, good for simple tasks'
      },
      balanced: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        reason: 'Best balance of cost, quality, and speed'
      },
      highQuality: {
        provider: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        reason: 'Excellent for creative and complex content'
      }
    },
    lastUpdated: '2025-01-08'
  });
}