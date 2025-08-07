import { Env, AuthenticatedRequest } from '../types';
import { DatabaseService } from '../services/database';
import { jsonResponse, serverError } from '../helpers/http';

export async function handleHealthCheck(env: Env): Promise<Response> {
  return jsonResponse({
    status: 'healthy',
    service: 'bitware-orchestrator-v2',
    version: env.VERSION || '2.0.0',
    environment: env.ENVIRONMENT || 'production',
    timestamp: new Date().toISOString()
  });
}

export async function handleDetailedHealth(env: Env): Promise<Response> {
  try {
    const dbHealth = await checkDatabaseHealth(env.DB);
    const kvHealth = await checkKVHealth(env.EXECUTION_CACHE);
    const workerHealth = await checkWorkerHealth(env);

    const overallStatus = dbHealth && kvHealth ? 'healthy' : 'degraded';

    return jsonResponse({
      status: overallStatus,
      service: 'bitware-orchestrator-v2',
      version: env.VERSION || '2.0.0',
      environment: env.ENVIRONMENT || 'production',
      components: {
        database: {
          status: dbHealth ? 'healthy' : 'unhealthy',
          message: dbHealth ? 'Connected' : 'Connection failed'
        },
        kv_cache: {
          status: kvHealth ? 'healthy' : 'unhealthy',
          message: kvHealth ? 'Accessible' : 'Access failed'
        },
        workers: workerHealth
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return serverError('Health check failed', error);
  }
}

async function checkDatabaseHealth(db: D1Database): Promise<boolean> {
  try {
    const result = await db.prepare('SELECT 1 as test').first();
    return result !== null;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

async function checkKVHealth(kv: KVNamespace): Promise<boolean> {
  try {
    const testKey = 'health_check_' + Date.now();
    await kv.put(testKey, 'ok', { expirationTtl: 60 });
    const value = await kv.get(testKey);
    await kv.delete(testKey);
    return value === 'ok';
  } catch (error) {
    console.error('KV health check failed:', error);
    return false;
  }
}

async function checkWorkerHealth(env: Env): Promise<Record<string, any>> {
  const workers = [
    { name: 'KAM', binding: env.KAM },
    { name: 'TOPIC_RESEARCHER', binding: env.TOPIC_RESEARCHER },
    { name: 'RSS_FINDER', binding: env.RSS_FINDER },
    { name: 'FEED_FETCHER', binding: env.FEED_FETCHER },
    { name: 'CONTENT_CLASSIFIER', binding: env.CONTENT_CLASSIFIER },
    { name: 'REPORT_BUILDER', binding: env.REPORT_BUILDER },
    { name: 'UNIVERSAL_RESEARCHER', binding: env.UNIVERSAL_RESEARCHER },
    { name: 'OPTIMIZER', binding: env.OPTIMIZER }
  ];

  const health: Record<string, any> = {};
  
  await Promise.all(workers.map(async (worker) => {
    if (!worker.binding) {
      health[worker.name] = {
        status: 'not_configured',
        error: 'Worker binding not available'
      };
      return;
    }
    
    try {
      const response = await worker.binding.fetch(
        new Request('https://worker.internal/health')
      );
      health[worker.name] = {
        status: response.ok ? 'healthy' : 'unhealthy',
        statusCode: response.status
      };
    } catch (error) {
      health[worker.name] = {
        status: 'unreachable',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }));

  return health;
}

export async function handleGetWorkers(
  env: Env, 
  request: AuthenticatedRequest
): Promise<Response> {
  if (!request.auth) {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = new DatabaseService(env.DB);
    const workers = await db.getWorkerRegistry();

    const workersWithStatus = await Promise.all(workers.map(async (worker) => {
      const activeCount = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM stage_executions 
        WHERE worker_name = ? AND status = 'running'
      `).bind(worker.worker_name).first();

      return {
        ...worker,
        capabilities: JSON.parse(worker.capabilities || '[]'),
        resource_requirements: JSON.parse(worker.resource_requirements || '{}'),
        active_executions: activeCount?.count || 0
      };
    }));

    return jsonResponse({
      success: true,
      workers: workersWithStatus
    });
  } catch (error) {
    return serverError('Failed to get workers', error);
  }
}

export async function handleResourceStatus(
  env: Env,
  request: AuthenticatedRequest
): Promise<Response> {
  if (!request.auth) {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = new DatabaseService(env.DB);
    const pools = await db.getResourcePools();
    const usage = await db.getResourceUsageStats();

    const poolsWithUsage = pools.map(pool => {
      const poolUsage = usage.find(u => 
        u.resource_type === pool.resource_type && 
        u.resource_name === pool.resource_name
      );

      return {
        ...pool,
        current_usage: poolUsage?.total_used || 0,
        cost_incurred: poolUsage?.total_cost || 0,
        utilization_percentage: pool.daily_limit 
          ? ((poolUsage?.total_used || 0) / pool.daily_limit) * 100 
          : 0
      };
    });

    return jsonResponse({
      success: true,
      pools: poolsWithUsage,
      usage_summary: {
        total_cost_today: usage.reduce((sum, u) => sum + (u.total_cost || 0), 0),
        total_api_calls: usage.filter(u => u.resource_type === 'api')
          .reduce((sum, u) => sum + (u.usage_count || 0), 0),
        total_storage_mb: usage.filter(u => u.resource_type === 'storage')
          .reduce((sum, u) => sum + (u.total_used || 0), 0)
      }
    });
  } catch (error) {
    return serverError('Failed to get resource status', error);
  }
}

export async function handleResourceAvailability(
  env: Env,
  request: AuthenticatedRequest
): Promise<Response> {
  if (!request.auth) {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const availability = await env.DB.prepare(`
      SELECT * FROM resource_availability 
      WHERE snapshot_time > datetime('now', '-1 hour')
      ORDER BY snapshot_time DESC
      LIMIT 20
    `).all();

    const activeAllocations = await env.DB.prepare(`
      SELECT resource_type, resource_name, SUM(quantity_allocated) as total_allocated
      FROM resource_allocations
      WHERE status IN ('reserved', 'active')
      GROUP BY resource_type, resource_name
    `).all();

    return jsonResponse({
      success: true,
      availability: availability.results || [],
      active_allocations: activeAllocations.results || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return serverError('Failed to get resource availability', error);
  }
}

export async function handleSystemMetrics(
  env: Env,
  request: AuthenticatedRequest
): Promise<Response> {
  if (!request.auth) {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const executionMetrics = await env.DB.prepare(`
      SELECT 
        COUNT(*) as total_executions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as running,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        AVG(total_cost_usd) as avg_cost,
        AVG(total_time_ms) as avg_time,
        MAX(total_cost_usd) as max_cost,
        MIN(total_cost_usd) as min_cost
      FROM pipeline_executions
      WHERE created_at > datetime('now', '-24 hours')
    `).first();

    const queueMetrics = await env.DB.prepare(`
      SELECT 
        COUNT(*) as queue_length,
        COUNT(CASE WHEN priority >= 75 THEN 1 END) as high_priority,
        COUNT(CASE WHEN status = 'blocked' THEN 1 END) as blocked
      FROM execution_queue
      WHERE status IN ('queued', 'ready', 'blocked')
    `).first();

    const workerMetrics = await env.DB.prepare(`
      SELECT 
        worker_name,
        COUNT(*) as execution_count,
        AVG(time_ms) as avg_time,
        SUM(cost_usd) as total_cost
      FROM stage_executions
      WHERE started_at > datetime('now', '-24 hours')
      GROUP BY worker_name
    `).all();

    return jsonResponse({
      success: true,
      metrics: {
        executions: executionMetrics,
        queue: queueMetrics,
        workers: workerMetrics.results || [],
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return serverError('Failed to get system metrics', error);
  }
}