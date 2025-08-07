/**
 * Priority Queue implementation with fairness
 */
class PriorityQueue {
  constructor(name) {
    this.name = name;
    this.items = [];
    this.starvationThreshold = 600000; // 10 minutes
  }

  insert(item, priority) {
    const queueItem = {
      ...item,
      priority,
      enqueuedAt: Date.now(),
      position: this.items.length
    };

    // Insert in priority order
    let inserted = false;
    for (let i = 0; i < this.items.length; i++) {
      if (priority > this.items[i].priority) {
        this.items.splice(i, 0, queueItem);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      this.items.push(queueItem);
    }

    // Update positions
    this.updatePositions();
    return queueItem.position;
  }

  dequeue() {
    if (this.items.length === 0) return null;
    
    const item = this.items.shift();
    this.updatePositions();
    return item;
  }

  peek() {
    return this.items[0] || null;
  }

  remove(requestId) {
    const index = this.items.findIndex(item => item.requestId === requestId);
    if (index !== -1) {
      this.items.splice(index, 1);
      this.updatePositions();
      return true;
    }
    return false;
  }

  getPosition(requestId) {
    const index = this.items.findIndex(item => item.requestId === requestId);
    return index !== -1 ? index : -1;
  }

  size() {
    return this.items.length;
  }

  updatePositions() {
    this.items.forEach((item, index) => {
      item.position = index;
    });
  }

  getStarvedItems() {
    const now = Date.now();
    return this.items.filter(item => 
      (now - item.enqueuedAt) > this.starvationThreshold
    );
  }
}

/**
 * Multi-level Queue Manager with advanced scheduling
 */
export class QueueManager {
  constructor(env) {
    this.env = env;
    this.queues = {
      immediate: new PriorityQueue('immediate'),   // < 1 second
      fast: new PriorityQueue('fast'),            // < 10 seconds
      normal: new PriorityQueue('normal'),        // < 1 minute
      batch: new PriorityQueue('batch'),          // < 1 hour
      deferred: new PriorityQueue('deferred')     // > 1 hour
    };
    this.fairnessTracker = new Map();
    this.executingRequests = new Map();
  }

  /**
   * Enqueue a request with calculated priority
   */
  async enqueue(request) {
    // Calculate wait time and select queue
    const estimatedWait = await this.calculateWaitTime(request);
    const queueName = this.selectQueue(estimatedWait);
    const queue = this.queues[queueName];

    // Calculate priority with fairness
    const priority = await this.calculatePriority(request);

    // Check for starvation and boost if needed
    if (await this.isStarving(request)) {
      priority.value += 10;
      priority.reason = 'starvation_boost';
    }

    // Insert into queue
    const position = queue.insert(request, priority.value);

    // Track in database
    await this.trackEnqueue(request, queueName, position, estimatedWait);

    // Update fairness tracker
    this.updateFairness(request.clientId);

    return {
      queueName,
      position,
      estimatedWait,
      estimatedStart: new Date(Date.now() + estimatedWait).toISOString(),
      priority: priority.value
    };
  }

  /**
   * Calculate priority based on multiple factors
   */
  async calculatePriority(request) {
    let priority = 0;
    const factors = [];

    // 1. Client tier (0-40 points)
    const tierPoints = {
      'enterprise': 40,
      'premium': 30,
      'standard': 20,
      'basic': 10
    };
    priority += tierPoints[request.clientTier] || 10;
    factors.push(`tier:${request.clientTier}(${tierPoints[request.clientTier]})`);

    // 2. Request urgency (0-30 points)
    const urgencyPoints = {
      'urgent': 30,
      'high': 20,
      'normal': 10,
      'low': 0
    };
    priority += urgencyPoints[request.urgency] || 10;
    factors.push(`urgency:${request.urgency}(${urgencyPoints[request.urgency]})`);

    // 3. Wait time boost (0-20 points)
    const waitMinutes = request.waitTime ? request.waitTime / 60000 : 0;
    const waitBoost = Math.min(20, Math.floor(waitMinutes / 5));
    priority += waitBoost;
    if (waitBoost > 0) factors.push(`wait:${waitBoost}`);

    // 4. Client fairness (0-10 points)
    const fairnessScore = await this.getFairnessScore(request.clientId);
    priority += fairnessScore;
    factors.push(`fairness:${fairnessScore}`);

    // 5. SLA requirements (0-10 points)
    if (request.slaDeadline) {
      const timeToDeadline = request.slaDeadline - Date.now();
      if (timeToDeadline < 3600000) { // Less than 1 hour
        priority += 10;
        factors.push('sla:10');
      } else if (timeToDeadline < 86400000) { // Less than 1 day
        priority += 5;
        factors.push('sla:5');
      }
    }

    return {
      value: Math.min(100, priority), // Cap at 100
      factors
    };
  }

