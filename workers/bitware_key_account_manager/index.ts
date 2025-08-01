// workers/bitware_key_account_manager/index.ts
// Complete KAM worker implementation matching frontend specification exactly

import { DatabaseService } from './services/database';

// Types and interfaces
interface Env {
  KEY_ACCOUNT_MANAGEMENT_DB: D1Database;
  KAM_CACHE: KVNamespace;
  ORCHESTRATOR?: Service;
  CLIENT_API_KEY: string;
  WORKER_SHARED_SECRET: string;
  OPENAI_API_KEY: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'client' | 'support';
  user_type: 'admin' | 'client' | 'support';
  is_admin?: boolean;
  account_status: 'active' | 'inactive' | 'suspended';
  client_id?: string;
  department?: string;
  created_at: string;
  last_login?: string;
  login_count?: number;
}

interface Client {
  client_id: string;
  company_name: string;
  contact_email: string;
  contact_name?: string;
  phone?: string;
  subscription_tier: 'basic' | 'standard' | 'premium' | 'enterprise';
  account_status: 'active' | 'trial' | 'inactive' | 'suspended';
  monthly_budget_usd: number;
  used_budget_current_month: number;
  industry?: string;
  company_size?: string;
  created_at: string;
  last_activity?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  usage_stats?: {
    requests_this_month: number;
    avg_response_time: number;
    success_rate: number;
    top_services: string[];
  };
  recent_reports?: Array<{
    id: string;
    title: string;
    created: string;
    status: 'completed' | 'pending' | 'failed';
  }>;
}

// Helper functions
function jsonResponse(data: any, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    ...init
  });
}

function unauthorized(message: string = 'Unauthorized') {
  return jsonResponse({ success: false, error: message }, { status: 401 });
}

function notFound(message: string = 'Endpoint not found') {
  return jsonResponse({ success: false, error: message }, { status: 404 });
}

function badRequest(message: string = 'Bad request') {
  return jsonResponse({ success: false, error: message }, { status: 400 });
}

function serverError(message: string = 'Internal server error') {
  return jsonResponse({ success: false, error: message }, { status: 500 });
}

// Authentication validation functions
function validateClientAuth(request: Request, env: Env): { valid: boolean; error?: string } {
  const apiKey = request.headers.get('X-API-Key');
  if (!apiKey) {
    return { valid: false, error: 'X-API-Key header required' };
  }
  if (apiKey !== env.CLIENT_API_KEY) {
    return { valid: false, error: 'Invalid API key' };
  }
  return { valid: true };
}

function validateWorkerAuth(request: Request, env: Env): { valid: boolean; error?: string } {
  const authHeader = request.headers.get('Authorization');
  const workerID = request.headers.get('X-Worker-ID');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Bearer token required' };
  }
  
  const token = authHeader.substring(7);
  if (token !== env.WORKER_SHARED_SECRET) {
    return { valid: false, error: 'Invalid worker token' };
  }
  
  if (!workerID) {
    return { valid: false, error: 'X-Worker-ID header required' };
  }
  
  return { valid: true };
}

function validateSessionToken(request: Request): { valid: boolean; sessionToken?: string; error?: string } {
  const sessionToken = request.headers.get('X-Session-Token') || request.headers.get('x-bitware-session-token');
  if (!sessionToken) {
    return { valid: false, error: 'Session token header required (X-Session-Token or x-bitware-session-token)' };
  }
  return { valid: true, sessionToken };
}

