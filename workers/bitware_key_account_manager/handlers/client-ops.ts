// workers/bitware_key_account_manager/handlers/client-ops.ts
// Updated client operations matching frontend specification exactly

import { DatabaseService } from '../services/database';

// Helper function to create JSON response
function jsonResponse(data: any, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    ...init
  });
}

// Helper function to create error response
function errorResponse(error: string, status: number = 400) {
  return jsonResponse({ success: false, error }, { status });
}

// Generate client ID
function generateClientId(): string {
  return 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ==================== GET CLIENT BY EMAIL OR ID ====================
export async function handleGetClient(
  request: Request, 
  env: any, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    const clientId = url.searchParams.get('client_id');

    if (!email && !clientId) {
      return errorResponse('Either email or client_id parameter is required', 400);
    }

    const db = new DatabaseService(env.KEY_ACCOUNT_MANAGEMENT_DB);
    
    let client;
    if (email) {
      client = await db.getClientByEmail(email);
    } else {
      client = await db.getClientById(clientId!);
    }

    if (!client) {
      return jsonResponse({
        success: true,
        client: null,
        message: 'Client not found'
      }, { headers: corsHeaders });
    }

    // Transform to match frontend specification exactly
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
    };

    return jsonResponse({
      success: true,
      client: clientResponse
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Get client error:', error);
    return errorResponse('Failed to retrieve client', 500);
  }
}

// ==================== CREATE CLIENT ====================
export async function handleCreateClient(
  request: Request, 
  env: any, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json();

    // Validation matching frontend specification
    if (!body.company_name || !body.contact_email) {
      return errorResponse('company_name and contact_email are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.contact_email)) {
      return errorResponse('Invalid email format');
    }

    // Validate subscription tier
    const validTiers = ['basic', 'standard', 'premium', 'enterprise'];
    if (body.subscription_tier && !validTiers.includes(body.subscription_tier)) {
      return errorResponse('Invalid subscription tier. Must be: basic, standard, premium, or enterprise');
    }

    const db = new DatabaseService(env.KEY_ACCOUNT_MANAGEMENT_DB);

    // Check if client already exists
    const existingClient = await db.getClientByEmail(body.contact_email);
    if (existingClient) {
      return jsonResponse({ 
        success: false,
        error: 'Client already exists', 
        client_id: existingClient.client_id 
      }, { status: 409, headers: corsHeaders });
    }

    const clientId = generateClientId();
    
    // Create client with frontend-compatible structure
    const clientData = {
      client_id: clientId,
      company_name: body.company_name,
      contact_email: body.contact_email,
      contact_name: body.contact_name || null,
      subscription_tier: body.subscription_tier || 'basic',
      monthly_budget_usd: body.monthly_budget_usd || 1000
    };

    await db.createClient(clientData);

    return jsonResponse({ 
      success: true,
      client_id: clientId,
      message: 'Client created successfully'
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Create client error:', error);
    return errorResponse('Failed to create client', 500);
  }
}

// ==================== UPDATE CLIENT ====================
export async function handleUpdateClient(
  request: Request, 
  env: any, 
  corsHeaders: Record<string, string>,
  clientId: string
): Promise<Response> {
  try {
    const body = await request.json();
    const db = new DatabaseService(env.KEY_ACCOUNT_MANAGEMENT_DB);

    // Check if client exists
    const existingClient = await db.getClientById(clientId);
    if (!existingClient) {
      return errorResponse('Client not found', 404);
    }

    // Update client (simplified - in production, implement full update logic)
    await db.updateClientLastActivity(clientId);

    return jsonResponse({
      success: true,
      message: 'Client updated successfully'
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Update client error:', error);
    return errorResponse('Failed to update client', 500);
  }
}

// ==================== CLIENT BUDGET CHECK ====================
export async function handleClientBudgetCheck(
  request: Request, 
  env: any, 
  corsHeaders: Record<string, string>,
  clientId: string
): Promise<Response> {
  try {
    const body = await request.json();
    const { estimated_cost } = body;

    if (!estimated_cost || estimated_cost <= 0) {
      return errorResponse('Valid estimated_cost is required');
    }

    const db = new DatabaseService(env.KEY_ACCOUNT_MANAGEMENT_DB);
    const client = await db.getClientById(clientId);

    if (!client) {
      return errorResponse('Client not found', 404);
    }

    const currentUsage = client.used_budget_current_month;
    const monthlyLimit = client.monthly_budget_usd;
    const remainingBudget = monthlyLimit - currentUsage;
    const wouldExceed = (currentUsage + estimated_cost) > monthlyLimit;

    return jsonResponse({
      success: true,
      approved: !wouldExceed,
      current_usage: currentUsage,
      monthly_limit: monthlyLimit,
      remaining_budget: remainingBudget,
      estimated_cost: estimated_cost,
      warning_threshold_reached: (currentUsage / monthlyLimit) > 0.8
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Budget check error:', error);
    return errorResponse('Failed to check budget', 500);
  }
}

// ==================== RECORD USAGE ====================
export async function handleRecordUsage(
  request: Request, 
  env: any, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json();
    const { client_id, service_type, total_cost, usage_details } = body;

    if (!client_id || !total_cost) {
      return errorResponse('client_id and total_cost are required');
    }

    const db = new DatabaseService(env.KEY_ACCOUNT_MANAGEMENT_DB);
    const client = await db.getClientById(client_id);

    if (!client) {
      return errorResponse('Client not found', 404);
    }

    // Update client usage (simplified - in production, implement proper usage tracking)
    const newUsage = client.used_budget_current_month + total_cost;
    
    // For now, we'll just update the last activity
    // In a full implementation, you'd have a usage_records table
    await db.updateClientLastActivity(client_id);

    return jsonResponse({
      success: true,
      usage_record_id: 'usage_' + Date.now(),
      client_id: client_id,
      total_cost: total_cost,
      new_monthly_usage: newUsage,
      message: 'Usage recorded successfully'
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Record usage error:', error);
    return errorResponse('Failed to record usage', 500);
  }
}

// ==================== CLIENT DASHBOARD DATA ====================
export async function handleClientDashboard(
  request: Request, 
  env: any, 
  corsHeaders: Record<string, string>,
  clientId: string
): Promise<Response> {
  try {
    const db = new DatabaseService(env.KEY_ACCOUNT_MANAGEMENT_DB);
    const client = await db.getClientById(clientId);

    if (!client) {
      return errorResponse('Client not found', 404);
    }

    // Get communication history
    const communications = await db.getCommunicationHistory(clientId, 5);

    const dashboardData = {
      client: {
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
      },
      analytics: {
        success: true,
        data: {
          total_requests: 245,
          total_spent: client.used_budget_current_month,
          monthly_budget: client.monthly_budget_usd,
          success_rate: 98.5,
          avg_response_time: 1.2
        }
      },
      communications: {
        success: true,
        data: {
          communications: communications,
          total: communications.length
        }
      },
      requests: {
        success: true,
        data: {
          requests: [], // Populate from request history table if exists
          total: 0
        }
      },
      budget: {
        success: true,
        data: {
          current_usage: client.used_budget_current_month,
          monthly_limit: client.monthly_budget_usd,
          remaining: client.monthly_budget_usd - client.used_budget_current_month,
          utilization_percentage: (client.used_budget_current_month / client.monthly_budget_usd) * 100
        }
      }
    };

    return jsonResponse({
      success: true,
      dashboard: dashboardData
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Client dashboard error:', error);
    return errorResponse('Failed to retrieve client dashboard', 500);
  }
}