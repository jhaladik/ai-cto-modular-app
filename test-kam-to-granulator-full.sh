#!/bin/bash

# Complete test for KAM to Content Granulator flow
# Using master templates and proper request execution

echo "============================================"
echo "KAM to Content Granulator Integration Test"
echo "============================================"
echo ""

# Variables
KAM_URL="https://bitware-key-account-manager.jhaladik.workers.dev"
GRANULATOR_URL="https://bitware-content-granulator.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"
WORKER_ID="bitware_admin_dashboard"
CLIENT_ID="client_demo_001"  # Using existing TechCorp Solutions client

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Verifying Services${NC}"
echo "----------------------------------------"

# Check KAM health
echo -n "KAM Service: "
KAM_HEALTH=$(curl -s "${KAM_URL}/health" | python -c "import sys, json; print(json.load(sys.stdin)['status'])" 2>/dev/null)
if [ "$KAM_HEALTH" = "healthy" ]; then
    echo -e "${GREEN}✓ Healthy${NC}"
else
    echo -e "${RED}✗ Unhealthy${NC}"
    exit 1
fi

# Check Granulator health
echo -n "Granulator Service: "
GRAN_HEALTH=$(curl -s "${GRANULATOR_URL}/health" | python -c "import sys, json; print(json.load(sys.stdin)['status'])" 2>/dev/null)
if [ "$GRAN_HEALTH" = "healthy" ]; then
    echo -e "${GREEN}✓ Healthy${NC}"
else
    echo -e "${RED}✗ Unhealthy${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 2: Creating Request in KAM${NC}"
echo "----------------------------------------"

# Create the request
REQUEST_PAYLOAD='{
  "client_id": "'${CLIENT_ID}'",
  "request_type": "content_granulation",
  "message": "Create a comprehensive Python Web Development course optimized for 10,000 words of content generation. Focus on Flask framework, REST APIs, and database integration.",
  "urgency_level": "high"
}'

echo "Creating request for client: ${CLIENT_ID} (TechCorp Solutions)"
echo ""

REQUEST_RESPONSE=$(curl -s -X POST "${KAM_URL}/requests" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${WORKER_SECRET}" \
  -H "X-Worker-ID: ${WORKER_ID}" \
  -d "${REQUEST_PAYLOAD}")

# Check if request was created
REQUEST_ID=$(echo "$REQUEST_RESPONSE" | python -c "import sys, json; data=json.load(sys.stdin); print(data.get('request_id', '') if data.get('success') else '')" 2>/dev/null)

if [ -z "$REQUEST_ID" ]; then
    echo -e "${RED}✗ Failed to create request${NC}"
    echo "Response: $REQUEST_RESPONSE"
    exit 1
else
    echo -e "${GREEN}✓ Request created successfully${NC}"
    echo "Request ID: ${REQUEST_ID}"
fi

echo ""
echo -e "${BLUE}Step 3: Assigning Template${NC}"
echo "----------------------------------------"

# Update request with template selection
TEMPLATE_NAME="content_granulation_course"
echo "Assigning template: ${TEMPLATE_NAME}"

UPDATE_PAYLOAD='{
  "selected_template": "'${TEMPLATE_NAME}'",
  "template_confidence_score": 95
}'

UPDATE_RESPONSE=$(curl -s -X PUT "${KAM_URL}/requests/${REQUEST_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${WORKER_SECRET}" \
  -H "X-Worker-ID: ${WORKER_ID}" \
  -d "${UPDATE_PAYLOAD}")

UPDATE_SUCCESS=$(echo "$UPDATE_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null)

if [ "$UPDATE_SUCCESS" = "True" ]; then
    echo -e "${GREEN}✓ Template assigned successfully${NC}"
else
    echo -e "${RED}✗ Failed to assign template${NC}"
    echo "Response: $UPDATE_RESPONSE"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 4: Executing Request${NC}"
echo "----------------------------------------"

# Execute the request with granulation parameters
EXECUTE_PAYLOAD='{
  "parameters": {
    "topic": "Python Web Development with Flask - Comprehensive Guide",
    "structureType": "course",
    "templateName": "educational_course_basic",
    "granularityLevel": 2,
    "targetAudience": "Junior developers transitioning to web development",
    "constraints": {
      "maxElements": 12,
      "targetWordCount": 10000,
      "focusAreas": [
        "Flask fundamentals and setup",
        "Building REST APIs with Flask",
        "Database integration with SQLAlchemy"
      ]
    },
    "options": {
      "includeExamples": true,
      "includePracticalExercises": true,
      "detailLevel": "intermediate",
      "contentDensity": "balanced"
    },
    "validation": {
      "enabled": false
    }
  }
}'

