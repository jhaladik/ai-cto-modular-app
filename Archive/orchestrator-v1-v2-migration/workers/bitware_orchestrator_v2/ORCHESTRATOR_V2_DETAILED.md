# Orchestrator v2 Detailed Process Documentation

## Overview
The Orchestrator v2 is the central pipeline coordinator that manages the execution of multi-stage AI workflows. It handles resource allocation, worker coordination, and failure recovery through a sophisticated handshake protocol.

## Current Status (As of 2025-08-06)
- ✅ Queue Management: Working
- ✅ Master Template Fetching: Working
- ✅ Database Operations: Working
- ✅ Resource Estimation: Simplified version working
- ❌ Resource Reservation: Hanging/failing
- ❌ Stage Creation: Not reached
- ❌ Worker Handshake: Not reached
- ❌ Pipeline Completion: Not reached

## Detailed Process Flow

### 1. Execution Request Reception
**Endpoint**: `POST /execute`
**Source**: KAM (Key Account Manager)

```typescript
// Request payload
{
  template_name: string,      // e.g., "course_creation"
  parameters: object,         // e.g., { topic: "React", targetAudience: "beginners" }
  client_id: string,
  request_id?: string,
  priority?: 'low' | 'normal' | 'high' | 'critical'
}
```

**Process**:
1. `handlers/execution-ops.ts::handleExecute()` receives request
2. Creates execution ID: `exec_{timestamp}_{random}`
3. Calls `DatabaseService.createExecution()` to insert into `pipeline_executions` table
4. Calls `QueueManager.enqueue()` to add to execution queue
5. Returns execution ID and estimated completion time

### 2. Queue Management
**Component**: `services/queue-manager.ts`

**Queue Processing Loop**:
1. `processQueue()` runs when new items are enqueued
2. `getNextQueueItem()` fetches highest priority item:
   ```sql
   SELECT eq.*, pe.template_name, pe.parameters, pe.client_id
   FROM execution_queue eq
   JOIN pipeline_executions pe ON eq.execution_id = pe.execution_id
   WHERE eq.status IN ('queued', 'ready')
   ORDER BY eq.priority DESC, eq.created_at ASC
   ```
3. Updates queue status to 'processing'
4. Calls `processExecution()` for the queue item

**Current Issue**: Queue items are created and set to 'processing' but execution hangs

### 3. Master Template Resolution
**Process in `processExecution()`**:
1. Fetches master template from KAM:
   ```typescript
   GET https://kam.internal/api/master-templates/{template_name}
   ```
2. Response structure:
   ```json
   {
     "template_id": "mt_course_001",
     "template_name": "course_creation",
     "pipeline_stages": "[{\"stage\": 1, \"worker\": \"bitware-content-granulator\", \"template_ref\": \"course_v1\"}]"
   }
   ```
3. Parses `pipeline_stages` JSON string
4. Builds `PipelineTemplate` object with stages

**Status**: ✅ Working correctly

### 4. Pipeline Execution
**Component**: `services/pipeline-executor.ts`

**Execution Steps**:
1. **Status Update**: Sets execution to 'running'
2. **Resource Estimation**: 
   - Currently simplified to return default estimates
   - Original implementation queries historical usage:
     ```sql
     SELECT AVG(quantity_used) as avg_usage, resource_type, resource_name
     FROM resource_usage ru
     JOIN stage_executions se ON ru.stage_id = se.stage_id
     WHERE se.worker_name = ?
     ```
3. **Resource Reservation**: ❌ **HANGING HERE**
   - Calls `ResourceManager.reserve()`
   - Should create entries in `resource_allocations` table
   - Complex availability checking logic

### 5. Resource Management (Problem Area)
**Component**: `services/resource-manager.ts`

**Resource Types**:
- API tokens (OpenAI, Anthropic)
- Storage (KV, R2)
- Compute time
- Worker capacity

**Reservation Process**:
1. For each required resource:
   - Check availability via `checkAvailability()`
   - Query current usage from database
   - Calculate available capacity
   - Create allocation record if available
2. Return success/failure with allocation IDs

**Issues**:
- Complex database queries may be timing out
- No proper error handling for database failures
- Trying to query tables that may not have data

### 6. Stage Execution (Not Reached)
**Expected Process**:
1. For each stage in pipeline:
   ```typescript
   const stageId = await db.createStageExecution({
     execution_id,
     worker_name: stage.worker_name,
     stage_order: stage.stage_order,
     status: 'pending'
   });
   ```

