// functions/api/kam/[...path].js
// @WORKER: KAM API Proxy
// 🧱 Type: PagesFunction  
// 📍 Path: functions/api/kam/[...path].js
// 🎯 Role: Proxy to KAM worker with session validation
// 💾 Storage: { session: "KV", data: "KAM D1 via service binding" }

export async function onRequest(context) {
    const { request, env, params } = context;
    const url = new URL(request.url);
    const path = params.path.join('/');
    
    try {
        // Validate session
        const sessionToken = request.headers.get('x-bitware-session-token');
        if (!sessionToken) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Session token required' 
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get session from KV (unified approach)
        const sessionData = await env.BITWARE_SESSION_STORE.get(`session:${sessionToken}`);
        if (!sessionData) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Invalid session' 
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const session = JSON.parse(sessionData);
        const now = Date.now();
        
        if (session.expires < now) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Session expired' 
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Route based on path and user role
        return await routeKAMRequest(path, request, session, env);
        
    } catch (error) {
        console.error('KAM API error:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: 'Internal server error' 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function routeKAMRequest(path, request, session, env) {
    const method = request.method;
    const { role, userType, clientId } = session;
    
    // Admin/User endpoints
    if ((role === 'admin' || role === 'user') && path.startsWith('admin/')) {
        return await handleAdminRequest(path, method, session, env);
    }
    
    // Client endpoints
    if (role === 'client' && clientId) {
        return await handleClientRequest(path, method, session, env);
    }
    
    // Public endpoints (available to all authenticated users)
    if (path === 'health' || path === 'capabilities') {
        return await handlePublicRequest(path, method, env);
    }
    
    return new Response(JSON.stringify({ 
        success: false, 
        error: 'Endpoint not found or access denied' 
    }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
    });
}

async function handleAdminRequest(path, method, session, env) {
    // Remove 'admin/' prefix
    const endpoint = path.substring(6);
    
    switch (endpoint) {
        case 'system-status':
            return handleSystemStatus(env);
            
        case 'client-overview':
            return handleClientOverview(env);
            
        case 'user-management':
            return handleUserManagement(method, env);
            
        default:
            // Forward to KAM worker
            try {
                const kamResponse = await env.KEY_ACCOUNT_MANAGER.fetch(
                    new Request(`https://kam.internal/admin/${endpoint}`, {
                        method,
                        headers: {
                            'Authorization': `Bearer ${env.WORKER_SHARED_SECRET}`,
                            'X-Worker-ID': 'pages-kam-proxy',
                            'Content-Type': 'application/json'
                        }
                    })
                );
                
                return new Response(await kamResponse.text(), {
                    status: kamResponse.status,
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (error) {
                return new Response(JSON.stringify({ 
                    success: false, 
                    error: 'KAM service unavailable' 
                }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
    }
}

async function handleClientRequest(path, method, session, env) {
    const { clientId } = session;
    
    switch (path) {
        case 'usage-overview':
            return handleClientUsage(clientId, env);
            
        case 'account-health':
            return handleClientHealth(clientId, env);
            
        case 'recent-requests':
            return handleClientRequests(clientId, env);
            
        case 'communications':
            return handleClientCommunications(clientId, env);
            
        default:
            // Forward to KAM worker with client context
            try {
                const kamResponse = await env.KEY_ACCOUNT_MANAGER.fetch(
                    new Request(`https://kam.internal/client/${path}`, {
                        method,
                        headers: {
                            'Authorization': `Bearer ${env.WORKER_SHARED_SECRET}`,
                            'X-Worker-ID': 'pages-kam-proxy',
                            'X-Client-ID': clientId,
                            'Content-Type': 'application/json'
                        }
                    })
                );
                
                return new Response(await kamResponse.text(), {
                    status: kamResponse.status,
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (error) {
                return new Response(JSON.stringify({ 
                    success: false, 
                    error: 'KAM service unavailable' 
                }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
    }
}

async function handlePublicRequest(path, method, env) {
    // Health check and capabilities - mock for now
    if (path === 'health') {
        return new Response(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                kam_worker: 'connected',
                database: 'connected',
                session_store: 'connected'
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    if (path === 'capabilities') {
        return new Response(JSON.stringify({
            version: '1.0.0',
            features: ['client_management', 'request_tracking', 'analytics', 'communications'],
            endpoints: {
                admin: ['system-status', 'client-overview', 'user-management'],
                client: ['usage-overview', 'account-health', 'recent-requests', 'communications']
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Mock data handlers (replace with actual KAM worker calls)
async function handleSystemStatus(env) {
    // Mock system status
    return new Response(JSON.stringify({
        workers: [
            { name: 'Orchestrator', status: 'online', response_time: 120 },
            { name: 'Topic Researcher', status: 'online', response_time: 95 },
            { name: 'Content Classifier', status: 'online', response_time: 200 },
            { name: 'KAM Worker', status: 'online', response_time: 85 }
        ],
        database: { status: 'connected', connections: 12 },
        performance: { avg_response_time: 125, success_rate: 0.94 }
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

async function handleClientOverview(env) {
    // Mock client overview
    return new Response(JSON.stringify({
        total_clients: 12,
        active_clients: 8,
        revenue_mtd: 2450.00,
        avg_satisfaction: 4.2,
        growth: {
            new_clients_this_month: 2,
            revenue_growth: 15.2,
            satisfaction_trend: 'stable'
        }
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

async function handleUserManagement(method, env) {
    if (method === 'GET') {
        // Mock user list
        return new Response(JSON.stringify({
            users: [
                { id: 'admin_001', email: 'admin@company.com', role: 'admin', status: 'active', last_login: '2025-07-28T10:30:00Z' },
                { id: 'user_001', email: 'user@company.com', role: 'user', status: 'active', last_login: '2025-07-27T14:22:00Z' },
                { id: 'client_001', email: 'ceo@acme-corp.com', role: 'client', status: 'active', last_login: '2025-07-28T08:15:00Z' }
            ]
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    return new Response(JSON.stringify({ 
        success: false, 
        error: 'Method not allowed' 
    }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
    });
}

async function handleClientUsage(clientId, env) {
    // Mock client usage data
    return new Response(JSON.stringify({
        budget_used: 275.50,
        budget_total: 500.00,
        requests_this_month: 12,
        avg_cost_per_request: 22.96,
        usage_trend: 'increasing',
        cost_breakdown: {
            competitive_analysis: 145.50,
            market_research: 89.00,
            regulatory_tracking: 41.00
        }
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

async function handleClientHealth(clientId, env) {
    // Mock client health data
    return new Response(JSON.stringify({
        satisfaction_score: 4.2,
        response_time_avg: 45,
        success_rate: 94,
        account_manager: 'Sarah Johnson',
        health_score: 0.87,
        metrics: {
            engagement_score: 0.92,
            retention_probability: 0.96,
            upsell_potential: 0.65
        }
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

async function handleClientRequests(clientId, env) {
    // Mock client requests
    return new Response(JSON.stringify({
        requests: [
            {
                id: 'req_001',
                type: 'Competitive Analysis',
                topic: 'AI Market Trends',
                status: 'in_progress',
                created_at: '2025-07-28T08:30:00Z',
                cost: 25.00,
                progress: 75
            },
            {
                id: 'req_002',
                type: 'Market Research',
                topic: 'B2B SaaS Funding',
                status: 'completed',
                created_at: '2025-07-27T14:22:00Z',
                cost: 18.50,
                completed_at: '2025-07-28T09:15:00Z'
            }
        ]
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

async function handleClientCommunications(clientId, env) {
    // Mock communications
    return new Response(JSON.stringify({
        communications: [
            {
                id: 'comm_001',
                type: 'email',
                subject: 'Your AI Market Analysis is Ready',
                preview: 'Hi! Your competitive analysis on AI market trends has been completed...',
                timestamp: '2025-07-28T10:30:00Z',
                unread: false
            },
            {
                id: 'comm_002',
                type: 'system',
                subject: 'Budget Alert: 50% Used',
                preview: 'You have used 50% of your monthly budget...',
                timestamp: '2025-07-27T16:45:00Z',
                unread: true
            }
        ]
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}