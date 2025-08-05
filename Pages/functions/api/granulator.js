/**
 * Granulator Proxy Handler - KAM Pattern
 * Routes requests from the frontend to the Content Granulator worker
 */

import { validateSession } from '../_shared/auth-helper';

export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        // Parse the KAM-pattern request
        const { endpoint, method = 'GET', data = {} } = await request.json();
        
        console.log(`[Granulator Proxy] ${method} ${endpoint}`);
        
        // Validate session
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
        
        const sessionValidation = await validateSession(request, env);
        if (!sessionValidation.valid) {
            return new Response(JSON.stringify({ 
                error: 'Unauthorized',
                message: sessionValidation.error || 'Invalid session'
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        const session = sessionValidation.session;
        if (session.role !== 'admin' && session.userType !== 'internal') {
            return new Response(JSON.stringify({ 
                error: 'Unauthorized',
                message: 'Admin access required'
            }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Prepare headers for the granulator request
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.WORKER_SECRET || 'internal-worker-auth-token-2024'}`,
            'X-Worker-ID': 'bitware-pages-proxy'
        };
        
        // Use service binding if available
        let response;
        if (env.CONTENT_GRANULATOR) {
            console.log('[Granulator Proxy] Using service binding');
            
            // Create new request with modified URL for service binding
            const serviceRequest = new Request(`https://granulator/api${endpoint}`, {
                method: method,
                headers: headers,
                body: method !== 'GET' && method !== 'HEAD' ? JSON.stringify(data) : undefined
            });
            
            response = await env.CONTENT_GRANULATOR.fetch(serviceRequest);
        } else {
            // Fallback to direct URL
            const granulatorUrl = env.GRANULATOR_URL || 'https://bitware-content-granulator.jhaladik.workers.dev';
            const targetUrl = `${granulatorUrl}/api${endpoint}`;
            
            console.log(`[Granulator Proxy] Using URL: ${targetUrl}`);
            
            const requestOptions = {
                method: method,
                headers: headers,
                body: method !== 'GET' && method !== 'HEAD' ? JSON.stringify(data) : undefined
            };
            
            response = await fetch(targetUrl, requestOptions);
        }
        
        // Return the response
        const responseData = await response.text();
        return new Response(responseData, {
            status: response.status,
            statusText: response.statusText,
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-bitware-session-token'
            }
        });
        
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