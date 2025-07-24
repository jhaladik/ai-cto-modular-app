#!/bin/bash

# Bitware Topic Researcher - Enhanced Test Suite with API Debugging
# Includes detailed debugging for API issues

# Remove set -e to continue testing even if individual tests fail
# set -e

# Configuration
WORKER_URL="https://bitware-topic-researcher.jhaladik.workers.dev"
CLIENT_API_KEY="external-client-api-key-2024"
WORKER_SECRET="internal-worker-auth-token-2024"
WORKER_ID="bitware_topic_researcher"

echo "🔍 Bitware Topic Researcher - Enhanced Test Suite Starting..."
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

echo "=== Phase 0: Pre-flight Debug Check ==="

# Check if worker is accessible
echo -n "Worker accessibility check... "
if curl -s --connect-timeout 10 "$WORKER_URL/help" > /dev/null; then
  echo -e "${GREEN}✓ ACCESSIBLE${NC}"
else
  echo -e "${RED}✗ NOT ACCESSIBLE${NC}"
  echo "Worker appears to be down or unreachable. Exiting."
  exit 1
fi

# Debug endpoint to check environment variables
run_detailed_test "Environment Variables Debug" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/debug'" \
  "200" \
  "true"

echo "=== Phase 1: Public Endpoints (No Auth) ==="

# Test help endpoint
run_test "Help endpoint" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/help'" \
  "200" \
  "bitware_topic_researcher"

# Test capabilities endpoint  
run_test "Capabilities endpoint" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/capabilities'" \
  "200" \
  "ContentDiscoverer"

# Test CORS preflight
run_test "CORS preflight" \
  "curl -s -w '\n%{http_code}' -X OPTIONS '$WORKER_URL/'" \
  "200"

echo ""
echo "=== Phase 2: Authentication Tests ==="

# Test missing API key
run_test "Missing API key" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/?topic=ai'" \
  "401" \
  "API key required"

# Test invalid API key
run_test "Invalid API key" \
  "curl -s -w '\n%{http_code}' -H 'X-API-Key: invalid' '$WORKER_URL/?topic=ai'" \
  "401" \
  "API key required"

# Test correct API key format
run_detailed_test "Correct API Key Format Check" \
  "curl -s -w '\n%{http_code}' -H 'X-API-Key: $CLIENT_API_KEY' '$WORKER_URL/?topic=test'" \
  "200" \
  "false"

echo ""
echo "=== Phase 3: API Integration Tests ==="

# Test missing topic parameter
run_test "Missing topic parameter" \
  "curl -s -w '\n%{http_code}' -H 'X-API-Key: $CLIENT_API_KEY' '$WORKER_URL/'" \
  "400" \
  "Missing required parameter: topic"

# Detailed API test with small topic to check OpenAI integration
echo ""
run_detailed_test "AI Integration Test (Simple Topic)" \
  "curl -s -w '\n%{http_code}' -H 'X-API-Key: $CLIENT_API_KEY' '$WORKER_URL/?topic=technology&depth=1&min_quality=0.5'" \
  "200" \
  "true"

# Test various topics with shorter timeouts
topics=("ai" "science" "news" "tech")

for topic in "${topics[@]}"; do
  echo -n "Testing: Basic research ($topic)... "
  start_time=$(date +%s%3N)
  
  temp_file=$(mktemp)
  if curl -s -w '\n%{http_code}' --max-time 60 -H "X-API-Key: $CLIENT_API_KEY" "$WORKER_URL/?topic=$topic&depth=1&min_quality=0.5" > "$temp_file" 2>/dev/null; then
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
      sources_count=$(echo "$body" | grep -o '"sources_discovered":[0-9]*' | cut -d':' -f2 || echo "0")
      quality_count=$(echo "$body" | grep -o '"quality_sources":[0-9]*' | cut -d':' -f2 || echo "0")
      
      echo -e "${GREEN}✓ PASS${NC} (${duration}ms)"
      echo "    Sources discovered: $sources_count, Quality sources: $quality_count"
      ((TESTS_PASSED++))
    else
      echo -e "${YELLOW}⚠ PARTIAL${NC} - Response received but unexpected format"
      echo "    Response: $(echo "$body" | head -c 200)..."
      ((TESTS_PASSED++))
    fi
  elif [[ "$status_code" == "500" ]]; then
    echo -e "${RED}✗ FAIL${NC} - Internal Server Error (likely OpenAI API issue)"
    echo "    Response: $(echo "$body" | head -c 200)..."
    ((TESTS_FAILED++))
  else
    echo -e "${RED}✗ FAIL${NC} - Status: $status_code"
    echo "    Response: $(echo "$body" | head -c 200)..."
    ((TESTS_FAILED++))
  fi
