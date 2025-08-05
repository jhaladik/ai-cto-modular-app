// Pages/functions/api/orchestrator/[path].js
// Proxy for Orchestrator 2.0 API calls

import { validateSession } from '../../_shared/auth-helper.js';

export async function onRequest(context) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Worker-ID, x-bitware-session-token',
    };
    
    // Handle CORS preflight
    if (context.request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }
    
    try {
        // Extract path from params
        let path = '';
        if (context.params && context.params.path) {
            if (Array.isArray(context.params.path)) {
                path = context.params.path.join('/');
            } else {
                path = context.params.path;
            }
        }
        
        console.log('[Orchestrator Proxy] Path:', path);
        console.log('[Orchestrator Proxy] Method:', context.request.method);
        
        // Validate session locally using KV store
        const sessionValidation = await validateSession(context.request, context.env);
        
        if (!sessionValidation.valid) {
            console.error('[Orchestrator Proxy] Session validation failed:', sessionValidation.error);
            return new Response(JSON.stringify({
                error: 'Authentication failed',
                message: sessionValidation.error
            }), {
                status: 401,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        }
        
        const { session } = sessionValidation;
        console.log('[Orchestrator Proxy] Session validated for user:', session.username);
        
        // Only allow admin users
        if (session.role !== 'admin') {
            return new Response(JSON.stringify({
                error: 'Forbidden',
                message: 'Admin access required'
            }), {
                status: 403,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        }
        
        // Build orchestrator URL
        const orchestratorUrl = `https://bitware-orchestrator-v2.jhaladik.workers.dev/${path}`;
        console.log('[Orchestrator Proxy] Forwarding to:', orchestratorUrl);
        
        // Forward request to orchestrator with worker authentication
        const requestBody = context.request.method !== 'GET' && context.request.method !== 'HEAD'
            ? await context.request.text()
            : null;
        
        // Get worker secret from environment
        const workerSecret = context.env.WORKER_SECRET || 'internal-worker-auth-token-2024';
            
        const orchestratorResponse = await fetch(orchestratorUrl, {
            method: context.request.method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${workerSecret}`,
                'X-Worker-ID': 'bitware_pages_proxy',
                'X-Session-User-Id': session.user_id || session.userId,
                'X-Session-Email': session.email || session.username,
                'X-Session-Role': session.role
            },
            body: requestBody
        });
        
        console.log('[Orchestrator Proxy] Response status:', orchestratorResponse.status);
        
        const responseText = await orchestratorResponse.text();
        
        return new Response(responseText, {
            status: orchestratorResponse.status,
            headers: {
                'Content-Type': orchestratorResponse.headers.get('Content-Type') || 'application/json',
                ...corsHeaders
            }
        });
        
    } catch (error) {
        console.error('[Orchestrator Proxy] Error:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: 'Proxy error',
            message: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    }
}