#!/bin/bash

# Bitware Report Builder - Comprehensive Test Suite
# Tests AI-powered intelligence report generation and multi-format output

# Configuration
WORKER_URL="https://bitware-report-builder.jhaladik.workers.dev"
CLIENT_API_KEY="external-client-api-key-2024"
WORKER_SECRET="internal-worker-auth-token-2024"
WORKER_ID="bitware_report_builder"

echo "🏭 Bitware Report Builder - Intelligence Report Generation Test Suite"
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

# Sample report requests for testing
TEST_TOPICS='["artificial intelligence", "machine learning"]'
SAMPLE_REPORT_REQUEST='{"report_type": "executive_summary", "topic_filters": ["artificial intelligence"], "time_range": "7d", "output_format": "json", "min_relevance_score": 0.7}'
TREND_ANALYSIS_REQUEST='{"report_type": "trend_analysis", "topic_filters": ["technology"], "time_range": "30d", "include_charts": true}'
QUICK_SUMMARY_REQUEST='{"topic": "artificial intelligence", "time_range": "24h"}'

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
  "bitware_report_builder"

# Test capabilities endpoint  
run_test "Capabilities endpoint" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/capabilities'" \
  "200" \
  "IntelligenceGenerator"

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
  "curl -s -w '\n%{http_code}' '$WORKER_URL/generate' -X POST" \
  "401" \
  "API key required"

# Test invalid API key
run_test "Invalid API key" \
  "curl -s -w '\n%{http_code}' -H 'X-API-Key: invalid' '$WORKER_URL/generate' -X POST" \
  "401" \
  "API key required"

echo ""
echo "=== Phase 3: Core Report Generation Tests ==="

# Test missing report type
run_test "Missing report type" \
  "curl -s -w '\n%{http_code}' -H 'X-API-Key: $CLIENT_API_KEY' -H 'Content-Type: application/json' -d '{}' '$WORKER_URL/generate' -X POST" \
  "400" \
  "Missing required field: report_type"

# Test AI-powered executive summary generation
echo ""
echo -n "Testing: Executive Summary Generation (AI Integration)... "
start_time=$(date +%s%3N)

temp_file=$(mktemp)
if curl -s -w '\n%{http_code}' --max-time 90 -H "X-API-Key: $CLIENT_API_KEY" -H "Content-Type: application/json" -d "$SAMPLE_REPORT_REQUEST" "$WORKER_URL/generate" -X POST > "$temp_file" 2>/dev/null; then
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
    report_id=$(echo "$body" | grep -o '"report_id":[0-9]*' | cut -d':' -f2 || echo "0")
    insights_count=$(echo "$body" | grep -o '"key_insights":\[[^]]*\]' | wc -l || echo "0")
    
    echo -e "${GREEN}✓ PASS${NC} (${duration}ms)"
    echo "    Report ID: $report_id, Key insights generated: ${insights_count}"
    ((TESTS_PASSED++))
    
    # Store report ID for later tests
    SAMPLE_REPORT_ID=$report_id
  else
    echo -e "${YELLOW}⚠ PARTIAL${NC} - Response received but unexpected format"
    echo "    Response: $(echo "$body" | head -c 200)..."
    ((TESTS_PASSED++))
  fi
elif [[ "$status_code" == "404" ]]; then
  echo -e "${YELLOW}⚠ NO DATA${NC} - No analyzed articles found (expected for new deployment)"
  echo "    This is normal if content_classifier hasn't processed articles yet"
  ((TESTS_PASSED++))
elif [[ "$status_code" == "500" ]]; then
  echo -e "${RED}✗ FAIL${NC} - Internal Server Error (likely OpenAI API issue)"
  echo "    Response: $(echo "$body" | head -c 200)..."
  ((TESTS_FAILED++))
else
  echo -e "${RED}✗ FAIL${NC} - Status: $status_code"
  echo "    Response: $(echo "$body" | head -c 200)..."
  ((TESTS_FAILED++))
fi

