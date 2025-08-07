#!/bin/bash

echo "========================================="
echo "Queue Processor Debug Test"
echo "========================================="
echo ""

ORCH_URL="https://bitware-orchestrator-v2.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"

# First, let's process one of the stuck queue items manually
echo "1. Getting a stuck queue item..."
cd workers/bitware_orchestrator_v2
QUEUE_ITEM=$(wrangler d1 execute orchestrator-v2-db --remote --command="SELECT eq.*, pe.template_name, pe.parameters, pe.client_id FROM execution_queue eq JOIN pipeline_executions pe ON eq.execution_id = pe.execution_id WHERE eq.status = 'queued' LIMIT 1" 2>&1 | grep -A 50 '"results"' | grep -A 30 '"execution_id"')
cd ../..

if [ ! -z "$QUEUE_ITEM" ]; then
  EXEC_ID=$(echo $QUEUE_ITEM | grep -o '"execution_id":"[^"]*' | head -1 | sed 's/"execution_id":"//')
  echo "Found execution: $EXEC_ID"
  
  echo -e "\n2. Updating queue item to processing..."
  cd workers/bitware_orchestrator_v2
  wrangler d1 execute orchestrator-v2-db --remote --command="UPDATE execution_queue SET status = 'processing' WHERE execution_id = '$EXEC_ID'"
  cd ../..
  
  echo -e "\n3. Checking if stages exist..."
  cd workers/bitware_orchestrator_v2
  STAGES=$(wrangler d1 execute orchestrator-v2-db --remote --command="SELECT COUNT(*) as count FROM stage_executions WHERE execution_id = '$EXEC_ID'" 2>&1 | grep -o '"count":[0-9]*' | sed 's/"count"://')
  cd ../..
  echo "Stages found: $STAGES"
  
  echo -e "\n4. Checking execution status..."
  cd workers/bitware_orchestrator_v2
  STATUS=$(wrangler d1 execute orchestrator-v2-db --remote --command="SELECT status, started_at, error_message FROM pipeline_executions WHERE execution_id = '$EXEC_ID'" 2>&1 | grep -A 20 '"results"')
  cd ../..
  echo "Execution status: $STATUS"
fi

echo -e "\n5. Creating a new test execution with direct processing..."
RESPONSE=$(curl -s -X POST "$ORCH_URL/api/test/queue-execution" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: test-worker" \
  -d '{"client_id": "queue_debug_test"}')

echo "Test response: $RESPONSE"

echo -e "\n6. Let's check the orchestrator logs for errors..."
echo "Run: wrangler tail bitware-orchestrator-v2"
echo "Then run this test again to see what happens during queue processing"

echo -e "\nTest completed at $(date)"