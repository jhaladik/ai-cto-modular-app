import { Env, AuthenticatedRequest } from '../types';
import { DatabaseService } from '../services/database';
import { jsonResponse, badRequest, notFound, serverError, unauthorized } from '../helpers/http';
import { requireAuth } from '../helpers/auth';

export async function handleGetTemplates(
  env: Env,
  request: AuthenticatedRequest
): Promise<Response> {
  if (!requireAuth(request.auth)) {
    return unauthorized();
  }

  try {
    const url = new URL(request.url);
    const tier = url.searchParams.get('tier') || undefined;
    
    const db = new DatabaseService(env.DB);
    const templates = await db.getAllTemplates(tier);

    return jsonResponse({
      success: true,
      templates,
      count: templates.length
    });
  } catch (error) {
    return serverError('Failed to get templates', error);
  }
}

export async function handleGetTemplate(
  env: Env,
  request: AuthenticatedRequest,
  templateName: string
): Promise<Response> {
  if (!requireAuth(request.auth)) {
    return unauthorized();
  }

  try {
    const db = new DatabaseService(env.DB);
    const template = await db.getTemplate(templateName);

    if (!template) {
      return notFound('Template not found');
    }

    return jsonResponse({
      success: true,
      template
    });
  } catch (error) {
    return serverError('Failed to get template', error);
  }
}

