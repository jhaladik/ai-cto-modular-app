#!/bin/bash

echo "========================================="
echo "Worker Invocation Debug Test"
echo "========================================="
echo ""

ORCH_URL="https://bitware-orchestrator-v2.jhaladik.workers.dev"
GRAN_URL="https://bitware-content-granulator.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"

echo "1. Testing direct worker invocation..."
# First create a real execution
echo "1.1 Creating test execution..."
EXEC_RESPONSE=$(curl -s -X POST "$ORCH_URL/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: test-worker" \
  -d '{
    "template_name": "course_creation",
    "client_id": "worker_invoke_test",
    "parameters": {
      "topic": "Test Worker Invocation"
    }
  }')

echo "Execution response: $EXEC_RESPONSE"
EXEC_ID=$(echo $EXEC_RESPONSE | grep -o '"execution_id":"[^"]*' | sed 's/"execution_id":"//')

if [ ! -z "$EXEC_ID" ]; then
  echo "Execution ID: $EXEC_ID"
  
  echo -e "\n1.2 Waiting 2 seconds..."
  sleep 2
  
  echo -e "\n1.3 Testing direct worker invocation..."
  RESPONSE=$(curl -s -X POST "$ORCH_URL/api/test/worker-invoke" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $WORKER_SECRET" \
    -H "X-Worker-ID: test-worker" \
    -d "{
      \"worker_name\": \"bitware-content-granulator\",
      \"action\": \"granulate\",
      \"execution_id\": \"$EXEC_ID\",
      \"data\": {
        \"template_name\": \"educational_course_basic\",
        \"structure_type\": \"course\",
        \"topic\": \"Test from Worker Coordinator\"
      }
    }")
else
  echo "Failed to create execution"
  RESPONSE="{\"error\": \"Failed to create execution\"}"
fi

echo "Response: $RESPONSE"

echo -e "\nTest completed at $(date)"