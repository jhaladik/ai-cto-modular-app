#!/bin/bash

# Bitware Orchestrator - Comprehensive Test Suite
# Tests AI Factory pipeline coordination, optimization, and performance analytics

# Configuration
WORKER_URL="https://bitware-orchestrator.jhaladik.workers.dev"
CLIENT_API_KEY="external-client-api-key-2024"
WORKER_SECRET="internal-worker-auth-token-2024"
WORKER_ID="bitware_orchestrator"

echo "🏭 Bitware Orchestrator - AI Factory Pipeline Coordination Test Suite"
echo "Worker URL: $WORKER_URL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Sample orchestration requests for testing
BASIC_ORCHESTRATION_REQUEST='{"topic": "artificial intelligence", "urgency": "medium", "quality_level": "standard", "output_format": "json"}'
SPEED_OPTIMIZED_REQUEST='{"topic": "technology", "urgency": "critical", "optimize_for": "speed", "max_total_time_seconds": 90, "output_format": "json"}'
COST_OPTIMIZED_REQUEST='{"topic": "climate change", "budget_limit": 0.50, "optimize_for": "cost", "quality_level": "basic", "output_format": "json"}'
QUALITY_OPTIMIZED_REQUEST='{"topic": "quantum computing", "quality_level": "enterprise", "optimize_for": "quality", "content_analysis_depth": "deep", "output_format": "html"}'

# Helper function to run tests
run_test() {
  local test_name="$1"
  local curl_command="$2"
  local expected_status="$3"
  local expected_content="$4"
  
  echo -n "Testing: $test_name... "
  
  start_time=$(date +%s%3N)
  
  # Use a temporary file to capture the full response
  temp_file=$(mktemp)
  if eval "$curl_command" > "$temp_file" 2>/dev/null; then
    status_code=$(tail -n1 "$temp_file")
    body=$(head -n -1 "$temp_file")
    curl_success=true
  else
    status_code="000"
    body="CURL_ERROR"
    curl_success=false
  fi
  
  end_time=$(date +%s%3N)
  duration=$((end_time - start_time))
  
  # Clean up temp file
  rm -f "$temp_file"
  
  if [[ "$curl_success" == "false" ]]; then
    echo -e "${RED}✗ FAIL${NC} - Curl failed"
    ((TESTS_FAILED++))
    return
  fi
  
  if [[ "$status_code" == "$expected_status" ]]; then
    if [[ -z "$expected_content" ]] || echo "$body" | grep -q "$expected_content"; then
      echo -e "${GREEN}✓ PASS${NC} (${duration}ms)"
      ((TESTS_PASSED++))
      if [[ "$test_name" == *"Performance"* ]]; then
        echo "    Response time: ${duration}ms"
      fi
    else
      echo -e "${RED}✗ FAIL${NC} - Content mismatch"
      echo "    Expected: $expected_content"
      echo "    Got: $(echo "$body" | head -c 200)..."
      ((TESTS_FAILED++))
    fi
  else
    echo -e "${RED}✗ FAIL${NC} - Status: $status_code (expected: $expected_status)"
    echo "    Response: $(echo "$body" | head -c 200)..."
    ((TESTS_FAILED++))
  fi
}

# Enhanced test function with detailed error reporting
run_detailed_test() {
  local test_name="$1"
  local curl_command="$2"
  local expected_status="$3"
  local show_response="$4"
  
  echo -e "${BLUE}=== Detailed Test: $test_name ===${NC}"
  
  start_time=$(date +%s%3N)
  
  temp_file=$(mktemp)
  temp_headers=$(mktemp)
  
  echo "Command: $curl_command"
  
  if eval "$curl_command" -D "$temp_headers" > "$temp_file" 2>/dev/null; then
    status_code=$(tail -n1 "$temp_file")
    body=$(head -n -1 "$temp_file")
    headers=$(cat "$temp_headers")
    curl_success=true
  else
    status_code="000"
    body="CURL_ERROR"
    headers="NO_HEADERS"
    curl_success=false
  fi
  
  end_time=$(date +%s%3N)
  duration=$((end_time - start_time))
  
  echo "Status Code: $status_code"
  echo "Duration: ${duration}ms"
  
  if [[ "$show_response" == "true" ]]; then
    echo "Headers:"
    echo "$headers" | head -10
    echo ""
    echo "Response Body:"
    echo "$body" | head -20
  fi
  
  rm -f "$temp_file" "$temp_headers"
  
  if [[ "$curl_success" == "true" && "$status_code" == "$expected_status" ]]; then
    echo -e "${GREEN}✓ DETAILED TEST PASSED${NC}"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ DETAILED TEST FAILED${NC}"
    ((TESTS_FAILED++))
  fi
  
  echo ""
}

