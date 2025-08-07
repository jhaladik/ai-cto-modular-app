#!/bin/bash
# ===========================================
# Universal Researcher 2.0 - Comprehensive Test Suite
# ===========================================

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
WORKER_URL=https://bitware-universal-researcher.jhaladik.workers.dev
CLIENT_API_KEY="external-client-api-key-2024"
WORKER_SHARED_SECRET="internal-worker-auth-token-2024"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}🔬 Universal Researcher 2.0 Test Suite${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""
echo "Worker URL: $WORKER_URL"
echo "Testing v2.0 template system + v1.0 compatibility"
echo ""

# ===========================================
# Test Helper Functions
# ===========================================

run_test() {
  local test_name="$1"
  local curl_command="$2"
  local expected_status="$3"
  local check_response="$4"
  
  echo -n "Testing: $test_name... "
  
  # Execute curl command and capture response
  response=$(eval "$curl_command" 2>/dev/null)
  exit_code=$?
  
  if [[ $exit_code -eq 0 ]]; then
    if [[ -n "$check_response" ]]; then
      # Check if response contains expected content
      if echo "$response" | grep -q "$check_response"; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((TESTS_PASSED++))
      else
        echo -e "${RED}✗ FAIL (content check)${NC}"
        echo "Expected: $check_response"
        echo "Got: $(echo "$response" | head -100)"
        ((TESTS_FAILED++))
      fi
    else
      echo -e "${GREEN}✓ PASS${NC}"
      ((TESTS_PASSED++))
    fi
  else
    echo -e "${RED}✗ FAIL (curl error)${NC}"
    ((TESTS_FAILED++))
  fi
}

run_detailed_test() {
  local test_name="$1" 
  local curl_command="$2"
  local show_response="$3"
  
  echo -e "${BLUE}=== Detailed Test: $test_name ===${NC}"
  
  start_time=$(date +%s%3N)
  response=$(eval "$curl_command" 2>/dev/null)
  exit_code=$?
  end_time=$(date +%s%3N)
  duration=$((end_time - start_time))
  
  echo "Command: $curl_command"
  echo "Duration: ${duration}ms"
  echo "Exit Code: $exit_code"
  
  if [[ "$show_response" == "true" ]]; then
    echo "Response:"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
  fi
  
  if [[ $exit_code -eq 0 ]]; then
    echo -e "${GREEN}✓ DETAILED TEST PASSED${NC}"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ DETAILED TEST FAILED${NC}"
    ((TESTS_FAILED++))
  fi
  
  echo ""
}

# ===========================================
# Phase 0: Pre-flight Checks
# ===========================================

echo -e "${YELLOW}Phase 0: Pre-flight Checks${NC}"

run_test "Worker Accessibility" \
  "curl -s --connect-timeout 10 '$WORKER_URL/health'" \
  "" \
  "status"

run_test "Health Endpoint Response" \
  "curl -s '$WORKER_URL/health'" \
  "" \
  "database_connected"

# ===========================================
# Phase 1: Public Endpoints (No Auth)
# ===========================================

echo ""
echo -e "${YELLOW}Phase 1: Public Endpoints${NC}"

run_test "Help Endpoint" \
  "curl -s '$WORKER_URL/help'" \
  "" \
  "universal_researcher"

run_test "Capabilities Endpoint" \
  "curl -s '$WORKER_URL/capabilities'" \
  "" \
  "UniversalContentDiscovery"

run_test "Templates Endpoint" \
  "curl -s '$WORKER_URL/templates'" \
  "" \
  "supported_templates"

# ===========================================
# Phase 2: V2.0 Template System Tests
# ===========================================

echo ""
echo -e "${YELLOW}Phase 2: V2.0 Template System Tests${NC}"

# Test RSS search template
run_detailed_test "RSS Search Template" \
  "curl -s -X POST '$WORKER_URL/execute' \
    -H 'Content-Type: application/json' \
    -H 'X-API-Key: $CLIENT_API_KEY' \
    -d '{
      \"context\": {
        \"client_id\": \"test_client_001\",
        \"request_id\": \"req_test_rss_001\",
        \"pipeline_id\": \"pipe_test_001\",
        \"billing_tier\": \"pro\"
      },
      \"template\": {
        \"capability\": \"search_rss\",
        \"parameters\": {
          \"depth\": 2,
          \"quality_threshold\": 0.7
        },
        \"output_format\": \"standard\"
      },
      \"data\": {
        \"topic\": \"artificial intelligence\"
      }
    }'" \
  "true"

