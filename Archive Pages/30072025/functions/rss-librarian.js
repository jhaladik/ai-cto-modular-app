// functions/api/rss-librarian.js
// RSS Librarian Worker Proxy - Database-driven RSS source management

export async function onRequestPost(context) {
    const { request, env } = context;
    
    console.log('RSS Librarian API called');
    
    try {
        // Parse request body
        const requestData = await request.json();
        const { endpoint, method, data } = requestData;
        
        console.log(`RSS Librarian: ${method} ${endpoint}`, data);
        
        // Validate session
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

        // Get session from KV
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
        
        // Admin endpoints require admin role
        if (endpoint.startsWith('/admin') && sessionData.role !== 'admin') {
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
        const RSS_LIBRARIAN_URL = env.RSS_LIBRARIAN_URL || env.RSS_SOURCE_FINDER_URL || 'https://bitware-rss-source-finder.jhaladik.workers.dev';
        
        if (method === 'GET') {
            // Parse base endpoint and query parameters
            const [baseEndpoint, queryString] = endpoint.split('?');
            const fullUrl = RSS_LIBRARIAN_URL + endpoint;
            
            switch (baseEndpoint) {
                case '/health':
                    return await proxyToWorker(RSS_LIBRARIAN_URL + '/health', 'GET', null, env);
                    
                case '/capabilities':
                    return await proxyToWorker(RSS_LIBRARIAN_URL + '/capabilities', 'GET', null, env);
                    
                case '/topics':
                    return await proxyToWorker(RSS_LIBRARIAN_URL + '/topics', 'GET', null, env);
                    
                case '/sources':
                    return await proxyToWorker(RSS_LIBRARIAN_URL + '/sources', 'GET', null, env);
                    
                case '/admin/stats':
                    return await proxyToWorker(RSS_LIBRARIAN_URL + '/admin/stats', 'GET', null, env, true);
                    
                case '/search':
                    // Handle topic search - map to main endpoint
                    const { topic, maxFeeds = 20, minQuality = 0.5 } = data || {};
                    if (!topic) {
                        return createErrorResponse('Topic is required', 400);
                    }
                    
                    const searchUrl = `${RSS_LIBRARIAN_URL}/?topic=${encodeURIComponent(topic)}&maxFeeds=${maxFeeds}&minQualityScore=${minQuality}`;
                    return await proxyToWorker(searchUrl, 'GET', null, env);
                    
                default:
                    return createErrorResponse('Endpoint not found', 404);
            }
        } else if (method === 'POST') {
            switch (endpoint) {
                case '/admin/add-source':
                    // Validate source data
                    if (!data || !data.url || !data.title || !data.topic) {
                        return createErrorResponse('Missing required fields: url, title, topic', 400);
                    }
                    
                    return await proxyToWorker(RSS_LIBRARIAN_URL + '/admin/add-source', 'POST', data, env, true);
                    
                default:
                    return createErrorResponse('Endpoint not found', 404);
            }
        } else {
            return createErrorResponse('Method not allowed', 405);
        }

    } catch (error) {
        console.error('RSS Librarian API Error:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function proxyToWorker(url, method, body, env, requiresWorkerAuth = false) {
    const headers = {
        'Content-Type': 'application/json',
        'X-Worker-ID': 'ai_factory_frontend'
    };
    
    // Add appropriate authentication
    if (requiresWorkerAuth) {
        headers['Authorization'] = `Bearer ${env.WORKER_SHARED_SECRET}`;
        headers['X-Worker-ID'] = 'ai_factory_frontend';
    } else {
        headers['X-API-Key'] = env.CLIENT_API_KEY;
    }
    
    try {
        const fetchOptions = {
            method,
            headers
        };
        
        if (body && method !== 'GET') {
            fetchOptions.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, fetchOptions);
        const responseData = await response.text();
        
        // Try to parse as JSON
        try {
            const jsonData = JSON.parse(responseData);
            return new Response(JSON.stringify({
                success: response.ok,
                data: jsonData,
                status: response.status
            }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            // Return raw response if not JSON
            return new Response(responseData, {
                status: response.status,
                headers: response.headers
            });
        }
    } catch (error) {
        console.error('Worker proxy error:', error);
        return createErrorResponse(`Failed to contact RSS Librarian: ${error.message}`, 502);
    }
}

function createErrorResponse(message, status) {
    return new Response(JSON.stringify({
        success: false,
        error: message
    }), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}