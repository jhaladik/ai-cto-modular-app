#!/bin/bash

echo "========================================="
echo "Single Execution Test"
echo "========================================="
echo ""

ORCH_URL="https://bitware-orchestrator-v2.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"

echo "1. Creating single execution..."
RESPONSE=$(curl -s -X POST "$ORCH_URL/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: test-client" \
  -d '{
    "template_name": "course_creation",
    "client_id": "single_test",
    "parameters": {
      "topic": "Blockchain Technology",
      "structure_type": "course",
      "audience": "intermediate"
    }
  }')

echo "Response: $RESPONSE"
EXEC_ID=$(echo $RESPONSE | grep -o '"execution_id":"[^"]*' | sed 's/"execution_id":"//')
echo "Execution ID: $EXEC_ID"

if [ -z "$EXEC_ID" ]; then
  echo "Failed to create execution"
  exit 1
fi

echo -e "\n2. Waiting 30 seconds for processing..."
sleep 30

echo -e "\n3. Checking final status..."
STATUS=$(curl -s -X GET "$ORCH_URL/execution/$EXEC_ID" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: test-client")

echo "Final status:"
echo "$STATUS" | python -m json.tool 2>/dev/null || echo "$STATUS"

echo -e "\n4. Checking database state..."
cd workers/bitware_orchestrator_v2

echo -e "\n4.1 Execution details:"
wrangler d1 execute orchestrator-v2-db --remote --command="SELECT execution_id, status, template_name, started_at, completed_at, error_message FROM pipeline_executions WHERE execution_id = '$EXEC_ID'" 2>&1 | grep -A 20 '"results"'

echo -e "\n4.2 Stage details:"
wrangler d1 execute orchestrator-v2-db --remote --command="SELECT stage_id, stage_order, worker_name, status, started_at, completed_at, error_message FROM stage_executions WHERE execution_id = '$EXEC_ID'" 2>&1 | grep -A 20 '"results"'

echo -e "\n4.3 Handshake details:"
wrangler d1 execute orchestrator-v2-db --remote --command="SELECT packet_id, from_worker, to_worker, status, sent_at, received_at FROM handshake_packets WHERE execution_id = '$EXEC_ID'" 2>&1 | grep -A 20 '"results"'

echo -e "\n4.4 Data references:"
wrangler d1 execute orchestrator-v2-db --remote --command="SELECT ref_id, storage_type, storage_key, size_bytes FROM data_references WHERE execution_id = '$EXEC_ID'" 2>&1 | grep -A 20 '"results"'

cd ../..

echo -e "\n5. Checking granulator state..."
cd workers/bitware_content_granulator
wrangler d1 execute content-granulator-db --remote --command="SELECT id, topic, status, structure_type, granularity_level, execution_id FROM granulation_jobs WHERE execution_id = '$EXEC_ID'" 2>&1 | grep -A 20 '"results"'
cd ../..

echo -e "\nTest completed at $(date)"