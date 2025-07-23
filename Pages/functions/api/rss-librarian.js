// Fix for functions/api/rss-librarian.js
// REPLACE the entire file with this corrected version:

export async function onRequestPost(context) {
  const { request, env } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Session-Token',
  };

  try {
    const body = await request.json();
    const { endpoint, method, data } = body;
    
    // List of PUBLIC endpoints that don't need authentication
    const publicEndpoints = ['/health', '/help', '/capabilities'];
    const isPublicEndpoint = publicEndpoints.includes(endpoint);
    
    // Only check session for non-public endpoints
    if (!isPublicEndpoint) {
      const sessionToken = request.headers.get('X-Session-Token') || request.headers.get('x-session-token');
      
      if (!sessionToken) {
        return new Response(JSON.stringify({
          success: false,
          error: 'No session token'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      
      const sessionData = await env.SESSION_STORE.get(sessionToken);
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
    
    const workerHeaders = { 'Content-Type': 'application/json' };
    if (!isPublicEndpoint) {
      workerHeaders['X-API-Key'] = env.CLIENT_API_KEY;
    }
    
    const workerUrl = env.RSS_LIBRARIAN_URL;
    if (!workerUrl) {
      return new Response(JSON.stringify({
        success: false,
        error: 'RSS librarian worker URL not configured'
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
    
    // Make request to RSS librarian worker
    const response = await fetch(fullUrl, requestOptions);
    
    // CRITICAL: Clone the response to avoid "body stream already read" error
    const responseClone = response.clone();
    
    let responseData;
    try {
      responseData = await responseClone.text();
    } catch (error) {
      // If text reading fails, try with original response
      responseData = await response.text();
    }
    
    return new Response(responseData, {
      status: response.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
    
  } catch (error) {
    console.error('RSS librarian proxy error:', error);
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