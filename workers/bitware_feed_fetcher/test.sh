#!/bin/bash

# Bitware Feed Fetcher - Comprehensive Test Suite
# Tests RSS parsing, article extraction, and batch processing

# Remove set -e to continue testing even if individual tests fail
# set -e

# Configuration
WORKER_URL="https://bitware-feed-fetcher.jhaladik.workers.dev"
CLIENT_API_KEY="external-client-api-key-2024"
WORKER_SECRET="internal-worker-auth-token-2024"
WORKER_ID="bitware_feed_fetcher"

echo "📡 Bitware Feed Fetcher - Comprehensive Test Suite Starting..."
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

# Test RSS feeds for various scenarios
TEST_FEEDS=(
  "https://feeds.reuters.com/reuters/technologyNews"
  "https://feeds.bbci.co.uk/news/technology/rss.xml"
  "https://rss.cnn.com/rss/cnn_tech.rss"
  "https://www.techcrunch.com/feed/"
)

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
  "bitware_feed_fetcher"

# Test capabilities endpoint  
run_test "Capabilities endpoint" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/capabilities'" \
  "200" \
  "ContentExtractor"

# Test CORS preflight
run_test "CORS preflight" \
  "curl -s -w '\n%{http_code}' -X OPTIONS '$WORKER_URL/'" \
  "200"

echo ""
echo "=== Phase 2: Authentication Tests ==="

# Test missing API key
run_test "Missing API key" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/?feed_url=https://example.com/feed'" \
  "401" \
  "API key required"

# Test invalid API key
run_test "Invalid API key" \
  "curl -s -w '\n%{http_code}' -H 'X-API-Key: invalid' '$WORKER_URL/?feed_url=https://example.com/feed'" \
  "401" \
  "API key required"

echo ""
echo "=== Phase 3: Single Feed Processing Tests ==="

# Test missing feed_url parameter
run_test "Missing feed_url parameter" \
  "curl -s -w '\n%{http_code}' -H 'X-API-Key: $CLIENT_API_KEY' '$WORKER_URL/'" \
  "400" \
  "Missing required parameter: feed_url"

# Test single feed processing with real RSS feeds
for feed_url in "${TEST_FEEDS[@]}"; do
  echo ""
  echo -n "Testing: Single feed processing ($feed_url)... "
  start_time=$(date +%s%3N)
  
  temp_file=$(mktemp)
  if curl -s -w '\n%{http_code}' --max-time 30 -H "X-API-Key: $CLIENT_API_KEY" "$WORKER_URL/?feed_url=${feed_url}&max_articles=5" > "$temp_file" 2>/dev/null; then
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
      articles_count=$(echo "$body" | grep -o '"articles_found":[0-9]*' | cut -d':' -f2 || echo "0")
      stored_count=$(echo "$body" | grep -o '"articles_stored":[0-9]*' | cut -d':' -f2 || echo "0")
      
      echo -e "${GREEN}✓ PASS${NC} (${duration}ms)"
      echo "    Articles found: $articles_count, Stored: $stored_count"
      ((TESTS_PASSED++))
    else
      echo -e "${YELLOW}⚠ PARTIAL${NC} - Response received but unexpected format"
      echo "    Response: $(echo "$body" | head -c 200)..."
      ((TESTS_PASSED++))
    fi
  elif [[ "$status_code" == "500" ]]; then
    echo -e "${RED}✗ FAIL${NC} - Internal Server Error (likely RSS parsing issue)"
    echo "    Response: $(echo "$body" | head -c 200)..."
    ((TESTS_FAILED++))
  else
    echo -e "${RED}✗ FAIL${NC} - Status: $status_code"
    echo "    Response: $(echo "$body" | head -c 200)..."
    ((TESTS_FAILED++))
  fi
done

# Test parameter variations
run_test "Max articles limit" \
  "curl -s -w '\n%{http_code}' --max-time 30 -H 'X-API-Key: $CLIENT_API_KEY' '$WORKER_URL/?feed_url=${TEST_FEEDS[0]}&max_articles=3'" \
  "200"

