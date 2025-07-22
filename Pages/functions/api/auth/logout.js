// functions/api/auth/logout.js
export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
      const sessionToken = request.headers.get('x-bitware-session-token');
      
      if (sessionToken) {
        // Remove session from KV
        await env.BITWARE_SESSION_STORE.delete(`session:${sessionToken}`);
      }
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Logout failed' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }