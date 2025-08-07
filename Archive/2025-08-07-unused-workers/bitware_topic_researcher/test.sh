#!/bin/bash

# Migration-Safe Test Script for Enhanced Topic Researcher
# Tests both legacy and new analytics features

WORKER_URL="https://bitware-topic-researcher.jhaladik.workers.dev"
CLIENT_API_KEY="external-client-api-key-2024"
WORKER_SECRET="internal-worker-auth-token-2024"
WORKER_ID="bitware_topic_researcher"

echo "🔄 Migration-Safe Topic Researcher Test Suite"
echo "Testing legacy features + new analytics capabilities..."
echo "Worker URL: $WORKER_URL"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

run_test() {
  local test_name="$1"
  local curl_command="$2"
  local expected_status="$3"
  local expected_content="$4"
  
  echo -n "Testing: $test_name... "
  
  start_time=$(date +%s%3N)
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
  rm -f "$temp_file"
  
  if [[ "$curl_success" == "false" ]]; then
    echo -e "${RED}✗ FAIL${NC} - Connection failed"
    ((TESTS_FAILED++))
    return
  fi
  
  if [[ "$status_code" == "$expected_status" ]]; then
    if [[ -z "$expected_content" ]] || echo "$body" | grep -q "$expected_content"; then
      echo -e "${GREEN}✓ PASS${NC} (${duration}ms)"
      ((TESTS_PASSED++))
      
      # Show analytics data if available
      if [[ "$test_name" == *"Analytics"* ]] && [[ "$status_code" == "200" ]]; then
        analytics_version=$(echo "$body" | grep -o '"analytics_version":"[^"]*"' | cut -d'"' -f4)
        if [[ -n "$analytics_version" ]]; then
          echo "    📊 Analytics mode: $analytics_version"
        fi
      fi
      
    else
      echo -e "${RED}✗ FAIL${NC} - Content mismatch"
      ((TESTS_FAILED++))
    fi
  else
    echo -e "${RED}✗ FAIL${NC} - Status: $status_code"
    ((TESTS_FAILED++))
  fi
}

echo "=== Phase 1: Basic Functionality Tests ==="

run_test "Help endpoint" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/help'" \
  "200" \
  "bitware_topic_researcher"

run_test "Health check" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/health'" \
  "200" \
  "status"

echo ""
echo "=== Phase 2: Research Functionality Tests ==="

# Test basic research
run_test "Basic research functionality" \
  "curl -s -w '\n%{http_code}' --max-time 45 -H 'X-API-Key: $CLIENT_API_KEY' '$WORKER_URL/?topic=test%20migration&depth=1'" \
  "200" \
  "sources"

echo ""
echo "=== Phase 3: Admin Endpoints Tests ==="

run_test "Admin stats (existing)" \
  "curl -s -w '\n%{http_code}' -H 'Authorization: Bearer $WORKER_SECRET' -H 'X-Worker-ID: $WORKER_ID' '$WORKER_URL/admin/stats'" \
  "200" \
  "total_sessions"

run_test "Admin sessions (existing)" \
  "curl -s -w '\n%{http_code}' -H 'Authorization: Bearer $WORKER_SECRET' -H 'X-Worker-ID: $WORKER_ID' '$WORKER_URL/admin/sessions'" \
  "200" \
  "sessions"

echo ""
echo "=== Phase 4: New Analytics Endpoints Tests ==="

# Test new analytics endpoint - should work with or without migration
run_test "Analytics endpoint (24h)" \
  "curl -s -w '\n%{http_code}' -H 'Authorization: Bearer $WORKER_SECRET' -H 'X-Worker-ID: $WORKER_ID' '$WORKER_URL/admin/analytics?time_range=24h'" \
  "200" \
  "performance_trends"

run_test "Analytics endpoint (7d)" \
  "curl -s -w '\n%{http_code}' -H 'Authorization: Bearer $WORKER_SECRET' -H 'X-Worker-ID: $WORKER_ID' '$WORKER_URL/admin/analytics?time_range=7d'" \
  "200" \
  "top_quality_topics"

run_test "Performance metrics endpoint" \
  "curl -s -w '\n%{http_code}' -H 'Authorization: Bearer $WORKER_SECRET' -H 'X-Worker-ID: $WORKER_ID' '$WORKER_URL/admin/performance'" \
  "200" \
  "overall_performance"

echo ""
echo "=== Phase 5: Migration Status Check ==="

# Check if migration has been applied
echo -n "Checking migration status... "
temp_file=$(mktemp)
if curl -s -H "Authorization: Bearer $WORKER_SECRET" -H "X-Worker-ID: $WORKER_ID" "$WORKER_URL/admin/analytics?time_range=24h" > "$temp_file" 2>/dev/null; then
  
  analytics_version=$(grep -o '"analytics_version":"[^"]*"' "$temp_file" | cut -d'"' -f4)
  
  if [[ "$analytics_version" == "enhanced" ]]; then
    echo -e "${GREEN}✓ MIGRATION COMPLETE${NC}"
    echo "    📈 Enhanced analytics with performance tracking active"
    ((TESTS_PASSED++))
  elif [[ "$analytics_version" == "basic" ]]; then
    echo -e "${YELLOW}⚠ MIGRATION PENDING${NC}"
    echo "    📊 Basic analytics mode - run migration script to enable full features"
    ((TESTS_PASSED++))
    echo ""
    echo -e "${BLUE}To complete migration:${NC}"
    echo "wrangler d1 execute topic-research-db --file=migration_analytics.sql --remote"
  else
    echo -e "${RED}✗ UNKNOWN STATUS${NC}"
    ((TESTS_FAILED++))
  fi
else
  echo -e "${RED}✗ MIGRATION CHECK FAILED${NC}"
  ((TESTS_FAILED++))
fi
rm -f "$temp_file"

echo ""
echo "=== Test Summary ==="

total_tests=$((TESTS_PASSED + TESTS_FAILED))
success_rate=$((TESTS_PASSED * 100 / total_tests))

echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Success rate: ${BLUE}$success_rate%${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
  echo ""
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  echo -e "${GREEN}✅ Enhanced Topic Researcher is working correctly${NC}"
  echo ""
  echo -e "${BLUE}📊 Available Analytics Endpoints:${NC}"
  echo "  • GET /admin/analytics?time_range=24h|7d|30d"
  echo "  • GET /admin/performance"
  echo "  • GET /admin/stats (legacy)"
  echo "  • GET /admin/sessions (legacy)"
  echo ""
  exit 0
else
  echo ""
  echo -e "${RED}❌ Some tests failed. Check the output above.${NC}"
  exit 1
fi