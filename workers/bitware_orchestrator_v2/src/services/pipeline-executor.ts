import { 
  Env, 
  PipelineTemplate, 
  PipelineExecution,
  StageExecution,
  ExecutionContext,
  ExecutionResult,
  HandshakePacket
} from '../types';
import { DatabaseService } from './database';
import { ResourceManager } from './resource-manager';
import { WorkerCoordinator } from './worker-coordinator';
import { StorageManager } from './storage-manager';

export class PipelineExecutor {
  private env: Env;
  private db: DatabaseService;
  private resourceManager: ResourceManager;
  private workerCoordinator: WorkerCoordinator;
  private storageManager: StorageManager;

  constructor(env: Env) {
    this.env = env;
    this.db = new DatabaseService(env.DB);
    this.resourceManager = new ResourceManager(env);
    this.workerCoordinator = new WorkerCoordinator(env);
    this.storageManager = new StorageManager(env);
  }

  async execute(
    executionId: string,
    template: PipelineTemplate,
    parameters: any
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    let currentStageOutput: any = parameters;
    let totalCost = 0;
    const deliverables: any[] = [];
    const stageResults: StageExecution[] = [];

    try {
      await this.db.updateExecution(executionId, {
        status: 'running',
        started_at: new Date().toISOString()
      });

      const resourceEstimates = await this.resourceManager.estimateResources(
        template.template_name,
        parameters
      );

      const resourceAllocation = await this.resourceManager.reserve(
        executionId,
        resourceEstimates.map(r => ({
          type: r.resource_type,
          name: r.resource_name,
          quantity: r.estimated_quantity
        }))
      );

      if (!resourceAllocation.success) {
        throw new Error(`Resource allocation failed: ${JSON.stringify(resourceAllocation.failures)}`);
      }

      await this.resourceManager.activate(resourceAllocation.allocations);

      for (const [index, stage] of template.stages.entries()) {
        const stageId = await this.db.createStageExecution({
          execution_id: executionId,
          worker_name: stage.worker_name,
          stage_order: stage.stage_order,
          status: 'pending'
        });

        try {
          await this.updateProgress(executionId, {
            current_stage: stage.worker_name,
            stages_completed: index,
            stages_total: template.stages.length,
            progress_percentage: Math.round((index / template.stages.length) * 100)
          });

          const stageResult = await this.executeStage(
            executionId,
            stageId,
            stage,
            currentStageOutput,
            index === template.stages.length - 1
          );

          stageResults.push(stageResult);
          currentStageOutput = stageResult.output_data;
          totalCost += stageResult.cost_usd || 0;

          await this.db.updateStageExecution(stageId, {
            status: 'completed',
            output_reference: stageResult.output_reference,
            summary_data: stageResult.summary_data,
            cost_usd: stageResult.cost_usd,
            time_ms: stageResult.time_ms,
            completed_at: new Date().toISOString()
          });

          if (stageResult.summary_data?.continue_pipeline === false) {
            console.log(`Pipeline halted at stage ${stage.stage_order} by worker decision`);
            break;
          }

          if (index === template.stages.length - 1) {
            const deliverable = await this.storageManager.storeDeliverable(
              executionId,
              'final_output',
              currentStageOutput,
              'report'
            );
            deliverables.push(deliverable);
          }

        } catch (stageError) {
          console.error(`Stage ${stage.worker_name} failed:`, stageError);
          
          await this.db.updateStageExecution(stageId, {
            status: 'failed',
            error_message: stageError instanceof Error ? stageError.message : 'Unknown error',
            completed_at: new Date().toISOString()
          });

          if (stage.retry_config?.max_attempts > 0) {
            const retryResult = await this.retryStage(
              executionId,
              stageId,
              stage,
              currentStageOutput,
              stage.retry_config.max_attempts
            );
            
            if (retryResult.success) {
              currentStageOutput = retryResult.output;
              continue;
            }
          }

          throw stageError;
        }
      }

      await this.resourceManager.release(resourceAllocation.allocations);

      const totalTime = Date.now() - startTime;

      await this.db.updateExecution(executionId, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_cost_usd: totalCost,
        total_time_ms: totalTime
      });

      return {
        execution_id: executionId,
        status: 'completed',
        final_output: currentStageOutput,
        deliverables,
        metrics: {
          stages_completed: stageResults.length,
          stages_total: template.stages.length,
          progress_percentage: 100,
          current_stage: 'completed',
          items_processed: stageResults.reduce((sum, r) => sum + (r.summary_data?.items_processed || 0), 0),
          errors_count: 0,
          warnings_count: stageResults.reduce((sum, r) => sum + (r.summary_data?.warnings?.length || 0), 0),
          cost_accumulated_usd: totalCost,
          time_elapsed_ms: totalTime,
          estimated_remaining_ms: 0
        },
        total_cost_usd: totalCost,
        total_time_ms: totalTime,
        completed_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('Pipeline execution failed:', error);

      await this.db.updateExecution(executionId, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error',
        total_cost_usd: totalCost,
        total_time_ms: Date.now() - startTime
      });

      return {
        execution_id: executionId,
        status: 'failed',
        deliverables,
        metrics: {
          stages_completed: stageResults.length,
          stages_total: template.stages.length,
          progress_percentage: Math.round((stageResults.length / template.stages.length) * 100),
          current_stage: 'failed',
          items_processed: 0,
          errors_count: 1,
          warnings_count: 0,
          cost_accumulated_usd: totalCost,
          time_elapsed_ms: Date.now() - startTime,
          estimated_remaining_ms: 0
        },
        total_cost_usd: totalCost,
        total_time_ms: Date.now() - startTime,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      };
    }
  }

  private async executeStage(
    executionId: string,
    stageId: string,
    stage: any,
    inputData: any,
    isFinalStage: boolean
  ): Promise<any> {
    const startTime = Date.now();

    await this.db.updateStageExecution(stageId, {
      status: 'running',
      started_at: new Date().toISOString()
    });

    const inputRef = await this.storageManager.storeData(
      executionId,
      stageId,
      inputData,
      'input'
    );

    await this.db.updateStageExecution(stageId, {
      input_reference: inputRef.storage_key
    });

    const handshake = this.createHandshakePacket(
      executionId,
      stageId,
      stage,
      inputRef,
      isFinalStage
    );

    const result = await this.workerCoordinator.invokeWorker(
      stage.worker_name,
      stage.action,
      inputData,
      executionId,
      stageId
    );

    const outputRef = await this.storageManager.storeData(
      executionId,
      stageId,
      result.output || result,
      'output'
    );

    const usageCost = await this.resourceManager.recordUsage(
      executionId,
      stageId,
      result.resource_usage || []
    );

    const executionTime = Date.now() - startTime;

    await this.workerCoordinator.recordWorkerMetrics(
      stage.worker_name,
      executionTime,
      true,
      usageCost
    );

    return {
      stage_id: stageId,
      execution_id: executionId,
      worker_name: stage.worker_name,
      stage_order: stage.stage_order,
      status: 'completed',
      input_reference: inputRef.storage_key,
      output_reference: outputRef.storage_key,
      output_data: result.output || result,
      summary_data: result.summary || {
        items_processed: 1,
        quality_score: 1,
        confidence_level: 1,
        processing_time_ms: executionTime,
        resource_usage: result.resource_usage || {},
        errors: [],
        warnings: [],
        metrics: {},
        continue_pipeline: true
      },
      cost_usd: usageCost,
      time_ms: executionTime,
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString()
    };
  }

  private createHandshakePacket(
    executionId: string,
    stageId: string,
    stage: any,
    dataRef: any,
    isFinalStage: boolean
  ): HandshakePacket {
    return {
      packet_id: `packet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pipeline_id: executionId,
      execution_id: executionId,
      stage_id: stageId,
      stage_order: stage.stage_order,
      timestamp: new Date().toISOString(),
      control: {
        action: 'continue',
        priority: 'normal',
        checkpoint_enabled: true,
        timeout_ms: stage.timeout_ms || 300000,
        retry_count: 0,
        max_retries: stage.retry_config?.max_attempts || 3
      },
      data_ref: dataRef,
      summary: {
        items_processed: 0,
        quality_score: 0,
        confidence_level: 0,
        processing_time_ms: 0,
        resource_usage: {},
        errors: [],
        warnings: [],
        metrics: {},
        continue_pipeline: true
      },
      next: {
        worker_name: isFinalStage ? 'orchestrator' : stage.worker_name,
        action: isFinalStage ? 'complete' : stage.action,
        stage_order: stage.stage_order + 1,
        params: {},
        required_resources: [],
        estimated_time_ms: stage.timeout_ms || 60000
      }
    };
  }

  private async retryStage(
    executionId: string,
    stageId: string,
    stage: any,
    inputData: any,
    maxAttempts: number
  ): Promise<{ success: boolean; output?: any }> {
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < maxAttempts) {
      attempts++;
      
      await this.env.DB.prepare(`
        INSERT INTO retry_attempts (
          retry_id, execution_id, stage_id, attempt_number,
          retry_delay_ms, timestamp
        ) VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        `retry_${Date.now()}`,
        executionId,
        stageId,
        attempts,
        this.calculateRetryDelay(attempts, stage.retry_config)
      ).run();

      await new Promise(resolve => setTimeout(resolve, this.calculateRetryDelay(attempts, stage.retry_config)));

      try {
        const result = await this.executeStage(
          executionId,
          stageId,
          stage,
          inputData,
          false
        );

        await this.env.DB.prepare(`
          UPDATE retry_attempts 
          SET succeeded = 1 
          WHERE execution_id = ? AND stage_id = ? AND attempt_number = ?
        `).bind(executionId, stageId, attempts).run();

        return { success: true, output: result.output_data };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        await this.env.DB.prepare(`
          UPDATE retry_attempts 
          SET error_message = ?, succeeded = 0 
          WHERE execution_id = ? AND stage_id = ? AND attempt_number = ?
        `).bind(lastError.message, executionId, stageId, attempts).run();
      }
    }

    return { success: false };
  }

  private calculateRetryDelay(attempt: number, retryConfig: any): number {
    const initialDelay = retryConfig?.initial_delay_ms || 1000;
    const maxDelay = retryConfig?.max_delay_ms || 60000;
    
    if (retryConfig?.backoff_type === 'exponential') {
      return Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);
    }
    
    return Math.min(initialDelay * attempt, maxDelay);
  }

  private async updateProgress(executionId: string, progress: any): Promise<void> {
    await this.env.EXECUTION_CACHE.put(
      `progress:${executionId}`,
      JSON.stringify({
        execution_id: executionId,
        ...progress,
        timestamp: new Date().toISOString()
      }),
      { expirationTtl: 60 }
    );
  }

  async createCheckpoint(
    executionId: string,
    stageOrder: number,
    data: any
  ): Promise<string> {
    const checkpointId = `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const dataRefs = await this.storageManager.storeData(
      executionId,
      checkpointId,
      data,
      'checkpoint'
    );

    await this.env.DB.prepare(`
      INSERT INTO execution_checkpoints (
        checkpoint_id, execution_id, stage_order,
        checkpoint_data, data_references, created_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      checkpointId,
      executionId,
      stageOrder,
      JSON.stringify({ stage_order: stageOrder, timestamp: Date.now() }),
      JSON.stringify([dataRefs.storage_key])
    ).run();

    return checkpointId;
  }

  async resumeFromCheckpoint(
    executionId: string,
    checkpointId: string
  ): Promise<any> {
    const checkpoint = await this.env.DB.prepare(`
      SELECT * FROM execution_checkpoints WHERE checkpoint_id = ?
    `).bind(checkpointId).first();

    if (!checkpoint) {
      throw new Error('Checkpoint not found');
    }

    const dataRefs = JSON.parse(checkpoint.data_references as string);
    const data = await this.storageManager.retrieveData({
      storage_key: dataRefs[0],
      storage_type: 'KV'
    });

    return {
      stage_order: checkpoint.stage_order,
      data,
      created_at: checkpoint.created_at
    };
  }
}