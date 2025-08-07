#!/bin/bash

echo "========================================="
echo "Simple Execution Flow Test"
echo "========================================="
echo ""

ORCH_URL="https://bitware-orchestrator-v2.jhaladik.workers.dev"
GRAN_URL="https://bitware-content-granulator.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"

echo "1. Creating execution..."
EXEC_RESPONSE=$(curl -s -X POST "$ORCH_URL/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: test-client" \
  -d '{
    "template_name": "course_creation",
    "client_id": "test_client",
    "parameters": {
      "topic": "AI Fundamentals",
      "structure_type": "course"
    }
  }')

EXEC_ID=$(echo $EXEC_RESPONSE | grep -o '"execution_id":"[^"]*' | sed 's/"execution_id":"//')
echo "Execution ID: $EXEC_ID"

echo -e "\n2. Waiting for processing..."
sleep 15

echo -e "\n3. Checking execution status..."
STATUS=$(curl -s -X GET "$ORCH_URL/execution/$EXEC_ID" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: test-client")
echo "Status: $(echo $STATUS | python -m json.tool 2>/dev/null | head -20)"

echo -e "\n4. Checking database directly..."
cd workers/bitware_orchestrator_v2

echo -e "\nStage executions:"
wrangler d1 execute orchestrator-v2-db --remote --command="SELECT stage_id, worker_name, status, error_message FROM stage_executions WHERE execution_id = '$EXEC_ID'"

echo -e "\nHandshake packets:"
wrangler d1 execute orchestrator-v2-db --remote --command="SELECT packet_id, to_worker, status FROM handshake_packets WHERE execution_id = '$EXEC_ID'"

echo -e "\nExecution queue:"
wrangler d1 execute orchestrator-v2-db --remote --command="SELECT queue_id, status FROM execution_queue WHERE execution_id = '$EXEC_ID'"

cd ../..

echo -e "\n5. Checking granulator jobs..."
cd workers/bitware_content_granulator
wrangler d1 execute content-granulator-db --remote --command="SELECT id, topic, status FROM granulation_jobs WHERE execution_id = '$EXEC_ID'"
cd ../..

echo -e "\nTest completed at $(date)"