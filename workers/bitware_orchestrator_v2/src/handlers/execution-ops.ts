import { Env, AuthenticatedRequest, PipelineExecution } from '../types';
import { DatabaseService } from '../services/database';
import { WorkerCoordinator } from '../services/worker-coordinator';
import { QueueManager } from '../services/queue-manager';
import { jsonResponse, badRequest, notFound, serverError, unauthorized } from '../helpers/http';
import { requireAuth } from '../helpers/auth';

export async function handleExecute(
  env: Env,
  request: AuthenticatedRequest
): Promise<Response> {
  if (!requireAuth(request.auth)) {
    return unauthorized();
  }

  try {
    const body = await request.json() as any;
    const { request_id, template_name, parameters, priority = 'normal' } = body;

    if (!template_name) {
      return badRequest('Template name is required');
    }

    const db = new DatabaseService(env.DB);
    
    // We'll fetch template details in the queue processor
    // For now, just validate the template name exists

    const clientId = request.auth?.clientId || 'default_client';

    const executionId = await db.createExecution({
      request_id,
      client_id: clientId,
      template_name,
      parameters,
      status: 'pending',
      priority
    });

    // Use QueueManager to enqueue and process
    const queueManager = new QueueManager(env);
    await queueManager.enqueue(executionId, priority);

    const estimatedTime = 180000; // Default 3 minutes, will be updated when template is fetched
    const estimatedCompletion = new Date(Date.now() + estimatedTime);

    await env.EXECUTION_CACHE.put(
      `execution:${executionId}`,
      JSON.stringify({
        executionId,
        templateName: template_name,
        status: 'pending',
        createdAt: new Date().toISOString()
      }),
      { expirationTtl: 3600 }
    );

    return jsonResponse({
      execution_id: executionId,
      status: 'queued',
      estimated_completion: estimatedCompletion.toISOString(),
      progress_url: `/progress/${executionId}`,
      message: 'Execution queued successfully'
    });
  } catch (error) {
    return serverError('Failed to start execution', error);
  }
}


export async function handleGetProgress(
  env: Env,
  request: AuthenticatedRequest,
  executionId: string
): Promise<Response> {
  if (!requireAuth(request.auth)) {
    return unauthorized();
  }

  try {
    const cachedProgress = await env.EXECUTION_CACHE.get(`progress:${executionId}`);
    if (cachedProgress) {
      return jsonResponse(JSON.parse(cachedProgress));
    }

    const db = new DatabaseService(env.DB);
    const execution = await db.getExecution(executionId);

    if (!execution) {
      return notFound('Execution not found');
    }

    if (request.auth?.clientId && 
        execution.client_id !== request.auth.clientId && 
        !request.auth.permissions?.includes('all')) {
      return unauthorized('Access denied');
    }

    const stages = await db.getStageExecutions(executionId);
    
    const completedStages = stages.filter(s => s.status === 'completed').length;
    const totalStages = stages.length || 1;
    const currentStage = stages.find(s => s.status === 'running');
    const progress = Math.round((completedStages / totalStages) * 100);

    const elapsedTime = execution.started_at 
      ? Date.now() - new Date(execution.started_at).getTime()
      : 0;

    const estimatedTotal = execution.estimated_time_ms || 180000;
    const estimatedRemaining = Math.max(0, estimatedTotal - elapsedTime);

    const progressData = {
      execution_id: executionId,
      status: execution.status,
      progress,
      stages_completed: completedStages,
      stages_total: totalStages,
      current_stage: currentStage ? {
        worker: currentStage.worker_name,
        order: currentStage.stage_order,
        status: currentStage.status
      } : null,
      message: getProgressMessage(execution.status, currentStage, progress),
      estimated_remaining_ms: execution.status === 'running' ? estimatedRemaining : null,
      started_at: execution.started_at,
      error: execution.error_message
    };

    await env.EXECUTION_CACHE.put(
      `progress:${executionId}`,
      JSON.stringify(progressData),
      { expirationTtl: 30 }
    );

    return jsonResponse(progressData);
  } catch (error) {
    return serverError('Failed to get progress', error);
  }
}

function getProgressMessage(
  status: string,
  currentStage: any,
  progress: number
): string {
  switch (status) {
    case 'pending':
      return 'Execution queued, waiting to start';
    case 'running':
      return currentStage 
        ? `Processing stage: ${currentStage.worker_name}`
        : 'Execution in progress';
    case 'completed':
      return 'Execution completed successfully';
    case 'failed':
      return 'Execution failed';
    case 'cancelled':
      return 'Execution cancelled';
    default:
      return `Progress: ${progress}%`;
  }
}

