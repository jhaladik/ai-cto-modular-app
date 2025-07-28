// @WORKER
// 🧱 Type: ClientRelationshipManager
// 📍 Path: workers/bitware_key_account_manager/
// 🎯 Role: Client relationship management, communication processing, template intelligence
// 🧰 Params: { nlp_model: "gpt-4o-mini", template_sync_interval: "daily" }
// 📦 Requires: [orchestrator_integration, openai_api, email_processing]
// 🔄 Outputs: Client profiles, communication analysis, template recommendations
// 💾 Storage: { d1: "key_account_management_db", kv: "kam_cache", k2: "client_params" }

interface Env {
  // Database and storage bindings
  KEY_ACCOUNT_MANAGEMENT_DB: D1Database;
  KAM_CACHE: KVNamespace;
  
  // Authentication secrets
  CLIENT_API_KEY: string;
  WORKER_SHARED_SECRET: string;
  
  // AI/NLP integration
  OPENAI_API_KEY: string;
  
  // Service bindings for orchestrator integration
  ORCHESTRATOR: Fetcher;
  
  // Configuration
  ORCHESTRATOR_URL: string;
  TEMPLATE_SYNC_INTERVAL_HOURS: string;
  DEFAULT_COMMUNICATION_STYLE: string;
  MAX_CLIENT_SESSIONS: string;
}

interface ClientProfile {
  client_id: string;
  company_name: string;
  primary_contact_email: string;
  subscription_tier: 'basic' | 'standard' | 'premium' | 'enterprise';
  account_status: 'trial' | 'active' | 'suspended' | 'cancelled';
  communication_style?: string;
  monthly_budget_usd: number;
  used_budget_current_month: number;
}

interface CommunicationAnalysis {
  intent_detected: string;
  sentiment_score: number;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  confidence_score: number;
  requires_human_attention: boolean;
  recommended_template?: string;
}

interface TemplateRecommendation {
  template_name: string;
  confidence_score: number;
  reasoning: string;
  estimated_cost_usd: number;
  estimated_duration_ms: number;
}



// ==================== HELPER FUNCTIONS ====================

function jsonResponse(data: any, options?: { headers?: Record<string, string>; status?: number }) {
  return new Response(JSON.stringify(data, null, 2), {
    status: options?.status || 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization, X-Worker-ID',
      ...options?.headers
    }
  });
}

function unauthorized(message: string = 'Unauthorized') {
  return jsonResponse({ error: message, status: 'unauthorized' }, { status: 401 });
}

function badRequest(message: string) {
  return jsonResponse({ error: message, status: 'bad_request' }, { status: 400 });
}

