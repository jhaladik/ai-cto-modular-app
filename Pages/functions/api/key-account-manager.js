// Pages/functions/api/key-account-manager.js
// Corrected KAM proxy - integrates Pages sessions with KAM worker properly

import { validateSession } from '../_shared/auth-helper.js';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token, x-bitware-session-token, Authorization'
};

// Handle CORS preflight
export async function onRequestOptions() {
    return new Response(null, { headers: corsHeaders });
}

// Main proxy handler
export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        console.log('🔍 KAM Proxy: Processing request');
        
        // Parse the request body
        const incomingBody = await request.json();
        const { endpoint, method = 'GET', data = {} } = incomingBody;
        
        console.log(`📡 KAM Proxy: ${method} ${endpoint}`);
        
        // Step 1: Validate Pages session
        const sessionToken = request.headers.get('X-Session-Token') || request.headers.get('x-bitware-session-token');
        if (!sessionToken) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No session token provided'
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
        
        console.log(`🔑 Validating Pages session: ${sessionToken.substring(0, 10)}...`);
        
        // Create a request with the correct header format for validateSession
        const sessionRequest = new Request(request.url, {
            method: request.method,
            headers: {
                ...request.headers,
                'x-bitware-session-token': sessionToken
            }
        });
        
        const sessionValidation = await validateSession(sessionRequest, env);
        if (!sessionValidation.valid) {
            console.log('❌ Pages session invalid:', sessionValidation.error);
            return new Response(JSON.stringify({
                success: false,
                error: sessionValidation.error
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
        
        const session = sessionValidation.session;
        console.log(`✅ Pages session valid for user: ${session.username} (${session.role})`);
        
        // Step 2: Determine authentication method for KAM worker
        let kamHeaders = {
            'Content-Type': 'application/json'
        };
        
        // Check if this is an admin operation
        const isAdminEndpoint = endpoint.startsWith('/clients') || 
                              endpoint.startsWith('/users') || 
                              endpoint.startsWith('/dashboard') ||
                              endpoint.includes('admin');
        
        if (isAdminEndpoint) {
            // Admin operations - verify user is admin and use worker auth
            if (session.role !== 'admin' && session.userType !== 'internal') {
                console.log('🚫 Admin access denied for role:', session.role);
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Admin access required'
                }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }
            
            // Use worker-to-worker authentication
            kamHeaders['Authorization'] = `Bearer ${env.WORKER_SHARED_SECRET}`;
            kamHeaders['X-Worker-ID'] = 'pages-kam-proxy';
            console.log('🔧 Using worker authentication for admin endpoint');
            
        } else {
            // Non-admin operations - use client API key
            kamHeaders['X-API-Key'] = env.CLIENT_API_KEY;
            console.log('🔧 Using client API key for regular endpoint');
        }
        
        // Step 3: Add session token to KAM headers
        // KAM expects the session token for session-based endpoints
        kamHeaders['x-bitware-session-token'] = sessionToken;
        
        // Step 4: Call KAM worker
        console.log('📞 Calling KAM worker...');
        
        let kamRequestBody = null;
        if (method !== 'GET' && method !== 'HEAD') {
            kamRequestBody = JSON.stringify(data);
        }
        
        const kamResponse = await env.KEY_ACCOUNT_MANAGER.fetch(
            new Request(`https://kam.internal${endpoint}`, {
                method,
                headers: kamHeaders,
                body: kamRequestBody
            })
        );
        
        console.log(`📨 KAM worker responded: ${kamResponse.status}`);
        
        // Step 4: Return response
        const responseText = await kamResponse.text();
        
        return new Response(responseText, {
            status: kamResponse.status,
            statusText: kamResponse.statusText,
            headers: {
                'Content-Type': kamResponse.headers.get('Content-Type') || 'application/json',
                ...corsHeaders
            }
        });
        
    } catch (error) {
        console.error('❌ KAM Proxy Error:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: 'Proxy error',
            message: error.message,
            timestamp: new Date().toISOString()
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
}

// Also handle GET requests for direct endpoint access
export async function onRequestGet(context) {
    const { request, env } = context;
    
    // Convert GET to POST format for consistency
    const url = new URL(request.url);
    const endpoint = url.pathname.replace('/api/key-account-manager', '');
    
    // Create a fake POST request
    const fakeRequest = new Request(request.url, {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify({
            endpoint: endpoint || '/health',
            method: 'GET',
            data: {}
        })
    });
    
    return onRequestPost({ request: fakeRequest, env });
}