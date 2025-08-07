/**
 * Cost Tracking and Optimization Service
 */
export class CostTracker {
  constructor(env) {
    this.env = env;
    
    // Cost definitions
    this.costs = {
      openai: {
        'gpt-4': { input: 0.03, output: 0.06 },
        'gpt-4-turbo': { input: 0.01, output: 0.03 },
        'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
        'gpt-4o-mini': { input: 0.00015, output: 0.0006 }
      },
      anthropic: {
        'claude-3-opus': { input: 0.015, output: 0.075 },
        'claude-3-sonnet': { input: 0.003, output: 0.015 },
        'claude-3-haiku': { input: 0.00025, output: 0.00125 }
      },
      email: {
        sendgrid: 0.0001,
        ses: 0.00001
      },
      sms: {
        twilio: 0.0075,
        aws_sns: 0.00645
      },
      storage: {
        kv: { read: 0.0000005, write: 0.000005, storage: 0.50 }, // per operation, per GB-month
        r2: { read: 0.0000004, write: 0.0000045, storage: 0.015 }, // per operation, per GB-month
        d1: { read: 0.0000001, write: 0.000001, storage: 0.75 } // per operation, per GB-month
      },
      compute: {
        worker_invocation: 0.0000005, // per invocation
        cpu_time: 0.0000125 // per CPU millisecond
      }
    };
  }

  /**
   * Calculate cost for a request
   */
  async calculateRequestCost(request, usage) {
    let totalCost = 0;
    const breakdown = {};

    // API costs
    if (usage.api) {
      for (const [provider, models] of Object.entries(usage.api)) {
        breakdown[provider] = {};
        
        for (const [model, tokens] of Object.entries(models)) {
          const modelCost = this.calculateModelCost(provider, model, tokens);
          breakdown[provider][model] = modelCost;
          totalCost += modelCost.total;
        }
      }
    }

    // Communication costs
    if (usage.communications) {
      breakdown.communications = {};
      
      if (usage.communications.emails) {
        const emailCost = usage.communications.emails * this.costs.email.sendgrid;
        breakdown.communications.emails = emailCost;
        totalCost += emailCost;
      }
      
      if (usage.communications.sms) {
        const smsCost = usage.communications.sms * this.costs.sms.twilio;
        breakdown.communications.sms = smsCost;
        totalCost += smsCost;
      }
    }

    // Storage costs
    if (usage.storage) {
      breakdown.storage = {};
      
      for (const [type, operations] of Object.entries(usage.storage)) {
        const storageCost = this.calculateStorageCost(type, operations);
        breakdown.storage[type] = storageCost;
        totalCost += storageCost.total;
      }
    }

    // Compute costs
    if (usage.compute) {
      breakdown.compute = {};
      
      if (usage.compute.invocations) {
        breakdown.compute.invocations = usage.compute.invocations * this.costs.compute.worker_invocation;
        totalCost += breakdown.compute.invocations;
      }
      
      if (usage.compute.cpu_ms) {
        breakdown.compute.cpu = usage.compute.cpu_ms * this.costs.compute.cpu_time;
        totalCost += breakdown.compute.cpu;
      }
    }

    // Track in database
    await this.trackCost(request.requestId, request.clientId, breakdown, totalCost);

    return {
      total: totalCost,
      breakdown,
      currency: 'USD',
      timestamp: Date.now()
    };
  }

  /**
   * Calculate model-specific costs
   */
  calculateModelCost(provider, model, tokens) {
    const costs = this.costs[provider]?.[model];
    if (!costs) {
      console.warn(`Unknown model: ${provider}/${model}`);
      return { input: 0, output: 0, total: 0 };
    }

    const inputCost = (tokens.input / 1000) * costs.input;
    const outputCost = (tokens.output / 1000) * costs.output;
    
    return {
      input: inputCost,
      output: outputCost,
      total: inputCost + outputCost,
      tokens
    };
  }

  /**
   * Calculate storage costs
   */
  calculateStorageCost(type, operations) {
    const costs = this.costs.storage[type];
    if (!costs) return { total: 0 };

    let total = 0;
    const breakdown = {};

    if (operations.reads) {
      breakdown.reads = operations.reads * costs.read;
      total += breakdown.reads;
    }

    if (operations.writes) {
      breakdown.writes = operations.writes * costs.write;
      total += breakdown.writes;
    }

    if (operations.storage_gb_hours) {
      // Convert GB-hours to GB-months for pricing
      const gbMonths = operations.storage_gb_hours / (24 * 30);
      breakdown.storage = gbMonths * costs.storage;
      total += breakdown.storage;
    }

    return { ...breakdown, total };
  }

