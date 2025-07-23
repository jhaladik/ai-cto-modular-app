// AI Factory Frontend Worker - Service Bindings Architecture
// @WORKER: FrontendWorker
// 🧱 Type: MainWorker
// 📍 Path: src/index.ts
// 🎯 Role: Frontend worker with service bindings and static asset serving
// 💾 Storage: { kv: "session_store", static_assets: "embedded" }

import { handleAuth, isValidSession } from './auth/session';
import { serveStaticAsset } from './static/assets';

// ==================== INTERFACES ====================
interface Env {
  // KV Storage
  SESSION_STORE: KVNamespace;
  
  // Authentication secrets
  CLIENT_API_KEY: string;
  WORKER_SHARED_SECRET: string;
  ADMIN_PASSWORD: string;
  USER_PASSWORD: string;
  
  // Service bindings to backend workers
  ORCHESTRATOR: Fetcher;
  TOPIC_RESEARCHER: Fetcher;
  RSS_LIBRARIAN: Fetcher;
  FEED_FETCHER: Fetcher;
  CONTENT_CLASSIFIER: Fetcher;
  REPORT_BUILDER: Fetcher;
  
  // Configuration
  FRONTEND_VERSION: string;
  SESSION_TIMEOUT_HOURS: string;
  ENABLE_DEBUG_LOGGING: string;
  CACHE_STATIC_ASSETS: string;
  STATIC_CACHE_TTL_SECONDS: string;
}

// ==================== CORS HEADERS ====================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-session-token, x-bitware-session-token',
  'Access-Control-Max-Age': '86400',
};

