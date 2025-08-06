#!/bin/bash

echo "========================================="
echo "Granulator Direct API Test"
echo "========================================="
echo ""

GRAN_URL="https://bitware-content-granulator.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"

echo "1. Creating granulation job via direct API..."
RESPONSE=$(curl -s -X POST "$GRAN_URL/api/granulate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: test-direct" \
  -d '{
    "topic": "Introduction to JavaScript",
    "structureType": "course",
    "granularityLevel": 3,
    "templateName": "educational_course_basic",
    "targetAudience": "beginners",
    "constraints": {
      "maxElements": 8,
      "maxDepth": 3
    },
    "validation": {
      "enabled": false
    }
  }')

echo "Response: $RESPONSE"
JOB_ID=$(echo $RESPONSE | grep -o '"id":[0-9]*' | sed 's/"id"://')

if [ ! -z "$JOB_ID" ]; then
  echo "Job ID: $JOB_ID"
  
  echo -e "\n2. Waiting 20 seconds for processing..."
  sleep 20
  
  echo -e "\n3. Getting job status..."
  STATUS=$(curl -s -X GET "$GRAN_URL/api/jobs/$JOB_ID" \
    -H "Authorization: Bearer $WORKER_SECRET" \
    -H "X-Worker-ID: test-direct")
  
  echo "Status (first 1000 chars): ${STATUS:0:1000}..."
  
  echo -e "\n4. Getting structure..."
  STRUCTURE=$(curl -s -X GET "$GRAN_URL/api/jobs/$JOB_ID/structure" \
    -H "Authorization: Bearer $WORKER_SECRET" \
    -H "X-Worker-ID: test-direct")
  
  echo "Structure (first 1000 chars): ${STRUCTURE:0:1000}..."
fi

echo -e "\nTest completed at $(date)"