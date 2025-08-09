#\!/bin/bash

BASE_URL="https://bitware-content-granulator.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"
WORKER_ID="test-worker"

echo "Testing Forced 3-Level Structure"
echo "================================"

RESPONSE=$(curl -s -X POST "$BASE_URL/api/execute"   -H "Content-Type: application/json"   -H "Authorization: Bearer $WORKER_SECRET"   -H "X-Worker-ID: $WORKER_ID"   -d '{
    "action": "granulate",
    "input": {
      "topic": "Space Exploration Adventure",
      "structureType": "novel",
      "granularityLevel": 3,
      "targetAudience": "young adults",
      "maxElements": 100
    },
    "config": {
      "aiProvider": "openai",
      "aiModel": "gpt-4o-mini",
      "temperature": 0.5,
      "maxTokens": 12000
    }
  }')

JOB_ID=$(echo "$RESPONSE" | jq -r '.output.jobId // empty')
echo "Job ID: $JOB_ID"

echo "$RESPONSE" | jq '.output.summary'

sleep 2

FULL=$(curl -s -X GET "$BASE_URL/api/jobs/$JOB_ID"   -H "Authorization: Bearer $WORKER_SECRET"   -H "X-Worker-ID: $WORKER_ID")

echo "$FULL" > "3level-$JOB_ID.json"

echo ""
echo "Level Analysis:"
echo "$FULL" | jq '[.structure[].metadata.level // 0] | {
  max: max,
  counts: group_by(.) | map({level: .[0], count: length}) | from_entries
}'

echo ""
echo "Has 3 levels: "
echo "$FULL" | jq '[.structure[].metadata.level // 0] | max >= 3'
