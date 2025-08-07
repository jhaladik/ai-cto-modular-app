/**
 * Token Bucket Algorithm for Rate Limiting
 * Implements a token bucket with configurable capacity and refill rate
 */
export class TokenBucket {
  constructor(capacity, refillPerSecond) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillPerSecond;
    this.lastRefill = Date.now();
  }

  /**
   * Refill tokens based on elapsed time
   */
  refill() {
    const now = Date.now();
    const secondsElapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = secondsElapsed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Attempt to consume tokens
   * @param {number} amount - Number of tokens to consume
   * @returns {Promise<boolean>} - True if tokens were consumed
   */
  async consume(amount) {
    this.refill();
    
    if (this.tokens >= amount) {
      this.tokens -= amount;
      return true;
    }
    
    // Calculate wait time if not enough tokens
    const deficit = amount - this.tokens;
    const waitSeconds = deficit / this.refillRate;
    
    // Max wait time of 5 minutes
    if (waitSeconds > 300) {
      return false;
    }
    
    // Wait and retry
    await this.sleep(waitSeconds * 1000);
    return this.consume(amount);
  }

  /**
   * Check if tokens can be consumed without waiting
   */
  canConsume(amount) {
    this.refill();
    return this.tokens >= amount;
  }

  /**
   * Get current available tokens
   */
  getAvailable() {
    this.refill();
    return Math.floor(this.tokens);
  }

  /**
   * Calculate wait time for consuming tokens
   */
  getWaitTime(amount) {
    this.refill();
    if (this.tokens >= amount) return 0;
    
    const deficit = amount - this.tokens;
    return (deficit / this.refillRate) * 1000; // Return milliseconds
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Export state for persistence
   */
  exportState() {
    return {
      capacity: this.capacity,
      tokens: this.tokens,
      refillRate: this.refillRate,
      lastRefill: this.lastRefill
    };
  }

  /**
   * Import state from persistence
   */
  static fromState(state) {
    const bucket = new TokenBucket(state.capacity, state.refillRate);
    bucket.tokens = state.tokens;
    bucket.lastRefill = state.lastRefill;
    bucket.refill(); // Refill based on time elapsed
    return bucket;
  }
}

/**
 * Sliding Window Quota for longer-term limits
 */
export class SlidingWindowQuota {
  constructor(windowSizeMs, limit) {
    this.windowSize = windowSizeMs;
    this.limit = limit;
    this.window = [];
  }

  /**
   * Clean up old entries outside the window
   */
  cleanup() {
    const cutoff = Date.now() - this.windowSize;
    this.window = this.window.filter(w => w.timestamp > cutoff);
  }

  /**
   * Get current usage within the window
   */
  getCurrentUsage() {
    this.cleanup();
    return this.window.reduce((sum, w) => sum + w.amount, 0);
  }

  /**
   * Check if amount can be consumed
   */
  canConsume(amount) {
    this.cleanup();
    const current = this.getCurrentUsage();
    return (current + amount) <= this.limit;
  }

  /**
   * Consume amount if within limit
   */
  consume(amount) {
    if (!this.canConsume(amount)) {
      return false;
    }
    
    this.window.push({
      timestamp: Date.now(),
      amount
    });
    
    return true;
  }

  /**
   * Get remaining quota
   */
  getRemaining() {
    this.cleanup();
    return Math.max(0, this.limit - this.getCurrentUsage());
  }

  /**
   * Get time until quota resets
   */
  getResetTime() {
    this.cleanup();
    if (this.window.length === 0) return 0;
    
    const oldestEntry = this.window[0];
    const resetTime = oldestEntry.timestamp + this.windowSize;
    return Math.max(0, resetTime - Date.now());
  }

  /**
   * Export state for persistence
   */
  exportState() {
    this.cleanup();
    return {
      windowSize: this.windowSize,
      limit: this.limit,
      window: this.window
    };
  }

  /**
   * Import state from persistence
   */
  static fromState(state) {
    const quota = new SlidingWindowQuota(state.windowSize, state.limit);
    quota.window = state.window || [];
    quota.cleanup();
    return quota;
  }
}