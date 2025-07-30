// functions/api/content-classifier.js
// Content Classifier Worker Proxy - AI-powered content analysis and topic classification

export async function onRequestPost(context) {
    const { request, env } = context;
    
    console.log('Content Classifier API called');
    
    try {
        // Parse request body
        const requestData = await request.json();
        const { endpoint, method, data } = requestData;
        
        console.log(`Content Classifier: ${method} ${endpoint}`, data);
        
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
        const CONTENT_CLASSIFIER_URL = env.CONTENT_CLASSIFIER_URL || 'https://bitware-content-classifier.jhaladik.workers.dev';
        
        if (method === 'GET') {
            // Parse base endpoint and query parameters
            const [baseEndpoint, queryString] = endpoint.split('?');
            
            switch (baseEndpoint) {
                case '/health':
                    return await proxyToWorker(CONTENT_CLASSIFIER_URL + '/health', 'GET', null, env);
                    
                case '/capabilities':
                    return await proxyToWorker(CONTENT_CLASSIFIER_URL + '/capabilities', 'GET', null, env);
                    
                case '/admin/stats':
                    return await proxyToWorker(CONTENT_CLASSIFIER_URL + '/admin/stats', 'GET', null, env, true);
                    
                case '/admin/jobs':
                    return await proxyToWorker(CONTENT_CLASSIFIER_URL + '/admin/jobs', 'GET', null, env, true);
                    
                case '/admin/costs':
                    return await proxyToWorker(CONTENT_CLASSIFIER_URL + '/admin/costs', 'GET', null, env, true);
                    
                case '/results':
                    // Handle results query with job_id parameter
                    const resultsParams = new URLSearchParams(queryString || '');
                    const jobId = resultsParams.get('job_id');
                    
                    if (!jobId) {
                        return createErrorResponse('job_id parameter required', 400);
                    }
                    
                    const resultsUrl = `${CONTENT_CLASSIFIER_URL}/results?job_id=${jobId}`;
                    return await proxyToWorker(resultsUrl, 'GET', null, env);
                    
                case '/admin/results':
                    // Handle admin results query with job_id parameter
                    const adminResultsParams = new URLSearchParams(queryString || '');
                    const adminJobId = adminResultsParams.get('job_id');
                    
                    if (!adminJobId) {
                        return createErrorResponse('job_id parameter required', 400);
                    }
                    
                    const adminResultsUrl = `${CONTENT_CLASSIFIER_URL}/admin/results?job_id=${adminJobId}`;
                    return await proxyToWorker(adminResultsUrl, 'GET', null, env, true);
                    
                default:
                    return createErrorResponse('Endpoint not found', 404);
            }
        } else if (method === 'POST') {
            switch (endpoint) {
                case '/analyze':
                    // Validate analysis request
                    if (!data || !data.articles || !data.target_topic) {
                        return createErrorResponse('Missing required fields: articles and target_topic', 400);
                    }
                    
                    if (!Array.isArray(data.articles)) {
                        return createErrorResponse('articles must be an array', 400);
                    }
                    
                    if (data.articles.length === 0) {
                        return createErrorResponse('articles array cannot be empty', 400);
                    }
                    
                    if (data.articles.length > 20) {
                        return createErrorResponse('Maximum 20 articles allowed per request', 400);
                    }
                    
                    // Validate analysis depth
                    const validDepths = ['quick', 'standard', 'deep'];
                    if (data.analysis_depth && !validDepths.includes(data.analysis_depth)) {
                        return createErrorResponse('analysis_depth must be quick, standard, or deep', 400);
                    }
                    
                    // Validate confidence threshold
                    if (data.min_confidence !== undefined) {
                        const confidence = parseFloat(data.min_confidence);
                        if (isNaN(confidence) || confidence < 0 || confidence > 1) {
                            return createErrorResponse('min_confidence must be a number between 0 and 1', 400);
                        }
                    }
                    
                    return await proxyToWorker(CONTENT_CLASSIFIER_URL + '/analyze', 'POST', data, env);
                    
                case '/analyze/single':
                    // Validate single analysis request
                    if (!data || !data.article || !data.target_topic) {
                        return createErrorResponse('Missing required fields: article and target_topic', 400);
                    }
                    
                    // Validate article object has required fields
                    const article = data.article;
                    if (!article.article_url || !article.title || !article.pub_date || !article.source_feed) {
                        return createErrorResponse('Article must have article_url, title, pub_date, and source_feed', 400);
                    }
                    
                    return await proxyToWorker(CONTENT_CLASSIFIER_URL + '/analyze/single', 'POST', data, env);
                    
                case '/analyze/batch':
                    // Validate batch analysis request
                    if (!data || !data.articles || !data.target_topic) {
                        return createErrorResponse('Missing required fields: articles and target_topic', 400);
                    }
                    
                    if (!Array.isArray(data.articles)) {
                        return createErrorResponse('articles must be an array', 400);
                    }
                    
                    if (data.articles.length < 2) {
                        return createErrorResponse('Batch analysis requires at least 2 articles', 400);
                    }
                    
                    if (data.articles.length > 20) {
                        return createErrorResponse('Maximum 20 articles allowed per batch', 400);
                    }
                    
                    return await proxyToWorker(CONTENT_CLASSIFIER_URL + '/analyze/batch', 'POST', data, env);
                    
                default:
                    return createErrorResponse('Endpoint not found', 404);
            }
        } else {
            return createErrorResponse('Method not allowed', 405);
        }

    } catch (error) {
        console.error('Content Classifier API Error:', error);
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
    } else {
        headers['X-API-Key'] = env.CLIENT_API_KEY;
    }
    
    console.log(`Proxying to: ${url}`);
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: headers,
            body: body ? JSON.stringify(body) : undefined,
            // Add timeout to prevent hanging requests
            signal: AbortSignal.timeout(120000) // 2 minute timeout for AI processing
        });

        // Get response text first
        const responseText = await response.text();
        
        // Try to parse as JSON
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse worker response as JSON:', parseError);
            responseData = { 
                error: 'Invalid response format from worker',
                raw_response: responseText.substring(0, 500) // Limit length
            };
        }

        if (!response.ok) {
            console.error(`Worker responded with ${response.status}:`, responseData);
            return new Response(JSON.stringify({ 
                success: false, 
                error: responseData.error || `Worker error: ${response.status}`,
                worker_status: response.status
            }), { 
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Return successful response
        return new Response(JSON.stringify({ 
            success: true, 
            data: responseData 
        }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error proxying to worker:', error);
        
        // Handle timeout errors
        if (error.name === 'TimeoutError') {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Analysis request timed out. Please try with fewer articles or contact support.',
                error_type: 'timeout'
            }), { 
                status: 504,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Handle network errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Unable to connect to Content Classifier service. Please try again later.',
                error_type: 'network'
            }), { 
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Generic error handling
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message || 'Unknown error occurred while processing request',
            error_type: 'unknown'
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

function createErrorResponse(message, status = 400) {
    return new Response(JSON.stringify({ 
        success: false, 
        error: message 
    }), { 
        status: status,
        headers: { 'Content-Type': 'application/json' }
    });
}