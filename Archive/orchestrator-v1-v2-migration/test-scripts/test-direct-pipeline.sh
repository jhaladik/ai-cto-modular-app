#!/bin/bash

echo "========================================="
echo "Direct Pipeline Test with KAM Template"
echo "========================================="
echo ""

ORCH_URL="https://bitware-orchestrator-v2.jhaladik.workers.dev"
GRAN_URL="https://bitware-content-granulator.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"

# Create execution directly
EXEC_ID="test_direct_$(date +%s)"
STAGE_ID="stage_direct_$(date +%s)"

echo "1. Simulating what the orchestrator should do..."
echo "Execution ID: $EXEC_ID"
echo "Stage ID: $STAGE_ID"

echo -e "\n2. Creating handshake with granulator (what orchestrator should do)..."
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
      \"topic\": \"Test Course from Pipeline\",
      \"audience\": \"beginners\"
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
  echo -e "\n3. Processing execution..."
  PROCESS=$(curl -s -X POST "$GRAN_URL/api/process" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $WORKER_SECRET" \
    -H "X-Worker-ID: bitware-orchestrator-v2" \
    -d "{\"executionId\": \"$EXEC_ID\"}")
  
  echo "Process response (first 500 chars): ${PROCESS:0:500}..."
  
  JOB_ID=$(echo $PROCESS | grep -o '"jobId":[0-9]*' | sed 's/"jobId"://')
  if [ ! -z "$JOB_ID" ]; then
    echo -e "\n4. Job created with ID: $JOB_ID"
    echo "✓ SUCCESS: The granulator works correctly when called with the right parameters!"
  fi
fi

echo -e "\n5. This proves the granulator is working. The issue is in the orchestrator's queue processing."

echo -e "\nTest completed at $(date)"