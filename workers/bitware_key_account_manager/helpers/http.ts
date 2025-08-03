/**
 * Shared HTTP utilities for KAM worker
 * Consolidates repeated response helpers and CORS configuration
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Worker-ID, x-bitware-session-token, X-Session-Token'
};

export function jsonResponse(data: any, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
    ...init
  });
}

export function unauthorized(message: string = 'Unauthorized'): Response {
  return jsonResponse({ success: false, error: message }, { status: 401 });
}

export function notFound(message: string = 'Endpoint not found'): Response {
  return jsonResponse({ success: false, error: message }, { status: 404 });
}

export function badRequest(message: string = 'Bad request'): Response {
  return jsonResponse({ success: false, error: message }, { status: 400 });
}

export function serverError(message: string = 'Internal server error'): Response {
  return jsonResponse({ success: false, error: message }, { status: 500 });
}

export function success(data: any, message?: string): Response {
  return jsonResponse({ 
    success: true, 
    ...(message && { message }),
    ...data 
  });
}