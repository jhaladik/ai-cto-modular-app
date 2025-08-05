import { 
  PipelineTemplate, 
  PipelineExecution, 
  StageExecution,
  ResourcePool,
  ResourceUsage,
  ResourceAllocation
} from '../types';

export class DatabaseService {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  async getTemplate(templateName: string): Promise<PipelineTemplate | null> {
    const result = await this.db.prepare(`
      SELECT * FROM pipeline_templates WHERE template_name = ?
    `).bind(templateName).first();
    
    if (!result) return null;
    
    return {
      ...result,
      stages: JSON.parse(result.stages_config as string || '[]'),
      parameters: JSON.parse(result.parameters_config as string || '[]')
    } as PipelineTemplate;
  }

  async getAllTemplates(tier?: string): Promise<PipelineTemplate[]> {
    let query = 'SELECT * FROM pipeline_templates WHERE is_active = 1';
    const params: any[] = [];
    
    if (tier) {
      query += ' AND subscription_tier = ?';
      params.push(tier);
    }
    
    const result = await this.db.prepare(query).bind(...params).all();
    
    return (result.results || []).map(template => ({
      ...template,
      stages: JSON.parse(template.stages_config as string || '[]'),
      parameters: JSON.parse(template.parameters_config as string || '[]')
    })) as PipelineTemplate[];
  }

  async createExecution(execution: Partial<PipelineExecution>): Promise<string> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      console.log('Creating execution with:', {
        executionId,
        execution
      });
      