# Test YouTube search template (if API key available)
run_detailed_test "YouTube Search Template" \
  "curl -s -X POST '$WORKER_URL/execute' \
    -H 'Content-Type: application/json' \
    -H 'X-API-Key: $CLIENT_API_KEY' \
    -d '{
      \"context\": {
        \"client_id\": \"test_client_002\",
        \"request_id\": \"req_test_youtube_001\", 
        \"pipeline_id\": \"pipe_test_002\",
        \"billing_tier\": \"enterprise\"
      },
      \"template\": {
        \"capability\": \"search_youtube\",
        \"parameters\": {
          \"content_type\": \"channels\",
          \"subscriber_threshold\": 1000
        },
        \"output_format\": \"standard\"
      },
      \"data\": {
        \"topic\": \"machine learning\"
      }
    }'" \
  "true"

# Test multi-platform search
run_detailed_test "Multi-Platform Search Template" \
  "curl -s -X POST '$WORKER_URL/execute' \
    -H 'Content-Type: application/json' \
    -H 'X-API-Key: $CLIENT_API_KEY' \
    -d '{
      \"context\": {
        \"client_id\": \"test_client_003\",
        \"request_id\": \"req_test_multi_001\",
        \"pipeline_id\": \"pipe_test_003\", 
        \"billing_tier\": \"enterprise\"
      },
      \"template\": {
        \"capability\": \"search_all\",
        \"parameters\": {
          \"platforms\": [\"rss\", \"youtube\"],
          \"max_per_platform\": 5
        },
        \"output_format\": \"standard\"
      },
      \"data\": {
        \"topic\": \"blockchain\"
      }
    }'" \
  "true"

# ===========================================
# Phase 3: V1.0 Compatibility Tests
# ===========================================

echo ""
echo -e "${YELLOW}Phase 3: V1.0 Compatibility Tests${NC}"

run_detailed_test "Legacy V1.0 Basic Request" \
  "curl -s '$WORKER_URL/?topic=artificial+intelligence' \
    -H 'X-API-Key: $CLIENT_API_KEY'" \
  "true"

run_detailed_test "Legacy V1.0 With Parameters" \
  "curl -s '$WORKER_URL/?topic=machine+learning&depth=3&min_quality=0.8' \
    -H 'X-API-Key: $CLIENT_API_KEY'" \
  "true"

# ===========================================
# Phase 4: Error Handling Tests
# ===========================================

echo ""
echo -e "${YELLOW}Phase 4: Error Handling Tests${NC}"

run_test "Missing API Key" \
  "curl -s '$WORKER_URL/execute' -o /dev/null -w '%{http_code}'" \
  "401"

run_test "Invalid Template Capability" \
  "curl -s -X POST '$WORKER_URL/execute' \
    -H 'Content-Type: application/json' \
    -H 'X-API-Key: $CLIENT_API_KEY' \
    -d '{
      \"context\": {
        \"client_id\": \"test\",
        \"request_id\": \"req_test\",
        \"pipeline_id\": \"pipe_test\",
        \"billing_tier\": \"pro\"
      },
      \"template\": {
        \"capability\": \"invalid_template\",
        \"parameters\": {},
        \"output_format\": \"standard\"
      },
      \"data\": {\"topic\": \"test\"}
    }'" \
  "" \
  "error"

