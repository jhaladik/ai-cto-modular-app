export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Worker-ID, X-API-Key, x-bitware-session-token'
};

export function jsonResponse(data: any, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    headers: { 
      'Content-Type': 'application/json',
      ...corsHeaders 
    },
    ...init
  });
}

export function success(data: any, message?: string): Response {
  return jsonResponse({
    success: true,
    message: message || 'Operation successful',
    ...data
  });
}

export function unauthorized(message: string = 'Unauthorized'): Response {
  return jsonResponse(
    { success: false, error: message },
    { status: 401 }
  );
}

export function forbidden(message: string = 'Forbidden'): Response {
  return jsonResponse(
    { success: false, error: message },
    { status: 403 }
  );
}

export function notFound(message: string = 'Not found'): Response {
  return jsonResponse(
    { success: false, error: message },
    { status: 404 }
  );
}

export function badRequest(message: string = 'Bad request'): Response {
  return jsonResponse(
    { success: false, error: message },
    { status: 400 }
  );
}

export function serverError(message: string = 'Internal server error', error?: any): Response {
  console.error('Server error:', message, error);
  return jsonResponse(
    { 
      success: false, 
      error: message,
      details: error instanceof Error ? error.message : undefined
    },
    { status: 500 }
  );
}

export function methodNotAllowed(message: string = 'Method not allowed'): Response {
  return jsonResponse(
    { success: false, error: message },
    { status: 405 }
  );
}

export function conflict(message: string = 'Conflict'): Response {
  return jsonResponse(
    { success: false, error: message },
    { status: 409 }
  );
}

export function tooManyRequests(message: string = 'Too many requests'): Response {
  return jsonResponse(
    { success: false, error: message },
    { status: 429 }
  );
}

export function serviceUnavailable(message: string = 'Service unavailable'): Response {
  return jsonResponse(
    { success: false, error: message },
    { status: 503 }
  );
}