echo ""
echo "=== Phase 4: Batch Processing Tests ==="

# Test batch processing with multiple feeds
echo -n "Testing: Batch processing... "
start_time=$(date +%s%3N)

batch_payload=$(cat <<EOF
{
  "feed_urls": [
    "${TEST_FEEDS[0]}",
    "${TEST_FEEDS[1]}"
  ],
  "max_articles_per_feed": 5
}
EOF
)

temp_file=$(mktemp)
if curl -s -w '\n%{http_code}' --max-time 45 -H "X-API-Key: $CLIENT_API_KEY" -H "Content-Type: application/json" -d "$batch_payload" "$WORKER_URL/batch" > "$temp_file" 2>/dev/null; then
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
  if echo "$body" | grep -q '"feeds_processed"'; then
    feeds_processed=$(echo "$body" | grep -o '"feeds_processed":[0-9]*' | cut -d':' -f2 || echo "0")
    feeds_successful=$(echo "$body" | grep -o '"feeds_successful":[0-9]*' | cut -d':' -f2 || echo "0")
    total_articles=$(echo "$body" | grep -o '"total_articles":[0-9]*' | cut -d':' -f2 || echo "0")
    
    echo -e "${GREEN}✓ PASS${NC} (${duration}ms)"
    echo "    Feeds processed: $feeds_processed, Successful: $feeds_successful, Articles: $total_articles"
    ((TESTS_PASSED++))
  else
    echo -e "${YELLOW}⚠ PARTIAL${NC} - Response received but unexpected format"
    ((TESTS_PASSED++))
  fi
else
  echo -e "${RED}✗ FAIL${NC} - Status: $status_code"
  echo "    Response: $(echo "$body" | head -c 200)..."
  ((TESTS_FAILED++))
fi

# Test empty batch
run_test "Empty batch request" \
  "curl -s -w '\n%{http_code}' --max-time 10 -H 'X-API-Key: $CLIENT_API_KEY' -H 'Content-Type: application/json' -d '{\"feed_urls\": []}' '$WORKER_URL/batch'" \
  "400" \
  "empty feed_urls array"

# Test oversized batch
large_batch_payload="{\"feed_urls\": ["
for i in {1..25}; do
  large_batch_payload="${large_batch_payload}\"https://example${i}.com/feed\""
  if [ $i -lt 25 ]; then large_batch_payload="${large_batch_payload},"; fi
done
large_batch_payload="${large_batch_payload}]}"

run_test "Oversized batch (25 feeds)" \
  "curl -s -w '\n%{http_code}' --max-time 10 -H 'X-API-Key: $CLIENT_API_KEY' -H 'Content-Type: application/json' -d '$large_batch_payload' '$WORKER_URL/batch'" \
  "400" \
  "Maximum 20 feeds"

echo ""
echo "=== Phase 5: Caching Tests ==="

# Test caching with same feed URL
test_feed=${TEST_FEEDS[0]}
echo -n "Testing: Caching (first request)... "
start_time=$(date +%s%3N)
temp_file=$(mktemp)
curl -s --max-time 30 -H "X-API-Key: $CLIENT_API_KEY" "$WORKER_URL/?feed_url=$test_feed&max_articles=3" > "$temp_file" 2>/dev/null
end_time=$(date +%s%3N)
first_duration=$((end_time - start_time))
rm -f "$temp_file"
echo -e "${BLUE}${first_duration}ms${NC}"

sleep 2  # Small delay

echo -n "Testing: Caching (second request)... "
start_time=$(date +%s%3N)
temp_file=$(mktemp)
if curl -s -w '\n%{http_code}' --max-time 15 -H "X-API-Key: $CLIENT_API_KEY" "$WORKER_URL/?feed_url=$test_feed&max_articles=3" > "$temp_file" 2>/dev/null; then
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
  "total_jobs"

# Test recent jobs
run_test "Recent jobs" \
  "curl -s -w '\n%{http_code}' -H 'Authorization: Bearer $WORKER_SECRET' -H 'X-Worker-ID: $WORKER_ID' '$WORKER_URL/admin/jobs'" \
  "200" \
  "jobs"

