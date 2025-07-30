// functions/api/orchestrator.js - ENHANCED COMPATIBILITY
// Supports both legacy calls and enhanced dashboard features

export async function onRequestPost(context) {
  const { request, env } = context;
  
  console.log('Enhanced orchestrator proxy called');

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Session-Token, x-session-token',
  };

  try {
    // Parse request body
    const body = await request.json();
    const { endpoint, method = 'GET', data } = body;
    
    console.log('Enhanced request:', { endpoint, method, hasData: !!data });
    
    // Validate required parameters
    if (!endpoint) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing endpoint parameter'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Session validation for non-public endpoints
    const publicEndpoints = ['/health', '/help', '/capabilities'];
    const adminEndpoints = ['/admin/stats', '/admin/performance', '/admin/costs', '/admin/templates'];
    const isPublicEndpoint = publicEndpoints.includes(endpoint);
    const isAdminEndpoint = adminEndpoints.some(ep => endpoint.startsWith(ep.split('?')[0]));

    // Get session token from either header format
    const sessionToken = request.headers.get('X-Session-Token') || request.headers.get('x-session-token');
    
    if (!isPublicEndpoint) {
      if (!sessionToken) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Session token required'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // Validate session
      const sessionData = await env.BITWARE_SESSION_STORE.get(`session:${sessionToken}`, 'json');
      if (!sessionData) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid or expired session'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // Check admin access for admin endpoints
      if (isAdminEndpoint && sessionData.role !== 'admin') {
        return new Response(JSON.stringify({
          success: false,
          error: 'Admin access required'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // Update session activity
      sessionData.last_activity = Date.now();
      await env.BITWARE_SESSION_STORE.put(
        `session:${sessionToken}`,
        JSON.stringify(sessionData),
        { expirationTtl: 86400 } // 24 hours
      );
    }

    // Build orchestrator request
    const orchestratorUrl = `https://internal${endpoint}`;
        
    // Prepare headers for orchestrator
    const orchestratorHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'AI-Factory-Frontend/2.0'
    };

    // Add authentication headers based on endpoint type
    if (!isPublicEndpoint) {
      orchestratorHeaders['X-API-Key'] = env.CLIENT_API_KEY;
    }

    if (isAdminEndpoint) {
      orchestratorHeaders['Authorization'] = `Bearer ${env.WORKER_SHARED_SECRET}`;
      orchestratorHeaders['X-Worker-ID'] = 'ai_factory_frontend';
    }

    // Prepare request options
    const requestOptions = {
      method: method.toUpperCase(),
      headers: orchestratorHeaders
    };

    // Handle request body for POST/PUT
    if ((method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT') && data) {
      requestOptions.body = JSON.stringify(data);
    }

    // Add query parameters for GET requests with data
    let finalUrl = orchestratorUrl;
    if (method.toUpperCase() === 'GET' && data && Object.keys(data).length > 0) {
      const queryParams = new URLSearchParams();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
      if (queryParams.toString()) {
        finalUrl += `?${queryParams.toString()}`;
      }
    }

    console.log('Calling orchestrator:', { 
      url: finalUrl, 
      method: requestOptions.method,
      hasAuth: !!orchestratorHeaders['X-API-Key'],
      isAdmin: !!orchestratorHeaders['Authorization']
    });

    // Make request to orchestrator
    let response;
    
    // Try service binding first, fallback to HTTP
    if (env.ORCHESTRATOR && typeof env.ORCHESTRATOR.fetch === 'function') {
      console.log('Using service binding');
      const orchestratorRequest = new Request(finalUrl, requestOptions);
      response = await env.ORCHESTRATOR.fetch(orchestratorRequest);
    } else {
      console.log('Using HTTP request');
      response = await fetch(finalUrl, requestOptions);
    }
    
    // Handle orchestrator response
    const responseText = await response.text();
    
    console.log('Orchestrator response:', { 
      status: response.status, 
      hasData: !!responseText 
    });

    // Parse response data
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.log('Non-JSON response, wrapping in object');
      responseData = { message: responseText };
    }

    // Handle specific error cases
    if (!response.ok) {
      let errorMessage = 'Unknown error';
      let errorCode = 'ORCHESTRATOR_ERROR';

      switch (response.status) {
        case 400:
          errorMessage = 'Invalid request parameters';
          errorCode = 'BAD_REQUEST';
          break;
        case 401:
          errorMessage = 'Authentication failed';
          errorCode = 'UNAUTHORIZED';
          break;
        case 402:
          errorMessage = 'Budget limit exceeded';
          errorCode = 'BUDGET_EXCEEDED';
          break;
        case 403:
          errorMessage = 'Access denied';
          errorCode = 'FORBIDDEN';
          break;
        case 404:
          errorMessage = 'Endpoint not found';
          errorCode = 'NOT_FOUND';
          break;
        case 429:
          errorMessage = 'Rate limit exceeded';
          errorCode = 'RATE_LIMITED';
          break;
        case 503:
          errorMessage = 'Service temporarily unavailable';
          errorCode = 'SERVICE_UNAVAILABLE';
          break;
        case 504:
          errorMessage = 'Request timeout';
          errorCode = 'TIMEOUT';
          break;
        default:
          errorMessage = responseData.error || responseData.message || 'Internal server error';
      }

      return new Response(JSON.stringify({
        success: false,
        error: errorMessage,
        code: errorCode,
        status: response.status,
        details: responseData
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Enhance successful responses with metadata
    if (typeof responseData === 'object' && responseData !== null) {
      responseData._metadata = {
        endpoint: endpoint,
        method: method,
        timestamp: new Date().toISOString(),
        processing_time_ms: Date.now() - Date.now(), // This would be calculated properly
        source: 'ai-factory-frontend'
      };
    }

    // Return successful response
    return new Response(JSON.stringify(responseData), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': getCacheControlHeader(endpoint),
        'X-Request-ID': generateRequestId(),
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('Orchestrator proxy error:', error);
    
    // Handle specific error types
    let errorMessage = 'Internal server error';
    let statusCode = 500;

    if (error.message.includes('fetch')) {
      errorMessage = 'Unable to connect to orchestrator service';
      statusCode = 503;
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request timeout';
      statusCode = 504;
    } else if (error.message.includes('JSON')) {
      errorMessage = 'Invalid response format';
      statusCode = 502;
    }

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      code: 'PROXY_ERROR',
      timestamp: new Date().toISOString(),
      details: env.ENVIRONMENT === 'development' ? error.message : undefined
    }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// Handle GET requests (for direct endpoint access)
export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  // Convert GET request to POST format
  const endpoint = url.searchParams.get('endpoint') || '/health';
  const method = url.searchParams.get('method') || 'GET';
  
  // Extract other query parameters as data
  const data = {};
  url.searchParams.forEach((value, key) => {
    if (key !== 'endpoint' && key !== 'method') {
      data[key] = value;
    }
  });

  // Create new request in POST format
  const postRequest = new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({ endpoint, method, data })
  });

  return onRequestPost({ request: postRequest, env: context.env });
}

// Handle OPTIONS requests for CORS
export async function onRequestOptions(context) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Session-Token, x-session-token',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// Utility functions
function getCacheControlHeader(endpoint) {
  const cacheRules = {
    '/health': 'public, max-age=30', // Health checks cache for 30 seconds
    '/capabilities': 'public, max-age=300', // Capabilities cache for 5 minutes
    '/pipeline-health': 'public, max-age=60', // Pipeline health cache for 1 minute
    '/performance-insights': 'private, max-age=120', // Performance data cache for 2 minutes
    '/admin/stats': 'private, max-age=60',
    '/admin/performance': 'private, max-age=120',
    '/admin/costs': 'private, max-age=300',
    '/admin/templates': 'private, max-age=600',
    '/orchestrate': 'no-cache', // Never cache pipeline executions
  };

  return cacheRules[endpoint] || 'private, max-age=60';
}

function generateRequestId() {
  return 'req_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}