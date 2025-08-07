# Resource Manager

Central resource management and execution coordination service for the AI Factory platform. This service replaces Orchestrator v2 with a simpler, more efficient architecture focused on resource allocation, cost optimization, and queue management.

## Overview

The Resource Manager acts as the central gatekeeper for all limited resources across the AI Factory system, including:
- API rate limits (OpenAI, Anthropic, etc.)
- Service quotas (email, SMS, storage)
- Infrastructure resources (database, compute)
- Client budgets and tier-based allocations

## Key Features

### 🚀 Core Capabilities
- **Token Bucket Rate Limiting**: Precise control over API usage with refillable token buckets
- **Multi-Level Queue System**: 5-tier priority queues (immediate/fast/normal/batch/deferred)
- **Cost Tracking & Optimization**: Real-time cost calculation and automatic optimization
- **Resource Pooling**: Shared, reserved, and dedicated resource pools
- **Fair Scheduling**: Anti-starvation mechanisms and client fairness tracking
- **Budget Management**: Automatic budget enforcement and alerts

### 🎯 Optimization Strategies
- **Model Downgrading**: Automatically use cheaper models for non-critical tasks
- **Request Batching**: Combine similar requests to reduce API calls
- **Smart Caching**: Reuse recent results when appropriate
- **Data Compression**: Compress large payloads to save bandwidth
- **Off-Peak Scheduling**: Defer low-priority tasks to off-peak hours

## Architecture

```
┌─────────────────┐
│   Client API    │
└────────┬────────┘
         │
    ┌────▼────┐
    │   KAM   │ (Authentication & Client Management)
    └────┬────┘
         │
┌────────▼──────────┐
│ Resource Manager  │
│ ┌──────────────┐  │
│ │Resource Pools│  │ ← Token Buckets, Quotas
│ └──────────────┘  │
│ ┌──────────────┐  │
│ │Queue Manager │  │ ← Priority Scheduling
│ └──────────────┘  │
│ ┌──────────────┐  │
│ │Cost Tracker  │  │ ← Usage & Budget
│ └──────────────┘  │
│ ┌──────────────┐  │
│ │  Optimizer   │  │ ← Cost Reduction
│ └──────────────┘  │
│ ┌──────────────┐  │
│ │  Scheduler   │  │ ← Execution Coordination
│ └──────────────┘  │
└───────┬───────────┘
        │
   ┌────▼────┐
   │ Workers │
   └─────────┘
```

## Installation

```bash
cd workers/bitware_resource_manager
npm install
```

## Configuration

Edit `wrangler.toml` to configure:
- Database bindings
- KV namespaces
- R2 buckets
- Service bindings to workers

## Database Setup

Initialize the database schema:
```bash
npm run db:init
```

Seed with default data:
```bash
npm run db:seed
```

## Development

Start local development server:
```bash
npm run dev
```

Run tests:
```bash
npm run test
```

## Deployment

Deploy to production:
```bash
npm run deploy
```

Deploy to staging:
```bash
npm run deploy:staging
```

## API Endpoints

### Public Endpoints

#### Health & Status
- `GET /` - Basic health check
- `GET /health` - Detailed health status
- `GET /status` - Resource and queue status
- `GET /metrics` - Performance metrics

#### Resource Management
- `GET /api/resources/availability` - Check all resource availability
- `POST /api/resources/check` - Check specific resource availability
- `POST /api/resources/estimate` - Estimate resource cost for template

#### Queue Management
- `GET /api/queue/status` - Get queue status
- `GET /api/queue/position/{requestId}` - Check request position
- `POST /api/queue/enqueue` - Add request to queue
- `DELETE /api/queue/{requestId}` - Remove from queue

#### Execution
- `POST /api/execute` - Execute a request
- `GET /api/execution/{requestId}` - Get execution status
- `POST /api/execution/{requestId}/cancel` - Cancel execution

#### Cost & Usage
- `GET /api/usage/{clientId}` - Get usage history
- `GET /api/usage/{clientId}/current` - Get current usage
- `POST /api/cost/estimate` - Estimate cost
- `GET /api/cost/{requestId}` - Get request cost

