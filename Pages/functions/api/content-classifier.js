// functions/api/content-classifier.js
// @WORKER: WorkerProxy
// 🎯 Role: Secure proxy to bitware_content_classifier worker

import { validateSession } from '../_shared/auth-helper.js';

export async function onRequest(context) {
  const { request, env } = context;
  
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
    const body = request.method !== 'GET' ? await request.text() : null;
    const url = new URL(request.url);
    const endpoint = url.searchParams.get('endpoint') || '';
    
    const backendUrl = `${env.CONTENT_CLASSIFIER_URL}${endpoint}`;
    
    const response = await fetch(backendUrl, {
      method: request.method,
      headers: {
        'X-API-Key': env.CLIENT_API_KEY,
        'X-Worker-ID': 'ai_factory_frontend',
        'Content-Type': 'application/json'
      },
      body: body
    });
    
    const data = await response.text();
    return new Response(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Content classifier proxy error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Proxy request failed' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}