#!/bin/bash

# Test UAOL with correct endpoints
echo "========================================="
echo "Testing UAOL 4-Stage Pipeline"
echo "========================================="
echo ""

API_URL="https://bitware-content-granulator.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"
WORKER_ID="test-worker"

# First, create a project using the multi-stage handler
echo "1. Creating project via /api/v2/projects/create..."
PROJECT_RESPONSE=$(curl -s -X POST "$API_URL/api/v2/projects/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: $WORKER_ID" \
  -d '{
    "content_type": "novel",
    "project_name": "Quantum Consciousness Novel",
    "topic": "A neuroscientist discovers quantum consciousness",
    "target_audience": "Science fiction readers",
    "genre": "Sci-fi Thriller",
    "length": "Novel",
    "tone": "Thought-provoking"
  }')

echo "Response: $PROJECT_RESPONSE"

# Extract project ID from nested response
PROJECT_ID=$(echo $PROJECT_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)

if [ -z "$PROJECT_ID" ]; then
  echo "Failed to create project. Response:"
  echo "$PROJECT_RESPONSE"
  exit 1
fi

echo "Created project ID: $PROJECT_ID"
echo ""

# Function to execute a stage
execute_stage() {
  local STAGE=$1
  local STAGE_NAME=$2
  
  echo "----------------------------------------"
  echo "Stage $STAGE: $STAGE_NAME"
  echo "----------------------------------------"
  
  START_TIME=$(date +%s)
  
  RESPONSE=$(curl -s -X POST "$API_URL/api/v2/stages/execute" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $WORKER_SECRET" \
    -H "X-Worker-ID: $WORKER_ID" \
    -d "{
      \"project_id\": $PROJECT_ID,
      \"stage_number\": $STAGE,
      \"ai_config\": {
        \"provider\": \"openai\",
        \"model\": \"gpt-3.5-turbo\",
        \"temperature\": 0.7,
        \"maxTokens\": 3000
      }
    }")
  
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  
  # Parse response
  SUCCESS=$(echo $RESPONSE | grep -o '"success":[a-z]*' | cut -d: -f2)
  NOTATIONS=$(echo $RESPONSE | grep -o '"notations":[0-9]*' | cut -d: -f2)
  SCORE=$(echo $RESPONSE | grep -o '"validationScore":[0-9]*' | cut -d: -f2)
  ERROR=$(echo $RESPONSE | grep -o '"error":"[^"]*"' | cut -d: -f2)
  
  echo "Success: $SUCCESS"
  if [ ! -z "$NOTATIONS" ]; then
    echo "UAOL Notations: $NOTATIONS"
  fi
  if [ ! -z "$SCORE" ]; then
    echo "Validation Score: $SCORE"
  fi
  if [ ! -z "$ERROR" ]; then
    echo "Error: $ERROR"
  fi
  echo "Duration: ${DURATION}s"
  
  # Stage-specific checks
  if [ $STAGE -eq 2 ] && [ ! -z "$NOTATIONS" ]; then
    if [ "$NOTATIONS" -gt 0 ]; then
      echo "✅ Stage 2 JSON parsing fix working!"
    else
      echo "⚠️  Stage 2 generated 0 notations"
    fi
  fi
  
  if [ $STAGE -eq 3 ]; then
    if [ $DURATION -lt 60 ]; then
      echo "✅ Stage 3 completed without timeout!"
    else
      echo "⚠️  Stage 3 took ${DURATION}s"
    fi
  fi
  
  echo ""
  sleep 1
}

# Execute all stages
execute_stage 1 "Big Picture"
execute_stage 2 "Objects & Relations"
execute_stage 3 "Structure"
execute_stage 4 "Granular Units"

# Get project details
echo "========================================="
echo "Final Project Status"
echo "========================================="
PROJECT_DETAILS=$(curl -s "$API_URL/api/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: $WORKER_ID")

echo "$PROJECT_DETAILS" | grep -o '"current_stage":[0-9]*\|"status":"[^"]*"'
echo ""

echo "Test complete! Project ID: $PROJECT_ID"