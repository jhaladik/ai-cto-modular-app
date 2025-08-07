#!/bin/bash

echo "Testing stage creation directly..."

# Create a test execution first
EXEC_ID="exec_test_$(date +%s)_$(openssl rand -hex 4)"

echo "Creating test execution: $EXEC_ID"
wrangler d1 execute orchestrator-v2-db --remote --command="INSERT INTO pipeline_executions (execution_id, client_id, template_name, status, created_at) VALUES ('$EXEC_ID', 'test_client', 'test_template', 'pending', datetime('now'))"

echo -e "\nNow testing stage creation via API..."

# Test endpoint that should create a stage
curl -X POST https://bitware-orchestrator-v2.jhaladik.workers.dev/api/test/stage-creation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer internal-worker-auth-token-2024" \
  -H "X-Worker-ID: test-worker" \
  -d "{
    \"execution_id\": \"$EXEC_ID\",
    \"worker_name\": \"test-worker\",
    \"stage_order\": 1
  }"

echo -e "\n\nChecking if stage was created..."
sleep 2
wrangler d1 execute orchestrator-v2-db --remote --command="SELECT * FROM stage_executions WHERE execution_id = '$EXEC_ID'"

echo -e "\nDone!"