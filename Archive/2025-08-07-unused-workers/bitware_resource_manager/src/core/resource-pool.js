import { TokenBucket, SlidingWindowQuota } from './token-bucket.js';

/**
 * Resource Pool Manager
 * Manages multiple resource pools with different allocation strategies
 */
export class ResourcePoolManager {
  constructor(env) {
    this.env = env;
    this.pools = new Map();
    this.quotas = new Map();
    this.initializePools();
  }

  /**
   * Initialize default resource pools
   */
  initializePools() {
    // OpenAI Token Pools
    this.pools.set('openai-gpt4', {
      shared: new TokenBucket(10000, 166),      // 10K tokens/min
      reserved: new TokenBucket(1000, 16),      // 1K tokens/min reserved
      provider: 'openai',
      model: 'gpt-4',
      costPerUnit: { input: 0.03, output: 0.06 }
    });

    this.pools.set('openai-gpt35', {
      shared: new TokenBucket(90000, 1500),     // 90K tokens/min
      reserved: new TokenBucket(9000, 150),      // 10% reserved
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      costPerUnit: { input: 0.0015, output: 0.002 }
    });

    // Email/SMS Pools
    this.pools.set('email', {
      shared: new TokenBucket(1000, 16),        // 1000 emails/min
      reserved: new TokenBucket(100, 1.6),       // 100 reserved
      provider: 'sendgrid',
      costPerUnit: 0.0001
    });

    this.pools.set('sms', {
      shared: new TokenBucket(500, 8),          // 500 SMS/min
      reserved: new TokenBucket(50, 0.8),       // 50 reserved
      provider: 'twilio',
      costPerUnit: 0.0075
    });

    // Infrastructure Pools
    this.pools.set('database', {
      shared: new TokenBucket(50000, 833),      // 50K queries/min
      reserved: new TokenBucket(5000, 83),      // 5K reserved
      provider: 'cloudflare-d1',
      costPerUnit: 0
    });

    this.pools.set('storage-kv', {
      shared: new TokenBucket(100000, 1666),    // 100K reads/min
      reserved: new TokenBucket(10000, 166),    // 10K reserved
      provider: 'cloudflare-kv',
      costPerUnit: 0.0000005
    });

    // Daily/Monthly Quotas
    this.quotas.set('openai-daily', new SlidingWindowQuota(86400000, 1000000));  // 1M tokens/day
    this.quotas.set('email-daily', new SlidingWindowQuota(86400000, 100000));    // 100K emails/day
    this.quotas.set('storage-monthly', new SlidingWindowQuota(2592000000, 10737418240)); // 10GB/month
  }

  /**
   * Allocate resources for a request
   */
  async allocate(request) {
    const { 
      resourceType, 
      amount, 
      clientId, 
      clientTier, 
      priority = 'normal',
      requestId 
    } = request;

    const pool = this.pools.get(resourceType);
    if (!pool) {
      throw new Error(`Unknown resource type: ${resourceType}`);
    }

    // Check daily/monthly quotas first
    const quotaKey = this.getQuotaKey(resourceType);
    if (quotaKey && this.quotas.has(quotaKey)) {
      const quota = this.quotas.get(quotaKey);
      if (!quota.canConsume(amount)) {
        return {
          success: false,
          reason: 'quota_exceeded',
          resetTime: quota.getResetTime()
        };
      }
    }

    // Try to allocate from appropriate pool
    let allocated = false;
    let fromPool = null;
    let waitTime = 0;

    // Enterprise clients get dedicated resources
    if (clientTier === 'enterprise') {
      const dedicatedPool = await this.getDedicatedPool(clientId, resourceType);
      if (dedicatedPool && dedicatedPool.canConsume(amount)) {
        allocated = await dedicatedPool.consume(amount);
        fromPool = 'dedicated';
      }
    }

    // Try reserved pool for urgent requests
    if (!allocated && priority === 'urgent' && pool.reserved.canConsume(amount)) {
      allocated = await pool.reserved.consume(amount);
      fromPool = 'reserved';
    }

    // Try shared pool
    if (!allocated) {
      waitTime = pool.shared.getWaitTime(amount);
      
      // If wait time is acceptable, allocate
      if (waitTime < this.getMaxWaitTime(priority)) {
        allocated = await pool.shared.consume(amount);
        fromPool = 'shared';
      }
    }

    if (!allocated) {
      return {
        success: false,
        reason: 'insufficient_resources',
        waitTime: waitTime,
        available: pool.shared.getAvailable()
      };
    }

    // Consume from quota if applicable
    if (quotaKey && this.quotas.has(quotaKey)) {
      this.quotas.get(quotaKey).consume(amount);
    }

    // Track allocation
    const allocation = {
      requestId,
      clientId,
      resourceType,
      amount,
      fromPool,
      allocatedAt: Date.now(),
      cost: this.calculateCost(resourceType, amount)
    };

    await this.trackAllocation(allocation);

    return {
      success: true,
      allocation,
      waitTime: 0
    };
  }

