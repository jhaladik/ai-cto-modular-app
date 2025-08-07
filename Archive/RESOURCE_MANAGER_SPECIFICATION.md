# Resource Manager - Detailed Specification Document

## Executive Summary

The Resource Manager is a critical infrastructure component that manages all limited resources across the AI Factory system. It acts as the central gatekeeper for API rate limits, service quotas, and resource allocation, ensuring no worker exceeds limits while optimizing resource utilization across all clients.

## 1. System Context and Integration

### 1.1 Position in Architecture

```
┌─────────────────┐
│   Client API    │
└────────┬────────┘
         │
    ┌────▼────┐
    │   KAM   │ (Authentication, Templates, Client Management)
    └────┬────┘
         │ Request with Template
    ┌────▼────────────┐
    │Resource Manager │ (THIS COMPONENT)
    │  - Rate Limits  │
    │  - Quotas       │
    │  - Scheduling    │
    └────────┬────────┘
              │ Approved Execution
         ┌────▼────┐
         │ Workers │
         └─────────┘
```

### 1.2 Relationship with KAM

**KAM Responsibilities:**
- Client authentication and session management
- Template storage and management
- Client budget and subscription tiers
- Request creation and status tracking
- Client communication history

**Resource Manager Gets from KAM:**
- Client tier (basic/standard/premium/enterprise)
- Monthly budget remaining
- Template requirements
- Request priority/urgency
- Client resource usage history

**Resource Manager Reports to KAM:**
- Resource consumption per request
- Cost accumulation
- Queue position updates
- Completion notifications
- Resource violation alerts

## 2. Current and Future Workers Analysis

### 2.1 Worker v1.0 (Current Production)

| Worker | Primary Resources | Rate Limits | Cost Factors |
|--------|------------------|-------------|--------------|
| **topic_researcher** | OpenAI GPT-4 | 10K tokens/min | $0.03/1K input, $0.06/1K output |
| **rss_source_finder** | External APIs, Web scraping | 100 requests/min | Bandwidth: 10MB/min |
| **feed_fetcher** | RSS feeds, Web pages | 500 URLs/min | Bandwidth: 50MB/min |
| **content_classifier** | OpenAI GPT-3.5 | 90K tokens/min | $0.0015/1K input, $0.002/1K output |
| **report_builder** | Template engine, Storage | 100 reports/hour | Storage: 1MB/report |
| **ai_factory_optimizer** | Internal metrics | N/A | CPU time only |

### 2.2 Worker v2.0 (In Development)

| Worker | Primary Resources | Rate Limits | Cost Factors | Special Requirements |
|--------|------------------|-------------|--------------|---------------------|
| **content_granulator** | OpenAI GPT-4, Validation API | 10K tokens/min, 3 validations/request | $0.03/1K + validation cost | Requires 3-stage validation |
| **universal_researcher** | Multiple AI providers, Web APIs | Provider-specific | Variable by provider | Fallback capability needed |
| **email_sender** | SendGrid/SES | 100/hour (free), 10K/hour (paid) | $0.0001/email | Template rendering |
| **sms_notifier** | Twilio | 500/day | $0.0075/SMS | Phone number validation |
| **document_generator** | OpenAI, PDF engine | 5K tokens/min, 50 PDFs/hour | $0.02/page | Large memory usage |
| **video_summarizer** | OpenAI Vision, Whisper | 100 min/day | $0.006/min | Long processing time |
| **data_analyzer** | OpenAI, Database | 50K tokens/min, 1K queries/sec | $0.01/1K tokens | Heavy CPU usage |
| **webhook_dispatcher** | External endpoints | 1000/min | Bandwidth | Retry logic needed |

### 2.3 Future Workers (Planned)

