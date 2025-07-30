// index.ts - Updated KAM worker with modular handlers
// Keep existing functionality, add missing endpoints

// Import new handlers
import { handleGetClient, handleCreateClient, handleUpdateClient, handleClientBudgetCheck, handleRecordUsage } from './handlers/client-ops';
import { handleAdminClients, handleEnhancedAdminStats, handleSystemStatus, handleClientOverview, handleSyncTemplates } from './handlers/admin-ops';
import { handleAnalyzeCommunication, handleRecommendTemplate, handleGetTemplates, handleClassifyIntent, handleSentimentAnalysis } from './handlers/ai-analysis';

// Types and interfaces
interface Env {
  KEY_ACCOUNT_MANAGEMENT_DB: D1Database;
  KAM_CACHE: KVNamespace;
  ORCHESTRATOR?: Service;
  CLIENT_API_KEY: string;
  WORKER_SHARED_SECRET: string;
  OPENAI_API_KEY: string;
}

// Helper functions (keep existing)
function jsonResponse(data: any, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    ...init
  });
}

function unauthorized(message: string = 'Unauthorized') {
  return jsonResponse({ success: false, error: message }, { status: 401 });
}

function notFound(message: string = 'Endpoint not found') {
  return jsonResponse({ success: false, error: message }, { status: 404 });
}

// Validation functions (keep existing)
function validateClientAuth(request: Request, env: Env): { valid: boolean; error?: string } {
  const apiKey = request.headers.get('X-API-Key');
  if (!apiKey) {
    return { valid: false, error: 'X-API-Key header required' };
  }
  if (apiKey !== env.CLIENT_API_KEY) {
    return { valid: false, error: 'Invalid API key' };
  }
  return { valid: true };
}

function validateWorkerAuth(request: Request, env: Env): { valid: boolean; error?: string } {
  const authHeader = request.headers.get('Authorization');
  const workerID = request.headers.get('X-Worker-ID');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Bearer token required' };
  }
  
  const token = authHeader.substring(7);
  if (token !== env.WORKER_SHARED_SECRET) {
    return { valid: false, error: 'Invalid worker token' };
  }
  
  if (!workerID) {
    return { valid: false, error: 'X-Worker-ID header required' };
  }
  
  return { valid: true };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname, method } = { pathname: url.pathname, method: request.method };
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Worker-ID',
    };
    
    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ==================== PUBLIC ENDPOINTS (NO AUTH) ====================
      
      if (pathname === '/help') {
        return jsonResponse({
          worker: 'bitware_key_account_manager',
          version: '1.0.0',
          description: 'AI-powered client relationship management and communication processing',
          endpoints: {
            public: ['/help', '/capabilities', '/health'],
            client_auth: ['/client', '/templates', '/analyze-communication', '/recommend-template'],
            worker_auth: ['/admin/stats', '/admin/clients', '/admin/sync-templates']
          },
          authentication: {
            client: 'X-API-Key header',
            worker: 'Authorization: Bearer token + X-Worker-ID header'
          }
        }, { headers: corsHeaders });
      }

      if (pathname === '/capabilities') {
        return jsonResponse({
          features: ['client_management', 'ai_communication_analysis', 'template_intelligence', 'budget_tracking'],
          ai_models: ['gpt-4', 'gpt-3.5-turbo'],
          supported_languages: ['english'],
          max_content_length: 10000,
          database: 'D1',
          cache: 'KV',
          integrations: ['orchestrator', 'openai']
        }, { headers: corsHeaders });
      }

      if (pathname === '/health') {
        try {
          // Test database connectivity
          const testQuery = await env.KEY_ACCOUNT_MANAGEMENT_DB.prepare('SELECT 1 as test').first();
          
          return jsonResponse({
            status: 'healthy',
            database: testQuery ? 'connected' : 'disconnected',
            cache: env.KAM_CACHE ? 'configured' : 'missing',
            openai: env.OPENAI_API_KEY ? 'configured' : 'missing',
            orchestrator_binding: env.ORCHESTRATOR ? 'configured' : 'missing',
            timestamp: new Date().toISOString()
          }, { headers: corsHeaders });
        } catch (error) {
          return jsonResponse({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
          }, { status: 500, headers: corsHeaders });
        }
      }

      // ==================== AUTHENTICATION ENDPOINTS ====================

      if (pathname === '/auth/validate-user' && method === 'POST') {
        return handleValidateUser(request, env, corsHeaders);
      }

      if (pathname === '/session/register' && method === 'POST') {
        return handleSessionRegister(request, env, corsHeaders);
      }

      // ==================== CLIENT ENDPOINTS (CLIENT AUTH) ====================
      
      const clientAuth = validateClientAuth(request, env);
      if (pathname.startsWith('/client') || pathname === '/templates' || pathname === '/analyze-communication' || pathname === '/recommend-template' || pathname === '/classify-intent' || pathname === '/sentiment-analysis') {
        if (!clientAuth.valid) {
          return unauthorized(clientAuth.error);
        }
      }

      // Client CRUD operations
      if (pathname === '/client' && method === 'GET') {
        return handleGetClient(request, env, corsHeaders);
      }

      if (pathname === '/client' && method === 'POST') {
        return handleCreateClient(request, env, corsHeaders);
      }

      if (pathname.startsWith('/client/') && method === 'PUT') {
        return handleUpdateClient(request, env, corsHeaders);
      }

      if (pathname === '/client/budget-check' && method === 'POST') {
        return handleClientBudgetCheck(request, env, corsHeaders);
      }

      if (pathname === '/client/record-usage' && method === 'POST') {
        return handleRecordUsage(request, env, corsHeaders);
      }

      // Template operations
      if (pathname === '/templates') {
        return handleGetTemplates(request, env, corsHeaders);
      }

      // AI analysis endpoints
      if (pathname === '/analyze-communication' && method === 'POST') {
        return handleAnalyzeCommunication(request, env, corsHeaders);
      }

      if (pathname === '/recommend-template' && method === 'POST') {
        return handleRecommendTemplate(request, env, corsHeaders);
      }

      if (pathname === '/classify-intent' && method === 'POST') {
        return handleClassifyIntent(request, env, corsHeaders);
      }

      if (pathname === '/sentiment-analysis' && method === 'POST') {
        return handleSentimentAnalysis(request, env, corsHeaders);
      }

      // ==================== ADMIN ENDPOINTS (WORKER AUTH) ====================
      
      if (pathname.startsWith('/admin/')) {
        const workerAuth = validateWorkerAuth(request, env);
        if (!workerAuth.valid) {
          return unauthorized(workerAuth.error);
        }

        if (pathname === '/admin/stats') {
          return handleEnhancedAdminStats(request, env, corsHeaders);
        }

        if (pathname === '/admin/clients') {
          return handleAdminClients(request, env, corsHeaders);
        }

        if (pathname === '/admin/system-status') {
          return handleSystemStatus(request, env, corsHeaders);
        }

        if (pathname === '/admin/client-overview') {
          return handleClientOverview(request, env, corsHeaders);
        }

        if (pathname === '/admin/sync-templates' && method === 'POST') {
          return handleSyncTemplates(request, env, corsHeaders);
        }

        // Legacy admin stats endpoint (keep for backward compatibility)
        if (pathname === '/admin/legacy-stats') {
          return handleLegacyStats(request, env, corsHeaders);
        }
      }

      // ==================== NOT FOUND ====================
      return notFound(`Endpoint ${pathname} not found`);

    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      }, { status: 500, headers: corsHeaders });
    }
  }
};