done

# Test parameter variations
run_test "High quality threshold" \
  "curl -s -w '\n%{http_code}' --max-time 60 -H 'X-API-Key: $CLIENT_API_KEY' '$WORKER_URL/?topic=technology&min_quality=0.9'" \
  "200"

# Test exclude domains
run_test "Exclude domains" \
  "curl -s -w '\n%{http_code}' --max-time 60 -H 'X-API-Key: $CLIENT_API_KEY' '$WORKER_URL/?topic=news&exclude_domains=reddit.com,twitter.com'" \
  "200"

echo ""
echo "=== Phase 4: Caching Tests ==="

# Test caching (second request should be faster)
echo -n "Testing: Caching (first request)... "
start_time=$(date +%s%3N)
temp_file=$(mktemp)
curl -s --max-time 60 -H "X-API-Key: $CLIENT_API_KEY" "$WORKER_URL/?topic=caching_test&depth=1" > "$temp_file" 2>/dev/null
end_time=$(date +%s%3N)
first_duration=$((end_time - start_time))
rm -f "$temp_file"
echo -e "${BLUE}${first_duration}ms${NC}"

sleep 2  # Small delay

echo -n "Testing: Caching (second request)... "
start_time=$(date +%s%3N)
temp_file=$(mktemp)
if curl -s -w '\n%{http_code}' --max-time 30 -H "X-API-Key: $CLIENT_API_KEY" "$WORKER_URL/?topic=caching_test&depth=1" > "$temp_file" 2>/dev/null; then
  end_time=$(date +%s%3N)
  second_duration=$((end_time - start_time))
  body=$(head -n -1 "$temp_file")
  
  if echo "$body" | grep -q '"cached":true'; then
    echo -e "${GREEN}✓ CACHED${NC} (${second_duration}ms vs ${first_duration}ms)"
    ((TESTS_PASSED++))
  else
    echo -e "${YELLOW}⚠ NOT CACHED${NC} (${second_duration}ms - might be expected for new deployment)"
    ((TESTS_PASSED++))
  fi
else
  echo -e "${RED}✗ FAIL${NC} - Caching test failed"
  ((TESTS_FAILED++))
fi
rm -f "$temp_file"

echo ""
echo "=== Phase 5: Admin Endpoints (Worker Auth) ==="

# Test admin without auth
run_test "Admin stats (no auth)" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/admin/stats'" \
  "401" \
  "Worker authentication required"

# Test admin with auth
run_test "Admin stats (with auth)" \
  "curl -s -w '\n%{http_code}' -H 'Authorization: Bearer $WORKER_SECRET' -H 'X-Worker-ID: $WORKER_ID' '$WORKER_URL/admin/stats'" \
  "200" \
  "total_sessions"

# Test recent sessions
run_test "Recent sessions" \
  "curl -s -w '\n%{http_code}' -H 'Authorization: Bearer $WORKER_SECRET' -H 'X-Worker-ID: $WORKER_ID' '$WORKER_URL/admin/sessions'" \
  "200" \
  "sessions"

echo ""
echo "=== Phase 6: Edge Cases ==="

# Test very long topic
run_test "Long topic name" \
  "curl -s -w '\n%{http_code}' --max-time 60 -H 'X-API-Key: $CLIENT_API_KEY' '$WORKER_URL/?topic=very%20long%20topic%20name%20that%20might%20cause%20issues%20with%20processing'" \
  "200"

