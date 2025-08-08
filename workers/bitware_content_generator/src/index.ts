import { Env, AuthenticatedRequest } from './types';
import { authenticateRequest, isPublicEndpoint } from './helpers/auth';
import { corsHeaders, jsonResponse, errorResponse, notFound } from './helpers/http';
import { handleExecute } from './handlers/execute-handler';
import { 
  handleHealthCheck, 
  handleDetailedHealth, 
  handleHelp,
  handleListTemplates,
  handleGetTemplate
} from './handlers/monitoring-ops';
import {
  handleListJobs,
  handleGetJob,
  handleGetJobStatus,
  handleGetJobContent,
  handleRetryJob,
  handleCancelJob
} from './handlers/generation-ops';
import {
  handleGetStats,
  handleGetAnalytics
} from './handlers/admin-ops';
import {
  handleGetPricing,
  handleEstimateCost,
  handleGetResourceStats
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
          return errorResponse(
            error instanceof Error ? error.message : 'Authentication failed',
            401
          );
        }
      }

      // Main execution endpoint
      if (method === 'POST' && path === '/api/execute') {
        return handleExecute(env, authenticatedRequest!);
      }

      // Template endpoints
      if (method === 'GET' && path === '/api/templates') {
        return handleListTemplates(env, authenticatedRequest!);
      }
      if (method === 'GET' && path.startsWith('/api/templates/')) {
        const templateName = path.split('/').pop();
        if (templateName) {
          return handleGetTemplate(env, authenticatedRequest!, templateName);
        }
      }

      // Job management endpoints
      if (method === 'GET' && path === '/api/jobs') {
        return handleListJobs(env, authenticatedRequest!, url);
      }
      if (method === 'GET' && path.match(/^\/api\/jobs\/\d+$/)) {
        const jobId = parseInt(path.split('/').pop()!);
        return handleGetJob(env, authenticatedRequest!, jobId);
      }
      if (method === 'GET' && path.match(/^\/api\/jobs\/\d+\/status$/)) {
        const jobId = parseInt(path.split('/')[3]);
        return handleGetJobStatus(env, authenticatedRequest!, jobId);
      }
      if (method === 'GET' && path.match(/^\/api\/jobs\/\d+\/content$/)) {
        const jobId = parseInt(path.split('/')[3]);
        return handleGetJobContent(env, authenticatedRequest!, jobId);
      }
      if (method === 'POST' && path.match(/^\/api\/jobs\/\d+\/retry$/)) {
        const jobId = parseInt(path.split('/')[3]);
        return handleRetryJob(env, authenticatedRequest!, jobId);
      }
      if (method === 'POST' && path.match(/^\/api\/jobs\/\d+\/cancel$/)) {
        const jobId = parseInt(path.split('/')[3]);
        return handleCancelJob(env, authenticatedRequest!, jobId);
      }

      // Statistics and analytics
      if (method === 'GET' && path === '/api/stats') {
        return handleGetStats(env, authenticatedRequest!);
      }
      if (method === 'GET' && path === '/api/analytics') {
        return handleGetAnalytics(env, authenticatedRequest!, url);
      }

      // Economy endpoints
      if (method === 'GET' && path === '/api/economy/pricing') {
        return handleGetPricing(env, authenticatedRequest!);
      }
      if (method === 'POST' && path === '/api/economy/estimate') {
        return handleEstimateCost(env, authenticatedRequest!);
      }
      if (method === 'GET' && path === '/api/economy/stats') {
        return handleGetResourceStats(env, authenticatedRequest!, url);
      }

      return notFound();
    } catch (error) {
      console.error('Request error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Internal server error',
        500
      );
    }
  },
};