import { Env, WorkerHandshake, HandshakePacket, HandshakeResponse } from '../types';

export class WorkerCoordinator {
  private env: Env;
  private workerBindings: Map<string, Fetcher>;

  constructor(env: Env) {
    this.env = env;
    this.workerBindings = new Map();
    
    // Only add bindings that exist
    if (env.TOPIC_RESEARCHER) this.workerBindings.set('bitware_topic_researcher', env.TOPIC_RESEARCHER);
    if (env.RSS_FINDER) this.workerBindings.set('bitware_rss_source_finder', env.RSS_FINDER);
    if (env.FEED_FETCHER) this.workerBindings.set('bitware_feed_fetcher', env.FEED_FETCHER);
    if (env.CONTENT_CLASSIFIER) this.workerBindings.set('bitware_content_classifier', env.CONTENT_CLASSIFIER);
    if (env.REPORT_BUILDER) this.workerBindings.set('bitware_report_builder', env.REPORT_BUILDER);
    if (env.UNIVERSAL_RESEARCHER) this.workerBindings.set('bitware_universal_researcher', env.UNIVERSAL_RESEARCHER);
    if (env.OPTIMIZER) this.workerBindings.set('bitware_ai_factory_optimizer', env.OPTIMIZER);
    if (env.CONTENT_GRANULATOR) this.workerBindings.set('bitware-content-granulator', env.CONTENT_GRANULATOR);
  }

  async getWorkerStatus(workerName: string): Promise<WorkerHandshake | null> {
    const worker = await this.env.DB.prepare(`
      SELECT * FROM worker_registry WHERE worker_name = ?
    `).bind(workerName).first();

    if (!worker) return null;

    const binding = this.workerBindings.get(workerName);
    if (!binding) return null;

    try {
      const response = await binding.fetch(new Request('http://worker/health'));
      const health = response.ok ? 'healthy' : 'unhealthy';

      const activeExecutions = await this.env.DB.prepare(`
        SELECT COUNT(*) as count FROM stage_executions 
        WHERE worker_name = ? AND status = 'running'
      `).bind(workerName).first();

      return {
        worker_id: workerName,
        worker_name: workerName,
        version: (worker.version as string) || '1.0.0',
        capabilities: JSON.parse((worker.capabilities as string) || '[]'),
        supported_actions: this.getSupportedActions(workerName),
        resource_limits: {
          max_concurrent_executions: (worker.max_concurrent_executions as number) || 1,
          max_input_size_mb: 10,
          timeout_ms: JSON.parse((worker.resource_requirements as string) || '{}').timeout_ms || 300000
        },
        health_status: health as 'healthy' | 'degraded' | 'unhealthy',
        current_load: {
          active_executions: (activeExecutions?.count as number) || 0,
          queue_length: 0,
          cpu_usage_percent: 0,
          memory_usage_mb: 0
        }
      };
    } catch (error) {
      console.error(`Error getting status for worker ${workerName}:`, error);
      return null;
    }
  }

  async getAllWorkersStatus(): Promise<WorkerHandshake[]> {
    const workers = await this.env.DB.prepare(`
      SELECT worker_name FROM worker_registry WHERE is_active = 1
    `).all();

    const statuses: WorkerHandshake[] = [];
    
    for (const worker of workers.results || []) {
      const status = await this.getWorkerStatus(worker.worker_name as string);
      if (status) statuses.push(status);
    }

    return statuses;
  }

  async updateWorkerHealth(workerName: string, health: 'healthy' | 'degraded' | 'unhealthy'): Promise<void> {
    await this.env.DB.prepare(`
      UPDATE worker_registry 
      SET health_status = ?, last_health_check = datetime('now')
      WHERE worker_name = ?
    `).bind(health, workerName).run();
  }

  async canWorkerAcceptTask(workerName: string): Promise<boolean> {
    const worker = await this.env.DB.prepare(`
      SELECT * FROM worker_registry WHERE worker_name = ?
    `).bind(workerName).first();

    if (!worker || !worker.is_active || worker.health_status === 'unhealthy') {
      return false;
    }

    const activeCount = await this.env.DB.prepare(`
      SELECT COUNT(*) as count FROM stage_executions
      WHERE worker_name = ? AND status = 'running'
    `).bind(workerName).first();

    return ((activeCount?.count as number) || 0) < ((worker.max_concurrent_executions as number) || 1);
  }

