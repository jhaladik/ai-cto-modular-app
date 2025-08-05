# AI Factory Complete Request Flow - From Client Request to Deliverable

## Overview
This document traces the complete journey of a client request through the AI Factory system, from initial submission to final deliverable, including all handshakes and authentication flows.

## System Components

### 1. Frontend (Cloudflare Pages)
- **URL**: https://ai-factory-frontend.pages.dev
- **Role**: User interface for clients and admins
- **Authentication**: Session-based (24-hour expiration)

### 2. Key Account Manager (KAM)
- **URL**: https://bitware-key-account-manager.jhaladik.workers.dev
- **Role**: Central authentication, client management, template selection
- **Database**: key-account-management-db

### 3. Orchestrator 2.0
- **URL**: https://bitware-orchestrator-v2.jhaladik.workers.dev
- **Role**: Pipeline coordination, worker management, resource allocation
- **Database**: orchestrator-v2-db

### 4. Content Granulator
- **URL**: https://bitware-content-granulator.jhaladik.workers.dev
- **Role**: AI-powered content structure generation
- **Database**: content-granulator-db

### 5. Other Workers
- Topic Researcher, RSS Source Finder, Feed Fetcher, etc.
- Each with specific roles in the pipeline

## Complete Request Flow

### Phase 1: Client Login and Authentication

```mermaid
sequenceDiagram
    participant C as Client Browser
    participant P as Pages Frontend
    participant K as KAM Worker
    participant KV as KV Store

    C->>P: Navigate to /login.html
    C->>P: Submit credentials
    P->>K: POST /auth/login
    Note over K: Validate credentials
    K->>KV: Store session token
    K-->>P: Return session + user data
    P-->>C: Set session, redirect to dashboard
```

**Authentication Headers**:
```javascript
// Login Request
POST /api/auth/login
{
  "username": "client@example.com",
  "password": "password123",
  "loginType": "client"
}

// Response
{
  "success": true,
  "sessionToken": "sess_abc123...",
  "user": { /* user data */ },
  "kamContext": { /* permissions */ }
}
```

### Phase 2: Client Creates Request

```mermaid
sequenceDiagram
    participant C as Client Browser
    participant P as Pages Frontend
    participant PF as Pages Functions
    participant K as KAM Worker

    C->>P: Navigate to Requests page
    P->>PF: GET /api/kam/requests
    Note over PF: Validate session
    PF->>K: Forward with worker auth
    K-->>PF: Return requests list
    PF-->>P: Return data
    P-->>C: Display requests

    C->>P: Create new request
    P->>PF: POST /api/kam/requests
    PF->>K: Forward with auth
    K-->>PF: Return created request
    PF-->>P: Success response
    P-->>C: Show confirmation
```

**Request Creation**:
```javascript
// Create Request
POST /api/kam/requests
Headers: {
  "x-bitware-session-token": "sess_abc123..."
}
Body: {
  "title": "Market Analysis for AI Tools",
  "description": "Need comprehensive analysis...",
  "urgency": "high",
  "category": "research"
}
```

### Phase 3: Admin Template Selection

```mermaid
sequenceDiagram
    participant A as Admin Browser
    participant P as Pages Frontend
    participant K as KAM Worker
    participant AI as OpenAI API

    A->>P: View request details
    A->>P: Click "Assign Template"
    P->>K: GET /api/templates
    K-->>P: Return available templates
    
    A->>P: Request AI recommendation
    P->>K: POST /api/recommend-template
    K->>AI: Analyze request
    AI-->>K: Return recommendation
    K-->>P: Template suggestion
    P-->>A: Display recommendation
    
    A->>P: Confirm template
    P->>K: PUT /api/requests/{id}
    K-->>P: Request updated
```

**Template Selection**:
```javascript
// Get Templates
GET /api/kam/templates?tier=premium

// AI Recommendation
POST /api/kam/recommend-template
{
  "request_id": 123,
  "client_context": { /* budget, history */ }
}

// Assign Template
PUT /api/kam/requests/123
{
  "template_id": 5,
  "template_name": "comprehensive_report_pipeline",
  "parameters": {
    "depth": "detailed",
    "sources": 10
  }
}
```

### Phase 4: Orchestrator Handshake Initiation

