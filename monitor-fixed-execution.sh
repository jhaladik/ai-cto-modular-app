#!/bin/bash

EXEC_ID="exec_1754517170134_rlnh4k9cz"
ORCH_URL="https://bitware-orchestrator-v2.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"

echo "Monitoring execution: $EXEC_ID"
echo "================================="

for i in {1..8}; do
  echo -e "\nCheck $i/8 (waiting 15 seconds)..."
  
  # Get progress
  echo "Progress:"
  curl -s "$ORCH_URL/progress/$EXEC_ID" \
    -H "Authorization: Bearer $WORKER_SECRET" \
    -H "X-Worker-ID: test-client" | grep -o '"status":"[^"]*\|"progress":[0-9]*\|"message":"[^"]*' | head -5
  
  # Check database
  echo -e "\nDatabase status:"
  cd workers/bitware_orchestrator_v2 2>/dev/null
  wrangler d1 execute orchestrator-v2-db --remote --command="SELECT status FROM pipeline_executions WHERE execution_id = '$EXEC_ID'" 2>&1 | grep -o '"status":"[^"]*' | head -1
  
  # Check stage
  echo "Stage status:"
  wrangler d1 execute orchestrator-v2-db --remote --command="SELECT worker_name, status FROM stage_executions WHERE execution_id = '$EXEC_ID'" 2>&1 | grep -o '"worker_name":"[^"]*\|"status":"[^"]*' | head -2
  cd ../.. 2>/dev/null
  
  sleep 15
done

echo -e "\n\nFinal Results:"
echo "=============="

cd workers/bitware_orchestrator_v2
echo "Execution status:"
wrangler d1 execute orchestrator-v2-db --remote --command="SELECT execution_id, status, error_message FROM pipeline_executions WHERE execution_id = '$EXEC_ID'" 2>&1 | grep -A 10 '"results"'

echo -e "\nStage details:"
wrangler d1 execute orchestrator-v2-db --remote --command="SELECT stage_id, status, error_message FROM stage_executions WHERE execution_id = '$EXEC_ID'" 2>&1 | grep -A 10 '"results"'
cd ../..

cd workers/bitware_content_granulator
echo -e "\nGranulator job:"
wrangler d1 execute content-granulator-db --remote --command="SELECT id, status, actual_elements, quality_score FROM granulation_jobs WHERE execution_id = '$EXEC_ID'" 2>&1 | grep -A 10 '"results"'
cd ../..