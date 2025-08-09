#\!/bin/bash

# Test simplified novel template
BASE_URL="https://bitware-content-granulator.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"
WORKER_ID="test-worker"

echo "Testing simplified novel template..."
echo "===================================="
echo ""

NOVEL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/execute"   -H "Content-Type: application/json"   -H "Authorization: Bearer $WORKER_SECRET"   -H "X-Worker-ID: $WORKER_ID"   -d '{
    "action": "granulate",
    "input": {
      "topic": "A romantic comedy in Paris",
      "structureType": "novel",
      "granularityLevel": 3,
      "targetAudience": "young adult romance readers",
      "maxElements": 100
    },
    "config": {
      "aiProvider": "openai",
      "aiModel": "gpt-4o-mini",
      "temperature": 0.6,
      "maxTokens": 12000,
      "validation": false
    }
  }')

# Check response
if echo "$NOVEL_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
  echo "ERROR:"
  echo "$NOVEL_RESPONSE" | jq '.'
else
  JOB_ID=$(echo "$NOVEL_RESPONSE" | jq -r '.output.jobId // empty')
  echo "Job ID: $JOB_ID"
  
  # Check summary
  echo ""
  echo "Structure summary:"
  echo "$NOVEL_RESPONSE" | jq '.output.summary'
  
  # Wait and fetch full structure
  echo ""
  echo "Fetching full structure..."
  sleep 2
  
  FULL_STRUCTURE=$(curl -s -X GET "$BASE_URL/api/jobs/$JOB_ID"     -H "Authorization: Bearer $WORKER_SECRET"     -H "X-Worker-ID: $WORKER_ID")
  
  echo "$FULL_STRUCTURE" > "simple-novel-$JOB_ID.json"
  
  # Check if we have 3 levels
  echo ""
  echo "Checking structure depth:"
  echo "$FULL_STRUCTURE" | jq '[.structure[].metadata.level // 0] | max as $max | 
    {
      maxLevel: $max,
      hasScenes: ($max >= 3),
      levelCounts: [.structure[].metadata.level // 0] | group_by(.) | map({level: .[0], count: length}) | from_entries
    }'
  
  # Check for objects
  echo ""
  echo "Checking for objects:"
  echo "$FULL_STRUCTURE" | jq '.structure[0].metadata.objects // "No objects found" | 
    if type == "object" then 
      {
        characters: (.characters | length),
        locations: (.locations | length)
      }
    else . end'
  
  # Show a sample scene if exists
  echo ""
  echo "Looking for scenes (level 3):"
  echo "$FULL_STRUCTURE" | jq '[.structure[] | select(.metadata.level == 3)] | 
    if length > 0 then 
      {
        totalScenes: length,
        firstScene: .[0] | {title, type: .element_type, metadata: .metadata}
      }
    else "No scenes found" end'
  
  echo ""
  echo "Full structure saved to simple-novel-$JOB_ID.json"
fi

echo ""
echo "Test completed."
