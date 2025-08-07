#!/bin/bash

# Test Content Granulator Execution through Resource Manager
echo "======================================================"
echo "Testing Content Granulator via Resource Manager"
echo "======================================================"

# Get a session token for testing
echo ""
echo "1. Getting admin session token..."
SESSION_RESPONSE=$(curl -s -X POST "https://ai-factory-frontend.pages.dev/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@ai-factory.com",
    "password": "admin123",
    "loginType": "admin"
  }')

# Extract session token
SESSION_TOKEN=$(echo $SESSION_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$SESSION_TOKEN" ]; then
    echo "Failed to get session token. Response: $SESSION_RESPONSE"
    exit 1
fi

echo "Session token obtained: ${SESSION_TOKEN:0:20}..."

# Create a test request in KAM
echo ""
echo "2. Creating test request in KAM..."
REQUEST_RESPONSE=$(curl -s -X POST "https://ai-factory-frontend.pages.dev/api/kam" \
  -H "Content-Type: application/json" \
  -H "x-bitware-session-token: $SESSION_TOKEN" \
  -d '{
    "endpoint": "/requests",
    "method": "POST",
    "data": {
      "client_id": 1,
      "request_type": "content_creation",
      "urgency": "normal",
      "subject": "Test Course Creation",
      "description": "Create a Python programming course for beginners",
      "budget_allocation": 1.00
    }
  }')

REQUEST_ID=$(echo $REQUEST_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$REQUEST_ID" ]; then
    echo "Failed to create request. Response: $REQUEST_RESPONSE"
    exit 1
fi

echo "Request created with ID: $REQUEST_ID"

# Assign Content Granulator template
echo ""
echo "3. Assigning Content Granulator template to request..."
ASSIGN_RESPONSE=$(curl -s -X POST "https://ai-factory-frontend.pages.dev/api/kam" \
  -H "Content-Type: application/json" \
  -H "x-bitware-session-token: $SESSION_TOKEN" \
  -d "{
    \"endpoint\": \"/requests/$REQUEST_ID\",
    \"method\": \"PUT\",
    \"data\": {
      \"assigned_template\": \"content_granulation_course\",
      \"status\": \"assigned\"
    }
  }")

echo "Template assignment response: $ASSIGN_RESPONSE"

# Execute template through Resource Manager
echo ""
echo "4. Executing template through Resource Manager..."
EXECUTE_RESPONSE=$(curl -s -X POST "https://ai-factory-frontend.pages.dev/api/kam" \
  -H "Content-Type: application/json" \
  -H "x-bitware-session-token: $SESSION_TOKEN" \
  -d "{
    \"endpoint\": \"/requests/$REQUEST_ID/execute\",
    \"method\": \"POST\",
    \"data\": {}
  }")

echo "Execution response: $EXECUTE_RESPONSE"

# Check execution status
echo ""
echo "5. Checking execution status..."
sleep 2

STATUS_RESPONSE=$(curl -s -X POST "https://ai-factory-frontend.pages.dev/api/resource-manager" \
  -H "Content-Type: application/json" \
  -H "x-bitware-session-token: $SESSION_TOKEN" \
  -d '{
    "endpoint": "/api/queue/status",
    "method": "GET"
  }')

echo "Queue status: $STATUS_RESPONSE"

# Check Resource Manager health
echo ""
echo "6. Checking Resource Manager health..."
HEALTH_RESPONSE=$(curl -s -X POST "https://ai-factory-frontend.pages.dev/api/resource-manager" \
  -H "Content-Type: application/json" \
  -H "x-bitware-session-token: $SESSION_TOKEN" \
  -d '{
    "endpoint": "/health",
    "method": "GET"
  }')

echo "Health check: $HEALTH_RESPONSE"

echo ""
echo "======================================================"
echo "Test Summary:"
echo "- Request created: ID $REQUEST_ID"
echo "- Template assigned: content_granulation_course"
echo "- Execution initiated through Resource Manager"
echo "======================================================"