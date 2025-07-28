// functions/api/auth/validate.js
export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    // Get session token (handle both header formats)
    const sessionToken = request.headers.get('x-bitware-session-token') || 
                         request.headers.get('X-Session-Token');
    
    if (!sessionToken) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: 'No session token provided' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate session in KV
    const sessionKey = `session:${sessionToken}`;
    const sessionData = await env.BITWARE_SESSION_STORE.get(sessionKey);
    
    if (!sessionData) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: 'Invalid or expired session' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const session = JSON.parse(sessionData);
    
    // Check expiration
    if (Date.now() > session.expires) {
      await env.BITWARE_SESSION_STORE.delete(sessionKey);
      return new Response(JSON.stringify({ 
        valid: false, 
        error: 'Session expired' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return valid session with user data
    return new Response(JSON.stringify({
      valid: true,
      user: {
        email: session.username,
        role: session.role,
        full_name: session.fullName || session.username, // Fix the missing full_name
        userId: session.userId,
        userType: session.userType
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Session validation error:', error);
    return new Response(JSON.stringify({ 
      valid: false, 
      error: 'Validation failed' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Also handle GET requests
export async function onRequestGet(context) {
  return onRequestPost(context);
}