function internalError(message: string) {
  return jsonResponse({ error: message, status: 'internal_error' }, { status: 500 });
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== AUTHENTICATION ====================

function validateClientAuth(request: Request, env: Env): boolean {
  const apiKey = request.headers.get('X-API-Key');
  return apiKey === env.CLIENT_API_KEY;
}

function validateWorkerAuth(request: Request, env: Env): { valid: boolean; workerId?: string } {
  const authHeader = request.headers.get('Authorization');
  const workerID = request.headers.get('X-Worker-ID');
  
  if (!authHeader || !workerID) {
    return { valid: false };
  }
  
  const token = authHeader.replace('Bearer ', '');
  if (token !== env.WORKER_SHARED_SECRET) {
    return { valid: false };
  }
  
  return { valid: true, workerId: workerID };
}

// ==================== AI/NLP FUNCTIONS ====================

async function analyzeClientCommunication(content: string, env: Env): Promise<CommunicationAnalysis> {
  try {
    const prompt = `Analyze this client communication and provide structured JSON response:

Content: "${content}"

Analyze for:
1. Intent (request_report, ask_question, provide_feedback, schedule_meeting, request_support, etc.)
2. Sentiment (-1.0 to 1.0, where -1 is very negative, 0 is neutral, 1 is very positive)
3. Urgency (low, medium, high, critical)
4. Confidence in analysis (0.0 to 1.0)
5. Whether this requires human attention (boolean)

Respond with ONLY a JSON object in this format:
{
  "intent_detected": "intent_name",
  "sentiment_score": 0.0,
  "urgency_level": "medium",
  "confidence_score": 0.0,
  "requires_human_attention": false
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content.trim();
    
    // Clean up response (remove markdown if present)
    const cleanResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    return JSON.parse(cleanResponse);
  } catch (error) {
    console.error('AI analysis failed:', error);
    // Return safe defaults
    return {
      intent_detected: 'unknown',
      sentiment_score: 0.0,
      urgency_level: 'medium',
      confidence_score: 0.0,
      requires_human_attention: true
    };
  }
}

async function recommendTemplate(clientContext: ClientProfile, request: string, env: Env): Promise<TemplateRecommendation | null> {
  try {
    // First get available templates from cache/database
    const templates = await getAvailableTemplates(env);
    if (templates.length === 0) {
      await syncTemplatesFromOrchestrator(env);
      // Try again after sync
      const templatesAfterSync = await getAvailableTemplates(env);
      if (templatesAfterSync.length === 0) {
        return null;
      }
    }

    const templateDescriptions = templates.map(t => 
      `${t.template_name}: ${t.description} (Cost: $${t.estimated_cost_usd}, Duration: ${Math.round(t.estimated_duration_ms/1000)}s)`
    ).join('\n');

    const prompt = `Given this client context and request, recommend the best pipeline template:

Client: ${clientContext.company_name}
Tier: ${clientContext.subscription_tier}
Budget: $${clientContext.monthly_budget_usd}/month (Used: $${clientContext.used_budget_current_month})
Communication Style: ${clientContext.communication_style || 'professional'}

Request: "${request}"

Available Templates:
${templateDescriptions}

Respond with ONLY a JSON object:
{
  "template_name": "exact_template_name",
  "confidence_score": 0.0,
  "reasoning": "Why this template fits best",
  "estimated_cost_usd": 0.0,
  "estimated_duration_ms": 0
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content.trim();
    const cleanResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    return JSON.parse(cleanResponse);
  } catch (error) {
    console.error('Template recommendation failed:', error);
    return null;
  }
}

// ==================== DATABASE FUNCTIONS ====================

async function getClientByEmail(email: string, env: Env): Promise<ClientProfile | null> {
  try {
    const result = await env.KEY_ACCOUNT_MANAGEMENT_DB.prepare(`
      SELECT * FROM clients WHERE primary_contact_email = ?
    `).bind(email).first();

    if (!result) return null;

    return {
      client_id: result.client_id,
      company_name: result.company_name,
      primary_contact_email: result.primary_contact_email,
      subscription_tier: result.subscription_tier,
      account_status: result.account_status,
      communication_style: result.communication_style,
      monthly_budget_usd: result.monthly_budget_usd,
      used_budget_current_month: result.used_budget_current_month
    };
  } catch (error) {
    console.error('Database error getting client:', error);
    return null;
  }
}

async function createClient(clientData: Partial<ClientProfile>, env: Env): Promise<string> {
  const clientId = generateId('client');
  
  try {
    await env.KEY_ACCOUNT_MANAGEMENT_DB.prepare(`
      INSERT INTO clients (
        client_id, company_name, primary_contact_email, subscription_tier,
        account_status, monthly_budget_usd, communication_style
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      clientId,
      clientData.company_name || 'Unknown Company',
      clientData.primary_contact_email,
      clientData.subscription_tier || 'standard',
      clientData.account_status || 'trial',
      clientData.monthly_budget_usd || 100.0,
      clientData.communication_style || 'professional'
    ).run();

    return clientId;
  } catch (error) {
    console.error('Database error creating client:', error);
    throw new Error('Failed to create client profile');
  }
}

async function storeCommunication(communication: any, env: Env): Promise<string> {
  const communicationId = generateId('comm');
  
  try {
    await env.KEY_ACCOUNT_MANAGEMENT_DB.prepare(`
      INSERT INTO client_communications (
        communication_id, client_id, type, subject, content, sender_email,
        intent_detected, sentiment_score, urgency_level, confidence_score,
        requires_human_attention
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      communicationId,
      communication.client_id,
      communication.type,
      communication.subject || '',
      communication.content,
      communication.sender_email,
      communication.intent_detected,
      communication.sentiment_score,
      communication.urgency_level,
      communication.confidence_score,
      communication.requires_human_attention
    ).run();

    return communicationId;
  } catch (error) {
    console.error('Database error storing communication:', error);
    throw new Error('Failed to store communication');
  }
}

async function getAvailableTemplates(env: Env): Promise<any[]> {
  try {
    const result = await env.KEY_ACCOUNT_MANAGEMENT_DB.prepare(`
      SELECT * FROM pipeline_template_cache 
      WHERE is_active = 1 
      ORDER BY template_name
    `).all();

    return result.results || [];
  } catch (error) {
    console.error('Database error getting templates:', error);
    return [];
  }
}

async function syncTemplatesFromOrchestrator(env: Env): Promise<void> {
  try {
    console.log('🔄 Syncing templates from orchestrator...');
    
    // Call orchestrator to get available templates
    const response = await env.ORCHESTRATOR.fetch(new Request('https://internal/templates', {
      method: 'GET',
      headers: {
        'X-API-Key': env.CLIENT_API_KEY,
        'X-Worker-ID': 'bitware_key_account_manager'
      }
    }));

    if (!response.ok) {
      throw new Error(`Orchestrator response: ${response.status}`);
    }

    const data = await response.json();
    const templates = data.templates || [];

    // Clear existing cache and insert new templates
    await env.KEY_ACCOUNT_MANAGEMENT_DB.prepare(`DELETE FROM pipeline_template_cache`).run();

    for (const template of templates) {
      await env.KEY_ACCOUNT_MANAGEMENT_DB.prepare(`
        INSERT INTO pipeline_template_cache (
          template_name, display_name, description, category, complexity_level,
          estimated_duration_ms, estimated_cost_usd, is_active, last_synced_from_orchestrator
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        template.name,
        template.display_name,
        template.description,
        template.category || 'general',
        template.complexity_level || 'standard',
        template.estimated_duration_ms || 120000,
        template.estimated_cost_usd || 0.10,
        template.is_active !== false,
        new Date().toISOString()
      ).run();
    }

    console.log(`✅ Synced ${templates.length} templates from orchestrator`);
  } catch (error) {
    console.error('Failed to sync templates from orchestrator:', error);
  }
}

async function handleValidateUser(request: Request, env: Env, corsHeaders: any): Promise<Response> {
  try {
    // Verify worker authentication (same pattern as existing endpoints)
    const workerAuth = validateWorkerAuth(request);
    if (!workerAuth.valid) {
      return errorResponse('Unauthorized - Worker authentication required', 401, corsHeaders);
    }

    const { email, password, expected_role } = await request.json();

    // Query user from unified users table
    const userQuery = await env.KEY_ACCOUNT_MANAGEMENT_DB.prepare(
      'SELECT * FROM users WHERE email = ? AND status = "active"'
    ).bind(email).first();

    if (!userQuery) {
      return jsonResponse({ error: 'User not found' }, { 
        headers: corsHeaders, 
        status: 401 
      });
    }

    // Simple password check (use bcrypt in production)
    if (userQuery.password_hash !== password) {
      return jsonResponse({ error: 'Invalid password' }, { 
        headers: corsHeaders, 
        status: 401 
      });
    }

    // Check role matches expected
    if (expected_role && userQuery.role !== expected_role) {
      return jsonResponse({ error: 'Invalid role' }, { 
        headers: corsHeaders, 
        status: 401 
      });
    }

    // Get client profile for client users
    let client_profile = null;
    if (userQuery.role === 'client' && userQuery.client_id) {
      client_profile = await env.KEY_ACCOUNT_MANAGEMENT_DB.prepare(
        'SELECT * FROM clients WHERE client_id = ?'
      ).bind(userQuery.client_id).first();
    }

    // Update last login
    await env.KEY_ACCOUNT_MANAGEMENT_DB.prepare(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?'
    ).bind(userQuery.user_id).run();

    return jsonResponse({
      success: true,
      user: {
        user_id: userQuery.user_id,
        email: userQuery.email,
        role: userQuery.role,
        full_name: userQuery.full_name,
        status: userQuery.status,
        department: userQuery.department,
        client_id: userQuery.client_id
      },
      client_profile: client_profile
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('User validation error:', error);
    return jsonResponse({ error: 'Authentication failed' }, { 
      headers: corsHeaders, 
      status: 500 
    });
  }
}

async function handleSessionRegister(request: Request, env: Env, corsHeaders: any): Promise<Response> {
  try {
    // Verify worker authentication
    const workerAuth = validateWorkerAuth(request);
    if (!workerAuth.valid) {
      return errorResponse('Unauthorized - Worker authentication required', 401, corsHeaders);
    }

    const { sessionToken, userId, clientId, loginMethod, expiresAt } = await request.json();

    // Store session in user_sessions table
    await env.KEY_ACCOUNT_MANAGEMENT_DB.prepare(`
      INSERT OR REPLACE INTO user_sessions 
      (session_token, user_id, expires_at, login_method, client_context)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      sessionToken,
      userId,
      expiresAt,
      loginMethod || 'dashboard',
      JSON.stringify({ clientId: clientId || null })
    ).run();

    return jsonResponse({
      success: true,
      message: 'Session registered'
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Session registration error:', error);
    return jsonResponse({ error: 'Session registration failed' }, { 
      headers: corsHeaders, 
      status: 500 
    });
  }
}


// ==================== MAIN HANDLER ====================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // Handle CORS
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization, X-Worker-ID'
        }
      });
    }

    try {
      // ==================== PUBLIC ENDPOINTS (NO AUTH) ====================
      
      if (pathname === '/help') {
        return jsonResponse({
          worker: 'bitware_key_account_manager',
          version: '1.0.0',
          description: 'Client relationship management and communication processing',
          endpoints: {
            public: [
              'GET /help - This help message',
              'GET /capabilities - Worker capabilities and features',
              'GET /health - Health check'
            ],
            main: [
              'GET /client?email=<email> - Get client profile',
              'POST /client - Create new client profile',
              'POST /analyze-communication - Analyze client communication',
              'POST /recommend-template - Get template recommendation',
              'GET /templates - List available pipeline templates'
            ],
            admin: [
              'GET /admin/stats - Usage statistics',
              'GET /admin/clients - List all clients',
              'POST /admin/sync-templates - Sync templates from orchestrator',
              'GET /admin/communications - Recent communications'
            ]
          },
          integration: {
            orchestrator: 'Service binding for template sync and pipeline tracking',
            pages_frontend: 'Extends existing authentication and session management',
            openai: 'AI-powered communication analysis and template recommendations'
          }
        });
      }

      if (pathname === '/capabilities') {
        return jsonResponse({
          worker_type: 'ClientRelationshipManager',
          ai_capabilities: [
            'Communication intent detection',
            'Sentiment analysis',
            'Template recommendation',
            'Client behavior analysis'
          ],
          integrations: [
            'Orchestrator pipeline tracking',
            'OpenAI NLP processing',
            'Pages session management'
          ],
          features: [
            'Client profile management',
            'Communication processing',
            'Template intelligence',
            'Pipeline transparency',
            'Budget tracking'
          ]
        });
      }

      if (pathname === '/health') {
        try {
          // Test database connection
          const testQuery = await env.KEY_ACCOUNT_MANAGEMENT_DB.prepare(`
            SELECT COUNT(*) as count FROM clients
          `).first();

          const templateCount = await env.KEY_ACCOUNT_MANAGEMENT_DB.prepare(`
            SELECT COUNT(*) as count FROM pipeline_template_cache WHERE is_active = 1
          `).first();

          return jsonResponse({
            status: 'healthy',
            database: 'connected',
            cache: 'operational',
            total_clients: testQuery?.count || 0,
            active_templates: templateCount?.count || 0,
            ai_integration: env.OPENAI_API_KEY ? 'configured' : 'missing',
            orchestrator_binding: 'configured',
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          return jsonResponse({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
          }, { status: 500 });
        }
      }

      // ==================== AUTHENTICATION ENDPOINTS ====================

      if (path === '/auth/validate-user' && method === 'POST') {
        return handleValidateUser(request, env, corsHeaders);
      }

      if (path === '/session/register' && method === 'POST') {
        return handleSessionRegister(request, env, corsHeaders);
      }

      // ==================== ADMIN ENDPOINTS (WORKER AUTH) ====================
      
      if (pathname.startsWith('/admin/')) {
        const workerAuth = validateWorkerAuth(request, env);
        if (!workerAuth.valid) {
          return unauthorized('Valid worker authentication required');
        }

        if (pathname === '/admin/stats') {
          const stats = await env.KEY_ACCOUNT_MANAGEMENT_DB.prepare(`
            SELECT 
              COUNT(*) as total_clients,
              COUNT(CASE WHEN account_status = 'active' THEN 1 END) as active_clients,
              COUNT(CASE WHEN account_status = 'trial' THEN 1 END) as trial_clients,
              AVG(monthly_budget_usd) as avg_budget,
              SUM(used_budget_current_month) as total_used_budget
            FROM clients
          `).first();

          const communicationStats = await env.KEY_ACCOUNT_MANAGEMENT_DB.prepare(`
            SELECT 
              COUNT(*) as total_communications,
              COUNT(CASE WHEN processed_by_kam = 1 THEN 1 END) as processed_communications,
              COUNT(CASE WHEN requires_human_attention = 1 THEN 1 END) as needs_attention,
              AVG(sentiment_score) as avg_sentiment
            FROM client_communications
            WHERE sent_at > datetime('now', '-30 days')
          `).first();

          return jsonResponse({
            clients: stats,
            communications: communicationStats,
            generated_at: new Date().toISOString(),
            generated_by: workerAuth.workerId
          });
        }

        if (pathname === '/admin/sync-templates' && method === 'POST') {
          await syncTemplatesFromOrchestrator(env);
          const templates = await getAvailableTemplates(env);
          
          return jsonResponse({
            status: 'synchronized',
            template_count: templates.length,
            synced_at: new Date().toISOString()
          });
        }

        if (pathname === '/admin/clients') {
          const clients = await env.KEY_ACCOUNT_MANAGEMENT_DB.prepare(`
            SELECT client_id, company_name, primary_contact_email, subscription_tier, 
                   account_status, created_at, last_interaction, total_lifetime_value
            FROM clients 
            ORDER BY created_at DESC 
            LIMIT 50
          `).all();

          return jsonResponse({
            clients: clients.results || [],
            count: clients.results?.length || 0
          });
        }
      }

      // ==================== MAIN ENDPOINTS (CLIENT AUTH) ====================
      
      if (!validateClientAuth(request, env)) {
        return unauthorized('Valid X-API-Key required');
      }

      if (pathname === '/client' && method === 'GET') {
        const email = url.searchParams.get('email');
        if (!email) {
          return badRequest('Email parameter required');
        }

        const client = await getClientByEmail(email, env);
        if (!client) {
          return jsonResponse({ client: null, exists: false });
        }

        return jsonResponse({ client, exists: true });
      }

      if (pathname === '/client' && method === 'POST') {
        const body = await request.json();
        
        if (!body.primary_contact_email) {
          return badRequest('primary_contact_email is required');
        }

        // Check if client already exists
        const existingClient = await getClientByEmail(body.primary_contact_email, env);
        if (existingClient) {
          return jsonResponse({ 
            error: 'Client already exists', 
            client_id: existingClient.client_id 
          }, { status: 409 });
        }

        const clientId = await createClient(body, env);
        
        return jsonResponse({ 
          client_id: clientId,
          status: 'created',
          message: 'Client profile created successfully'
        });
      }

      if (pathname === '/analyze-communication' && method === 'POST') {
        const body = await request.json();
        
        if (!body.content) {
          return badRequest('Communication content is required');
        }

        const analysis = await analyzeClientCommunication(body.content, env);
        
        // If client_id provided, store the communication
        if (body.client_id) {
          try {
            const communicationId = await storeCommunication({
              client_id: body.client_id,
              type: body.type || 'email_inbound',
              subject: body.subject,
              content: body.content,
              sender_email: body.sender_email,
              ...analysis
            }, env);
            
            analysis.communication_id = communicationId;
          } catch (error) {
            console.error('Failed to store communication:', error);
          }
        }

        return jsonResponse({ analysis });
      }

      if (pathname === '/recommend-template' && method === 'POST') {
        const body = await request.json();
        
        if (!body.client_email || !body.request) {
          return badRequest('client_email and request are required');
        }

        const client = await getClientByEmail(body.client_email, env);
        if (!client) {
          return badRequest('Client not found');
        }

        const recommendation = await recommendTemplate(client, body.request, env);
        
        return jsonResponse({ 
          client_id: client.client_id,
          recommendation: recommendation || null,
          fallback_available: recommendation === null
        });
      }

      if (pathname === '/templates' && method === 'GET') {
        const templates = await getAvailableTemplates(env);
        
        return jsonResponse({ 
          templates,
          count: templates.length,
          last_sync: templates.length > 0 ? templates[0].last_synced_from_orchestrator : null
        });
      }



      // ==================== NOT FOUND ====================
      
      return jsonResponse({ 
        error: 'Endpoint not found',
        available_endpoints: '/help'
      }, { status: 404 });

    } catch (error) {
      console.error('Worker error:', error);
      return internalError('Internal worker error occurred');
    }
  }
};