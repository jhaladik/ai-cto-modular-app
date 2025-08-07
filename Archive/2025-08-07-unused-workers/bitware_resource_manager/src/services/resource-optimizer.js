/**
 * Resource Optimization Service
 * Optimizes requests to reduce costs and improve performance
 */
export class ResourceOptimizer {
  constructor(env) {
    this.env = env;
    this.optimizationStrategies = [
      this.modelDowngrade.bind(this),
      this.batchRequests.bind(this),
      this.checkCache.bind(this),
      this.compressData.bind(this),
      this.offPeakScheduling.bind(this)
    ];
  }

  /**
   * Optimize a request before execution
   */
  async optimizeRequest(request) {
    const optimizations = [];
    let optimizedRequest = { ...request };
    let estimatedSavings = 0;

    // Apply each optimization strategy
    for (const strategy of this.optimizationStrategies) {
      const result = await strategy(optimizedRequest);
      if (result.applied) {
        optimizations.push(result.optimization);
        optimizedRequest = result.request;
        estimatedSavings += result.savings || 0;
      }
    }

    // Cache optimization result
    if (optimizations.length > 0) {
      await this.cacheOptimization(request, optimizedRequest, optimizations);
    }

    return {
      original: request,
      optimized: optimizedRequest,
      optimizations,
      estimatedSavings,
      savingsPercentage: this.calculateSavingsPercentage(request, estimatedSavings)
    };
  }

  /**
   * Model downgrade optimization
   */
  async modelDowngrade(request) {
    // Don't downgrade for urgent or high-accuracy requests
    if (request.priority === 'urgent' || request.accuracy === 'high') {
      return { applied: false };
    }

    // Don't downgrade for enterprise clients unless they opt-in
    if (request.clientTier === 'enterprise' && !request.allowDowngrade) {
      return { applied: false };
    }

    const modelMapping = {
      'gpt-4': 'gpt-3.5-turbo',
      'gpt-4-turbo': 'gpt-3.5-turbo',
      'claude-3-opus': 'claude-3-haiku',
      'claude-3-sonnet': 'claude-3-haiku'
    };

    if (request.model && modelMapping[request.model]) {
      const originalModel = request.model;
      const newModel = modelMapping[originalModel];
      
      // Calculate savings
      const savings = this.calculateModelSavings(originalModel, newModel, request.estimatedTokens);

      return {
        applied: true,
        request: { ...request, model: newModel, originalModel },
        optimization: {
          type: 'model_downgrade',
          description: `Downgraded from ${originalModel} to ${newModel}`,
          originalModel,
          newModel
        },
        savings
      };
    }

    return { applied: false };
  }

  /**
   * Batch similar requests together
   */
  async batchRequests(request) {
    // Only batch if client allows it
    if (!request.allowBatching) {
      return { applied: false };
    }

    // Find similar pending requests
    const similar = await this.findSimilarRequests(request);
    
    if (similar.length >= 2) {
      // Create batched request
      const batchedRequest = {
        ...request,
        type: 'batch',
        batchedRequests: [request.requestId, ...similar.map(s => s.request_id)],
        batchSize: similar.length + 1
      };

      // Calculate savings (reduced API calls)
      const savings = request.estimatedCost * 0.3 * similar.length;

      return {
        applied: true,
        request: batchedRequest,
        optimization: {
          type: 'batching',
          description: `Batched ${similar.length + 1} similar requests`,
          batchSize: similar.length + 1,
          requestIds: batchedRequest.batchedRequests
        },
        savings
      };
    }

    return { applied: false };
  }

  /**
   * Check cache for existing results
   */
  async checkCache(request) {
    // Generate cache key
    const cacheKey = this.generateCacheKey(request);
    
    // Check if result exists in cache
    const cached = await this.env.RESOURCE_CACHE.get(cacheKey, 'json');
    
    if (cached && this.isCacheValid(cached)) {
      // Check age and validity
      const age = Date.now() - cached.timestamp;
      const maxAge = this.getMaxCacheAge(request);
      
      if (age < maxAge) {
        return {
          applied: true,
          request: { 
            ...request, 
            useCache: true, 
            cacheKey,
            cachedResult: cached.result
          },
          optimization: {
            type: 'cache_hit',
            description: 'Using cached result',
            cacheAge: Math.floor(age / 1000),
            cacheKey
          },
          savings: request.estimatedCost * 0.95 // Save 95% by using cache
        };
      }
    }

    return { applied: false };
  }