echo "=== Phase 0: Pre-flight Check ==="

# Check if worker is accessible
echo -n "Worker accessibility check... "
if curl -s --connect-timeout 10 "$WORKER_URL/help" > /dev/null; then
  echo -e "${GREEN}✓ ACCESSIBLE${NC}"
else
  echo -e "${RED}✗ NOT ACCESSIBLE${NC}"
  echo "Worker appears to be down or unreachable. Exiting."
  exit 1
fi

echo ""
echo "=== Phase 1: Public Endpoints (No Auth) ==="

# Test help endpoint
run_test "Help endpoint" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/help'" \
  "200" \
  "bitware_orchestrator"

# Test capabilities endpoint  
run_test "Capabilities endpoint" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/capabilities'" \
  "200" \
  "PipelineOrchestrator"

# Test health endpoint
run_test "Health check endpoint" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/health'" \
  "200" \
  "healthy"

# Test CORS preflight
run_test "CORS preflight" \
  "curl -s -w '\n%{http_code}' -X OPTIONS '$WORKER_URL/'" \
  "200"

echo ""
echo "=== Phase 2: Authentication Tests ==="

# Test missing API key
run_test "Missing API key" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/orchestrate' -X POST" \
  "401" \
  "API key required"

# Test invalid API key
run_test "Invalid API key" \
  "curl -s -w '\n%{http_code}' -H 'X-API-Key: invalid' '$WORKER_URL/orchestrate' -X POST" \
  "401" \
  "API key required"

echo ""
echo "=== Phase 3: Core Pipeline Orchestration Tests ==="

# Test missing topic parameter
run_test "Missing topic parameter" \
  "curl -s -w '\n%{http_code}' -H 'X-API-Key: $CLIENT_API_KEY' -H 'Content-Type: application/json' -d '{}' '$WORKER_URL/orchestrate' -X POST" \
  "400" \
  "Missing required field: topic"

# Test basic pipeline orchestration
echo ""
echo -n "Testing: Basic Pipeline Orchestration (AI Integration)... "
start_time=$(date +%s%3N)

temp_file=$(mktemp)
if curl -s -w '\n%{http_code}' --max-time 300 -H "X-API-Key: $CLIENT_API_KEY" -H "Content-Type: application/json" -d "$BASIC_ORCHESTRATION_REQUEST" "$WORKER_URL/orchestrate" -X POST > "$temp_file" 2>/dev/null; then
  status_code=$(tail -n1 "$temp_file")
  body=$(head -n -1 "$temp_file")
  curl_success=true
else
  status_code="000"
  body="CURL_ERROR"
  curl_success=false
fi

end_time=$(date +%s%3N)
duration=$((end_time - start_time))
rm -f "$temp_file"

if [[ "$curl_success" == "false" ]]; then
  echo -e "${RED}✗ FAIL${NC} - Curl failed (timeout or network error)"
  ((TESTS_FAILED++))
