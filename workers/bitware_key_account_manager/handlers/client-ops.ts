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

// ==================== UPDATE CLIENT (COMPLETE IMPLEMENTATION) ====================
export async function handleUpdateClient(
  request: Request, 
  env: any, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const clientId = pathParts[pathParts.length - 1];

    if (!clientId || clientId === 'client') {
      return errorResponse('Client ID is required in URL path');
    }

    const body = await request.json();
    const db = new DatabaseService(env.KEY_ACCOUNT_MANAGEMENT_DB);

    // Check if client exists
    const existingClient = await db.getClientById(clientId);
    if (!existingClient) {
      return errorResponse('Client not found', 404);
    }

    // Determine user permissions (admin can update more fields)
    const isAdmin = request.headers.get('X-API-Key') === 'external-client-api-key-2024'; // In production, check against admin key list
    
    // Permission-based field filtering FIRST
    const {
      id, client_id, created_at, updated_at, 
      used_budget_current_month, total_lifetime_value,
      last_interaction, 
      ...potentialUpdates
    } = body;

    // If not admin, restrict sensitive fields
    let allowedUpdates;
    if (!isAdmin) {
      const {
        subscription_tier, account_status, monthly_budget_usd,
        satisfaction_score,
        ...clientOnlyUpdates
      } = potentialUpdates;
      allowedUpdates = clientOnlyUpdates;
    } else {
      allowedUpdates = potentialUpdates;
    }

    // Field-level validation (only validate fields being updated)
    const validationErrors: string[] = [];

    // Email validation and uniqueness
    if (allowedUpdates.primary_contact_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(allowedUpdates.primary_contact_email)) {
        validationErrors.push('Invalid email format');
      }
      
      // Check email uniqueness (skip if same as current)
      if (allowedUpdates.primary_contact_email !== existingClient.primary_contact_email) {
        const existingEmailClient = await db.getClientByEmail(allowedUpdates.primary_contact_email);
        if (existingEmailClient) {
          validationErrors.push('Email already in use by another client');
        }
      }
    }

    // Admin-only field validations
    if (isAdmin) {
      // Subscription tier validation
      if (allowedUpdates.subscription_tier) {
        const validTiers = ['basic', 'standard', 'premium', 'enterprise'];
        if (!validTiers.includes(allowedUpdates.subscription_tier)) {
          validationErrors.push(`Invalid subscription tier. Must be: ${validTiers.join(', ')}`);
        }
      }

      // Account status validation with business rules
      if (allowedUpdates.account_status) {
        const validStatuses = ['trial', 'active', 'suspended', 'cancelled'];
        if (!validStatuses.includes(allowedUpdates.account_status)) {
          validationErrors.push(`Invalid account status. Must be: ${validStatuses.join(', ')}`);
        }

        // Business rule: Can't reactivate cancelled accounts directly
        if (existingClient.account_status === 'cancelled' && allowedUpdates.account_status === 'active') {
          validationErrors.push('Cannot reactivate cancelled account directly. Contact support.');
        }

        // Business rule: Can't cancel enterprise accounts via API
        if (existingClient.subscription_tier === 'enterprise' && allowedUpdates.account_status === 'cancelled') {
          validationErrors.push('Enterprise accounts require manual cancellation process');
        }
      }

      // Budget validation (admin only)
      if (allowedUpdates.monthly_budget_usd !== undefined) {
        if (typeof allowedUpdates.monthly_budget_usd !== 'number' || allowedUpdates.monthly_budget_usd < 0) {
          validationErrors.push('Monthly budget must be a positive number');
        }
        if (allowedUpdates.monthly_budget_usd < existingClient.used_budget_current_month) {
          validationErrors.push('Monthly budget cannot be less than current usage');
        }
        if (allowedUpdates.monthly_budget_usd > 10000) {
          validationErrors.push('Monthly budget exceeds maximum allowed limit ($10,000)');
        }
      }

      // Satisfaction score validation (admin only)
      if (allowedUpdates.satisfaction_score !== undefined) {
        if (typeof allowedUpdates.satisfaction_score !== 'number' || 
            allowedUpdates.satisfaction_score < 0 || 
            allowedUpdates.satisfaction_score > 5) {
          validationErrors.push('Satisfaction score must be a number between 0 and 5');
        }
      }
    }

    // Communication style validation (both admin and client)
    if (allowedUpdates.communication_style) {
      const validStyles = ['professional', 'casual', 'technical', 'executive', 'formal'];
      if (!validStyles.includes(allowedUpdates.communication_style)) {
        validationErrors.push(`Invalid communication style. Must be: ${validStyles.join(', ')}`);
      }
    }

    // JSON field validation
    if (allowedUpdates.preferred_report_formats) {
      try {
        const formats = JSON.parse(allowedUpdates.preferred_report_formats);
        if (!Array.isArray(formats)) {
          validationErrors.push('preferred_report_formats must be a JSON array');
        }
      } catch {
        validationErrors.push('preferred_report_formats must be valid JSON array');
      }
    }

    if (validationErrors.length > 0) {
      return errorResponse(`Validation failed: ${validationErrors.join(', ')}`);
    }

    // Perform update
    const updatedClient = await db.updateClient(clientId, allowedUpdates);

    if (!updatedClient) {
      return errorResponse('Failed to update client - client may have been deleted', 404);
    }

    return jsonResponse({
      success: true,
      client: updatedClient,
      message: 'Client updated successfully',
      updated_fields: Object.keys(allowedUpdates)
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Update client error:', error);
    
    if (error.message === 'No valid fields provided for update') {
      return errorResponse('No valid fields provided for update', 400);
    }
    
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