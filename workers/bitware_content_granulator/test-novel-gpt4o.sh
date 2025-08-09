#\!/bin/bash

# Test with GPT-4o instead of GPT-4o-mini
BASE_URL="https://bitware-content-granulator.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"
WORKER_ID="test-worker"

echo "Testing novel template with GPT-4o (more capable model)..."
echo "========================================================="
echo ""

NOVEL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/execute"   -H "Content-Type: application/json"   -H "Authorization: Bearer $WORKER_SECRET"   -H "X-Worker-ID: $WORKER_ID"   -d '{
    "action": "granulate",
    "input": {
      "topic": "A detective mystery in modern Tokyo",
      "structureType": "novel",
      "granularityLevel": 3,
      "targetAudience": "adult mystery readers",
      "maxElements": 100
    },
    "config": {
      "aiProvider": "openai",
      "aiModel": "gpt-4o",
      "temperature": 0.7,
      "maxTokens": 16000,
      "validation": false
    }
  }')

# Check response
if echo "$NOVEL_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
  echo "ERROR:"
  echo "$NOVEL_RESPONSE" | jq '.'
else
  echo "SUCCESS\!"
  JOB_ID=$(echo "$NOVEL_RESPONSE" | jq -r '.output.jobId // empty')
  
  echo "$NOVEL_RESPONSE" | jq '{
    jobId: .output.jobId,
    totalElements: .output.summary.totalElements,
    levels: .output.summary.levels,
    hasObjects: (.output.structure.objects \!= null),
    hasScenes: (.output.summary.levels["3"] > 0)
  }'
  
  echo ""
  echo "Fetching full structure..."
  sleep 2
  
  curl -s -X GET "$BASE_URL/api/jobs/$JOB_ID"     -H "Authorization: Bearer $WORKER_SECRET"     -H "X-Worker-ID: $WORKER_ID" > "gpt4o-job-$JOB_ID.json"
  
  echo "Checking structure depth:"
  jq '[.structure[] | .metadata.level // 0] | max' "gpt4o-job-$JOB_ID.json"
  
  echo ""
  echo "Full structure saved to gpt4o-job-$JOB_ID.json"
fi

echo ""
echo "Test completed."