  /**
   * Compress large data payloads
   */
  async compressData(request) {
    // Check if data is large enough to benefit from compression
    const dataSize = JSON.stringify(request.data || {}).length;
    
    if (dataSize > 10000) { // 10KB threshold
      // Compress data
      const compressed = await this.compressPayload(request.data);
      const compressionRatio = compressed.length / dataSize;
      
      if (compressionRatio < 0.8) { // At least 20% compression
        return {
          applied: true,
          request: {
            ...request,
            data: compressed,
            compressed: true,
            originalSize: dataSize,
            compressedSize: compressed.length
          },
          optimization: {
            type: 'compression',
            description: `Compressed data from ${dataSize} to ${compressed.length} bytes`,
            ratio: compressionRatio,
            savedBytes: dataSize - compressed.length
          },
          savings: 0.0001 * (dataSize - compressed.length) / 1000 // Bandwidth savings
        };
      }
    }

    return { applied: false };
  }

  /**
   * Schedule non-urgent requests for off-peak times
   */
  async offPeakScheduling(request) {
    // Only defer low priority requests
    if (request.urgency !== 'low' || request.priority === 'urgent') {
      return { applied: false };
    }

    // Check if currently peak time
    if (this.isPeakTime()) {
      const nextOffPeak = this.getNextOffPeakTime();
      const deferralTime = nextOffPeak - Date.now();
      
      // Only defer if wait is reasonable (< 4 hours)
      if (deferralTime < 14400000) {
        return {
          applied: true,
          request: {
            ...request,
            deferred: true,
            deferUntil: nextOffPeak,
            originalRequestTime: Date.now()
          },
          optimization: {
            type: 'off_peak_defer',
            description: `Deferred to off-peak time`,
            deferralMinutes: Math.floor(deferralTime / 60000),
            scheduledTime: new Date(nextOffPeak).toISOString()
          },
          savings: request.estimatedCost * 0.1 // 10% discount for off-peak
        };
      }
    }

    return { applied: false };
  }

  /**
   * Find similar pending requests for batching
   */
  async findSimilarRequests(request) {
    const results = await this.env.DB.prepare(
      `SELECT request_id, template_name, resource_requirements
       FROM resource_queue
       WHERE client_id = ? 
         AND template_name = ?
         AND status = 'queued'
         AND request_id != ?
         AND queued_at > datetime('now', '-5 minutes')
       LIMIT 10`
    ).bind(request.clientId, request.templateName, request.requestId).all();

    // Filter for truly similar requests
    return results.results.filter(r => {
      const requirements = JSON.parse(r.resource_requirements);
      return this.areSimilarRequirements(request.resourceRequirements, requirements);
    });
  }

  /**
   * Check if requirements are similar enough to batch
   */
  areSimilarRequirements(req1, req2) {
    if (!req1 || !req2) return false;
    
    // Check if same resources are needed
    const keys1 = Object.keys(req1).sort();
    const keys2 = Object.keys(req2).sort();
    
    if (keys1.length !== keys2.length) return false;
    
    // Check if amounts are within 20% of each other
    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      
      const diff = Math.abs(req1[key] - req2[key]);
      const avg = (req1[key] + req2[key]) / 2;
      
      if (diff / avg > 0.2) return false;
    }
    
