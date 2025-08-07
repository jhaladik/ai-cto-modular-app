import { Env, AuthenticatedRequest, ExecutionQueueMessage } from './types';
import { authenticateRequest } from './helpers/auth';
import { corsHeaders, jsonResponse, notFound, methodNotAllowed } from './helpers/http';

import { 
  handleHealthCheck, 
  handleDetailedHealth, 
  handleGetWorkers,
  handleResourceStatus,
  handleResourceAvailability,
  handleSystemMetrics
} from './handlers/monitoring-ops';

import {
  handleGetTemplates,
  handleGetTemplate,
  handleSyncTemplates,
  handleEstimate
} from './handlers/pipeline-ops';

import {
  handleExecute,
  handleGetProgress,
  handleGetExecution,
  handleCancelExecution,
  handleRetryExecution,
  handleGetExecutionQueue
} from './handlers/execution-ops';

import {
  handleResourceAllocation,
  handleResourceRelease,
  handleRecordUsage,
  handleGetQuotas,
  handleCheckAvailability,
  handleResourceSnapshot
} from './handlers/resource-ops';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      if (method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      const authenticatedRequest = await authenticateRequest(request, env);

      // ==================== PUBLIC ENDPOINTS ====================
      
      if (method === 'GET' && path === '/') {
        return handleHealthCheck(env);
      }

      if (method === 'GET' && path === '/health') {
        return handleDetailedHealth(env);
      }

      if (method === 'GET' && path === '/help') {
        return jsonResponse({
          service: 'bitware-orchestrator-v2',
          version: env.VERSION || '2.0.0',
          description: 'Central orchestration and resource management for AI Factory',
          endpoints: {
            public: ['/', '/health', '/help'],
            pipeline: ['/templates', '/templates/{name}', '/templates/sync', '/estimate'],
            execution: ['/execute', '/progress/{id}', '/execution/{id}', '/execution/{id}/cancel', '/execution/{id}/retry', '/queue'],
            resources: ['/resources/status', '/resources/availability', '/resources/allocate', '/resources/release', '/resources/usage', '/resources/quotas', '/resources/check', '/resources/snapshot'],
            monitoring: ['/workers', '/metrics'],
            worker: ['/handshake/receive', '/handshake/acknowledge']
          },
          authentication: {
            api: 'X-API-Key header',
            worker: 'Authorization: Bearer token + X-Worker-ID header',
            session: 'x-bitware-session-token header'
          }
        });
      }

      // ==================== MONITORING ENDPOINTS ====================
      
      if (method === 'GET' && path === '/workers') {
        return handleGetWorkers(env, authenticatedRequest);
      }

      if (method === 'GET' && path === '/metrics') {
        return handleSystemMetrics(env, authenticatedRequest);
      }

      // ==================== TEST ENDPOINTS ====================
      
      if (method === 'POST' && path === '/api/test/stage-creation') {
        if (!authenticatedRequest.isWorkerAuth) {
          return jsonResponse({ error: 'Worker authentication required' }, 401);
        }
        
        const data = await request.json() as any;
        const { DatabaseService } = await import('./services/database');
        const db = new DatabaseService(env.DB);
        
        try {
          console.log('Test endpoint: Creating stage with data:', data);
          const stageId = await db.createStageExecution({
            execution_id: data.execution_id,
            worker_name: data.worker_name,
            stage_order: data.stage_order,
            status: 'pending'
          });
          
          return jsonResponse({ 
            success: true, 
            stage_id: stageId,
            message: 'Stage created successfully'
          });
        } catch (error) {
          console.error('Test endpoint: Stage creation failed:', error);
          return jsonResponse({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          }, 500);
        }
      }
      
      if (method === 'POST' && path === '/api/test/direct-execution') {
        if (!authenticatedRequest.isWorkerAuth) {
          return jsonResponse({ error: 'Worker authentication required' }, 401);
        }
        
        const data = await request.json() as any;
        const { DatabaseService } = await import('./services/database');
        const { PipelineExecutor } = await import('./services/pipeline-executor');
        
        const db = new DatabaseService(env.DB);
        const executor = new PipelineExecutor(env);
        
        try {
          console.log('Test endpoint: Direct execution with data:', data);
          
          // Create a test execution
          const executionId = await db.createExecution({
            client_id: data.client_id,
            template_name: data.template_name,
            parameters: {},
            status: 'pending'
          });
          
          console.log('Created execution:', executionId);
          
          // Create a simple test template
          const template = {
            template_name: data.template_name,
            display_name: 'Test Template',
            stages: [{
              stage_order: 1,
              worker_name: 'bitware-content-granulator',
              action: 'granulate',
              params: {
                template_name: 'course'
              }
            }]
          };
          
          console.log('Executing with template:', template);
          
          // Execute directly without queue
          const result = await executor.execute(executionId, template, {});
          
          return jsonResponse({ 
            success: true, 
            execution_id: executionId,
            result: result
          });
        } catch (error) {
          console.error('Test endpoint: Direct execution failed:', error);
          return jsonResponse({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          }, 500);
        }
      }
      
      if (method === 'POST' && path === '/api/test/queue-execution') {
        if (!authenticatedRequest.isWorkerAuth) {
          return jsonResponse({ error: 'Worker authentication required' }, 401);
        }
        
        const data = await request.json() as any;
        const { QueueManager } = await import('./services/queue-manager');
        
        const queueManager = new QueueManager(env);
        
        try {
          console.log('Test endpoint: Queue execution with data:', data);
          
          // Create a test execution and enqueue it
          const { DatabaseService } = await import('./services/database');
          const db = new DatabaseService(env.DB);
          
          const executionId = await db.createExecution({
            client_id: data.client_id || 'test_client',
            template_name: 'course_creation',
            parameters: {},
            status: 'pending'
          });
          
          console.log('Created execution for queue:', executionId);
          
          // Enqueue and process immediately
          await queueManager.enqueue(executionId, 'high');
          
          // Ensure queue processing continues
          ctx.waitUntil(
            queueManager.processQueue().catch(error => {
              console.error('Test endpoint: Background queue processing error:', error);
            })
          );
          
          // Wait a bit for processing
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Check the execution status
          const execution = await db.getExecution(executionId);
          const stages = await db.getStageExecutions(executionId);
          
          return jsonResponse({ 
            success: true, 
            execution_id: executionId,
            execution_status: execution?.status,
            stages_created: stages.length
          });
        } catch (error) {
          console.error('Test endpoint: Queue execution failed:', error);
          return jsonResponse({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          }, 500);
        }
      }
      
      if (method === 'POST' && path === '/api/test/process-queue') {
        if (!authenticatedRequest.isWorkerAuth) {
          return jsonResponse({ error: 'Worker authentication required' }, 401);
        }
        
        const { QueueManager } = await import('./services/queue-manager');
        const queueManager = new QueueManager(env);
        
        try {
          console.log('Manually triggering queue processing...');
          await queueManager.processQueue();
          
          const stats = await queueManager.getQueueStats();
          
          return jsonResponse({ 
            success: true, 
            message: 'Queue processing triggered',
            stats
          });
        } catch (error) {
          console.error('Manual queue processing failed:', error);
          return jsonResponse({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          }, 500);
        }
      }
      
      if (method === 'POST' && path === '/api/test/worker-invoke') {
        if (!authenticatedRequest.isWorkerAuth) {
          return jsonResponse({ error: 'Worker authentication required' }, 401);
        }
        
        const data = await request.json() as any;
        const { WorkerCoordinator } = await import('./services/worker-coordinator');
        
        const coordinator = new WorkerCoordinator(env);
        
        try {
          console.log('Test endpoint: Worker invocation with data:', data);
          
          const result = await coordinator.invokeWorker(
            data.worker_name,
            data.action,
            data.data,
            data.execution_id || `test_${Date.now()}`,
            `stage_${Date.now()}`
          );
          
          return jsonResponse({ 
            success: true, 
            result: result
          });
        } catch (error) {
          console.error('Test endpoint: Worker invocation failed:', error);
          return jsonResponse({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          }, 500);
        }
      }
      
      // ==================== PIPELINE ENDPOINTS ====================
      
      if (method === 'GET' && path === '/templates') {
        return handleGetTemplates(env, authenticatedRequest);
      }

      if (method === 'GET' && path.startsWith('/templates/') && path !== '/templates/sync') {
        const templateName = path.split('/')[2];
        return handleGetTemplate(env, authenticatedRequest, templateName);
      }

      if (method === 'POST' && path === '/templates/sync') {
        return handleSyncTemplates(env, authenticatedRequest);
      }

      if (method === 'POST' && path === '/estimate') {
        return handleEstimate(env, authenticatedRequest);
      }

      // ==================== EXECUTION ENDPOINTS ====================
      
      if (method === 'POST' && path === '/execute') {
        return handleExecute(env, authenticatedRequest, ctx);
      }

      if (method === 'GET' && path.startsWith('/progress/')) {
        const executionId = path.split('/')[2];
        return handleGetProgress(env, authenticatedRequest, executionId);
      }

      if (method === 'GET' && path.startsWith('/execution/') && !path.includes('/cancel') && !path.includes('/retry')) {
        const executionId = path.split('/')[2];
        return handleGetExecution(env, authenticatedRequest, executionId);
      }

      if (method === 'POST' && path.endsWith('/cancel')) {
        const executionId = path.split('/')[2];
        return handleCancelExecution(env, authenticatedRequest, executionId);
      }

      if (method === 'POST' && path.endsWith('/retry')) {
        const executionId = path.split('/')[2];
        return handleRetryExecution(env, authenticatedRequest, executionId);
      }

      if (method === 'GET' && path === '/queue') {
        return handleGetExecutionQueue(env, authenticatedRequest);
      }

      // ==================== RESOURCE ENDPOINTS ====================
      
      if (method === 'GET' && path === '/resources/status') {
        return handleResourceStatus(env, authenticatedRequest);
      }

      if (method === 'GET' && path === '/resources/availability') {
        return handleResourceAvailability(env, authenticatedRequest);
      }

      if (method === 'POST' && path === '/resources/allocate') {
        return handleResourceAllocation(env, authenticatedRequest);
      }

      if (method === 'POST' && path === '/resources/release') {
        return handleResourceRelease(env, authenticatedRequest);
      }

      if (method === 'POST' && path === '/resources/usage') {
        return handleRecordUsage(env, authenticatedRequest);
      }

      if (method === 'GET' && path === '/resources/quotas') {
        return handleGetQuotas(env, authenticatedRequest);
      }

      if (method === 'POST' && path === '/resources/check') {
        return handleCheckAvailability(env, authenticatedRequest);
      }

      if (method === 'POST' && path === '/resources/snapshot') {
        return handleResourceSnapshot(env, authenticatedRequest);
      }

      // ==================== WORKER HANDSHAKE ENDPOINTS ====================
      
      if (method === 'POST' && path === '/handshake/receive') {
        return handleReceiveHandshake(env, authenticatedRequest);
      }

      if (method === 'POST' && path === '/handshake/acknowledge') {
        return handleAcknowledgeHandshake(env, authenticatedRequest);
      }

      return notFound('Endpoint not found');

    } catch (error) {
      console.error('Request error:', error);
      return jsonResponse({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  },

  async queue(batch: MessageBatch<ExecutionQueueMessage>, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`Processing ${batch.messages.length} messages from queue`);
    
    const { QueueManager } = await import('./services/queue-manager');
    const queueManager = new QueueManager(env);
    
    for (const message of batch.messages) {
      try {
        console.log(`Processing execution ${message.body.executionId} from queue`);
        
        // Process the execution directly
        await queueManager.processSpecificExecution(message.body.executionId);
        
        // Acknowledge the message
        message.ack();
      } catch (error) {
        console.error(`Failed to process execution ${message.body.executionId}:`, error);
        // Retry the message
        message.retry();
      }
    }
  }
};

