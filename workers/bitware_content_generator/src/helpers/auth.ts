import { Env, AuthenticatedRequest } from '../types';

export async function authenticateRequest(
  request: Request,
  env: Env
): Promise<AuthenticatedRequest> {
  const apiKey = request.headers.get('X-API-Key');
  const authHeader = request.headers.get('Authorization');
  const sessionToken = request.headers.get('x-bitware-session-token');
  const workerId = request.headers.get('X-Worker-ID');

  // Worker-to-worker authentication
  if (authHeader && workerId) {
    const token = authHeader.replace('Bearer ', '');
    if (token === env.SHARED_SECRET || token === 'internal-worker-auth-token-2024') {
      const authRequest = request as AuthenticatedRequest;
      authRequest.auth = {
        type: 'worker',
        workerId,
      };
      return authRequest;
    }
    throw new Error('Invalid worker authentication');
  }

  // Session-based authentication
  if (sessionToken) {
    try {
      const validateResponse = await env.KEY_ACCOUNT_MANAGER.fetch(
        new Request('https://worker/auth/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.SHARED_SECRET || 'internal-worker-auth-token-2024'}`,
            'X-Worker-ID': 'bitware-content-generator',
          },
          body: JSON.stringify({ sessionToken }),
        })
      );

      if (!validateResponse.ok) {
        throw new Error('Invalid session token');
      }

      const validateData = await validateResponse.json();
      const authRequest = request as AuthenticatedRequest;
      authRequest.auth = {
        type: 'session',
        userId: validateData.userId,
        sessionToken,
      };
      return authRequest;
    } catch (error) {
      throw new Error('Session validation failed');
    }
  }

  // API key authentication
  if (apiKey) {
    try {
      const validateResponse = await env.KEY_ACCOUNT_MANAGER.fetch(
        new Request('https://worker/api/validate-key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.SHARED_SECRET || 'internal-worker-auth-token-2024'}`,
            'X-Worker-ID': 'bitware-content-generator',
          },
          body: JSON.stringify({ apiKey }),
        })
      );

      if (!validateResponse.ok) {
        throw new Error('Invalid API key');
      }

      const validateData = await validateResponse.json();
      const authRequest = request as AuthenticatedRequest;
      authRequest.auth = {
        type: 'api_key',
        clientId: validateData.clientId,
      };
      return authRequest;
    } catch (error) {
      throw new Error('API key validation failed');
    }
  }

  throw new Error('No valid authentication credentials provided');
}

export function isPublicEndpoint(path: string): boolean {
  const publicPaths = ['/', '/health', '/help'];
  return publicPaths.includes(path);
}

export function isAdminEndpoint(path: string): boolean {
  return path.startsWith('/api/admin/');
}

export function requireWorkerAuth(request: AuthenticatedRequest): void {
  if (!request.auth || request.auth.type !== 'worker') {
    throw new Error('Worker authentication required');
  }
}

export function requireAuth(request: AuthenticatedRequest): void {
  if (!request.auth) {
    throw new Error('Authentication required');
  }
}