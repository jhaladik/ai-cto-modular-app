// Shared HTTP utilities for Pages functions
// functions/_shared/http-utils.js

export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token, x-bitware-session-token, Authorization, X-API-Key, X-Worker-ID'
};

export function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
        }
    });
}

export function errorResponse(message, status = 400) {
    return jsonResponse({
        success: false,
        error: message
    }, status);
}

export function unauthorizedResponse(message = 'Authentication required') {
    return errorResponse(message, 401);
}

export function notFoundResponse(message = 'Not found') {
    return errorResponse(message, 404);
}

export function serverErrorResponse(message = 'Internal server error') {
    return errorResponse(message, 500);
}

export async function handleCors() {
    return new Response(null, { headers: corsHeaders });
}