// Key Account Manager Worker
// @WORKER: KeyAccountManager
// 🧱 Type: CommunicationHub + AI Analyst
// 📍 Path: workers/bitware_key_account_manager/index.ts
// 🎯 Role: Client memory, communication processing, needs analysis
// 💾 Storage: { d1: "key_account_management_db", kv: "CLIENT_CACHE" }

// ==================== INTERFACES ====================

interface Client {
  client_id: string;
  company_name: string;
  primary_contact_email: string;
  subscription_tier: 'basic' | 'standard' | 'premium' | 'enterprise';
  industry?: string;
  communication_style?: string;
  preferred_report_formats?: string[];
  monthly_budget_usd: number;
}

interface Communication {
  communication_id: string;
  client_id: string;
  type: 'email_inbound' | 'email_outbound' | 'phone' | 'meeting' | 'chat';
  subject?: string;
  content: string;
  sender_email: string;
  intent_detected?: string;
  sentiment_score?: number;
  urgency_level?: 'low' | 'medium' | 'high' | 'critical';
}

interface ClientRequest {
  request_id: string;
  client_id: string;
  request_type: string;
  request_description: string;
  parameters: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimated_cost_usd?: number;
}

interface NeedsAnalysis {
  analysis_id: string;
  client_id: string;
  analysis_type: string;
  insights: any;
  confidence_score: number;
  recommended_actions: string[];
  predicted_needs: string[];
}

interface EmailProcessingRequest {
  from: string;
  to: string;
  subject: string;
  body: string;
  attachments?: string[];
}

interface OrchestrationRequest {
  client_id: string;
  request_type: string;
  parameters: any;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

interface Env {
  // Database and storage
  KEY_ACCOUNT_DB: D1Database;
  CLIENT_CACHE: KVNamespace;
  
  // AI and orchestration services
  CONTENT_CLASSIFIER: Fetcher; // For AI analysis
  ORCHESTRATOR: Fetcher; // For pipeline execution
  
  // Email integration
  EMAIL_WEBHOOK_SECRET: string;
  
  // Authentication
  CLIENT_API_KEY: string;
  WORKER_SHARED_SECRET: string;
  
  // AI configuration
  OPENAI_API_KEY: string;
}

// ==================== MAIN WORKER LOGIC ====================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization, X-Worker-ID',
      'Access-Control-Max-Age': '86400',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ==================== PUBLIC ENDPOINTS (No Auth) ====================
      
      if (path === '/health') {
        return handleHealthCheck(env, corsHeaders);
      }
      
      if (path === '/help') {
        return handleHelp(corsHeaders);
      }
      
      if (path === '/capabilities') {
        return handleCapabilities(corsHeaders);
      }

      // ==================== EMAIL WEBHOOK (Special Auth) ====================
      
      if (path === '/webhook/email' && method === 'POST') {
        return handleEmailWebhook(request, env, corsHeaders);
      }

      // ==================== CLIENT API ENDPOINTS ====================
      
      const clientAuth = validateClientAuth(request);
      if (!clientAuth.valid) {
        return errorResponse('Unauthorized - Valid API key required', 401, corsHeaders);
      }

      if (path === '/client/register' && method === 'POST') {
        return handleClientRegistration(request, env, corsHeaders);
      }
      
      if (path === '/client/profile' && method === 'GET') {
        return handleGetClientProfile(request, env, corsHeaders);
      }
      
      if (path === '/client/profile' && method === 'PUT') {
        return handleUpdateClientProfile(request, env, corsHeaders);
      }
      
      if (path === '/client/communications' && method === 'GET') {
        return handleGetCommunications(request, env, corsHeaders);
      }
      
      if (path === '/client/requests' && method === 'GET') {
        return handleGetRequests(request, env, corsHeaders);
      }
      
      if (path === '/request/submit' && method === 'POST') {
        return handleSubmitRequest(request, env, corsHeaders);
      }
      
      if (path === '/needs-analysis' && method === 'GET') {
        return handleGetNeedsAnalysis(request, env, corsHeaders);
      }
      
      if (path === '/proactive/suggestions' && method === 'GET') {
        return handleGetProactiveSuggestions(request, env, corsHeaders);
      }

