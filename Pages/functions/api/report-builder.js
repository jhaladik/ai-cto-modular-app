// functions/api/report-builder.js
// Report Builder Worker Proxy - Intelligence Report Generation

export async function onRequestPost(context) {
    const { request, env } = context;
    
    console.log('Report Builder API called');
    
    try {
        // Parse request body
        const requestData = await request.json();
        const { endpoint, method, data } = requestData;
        
        console.log(`Report Builder: ${method} ${endpoint}`, data);
        
        // Validate session
        const sessionToken = request.headers.get('x-bitware-session-token') ||
                           request.headers.get('X-Session-Token') ||
                           request.headers.get('x-session-token');
                            
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
        const REPORT_BUILDER_URL = env.REPORT_BUILDER_URL || 'https://bitware-report-builder.jhaladik.workers.dev';
        
        if (method === 'GET') {
            // Parse base endpoint and query parameters
            const [baseEndpoint, queryString] = endpoint.split('?');
            const fullUrl = REPORT_BUILDER_URL + endpoint;
            
            switch (baseEndpoint) {
                case '/health':
                    return await proxyToWorker(REPORT_BUILDER_URL + '/health', 'GET', null, env);
                    
                case '/capabilities':
                    return await proxyToWorker(REPORT_BUILDER_URL + '/capabilities', 'GET', null, env);
                    
                case '/dashboard-data':
                    return await proxyToWorker(REPORT_BUILDER_URL + '/dashboard-data', 'GET', null, env, false, true);
                    
                case '/trend-analysis':
                    return await proxyToWorker(fullUrl, 'GET', null, env, false, true);
                    
                case '/reports':
                    // Handle reports listing
                    const reportsParams = new URLSearchParams(queryString || '');
                    const limit = reportsParams.get('limit') || '20';
                    const offset = reportsParams.get('offset') || '0';
                    
                    const reportsUrl = `${REPORT_BUILDER_URL}/reports?limit=${limit}&offset=${offset}`;
                    return await proxyToWorker(reportsUrl, 'GET', null, env, false, true);
                    
                case '/admin/stats':
                    return await proxyToWorker(REPORT_BUILDER_URL + '/admin/stats', 'GET', null, env, true);
                    
                case '/admin/jobs':
                    return await proxyToWorker(REPORT_BUILDER_URL + '/admin/jobs', 'GET', null, env, true);
                    
                case '/admin/costs':
                    return await proxyToWorker(REPORT_BUILDER_URL + '/admin/costs', 'GET', null, env, true);
                    
                default:
                    // Handle dynamic routes like /reports/{id}/view or /reports/{id}/download
                    if (baseEndpoint.startsWith('/reports/')) {
                        return await proxyToWorker(fullUrl, 'GET', null, env);
                    }
                    
                    return createErrorResponse('Endpoint not found', 404);
            }
        } else if (method === 'POST') {
            switch (endpoint) {
                case '/generate':
                    // Validate report generation request
                    if (!data || !data.report_type) {
                        return createErrorResponse('Missing required field: report_type', 400);
                    }
                    
                    // Validate report type
                    const validReportTypes = [
                        'executive_summary', 
                        'trend_analysis', 
                        'technical_deep_dive', 
                        'competitive_intelligence', 
                        'daily_briefing'
                    ];
                    
                    if (!validReportTypes.includes(data.report_type)) {
                        return createErrorResponse('Invalid report_type', 400);
                    }
                    
                    // Validate output format if specified
                    if (data.output_format) {
                        const validFormats = ['json', 'html', 'markdown', 'email'];
                        if (!validFormats.includes(data.output_format)) {
                            return createErrorResponse('Invalid output_format', 400);
                        }
                    }
                    
                    // Validate relevance score if specified
                    if (data.min_relevance_score !== undefined) {
                        const score = parseFloat(data.min_relevance_score);
                        if (isNaN(score) || score < 0 || score > 1) {
                            return createErrorResponse('min_relevance_score must be a number between 0 and 1', 400);
                        }
                    }
                    
                    return await proxyToWorker(REPORT_BUILDER_URL + '/generate', 'POST', data, env, false, true);
                    
                case '/quick-summary':
                    // Validate quick summary request
                    if (!data) {
                        return createErrorResponse('Request data required', 400);
                    }
                    
                    return await proxyToWorker(REPORT_BUILDER_URL + '/quick-summary', 'POST', data, env, false, true);
                    
                case '/admin/clear-cache':
                    return await proxyToWorker(REPORT_BUILDER_URL + '/admin/clear-cache', 'POST', null, env, true);
                    
                default:
                    return createErrorResponse('Endpoint not found', 404);
            }
        } else if (method === 'DELETE') {
            // Handle DELETE requests for admin endpoints
            if (endpoint.startsWith('/admin/reports/')) {
                const reportId = endpoint.split('/')[3];
                if (!reportId || isNaN(parseInt(reportId))) {
                    return createErrorResponse('Invalid report ID', 400);
                }
                
                return await proxyToWorker(REPORT_BUILDER_URL + endpoint, 'DELETE', null, env, true);
            }
            
            return createErrorResponse('Endpoint not found', 404);
        } else {
            return createErrorResponse('Method not allowed', 405);
        }

    } catch (error) {
        console.error('Report Builder API Error:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function proxyToWorker(url, method, body, env, requiresWorkerAuth = false, requiresClientAuth = false) {
    const headers = {
        'Content-Type': 'application/json',
        'X-Worker-ID': 'ai_factory_frontend'
    };
    
    // Add appropriate authentication
    if (requiresWorkerAuth) {
        headers['Authorization'] = `Bearer ${env.WORKER_SHARED_SECRET}`;
    }
    
    if (requiresClientAuth) {
        headers['X-API-Key'] = env.CLIENT_API_KEY;
    }
    
    try {
        console.log(`Proxying to Report Builder: ${method} ${url}`);
        
        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : null
        });
        
        const responseText = await response.text();
        let responseData;
        
        try {
            responseData = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse worker response:', parseError);
            responseData = { 
                success: false, 
                error: 'Invalid response from worker',
                raw_response: responseText.substring(0, 200)
            };
        }
        
        console.log(`Report Builder response:`, {
            status: response.status,
            success: responseData.success !== false,
            data_keys: responseData ? Object.keys(responseData) : []
        });
        
        return new Response(JSON.stringify(responseData), {
            status: response.status,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('Proxy request failed:', error);
        return createErrorResponse('Worker request failed', 500);
    }
}

function createErrorResponse(message, status = 400) {
    return new Response(JSON.stringify({ 
        success: false, 
        error: message 
    }), { 
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

// Handle direct GET requests for public report viewing
export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    
    // Handle direct report viewing URLs like /api/report-builder/reports/123/view
    if (url.pathname.includes('/reports/') && (url.pathname.includes('/view') || url.pathname.includes('/download'))) {
        const REPORT_BUILDER_URL = env.REPORT_BUILDER_URL || 'https://bitware-report-builder.jhaladik.workers.dev';
        
        // Extract the path after /api/report-builder
        const reportPath = url.pathname.replace('/api/report-builder', '');
        const fullUrl = REPORT_BUILDER_URL + reportPath + url.search;
        
        try {
            console.log(`Direct report access: ${fullUrl}`);
            
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'X-Worker-ID': 'ai_factory_frontend'
                }
            });
            
            // For HTML reports, return the HTML directly
            if (url.pathname.includes('/view')) {
                const htmlContent = await response.text();
                return new Response(htmlContent, {
                    status: response.status,
                    headers: {
                        'Content-Type': 'text/html',
                        'Cache-Control': 'public, max-age=3600'
                    }
                });
            }
            
            // For downloads, pass through with appropriate headers
            const content = await response.text();
            const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
            
            return new Response(content, {
                status: response.status,
                headers: {
                    'Content-Type': contentType,
                    'Content-Disposition': response.headers.get('Content-Disposition') || 'attachment'
                }
            });
            
        } catch (error) {
            console.error('Direct report access failed:', error);
            return new Response('Report not found', { status: 404 });
        }
    }
    
    // For other GET requests, return method not allowed
    return new Response(JSON.stringify({ 
        success: false, 
        error: 'Use POST method for API requests' 
    }), { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
    });
}