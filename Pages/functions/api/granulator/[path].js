/**
 * Granulator Proxy Handler
 * Routes requests from the frontend to the Content Granulator worker
 */

import { validateSession } from '../../_shared/auth-helper';

export async function onRequest(context) {
    const { request, env, params } = context;
    const url = new URL(request.url);
    const method = request.method;
    
    // Build the path from catch-all parameter
    const pathSegments = params.path || [];
    const path = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments || '';
    const fullPath = `/api/${path}${url.search}`;
    
    console.log(`[Granulator Proxy] ${method} ${fullPath}`);
    
    try {
        // Check if this is an admin endpoint
        const isAdminEndpoint = true; // All granulator endpoints require admin access
        
        // Validate session for admin endpoints
        if (isAdminEndpoint) {
            const sessionToken = request.headers.get('x-bitware-session-token');
            if (!sessionToken) {
                return new Response(JSON.stringify({ 
                    error: 'Authentication required',
                    message: 'Please log in to access this resource'
                }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            const sessionData = await validateSession(env, sessionToken);
            if (!sessionData || sessionData.userType !== 'admin') {
                return new Response(JSON.stringify({ 
                    error: 'Unauthorized',
                    message: 'Admin access required'
                }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
        
        // Prepare headers for the granulator request
        const headers = new Headers(request.headers);
        
        // Use worker-to-worker authentication
        headers.set('Authorization', `Bearer ${env.WORKER_SECRET || 'internal-worker-auth-token-2024'}`);
        headers.set('X-Worker-ID', 'bitware-pages-proxy');
        
        // Remove session token from forwarded headers
        headers.delete('x-bitware-session-token');
        
        // Use service binding if available, otherwise fall back to URL
        let response;
        if (env.CONTENT_GRANULATOR) {
            console.log('[Granulator Proxy] Using service binding');
            
            // Create new request with modified URL for service binding
            const serviceRequest = new Request(`https://granulator${fullPath}`, {
                method,
                headers,
                body: method !== 'GET' && method !== 'HEAD' ? request.body : undefined,
                cf: request.cf
            });
            
            response = await env.CONTENT_GRANULATOR.fetch(serviceRequest);
        } else {
            // Fallback to direct URL
            const granulatorUrl = env.GRANULATOR_URL || 'https://bitware-content-granulator.jhaladik.workers.dev';
            const targetUrl = `${granulatorUrl}${fullPath}`;
            
            console.log(`[Granulator Proxy] Using URL: ${targetUrl}`);
            
            const requestOptions = {
                method,
                headers,
                body: method !== 'GET' && method !== 'HEAD' ? request.body : undefined,
                cf: request.cf
            };
            
            response = await fetch(targetUrl, requestOptions);
        }
        
        // Create a new response with the granulator's response
        const modifiedResponse = new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
        });
        
        // Add CORS headers if needed
        modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
        modifiedResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        modifiedResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-bitware-session-token');
        
        return modifiedResponse;
        
    } catch (error) {
        console.error('[Granulator Proxy] Error:', error);
        return new Response(JSON.stringify({ 
            error: 'Proxy Error',
            message: 'Failed to communicate with Content Granulator service',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Handle OPTIONS requests for CORS
export async function onRequestOptions() {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-bitware-session-token',
            'Access-Control-Max-Age': '86400',
        }
    });
}