      await this.db.prepare(`
        INSERT INTO pipeline_executions (
          execution_id, request_id, client_id, template_name, parameters,
          status, priority, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        executionId,
        execution.request_id || null,
        execution.client_id!,
        execution.template_name!,
        JSON.stringify(execution.parameters || {}),
        execution.status || 'pending',
        execution.priority || 'normal'
      ).run();
      
      console.log('Execution created successfully');
      return executionId;
    } catch (error) {
      console.error('Failed to create execution:', error);
      throw error;
    }
  }

  async updateExecution(
    executionId: string, 
    updates: Partial<PipelineExecution>
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.started_at !== undefined) {
      fields.push('started_at = ?');
      values.push(updates.started_at);
    }
    if (updates.completed_at !== undefined) {
      fields.push('completed_at = ?');
      values.push(updates.completed_at);
    }
    if (updates.total_cost_usd !== undefined) {
      fields.push('total_cost_usd = ?');
      values.push(updates.total_cost_usd);
    }
    if (updates.total_time_ms !== undefined) {
      fields.push('total_time_ms = ?');
      values.push(updates.total_time_ms);
    }
    if (updates.error_message !== undefined) {
      fields.push('error_message = ?');
      values.push(updates.error_message);
    }
    if (updates.checkpoint_data !== undefined) {
      fields.push('checkpoint_data = ?');
      values.push(JSON.stringify(updates.checkpoint_data));
    }
    
    fields.push('updated_at = datetime("now")');
    values.push(executionId);
    
    await this.db.prepare(`
      UPDATE pipeline_executions 
      SET ${fields.join(', ')}
      WHERE execution_id = ?
    `).bind(...values).run();
  }

  async getExecution(executionId: string): Promise<PipelineExecution | null> {
    const result = await this.db.prepare(`
      SELECT * FROM pipeline_executions WHERE execution_id = ?
    `).bind(executionId).first();
    
    if (!result) return null;
    
    return {
      ...result,
      parameters: JSON.parse(result.parameters as string || '{}'),
      checkpoint_data: result.checkpoint_data ? JSON.parse(result.checkpoint_data as string) : null
    } as PipelineExecution;
  }

  async createStageExecution(stage: Partial<StageExecution>): Promise<string> {
    const stageId = `stage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await this.db.prepare(`
      INSERT INTO stage_executions (
        stage_id, execution_id, worker_name, stage_order, status, created_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      stageId,
      stage.execution_id!,
      stage.worker_name!,
      stage.stage_order!,
      stage.status || 'pending'
    ).run();
    
    return stageId;
  }

  async updateStageExecution(
    stageId: string,
    updates: Partial<StageExecution>
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.input_reference !== undefined) {
      fields.push('input_reference = ?');
      values.push(updates.input_reference);
    }
    if (updates.output_reference !== undefined) {
      fields.push('output_reference = ?');
      values.push(updates.output_reference);
    }
    if (updates.summary_data !== undefined) {
      fields.push('summary_data = ?');
      values.push(JSON.stringify(updates.summary_data));
    }
    if (updates.cost_usd !== undefined) {
      fields.push('cost_usd = ?');
      values.push(updates.cost_usd);
    }
    if (updates.time_ms !== undefined) {
      fields.push('time_ms = ?');
      values.push(updates.time_ms);
    }
    if (updates.started_at !== undefined) {
      fields.push('started_at = ?');
      values.push(updates.started_at);
    }
    if (updates.completed_at !== undefined) {
      fields.push('completed_at = ?');
      values.push(updates.completed_at);
    }
    
    values.push(stageId);
    
    await this.db.prepare(`
      UPDATE stage_executions 
      SET ${fields.join(', ')}
      WHERE stage_id = ?
    `).bind(...values).run();
  }

  async getStageExecutions(executionId: string): Promise<StageExecution[]> {
    const result = await this.db.prepare(`
      SELECT * FROM stage_executions 
      WHERE execution_id = ? 
      ORDER BY stage_order
    `).bind(executionId).all();
    
    return (result.results || []).map(stage => ({
      ...stage,
      summary_data: stage.summary_data ? JSON.parse(stage.summary_data as string) : null
    })) as StageExecution[];
  }

  async getWorkerRegistry(): Promise<any[]> {
    const result = await this.db.prepare(`
      SELECT * FROM worker_registry WHERE is_active = 1
    `).all();
    
    return result.results || [];
  }

  async updateWorkerHealth(
    workerName: string, 
    health: 'healthy' | 'degraded' | 'unhealthy'
  ): Promise<void> {
    await this.db.prepare(`
      UPDATE worker_registry 
      SET health_status = ?, last_health_check = datetime('now')
      WHERE worker_name = ?
    `).bind(health, workerName).run();
  }

  async getResourcePools(): Promise<any[]> {
    const result = await this.db.prepare(`
      SELECT * FROM resource_pools WHERE is_active = 1
    `).all();
    
    return result.results || [];
  }

  async recordResourceUsage(usage: ResourceUsage): Promise<void> {
    const usageId = `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await this.db.prepare(`
      INSERT INTO resource_usage (
        usage_id, resource_type, resource_name, execution_id, stage_id,
        quantity_used, unit, cost_usd, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      usageId,
      usage.resource_type,
      usage.resource_name,
      usage.execution_id,
      usage.stage_id || null,
      usage.quantity_used,
      usage.unit,
      usage.cost_usd
    ).run();
  }

  async createResourceAllocation(allocation: Partial<ResourceAllocation>): Promise<string> {
    const allocationId = `alloc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await this.db.prepare(`
      INSERT INTO resource_allocations (
        allocation_id, execution_id, resource_type, resource_name,
        quantity_allocated, allocated_at, expires_at, status
      ) VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?)
    `).bind(
      allocationId,
      allocation.execution_id!,
      allocation.resource_type!,
      allocation.resource_name!,
      allocation.quantity_allocated!,
      allocation.expires_at || null,
      allocation.status || 'reserved'
    ).run();
    
    return allocationId;
  }

  async releaseResourceAllocation(allocationId: string): Promise<void> {
    await this.db.prepare(`
      UPDATE resource_allocations 
      SET status = 'released', released_at = datetime('now')
      WHERE allocation_id = ?
    `).bind(allocationId).run();
  }

  async getResourceUsageStats(
    resourceType?: string,
    timeRange: 'hour' | 'day' | 'week' = 'day'
  ): Promise<any[]> {
    const timeClause = {
      hour: "datetime('now', '-1 hour')",
      day: "datetime('now', '-1 day')",
      week: "datetime('now', '-7 days')"
    }[timeRange];
    
    let query = `
      SELECT resource_type, resource_name, 
        SUM(quantity_used) as total_used,
        SUM(cost_usd) as total_cost,
        COUNT(*) as usage_count
      FROM resource_usage
      WHERE timestamp > ${timeClause}
    `;
    
    const params: any[] = [];
    if (resourceType) {
      query += ' AND resource_type = ?';
      params.push(resourceType);
    }
    
    query += ' GROUP BY resource_type, resource_name';
    
    const result = await this.db.prepare(query).bind(...params).all();
    return result.results || [];
  }

  async getExecutionQueue(limit: number = 10): Promise<any[]> {
    const result = await this.db.prepare(`
      SELECT eq.*, pe.template_name, pe.client_id
      FROM execution_queue eq
      JOIN pipeline_executions pe ON eq.execution_id = pe.execution_id
      WHERE eq.status IN ('queued', 'ready')
      ORDER BY eq.priority DESC, eq.created_at ASC
      LIMIT ?
    `).bind(limit).all();
    
    return result.results || [];
  }

  async updateQueueStatus(queueId: string, status: string): Promise<void> {
    await this.db.prepare(`
      UPDATE execution_queue SET status = ? WHERE queue_id = ?
    `).bind(status, queueId).run();
  }

  async createDeliverable(deliverable: any): Promise<string> {
    const deliverableId = `deliv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await this.db.prepare(`
      INSERT INTO deliverables (
        deliverable_id, execution_id, request_id, client_id, name, type,
        format, storage_type, storage_reference, size_bytes, mime_type,
        preview_available, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      deliverableId,
      deliverable.execution_id,
      deliverable.request_id || null,
      deliverable.client_id,
      deliverable.name,
      deliverable.type,
      deliverable.format || null,
      deliverable.storage_type,
      deliverable.storage_reference,
      deliverable.size_bytes || 0,
      deliverable.mime_type || null,
      deliverable.preview_available || false,
      JSON.stringify(deliverable.metadata || {})
    ).run();
    
    return deliverableId;
  }

  async getDeliverables(executionId: string): Promise<any[]> {
    const result = await this.db.prepare(`
      SELECT * FROM deliverables WHERE execution_id = ?
    `).bind(executionId).all();
    
    return result.results || [];
  }
}