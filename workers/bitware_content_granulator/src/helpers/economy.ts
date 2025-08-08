// Economy Helper - Resource consumption tracking and cost calculation
// Provides accurate pricing models for AI providers

export interface ResourceUsage {
  provider: string;
  model: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  processingTimeMs: number;
  requestCount: number;
}

export interface CostBreakdown {
  promptCost: number;
  completionCost: number;
  totalCost: number;
  costPerThousandTokens: number;
}

// Pricing as of January 2025
// Sources: OpenAI, Anthropic, Cloudflare pricing pages
export const AI_PRICING = {
  openai: {
    'gpt-4o-mini': {
      prompt: 0.00015,  // per 1K tokens
      completion: 0.0006  // per 1K tokens
    },
    'gpt-4o': {
      prompt: 0.0025,
      completion: 0.01
    },
    'gpt-4-turbo': {
      prompt: 0.01,
      completion: 0.03
    },
    'gpt-3.5-turbo': {
      prompt: 0.0005,
      completion: 0.0015
    }
  },
  claude: {
    'claude-3-haiku-20240307': {
      prompt: 0.00025,
      completion: 0.00125
    },
    'claude-3-sonnet-20240229': {
      prompt: 0.003,
      completion: 0.015
    },
    'claude-3-opus-20240229': {
      prompt: 0.015,
      completion: 0.075
    },
    'claude-3-5-sonnet-20241022': {
      prompt: 0.003,
      completion: 0.015
    }
  },
  cloudflare: {
    // Cloudflare AI is included in Workers subscription
    // But we track virtual costs for resource planning
    '@cf/meta/llama-3-8b-instruct': {
      prompt: 0,
      completion: 0
    },
    '@cf/meta/llama-2-7b-chat-int8': {
      prompt: 0,
      completion: 0
    },
    '@cf/mistral/mistral-7b-instruct-v0.1': {
      prompt: 0,
      completion: 0
    },
    '@cf/microsoft/phi-2': {
      prompt: 0,
      completion: 0
    }
  }
};

export function calculateCost(
  provider: string,
  model: string,
  tokensUsed: { prompt: number; completion: number }
): CostBreakdown {
  const providerPricing = AI_PRICING[provider as keyof typeof AI_PRICING];
  const pricing = providerPricing ? (providerPricing as any)[model] : undefined;
  
  if (!pricing) {
    // Fallback to default pricing if model not found
    console.warn(`Pricing not found for ${provider}/${model}, using defaults`);
    return {
      promptCost: (tokensUsed.prompt / 1000) * 0.001,
      completionCost: (tokensUsed.completion / 1000) * 0.002,
      totalCost: (tokensUsed.prompt / 1000) * 0.001 + (tokensUsed.completion / 1000) * 0.002,
      costPerThousandTokens: 0.0015
    };
  }

  const promptCost = (tokensUsed.prompt / 1000) * pricing.prompt;
  const completionCost = (tokensUsed.completion / 1000) * pricing.completion;
  const totalCost = promptCost + completionCost;
  const totalTokens = tokensUsed.prompt + tokensUsed.completion;
  const costPerThousandTokens = totalTokens > 0 ? (totalCost / totalTokens) * 1000 : 0;

  return {
    promptCost,
    completionCost,
    totalCost,
    costPerThousandTokens
  };
}

export function estimateProcessingTime(
  structureType: string,
  granularityLevel: number,
  provider: string
): number {
  // Base times in milliseconds
  const baseTimes: Record<string, number> = {
    course: 3000,
    quiz: 2000,
    novel: 4000,
    workflow: 2500,
    knowledge_map: 3500,
    learning_path: 3000
  };

  // Provider speed multipliers
  const providerMultipliers: Record<string, number> = {
    openai: 1.0,
    claude: 1.1,  // Slightly slower
    cloudflare: 0.8  // Faster but less capable
  };

  const baseTime = baseTimes[structureType] || 3000;
  const granularityMultiplier = 0.5 + (granularityLevel * 0.3);
  const providerMultiplier = providerMultipliers[provider] || 1.0;

  return Math.round(baseTime * granularityMultiplier * providerMultiplier);
}

export function calculateResourceEfficiency(usage: ResourceUsage): {
  tokensPerSecond: number;
  costPerSecond: number;
  efficiency: 'high' | 'medium' | 'low';
} {
  const tokensPerSecond = usage.processingTimeMs > 0 
    ? (usage.tokensUsed.total / usage.processingTimeMs) * 1000 
    : 0;

  const cost = calculateCost(
    usage.provider,
    usage.model,
    usage.tokensUsed
  );

  const costPerSecond = usage.processingTimeMs > 0
    ? (cost.totalCost / usage.processingTimeMs) * 1000
    : 0;

  // Efficiency based on tokens per dollar
  const tokensPerDollar = cost.totalCost > 0 ? usage.tokensUsed.total / cost.totalCost : 0;
  
  let efficiency: 'high' | 'medium' | 'low';
  if (tokensPerDollar > 1000000) {
    efficiency = 'high';
  } else if (tokensPerDollar > 100000) {
    efficiency = 'medium';
  } else {
    efficiency = 'low';
  }

  return {
    tokensPerSecond,
    costPerSecond,
    efficiency
  };
}

// Format cost for display
export function formatCost(cost: number): string {
  if (cost === 0) return 'Free';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

// Get cost tier based on total cost
export function getCostTier(cost: number): {
  tier: 'free' | 'minimal' | 'low' | 'medium' | 'high';
  color: string;
  description: string;
} {
  if (cost === 0) {
    return { tier: 'free', color: 'green', description: 'No cost (Cloudflare AI)' };
  }
  if (cost < 0.001) {
    return { tier: 'minimal', color: 'green', description: 'Less than $0.001' };
  }
  if (cost < 0.01) {
    return { tier: 'low', color: 'blue', description: 'Low cost' };
  }
  if (cost < 0.1) {
    return { tier: 'medium', color: 'yellow', description: 'Medium cost' };
  }
  return { tier: 'high', color: 'red', description: 'High cost' };
}