  /**
   * Calculate estimated wait time
   */
  async calculateWaitTime(request) {
    // Get resource requirements
    const resources = request.resourceRequirements || {};
    let maxWait = 0;

    // Check each required resource
    for (const [resourceType, amount] of Object.entries(resources)) {
      const availability = await this.env.resourcePool.checkAvailability(resourceType, amount);
      if (availability.waitTime > maxWait) {
        maxWait = availability.waitTime;
      }
    }

    // Add queue depth factor
    const queueDepth = this.getTotalQueueDepth();
    const queueWait = queueDepth * 1000; // Rough estimate: 1 second per queued request

    return maxWait + queueWait;
  }

  /**
   * Select appropriate queue based on wait time
   */
  selectQueue(waitTime) {
    if (waitTime < 1000) return 'immediate';
    if (waitTime < 10000) return 'fast';
    if (waitTime < 60000) return 'normal';
    if (waitTime < 3600000) return 'batch';
    return 'deferred';
  }

  /**
   * Check if request is starving
   */
  async isStarving(request) {
    if (!request.enqueuedAt) return false;
    
    const waitTime = Date.now() - request.enqueuedAt;
    return waitTime > 600000; // 10 minutes
  }

  /**
   * Get fairness score for client
   */
  async getFairnessScore(clientId) {
    const usage = this.fairnessTracker.get(clientId) || { requests: 0, lastReset: Date.now() };
    
    // Reset if needed (hourly)
    if (Date.now() - usage.lastReset > 3600000) {
      usage.requests = 0;
      usage.lastReset = Date.now();
    }

    // Calculate fairness (fewer recent requests = higher score)
    const fairness = Math.max(0, 10 - Math.floor(usage.requests / 10));
    return fairness;
  }

  /**
   * Update fairness tracking
   */
  updateFairness(clientId) {
    const usage = this.fairnessTracker.get(clientId) || { requests: 0, lastReset: Date.now() };
    usage.requests++;
    this.fairnessTracker.set(clientId, usage);
  }

  /**
   * Get next executable request
   */
  async getNextExecutable(resourcePool) {
    // Check for starved requests first
    for (const queue of Object.values(this.queues)) {
      const starved = queue.getStarvedItems();
      for (const item of starved) {
        if (await this.canExecute(item, resourcePool)) {
          queue.remove(item.requestId);
          return item;
        }
      }
    }

    // Check queues in priority order
    const queueOrder = ['immediate', 'fast', 'normal', 'batch'];
    
    for (const queueName of queueOrder) {
      const queue = this.queues[queueName];
      const item = queue.peek();
      
      if (!item) continue;
      
      if (await this.canExecute(item, resourcePool)) {
        return queue.dequeue();
      }
    }

    // Check deferred queue if nothing else
    const deferred = this.queues.deferred.peek();
    if (deferred && await this.canExecute(deferred, resourcePool)) {
      return this.queues.deferred.dequeue();
    }

    return null;
  }