#### Optimization
- `POST /api/optimize/analyze` - Analyze optimization opportunities
- `GET /api/optimize/stats/{clientId}` - Get optimization statistics
- `GET /api/optimize/recommendations/{clientId}` - Get recommendations

### Internal Endpoints (Worker-to-Worker)

- `POST /internal/reserve` - Reserve resources
- `POST /internal/release` - Release resources
- `POST /internal/consume` - Consume resources

### Admin Endpoints

- `POST /admin/scheduler/start` - Start scheduler
- `POST /admin/scheduler/stop` - Stop scheduler
- `GET /admin/alerts` - Get system alerts

## Request Flow

1. **Client sends request** to KAM for authentication
2. **KAM validates** and forwards to Resource Manager
3. **Resource Manager**:
   - Estimates cost and checks budget
   - Optimizes request (model selection, batching, etc.)
   - Enqueues with calculated priority
4. **Scheduler**:
   - Continuously checks for executable requests
   - Reserves required resources
   - Invokes appropriate worker
5. **Worker executes** and returns result
6. **Resource Manager**:
   - Tracks actual usage and cost
   - Updates client quotas
   - Returns result to client

## Resource Pools

### Default Pools

| Resource | Capacity | Refill Rate | Cost/Unit |
|----------|----------|-------------|-----------|
| OpenAI GPT-4 | 10,000 tokens | 166/sec | $0.03/1K |
| OpenAI GPT-3.5 | 90,000 tokens | 1,500/sec | $0.0015/1K |
| Email (SendGrid) | 1,000 | 16/sec | $0.0001 |
| SMS (Twilio) | 500 | 8/sec | $0.0075 |
| Database (D1) | 50,000 queries | 833/sec | Free |
| KV Storage | 100,000 reads | 1,666/sec | $0.0000005 |

### Tier-Based Limits

| Tier | Priority | Max Concurrent | Monthly Budget |
|------|----------|----------------|----------------|
| Enterprise | 40 | 100 | Custom |
| Premium | 30 | 50 | $1,000 |
| Standard | 20 | 20 | $500 |
| Basic | 10 | 5 | $100 |

## Queue Priority Calculation

Priority is calculated on a 0-100 scale based on:
- **Client Tier** (0-40 points)
- **Request Urgency** (0-30 points)
- **Wait Time** (0-20 points, increases over time)
- **Client Fairness** (0-10 points, decreases with usage)

## Cost Optimization

The optimizer automatically applies these strategies:

1. **Model Downgrade**: Use cheaper models when accuracy isn't critical
2. **Request Batching**: Combine similar requests
3. **Cache Utilization**: Reuse recent results
4. **Data Compression**: Compress large payloads
5. **Off-Peak Scheduling**: Defer low-priority tasks

## Monitoring

### Key Metrics
- Resource utilization percentages
- Queue depths and wait times
- Request success/failure rates
- Cost per client/template
- Optimization savings

### Alerts
- Resource pools running low (<10%)
- Budget exceeded (>95%)
- Queue backup (>1000 requests)
- Request starvation (>10 minutes)
- Worker timeouts

## Troubleshooting

### Common Issues

1. **"Insufficient resources"**
   - Check resource pool status
   - Consider upgrading client tier
   - Enable request optimization

2. **"Budget exceeded"**
   - Review client's monthly budget
   - Check cost breakdown
   - Enable aggressive optimization

3. **"Request timeout"**
   - Check worker health
   - Review resource requirements
   - Increase timeout settings

4. **"Queue backup"**
   - Check resource availability
   - Review priority settings
   - Consider scaling resources

## Migration from Orchestrator v2

Key differences:
- No handshake protocol - direct execution
- Simpler resource allocation
- Built-in cost optimization
- Automatic queue management
- Real-time budget enforcement

To migrate:
1. Update worker endpoints to support direct execution
2. Remove handshake protocol code
3. Update KAM to call Resource Manager instead of Orchestrator v2
4. Migrate pipeline templates to new format

## Support

For issues or questions:
- Check logs: `npm run tail`
- View metrics: `GET /metrics`
- Check alerts: `GET /admin/alerts`
- Review queue status: `GET /api/queue/status`