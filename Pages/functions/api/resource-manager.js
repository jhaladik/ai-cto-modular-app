// Resource Manager Proxy for Pages Functions
// Forwards requests to the Resource Manager worker using the KAM pattern

import { validateSession } from '../_shared/auth-helper.js';

export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        // Parse the KAM-pattern request
        const { endpoint, method = 'GET', data = {} } = await request.json();
        
        // Validate session
        const sessionToken = request.headers.get('x-bitware-session-token');
        if (!sessionToken) {
            return new Response(JSON.stringify({ error: 'No session token provided' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Validate session
        const session = await validateSession(sessionToken, env);
        if (!session) {
            return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Check if user is admin for Resource Manager access
        if (session.user.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Admin access required' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Forward to Resource Manager using service binding or URL
        if (env.RESOURCE_MANAGER) {
            // Use service binding (preferred)
            const serviceRequest = new Request(`https://resource-manager${endpoint}`, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${env.WORKER_SECRET || 'internal-worker-auth-token-2024'}`,
                    'X-Worker-ID': 'bitware_pages_proxy',
                    'X-Client-ID': session.user.client_id || '0',
                    'X-User-ID': session.user.id
                },
                body: method !== 'GET' ? JSON.stringify(data) : undefined
            });
            
            return await env.RESOURCE_MANAGER.fetch(serviceRequest);
        } else {
            // Fallback to URL
            const url = `https://bitware-resource-manager.jhaladik.workers.dev${endpoint}`;
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${env.WORKER_SECRET || 'internal-worker-auth-token-2024'}`,
                    'X-Worker-ID': 'bitware_pages_proxy',
                    'X-Client-ID': session.user.client_id || '0',
                    'X-User-ID': session.user.id
                },
                body: method !== 'GET' ? JSON.stringify(data) : undefined
            });
            
            // Return the response directly
            return new Response(await response.text(), {
                status: response.status,
                headers: {
                    'Content-Type': response.headers.get('Content-Type') || 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
    } catch (error) {
        console.error('Resource Manager proxy error:', error);
        return new Response(JSON.stringify({ 
            error: 'Internal server error',
            message: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Handle other HTTP methods
export async function onRequestGet(context) {
    return new Response('Method not allowed - use POST with {endpoint, method, data}', { 
        status: 405,
        headers: { 'Content-Type': 'text/plain' }
    });
}

export async function onRequestOptions(context) {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-bitware-session-token'
        }
    });
}