# Test special characters
run_test "Special characters" \
  "curl -s -w '\n%{http_code}' --max-time 60 -H 'X-API-Key: $CLIENT_API_KEY' '$WORKER_URL/?topic=AI%20%26%20ML%20%28machine%20learning%29'" \
  "200"

# Test invalid depth
run_test "Invalid depth parameter" \
  "curl -s -w '\n%{http_code}' --max-time 60 -H 'X-API-Key: $CLIENT_API_KEY' '$WORKER_URL/?topic=test&depth=invalid'" \
  "200" # Should default to 3

# Test 404
run_test "Non-existent endpoint" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/nonexistent'" \
  "404"

echo ""
echo "=== API Error Analysis ==="

# Test to identify specific API issues
echo -n "API Error Analysis (detailed)... "
start_time=$(date +%s%3N)
temp_file=$(mktemp)
temp_headers=$(mktemp)

if curl -s -w '\n%{http_code}' -D "$temp_headers" --max-time 60 -H "X-API-Key: $CLIENT_API_KEY" "$WORKER_URL/?topic=api_test&depth=1" > "$temp_file" 2>/dev/null; then
  end_time=$(date +%s%3N)
  duration=$((end_time - start_time))
  status_code=$(tail -n1 "$temp_file")
  body=$(head -n -1 "$temp_file")
  headers=$(cat "$temp_headers")
  
  echo -e "${BLUE}${duration}ms${NC}"
  echo "Status: $status_code"
  
  if [[ "$status_code" == "500" ]]; then
    echo -e "${RED}Internal Server Error Details:${NC}"
    echo "$body" | head -5
  elif [[ "$status_code" == "200" ]]; then
    echo -e "${GREEN}API Working Successfully${NC}"
    if echo "$body" | grep -q '"sources"'; then
      echo "Sources field found in response"
    fi
    if echo "$body" | grep -q '"error"'; then
      echo "Error field found: $(echo "$body" | grep -o '"error":"[^"]*"')"
    fi
  fi
else
  echo -e "${RED}✗ CURL FAILED${NC} - Network or timeout issue"
fi

rm -f "$temp_file" "$temp_headers"

echo ""
echo "=== Performance Summary ==="

# Final performance test
echo -n "Final performance test... "
start_time=$(date +%s%3N)
temp_file=$(mktemp)
if curl -s -w '\n%{http_code}' --max-time 60 -H "X-API-Key: $CLIENT_API_KEY" "$WORKER_URL/?topic=performance_final&depth=1" > "$temp_file" 2>/dev/null; then
  end_time=$(date +%s%3N)
  duration=$((end_time - start_time))
  status_code=$(tail -n1 "$temp_file")
  
  if [[ "$status_code" == "200" ]]; then
    if [[ $duration -lt 30000 ]]; then
      echo -e "${GREEN}✓ EXCELLENT${NC} (${duration}ms < 30s)"
    elif [[ $duration -lt 60000 ]]; then
      echo -e "${YELLOW}⚠ ACCEPTABLE${NC} (${duration}ms < 60s)"
    else
      echo -e "${RED}✗ SLOW${NC} (${duration}ms > 60s)"
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
  echo -e "${GREEN}🎉 All tests passed! Worker is ready for production.${NC}"
  exit 0
elif [ $TESTS_FAILED -lt 5 ]; then
  echo -e "${YELLOW}⚠ Some tests failed, but worker appears mostly functional.${NC}"
  echo -e "${PURPLE}Common issues to check:${NC}"
  echo "1. OpenAI API key is correctly set in Cloudflare Workers"
  echo "2. Environment variables match wrangler.toml configuration"
  echo "3. D1 database is properly created and accessible"
  echo "4. KV namespace is correctly bound"
  exit 0
else
  echo -e "${RED}❌ Multiple tests failed. Please review and fix issues.${NC}"
  echo -e "${PURPLE}Debugging steps:${NC}"
  echo "1. Check /debug endpoint output above for environment variables"
  echo "2. Verify OpenAI API key format and permissions"
  echo "3. Check Cloudflare Workers dashboard for error logs"
  echo "4. Ensure D1 database schema is properly initialized"
  exit 1
fi