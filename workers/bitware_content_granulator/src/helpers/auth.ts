import { Env, AuthenticatedRequest } from '../types';

export async function authenticateRequest(request: Request, env: Env): Promise<AuthenticatedRequest> {
  const apiKey = request.headers.get('X-API-Key');
  const authHeader = request.headers.get('Authorization');
  const sessionToken = request.headers.get('x-bitware-session-token');
  const workerId = request.headers.get('X-Worker-ID');

  const authenticatedRequest = request as AuthenticatedRequest;

  // Worker-to-worker authentication
  if (authHeader && workerId) {
    const token = authHeader.replace('Bearer ', '');
    if (token === env.SHARED_SECRET) {
      authenticatedRequest.auth = {
        type: 'worker',
        workerId
      };
      return authenticatedRequest;
    }
    throw new Error('Invalid worker authentication');
  }

  // Session-based authentication (from dashboard)
  if (sessionToken) {
    // Validate session with KAM
    const validateResponse = await env.KEY_ACCOUNT_MANAGER.fetch(
      new Request('https://worker/auth/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.SHARED_SECRET}`,
          'X-Worker-ID': 'bitware-content-granulator'
        },
        body: JSON.stringify({ sessionToken })
      })
    );

    if (!validateResponse.ok) {
      throw new Error('Invalid session');
    }

    const sessionData = await validateResponse.json() as any;
    authenticatedRequest.auth = {
      type: 'session',
      userId: sessionData.userId,
      clientId: sessionData.clientId
    };
    return authenticatedRequest;
  }

  // Client API key authentication
  if (apiKey) {
    // Validate API key with KAM
    const validateResponse = await env.KEY_ACCOUNT_MANAGER.fetch(
      new Request('https://worker/auth/validate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.SHARED_SECRET}`,
          'X-Worker-ID': 'bitware-content-granulator'
        },
        body: JSON.stringify({ apiKey })
      })
    );

    if (!validateResponse.ok) {
      throw new Error('Invalid API key');
    }

    const keyData = await validateResponse.json() as any;
    authenticatedRequest.auth = {
      type: 'client',
      clientId: keyData.clientId,
      apiKey
    };
    return authenticatedRequest;
  }

  throw new Error('No valid authentication provided');
}

export function isPublicEndpoint(path: string): boolean {
  const publicPaths = ['/', '/health', '/help'];
  return publicPaths.includes(path);
}