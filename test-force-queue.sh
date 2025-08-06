#!/bin/bash

echo "========================================="
echo "Force Queue Processing Test"
echo "========================================="
echo ""

ORCH_URL="https://bitware-orchestrator-v2.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"

# Create a new execution to trigger queue processing
echo "1. Creating new execution to trigger queue processing..."
RESPONSE=$(curl -s -X POST "$ORCH_URL/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: test-worker" \
  -d '{
    "template_name": "course_creation",
    "client_id": "force_queue_test",
    "parameters": {
      "topic": "Force Queue Processing Test",
      "structure_type": "course"
    }
  }')

echo "Response: $RESPONSE"
EXEC_ID=$(echo $RESPONSE | grep -o '"execution_id":"[^"]*' | sed 's/"execution_id":"//')

if [ ! -z "$EXEC_ID" ]; then
  echo "Execution ID: $EXEC_ID"
  
  echo -e "\n2. Waiting 30 seconds for processing..."
  sleep 30
  
  echo -e "\n3. Checking execution status..."
  cd workers/bitware_orchestrator_v2
  STATUS=$(wrangler d1 execute orchestrator-v2-db --remote --command="SELECT execution_id, status, error_message FROM pipeline_executions WHERE execution_id = '$EXEC_ID'" 2>&1 | grep -A 5 '"results"')
  cd ../..
  
  echo "Status: $STATUS"
  
  echo -e "\n4. Checking granulator jobs..."
  cd workers/bitware_content_granulator
  JOBS=$(wrangler d1 execute content-granulator-db --remote --command="SELECT id, status, topic FROM granulation_jobs WHERE execution_id = '$EXEC_ID'" 2>&1 | grep -A 5 '"results"')
  cd ../..
  
  echo "Jobs: $JOBS"
fi

echo -e "\nTest completed at $(date)"