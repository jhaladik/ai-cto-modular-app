import { Env, PipelineExecution } from '../types';
import { DatabaseService } from './database';
import { PipelineExecutor } from './pipeline-executor';

export class QueueManager {
  private env: Env;
  private db: DatabaseService;
  private executor: PipelineExecutor;
  private isProcessing: boolean = false;
  private maxConcurrent: number = 1; // Changed to 1 to ensure sequential processing
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

    // Process queue after enqueuing
    await this.processQueue();
  }

  async processQueue(): Promise<void> {
    console.log('processQueue called:', {
      isProcessing: this.isProcessing,
      activeExecutions: this.activeExecutions.size,
      maxConcurrent: this.maxConcurrent
    });
    
    if (this.isProcessing || this.activeExecutions.size >= this.maxConcurrent) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.activeExecutions.size < this.maxConcurrent) {
        const nextItem = await this.getNextQueueItem();
        
        console.log('Next queue item:', nextItem);
        
        if (!nextItem) {
          break;
        }

        const executionPromise = this.processExecution(nextItem);
        this.activeExecutions.set(nextItem.execution_id as string, executionPromise);

        // Don't immediately process next item - let this one complete
        // The finally block will trigger processQueue when done
        executionPromise
          .finally(() => {
            this.activeExecutions.delete(nextItem.execution_id as string);
            // Use setTimeout to avoid immediate re-entry
            setTimeout(() => this.processQueue(), 100);
          })
          .catch(error => {
            console.error(`Execution ${nextItem.execution_id} failed:`, error);
          });
        
        // Wait a bit before processing the next item to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500));
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
    
    console.log('Processing execution:', {
      executionId,
      templateName: queueItem.template_name,
      parameters: queueItem.parameters
    });
    
    try {
      // Fetch master template from KAM
      const kamUrl = `http://kam/api/master-templates/${queueItem.template_name}`;
      console.log('Fetching master template from KAM:', kamUrl);
      
      let masterTemplate: any;
      
      try {
        const kamResponse = await this.env.KAM.fetch(new Request(kamUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.env.WORKER_SECRET}`,
            'X-Worker-ID': 'bitware-orchestrator-v2'
          }
        }));
        
        console.log('KAM response status:', kamResponse.status);
        
        if (!kamResponse.ok) {
          const errorText = await kamResponse.text();
          console.error('KAM error response:', errorText);
          throw new Error(`Failed to fetch master template from KAM: ${errorText}`);
        }
        
        masterTemplate = await kamResponse.json() as any;
        console.log('Master template received:', JSON.stringify(masterTemplate));
      } catch (kamError) {
        console.error('KAM fetch failed, using fallback template:', kamError);
        
        // Fallback template for testing
        masterTemplate = {
          template_name: 'course_creation',
          display_name: 'Course Creation',
          pipeline_stages: JSON.stringify([{
            stage_order: 1,
            worker_name: 'bitware-content-granulator',
            template_ref: 'course',
            action: 'granulate',
            params_override: {
              structure_type: 'course',
              topic: 'Default Topic'
            }
          }]),
          max_execution_time_ms: 60000
        };
        console.log('Using fallback template:', JSON.stringify(masterTemplate));
      }
      
      // Parse pipeline stages
      const pipelineStages = JSON.parse(masterTemplate.pipeline_stages || '[]');
      console.log('Parsed pipeline stages:', JSON.stringify(pipelineStages));
      
      // Normalize stage structure
      const normalizedStages = pipelineStages.map((stage: any, index: number) => {
        const normalized = {
          stage_order: stage.stage_order || stage.stage || index + 1,
          worker_name: stage.worker_name || stage.worker,
          template_ref: stage.template_ref,
          action: stage.action || (stage.worker === 'bitware-content-granulator' ? 'granulate' : 'execute_template'),
          params: {
            // Don't include template_id - it causes granulator to look up by ID instead of name
            template_name: stage.template_ref, // Use template_name for granulator
            ...stage.params_override
          },
          input_mapping: stage.input_map || stage.input_mapping,
          input_schema: {},
          output_schema: {},
          resource_requirements: [],
          can_parallel: false,
          timeout_ms: stage.timeout_ms || 30000,
          retry_config: {
            max_attempts: stage.retry_attempts || 3,
            backoff_type: 'exponential' as const,
            initial_delay_ms: 1000,
            max_delay_ms: 60000
          }
        };
        console.log(`Normalized stage ${index + 1}:`, normalized);
        return normalized;
      });
      
      // Build pipeline template for executor
      const pipelineTemplate = {
        template_name: masterTemplate.template_name,
        display_name: masterTemplate.display_name,
        description: masterTemplate.description || 'Pipeline template',
        category: masterTemplate.category || 'general',
        subscription_tier: masterTemplate.subscription_tier || 'basic',
        stages: normalizedStages,
        parameters: [],
        estimated_cost_usd: masterTemplate.estimated_cost_usd || 0.10,
        estimated_time_ms: masterTemplate.max_execution_time_ms || 60000,
        created_at: masterTemplate.created_at || new Date().toISOString(),
        updated_at: masterTemplate.updated_at || new Date().toISOString()
      } as any;

      const parameters = JSON.parse(queueItem.parameters || '{}');
      
      console.log('Executing pipeline with template:', JSON.stringify(pipelineTemplate));
      console.log('Parameters:', JSON.stringify(parameters));
      
      const result = await this.executor.execute(executionId, pipelineTemplate, parameters);
      
      console.log('Pipeline execution completed for:', executionId, result);
      await this.updateQueueStatus(queueItem.queue_id, 'completed');
      
    } catch (error) {
      console.error(`Failed to process execution ${executionId}:`, error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      await this.updateQueueStatus(queueItem.queue_id, 'failed');
      
      // Update execution status to failed
      await this.db.updateExecution(executionId, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      });
      
      // Don't re-throw to allow queue to continue processing other items
      // throw error;
    }
  }

  private async updateQueueStatus(queueId: string, status: string): Promise<void> {
    await this.env.DB.prepare(`
      UPDATE execution_queue 
      SET status = ?
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
      SET priority = ?
      WHERE execution_id = ? AND status IN ('queued', 'ready', 'blocked')
    `).bind(priorityScore, executionId).run();
  }

  async cancelQueued(executionId: string): Promise<void> {
    await this.env.DB.prepare(`
      UPDATE execution_queue 
      SET status = 'cancelled'
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

  async processSpecificExecution(executionId: string): Promise<void> {
    console.log('Processing specific execution:', executionId);
    
    // Get execution details
    const execution = await this.env.DB.prepare(`
      SELECT *
      FROM pipeline_executions
      WHERE execution_id = ?
    `).bind(executionId).first();
    
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }
    
    if (execution.status !== 'pending') {
      console.log(`Execution ${executionId} is not pending (status: ${execution.status}), skipping`);
      return;
    }
    
    // Process the execution
    await this.processExecution(execution);
  }
}