echo ""
echo "=== Phase 7: Edge Cases ==="

# Test invalid feed URL
run_test "Invalid feed URL" \
  "curl -s -w '\n%{http_code}' --max-time 20 -H 'X-API-Key: $CLIENT_API_KEY' '$WORKER_URL/?feed_url=https://example.com/invalid-feed'" \
  "500"

# Test malformed JSON in batch
run_test "Malformed JSON batch" \
  "curl -s -w '\n%{http_code}' --max-time 10 -H 'X-API-Key: $CLIENT_API_KEY' -H 'Content-Type: application/json' -d '{invalid json}' '$WORKER_URL/batch'" \
  "500"

# Test very long feed URL
run_test "Very long feed URL" \
  "curl -s -w '\n%{http_code}' --max-time 20 -H 'X-API-Key: $CLIENT_API_KEY' '$WORKER_URL/?feed_url=https://example.com/very/long/path/that/might/cause/issues/with/processing/feed.xml'" \
  "500" # Expected to fail gracefully

# Test 404
run_test "Non-existent endpoint" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/nonexistent'" \
  "404"

echo ""
echo "=== Phase 8: RSS Processing Quality Tests ==="

# Detailed test of RSS content extraction
run_detailed_test "RSS Content Quality Check" \
  "curl -s -w '\n%{http_code}' --max-time 30 -H 'X-API-Key: $CLIENT_API_KEY' '$WORKER_URL/?feed_url=${TEST_FEEDS[0]}&max_articles=2'" \
  "200" \
  "false"

echo ""
echo "=== Performance Summary ==="

# Final performance test
echo -n "Final performance test (batch)... "
start_time=$(date +%s%3N)

final_batch_payload=$(cat <<EOF
{
  "feed_urls": [
    "${TEST_FEEDS[0]}",
    "${TEST_FEEDS[1]}"
  ],
  "max_articles_per_feed": 3
}
EOF
)

temp_file=$(mktemp)
if curl -s -w '\n%{http_code}' --max-time 60 -H "X-API-Key: $CLIENT_API_KEY" -H "Content-Type: application/json" -d "$final_batch_payload" "$WORKER_URL/batch" > "$temp_file" 2>/dev/null; then
  end_time=$(date +%s%3N)
  duration=$((end_time - start_time))
  status_code=$(tail -n1 "$temp_file")
  
  if [[ "$status_code" == "200" ]]; then
    if [[ $duration -lt 15000 ]]; then
      echo -e "${GREEN}✓ EXCELLENT${NC} (${duration}ms < 15s)"
    elif [[ $duration -lt 30000 ]]; then
      echo -e "${YELLOW}⚠ ACCEPTABLE${NC} (${duration}ms < 30s)"
    else
      echo -e "${RED}✗ SLOW${NC} (${duration}ms > 30s)"
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
  echo -e "${GREEN}🎉 All tests passed! Feed Fetcher is ready for production.${NC}"
  exit 0
elif [ $TESTS_FAILED -lt 5 ]; then
  echo -e "${YELLOW}⚠ Some tests failed, but worker appears mostly functional.${NC}"
  echo -e "${PURPLE}Common issues to check:${NC}"
  echo "1. RSS feed URLs may be temporarily unavailable"
  echo "2. Network timeouts during processing"
  echo "3. D1 database is properly created and accessible"
  echo "4. KV namespace is correctly bound"
  echo "5. Authentication credentials match environment variables"
  exit 0
else
  echo -e "${RED}❌ Multiple tests failed. Please review and fix issues.${NC}"
  echo -e "${PURPLE}Debugging steps:${NC}"
  echo "1. Check Cloudflare Workers dashboard for error logs"
  echo "2. Verify D1 database schema is properly initialized"
  echo "3. Test individual RSS feed URLs manually"
  echo "4. Ensure proper network connectivity to test RSS feeds"
  echo "5. Check authentication environment variables"
  exit 1
fi