echo "Executing with content granulation parameters..."
echo ""

EXECUTE_RESPONSE=$(curl -s -X POST "${KAM_URL}/requests/${REQUEST_ID}/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${WORKER_SECRET}" \
  -H "X-Worker-ID: ${WORKER_ID}" \
  -d "${EXECUTE_PAYLOAD}")

EXECUTION_ID=$(echo "$EXECUTE_RESPONSE" | python -c "import sys, json; data=json.load(sys.stdin); print(data.get('execution_id', '') if data.get('success') else '')" 2>/dev/null)

if [ -z "$EXECUTION_ID" ]; then
    echo -e "${RED}✗ Failed to execute request${NC}"
    echo "Response: $EXECUTE_RESPONSE"
    exit 1
else
    echo -e "${GREEN}✓ Request queued for execution${NC}"
    echo "Execution ID: ${EXECUTION_ID}"
fi

echo ""
echo -e "${BLUE}Step 5: Checking Status${NC}"
echo "----------------------------------------"

# Wait a moment for processing
echo "Waiting 5 seconds for processing..."
sleep 5

# Check request status
STATUS_RESPONSE=$(curl -s -X GET "${KAM_URL}/requests/${REQUEST_ID}" \
  -H "Authorization: Bearer ${WORKER_SECRET}" \
  -H "X-Worker-ID: ${WORKER_ID}")

REQUEST_STATUS=$(echo "$STATUS_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('request_status', 'unknown'))" 2>/dev/null)
TEMPLATE_USED=$(echo "$STATUS_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('selected_template', 'none'))" 2>/dev/null)

echo "Request Status: ${REQUEST_STATUS}"
echo "Template Used: ${TEMPLATE_USED}"

# Check for worker sessions
WORKER_SESSIONS=$(echo "$STATUS_RESPONSE" | python -c "
import sys, json
data = json.load(sys.stdin)
sessions = data.get('worker_sessions', [])
if sessions:
    for s in sessions:
        print(f\"  - {s.get('worker_name', 'unknown')}: {s.get('status', 'unknown')}\")
else:
    print('  No worker sessions found')
" 2>/dev/null)

echo "Worker Sessions:"
echo "$WORKER_SESSIONS"

echo ""
echo -e "${BLUE}Step 6: Expected Output${NC}"
echo "============================================"
echo ""
echo "📚 Expected Course Structure (10K Words):"
echo "----------------------------------------"
echo "• 3 Modules (Flask, APIs, Database)"
echo "• 3 Lessons per module (9 total)"
echo "• ~1,000 words per lesson"
echo ""
echo "📊 Word Distribution:"
echo "• Module Intros: 1,200 words"
echo "• Lesson Content: 7,200 words"
echo "• Examples: 1,800 words"
echo "• Exercises: 900 words"
echo "• Assessments: 900 words"
echo ""
echo "🎯 Content Metadata:"
echo "• Tone: educational_engaging"
echo "• Quality: Readability 8.5, Coherence 0.9"
echo "• Format: Markdown with metadata"
echo ""

# Final status
echo "============================================"
if [ "$REQUEST_STATUS" = "queued" ] || [ "$REQUEST_STATUS" = "processing" ] || [ "$REQUEST_STATUS" = "completed" ]; then
    echo -e "${GREEN}✅ Integration Test Successful!${NC}"
    echo ""
    echo "The request has been created and queued for processing."
    echo "KAM will process the queue and call Content Granulator."
    echo ""
    echo "To monitor processing in real-time:"
    echo "  wrangler tail --name bitware-key-account-manager"
    echo "  wrangler tail --name bitware-content-granulator"
else
    echo -e "${RED}❌ Test may have issues${NC}"
    echo "Status: ${REQUEST_STATUS}"
fi

echo ""
echo "Request Details:"
echo "• Request ID: ${REQUEST_ID}"
echo "• Execution ID: ${EXECUTION_ID}"
echo "• Client: ${CLIENT_ID} (TechCorp Solutions)"
echo "• Template: ${TEMPLATE_NAME}"
echo ""