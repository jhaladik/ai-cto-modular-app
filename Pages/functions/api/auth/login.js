// functions/api/auth/login.js
// @WORKER: AuthenticationProxy
// 🧱 Type: PagesFunction  
// 📍 Path: functions/api/auth/login.js
// 🎯 Role: Simple session management for AI Factory frontend
// 💾 Storage: { kv: "BITWARE_SESSION_STORE" }

export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
      const { username, password } = await request.json();
      
      // Simple credential validation (in production, use proper auth)
      const validCredentials = {
        'admin': env.ADMIN_PASSWORD || 'admin123',
        'user': env.USER_PASSWORD || 'user123'
      };
      
      if (!validCredentials[username] || validCredentials[username] !== password) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid credentials' 
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Generate simple session token
      const sessionToken = crypto.randomUUID();
      const sessionData = {
        username,
        role: username === 'admin' ? 'admin' : 'user',
        created: Date.now(),
        expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };
      
      // Store session in KV
      await env.BITWARE_SESSION_STORE.put(`session:${sessionToken}`, JSON.stringify(sessionData), {
        expirationTtl: 24 * 60 * 60 // 24 hours in seconds
      });
      
      return new Response(JSON.stringify({
        success: true,
        sessionToken,
        username,
        role: sessionData.role
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid request' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }