// functions/api/auth/login.js
// @WORKER: AuthenticationProxy + KAM Integration
// 🧱 Type: PagesFunction  
// 📍 Path: functions/api/auth/login.js
// 🎯 Role: Enhanced session management for AI Factory + KAM frontend
// 💾 Storage: { kv: "BITWARE_SESSION_STORE", d1: "KAM via service binding" }

import { jsonResponse, errorResponse, unauthorizedResponse, serverErrorResponse } from '../../_shared/http-utils.js';

export async function onRequestOptions(context) {
  // Handle CORS preflight
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    console.log('Login request received');
    const body = await request.json();
    console.log('Request body:', body);
    const { username, password, loginType = 'admin' } = body;
    
    let sessionData = null;
    let clientData = null;
    
    // Handle different login types
    switch (loginType) {
      case 'admin':
      case 'user':
        // Admin/User authentication via unified KAM database
        try {
          console.log('Checking environment:', {
            hasKAMBinding: !!env.KEY_ACCOUNT_MANAGER,
            hasWorkerSecret: !!env.WORKER_SHARED_SECRET
          });
          
          if (!env.KEY_ACCOUNT_MANAGER) {
            console.error('KEY_ACCOUNT_MANAGER binding not found');
            return errorResponse('Configuration error', 500);
          }
          
          if (!env.WORKER_SHARED_SECRET) {
            console.error('WORKER_SHARED_SECRET not configured');
            return errorResponse('Configuration error', 500);
          }
          
          const kamResponse = await env.KEY_ACCOUNT_MANAGER.fetch(
            new Request('https://kam.internal/auth/validate-user', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.WORKER_SHARED_SECRET}`,
                'X-Worker-ID': 'pages-auth-proxy'
              },
              body: JSON.stringify({
                email: username, // For all users, username is email
                password: password,
                expected_role: loginType // 'admin' or 'user'
              })
            })
          );
          
          if (!kamResponse.ok) {
            const error = await kamResponse.json();
            return unauthorizedResponse(error.error || 'Authentication failed');
          }
          
          const userData = await kamResponse.json();
          
          sessionData = {
            username: userData.user.email,
            role: userData.user.role,
            userType: 'internal',
            userId: userData.user.user_id,
            fullName: userData.user.full_name,
            department: userData.user.department || 'General', // ✅ FIXED: Direct access + fallback
            created: Date.now(),
            expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
          };
        } catch (error) {
          console.error('Authentication service error:', error);
          return errorResponse('Authentication service unavailable', 503);
        }
        break;
        
      case 'client':
        // All user authentication via unified KAM database
        try {
          const kamResponse = await env.KEY_ACCOUNT_MANAGER.fetch(
            new Request('https://kam.internal/auth/validate-user', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.WORKER_SHARED_SECRET}`,
                'X-Worker-ID': 'pages-auth-proxy'
              },
              body: JSON.stringify({
                email: username, // For all users, username is email
                password: password,
                expected_role: 'client'
              })
            })
          );
          
          if (!kamResponse.ok) {
            const error = await kamResponse.json();
            return unauthorizedResponse(error.error || 'Authentication failed');
          }
          
          const userData = await kamResponse.json();
          
          sessionData = {
            username: userData.user.email,
            role: userData.user.role,
            userType: 'client',
            userId: userData.user.user_id,
            clientId: userData.client_profile?.client_id,
            companyName: userData.client_profile?.company_name,
            subscriptionTier: userData.client_profile?.subscription_tier,
            fullName: userData.user.full_name,
            created: Date.now(),
            expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
          };
        } catch (error) {
          console.error('Authentication service error:', error);
          return errorResponse('Authentication service unavailable', 503);
        }
        break;
        
      default:
        return errorResponse('Invalid login type');
    }
    
    // Generate session token
    const sessionToken = crypto.randomUUID();
    
    // Store session in KV
    await env.BITWARE_SESSION_STORE.put(
      `session:${sessionToken}`, 
      JSON.stringify(sessionData), 
      {
        expirationTtl: 24 * 60 * 60 // 24 hours in seconds
      }
    );
    
    // For all sessions, register with KAM for unified session management
    try {
      await env.KEY_ACCOUNT_MANAGER.fetch(
        new Request('https://kam.internal/session/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.WORKER_SHARED_SECRET}`,
            'X-Worker-ID': 'pages-auth-proxy'
          },
          body: JSON.stringify({
            sessionToken,
            userId: sessionData.userId,
            clientId: sessionData.clientId || null,
            loginMethod: 'dashboard',
            expiresAt: new Date(sessionData.expires).toISOString()
          })
        })
      );
    } catch (error) {
      console.error('Session registration failed:', error);
      // Continue anyway - session is valid in KV
    }
    
    return jsonResponse({
      success: true,
      sessionToken,
      user: {
        username: sessionData.username,
        role: sessionData.role,
        userType: sessionData.userType,
        userId: sessionData.userId,
        fullName: sessionData.fullName,
        ...(sessionData.role === 'client' ? {
          clientId: sessionData.clientId,
          companyName: sessionData.companyName,
          subscriptionTier: sessionData.subscriptionTier
        } : {}),
        ...(sessionData.userType === 'internal' ? {
          department: sessionData.department
        } : {})
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('Invalid request');
  }
}