  /**
   * Estimate cost before execution
   */
  async estimateCost(template, clientTier) {
    // Load template requirements
    const requirements = await this.getTemplateRequirements(template);
    let estimatedCost = 0;

    // Estimate API costs
    if (requirements.api) {
      for (const [provider, config] of Object.entries(requirements.api)) {
        const model = this.selectModelByTier(provider, clientTier);
        const tokens = config.estimatedTokens || 1000;
        
        const modelCost = this.calculateModelCost(provider, model, {
          input: tokens * 0.6,
          output: tokens * 0.4
        });
        
        estimatedCost += modelCost.total;
      }
    }

    // Estimate other costs
    if (requirements.communications) {
      estimatedCost += (requirements.communications.emails || 0) * this.costs.email.sendgrid;
      estimatedCost += (requirements.communications.sms || 0) * this.costs.sms.twilio;
    }

    // Add 20% buffer for estimation
    estimatedCost *= 1.2;

    return {
      estimated: estimatedCost,
      confidence: 0.8,
      breakdown: requirements,
      currency: 'USD'
    };
  }

  /**
   * Select appropriate model based on client tier
   */
  selectModelByTier(provider, tier) {
    const modelsByTier = {
      openai: {
        enterprise: 'gpt-4',
        premium: 'gpt-4-turbo',
        standard: 'gpt-3.5-turbo',
        basic: 'gpt-3.5-turbo'
      },
      anthropic: {
        enterprise: 'claude-3-opus',
        premium: 'claude-3-sonnet',
        standard: 'claude-3-haiku',
        basic: 'claude-3-haiku'
      }
    };

    return modelsByTier[provider]?.[tier] || modelsByTier[provider]?.basic;
  }

  /**
   * Get template requirements from database or KAM
   */
  async getTemplateRequirements(templateName) {
    // Try cache first
    const cached = await this.env.COST_TRACKING.get(`template-req-${templateName}`, 'json');
    if (cached) return cached;

    // Load from database
    const requirements = await this.env.DB.prepare(
      'SELECT resource_requirements FROM pipeline_templates WHERE name = ?'
    ).bind(templateName).first();

    if (requirements) {
      const parsed = JSON.parse(requirements.resource_requirements);
      
      // Cache for 1 hour
      await this.env.COST_TRACKING.put(
        `template-req-${templateName}`,
        JSON.stringify(parsed),
        { expirationTtl: 3600 }
      );
      
      return parsed;
    }

    // Default requirements if not found
    return {
      api: { openai: { estimatedTokens: 1000 } },
      compute: { estimatedMs: 5000 }
    };
  }

  /**
   * Track cost in database
   */
  async trackCost(requestId, clientId, breakdown, total) {
    const batch = [];
    
    // Track individual costs
    for (const [provider, costs] of Object.entries(breakdown)) {
      if (typeof costs === 'object') {
        for (const [resource, cost] of Object.entries(costs)) {
          if (typeof cost === 'number') {
            batch.push({
              request_id: requestId,
              client_id: clientId,
              provider,
              resource_type: resource,
              total_cost: cost
            });
          } else if (cost.total) {
            batch.push({
              request_id: requestId,
              client_id: clientId,
              provider,
              resource_type: resource,
              total_cost: cost.total,
              amount_used: cost.tokens?.input + cost.tokens?.output
            });
          }
        }
      }
    }

    // Insert batch
    for (const record of batch) {
      await this.env.DB.prepare(
        `INSERT INTO cost_tracking 
         (request_id, client_id, provider, resource_type, amount_used, total_cost)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(
        record.request_id,
        record.client_id,
        record.provider,
        record.resource_type,
        record.amount_used || 0,
        record.total_cost
      ).run();
    }

    // Update client quotas
    await this.updateClientCosts(clientId, total);
  }

  /**
   * Update client cost tracking
   */
  async updateClientCosts(clientId, cost) {
    const today = new Date().toISOString().split('T')[0];
    
    await this.env.DB.prepare(
      `INSERT INTO client_quotas (client_id, date, cost_today, cost_month, tier)
       VALUES (?, ?, ?, ?, 'standard')
       ON CONFLICT(client_id, date) DO UPDATE SET
         cost_today = cost_today + ?,
         cost_month = cost_month + ?`
    ).bind(clientId, today, cost, cost, cost, cost).run();
  }

  /**
   * Check if client has budget available
   */
  async checkBudget(clientId, estimatedCost) {
    // Get client's current usage
    const today = new Date().toISOString().split('T')[0];
    const usage = await this.env.DB.prepare(
      'SELECT cost_month FROM client_quotas WHERE client_id = ? AND date = ?'
    ).bind(clientId, today).first();

    // Get client's budget from KAM
    const clientInfo = await this.getClientInfo(clientId);
    if (!clientInfo) {
      return { available: false, reason: 'client_not_found' };
    }

    const monthlyBudget = clientInfo.monthly_budget || 100;
    const currentUsage = usage?.cost_month || 0;
    const remaining = monthlyBudget - currentUsage;

    if (remaining < estimatedCost) {
      return {
        available: false,
        reason: 'insufficient_budget',
        budget: monthlyBudget,
        used: currentUsage,
        remaining,
        required: estimatedCost
      };
    }

    return {
      available: true,
      budget: monthlyBudget,
      used: currentUsage,
      remaining,
      afterExecution: remaining - estimatedCost
    };
  }

  /**
   * Get client info from KAM
   */
  async getClientInfo(clientId) {
    try {
      if (this.env.KAM) {
        const response = await this.env.KAM.fetch(
          new Request(`https://kam/client/${clientId}`, {
            headers: {
              'Authorization': `Bearer ${this.env.WORKER_SECRET}`,
              'X-Worker-ID': 'resource-manager'
            }
          })
        );
        
