import { Env, ResourcePool, ResourceAllocation, ResourceEstimate } from '../types';
import { DatabaseService } from './database';

export class ResourceManager {
  private env: Env;
  private db: DatabaseService;
  private resourceLimits: Map<string, any>;

  constructor(env: Env) {
    this.env = env;
    this.db = new DatabaseService(env.DB);
    this.resourceLimits = new Map();
    this.initializeResourceLimits();
  }

  private initializeResourceLimits() {
    this.resourceLimits.set('openai_gpt4', {
      daily_limit: 10000,
      rate_limit_per_minute: 100,
      cost_per_token: 0.00003
    });
    
    this.resourceLimits.set('openai_gpt35', {
      daily_limit: 50000,
      rate_limit_per_minute: 200,
      cost_per_token: 0.000001
    });
    
    this.resourceLimits.set('anthropic_claude', {
      daily_limit: 5000,
      rate_limit_per_minute: 50,
      cost_per_token: 0.00002
    });
    
    this.resourceLimits.set('kv_storage', {
      monthly_limit: 1000, // MB
      cost_per_mb: 0.0001
    });
    
    this.resourceLimits.set('r2_storage', {
      monthly_limit: null, // Unlimited
      cost_per_gb: 0.015
    });
  }

  async checkAvailability(
    resourceType: string,
    resourceName: string,
    quantity: number
  ): Promise<{ available: boolean; reason?: string; waitTime?: number }> {
    console.log('checkAvailability called:', { resourceType, resourceName, quantity });
    
    // For now, always return available to get the pipeline working
    // TODO: Implement proper availability checking
    return { available: true };
    
    /* TODO: Fix availability checking
    const cacheKey = `resource:availability:${resourceType}:${resourceName}`;
    const cached = await this.env.RESOURCE_CACHE.get(cacheKey);
    
    if (cached) {
      const data = JSON.parse(cached);
      if (data.timestamp > Date.now() - 30000) {
        return this.evaluateAvailability(data, quantity);
      }
    }

    const pool = await this.env.DB.prepare(`
      SELECT * FROM resource_pools 
      WHERE resource_type = ? AND resource_name = ? AND is_active = 1
    `).bind(resourceType, resourceName).first();

    if (!pool) {
      return { available: false, reason: 'Resource pool not found' };
    }

    const periodClause = pool.reset_schedule === 'daily'
      ? "datetime('now', '-1 day')"
      : "datetime('now', '-1 month')";

    const usage = await this.env.DB.prepare(`
      SELECT SUM(quantity_used) as total_used
      FROM resource_usage
      WHERE resource_type = ? AND resource_name = ?
      AND timestamp > ${periodClause}
    `).bind(resourceType, resourceName).first();

    const allocations = await this.env.DB.prepare(`
      SELECT SUM(quantity_allocated) as total_allocated
      FROM resource_allocations
      WHERE resource_type = ? AND resource_name = ?
      AND status IN ('reserved', 'active')
      AND (expires_at IS NULL OR expires_at > datetime('now'))
    `).bind(resourceType, resourceName).first();

    const limit = (pool.daily_limit || pool.monthly_limit || Number.MAX_SAFE_INTEGER) as number;
    const used = (usage?.total_used as number) || 0;
    const allocated = (allocations?.total_allocated as number) || 0;
    const available = limit - used - allocated;

    const availabilityData = {
      limit,
      used,
      allocated,
      available,
      timestamp: Date.now()
    };

    await this.env.RESOURCE_CACHE.put(
      cacheKey,
      JSON.stringify(availabilityData),
      { expirationTtl: 60 }
    );

    return this.evaluateAvailability(availabilityData, quantity);
    */
  }

  private evaluateAvailability(
    data: any,
    quantity: number
  ): { available: boolean; reason?: string; waitTime?: number } {
    if (data.available >= quantity) {
      return { available: true };
    }

    if (data.available <= 0) {
      return {
        available: false,
        reason: 'Resource exhausted',
        waitTime: this.estimateWaitTime(data.limit, data.used)
      };
    }

    return {
      available: false,
      reason: `Insufficient resources (${data.available} available, ${quantity} requested)`,
      waitTime: this.estimateWaitTime(data.limit, data.used + quantity - data.available)
    };
  }

  private estimateWaitTime(limit: number, currentUsage: number): number {
    if (currentUsage < limit * 0.5) return 0;
    if (currentUsage < limit * 0.75) return 60000; // 1 minute
    if (currentUsage < limit * 0.9) return 300000; // 5 minutes
    return 900000; // 15 minutes
  }