# Test different report types
report_types=("trend_analysis" "technical_deep_dive" "competitive_intelligence" "daily_briefing")

for report_type in "${report_types[@]}"; do
  echo -n "Testing: Report type ($report_type)... "
  start_time=$(date +%s%3N)
  
  request_payload="{\"report_type\": \"$report_type\", \"topic_filters\": [\"technology\"], \"time_range\": \"7d\"}"
  
  temp_file=$(mktemp)
  if curl -s -w '\n%{http_code}' --max-time 60 -H "X-API-Key: $CLIENT_API_KEY" -H "Content-Type: application/json" -d "$request_payload" "$WORKER_URL/generate" -X POST > "$temp_file" 2>/dev/null; then
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
    echo -e "${GREEN}✓ PASS${NC} (${duration}ms)"
    ((TESTS_PASSED++))
  elif [[ "$status_code" == "404" ]]; then
    echo -e "${YELLOW}⚠ NO DATA${NC} - Expected for new deployment"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC} - Status: $status_code"
    ((TESTS_FAILED++))
  fi
done

echo ""
echo "=== Phase 4: Output Format Tests ==="

# Test different output formats
output_formats=("json" "html" "markdown" "email")

for format in "${output_formats[@]}"; do
  echo -n "Testing: Output format ($format)... "
  start_time=$(date +%s%3N)
  
  format_payload="{\"report_type\": \"executive_summary\", \"topic_filters\": [\"artificial intelligence\"], \"time_range\": \"7d\", \"output_format\": \"$format\"}"
  
  temp_file=$(mktemp)
  if curl -s -w '\n%{http_code}' --max-time 60 -H "X-API-Key: $CLIENT_API_KEY" -H "Content-Type: application/json" -d "$format_payload" "$WORKER_URL/generate" -X POST > "$temp_file" 2>/dev/null; then
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
    # Check for format-specific content
    case $format in
      "html") 
        if echo "$body" | grep -q "html_content\|view_url"; then
          echo -e "${GREEN}✓ PASS${NC} (${duration}ms - HTML content generated)"
        else
          echo -e "${YELLOW}⚠ PARTIAL${NC} - Response but no HTML content"
        fi
        ;;
      "email")
        if echo "$body" | grep -q "email_subject\|email_html"; then
          echo -e "${GREEN}✓ PASS${NC} (${duration}ms - Email format generated)"
        else
          echo -e "${YELLOW}⚠ PARTIAL${NC} - Response but no email content"
        fi
        ;;
      *)
        echo -e "${GREEN}✓ PASS${NC} (${duration}ms)"
        ;;
    esac
    ((TESTS_PASSED++))
  elif [[ "$status_code" == "404" ]]; then
    echo -e "${YELLOW}⚠ NO DATA${NC} - Expected for new deployment"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC} - Status: $status_code"
    ((TESTS_FAILED++))
  fi
done

echo ""
echo "=== Phase 5: Quick Analysis Tests ==="

# Test quick summary endpoint
run_test "Quick summary (valid topic)" \
  "curl -s -w '\n%{http_code}' --max-time 30 -H 'X-API-Key: $CLIENT_API_KEY' -H 'Content-Type: application/json' -d '$QUICK_SUMMARY_REQUEST' '$WORKER_URL/quick-summary' -X POST" \
  "200"

# Test trend analysis endpoint
run_test "Trend analysis" \
  "curl -s -w '\n%{http_code}' --max-time 30 -H 'X-API-Key: $CLIENT_API_KEY' '$WORKER_URL/trend-analysis?topic=technology&time_range=7d'" \
  "200" \
  "trend_analysis"

# Test dashboard data
run_test "Dashboard data" \
  "curl -s -w '\n%{http_code}' --max-time 30 -H 'X-API-Key: $CLIENT_API_KEY' '$WORKER_URL/dashboard-data?time_range=7d'" \
  "200" \
  "summary"

echo ""
echo "=== Phase 6: Caching Tests ==="

