// functions/api/feed-fetcher.js
// Feed Fetcher Worker Proxy - RSS content downloading and article extraction

export async function onRequestPost(context) {
    const { request, env } = context;
    
    console.log('Feed Fetcher API called');
    
    try {
        // Parse request body
        const requestData = await request.json();
        const { endpoint, method, data } = requestData;
        
        console.log(`Feed Fetcher: ${method} ${endpoint}`, data);
        
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
        const FEED_FETCHER_URL = env.FEED_FETCHER_URL || 'https://bitware-feed-fetcher.jhaladik.workers.dev';
        
        if (method === 'GET') {
            // Parse base endpoint and query parameters
            const [baseEndpoint, queryString] = endpoint.split('?');
            
            switch (baseEndpoint) {
                case '/health':
                    return await proxyToWorker(FEED_FETCHER_URL + '/health', 'GET', null, env);
                    
                case '/capabilities':
                    return await proxyToWorker(FEED_FETCHER_URL + '/capabilities', 'GET', null, env);
                    
                case '/admin/stats':
                    return await proxyToWorker(FEED_FETCHER_URL + '/admin/stats', 'GET', null, env, true);
                    
                case '/admin/jobs':
                    return await proxyToWorker(FEED_FETCHER_URL + '/admin/jobs', 'GET', null, env, true);
                    
                case '/admin/articles':
                    // Handle articles query with job_id and limit parameters
                    const articlesParams = new URLSearchParams(queryString || '');
                    const jobId = articlesParams.get('job_id');
                    const limit = articlesParams.get('limit') || '20';
                    
                    if (!jobId) {
                        return createErrorResponse('job_id parameter required', 400);
                    }
                    
                    const articlesUrl = `${FEED_FETCHER_URL}/admin/articles?job_id=${jobId}&limit=${limit}`;
                    return await proxyToWorker(articlesUrl, 'GET', null, env, true);
                    
                case '/fetch':
                    // Handle single feed fetch - now supported via query parameters
                    const fetchParams = new URLSearchParams(queryString || '');
                    const feedUrl = fetchParams.get('feed_url') || (data && data.feed_url);
                    const maxArticles = fetchParams.get('max_articles') || (data && data.max_articles) || 20;
                    const includeContent = fetchParams.get('include_content') || (data && data.include_content) || false;
                    
                    if (!feedUrl) {
                        return createErrorResponse('feed_url is required', 400);
                    }
                    
                    const fetchUrl = `${FEED_FETCHER_URL}/?feed_url=${encodeURIComponent(feedUrl)}&max_articles=${maxArticles}&include_content=${includeContent}`;
                    return await proxyToWorker(fetchUrl, 'GET', null, env);
                    
                default:
                    return createErrorResponse('Endpoint not found', 404);
            }
        } else if (method === 'POST') {
            switch (endpoint) {
                case '/batch':
                    // Validate batch data
                    if (!data || !data.feed_urls || !Array.isArray(data.feed_urls)) {
                        return createErrorResponse('Missing required field: feed_urls (array)', 400);
                    }
                    
                    if (data.feed_urls.length === 0) {
                        return createErrorResponse('feed_urls array cannot be empty', 400);
                    }
                    
                    if (data.feed_urls.length > 20) {
                        return createErrorResponse('Maximum 20 feeds allowed per batch', 400);
                    }
                    
                    // Validate URLs
                    for (const url of data.feed_urls) {
                        try {
                            new URL(url);
                        } catch (e) {
                            return createErrorResponse(`Invalid URL: ${url}`, 400);
                        }
                    }
                    
                    return await proxyToWorker(FEED_FETCHER_URL + '/batch', 'POST', data, env);
                    
                case '/fetch':
                    // Handle single feed as POST (alternative method)
                    if (!data || !data.feed_url) {
                        return createErrorResponse('Missing required field: feed_url', 400);
                    }
                    
                    try {
                        new URL(data.feed_url);
                    } catch (e) {
                        return createErrorResponse('Invalid feed_url format', 400);
                    }
                    
                    const maxArticles = Math.min(Math.max(1, data.max_articles || 20), 100);
                    const includeContent = data.include_content === true;
                    
                    // Convert POST to GET request for the worker
                    const singleFetchUrl = `${FEED_FETCHER_URL}/?feed_url=${encodeURIComponent(data.feed_url)}&max_articles=${maxArticles}&include_content=${includeContent}`;
                    return await proxyToWorker(singleFetchUrl, 'GET', null, env);
                    
                default:
                    return createErrorResponse('Endpoint not found', 404);
            }
        } else {
            return createErrorResponse('Method not allowed', 405);
        }

    } catch (error) {
        console.error('Feed Fetcher API Error:', error);
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
        return createErrorResponse(`Failed to contact Feed Fetcher: ${error.message}`, 502);
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