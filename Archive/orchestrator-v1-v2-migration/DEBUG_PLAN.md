# Debug Plan for Orchestrator v2 Integration

## Priority 1: Fix Stage Creation and Handshake

### Step 1: Add Detailed Logging
Add console.log statements in these locations:
1. `pipeline-executor.ts` line 79-85 (stage creation loop)
2. `worker-coordinator.ts` line 175-190 (template detection)
3. `queue-manager.ts` processExecution method (template parsing)

### Step 2: Understand Stage Structure
The master template has `pipeline_stages` as a JSON string. Need to:
1. Log the parsed stages array
2. Verify each stage has required fields:
   - `stage_order` or `stage`
   - `worker_name` or `worker`
   - `action` or default to 'granulate'
   - `template_ref` for worker template reference

### Step 3: Fix Worker Invocation
In `worker-coordinator.ts`:
```typescript
// Current problematic code:
if (action === 'execute_template' && data.template_id) {
  // This never executes because action != 'execute_template'
}

// Fix suggestion:
const workerAction = action || 'granulate';
const templateRef = data.template_ref || stage.template_ref;

// For content granulator specifically:
if (workerName === 'bitware-content-granulator') {
  // Pass template_name instead of template_id
  inputData.template_name = templateRef;
  // Ensure required parameters are present
  inputData.structure_type = inputData.structure_type || 'course';
}
```

### Step 4: Direct Handshake Test
Test the granulator handshake directly:
```bash
curl -X POST https://bitware-content-granulator.jhaladik.workers.dev/api/handshake \
  -H "Authorization: Bearer internal-worker-auth-token-2024" \
  -H "X-Worker-ID: bitware-orchestrator-v2" \
  -H "Content-Type: application/json" \
  -d '{
    "executionId": "test_exec_123",
    "stageId": "test_stage_123",
    "action": "granulate",
    "inputData": {
      "topic": "Test Topic",
      "targetAudience": "beginners",
      "template_name": "educational_course_basic"
    },
    "resourceRequirements": {
      "estimatedTokens": 2000,
      "timeoutMs": 30000
    }
  }'
```

## Priority 2: Fix Stage Mapping

### Current Issue
The stage structure from KAM might use different field names than expected:
- KAM might use: `{ "stage": 1, "worker": "bitware-content-granulator", "template_ref": "course_v1" }`
- Orchestrator expects: `{ "stage_order": 1, "worker_name": "...", "action": "..." }`

### Fix
Add normalization in `queue-manager.ts`:
```typescript
const normalizedStages = parsedStages.map(stage => ({
  stage_order: stage.stage_order || stage.stage || 1,
  worker_name: stage.worker_name || stage.worker,
  action: stage.action || 'execute',
  template_ref: stage.template_ref,
  ...stage
}));
```

## Priority 3: Database Debugging

Check if stages are being created but not retrieved:
```sql
-- Check all stage executions
SELECT * FROM stage_executions ORDER BY created_at DESC LIMIT 10;

-- Check specific execution
SELECT * FROM stage_executions WHERE execution_id = 'exec_1754467280657_o3tu0cqdj';

-- Check handshake packets
SELECT * FROM handshake_packets ORDER BY sent_at DESC LIMIT 10;
```

## Priority 4: Complete Integration Test

Once handshake works:
1. Verify granulator creates job
2. Check job completion
3. Verify result storage
4. Check deliverable creation
5. Confirm execution completes

## Code Changes Needed

### 1. In `pipeline-executor.ts`:
```typescript
// Add before line 79
console.log('Creating stages for execution:', executionId);
console.log('Template stages:', JSON.stringify(template.stages, null, 2));

// Inside the loop
console.log(`Creating stage ${index + 1}:`, stage);
```

### 2. In `worker-coordinator.ts`:
```typescript
// Replace lines 176-189 with:
console.log('Invoking worker:', { workerName, action, executionId, stageId });
console.log('Input data:', data);

// Determine the actual action to send
let workerAction = action;
if (workerName === 'bitware-content-granulator') {
  workerAction = 'granulate';
  // Ensure template_name is set
  if (data.template_ref) {
    data.template_name = data.template_ref;
  }
}
```

### 3. In `queue-manager.ts` processExecution:
```typescript
// After parsing stages
console.log('Master template pipeline_stages:', masterTemplate.pipeline_stages);
const stages = JSON.parse(masterTemplate.pipeline_stages || '[]');
console.log('Parsed stages:', stages);

// Normalize stage structure
const normalizedStages = stages.map((stage, index) => ({
  stage_order: stage.stage_order || stage.stage || index + 1,
  worker_name: stage.worker_name || stage.worker,
  action: stage.action || 'execute',
  template_ref: stage.template_ref,
  ...stage
}));
console.log('Normalized stages:', normalizedStages);
```

## Success Criteria

1. Stage executions appear in database
2. Handshake packet created
3. Content Granulator receives and accepts handshake
4. Job appears in granulator jobs list
5. Execution completes successfully
6. Progress shows 100%