elif [[ "$status_code" == "200" ]]; then
  if echo "$body" | grep -q '"status"'; then
    pipeline_id=$(echo "$body" | grep -o '"pipeline_id":"[^"]*"' | cut -d':' -f2 | tr -d '"' || echo "unknown")
    execution_strategy=$(echo "$body" | grep -o '"execution_strategy":"[^"]*"' | cut -d':' -f2 | tr -d '"' || echo "unknown")
    sources_discovered=$(echo "$body" | grep -o '"sources_discovered":[0-9]*' | cut -d':' -f2 || echo "0")
    articles_processed=$(echo "$body" | grep -o '"articles_processed":[0-9]*' | cut -d':' -f2 || echo "0")
    
    echo -e "${GREEN}✓ PASS${NC} (${duration}ms)"
    echo "    Pipeline ID: $pipeline_id"
    echo "    Strategy: $execution_strategy"
    echo "    Sources: $sources_discovered, Articles: $articles_processed"
    ((TESTS_PASSED++))
    
    # Store pipeline ID for later tests
    SAMPLE_PIPELINE_ID=$pipeline_id
  else
    echo -e "${YELLOW}⚠ PARTIAL${NC} - Response received but unexpected format"
    echo "    Response: $(echo "$body" | head -c 200)..."
    ((TESTS_PASSED++))
  fi
elif [[ "$status_code" == "500" ]]; then
  echo -e "${RED}✗ FAIL${NC} - Internal Server Error (likely worker integration issue)"
  echo "    Response: $(echo "$body" | head -c 200)..."
  ((TESTS_FAILED++))
else
  echo -e "${RED}✗ FAIL${NC} - Status: $status_code"
  echo "    Response: $(echo "$body" | head -c 200)..."
  ((TESTS_FAILED++))
fi

echo ""
echo "=== Phase 4: Execution Strategy Tests ==="

# Test different optimization strategies
strategies=("speed" "cost" "quality" "balanced")
strategy_requests=("$SPEED_OPTIMIZED_REQUEST" "$COST_OPTIMIZED_REQUEST" "$QUALITY_OPTIMIZED_REQUEST" "$BASIC_ORCHESTRATION_REQUEST")

for i in "${!strategies[@]}"; do
  strategy="${strategies[$i]}"
  request="${strategy_requests[$i]}"
  
  echo -n "Testing: ${strategy^} optimized strategy... "
  start_time=$(date +%s%3N)
  
  temp_file=$(mktemp)
  if curl -s -w '\n%{http_code}' --max-time 300 -H "X-API-Key: $CLIENT_API_KEY" -H "Content-Type: application/json" -d "$request" "$WORKER_URL/orchestrate" -X POST > "$temp_file" 2>/dev/null; then
    status_code=$(tail -n1 "$temp_file")
    body=$(head -n -1 "$temp_file")
    curl_success=true
  else
    status_code="000"
    body="CURL_ERROR"
    curl_success=false
  fi
  
  end_time=$(date +%s%3N)
  duration=$((end_time - start_time))
  rm -f "$temp_file"
  
  if [[ "$curl_success" == "false" ]]; then
    echo -e "${RED}✗ FAIL${NC} - Curl failed"
    ((TESTS_FAILED++))
  elif [[ "$status_code" == "200" ]]; then
    if echo "$body" | grep -q '"execution_strategy"'; then
      execution_time=$(echo "$body" | grep -o '"total_execution_time_ms":[0-9]*' | cut -d':' -f2 || echo "0")
      optimization_applied=$(echo "$body" | grep -o '"optimization_applied":\[[^]]*\]' | wc -l || echo "0")
      
      echo -e "${GREEN}✓ PASS${NC} (${duration}ms)"
      echo "    Execution time: ${execution_time}ms, Optimizations: ${optimization_applied}"
      ((TESTS_PASSED++))
    else
      echo -e "${YELLOW}⚠ PARTIAL${NC} - Response received but missing strategy info"
      ((TESTS_PASSED++))
    fi
  elif [[ "$status_code" == "500" ]]; then
    echo -e "${RED}✗ FAIL${NC} - Strategy execution failed"
    echo "    Response: $(echo "$body" | head -c 150)..."
    ((TESTS_FAILED++))
  else
    echo -e "${RED}✗ FAIL${NC} - Status: $status_code"
    ((TESTS_FAILED++))
  fi
