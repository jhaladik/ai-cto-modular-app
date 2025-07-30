// handlers/admin-ops.ts
// Admin endpoint functions for KAM worker

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

// ==================== ADMIN CLIENT LIST ====================
export async function handleAdminClients(
  request: Request, 
  env: any, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const status = url.searchParams.get('status');

    const db = new DatabaseService(env.KEY_ACCOUNT_MANAGEMENT_DB);
    const clients = await db.getAllClients(limit);

    // Filter by status if provided
    let filteredClients = clients;
    if (status) {
      filteredClients = clients.filter(client => client.account_status === status);
    }

    // Calculate summary stats
    const totalBudget = filteredClients.reduce((sum, client) => sum + client.monthly_budget_usd, 0);
    const totalUsed = filteredClients.reduce((sum, client) => sum + client.used_budget_current_month, 0);

    return jsonResponse({
      success: true,
      clients: filteredClients,
      summary: {
        total_count: filteredClients.length,
        total_monthly_budget: totalBudget,
        total_used_budget: totalUsed,
        budget_utilization: totalBudget > 0 ? (totalUsed / totalBudget) * 100 : 0
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Admin clients error:', error);
    return errorResponse('Failed to retrieve clients', 500);
  }
}

// ==================== ENHANCED ADMIN STATS ====================
export async function handleEnhancedAdminStats(
  request: Request, 
  env: any, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const db = new DatabaseService(env.KEY_ACCOUNT_MANAGEMENT_DB);
    const stats = await db.getClientStats();

    // Additional calculations
    const budgetUtilization = stats.avg_budget > 0 ? 
      (stats.total_used_budget / (stats.avg_budget * stats.total_clients)) * 100 : 0;

    const revenue = stats.total_used_budget; // Simplified revenue calculation
    const growthRate = 12.5; // Mock growth rate - in real implementation, calculate from historical data

    return jsonResponse({
      success: true,
      stats: {
        clients: {
          total: stats.total_clients,
          active: stats.active_clients,
          trial: stats.trial_clients,
          conversion_rate: stats.total_clients > 0 ? 
            ((stats.active_clients / stats.total_clients) * 100) : 0
        },
        budget: {
          average_monthly: stats.avg_budget,
          total_allocated: stats.avg_budget * stats.total_clients,
          total_used: stats.total_used_budget,
          utilization_percentage: budgetUtilization
        },
        revenue: {
          current_month: revenue,
          projected_monthly: revenue * 1.15, // Projected growth
          growth_rate: growthRate
        },
        system: {
          health_score: 95, // Mock health score
          response_time_avg: 150, // Mock response time
          uptime: 99.9
        }
      },
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Enhanced admin stats error:', error);
    return errorResponse('Failed to retrieve enhanced statistics', 500);
  }
}

// ==================== SYSTEM STATUS ====================
export async function handleSystemStatus(
  request: Request, 
  env: any, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const db = new DatabaseService(env.KEY_ACCOUNT_MANAGEMENT_DB);
    
    // Test database connectivity
    const activeClients = await db.getActiveClientCount();

    // Mock worker status checks (in real implementation, ping actual workers)
    const workers = [
      { name: 'Orchestrator', status: 'online', response_time: 120, last_check: new Date().toISOString() },
      { name: 'Topic Researcher', status: 'online', response_time: 95, last_check: new Date().toISOString() },
      { name: 'Content Classifier', status: 'online', response_time: 200, last_check: new Date().toISOString() },
      { name: 'Report Builder', status: 'online', response_time: 180, last_check: new Date().toISOString() }
    ];

    const avgResponseTime = workers.reduce((sum, worker) => sum + worker.response_time, 0) / workers.length;
    const allOnline = workers.every(worker => worker.status === 'online');

    return jsonResponse({
      success: true,
      system_status: {
        overall_health: allOnline ? 'healthy' : 'degraded',
        database: {
          status: 'connected',
          active_connections: 1, // Mock connection count
          active_clients: activeClients
        },
        workers: workers,
        performance: {
          avg_response_time: Math.round(avgResponseTime),
          success_rate: 0.94,
          requests_per_minute: 25 // Mock request rate
        },
        last_updated: new Date().toISOString()
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('System status error:', error);
    return errorResponse('Failed to retrieve system status', 500);
  }
}

// ==================== CLIENT OVERVIEW ====================
export async function handleClientOverview(
  request: Request, 
  env: any, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const db = new DatabaseService(env.KEY_ACCOUNT_MANAGEMENT_DB);
    const stats = await db.getClientStats();

    // Calculate additional metrics
    const revenueGrowth = 15.2; // Mock growth percentage
    const satisfactionScore = 4.2; // Mock satisfaction
    const newClientsThisMonth = 2; // Mock new clients

    return jsonResponse({
      success: true,
      overview: {
        totals: {
          total_clients: stats.total_clients,
          active_clients: stats.active_clients,
          revenue_mtd: stats.total_used_budget,
          avg_satisfaction: satisfactionScore
        },
        growth: {
          new_clients_this_month: newClientsThisMonth,
          revenue_growth_percentage: revenueGrowth,
          satisfaction_trend: 'stable'
        },
        top_clients: [
          { name: 'TechCorp Industries', revenue: 450.00, tier: 'enterprise' },
          { name: 'Innovation Labs', revenue: 280.00, tier: 'premium' },
          { name: 'StartupHub', revenue: 150.00, tier: 'standard' }
        ],
        alerts: [
          { type: 'budget_warning', message: '2 clients approaching budget limits', severity: 'medium' },
          { type: 'new_signup', message: '1 new enterprise client this week', severity: 'low' }
        ]
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Client overview error:', error);
    return errorResponse('Failed to retrieve client overview', 500);
  }
}

// ==================== SYNC TEMPLATES ====================
export async function handleSyncTemplates(
  request: Request, 
  env: any, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const db = new DatabaseService(env.KEY_ACCOUNT_MANAGEMENT_DB);

    // Mock template sync (in real implementation, fetch from orchestrator)
    const mockTemplates = [
      {
        name: 'complete_intelligence_pipeline',
        description: 'Full intelligence report with analysis',
        estimated_cost: 0.25,
        estimated_time: 180,
        capabilities: ['research', 'analysis', 'report_generation']
      },
      {
        name: 'basic_research_pipeline',
        description: 'Basic topic research and source discovery',
        estimated_cost: 0.10,
        estimated_time: 60,
        capabilities: ['research', 'source_discovery']
      },
      {
        name: 'competitive_analysis_pipeline',
        description: 'Focused competitive intelligence analysis',
        estimated_cost: 0.30,
        estimated_time: 240,
        capabilities: ['research', 'competitive_analysis', 'market_intelligence']
      }
    ];

    // Store templates in database
    for (const template of mockTemplates) {
      await db.storeTemplate(template.name, template);
    }

    return jsonResponse({
      success: true,
      message: 'Templates synchronized successfully',
      synced: {
        count: mockTemplates.length,
        templates: mockTemplates.map(t => t.name),
        last_sync: new Date().toISOString()
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Template sync error:', error);
    return errorResponse('Failed to sync templates', 500);
  }
}