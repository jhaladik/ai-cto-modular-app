import { StandardResponse } from '../types';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Worker-ID, x-bitware-session-token',
  'Access-Control-Max-Age': '86400',
};

export function jsonResponse<T = any>(
  data: T,
  status: number = 200,
  additionalHeaders: Record<string, string> = {}
): Response {
  const response: StandardResponse<T> = {
    success: status >= 200 && status < 300,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
    },
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...additionalHeaders,
    },
  });
}

export function errorResponse(
  error: string,
  status: number = 500,
  details?: any
): Response {
  const response: StandardResponse = {
    success: false,
    error,
    metadata: {
      timestamp: new Date().toISOString(),
      ...(details && { details }),
    },
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

export function notFound(message: string = 'Not found'): Response {
  return errorResponse(message, 404);
}

export function unauthorized(message: string = 'Unauthorized'): Response {
  return errorResponse(message, 401);
}

export function badRequest(message: string = 'Bad request', details?: any): Response {
  return errorResponse(message, 400, details);
}

export function serverError(message: string = 'Internal server error', details?: any): Response {
  return errorResponse(message, 500, details);
}

export async function parseRequestBody<T = any>(request: Request): Promise<T> {
  try {
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Content-Type must be application/json');
    }
    return await request.json();
  } catch (error) {
    throw new Error(`Failed to parse request body: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function getQueryParam(url: URL, param: string, defaultValue?: string): string | undefined {
  return url.searchParams.get(param) || defaultValue;
}

export function getNumericQueryParam(url: URL, param: string, defaultValue?: number): number | undefined {
  const value = url.searchParams.get(param);
  if (value === null) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}