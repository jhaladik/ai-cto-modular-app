import { validateSession } from '../../_shared/auth-helper';

/**
 * Granulator API Proxy
 * Routes requests to the Content Granulator worker
 */
export async function onRequest(context) {
    const { request, env, params } = context;
    const url = new URL(request.url);
    
    try {
        // Get the path after /api/granulator/
        const granulatorPath = params.path ? `/${params.path.join('/')}` : '';
        
        // Check if this is an admin endpoint
        const isAdminEndpoint = granulatorPath.startsWith('/stats') || 
                               granulatorPath.startsWith('/admin') ||
                               granulatorPath.startsWith('/analytics');
        
        let authHeaders = {};
        let authenticatedUserId = null;
        let authenticatedClientId = null;
        
        if (isAdminEndpoint) {
            // Admin endpoints use worker-to-worker auth
            authHeaders = {
                'Authorization': `Bearer ${env.SHARED_SECRET || 'internal-worker-auth-token-2024'}`,
                'X-Worker-ID': 'ai-factory-pages'
            };
        } else {
            // Try session auth first
            const sessionToken = request.headers.get('x-bitware-session-token');
            if (sessionToken) {
                const sessionValidation = await validateSession(request, env);
                if (sessionValidation.valid && sessionValidation.session) {
                    // Valid session - use worker auth but pass user context
                    authHeaders = {
                        'Authorization': `Bearer ${env.SHARED_SECRET || 'internal-worker-auth-token-2024'}`,
                        'X-Worker-ID': 'ai-factory-pages',
                        'X-User-ID': sessionValidation.session.user_id || sessionValidation.session.userId || sessionValidation.session.id,
                        'X-Client-ID': sessionValidation.session.kamContext?.client_id || ''
                    };
                    authenticatedUserId = sessionValidation.session.user_id;
                    authenticatedClientId = sessionValidation.session.kamContext?.client_id;
                }
            }
            
            // If no valid session, try API key
            if (!authHeaders.Authorization) {
                const apiKey = request.headers.get('X-API-Key');
                if (apiKey) {
                    authHeaders = {
                        'X-API-Key': apiKey
                    };
                }
            }
            
            // If still no auth, return 401
            if (!authHeaders.Authorization && !authHeaders['X-API-Key']) {
                return new Response(JSON.stringify({ error: 'Authentication required' }), {
                    status: 401,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }
        }
        
        // Build the granulator URL
        const granulatorUrl = `${env.GRANULATOR_URL || 'https://bitware-content-granulator.jhaladik.workers.dev'}/api${granulatorPath}${url.search}`;
        
        console.log(`Proxying to granulator: ${granulatorUrl}`);
        
        // Forward the request to the granulator
        const granulatorResponse = await fetch(granulatorUrl, {
            method: request.method,
            headers: {
                ...authHeaders,
                'Content-Type': request.headers.get('Content-Type') || 'application/json',
                'Accept': 'application/json'
            },
            body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined
        });
        
        // Get response body
        const responseBody = await granulatorResponse.text();
        
        // Return the response
        return new Response(responseBody, {
            status: granulatorResponse.status,
            headers: {
                'Content-Type': granulatorResponse.headers.get('Content-Type') || 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization, X-Worker-ID, x-bitware-session-token'
            }
        });
        
    } catch (error) {
        console.error('Granulator proxy error:', error);
        return new Response(JSON.stringify({ 
            error: 'Proxy error', 
            message: error.message 
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}

// Handle CORS preflight
export async function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization, X-Worker-ID, x-bitware-session-token',
            'Access-Control-Max-Age': '86400'
        }
    });
}