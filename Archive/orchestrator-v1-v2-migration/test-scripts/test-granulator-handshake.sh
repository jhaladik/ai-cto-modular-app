#!/bin/bash

echo "========================================="
echo "Granulator Handshake Direct Test"
echo "========================================="
echo ""

GRAN_URL="https://bitware-content-granulator.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"

EXEC_ID="test_handshake_$(date +%s)"
STAGE_ID="stage_handshake_$(date +%s)"

echo "1. Testing granulator handshake directly..."
echo "Execution ID: $EXEC_ID"
echo "Stage ID: $STAGE_ID"

HANDSHAKE=$(curl -s -X POST "$GRAN_URL/api/handshake" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: bitware-orchestrator-v2" \
  -d "{
    \"executionId\": \"$EXEC_ID\",
    \"stageId\": \"$STAGE_ID\",
    \"action\": \"granulate\",
    \"inputData\": {
      \"template_name\": \"educational_course_basic\",
      \"structure_type\": \"course\",
      \"topic\": \"Direct Handshake Test\",
      \"targetAudience\": \"beginners\",
      \"granularityLevel\": 3
    },
    \"resourceRequirements\": {
      \"estimatedTokens\": 2000,
      \"timeoutMs\": 30000
    },
    \"validationConfig\": {
      \"enabled\": true,
      \"level\": 2
    }
  }")

echo "Handshake response: $HANDSHAKE"

if echo "$HANDSHAKE" | grep -q "accepted.*true"; then
  echo -e "\n2. Processing execution..."
  PROCESS=$(curl -s -X POST "$GRAN_URL/api/process" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $WORKER_SECRET" \
    -H "X-Worker-ID: bitware-orchestrator-v2" \
    -d "{\"executionId\": \"$EXEC_ID\"}")
  
  echo "Process response (first 500 chars): ${PROCESS:0:500}..."
  
  JOB_ID=$(echo $PROCESS | grep -o '"jobId":[0-9]*' | sed 's/"jobId"://')
  if [ ! -z "$JOB_ID" ]; then
    echo -e "\n3. Job created with ID: $JOB_ID"
    
    echo "Waiting 15 seconds for processing..."
    sleep 15
    
    echo -e "\n4. Getting job status..."
    STATUS=$(curl -s -X GET "$GRAN_URL/api/jobs/$JOB_ID/status" \
      -H "Authorization: Bearer $WORKER_SECRET" \
      -H "X-Worker-ID: bitware-orchestrator-v2")
    
    echo "Status: $STATUS"
    
    if echo "$STATUS" | grep -q '"status":"completed"'; then
      echo -e "\n5. Getting structure..."
      STRUCTURE=$(curl -s -X GET "$GRAN_URL/api/jobs/$JOB_ID/structure" \
        -H "Authorization: Bearer $WORKER_SECRET" \
        -H "X-Worker-ID: bitware-orchestrator-v2")
      
      echo "Structure (first 500 chars): ${STRUCTURE:0:500}..."
    fi
  fi
fi

echo -e "\nTest completed at $(date)"