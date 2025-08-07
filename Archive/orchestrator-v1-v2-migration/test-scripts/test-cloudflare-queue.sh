#!/bin/bash

echo "========================================="
echo "Cloudflare Queue Integration Test"
echo "========================================="
echo ""

ORCH_URL="https://bitware-orchestrator-v2.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"

echo "1. Creating execution to test Cloudflare Queue..."
RESPONSE=$(curl -s -X POST "$ORCH_URL/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: test-worker" \
  -d '{
    "template_name": "course_creation",
    "client_id": "cloudflare_queue_test",
    "parameters": {
      "topic": "Testing Cloudflare Queue Integration",
      "structure_type": "course",
      "targetAudience": "developers"
    }
  }')

echo "Response: $RESPONSE"
EXEC_ID=$(echo $RESPONSE | grep -o '"execution_id":"[^"]*' | sed 's/"execution_id":"//')

if [ ! -z "$EXEC_ID" ]; then
  echo "Execution ID: $EXEC_ID"
  
  echo -e "\n2. Waiting 30 seconds for queue processing..."
  sleep 30
  
  echo -e "\n3. Checking execution status..."
  cd workers/bitware_orchestrator_v2
  STATUS=$(wrangler d1 execute orchestrator-v2-db --remote --command="SELECT execution_id, status, error_message FROM pipeline_executions WHERE execution_id = '$EXEC_ID'" 2>&1 | grep -A 5 '"results"')
  cd ../..
  
  echo "Status: $STATUS"
  
  echo -e "\n4. Checking stages..."
  cd workers/bitware_orchestrator_v2
  STAGES=$(wrangler d1 execute orchestrator-v2-db --remote --command="SELECT stage_id, worker_name, status FROM stage_executions WHERE execution_id = '$EXEC_ID'" 2>&1 | grep -A 10 '"results"')
  cd ../..
  
  echo "Stages: $STAGES"
  
  echo -e "\n5. Checking granulator jobs..."
  cd workers/bitware_content_granulator
  JOBS=$(wrangler d1 execute content-granulator-db --remote --command="SELECT id, status, topic FROM granulation_jobs WHERE execution_id = '$EXEC_ID'" 2>&1 | grep -A 5 '"results"')
  cd ../..
  
  echo "Jobs: $JOBS"
fi

echo -e "\nTest completed at $(date)"