// ==================== EXISTING AUTH HANDLERS (KEEP AS-IS) ====================

async function handleValidateUser(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return jsonResponse({
        success: false,
        error: 'Email and password are required'
      }, { status: 400, headers: corsHeaders });
    }

    // Mock user validation (in real implementation, check against user database)
    const mockUsers = [
      { email: 'admin@company.com', password: 'admin123', role: 'admin', department: 'IT' },
      { email: 'user@company.com', password: 'user123', role: 'user', department: 'Operations' },
      { email: 'sarah.johnson@techcorp.com', password: 'client123', role: 'client', department: 'Business' }
    ];

    const user = mockUsers.find(u => u.email === email && u.password === password);

    if (!user) {
      return jsonResponse({
        success: false,
        error: 'Invalid credentials'
      }, { status: 401, headers: corsHeaders });
    }

    return jsonResponse({
      success: true,
      user: {
        user_id: `user_${Date.now()}`,
        email: user.email,
        role: user.role,
        full_name: user.email.split('@')[0].replace('.', ' '),
        department: user.department
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Validate user error:', error);
    return jsonResponse({
      success: false,
      error: 'Failed to validate user'
    }, { status: 500, headers: corsHeaders });
  }
}

async function handleSessionRegister(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const body = await request.json();
    const { session_token, client_id, context } = body;

    if (!session_token || !client_id) {
      return jsonResponse({
        success: false,
        error: 'session_token and client_id are required'
      }, { status: 400, headers: corsHeaders });
    }

    // Store session context (simplified implementation)
    await env.KAM_CACHE.put(
      `session:${session_token}`,
      JSON.stringify({
        client_id,
        context: context || {},
        created_at: new Date().toISOString()
      }),
      { expirationTtl: 86400 } // 24 hours
    );

    return jsonResponse({
      success: true,
      message: 'Session registered successfully'
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Session register error:', error);
    return jsonResponse({
      success: false,
      error: 'Failed to register session'
    }, { status: 500, headers: corsHeaders });
  }
}

// Legacy stats handler (keep existing functionality)
async function handleLegacyStats(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const stats = await env.KEY_ACCOUNT_MANAGEMENT_DB.prepare(`
      SELECT 
        COUNT(*) as total_clients,
        COUNT(CASE WHEN account_status = 'active' THEN 1 END) as active_clients,
        COUNT(CASE WHEN account_status = 'trial' THEN 1 END) as trial_clients,
        AVG(monthly_budget_usd) as avg_budget,
        SUM(used_budget_current_month) as total_used_budget
      FROM clients
    `).first();

    return jsonResponse({
      success: true,
      stats: stats || {
        total_clients: 0,
        active_clients: 0,
        trial_clients: 0,
        avg_budget: 0,
        total_used_budget: 0
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Legacy stats error:', error);
    return jsonResponse({
      success: false,
      error: 'Failed to retrieve stats'
    }, { status: 500, headers: corsHeaders });
  }
}