// functions/api/key-account-manager.js
// DIAGNOSTIC VERSION - Shows exactly what's failing
// This will help us identify the root cause of the 500 errors

export async function onRequestPost(context) {
  const { request, env } = context;
  
  // CORS headers for all responses
  const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token, x-session-token',
      'Access-Control-Max-Age': '86400'
  };
  
  try {
      // DIAGNOSTIC: Check environment configuration
      const diagnostics = {
          hasSessionStore: !!env.BITWARE_SESSION_STORE,
          hasKAMBinding: !!env.KEY_ACCOUNT_MANAGER,
          hasClientAPIKey: !!env.CLIENT_API_KEY,
          hasWorkerSecret: !!env.WORKER_SHARED_SECRET,
          timestamp: new Date().toISOString()
      };
      
      console.log('🔍 Environment Diagnostics:', diagnostics);
      
      // DIAGNOSTIC: Check if this is a health check request
      let requestBody;
      try {
          requestBody = await request.json();
      } catch (e) {
          console.error('❌ Failed to parse request JSON:', e.message);
          return new Response(JSON.stringify({
              error: 'Invalid JSON in request body',
              diagnostics: diagnostics
          }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
      }
      
      const { endpoint = '', method = 'GET', data = null } = requestBody;
      console.log('📋 Request Details:', { endpoint, method, hasData: !!data });
      
      // DIAGNOSTIC: If KAM binding not available, return diagnostic info
      if (!env.KEY_ACCOUNT_MANAGER) {
          console.warn('⚠️ KEY_ACCOUNT_MANAGER service binding not configured');
          return new Response(JSON.stringify({
              error: 'KEY_ACCOUNT_MANAGER service binding not configured',
              solution: 'Add [[services]] binding = "KEY_ACCOUNT_MANAGER" to wrangler.toml',
              diagnostics: diagnostics,
              endpoint: endpoint,
              fallback_data: getFallbackData(endpoint)
          }), {
              status: 503,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
      }
      
      // DIAGNOSTIC: Check session token
      const sessionToken = request.headers.get('X-Session-Token') || 
                         request.headers.get('x-session-token');
      
      if (!sessionToken) {
          console.log('⚠️ No session token provided');
          return new Response(JSON.stringify({
              error: 'No session token provided',
              diagnostics: diagnostics,
              headers_received: Object.fromEntries(request.headers.entries())
          }), {
              status: 401,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
      }
      
      console.log('🔑 Session token received:', sessionToken.substring(0, 10) + '...');
      
      // DIAGNOSTIC: Check session store
      if (!env.BITWARE_SESSION_STORE) {
          return new Response(JSON.stringify({
              error: 'BITWARE_SESSION_STORE KV binding not configured',
              solution: 'Add [[kv_namespaces]] binding = "BITWARE_SESSION_STORE" to wrangler.toml',
              diagnostics: diagnostics
          }), {
              status: 503,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
      }
      
      // DIAGNOSTIC: Try to get session data
      const sessionKey = `session:${sessionToken}`;
      let sessionData;
      try {
          sessionData = await env.BITWARE_SESSION_STORE.get(sessionKey);
          console.log('💾 Session lookup result:', !!sessionData ? 'Found' : 'Not found');
      } catch (e) {
          console.error('❌ Session store access failed:', e.message);
          return new Response(JSON.stringify({
              error: 'Failed to access session store',
              message: e.message,
              diagnostics: diagnostics
          }), {
              status: 500,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
      }
      
      if (!sessionData) {
          console.log('⚠️ Session not found in store');
          return new Response(JSON.stringify({
              error: 'Session not found',
              session_key: sessionKey,
              diagnostics: diagnostics,
              fallback_data: getFallbackData(endpoint)
          }), {
              status: 401,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
      }
      
      // DIAGNOSTIC: Try to parse session
      let session;
      try {
          session = JSON.parse(sessionData);
          console.log('👤 Session parsed:', { 
              username: session.username, 
              role: session.role, 
              expires: new Date(session.expires) 
          });
      } catch (e) {
          console.error('❌ Session JSON parse failed:', e.message);
          return new Response(JSON.stringify({
              error: 'Malformed session data',
              diagnostics: diagnostics
          }), {
              status: 401,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
      }
      
      // DIAGNOSTIC: Check session expiration
      if (Date.now() > session.expires) {
          console.log('⏰ Session expired');
          try {
              await env.BITWARE_SESSION_STORE.delete(sessionKey);
          } catch (e) {
              console.error('Failed to delete expired session:', e.message);
          }
          return new Response(JSON.stringify({
              error: 'Session expired',
              expired_at: new Date(session.expires),
              current_time: new Date(),
              diagnostics: diagnostics
          }), {
              status: 401,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
      }
      
      // DIAGNOSTIC: Build headers for worker request
      const workerHeaders = {
          'Content-Type': 'application/json',
          'User-Agent': 'AI-Factory-Pages-Diagnostic/1.0'
      };
      
      // DIAGNOSTIC: Check authentication requirements
      let authType = 'public';
      if (endpoint.startsWith('/admin/')) {
          authType = endpoint === '/admin/recent-activity' ? 'admin-client-auth' : 'admin-worker-auth';
          if (session.role !== 'admin') {
              console.log('🚫 Admin access denied for role:', session.role);
              return new Response(JSON.stringify({
                  error: 'Admin access required',
                  user_role: session.role,
                  required_role: 'admin',
                  diagnostics: diagnostics
              }), {
                  status: 403,
                  headers: { 'Content-Type': 'application/json', ...corsHeaders }
              });
          }
          
          if (!env.WORKER_SHARED_SECRET) {
              return new Response(JSON.stringify({
                  error: 'WORKER_SHARED_SECRET not configured',
                  diagnostics: diagnostics
              }), {
                  status: 503,
                  headers: { 'Content-Type': 'application/json', ...corsHeaders }
              });
          }
          
          workerHeaders['Authorization'] = `Bearer ${env.WORKER_SHARED_SECRET}`;
          workerHeaders['X-Worker-ID'] = 'pages_function_proxy';
          
      } else if (endpoint !== '/health' && endpoint !== '/help' && endpoint !== '/capabilities') {
          authType = 'client';
          if (!env.CLIENT_API_KEY) {
              return new Response(JSON.stringify({
                  error: 'CLIENT_API_KEY not configured',
                  diagnostics: diagnostics
              }), {
                  status: 503,
                  headers: { 'Content-Type': 'application/json', ...corsHeaders }
              });
          }
          
          workerHeaders['X-API-Key'] = env.CLIENT_API_KEY;
      }
      
      console.log('🔐 Authentication type:', authType);
      
      // DIAGNOSTIC: Prepare request body
      let body = null;
      if (method !== 'GET' && method !== 'HEAD' && data) {
          body = JSON.stringify(data);
      }
      
      // DIAGNOSTIC: Try to call KAM worker via service binding
      console.log('📞 Calling KAM worker via service binding...');
      let workerResponse;
      try {
          workerResponse = await env.KEY_ACCOUNT_MANAGER.fetch(
              new Request(`https://kam.internal${endpoint}`, {
                  method,
                  headers: workerHeaders,
                  body
              })
          );
          console.log('✅ KAM worker responded:', workerResponse.status, workerResponse.statusText);
      } catch (fetchError) {
          console.error('❌ KAM service binding failed:', fetchError.message);
          return new Response(JSON.stringify({
              error: 'KAM worker service binding failed',
              message: fetchError.message,
              diagnostics: diagnostics,
              fallback_data: getFallbackData(endpoint)
          }), {
              status: 503,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
      }
      
      // DIAGNOSTIC: Get response text
      let responseText;
      try {
          responseText = await workerResponse.text();
          console.log('📄 Response received, size:', responseText.length);
      } catch (e) {
          console.error('❌ Failed to read worker response:', e.message);
          return new Response(JSON.stringify({
              error: 'Failed to read worker response',
              message: e.message,
              diagnostics: diagnostics
          }), {
              status: 502,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
      }
      
      // DIAGNOSTIC: Log success
      if (workerResponse.ok) {
          console.log('✅ KAM Proxy Success:', {
              user: session.username,
              endpoint,
              status: workerResponse.status
          });
      } else {
          console.warn('⚠️ KAM Worker returned error:', {
              status: workerResponse.status,
              response: responseText.substring(0, 200)
          });
      }
      
      // Return the actual worker response
      return new Response(responseText, {
          status: workerResponse.status,
          statusText: workerResponse.statusText,
          headers: {
              'Content-Type': workerResponse.headers.get('Content-Type') || 'application/json',
              ...corsHeaders
          }
      });

  } catch (error) {
      console.error('❌ Unexpected proxy error:', error);
      
      return new Response(JSON.stringify({
          error: 'Unexpected proxy error',
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
          diagnostics: {
              hasSessionStore: !!env?.BITWARE_SESSION_STORE,
              hasKAMBinding: !!env?.KEY_ACCOUNT_MANAGER,
              hasClientAPIKey: !!env?.CLIENT_API_KEY,
              hasWorkerSecret: !!env?.WORKER_SHARED_SECRET
          }
      }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
  }
}

// Fallback data for when KAM worker is unavailable
function getFallbackData(endpoint) {
  const fallbackData = {
      '/admin/stats': {
          total_clients: 3,
          active_clients: 3,
          trial_clients: 1,
          total_revenue: 1542.75,
          requests_today: 24,
          system_health_percentage: 85,
          revenue_growth_percent: 12.5,
          client_growth_count: 2,
          request_growth_percent: 18.3,
          note: 'Fallback data - KAM worker unavailable'
      },
      '/admin/clients': {
          clients: [
              {
                  client_id: 'demo_client_001',
                  company_name: 'Demo Corporation',
                  subscription_tier: 'premium',
                  account_status: 'active',
                  monthly_budget_usd: 500,
                  used_budget_current_month: 287.50,
                  last_interaction: '2 hours ago'
              }
          ],
          pagination: { total: 1, limit: 50, offset: 0, has_more: false },
          note: 'Fallback data - KAM worker unavailable'
      },
      '/admin/recent-activity': {
          activities: [
              {
                  icon: '🔧',
                  title: 'System Diagnostic',
                  description: 'KAM worker service binding not available - using fallback data',
                  time: 'Now'
              }
          ],
          note: 'Fallback data - KAM worker unavailable'
      }
  };
  
  return fallbackData[endpoint] || { 
      error: 'No fallback data available for endpoint: ' + endpoint 
  };
}

// Handle other HTTP methods
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
  return new Response(null, {
      status: 200,
      headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token, x-session-token',
          'Access-Control-Max-Age': '86400'
      }
  });
}