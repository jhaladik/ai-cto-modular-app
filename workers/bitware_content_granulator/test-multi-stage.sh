#!/bin/bash

# Test Multi-Stage Content Generation System
# Tests the 4-stage progressive refinement process

BASE_URL="https://bitware-content-granulator.jhaladik.workers.dev"
AUTH_TOKEN="internal-worker-auth-token-2024"
WORKER_ID="test-worker"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🎯 Universal Multi-Stage Content Generation Test"
echo "================================================"
echo ""

# ==================== CREATE PROJECT ====================
echo -e "${BLUE}Step 1: Create a Novel Project${NC}"
echo "----------------------------------------"

PROJECT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/projects/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "X-Worker-ID: $WORKER_ID" \
  -d '{
    "project_name": "The Quantum Detective",
    "content_type": "novel",
    "topic": "A detective in future Tokyo investigates crimes involving quantum technology",
    "target_audience": "Adult sci-fi thriller readers",
    "genre": "Cyberpunk Mystery",
    "metadata": {
      "setting": "Tokyo 2087",
      "tone": "Dark and philosophical"
    }
  }')

echo "$PROJECT_RESPONSE" | jq '.'
PROJECT_ID=$(echo "$PROJECT_RESPONSE" | jq -r '.project.id')

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" == "null" ]; then
  echo -e "${RED}Failed to create project${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Project created with ID: $PROJECT_ID${NC}"
echo ""

# Wait a moment
sleep 2

# ==================== STAGE 1: BIG PICTURE ====================
echo -e "${BLUE}Stage 1: Generate Big Picture${NC}"
echo "----------------------------------------"
echo "Creating overall vision and framework..."

STAGE1_RESPONSE=$(curl -s -X POST "$BASE_URL/api/stages/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "X-Worker-ID: $WORKER_ID" \
  -d "{
    \"project_id\": $PROJECT_ID,
    \"stage_number\": 1,
    \"ai_config\": {
      \"provider\": \"openai\",
      \"model\": \"gpt-4o-mini\",
      \"temperature\": 0.8,
      \"maxTokens\": 4000
    }
  }")

echo "$STAGE1_RESPONSE" | jq '{
  success,
  stage_name: .stage.stage_name,
  tokens_used: .stage.tokens_used,
  next_stage: .stage.next_stage
}'

STAGE1_SUCCESS=$(echo "$STAGE1_RESPONSE" | jq -r '.success')
if [ "$STAGE1_SUCCESS" != "true" ]; then
  echo -e "${RED}Stage 1 failed${NC}"
  echo "$STAGE1_RESPONSE" | jq '.error'
  exit 1
fi

echo -e "${GREEN}✓ Stage 1 completed: Big Picture generated${NC}"
echo ""

# Wait before next stage
sleep 3

# ==================== STAGE 2: OBJECTS & RELATIONS ====================
echo -e "${BLUE}Stage 2: Generate Objects & Relations${NC}"
echo "----------------------------------------"
echo "Creating characters, locations, and timeline..."

STAGE2_RESPONSE=$(curl -s -X POST "$BASE_URL/api/stages/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "X-Worker-ID: $WORKER_ID" \
  -d "{
    \"project_id\": $PROJECT_ID,
    \"stage_number\": 2,
    \"ai_config\": {
      \"provider\": \"openai\",
      \"model\": \"gpt-4o-mini\",
      \"temperature\": 0.7,
      \"maxTokens\": 8000
    }
  }")

echo "$STAGE2_RESPONSE" | jq '{
  success,
  stage_name: .stage.stage_name,
  objects_created: (.stage.output.objects | length),
  timeline_events: (.stage.output.timeline | length)
}'

STAGE2_SUCCESS=$(echo "$STAGE2_RESPONSE" | jq -r '.success')
if [ "$STAGE2_SUCCESS" != "true" ]; then
  echo -e "${RED}Stage 2 failed${NC}"
  echo "$STAGE2_RESPONSE" | jq '.error'
  exit 1
fi

echo -e "${GREEN}✓ Stage 2 completed: Objects and timeline created${NC}"
echo ""

# Wait before next stage
sleep 3

# ==================== STAGE 3: STRUCTURE ====================
echo -e "${BLUE}Stage 3: Generate Structure${NC}"
echo "----------------------------------------"
echo "Creating acts and chapters with 200-word descriptions..."

