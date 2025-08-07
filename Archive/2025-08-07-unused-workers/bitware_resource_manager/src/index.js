import { ResourcePoolManager } from './core/resource-pool.js';
import { QueueManager } from './core/queue-manager.js';
import { CostTracker } from './services/cost-tracker.js';
import { ResourceOptimizer } from './services/resource-optimizer.js';
import { Scheduler } from './services/scheduler.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Initialize services
    const resourcePool = new ResourcePoolManager(env);
    const queueManager = new QueueManager(env);
    const costTracker = new CostTracker(env);
    const optimizer = new ResourceOptimizer(env);
    const scheduler = new Scheduler(env, resourcePool, queueManager, costTracker, optimizer);

    // Load state from KV
    await resourcePool.loadState();
    await queueManager.loadState();

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Worker-ID',
      'Content-Type': 'application/json'
    };

    // Handle OPTIONS
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Public endpoints
      if (path === '/' && method === 'GET') {
        return handleHealthCheck(env);
      }

      if (path === '/health' && method === 'GET') {
        return handleDetailedHealth(env, resourcePool, queueManager);
      }

      if (path === '/status' && method === 'GET') {
        return handleStatus(resourcePool, queueManager);
      }

      if (path === '/metrics' && method === 'GET') {
        return handleMetrics(env);
      }

      // Resource management endpoints
      if (path === '/api/resources/availability' && method === 'GET') {
        return handleResourceAvailability(resourcePool);
      }

      if (path === '/api/resources/check' && method === 'POST') {
        return handleResourceCheck(request, resourcePool);
      }

      if (path === '/api/resources/estimate' && method === 'POST') {
        return handleResourceEstimate(request, costTracker);
      }

      // Queue management endpoints
      if (path === '/api/queue/status' && method === 'GET') {
        return handleQueueStatus(queueManager);
      }

      if (path.startsWith('/api/queue/position/') && method === 'GET') {
        const requestId = path.split('/').pop();
        return handleQueuePosition(requestId, env);
      }

      if (path === '/api/queue/enqueue' && method === 'POST') {
        return handleEnqueue(request, queueManager, costTracker, optimizer);
      }

      if (path.startsWith('/api/queue/') && method === 'DELETE') {
        const requestId = path.split('/').pop();
        return handleDequeue(requestId, queueManager);
      }

      // Execution endpoints
      if (path === '/api/execute' && method === 'POST') {
        return handleExecute(request, env, resourcePool, queueManager, costTracker, optimizer, scheduler);
      }

      if (path.startsWith('/api/execution/') && path.endsWith('/cancel') && method === 'POST') {
        const requestId = path.split('/')[3];
        return handleCancel(requestId, queueManager);
      }

      if (path.startsWith('/api/execution/') && method === 'GET') {
        const requestId = path.split('/').pop();
        return handleExecutionStatus(requestId, env);
      }

      // Cost and usage endpoints
      if (path.startsWith('/api/usage/') && path.endsWith('/current') && method === 'GET') {
        const clientId = path.split('/')[3];
        return handleCurrentUsage(clientId, env);
      }

      if (path.startsWith('/api/usage/') && method === 'GET') {
        const clientId = path.split('/').pop();
        return handleUsageHistory(clientId, env, costTracker);
      }

      if (path.startsWith('/api/cost/estimate') && method === 'POST') {
        return handleCostEstimate(request, costTracker);
      }

      if (path.startsWith('/api/cost/') && method === 'GET') {
        const requestId = path.split('/').pop();
        return handleRequestCost(requestId, env);
      }

      // Optimization endpoints
      if (path === '/api/optimize/analyze' && method === 'POST') {
        return handleOptimizationAnalysis(request, optimizer);
      }

      if (path.startsWith('/api/optimize/stats/') && method === 'GET') {
        const clientId = path.split('/').pop();
        return handleOptimizationStats(clientId, optimizer);
      }

      if (path.startsWith('/api/optimize/recommendations/') && method === 'GET') {
        const clientId = path.split('/').pop();
        return handleOptimizationRecommendations(clientId, costTracker);
      }

      // Internal endpoints (worker-to-worker)
      if (path === '/internal/reserve' && method === 'POST') {
        return handleInternalReserve(request, resourcePool);
      }

      if (path === '/internal/release' && method === 'POST') {
        return handleInternalRelease(request, resourcePool);
      }

      if (path === '/internal/consume' && method === 'POST') {
        return handleInternalConsume(request, resourcePool);
      }

      // Admin endpoints
      if (path === '/admin/scheduler/start' && method === 'POST') {
        await scheduler.start();
        return jsonResponse({ success: true, message: 'Scheduler started' });
      }

      if (path === '/admin/scheduler/stop' && method === 'POST') {
        scheduler.stop();
        return jsonResponse({ success: true, message: 'Scheduler stopped' });
      }

      if (path === '/admin/alerts' && method === 'GET') {
        return handleAlerts(env);
      }

      return new Response('Not Found', { status: 404 });

    } catch (error) {
      console.error('Request error:', error);
      return jsonResponse({ 
        error: error.message,
        stack: error.stack 
      }, 500);
    }
  }
};

