#\!/bin/bash

# Test universal structure with novel
BASE_URL="https://bitware-content-granulator.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"
WORKER_ID="test-worker"

echo "Testing Universal Content Structure with Novel"
echo "=============================================="
echo ""

# Test with user-provided objects (characters they want included)
NOVEL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/execute"   -H "Content-Type: application/json"   -H "Authorization: Bearer $WORKER_SECRET"   -H "X-Worker-ID: $WORKER_ID"   -d '{
    "action": "granulate",
    "input": {
      "topic": "A cyberpunk heist in Neo-Tokyo 2150",
      "structureType": "novel",
      "granularityLevel": 3,
      "targetAudience": "adult sci-fi readers",
      "maxElements": 100,
      "userObjects": {
        "mandatory": [
          {
            "type": "character",
            "name": "Kai Nakamura",
            "role": "hacker protagonist",
            "description": "Former corporate security expert turned rogue"
          },
          {
            "type": "location",
            "name": "The Data Fortress",
            "description": "Impenetrable corporate data center"
          }
        ]
      }
    },
    "config": {
      "aiProvider": "openai",
      "aiModel": "gpt-4o-mini",
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
  JOB_ID=$(echo "$NOVEL_RESPONSE" | jq -r '.output.jobId // empty')
  echo "✓ Job created: $JOB_ID"
  
  # Show summary
  echo ""
  echo "Structure Summary:"
  echo "$NOVEL_RESPONSE" | jq '{
    jobId: .output.jobId,
    totalElements: .output.summary.totalElements,
    levels: .output.summary.levels,
    qualityScore: .output.summary.qualityScore
  }'
  
  # Wait and fetch full structure
  echo ""
  echo "Fetching full structure..."
  sleep 3
  
  FULL_STRUCTURE=$(curl -s -X GET "$BASE_URL/api/jobs/$JOB_ID"     -H "Authorization: Bearer $WORKER_SECRET"     -H "X-Worker-ID: $WORKER_ID")
  
  echo "$FULL_STRUCTURE" > "universal-novel-$JOB_ID.json"
  
  # Check for objects in metadata
  echo ""
  echo "Checking for Objects:"
  echo "$FULL_STRUCTURE" | jq '.structure[0].metadata.objects // {} | 
    if . == {} then 
      "No objects in root metadata" 
    else 
      {
        hasProvided: (.provided \!= null),
        hasGenerated: (.generated \!= null),
        actorCount: (.generated.actors | length // 0),
        conceptCount: (.generated.concepts | length // 0),
        locationCount: (.generated.locations | length // 0)
      }
    end'
  
  # Check structure depth
  echo ""
  echo "Structure Depth Analysis:"
  echo "$FULL_STRUCTURE" | jq '[.structure[].metadata.level // 0] | 
    {
      maxLevel: max,
      level1Count: [.[] | select(. == 1)] | length,
      level2Count: [.[] | select(. == 2)] | length,
      level3Count: [.[] | select(. == 3)] | length
    }'
  
  # Check if user objects were included
  echo ""
  echo "Checking User Object Integration:"
  echo "$FULL_STRUCTURE" | jq '[.structure[].metadata | tostring] | 
    {
      kaiMentions: [.[] | select(contains("Kai") or contains("kai"))] | length,
      fortressMentions: [.[] | select(contains("Fortress") or contains("fortress"))] | length
    }'
  
  # Sample first scene if exists
  echo ""
  echo "Sample Scene (Level 3):"
  echo "$FULL_STRUCTURE" | jq '[.structure[] | select(.metadata.level == 3)] | 
    if length > 0 then 
      .[0] | {
        id: .id,
        title,
        type: .element_type,
        metadata: .metadata
      }
    else 
      "No level 3 scenes found"
    end'
  
  echo ""
  echo "✓ Full structure saved to universal-novel-$JOB_ID.json"
fi

echo ""
echo "Test completed."