STAGE3_RESPONSE=$(curl -s -X POST "$BASE_URL/api/stages/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "X-Worker-ID: $WORKER_ID" \
  -d "{
    \"project_id\": $PROJECT_ID,
    \"stage_number\": 3,
    \"ai_config\": {
      \"provider\": \"openai\",
      \"model\": \"gpt-4o-mini\",
      \"temperature\": 0.7,
      \"maxTokens\": 12000
    }
  }")

echo "$STAGE3_RESPONSE" | jq '{
  success,
  stage_name: .stage.stage_name,
  structural_units: (.stage.output.structure | length)
}'

STAGE3_SUCCESS=$(echo "$STAGE3_RESPONSE" | jq -r '.success')
if [ "$STAGE3_SUCCESS" != "true" ]; then
  echo -e "${RED}Stage 3 failed${NC}"
  echo "$STAGE3_RESPONSE" | jq '.error'
  exit 1
fi

echo -e "${GREEN}✓ Stage 3 completed: Chapter structure created${NC}"
echo ""

# Wait before next stage
sleep 3

# ==================== STAGE 4: GRANULAR UNITS ====================
echo -e "${BLUE}Stage 4: Generate Granular Units${NC}"
echo "----------------------------------------"
echo "Creating scenes with 200-word descriptions..."

STAGE4_RESPONSE=$(curl -s -X POST "$BASE_URL/api/stages/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "X-Worker-ID: $WORKER_ID" \
  -d "{
    \"project_id\": $PROJECT_ID,
    \"stage_number\": 4,
    \"ai_config\": {
      \"provider\": \"openai\",
      \"model\": \"gpt-4o-mini\",
      \"temperature\": 0.7,
      \"maxTokens\": 12000
    }
  }")

echo "$STAGE4_RESPONSE" | jq '{
  success,
  stage_name: .stage.stage_name,
  granular_units: (.stage.output.granular_units | length)
}'

STAGE4_SUCCESS=$(echo "$STAGE4_RESPONSE" | jq -r '.success')
if [ "$STAGE4_SUCCESS" != "true" ]; then
  echo -e "${RED}Stage 4 failed${NC}"
  echo "$STAGE4_RESPONSE" | jq '.error'
  exit 1
fi

echo -e "${GREEN}✓ Stage 4 completed: Scenes created${NC}"
echo ""

# ==================== GET PROJECT STATUS ====================
echo -e "${BLUE}Final Project Status${NC}"
echo "----------------------------------------"

STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "X-Worker-ID: $WORKER_ID")

echo "$STATUS_RESPONSE" | jq '{
  project_name: .project.project_name,
  content_type: .project.content_type,
  current_stage: .project.current_stage,
  status: .project.status,
  statistics: .project.statistics
}'

# ==================== SUMMARY ====================
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Multi-Stage Generation Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Project ID: $PROJECT_ID"
echo "Content Type: Novel"
echo "All 4 stages completed successfully:"
echo "  1. Big Picture ✓"
echo "  2. Objects & Relations ✓"
echo "  3. Structure (Chapters) ✓"
echo "  4. Granular Units (Scenes) ✓"
echo ""
echo "The content is now ready for the Content Generator"
echo "to create the actual narrative text."
echo ""

# ==================== TEST COURSE GENERATION ====================
echo -e "${YELLOW}Bonus: Testing Course Generation${NC}"
echo "----------------------------------------"

COURSE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/projects/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "X-Worker-ID: $WORKER_ID" \
  -d '{
    "project_name": "Quantum Computing Fundamentals",
    "content_type": "course",
    "topic": "Introduction to quantum computing for programmers",
    "target_audience": "Software developers with no quantum background",
    "metadata": {
      "level": "beginner",
      "duration": "8 weeks"
    }
  }')

COURSE_ID=$(echo "$COURSE_RESPONSE" | jq -r '.project.id')

if [ ! -z "$COURSE_ID" ] && [ "$COURSE_ID" != "null" ]; then
  echo -e "${GREEN}✓ Course project created with ID: $COURSE_ID${NC}"
  echo "You can run the same 4-stage process for course content"
fi

echo ""
echo "Test completed successfully!"