      // ==================== WORKER API ENDPOINTS ====================
      
      const workerAuth = validateWorkerAuth(request);
      if (!workerAuth.valid) {
        return errorResponse('Unauthorized - Worker authentication required', 401, corsHeaders);
      }

      if (path === '/admin/stats' && method === 'GET') {
        return handleAdminStats(env, corsHeaders);
      }
      
      if (path === '/admin/clients' && method === 'GET') {
        return handleAdminGetClients(env, corsHeaders);
      }
      
      if (path === '/admin/trigger-analysis' && method === 'POST') {
        return handleTriggerAnalysis(request, env, corsHeaders);
      }
      
      if (path === '/communication/process' && method === 'POST') {
        return handleProcessCommunication(request, env, corsHeaders);
      }

      return errorResponse('Endpoint not found', 404, corsHeaders);

    } catch (error) {
      console.error('Worker error:', error);
      return errorResponse('Internal server error', 500, corsHeaders);
    }
  }
};

// ==================== EMAIL PROCESSING ====================

async function handleEmailWebhook(request: Request, env: Env, corsHeaders: any): Promise<Response> {
  try {
    // Validate webhook signature
    const signature = request.headers.get('X-Webhook-Signature');
    if (!validateWebhookSignature(signature, env.EMAIL_WEBHOOK_SECRET)) {
      return errorResponse('Invalid webhook signature', 401, corsHeaders);
    }

    const emailData: EmailProcessingRequest = await request.json();
    
    // Process email through AI analysis
    const processing = await processIncomingEmail(emailData, env);
    
    return jsonResponse({
      status: 'ok',
      message: 'Email processed successfully',
      processing_id: processing.email_id,
      client_identified: processing.client_identified,
      auto_response_sent: processing.auto_response_sent
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Email webhook error:', error);
    return errorResponse('Email processing failed', 500, corsHeaders);
  }
}

async function processIncomingEmail(emailData: EmailProcessingRequest, env: Env) {
  const emailId = `email_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  
  // 1. Try to identify client from email address
  const client = await identifyClientByEmail(emailData.from, env);
  
  // 2. Use AI to analyze email content
  const aiAnalysis = await analyzeEmailWithAI(emailData, env);
  
  // 3. Store email processing record
  await env.KEY_ACCOUNT_DB.prepare(`
    INSERT INTO email_processing (
      email_id, client_id, from_email, to_email, subject, body_text,
      client_identified, intent_classification, extracted_requirements,
      sentiment_analysis, entities_extracted, action_items, urgency_assessment,
      processing_status, received_at, processed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
    emailId,
    client?.client_id || null,
    emailData.from,
    emailData.to,
    emailData.subject,
    emailData.body,
    client ? 1 : 0,
    aiAnalysis.intent,
    JSON.stringify(aiAnalysis.requirements),
    JSON.stringify(aiAnalysis.sentiment),
    JSON.stringify(aiAnalysis.entities),
    JSON.stringify(aiAnalysis.actionItems),
    aiAnalysis.urgency
  ).run();

  // 4. If client identified, process as communication
  if (client) {
    await recordClientCommunication({
      communication_id: `comm_${emailId}`,
      client_id: client.client_id,
      type: 'email_inbound',
      subject: emailData.subject,
      content: emailData.body,
      sender_email: emailData.from,
      intent_detected: aiAnalysis.intent,
      sentiment_score: aiAnalysis.sentiment.overall,
      urgency_level: aiAnalysis.urgency,
      topics_mentioned: aiAnalysis.topics,
      action_items_extracted: aiAnalysis.actionItems
    }, env);

    // 5. Auto-generate response if appropriate
    const autoResponse = await generateAutoResponse(client, aiAnalysis, env);
    if (autoResponse.shouldSend) {
      await sendEmailResponse(emailData.from, autoResponse.content, env);
    }

    // 6. Create requests if needed
    if (aiAnalysis.actionItems.length > 0) {
      for (const actionItem of aiAnalysis.actionItems) {
        if (actionItem.type === 'request_report' || actionItem.type === 'request_analysis') {
          await createClientRequest(client.client_id, actionItem, env);
        }
      }
    }
  }

  return {
    email_id: emailId,
    client_identified: !!client,
    auto_response_sent: client ? true : false,
    action_items_created: aiAnalysis.actionItems.length
  };
}

// ==================== AI ANALYSIS FUNCTIONS ====================

async function analyzeEmailWithAI(emailData: EmailProcessingRequest, env: Env): Promise<any> {
  // Use content classifier for email analysis
  const analysis = await env.CONTENT_CLASSIFIER.fetch('/analyze/communication', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.WORKER_SHARED_SECRET}`,
      'X-Worker-ID': 'key_account_manager'
    },
    body: JSON.stringify({
      analysis_type: 'email_communication',
      content: emailData.body,
      subject: emailData.subject,
      sender: emailData.from,
      context: 'client_communication'
    })
  });

  const result = await analysis.json();
  
  return {
    intent: result.intent || 'general_inquiry',
    sentiment: result.sentiment || { overall: 0.0, confidence: 0.5 },
    entities: result.entities || [],
    topics: result.topics || [],
    actionItems: result.action_items || [],
    urgency: result.urgency || 'medium',
    requirements: result.extracted_requirements || {}
  };
}

async function analyzeClientNeeds(clientId: string, env: Env): Promise<NeedsAnalysis> {
  // Get client communication history
  const communications = await env.KEY_ACCOUNT_DB.prepare(`
    SELECT * FROM client_communications 
    WHERE client_id = ? AND received_at > datetime('now', '-30 days')
    ORDER BY received_at DESC
  `).bind(clientId).all();

  const requests = await env.KEY_ACCOUNT_DB.prepare(`
    SELECT * FROM client_requests 
    WHERE client_id = ? AND requested_at > datetime('now', '-90 days')
    ORDER BY requested_at DESC
  `).bind(clientId).all();

  // Use AI to analyze patterns
  const analysis = await env.CONTENT_CLASSIFIER.fetch('/analyze/client-patterns', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.WORKER_SHARED_SECRET}`,
      'X-Worker-ID': 'key_account_manager'
    },
    body: JSON.stringify({
      analysis_type: 'client_needs_analysis',
      client_id: clientId,
      communication_history: communications.results,
      request_history: requests.results,
      analysis_period: '30_days'
    })
  });

  const result = await analysis.json();
  
  const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  
  // Store analysis results
  await env.KEY_ACCOUNT_DB.prepare(`
    INSERT INTO client_needs_analysis (
      analysis_id, client_id, analysis_type, insights, confidence_score,
      recommended_actions, predicted_needs, analyzed_at, valid_until
    ) VALUES (?, ?, 'usage_behavior', ?, ?, ?, ?, CURRENT_TIMESTAMP, datetime('now', '+7 days'))
  `).bind(
    analysisId,
    clientId,
    JSON.stringify(result.insights),
    result.confidence_score,
    JSON.stringify(result.recommended_actions),
    JSON.stringify(result.predicted_needs)
  ).run();

  return {
    analysis_id: analysisId,
    client_id: clientId,
    analysis_type: 'usage_behavior',
    insights: result.insights,
    confidence_score: result.confidence_score,
    recommended_actions: result.recommended_actions,
    predicted_needs: result.predicted_needs
  };
}

