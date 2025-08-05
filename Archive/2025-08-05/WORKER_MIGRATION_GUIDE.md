# Worker Migration Guide for Orchestrator 2.0

## Overview
This guide provides step-by-step instructions for migrating existing workers to support the Orchestrator 2.0 handshake protocol.

## 🤝 Handshake Protocol Overview

The handshake protocol enables:
- **Reference-based data transfer** (80% bandwidth reduction)
- **Resource requirement negotiation**
- **Progress tracking**
- **Checkpoint/recovery support**

## 📋 Migration Checklist

### Required Endpoints
Each worker must implement these endpoints:

1. **`POST /api/handshake`** - Initiate processing
2. **`POST /api/process`** - Execute with reference data
3. **`POST /api/acknowledge`** - Confirm completion
4. **`GET /api/progress/{packet_id}`** - Report progress
5. **`GET /health`** - Enhanced health check

## 🔧 Implementation Steps

### Step 1: Add Handshake Endpoint

```javascript
// POST /api/handshake
async function handleHandshake(request, env) {
  const { packet_id, execution_id, stage_id, input_ref } = await request.json();
  
  // Validate capabilities
  const canProcess = validateInput(input_ref);
  
  return new Response(JSON.stringify({
    success: true,
    packet_id,
    worker_name: 'bitware_topic_researcher',
    status: canProcess ? 'ready' : 'incompatible',
    capabilities: {
      input_types: ['text', 'json', 'reference'],
      output_types: ['json', 'html'],
      max_processing_time_ms: 120000,
      supports_streaming: false,
      supports_checkpoints: true
    },
    resource_requirements: {
      min_memory_mb: 128,
      max_memory_mb: 512,
      estimated_cpu_ms: 5000,
      api_calls: {
        openai: 10,
        anthropic: 0
      }
    }
  }));
}
```

### Step 2: Implement Reference Handling

```javascript
// POST /api/process
async function handleProcess(request, env) {
  const { packet_id, execution_id, stage_id, input_ref, parameters } = await request.json();
  
  // Retrieve data from reference
  let inputData;
  if (input_ref.storage_type === 'inline') {
    inputData = input_ref.inline_data;
  } else {
    // Fetch from orchestrator
    inputData = await fetchFromOrchestrator(input_ref.ref_id, env);
  }
  
  // Process the data
  const result = await processData(inputData, parameters);
  
  // Store result and return reference
  const outputRef = await storeResult(result, env);
  
  return new Response(JSON.stringify({
    success: true,
    packet_id,
    output_ref: outputRef,
    metrics: {
      processing_time_ms: Date.now() - startTime,
      tokens_used: tokenCount,
      api_calls_made: apiCallCount
    }
  }));
}
```

### Step 3: Add Progress Reporting

```javascript
// Store progress in KV
async function reportProgress(packet_id, progress, message, env) {
  await env.PROGRESS_CACHE.put(
    `progress:${packet_id}`,
    JSON.stringify({
      stage: 'processing',
      progress: progress, // 0-100
      message: message,
      timestamp: new Date().toISOString()
    }),
    { expirationTtl: 3600 }
  );
}

// GET /api/progress/{packet_id}
async function getProgress(packet_id, env) {
  const progress = await env.PROGRESS_CACHE.get(`progress:${packet_id}`);
  return new Response(progress || JSON.stringify({
    stage: 'unknown',
    progress: 0
  }));
}
```

### Step 4: Implement Acknowledgment

```javascript
// POST /api/acknowledge
async function handleAcknowledge(request, env) {
  const { packet_id, execution_id, success, error } = await request.json();
  
  // Clean up any temporary data
  await env.PROGRESS_CACHE.delete(`progress:${packet_id}`);
  
  return new Response(JSON.stringify({
    success: true,
    packet_id,
    acknowledged: true
  }));
}
```

### Step 5: Enhanced Health Check

```javascript
// GET /health
async function getHealth(env) {
  const stats = await getWorkerStats(env);
  
  return new Response(JSON.stringify({
    status: 'healthy',
    service: 'bitware_topic_researcher',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    capabilities: {
      protocol_version: '2.0',
      supports_handshake: true,
      supports_references: true,
      supports_checkpoints: true
    },
    resources: {
      current_load: stats.currentLoad,
      queue_length: stats.queueLength,
      avg_processing_time_ms: stats.avgProcessingTime
    }
  }));
}
```

## 📦 Storage Helpers

### Fetching Reference Data

