#!/bin/bash

# Test Content Granulator for 10,000-word content generation
# This script creates a request in KAM and executes it with the Content Granulator

echo "========================================"
echo "Content Granulator 10K Words Test"
echo "========================================"
echo ""

# Variables
KAM_URL="https://bitware-key-account-manager.jhaladik.workers.dev"
GRANULATOR_URL="https://bitware-content-granulator.jhaladik.workers.dev"
WORKER_SHARED_SECRET="internal-worker-auth-token-2024"
ADMIN_WORKER_ID="bitware_admin_dashboard"

# Step 1: Check health of both services
echo "Step 1: Checking service health..."
echo "----------------------------------------"

echo -n "KAM Health: "
curl -s "${KAM_URL}/health" | python -m json.tool | grep status || echo "FAILED"

echo -n "Granulator Health: "
curl -s "${GRANULATOR_URL}/health" | python -m json.tool | grep status || echo "FAILED"

echo ""
echo "Step 2: Creating a request in KAM"
echo "----------------------------------------"

# Create request with worker authentication (KAM accepts worker auth)
REQUEST_RESPONSE=$(curl -s -X POST "${KAM_URL}/requests" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${WORKER_SHARED_SECRET}" \
  -H "X-Worker-ID: ${ADMIN_WORKER_ID}" \
  -d '{
    "client_id": 1,
    "request_type": "content_granulation",
    "message": "Create a Python Web Development course structure optimized for 10,000 words of content",
    "urgency_level": "high"
  }')

echo "Request creation response:"
echo "$REQUEST_RESPONSE" | python -m json.tool

# Extract request ID
REQUEST_ID=$(echo "$REQUEST_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('request_id', ''))" 2>/dev/null)

if [ -z "$REQUEST_ID" ]; then
    echo "❌ Failed to create request. Response:"
    echo "$REQUEST_RESPONSE"
    exit 1
fi

echo ""
echo "✅ Request created with ID: $REQUEST_ID"
echo ""

# Step 3: Assign template to the request
echo "Step 3: Assigning content_granulation_course template"
echo "----------------------------------------"

UPDATE_RESPONSE=$(curl -s -X PUT "${KAM_URL}/requests/${REQUEST_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${WORKER_SHARED_SECRET}" \
  -H "X-Worker-ID: ${ADMIN_WORKER_ID}" \
  -d '{
    "selected_template": "content_granulation_course",
    "template_confidence_score": 95
  }')

echo "Template assignment response:"
echo "$UPDATE_RESPONSE" | python -m json.tool

echo ""
echo "Step 4: Executing the request with parameters"
echo "----------------------------------------"

# Execute with parameters optimized for 10K words
EXECUTE_RESPONSE=$(curl -s -X POST "${KAM_URL}/requests/${REQUEST_ID}/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${WORKER_SHARED_SECRET}" \
  -H "X-Worker-ID: ${ADMIN_WORKER_ID}" \
  -d '{
    "parameters": {
      "topic": "Python Web Development with Flask - Complete Guide",
      "structureType": "course",
      "templateName": "educational_course_basic",
      "granularityLevel": 2,
      "targetAudience": "Junior developers transitioning to web development",
      "constraints": {
        "maxElements": 12,
        "targetWordCount": 10000,
        "focusAreas": [
          "Flask fundamentals",
          "REST API development",
          "Database integration"
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
  }')

echo "Execution response:"
echo "$EXECUTE_RESPONSE" | python -m json.tool

# Extract execution ID
EXECUTION_ID=$(echo "$EXECUTE_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin).get('execution_id', ''))" 2>/dev/null)

if [ -z "$EXECUTION_ID" ]; then
    echo "❌ Failed to execute request"
    exit 1
fi

echo ""
echo "✅ Request queued for execution"
echo "   Execution ID: $EXECUTION_ID"
echo "   Request ID: $REQUEST_ID"
echo ""

# Step 5: Check request status
echo "Step 5: Checking request status (after 5 seconds)"
echo "----------------------------------------"
sleep 5

STATUS_RESPONSE=$(curl -s -X GET "${KAM_URL}/requests/${REQUEST_ID}" \
  -H "Authorization: Bearer internal-worker-auth-token-2024" \
  -H "X-Worker-ID: test-worker")

echo "Request status:"
echo "$STATUS_RESPONSE" | python -m json.tool | head -20

# Step 6: Show expected output structure
echo ""
echo "========================================"
echo "Expected Content Structure (10K Words)"
echo "========================================"
echo ""
echo "📚 Course: Python Web Development with Flask"
echo "   Duration: 6 weeks"
echo "   Total Words: ~10,000"
echo ""
echo "📂 Module 1: Flask Fundamentals (3,300 words)"
echo "   📄 Lesson 1.1: Setting Up Flask Environment (1,000 words)"
echo "   📄 Lesson 1.2: Creating Your First Flask App (1,000 words)"
echo "   📄 Lesson 1.3: Routing and Request Handling (1,000 words)"
echo "   📝 Assessment: Flask Basics Quiz (300 words)"
echo ""
echo "📂 Module 2: Building REST APIs (3,300 words)"
echo "   📄 Lesson 2.1: RESTful Design Principles (1,000 words)"
echo "   📄 Lesson 2.2: Creating API Endpoints (1,000 words)"
echo "   📄 Lesson 2.3: Request/Response Handling (1,000 words)"
echo "   📝 Assessment: API Development Quiz (300 words)"
echo ""
echo "📂 Module 3: Database Integration (3,400 words)"
echo "   📄 Lesson 3.1: SQLAlchemy Setup (1,000 words)"
echo "   📄 Lesson 3.2: Models and Migrations (1,000 words)"
echo "   📄 Lesson 3.3: CRUD Operations (1,000 words)"
echo "   📝 Assessment: Database Quiz (400 words)"
echo ""
echo "📊 Word Count Breakdown:"
echo "   - Module Introductions: 1,200 words"
echo "   - Lesson Content: 7,200 words"
echo "   - Examples: 1,800 words"
echo "   - Exercises: 900 words"
echo "   - Assessments: 900 words"
echo "   - Module Summaries: 750 words"
echo "   --------------------------------"
echo "   Total: ~10,750 words"
echo ""
echo "🎯 Content Metadata:"
echo "   - Primary Tone: educational_engaging"
echo "   - Quality Targets: Readability 8.5, Coherence 0.9"
echo "   - Generation Time: ~100s sequential, ~25s parallel"
echo ""
echo "========================================"
echo "✅ Test Complete!"
echo "========================================"
echo ""
echo "📝 Notes:"
echo "1. The request has been queued in KAM's execution queue"
echo "2. KAM will call Content Granulator via service binding"
echo "3. Content Granulator will generate the structure"
echo "4. Word count estimates will be included in the output"
echo "5. Check 'wrangler tail' on both workers to see processing"
echo ""
echo "To monitor processing:"
echo "  wrangler tail --name bitware-key-account-manager"
echo "  wrangler tail --name bitware-content-granulator"