| Worker | Expected Resources | Anticipated Limits | Notes |
|--------|-------------------|-------------------|-------|
| **translation_engine** | DeepL/Google Translate | 1M chars/month | Multi-language support |
| **image_generator** | DALL-E 3, Midjourney | 100 images/day | $0.04-0.08/image |
| **voice_synthesizer** | ElevenLabs, OpenAI TTS | 100K chars/month | $0.00015/char |
| **calendar_integrator** | Google/Outlook APIs | 10K events/day | OAuth token management |
| **payment_processor** | Stripe/PayPal | 100 transactions/sec | PCI compliance |
| **social_media_poster** | Twitter/LinkedIn APIs | Platform-specific | Complex rate limits |

## 3. Resource Types and Management

### 3.1 Resource Categories

#### A. API Resources
```typescript
interface APIResource {
  provider: 'openai' | 'anthropic' | 'google' | 'deepl' | 'sendgrid' | 'twilio';
  type: 'tokens' | 'requests' | 'characters' | 'images' | 'minutes';
  limits: {
    perSecond?: number;
    perMinute?: number;
    perHour?: number;
    perDay?: number;
    perMonth?: number;
  };
  costs: {
    unit: string;
    price: number;
    currency: 'USD';
  };
  currentUsage: {
    period: string;
    consumed: number;
    remaining: number;
    resetsAt: Date;
  };
}
```

#### B. Infrastructure Resources
```typescript
interface InfrastructureResource {
  type: 'cpu' | 'memory' | 'storage' | 'bandwidth' | 'database';
  limits: {
    cloudflare: {
      cpuMs: 50000;      // 50 seconds per invocation
      memory: 128;       // MB
      duration: 30000;   // 30 seconds max
      subrequests: 50;   // Per invocation
    };
    storage: {
      kv: { reads: 100000, writes: 1000 };  // Per day
      r2: { storage: 10, bandwidth: 50 };   // GB
      d1: { queries: 50000, storage: 500 }; // Per day, MB
    };
  };
}
```

#### C. Business Resources
```typescript
interface BusinessResource {
  type: 'budget' | 'credits' | 'requests' | 'users';
  client: string;
  tier: 'basic' | 'standard' | 'premium' | 'enterprise';
  limits: {
    monthlyBudget: number;
    dailyRequests: number;
    concurrentJobs: number;
    priorityScore: number; // 1-10
  };
  consumption: {
    currentMonth: number;
    currentDay: number;
    activeJobs: number;
  };
}
```

### 3.2 Resource Pools and Allocation

```typescript
class ResourcePool {
  private pools = {
    // Shared pools for all clients
    shared: {
      openai: new TokenBucket(100000, 1666), // 100K/min
      email: new TokenBucket(1000, 16),      // 1000/min
      database: new TokenBucket(50000, 833), // 50K/min
    },
    
    // Dedicated pools for enterprise clients
    dedicated: new Map<string, ResourceSet>(),
    
    // Reserved capacity for urgent requests
    reserved: {
      openai: new TokenBucket(10000, 166),   // 10% reserved
      email: new TokenBucket(100, 1.6),      // 10% reserved
    }
  };
  
  async allocate(request: ResourceRequest): Promise<Allocation> {
    const tier = request.clientTier;
    
    if (tier === 'enterprise' && this.pools.dedicated.has(request.clientId)) {
      // Use dedicated pool
      return this.pools.dedicated.get(request.clientId).allocate(request);
    } else if (request.priority === 'urgent') {
      // Try reserved pool first
      if (await this.pools.reserved.canAllocate(request)) {
        return this.pools.reserved.allocate(request);
      }
    }
    
    // Use shared pool with tier-based priority
    return this.pools.shared.allocate(request, tier);
  }
}
```

## 4. Queue Management System

### 4.1 Multi-Level Queue Architecture

