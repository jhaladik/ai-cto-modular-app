#\!/bin/bash

echo "============================================================"
echo "TESTING COMPLETE FLOW: KAM → Resource Manager → Granulator"
echo "============================================================"

REQUEST_ID="req_test_$(date +%s)"
CLIENT_ID="client_demo_001"

# Step 1: Create request using KAM API
echo ""
echo "Step 1: Creating request via KAM API..."
echo "----------------------------------------"

CREATE_RESPONSE=$(curl -s -X POST "https://bitware-key-account-manager.jhaladik.workers.dev/requests"   -H "Content-Type: application/json"   -H "Authorization: Bearer internal-worker-auth-token-2024"   -H "X-Worker-ID: test-client"   -d "{
    \"client_id\": \"$CLIENT_ID\",
    \"request_type\": \"content_creation\",
    \"message\": \"Create a comprehensive Python programming course for beginners\"
  }")

echo "Create Response:"
echo "$CREATE_RESPONSE"

# Extract request ID if creation succeeded
if echo "$CREATE_RESPONSE" | grep -q "request_id"; then
  REQUEST_ID=$(echo "$CREATE_RESPONSE" | grep -o '"request_id":"[^"]*' | cut -d'"' -f4)
  echo "✓ Request created with ID: $REQUEST_ID"
else
  # If API fails, create directly in DB
  echo "API failed, creating directly in database..."
  
  cd workers/bitware_key_account_manager
  wrangler d1 execute key-account-management-db --remote --command="
  INSERT INTO client_requests (
    request_id, 
    client_id, 
    request_type, 
    original_message, 
    processed_request,
    request_status,
    urgency_override,
    created_at
  ) VALUES (
    '$REQUEST_ID',
    '$CLIENT_ID',
    'content_creation',
    'Create a Python programming course',
    'Create a comprehensive Python programming course for beginners',
    'pending',
    'normal',
    datetime('now')
  )"
  
  echo "✓ Request created in DB with ID: $REQUEST_ID"
fi

# Step 2: Assign template
echo ""
echo "Step 2: Assigning Content Granulator template..."
echo "----------------------------------------"

ASSIGN_RESPONSE=$(curl -s -X PUT "https://bitware-key-account-manager.jhaladik.workers.dev/requests/$REQUEST_ID"   -H "Content-Type: application/json"   -H "Authorization: Bearer internal-worker-auth-token-2024"   -H "X-Worker-ID: test-client"   -d '{
    "selected_template": "content_granulation_course",
    "request_status": "assigned"
  }')

echo "Assign Response:"
echo "$ASSIGN_RESPONSE"

# Step 3: Execute the template
echo ""
echo "Step 3: Executing template through KAM..."
echo "----------------------------------------"

EXECUTE_RESPONSE=$(curl -s -X POST "https://bitware-key-account-manager.jhaladik.workers.dev/requests/$REQUEST_ID/execute"   -H "Content-Type: application/json"   -H "Authorization: Bearer internal-worker-auth-token-2024"   -H "X-Worker-ID: test-client"   -d '{
    "parameters": {
      "topic": "Introduction to Python Programming",
      "description": "A comprehensive course covering Python basics, data structures, functions, OOP, and practical projects",
      "targetAudience": "Complete beginners with no prior programming experience",
      "duration": "8 weeks",
      "level": "beginner"
    }
  }')

echo "Execute Response:"
echo "$EXECUTE_RESPONSE"

# Step 4: Check Resource Manager Queue
echo ""
echo "Step 4: Checking Resource Manager Queue..."
echo "----------------------------------------"

QUEUE_STATUS=$(curl -s "https://bitware-resource-manager.jhaladik.workers.dev/api/queue/status"   -H "Authorization: Bearer internal-worker-auth-token-2024"   -H "X-Worker-ID: test-client")

echo "Queue Status:"
echo "$QUEUE_STATUS"

# Step 5: Check request status
echo ""
echo "Step 5: Checking final request status..."
echo "----------------------------------------"

sleep 3

STATUS=$(curl -s "https://bitware-key-account-manager.jhaladik.workers.dev/requests/$REQUEST_ID"   -H "Authorization: Bearer internal-worker-auth-token-2024"   -H "X-Worker-ID: test-client")

echo "Request Status (first 1000 chars):"
echo "$STATUS" | head -c 1000
echo ""

echo ""
echo "============================================================"
echo "TEST SUMMARY"
echo "============================================================"
echo "Request ID: $REQUEST_ID"
echo "Client ID: $CLIENT_ID"
echo "Template: content_granulation_course"
echo ""
echo "Flow: KAM → Resource Manager → Content Granulator"
echo "============================================================"
