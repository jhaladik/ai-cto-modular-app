#!/bin/bash

echo "========================================="
echo "KAM → Orchestrator → Granulator Test"
echo "========================================="
echo ""

# Configuration
KAM_URL="https://bitware-key-account-manager.jhaladik.workers.dev"
ORCH_URL="https://bitware-orchestrator-v2.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"

echo "Step 1: Login to KAM as admin"
echo "------------------------------"
LOGIN=$(curl -s -X POST "$KAM_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@ai-factory.com",
    "password": "admin123",
    "loginType": "admin"
  }')

SESSION_TOKEN=$(echo $LOGIN | grep -o '"sessionToken":"[^"]*' | sed 's/"sessionToken":"//')
echo "Session obtained: ${SESSION_TOKEN:0:20}..."

echo -e "\nStep 2: Create a client request in KAM"
echo "--------------------------------------"
REQUEST=$(curl -s -X POST "$KAM_URL/requests" \
  -H "Content-Type: application/json" \
  -H "x-bitware-session-token: $SESSION_TOKEN" \
  -d '{
    "client_id": 1,
    "title": "KAM to Granulator Test",
    "description": "Testing full pipeline from KAM to Granulator",
    "urgency": "normal",
    "status": "pending"
  }')

echo "Request response: $REQUEST"
REQUEST_ID=$(echo $REQUEST | grep -o '"request_id":[0-9]*' | sed 's/"request_id"://')
if [ -z "$REQUEST_ID" ]; then
  REQUEST_ID=$(echo $REQUEST | grep -o '"id":[0-9]*' | sed 's/"id"://')
fi
echo "Request created: ID=$REQUEST_ID"

echo -e "\nStep 3: Assign template and execute"
echo "-----------------------------------"
EXECUTE=$(curl -s -X POST "$KAM_URL/requests/$REQUEST_ID/execute" \
  -H "Content-Type: application/json" \
  -H "x-bitware-session-token: $SESSION_TOKEN" \
  -d '{
    "template_name": "course_creation",
    "parameters": {
      "topic": "Full Pipeline Test - Machine Learning Basics",
      "structure_type": "course",
      "targetAudience": "beginners"
    }
  }')

echo "Execute response: $EXECUTE"

if [[ $EXECUTE == *"execution_id"* ]]; then
  EXEC_ID=$(echo $EXECUTE | grep -o '"execution_id":"[^"]*' | sed 's/"execution_id":"//')
  echo "Execution ID: $EXEC_ID"
  
  echo -e "\nStep 4: Monitor execution progress"
  echo "---------------------------------"
  
  for i in {1..6}; do
    echo -e "\nCheck $i/6 (waiting 10 seconds)..."
    sleep 10
    
    # Check orchestrator execution status
    echo "Orchestrator status:"
    cd workers/bitware_orchestrator_v2
    wrangler d1 execute orchestrator-v2-db --remote --command="SELECT execution_id, status, started_at FROM pipeline_executions WHERE execution_id = '$EXEC_ID'" 2>&1 | grep -A 5 '"results"'
    
    # Check stages
    echo -e "\nStage status:"
    wrangler d1 execute orchestrator-v2-db --remote --command="SELECT stage_id, worker_name, status FROM stage_executions WHERE execution_id = '$EXEC_ID'" 2>&1 | grep -A 10 '"results"'
    cd ../..
    
    # Check granulator jobs
    echo -e "\nGranulator jobs:"
    cd workers/bitware_content_granulator
    wrangler d1 execute content-granulator-db --remote --command="SELECT id, status, topic FROM granulation_jobs WHERE execution_id = '$EXEC_ID'" 2>&1 | grep -A 10 '"results"'
    cd ../..
  done
  
  echo -e "\nStep 5: Final status check"
  echo "-------------------------"
  cd workers/bitware_orchestrator_v2
  FINAL_STATUS=$(wrangler d1 execute orchestrator-v2-db --remote --command="SELECT status FROM pipeline_executions WHERE execution_id = '$EXEC_ID'" 2>&1)
  cd ../..
  
  if [[ $FINAL_STATUS == *'"completed"'* ]]; then
    echo "✅ SUCCESS: Pipeline completed successfully!"
  elif [[ $FINAL_STATUS == *'"failed"'* ]]; then
    echo "❌ FAILED: Pipeline execution failed"
  else
    echo "⏳ RUNNING: Pipeline still processing"
  fi
else
  echo "❌ Failed to create execution"
fi

echo -e "\nTest completed at $(date)"