# Backend Integration Documentation

## Overview

This document describes the integration between the three core backend services:
1. **Key Account Manager (KAM)** - Authentication and client management
2. **Orchestrator v2** - Pipeline orchestration and resource management  
3. **Content Granulator** - AI-powered content structure generation

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│      KAM        │────▶│  Orchestrator v2  │────▶│ Content Granulator│
│                 │     │                   │     │                  │
│ - Auth          │     │ - Pipelines       │     │ - AI Generation  │
│ - Clients       │     │ - Queues          │     │ - Validation     │
│ - Templates     │     │ - Resources       │     │ - Storage        │
└─────────────────┘     └──────────────────┘     └──────────────────┘
```

## Service Endpoints

### Key Account Manager (KAM)
- **URL**: https://bitware-key-account-manager.jhaladik.workers.dev
- **Authentication**: X-API-Key (clients), Bearer + X-Worker-ID (workers), x-bitware-session-token (dashboard)
- **Key Endpoints**:
  - `POST /auth/login` - User authentication
  - `GET /api/master-templates/{name}` - Get pipeline templates
  - `GET /clients` - List clients
  - `POST /requests` - Create execution requests

### Orchestrator v2
- **URL**: https://bitware-orchestrator-v2.jhaladik.workers.dev
- **Authentication**: Bearer + X-Worker-ID for worker endpoints
- **Key Endpoints**:
  - `POST /api/pipelines/execute` - Execute a pipeline
  - `GET /api/executions/{id}` - Get execution status
  - `POST /api/handshake` - Worker handshake protocol
  - `GET /api/queue` - Get execution queue status

### Content Granulator
- **URL**: https://bitware-content-granulator.jhaladik.workers.dev
- **Authentication**: Bearer + X-Worker-ID for worker endpoints
- **Key Endpoints**:
  - `POST /api/handshake` - Accept job from orchestrator
  - `POST /api/process` - Process accepted job
  - `GET /api/progress/{id}` - Get job progress
  - `GET /api/jobs/{id}` - Get job details

## Integration Flow

### 1. Pipeline Execution Request
```
Frontend → KAM → Orchestrator v2
```

1. Frontend creates request in KAM
2. KAM validates client and permissions
3. KAM stores request in database
4. Frontend triggers execution via Orchestrator v2

### 2. Pipeline Orchestration
```
Orchestrator v2 → KAM (fetch template) → Queue → Pipeline Executor
```

1. Orchestrator creates execution record
2. Fetches master template from KAM
3. Enqueues execution with priority
4. Queue manager processes execution:
   - Creates stages in database
   - Executes stages sequentially

### 3. Worker Handshake Protocol
```
Orchestrator → Worker (handshake) → Worker (process) → Orchestrator (complete)
```

1. **Handshake Request**:
```json
{
  "executionId": "exec_123",
  "stageId": "stage_456",
  "action": "granulate",
  "inputData": {
    "topic": "AI Development",
    "structure_type": "course",
    "template_name": "course"
  },
  "resourceRequirements": {
    "estimatedTokens": 2000,
    "timeoutMs": 30000
  }
}
```

2. **Handshake Response**:
```json
{
  "executionId": "exec_123",
  "workerId": "bitware-content-granulator",
  "accepted": true,
  "estimatedCompletionMs": 20000,
  "resourceRequirements": {
    "cpu": 0.5,
    "memory": 256,
    "apiCalls": 2
  }
}
```

3. **Process Request**:
```json
{
  "executionId": "exec_123"
}
```

4. **Process Response**:
```json
{
  "executionId": "exec_123",
  "status": "completed",
  "result": {
    "jobId": 123,
    "structure": {...},
    "qualityScore": 92
  },
  "metrics": {
    "tokensUsed": 1500,
    "processingTimeMs": 15000,
    "costUsd": 0.003
  }
}
```

## Database Schema

### KAM Database
- **pipeline_template_cache**: Master pipeline templates
- **client_requests**: Execution requests from clients
- **clients**: Client information and subscriptions
- **users**: User authentication and permissions

### Orchestrator v2 Database
- **pipeline_executions**: Main execution records
- **stage_executions**: Individual stage status
- **handshake_packets**: Inter-worker communication
- **worker_registry**: Available workers and capabilities
- **execution_queue**: Priority-based execution queue
- **data_references**: Storage references for large data

### Content Granulator Database
- **granulation_jobs**: Job records
- **granulation_templates**: Structure generation templates
- **structure_elements**: Generated content elements
- **validation_results**: Quality validation records

## Authentication

### Worker-to-Worker Authentication
```javascript
headers: {
  'Authorization': 'Bearer internal-worker-auth-token-2024',
  'X-Worker-ID': 'bitware-orchestrator-v2'
}
```

### Client API Authentication
```javascript
headers: {
  'X-API-Key': 'client_api_key_here'
}
```

### Dashboard Session Authentication
```javascript
headers: {
  'x-bitware-session-token': 'session_token_here'
}
```

## Current Status

### ✅ Working
- KAM authentication and client management
- Orchestrator v2 stage creation and queue processing
- Worker registry and health checks
- Handshake packet creation
- Content Granulator template matching and AI generation

### ⚠️ Issues to Address
1. **KAM Template Fetching**: Currently using fallback templates when KAM is unavailable
2. **Worker Invocation**: Service bindings need proper URL routing
3. **Progress Tracking**: KV storage for progress tracking has size limitations
4. **Error Handling**: Better error propagation between services

### 🔧 Configuration Required

1. **Worker Registry**: Workers must be registered in Orchestrator's worker_registry table:
```sql
INSERT INTO worker_registry (
  worker_name, display_name, version, capabilities, 
  max_concurrent_executions, health_status, is_active
) VALUES (
  'bitware-content-granulator',
  'Content Granulator',
  '1.0.0',
  '["granulate", "structure", "validate"]',
  10,
  'healthy',
  1
);
```

2. **Service Bindings**: In wrangler.toml for each worker:
```toml
[[services]]
binding = "CONTENT_GRANULATOR"
service = "bitware-content-granulator"
```

3. **Environment Variables**:
```toml
[vars]
WORKER_SECRET = "internal-worker-auth-token-2024"
OPENAI_API_KEY = "your-openai-key"
```

## Testing

### Test Orchestrator Queue Execution
```bash
curl -X POST https://bitware-orchestrator-v2.jhaladik.workers.dev/api/test/queue-execution \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer internal-worker-auth-token-2024" \
  -H "X-Worker-ID: test-worker" \
  -d '{}'