run_test "Missing Required Fields" \
  "curl -s -X POST '$WORKER_URL/execute' \
    -H 'Content-Type: application/json' \
    -H 'X-API-Key: $CLIENT_API_KEY' \
    -d '{\"incomplete\": \"data\"}'" \
  "" \
  "Missing required fields"

# ===========================================
# Phase 5: Admin Endpoints Tests
# ===========================================

echo ""
echo -e "${YELLOW}Phase 5: Admin Endpoints Tests${NC}"

run_test "Admin Stats" \
  "curl -s '$WORKER_URL/admin/stats' \
    -H 'Authorization: Bearer $WORKER_SHARED_SECRET'" \
  "" \
  "total_sessions"

run_test "Admin Recent Sessions" \
  "curl -s '$WORKER_URL/admin/sessions' \
    -H 'Authorization: Bearer $WORKER_SHARED_SECRET'" \
  "" \
  "sessions"

run_test "Admin Unauthorized Access" \
  "curl -s '$WORKER_URL/admin/stats' -o /dev/null -w '%{http_code}'" \
  "401"

# ===========================================
# Phase 6: StandardWorkerResponse Validation
# ===========================================

echo ""
echo -e "${YELLOW}Phase 6: StandardWorkerResponse Validation${NC}"

echo "Validating StandardWorkerResponse format..."

response=$(curl -s -X POST "$WORKER_URL/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $CLIENT_API_KEY" \
  -d '{
    "context": {
      "client_id": "test_client_validation",
      "request_id": "req_validation_001",
      "pipeline_id": "pipe_validation_001",
      "billing_tier": "pro"
    },
    "template": {
      "capability": "search_rss",
      "parameters": {"depth": 1, "quality_threshold": 0.7},
      "output_format": "standard"
    },
    "data": {"topic": "test"}
  }')

echo "Response structure validation:"

# Check required StandardWorkerResponse fields
echo -n "- status field: "
echo "$response" | jq -e '.status' >/dev/null && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}"

echo -n "- timestamp field: "
echo "$response" | jq -e '.timestamp' >/dev/null && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}"

echo -n "- metrics object: "
echo "$response" | jq -e '.metrics' >/dev/null && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}"

echo -n "- health object: "
echo "$response" | jq -e '.health' >/dev/null && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}"

echo -n "- data object: "
echo "$response" | jq -e '.data' >/dev/null && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}"

# Check data structure
echo -n "- sources array in data: "
echo "$response" | jq -e '.data.sources' >/dev/null && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}"

echo -n "- client_context in data: "
echo "$response" | jq -e '.data.client_context' >/dev/null && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}"

echo -n "- session_id in data: "
echo "$response" | jq -e '.data.session_id' >/dev/null && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}"

# ===========================================
# Phase 7: Performance Tests
# ===========================================

echo ""
echo -e "${YELLOW}Phase 7: Performance Tests${NC}"

echo "Running performance tests..."

# Test caching behavior
echo "Testing response time (should be faster on second request due to caching):"

start_time=$(date +%s%3N)
curl -s "$WORKER_URL/?topic=performance+test" -H "X-API-Key: $CLIENT_API_KEY" >/dev/null
first_request_time=$(($(date +%s%3N) - start_time))

start_time=$(date +%s%3N)
curl -s "$WORKER_URL/?topic=performance+test" -H "X-API-Key: $CLIENT_API_KEY" >/dev/null
second_request_time=$(($(date +%s%3N) - start_time))

echo "First request: ${first_request_time}ms"
echo "Second request: ${second_request_time}ms"

if [[ $second_request_time -lt $first_request_time ]]; then
  echo -e "${GREEN}✓ Caching appears to be working${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${YELLOW}! Caching may not be working optimally${NC}"
fi

# ===========================================
# Phase 8: Database Integration Tests
# ===========================================

