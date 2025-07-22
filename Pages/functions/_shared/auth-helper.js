// Shared helper function for all proxy functions
// functions/_shared/auth-helper.js
export async function validateSession(request, env) {
    const sessionToken = request.headers.get('x-bitware-session-token');
    
    if (!sessionToken) {
      return { valid: false, error: 'No session token' };
    }
    
    try {
      const sessionData = await env.BITWARE_SESSION_STORE.get(`session:${sessionToken}`);
      
      if (!sessionData) {
        return { valid: false, error: 'Invalid session' };
      }
      
      const session = JSON.parse(sessionData);
      
      if (Date.now() > session.expires) {
        await env.BITWARE_SESSION_STORE.delete(`session:${sessionToken}`);
        return { valid: false, error: 'Session expired' };
      }
      
      return { valid: true, session };
      
    } catch (error) {
      return { valid: false, error: 'Session validation failed' };
    }
  }
  