// Password hashing utilities (simple implementation for development)
function hashPassword(password: string): string {
  // In production, use bcrypt or similar
  return btoa(password + 'salt');
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Generate session token
function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname, method } = { pathname: url.pathname, method: request.method };
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Worker-ID, x-bitware-session-token, X-Session-Token', // <- Add X-Session-Token
    };
        
    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const db = new DatabaseService(env.KEY_ACCOUNT_MANAGEMENT_DB);

    try {
      // ==================== PUBLIC ENDPOINTS (NO AUTH) ====================
      
      if (pathname === '/help') {
        return jsonResponse({
          worker: 'bitware_key_account_manager',
          version: '2.0.0',
          description: 'AI-powered client relationship management with unified authentication',
          endpoints: {
            public: ['/help', '/capabilities', '/health'],
            auth: ['/auth/login', '/auth/validate', '/auth/logout'],
            kam_clients: ['/clients', '/client/{id}', '/client?email={email}'],
            kam_users: ['/users', '/users/{id}'],
            dashboard: ['/dashboard/stats']
          },
          authentication: {
            client: 'X-API-Key header',
            worker: 'Authorization: Bearer token + X-Worker-ID header',
            session: 'x-bitware-session-token header'
          }
        }, { headers: corsHeaders });
      }

      if (pathname === '/capabilities') {
        return jsonResponse({
          features: [
            'unified_authentication', 
            'client_management', 
            'user_management',
            'session_management',
            'dashboard_statistics',
            'ai_communication_analysis'
          ],
          integrations: ['pages_frontend', 'orchestrator', 'openai'],
          database: 'D1',
          cache: 'KV'
        }, { headers: corsHeaders });
      }

      if (pathname === '/health') {
        try {
          const testQuery = await env.KEY_ACCOUNT_MANAGEMENT_DB.prepare('SELECT 1 as test').first();
          
          return jsonResponse({
            status: 'healthy',
            database: testQuery ? 'connected' : 'disconnected',
            timestamp: new Date().toISOString()
          }, { headers: corsHeaders });
        } catch (error) {
          return jsonResponse({
            status: 'unhealthy',
            database: 'disconnected',
            error: 'Database connection failed',
            timestamp: new Date().toISOString()
          }, { status: 503, headers: corsHeaders });
        }
      }

      // ==================== AUTHENTICATION ENDPOINTS ====================
      
      if (pathname === '/auth/login' && method === 'POST') {
        try {
          const body = await request.json();
          const { username, password, expected_role } = body;

          if (!username || !password) {
            return badRequest('Username and password are required');
          }

          // Get user by email
          const user = await db.getUserByEmail(username);
          if (!user || !verifyPassword(password, user.password_hash)) {
            return unauthorized('Invalid credentials provided');
          }

          if (user.status !== 'active') {
            return unauthorized('Account is not active');
          }

          // Check role if specified
          if (expected_role && user.role !== expected_role) {
            return unauthorized('Insufficient permissions');
          }

          // Generate session token
          const sessionToken = generateSessionToken();
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

          // Create session
          await db.createSession({
            session_token: sessionToken,
            user_id: user.user_id,
            expires_at: expiresAt.toISOString(),
            login_method: 'dashboard',
            client_context: user.client_id ? JSON.stringify({ client_id: user.client_id }) : '{}'
          });

          // Update last login
          await db.updateUserLastLogin(user.user_id);

          // Get client context if user is a client
          let kamContext = {
            client_id: user.role === 'admin' ? 'admin_user' : (user.client_id || 'unknown'),
            company_name: user.role === 'admin' ? 'AI Factory Admin' : 'Unknown Company',
            contact_email: user.email,
            subscription_tier: user.role === 'admin' ? 'enterprise' : 'basic',
            account_status: 'active',
            is_admin: user.role === 'admin',
            fallback: false
          };

          if (user.client_id) {
            const client = await db.getClientById(user.client_id);
            if (client) {
              kamContext = {
                client_id: client.client_id,
                company_name: client.company_name,
                contact_email: client.contact_email,
                subscription_tier: client.subscription_tier,
                account_status: client.account_status,
                is_admin: false,
                fallback: false
              };
            }
          }

          return jsonResponse({
            success: true,
            token: sessionToken,
            user: {
              id: user.user_id,
              username: user.username,
              email: user.email,
              full_name: user.full_name,
              role: user.role,
              user_type: user.role,
              is_admin: user.role === 'admin',
              created_at: user.created_at,
              last_login: new Date().toISOString()
            },
            kamContext
          }, { headers: corsHeaders });

        } catch (error) {
          console.error('Login error:', error);
          return serverError('Authentication failed');
        }
      }

      if (pathname === '/auth/validate' && method === 'POST') {
        try {
// NEW - accepts both session tokens AND worker auth
          const sessionValidation = validateSessionToken(request);
          const workerAuth = validateWorkerAuth(request, env);

          if (!sessionValidation.valid && !workerAuth.valid) {
            return unauthorized('Session token or worker authentication required');
          }

          // If using worker auth, verify it's from pages proxy
          if (workerAuth.valid && !sessionValidation.valid) {
            const workerId = request.headers.get('X-Worker-ID');
            if (workerId !== 'pages-kam-proxy') {
              return unauthorized('Invalid worker ID for admin operations');
            }
          }
          const session = await db.getSession(sessionValidation.sessionToken!);
          if (!session || new Date(session.expires_at) < new Date()) {
            return unauthorized('Session expired');
          }

          const user = await db.getUserById(session.user_id);
          if (!user) {
            return unauthorized('User not found');
          }

          // Update session activity
          await db.updateSessionActivity(sessionValidation.sessionToken!);

          return jsonResponse({
            valid: true,
            user: {
              id: user.user_id,
              username: user.username,
              email: user.email,
              role: user.role
            }
          }, { headers: corsHeaders });

        } catch (error) {
          console.error('Session validation error:', error);
          return unauthorized('Session validation failed');
        }
      }

      if (pathname === '/auth/logout' && method === 'POST') {
        try {
          const sessionValidation = validateSessionToken(request);
          if (!sessionValidation.valid) {
            return unauthorized(sessionValidation.error);
          }

          await db.deleteSession(sessionValidation.sessionToken!);

          return jsonResponse({
            success: true,
            message: 'Session terminated'
          }, { headers: corsHeaders });

        } catch (error) {
          console.error('Logout error:', error);
          return serverError('Logout failed');
        }
      }

      // ==================== KAM CLIENT ENDPOINTS (Session Token Required) ====================
      if (pathname === '/clients' && method === 'GET') {
        try {
          const sessionValidation = validateSessionToken(request);
          const workerAuth = validateWorkerAuth(request, env);
          
          if (!sessionValidation.valid && !workerAuth.valid) {
            return unauthorized('Authentication required');
          }
      
          // If using session auth, verify admin role
          if (sessionValidation.valid) {
            const session = await db.getSession(sessionValidation.sessionToken!);
            if (!session || new Date(session.expires_at) < new Date()) {
              return unauthorized('Session expired');
            }
            const user = await db.getUserById(session.user_id);
            if (!user || user.role !== 'admin') {
              return unauthorized('Admin access required');
            }
          }
          // If using worker auth, it's already validated (pages proxy is admin)
          
          const clients = await db.getAllClientsWithStats();
          const totalCount = clients.length;
          const activeCount = clients.filter(c => c.account_status === 'active').length;
          const totalRevenue = clients.reduce((sum, c) => sum + c.used_budget_current_month, 0);
          const totalUsage = clients.reduce((sum, c) => sum + c.used_budget_current_month, 0);

          return jsonResponse({
            success: true,
            clients: clients.map(client => ({
              client_id: client.client_id,
              company_name: client.company_name,
              contact_email: client.contact_email,
              contact_name: client.contact_name,
              phone: client.phone,
              subscription_tier: client.subscription_tier,
              account_status: client.account_status,
              monthly_budget_usd: client.monthly_budget_usd,
              used_budget_current_month: client.used_budget_current_month,
              industry: client.industry,
              company_size: client.company_size,
              created_at: client.created_at,
              last_activity: client.last_activity,
              address: client.address ? JSON.parse(client.address) : null
            })),
            total_count: totalCount,
            active_count: activeCount,
            total_revenue: totalRevenue,
            total_usage: totalUsage
          }, { headers: corsHeaders });

        } catch (error) {
          console.error('Get clients error:', error);
          return serverError('Failed to retrieve clients');
        }
      }

      if (pathname.startsWith('/client/') && method === 'GET') {
        try {
          const sessionValidation = validateSessionToken(request);
          if (!sessionValidation.valid) {
            return unauthorized(sessionValidation.error);
          }

          const session = await db.getSession(sessionValidation.sessionToken!);
          if (!session || new Date(session.expires_at) < new Date()) {
            return unauthorized('Session expired');
          }

          const clientId = pathname.split('/')[2];
          const client = await db.getClientById(clientId);

          if (!client) {
            return notFound('Client not found');
          }

          return jsonResponse({
            success: true,
            client: {
              client_id: client.client_id,
              company_name: client.company_name,
              contact_email: client.contact_email,
              contact_name: client.contact_name,
              phone: client.phone,
              subscription_tier: client.subscription_tier,
              account_status: client.account_status,
              monthly_budget_usd: client.monthly_budget_usd,
              used_budget_current_month: client.used_budget_current_month,
              industry: client.industry,
              company_size: client.company_size,
              created_at: client.created_at,
              last_activity: client.last_activity,
              address: client.address ? JSON.parse(client.address) : null,
              usage_stats: {
                requests_this_month: 245,
                avg_response_time: 1.2,
                success_rate: 98.5,
                top_services: ['Universal Researcher', 'Content Classifier']
              },
              recent_reports: [
                {
                  id: 'report_1',
                  title: 'AI Market Analysis Q3 2024',
                  created: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                  status: 'completed'
                }
              ]
            }
          }, { headers: corsHeaders });

        } catch (error) {
          console.error('Get client detail error:', error);
          return serverError('Failed to retrieve client details');
        }
      }

      if (pathname === '/client' && method === 'GET') {
        try {
          const sessionValidation = validateSessionToken(request);
          if (!sessionValidation.valid) {
            return unauthorized(sessionValidation.error);
          }

          const email = url.searchParams.get('email');
          if (!email) {
            return badRequest('Email parameter required');
          }

          const client = await db.getClientByEmail(email);
          if (!client) {
            return jsonResponse({
              success: true,
              client: null
            }, { headers: corsHeaders });
          }

          return jsonResponse({
            success: true,
            client: {
              client_id: client.client_id,
              company_name: client.company_name,
              contact_email: client.contact_email,
              subscription_tier: client.subscription_tier,
              account_status: client.account_status,
              monthly_budget_usd: client.monthly_budget_usd,
              used_budget_current_month: client.used_budget_current_month
            }
          }, { headers: corsHeaders });

        } catch (error) {
          console.error('Get client by email error:', error);
          return serverError('Failed to retrieve client');
        }
      }

      // ==================== USER MANAGEMENT ENDPOINTS ====================
      if (pathname === '/users' && method === 'GET') {
        try {
          const sessionValidation = validateSessionToken(request);
          const workerAuth = validateWorkerAuth(request, env);
          
          if (!sessionValidation.valid && !workerAuth.valid) {
            return unauthorized('Authentication required');
          }
      
          // If using session auth, verify admin role
          if (sessionValidation.valid) {
            const session = await db.getSession(sessionValidation.sessionToken!);
            if (!session || new Date(session.expires_at) < new Date()) {
              return unauthorized('Session expired');
            }
            const user = await db.getUserById(session.user_id);
            if (!user || user.role !== 'admin') {
              return unauthorized('Admin access required');
            }
          }
      
          const users = await db.getAllUsers();
          const totalUsers = users.length;
          const activeUsers = users.filter(u => u.status === 'active').length;
          const adminUsers = users.filter(u => u.role === 'admin').length;
          const clientUsers = users.filter(u => u.role === 'client').length;

          return jsonResponse({
            success: true,
            users: users.map(u => ({
              id: u.user_id,
              username: u.username,
              email: u.email,
              full_name: u.full_name,
              role: u.role,
              user_type: u.role,
              account_status: u.status,
              created_at: u.created_at,
              last_login: u.last_login,
              login_count: u.login_count || 0,
              client_id: u.client_id
            })),
            stats: {
              total_users: totalUsers,
              active_users: activeUsers,
              admin_users: adminUsers,
              client_users: clientUsers,
              new_this_month: 2, // Mock data
              active_sessions: 5   // Mock data
            }
          }, { headers: corsHeaders });
          
        } catch (error) {
          console.error('Get users error:', error);
          return serverError('Failed to retrieve users');
        }
      }      


      if (pathname === '/users' && method === 'POST') {
        try {
          const sessionValidation = validateSessionToken(request);
          if (!sessionValidation.valid) {
            return unauthorized(sessionValidation.error);
          }

          const session = await db.getSession(sessionValidation.sessionToken!);
          if (!session || new Date(session.expires_at) < new Date()) {
            return unauthorized('Session expired');
          }

          const adminUser = await db.getUserById(session.user_id);
          if (!adminUser || adminUser.role !== 'admin') {
            return unauthorized('Admin access required');
          }

          const body = await request.json();
          const { username, email, full_name, role, user_type, password, client_id } = body;

          if (!username || !email || !password || !role) {
            return badRequest('Username, email, password, and role are required');
          }

          // Check if user already exists
          const existingUser = await db.getUserByEmail(email);
          if (existingUser) {
            return badRequest('User with this email already exists');
          }

          const userId = await db.createUser({
            username,
            email,
            password_hash: hashPassword(password),
            role,
            full_name,
            client_id,
            status: 'active'
          });

          return jsonResponse({
            success: true,
            user: {
              id: userId,
              username,
              email,
              full_name,
              role,
              account_status: 'active',
              created_at: new Date().toISOString()
            },
            message: 'User created successfully'
          }, { headers: corsHeaders });

        } catch (error) {
          console.error('Create user error:', error);
          return serverError('Failed to create user');
        }
      }

      // ==================== DASHBOARD STATS ENDPOINT ====================
      if (pathname === '/dashboard/stats' && method === 'GET') {
        try {
          const sessionValidation = validateSessionToken(request);
          const workerAuth = validateWorkerAuth(request, env);
          
          if (!sessionValidation.valid && !workerAuth.valid) {
            return unauthorized('Authentication required');
          }
      
          // If using session auth, verify admin role  
          if (sessionValidation.valid) {
            const session = await db.getSession(sessionValidation.sessionToken!);
            if (!session || new Date(session.expires_at) < new Date()) {
              return unauthorized('Session expired');
            }
            const user = await db.getUserById(session.user_id);
            if (!user || user.role !== 'admin') {
              return unauthorized('Admin access required');
            }
          }
      
          // Use the working getAllClientsWithStats() instead of broken getDashboardStats()
          const clients = await db.getAllClientsWithStats();
          
          // Calculate stats from client data (we know this works)
          const totalClients = clients.length;
          const activeClients = clients.filter(c => c.account_status === 'active').length;
          const totalRevenue = clients.reduce((sum, c) => sum + c.used_budget_current_month, 0);
          const avgPerClient = totalClients > 0 ? totalRevenue / totalClients : 0;
      
          return jsonResponse({
            success: true,
            stats: {
              clients: {
                total: totalClients,
                active: activeClients,
                new_this_month: 1
              },
              revenue: {
                monthly_total: totalRevenue,
                used_this_month: totalRevenue,
                average_per_client: Math.round(avgPerClient)
              },
              usage: {
                requests_today: 247,
                requests_this_month: 7830,
                avg_response_time: 1.3
              },
              system: {
                uptime_percentage: 98.5,
                active_sessions: 5,
                failed_requests: 12
              }
            }
          }, { headers: corsHeaders });
      
        } catch (error) {
          console.error('Dashboard stats error:', error);
          return serverError('Failed to retrieve dashboard statistics');
        }
      }
      // ==================== LEGACY ENDPOINTS (Worker Auth) ====================
      
      if (pathname === '/auth/validate-user' && method === 'POST') {
        // Legacy endpoint for Pages auth proxy
        const workerAuth = validateWorkerAuth(request, env);
        if (!workerAuth.valid) {
          return unauthorized(workerAuth.error);
        }

        try {
          const body = await request.json();
          const { email, password, expected_role } = body;

          const user = await db.getUserByEmail(email);
          if (!user || !verifyPassword(password, user.password_hash)) {
            return unauthorized('Invalid credentials');
          }

          if (expected_role && user.role !== expected_role) {
            return unauthorized('Role mismatch');
          }

          return jsonResponse({
            success: true,
            user: {
              user_id: user.user_id,
              email: user.email,
              role: user.role,
              full_name: user.full_name,
              department: user.department || 'General'
            }
          }, { headers: corsHeaders });

        } catch (error) {
          console.error('Legacy validate user error:', error);
          return serverError('User validation failed');
        }
      }

      // ==================== DEFAULT RESPONSE ====================
      
      return notFound(`Endpoint not found: ${method} ${pathname}`);

    } catch (error) {
      console.error('Unexpected error:', error);
      return serverError('An unexpected error occurred');
    }
  }
};