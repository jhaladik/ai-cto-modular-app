// Shared helper function for all proxy functions
// functions/_shared/auth-helper.js
export async function validateSession(request, env) {
    const sessionToken = request.headers.get('x-bitware-session-token');
    
    console.log('🔐 validateSession called with token:', sessionToken ? sessionToken.substring(0, 10) + '...' : 'none');
    
    if (!sessionToken) {
      return { valid: false, error: 'No session token' };
    }
    
    try {
      const sessionKey = `session:${sessionToken}`;
      console.log('🔍 Looking for session with key:', sessionKey);
      
      const sessionData = await env.BITWARE_SESSION_STORE.get(sessionKey);
      
      if (!sessionData) {
        console.log('❌ No session data found in KV store');
        return { valid: false, error: 'Invalid session' };
      }
      
      console.log('📋 Found session data:', sessionData.substring(0, 100) + '...');
      const session = JSON.parse(sessionData);
      
      if (Date.now() > session.expires) {
        console.log('⏰ Session expired at:', new Date(session.expires).toISOString());
        await env.BITWARE_SESSION_STORE.delete(sessionKey);
        return { valid: false, error: 'Session expired' };
      }
      
      console.log('✅ Session valid for user:', session.username);
      return { valid: true, session };
      
    } catch (error) {
      console.error('💥 Session validation error:', error);
      return { valid: false, error: 'Session validation failed: ' + error.message };
    }
  }
  