```typescript
class QueueManager {
  private queues = {
    immediate: new PriorityQueue(),  // < 1 second wait
    fast: new PriorityQueue(),       // < 10 seconds wait
    normal: new PriorityQueue(),     // < 1 minute wait
    batch: new PriorityQueue(),      // < 1 hour wait
    deferred: new PriorityQueue()    // > 1 hour wait
  };
  
  private fairnessTracker = new Map<string, ClientQuota>();
  
  enqueue(request: Request): QueuePosition {
    // Calculate queue based on resource availability
    const estimatedWait = this.calculateWaitTime(request);
    const queue = this.selectQueue(estimatedWait);
    
    // Apply fairness rules
    const priority = this.calculatePriority(request);
    
    // Anti-starvation mechanism
    if (this.isStarving(request)) {
      priority.boost(10); // Boost long-waiting requests
    }
    
    queue.insert(request, priority);
    
    return {
      queue: queue.name,
      position: queue.getPosition(request),
      estimatedStart: this.estimateStartTime(request)
    };
  }
  
  private calculatePriority(request: Request): number {
    let priority = 0;
    
    // Client tier (0-40 points)
    priority += {
      'enterprise': 40,
      'premium': 30,
      'standard': 20,
      'basic': 10
    }[request.clientTier];
    
    // Urgency (0-30 points)
    priority += {
      'urgent': 30,
      'high': 20,
      'normal': 10,
      'low': 0
    }[request.urgency];
    
    // Wait time (0-20 points, increases over time)
    const waitMinutes = (Date.now() - request.createdAt) / 60000;
    priority += Math.min(20, waitMinutes / 5);
    
    // Client fairness (0-10 points, decreases with usage)
    const clientUsage = this.fairnessTracker.get(request.clientId);
    priority += Math.max(0, 10 - (clientUsage.todayRequests / 10));
    
    return priority; // 0-100 scale
  }
}
```

### 4.2 Scheduling Algorithm

```typescript
class Scheduler {
  async schedule(): Promise<void> {
    while (true) {
      // Get next request from highest priority queue with available resources
      const request = await this.getNextExecutable();
      
      if (!request) {
        await this.sleep(100); // No executable requests
        continue;
      }
      
      // Reserve resources
      const reservation = await this.resourceManager.reserve(request);
      
      // Execute asynchronously
      this.execute(request, reservation).catch(error => {
        this.handleExecutionError(request, error, reservation);
      });
      
      // Continue immediately to next request
    }
  }
  
  private async getNextExecutable(): Promise<Request | null> {
    // Check queues in priority order
    for (const queue of ['immediate', 'fast', 'normal', 'batch']) {
      const request = await this.queues[queue].peek();
      
      if (!request) continue;
      
      // Check if resources available
      const required = this.calculateRequiredResources(request);
      if (await this.resourceManager.canAllocate(required)) {
        return this.queues[queue].dequeue();
      }
    }
    
    return null;
  }
}
```

## 5. Rate Limiting Implementation

### 5.1 Token Bucket Algorithm

```typescript
class TokenBucket {
  private tokens: number;
  private capacity: number;
  private refillRate: number;
  private lastRefill: number;
  
  constructor(capacity: number, refillPerSecond: number) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillPerSecond;
    this.lastRefill = Date.now();
  }
  
  async consume(amount: number): Promise<boolean> {
    this.refill();
    
    if (this.tokens >= amount) {
      this.tokens -= amount;
      return true;
    }
    
    // Calculate wait time
    const deficit = amount - this.tokens;
    const waitSeconds = deficit / this.refillRate;
    
    if (waitSeconds > 300) { // Max 5 minute wait
      return false;
    }
    
    await this.sleep(waitSeconds * 1000);
    return this.consume(amount); // Retry
  }
  
  private refill(): void {
    const now = Date.now();
    const secondsElapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = secondsElapsed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
  
  getAvailable(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
  
  getWaitTime(amount: number): number {
    this.refill();
    if (this.tokens >= amount) return 0;
    
    const deficit = amount - this.tokens;
    return (deficit / this.refillRate) * 1000; // milliseconds
  }
}
```

### 5.2 Sliding Window for Quotas