```mermaid
sequenceDiagram
    participant A as Admin
    participant K as KAM
    participant O as Orchestrator
    participant W as Worker Pool

    A->>K: Execute template
    K->>O: POST /api/pipelines/execute
    Note over O: Parse template
    O->>O: Allocate resources
    O->>W: Check worker availability
    W-->>O: Worker status
    O-->>K: Execution ID
    K-->>A: Job started
```

**Execution Request**:
```javascript
// KAM to Orchestrator
POST /api/pipelines/execute
Headers: {
  "Authorization": "Bearer internal-worker-auth-token-2024",
  "X-Worker-ID": "bitware_key_account_manager"
}
Body: {
  "template": {
    "name": "comprehensive_report_pipeline",
    "stages": [/* pipeline stages */]
  },
  "context": {
    "client_id": 1,
    "request_id": 123,
    "parameters": { /* template params */ }
  },
  "resources": {
    "max_workers": 5,
    "timeout_ms": 300000
  }
}
```

### Phase 5: Worker Handshake Protocol

```mermaid
sequenceDiagram
    participant O as Orchestrator
    participant G as Granulator
    participant KV as KV Store
    participant R2 as R2 Storage

    O->>G: POST /api/handshake
    Note over G: Validate request
    G->>G: Estimate resources
    G-->>O: Accept handshake
    
    O->>G: POST /api/process
    Note over G: Start processing
    G->>KV: Store progress
    G->>G: Generate structure
    
    alt Large Data
        G->>R2: Store in R2
        G-->>O: Return R2 reference
    else Small Data
        G->>KV: Store in KV
        G-->>O: Return KV reference
    end
    
    O->>G: POST /api/acknowledge
    G-->>O: Confirm completion
```

**Handshake Protocol**:
```javascript
// 1. Initiate Handshake
POST /api/handshake
Headers: {
  "Authorization": "Bearer internal-worker-auth-token-2024",
  "X-Worker-ID": "bitware_orchestrator",
  "X-Execution-ID": "exec_123"
}
Body: {
  "stage": "content_granulation",
  "input": {
    "topic": "AI Tools Market Analysis",
    "structure_type": "research_report"
  },
  "requirements": {
    "memory_mb": 128,
    "timeout_ms": 60000
  }
}

// 2. Process Request
POST /api/process
{
  "execution_id": "exec_123",
  "handshake_id": "hs_456",
  "data_ref": "kv://input/exec_123"
}

// 3. Acknowledge Completion
POST /api/acknowledge
{
  "execution_id": "exec_123",
  "handshake_id": "hs_456",
  "status": "completed",
  "output_ref": "r2://output/struct_789"
}
```

### Phase 6: Validation Process (if enabled)

```mermaid
sequenceDiagram
    participant G as Granulator
    participant V as Validation Service
    participant AI as OpenAI
    participant O as Orchestrator

    G->>V: Validate structure
    V->>AI: Generate questions
    AI-->>V: Return questions
    V->>AI: Evaluate answers
    AI-->>V: Calculate accuracy
    
    alt Pass Threshold
        V-->>G: Validation passed
        G-->>O: Continue pipeline
    else Fail Threshold
        V-->>G: Validation failed
        G->>G: Retry generation
        G-->>O: Report retry
    end
```

**Validation Flow**:
```javascript
// Validation Configuration
{
  "validation": {
    "enabled": true,
    "level": 2,  // 1-3
    "threshold": 90.0,
    "max_retries": 2
  }
}

// Validation Result
{
  "accuracy_percentage": 92.5,
  "questions_asked": [
    "What are the key market segments?",
    "How does pricing compare?"
  ],
  "passed": true,
  "ai_feedback": "Structure accurately captures..."
}
```

### Phase 7: Pipeline Progression

```mermaid
sequenceDiagram
    participant O as Orchestrator
    participant TR as Topic Researcher
    participant RSS as RSS Finder
    participant FF as Feed Fetcher
    participant RB as Report Builder

    O->>TR: Handshake & Process
    TR-->>O: Research complete
    
    O->>RSS: Handshake & Process
    RSS-->>O: Sources found
    
    O->>FF: Handshake & Process
    FF-->>O: Articles fetched
    
    O->>RB: Handshake & Process
    RB-->>O: Report generated
    
    O->>O: Compile results
```

### Phase 8: Result Delivery

