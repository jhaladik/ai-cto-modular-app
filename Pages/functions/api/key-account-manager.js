// functions/api/key-account-manager.js
// @WORKER: KeyAccountManagerProxy
// 🧱 Type: PagesFunction  
// 📍 Path: functions/api/key-account-manager.js
// 🎯 Role: Proxy to Key Account Manager worker with session authentication
// 💾 Storage: { kv: "BITWARE_SESSION_STORE" }

export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
      // Get session token and validate
      const sessionToken = request.headers.get('X-Session-Token');
      
      if (!sessionToken) {
        return new Response(JSON.stringify({ 
          error: 'No session token provided' 
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
  
      // Validate session (matches your existing auth pattern)
      const sessionKey = `session:${sessionToken}`;
      const sessionData = await env.BITWARE_SESSION_STORE.get(sessionKey);
      
      if (!sessionData) {
        return new Response(JSON.stringify({ 
          error: 'Invalid or expired session' 
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
  
      // Parse the session
      const session = JSON.parse(sessionData);
      
      // Check expiration
      if (Date.now() > session.expires) {
        await env.BITWARE_SESSION_STORE.delete(sessionKey);
        return new Response(JSON.stringify({ 
          error: 'Session expired' 
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
  
      // Parse request body (matches your existing API client format)
      const { endpoint = '', method = 'GET', data = null } = await request.json();
      
      // Build worker URL
      const workerBaseUrl = env.KEY_ACCOUNT_MANAGER_URL || 'https://bitware-key-account-manager.yourname.workers.dev';
      const targetUrl = `${workerBaseUrl}${endpoint}`;
  
      // Build headers for worker request
      const workerHeaders = {
        'Content-Type': 'application/json'
      };
  
      // Add authentication based on endpoint
      if (endpoint.startsWith('/admin/')) {
        // Admin endpoints need worker authentication
        workerHeaders['Authorization'] = `Bearer ${env.WORKER_SHARED_SECRET}`;
        workerHeaders['X-Worker-ID'] = 'pages_function_proxy';
      } else if (endpoint !== '/health' && endpoint !== '/help' && endpoint !== '/capabilities') {
        // Client endpoints need API key (convert session to API key)
        workerHeaders['X-API-Key'] = env.CLIENT_API_KEY;
      }
      // Public endpoints (health, help, capabilities) get no auth headers
  
      // Prepare request body
      let body = null;
      if (method !== 'GET' && method !== 'HEAD' && data) {
        body = JSON.stringify(data);
      }
  
      console.log('🏢 KAM Proxy Request:', {
        user: session.username,
        method,
        endpoint,
        targetUrl,
        hasAuth: !!workerHeaders['X-API-Key'] || !!workerHeaders['Authorization']
      });
  
      // Make request to worker
      const workerResponse = await fetch(targetUrl, {
        method,
        headers: workerHeaders,
        body
      });
  
      // Get response text
      const responseText = await workerResponse.text();
      
      // Return response (preserve status and content type)
      return new Response(responseText, {
        status: workerResponse.status,
        statusText: workerResponse.statusText,
        headers: {
          'Content-Type': workerResponse.headers.get('Content-Type') || 'application/json'
        }
      });
  
    } catch (error) {
      console.error('❌ Key Account Manager proxy error:', error);
      
      return new Response(JSON.stringify({
        error: 'Proxy request failed',
        message: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // Handle other HTTP methods by redirecting to POST handler
  export async function onRequestGet(context) {
    return onRequestPost(context);
  }
  
  export async function onRequestPut(context) {
    return onRequestPost(context);
  }
  
  export async function onRequestDelete(context) {
    return onRequestPost(context);
  }
  
  export async function onRequestOptions(context) {
    // CORS preflight
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
        'Access-Control-Max-Age': '86400'
      }
    });
  }