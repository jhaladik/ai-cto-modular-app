#\!/bin/bash

# Test novel template with generic structure
BASE_URL="https://bitware-content-granulator.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"
WORKER_ID="test-worker"

echo "Testing novel template with updated prompt..."
echo "============================================="

NOVEL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/execute"   -H "Content-Type: application/json"   -H "Authorization: Bearer $WORKER_SECRET"   -H "X-Worker-ID: $WORKER_ID"   -d '{
    "action": "granulate",
    "input": {
      "topic": "A Mystery in Victorian London",
      "structureType": "novel",
      "granularityLevel": 3,
      "targetAudience": "adult mystery readers",
      "maxElements": 40
    },
    "config": {
      "aiProvider": "openai",
      "aiModel": "gpt-4o-mini",
      "temperature": 0.8,
      "maxTokens": 4000,
      "validation": false
    }
  }')

# Check if response has an error
if echo "$NOVEL_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
  echo "ERROR:"
  echo "$NOVEL_RESPONSE" | jq '.'
else
  echo "SUCCESS\! Novel structure created:"
  echo "$NOVEL_RESPONSE" | jq '{
    success,
    jobId: .output.jobId,
    topic: .output.topic,
    structureType: .output.structureType,
    totalElements: .output.summary.totalElements,
    levels: .output.summary.levels,
    qualityScore: .output.summary.qualityScore,
    ready: .output.readyForContentGeneration
  }'
  
  # Show first act structure
  echo ""
  echo "First Act Structure:"
  echo "$NOVEL_RESPONSE" | jq '.output.structure.elements[0] | {
    id,
    type,
    name,
    level,
    metadata: .metadata | {
      title,
      purpose,
      summary,
      themes
    },
    chaptersCount: (.elements | length)
  }'
fi

echo "Test completed."
