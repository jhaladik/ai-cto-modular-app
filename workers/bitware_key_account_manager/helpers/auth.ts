/**
 * Shared authentication helpers for KAM worker
 * Consolidates repeated authentication logic
 */

interface AuthOptions {
  requireAdmin?: boolean;
  allowWorker?: boolean;
  allowSession?: boolean;
  allowClient?: boolean;
}

interface AuthResult {
  authenticated: boolean;
  authType: 'worker' | 'session' | 'client' | null;
  session?: any;
  error?: string;
}

export function authenticateRequest(
  request: Request, 
  env: any, 
  db: any,
  options: AuthOptions = {}
): Promise<AuthResult> {
  // Default options
  const opts = {
    requireAdmin: false,
    allowWorker: true,
    allowSession: true,
    allowClient: false,
    ...options
  };

  return authenticateRequestAsync(request, env, db, opts);
}

async function authenticateRequestAsync(
  request: Request, 
  env: any, 
  db: any,
  options: AuthOptions
): Promise<AuthResult> {
  // Try worker authentication first (highest priority)
  if (options.allowWorker) {
    const workerAuth = validateWorkerAuth(request, env);
    if (workerAuth.valid) {
      console.log('✅ Using worker auth');
      return {
        authenticated: true,
        authType: 'worker'
      };
    }
  }

  // Try session authentication
  if (options.allowSession) {
    const sessionAuth = validateSessionToken(request);
    if (sessionAuth.valid && sessionAuth.sessionToken) {
      // Verify session in database
      const session = await db.getSession(sessionAuth.sessionToken);
      if (session && new Date(session.expires_at) > new Date()) {
        // Check admin requirement
        if (options.requireAdmin) {
          const user = await db.getUserById(session.user_id);
          if (!user || user.role !== 'admin') {
            return {
              authenticated: false,
              authType: null,
              error: 'Admin access required'
            };
          }
        }
        
        console.log('✅ Using session auth');
        return {
          authenticated: true,
          authType: 'session',
          session
        };
      } else {
        return {
          authenticated: false,
          authType: null,
          error: 'Session expired or invalid'
        };
      }
    }
  }

  // Try client authentication
  if (options.allowClient) {
    const clientAuth = validateClientAuth(request, env);
    if (clientAuth.valid) {
      console.log('✅ Using client auth');
      return {
        authenticated: true,
        authType: 'client'
      };
    }
  }

  // No valid authentication found
  return {
    authenticated: false,
    authType: null,
    error: 'Authentication required'
  };
}

export function validateClientAuth(request: Request, env: any): { valid: boolean; error?: string } {
  const apiKey = request.headers.get('X-API-Key');
  if (!apiKey) {
    return { valid: false, error: 'X-API-Key header required' };
  }
  if (apiKey !== env.CLIENT_API_KEY) {
    return { valid: false, error: 'Invalid API key' };
  }
  return { valid: true };
}

export function validateWorkerAuth(request: Request, env: any): { valid: boolean; error?: string } {
  const authHeader = request.headers.get('Authorization');
  const workerID = request.headers.get('X-Worker-ID');
  
  console.log('🔐 KAM validateWorkerAuth called');
  console.log('📋 Headers:', {
    hasAuth: !!authHeader,
    authPrefix: authHeader ? authHeader.substring(0, 20) + '...' : 'none',
    workerID: workerID || 'none'
  });
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ Missing or invalid Bearer token');
    return { valid: false, error: 'Bearer token required' };
  }
  
  const token = authHeader.substring(7);
  if (token !== env.WORKER_SHARED_SECRET) {
    console.log('❌ Token mismatch');
    console.log('Expected:', env.WORKER_SHARED_SECRET ? env.WORKER_SHARED_SECRET.substring(0, 10) + '...' : 'NOT SET');
    console.log('Received:', token.substring(0, 10) + '...');
    return { valid: false, error: 'Invalid worker token' };
  }
  
  if (!workerID) {
    console.log('❌ Missing X-Worker-ID');
    return { valid: false, error: 'X-Worker-ID header required' };
  }
  
  console.log('✅ Worker auth valid for:', workerID);
  return { valid: true };
}

export function validateSessionToken(request: Request): { valid: boolean; sessionToken?: string; error?: string } {
  const sessionToken = request.headers.get('X-Session-Token') || request.headers.get('x-bitware-session-token');
  if (!sessionToken) {
    return { valid: false, error: 'Session token header required (X-Session-Token or x-bitware-session-token)' };
  }
  return { valid: true, sessionToken };
}