  async invokeWorker(
    workerName: string,
    action: string,
    data: any,
    executionId: string,
    stageId: string,
    timeoutMs: number = 30000
  ): Promise<any> {
    const binding = this.workerBindings.get(workerName);
    if (!binding) {
      throw new Error(`Worker ${workerName} not found`);
    }

    const canAccept = await this.canWorkerAcceptTask(workerName);
    if (!canAccept) {
      throw new Error(`Worker ${workerName} cannot accept new tasks`);
    }

    const dataRef = await this.storeData(data, executionId, stageId);

    const handshake: HandshakePacket = {
      packet_id: `packet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pipeline_id: executionId,
      execution_id: executionId,
      stage_id: stageId,
      stage_order: 0,
      timestamp: new Date().toISOString(),
      control: {
        action: 'continue',
        priority: 'normal',
        checkpoint_enabled: true,
        timeout_ms: timeoutMs,
        retry_count: 0,
        max_retries: 3
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
        worker_name: workerName,
        action: action,
        stage_order: 1,
        params: {},
        required_resources: [],
        estimated_time_ms: timeoutMs
      }
    };

    // Skip handshake packet logging if stage doesn't exist (for testing)
    try {
      await this.env.DB.prepare(`
        INSERT INTO handshake_packets (
          packet_id, execution_id, stage_id, from_worker, to_worker,
          packet_data, status, sent_at
        ) VALUES (?, ?, ?, 'orchestrator', ?, ?, 'sent', datetime('now'))
      `).bind(
        handshake.packet_id,
        executionId,
        stageId,
        workerName,
        JSON.stringify(handshake)
      ).run();
    } catch (error) {
      console.warn('Failed to log handshake packet (likely test execution):', error);
      // Continue without logging - this is fine for test executions
    }

    console.log('Invoking worker:', { workerName, action, executionId, stageId });
    console.log('Input data:', data);

    // Determine the actual action to send and prepare data
    let workerAction = action;
    let preparedData = { ...data };
    
    // Special handling for content granulator
    if (workerName === 'bitware-content-granulator') {
      workerAction = 'granulate';
      // Ensure template_name is set from either template_id or template_name
      if (data.template_id && !data.template_name) {
        preparedData.template_name = data.template_id;
      }
      // Set default structure_type if not provided
      if (!preparedData.structure_type) {
        preparedData.structure_type = 'course';
      }
      console.log('Prepared data for granulator:', preparedData);
    }
    
    // If action is execute_template, we might need to fetch template details
    let templateDetails: any = null;
    if (action === 'execute_template' && data.template_id && workerName !== 'bitware-content-granulator') {
      const templateResponse = await binding.fetch(new Request(`http://worker/api/templates/${data.template_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.env.WORKER_SECRET}`,
          'X-Worker-ID': 'bitware-orchestrator-v2'
        }
      }));
      
      if (templateResponse.ok) {
        templateDetails = await templateResponse.json();
      }
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // First, send handshake with timeout
      const handshakeUrl = `http://worker/api/handshake`;
      const handshakeResponse = await binding.fetch(new Request(handshakeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.env.WORKER_SECRET}`,
          'X-Worker-ID': 'bitware-orchestrator-v2'
        },
        body: JSON.stringify({
          executionId,
          stageId,
          action: workerAction,
          inputData: {
            ...preparedData,
            // Add template-specific parameters if we have them
            ...(templateDetails && templateDetails.template?.base_parameters ? JSON.parse(templateDetails.template.base_parameters) : {}),
            // Override with any prepared data
            ...preparedData
          },
          dataReference: dataRef,
          resourceRequirements: {
            estimatedTokens: (templateDetails && templateDetails.template?.avg_tokens) || 2000,
            timeoutMs: timeoutMs
          },
          validationConfig: {
            enabled: false,  // Disable validation for now
            level: preparedData.validationLevel || 2
          }
        }),
        signal: controller.signal
      }));

      if (!handshakeResponse.ok) {
        const errorText = await handshakeResponse.text();
        console.error(`Worker handshake failed: ${handshakeResponse.status}`, errorText);
        throw new Error(`Worker handshake failed: ${handshakeResponse.status} - ${errorText}`);
      }

      const handshakeResult = await handshakeResponse.json() as any;
      console.log('Handshake result:', handshakeResult);
      
      if (!handshakeResult.accepted) {
        console.error('Worker rejected handshake:', handshakeResult);
        throw new Error(`Worker rejected handshake: ${handshakeResult.error || 'Unknown reason'}`);
      }

      // Then, trigger processing with timeout
      const processUrl = `http://worker/api/process`;
      const response = await binding.fetch(new Request(processUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.env.WORKER_SECRET}`,
          'X-Worker-ID': 'bitware-orchestrator-v2'
        },
        body: JSON.stringify({
          executionId
        }),
        signal: controller.signal
      }));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Worker process failed: ${response.status}`, errorText);
        throw new Error(`Worker invocation failed: ${response.status} - ${errorText}`);
      }

      clearTimeout(timeoutId);
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Log timeout or other errors
      console.error(`Worker invocation error for ${workerName}:`, error);
      
      // Check if it was an abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new Error(`Worker ${workerName} timed out after ${timeoutMs}ms`);
        await this.updateWorkerHealth(workerName, 'degraded');
        throw timeoutError;
      }
      
      throw error;
    }
  }

  private async storeData(data: any, executionId: string, stageId: string): Promise<any> {
    const dataStr = JSON.stringify(data);
    const sizeBytes = new TextEncoder().encode(dataStr).length;
    
    if (sizeBytes < 1024 * 10) {
      return {
        storage_type: 'inline',
        inline_data: data,
        size_bytes: sizeBytes,
        content_type: 'application/json',
        checksum: await this.generateChecksum(dataStr),
        compression: 'none',
        expires_at: new Date(Date.now() + 3600000).toISOString()
      };
    }

    const key = `data/${executionId}/${stageId}/${Date.now()}`;
    
    if (sizeBytes < 1024 * 1024) {
      await this.env.DATA_REFS.put(key, dataStr, {
        expirationTtl: 3600
      });
      
      return {
        storage_type: 'KV',
        storage_key: key,
        size_bytes: sizeBytes,
        content_type: 'application/json',
        checksum: await this.generateChecksum(dataStr),
        compression: 'none',
        expires_at: new Date(Date.now() + 3600000).toISOString()
      };
    }

    await this.env.DATA_STORAGE.put(key, dataStr);
    
    return {
      storage_type: 'R2',
      storage_key: key,
      size_bytes: sizeBytes,
      content_type: 'application/json',
      checksum: await this.generateChecksum(dataStr),
      compression: 'none',
      expires_at: new Date(Date.now() + 86400000).toISOString()
    };
  }

  private async generateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async retrieveData(dataRef: any): Promise<any> {
    if (dataRef.storage_type === 'inline') {
      return dataRef.inline_data;
    }

    if (dataRef.storage_type === 'KV') {
      const data = await this.env.DATA_REFS.get(dataRef.storage_key);
      return data ? JSON.parse(data) : null;
    }

    if (dataRef.storage_type === 'R2') {
      const object = await this.env.DATA_STORAGE.get(dataRef.storage_key);
      if (!object) return null;
      const text = await object.text();
      return JSON.parse(text);
    }

    return null;
  }

  async recordWorkerMetrics(
    workerName: string,
    executionTimeMs: number,
    success: boolean,
    costUsd: number = 0
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    const existing = await this.env.DB.prepare(`
      SELECT * FROM worker_performance WHERE worker_name = ? AND date = ?
    `).bind(workerName, today).first();

    if (existing) {
      await this.env.DB.prepare(`
        UPDATE worker_performance SET
          execution_count = execution_count + 1,
          success_count = success_count + ?,
          failure_count = failure_count + ?,
          avg_execution_time_ms = ((avg_execution_time_ms * execution_count) + ?) / (execution_count + 1),
          min_execution_time_ms = MIN(min_execution_time_ms, ?),
          max_execution_time_ms = MAX(max_execution_time_ms, ?),
          total_cost_usd = total_cost_usd + ?,
          error_rate = CAST(failure_count AS REAL) / CAST(execution_count AS REAL),
          updated_at = datetime('now')
        WHERE worker_name = ? AND date = ?
      `).bind(
        success ? 1 : 0,
        success ? 0 : 1,
        executionTimeMs,
        executionTimeMs,
        executionTimeMs,
        costUsd,
        workerName,
        today
      ).run();
    } else {
      await this.env.DB.prepare(`
        INSERT INTO worker_performance (
          worker_name, date, execution_count, success_count, failure_count,
          avg_execution_time_ms, min_execution_time_ms, max_execution_time_ms,
          total_cost_usd, error_rate
        ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        workerName,
        today,
        success ? 1 : 0,
        success ? 0 : 1,
        executionTimeMs,
        executionTimeMs,
        executionTimeMs,
        costUsd,
        success ? 0 : 1
      ).run();
    }
  }

  async recordWorkerMetrics(
    workerName: string,
    executionTime: number,
    success: boolean,
    cost: number
  ): Promise<void> {
    try {
      await this.env.DB.prepare(`
        INSERT INTO worker_performance_metrics (
          worker_name, 
          execution_time_ms, 
          success, 
          cost_usd, 
          recorded_at
        ) VALUES (?, ?, ?, ?, datetime('now'))
      `).bind(workerName, executionTime, success ? 1 : 0, cost).run();
    } catch (error) {
      console.error(`Failed to record metrics for ${workerName}:`, error);
    }
  }

  private getSupportedActions(workerName: string): string[] {
    const actionsMap: { [key: string]: string[] } = {
      'bitware_topic_researcher': ['research', 'analyze', 'summarize'],
      'bitware_rss_source_finder': ['find', 'validate', 'rank'],
      'bitware_feed_fetcher': ['fetch', 'parse', 'extract'],
      'bitware_content_classifier': ['classify', 'analyze', 'score'],
      'bitware_report_builder': ['build', 'format', 'generate'],
      'bitware_universal_researcher': ['research', 'deep_analyze', 'multi_source'],
      'bitware_ai_factory_optimizer': ['optimize', 'analyze', 'recommend']
    };

    return actionsMap[workerName] || ['execute'];
  }
}