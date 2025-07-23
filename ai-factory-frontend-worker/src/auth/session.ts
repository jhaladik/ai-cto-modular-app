// AI Factory Frontend Worker - Authentication & Session Management
// @WORKER: FrontendWorker
// 🧱 Type: AuthModule
// 📍 Path: src/auth/session.ts
// 🎯 Role: Handle login, logout, and session validation
// 💾 Storage: { kv: "session_store" }

interface Env {
    SESSION_STORE: KVNamespace;
    ADMIN_PASSWORD: string;
    USER_PASSWORD: string;
    SESSION_TIMEOUT_HOURS: string;
    ENABLE_DEBUG_LOGGING: string;
  }
  
  interface SessionData {
    username: string;
    role: 'admin' | 'user';
    created_at: string;
    expires_at: string;
    last_accessed: string;
  }
  
  // ==================== CORS HEADERS ====================
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-session-token, x-bitware-session-token',
    'Access-Control-Max-Age': '86400',
  };
  
  // ==================== AUTHENTICATION HANDLER ====================
  export async function handleAuth(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    try {
      switch (true) {
        case path === '/api/auth/login':
          return handleLogin(request, env);
          
        case path === '/api/auth/logout':
          return handleLogout(request, env);
          
        case path === '/api/auth/validate':
          return handleValidateSession(request, env);
          
        case path === '/api/auth/status':
          return handleAuthStatus(request, env);
          
        default:
          return new Response(JSON.stringify({ 
            error: 'Not Found', 
            message: 'Authentication endpoint not found' 
          }), { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
      }
    } catch (error) {
      console.error('Authentication error:', error);
      return new Response(JSON.stringify({ 
        error: 'Authentication Error', 
        message: error.message 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
  
  // ==================== LOGIN HANDLER ====================
  async function handleLogin(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ 
        error: 'Method Not Allowed', 
        message: 'Only POST method allowed for login' 
      }), { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    try {
      const { username, password } = await request.json();
      
      if (!username || !password) {
        return new Response(JSON.stringify({ 
          error: 'Bad Request', 
          message: 'Username and password required' 
        }), { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Validate credentials
      let isValid = false;
      let role: 'admin' | 'user' = 'user';
      
      if (username === 'admin' && password === env.ADMIN_PASSWORD) {
        isValid = true;
        role = 'admin';
      } else if (username === 'user' && password === env.USER_PASSWORD) {
        isValid = true;
        role = 'user';
      }
      
      if (!isValid) {
        // Log failed login attempt
        if (env.ENABLE_DEBUG_LOGGING === 'true') {
          console.log(`🚫 Failed login attempt for username: ${username}`);
        }
        
        return new Response(JSON.stringify({ 
          error: 'Unauthorized', 
          message: 'Invalid username or password' 
        }), { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Generate session token
      const sessionToken = generateSessionToken();
      const timeoutHours = parseInt(env.SESSION_TIMEOUT_HOURS) || 24;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (timeoutHours * 60 * 60 * 1000));
      
      // Create session data
      const sessionData: SessionData = {
        username,
        role,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        last_accessed: now.toISOString()
      };
      
      // Store session in KV
      await env.SESSION_STORE.put(
        `session:${sessionToken}`, 
        JSON.stringify(sessionData),
        { expirationTtl: timeoutHours * 3600 }
      );
      
      // Log successful login
      if (env.ENABLE_DEBUG_LOGGING === 'true') {
        console.log(`✅ Successful login for ${username} (${role}) - Session: ${sessionToken.substring(0, 8)}...`);
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Login successful',
        session_token: sessionToken,
        user: {
          username,
          role
        },
        expires_at: expiresAt.toISOString()
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error('Login error:', error);
      return new Response(JSON.stringify({ 
        error: 'Login Error', 
        message: 'Invalid JSON in request body' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
  
  // ==================== LOGOUT HANDLER ====================
  async function handleLogout(request: Request, env: Env): Promise<Response> {
    const sessionToken = request.headers.get('x-session-token') || 
                        request.headers.get('x-bitware-session-token');
    
    if (sessionToken) {
      // Remove session from KV
      await env.SESSION_STORE.delete(`session:${sessionToken}`);
      
      if (env.ENABLE_DEBUG_LOGGING === 'true') {
        console.log(`🚪 Logout - Session terminated: ${sessionToken.substring(0, 8)}...`);
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Logout successful'
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // ==================== SESSION VALIDATION ====================
  export async function isValidSession(sessionToken: string | null, sessionStore: KVNamespace): Promise<boolean> {
    if (!sessionToken) return false;
    
    try {
      const sessionData = await sessionStore.get(`session:${sessionToken}`);
      if (!sessionData) return false;
      
      const session: SessionData = JSON.parse(sessionData);
      const now = new Date();
      const expiresAt = new Date(session.expires_at);
      
      if (now > expiresAt) {
        // Session expired, clean up
        await sessionStore.delete(`session:${sessionToken}`);
        return false;
      }
      
      // Update last accessed time
      session.last_accessed = now.toISOString();
      await sessionStore.put(
        `session:${sessionToken}`, 
        JSON.stringify(session),
        { expirationTtl: Math.floor((expiresAt.getTime() - now.getTime()) / 1000) }
      );
      
      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }
  
  // ==================== VALIDATE SESSION ENDPOINT ====================
  async function handleValidateSession(request: Request, env: Env): Promise<Response> {
    const sessionToken = request.headers.get('x-session-token') || 
                        request.headers.get('x-bitware-session-token');
    
    if (!sessionToken) {
      return new Response(JSON.stringify({ 
        valid: false, 
        message: 'No session token provided' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const isValid = await isValidSession(sessionToken, env.SESSION_STORE);
    
    if (isValid) {
      // Get session data for response
      const sessionData = await env.SESSION_STORE.get(`session:${sessionToken}`);
      const session: SessionData = JSON.parse(sessionData!);
      
      return new Response(JSON.stringify({
        valid: true,
        user: {
          username: session.username,
          role: session.role
        },
        expires_at: session.expires_at
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ 
        valid: false, 
        message: 'Invalid or expired session token' 
      }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
  
  // ==================== AUTH STATUS ENDPOINT ====================
  async function handleAuthStatus(request: Request, env: Env): Promise<Response> {
    return new Response(JSON.stringify({
      auth_enabled: true,
      session_timeout_hours: parseInt(env.SESSION_TIMEOUT_HOURS) || 24,
      supported_roles: ['admin', 'user'],
      endpoints: {
        login: '/api/auth/login',
        logout: '/api/auth/logout',
        validate: '/api/auth/validate'
      }
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // ==================== UTILITY FUNCTIONS ====================
  function generateSessionToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }