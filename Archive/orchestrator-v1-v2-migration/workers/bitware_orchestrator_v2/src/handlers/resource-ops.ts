import { Env, AuthenticatedRequest } from '../types';
import { DatabaseService } from '../services/database';
import { jsonResponse, badRequest, serverError, unauthorized } from '../helpers/http';
import { requireAuth, requireWorkerAuth } from '../helpers/auth';

export async function handleResourceAllocation(
  env: Env,
  request: AuthenticatedRequest
): Promise<Response> {
  if (!requireWorkerAuth(request.auth)) {
    return unauthorized('Worker authentication required');
  }

  try {
    const body = await request.json() as any;
    const { execution_id, resources } = body;

    if (!execution_id || !resources) {
      return badRequest('Execution ID and resources are required');
    }

    const db = new DatabaseService(env.DB);
    const allocations = [];

    for (const resource of resources) {
      const allocationId = await db.createResourceAllocation({
        execution_id,
        resource_type: resource.type,
        resource_name: resource.name,
        quantity_allocated: resource.quantity,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        status: 'reserved'
      });

      allocations.push({
        allocation_id: allocationId,
        resource: resource.name,
        quantity: resource.quantity,
        status: 'reserved'
      });
    }

    return jsonResponse({
      success: true,
      allocations,
      expires_at: new Date(Date.now() + 3600000).toISOString()
    });
  } catch (error) {
    return serverError('Failed to allocate resources', error);
  }
}

export async function handleResourceRelease(
  env: Env,
  request: AuthenticatedRequest
): Promise<Response> {
  if (!requireWorkerAuth(request.auth)) {
    return unauthorized('Worker authentication required');
  }

  try {
    const body = await request.json() as any;
    const { allocation_ids } = body;

    if (!allocation_ids || !Array.isArray(allocation_ids)) {
      return badRequest('Allocation IDs array is required');
    }

    const db = new DatabaseService(env.DB);
    let releasedCount = 0;

    for (const allocationId of allocation_ids) {
      try {
        await db.releaseResourceAllocation(allocationId);
        releasedCount++;
      } catch (error) {
        console.error(`Failed to release allocation ${allocationId}:`, error);
      }
    }

    return jsonResponse({
      success: true,
      released: releasedCount,
      total: allocation_ids.length
    });
  } catch (error) {
    return serverError('Failed to release resources', error);
  }
}

export async function handleRecordUsage(
  env: Env,
  request: AuthenticatedRequest
): Promise<Response> {
  if (!requireWorkerAuth(request.auth)) {
    return unauthorized('Worker authentication required');
  }

  try {
    const body = await request.json() as any;
    const { execution_id, stage_id, usage } = body;

    if (!execution_id || !usage) {
      return badRequest('Execution ID and usage data are required');
    }

    const db = new DatabaseService(env.DB);

    for (const item of usage) {
      await db.recordResourceUsage({
        resource_type: item.type,
        resource_name: item.name,
        execution_id,
        stage_id,
        quantity_used: item.quantity,
        unit: item.unit,
        cost_usd: item.cost || 0,
        usage_id: '',
        timestamp: new Date().toISOString()
      });
    }

    const totalCost = usage.reduce((sum: number, item: any) => sum + (item.cost || 0), 0);

    await env.DB.prepare(`
      UPDATE pipeline_executions 
      SET total_cost_usd = COALESCE(total_cost_usd, 0) + ?
      WHERE execution_id = ?
    `).bind(totalCost, execution_id).run();

    return jsonResponse({
      success: true,
      recorded: usage.length,
      total_cost: totalCost
    });
  } catch (error) {
    return serverError('Failed to record usage', error);
  }
}

export async function handleGetQuotas(
  env: Env,
  request: AuthenticatedRequest
): Promise<Response> {
  if (!requireAuth(request.auth)) {
    return unauthorized();
  }

  try {
    const clientId = request.auth?.clientId || 'default_client';

    const quotas = await env.DB.prepare(`
      SELECT * FROM client_quotas WHERE client_id = ?
    `).bind(clientId).all();

    const quotasWithUtilization = await Promise.all((quotas.results || []).map(async (quota) => {
      const periodClause = {
        daily: "datetime('now', '-1 day')",
        weekly: "datetime('now', '-7 days')",
        monthly: "datetime('now', '-1 month')"
      }[quota.quota_period as string] || "datetime('now', '-1 day')";

      const usage = await env.DB.prepare(`
        SELECT SUM(quantity_used) as used
        FROM resource_usage ru
        JOIN pipeline_executions pe ON ru.execution_id = pe.execution_id
        WHERE pe.client_id = ?
        AND ru.resource_type = ?
        AND (ru.resource_name = ? OR ? IS NULL)
        AND ru.timestamp > ${periodClause}
      `).bind(
        clientId,
        quota.resource_type,
        quota.resource_name,
        quota.resource_name
      ).first();

      const used = (usage?.used as number) || 0;
      const utilization = (quota.quota_limit as number) > 0 
        ? (used / (quota.quota_limit as number)) * 100 
        : 0;

      return {
        ...quota,
        current_usage: used,
        remaining: Math.max(0, (quota.quota_limit as number) - used),
        utilization_percentage: utilization,
        overage: used > (quota.quota_limit as number) ? used - (quota.quota_limit as number) : 0
      };
    }));

    return jsonResponse({
      success: true,
      client_id: clientId,
      quotas: quotasWithUtilization
    });
  } catch (error) {
    return serverError('Failed to get quotas', error);
  }
}

export async function handleCheckAvailability(
  env: Env,
  request: AuthenticatedRequest
): Promise<Response> {
  if (!requireAuth(request.auth)) {
    return unauthorized();
  }

  try {
    const body = await request.json() as any;
    const { resources } = body;

    if (!resources || !Array.isArray(resources)) {
      return badRequest('Resources array is required');
    }

    const availability = await Promise.all(resources.map(async (resource) => {
      const pool = await env.DB.prepare(`
        SELECT * FROM resource_pools 
        WHERE resource_type = ? AND resource_name = ?
      `).bind(resource.type, resource.name).first();

      if (!pool) {
        return {
          resource: `${resource.type}:${resource.name}`,
          available: false,
          reason: 'Resource not found'
        };
      }

      const periodClause = pool.reset_schedule === 'daily'
        ? "datetime('now', '-1 day')"
        : "datetime('now', '-1 month')";

      const usage = await env.DB.prepare(`
        SELECT SUM(quantity_used) as used
        FROM resource_usage
        WHERE resource_type = ? AND resource_name = ?
        AND timestamp > ${periodClause}
      `).bind(resource.type, resource.name).first();

      const used = usage?.used || 0;
      const limit = pool.daily_limit || pool.monthly_limit || Infinity;
      const available = used + resource.quantity <= limit;

      return {
        resource: `${resource.type}:${resource.name}`,
        available,
        current_usage: used,
        limit,
        requested: resource.quantity,
        remaining: Math.max(0, (limit as number) - (used as number)),
        reason: available ? 'Available' : 'Insufficient quota'
      };
    }));

    const allAvailable = availability.every(a => a.available);

    return jsonResponse({
      success: true,
      all_available: allAvailable,
      resources: availability
    });
  } catch (error) {
    return serverError('Failed to check availability', error);
  }
}

export async function handleResourceSnapshot(
  env: Env,
  request: AuthenticatedRequest
): Promise<Response> {
  if (!requireAuth(request.auth)) {
    return unauthorized();
  }

  try {
    const pools = await env.DB.prepare(`
      SELECT * FROM resource_pools WHERE is_active = 1
    `).all();

    const snapshots = await Promise.all((pools.results || []).map(async (pool) => {
      const periodClause = pool.reset_schedule === 'daily'
        ? "datetime('now', '-1 day')"
        : "datetime('now', '-1 month')";

      const usage = await env.DB.prepare(`
        SELECT 
          SUM(quantity_used) as total_used,
          COUNT(DISTINCT execution_id) as execution_count,
          SUM(cost_usd) as total_cost
        FROM resource_usage
        WHERE resource_type = ? AND resource_name = ?
        AND timestamp > ${periodClause}
      `).bind(pool.resource_type, pool.resource_name).first();

      const allocations = await env.DB.prepare(`
        SELECT SUM(quantity_allocated) as allocated
        FROM resource_allocations
        WHERE resource_type = ? AND resource_name = ?
        AND status IN ('reserved', 'active')
      `).bind(pool.resource_type, pool.resource_name).first();

      const limit = pool.daily_limit || pool.monthly_limit || 0;
      const used = (usage?.total_used as number) || 0;
      const allocated = (allocations?.allocated as number) || 0;
      const available = Math.max(0, (limit as number) - used - allocated);

      const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await env.DB.prepare(`
        INSERT INTO resource_availability (
          snapshot_id, resource_type, resource_name,
          total_capacity, used_capacity, available_capacity,
          utilization_percentage, snapshot_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        snapshotId,
        pool.resource_type,
        pool.resource_name,
        limit,
        used,
        available,
        (limit as number) > 0 ? (used / (limit as number)) * 100 : 0
      ).run();

      return {
        resource_type: pool.resource_type,
        resource_name: pool.resource_name,
        total_capacity: limit,
        used_capacity: used,
        allocated_capacity: allocated,
        available_capacity: available,
        utilization_percentage: (limit as number) > 0 ? (used / (limit as number)) * 100 : 0,
        execution_count: usage?.execution_count || 0,
        total_cost: usage?.total_cost || 0
      };
    }));

    return jsonResponse({
      success: true,
      timestamp: new Date().toISOString(),
      snapshots
    });
  } catch (error) {
    return serverError('Failed to create resource snapshot', error);
  }
}