export async function handleGetExecution(
  env: Env,
  request: AuthenticatedRequest,
  executionId: string
): Promise<Response> {
  if (!requireAuth(request.auth)) {
    return unauthorized();
  }

  try {
    const db = new DatabaseService(env.DB);
    const execution = await db.getExecution(executionId);

    if (!execution) {
      return notFound('Execution not found');
    }

    if (request.auth?.clientId && 
        execution.client_id !== request.auth.clientId && 
        !request.auth.permissions?.includes('all')) {
      return unauthorized('Access denied');
    }

    const stages = await db.getStageExecutions(executionId);
    const deliverables = await db.getDeliverables(executionId);

    const costBreakdown = await env.DB.prepare(`
      SELECT * FROM cost_breakdown WHERE execution_id = ?
    `).bind(executionId).all();

    const events = await env.DB.prepare(`
      SELECT * FROM execution_events 
      WHERE execution_id = ? 
      ORDER BY timestamp DESC
      LIMIT 50
    `).bind(executionId).all();

    return jsonResponse({
      execution: {
        ...execution,
        stages: stages.map(stage => ({
          ...stage,
          summary: stage.summary_data
        }))
      },
      deliverables,
      cost_breakdown: costBreakdown.results || [],
      events: events.results || [],
      metadata: {
        total_stages: stages.length,
        completed_stages: stages.filter(s => s.status === 'completed').length,
        failed_stages: stages.filter(s => s.status === 'failed').length
      }
    });
  } catch (error) {
    return serverError('Failed to get execution details', error);
  }
}

export async function handleCancelExecution(
  env: Env,
  request: AuthenticatedRequest,
  executionId: string
): Promise<Response> {
  if (!requireAuth(request.auth)) {
    return unauthorized();
  }

  try {
    const db = new DatabaseService(env.DB);
    const execution = await db.getExecution(executionId);

    if (!execution) {
      return notFound('Execution not found');
    }

    if (request.auth?.clientId && 
        execution.client_id !== request.auth.clientId && 
        !request.auth.permissions?.includes('all')) {
      return unauthorized('Access denied');
    }

    if (execution.status === 'completed' || execution.status === 'failed') {
      return badRequest(`Cannot cancel ${execution.status} execution`);
    }

    await db.updateExecution(executionId, {
      status: 'cancelled',
      completed_at: new Date().toISOString(),
      error_message: 'Cancelled by user'
    });

    await env.DB.prepare(`
      UPDATE stage_executions 
      SET status = 'skipped' 
      WHERE execution_id = ? AND status IN ('pending', 'running')
    `).bind(executionId).run();

    await env.DB.prepare(`
      UPDATE execution_queue 
      SET status = 'cancelled' 
      WHERE execution_id = ?
    `).bind(executionId).run();

    await env.EXECUTION_CACHE.delete(`execution:${executionId}`);
    await env.EXECUTION_CACHE.delete(`progress:${executionId}`);

    return jsonResponse({
      success: true,
      message: 'Execution cancelled successfully',
      execution_id: executionId
    });
  } catch (error) {
    return serverError('Failed to cancel execution', error);
  }
}

export async function handleRetryExecution(
  env: Env,
  request: AuthenticatedRequest,
  executionId: string
): Promise<Response> {
  if (!requireAuth(request.auth)) {
    return unauthorized();
  }

  try {
    const db = new DatabaseService(env.DB);
    const execution = await db.getExecution(executionId);

    if (!execution) {
      return notFound('Execution not found');
    }

    if (request.auth?.clientId && 
        execution.client_id !== request.auth.clientId && 
        !request.auth.permissions?.includes('all')) {
      return unauthorized('Access denied');
    }

    if (execution.status !== 'failed') {
      return badRequest('Can only retry failed executions');
    }

    const newExecutionId = await db.createExecution({
      request_id: execution.request_id,
      client_id: execution.client_id,
      template_name: execution.template_name,
      parameters: execution.parameters,
      status: 'pending',
      priority: execution.priority
    });

    await createExecutionQueue(env, newExecutionId, execution.priority);

    return jsonResponse({
      success: true,
      message: 'Retry queued successfully',
      original_execution_id: executionId,
      new_execution_id: newExecutionId,
      progress_url: `/progress/${newExecutionId}`
    });
  } catch (error) {
    return serverError('Failed to retry execution', error);
  }
}

export async function handleGetExecutionQueue(
  env: Env,
  request: AuthenticatedRequest
): Promise<Response> {
  if (!requireAuth(request.auth)) {
    return unauthorized();
  }

  try {
    const db = new DatabaseService(env.DB);
    const queue = await db.getExecutionQueue(50);

    const queueWithDetails = await Promise.all(queue.map(async (item) => {
      const execution = await db.getExecution(item.execution_id);
      return {
        ...item,
        template_name: execution?.template_name,
        client_id: execution?.client_id,
        created_at: execution?.created_at
      };
    }));

    return jsonResponse({
      success: true,
      queue: queueWithDetails,
      stats: {
        total_queued: queue.length,
        high_priority: queue.filter(q => q.priority >= 75).length,
        blocked: queue.filter(q => q.status === 'blocked').length
      }
    });
  } catch (error) {
    return serverError('Failed to get execution queue', error);
  }
}