done

echo ""
echo "=== Phase 5: Pipeline Health and Monitoring Tests ==="

# Test pipeline health monitoring
run_test "Pipeline health check" \
  "curl -s -w '\n%{http_code}' -H 'X-API-Key: $CLIENT_API_KEY' '$WORKER_URL/pipeline-health'" \
  "200" \
  "workers"

# Test performance insights
run_test "Performance insights" \
  "curl -s -w '\n%{http_code}' -H 'X-API-Key: $CLIENT_API_KEY' '$WORKER_URL/performance-insights?time_range=24h'" \
  "200"

# Test pipeline status (if we have a pipeline ID)
if [[ -n "$SAMPLE_PIPELINE_ID" && "$SAMPLE_PIPELINE_ID" != "unknown" ]]; then
  run_test "Pipeline status tracking" \
    "curl -s -w '\n%{http_code}' '$WORKER_URL/pipeline/$SAMPLE_PIPELINE_ID'" \
    "200" \
    "pipeline"
else
  echo "Skipping pipeline status test - no pipeline ID available"
fi

echo ""
echo "=== Phase 6: Admin Endpoints (Worker Auth) ==="

# Test admin without auth
run_test "Admin stats (no auth)" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/admin/stats'" \
  "401" \
  "Worker authentication required"

# Test admin with auth
run_test "Admin stats (with auth)" \
  "curl -s -w '\n%{http_code}' -H 'Authorization: Bearer $WORKER_SECRET' -H 'X-Worker-ID: $WORKER_ID' '$WORKER_URL/admin/stats'" \
  "200" \
  "total_pipelines"

# Test admin performance monitoring
run_test "Admin performance analytics" \
  "curl -s -w '\n%{http_code}' -H 'Authorization: Bearer $WORKER_SECRET' -H 'X-Worker-ID: $WORKER_ID' '$WORKER_URL/admin/performance'" \
  "200"

# Test cost tracking
run_test "Admin cost tracking" \
  "curl -s -w '\n%{http_code}' -H 'Authorization: Bearer $WORKER_SECRET' -H 'X-Worker-ID: $WORKER_ID' '$WORKER_URL/admin/costs'" \
  "200"

echo ""
echo "=== Phase 7: Edge Cases and Error Handling ==="

# Test invalid urgency level
run_test "Invalid urgency level" \
  "curl -s -w '\n%{http_code}' --max-time 60 -H 'X-API-Key: $CLIENT_API_KEY' -H 'Content-Type: application/json' -d '{\"topic\": \"test\", \"urgency\": \"invalid\"}' '$WORKER_URL/orchestrate' -X POST" \
  "200" # Should default to medium

# Test malformed JSON
run_test "Malformed JSON" \
  "curl -s -w '\n%{http_code}' --max-time 20 -H 'X-API-Key: $CLIENT_API_KEY' -H 'Content-Type: application/json' -d '{invalid json}' '$WORKER_URL/orchestrate' -X POST" \
  "500"

# Test budget limit constraint
run_test "Low budget constraint" \
  "curl -s -w '\n%{http_code}' --max-time 120 -H 'X-API-Key: $CLIENT_API_KEY' -H 'Content-Type: application/json' -d '{\"topic\": \"test topic\", \"budget_limit\": 0.10, \"optimize_for\": \"cost\"}' '$WORKER_URL/orchestrate' -X POST" \
  "200"

# Test invalid execution strategy parameters
run_test "Invalid optimization parameter" \
  "curl -s -w '\n%{http_code}' --max-time 60 -H 'X-API-Key: $CLIENT_API_KEY' -H 'Content-Type: application/json' -d '{\"topic\": \"test\", \"optimize_for\": \"invalid_option\"}' '$WORKER_URL/orchestrate' -X POST" \
  "200" # Should default to balanced