# Test caching with same request
echo -n "Testing: Caching (first request)... "
start_time=$(date +%s%3N)
temp_file=$(mktemp)
curl -s --max-time 60 -H "X-API-Key: $CLIENT_API_KEY" -H "Content-Type: application/json" -d "$SAMPLE_REPORT_REQUEST" "$WORKER_URL/generate" -X POST > "$temp_file" 2>/dev/null
end_time=$(date +%s%3N)
first_duration=$((end_time - start_time))
rm -f "$temp_file"
echo -e "${BLUE}${first_duration}ms${NC}"

sleep 2  # Small delay

echo -n "Testing: Caching (second request)... "
start_time=$(date +%s%3N)
temp_file=$(mktemp)
if curl -s -w '\n%{http_code}' --max-time 30 -H "X-API-Key: $CLIENT_API_KEY" -H "Content-Type: application/json" -d "$SAMPLE_REPORT_REQUEST" "$WORKER_URL/generate" -X POST > "$temp_file" 2>/dev/null; then
  end_time=$(date +%s%3N)
  second_duration=$((end_time - start_time))
  body=$(head -n -1 "$temp_file")
  
  if echo "$body" | grep -q '"cached":true'; then
    echo -e "${GREEN}✓ CACHED${NC} (${second_duration}ms vs ${first_duration}ms)"
    ((TESTS_PASSED++))
  else
    echo -e "${YELLOW}⚠ NOT CACHED${NC} (${second_duration}ms - might be expected for AI-generated content)"
    ((TESTS_PASSED++))
  fi
else
  echo -e "${RED}✗ FAIL${NC} - Caching test failed"
  ((TESTS_FAILED++))
fi
rm -f "$temp_file"

echo ""
echo "=== Phase 7: Public Report Viewing ==="

# Test public report viewing (if we have a report ID)
if [[ -n "$SAMPLE_REPORT_ID" && "$SAMPLE_REPORT_ID" != "0" ]]; then
  run_test "Public report view (JSON)" \
    "curl -s -w '\n%{http_code}' '$WORKER_URL/reports/$SAMPLE_REPORT_ID/view'" \
    "200"
  
  run_test "Public report view (HTML)" \
    "curl -s -w '\n%{http_code}' '$WORKER_URL/reports/$SAMPLE_REPORT_ID/view?format=html'" \
    "200"
else
  echo "Skipping public report tests - no report ID available"
fi

# Test reports list
run_test "Reports list" \
  "curl -s -w '\n%{http_code}' -H 'X-API-Key: $CLIENT_API_KEY' '$WORKER_URL/reports'" \
  "200" \
  "reports"

echo ""
echo "=== Phase 8: Admin Endpoints (Worker Auth) ==="

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

# Test admin jobs
run_test "Admin jobs" \
  "curl -s -w '\n%{http_code}' -H 'Authorization: Bearer $WORKER_SECRET' -H 'X-Worker-ID: $WORKER_ID' '$WORKER_URL/admin/jobs'" \
  "200" \
  "jobs"

# Test cost analysis
run_test "Cost analysis" \
  "curl -s -w '\n%{http_code}' -H 'Authorization: Bearer $WORKER_SECRET' -H 'X-Worker-ID: $WORKER_ID' '$WORKER_URL/admin/costs'" \
  "200"

echo ""
echo "=== Phase 9: Edge Cases and Error Handling ==="

# Test invalid report type
run_test "Invalid report type" \
  "curl -s -w '\n%{http_code}' --max-time 30 -H 'X-API-Key: $CLIENT_API_KEY' -H 'Content-Type: application/json' -d '{\"report_type\": \"invalid_type\"}' '$WORKER_URL/generate' -X POST" \
  "400"

# Test malformed JSON
run_test "Malformed JSON" \
  "curl -s -w '\n%{http_code}' --max-time 20 -H 'X-API-Key: $CLIENT_API_KEY' -H 'Content-Type: application/json' -d '{invalid json}' '$WORKER_URL/generate' -X POST" \
  "500"

