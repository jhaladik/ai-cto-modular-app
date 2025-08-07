#\!/bin/bash

echo "============================================================"
echo "TESTING COMPLETE FLOW: KAM → Resource Manager → Granulator"
echo "============================================================"

# Step 1: First, let's check what requests already exist
echo ""
echo "Step 1: Checking existing requests..."
echo "----------------------------------------"

EXISTING=$(curl -s "https://bitware-key-account-manager.jhaladik.workers.dev/requests?limit=1"   -H "Authorization: Bearer internal-worker-auth-token-2024"   -H "X-Worker-ID: test-client")

echo "Latest request (first 200 chars):"
echo "$EXISTING" | head -c 200
echo ""

# Step 2: Create a new request directly in database
echo ""
echo "Step 2: Creating request directly in database..."
echo "----------------------------------------"

REQUEST_ID="req_test_$(date +%s)"
echo "Creating request with ID: $REQUEST_ID"

# Use wrangler to insert directly
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
  1,
  'content_creation',
  'Create a Python programming course',
  'Create a comprehensive Python programming course for beginners',
  'pending',
  'normal',
  datetime('now')
)"

echo "✓ Request created with ID: $REQUEST_ID"

# Step 3: Update request to assign template
echo ""
echo "Step 3: Assigning Content Granulator template..."
echo "----------------------------------------"

ASSIGN_RESPONSE=$(curl -s -X PUT "https://bitware-key-account-manager.jhaladik.workers.dev/requests/$REQUEST_ID"   -H "Content-Type: application/json"   -H "Authorization: Bearer internal-worker-auth-token-2024"   -H "X-Worker-ID: test-client"   -d '{
    "selected_template": "content_granulation_course",
    "request_status": "assigned"
  }')

echo "Assign Response:"
echo "$ASSIGN_RESPONSE"

# Step 4: Execute the template
echo ""
echo "Step 4: Executing template through KAM..."
echo "----------------------------------------"

EXECUTE_RESPONSE=$(curl -s -X POST "https://bitware-key-account-manager.jhaladik.workers.dev/requests/$REQUEST_ID/execute"   -H "Content-Type: application/json"   -H "Authorization: Bearer internal-worker-auth-token-2024"   -H "X-Worker-ID: test-client"   -d '{
    "parameters": {
      "topic": "Introduction to Python Programming",
      "description": "A comprehensive course for beginners",
      "targetAudience": "Beginners with no programming experience"
    }
  }')

echo "Execute Response:"
echo "$EXECUTE_RESPONSE"

# Step 5: Check status
echo ""
echo "Step 5: Checking request status..."
echo "----------------------------------------"

sleep 2

STATUS=$(curl -s "https://bitware-key-account-manager.jhaladik.workers.dev/requests/$REQUEST_ID"   -H "Authorization: Bearer internal-worker-auth-token-2024"   -H "X-Worker-ID: test-client")

echo "Request Status (first 500 chars):"
echo "$STATUS" | head -c 500
echo ""

echo ""
echo "============================================================"
echo "TEST COMPLETE"
echo "Request ID: $REQUEST_ID"
echo "============================================================"