// Worker handshake handlers (keeping these in index for now as they're simple)
async function handleReceiveHandshake(
  env: Env,
  request: AuthenticatedRequest
): Promise<Response> {
  if (!request.auth || request.auth.type !== 'worker') {
    return jsonResponse({ error: 'Worker authentication required' }, { status: 401 });
  }

  try {
    const handshake = await request.json() as any;
    const packetId = `packet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await env.DB.prepare(`
      INSERT INTO handshake_packets (
        packet_id, execution_id, stage_id, from_worker, to_worker,
        packet_data, status, sent_at
      ) VALUES (?, ?, ?, ?, 'orchestrator', ?, 'sent', datetime('now'))
    `).bind(
      packetId,
      handshake.execution_id,
      handshake.stage_id,
      request.auth.workerId,
      JSON.stringify(handshake)
    ).run();

    await env.EXECUTION_CACHE.put(
      `handshake:${packetId}`,
      JSON.stringify(handshake),
      { expirationTtl: 300 }
    );

    return jsonResponse({
      packet_id: packetId,
      status: 'accepted',
      message: 'Handshake received'
    });
  } catch (error) {
    console.error('Handshake receive error:', error);
    return jsonResponse({ error: 'Failed to process handshake' }, { status: 500 });
  }
}

async function handleAcknowledgeHandshake(
  env: Env,
  request: AuthenticatedRequest
): Promise<Response> {
  if (!request.auth || request.auth.type !== 'worker') {
    return jsonResponse({ error: 'Worker authentication required' }, { status: 401 });
  }

  try {
    const { packet_id, status = 'acknowledged' } = await request.json() as any;

    if (!packet_id) {
      return jsonResponse({ error: 'Packet ID required' }, { status: 400 });
    }

    await env.DB.prepare(`
      UPDATE handshake_packets 
      SET status = ?, acknowledged_at = datetime('now')
      WHERE packet_id = ?
    `).bind(status, packet_id).run();

    await env.EXECUTION_CACHE.delete(`handshake:${packet_id}`);

    return jsonResponse({
      success: true,
      packet_id,
      message: 'Handshake acknowledged'
    });
  } catch (error) {
    console.error('Handshake acknowledge error:', error);
    return jsonResponse({ error: 'Failed to acknowledge handshake' }, { status: 500 });
  }
}