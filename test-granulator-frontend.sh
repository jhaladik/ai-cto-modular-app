#!/bin/bash

# Test the Granulator Frontend Integration
echo "🧱 Testing Content Granulator Frontend Integration"
echo "=================================================="
echo ""

BASE_URL="https://bitware-content-granulator.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"
WORKER_ID="test-worker"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Get project 3 details
echo -e "${BLUE}1. Fetching Project 3 Details${NC}"
echo "----------------------------------------"
PROJECT_DATA=$(curl -s "$BASE_URL/api/projects/3" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: $WORKER_ID")

# Extract basic project info
echo "$PROJECT_DATA" | jq '{
  id: .project.id,
  name: .project.project_name,
  type: .project.content_type,
  currentStage: .project.current_stage,
  status: .project.status,
  stagesCompleted: .project.statistics.completed_stages
}'
echo ""

# 2. Check Stage 1 data structure
echo -e "${BLUE}2. Stage 1 (Big Picture) Data Structure${NC}"
echo "----------------------------------------"
STAGE_1_DATA=$(echo "$PROJECT_DATA" | jq -r '.project.stages[0].output_data')

# Parse the nested JSON
if [ ! -z "$STAGE_1_DATA" ] && [ "$STAGE_1_DATA" != "null" ]; then
  # Extract content field
  CONTENT=$(echo "$STAGE_1_DATA" | jq -r '.content // empty')
  
  if [ ! -z "$CONTENT" ]; then
    # Remove markdown code blocks and parse
    CLEANED_JSON=$(echo "$CONTENT" | sed 's/```json//g' | sed 's/```//g')
    
    # Extract BIG_PICTURE data
    echo "$CLEANED_JSON" | jq '.BIG_PICTURE | {
      coreConcept: {
        premise: .CORE_CONCEPT.central_premise,
        genre: .CORE_CONCEPT.genre
      },
      thematicFramework: {
        primaryTheme: .THEMATIC_FRAMEWORK.primary_theme,
        secondaryThemes: .THEMATIC_FRAMEWORK.secondary_themes
      },
      worldVision: {
        setting: .WORLD_VISION.setting_overview,
        atmosphere: .WORLD_VISION.atmosphere_and_tone
      }
    }' 2>/dev/null || echo "Failed to parse BIG_PICTURE data"
  else
    echo "No content field found in stage data"
  fi
else
  echo "No Stage 1 data found"
fi
echo ""

# 3. List all projects
echo -e "${BLUE}3. List All Projects${NC}"
echo "----------------------------------------"
curl -s "$BASE_URL/api/projects" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: $WORKER_ID" | jq '{
    total: .total,
    projects: [.projects[] | {
      id: .id,
      name: .project_name,
      type: .content_type,
      status: .status,
      currentStage: .current_stage
    }]
  }'
echo ""

echo -e "${GREEN}✅ Test Complete!${NC}"
echo ""
echo "The frontend should now:"
echo "1. Display the project list correctly"
echo "2. Show project details when clicked"
echo "3. Render the Big Picture data with all sections"
echo ""
echo "Access the frontend at:"
echo "https://ai-factory-frontend.pages.dev"
echo "(Login as admin to see the Content Granulation page)"