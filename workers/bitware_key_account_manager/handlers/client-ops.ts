// handlers/client-ops.ts
// Client CRUD operations for KAM worker

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

// ==================== GET CLIENT ====================
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

    // Get communication history
    const communicationHistory = await db.getCommunicationHistory(client.client_id, 5);

    return jsonResponse({
      success: true,
      client: {
        ...client,
        communication_history: communicationHistory
      }
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

    // Validation
    if (!body.company_name || !body.primary_contact_email) {
      return errorResponse('company_name and primary_contact_email are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.primary_contact_email)) {
      return errorResponse('Invalid email format');
    }

    // Validate subscription tier
    const validTiers = ['basic', 'standard', 'premium', 'enterprise'];
    if (body.subscription_tier && !validTiers.includes(body.subscription_tier)) {
      return errorResponse('Invalid subscription tier. Must be: ' + validTiers.join(', '));
    }

    const db = new DatabaseService(env.KEY_ACCOUNT_MANAGEMENT_DB);

    // Check if client already exists
    const existingClient = await db.getClientByEmail(body.primary_contact_email);
    if (existingClient) {
      return errorResponse('Client with this email already exists', 409);
    }

    // Create new client with all available fields
    const newClient = await db.createClient({
      company_name: body.company_name,
      primary_contact_name: body.primary_contact_name,
      primary_contact_email: body.primary_contact_email,
      phone: body.phone,
      website: body.website,
      subscription_tier: body.subscription_tier || 'standard',
      monthly_budget_usd: body.monthly_budget_usd || 100.0,
      communication_style: body.communication_style || 'professional',
      industry: body.industry,
      company_size: body.company_size,
      use_case_description: body.use_case_description,
      preferred_report_formats: body.preferred_report_formats || '["json", "html"]'
    });

    return jsonResponse({
      success: true,
      client: newClient,
      message: 'Client created successfully'
    }, { 
      status: 201,
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Create client error:', error);
    return errorResponse('Failed to create client', 500);
  }
}

// ==================== UPDATE CLIENT ====================
export async function handleUpdateClient(
  request: Request, 
  env: any, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const clientId = url.pathname.split('/').pop();

    if (!clientId) {
      return errorResponse('Client ID is required');
    }

    const body = await request.json();
    const db = new DatabaseService(env.KEY_ACCOUNT_MANAGEMENT_DB);

    // Check if client exists
    const existingClient = await db.getClientById(clientId);
    if (!existingClient) {
      return errorResponse('Client not found', 404);
    }

    // Update logic would go here - for now, just return success
    // In a full implementation, you'd add an updateClient method to DatabaseService

    return jsonResponse({
      success: true,
      message: 'Client update functionality coming soon',
      client: existingClient
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
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json();
    const { client_id, estimated_cost } = body;

    if (!client_id || !estimated_cost) {
      return errorResponse('client_id and estimated_cost are required');
    }

    const db = new DatabaseService(env.KEY_ACCOUNT_MANAGEMENT_DB);
    const client = await db.getClientById(client_id);

    if (!client) {
      return errorResponse('Client not found', 404);
    }

    const remainingBudget = client.monthly_budget_usd - client.used_budget_current_month;
    const approved = remainingBudget >= estimated_cost;
    const warningThreshold = client.monthly_budget_usd * 0.8;
    const warningReached = client.used_budget_current_month >= warningThreshold;

    return jsonResponse({
      success: true,
      budget_check: {
        approved,
        current_usage: client.used_budget_current_month,
        monthly_limit: client.monthly_budget_usd,
        remaining_budget: remainingBudget,
        estimated_cost,
        warning_threshold_reached: warningReached
      }
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
    const { client_id, cost, service_type, details } = body;

    if (!client_id || !cost) {
      return errorResponse('client_id and cost are required');
    }

    const db = new DatabaseService(env.KEY_ACCOUNT_MANAGEMENT_DB);
    
    // Update client budget
    await db.updateClientBudget(client_id, cost);

    // Get updated client info
    const updatedClient = await db.getClientById(client_id);

    return jsonResponse({
      success: true,
      message: 'Usage recorded successfully',
      usage: {
        cost_recorded: cost,
        service_type: service_type || 'unknown',
        current_usage: updatedClient?.used_budget_current_month || 0,
        remaining_budget: (updatedClient?.monthly_budget_usd || 0) - (updatedClient?.used_budget_current_month || 0)
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Record usage error:', error);
    return errorResponse('Failed to record usage', 500);
  }
}