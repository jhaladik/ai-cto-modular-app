// functions/api/auth/validate.js
import { jsonResponse, unauthorizedResponse, serverErrorResponse } from '../../_shared/http-utils.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    // Get session token (handle both header formats)
    const sessionToken = request.headers.get('x-bitware-session-token') || 
                         request.headers.get('X-Session-Token');
    
    if (!sessionToken) {
      return unauthorizedResponse('No session token provided');
    }

    // Validate session in KV
    const sessionKey = `session:${sessionToken}`;
    const sessionData = await env.BITWARE_SESSION_STORE.get(sessionKey);
    
    if (!sessionData) {
      return unauthorizedResponse('Invalid or expired session');
    }

    const session = JSON.parse(sessionData);
    
    // Check expiration
    if (Date.now() > session.expires) {
      await env.BITWARE_SESSION_STORE.delete(sessionKey);
      return unauthorizedResponse('Session expired');
    }

    // Return valid session with user data
    return jsonResponse({
      valid: true,
      user: {
        email: session.username,
        role: session.role,
        full_name: session.fullName || session.username, // Fix the missing full_name
        userId: session.userId,
        userType: session.userType
      }
    });
    
  } catch (error) {
    console.error('Session validation error:', error);
    return serverErrorResponse('Validation failed');
  }
}

// Also handle GET requests
export async function onRequestGet(context) {
  return onRequestPost(context);
}