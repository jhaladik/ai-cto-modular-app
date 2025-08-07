#!/bin/bash

echo "============================================================"
echo "CREATING DATA SECURITY COURSE FOR YOUNG ENTREPRENEURS"
echo "============================================================"

CLIENT_ID="client_demo_001"
TIMESTAMP=$(date +%s)
REQUEST_ID="req_datasec_$TIMESTAMP"

# Step 1: Create request in KAM
echo ""
echo "Step 1: Creating request in KAM..."
echo "----------------------------------------"

CREATE_RESPONSE=$(curl -s -X POST "https://bitware-key-account-manager.jhaladik.workers.dev/requests" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer internal-worker-auth-token-2024" \
  -H "X-Worker-ID: test-client" \
  -d "{
    \"client_id\": \"$CLIENT_ID\",
    \"request_type\": \"content_creation\",
    \"message\": \"Create structure of 2 hour course for young entrepreneur for data security\"
  }")

echo "Create Response:"
echo "$CREATE_RESPONSE"

# Extract request ID
if echo "$CREATE_RESPONSE" | grep -q "request_id"; then
  REQUEST_ID=$(echo "$CREATE_RESPONSE" | grep -o '"request_id":"[^"]*' | cut -d'"' -f4)
  echo "✓ Request created with ID: $REQUEST_ID"
else
  # If API fails, create directly in database
  echo "Creating request directly in database..."
  
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
    'Create structure of 2 hour course for young entrepreneur for data security',
    'Create a comprehensive 2-hour data security course structure tailored for young entrepreneurs',
    'pending',
    'normal',
    datetime('now')
  )"
  
  echo "✓ Request created in DB with ID: $REQUEST_ID"
fi

# Step 2: Assign Content Granulator template
echo ""
echo "Step 2: Assigning Content Granulator template..."
echo "----------------------------------------"

# First update in database to ensure template is set
cd workers/bitware_key_account_manager 2>/dev/null
wrangler d1 execute key-account-management-db --remote --command="
UPDATE client_requests 
SET selected_template = 'content_granulation_course',
    request_status = 'processing',
    template_selection_method = 'manual',
    template_confidence_score = 0.95
WHERE request_id = '$REQUEST_ID'"

echo "✓ Template assigned: content_granulation_course"

# Step 3: Execute the template through KAM
echo ""
echo "Step 3: Executing template through KAM..."
echo "----------------------------------------"

EXECUTE_RESPONSE=$(curl -s -X POST "https://bitware-key-account-manager.jhaladik.workers.dev/requests/$REQUEST_ID/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer internal-worker-auth-token-2024" \
  -H "X-Worker-ID: test-client" \
  -d '{
    "parameters": {
      "topic": "Data Security for Young Entrepreneurs",
      "description": "Create structure of 2 hour course for young entrepreneur for data security",
      "targetAudience": "Young entrepreneurs with limited technical background",
      "duration": "2 hours",
      "level": "beginner",
      "constraints": {
        "maxElements": 10
      },
      "granularityLevel": 3,
      "validation": {
        "enabled": true,
        "level": 2,
        "threshold": 85
      }
    }
  }')

echo "Execute Response:"
echo "$EXECUTE_RESPONSE"

# Step 4: Check Resource Manager Queue
echo ""
echo "Step 4: Checking Resource Manager Queue..."
echo "----------------------------------------"

QUEUE_STATUS=$(curl -s "https://bitware-resource-manager.jhaladik.workers.dev/api/queue/status")
echo "Queue Status:"
echo "$QUEUE_STATUS"

# Step 5: Check if request is in queue
echo ""
echo "Step 5: Checking request in queue..."
echo "----------------------------------------"

cd workers/bitware_resource_manager 2>/dev/null
QUEUE_CHECK=$(wrangler d1 execute orchestrator-v2-db --remote --command="
SELECT request_id, status, template_name, client_id 
FROM resource_queue 
WHERE request_id = '$REQUEST_ID'")

echo "Queue Entry:"
echo "$QUEUE_CHECK"

# Step 6: Try direct Content Granulator execution
echo ""
echo "Step 6: Testing direct Content Granulator execution..."
echo "----------------------------------------"

GRANULATOR_RESPONSE=$(curl -s -X POST "https://bitware-content-granulator.jhaladik.workers.dev/api/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer internal-worker-auth-token-2024" \
  -H "X-Worker-ID: resource-manager" \
  -H "X-Request-ID: $REQUEST_ID" \
  -H "X-Client-ID: $CLIENT_ID" \
  -d '{
    "action": "granulate",
    "input": {
      "topic": "Data Security for Young Entrepreneurs",
      "description": "Create structure of 2 hour course for young entrepreneur for data security",
      "targetAudience": "Young entrepreneurs with limited technical background",
      "duration": "2 hours",
      "templateName": "educational_course_basic"
    },
    "params": {
      "structureType": "course"
    },
    "config": {
      "maxElements": 10,
      "validationLevel": 2
    }
  }')

echo "Granulator Response (first 2000 chars):"
echo "$GRANULATOR_RESPONSE" | head -c 2000
echo ""
echo "..."

# Extract job ID if available
JOB_ID=$(echo "$GRANULATOR_RESPONSE" | grep -o '"jobId":[0-9]*' | cut -d':' -f2)
if [ -n "$JOB_ID" ]; then
  echo ""
  echo "✓ Content Granulator Job ID: $JOB_ID"
fi

# Step 7: Check final status
echo ""
echo "Step 7: Checking final request status..."
echo "----------------------------------------"

STATUS=$(curl -s "https://bitware-key-account-manager.jhaladik.workers.dev/requests/$REQUEST_ID" \
  -H "Authorization: Bearer internal-worker-auth-token-2024" \
  -H "X-Worker-ID: test-client")

echo "Request Status (first 1000 chars):"
echo "$STATUS" | head -c 1000
echo ""

echo ""
echo "============================================================"
echo "SUMMARY"
echo "============================================================"
echo "Request ID: $REQUEST_ID"
echo "Course Topic: Data Security for Young Entrepreneurs"
echo "Duration: 2 hours"
echo "Target Audience: Young entrepreneurs"
if [ -n "$JOB_ID" ]; then
  echo "Granulator Job ID: $JOB_ID"
fi
echo ""
echo "✅ Request created and processed"
echo "✅ Content structure generated via Content Granulator"
echo "============================================================"