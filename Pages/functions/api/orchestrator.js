// Pages/functions/api/orchestrator.js
// Proxy for Orchestrator 2.0 API calls - follows KAM pattern

import { validateSession } from '../_shared/auth-helper.js';
import { handleCors, jsonResponse, errorResponse, unauthorizedResponse, serverErrorResponse, corsHeaders } from '../_shared/http-utils.js';

// Handle CORS preflight
export async function onRequestOptions() {
    return handleCors();
}

// Main proxy handler
export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        console.log('🎛️ Orchestrator Proxy: Processing request');
        
        // Parse the request body
        const incomingBody = await request.json();
        const { endpoint, method = 'GET', data = {} } = incomingBody;
        
        console.log(`📡 Orchestrator Proxy: ${method} ${endpoint}`);
        
        // Validate session
        const sessionToken = request.headers.get('X-Session-Token') || request.headers.get('x-bitware-session-token');
        
        if (!sessionToken) {
            console.error('❌ No session token found in headers');
            return unauthorizedResponse('No session token provided');
        }
        
        // Create a request with the correct header format for validateSession
        const sessionRequest = new Request(request.url, {
            method: request.method,
            headers: {
                ...request.headers,
                'x-bitware-session-token': sessionToken
            }
        });
        
        const sessionValidation = await validateSession(sessionRequest, env);
        console.log('📋 Session validation result:', sessionValidation);
        
        if (!sessionValidation.valid) {
            console.log('❌ Session invalid:', sessionValidation.error);
            return unauthorizedResponse(sessionValidation.error || 'Session validation failed');
        }
        
        const session = sessionValidation.session;
        console.log(`✅ Session valid for user: ${session.username} (${session.role})`);
        
        // Only allow admin users for orchestrator
        if (session.role !== 'admin' && session.userType !== 'internal') {
            console.log('🚫 Admin access required for orchestrator');
            return errorResponse('Admin access required', 403);
        }
        
        // Get worker secret from environment
        const workerSecret = env.WORKER_SECRET || 'internal-worker-auth-token-2024';
        
        // Build orchestrator URL
        const orchestratorUrl = `https://bitware-orchestrator-v2.jhaladik.workers.dev${endpoint}`;
        console.log('🔄 Forwarding to orchestrator:', orchestratorUrl);
        
        // Forward request to orchestrator with worker authentication
        const orchestratorHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${workerSecret}`,
            'X-Worker-ID': 'bitware_pages_proxy',
            'X-Session-User-Id': session.user_id || session.userId || session.id,
            'X-Session-Email': session.email || session.username,
            'X-Session-Role': session.role
        };
        
        let orchestratorResponse;
        
        if (method === 'GET' || method === 'HEAD') {
            orchestratorResponse = await fetch(orchestratorUrl, {
                method: method,
                headers: orchestratorHeaders
            });
        } else {
            orchestratorResponse = await fetch(orchestratorUrl, {
                method: method,
                headers: orchestratorHeaders,
                body: JSON.stringify(data)
            });
        }
        
        console.log('📨 Orchestrator response status:', orchestratorResponse.status);
        
        // Get response as text first to handle both JSON and non-JSON responses
        const responseText = await orchestratorResponse.text();
        
        // Try to parse as JSON
        try {
            const jsonData = JSON.parse(responseText);
            return jsonResponse(jsonData, { 
                status: orchestratorResponse.status,
                headers: corsHeaders 
            });
        } catch (e) {
            // If not JSON, return as-is
            return new Response(responseText, {
                status: orchestratorResponse.status,
                headers: {
                    'Content-Type': orchestratorResponse.headers.get('Content-Type') || 'text/plain',
                    ...corsHeaders
                }
            });
        }
        
    } catch (error) {
        console.error('❌ Orchestrator Proxy error:', error);
        return serverErrorResponse(error.message);
    }
}