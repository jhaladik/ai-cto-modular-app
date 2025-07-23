// functions/api/orchestrator.js - FIXED VERSION
export async function onRequestPost(context) {
  const { request, env } = context;
  
  // CORS headers
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
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Validate session token
      const sessionData = await env.SESSION_STORE.get(sessionToken);
      if (!sessionData) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid or expired session'
        }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
    }
    
    // Prepare headers for worker request
    const workerHeaders = {
      'Content-Type': 'application/json',
    };
    
    // Add authentication for the worker if needed
    if (!isPublicEndpoint) {
      // For authenticated endpoints, add the client API key
      workerHeaders['X-API-Key'] = env.CLIENT_API_KEY;
    }
    
    // Prepare the request to the orchestrator worker
    const workerUrl = env.ORCHESTRATOR_URL;
    if (!workerUrl) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Orchestrator worker URL not configured'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Build the full URL with endpoint
    const fullUrl = `${workerUrl}${endpoint}`;
    
    // Prepare request options
    const requestOptions = {
      method: method || 'GET',
      headers: workerHeaders
    };
    
    // Add body for POST/PUT requests
    if ((method === 'POST' || method === 'PUT') && data) {
      requestOptions.body = JSON.stringify(data);
    }
    
    // Make request to orchestrator worker
    const response = await fetch(fullUrl, requestOptions);
    const responseData = await response.text();
    
    // Return the worker's response
    return new Response(responseData, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('Orchestrator proxy error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

// Handle OPTIONS requests for CORS
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