// ==================== ORCHESTRATOR INTEGRATION ====================

async function createClientRequest(clientId: string, actionItem: any, env: Env): Promise<string> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  
  // Determine request type and parameters
  const requestType = mapActionItemToRequestType(actionItem);
  const parameters = extractRequestParameters(actionItem);
  
  // Store request
  await env.KEY_ACCOUNT_DB.prepare(`
    INSERT INTO client_requests (
      request_id, client_id, request_type, request_description, parameters,
      status, requested_at
    ) VALUES (?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
  `).bind(
    requestId,
    clientId,
    requestType,
    actionItem.description,
    JSON.stringify(parameters)
  ).run();

  // Trigger orchestrator if it's an intelligence request
  if (requestType === 'intelligence_report' || requestType === 'topic_research') {
    await triggerOrchestrator(requestId, clientId, requestType, parameters, env);
  }

  return requestId;
}

async function triggerOrchestrator(requestId: string, clientId: string, requestType: string, parameters: any, env: Env): Promise<void> {
  try {
    // Update request status
    await env.KEY_ACCOUNT_DB.prepare(`
      UPDATE client_requests SET status = 'processing', started_at = CURRENT_TIMESTAMP 
      WHERE request_id = ?
    `).bind(requestId).run();

    // Call orchestrator
    const orchestrationRequest = {
      topic: parameters.topic || parameters.subject,
      urgency: parameters.urgency || 'medium',
      quality_level: parameters.quality_level || 'standard',
      optimize_for: parameters.optimize_for || 'balanced',
      client_context: {
        client_id: clientId,
        request_id: requestId,
        request_type: requestType
      }
    };

    const response = await env.ORCHESTRATOR.fetch('/orchestrate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.WORKER_SHARED_SECRET}`,
        'X-Worker-ID': 'key_account_manager'
      },
      body: JSON.stringify(orchestrationRequest)
    });

    const result = await response.json();
    
    if (result.status === 'completed') {
      await env.KEY_ACCOUNT_DB.prepare(`
        UPDATE client_requests SET 
          status = 'completed', 
          pipeline_id = ?, 
          result_data = ?,
          actual_cost_usd = ?,
          completed_at = CURRENT_TIMESTAMP
        WHERE request_id = ?
      `).bind(
        result.pipeline_id,
        JSON.stringify(result.worker_results),
        result.total_cost_usd,
        requestId
      ).run();

      // Send result to client
      await deliverResultToClient(clientId, requestId, result, env);
    }

  } catch (error) {
    console.error('Orchestrator trigger failed:', error);
    await env.KEY_ACCOUNT_DB.prepare(`
      UPDATE client_requests SET status = 'failed' WHERE request_id = ?
    `).bind(requestId).run();
  }
}

