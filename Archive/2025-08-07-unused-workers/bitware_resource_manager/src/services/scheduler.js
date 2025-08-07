/**
 * Scheduler Service
 * Coordinates request execution with resource availability
 */
export class Scheduler {
  constructor(env, resourcePool, queueManager, costTracker, optimizer) {
    this.env = env;
    this.resourcePool = resourcePool;
    this.queueManager = queueManager;
    this.costTracker = costTracker;
    this.optimizer = optimizer;
    this.isRunning = false;
    this.executionPromises = new Map();
  }

  /**
   * Start the scheduler
   */
  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Scheduler started');
    
    // Main scheduling loop
    this.scheduleLoop();
    
    // Periodic maintenance tasks
    this.maintenanceLoop();
  }

  /**
   * Stop the scheduler
   */
  stop() {
    this.isRunning = false;
    console.log('Scheduler stopped');
  }

  /**
   * Main scheduling loop
   */
  async scheduleLoop() {
    while (this.isRunning) {
      try {
        // Get next executable request
        const request = await this.queueManager.getNextExecutable(this.resourcePool);
        
        if (!request) {
          // No executable requests, wait a bit
          await this.sleep(100);
          continue;
        }

        // Optimize request
        const optimizationResult = await this.optimizer.optimizeRequest(request);
        const optimizedRequest = optimizationResult.optimized;

        // Check budget before execution
        const budgetCheck = await this.costTracker.checkBudget(
          optimizedRequest.clientId,
          optimizedRequest.estimatedCost || 0.1
        );

        if (!budgetCheck.available) {
          await this.handleBudgetExceeded(optimizedRequest, budgetCheck);
          continue;
        }

        // Reserve resources
        const reservation = await this.reserveResources(optimizedRequest);
        
        if (!reservation.success) {
          // Couldn't reserve resources, requeue
          await this.requeueRequest(optimizedRequest, reservation.waitTime);
          continue;
        }

        // Mark as executing
        this.queueManager.markExecuting(optimizedRequest);

        // Execute asynchronously
        const executionPromise = this.executeRequest(optimizedRequest, reservation)
          .catch(error => this.handleExecutionError(optimizedRequest, error, reservation));

        this.executionPromises.set(optimizedRequest.requestId, executionPromise);

      } catch (error) {
        console.error('Scheduler loop error:', error);
        await this.sleep(1000); // Wait before retry
      }
    }
  }

  /**
   * Periodic maintenance tasks
   */
  async maintenanceLoop() {
    while (this.isRunning) {
      try {
        // Save state periodically
        await this.saveState();
        
        // Clean up completed executions
        await this.cleanupExecutions();
        
        // Check for alerts
        await this.checkAlerts();
        
        // Wait 30 seconds before next maintenance
        await this.sleep(30000);
        
      } catch (error) {
        console.error('Maintenance loop error:', error);
      }
    }
  }

  /**
   * Reserve resources for request
   */
  async reserveResources(request) {
    const resources = request.resourceRequirements || {};
    const allocations = [];
    
    try {
      for (const [resourceType, amount] of Object.entries(resources)) {
        const allocation = await this.resourcePool.allocate({
          resourceType,
          amount,
          clientId: request.clientId,
          clientTier: request.clientTier,
          priority: request.priority,
          requestId: request.requestId
        });
        
        if (!allocation.success) {
          // Rollback previous allocations
          await this.rollbackAllocations(allocations);
          return allocation;
        }
        
        allocations.push(allocation);
      }
      
      return {
        success: true,
        allocations
      };
      
    } catch (error) {
      await this.rollbackAllocations(allocations);
      throw error;
    }
  }

  /**
   * Rollback resource allocations
   */
  async rollbackAllocations(allocations) {
    for (const allocation of allocations) {
      if (allocation.success && allocation.allocation) {
        await this.resourcePool.release(allocation.allocation.id);
      }
    }
  }

  /**
   * Execute a request
   */
  async executeRequest(request, reservation) {
    const startTime = Date.now();
    
    try {
      // Update status in database
      await this.updateRequestStatus(request.requestId, 'executing');
      
      // Check if this is a multi-stage pipeline
      const workerFlow = await this.getWorkerFlow(request);
      
      if (!workerFlow || workerFlow.length === 0) {
        throw new Error(`No worker flow found for template: ${request.templateName}`);
      }
      
      // Execute pipeline stages sequentially
      let stageOutput = request.data || {};
      let totalUsage = {};
      const stageResults = [];
      
      for (let i = 0; i < workerFlow.length; i++) {
        const stage = workerFlow[i];
        console.log(`Executing stage ${i + 1}/${workerFlow.length}: ${stage.worker}`);
        
        try {
          // Get worker binding for this stage
          const worker = await this.getWorkerBinding(stage.worker);
          
          if (!worker) {
            // Log warning but try to continue if not critical
            if (stage.required !== false) {
              throw new Error(`Required worker not found: ${stage.worker}`);
            }
            console.warn(`Optional worker not found: ${stage.worker}, skipping stage`);
            continue;
          }
          
          // Prepare stage request with output from previous stage
          const stageRequest = {
            ...request,
            data: stageOutput,
            action: stage.action,
            params: { ...stage.params, ...request.params }
          };
          
          // Execute stage with retry logic
          let stageResult;
          let retries = stage.retries || 2;
          let lastError;
          
          while (retries >= 0) {
            try {
              stageResult = await this.invokeWorker(
                { 
                  binding: worker, 
                  name: stage.worker,
                  action: stage.action,
                  params: stage.params
                }, 
                stageRequest
              );
              break; // Success, exit retry loop
            } catch (error) {
              lastError = error;
              retries--;
              if (retries >= 0) {
                console.warn(`Stage ${stage.worker} failed, retrying... (${retries} retries left)`);
                await this.sleep(1000); // Wait 1 second before retry
              }
            }
          }
          
          if (!stageResult && lastError) {
            if (stage.required !== false) {
              throw lastError;
            }
            console.warn(`Optional stage ${stage.worker} failed after retries, continuing pipeline`);
            continue;
          }
          
          // Store stage result for debugging
          stageResults.push({
            stage: stage.worker,
            success: true,
            output: stageResult.output
          });
          
          // Accumulate usage
          if (stageResult.usage) {
            totalUsage = this.mergeUsage(totalUsage, stageResult.usage);
          }
          
          // Use stage output as input for next stage
          stageOutput = stageResult.output || stageResult;
          
        } catch (stageError) {
          console.error(`Stage ${i + 1} (${stage.worker}) failed:`, stageError);
          
          // Store failure for debugging
          stageResults.push({
            stage: stage.worker,
            success: false,
            error: stageError.message
          });
          
          // Check if stage is critical
          if (stage.required !== false) {
            throw new Error(`Pipeline failed at stage ${i + 1} (${stage.worker}): ${stageError.message}`);
          }
          
          // Non-critical stage, continue with previous output
          console.warn(`Non-critical stage ${stage.worker} failed, continuing pipeline`);
        }
      }
      
      // Prepare final result
      const result = {
        success: true,
        output: stageOutput,
        usage: totalUsage,
        metadata: {
          stages: workerFlow.length,
          stageResults: stageResults,
          duration: Date.now() - startTime,
          requestId: request.requestId
        }
      };
      
      // Calculate actual cost
      const actualCost = await this.costTracker.calculateRequestCost(request, result.usage);
      
      // Record execution
      await this.recordExecution(request, result, actualCost, startTime);
      
      // Mark as completed
      this.queueManager.markCompleted(request.requestId);
      
      // Update status
      await this.updateRequestStatus(request.requestId, 'completed');
      
      // Notify completion
      await this.notifyCompletion(request, result);
      
      return result;
      
    } catch (error) {
      console.error(`Execution error for ${request.requestId}:`, error);
      throw error;
    }
  }

  /**
   * Get worker flow for request
   */
  async getWorkerFlow(request) {
    // First check if request already has worker_flow
    if (request.workerFlow && Array.isArray(request.workerFlow)) {
      return request.workerFlow;
    }
    
    // Try to fetch template from KAM
    if (this.env.KAM) {
      try {
        const templateRequest = new Request(`https://kam/api/templates/${request.templateName}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.env.WORKER_SECRET || 'internal-worker-auth-token-2024'}`,
            'X-Worker-ID': 'resource_manager'
          }
        });
        
        const response = await this.env.KAM.fetch(templateRequest);
        if (response.ok) {
          const template = await response.json();
          
          if (template.worker_flow) {
            const workerFlow = typeof template.worker_flow === 'string' 
              ? JSON.parse(template.worker_flow) 
              : template.worker_flow;
            return workerFlow;
          }
        }
      } catch (error) {
        console.error('Failed to fetch template from KAM:', error);
      }
    }
    
    // Fallback: single worker based on template name
    const worker = await this.getDefaultWorkerForTemplate(request.templateName);
    if (worker) {
      return [{
        worker: worker,
        action: 'process',
        params: {}
      }];
    }
    
    return null;
  }
  
  /**
   * Get worker binding by name
   */
  async getWorkerBinding(workerName) {
    // Convert worker name to binding (bitware-content-granulator -> CONTENT_GRANULATOR)
    const bindingName = workerName.replace('bitware-', '').replace(/-/g, '_').toUpperCase();
    
    if (this.env[bindingName]) {
      return this.env[bindingName];
    }
    
    // Try alternative naming patterns
    const altBindingName = workerName.toUpperCase().replace(/-/g, '_');
    if (this.env[altBindingName]) {
      return this.env[altBindingName];
    }
    
    return null;
  }
  
  /**
   * Get default worker for template
   */
  async getDefaultWorkerForTemplate(templateName) {
    // Map template names to default workers
    const templateWorkerMap = {
      'content_granulation': 'bitware-content-granulator',
      'topic_research': 'bitware-topic-researcher',
      'rss_discovery': 'bitware-rss-source-finder',
      'feed_fetching': 'bitware-feed-fetcher',
      'content_classification': 'bitware-content-classifier',
      'report_generation': 'bitware-report-builder',
      'universal_research': 'bitware-universal-researcher'
    };
    
    return templateWorkerMap[templateName] || null;
  }
  
  /**
   * Merge usage data from multiple stages
   */
  mergeUsage(existing, newUsage) {
    const merged = { ...existing };
    
    // Merge API usage
    if (newUsage.api) {
      merged.api = merged.api || {};
      for (const [provider, models] of Object.entries(newUsage.api)) {
        merged.api[provider] = merged.api[provider] || {};
        for (const [model, usage] of Object.entries(models)) {
          merged.api[provider][model] = merged.api[provider][model] || { input: 0, output: 0 };
          merged.api[provider][model].input += usage.input || 0;
          merged.api[provider][model].output += usage.output || 0;
        }
      }
    }
    
    // Merge compute usage
    if (newUsage.compute) {
      merged.compute = merged.compute || { cpu_ms: 0, invocations: 0 };
      merged.compute.cpu_ms += newUsage.compute.cpu_ms || 0;
      merged.compute.invocations += newUsage.compute.invocations || 0;
    }
    
    // Merge storage usage
    if (newUsage.storage) {
      merged.storage = merged.storage || { reads: 0, writes: 0, bytes: 0 };
      merged.storage.reads += newUsage.storage.reads || 0;
      merged.storage.writes += newUsage.storage.writes || 0;
      merged.storage.bytes += newUsage.storage.bytes || 0;
    }
    
    return merged;
  }

  /**
   * Get worker for template
   */
  async getWorkerForTemplate(templateName, request) {
    // First, check if the request already has worker_flow information
    if (request.workerFlow && request.workerFlow.length > 0) {
      const workerInfo = request.workerFlow[0];
      const workerName = workerInfo.worker;
      
      // Convert worker name to binding (bitware-content-granulator -> CONTENT_GRANULATOR)
      const bindingName = workerName.replace('bitware-', '').replace(/-/g, '_').toUpperCase();
      
      if (this.env[bindingName]) {
        return {
          name: workerName,
          binding: this.env[bindingName],
          action: workerInfo.action,
          params: workerInfo.params
        };
      }
    }
    
    // If no worker_flow, try to fetch template from KAM
    if (this.env.KAM) {
      try {
        const templateRequest = new Request(`https://kam/api/templates/${templateName}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.env.WORKER_SECRET || 'internal-worker-auth-token-2024'}`,
            'X-Worker-ID': 'resource_manager'
          }
        });
        
        const response = await this.env.KAM.fetch(templateRequest);
        if (response.ok) {
          const template = await response.json();
          
          if (template.worker_flow && typeof template.worker_flow === 'string') {
            const workerFlow = JSON.parse(template.worker_flow);
            if (workerFlow[0]) {
              const workerInfo = workerFlow[0];
              const workerName = workerInfo.worker;
              const bindingName = workerName.replace('bitware-', '').replace(/-/g, '_').toUpperCase();
              
              if (this.env[bindingName]) {
                return {
                  name: workerName,
                  binding: this.env[bindingName],
                  action: workerInfo.action,
                  params: workerInfo.params
                };
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch template from KAM:', error);
      }
    }
    
    // Fallback: Try to find worker from registry
    const worker = await this.env.DB.prepare(
      'SELECT * FROM worker_registry WHERE status = "active" AND capabilities LIKE ?'
    ).bind(`%${templateName}%`).first();
    
    if (worker) {
      const bindingName = worker.name.replace('bitware-', '').replace(/-/g, '_').toUpperCase();
      return {
        name: worker.name,
        binding: this.env[bindingName]
      };
    }
    
    return null;
  }

  /**
   * Invoke worker with request
   */
  async invokeWorker(worker, request) {
    if (!worker.binding) {
      throw new Error(`Worker ${worker.name} not available`);
    }

    // Prepare worker request
    const workerRequest = new Request('https://worker/api/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': request.requestId,
        'X-Client-ID': String(request.clientId),
        'X-Priority': request.priority
      },
      body: JSON.stringify({
        action: worker.action || request.action || 'process',
        input: request.data,
        params: worker.params || {},
        config: request.config || {},
        timeout: request.timeout || 30000
      })
    });

    // Call worker with timeout
    const timeout = request.timeout || 30000;
    const response = await Promise.race([
      worker.binding.fetch(workerRequest),
      this.timeout(timeout)
    ]);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Worker error: ${error}`);
    }

    const result = await response.json();
    
    // Extract usage information
    const usage = this.extractUsage(result);
    
    return {
      success: true,
      output: result.output || result,
      usage,
      metadata: result.metadata || {}
    };
  }

  /**
   * Extract usage information from worker response
   */
  extractUsage(result) {
    const usage = {};
    
    // Extract API usage
    if (result.usage?.tokens) {
      usage.api = {
        openai: {
          [result.model || 'gpt-3.5-turbo']: {
            input: result.usage.tokens.input || 0,
            output: result.usage.tokens.output || 0
          }
        }
      };
    }

    // Extract compute usage
    if (result.duration) {
      usage.compute = {
        cpu_ms: result.duration,
        invocations: 1
      };
    }

    // Extract storage usage
    if (result.storage) {
      usage.storage = result.storage;
    }

    return usage;
  }

  /**
   * Handle execution error
   */
  async handleExecutionError(request, error, reservation) {
    console.error(`Execution failed for ${request.requestId}:`, error);
    
    // Release resources
    if (reservation && reservation.allocations) {
      await this.rollbackAllocations(reservation.allocations);
    }

    // Mark as failed
    this.queueManager.markCompleted(request.requestId);
    
    // Update status
    await this.updateRequestStatus(request.requestId, 'failed', error.message);
    
    // Check retry policy
    if (request.retryCount < (request.maxRetries || 3)) {
      // Requeue with increased retry count
      const retryRequest = {
        ...request,
        retryCount: (request.retryCount || 0) + 1,
        priority: Math.min(100, request.priority + 10) // Boost priority for retry
      };
      
      await this.queueManager.enqueue(retryRequest);
    } else {
      // Max retries reached, notify failure
      await this.notifyFailure(request, error);
    }
  }

  /**
   * Handle budget exceeded
   */
  async handleBudgetExceeded(request, budgetInfo) {
    console.warn(`Budget exceeded for client ${request.clientId}`);
    
    // Update status
    await this.updateRequestStatus(request.requestId, 'failed', 'Budget exceeded');
    
    // Create alert
    await this.createAlert({
      type: 'budget_exceeded',
      severity: 'critical',
      clientId: request.clientId,
      message: `Client ${request.clientId} budget exceeded`,
      details: budgetInfo
    });
    
    // Notify client
    await this.notifyBudgetExceeded(request, budgetInfo);
  }

  /**
   * Requeue request
   */
  async requeueRequest(request, waitTime) {
    const requeuedRequest = {
      ...request,
      waitTime: (request.waitTime || 0) + waitTime,
      requeueCount: (request.requeueCount || 0) + 1
    };
    
    // If requeued too many times, fail it
    if (requeuedRequest.requeueCount > 10) {
      await this.handleExecutionError(
        request,
        new Error('Max requeue attempts exceeded'),
        null
      );
      return;
    }
    
    await this.queueManager.enqueue(requeuedRequest);
  }

  /**
   * Record execution in database
   */
  async recordExecution(request, result, cost, startTime) {
    const duration = Date.now() - startTime;
    
    await this.env.DB.prepare(
      `INSERT INTO execution_history 
       (request_id, client_id, template_name, input_data, output_data, 
        status, started_at, completed_at, duration_ms, total_cost)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      request.requestId,
      request.clientId,
      request.templateName,
      JSON.stringify(request.data),
      JSON.stringify(result.output),
      result.success ? 'success' : 'partial',
      new Date(startTime).toISOString(),
      new Date().toISOString(),
      duration,
      cost.total
    ).run();
  }

  /**
   * Update request status
   */
  async updateRequestStatus(requestId, status, error = null) {
    const updates = ['status = ?'];
    const params = [status];
    
    if (status === 'executing') {
      updates.push('started_at = CURRENT_TIMESTAMP');
    } else if (status === 'completed' || status === 'failed') {
      updates.push('completed_at = CURRENT_TIMESTAMP');
    }
    
    if (error) {
      updates.push('error_message = ?');
      params.push(error);
    }
    
    params.push(requestId);
    
    await this.env.DB.prepare(
      `UPDATE resource_queue SET ${updates.join(', ')} WHERE request_id = ?`
    ).bind(...params).run();
  }

  /**
   * Notify completion
   */
  async notifyCompletion(request, result) {
    // Notify KAM if available
    if (this.env.KAM) {
      try {
        await this.env.KAM.fetch(
          new Request('https://kam/internal/request/complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.env.WORKER_SECRET}`,
              'X-Worker-ID': 'resource-manager'
            },
            body: JSON.stringify({
              requestId: request.requestId,
              clientId: request.clientId,
              result: result.output,
              cost: result.cost
            })
          })
        );
      } catch (error) {
        console.error('Failed to notify KAM:', error);
      }
    }
  }

  /**
   * Notify failure
   */
  async notifyFailure(request, error) {
    if (this.env.KAM) {
      try {
        await this.env.KAM.fetch(
          new Request('https://kam/internal/request/failed', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.env.WORKER_SECRET}`,
              'X-Worker-ID': 'resource-manager'
            },
            body: JSON.stringify({
              requestId: request.requestId,
              clientId: request.clientId,
              error: error.message
            })
          })
        );
      } catch (err) {
        console.error('Failed to notify KAM:', err);
      }
    }
  }

  /**
   * Notify budget exceeded
   */
  async notifyBudgetExceeded(request, budgetInfo) {
    if (this.env.KAM) {
      try {
        await this.env.KAM.fetch(
          new Request('https://kam/internal/budget/exceeded', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.env.WORKER_SECRET}`,
              'X-Worker-ID': 'resource-manager'
            },
            body: JSON.stringify({
              clientId: request.clientId,
              budgetInfo
            })
          })
        );
      } catch (error) {
        console.error('Failed to notify budget exceeded:', error);
      }
    }
  }

  /**
   * Create alert
   */
  async createAlert(alert) {
    await this.env.DB.prepare(
      `INSERT INTO resource_alerts 
       (alert_type, severity, client_id, message, details)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(
      alert.type,
      alert.severity,
      alert.clientId || null,
      alert.message,
      JSON.stringify(alert.details || {})
    ).run();
  }

  /**
   * Check for alert conditions
   */
  async checkAlerts() {
    // Check resource utilization
    const poolStatus = await this.resourcePool.getStatus();
    
    for (const [pool, status] of Object.entries(poolStatus)) {
      if (status.shared.percentage < 10) {
        await this.createAlert({
          type: 'resource_low',
          severity: 'warning',
          message: `Resource pool ${pool} running low`,
          details: status
        });
      }
    }

    // Check queue depth
    const queueStatus = this.queueManager.getQueueStatus();
    
    if (queueStatus.total > 1000) {
      await this.createAlert({
        type: 'queue_backup',
        severity: 'warning',
        message: 'Queue depth exceeds 1000 requests',
        details: queueStatus
      });
    }

    // Check for starved requests
    for (const [queueName, status] of Object.entries(queueStatus)) {
      if (status.starved && status.starved > 0) {
        await this.createAlert({
          type: 'request_starvation',
          severity: 'error',
          message: `${status.starved} starved requests in ${queueName} queue`,
          details: { queue: queueName, starved: status.starved }
        });
      }
    }
  }

  /**
   * Save state to KV
   */
  async saveState() {
    await this.resourcePool.saveState();
    await this.queueManager.saveState();
  }

  /**
   * Clean up completed executions
   */
  async cleanupExecutions() {
    const completed = [];
    
    for (const [requestId, promise] of this.executionPromises) {
      if (await this.isPromiseResolved(promise)) {
        completed.push(requestId);
      }
    }
    
    for (const requestId of completed) {
      this.executionPromises.delete(requestId);
    }
  }

  /**
   * Check if promise is resolved
   */
  async isPromiseResolved(promise) {
    const result = await Promise.race([
      promise.then(() => true).catch(() => true),
      Promise.resolve(false)
    ]);
    return result;
  }

  /**
   * Timeout utility
   */
  timeout(ms) {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), ms)
    );
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}