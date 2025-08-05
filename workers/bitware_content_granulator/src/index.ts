import { Env, AuthenticatedRequest } from './types';
import { authenticateRequest, isPublicEndpoint } from './helpers/auth';
import { corsHeaders, jsonResponse, errorResponse, notFound, methodNotAllowed } from './helpers/http';

import {
  handleHealthCheck,
  handleDetailedHealth,
  handleHelp,
  handleGetTemplates,
  handleGetTemplate
} from './handlers/monitoring-ops';

import {
  handleGranulate,
  handleGranulateQuiz,
  handleGranulateNovel,
  handleGranulateWorkflow,
  handleGetJob,
  handleGetJobStatus,
  handleValidate,
  handleGetValidationHistory
} from './handlers/granulation-ops';

import {
  handleHandshake,
  handleProcess,
  handleAcknowledge,
  handleGetProgress
} from './handlers/handshake-ops';

import {
  handleGetStats,
  handleManageTemplates,
  handleGetAnalytics
} from './handlers/admin-ops';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // Handle CORS preflight
      if (method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      // Public endpoints (no auth required)
      if (method === 'GET' && path === '/') {
        return handleHealthCheck(env);
      }

      if (method === 'GET' && path === '/health') {
        return handleDetailedHealth(env);
      }

      if (method === 'GET' && path === '/help') {
        return handleHelp(env);
      }

      // Authenticate non-public endpoints
      let authenticatedRequest: AuthenticatedRequest | null = null;
      if (!isPublicEndpoint(path)) {
        try {
          authenticatedRequest = await authenticateRequest(request, env);
        } catch (error) {
          return errorResponse(error.message, 401);
        }
      }

      // Template endpoints
      if (method === 'GET' && path === '/api/templates') {
        return handleGetTemplates(env, authenticatedRequest!);
      }

      if (method === 'GET' && path.startsWith('/api/templates/')) {
        const templateName = path.split('/')[3];
        return handleGetTemplate(env, templateName, authenticatedRequest!);
      }

      // Main granulation endpoints
      if (method === 'POST' && path === '/api/granulate') {
        return handleGranulate(env, authenticatedRequest!);
      }

      if (method === 'POST' && path === '/api/granulate/quiz') {
        return handleGranulateQuiz(env, authenticatedRequest!);
      }

      if (method === 'POST' && path === '/api/granulate/novel') {
        return handleGranulateNovel(env, authenticatedRequest!);
      }

      if (method === 'POST' && path === '/api/granulate/workflow') {
        return handleGranulateWorkflow(env, authenticatedRequest!);
      }

      // Job management endpoints
      if (method === 'GET' && path.match(/^\/api\/jobs\/\d+$/)) {
        const jobId = parseInt(path.split('/')[3]);
        return handleGetJob(env, jobId, authenticatedRequest!);
      }

      if (method === 'GET' && path.match(/^\/api\/jobs\/\d+\/status$/)) {
        const jobId = parseInt(path.split('/')[3]);
        return handleGetJobStatus(env, jobId, authenticatedRequest!);
      }

      // Validation endpoints
      if (method === 'POST' && path === '/api/validate') {
        return handleValidate(env, authenticatedRequest!);
      }

      if (method === 'GET' && path === '/api/validation/history') {
        const jobId = parseInt(url.searchParams.get('job_id') || '0');
        if (!jobId) {
          return errorResponse('job_id parameter required', 400);
        }
        return handleGetValidationHistory(env, jobId, authenticatedRequest!);
      }

      // Orchestrator 2.0 handshake endpoints
      if (method === 'POST' && path === '/api/handshake') {
        return handleHandshake(env, authenticatedRequest!);
      }

      if (method === 'POST' && path === '/api/process') {
        return handleProcess(env, authenticatedRequest!);
      }

      if (method === 'POST' && path === '/api/acknowledge') {
        return handleAcknowledge(env, authenticatedRequest!);
      }

      if (method === 'GET' && path.match(/^\/api\/progress\/[\w-]+$/)) {
        const executionId = path.split('/')[3];
        return handleGetProgress(env, executionId, authenticatedRequest!);
      }

      // Admin endpoints (worker auth required)
      if (authenticatedRequest?.auth.type === 'worker') {
        if (method === 'GET' && path === '/api/admin/stats') {
          return handleGetStats(env);
        }

        if (method === 'POST' && path === '/api/admin/templates') {
          return handleManageTemplates(env, authenticatedRequest);
        }

        if (method === 'GET' && path === '/api/admin/analytics') {
          return handleGetAnalytics(env);
        }
      }

      return notFound();
    } catch (error) {
      console.error('Request error:', error);
      return errorResponse(error.message || 'Internal server error', 500);
    }
  },
};