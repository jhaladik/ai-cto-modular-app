#!/bin/bash

echo "Testing Orchestrator Authentication Flow"
echo "======================================="

# First login to get session token
echo -e "\n1. Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST https://ai-factory-frontend.pages.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@ai-factory.com",
    "password": "admin123",
    "loginType": "admin"
  }')

echo "Login response: $LOGIN_RESPONSE"

# Extract session token
SESSION_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.session_token')
echo "Session token: $SESSION_TOKEN"

# Test orchestrator health through proxy
echo -e "\n2. Testing orchestrator health through proxy..."
HEALTH_RESPONSE=$(curl -s -X GET https://ai-factory-frontend.pages.dev/api/orchestrator/health \
  -H "x-bitware-session-token: $SESSION_TOKEN")

echo "Health response: $HEALTH_RESPONSE"

# Test getting templates
echo -e "\n3. Testing get templates..."
TEMPLATES_RESPONSE=$(curl -s -X GET https://ai-factory-frontend.pages.dev/api/orchestrator/templates \
  -H "x-bitware-session-token: $SESSION_TOKEN")

echo "Templates response: $TEMPLATES_RESPONSE"

# Test getting queue
echo -e "\n4. Testing get queue..."
QUEUE_RESPONSE=$(curl -s -X GET https://ai-factory-frontend.pages.dev/api/orchestrator/queue \
  -H "x-bitware-session-token: $SESSION_TOKEN")

echo "Queue response: $QUEUE_RESPONSE"

# Test direct orchestrator access (should work with worker auth)
echo -e "\n5. Testing direct orchestrator access (for comparison)..."
DIRECT_RESPONSE=$(curl -s -X GET https://bitware-orchestrator-v2.jhaladik.workers.dev/health)

echo "Direct response: $DIRECT_RESPONSE"