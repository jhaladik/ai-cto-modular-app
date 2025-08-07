#!/bin/bash

# Resource Manager Test Script
# Tests all major endpoints and functionality

BASE_URL="http://localhost:8787"
if [ ! -z "$1" ]; then
  BASE_URL="$1"
fi

echo "Testing Resource Manager at: $BASE_URL"
echo "========================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local expected_status=$4
  local description=$5
  
  echo -n "Testing: $description... "
  
  if [ "$method" == "GET" ] || [ "$method" == "DELETE" ]; then
    response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
      -H "Content-Type: application/json")
  else
    response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" == "$expected_status" ]; then
    echo -e "${GREEN}✓${NC} (Status: $http_code)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    if [ ! -z "$body" ]; then
      echo "  Response: $(echo $body | jq -c '.' 2>/dev/null || echo $body)"
    fi
  else
    echo -e "${RED}✗${NC} (Expected: $expected_status, Got: $http_code)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo "  Response: $body"
  fi
  echo ""
}

# 1. Health Checks
echo -e "${YELLOW}=== Health Checks ===${NC}"
test_endpoint "GET" "/" "" "200" "Basic health check"
test_endpoint "GET" "/health" "" "200" "Detailed health check"
test_endpoint "GET" "/status" "" "200" "System status"
test_endpoint "GET" "/metrics" "" "200" "Performance metrics"

# 2. Resource Availability
echo -e "${YELLOW}=== Resource Management ===${NC}"
test_endpoint "GET" "/api/resources/availability" "" "200" "Check resource availability"

test_endpoint "POST" "/api/resources/check" \
  '{"resourceType":"openai-gpt35","amount":1000}' \
  "200" "Check specific resource"

test_endpoint "POST" "/api/resources/estimate" \
  '{"template":"market_research_pipeline","clientTier":"standard"}' \
  "200" "Estimate resource cost"

# 3. Queue Management
echo -e "${YELLOW}=== Queue Management ===${NC}"
test_endpoint "GET" "/api/queue/status" "" "200" "Queue status"

# Enqueue a test request
REQUEST_ID="test-$(date +%s)"
test_endpoint "POST" "/api/queue/enqueue" \
  '{
    "requestId":"'$REQUEST_ID'",
    "clientId":1,
    "templateName":"market_research_pipeline",
    "clientTier":"standard",
    "priority":"normal",
    "urgency":"normal",
    "resourceRequirements":{
      "openai-gpt35":1000,
      "database":100
    },
    "data":{"topic":"AI trends"}
  }' \
  "200" "Enqueue request"

test_endpoint "GET" "/api/queue/position/$REQUEST_ID" "" "200" "Check queue position"

# 4. Execution
echo -e "${YELLOW}=== Execution ===${NC}"
EXEC_REQUEST_ID="exec-$(date +%s)"
test_endpoint "POST" "/api/execute" \
  '{
    "requestId":"'$EXEC_REQUEST_ID'",
    "clientId":1,
    "templateName":"market_research_pipeline",
    "clientTier":"standard",
    "priority":"high",
    "data":{"topic":"Cloud computing"},
    "resourceRequirements":{
      "openai-gpt35":500
    }
  }' \
  "200" "Execute request"

test_endpoint "GET" "/api/execution/$EXEC_REQUEST_ID" "" "200" "Check execution status"

# 5. Cost and Usage
echo -e "${YELLOW}=== Cost and Usage ===${NC}"
test_endpoint "GET" "/api/usage/1" "" "200" "Get client usage history"
test_endpoint "GET" "/api/usage/1/current" "" "200" "Get current usage"

test_endpoint "POST" "/api/cost/estimate" \
  '{"template":"content_monitoring_pipeline","clientTier":"premium"}' \
  "200" "Estimate cost"

test_endpoint "GET" "/api/cost/$REQUEST_ID" "" "200" "Get request cost"

# 6. Optimization
echo -e "${YELLOW}=== Optimization ===${NC}"
test_endpoint "POST" "/api/optimize/analyze" \
  '{
    "requestId":"opt-test",
    "clientId":1,
    "templateName":"market_research_pipeline",
    "clientTier":"standard",
    "priority":"normal",
    "model":"gpt-4",
    "estimatedTokens":2000,
    "estimatedCost":0.06,
    "data":{"test":"data"}
  }' \
  "200" "Analyze optimization opportunities"

test_endpoint "GET" "/api/optimize/stats/1" "" "200" "Get optimization statistics"
test_endpoint "GET" "/api/optimize/recommendations/1" "" "200" "Get optimization recommendations"

# 7. Internal Endpoints (Worker-to-Worker)
echo -e "${YELLOW}=== Internal Endpoints ===${NC}"
test_endpoint "POST" "/internal/reserve" \
  '{
    "resourceType":"openai-gpt35",
    "amount":100,
    "clientId":1,
    "clientTier":"standard",
    "priority":"normal",
    "requestId":"internal-test"
  }' \
  "200" "Reserve resources"

test_endpoint "POST" "/internal/consume" \
  '{
    "resourceType":"database",
    "amount":10,
    "clientId":1,
    "clientTier":"standard",
    "priority":"normal",
    "requestId":"consume-test"
  }' \
  "200" "Consume resources"

# 8. Admin Endpoints
echo -e "${YELLOW}=== Admin Endpoints ===${NC}"
test_endpoint "POST" "/admin/scheduler/start" "" "200" "Start scheduler"
test_endpoint "GET" "/admin/alerts" "" "200" "Get alerts"
test_endpoint "POST" "/admin/scheduler/stop" "" "200" "Stop scheduler"

# 9. Queue Cancellation
echo -e "${YELLOW}=== Queue Operations ===${NC}"
test_endpoint "DELETE" "/api/queue/$REQUEST_ID" "" "200" "Remove from queue"
test_endpoint "POST" "/api/execution/$EXEC_REQUEST_ID/cancel" "" "200" "Cancel execution"

# 10. Error Cases
echo -e "${YELLOW}=== Error Cases ===${NC}"
test_endpoint "POST" "/api/queue/enqueue" \
  '{"invalid":"data"}' \
  "400" "Invalid enqueue request"

test_endpoint "GET" "/api/queue/position/non-existent" "" "404" "Non-existent request"

test_endpoint "POST" "/api/resources/check" \
  '{"resourceType":"invalid-resource","amount":100}' \
  "500" "Invalid resource type"

# Summary
echo "========================================"
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo "========================================"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed!${NC}"
  exit 1
fi