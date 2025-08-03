// functions/api/auth/logout.js
import { jsonResponse, serverErrorResponse } from '../../_shared/http-utils.js';

export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
      const sessionToken = request.headers.get('x-bitware-session-token');
      
      if (sessionToken) {
        // Remove session from KV
        await env.BITWARE_SESSION_STORE.delete(`session:${sessionToken}`);
      }
      
      return jsonResponse({ success: true });
      
    } catch (error) {
      return serverErrorResponse('Logout failed');
    }
  }