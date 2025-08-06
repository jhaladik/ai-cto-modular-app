import { Env, AuthenticatedRequest } from '../types';

export interface AuthContext {
  type: 'worker' | 'api' | 'session';
  workerId?: string;
  clientId?: string;
  userId?: string;
  permissions?: string[];
}

export async function authenticateRequest(
  request: Request, 
  env: Env
): Promise<AuthenticatedRequest> {
  const authRequest = request as AuthenticatedRequest;
  
  const authHeader = request.headers.get('Authorization');
  const workerId = request.headers.get('X-Worker-ID');
  const apiKey = request.headers.get('X-API-Key');
  const sessionToken = request.headers.get('x-bitware-session-token');
  
  if (workerId && authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (validateWorkerAuth(token, workerId, env)) {
      authRequest.auth = {
        type: 'worker',
        workerId,
        permissions: ['all']
      };
      return authRequest;
    }
  }
  
  if (apiKey) {
    const clientAuth = await validateApiKey(apiKey, env);
    if (clientAuth) {
      authRequest.auth = {
        type: 'api',
        clientId: clientAuth.clientId,
        permissions: clientAuth.permissions
      };
      return authRequest;
    }
  }
  
  if (sessionToken) {
    const sessionAuth = await validateSessionToken(sessionToken, env);
    if (sessionAuth) {
      authRequest.auth = {
        type: 'session',
        userId: sessionAuth.userId,
        clientId: sessionAuth.clientId,
        permissions: sessionAuth.permissions
      };
      return authRequest;
    }
  }
  
  authRequest.auth = undefined;
  return authRequest;
}

export function validateWorkerAuth(
  token: string, 
  workerId: string, 
  env: Env
): boolean {
  const validWorkers = [
    'bitware_key_account_manager',
    'bitware-key-account-manager',  // Both formats supported
    'bitware_topic_researcher',
    'bitware_rss_source_finder', 
    'bitware_feed_fetcher',
    'bitware_content_classifier',
    'bitware_report_builder',
    'bitware_universal_researcher',
    'bitware_ai_factory_optimizer',
    'bitware_pages_proxy',
    'bitware-content-granulator',  // Add new worker
    'bitware_content_granulator'   // Both formats
  ];
  
  // Check if worker ID is valid
  if (!validWorkers.includes(workerId)) {
    return false;
  }
  
  // Validate the token matches expected secret
  const expectedSecret = env.WORKER_SECRET || 'internal-worker-auth-token-2024';
  return token === expectedSecret;
}

export async function validateApiKey(
  apiKey: string, 
  env: Env
): Promise<{ clientId: string; permissions: string[] } | null> {
  try {
    const response = await env.KAM.fetch(
      new Request('https://kam.internal/auth/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey })
      })
    );
    
    if (response.ok) {
      const data = await response.json() as any;
      return {
        clientId: data.client_id,
        permissions: data.permissions || ['read', 'execute']
      };
    }
  } catch (error) {
    console.error('API key validation error:', error);
  }
  
  return null;
}

export async function validateSessionToken(
  sessionToken: string,
  env: Env
): Promise<{ userId: string; clientId?: string; permissions: string[] } | null> {
  try {
    const response = await env.KAM.fetch(
      new Request('https://kam.internal/auth/validate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-bitware-session-token': sessionToken
        }
      })
    );
    
    if (response.ok) {
      const data = await response.json() as any;
      return {
        userId: data.user?.id,
        clientId: data.kamContext?.client_id,
        permissions: data.user?.is_admin ? ['all'] : ['read', 'execute']
      };
    }
  } catch (error) {
    console.error('Session validation error:', error);
  }
  
  return null;
}

export function requireAuth(auth?: AuthContext): boolean {
  return auth !== undefined;
}

export function requireWorkerAuth(auth?: AuthContext): boolean {
  return auth?.type === 'worker';
}

export function requireAdminAuth(auth?: AuthContext): boolean {
  return auth?.permissions?.includes('all') || auth?.permissions?.includes('admin') || false;
}

export function requireClientAuth(auth?: AuthContext, clientId?: string): boolean {
  if (!auth) return false;
  if (auth.permissions?.includes('all')) return true;
  if (clientId && auth.clientId !== clientId) return false;
  return true;
}