```mermaid
sequenceDiagram
    participant O as Orchestrator
    participant K as KAM
    participant S as Storage
    participant C as Client

    O->>S: Store final deliverable
    O->>K: POST /api/worker-sessions/{id}/complete
    K->>K: Update request status
    K->>K: Calculate costs
    K->>C: Send notification
    
    C->>K: GET /api/deliverables/{id}
    K->>S: Retrieve from storage
    S-->>K: Return data
    K-->>C: Deliver result
```

**Completion Flow**:
```javascript
// Orchestrator to KAM
POST /api/worker-sessions/{id}/complete
{
  "execution_id": "exec_123",
  "status": "completed",
  "deliverables": [
    {
      "type": "report",
      "storage_ref": "r2://reports/final_123.pdf",
      "size_bytes": 2048000,
      "metadata": { /* report details */ }
    }
  ],
  "metrics": {
    "total_time_ms": 180000,
    "stages_completed": 5,
    "tokens_used": 15000,
    "estimated_cost": 0.75
  }
}
```

## Authentication Types Throughout Flow

### 1. Session Authentication (Frontend → Pages Functions)
```javascript
Headers: {
  "x-bitware-session-token": "sess_abc123..."
}
```

### 2. Worker-to-Worker Authentication
```javascript
Headers: {
  "Authorization": "Bearer internal-worker-auth-token-2024",
  "X-Worker-ID": "worker-name"
}
```

### 3. Client API Authentication
```javascript
Headers: {
  "X-API-Key": "external-client-api-key-2024"
}
```

## Storage References

### Reference Types
- **Inline**: Data included in response (< 1KB)
- **KV Reference**: `kv://namespace/key` (1KB - 25MB)
- **R2 Reference**: `r2://bucket/path` (> 25MB)

### Reference Resolution
```javascript
// Orchestrator resolves references
async function resolveReference(ref) {
  if (ref.startsWith('kv://')) {
    const [namespace, key] = ref.slice(5).split('/');
    return await env[namespace].get(key);
  } else if (ref.startsWith('r2://')) {
    const [bucket, ...path] = ref.slice(5).split('/');
    return await env[bucket].get(path.join('/'));
  }
  return ref; // Inline data
}
```

## Error Handling

### Retry Logic
1. **Worker Level**: Each worker implements retry for transient failures
2. **Orchestrator Level**: Stage-level retries with exponential backoff
3. **Pipeline Level**: Can restart from last checkpoint

### Failure Recovery
```javascript
// Checkpoint Storage
{
  "execution_id": "exec_123",
  "last_completed_stage": "content_granulation",
  "checkpoint_data": "kv://checkpoints/exec_123",
  "retry_count": 1,
  "last_error": "Worker timeout"
}
```

## Performance Optimizations

### 1. Reference-Based Transfer
- 80% bandwidth reduction
- Parallel data fetching
- Lazy loading of large datasets

### 2. Caching Strategy
- Template caching (24 hours)
- Result caching (1 hour)
- Worker capability caching (5 minutes)

### 3. Resource Pooling
- Pre-allocated worker slots
- Connection pooling
- Quota reservation system

## Monitoring Points

### Key Metrics
1. **Request Latency**: Time from creation to delivery
2. **Stage Duration**: Time per pipeline stage
3. **Success Rate**: Completed vs failed requests
4. **Resource Usage**: CPU, memory, storage per stage
5. **Cost Tracking**: API calls, storage, compute time

### Health Checks
- Every worker exposes `/health` endpoint
- Orchestrator monitors worker availability
- KAM tracks session validity
- Frontend monitors API responsiveness

## Security Considerations

### Data Protection
1. **In Transit**: All communication over HTTPS
2. **At Rest**: Encrypted in KV/R2 storage
3. **Access Control**: Role-based permissions
4. **Session Security**: 24-hour expiration, secure tokens

### Audit Trail
- Every API call logged
- Worker actions tracked
- Resource usage recorded
- Cost allocation per client

## Conclusion

This flow demonstrates how the AI Factory system orchestrates complex multi-stage pipelines while maintaining:
- **Scalability**: Distributed worker architecture
- **Reliability**: Multiple retry and recovery mechanisms
- **Efficiency**: Reference-based data transfer
- **Security**: Multi-layer authentication
- **Observability**: Comprehensive monitoring and tracking

The system can process requests from simple queries to complex research projects, automatically selecting appropriate workers and managing resources to deliver high-quality results efficiently.