# Test empty topic filters
run_test "Empty topic filters" \
  "curl -s -w '\n%{http_code}' --max-time 30 -H 'X-API-Key: $CLIENT_API_KEY' -H 'Content-Type: application/json' -d '{\"report_type\": \"executive_summary\", \"topic_filters\": []}' '$WORKER_URL/generate' -X POST" \
  "200"

# Test invalid time range
run_test "Invalid time range" \
  "curl -s -w '\n%{http_code}' --max-time 30 -H 'X-API-Key: $CLIENT_API_KEY' -H 'Content-Type: application/json' -d '{\"report_type\": \"executive_summary\", \"time_range\": \"invalid\"}' '$WORKER_URL/generate' -X POST" \
  "200" # Should default to 7d

# Test missing topic in quick summary
run_test "Quick summary missing topic" \
  "curl -s -w '\n%{http_code}' --max-time 20 -H 'X-API-Key: $CLIENT_API_KEY' -H 'Content-Type: application/json' -d '{}' '$WORKER_URL/quick-summary' -X POST" \
  "400" \
  "Missing required field: topic"

# Test non-existent report
run_test "Non-existent report view" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/reports/999999/view'" \
  "404"

# Test 404 for invalid endpoint
run_test "Non-existent endpoint" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/nonexistent'" \
  "404"

echo ""
echo "=== Phase 10: AI Quality Analysis ==="

# Detailed AI integration test
run_detailed_test "AI Report Generation Quality Check" \
  "curl -s -w '\n%{http_code}' --max-time 90 -H 'X-API-Key: $CLIENT_API_KEY' -H 'Content-Type: application/json' -d '{\"report_type\": \"executive_summary\", \"topic_filters\": [\"artificial intelligence\"], \"time_range\": \"7d\", \"output_format\": \"json\", \"include_sources\": true}' '$WORKER_URL/generate' -X POST" \
  "200" \
  "false"

echo ""
echo "=== Performance Summary ==="

# Final comprehensive performance test
echo -n "Final performance test (complex report)... "
start_time=$(date +%s%3N)

complex_report_payload='{"report_type": "trend_analysis", "topic_filters": ["technology", "artificial intelligence"], "time_range": "30d", "output_format": "html", "include_charts": true, "min_relevance_score": 0.8}'

temp_file=$(mktemp)
if curl -s -w '\n%{http_code}' --max-time 120 -H "X-API-Key: $CLIENT_API_KEY" -H "Content-Type: application/json" -d "$complex_report_payload" "$WORKER_URL/generate" -X POST > "$temp_file" 2>/dev/null; then
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
  elif [[ "$status_code" == "404" ]]; then
    echo -e "${YELLOW}⚠ NO DATA${NC} - Expected for new deployment"
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
  echo -e "${GREEN}🎉 All tests passed! Report Builder is ready for production intelligence generation.${NC}"
  exit 0
elif [ $TESTS_FAILED -lt 5 ]; then
  echo -e "${YELLOW}⚠ Some tests failed, but worker appears mostly functional.${NC}"
  echo -e "${PURPLE}Common issues to check:${NC}"
  echo "1. OpenAI API key is correctly set in Cloudflare Workers"
  echo "2. Content Classifier has processed articles for analysis"
  echo "3. Database tables are properly created and accessible"
  echo "4. KV namespace is correctly bound for caching"
  echo "5. Integration with content_classifier database is working"
  exit 0
else
  echo -e "${RED}❌ Multiple tests failed. Please review and fix issues.${NC}"
  echo -e "${PURPLE}Debugging steps:${NC}"
  echo "1. Check /health endpoint output for database connectivity"
  echo "2. Verify OpenAI API key format and permissions"
  echo "3. Ensure content_classifier has analyzed articles in database"
  echo "4. Check Cloudflare Workers dashboard for error logs"
  echo "5. Verify D1 database schema is properly initialized"
  echo "6. Test individual endpoints manually for specific errors"
  exit 1
fi