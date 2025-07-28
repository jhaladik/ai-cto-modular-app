// functions/api/auth/login.js
// @WORKER: AuthenticationProxy + KAM Integration
// 🧱 Type: PagesFunction  
// 📍 Path: functions/api/auth/login.js
// 🎯 Role: Enhanced session management for AI Factory + KAM frontend
// 💾 Storage: { kv: "BITWARE_SESSION_STORE", d1: "KAM via service binding" }

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const { username, password, loginType = 'admin' } = await request.json();
    
    let sessionData = null;
    let clientData = null;
    
    // Handle different login types
    switch (loginType) {
      case 'admin':
      case 'user':
        // Admin/User authentication via unified KAM database
        try {
          const kamResponse = await env.KEY_ACCOUNT_MANAGER.fetch(
            new Request('https://kam.internal/auth/validate-user', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.WORKER_SHARED_SECRET}`,
                'X-Worker-ID': 'pages-auth-proxy'
              },
              body: JSON.stringify({
                email: username, // For all users, username is email
                password: password,
                expected_role: loginType // 'admin' or 'user'
              })
            })
          );
          
          if (!kamResponse.ok) {
            const error = await kamResponse.json();
            return new Response(JSON.stringify({ 
              success: false, 
              error: error.error || 'Authentication failed' 
            }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          const userData = await kamResponse.json();
          
          sessionData = {
            username: userData.user.email,
            role: userData.user.role,
            userType: 'internal',
            userId: userData.user.user_id,
            fullName: userData.user.full_name,
            department: userData.user.department || 'General', // ✅ FIXED: Direct access + fallback
            created: Date.now(),
            expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
          };
        } catch (error) {
          console.error('Authentication service error:', error);
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Authentication service unavailable' 
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        break;
        
      case 'client':
        // All user authentication via unified KAM database
        try {
          const kamResponse = await env.KEY_ACCOUNT_MANAGER.fetch(
            new Request('https://kam.internal/auth/validate-user', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.WORKER_SHARED_SECRET}`,
                'X-Worker-ID': 'pages-auth-proxy'
              },
              body: JSON.stringify({
                email: username, // For all users, username is email
                password: password,
                expected_role: 'client'
              })
            })
          );
          
          if (!kamResponse.ok) {
            const error = await kamResponse.json();
            return new Response(JSON.stringify({ 
              success: false, 
              error: error.error || 'Authentication failed' 
            }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          const userData = await kamResponse.json();
          
          sessionData = {
            username: userData.user.email,
            role: userData.user.role,
            userType: 'client',
            userId: userData.user.user_id,
            clientId: userData.client_profile?.client_id,
            companyName: userData.client_profile?.company_name,
            subscriptionTier: userData.client_profile?.subscription_tier,
            fullName: userData.user.full_name,
            created: Date.now(),
            expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
          };
        } catch (error) {
          console.error('Authentication service error:', error);
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Authentication service unavailable' 
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        break;
        
      default:
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid login type' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
    
    // Generate session token
    const sessionToken = crypto.randomUUID();
    
    // Store session in KV
    await env.BITWARE_SESSION_STORE.put(
      `session:${sessionToken}`, 
      JSON.stringify(sessionData), 
      {
        expirationTtl: 24 * 60 * 60 // 24 hours in seconds
      }
    );
    
    // For all sessions, register with KAM for unified session management
    try {
      await env.KEY_ACCOUNT_MANAGER.fetch(
        new Request('https://kam.internal/session/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.WORKER_SHARED_SECRET}`,
            'X-Worker-ID': 'pages-auth-proxy'
          },
          body: JSON.stringify({
            sessionToken,
            userId: sessionData.userId,
            clientId: sessionData.clientId || null,
            loginMethod: 'dashboard',
            expiresAt: new Date(sessionData.expires).toISOString()
          })
        })
      );
    } catch (error) {
      console.error('Session registration failed:', error);
      // Continue anyway - session is valid in KV
    }
    
    return new Response(JSON.stringify({
      success: true,
      sessionToken,
      user: {
        username: sessionData.username,
        role: sessionData.role,
        userType: sessionData.userType,
        userId: sessionData.userId,
        fullName: sessionData.fullName,
        ...(sessionData.role === 'client' ? {
          clientId: sessionData.clientId,
          companyName: sessionData.companyName,
          subscriptionTier: sessionData.subscriptionTier
        } : {}),
        ...(sessionData.userType === 'internal' ? {
          department: sessionData.department
        } : {})
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Invalid request' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}