        if (response.ok) {
          return await response.json();
        }
      }
    } catch (error) {
      console.error('Error fetching client info:', error);
    }
    
    // Default client info
    return {
      id: clientId,
      tier: 'standard',
      monthly_budget: 100
    };
  }

  /**
   * Get cost report for client
   */
  async getClientCostReport(clientId, period = 'month') {
    const now = new Date();
    let startDate;
    
    if (period === 'day') {
      startDate = new Date(now.toISOString().split('T')[0]);
    } else if (period === 'week') {
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const costs = await this.env.DB.prepare(
      `SELECT 
         provider,
         resource_type,
         SUM(amount_used) as total_amount,
         SUM(total_cost) as total_cost,
         COUNT(*) as request_count
       FROM cost_tracking
       WHERE client_id = ? AND timestamp >= ?
       GROUP BY provider, resource_type
       ORDER BY total_cost DESC`
    ).bind(clientId, startDate.toISOString()).all();

    const total = costs.results.reduce((sum, row) => sum + row.total_cost, 0);

    return {
      clientId,
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      totalCost: total,
      breakdown: costs.results,
      currency: 'USD'
    };
  }

  /**
   * Generate cost optimization recommendations
   */
  async generateOptimizations(clientId) {
    const recommendations = [];
    
    // Analyze recent usage
    const recentCosts = await this.getClientCostReport(clientId, 'week');
    
    // Check for expensive model usage
    const gpt4Usage = recentCosts.breakdown.find(b => 
      b.provider === 'openai' && b.resource_type === 'gpt-4'
    );
    
    if (gpt4Usage && gpt4Usage.total_cost > 10) {
      recommendations.push({
        type: 'model_downgrade',
        impact: 'high',
        savings: gpt4Usage.total_cost * 0.7,
        description: 'Consider using GPT-3.5-turbo for non-critical tasks',
        implementation: 'Set priority=normal for routine requests'
      });
    }

    // Check for batching opportunities
    const requestCount = recentCosts.breakdown.reduce((sum, b) => sum + b.request_count, 0);
    if (requestCount > 100) {
      recommendations.push({
        type: 'batching',
        impact: 'medium',
        savings: recentCosts.totalCost * 0.15,
        description: 'Batch similar requests to reduce API calls',
        implementation: 'Enable batch mode for bulk operations'
      });
    }

    // Check cache hit rate
    const cacheStats = await this.getCacheStats(clientId);
    if (cacheStats.hitRate < 0.3) {
      recommendations.push({
        type: 'caching',
        impact: 'medium',
        savings: recentCosts.totalCost * 0.2,
        description: 'Improve cache utilization for repeated queries',
        implementation: 'Enable aggressive caching for stable data'
      });
    }

    return {
      clientId,
      currentCost: recentCosts.totalCost,
      potentialSavings: recommendations.reduce((sum, r) => sum + (r.savings || 0), 0),
      recommendations
    };
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(clientId) {
    const stats = await this.env.DB.prepare(
      `SELECT 
         COUNT(*) as total_requests,
         SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) as cache_hits
       FROM execution_history
       WHERE client_id = ? AND created_at > datetime('now', '-7 days')`
    ).bind(clientId).first();

    const hitRate = stats.total_requests > 0 ? 
      stats.cache_hits / stats.total_requests : 0;

    return {
      totalRequests: stats.total_requests,
      cacheHits: stats.cache_hits,
      hitRate
    };
  }
}