```

### Test Granulator Handshake
```bash
curl -X POST https://bitware-content-granulator.jhaladik.workers.dev/api/handshake \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer internal-worker-auth-token-2024" \
  -H "X-Worker-ID: bitware-orchestrator-v2" \
  -d '{
    "executionId": "test_123",
    "inputData": {
      "topic": "Test Topic",
      "structure_type": "course"
    }
  }'
```

## Next Steps

1. **Fix Service Binding URLs**: Update worker coordinator to use correct service binding URLs
2. **Implement Progress Streaming**: Add WebSocket or SSE for real-time progress
3. **Add Retry Logic**: Implement exponential backoff for failed stages
4. **Resource Management**: Complete resource allocation and tracking
5. **Monitoring**: Add comprehensive logging and metrics

## Troubleshooting

### Common Issues

1. **"Worker cannot accept new tasks"**
   - Check worker_registry table has the worker registered
   - Verify max_concurrent_executions is not exceeded

2. **"Template not found"**
   - Granulator uses flexible template matching (exact → structure type → partial)
   - Check granulation_templates table has templates

3. **"D1_TYPE_ERROR"**
   - Ensure all required fields have default values
   - Check for undefined values in handshake data

4. **Stage stuck in "running"**
   - Check handshake_packets table for sent packets
   - Verify worker service binding is correct
   - Check worker logs for errors

### Debug Commands

```bash
# Check orchestrator database
wrangler d1 execute orchestrator-v2-db --remote --command="SELECT * FROM stage_executions ORDER BY created_at DESC LIMIT 5"

# Check worker registry
wrangler d1 execute orchestrator-v2-db --remote --command="SELECT * FROM worker_registry"

# Check handshake packets
wrangler d1 execute orchestrator-v2-db --remote --command="SELECT * FROM handshake_packets ORDER BY sent_at DESC LIMIT 5"

# Check granulator templates
wrangler d1 execute content-granulator-db --remote --command="SELECT id, template_name, structure_type FROM granulation_templates"
```