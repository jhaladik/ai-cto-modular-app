// functions/api/auth/validate.js
export async function onRequestGet(context) {
    const { request, env } = context;
    
    try {
      const sessionToken = request.headers.get('x-bitware-session-token');
      
      if (!sessionToken) {
        return new Response(JSON.stringify({ 
          valid: false, 
          error: 'No session token' 
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const sessionData = await env.BITWARE_SESSION_STORE.get(`session:${sessionToken}`);
      
      if (!sessionData) {
        return new Response(JSON.stringify({ 
          valid: false, 
          error: 'Invalid session' 
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const session = JSON.parse(sessionData);
      
      // Check if session is expired
      if (Date.now() > session.expires) {
        await env.BITWARE_SESSION_STORE.delete(`session:${sessionToken}`);
        return new Response(JSON.stringify({ 
          valid: false, 
          error: 'Session expired' 
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({
        valid: true,
        username: session.username,
        role: session.role
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: 'Validation failed' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  