2. **Data Storage**:
   - Input data stored via `StorageManager`
   - Decides between inline, KV, or R2 based on size
   - Creates data reference for handshake

3. **Worker Invocation**:
   - Calls `WorkerCoordinator.invokeWorker()`
   - Implements handshake protocol

### 7. Handshake Protocol (Not Reached)
**Component**: `services/worker-coordinator.ts`

**Phase 1 - Handshake**:
```typescript
POST /api/handshake
{
  executionId: string,
  stageId: string,
  action: string,
  inputData: object,
  dataReference?: DataReference,
  resourceRequirements: {
    estimatedTokens: number,
    timeoutMs: number
  },
  validationConfig: object
}
```

**Expected Response**:
```typescript
{
  executionId: string,
  workerId: string,
  accepted: boolean,
  estimatedCompletionMs: number,
  resourceRequirements: object,
  capabilities: object
}
```

**Phase 2 - Process Trigger**:
```typescript
POST /api/process
{
  executionId: string
}
```

### 8. Progress Monitoring (Not Reached)
- Poll `/api/progress/{executionId}` on worker
- Update stage execution records
- Handle completion/failure

### 9. Result Compilation (Not Reached)
- Retrieve output from worker
- Store as deliverable
- Update execution status
- Calculate final costs

## Database Schema Issues

### Naming Inconsistencies:
- Tables use snake_case: `pipeline_executions`, `stage_executions`
- Columns mix styles: `execution_id` vs `executionId` in code
- Singular vs plural: `resource_usage` vs `resource_allocations`

### Missing Indexes:
- Need indexes on frequently queried columns
- Composite indexes for join operations

### Foreign Key Constraints:
- Removed FK from `pipeline_executions` to `pipeline_templates`
- May cause referential integrity issues

## Critical Problems to Fix

1. **Resource Manager Simplification**:
   - Remove complex availability checking
   - Use simple counters instead of database queries
   - Add proper timeout handling

2. **Error Handling**:
   - Add try-catch blocks around all database operations
   - Add detailed logging at each step
   - Implement proper error propagation

3. **Service Bindings**:
   - Ensure all workers are properly bound in `wrangler.toml`
   - Verify worker names match between configuration and code

4. **Database Operations**:
   - Add connection pooling
   - Implement query timeouts
   - Add retry logic for transient failures

## Next Steps for Debugging

1. Add comprehensive logging to `ResourceManager.reserve()`
2. Simplify resource checking to bypass database queries
3. Add timeout handling to all async operations
4. Create integration tests for each component
5. Implement health check endpoints for debugging

## Testing Checklist

- [ ] Can create execution
- [ ] Can enqueue to execution queue
- [ ] Can fetch master template from KAM
- [ ] Can estimate resources (simplified)
- [ ] Can reserve resources
- [ ] Can create stage executions
- [ ] Can perform worker handshake
- [ ] Can trigger worker processing
- [ ] Can monitor progress
- [ ] Can complete execution

## Current Execution Flow Trace

```
1. KAM → POST /execute → Orchestrator ✅
2. Create execution record ✅
3. Add to queue ✅
4. Process queue item ✅
5. Fetch master template from KAM ✅
6. Parse pipeline stages ✅
7. Call PipelineExecutor.execute() ✅
8. Update status to 'running' ✅
9. Estimate resources ✅
10. Reserve resources ❌ HANGING HERE
11. Create stages...
12. Execute stages...
13. Complete execution...
```

## Environment Configuration

### Required Service Bindings:
```toml
[[services]]
binding = "KAM"
service = "bitware-key-account-manager"

[[services]]
binding = "CONTENT_GRANULATOR"
service = "bitware-content-granulator"
```

### Required KV Namespaces:
- EXECUTION_CACHE
- RESOURCE_CACHE
- DATA_REFS

### Required D1 Database:
- orchestrator-v2-db

### Required R2 Bucket:
- orchestrator-v2-data

## Common Error Patterns

1. **"no such column: updated_at"**: Fixed by removing references to non-existent columns
2. **"FOREIGN KEY constraint failed"**: Fixed by removing FK constraints
3. **"KV put() limit exceeded"**: Need to implement alternative caching
4. **Authentication errors**: Fixed WORKER_SHARED_SECRET → WORKER_SECRET

## Conclusion

The Orchestrator v2 is a complex system that requires careful coordination between multiple components. The current implementation is failing at the resource reservation stage, preventing the pipeline from proceeding to stage execution and worker handshakes. The next debugging session should focus on simplifying the resource management system and adding comprehensive error handling throughout the execution flow.