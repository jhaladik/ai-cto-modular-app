// functions/api/orchestrator.js - PROPERLY FIXED
export async function onRequestPost(context) {
  const { request, env } = context;
  
  let sessionToken = null; // Define first
  
  // Debug logging (now sessionToken is defined)
  console.log('Environment check:', {
    hasBitwareSessionStore: !!env.BITWARE_SESSION_STORE,
    allEnvKeys: Object.keys(env)
  });

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Session-Token',
  };

  try {
    const body = await request.json();
    const { endpoint, method, data } = body;
    
    const publicEndpoints = ['/health', '/help', '/capabilities'];
    const isPublicEndpoint = publicEndpoints.includes(endpoint);
    
    if (!isPublicEndpoint) {
      // ASSIGN (don't declare new const)
      sessionToken = request.headers.get('X-Session-Token') || request.headers.get('x-session-token');
      
      if (!sessionToken) {
        return new Response(JSON.stringify({
          success: false,
          error: 'No session token'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      
      // FIX: Use correct key format
      const sessionData = await env.BITWARE_SESSION_STORE.get(`session:${sessionToken}`);
      if (!sessionData) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid or expired session'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }
    
    // Rest of your code...
    const workerHeaders = { 'Content-Type': 'application/json' };
    
    if (!isPublicEndpoint) {
      workerHeaders['X-API-Key'] = env.CLIENT_API_KEY;
    }
    
    const workerUrl = env.REPORT_BUILDER_URL;
    if (!workerUrl) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Orchestrator worker URL not configured'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    const fullUrl = `${workerUrl}${endpoint}`;
    const requestOptions = {
      method: method || 'GET',
      headers: workerHeaders
    };
    
    if ((method === 'POST' || method === 'PUT') && data) {
      requestOptions.body = JSON.stringify(data);
    }
    
    const response = await fetch(fullUrl, requestOptions);
    const responseData = await response.text();
    
    return new Response(responseData, {
      status: response.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
    
  } catch (error) {
    console.error('Orchestrator proxy error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Session-Token',
    }
  });
}