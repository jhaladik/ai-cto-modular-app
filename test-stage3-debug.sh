#!/bin/bash

# Debug Stage 3 specifically
echo "Testing Stage 3 with existing project"

API_URL="https://bitware-content-granulator.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"
WORKER_ID="test-worker"
PROJECT_ID=32  # Use the existing project

echo "Executing Stage 3 for Project $PROJECT_ID..."

curl -X POST "$API_URL/api/v2/stages/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: $WORKER_ID" \
  -d "{
    \"project_id\": $PROJECT_ID,
    \"stage_number\": 3,
    \"ai_config\": {
      \"provider\": \"openai\",
      \"model\": \"gpt-3.5-turbo\",
      \"temperature\": 0.8,
      \"maxTokens\": 2000
    }
  }" \
  -v