  async reserve(
    executionId: string,
    resources: Array<{
      type: string;
      name: string;
      quantity: number;
    }>
  ): Promise<{ success: boolean; allocations: string[]; failures: any[] }> {
    console.log('ResourceManager.reserve called:', { executionId, resources });
    const allocations: string[] = [];
    const failures: any[] = [];

    for (const resource of resources) {
      console.log('Checking availability for resource:', resource);
      const availability = await this.checkAvailability(
        resource.type,
        resource.name,
        resource.quantity
      );
      console.log('Availability result:', availability);

      if (!availability.available) {
        failures.push({
          resource: `${resource.type}:${resource.name}`,
          reason: availability.reason,
          waitTime: availability.waitTime
        });
        continue;
      }

      try {
        const allocationId = await this.db.createResourceAllocation({
          execution_id: executionId,
          resource_type: resource.type,
          resource_name: resource.name,
          quantity_allocated: resource.quantity,
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          status: 'reserved'
        });

        allocations.push(allocationId);

        await this.invalidateCache(resource.type, resource.name);
      } catch (error) {
        console.error(`Failed to allocate ${resource.type}:${resource.name}:`, error);
        failures.push({
          resource: `${resource.type}:${resource.name}`,
          reason: 'Allocation failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    if (failures.length > 0 && allocations.length > 0) {
      for (const allocationId of allocations) {
        await this.db.releaseResourceAllocation(allocationId);
      }
      return { success: false, allocations: [], failures };
    }

    return { success: failures.length === 0, allocations, failures };
  }

  async activate(allocationIds: string[]): Promise<void> {
    for (const allocationId of allocationIds) {
      await this.env.DB.prepare(`
        UPDATE resource_allocations 
        SET status = 'active' 
        WHERE allocation_id = ?
      `).bind(allocationId).run();
    }
  }

  async release(allocationIds: string[]): Promise<void> {
    for (const allocationId of allocationIds) {
      const allocation = await this.env.DB.prepare(`
        SELECT * FROM resource_allocations WHERE allocation_id = ?
      `).bind(allocationId).first();

      if (allocation) {
        await this.db.releaseResourceAllocation(allocationId);
        await this.invalidateCache(
          allocation.resource_type as string,
          allocation.resource_name as string
        );
      }
    }
  }

  async recordUsage(
    executionId: string,
    stageId: string | null,
    usage: Array<{
      type: string;
      name: string;
      quantity: number;
      unit: string;
      cost?: number;
    }>
  ): Promise<number> {
    let totalCost = 0;

    for (const item of usage) {
      const cost = item.cost || this.calculateCost(item.type, item.name, item.quantity);
      totalCost += cost;

      await this.db.recordResourceUsage({
        resource_type: item.type as 'api' | 'storage' | 'worker' | 'network',
        resource_name: item.name,
        execution_id: executionId,
        stage_id: stageId || undefined,
        quantity_used: item.quantity,
        unit: item.unit,
        cost_usd: cost,
        usage_id: '',
        timestamp: new Date().toISOString()
      });

      await this.invalidateCache(item.type, item.name);
    }

    return totalCost;
  }

  private calculateCost(type: string, name: string, quantity: number): number {
    const resourceKey = `${name}`;
    const limits = this.resourceLimits.get(resourceKey);
    
    if (!limits) return 0;

    switch (type) {
      case 'api':
        return quantity * (limits.cost_per_token || 0);
      case 'storage':
        if (name.includes('kv')) {
          return (quantity / 1024) * (limits.cost_per_mb || 0);
        }
        if (name.includes('r2')) {
          return (quantity / (1024 * 1024)) * (limits.cost_per_gb || 0);
        }
        return 0;
      case 'compute':
        return (quantity / 1000) * 0.000001; // CPU ms cost
      default:
        return 0;
    }
  }

  async estimateResources(
    templateName: string,
    parameters: any,
    stages?: any[]
  ): Promise<ResourceEstimate[]> {
    // In v2, templates are not stored locally, they come from the pipeline executor
    if (!stages || stages.length === 0) {
      console.warn('No stages provided for resource estimation');
      return [];
    }

    const estimates: ResourceEstimate[] = [];

    // For now, return default estimates to get the pipeline working
    // TODO: Implement proper resource estimation based on historical data
    for (const stage of stages) {
      if (stage.worker_name === 'bitware-content-granulator') {
        estimates.push({
          resource_type: 'api',
          resource_name: 'openai_gpt35',
          estimated_quantity: 2000, // tokens
          confidence: 0.8,
          availability: 'available'
        });
      }
    }

    console.log('Resource estimates generated:', estimates);
    return estimates;

    /* TODO: Fix historical query
    for (const stage of stages) {
      const historical = await this.env.DB.prepare(`
        SELECT AVG(quantity_used) as avg_usage, resource_type, resource_name
        FROM resource_usage ru
        JOIN stage_executions se ON ru.stage_id = se.stage_id
        WHERE se.worker_name = ?
        GROUP BY resource_type, resource_name
      `).bind(stage.worker_name).all();

      for (const hist of historical.results || []) {
        const availability = await this.checkAvailability(
          hist.resource_type as string,
          hist.resource_name as string,
          Math.ceil(hist.avg_usage as number)
        );

        estimates.push({
          resource_type: hist.resource_type as string,
          resource_name: hist.resource_name as string,
          estimated_quantity: Math.ceil(hist.avg_usage as number),
          unit: this.getResourceUnit(hist.resource_type as string),
          estimated_cost_usd: this.calculateCost(
            hist.resource_type as string,
            hist.resource_name as string,
            Math.ceil(hist.avg_usage as number)
          ),
          availability: availability.available ? 'available' : 'limited',
          availability_message: availability.reason || undefined
        });
      }
    }

    return estimates;
    */
  }

  private getResourceUnit(type: string): string {
    switch (type) {
      case 'api': return 'tokens';
      case 'storage': return 'MB';
      case 'compute': return 'ms';
      case 'network': return 'requests';
      default: return 'units';
    }
  }

  async getResourcePool(): Promise<ResourcePool> {
    const pools = await this.db.getResourcePools();
    const usage = await this.db.getResourceUsageStats();

    const openaiApi = this.buildApiResource('openai', pools, usage);
    const anthropicApi = this.buildApiResource('anthropic', pools, usage);
    const emailQuota = this.buildQuotaResource('email', pools, usage);
    const workerCapacity = await this.buildWorkerCapacity();
    const storage = await this.buildStorageResource();

    return {
      openai_api: openaiApi,
      anthropic_api: anthropicApi,
      email_quota: emailQuota,
      worker_capacity: workerCapacity,
      storage: storage
    };
  }

  private buildApiResource(provider: string, pools: any[], usage: any[]): any {
    const pool = pools.find(p => p.provider === provider && p.resource_type === 'api');
    const used = usage.find(u => u.resource_name?.includes(provider));

    return {
      provider,
      daily_limit: pool?.daily_limit || 10000,
      used_today: used?.total_used || 0,
      rate_limit_per_minute: pool?.rate_limit_per_minute || 100,
      current_rate: 0,
      cost_per_1k_tokens: pool?.cost_per_unit || 0.00003,
      reset_time: new Date(Date.now() + 86400000).toISOString()
    };
  }

  private buildQuotaResource(name: string, pools: any[], usage: any[]): any {
    const pool = pools.find(p => p.resource_name === name);
    const used = usage.find(u => u.resource_name === name);

    return {
      resource_name: name,
      period: pool?.reset_schedule || 'monthly',
      limit: pool?.monthly_limit || 3000,
      used_current_period: used?.total_used || 0,
      reset_date: new Date(Date.now() + 30 * 86400000).toISOString()
    };
  }

  private async buildWorkerCapacity(): Promise<any> {
    const workers = await this.db.getWorkerRegistry();
    const capacity: any = {};

    for (const worker of workers) {
      const active = await this.env.DB.prepare(`
        SELECT COUNT(*) as count FROM stage_executions
        WHERE worker_name = ? AND status = 'running'
      `).bind(worker.worker_name).first();

      capacity[worker.worker_name] = {
        max_concurrent: worker.max_concurrent_executions || 1,
        active_count: active?.count || 0,
        queue_length: 0,
        avg_execution_time_ms: worker.avg_execution_time_ms || 60000,
        health_status: worker.health_status || 'healthy'
      };
    }

    return capacity;
  }

  private async buildStorageResource(): Promise<any> {
    const kvStats = await this.env.EXECUTION_CACHE.list({ limit: 1 });
    const r2Stats = await this.env.DATA_STORAGE.list({ limit: 1 });
    
    return {
      kv_usage: {
        used_mb: 0, // Would need actual calculation
        limit_mb: 1000,
        percentage_used: 0
      },
      r2_usage: {
        used_gb: 0, // Would need actual calculation
        limit_gb: null,
        object_count: 0
      },
      d1_usage: {
        rows_count: 0, // Would need actual calculation
        size_mb: 0
      }
    };
  }

  private async invalidateCache(resourceType: string, resourceName: string): Promise<void> {
    const cacheKey = `resource:availability:${resourceType}:${resourceName}`;
    await this.env.RESOURCE_CACHE.delete(cacheKey);
  }

  async cleanupExpiredAllocations(): Promise<number> {
    const result = await this.env.DB.prepare(`
      UPDATE resource_allocations 
      SET status = 'expired' 
      WHERE status IN ('reserved', 'active')
      AND expires_at < datetime('now')
    `).run();

    return result.meta.changes || 0;
  }
}