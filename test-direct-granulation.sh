#!/bin/bash

echo "========================================="
echo "Direct Granulation Test"
echo "========================================="
echo ""

GRAN_URL="https://bitware-content-granulator.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"

echo "1. Creating granulation job directly..."
RESPONSE=$(curl -s -X POST "$GRAN_URL/api/granulate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: test-direct" \
  -d '{
    "topic": "Artificial Intelligence Fundamentals",
    "structureType": "course",
    "granularityLevel": 3,
    "templateName": "educational_course_basic",
    "targetAudience": "beginners",
    "constraints": {
      "maxElements": 10,
      "maxDepth": 3
    },
    "validation": {
      "enabled": true,
      "level": 2,
      "threshold": 85
    }
  }')

echo "Response: $RESPONSE"
JOB_ID=$(echo $RESPONSE | grep -o '"id":[0-9]*' | sed 's/"id"://')

if [ ! -z "$JOB_ID" ]; then
  echo "Job ID: $JOB_ID"
  
  echo -e "\n2. Waiting 15 seconds for processing..."
  sleep 15
  
  echo -e "\n3. Getting job status..."
  STATUS=$(curl -s -X GET "$GRAN_URL/api/jobs/$JOB_ID/status" \
    -H "Authorization: Bearer $WORKER_SECRET" \
    -H "X-Worker-ID: test-direct")
  
  echo "Status: $STATUS"
  
  echo -e "\n4. Getting structure..."
  STRUCTURE=$(curl -s -X GET "$GRAN_URL/api/jobs/$JOB_ID/structure" \
    -H "Authorization: Bearer $WORKER_SECRET" \
    -H "X-Worker-ID: test-direct")
  
  echo "Structure (first 500 chars): ${STRUCTURE:0:500}..."
  
  echo -e "\n5. Summary:"
  echo "Job created: ✓"
  echo "Job status: $(echo $STATUS | grep -o '"status":"[^"]*' | sed 's/"status":"//')"
  echo "Structure generated: $(echo $STRUCTURE | grep -q 'generatedStructure' && echo '✓' || echo '✗')"
else
  echo "Failed to create job"
fi

echo -e "\nTest completed at $(date)"