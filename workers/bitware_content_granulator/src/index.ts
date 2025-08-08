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

import { handleExecute } from './handlers/execute-handler';

import {
  handleGetJob,
  handleGetJobs,
  handleGetJobStatus,
  handleGetJobStructure,
  handleRetryJob,
  handleValidate,
  handleGetValidationHistory
} from './handlers/granulation-ops';


import {
  handleGetStats,
  handleGetAdminStats,
  handleManageTemplates,
  handleGetAnalytics,
  handleGetAIProviders
} from './handlers/admin-ops';

import {
  handleGetResourceStats,
  handleGetCostEstimate,
  handleGetPricingInfo
} from './handlers/economy-ops';

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
          return errorResponse(error instanceof Error ? error.message : 'Authentication failed', 401);
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

      // Execute endpoint for Resource Manager
      if (method === 'POST' && path === '/api/execute') {
        return handleExecute(env, authenticatedRequest!);
      }

      // Job management endpoints
      if (method === 'GET' && path === '/api/jobs') {
        return handleGetJobs(env, authenticatedRequest!);
      }

      if (method === 'GET' && path.match(/^\/api\/jobs\/\d+$/)) {
        const jobId = parseInt(path.split('/')[3]);
        return handleGetJob(env, jobId, authenticatedRequest!);
      }

      if (method === 'GET' && path.match(/^\/api\/jobs\/\d+\/status$/)) {
        const jobId = parseInt(path.split('/')[3]);
        return handleGetJobStatus(env, jobId, authenticatedRequest!);
      }

      if (method === 'GET' && path.match(/^\/api\/jobs\/\d+\/structure$/)) {
        const jobId = parseInt(path.split('/')[3]);
        return handleGetJobStructure(env, jobId, authenticatedRequest!);
      }

      if (method === 'POST' && path.match(/^\/api\/jobs\/\d+\/retry$/)) {
        const jobId = parseInt(path.split('/')[3]);
        return handleRetryJob(env, jobId, authenticatedRequest!);
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


      // Stats endpoint (authenticated)
      if (method === 'GET' && path === '/api/stats') {
        return handleGetStats(env);
      }
      
      // AI providers endpoint
      if (method === 'GET' && path === '/api/ai-providers') {
        return handleGetAIProviders(env);
      }
      
      // Economy endpoints
      if (method === 'GET' && path === '/api/economy/stats') {
        return handleGetResourceStats(env, authenticatedRequest!);
      }
      
      if (method === 'POST' && path === '/api/economy/estimate') {
        return handleGetCostEstimate(env, authenticatedRequest!);
      }
      
      if (method === 'GET' && path === '/api/economy/pricing') {
        return handleGetPricingInfo(env);
      }

      // Admin endpoints (worker auth required)
      if (authenticatedRequest?.auth.type === 'worker') {
        if (method === 'GET' && path === '/api/admin/stats') {
          return handleGetAdminStats(env);
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
      return errorResponse(error instanceof Error ? error.message : 'Internal server error', 500);
    }
  }
};