#!/bin/bash

echo "========================================="
echo "FINAL INTEGRATION TEST"
echo "========================================="
echo ""

ORCH_URL="https://bitware-orchestrator-v2.jhaladik.workers.dev"
GRAN_URL="https://bitware-content-granulator.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"

echo "1. Testing direct granulator handshake..."
HANDSHAKE_RESPONSE=$(curl -s -X POST "$GRAN_URL/api/handshake" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: bitware-orchestrator-v2" \
  -d '{
    "executionId": "test_final_'$(date +%s)'",
    "stageId": "stage_test",
    "action": "granulate",
    "inputData": {
      "topic": "Direct Test Topic",
      "structure_type": "course",
      "template_name": "educational_course_basic"
    }
  }')

echo "Handshake response: $HANDSHAKE_RESPONSE"

echo -e "\n2. Testing orchestrator test endpoint..."
TEST_RESPONSE=$(curl -s -X POST "$ORCH_URL/api/test/queue-execution" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: test-worker" \
  -d '{"client_id": "final_test"}')

echo "Test response: $TEST_RESPONSE"
TEST_EXEC_ID=$(echo $TEST_RESPONSE | grep -o '"execution_id":"[^"]*' | sed 's/"execution_id":"//')

if [ ! -z "$TEST_EXEC_ID" ]; then
  echo "Test execution ID: $TEST_EXEC_ID"
  sleep 5
  
  echo -e "\n2.1 Checking test execution results..."
  cd workers/bitware_orchestrator_v2
  wrangler d1 execute orchestrator-v2-db --remote --command="SELECT execution_id, status FROM pipeline_executions WHERE execution_id = '$TEST_EXEC_ID'" 2>&1 | grep -A 10 '"results"'
  
  echo -e "\n2.2 Checking stages..."
  wrangler d1 execute orchestrator-v2-db --remote --command="SELECT stage_id, status, error_message FROM stage_executions WHERE execution_id = '$TEST_EXEC_ID'" 2>&1 | grep -A 10 '"results"'
  
  echo -e "\n2.3 Checking handshakes..."
  wrangler d1 execute orchestrator-v2-db --remote --command="SELECT packet_id, status FROM handshake_packets WHERE execution_id = '$TEST_EXEC_ID'" 2>&1 | grep -A 10 '"results"'
  cd ../..
fi

echo -e "\n3. Testing full pipeline execution..."
FULL_RESPONSE=$(curl -s -X POST "$ORCH_URL/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: test-client" \
  -d '{
    "template_name": "course_creation",
    "client_id": "final_test_full",
    "parameters": {
      "topic": "Complete Integration Test Topic",
      "structure_type": "course"
    }
  }')

echo "Full response: $FULL_RESPONSE"
FULL_EXEC_ID=$(echo $FULL_RESPONSE | grep -o '"execution_id":"[^"]*' | sed 's/"execution_id":"//')

if [ ! -z "$FULL_EXEC_ID" ]; then
  echo "Full execution ID: $FULL_EXEC_ID"
  echo "Waiting 10 seconds for processing..."
  sleep 10
  
  echo -e "\n3.1 Checking full execution results..."
  cd workers/bitware_orchestrator_v2
  wrangler d1 execute orchestrator-v2-db --remote --command="SELECT execution_id, status, started_at FROM pipeline_executions WHERE execution_id = '$FULL_EXEC_ID'" 2>&1 | grep -A 10 '"results"'
  
  echo -e "\n3.2 Checking queue status..."
  wrangler d1 execute orchestrator-v2-db --remote --command="SELECT queue_id, status FROM execution_queue WHERE execution_id = '$FULL_EXEC_ID'" 2>&1 | grep -A 10 '"results"'
  
  echo -e "\n3.3 Checking stages..."
  wrangler d1 execute orchestrator-v2-db --remote --command="SELECT stage_id, status, error_message FROM stage_executions WHERE execution_id = '$FULL_EXEC_ID'" 2>&1 | grep -A 10 '"results"'
  cd ../..
  
  echo -e "\n3.4 Checking granulator jobs..."
  cd workers/bitware_content_granulator
  wrangler d1 execute content-granulator-db --remote --command="SELECT id, status FROM granulation_jobs WHERE execution_id = '$FULL_EXEC_ID'" 2>&1 | grep -A 10 '"results"'
  cd ../..
fi

echo -e "\n========================================="
echo "SUMMARY"
echo "========================================="
echo "Direct granulator handshake: $(echo $HANDSHAKE_RESPONSE | grep -q 'accepted' && echo '✓ PASS' || echo '✗ FAIL')"
echo "Test endpoint execution: $(echo $TEST_RESPONSE | grep -q 'success.*true' && echo '✓ PASS' || echo '✗ FAIL')"
echo "Full pipeline execution: $([ ! -z "$FULL_EXEC_ID" ] && echo '✓ Created' || echo '✗ FAIL')"

echo -e "\nTest completed at $(date)"