  /**
   * Release allocated resources (for reserved allocations)
   */
  async release(allocationId) {
    // In token bucket model, tokens are consumed immediately
    // This method is for tracking purposes
    await this.env.DB.prepare(
      'UPDATE resource_allocations SET released_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(allocationId).run();
  }

  /**
   * Check resource availability
   */
  async checkAvailability(resourceType, amount) {
    const pool = this.pools.get(resourceType);
    if (!pool) {
      return { available: false, reason: 'unknown_resource' };
    }

    const sharedAvailable = pool.shared.getAvailable();
    const reservedAvailable = pool.reserved.getAvailable();
    const totalAvailable = sharedAvailable + reservedAvailable;

    if (totalAvailable >= amount) {
      return { 
        available: true, 
        waitTime: 0,
        pools: {
          shared: sharedAvailable,
          reserved: reservedAvailable
        }
      };
    }

    const waitTime = pool.shared.getWaitTime(amount);
    return {
      available: false,
      waitTime,
      currentlyAvailable: totalAvailable,
      required: amount
    };
  }

  /**
   * Get dedicated pool for enterprise clients
   */
  async getDedicatedPool(clientId, resourceType) {
    const key = `dedicated-${clientId}-${resourceType}`;
    
    // Check cache
    if (this.pools.has(key)) {
      return this.pools.get(key);
    }

    // Load from database
    const config = await this.env.DB.prepare(
      'SELECT * FROM dedicated_pools WHERE client_id = ? AND resource_type = ?'
    ).bind(clientId, resourceType).first();

    if (config) {
      const pool = new TokenBucket(config.capacity, config.refill_rate);
      this.pools.set(key, pool);
      return pool;
    }

    return null;
  }

  /**
   * Calculate cost for resource usage
   */
  calculateCost(resourceType, amount) {
    const pool = this.pools.get(resourceType);
    if (!pool) return 0;

    if (typeof pool.costPerUnit === 'object') {
      // For models with input/output costs
      // Assume 60/40 split for estimation
      return (amount * 0.6 * pool.costPerUnit.input / 1000) + 
             (amount * 0.4 * pool.costPerUnit.output / 1000);
    }

    return amount * (pool.costPerUnit || 0);
  }

  /**
   * Track resource allocation in database
   */
  async trackAllocation(allocation) {
    await this.env.DB.prepare(
      `INSERT INTO resource_allocations 
       (request_id, client_id, resource_type, amount, pool_type, cost_usd, allocated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      allocation.requestId,
      allocation.clientId,
      allocation.resourceType,
      allocation.amount,
      allocation.fromPool,
      allocation.cost,
      new Date(allocation.allocatedAt).toISOString()
    ).run();

    // Update client usage
    await this.updateClientUsage(allocation.clientId, allocation.cost);
  }

  /**
   * Update client usage tracking
   */
  async updateClientUsage(clientId, cost) {
    const today = new Date().toISOString().split('T')[0];
    
    await this.env.DB.prepare(
      `INSERT INTO client_quotas (client_id, date, cost_today, cost_month, requests_today, requests_month)
       VALUES (?, ?, ?, ?, 1, 1)
       ON CONFLICT(client_id, date) DO UPDATE SET
         cost_today = cost_today + ?,
         cost_month = cost_month + ?,
         requests_today = requests_today + 1,
         requests_month = requests_month + 1`
    ).bind(clientId, today, cost, cost, cost, cost).run();
  }

  /**
   * Get quota key for resource type
   */
  getQuotaKey(resourceType) {
    if (resourceType.startsWith('openai')) return 'openai-daily';
    if (resourceType === 'email') return 'email-daily';
    if (resourceType.startsWith('storage')) return 'storage-monthly';
    return null;
  }

  /**
   * Get maximum acceptable wait time by priority
   */
  getMaxWaitTime(priority) {
    const waitTimes = {
      urgent: 1000,      // 1 second
      high: 10000,       // 10 seconds
      normal: 60000,     // 1 minute
      low: 3600000       // 1 hour
    };
    return waitTimes[priority] || 60000;
  }

  /**
   * Get current pool status
   */
  async getStatus() {
    const status = {};
    
    for (const [name, pool] of this.pools) {
      status[name] = {
        shared: {
          available: pool.shared.getAvailable(),
          capacity: pool.shared.capacity,
          percentage: (pool.shared.getAvailable() / pool.shared.capacity) * 100
        },
        reserved: {
          available: pool.reserved.getAvailable(),
          capacity: pool.reserved.capacity,
          percentage: (pool.reserved.getAvailable() / pool.reserved.capacity) * 100
        }
      };
    }

    return status;
  }

  /**
   * Save pool state to KV for persistence
   */
  async saveState() {
    const state = {};
    
    for (const [name, pool] of this.pools) {
      state[name] = {
        shared: pool.shared.exportState(),
        reserved: pool.reserved.exportState()
      };
    }

    const quotaState = {};
    for (const [name, quota] of this.quotas) {
      quotaState[name] = quota.exportState();
    }

    await this.env.RESOURCE_CACHE.put('pool-state', JSON.stringify(state));
    await this.env.RESOURCE_CACHE.put('quota-state', JSON.stringify(quotaState));
  }

  /**
   * Load pool state from KV
   */
  async loadState() {
    try {
      const poolState = await this.env.RESOURCE_CACHE.get('pool-state', 'json');
      if (poolState) {
        for (const [name, state] of Object.entries(poolState)) {
          if (this.pools.has(name)) {
            const pool = this.pools.get(name);
            pool.shared = TokenBucket.fromState(state.shared);
            pool.reserved = TokenBucket.fromState(state.reserved);
          }
        }
      }

      const quotaState = await this.env.RESOURCE_CACHE.get('quota-state', 'json');
      if (quotaState) {
        for (const [name, state] of Object.entries(quotaState)) {
          this.quotas.set(name, SlidingWindowQuota.fromState(state));
        }
      }
    } catch (error) {
      console.error('Error loading pool state:', error);
    }
  }
}