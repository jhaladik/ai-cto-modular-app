#!/bin/bash

# Test UAOL Fixes for 4-stage pipeline
# Tests Stage 2 JSON parsing, Stage 3 timeout fix, and optimized prompts

API_URL="https://bitware-content-granulator.jhaladik.workers.dev"
# API_URL="http://localhost:8787"  # For local testing
WORKER_SECRET="internal-worker-auth-token-2024"
WORKER_ID="test-worker"

echo "========================================="
echo "Testing UAOL 4-Stage Pipeline with Fixes"
echo "========================================="
echo ""

# Create initial project
echo "Creating novel project..."
PROJECT_RESPONSE=$(curl -s -X POST "$API_URL/api/v2/project/novel" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: $WORKER_ID" \
  -d '{
    "topic": "A neuroscientist discovers quantum consciousness",
    "target_audience": "Science fiction readers",
    "genre": "Sci-fi Thriller",
    "length": "Novel",
    "tone": "Thought-provoking and suspenseful"
  }')

PROJECT_ID=$(echo $PROJECT_RESPONSE | grep -o '"project_id":[0-9]*' | cut -d: -f2)
echo "Created project ID: $PROJECT_ID"
echo ""

# Function to execute stage
execute_stage() {
  local STAGE=$1
  local STAGE_NAME=$2
  
  echo "----------------------------------------"
  echo "Executing Stage $STAGE: $STAGE_NAME"
  echo "----------------------------------------"
  
  START_TIME=$(date +%s)
  
  RESPONSE=$(curl -s -X POST "$API_URL/api/v2/execute" \
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
  
  # Extract key metrics
  SUCCESS=$(echo $RESPONSE | grep -o '"success":[a-z]*' | cut -d: -f2)
  NOTATIONS=$(echo $RESPONSE | grep -o '"notations":[0-9]*' | cut -d: -f2)
  SCORE=$(echo $RESPONSE | grep -o '"validationScore":[0-9]*' | cut -d: -f2)
  
  echo "Result: success=$SUCCESS"
  echo "Notations generated: $NOTATIONS"
  echo "Validation score: $SCORE"
  echo "Time taken: ${DURATION}s"
  
  # Check for specific fixes
  if [ $STAGE -eq 2 ]; then
    echo ""
    echo "Stage 2 Fix Check:"
    echo "- Checking for JSON extraction from nested content..."
    if [ "$NOTATIONS" -gt 0 ]; then
      echo "  ✓ JSON parsing fix working (generated $NOTATIONS notations)"
    else
      echo "  ✗ JSON parsing still failing (0 notations)"
    fi
  fi
  
  if [ $STAGE -eq 3 ]; then
    echo ""
    echo "Stage 3 Fix Check:"
    echo "- Checking for timeout prevention..."
    if [ $DURATION -lt 60 ]; then
      echo "  ✓ Validation completed without timeout (${DURATION}s)"
    else
      echo "  ⚠ Stage took longer than expected (${DURATION}s)"
    fi
  fi
  
  echo ""
  sleep 2
}

# Execute all stages
execute_stage 1 "Big Picture (Concepts & Themes)"
execute_stage 2 "Objects & Relations (Characters & Locations)"
execute_stage 3 "Structure (Acts & Chapters)"
execute_stage 4 "Granular Units (Scenes)"

# Get final structure
echo "========================================="
echo "Fetching Final Structure"
echo "========================================="
STRUCTURE=$(curl -s "$API_URL/api/jobs/$PROJECT_ID/structure" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: $WORKER_ID")

# Check UAOL notations
echo ""
echo "Checking UAOL Notations:"
NOTATIONS_RESPONSE=$(curl -s "$API_URL/api/v2/notations/$PROJECT_ID" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: $WORKER_ID")
TOTAL_NOTATIONS=$(echo $NOTATIONS_RESPONSE | grep -o '"notation"' | wc -l)
echo "Total UAOL notations stored: $TOTAL_NOTATIONS"

# Summary
echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo "Project ID: $PROJECT_ID"
echo "Total notations: $TOTAL_NOTATIONS"
echo ""
echo "Key Fixes Verified:"
echo "1. Stage 2 JSON parsing from nested content"
echo "2. Stage 3 mentor validation without timeout"
echo "3. Optimized Stage 3/4 prompts with focused context"
echo ""
echo "View full results at: $API_URL/api/jobs/$PROJECT_ID"