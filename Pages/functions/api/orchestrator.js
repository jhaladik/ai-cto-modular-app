// functions/api/orchestrator.js - COMPLETE WORKING VERSION
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
    const isPublicEndpoint = publicEndpoints.includes(endpoint);
    
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
    
    const workerHeaders = { 'Content-Type': 'application/json' };
    
    if (!isPublicEndpoint) {
      workerHeaders['X-API-Key'] = env.CLIENT_API_KEY;
    }
    
    const workerUrl = env.ORCHESTRATOR_URL;
    if (!workerUrl) {
      console.log('ORCHESTRATOR_URL not configured');
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
    
    console.log('Calling backend:', { fullUrl, method: requestOptions.method });
    
    const response = await fetch(fullUrl, requestOptions);
    const responseData = await response.text();
    
    console.log('Backend response:', { status: response.status, hasData: !!responseData });
    
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