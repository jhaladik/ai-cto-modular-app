// functions/api/kam/[...path].js - DEBUG VERSION
// Minimal version to identify the exact issue

export async function onRequest(context) {
    // CORS headers first
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
        // Debug: Log what we received
        const debug = {
            method: context.request.method,
            url: context.request.url,
            params: context.params,
            hasEnv: !!context.env,
            hasSessionStore: !!context.env?.BITWARE_SESSION_STORE,
            timestamp: new Date().toISOString()
        };
        
        console.log('🔍 KAM Proxy Debug:', JSON.stringify(debug));
        
        // Get path safely
        let path = '';
        if (context.params && context.params.path && Array.isArray(context.params.path)) {
            path = context.params.path.join('/');
        }
        
        console.log('📍 Extracted path:', path);
        
        // Handle health check specifically
        if (path === 'health' || path === '' || !path) {
            console.log('💚 Handling health check');
            
            const healthResponse = {
                status: 'proxy_healthy',
                debug: debug,
                path: path,
                message: 'KAM proxy is responding'
            };
            
            return new Response(JSON.stringify(healthResponse), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        }
        
        // For any other path, try to call the KAM worker
        console.log('🔄 Attempting to call KAM worker for path:', path);
        
        try {
            const kamWorkerUrl = `https://bitware-key-account-manager.jhaladik.workers.dev/${path}`;
            console.log('📞 Calling:', kamWorkerUrl);
            
            const kamResponse = await fetch(kamWorkerUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('📋 KAM worker response status:', kamResponse.status);
            
            const responseText = await kamResponse.text();
            
            return new Response(responseText, {
                status: kamResponse.status,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
            
        } catch (fetchError) {
            console.error('❌ Fetch to KAM worker failed:', fetchError);
            
            return new Response(JSON.stringify({
                success: false,
                error: 'KAM worker fetch failed',
                details: fetchError.message,
                attempted_url: `https://bitware-key-account-manager.jhaladik.workers.dev/${path}`
            }), {
                status: 503,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        }
        
    } catch (error) {
        console.error('❌ KAM Proxy main error:', error);
        
        // Return detailed error for debugging
        return new Response(JSON.stringify({
            success: false,
            error: 'KAM proxy function error',
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    }
}