export async function handleSyncTemplates(
  env: Env,
  request: AuthenticatedRequest
): Promise<Response> {
  if (!request.auth || request.auth.type !== 'worker') {
    return unauthorized('Worker authentication required');
  }

  try {
    const response = await env.KAM.fetch(
      new Request('https://kam.internal/templates/detailed', {
        headers: {
          'Authorization': `Bearer ${env.WORKER_SHARED_SECRET || ''}`,
          'X-Worker-ID': 'bitware_orchestrator_v2'
        }
      })
    );

    if (!response.ok) {
      throw new Error(`KAM returned ${response.status}`);
    }

    const data = await response.json() as any;
    const templates = data.templates || [];
    
    let syncedCount = 0;
    for (const template of templates) {
      try {
        await env.DB.prepare(`
          INSERT OR REPLACE INTO pipeline_templates (
            template_name, display_name, description, category, subscription_tier,
            stages_config, parameters_config, estimated_cost_usd, estimated_time_ms,
            is_active, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
        `).bind(
          template.template_name,
          template.display_name,
          template.description,
          template.category,
          template.subscription_tier,
          JSON.stringify(template.stages || []),
          JSON.stringify(template.parameters || []),
          template.estimated_cost_usd || 0,
          template.estimated_time_ms || 0
        ).run();
        
        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync template ${template.template_name}:`, error);
      }
    }

    return jsonResponse({
      success: true,
      synced: syncedCount,
      total: templates.length,
      message: `Synchronized ${syncedCount} of ${templates.length} templates`
    });
  } catch (error) {
    return serverError('Failed to sync templates', error);
  }
}

export async function handleEstimate(
  env: Env,
  request: AuthenticatedRequest
): Promise<Response> {
  if (!requireAuth(request.auth)) {
    return unauthorized();
  }

  try {
    const body = await request.json() as any;
    const { template_name, parameters } = body;

    if (!template_name) {
      return badRequest('Template name is required');
    }

    const db = new DatabaseService(env.DB);
    const template = await db.getTemplate(template_name);

    if (!template) {
      return notFound('Template not found');
    }

    const historical = await env.DB.prepare(`
      SELECT 
        AVG(total_cost_usd) as avg_cost,
        AVG(total_time_ms) as avg_time,
        COUNT(*) as sample_size,
        MIN(total_cost_usd) as min_cost,
        MAX(total_cost_usd) as max_cost,
        MIN(total_time_ms) as min_time,
        MAX(total_time_ms) as max_time
      FROM pipeline_executions
      WHERE template_name = ? AND status = 'completed'
    `).bind(template_name).first();

    const resourceCheck = await checkResourceAvailability(env, template);

    const estimate = {
      feasible: resourceCheck.available,
      estimated_cost_usd: (historical?.avg_cost as number) || template.estimated_cost_usd || 0.50,
      estimated_time_ms: (historical?.avg_time as number) || template.estimated_time_ms || 180000,
      confidence_level: calculateConfidence((historical?.sample_size as number) || 0),
      resource_availability: resourceCheck.details,
      historical_data: historical && (historical.sample_size as number) > 0 ? {
        sample_size: historical.sample_size as number,
        cost_range: {
          min: historical.min_cost as number,
          max: historical.max_cost as number,
          avg: historical.avg_cost as number
        },
        time_range: {
          min: historical.min_time as number,
          max: historical.max_time as number,
          avg: historical.avg_time as number
        }
      } : null,
      breakdown: await getStageBreakdown(env, template),
      warnings: resourceCheck.warnings
    };

    return jsonResponse(estimate);
  } catch (error) {
    return serverError('Failed to estimate execution', error);
  }
}

async function checkResourceAvailability(env: Env, template: any): Promise<any> {
  const stages = template.stages || [];
  const details: any = {};
  const warnings: string[] = [];
  let available = true;

  for (const stage of stages) {
    const workerStatus = await env.DB.prepare(`
      SELECT * FROM worker_registry WHERE worker_name = ?
    `).bind(stage.worker_name).first();

    if (!workerStatus || workerStatus.health_status === 'unhealthy') {
      available = false;
      warnings.push(`Worker ${stage.worker_name} is unavailable`);
      details[stage.worker_name] = 'unavailable';
    } else if (workerStatus.health_status === 'degraded') {
      warnings.push(`Worker ${stage.worker_name} is degraded`);
      details[stage.worker_name] = 'degraded';
    } else {
      const activeCount = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM stage_executions
        WHERE worker_name = ? AND status = 'running'
      `).bind(stage.worker_name).first();

      const capacity = (workerStatus.max_concurrent_executions as number) || 1;
      const used = (activeCount?.count as number) || 0;
      
      if (used >= capacity) {
        warnings.push(`Worker ${stage.worker_name} at capacity (${used}/${capacity})`);
        details[stage.worker_name] = 'at_capacity';
      } else {
        details[stage.worker_name] = `available (${capacity - used} slots)`;
      }
    }
  }

  const apiUsage = await env.DB.prepare(`
    SELECT SUM(quantity_used) as used FROM resource_usage
    WHERE resource_type = 'api' AND resource_name = 'openai_gpt4'
    AND timestamp > datetime('now', '-1 day')
  `).first();

  const apiLimit = 10000;
  const apiUsed = (apiUsage?.used as number) || 0;
  
  if (apiUsed > apiLimit * 0.9) {
    warnings.push(`API quota nearly exhausted (${Math.round((apiUsed/apiLimit)*100)}%)`);
  }
  
  details.api_quota = `${Math.round((apiUsed/apiLimit)*100)}% used`;

  return { available, details, warnings };
}

function calculateConfidence(sampleSize: number): number {
  if (sampleSize === 0) return 0.5;
  if (sampleSize < 5) return 0.6;
  if (sampleSize < 10) return 0.75;
  if (sampleSize < 50) return 0.85;
  if (sampleSize < 100) return 0.9;
  return 0.95;
}

async function getStageBreakdown(env: Env, template: any): Promise<any[]> {
  const stages = template.stages || [];
  const breakdown = [];

  for (const stage of stages) {
    const workerMetrics = await env.DB.prepare(`
      SELECT 
        AVG(time_ms) as avg_time,
        AVG(cost_usd) as avg_cost
      FROM stage_executions
      WHERE worker_name = ? AND status = 'completed'
      LIMIT 100
    `).bind(stage.worker_name).first();

    breakdown.push({
      stage_order: stage.order,
      worker_name: stage.worker_name,
      action: stage.action,
      estimated_time_ms: (workerMetrics?.avg_time as number) || 60000,
      estimated_cost_usd: (workerMetrics?.avg_cost as number) || 0.10
    });
  }

  return breakdown;
}