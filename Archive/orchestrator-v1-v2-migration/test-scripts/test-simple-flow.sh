#!/bin/bash

echo "========================================="
echo "Simple Orchestrator → Granulator Test"
echo "========================================="
echo ""

ORCH_URL="https://bitware-orchestrator-v2.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"

echo "Creating execution..."
RESPONSE=$(curl -s -X POST "$ORCH_URL/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: test-client" \
  -d '{
    "template_name": "course_creation",
    "client_id": "simple_test_'$(date +%s)'",
    "parameters": {
      "topic": "Simple Flow Test - Python Programming",
      "structure_type": "course",
      "targetAudience": "beginners"
    },
    "priority": "high"
  }')

echo "Response: $RESPONSE"
EXEC_ID=$(echo $RESPONSE | grep -o '"execution_id":"[^"]*' | sed 's/"execution_id":"//')

if [ ! -z "$EXEC_ID" ]; then
  echo "✅ Execution created: $EXEC_ID"
  echo ""
  
  # Monitor for 2 minutes
  for i in {1..12}; do
    echo "Check $i/12 (waiting 10 seconds)..."
    sleep 10
    
    # Check execution status
    STATUS=$(curl -s "$ORCH_URL/progress/$EXEC_ID" \
      -H "Authorization: Bearer $WORKER_SECRET" \
      -H "X-Worker-ID: test-client")
    
    echo "Progress: $(echo $STATUS | grep -o '"status":"[^"]*' | sed 's/"status":"//')"
    echo "Stage: $(echo $STATUS | grep -o '"current_stage":[^}]*' | head -20)"
    
    if [[ $STATUS == *'"status":"completed"'* ]]; then
      echo ""
      echo "✅ SUCCESS: Execution completed!"
      
      # Get final details
      DETAILS=$(curl -s "$ORCH_URL/execution/$EXEC_ID" \
        -H "Authorization: Bearer $WORKER_SECRET" \
        -H "X-Worker-ID: test-client")
      
      echo "Deliverables: $(echo $DETAILS | grep -o '"deliverables":\[[^]]*\]' | head -50)"
      break
    elif [[ $STATUS == *'"status":"failed"'* ]]; then
      echo ""
      echo "❌ FAILED: Execution failed!"
      echo "Error: $(echo $STATUS | grep -o '"error":"[^"]*' | sed 's/"error":"//')"
      break
    fi
  done
  
  echo ""
  echo "Final database check:"
  cd workers/bitware_content_granulator
  wrangler d1 execute content-granulator-db --remote --command="SELECT id, status, actual_elements, quality_score FROM granulation_jobs WHERE execution_id = '$EXEC_ID'" 2>&1 | grep -A 10 '"results"'
  cd ../..
else
  echo "❌ Failed to create execution"
fi

echo ""
echo "Test completed at $(date)"