```typescript
class SlidingWindowQuota {
  private window: { timestamp: number; amount: number }[] = [];
  private windowSize: number;
  private limit: number;
  
  constructor(windowSizeMs: number, limit: number) {
    this.windowSize = windowSizeMs;
    this.limit = limit;
  }
  
  canConsume(amount: number): boolean {
    this.cleanup();
    const current = this.getCurrentUsage();
    return (current + amount) <= this.limit;
  }
  
  consume(amount: number): boolean {
    if (!this.canConsume(amount)) return false;
    
    this.window.push({
      timestamp: Date.now(),
      amount
    });
    
    return true;
  }
  
  private cleanup(): void {
    const cutoff = Date.now() - this.windowSize;
    this.window = this.window.filter(w => w.timestamp > cutoff);
  }
  
  private getCurrentUsage(): number {
    this.cleanup();
    return this.window.reduce((sum, w) => sum + w.amount, 0);
  }
}
```

## 6. Cost Management and Optimization

### 6.1 Cost Tracking

```typescript
class CostTracker {
  private costs = {
    openai: {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 }
    },
    email: 0.0001,
    sms: 0.0075,
    storage: {
      kv: 0.50, // per GB-month
      r2: 0.015, // per GB-month
      d1: 0.75  // per GB-month
    }
  };
  
  calculateRequestCost(request: ExecutedRequest): Cost {
    let total = 0;
    
    // API costs
    for (const usage of request.apiUsage) {
      if (usage.provider === 'openai') {
        const model = usage.model;
        total += (usage.inputTokens / 1000) * this.costs.openai[model].input;
        total += (usage.outputTokens / 1000) * this.costs.openai[model].output;
      }
    }
    
    // Service costs
    total += request.emailsSent * this.costs.email;
    total += request.smsSent * this.costs.sms;
    
    // Storage costs (prorated)
    total += (request.storageUsedMB / 1000) * this.costs.storage.kv / 30;
    
    return {
      amount: total,
      breakdown: this.generateBreakdown(request),
      currency: 'USD'
    };
  }
}
```

### 6.2 Optimization Strategies

```typescript
class ResourceOptimizer {
  optimizeRequest(request: Request): OptimizedRequest {
    const optimizations = [];
    
    // 1. Model downgrade for non-critical tasks
    if (request.priority !== 'urgent' && request.accuracy !== 'high') {
      request.model = 'gpt-3.5-turbo'; // Instead of gpt-4
      optimizations.push('model_downgrade');
    }
    
    // 2. Batch similar requests
    const similar = this.findSimilarRequests(request);
    if (similar.length > 0) {
      request.batch = similar;
      optimizations.push('batching');
    }
    
    // 3. Cache utilization
    const cached = this.checkCache(request);
    if (cached && cached.age < 3600000) { // 1 hour
      request.useCache = true;
      optimizations.push('cache_hit');
    }
    
    // 4. Compression for large payloads
    if (request.dataSize > 10000) { // 10KB
      request.compress = true;
      optimizations.push('compression');
    }
    
    // 5. Off-peak scheduling for non-urgent
    if (request.urgency === 'low' && this.isPeakTime()) {
      request.deferUntil = this.getNextOffPeak();
      optimizations.push('off_peak_defer');
    }
    
    return {
      ...request,
      optimizations,
      estimatedSavings: this.calculateSavings(optimizations)
    };
  }
}
```

## 7. Database Schema

