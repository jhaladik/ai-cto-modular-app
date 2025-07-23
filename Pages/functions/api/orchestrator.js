// functions/api/orchestrator.js - FIXED AUTHENTICATION
export async function onRequestPost(context) {
  const { request, env } = context;
  
  console.log('Orchestrator proxy called');

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Session-Token',
  };

  try {
    const body = await request.json();
    const { endpoint, method, data } = body;
    
    console.log('Request body:', { endpoint, method, data });
    
    const publicEndpoints = ['/health', '/help', '/capabilities'];
    const adminEndpoints = ['/admin/stats', '/admin/performance', '/admin/costs'];
    const isPublicEndpoint = publicEndpoints.includes(endpoint);
    const isAdminEndpoint = adminEndpoints.some(ep => endpoint.startsWith(ep.split('?')[0]));
    
    if (!isPublicEndpoint) {
      const sessionToken = request.headers.get('X-Session-Token') || request.headers.get('x-session-token');
      
      if (!sessionToken) {
        console.log('No session token provided');
        return new Response(JSON.stringify({
          success: false,
          error: 'No session token'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      
      const sessionData = await env.BITWARE_SESSION_STORE.get(`session:${sessionToken}`);
      if (!sessionData) {
        console.log('Invalid session token');
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid or expired session'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      
      console.log('Session validated successfully');
    }
    
    // Prepare headers based on endpoint type
    const workerHeaders = { 'Content-Type': 'application/json' };
    
    if (isAdminEndpoint) {
      // Use worker authentication for admin endpoints
      workerHeaders['Authorization'] = `Bearer ${env.WORKER_SHARED_SECRET}`;
      workerHeaders['X-Worker-ID'] = 'ai_factory_frontend';
      console.log('Using worker auth for admin endpoint');
    } else if (!isPublicEndpoint) {
      // Use client authentication for regular endpoints
      workerHeaders['X-API-Key'] = env.CLIENT_API_KEY;
      console.log('Using client auth for regular endpoint');
    }
    
    // Check if service binding is available
    if (!env.ORCHESTRATOR) {
      console.log('ORCHESTRATOR service binding not available');
      return new Response(JSON.stringify({
        success: false,
        error: 'Orchestrator service binding not configured'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    // Create request for orchestrator via service binding
    const orchestratorRequest = new Request(`https://orchestrator${endpoint}`, {
      method: method || 'GET',
      headers: workerHeaders,
      body: ((method === 'POST' || method === 'PUT') && data) ? JSON.stringify(data) : undefined
    });
    
    console.log('Calling orchestrator via service binding:', { 
      endpoint, 
      method: orchestratorRequest.method,
      authType: isAdminEndpoint ? 'worker' : (isPublicEndpoint ? 'none' : 'client')
    });
    
    // Use service binding instead of HTTP fetch
    const response = await env.ORCHESTRATOR.fetch(orchestratorRequest);
    const responseData = await response.text();
    
    console.log('Orchestrator response:', { 
      status: response.status, 
      hasData: !!responseData 
    });
    
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