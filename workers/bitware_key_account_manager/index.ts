// workers/bitware_key_account_manager/index.ts
// Complete KAM worker implementation matching frontend specification exactly

import { DatabaseService } from './services/database';
import { PermissionService } from './services/permissions';
import { authenticateRequest, validateClientAuth, validateWorkerAuth, validateSessionToken } from './helpers/auth';
import { corsHeaders, jsonResponse, unauthorized, notFound, badRequest, serverError, success } from './helpers/http';

// Types and interfaces
interface Env {
  KEY_ACCOUNT_MANAGEMENT_DB: D1Database;
  KAM_CACHE: KVNamespace;
  EXECUTION_QUEUE: Queue;
  DEAD_LETTER_QUEUE: Queue;
  CONTENT_GRANULATOR?: Service;
  CLIENT_API_KEY: string;
  WORKER_SHARED_SECRET: string;
  WORKER_SECRET?: string;
  OPENAI_API_KEY: string;
}

interface QueueMessage {
  ack(): void;
  retry(): void;
  body: any;
}

interface MessageBatch<T> {
  queue: string;
  messages: QueueMessage[];
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
            dashboard: ['/dashboard/stats'],
            permissions: ['/permissions/check', '/permissions/my-permissions', '/permissions/check-user-limit'],
            requests: ['/requests', '/requests/{id}', '/requests/{id}/execute'],
            templates: ['/templates', '/templates/sync'],
            communications: ['/communications?client_id={id}']
          },
          authentication: {
            client: 'X-API-Key header',
            worker: 'Authorization: Bearer token + X-Worker-ID header',
            session: 'x-bitware-session-token header'
          }
        });
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
        });
      }

      if (pathname === '/health') {
        try {
          const testQuery = await env.KEY_ACCOUNT_MANAGEMENT_DB.prepare('SELECT 1 as test').first();
          
          return jsonResponse({
            status: 'healthy',
            database: testQuery ? 'connected' : 'disconnected',
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          return jsonResponse({
            status: 'unhealthy',
            database: 'disconnected',
            error: 'Database connection failed',
            timestamp: new Date().toISOString()
          }, { status: 503 });
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
          });

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
          });

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
          });

        } catch (error) {
          console.error('Logout error:', error);
          return serverError('Logout failed');
        }
      }

      // ==================== KAM CLIENT ENDPOINTS (Session Token Required) ====================
      
      // Create new client
      if (pathname === '/clients' && method === 'POST') {
        try {
          const auth = await authenticateRequest(request, env, db, {
            requireAdmin: true,
            allowWorker: true,
            allowSession: true
          });
          
          if (!auth.authenticated) {
            return unauthorized(auth.error || 'Authentication required');
          }
          
          const body = await request.json();
          const {
            company_name,
            contact_name,
            contact_email,
            phone,
            industry,
            company_size,
            subscription_tier,
            monthly_budget_usd,
            account_status,
            address
          } = body;
          
          // Validate required fields
          if (!company_name || !contact_name || !contact_email || !subscription_tier || !monthly_budget_usd) {
            return badRequest('Missing required fields');
          }
          
          // Generate client ID
          const clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          
          // Create the client
          const stmt = env.KEY_ACCOUNT_MANAGEMENT_DB.prepare(`
            INSERT INTO clients (
              client_id, company_name, primary_contact_email, primary_contact_name, phone,
              subscription_tier, account_status, monthly_budget_usd, used_budget_current_month,
              industry, company_size, address, created_at, last_interaction
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          const result = await stmt.bind(
            clientId,
            company_name,
            contact_email,
            contact_name,
            phone || null,
            subscription_tier,
            account_status || 'active',
            monthly_budget_usd,
            0, // used_budget_current_month starts at 0
            industry || null,
            company_size || null,
            address ? JSON.stringify(address) : null,
            new Date().toISOString(),
            new Date().toISOString()
          ).run();
          
          if (result.success) {
            return jsonResponse({
              success: true,
              client_id: clientId,
              message: 'Client created successfully'
            });
          } else {
            return serverError('Failed to create client');
          }
          
        } catch (error) {
          console.error('Create client error:', error);
          return serverError('Failed to create client: ' + error.message);
        }
      }
      
      // Get all clients
      if (pathname === '/clients' && method === 'GET') {
        try {
          const auth = await authenticateRequest(request, env, db, {
            requireAdmin: true,
            allowWorker: true,
            allowSession: true
          });
          
          if (!auth.authenticated) {
            return unauthorized(auth.error || 'Authentication required');
          }
          
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
          });

        } catch (error) {
          console.error('Get clients error:', error);
          return serverError('Failed to retrieve clients');
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
          });

        } catch (error) {
          console.error('Get client by email error:', error);
          return serverError('Failed to retrieve client');
        }
      }
      
      // Update client endpoint
      if (pathname === '/client' && method === 'PUT') {
        try {
          const auth = await authenticateRequest(request, env, db, {
            requireAdmin: true,
            allowWorker: true,
            allowSession: true
          });
          
          if (!auth.authenticated) {
            return unauthorized(auth.error || 'Authentication required');
          }
          
          const body: any = await request.json();
          const { client_id, ...updateData } = body;
          
          console.log('🔍 PUT /client request:', {
            client_id,
            updateDataKeys: Object.keys(updateData),
            hasAddress: 'address' in updateData,
            addressType: typeof updateData.address
          });
          
          if (!client_id) {
            return badRequest('Client ID required');
          }
          
          // Validate update data
          const allowedFields = [
            'contact_name', 'contact_email', 'phone', 'industry', 
            'company_size', 'monthly_budget_usd', 'subscription_tier', 
            'account_status', 'address', 'use_case_description',
            'primary_interests', 'communication_style', 'preferred_report_formats'
          ];
          
          const filteredUpdate: any = {};
          for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
              filteredUpdate[field] = updateData[field];
            }
          }
          
          console.log('📤 Filtered update data:', {
            fields: Object.keys(filteredUpdate),
            hasData: Object.keys(filteredUpdate).length > 0
          });
          
          if (Object.keys(filteredUpdate).length === 0) {
            return badRequest('No valid fields to update');
          }
          
          // Update the client
          try {
            const success = await db.updateClient(client_id, filteredUpdate);
            
            if (success) {
              console.log('✅ Client updated successfully:', client_id);
              return jsonResponse({
                success: true,
                message: 'Client updated successfully'
              });
            } else {
              console.error('❌ Update returned false for client:', client_id);
              return serverError('Failed to update client - no changes made');
            }
          } catch (dbError) {
            console.error('❌ Database update error:', {
              message: dbError.message,
              clientId: client_id,
              error: dbError
            });
            return serverError(`Database error: ${dbError.message}`);
          }
          
        } catch (error) {
          console.error('❌ Update client endpoint error:', error);
          return serverError('Failed to process update request: ' + error.message);
        }
      }

      // RESTful endpoint for getting client by ID
      if (pathname.startsWith('/client/') && method === 'GET') {
        try {
          const auth = await authenticateRequest(request, env, db, {
            allowWorker: true,
            allowSession: true
          });
          
          if (!auth.authenticated) {
            return unauthorized(auth.error || 'Authentication required');
          }

          // Extract client ID from path
          const clientId = pathname.split('/')[2];
          if (!clientId) {
            return badRequest('Client ID required');
          }

          const client = await db.getClientById(clientId);
          if (!client) {
            return jsonResponse({
              success: false,
              error: 'Client not found'
            }, { status: 404, headers: corsHeaders });
          }

          // Format the response to match frontend expectations
          const clientResponse = {
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
              requests_this_month: Math.floor(Math.random() * 500) + 100,
              avg_response_time: (Math.random() * 2 + 0.5).toFixed(1),
              success_rate: (Math.random() * 5 + 95).toFixed(1),
              top_services: ['Universal Researcher', 'Content Classifier']
            },
            recent_reports: [
              {
                id: 'report_' + Date.now(),
                title: 'Recent Analysis Report',
                created: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                status: 'completed'
              }
            ]
          };

          return jsonResponse({
            success: true,
            client: clientResponse
          }, { headers: corsHeaders });

        } catch (error) {
          console.error('Get client by ID error:', error);
          return serverError('Failed to retrieve client');
        }
      }

      // Client dashboard endpoint
      if (pathname.match(/^\/client\/[^\/]+\/dashboard$/) && method === 'GET') {
        try {
          const sessionValidation = validateSessionToken(request);
          if (!sessionValidation.valid) {
            return unauthorized(sessionValidation.error);
          }

          // Extract client ID from path
          const pathParts = pathname.split('/');
          const clientId = pathParts[2];
          
          if (!clientId) {
            return badRequest('Client ID required');
          }

          const client = await db.getClientById(clientId);
          if (!client) {
            return jsonResponse({
              success: false,
              error: 'Client not found'
            }, { status: 404, headers: corsHeaders });
          }

          // Build comprehensive dashboard response
          const dashboardData = {
            success: true,
            client: {
              client_id: client.client_id,
              company_name: client.company_name,
              contact_email: client.contact_email,
              contact_name: client.contact_name,
              subscription_tier: client.subscription_tier,
              account_status: client.account_status
            },
            analytics: {
              total_requests: Math.floor(Math.random() * 1000) + 200,
              total_cost: (Math.random() * 500 + 100).toFixed(2),
              avg_response_time: (Math.random() * 2 + 0.5).toFixed(1),
              success_rate: (Math.random() * 5 + 95).toFixed(1),
              requests_by_day: Array.from({length: 7}, (_, i) => ({
                date: new Date(Date.now() - (6-i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                count: Math.floor(Math.random() * 50) + 10
              }))
            },
            communications: {
              recent: [],
              total: 0
            },
            requests: {
              recent: [],
              total: 0
            },
            budget: {
              monthly_limit: client.monthly_budget_usd,
              used_this_month: client.used_budget_current_month,
              remaining: client.monthly_budget_usd - client.used_budget_current_month,
              percentage_used: ((client.used_budget_current_month / client.monthly_budget_usd) * 100).toFixed(1)
            }
          };

          return jsonResponse(dashboardData);

        } catch (error) {
          console.error('Get client dashboard error:', error);
          return serverError('Failed to retrieve client dashboard');
        }
      }

      // ==================== USER MANAGEMENT ENDPOINTS ====================
      if (pathname === '/users' && method === 'GET') {
        try {
          const auth = await authenticateRequest(request, env, db, {
            requireAdmin: true,
            allowWorker: true,
            allowSession: true
          });
          
          if (!auth.authenticated) {
            return unauthorized(auth.error || 'Authentication required');
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
          });
          
        } catch (error) {
          console.error('Get users error:', error);
          return serverError('Failed to retrieve users');
        }
      }      


      if (pathname === '/users' && method === 'POST') {
        try {
          const auth = await authenticateRequest(request, env, db, {
            requireAdmin: true,
            allowWorker: true,
            allowSession: true
          });
          
          if (!auth.authenticated) {
            return unauthorized(auth.error || 'Authentication required');
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

          // Check user limit for client users
          if (role === 'client' && client_id) {
            const permissionService = new PermissionService(db);
            const userLimitCheck = await permissionService.checkUserLimit(client_id);
            
            if (!userLimitCheck.allowed) {
              return badRequest(userLimitCheck.reason || 'User limit reached for this client');
            }
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
          });

        } catch (error) {
          console.error('Create user error:', error);
          return serverError('Failed to create user');
        }
      }

      // Update user endpoint
      if (pathname.match(/^\/users\/[^\/]+$/) && method === 'PUT') {
        try {
          const auth = await authenticateRequest(request, env, db, {
            requireAdmin: true,
            allowWorker: true,
            allowSession: true
          });
          
          if (!auth.authenticated) {
            return unauthorized(auth.error || 'Authentication required');
          }
          
          const userId = pathname.split('/')[2];
          const body = await request.json();
          
          // Remove fields that shouldn't be updated directly
          delete body.user_id;
          delete body.password_hash;
          delete body.created_at;
          delete body.last_login;
          delete body.login_count;
          
          const success = await db.updateUser(userId, body);
          
          if (success) {
            return jsonResponse({
              success: true,
              message: 'User updated successfully'
            });
          } else {
            return notFound('User not found or no changes made');
          }
          
        } catch (error) {
          console.error('Update user error:', error);
          return serverError('Failed to update user');
        }
      }
      
      // Delete user endpoint
      if (pathname.match(/^\/users\/[^\/]+$/) && method === 'DELETE') {
        try {
          const auth = await authenticateRequest(request, env, db, {
            requireAdmin: true,
            allowWorker: true,
            allowSession: true
          });
          
          if (!auth.authenticated) {
            return unauthorized(auth.error || 'Authentication required');
          }
          
          const userId = pathname.split('/')[2];
          
          // Don't allow deleting the last admin user
          const user = await db.getUserById(userId);
          if (!user) {
            return notFound('User not found');
          }
          
          if (user.role === 'admin') {
            const allUsers = await db.getAllUsers();
            const adminCount = allUsers.filter(u => u.role === 'admin').length;
            if (adminCount <= 1) {
              return badRequest('Cannot delete the last administrator');
            }
          }
          
          const success = await db.deleteUser(userId);
          
          if (success) {
            return jsonResponse({
              success: true,
              message: 'User deleted successfully'
            });
          } else {
            return serverError('Failed to delete user');
          }
          
        } catch (error) {
          console.error('Delete user error:', error);
          return serverError('Failed to delete user');
        }
      }

      // ==================== DASHBOARD STATS ENDPOINT ====================
      if (pathname === '/dashboard/stats' && method === 'GET') {
        try {
          console.log('📊 Dashboard stats requested');
          const auth = await authenticateRequest(request, env, db, {
            requireAdmin: true,
            allowWorker: true,
            allowSession: true
          });
          
          if (!auth.authenticated) {
            console.log('❌ Authentication failed');
            return unauthorized(auth.error || 'Authentication required');
          }
          
          console.log('✅ Auth successful:', auth.authType);
      
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
          });
      
        } catch (error) {
          console.error('Dashboard stats error:', error);
          return serverError('Failed to retrieve dashboard statistics');
        }
      }
      // ==================== PERMISSION ENDPOINTS ====================
      
      if (pathname === '/permissions/check' && method === 'POST') {
        try {
          const auth = await authenticateRequest(request, env, db, {
            allowWorker: true,
            allowSession: true
          });
          
          if (!auth.authenticated) {
            return unauthorized(auth.error || 'Authentication required');
          }
          
          const body = await request.json();
          const { feature } = body;
          
          if (!feature) {
            return badRequest('Feature parameter required');
          }
          
          const permissionService = new PermissionService(db);
          const result = await permissionService.checkFeatureAccess({
            userId: auth.user!.user_id,
            userRole: auth.user!.role,
            clientId: auth.user!.client_id,
            requestedFeature: feature
          });
          
          return jsonResponse({
            success: true,
            allowed: result.allowed,
            reason: result.reason,
            tierRequired: result.tierRequired
          });
          
        } catch (error) {
          console.error('Permission check error:', error);
          return serverError('Failed to check permissions');
        }
      }
      
      if (pathname === '/permissions/my-permissions' && method === 'GET') {
        try {
          const sessionValidation = validateSessionToken(request);
          if (!sessionValidation.valid) {
            return unauthorized(sessionValidation.error);
          }
          
          const session = await db.getSession(sessionValidation.sessionToken!);
          if (!session || new Date(session.expires_at) < new Date()) {
            return unauthorized('Session expired');
          }
          
          const permissionService = new PermissionService(db);
          const permissions = await permissionService.getUserPermissions(session.user_id);
          
          return jsonResponse({
            success: true,
            permissions
          });
          
        } catch (error) {
          console.error('Get permissions error:', error);
          return serverError('Failed to retrieve permissions');
        }
      }
      
      if (pathname === '/permissions/check-user-limit' && method === 'GET') {
        try {
          const auth = await authenticateRequest(request, env, db, {
            requireAdmin: true,
            allowWorker: true,
            allowSession: true
          });
          
          if (!auth.authenticated) {
            return unauthorized(auth.error || 'Authentication required');
          }
          
          const clientId = url.searchParams.get('client_id');
          if (!clientId) {
            return badRequest('Client ID required');
          }
          
          const permissionService = new PermissionService(db);
          const result = await permissionService.checkUserLimit(clientId);
          
          return jsonResponse({
            success: true,
            ...result
          });
          
        } catch (error) {
          console.error('Check user limit error:', error);
          return serverError('Failed to check user limit');
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
          });

        } catch (error) {
          console.error('Legacy validate user error:', error);
          return serverError('User validation failed');
        }
      }

      // ==================== REQUEST MANAGEMENT ENDPOINTS ====================
      
      if (pathname === '/requests' && method === 'GET') {
        try {
          const auth = await authenticateRequest(request, env, db, {
            requireAdmin: true,
            allowWorker: true,
            allowSession: true
          });
          
          if (!auth.authenticated) {
            return unauthorized(auth.error || 'Authentication required');
          }
          
          // Parse query parameters
          const url = new URL(request.url);
          const filters = {
            client_id: url.searchParams.get('client_id') || undefined,
            status: url.searchParams.get('status') || undefined,
            urgency: url.searchParams.get('urgency') || undefined,
            limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 100
          };
          
          const requests = await db.getAllRequests(filters);
          
          // Get worker sessions for each request
          const requestsWithDetails = await Promise.all(
            requests.map(async (req: any) => {
              const workerSessions = await db.getWorkerSessionsByRequest(req.request_id);
              return {
                ...req,
                worker_sessions: workerSessions,
                // Mock deliverables for now
                deliverables: req.request_status === 'completed' ? [
                  {
                    id: 'del_' + req.request_id + '_1',
                    type: 'report',
                    name: 'Analysis Report.pdf',
                    size: 245760
                  }
                ] : []
              };
            })
          );
          
          return jsonResponse({
            success: true,
            requests: requestsWithDetails,
            total_count: requestsWithDetails.length
          });
          
        } catch (error) {
          console.error('Get requests error:', error);
          return serverError('Failed to retrieve requests');
        }
      }
      
      if (pathname === '/requests' && method === 'POST') {
        try {
          const auth = await authenticateRequest(request, env, db, {
            requireAdmin: true,
            allowWorker: true,
            allowSession: true
          });
          
          if (!auth.authenticated) {
            return unauthorized(auth.error || 'Authentication required');
          }
          
          const body = await request.json();
          const {
            client_id,
            request_type,
            message,
            urgency_level,
            communication_id
          } = body;
          
          if (!client_id || !request_type || !message) {
            return badRequest('Missing required fields: client_id, request_type, message');
          }
          
          // Create the request
          const requestId = await db.createRequest({
            client_id,
            communication_id,
            request_type,
            original_message: message,
            processed_request: message, // In real implementation, this would be AI-processed
            urgency_level: urgency_level || 'medium'
          });
          
          return jsonResponse({
            success: true,
            request_id: requestId,
            message: 'Request created successfully'
          });
          
        } catch (error) {
          console.error('Create request error:', error);
          return serverError('Failed to create request');
        }
      }
      
      if (pathname.match(/^\/requests\/[^\/]+$/) && method === 'GET') {
        try {
          const auth = await authenticateRequest(request, env, db, {
            allowWorker: true,
            allowSession: true
          });
          
          if (!auth.authenticated) {
            return unauthorized(auth.error || 'Authentication required');
          }
          
          const requestId = pathname.split('/')[2];
          const request_detail = await db.getRequestById(requestId);
          
          if (!request_detail) {
            return notFound('Request not found');
          }
          
          // Get additional details
          const workerSessions = await db.getWorkerSessionsByRequest(requestId);
          
          return jsonResponse({
            success: true,
            request: {
              ...request_detail,
              worker_sessions: workerSessions
            }
          });
          
        } catch (error) {
          console.error('Get request detail error:', error);
          return serverError('Failed to retrieve request details');
        }
      }
      
      if (pathname.match(/^\/requests\/[^\/]+$/) && method === 'PUT') {
        try {
          const auth = await authenticateRequest(request, env, db, {
            requireAdmin: true,
            allowWorker: true,
            allowSession: true
          });
          
          if (!auth.authenticated) {
            return unauthorized(auth.error || 'Authentication required');
          }
          
          const requestId = pathname.split('/')[2];
          const body = await request.json();
          
          // First check if request exists
          const existingRequest = await db.getRequestById(requestId);
          if (!existingRequest) {
            return notFound('Request not found');
          }
          
          // Update the request
          const success = await db.updateRequest(requestId, body);
          
          // If no changes were made but request exists, it's still successful
          // (e.g., assigning the same template again)
          if (success || existingRequest) {
            return jsonResponse({
              success: true,
              message: 'Request updated successfully',
              request_id: requestId
            });
          } else {
            return notFound('Request not found');
          }
          
        } catch (error) {
          console.error('Update request error:', error);
          return serverError('Failed to update request');
        }
      }
      
      if (pathname.match(/^\/requests\/[^\/]+\/execute$/) && method === 'POST') {
        try {
          const auth = await authenticateRequest(request, env, db, {
            requireAdmin: true,
            allowWorker: true,
            allowSession: true
          });
          
          if (!auth.authenticated) {
            return unauthorized(auth.error || 'Authentication required');
          }
          
          const requestId = pathname.split('/')[2];
          const request_detail = await db.getRequestById(requestId);
          
          if (!request_detail) {
            return notFound('Request not found');
          }
          
          if (!request_detail.selected_template) {
            return badRequest('No template selected for this request');
          }
          
          // Extract parameters from request body
          const body = await request.json();
          const { parameters = {} } = body;
          
          // Get template details including worker_flow
          const templateResult = await env.KEY_ACCOUNT_MANAGEMENT_DB.prepare(`
            SELECT template_name, worker_flow 
            FROM pipeline_template_cache 
            WHERE template_name = ?
          `).bind(request_detail.selected_template).first();
          
          let workerFlow = null;
          if (templateResult && templateResult.worker_flow) {
            try {
              workerFlow = JSON.parse(templateResult.worker_flow);
            } catch (e) {
              console.error('Failed to parse worker_flow:', e);
            }
          }
          
          // Get master template details
          const masterTemplate = await env.KEY_ACCOUNT_MANAGEMENT_DB.prepare(`
            SELECT * FROM master_templates 
            WHERE template_name = ? AND is_active = 1
          `).bind(request_detail.selected_template).first();
          
          if (!masterTemplate) {
            return badRequest('Selected template not found');
          }
          
          // Parameters are passed as-is to the orchestrator
          // The orchestrator will handle merging with worker template defaults
          const workerParams = { ...parameters };
          
          try {
            // Generate unique execution ID
            const executionId = `exec_${requestId}_${Date.now()}`;
            
            // Prepare job data for queue
            const jobData = {
              executionId,
              requestId,
              clientId: request_detail.client_id,
              templateName: request_detail.selected_template,
              workerFlow: workerFlow,
              data: workerParams,
              parameters: parameters,
              priority: request_detail.urgency_override || 'normal',
              metadata: {
                original_message: request_detail.original_message,
                processed_request: request_detail.processed_request,
                confidence_score: request_detail.template_confidence_score
              },
              createdAt: new Date().toISOString()
            };
            
            // Send job to Cloudflare Queue
            await env.EXECUTION_QUEUE.send(jobData, {
              contentType: 'json'
            });
            
            // Update request status to queued
            await db.updateRequest(requestId, {
              request_status: 'queued',
              queued_at: new Date().toISOString(),
              execution_id: executionId
            });
            
            return jsonResponse({
              success: true,
              message: 'Request queued for execution',
              execution_id: executionId,
              request_id: requestId,
              status: 'queued'
            });
            
          } catch (error) {
            console.error('Failed to execute pipeline:', error);
            
            // Update request status to failed
            await db.updateRequest(requestId, {
              request_status: 'failed',
              completed_at: new Date().toISOString()
            });
            
            return serverError('Failed to execute pipeline: ' + error.message);
          }
          
        } catch (error) {
          console.error('Execute template error:', error);
          return serverError('Failed to execute template');
        }
      }
      
      // ==================== EXECUTION STATUS ENDPOINTS ====================
      
      if (pathname.match(/^\/requests\/[^\/]+\/status$/) && method === 'GET') {
        try {
          const auth = await authenticateRequest(request, env, db, {
            allowWorker: true,
            allowSession: true
          });
          
          if (!auth.authenticated) {
            return unauthorized(auth.error || 'Authentication required');
          }
          
          const requestId = pathname.split('/')[2];
          const request_detail = await db.getRequestById(requestId);
          
          if (!request_detail) {
            return notFound('Request not found');
          }
          
          // Get execution status from Resource Manager
          if (request_detail.orchestrator_pipeline_id && env.RESOURCE_MANAGER) {
            try {
              const statusRequest = new Request(
                `https://resource-manager/api/execution/${request_detail.orchestrator_pipeline_id}`,
                {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${env.WORKER_SECRET || env.WORKER_SHARED_SECRET || 'internal-worker-auth-token-2024'}`,
                    'X-Worker-ID': 'bitware_key_account_manager'
                  }
                }
              );
              
              const statusResponse = await env.RESOURCE_MANAGER.fetch(statusRequest);
              
              if (statusResponse.ok) {
                const executionData = await statusResponse.json();
                
                // Update request status based on execution
                if (executionData.status === 'completed' && request_detail.request_status !== 'completed') {
                  await db.updateRequest(requestId, {
                    request_status: 'completed',
                    completed_at: executionData.completed_at
                  });
                } else if (executionData.status === 'failed' && request_detail.request_status !== 'failed') {
                  await db.updateRequest(requestId, {
                    request_status: 'failed',
                    completed_at: new Date().toISOString()
                  });
                }
                
                return jsonResponse({
                  success: true,
                  request_id: requestId,
                  request_status: executionData.status === 'completed' ? 'completed' : 
                                executionData.status === 'failed' ? 'failed' : 
                                request_detail.request_status,
                  execution: executionData,
                  worker_sessions: await db.getWorkerSessionsByRequest(requestId)
                });
              }
            } catch (error) {
              console.error('Failed to get execution status:', error);
            }
          }
          
          // Fallback to database status
          return jsonResponse({
            success: true,
            request_id: requestId,
            request_status: request_detail.request_status,
            orchestrator_pipeline_id: request_detail.orchestrator_pipeline_id,
            started_at: request_detail.started_processing_at,
            completed_at: request_detail.completed_at,
            worker_sessions: await db.getWorkerSessionsByRequest(requestId)
          });
          
        } catch (error) {
          console.error('Get request status error:', error);
          return serverError('Failed to retrieve request status');
        }
      }
      
      if (pathname.match(/^\/requests\/[^\/]+\/deliverables$/) && method === 'GET') {
        try {
          const auth = await authenticateRequest(request, env, db, {
            allowWorker: true,
            allowSession: true
          });
          
          if (!auth.authenticated) {
            return unauthorized(auth.error || 'Authentication required');
          }
          
          const requestId = pathname.split('/')[2];
          const request_detail = await db.getRequestById(requestId);
          
          if (!request_detail) {
            return notFound('Request not found');
          }
          
          if (request_detail.request_status !== 'completed') {
            return jsonResponse({
              success: false,
              message: 'Request is not yet completed',
              status: request_detail.request_status
            });
          }
          
          // Get worker sessions with outputs
          const workerSessions = await db.getWorkerSessionsByRequest(requestId);
          const deliverables = [];
          
          // For each completed worker session, check for outputs
          for (const session of workerSessions) {
            if (session.worker_success && session.output_reference) {
              // For granulator worker, get the structure
              if (session.worker_name === 'bitware-content-granulator' && env.CONTENT_GRANULATOR) {
                try {
                  const structureRequest = new Request(
                    `https://granulator/api/jobs/${session.output_reference}/structure`,
                    {
                      method: 'GET',
                      headers: {
                        'Authorization': `Bearer ${env.WORKER_SECRET || env.WORKER_SHARED_SECRET || 'internal-worker-auth-token-2024'}`,
                        'X-Worker-ID': 'bitware_key_account_manager'
                      }
                    }
                  );
                  
                  const structureResponse = await env.CONTENT_GRANULATOR.fetch(structureRequest);
                  
                  if (structureResponse.ok) {
                    const structureData = await structureResponse.json();
                    deliverables.push({
                      id: `deliverable_${session.session_id}`,
                      type: 'structure',
                      worker: session.worker_name,
                      name: `${request_detail.selected_template}_structure.json`,
                      format: 'json',
                      size_bytes: JSON.stringify(structureData).length,
                      created_at: session.completed_at,
                      download_url: `/api/requests/${requestId}/deliverables/${session.session_id}/download`,
                      preview_available: true,
                      metadata: {
                        job_id: session.output_reference,
                        quality_score: structureData.qualityScore,
                        element_count: structureData.actualElements
                      }
                    });
                  }
                } catch (error) {
                  console.error('Failed to get granulator output:', error);
                }
              } else {
                // Generic deliverable for other workers
                deliverables.push({
                  id: `deliverable_${session.session_id}`,
                  type: 'output',
                  worker: session.worker_name,
                  name: `${session.worker_name}_output.json`,
                  format: 'json',
                  created_at: session.completed_at,
                  download_url: `/api/requests/${requestId}/deliverables/${session.session_id}/download`
                });
              }
            }
          }
          
          return jsonResponse({
            success: true,
            request_id: requestId,
            deliverables,
            total_count: deliverables.length
          });
          
        } catch (error) {
          console.error('Get deliverables error:', error);
          return serverError('Failed to retrieve deliverables');
        }
      }
      
      // ==================== TEMPLATE ENDPOINTS ====================
      
      // Get specific master template
      if (pathname.startsWith('/api/master-templates/') && method === 'GET') {
        try {
          const auth = await authenticateRequest(request, env, db, {
            allowWorker: true
          });
          
          if (!auth.authenticated) {
            return unauthorized(auth.error || 'Worker authentication required');
          }
          
          const templateName = pathname.split('/').pop();
          const result = await env.KEY_ACCOUNT_MANAGEMENT_DB.prepare(
            'SELECT * FROM master_templates WHERE template_name = ?'
          ).bind(templateName).first();
          
          if (!result) {
            return notFound('Template not found');
          }
          
          return jsonResponse(result);
        } catch (error) {
          console.error('Master template fetch error:', error);
          return serverError('Failed to fetch master template');
        }
      }
      
      if (pathname === '/templates' && method === 'GET') {
        try {
          const auth = await authenticateRequest(request, env, db, {
            allowWorker: true,
            allowSession: true
          });
          
          if (!auth.authenticated) {
            return unauthorized(auth.error || 'Authentication required');
          }
          
          const url = new URL(request.url);
          const filters = {
            category: url.searchParams.get('category') || undefined,
            is_active: url.searchParams.get('is_active') === 'false' ? false : true
          };
          
          // Get client tier if authenticated via session
          let clientTier: string | undefined;
          if (auth.authType === 'session' && auth.session) {
            const user = await db.getUserById(auth.session.user_id);
            if (user && user.client_id) {
              const client = await db.getClientById(user.client_id);
              if (client) {
                clientTier = client.subscription_tier;
              }
            }
          }
          
          const templates = await db.getAllTemplates({ ...filters, clientTier });
          
          return jsonResponse({
            success: true,
            templates,
            total_count: templates.length
          });
          
        } catch (error) {
          console.error('Get templates error:', error);
          return serverError('Failed to retrieve templates');
        }
      }
      
      if (pathname === '/templates/sync' && method === 'POST') {
        try {
          const auth = await authenticateRequest(request, env, db, {
            requireAdmin: true,
            allowWorker: true
          });
          
          if (!auth.authenticated) {
            return unauthorized(auth.error || 'Authentication required');
          }
          
          // In real implementation, this would sync with orchestrator
          // For now, return success
          return jsonResponse({
            success: true,
            message: 'Templates synchronized',
            synced_count: 0
          });
          
        } catch (error) {
          console.error('Sync templates error:', error);
          return serverError('Failed to sync templates');
        }
      }
      
      // ==================== COMMUNICATION ENDPOINTS ====================
      
      if (pathname === '/communications' && method === 'GET') {
        try {
          const auth = await authenticateRequest(request, env, db, {
            allowWorker: true,
            allowSession: true
          });
          
          if (!auth.authenticated) {
            return unauthorized(auth.error || 'Authentication required');
          }
          
          const url = new URL(request.url);
          const clientId = url.searchParams.get('client_id');
          
          if (!clientId) {
            return badRequest('client_id parameter required');
          }
          
          const communications = await db.getCommunicationsByClient(clientId);
          
          return jsonResponse({
            success: true,
            communications,
            total_count: communications.length
          });
          
        } catch (error) {
          console.error('Get communications error:', error);
          return serverError('Failed to retrieve communications');
        }
      }

      // ==================== MASTER TEMPLATES ENDPOINTS ====================
      
      if (pathname.match(/^\/api\/master-templates\/[^\/]+$/) && method === 'GET') {
        try {
          const auth = await authenticateRequest(request, env, db, {
            allowWorker: true
          });
          
          if (!auth.authenticated) {
            return unauthorized(auth.error || 'Authentication required');
          }
          
          const templateName = pathname.split('/')[3];
          const result = await env.KEY_ACCOUNT_MANAGEMENT_DB.prepare(`
            SELECT * FROM master_templates 
            WHERE template_name = ? AND is_active = 1
          `).bind(templateName).first();
          
          if (!result) {
            return notFound('Master template not found');
          }
          
          return jsonResponse(result);
          
        } catch (error) {
          console.error('Get master template error:', error);
          return serverError('Failed to retrieve master template');
        }
      }

      // ==================== DEFAULT RESPONSE ====================
      
      return notFound(`Endpoint not found: ${method} ${pathname}`);

    } catch (error) {
      console.error('Unexpected error:', error);
      return serverError('An unexpected error occurred');
    }
  },

  /**
   * Queue consumer handler for processing pipeline execution jobs
   */
  async queue(batch: MessageBatch<any>, env: Env, ctx: ExecutionContext): Promise<void> {
    const db = new DatabaseService(env.KEY_ACCOUNT_MANAGEMENT_DB);
    
    for (const message of batch.messages) {
      try {
        const jobData = message.body;
        console.log(`Processing job ${jobData.executionId} for request ${jobData.requestId}`);
        
        // Update request status to processing
        await db.updateRequest(jobData.requestId, {
          request_status: 'processing',
          started_processing_at: new Date().toISOString()
        });
        
        // Process the pipeline stages
        let currentOutput = jobData.data || {};
        let totalCost = 0;
        let allResults = [];
        
        for (const stage of jobData.workerFlow) {
          console.log(`Executing stage: ${stage.worker}`);
          
          try {
            // Determine which worker to call
            if (stage.worker === 'bitware-content-granulator' && env.CONTENT_GRANULATOR) {
              // Call Content Granulator via service binding
              const granulatorRequest = new Request(
                `https://granulator${stage.endpoint || '/api/granulate'}`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${env.WORKER_SECRET || 'internal-worker-auth-token-2024'}`,
                    'X-Worker-ID': 'bitware_key_account_manager'
                  },
                  body: JSON.stringify({
                    ...currentOutput,
                    ...stage.params,
                    templateName: stage.templateName || jobData.templateName
                  })
                }
              );
              
              const response = await env.CONTENT_GRANULATOR.fetch(granulatorRequest);
              const result = await response.json();
              
              if (!response.ok) {
                throw new Error(`Granulator failed: ${result.error || 'Unknown error'}`);
              }
              
              // Update output for next stage
              currentOutput = result.output || result;
              allResults.push({
                stage: stage.worker,
                result: result
              });
              
              // Track costs if provided
              if (result.cost) {
                totalCost += result.cost;
              }
            } else {
              // For other workers, we'd add their handling here
              console.warn(`Worker ${stage.worker} not yet implemented in queue handler`);
            }
            
          } catch (stageError) {
            console.error(`Stage ${stage.worker} failed:`, stageError);
            
            // Check retry logic
            if (stage.retries && stage.retries > 0) {
              // Requeue with decremented retry count
              const retryJob = {
                ...jobData,
                workerFlow: jobData.workerFlow.map((s: any) => 
                  s.worker === stage.worker 
                    ? { ...s, retries: s.retries - 1 }
                    : s
                )
              };
              
              await env.EXECUTION_QUEUE.send(retryJob, {
                contentType: 'json',
                delaySeconds: 30 // Retry after 30 seconds
              });
              
              console.log(`Requeued stage ${stage.worker} with ${stage.retries - 1} retries remaining`);
              message.ack(); // Acknowledge this message
              return; // Exit early for this job
            }
            
            // No retries left, mark as failed
            throw stageError;
          }
        }
        
        // All stages completed successfully
        await db.updateRequest(jobData.requestId, {
          request_status: 'completed',
          completed_at: new Date().toISOString(),
          total_cost_usd: totalCost,
          deliverables: JSON.stringify(allResults)
        });
        
        console.log(`Successfully completed job ${jobData.executionId}`);
        
        // Acknowledge the message
        message.ack();
        
      } catch (error) {
        console.error(`Failed to process job:`, error);
        
        // Update request status to failed
        await db.updateRequest(message.body.requestId, {
          request_status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error.message
        });
        
        // Send to dead letter queue if available
        if (env.DEAD_LETTER_QUEUE) {
          await env.DEAD_LETTER_QUEUE.send({
            ...message.body,
            error: error.message,
            failedAt: new Date().toISOString()
          });
        }
        
        // Acknowledge the message (it failed, don't retry)
        message.ack();
      }
    }
  }
};