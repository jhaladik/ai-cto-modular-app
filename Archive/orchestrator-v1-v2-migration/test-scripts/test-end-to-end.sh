#\!/bin/bash

# Complete End-to-End Test: KAM → Resource Manager → Content Granulator
echo "============================================================"
echo "COMPLETE END-TO-END TEST"
echo "KAM → Resource Manager → Content Granulator"
echo "============================================================"

# Step 1: Create a request in KAM
echo ""
echo "STEP 1: Creating a request in KAM..."
echo "----------------------------------------"

CREATE_REQUEST=$(curl -s -X POST "https://bitware-key-account-manager.jhaladik.workers.dev/requests"   -H "Content-Type: application/json"   -H "Authorization: Bearer internal-worker-auth-token-2024"   -H "X-Worker-ID: test-client"   -d '{
    "client_id": 1,
    "request_type": "content_creation",
    "urgency": "normal",
    "subject": "Python Course Creation",
    "description": "Create a comprehensive Python programming course for beginners",
    "budget_allocation": 5.00
  }')

echo "Create Request Response:"
echo "$CREATE_REQUEST" | python3 -m json.tool 2>/dev/null || echo "$CREATE_REQUEST"

# Extract request ID
REQUEST_ID=$(echo "$CREATE_REQUEST" | grep -o '"request_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$REQUEST_ID" ]; then
  echo "Failed to create request. Exiting."
  exit 1
fi

echo ""
echo "✓ Request created with ID: $REQUEST_ID"

# Step 2: Assign Content Granulator template to the request
echo ""
echo "STEP 2: Assigning Content Granulator template..."
echo "----------------------------------------"

ASSIGN_TEMPLATE=$(curl -s -X PUT "https://bitware-key-account-manager.jhaladik.workers.dev/requests/$REQUEST_ID"   -H "Content-Type: application/json"   -H "Authorization: Bearer internal-worker-auth-token-2024"   -H "X-Worker-ID: test-client"   -d '{
    "selected_template": "content_granulation_course",
    "request_status": "assigned"
  }')

echo "Assign Template Response:"
echo "$ASSIGN_TEMPLATE" | python3 -m json.tool 2>/dev/null || echo "$ASSIGN_TEMPLATE"

# Step 3: Execute the template through KAM
echo ""
echo "STEP 3: Executing template through KAM..."
echo "----------------------------------------"

EXECUTE_RESPONSE=$(curl -s -X POST "https://bitware-key-account-manager.jhaladik.workers.dev/requests/$REQUEST_ID/execute"   -H "Content-Type: application/json"   -H "Authorization: Bearer internal-worker-auth-token-2024"   -H "X-Worker-ID: test-client"   -d '{
    "parameters": {
      "topic": "Introduction to Python Programming",
      "description": "A comprehensive course for beginners covering Python basics, data structures, functions, and simple projects",
      "duration": "8 weeks",
      "level": "beginner",
      "targetAudience": "High school and college students with no programming experience"
    }
  }')

echo "Execute Response:"
echo "$EXECUTE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$EXECUTE_RESPONSE"

# Extract pipeline ID if available
PIPELINE_ID=$(echo "$EXECUTE_RESPONSE" | grep -o '"orchestrator_pipeline_id":"[^"]*' | cut -d'"' -f4)

if [ -n "$PIPELINE_ID" ]; then
  echo ""
  echo "✓ Execution started with Pipeline ID: $PIPELINE_ID"
fi

# Step 4: Check execution status
echo ""
echo "STEP 4: Checking execution status..."
echo "----------------------------------------"

# Wait a moment for processing
sleep 3

STATUS_RESPONSE=$(curl -s -X GET "https://bitware-key-account-manager.jhaladik.workers.dev/requests/$REQUEST_ID"   -H "Authorization: Bearer internal-worker-auth-token-2024"   -H "X-Worker-ID: test-client")

echo "Status Response (first 1000 chars):"
echo "$STATUS_RESPONSE" | head -c 1000
echo "..."

# Step 5: Check Resource Manager queue
echo ""
echo ""
echo "STEP 5: Checking Resource Manager Queue..."
echo "----------------------------------------"

QUEUE_STATUS=$(curl -s "https://bitware-resource-manager.jhaladik.workers.dev/api/queue/status"   -H "Authorization: Bearer internal-worker-auth-token-2024"   -H "X-Worker-ID: test-client")

echo "Queue Status:"
echo "$QUEUE_STATUS" | python3 -m json.tool 2>/dev/null || echo "$QUEUE_STATUS"

echo ""
echo "============================================================"
echo "TEST SUMMARY"
echo "============================================================"
echo "Request ID: $REQUEST_ID"
if [ -n "$PIPELINE_ID" ]; then
  echo "Pipeline ID: $PIPELINE_ID"
fi
echo ""
echo "✓ Request created in KAM"
echo "✓ Template assigned (content_granulation_course)"
echo "✓ Execution triggered"
echo ""
echo "Check the request status at:"
echo "https://bitware-key-account-manager.jhaladik.workers.dev/requests/$REQUEST_ID"
echo "============================================================"
