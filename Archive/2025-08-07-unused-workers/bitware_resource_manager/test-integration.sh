#!/bin/bash

# Test script for KAM -> Resource Manager -> Workers integration
# This tests the complete request flow

echo "================================================"
echo "KAM -> Resource Manager Integration Test"
echo "================================================"
echo ""

# Configuration
KAM_URL="https://bitware-key-account-manager.jhaladik.workers.dev"
RM_URL="https://bitware-resource-manager.jhaladik.workers.dev"
API_KEY="test-api-key-2024"
WORKER_SECRET="internal-worker-auth-token-2024"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local description=$1
    local method=$2
    local url=$3
    local data=$4
    local headers=$5
    
    echo -e "${YELLOW}Testing: $description${NC}"
    echo "Method: $method"
    echo "URL: $url"
    
    if [ "$method" = "POST" ] || [ "$method" = "PUT" ]; then
        echo "Data: $data"
        response=$(curl -s -w "\n%{http_code}" -X $method "$url" \
            -H "Content-Type: application/json" \
            -H "$headers" \
            -d "$data")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$url" \
            -H "$headers")
    fi
    
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ Success (HTTP $http_code)${NC}"
        echo "Response: $body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "${RED}✗ Failed (HTTP $http_code)${NC}"
        echo "Response: $body" | jq '.' 2>/dev/null || echo "$body"
    fi
    echo ""
    
    # Return the response for further processing
    echo "$body" > /tmp/last_response.json
}

echo "================================================"
echo "1. Test Resource Manager Health"
echo "================================================"

test_endpoint \
    "Resource Manager Health Check" \
    "GET" \
    "$RM_URL/health" \
    "" \
    ""

echo "================================================"
echo "2. Test Direct Resource Manager Execution"
echo "================================================"

# Test direct execution with a simple template
test_endpoint \
    "Direct Resource Manager Execution" \
    "POST" \
    "$RM_URL/api/execute" \
    '{
        "requestId": "test-'$(date +%s)'",
        "clientId": "test-client-001",
        "templateName": "content_granulation",
        "workerFlow": [
            {
                "worker": "bitware-content-granulator",
                "action": "granulate",
                "params": {
                    "template": "course",
                    "depth": 3
                }
            }
        ],
        "data": {
            "topic": "Introduction to Machine Learning",
            "requirements": "Create a beginner-friendly course structure"
        },
        "priority": "normal"
    }' \
    "Authorization: Bearer $WORKER_SECRET"

# Extract request ID from response
REQUEST_ID=$(cat /tmp/last_response.json | jq -r '.requestId // empty')

if [ ! -z "$REQUEST_ID" ]; then
    echo "================================================"
    echo "3. Check Execution Status"
    echo "================================================"
    
    sleep 2  # Wait for processing
    
    test_endpoint \
        "Check Execution Status" \
        "GET" \
        "$RM_URL/api/execution/$REQUEST_ID" \
        "" \
        "Authorization: Bearer $WORKER_SECRET"
fi

echo "================================================"
echo "4. Test KAM -> Resource Manager Flow"
echo "================================================"

# First, create a request in KAM
echo -e "${YELLOW}Creating request in KAM...${NC}"
KAM_RESPONSE=$(curl -s -X POST "$KAM_URL/requests" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $WORKER_SECRET" \
    -H "X-Worker-ID: test-script" \
    -d '{
        "client_id": "test-client-001",
        "original_message": "Please create a course structure on Python basics",
        "processed_request": "Create a comprehensive course structure for Python programming basics",
        "urgency": "normal",
        "selected_template": "content_granulation"
    }')

echo "KAM Response: $KAM_RESPONSE" | jq '.'
KAM_REQUEST_ID=$(echo "$KAM_RESPONSE" | jq -r '.request_id // empty')

if [ ! -z "$KAM_REQUEST_ID" ]; then
    echo -e "${YELLOW}Executing template via KAM...${NC}"
    
    # Execute the template through KAM
    EXEC_RESPONSE=$(curl -s -X POST "$KAM_URL/requests/$KAM_REQUEST_ID/execute" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $WORKER_SECRET" \
        -H "X-Worker-ID: test-script" \
        -d '{
            "parameters": {
                "topic": "Python Programming Basics",
                "template": "course",
                "depth": 3
            }
        }')
    
    echo "Execution Response: $EXEC_RESPONSE" | jq '.'
fi

echo "================================================"
echo "5. Test Queue Status"
echo "================================================"

test_endpoint \
    "Check Queue Status" \
    "GET" \
    "$RM_URL/api/queue/status" \
    "" \
    "Authorization: Bearer $WORKER_SECRET"

echo "================================================"
echo "6. Test Resource Availability"
echo "================================================"

test_endpoint \
    "Check Resource Availability" \
    "GET" \
    "$RM_URL/api/resources/availability" \
    "" \
    "Authorization: Bearer $WORKER_SECRET"

echo "================================================"
echo "Test Summary"
echo "================================================"
echo ""
echo "Integration test completed. Check the results above for any failures."
echo ""
echo "Key Points to Verify:"
echo "1. Resource Manager is healthy and responding"
echo "2. Direct execution creates and processes requests"
echo "3. KAM correctly forwards requests to Resource Manager"
echo "4. Worker bindings are properly configured"
echo "5. Multi-stage pipelines execute sequentially"
echo ""