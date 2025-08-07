#!/bin/bash

echo "Testing direct pipeline execution..."

# Test direct execution endpoint
curl -X POST https://bitware-orchestrator-v2.jhaladik.workers.dev/api/test/direct-execution \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer internal-worker-auth-token-2024" \
  -H "X-Worker-ID: test-worker" \
  -d '{
    "client_id": "test_client_123",
    "template_name": "course_creation"
  }'

echo -e "\n\nChecking stage executions..."
sleep 3
wrangler d1 execute orchestrator-v2-db --remote --command="SELECT execution_id, worker_name, status, created_at FROM stage_executions ORDER BY created_at DESC LIMIT 5"

echo -e "\nDone!"