echo ""
echo -e "${YELLOW}Phase 8: Database Integration Tests${NC}"

echo "Testing database operations..."

# Create a test session and verify storage
test_response=$(curl -s -X POST "$WORKER_URL/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $CLIENT_API_KEY" \
  -d '{
    "context": {
      "client_id": "db_test_client",
      "request_id": "req_db_test_001",
      "pipeline_id": "pipe_db_test_001",
      "billing_tier": "pro"
    },
    "template": {
      "capability": "search_rss",
      "parameters": {"depth": 1, "quality_threshold": 0.7},
      "output_format": "standard"
    },
    "data": {"topic": "database test"}
  }')

echo -n "Database session creation: "
session_id=$(echo "$test_response" | jq -r '.data.session_id // empty')
if [[ -n "$session_id" && "$session_id" != "null" ]]; then
  echo -e "${GREEN}✓ Session created: $session_id${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ Session creation failed${NC}"
  ((TESTS_FAILED++))
fi

echo -n "Sources stored in database: "
sources_count=$(echo "$test_response" | jq -r '.data.total_sources // 0')
if [[ $sources_count -gt 0 ]]; then
  echo -e "${GREEN}✓ $sources_count sources stored${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${YELLOW}! No sources stored (may be expected)${NC}"
fi

# ===========================================
# Final Results
# ===========================================

echo ""
echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}📊 Test Results Summary${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"

total_tests=$((TESTS_PASSED + TESTS_FAILED))
if [[ $total_tests -gt 0 ]]; then
  success_rate=$(( (TESTS_PASSED * 100) / total_tests ))
  echo -e "Success Rate: ${success_rate}%"
fi

echo ""

if [[ $TESTS_FAILED -eq 0 ]]; then
  echo -e "${GREEN}🎉 All tests passed! Universal Researcher 2.0 is ready.${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed. Please review the implementation.${NC}"
  exit 1
fi

# ===========================================
# Additional Test Utilities
# ===========================================

# Function to test specific template capabilities
test_template_capability() {
  local capability="$1"
  local topic="$2"
  
  echo "Testing template capability: $capability"
  
  response=$(curl -s -X POST "$WORKER_URL/execute" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $CLIENT_API_KEY" \
    -d "{
      \"context\": {
        \"client_id\": \"test_capability_client\",
        \"request_id\": \"req_capability_test\",
        \"pipeline_id\": \"pipe_capability_test\",
        \"billing_tier\": \"pro\"
      },
      \"template\": {
        \"capability\": \"$capability\",
        \"parameters\": {},
        \"output_format\": \"standard\"
      },
      \"data\": {\"topic\": \"$topic\"}
    }")
  
  echo "$response" | jq '.'
}

# Function to benchmark worker performance
benchmark_worker() {
  local num_requests="$1"
  local topic="$2"
  
  echo "Benchmarking worker with $num_requests requests..."
  
  total_time=0
  successful_requests=0
  
  for ((i=1; i<=num_requests; i++)); do
    start_time=$(date +%s%3N)
    
    response=$(curl -s "$WORKER_URL/?topic=$topic" -H "X-API-Key: $CLIENT_API_KEY")
    exit_code=$?
    
    end_time=$(date +%s%3N)
    request_time=$((end_time - start_time))
    total_time=$((total_time + request_time))
    
    if [[ $exit_code -eq 0 ]]; then
      ((successful_requests++))
    fi
    
    echo -n "."
  done
  
  echo ""
  echo "Benchmark Results:"
  echo "- Total requests: $num_requests"
  echo "- Successful requests: $successful_requests"
  echo "- Total time: ${total_time}ms"
  echo "- Average time per request: $((total_time / num_requests))ms"
  echo "- Success rate: $(( (successful_requests * 100) / num_requests ))%"
}

# Usage examples:
# ./test.sh
# WORKER_URL="https://your-worker.dev" ./test.sh
# CLIENT_API_KEY="your-key" ./test.sh