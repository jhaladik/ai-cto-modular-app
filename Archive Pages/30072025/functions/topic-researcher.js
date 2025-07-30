// functions/api/topic-researcher.js  
// Topic Researcher Worker Proxy - matches API client format

export async function onRequestPost(context) {
    const { request, env } = context;
    
    console.log('Topic Researcher API called');
    
    try {
        // Parse request body (API client sends endpoint info here)
        const requestData = await request.json();
        const { endpoint, method, data } = requestData;
        
        console.log(`Topic Researcher: ${method} ${endpoint}`, data);
        
        // Validate admin session
        const sessionToken = request.headers.get('x-session-token') || 
                           request.headers.get('X-Session-Token');
                            
        if (!sessionToken) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Session token required' 
            }), { 
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get session from KV (using correct binding name)
        const sessionKey = `session:${sessionToken}`;
        const session = await env.BITWARE_SESSION_STORE.get(sessionKey);
        if (!session) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Invalid session' 
            }), { 
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const sessionData = JSON.parse(session);
        if (sessionData.role !== 'admin') {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Admin access required',
                user_role: sessionData.role,
                required_role: 'admin'
            }), { 
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Route based on endpoint and method
        const TOPIC_RESEARCHER_URL = env.TOPIC_RESEARCHER_URL || 'https://bitware-topic-researcher.jhaladik.workers.dev';
        
        if (method === 'GET') {
            // Parse base endpoint and query parameters
            const [baseEndpoint, queryString] = endpoint.split('?');
            const fullUrl = TOPIC_RESEARCHER_URL + endpoint; // Include full endpoint with query params
            
            switch (baseEndpoint) {
                case '/health':
                    return await proxyToWorker(TOPIC_RESEARCHER_URL + '/health', 'GET', null, env);
                    
                case '/admin/stats':
                    return await proxyToWorker(TOPIC_RESEARCHER_URL + '/admin/stats', 'GET', null, env, true);
                    
                case '/admin/analytics':
                    return await proxyToWorker(fullUrl, 'GET', null, env, true);
                    
                case '/admin/sessions':
                    return await proxyToWorker(TOPIC_RESEARCHER_URL + '/admin/sessions', 'GET', null, env, true);
                    
                case '/admin/sources':
                    // Handle /admin/sources?session_id=123
                    return await proxyToWorker(fullUrl, 'GET', null, env, true);
                    
                case '/capabilities':
                    return await proxyToWorker(TOPIC_RESEARCHER_URL + '/capabilities', 'GET', null, env);
                    
                default:
                    return createErrorResponse('Endpoint not found', 404);
            }
        } else if (method === 'POST') {
            switch (endpoint) {
                case '/research':
                    // Handle live research testing
                    const { topic, depth = 3, maxSources = 20 } = data || {};
                    if (!topic) {
                        return createErrorResponse('Topic is required', 400);
                    }
                    
                    const researchUrl = `${TOPIC_RESEARCHER_URL}/?topic=${encodeURIComponent(topic)}&depth=${depth}&maxSources=${maxSources}`;
                    return await proxyToWorker(researchUrl, 'GET', null, env, false, true);
                    
                case '/admin/clear-cache':
                    return await proxyToWorker(TOPIC_RESEARCHER_URL + '/admin/clear-cache', 'POST', null, env, true);
                    
                default:
                    return createErrorResponse('Endpoint not found', 404);
            }
        } else {
            return createErrorResponse('Method not allowed', 405);
        }

    } catch (error) {
        console.error('Topic Researcher API Error:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function routeRequest(endpoint, method, data, env) {

async function routeRequest(endpoint, method, data, env) {
    const TOPIC_RESEARCHER_URL = env.TOPIC_RESEARCHER_URL || 'https://bitware-topic-researcher.jhaladik.workers.dev';
    
    // Parse base endpoint and query parameters
    const [baseEndpoint, queryString] = endpoint.split('?');
    const fullUrl = TOPIC_RESEARCHER_URL + endpoint; // Include full endpoint with query params
    
    // Route based on method
    if (method === 'GET') {
        switch (baseEndpoint) {
            case '/health':
                return await proxyToWorker(TOPIC_RESEARCHER_URL + '/health', 'GET', null, env);
                
            case '/admin/stats':
                return await proxyToWorker(TOPIC_RESEARCHER_URL + '/admin/stats', 'GET', null, env, true);
                
            case '/admin/analytics':
                return await proxyToWorker(fullUrl, 'GET', null, env, true);
                
            case '/admin/sessions':
                return await proxyToWorker(TOPIC_RESEARCHER_URL + '/admin/sessions', 'GET', null, env, true);
                
            case '/admin/sources':
                // Handle /admin/sources?session_id=123
                return await proxyToWorker(fullUrl, 'GET', null, env, true);
                
            case '/capabilities':
                return await proxyToWorker(TOPIC_RESEARCHER_URL + '/capabilities', 'GET', null, env);
                
            default:
                return createErrorResponse('Endpoint not found', 404);
        }
    } else if (method === 'POST') {
        switch (baseEndpoint) {
            case '/research':
                // Handle live research testing
                const { topic, depth = 3, maxSources = 20 } = data || {};
                if (!topic) {
                    return createErrorResponse('Topic is required', 400);
                }
                
                const researchUrl = `${TOPIC_RESEARCHER_URL}/?topic=${encodeURIComponent(topic)}&depth=${depth}&maxSources=${maxSources}`;
                return await proxyToWorker(researchUrl, 'GET', null, env, false, true);
                
            case '/admin/clear-cache':
                return await proxyToWorker(TOPIC_RESEARCHER_URL + '/admin/clear-cache', 'POST', null, env, true);
                
            default:
                return createErrorResponse('Endpoint not found', 404);
        }
    } else {
        return createErrorResponse('Method not allowed', 405);
    }
}
}

async function proxyToWorker(url, method, body, env, requireAuth = false, requireClientAuth = false) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (requireAuth) {
        headers['Authorization'] = `Bearer ${env.WORKER_SHARED_SECRET}`;
        headers['X-Worker-ID'] = 'bitware_admin_dashboard';
    }
    
    if (requireClientAuth) {
        headers['X-API-Key'] = env.CLIENT_API_KEY;
    }
    
    try {
        console.log(`Proxying to: ${url}`, { method, headers: Object.keys(headers) });
        
        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });
        
        if (!response.ok) {
            console.error(`Worker responded with ${response.status}: ${response.statusText}`);
            throw new Error(`Worker responded with ${response.status}`);
        }
        
        const data = await response.json();
        
        // Return worker response directly without wrapping for research endpoints
        if (url.includes('/?topic=')) {
            return new Response(JSON.stringify(data), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Wrap other responses with success format
        return new Response(JSON.stringify({
            success: true,
            data: data,
            timestamp: new Date().toISOString()
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('Worker proxy error:', error);
        return createErrorResponse(`Failed to communicate with Topic Researcher: ${error.message}`, 500);
    }
}

function createErrorResponse(message, status = 500) {
    return new Response(JSON.stringify({
        success: false,
        error: message,
        timestamp: new Date().toISOString()
    }), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}