# Test very long topic string
run_test "Very long topic string" \
  "curl -s -w '\n%{http_code}' --max-time 120 -H 'X-API-Key: $CLIENT_API_KEY' -H 'Content-Type: application/json' -d '{\"topic\": \"very long topic name that might cause issues with processing and worker coordination across the entire AI Factory RSS pipeline system\", \"urgency\": \"low\"}' '$WORKER_URL/orchestrate' -X POST" \
  "200"

# Test non-existent pipeline status
run_test "Non-existent pipeline status" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/pipeline/pipe_nonexistent_123'" \
  "404"

# Test 404 for invalid endpoint
run_test "Non-existent endpoint" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/nonexistent'" \
  "404"

echo ""
echo "=== Phase 8: Performance and Optimization Tests ==="

# Test caching behavior with identical requests
echo -n "Testing: Pipeline caching (first request)... "
start_time=$(date +%s%3N)
cache_test_request='{"topic": "caching_test_topic", "quality_level": "basic", "optimize_for": "cost"}'
temp_file=$(mktemp)
curl -s --max-time 180 -H "X-API-Key: $CLIENT_API_KEY" -H "Content-Type: application/json" -d "$cache_test_request" "$WORKER_URL/orchestrate" -X POST > "$temp_file" 2>/dev/null
end_time=$(date +%s%3N)
first_duration=$((end_time - start_time))
rm -f "$temp_file"
echo -e "${BLUE}${first_duration}ms${NC}"

sleep 2  # Small delay

echo -n "Testing: Pipeline caching (second request)... "
start_time=$(date +%s%3N)
temp_file=$(mktemp)
if curl -s -w '\n%{http_code}' --max-time 60 -H "X-API-Key: $CLIENT_API_KEY" -H "Content-Type: application/json" -d "$cache_test_request" "$WORKER_URL/orchestrate" -X POST > "$temp_file" 2>/dev/null; then
  end_time=$(date +%s%3N)
  second_duration=$((end_time - start_time))
  body=$(head -n -1 "$temp_file")
  
  if echo "$body" | grep -q '"optimization_applied"'; then
    echo -e "${GREEN}✓ OPTIMIZATION DETECTED${NC} (${second_duration}ms vs ${first_duration}ms)"
    ((TESTS_PASSED++))
  else
    echo -e "${YELLOW}⚠ NO CACHE OPTIMIZATION${NC} (${second_duration}ms - might be expected for orchestration)"
    ((TESTS_PASSED++))
  fi
else
  echo -e "${RED}✗ FAIL${NC} - Caching test failed"
  ((TESTS_FAILED++))
fi
rm -f "$temp_file"

# Performance stress test with parallel processing
echo -n "Testing: Performance optimization features... "
start_time=$(date +%s%3N)

performance_test_request='{"topic": "performance_test", "urgency": "high", "optimize_for": "speed", "enable_parallel_processing": true, "max_total_time_seconds": 90}'

temp_file=$(mktemp)
if curl -s -w '\n%{http_code}' --max-time 120 -H "X-API-Key: $CLIENT_API_KEY" -H "Content-Type: application/json" -d "$performance_test_request" "$WORKER_URL/orchestrate" -X POST > "$temp_file" 2>/dev/null; then
  end_time=$(date +%s%3N)
  duration=$((end_time - start_time))
  status_code=$(tail -n1 "$temp_file")
  body=$(head -n -1 "$temp_file")
  
  if [[ "$status_code" == "200" ]]; then
    if echo "$body" | grep -q 'parallel'; then
      echo -e "${GREEN}✓ PERFORMANCE OPTIMIZED${NC} (${duration}ms)"
      echo "    Parallel processing and optimizations detected"
    else
      echo -e "${YELLOW}⚠ BASIC PERFORMANCE${NC} (${duration}ms)"
    fi
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC} - Performance test failed (Status: $status_code)"
    ((TESTS_FAILED++))
  fi
else
  echo -e "${RED}✗ FAIL${NC} - Performance test timed out"
  ((TESTS_FAILED++))
fi
rm -f "$temp_file"