```sql
-- Resource pools and limits
CREATE TABLE resource_pools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL, -- 'api', 'infrastructure', 'business'
  provider TEXT,
  capacity INTEGER NOT NULL,
  refill_rate REAL NOT NULL,
  current_tokens REAL NOT NULL,
  last_refill TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resource allocations
CREATE TABLE resource_allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL,
  client_id INTEGER NOT NULL,
  resource_pool_id INTEGER REFERENCES resource_pools(id),
  amount INTEGER NOT NULL,
  allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  released_at TIMESTAMP,
  status TEXT CHECK(status IN ('allocated', 'consumed', 'released', 'failed')),
  cost_usd REAL
);

-- Execution queue
CREATE TABLE resource_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL UNIQUE,
  client_id INTEGER NOT NULL,
  template_name TEXT NOT NULL,
  priority INTEGER NOT NULL, -- 0-100
  queue_name TEXT NOT NULL, -- 'immediate', 'fast', 'normal', 'batch', 'deferred'
  resource_requirements TEXT NOT NULL, -- JSON
  estimated_cost REAL,
  estimated_wait_ms INTEGER,
  estimated_duration_ms INTEGER,
  status TEXT CHECK(status IN ('queued', 'scheduled', 'executing', 'completed', 'failed')),
  queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  scheduled_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT
);

-- Client quotas and fairness
CREATE TABLE client_quotas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  date DATE NOT NULL,
  tier TEXT NOT NULL,
  requests_today INTEGER DEFAULT 0,
  tokens_used_today INTEGER DEFAULT 0,
  cost_today REAL DEFAULT 0,
  requests_month INTEGER DEFAULT 0,
  tokens_used_month INTEGER DEFAULT 0,
  cost_month REAL DEFAULT 0,
  priority_modifier INTEGER DEFAULT 0, -- Fairness adjustment
  UNIQUE(client_id, date)
);

-- Resource usage history
CREATE TABLE resource_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resource_pool_id INTEGER REFERENCES resource_pools(id),
  client_id INTEGER,
  request_id TEXT,
  amount_consumed INTEGER,
  wait_time_ms INTEGER,
  success BOOLEAN,
  error_reason TEXT
);

-- Cost tracking
CREATE TABLE cost_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL,
  client_id INTEGER NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  provider TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  amount_used INTEGER,
  unit_cost REAL,
  total_cost REAL,
  currency TEXT DEFAULT 'USD'
);

-- Indexes for performance
CREATE INDEX idx_queue_status_priority ON resource_queue(status, priority DESC);
CREATE INDEX idx_allocations_client_status ON resource_allocations(client_id, status);
CREATE INDEX idx_usage_timestamp ON resource_usage(timestamp);
CREATE INDEX idx_quotas_client_date ON client_quotas(client_id, date);
CREATE INDEX idx_cost_client_timestamp ON cost_tracking(client_id, timestamp);
```

## 8. API Endpoints

### 8.1 Public Endpoints

```typescript
// Health and status
GET  /health
GET  /status
GET  /metrics

// Resource availability
GET  /api/resources/availability
POST /api/resources/check
POST /api/resources/estimate

// Queue management
GET  /api/queue/status
GET  /api/queue/position/{requestId}
POST /api/queue/enqueue
DELETE /api/queue/{requestId}

// Execution
POST /api/execute
GET  /api/execution/{requestId}
POST /api/execution/{requestId}/cancel

// Cost and usage
GET  /api/usage/{clientId}
GET  /api/usage/{clientId}/current
GET  /api/cost/{requestId}
GET  /api/cost/estimate
```

### 8.2 Internal Endpoints (Worker-to-Worker)

```typescript
// Resource management
POST /internal/reserve
POST /internal/release
POST /internal/consume

// Queue operations
POST /internal/queue/priority-boost
POST /internal/queue/batch

// Monitoring
GET  /internal/metrics/detailed
POST /internal/alert
```

## 9. Integration with Workers

### 9.1 Worker Registration

```typescript
interface WorkerRegistration {
  name: string;
  version: string;
  capabilities: string[];
  resourceRequirements: {
    typical: ResourceSet;
    maximum: ResourceSet;
  };
  endpoints: {
    health: string;
    execute: string;
    cancel?: string;
  };
  timeout: number;
  retryPolicy: {
    maxAttempts: number;
    backoffMs: number[];
  };
}
```

### 9.2 Communication Protocol

```typescript
// Simple, direct protocol - no complex handshakes
interface ExecutionRequest {
  requestId: string;
  action: string;
  input: any;
  resources: ResourceAllocation;
  timeout: number;
  priority: number;
}

interface ExecutionResponse {
  requestId: string;
  status: 'success' | 'failure' | 'partial';
  output?: any;
  resourcesConsumed: ResourceUsage;
  duration: number;
  cost: number;
  error?: string;
}
```

