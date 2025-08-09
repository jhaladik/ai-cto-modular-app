#\!/bin/bash

# Test novel template with example and high token limit
BASE_URL="https://bitware-content-granulator.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"
WORKER_ID="test-worker"

echo "Testing novel template with example structure..."
echo "==============================================="
echo "Using 16000 token limit for complete generation"
echo ""

NOVEL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/execute"   -H "Content-Type: application/json"   -H "Authorization: Bearer $WORKER_SECRET"   -H "X-Worker-ID: $WORKER_ID"   -d '{
    "action": "granulate",
    "input": {
      "topic": "A thrilling spy adventure in Cold War Berlin",
      "structureType": "novel",
      "granularityLevel": 3,
      "targetAudience": "adult thriller and espionage fiction readers",
      "maxElements": 100
    },
    "config": {
      "aiProvider": "openai",
      "aiModel": "gpt-4o-mini",
      "temperature": 0.7,
      "maxTokens": 16000,
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
  
  # Check if objects are included
  echo ""
  echo "Objects in structure:"
  echo "$NOVEL_RESPONSE" | jq '.output.structure.objects | 
    if . then {
      characters: (.characters | length),
      locations: (.locations | length),
      items: (.items | length)
    } else "No objects found" end' 2>/dev/null || echo "No objects in response"
  
  # Show structure levels
  echo ""
  echo "Structure hierarchy:"
  echo "$NOVEL_RESPONSE" | jq '.output.structure.elements | {
    acts: length,
    firstAct: {
      name: .[0].name,
      chapters: (.[0].elements | length),
      firstChapter: {
        name: .[0].elements[0].name,
        scenes: (.[0].elements[0].elements | length)
      }
    }
  }' 2>/dev/null || echo "Could not parse hierarchy"
  
  # Save job ID
  JOB_ID=$(echo "$NOVEL_RESPONSE" | jq -r '.output.jobId // empty')
  if [ \! -z "$JOB_ID" ]; then
    echo ""
    echo "Job ID: $JOB_ID"
    
    # Save full response to file
    echo ""
    echo "Saving full structure to novel-job-$JOB_ID.json..."
    curl -s -X GET "$BASE_URL/api/jobs/$JOB_ID"       -H "Authorization: Bearer $WORKER_SECRET"       -H "X-Worker-ID: $WORKER_ID" > "novel-job-$JOB_ID.json"
    
    # Show a sample character if exists
    echo ""
    echo "Sample character from objects:"
    jq '.structure[0].metadata.objects.characters[0] // "No characters found"' "novel-job-$JOB_ID.json" 2>/dev/null || echo "Could not extract character"
  fi
fi

echo ""
echo "Test completed."
