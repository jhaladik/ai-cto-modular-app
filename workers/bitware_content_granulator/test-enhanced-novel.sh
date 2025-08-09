#\!/bin/bash

# Test enhanced novel template with objects
BASE_URL="https://bitware-content-granulator.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"
WORKER_ID="test-worker"

echo "Testing enhanced novel template with objects..."
echo "============================================="

NOVEL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/execute"   -H "Content-Type: application/json"   -H "Authorization: Bearer $WORKER_SECRET"   -H "X-Worker-ID: $WORKER_ID"   -d '{
    "action": "granulate",
    "input": {
      "topic": "A Mystery in Victorian London with Detective Blackwood",
      "structureType": "novel",
      "granularityLevel": 3,
      "targetAudience": "adult mystery and thriller readers",
      "maxElements": 60
    },
    "config": {
      "aiProvider": "openai",
      "aiModel": "gpt-4o-mini",
      "temperature": 0.8,
      "maxTokens": 8000,
      "validation": false
    }
  }')

# Check if response has an error
if echo "$NOVEL_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
  echo "ERROR:"
  echo "$NOVEL_RESPONSE" | jq '.'
else
  echo "SUCCESS\! Enhanced novel structure created:"
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
  
  # Check if objects are included
  echo ""
  echo "Objects in structure:"
  echo "$NOVEL_RESPONSE" | jq '.output.structure.objects | {
    characters: (.characters | length),
    locations: (.locations | length),
    plotDevices: (.plotDevices | length),
    timeline: (.timeline | length)
  }' 2>/dev/null || echo "No objects found in structure"
  
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
      summary: (.summary | .[0:100] + "..."),
      themes,
      characterFocus,
      locationFocus
    },
    chaptersCount: (.elements | length),
    firstChapter: .elements[0] | {
      name,
      scenesCount: (.elements | length)
    }
  }' 2>/dev/null || echo "Could not parse act structure"
  
  # Save job ID for checking
  JOB_ID=$(echo "$NOVEL_RESPONSE" | jq -r '.output.jobId // empty')
  if [ \! -z "$JOB_ID" ]; then
    echo ""
    echo "Job ID: $JOB_ID"
    echo "To fetch full structure: curl -s -X GET \"$BASE_URL/api/jobs/$JOB_ID\" -H \"Authorization: Bearer $WORKER_SECRET\" -H \"X-Worker-ID: $WORKER_ID\" | jq '.'"
  fi
fi

echo ""
echo "Test completed."