## 10. Monitoring and Alerting

### 10.1 Key Metrics

```typescript
interface Metrics {
  // Resource utilization
  resourceUtilization: {
    [pool: string]: {
      used: number;
      available: number;
      percentage: number;
    };
  };
  
  // Queue metrics
  queueDepth: {
    [queue: string]: number;
  };
  averageWaitTime: {
    [queue: string]: number;
  };
  
  // Performance
  requestsPerSecond: number;
  averageExecutionTime: number;
  successRate: number;
  
  // Cost
  costPerHour: number;
  costByClient: Map<string, number>;
  
  // Alerts
  activeAlerts: Alert[];
}
```

### 10.2 Alert Conditions

```typescript
class AlertManager {
  private alerts = [
    {
      name: 'OpenAI Rate Limit Near',
      condition: () => this.resources.openai.getAvailable() < 1000,
      severity: 'warning',
      action: 'Throttle non-urgent requests'
    },
    {
      name: 'Budget Exceeded',
      condition: (client) => client.monthlyUsage > client.budget,
      severity: 'critical',
      action: 'Pause client requests'
    },
    {
      name: 'Queue Backup',
      condition: () => this.queues.normal.size() > 100,
      severity: 'warning',
      action: 'Scale resources or defer batch jobs'
    },
    {
      name: 'Worker Timeout',
      condition: (worker) => worker.timeouts > 5,
      severity: 'error',
      action: 'Circuit break worker'
    }
  ];
}
```

## 11. Implementation Phases

### Phase 1: Core Resource Management (Week 1)
- Token bucket implementation
- Basic queue system
- OpenAI rate limiting
- Simple cost tracking

### Phase 2: Advanced Scheduling (Week 2)
- Priority queue with fairness
- Client quotas
- Batch optimization
- Cache integration

### Phase 3: Multi-Provider Support (Week 3)
- Email/SMS integration
- Multiple AI providers
- Storage quotas
- Infrastructure limits

### Phase 4: Optimization & Monitoring (Week 4)
- Cost optimization strategies
- Advanced metrics
- Alerting system
- Dashboard integration

## 12. Configuration

```typescript
interface ResourceManagerConfig {
  // Resource pools
  pools: {
    openai: {
      shared: { capacity: 100000, refillRate: 1666 },
      reserved: { capacity: 10000, refillRate: 166 }
    },
    email: {
      shared: { capacity: 1000, refillRate: 16 },
      reserved: { capacity: 100, refillRate: 1.6 }
    }
  };
  
  // Queue settings
  queues: {
    maxQueueSize: 1000,
    maxWaitTime: 3600000, // 1 hour
    starvationThreshold: 600000 // 10 minutes
  };
  
  // Client tiers
  tiers: {
    enterprise: {
      priorityBoost: 40,
      dedicatedResources: true,
      maxConcurrent: 100
    },
    premium: {
      priorityBoost: 30,
      dedicatedResources: false,
      maxConcurrent: 50
    },
    standard: {
      priorityBoost: 20,
      dedicatedResources: false,
      maxConcurrent: 20
    },
    basic: {
      priorityBoost: 10,
      dedicatedResources: false,
      maxConcurrent: 5
    }
  };
  
  // Cost thresholds
  costs: {
    warningThreshold: 0.8, // 80% of budget
    criticalThreshold: 0.95, // 95% of budget
    autoPauseThreshold: 1.0 // 100% of budget
  };
}
```

## Summary

The Resource Manager is designed to be the central nervous system for resource allocation in the AI Factory. It ensures:

1. **No service limits are exceeded** - Preventing 429 errors and service disruptions
2. **Fair resource distribution** - All clients get service according to their tier
3. **Cost optimization** - Batching, caching, and model selection reduce costs
4. **Predictable performance** - Queue management provides reliable execution times
5. **Complete observability** - Every resource usage is tracked and reported

This specification provides a complete blueprint for building a production-ready Resource Manager that can handle the complex requirements of a multi-tenant AI factory system.