// ==================== CLIENT MANAGEMENT ====================

async function handleClientRegistration(request: Request, env: Env, corsHeaders: any): Promise<Response> {
  try {
    const clientData = await request.json();
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    await env.KEY_ACCOUNT_DB.prepare(`
      INSERT INTO clients (
        client_id, company_name, primary_contact_name, primary_contact_email,
        industry, subscription_tier, monthly_budget_usd, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      clientId,
      clientData.company_name,
      clientData.primary_contact_name,
      clientData.primary_contact_email,
      clientData.industry || null,
      clientData.subscription_tier || 'standard',
      clientData.monthly_budget_usd || 100.0
    ).run();

    // Cache client data
    await env.CLIENT_CACHE.put(`client:${clientId}`, JSON.stringify({
      client_id: clientId,
      company_name: clientData.company_name,
      primary_contact_email: clientData.primary_contact_email,
      subscription_tier: clientData.subscription_tier || 'standard'
    }), { expirationTtl: 3600 });

    return jsonResponse({
      status: 'ok',
      message: 'Client registered successfully',
      client_id: clientId
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Client registration error:', error);
    return errorResponse('Registration failed', 500, corsHeaders);
  }
}

// ==================== HELPER FUNCTIONS ====================

function validateClientAuth(request: Request): { valid: boolean; clientId?: string } {
  const apiKey = request.headers.get('X-API-Key');
  // In production, validate against client database
  return { valid: !!apiKey, clientId: 'determined_from_api_key' };
}

function validateWorkerAuth(request: Request): { valid: boolean } {
  const authHeader = request.headers.get('Authorization');
  const workerId = request.headers.get('X-Worker-ID');
  return { valid: authHeader?.startsWith('Bearer ') && !!workerId };
}

function validateWebhookSignature(signature: string | null, secret: string): boolean {
  // Implement HMAC signature validation
  return !!signature; // Simplified for demo
}

async function identifyClientByEmail(email: string, env: Env): Promise<Client | null> {
  const result = await env.KEY_ACCOUNT_DB.prepare(`
    SELECT * FROM clients WHERE primary_contact_email = ? AND account_status = 'active'
  `).bind(email).first();
  
  return result as Client | null;
}

async function recordClientCommunication(comm: Communication, env: Env): Promise<void> {
  await env.KEY_ACCOUNT_DB.prepare(`
    INSERT INTO client_communications (
      communication_id, client_id, type, subject, content, sender_email,
      intent_detected, sentiment_score, urgency_level, topics_mentioned,
      action_items_extracted, processed_by_ai, received_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
  `).bind(
    comm.communication_id,
    comm.client_id,
    comm.type,
    comm.subject,
    comm.content,
    comm.sender_email,
    comm.intent_detected,
    comm.sentiment_score,
    comm.urgency_level,
    JSON.stringify(comm.topics_mentioned),
    JSON.stringify(comm.action_items_extracted)
  ).run();
}

function mapActionItemToRequestType(actionItem: any): string {
  const mapping: Record<string, string> = {
    'request_report': 'intelligence_report',
    'ask_analysis': 'topic_research',
    'competitive_intel': 'competitive_analysis',
    'trend_monitoring': 'trend_monitoring'
  };
  return mapping[actionItem.type] || 'custom_pipeline';
}

function extractRequestParameters(actionItem: any): any {
  return {
    topic: actionItem.topic,
    urgency: actionItem.urgency || 'medium',
    quality_level: actionItem.quality_level || 'standard',
    specific_requirements: actionItem.requirements || {}
  };
}

async function generateAutoResponse(client: Client, analysis: any, env: Env): Promise<{ shouldSend: boolean; content?: string }> {
  // Use AI to generate appropriate response
  if (analysis.intent === 'request_report' || analysis.intent === 'ask_question') {
    return {
      shouldSend: true,
      content: `Thank you for your request. I've received your inquiry about ${analysis.topics.join(', ')} and am processing it now. You'll receive results shortly.`
    };
  }
  return { shouldSend: false };
}

async function sendEmailResponse(to: string, content: string, env: Env): Promise<void> {
  // Implement email sending (integrate with your email service)
  console.log(`Sending auto-response to ${to}: ${content}`);
}

async function deliverResultToClient(clientId: string, requestId: string, result: any, env: Env): Promise<void> {
  // Implementation for delivering results (email, dashboard notification, etc.)
  console.log(`Delivering result for request ${requestId} to client ${clientId}`);
}

// ==================== ENDPOINT HANDLERS ====================

async function handleHealthCheck(env: Env, corsHeaders: any): Promise<Response> {
  try {
    // Test database connectivity
    const dbTest = await env.KEY_ACCOUNT_DB.prepare('SELECT 1').first();
    
    return jsonResponse({
      status: 'healthy',
      database: dbTest ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }, { headers: corsHeaders });

  } catch (error) {
    return jsonResponse({
      status: 'unhealthy',
      error: 'Database connection failed',
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders, status: 503 });
  }
}

async function handleHelp(corsHeaders: any): Promise<Response> {
  return jsonResponse({
    worker: 'Key Account Manager',
    version: '1.0.0',
    description: 'AI-powered client memory and communication hub',
    capabilities: [
      'Client communication tracking',
      'Email processing and analysis',
      'Needs analysis and prediction',
      'Proactive suggestions',
      'Orchestrator integration',
      'Client relationship management'
    ],
    endpoints: {
      public: ['/health', '/help', '/capabilities'],
      client: ['/client/register', '/client/profile', '/request/submit', '/needs-analysis'],
      worker: ['/admin/stats', '/communication/process', '/admin/trigger-analysis'],
      webhook: ['/webhook/email']
    }
  }, { headers: corsHeaders });
}

async function handleCapabilities(corsHeaders: any): Promise<Response> {
  return jsonResponse({
    worker_type: 'CommunicationHub',
    ai_capabilities: ['email_analysis', 'needs_prediction', 'sentiment_analysis'],
    integrations: ['content_classifier', 'orchestrator', 'email_service'],
    storage: ['client_database', 'communication_history', 'analysis_cache'],
    features: [
      'Automated email processing',
      'Client memory and context',
      'Proactive needs analysis',
      'Intelligence request automation',
      'Multi-channel communication',
      'Performance analytics'
    ]
  }, { headers: corsHeaders });
}

// Additional endpoint handlers would be implemented here...

function jsonResponse(data: any, options?: { headers?: Record<string, string>; status?: number }): Response {
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    },
    status: options?.status || 200
  });
}

function errorResponse(message: string, status: number, headers?: Record<string, string>): Response {
  return jsonResponse({
    status: 'error',
    error: message,
    timestamp: new Date().toISOString()
  }, { headers, status });
}