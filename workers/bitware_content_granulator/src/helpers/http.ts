export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization, X-Worker-ID, x-bitware-session-token',
  'Access-Control-Max-Age': '86400'
};

export function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message, status }, status);
}

export function notFound(): Response {
  return errorResponse('Not found', 404);
}

export function methodNotAllowed(): Response {
  return errorResponse('Method not allowed', 405);
}

export function unauthorized(): Response {
  return errorResponse('Unauthorized', 401);
}

export function serverError(message = 'Internal server error'): Response {
  return errorResponse(message, 500);
}

export async function parseJsonBody<T>(request: Request): Promise<T> {
  try {
    const body = await request.text();
    if (!body) {
      throw new Error('Empty request body');
    }
    return JSON.parse(body) as T;
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}