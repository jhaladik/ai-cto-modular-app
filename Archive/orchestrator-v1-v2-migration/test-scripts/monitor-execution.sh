#!/bin/bash

EXEC_ID="exec_1754516818354_evyj2np0d"
ORCH_URL="https://bitware-orchestrator-v2.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"

for i in {1..6}; do
  echo "Check $i/6..."
  curl -s "$ORCH_URL/progress/$EXEC_ID" \
    -H "Authorization: Bearer $WORKER_SECRET" \
    -H "X-Worker-ID: test-client" | grep -o '"status":"[^"]*\|"current_stage":[^}]*' | head -5
  echo ""
  sleep 10
done

echo "Final check:"
cd workers/bitware_orchestrator_v2
wrangler d1 execute orchestrator-v2-db --remote --command="SELECT execution_id, status FROM pipeline_executions WHERE execution_id = '$EXEC_ID'" 2>&1 | grep -A 5 '"results"'
cd ../..

cd workers/bitware_content_granulator
wrangler d1 execute content-granulator-db --remote --command="SELECT id, status, actual_elements FROM granulation_jobs WHERE execution_id = '$EXEC_ID'" 2>&1 | grep -A 5 '"results"'
cd ../..