```javascript
async function fetchFromOrchestrator(ref_id, env) {
  const response = await fetch(
    `${ORCHESTRATOR_URL}/api/data/${ref_id}`,
    {
      headers: {
        'Authorization': `Bearer ${env.WORKER_TOKEN}`,
        'X-Worker-ID': 'bitware_topic_researcher'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch reference: ${ref_id}`);
  }
  
  return await response.json();
}
```

### Storing Results

```javascript
async function storeResult(data, env) {
  const serialized = JSON.stringify(data);
  const sizeBytes = new TextEncoder().encode(serialized).length;
  
  // Small data: return inline
  if (sizeBytes < 1024) {
    return {
      ref_id: `ref_${Date.now()}`,
      storage_type: 'inline',
      inline_data: data,
      size_bytes: sizeBytes
    };
  }
  
  // Large data: store in KV
  const ref_id = `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await env.RESULT_CACHE.put(ref_id, serialized, {
    expirationTtl: 86400 // 24 hours
  });
  
  return {
    ref_id,
    storage_type: 'reference',
    size_bytes: sizeBytes,
    expires_at: new Date(Date.now() + 86400000).toISOString()
  };
}
```

## 🔄 Worker Registry Update

Add to Orchestrator's worker registry:

```sql
INSERT INTO worker_registry (
  worker_name,
  worker_url,
  status,
  capabilities,
  protocol_version,
  supports_handshake,
  supports_streaming,
  max_concurrent_executions,
  avg_execution_time_ms
) VALUES (
  'bitware_topic_researcher',
  'https://bitware-topic-researcher.workers.dev',
  'active',
  '{"input_types":["text","json","reference"],"output_types":["json","html"]}',
  '2.0',
  true,
  false,
  10,
  60000
);
```

## 🧪 Testing the Migration

### 1. Test Handshake

```bash
curl -X POST https://your-worker.workers.dev/api/handshake \
  -H "Content-Type: application/json" \
  -d '{
    "packet_id": "test-123",
    "execution_id": "exec-456",
    "stage_id": "stage-789",
    "input_ref": {
      "ref_id": "ref_test",
      "storage_type": "inline",
      "inline_data": {"query": "test"}
    }
  }'
```

### 2. Test Process

```bash
curl -X POST https://your-worker.workers.dev/api/process \
  -H "Content-Type: application/json" \
  -d '{
    "packet_id": "test-123",
    "execution_id": "exec-456",
    "input_ref": {
      "storage_type": "inline",
      "inline_data": {"query": "AI trends 2024"}
    },
    "parameters": {
      "depth": "comprehensive"
    }
  }'
```

### 3. Test Progress

```bash
curl https://your-worker.workers.dev/api/progress/test-123
```

## 🚀 Deployment

1. Add required KV namespaces in `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "PROGRESS_CACHE"
id = "your-progress-cache-id"

[[kv_namespaces]]
binding = "RESULT_CACHE"
id = "your-result-cache-id"
```

2. Deploy the updated worker:

```bash
wrangler deploy
```

3. Update Orchestrator's worker registry (see SQL above)

## 📊 Migration Progress Tracker

| Worker | Status | Handshake | References | Progress | Checkpoints | Deployed |
|--------|--------|-----------|------------|----------|-------------|----------|
| Topic Researcher | 🔄 In Progress | ⏳ | ⏳ | ⏳ | ⏳ | ❌ |
| RSS Source Finder | ⏳ Pending | ❌ | ❌ | ❌ | ❌ | ❌ |
| Feed Fetcher | ⏳ Pending | ❌ | ❌ | ❌ | ❌ | ❌ |
| Content Classifier | ⏳ Pending | ❌ | ❌ | ❌ | ❌ | ❌ |
| Report Builder | ⏳ Pending | ❌ | ❌ | ❌ | ❌ | ❌ |
| Universal Researcher | ⏳ Pending | ❌ | ❌ | ❌ | ❌ | ❌ |

## 🎯 Benefits After Migration

1. **80% reduction in data transfer** between workers
2. **Automatic retry and recovery** on failures
3. **Real-time progress tracking** for users
4. **Resource optimization** and quota management
5. **Cost tracking** per operation
6. **Parallel execution** capabilities

## 📝 Notes

- Workers can maintain backward compatibility by keeping old endpoints
- The orchestrator will auto-detect protocol version via health check
- Reference data expires after 24 hours by default
- Checkpoints enable resuming from failure points

---

*Last Updated: 2025-08-04*