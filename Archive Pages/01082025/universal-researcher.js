// functions/api/universal-researcher.js
// Pages Function proxy for Universal Researcher 2.0 worker

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token, Authorization'
};

function createErrorResponse(message, status = 400) {
    return new Response(JSON.stringify({ 
        success: false, 
        error: message 
    }), { 
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
}

async function validateSession(sessionToken, env) {
    if (!sessionToken) {
        return { valid: false, error: 'No session token' };
    }
    
    try {
        const sessionKey = `session:${sessionToken}`;
        const sessionData = await env.BITWARE_SESSION_STORE.get(sessionKey);
        
        if (!sessionData) {
            return { valid: false, error: 'Invalid session' };
        }
        
        const session = JSON.parse(sessionData);
        
        if (Date.now() > session.expires) {
            await env.BITWARE_SESSION_STORE.delete(sessionKey);
            return { valid: false, error: 'Session expired' };
        }
        
        return { valid: true, session };
        
    } catch (error) {
        return { valid: false, error: 'Session validation failed' };
    }
}

export async function onRequestOptions() {
    return new Response(null, { headers: corsHeaders });
}

export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        console.log('Universal Researcher API Request received');
        
        const UNIVERSAL_RESEARCHER_URL = env.UNIVERSAL_RESEARCHER_URL || 'https://bitware-universal-researcher.jhaladik.workers.dev';
        
        if (!UNIVERSAL_RESEARCHER_URL) {
            return createErrorResponse('Universal Researcher service not configured', 503);
        }

        // Parse request body
        let data = null;
        let endpoint = '/health';
        let method = 'GET';
        
        try {
            const requestBody = await request.json();
            endpoint = requestBody.endpoint || '/health';
            method = requestBody.method || 'GET';
            data = requestBody.data || null;
        } catch (e) {
            console.log('No JSON body provided, using defaults');
        }

        console.log(`Proxying request: ${method} ${endpoint}`);

        // Extract base endpoint and query string
        const [baseEndpoint, queryString] = endpoint.split('?');
        
        // Session validation logic
        let requiresAuth = true;
        let requiresAdmin = false;
        
        // Public endpoints that don't require authentication
        if (baseEndpoint === '/health' || 
            baseEndpoint === '/capabilities' || 
            baseEndpoint === '/templates') {
            requiresAuth = false;
        }
        
        // Admin endpoints
        if (baseEndpoint.startsWith('/admin/')) {
            requiresAdmin = true;
        }
        
        // Validate session if required
        if (requiresAuth) {
            const sessionToken = request.headers.get('X-Session-Token');
            
            if (!sessionToken) {
                return createErrorResponse('Session token required', 401);
            }
            
            const sessionResult = await validateSession(sessionToken, env);
            
            if (!sessionResult.valid) {
                return createErrorResponse('Invalid or expired session', 401);
            }
            
            // Check admin access if required
            if (requiresAdmin && sessionResult.session.role !== 'admin') {
                return createErrorResponse('Admin access required', 403);
            }
        }

        // Handle different endpoints
        if (method === 'GET') {
            switch (baseEndpoint) {
                case '/health':
                    return await proxyToWorker(UNIVERSAL_RESEARCHER_URL + '/health', 'GET', null, env);
                    
                case '/capabilities':
                    return await proxyToWorker(UNIVERSAL_RESEARCHER_URL + '/capabilities', 'GET', null, env);
                    
                case '/templates':
                    return await proxyToWorker(UNIVERSAL_RESEARCHER_URL + '/templates', 'GET', null, env);
                    
                case '/admin/stats':
                    return await proxyToWorker(UNIVERSAL_RESEARCHER_URL + '/admin/stats', 'GET', null, env, true);
                    
                case '/admin/sessions':
                    return await proxyToWorker(UNIVERSAL_RESEARCHER_URL + '/admin/sessions', 'GET', null, env, true);
                    
                default:
                    // Handle legacy v1.0 endpoint with query parameters
                    if (baseEndpoint === '/' && queryString) {
                        const fullUrl = UNIVERSAL_RESEARCHER_URL + '/?' + queryString;
                        return await proxyToWorker(fullUrl, 'GET', null, env);
                    }
                    
                    return createErrorResponse('Endpoint not found', 404);
            }
        } else if (method === 'POST') {
            switch (baseEndpoint) {
                case '/execute':
                    // Main template execution endpoint
                    if (!data) {
                        return createErrorResponse('Request data required for execution', 400);
                    }
                    
                    // Validate required fields
                    if (!data.context || !data.template || !data.data) {
                        return createErrorResponse('Missing required fields: context, template, data', 400);
                    }
                    
                    return await proxyToWorker(UNIVERSAL_RESEARCHER_URL + '/execute', 'POST', data, env);
                    
                default:
                    return createErrorResponse('Endpoint not found', 404);
            }
        } else {
            return createErrorResponse('Method not allowed', 405);
        }

    } catch (error) {
        console.error('Universal Researcher API Error:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
}

async function proxyToWorker(url, method, body, env, requiresAdmin = false) {
    try {
        console.log(`Proxying to worker: ${method} ${url}`);
        
        const headers = {
            'Content-Type': 'application/json',
            'X-API-Key': env.CLIENT_API_KEY
        };
        
        // Add admin authentication if required
        if (requiresAdmin && env.WORKER_SHARED_SECRET) {
            headers['Authorization'] = `Bearer ${env.WORKER_SHARED_SECRET}`;
        }
        
        const requestOptions = {
            method: method,
            headers: headers
        };
        
        if (body && (method === 'POST' || method === 'PUT')) {
            requestOptions.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, requestOptions);
        
        console.log(`Worker response: ${response.status} ${response.statusText}`);
        
        // Get response data
        const responseData = await response.text();
        
        // Return response with CORS headers
        return new Response(responseData, {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
        
    } catch (error) {
        console.error('Error proxying to worker:', error);
        return createErrorResponse('Failed to communicate with worker service', 502);
    }
}

// Handle other HTTP methods
export async function onRequestGet(context) {
    return await onRequestPost(context);
}

export async function onRequestPut(context) {
    return await onRequestPost(context);
}

export async function onRequestDelete(context) {
    return await onRequestPost(context);
}