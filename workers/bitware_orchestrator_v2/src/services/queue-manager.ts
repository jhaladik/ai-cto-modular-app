import { Env, PipelineExecution } from '../types';
import { DatabaseService } from './database';
import { PipelineExecutor } from './pipeline-executor';

export class QueueManager {
  private env: Env;
  private db: DatabaseService;
  private executor: PipelineExecutor;
  private isProcessing: boolean = false;
  private maxConcurrent: number = 5;
  private activeExecutions: Map<string, Promise<any>> = new Map();

  constructor(env: Env) {
    this.env = env;
    this.db = new DatabaseService(env.DB);
    this.executor = new PipelineExecutor(env);
  }

  async enqueue(
    executionId: string,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal',
    dependencies: string[] = []
  ): Promise<void> {
    const priorityScore = this.getPriorityScore(priority);
    const queueId = `queue_${executionId}`;

    await this.env.DB.prepare(`
      INSERT INTO execution_queue (
        queue_id, execution_id, priority, dependencies, status, created_at
      ) VALUES (?, ?, ?, ?, 'queued', datetime('now'))
    `).bind(
      queueId,
      executionId,
      priorityScore,
      JSON.stringify(dependencies)
    ).run();

    await this.processQueue();
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || this.activeExecutions.size >= this.maxConcurrent) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.activeExecutions.size < this.maxConcurrent) {
        const nextItem = await this.getNextQueueItem();
        
        if (!nextItem) {
          break;
        }

        const executionPromise = this.processExecution(nextItem);
        this.activeExecutions.set(nextItem.execution_id as string, executionPromise);

        executionPromise
          .finally(() => {
            this.activeExecutions.delete(nextItem.execution_id as string);
            this.processQueue();
          })
          .catch(error => {
            console.error(`Execution ${nextItem.execution_id} failed:`, error);
          });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async getNextQueueItem(): Promise<any | null> {
    const candidates = await this.env.DB.prepare(`
      SELECT eq.*, pe.template_name, pe.parameters, pe.client_id
      FROM execution_queue eq
      JOIN pipeline_executions pe ON eq.execution_id = pe.execution_id
      WHERE eq.status IN ('queued', 'ready')
      ORDER BY eq.priority DESC, eq.created_at ASC
      LIMIT 10
    `).all();

    for (const candidate of candidates.results || []) {
      const dependencies = JSON.parse((candidate.dependencies as string) || '[]');
      
      if (await this.areDependenciesMet(dependencies)) {
        await this.updateQueueStatus(candidate.queue_id as string, 'processing');
        return candidate;
      } else {
        await this.updateQueueStatus(candidate.queue_id as string, 'blocked');
      }
    }

    await this.unblockReadyItems();
    
    return null;
  }

  private async areDependenciesMet(dependencies: string[]): Promise<boolean> {
    if (dependencies.length === 0) return true;

    for (const depId of dependencies) {
      const dep = await this.env.DB.prepare(`
        SELECT status FROM pipeline_executions WHERE execution_id = ?
      `).bind(depId).first();

      if (!dep || dep.status !== 'completed') {
        return false;
      }
    }

    return true;
  }

  private async unblockReadyItems(): Promise<void> {
    const blocked = await this.env.DB.prepare(`
      SELECT queue_id, dependencies FROM execution_queue
      WHERE status = 'blocked'
    `).all();

    for (const item of blocked.results || []) {
      const dependencies = JSON.parse((item.dependencies as string) || '[]');
      if (await this.areDependenciesMet(dependencies)) {
        await this.updateQueueStatus(item.queue_id as string, 'ready');
      }
    }
  }

  private async processExecution(queueItem: any): Promise<void> {
    const executionId = queueItem.execution_id;
    
    try {
      // Fetch master template from KAM
      const kamResponse = await this.env.KAM.fetch(new Request(`https://kam.internal/api/master-templates/${queueItem.template_name}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.env.WORKER_SHARED_SECRET}`,
          'X-Worker-ID': 'bitware-orchestrator-v2'
        }
      }));
      
      if (!kamResponse.ok) {
        throw new Error('Failed to fetch master template from KAM');
      }
      
      const masterTemplate = await kamResponse.json() as any;
      
      // Parse pipeline stages
      const pipelineStages = JSON.parse(masterTemplate.pipeline_stages || '[]');
      
      // Build pipeline template for executor
      const pipelineTemplate = {
        template_name: masterTemplate.template_name,
        display_name: masterTemplate.display_name,
        stages: pipelineStages.map((stage: any) => ({
          stage_order: stage.stage || stage.stage_order,
          worker_name: stage.worker,
          template_ref: stage.template_ref,
          action: 'execute_template', // Standard action for template execution
          params: {
            template_id: stage.template_ref,
            ...stage.params_override
          },
          input_mapping: stage.input_map || stage.input_mapping,
          timeout_ms: 30000,
          retry_config: {
            max_attempts: 3,
            backoff_ms: 1000
          }
        })),
        estimated_time_ms: masterTemplate.max_execution_time_ms || 60000
      };

      const parameters = JSON.parse(queueItem.parameters || '{}');
      
      await this.executor.execute(executionId, pipelineTemplate, parameters);
      
      await this.updateQueueStatus(queueItem.queue_id, 'completed');
      
    } catch (error) {
      console.error(`Failed to process execution ${executionId}:`, error);
      
      await this.updateQueueStatus(queueItem.queue_id, 'failed');
      
      throw error;
    }
  }

  private async updateQueueStatus(queueId: string, status: string): Promise<void> {
    await this.env.DB.prepare(`
      UPDATE execution_queue 
      SET status = ?, updated_at = datetime('now')
      WHERE queue_id = ?
    `).bind(status, queueId).run();
  }

  private getPriorityScore(priority: string): number {
    const scores: { [key: string]: number } = {
      'critical': 100,
      'high': 75,
      'normal': 50,
      'low': 25
    };
    return scores[priority] || 50;
  }

  async getQueueStats(): Promise<any> {
    const stats = await this.env.DB.prepare(`
      SELECT 
        status,
        COUNT(*) as count,
        AVG(priority) as avg_priority
      FROM execution_queue
      WHERE status IN ('queued', 'ready', 'blocked', 'processing')
      GROUP BY status
    `).all();

    const total = stats.results?.reduce((sum, s) => sum + (s.count as number), 0) || 0;

    return {
      total_queued: total,
      active_executions: this.activeExecutions.size,
      max_concurrent: this.maxConcurrent,
      by_status: stats.results || [],
      capacity_used: (this.activeExecutions.size / this.maxConcurrent) * 100
    };
  }

  async clearQueue(status?: string): Promise<number> {
    let query = `DELETE FROM execution_queue WHERE 1=1`;
    const params: any[] = [];

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    const result = await this.env.DB.prepare(query).bind(...params).run();
    return result.meta.changes || 0;
  }

  async reprocessFailed(): Promise<number> {
    const failed = await this.env.DB.prepare(`
      SELECT execution_id FROM execution_queue
      WHERE status = 'failed'
    `).all();

    let reprocessed = 0;

    for (const item of failed.results || []) {
      await this.enqueue(item.execution_id as string, 'low');
      reprocessed++;
    }

    return reprocessed;
  }

  async adjustPriority(executionId: string, newPriority: string): Promise<void> {
    const priorityScore = this.getPriorityScore(newPriority);

    await this.env.DB.prepare(`
      UPDATE execution_queue 
      SET priority = ?, updated_at = datetime('now')
      WHERE execution_id = ? AND status IN ('queued', 'ready', 'blocked')
    `).bind(priorityScore, executionId).run();
  }

  async cancelQueued(executionId: string): Promise<void> {
    await this.env.DB.prepare(`
      UPDATE execution_queue 
      SET status = 'cancelled', updated_at = datetime('now')
      WHERE execution_id = ? AND status IN ('queued', 'ready', 'blocked')
    `).bind(executionId).run();

    await this.db.updateExecution(executionId, {
      status: 'cancelled',
      completed_at: new Date().toISOString(),
      error_message: 'Cancelled while in queue'
    });
  }

  async getPosition(executionId: string): Promise<number | null> {
    const position = await this.env.DB.prepare(`
      WITH queue_positions AS (
        SELECT 
          execution_id,
          ROW_NUMBER() OVER (ORDER BY priority DESC, created_at ASC) as position
        FROM execution_queue
        WHERE status IN ('queued', 'ready')
      )
      SELECT position FROM queue_positions WHERE execution_id = ?
    `).bind(executionId).first();

    return position?.position as number || null;
  }

  async estimateWaitTime(executionId: string): Promise<number | null> {
    const position = await this.getPosition(executionId);
    if (!position) return null;

    const avgExecutionTime = await this.env.DB.prepare(`
      SELECT AVG(total_time_ms) as avg_time
      FROM pipeline_executions
      WHERE status = 'completed'
      AND completed_at > datetime('now', '-1 day')
    `).first();

    const avgTime = (avgExecutionTime?.avg_time as number) || 180000;
    const waitTime = Math.ceil((position / this.maxConcurrent) * avgTime);

    return waitTime;
  }
}