  /**
   * Check if request can be executed with current resources
   */
  async canExecute(request, resourcePool) {
    const resources = request.resourceRequirements || {};
    
    for (const [resourceType, amount] of Object.entries(resources)) {
      const availability = await resourcePool.checkAvailability(resourceType, amount);
      if (!availability.available && availability.waitTime > 1000) {
        return false;
      }
    }

    // Check concurrent execution limits
    const clientExecuting = this.getClientExecutingCount(request.clientId);
    const maxConcurrent = this.getMaxConcurrent(request.clientTier);
    
    if (clientExecuting >= maxConcurrent) {
      return false;
    }

    return true;
  }

  /**
   * Get client's currently executing request count
   */
  getClientExecutingCount(clientId) {
    let count = 0;
    for (const [_, request] of this.executingRequests) {
      if (request.clientId === clientId) count++;
    }
    return count;
  }

  /**
   * Get max concurrent requests by tier
   */
  getMaxConcurrent(tier) {
    const limits = {
      'enterprise': 100,
      'premium': 50,
      'standard': 20,
      'basic': 5
    };
    return limits[tier] || 5;
  }

  /**
   * Mark request as executing
   */
  markExecuting(request) {
    this.executingRequests.set(request.requestId, request);
  }

  /**
   * Mark request as completed
   */
  markCompleted(requestId) {
    this.executingRequests.delete(requestId);
  }

  /**
   * Get total queue depth
   */
  getTotalQueueDepth() {
    let total = 0;
    for (const queue of Object.values(this.queues)) {
      total += queue.size();
    }
    return total;
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    const status = {};
    
    for (const [name, queue] of Object.entries(this.queues)) {
      status[name] = {
        depth: queue.size(),
        oldest: queue.peek()?.enqueuedAt,
        starved: queue.getStarvedItems().length
      };
    }

    status.executing = this.executingRequests.size;
    status.total = this.getTotalQueueDepth();
    
    return status;
  }

  /**
   * Remove request from queue
   */
  async removeFromQueue(requestId) {
    for (const queue of Object.values(this.queues)) {
      if (queue.remove(requestId)) {
        await this.trackDequeue(requestId, 'cancelled');
        return true;
      }
    }
    return false;
  }

  /**
   * Track enqueue in database
   */
  async trackEnqueue(request, queueName, position, estimatedWait) {
    await this.env.DB.prepare(
      `INSERT INTO resource_queue 
       (request_id, client_id, template_name, priority, queue_name, 
        resource_requirements, estimated_wait_ms, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'queued')`
    ).bind(
      request.requestId,
      request.clientId,
      request.templateName,
      request.priority || 50,
      queueName,
      JSON.stringify(request.resourceRequirements || {}),
      estimatedWait
    ).run();
  }

  /**
   * Track dequeue in database
   */
  async trackDequeue(requestId, status) {
    await this.env.DB.prepare(
      `UPDATE resource_queue 
       SET status = ?, scheduled_at = CURRENT_TIMESTAMP
       WHERE request_id = ?`
    ).bind(status, requestId).run();
  }

  /**
   * Save queue state to KV
   */
  async saveState() {
    const state = {};
    
    for (const [name, queue] of Object.entries(this.queues)) {
      state[name] = queue.items;
    }

    await this.env.EXECUTION_QUEUE.put('queue-state', JSON.stringify(state));
    await this.env.EXECUTION_QUEUE.put('fairness-tracker', JSON.stringify([...this.fairnessTracker]));
  }

  /**
   * Load queue state from KV
   */
  async loadState() {
    try {
      const queueState = await this.env.EXECUTION_QUEUE.get('queue-state', 'json');
      if (queueState) {
        for (const [name, items] of Object.entries(queueState)) {
          if (this.queues[name]) {
            this.queues[name].items = items;
            this.queues[name].updatePositions();
          }
        }
      }

      const fairnessState = await this.env.EXECUTION_QUEUE.get('fairness-tracker', 'json');
      if (fairnessState) {
        this.fairnessTracker = new Map(fairnessState);
      }
    } catch (error) {
      console.error('Error loading queue state:', error);
    }
  }
}