    return true;
  }

  /**
   * Generate cache key for request
   */
  generateCacheKey(request) {
    const keyParts = [
      request.templateName,
      request.clientId,
      crypto.subtle.digestSync('SHA-256', 
        new TextEncoder().encode(JSON.stringify(request.data || {}))
      )
    ];
    
    return keyParts.join(':');
  }

  /**
   * Check if cached result is still valid
   */
  isCacheValid(cached) {
    if (!cached || !cached.timestamp || !cached.result) return false;
    
    // Check if cache has expired
    const age = Date.now() - cached.timestamp;
    const maxAge = 86400000; // 24 hours default
    
    return age < maxAge;
  }

  /**
   * Get maximum cache age for request type
   */
  getMaxCacheAge(request) {
    const cacheAges = {
      'market_research': 86400000,     // 24 hours
      'content_monitoring': 3600000,    // 1 hour
      'competitor_analysis': 43200000,  // 12 hours
      'trend_detection': 7200000,       // 2 hours
      'news_aggregation': 1800000,      // 30 minutes
      'default': 3600000                // 1 hour
    };
    
    return cacheAges[request.templateName] || cacheAges.default;
  }

  /**
   * Compress payload using built-in compression
   */
  async compressPayload(data) {
    const encoder = new TextEncoder();
    const dataString = JSON.stringify(data);
    const encoded = encoder.encode(dataString);
    
    // Use CompressionStream if available
    if (typeof CompressionStream !== 'undefined') {
      const cs = new CompressionStream('gzip');
      const writer = cs.writable.getWriter();
      writer.write(encoded);
      writer.close();
      
      const compressed = [];
      const reader = cs.readable.getReader();
      let result;
      while (!(result = await reader.read()).done) {
        compressed.push(result.value);
      }
      
      return Buffer.concat(compressed).toString('base64');
    }
    
    // Fallback to base64 encoding
    return btoa(dataString);
  }

  /**
   * Check if current time is peak
   */
  isPeakTime() {
    const hour = new Date().getUTCHours();
    // Peak times: 14:00-22:00 UTC (9am-5pm EST)
    return hour >= 14 && hour <= 22;
  }

  /**
   * Get next off-peak time
   */
  getNextOffPeakTime() {
    const now = new Date();
    const hour = now.getUTCHours();
    
    if (hour < 14) {
      // Already off-peak, return current time
      return now.getTime();
    } else if (hour >= 22) {
      // Off-peak starts now
      return now.getTime();
    } else {
      // Next off-peak is at 22:00 UTC
      const nextOffPeak = new Date(now);
      nextOffPeak.setUTCHours(22, 0, 0, 0);
      return nextOffPeak.getTime();
    }
  }

  /**
   * Calculate model downgrade savings
   */
  calculateModelSavings(oldModel, newModel, tokens) {
    const costs = {
      'gpt-4': 0.03,
      'gpt-4-turbo': 0.01,
      'gpt-3.5-turbo': 0.0015,
      'claude-3-opus': 0.015,
      'claude-3-sonnet': 0.003,
      'claude-3-haiku': 0.00025
    };
    
    const oldCost = (tokens / 1000) * costs[oldModel];
    const newCost = (tokens / 1000) * costs[newModel];
    
    return oldCost - newCost;
  }

  /**
   * Calculate savings percentage
   */
  calculateSavingsPercentage(request, savings) {
    if (!request.estimatedCost || request.estimatedCost === 0) return 0;
    return (savings / request.estimatedCost) * 100;
  }

  /**
   * Cache optimization result
   */
  async cacheOptimization(original, optimized, optimizations) {
    const cacheKey = `opt-${original.requestId}`;
    const cacheData = {
      original,
      optimized,
      optimizations,
      timestamp: Date.now()
    };
    
    await this.env.RESOURCE_CACHE.put(
      cacheKey,
      JSON.stringify(cacheData),
      { expirationTtl: 3600 } // 1 hour
    );
    
    // Also store in database for analytics
    await this.env.DB.prepare(
      `INSERT INTO optimization_cache 
       (cache_key, optimization_type, original_request, optimized_request, savings_estimate)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(
      cacheKey,
      optimizations.map(o => o.type).join(','),
      JSON.stringify(original),
      JSON.stringify(optimized),
      optimizations.reduce((sum, o) => sum + (o.savings || 0), 0)
    ).run();
  }

  /**
   * Get optimization statistics
   */
  async getOptimizationStats(clientId) {
    const stats = await this.env.DB.prepare(
      `SELECT 
         optimization_type,
         COUNT(*) as count,
         SUM(savings_estimate) as total_savings,
         AVG(savings_estimate) as avg_savings
       FROM optimization_cache
       WHERE json_extract(original_request, '$.clientId') = ?
         AND created_at > datetime('now', '-7 days')
       GROUP BY optimization_type
       ORDER BY total_savings DESC`
    ).bind(clientId).all();

    return {
      clientId,
      period: '7 days',
      optimizations: stats.results,
      totalSavings: stats.results.reduce((sum, s) => sum + s.total_savings, 0)
    };
  }
}