// functions/api/orchestrator.js
// @WORKER: WorkerProxy
// 🧱 Type: PagesFunction
// 📍 Path: functions/api/orchestrator.js  
// 🎯 Role: Secure proxy to bitware_orchestrator worker
// 💾 Storage: { kv: "BITWARE_SESSION_STORE" }

import { validateSession } from '../_shared/auth-helper.js';

export async function onRequest(context) {
  const { request, env } = context;
  
  // Validate session
  const authResult = await validateSession(request, env);
  if (!authResult.valid) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: authResult.error 
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Prepare request to backend worker
    const body = request.method !== 'GET' ? await request.text() : null;
    const url = new URL(request.url);
    const endpoint = url.searchParams.get('endpoint') || '';
    
    // Build backend URL
    const backendUrl = `${env.ORCHESTRATOR_URL}${endpoint}`;
    
    // Proxy request to backend worker
    const response = await fetch(backendUrl, {
      method: request.method,
      headers: {
        'X-API-Key': env.CLIENT_API_KEY,
        'X-Worker-ID': 'ai_factory_frontend',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.WORKER_SHARED_SECRET}`
      },
      body: body
    });
    
    // Return response from backend
    const data = await response.text();
    return new Response(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Orchestrator proxy error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Proxy request failed' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}