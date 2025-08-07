#!/bin/bash

# Test Direct Execution through Resource Manager
echo "======================================================"
echo "Testing Direct Execution via Resource Manager"
echo "======================================================"

BASE_URL="https://bitware-resource-manager.jhaladik.workers.dev"

# Test execution with Content Granulator template
echo ""
echo "1. Submitting Content Granulator job to Resource Manager..."

EXECUTE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer internal-worker-auth-token-2024" \
  -H "X-Worker-ID: test-client" \
  -H "X-Client-ID: 1" \
  -d '{
    "requestId": "test-001",
    "clientId": "1",
    "templateName": "content_granulation_course",
    "input": {
      "topic": "Python Programming for Beginners",
      "description": "Create a comprehensive Python course structure covering basics to intermediate concepts",
      "duration": "8 weeks",
      "level": "beginner"
    },
    "priority": "normal",
    "urgency": "normal",
    "metadata": {
      "request_id": "test-001",
      "client_name": "Test Client"
    }
  }')

echo "Execute Response:"
echo "$EXECUTE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$EXECUTE_RESPONSE"

# Extract execution ID if available
EXECUTION_ID=$(echo $EXECUTE_RESPONSE | grep -o '"executionId":"[^"]*' | cut -d'"' -f4)

if [ -n "$EXECUTION_ID" ]; then
    echo ""
    echo "2. Checking execution status..."
    sleep 2
    
    STATUS_RESPONSE=$(curl -s "$BASE_URL/api/executions/$EXECUTION_ID" \
      -H "Authorization: Bearer internal-worker-auth-token-2024" \
      -H "X-Worker-ID: test-client")
    
    echo "Status Response:"
    echo "$STATUS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$STATUS_RESPONSE"
fi

# Check queue status
echo ""
echo "3. Checking queue status..."
QUEUE_STATUS=$(curl -s "$BASE_URL/api/queue/status" \
  -H "Authorization: Bearer internal-worker-auth-token-2024" \
  -H "X-Worker-ID: test-client")

echo "Queue Status:"
echo "$QUEUE_STATUS" | python3 -m json.tool 2>/dev/null || echo "$QUEUE_STATUS"

# Check resource availability
echo ""
echo "4. Checking resource availability..."
RESOURCE_STATUS=$(curl -s "$BASE_URL/api/resources/availability" \
  -H "Authorization: Bearer internal-worker-auth-token-2024" \
  -H "X-Worker-ID: test-client")

echo "Resource Availability:"
echo "$RESOURCE_STATUS" | python3 -m json.tool 2>/dev/null || echo "$RESOURCE_STATUS"

echo ""
echo "======================================================"
echo "Test Complete"
echo "======================================================"