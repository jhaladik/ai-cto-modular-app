import { Env, AuthenticatedRequest } from './types';
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
        return handleExecute(env, authenticatedRequest);
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