// ==================== MAIN WORKER EXPORT ====================
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      // Debug logging
      if (env.ENABLE_DEBUG_LOGGING === 'true') {
        console.log(`🌐 Frontend Worker: ${request.method} ${url.pathname}`);
      }
      
      // Serve root dashboard
      if (url.pathname === '/' || url.pathname === '/dashboard') {
        return serveStaticAsset('/dashboard.html', env);
      }
      
      // Serve static assets
      if (url.pathname.startsWith('/static/') || 
          url.pathname.endsWith('.html') ||
          url.pathname.endsWith('.js') ||
          url.pathname.endsWith('.css') ||
          url.pathname.endsWith('.ico')) {
        return serveStaticAsset(url.pathname, env);
      }
      
      // Handle authentication endpoints
      if (url.pathname.startsWith('/api/auth/')) {
        return handleAuth(request, env);
      }
      
      // Handle API endpoints (require authentication)
      if (url.pathname.startsWith('/api/')) {
        return handleAPI(request, env);
      }
      
      // Handle worker-specific interfaces
      if (url.pathname.startsWith('/orchestrator')) {
        return serveStaticAsset('/orchestrator/index.html', env);
      }
      
      if (url.pathname.startsWith('/topic-researcher')) {
        return serveStaticAsset('/topic-researcher/index.html', env);
      }
      
      if (url.pathname.startsWith('/rss-librarian')) {
        return serveStaticAsset('/rss-librarian/index.html', env);
      }
      
      if (url.pathname.startsWith('/feed-fetcher')) {
        return serveStaticAsset('/feed-fetcher/index.html', env);
      }
      
      if (url.pathname.startsWith('/content-classifier')) {
        return serveStaticAsset('/content-classifier/index.html', env);
      }
      
      if (url.pathname.startsWith('/report-builder')) {
        return serveStaticAsset('/report-builder/index.html', env);
      }
      
      // Default 404
      return new Response('Not Found', { 
        status: 404, 
        headers: corsHeaders 
      });
      
    } catch (error) {
      console.error('Frontend Worker Error:', error);
      return new Response('Internal Server Error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }
};

// ==================== API HANDLER ====================
async function handleAPI(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  
  // Validate session for all API calls (except auth)
  const sessionToken = request.headers.get('x-session-token') || 
                      request.headers.get('x-bitware-session-token');
  
  if (!sessionToken || !await isValidSession(sessionToken, env.SESSION_STORE)) {
    return new Response(JSON.stringify({ 
      error: 'Unauthorized', 
      message: 'Valid session token required' 
    }), { 
      status: 401, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Route to appropriate worker via service binding
  try {
    let response: Response;
    
    switch (true) {
      case url.pathname.startsWith('/api/orchestrator'):
        response = await routeToOrchestrator(request, env);
        break;
        
      case url.pathname.startsWith('/api/topic-researcher'):
        response = await routeToTopicResearcher(request, env);
        break;
        
      case url.pathname.startsWith('/api/rss-librarian'):
        response = await routeToRSSLibrarian(request, env);
        break;
        
      case url.pathname.startsWith('/api/feed-fetcher'):
        response = await routeToFeedFetcher(request, env);
        break;
        
      case url.pathname.startsWith('/api/content-classifier'):
        response = await routeToContentClassifier(request, env);
        break;
        
      case url.pathname.startsWith('/api/report-builder'):
        response = await routeToReportBuilder(request, env);
        break;
        
      default:
        return new Response(JSON.stringify({ 
          error: 'Not Found', 
          message: 'API endpoint not found' 
        }), { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
    // Add CORS headers to worker responses
    const headers = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers
    });
    
  } catch (error) {
    console.error('API routing error:', error);
    return new Response(JSON.stringify({ 
      error: 'Service Error', 
      message: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// ==================== WORKER ROUTING FUNCTIONS ====================

async function routeToOrchestrator(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const endpoint = url.pathname.replace('/api/orchestrator', '') || '/';
  
  // Create new request for service binding
  const workerRequest = new Request(`https://internal${endpoint}${url.search}`, {
    method: request.method,
    headers: {
      'Content-Type': request.headers.get('Content-Type') || 'application/json',
      'X-Internal-Auth': env.WORKER_SHARED_SECRET,
      'X-Forwarded-From': 'frontend-worker'
    },
    body: request.method !== 'GET' ? await request.text() : undefined
  });
  
  return env.ORCHESTRATOR.fetch(workerRequest);
}

async function routeToTopicResearcher(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const endpoint = url.pathname.replace('/api/topic-researcher', '') || '/';
  
  const workerRequest = new Request(`https://internal${endpoint}${url.search}`, {
    method: request.method,
    headers: {
      'Content-Type': request.headers.get('Content-Type') || 'application/json',
      'X-Internal-Auth': env.WORKER_SHARED_SECRET,
      'X-Forwarded-From': 'frontend-worker'
    },
    body: request.method !== 'GET' ? await request.text() : undefined
  });
  
  return env.TOPIC_RESEARCHER.fetch(workerRequest);
}

async function routeToRSSLibrarian(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const endpoint = url.pathname.replace('/api/rss-librarian', '') || '/';
  
  const workerRequest = new Request(`https://internal${endpoint}${url.search}`, {
    method: request.method,
    headers: {
      'Content-Type': request.headers.get('Content-Type') || 'application/json',
      'X-Internal-Auth': env.WORKER_SHARED_SECRET,
      'X-Forwarded-From': 'frontend-worker'
    },
    body: request.method !== 'GET' ? await request.text() : undefined
  });
  
  return env.RSS_LIBRARIAN.fetch(workerRequest);
}

async function routeToFeedFetcher(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const endpoint = url.pathname.replace('/api/feed-fetcher', '') || '/';
  
  const workerRequest = new Request(`https://internal${endpoint}${url.search}`, {
    method: request.method,
    headers: {
      'Content-Type': request.headers.get('Content-Type') || 'application/json',
      'X-Internal-Auth': env.WORKER_SHARED_SECRET,
      'X-Forwarded-From': 'frontend-worker'
    },
    body: request.method !== 'GET' ? await request.text() : undefined
  });
  
  return env.FEED_FETCHER.fetch(workerRequest);
}

async function routeToContentClassifier(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const endpoint = url.pathname.replace('/api/content-classifier', '') || '/';
  
  const workerRequest = new Request(`https://internal${endpoint}${url.search}`, {
    method: request.method,
    headers: {
      'Content-Type': request.headers.get('Content-Type') || 'application/json',
      'X-Internal-Auth': env.WORKER_SHARED_SECRET,
      'X-Forwarded-From': 'frontend-worker'
    },
    body: request.method !== 'GET' ? await request.text() : undefined
  });
  
  return env.CONTENT_CLASSIFIER.fetch(workerRequest);
}

async function routeToReportBuilder(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const endpoint = url.pathname.replace('/api/report-builder', '') || '/';
  
  const workerRequest = new Request(`https://internal${endpoint}${url.search}`, {
    method: request.method,
    headers: {
      'Content-Type': request.headers.get('Content-Type') || 'application/json',
      'X-Internal-Auth': env.WORKER_SHARED_SECRET,
      'X-Forwarded-From': 'frontend-worker'
    },
    body: request.method !== 'GET' ? await request.text() : undefined
  });
  
  return env.REPORT_BUILDER.fetch(workerRequest);
}