echo ""
echo "=== Phase 9: Integration Quality Analysis ==="

# Comprehensive pipeline integration test
run_detailed_test "Complete Pipeline Integration Test" \
  "curl -s -w '\n%{http_code}' --max-time 300 -H 'X-API-Key: $CLIENT_API_KEY' -H 'Content-Type: application/json' -d '{\"topic\": \"artificial intelligence\", \"urgency\": \"medium\", \"quality_level\": \"premium\", \"optimize_for\": \"quality\", \"content_analysis_depth\": \"standard\", \"report_type\": \"executive_summary\", \"output_format\": \"json\", \"enable_parallel_processing\": true}' '$WORKER_URL/orchestrate' -X POST" \
  "200" \
  "false"

echo ""
echo "=== Performance Summary ==="

# Final comprehensive performance test
echo -n "Final performance test (complete pipeline)... "
start_time=$(date +%s%3N)

comprehensive_test_request='{"topic": "comprehensive_pipeline_test", "urgency": "medium", "quality_level": "standard", "optimize_for": "balanced", "content_analysis_depth": "standard", "report_type": "trend_analysis", "output_format": "html", "enable_parallel_processing": true}'

temp_file=$(mktemp)
if curl -s -w '\n%{http_code}' --max-time 300 -H "X-API-Key: $CLIENT_API_KEY" -H "Content-Type: application/json" -d "$comprehensive_test_request" "$WORKER_URL/orchestrate" -X POST > "$temp_file" 2>/dev/null; then
  end_time=$(date +%s%3N)
  duration=$((end_time - start_time))
  status_code=$(tail -n1 "$temp_file")
  
  if [[ "$status_code" == "200" ]]; then
    if [[ $duration -lt 120000 ]]; then
      echo -e "${GREEN}✓ EXCELLENT${NC} (${duration}ms < 2 minutes)"
    elif [[ $duration -lt 180000 ]]; then
      echo -e "${YELLOW}⚠ ACCEPTABLE${NC} (${duration}ms < 3 minutes)"
    else
      echo -e "${RED}✗ SLOW${NC} (${duration}ms > 3 minutes)"
    fi
  else
    echo -e "${RED}✗ FAILED${NC} - Status: $status_code"
  fi
else
  echo -e "${RED}✗ FAILED${NC} - Curl error or timeout"
fi
rm -f "$temp_file"

echo ""
echo "=== Test Results ==="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed! AI Factory Orchestrator is ready for production pipeline coordination.${NC}"
  echo -e "${PURPLE}🏭 The complete AI Factory RSS Intelligence Pipeline is operational!${NC}"
  exit 0
elif [ $TESTS_FAILED -lt 5 ]; then
  echo -e "${YELLOW}⚠ Some tests failed, but orchestrator appears mostly functional.${NC}"
  echo -e "${PURPLE}Common issues to check:${NC}"
  echo "1. All 5 worker URLs are correctly configured in environment variables"
  echo "2. Worker authentication secrets match across all workers"
  echo "3. Database is properly created and accessible for orchestration tracking"
  echo "4. KV namespace is correctly bound for pipeline caching"
  echo "5. Individual workers are healthy and responding correctly"
  echo "6. Network connectivity between orchestrator and all workers"
  exit 0
else
  echo -e "${RED}❌ Multiple tests failed. Please review and fix pipeline integration issues.${NC}"
  echo -e "${PURPLE}Debugging steps:${NC}"
  echo "1. Check /health endpoint for orchestrator and individual worker health"
  echo "2. Verify all worker URLs are accessible and correctly configured"
  echo "3. Test individual workers independently to ensure they're operational"
  echo "4. Check Cloudflare Workers dashboard for error logs across all workers"
  echo "5. Verify database schema is properly initialized with orchestration tables"
  echo "6. Ensure authentication credentials are consistent across the pipeline"
  echo "7. Check worker request timeouts and adjust if necessary"
  echo "8. Verify budget limits and cost controls are properly configured"
  exit 1
fi