// Handler functions

async function handleHealthCheck(env) {
  return jsonResponse({
    status: 'healthy',
    service: 'resource-manager',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
}

async function handleDetailedHealth(env, resourcePool, queueManager) {
  const poolStatus = await resourcePool.getStatus();
  const queueStatus = queueManager.getQueueStatus();
  
  return jsonResponse({
    status: 'healthy',
    service: 'resource-manager',
    components: {
      database: await checkDatabase(env),
      resourcePools: poolStatus,
      queues: queueStatus,
      storage: await checkStorage(env)
    },
    timestamp: new Date().toISOString()
  });
}

async function handleStatus(resourcePool, queueManager) {
  const poolStatus = await resourcePool.getStatus();
  const queueStatus = queueManager.getQueueStatus();
  
  return jsonResponse({
    resources: poolStatus,
    queues: queueStatus,
    timestamp: new Date().toISOString()
  });
}

async function handleMetrics(env) {
  const metrics = await env.DB.prepare(
    `SELECT * FROM performance_metrics 
     WHERE timestamp > datetime('now', '-1 hour')
     ORDER BY timestamp DESC
     LIMIT 100`
  ).all();

  return jsonResponse({
    metrics: metrics.results,
    timestamp: new Date().toISOString()
  });
}

async function handleResourceAvailability(resourcePool) {
  const status = await resourcePool.getStatus();
  return jsonResponse({ availability: status });
}

async function handleResourceCheck(request, resourcePool) {
  const data = await request.json();
  const { resourceType, amount } = data;
  
  const availability = await resourcePool.checkAvailability(resourceType, amount);
  return jsonResponse(availability);
}

async function handleResourceEstimate(request, costTracker) {
  const data = await request.json();
  const { template, clientTier } = data;
  
  const estimate = await costTracker.estimateCost(template, clientTier);
  return jsonResponse(estimate);
}

async function handleQueueStatus(queueManager) {
  const status = queueManager.getQueueStatus();
  return jsonResponse(status);
}

async function handleQueuePosition(requestId, env) {
  const result = await env.DB.prepare(
    'SELECT * FROM resource_queue WHERE request_id = ?'
  ).bind(requestId).first();

  if (!result) {
    return jsonResponse({ error: 'Request not found' }, 404);
  }

  return jsonResponse({
    requestId,
    status: result.status,
    queue: result.queue_name,
    priority: result.priority,
    estimatedWait: result.estimated_wait_ms,
    queuedAt: result.queued_at
  });
}

async function handleEnqueue(request, queueManager, costTracker, optimizer) {
  const data = await request.json();
  
  // Validate required fields
  if (!data.requestId || !data.clientId || !data.templateName) {
    return jsonResponse({ 
      error: 'Missing required fields: requestId, clientId, templateName' 
    }, 400);
  }

  // Estimate cost
  const costEstimate = await costTracker.estimateCost(
    data.templateName,
    data.clientTier || 'standard'
  );

  // Check budget
  const budgetCheck = await costTracker.checkBudget(
    data.clientId,
    costEstimate.estimated
  );

  if (!budgetCheck.available) {
    return jsonResponse({
      error: 'Insufficient budget',
      details: budgetCheck
    }, 402);
  }

  // Prepare request
  const queueRequest = {
    ...data,
    estimatedCost: costEstimate.estimated,
    enqueuedAt: Date.now()
  };

  // Enqueue
  const position = await queueManager.enqueue(queueRequest);
  
  return jsonResponse({
    success: true,
    ...position,
    estimatedCost: costEstimate.estimated
  });
}

async function handleDequeue(requestId, queueManager) {
  const removed = await queueManager.removeFromQueue(requestId);
  
  if (!removed) {
    return jsonResponse({ error: 'Request not found in queue' }, 404);
  }

  return jsonResponse({ success: true, message: 'Request removed from queue' });
}

async function handleExecute(request, env, resourcePool, queueManager, costTracker, optimizer, scheduler) {
  const data = await request.json();
  
  // Validate request
  if (!data.requestId || !data.clientId || !data.templateName) {
    return jsonResponse({ 
      error: 'Missing required fields' 
    }, 400);
  }

  // Check if scheduler is running
  if (!scheduler.isRunning) {
    await scheduler.start();
  }

  // Enqueue for execution
  const queueRequest = {
    ...data,
    priority: data.priority || 'normal',
    urgency: data.urgency || 'normal',
    enqueuedAt: Date.now()
  };

  const position = await queueManager.enqueue(queueRequest);
  
  return jsonResponse({
    success: true,
    message: 'Request queued for execution',
    ...position
  });
}

async function handleCancel(requestId, queueManager) {
  const removed = await queueManager.removeFromQueue(requestId);
  
  if (removed) {
    return jsonResponse({ success: true, message: 'Request cancelled' });
  }

  return jsonResponse({ error: 'Request not found or already executing' }, 404);
}

async function handleExecutionStatus(requestId, env) {
  const execution = await env.DB.prepare(
    'SELECT * FROM execution_history WHERE request_id = ?'
  ).bind(requestId).first();

  if (!execution) {
    // Check if still in queue
    const queued = await env.DB.prepare(
      'SELECT * FROM resource_queue WHERE request_id = ?'
    ).bind(requestId).first();

    if (queued) {
      return jsonResponse({
        requestId,
        status: queued.status,
        queue: queued.queue_name,
        estimatedWait: queued.estimated_wait_ms
      });
    }

    return jsonResponse({ error: 'Request not found' }, 404);
  }

  return jsonResponse({
    requestId,
    status: execution.status,
    startedAt: execution.started_at,
    completedAt: execution.completed_at,
    duration: execution.duration_ms,
    cost: execution.total_cost,
    output: JSON.parse(execution.output_data || '{}')
  });
}

async function handleCurrentUsage(clientId, env) {
  const today = new Date().toISOString().split('T')[0];
  
  const usage = await env.DB.prepare(
    'SELECT * FROM client_quotas WHERE client_id = ? AND date = ?'
  ).bind(clientId, today).first();

  return jsonResponse({
    clientId,
    date: today,
    usage: usage || { requests_today: 0, cost_today: 0, cost_month: 0 }
  });
}

async function handleUsageHistory(clientId, env, costTracker) {
  const report = await costTracker.getClientCostReport(clientId, 'month');
  return jsonResponse(report);
}

async function handleCostEstimate(request, costTracker) {
  const data = await request.json();
  const estimate = await costTracker.estimateCost(
    data.template,
    data.clientTier || 'standard'
  );
  return jsonResponse(estimate);
}

async function handleRequestCost(requestId, env) {
  const costs = await env.DB.prepare(
    `SELECT * FROM cost_tracking WHERE request_id = ?`
  ).bind(requestId).all();

  const total = costs.results.reduce((sum, c) => sum + c.total_cost, 0);

  return jsonResponse({
    requestId,
    totalCost: total,
    breakdown: costs.results,
    currency: 'USD'
  });
}

async function handleOptimizationAnalysis(request, optimizer) {
  const data = await request.json();
  const result = await optimizer.optimizeRequest(data);
  return jsonResponse(result);
}

async function handleOptimizationStats(clientId, optimizer) {
  const stats = await optimizer.getOptimizationStats(clientId);
  return jsonResponse(stats);
}

async function handleOptimizationRecommendations(clientId, costTracker) {
  const recommendations = await costTracker.generateOptimizations(clientId);
  return jsonResponse(recommendations);
}

async function handleInternalReserve(request, resourcePool) {
  const data = await request.json();
  const result = await resourcePool.allocate(data);
  return jsonResponse(result);
}

async function handleInternalRelease(request, resourcePool) {
  const data = await request.json();
  await resourcePool.release(data.allocationId);
  return jsonResponse({ success: true });
}

async function handleInternalConsume(request, resourcePool) {
  const data = await request.json();
  const result = await resourcePool.allocate(data);
  return jsonResponse(result);
}

async function handleAlerts(env) {
  const alerts = await env.DB.prepare(
    `SELECT * FROM resource_alerts 
     WHERE acknowledged = 0 
     ORDER BY severity DESC, created_at DESC
     LIMIT 100`
  ).all();

  return jsonResponse({
    alerts: alerts.results,
    count: alerts.results.length
  });
}

// Utility functions

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

async function checkDatabase(env) {
  try {
    const result = await env.DB.prepare('SELECT 1').first();
    return { status: 'healthy', connected: true };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkStorage(env) {
  const checks = {};
  
  try {
    await env.RESOURCE_CACHE.put('health-check', 'ok', { expirationTtl: 60 });
    checks.kv = 'healthy';
  } catch (error) {
    checks.kv = 'unhealthy';
  }

  try {
    await env.DATA_STORAGE.put('health-check', 'ok');
    checks.r2 = 'healthy';
  } catch (error) {
    checks.r2 = 'unhealthy';
  }

  return checks;
}