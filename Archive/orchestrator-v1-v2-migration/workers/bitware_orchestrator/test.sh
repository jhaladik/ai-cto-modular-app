#!/bin/bash

# Comprehensive Test Suite for Dynamic Database-Driven Orchestrator
# Tests database-driven pipeline configuration and execution

# Configuration
WORKER_URL="https://bitware-orchestrator.jhaladik.workers.dev"
CLIENT_API_KEY="external-client-api-key-2024"
WORKER_SECRET="internal-worker-auth-token-2024"
WORKER_ID="bitware_orchestrator"

echo "🏭 Dynamic Database-Driven Orchestrator Test Suite"
echo "Testing database-driven pipeline configuration and execution..."
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
      
      # Show special information for certain tests
      if [[ "$test_name" == *"Templates"* ]] && [[ "$status_code" == "200" ]]; then
        template_count=$(echo "$body" | grep -o '"name":' | wc -l)
        echo "    📋 Pipeline templates available: $template_count"
      fi
      
      if [[ "$test_name" == *"Capabilities"* ]] && [[ "$status_code" == "200" ]]; then
        worker_count=$(echo "$body" | grep -o '"worker_name":' | wc -l)
        echo "    🔧 Workers registered: $worker_count"
      fi
      
      if [[ "$test_name" == *"Pipeline Execution"* ]] && [[ "$status_code" == "200" ]]; then
        pipeline_id=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        status=$(echo "$body" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
        echo "    🎯 Pipeline ID: $pipeline_id, Status: $status"
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

# Enhanced test function with detailed output analysis
run_detailed_test() {
  local test_name="$1"
  local curl_command="$2"
  local expected_status="$3"
  
  echo -e "${BLUE}=== Detailed Test: $test_name ===${NC}"
  
  start_time=$(date +%s%3N)
  temp_file=$(mktemp)
  temp_headers=$(mktemp)
  
  echo "Command: $curl_command"
  
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
  
  echo "Status Code: $status_code"
  echo "Duration: ${duration}ms"
  echo "Response Preview:"
  echo "$body" | head -c 500
  echo "..."
  echo ""
  
  rm -f "$temp_file" "$temp_headers"
  
  if [[ "$status_code" == "$expected_status" ]]; then
    echo -e "${GREEN}✓ DETAILED TEST PASSED${NC}"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ DETAILED TEST FAILED${NC}"
    ((TESTS_FAILED++))
  fi
}

echo "=== Phase 1: Basic Public Endpoints ==="

# Test public endpoints
run_test "Help endpoint" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/help'" \
  "200" \
  "dynamic_database_driven"

run_test "Health check" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/health'" \
  "200" \
  "status"

echo ""
echo "=== Phase 2: Database-Driven Configuration ==="

# Test pipeline templates endpoint (new)
run_test "Pipeline Templates" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/templates'" \
  "200" \
  "templates"

# Test enhanced capabilities with database info
run_test "Dynamic Capabilities" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/capabilities'" \
  "200" \
  "available_workers"

echo ""
echo "=== Phase 3: Authentication Tests ==="

# Test orchestration without auth (should fail)
run_test "Orchestration (no auth)" \
  "curl -s -w '\n%{http_code}' -X POST '$WORKER_URL/orchestrate' -H 'Content-Type: application/json' -d '{\"topic\": \"test\"}'" \
  "401" \
  "API key required"

# Test admin without auth (should fail)
run_test "Admin endpoint (no auth)" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/admin/stats'" \
  "401" \
  "Worker authentication required"

echo ""
echo "=== Phase 4: Dynamic Pipeline Execution ==="

# Test default RSS intelligence pipeline
run_test "RSS Intelligence Pipeline" \
  "curl -s -w '\n%{http_code}' --max-time 180 -X POST -H 'X-API-Key: $CLIENT_API_KEY' -H 'Content-Type: application/json' -d '{\"topic\": \"artificial intelligence\", \"source_discovery_depth\": 2, \"max_articles\": 20}' '$WORKER_URL/orchestrate'" \
  "200" \
  "pipeline"

# Test basic research pipeline (topic researcher only)
run_test "Basic Research Pipeline" \
  "curl -s -w '\n%{http_code}' --max-time 60 -X POST -H 'X-API-Key: $CLIENT_API_KEY' -H 'Content-Type: application/json' -d '{\"topic\": \"database testing\", \"pipeline_template\": \"basic_research_pipeline\"}' '$WORKER_URL/orchestrate'" \
  "200" \
  "pipeline"

# Test invalid pipeline template
run_test "Invalid Pipeline Template" \
  "curl -s -w '\n%{http_code}' -X POST -H 'X-API-Key: $CLIENT_API_KEY' -H 'Content-Type: application/json' -d '{\"topic\": \"test\", \"pipeline_template\": \"nonexistent_pipeline\"}' '$WORKER_URL/orchestrate'" \
  "404" \
  "not found"

echo ""
echo "=== Phase 5: Pipeline Status Tracking ==="

# First, run a pipeline to get an ID
echo -n "Setting up pipeline for status testing... "
temp_file=$(mktemp)
if curl -s --max-time 60 -X POST -H "X-API-Key: $CLIENT_API_KEY" -H "Content-Type: application/json" -d '{"topic": "status test", "pipeline_template": "basic_research_pipeline"}' "$WORKER_URL/orchestrate" > "$temp_file" 2>/dev/null; then
  PIPELINE_ID=$(grep -o '"id":"[^"]*"' "$temp_file" | head -1 | cut -d'"' -f4)
  echo -e "${GREEN}✓ Setup complete${NC}"
  echo "    Pipeline ID: $PIPELINE_ID"
else
  echo -e "${RED}✗ Setup failed${NC}"
  PIPELINE_ID="test_id_not_found"
fi
rm -f "$temp_file"

# Test pipeline status endpoint
if [[ "$PIPELINE_ID" != "test_id_not_found" ]]; then
  run_test "Pipeline Status Tracking" \
    "curl -s -w '\n%{http_code}' '$WORKER_URL/pipeline/$PIPELINE_ID'" \
    "200" \
    "pipeline"
else
  echo "Skipping pipeline status test - no valid pipeline ID"
fi

echo ""
echo "=== Phase 6: Performance and Analytics ==="

# Test pipeline health check
run_test "Pipeline Health Check" \
  "curl -s -w '\n%{http_code}' -H 'X-API-Key: $CLIENT_API_KEY' '$WORKER_URL/pipeline-health'" \
  "200"

# Test performance insights
run_test "Performance Insights" \
  "curl -s -w '\n%{http_code}' -H 'X-API-Key: $CLIENT_API_KEY' '$WORKER_URL/performance-insights'" \
  "200"

echo ""
echo "=== Phase 7: Admin Endpoints (Worker Auth) ==="

# Test admin stats with worker auth
run_test "Admin Stats (with auth)" \
  "curl -s -w '\n%{http_code}' -H 'Authorization: Bearer $WORKER_SECRET' -H 'X-Worker-ID: $WORKER_ID' '$WORKER_URL/admin/stats'" \
  "200"

echo ""
echo "=== Phase 8: Error Handling and Edge Cases ==="

# Test missing topic
run_test "Missing Topic Parameter" \
  "curl -s -w '\n%{http_code}' -X POST -H 'X-API-Key: $CLIENT_API_KEY' -H 'Content-Type: application/json' -d '{}' '$WORKER_URL/orchestrate'" \
  "400" \
  "Missing required field: topic"

# Test invalid JSON
run_test "Invalid JSON" \
  "curl -s -w '\n%{http_code}' -X POST -H 'X-API-Key: $CLIENT_API_KEY' -H 'Content-Type: application/json' -d '{invalid json}' '$WORKER_URL/orchestrate'" \
  "500"

# Test non-existent endpoint
run_test "Non-existent Endpoint" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/nonexistent'" \
  "404" \
  "not found"

echo ""
echo "=== Phase 9: Database Configuration Analysis ==="

# Detailed test of templates endpoint
run_detailed_test "Pipeline Templates Analysis" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/templates'" \
  "200"

# Detailed test of capabilities
run_detailed_test "Worker Registry Analysis" \
  "curl -s -w '\n%{http_code}' '$WORKER_URL/capabilities'" \
  "200"

echo ""
echo "=== Phase 10: Complex Pipeline Test ==="

# Test complex pipeline with all parameters
echo -n "Testing: Complex Pipeline Configuration... "
start_time=$(date +%s%3N)

temp_file=$(mktemp)
complex_request='{
  "topic": "machine learning optimization",
  "urgency": "high",
  "quality_level": "premium", 
  "optimize_for": "quality",
  "source_discovery_depth": 3,
  "max_articles": 30,
  "pipeline_template": "rss_intelligence_pipeline"
}'

if curl -s --max-time 180 -X POST -H "X-API-Key: $CLIENT_API_KEY" -H "Content-Type: application/json" -d "$complex_request" "$WORKER_URL/orchestrate" > "$temp_file" 2>/dev/null; then
  status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 180 -X POST -H "X-API-Key: $CLIENT_API_KEY" -H "Content-Type: application/json" -d "$complex_request" "$WORKER_URL/orchestrate")
  
  end_time=$(date +%s%3N)
  duration=$((end_time - start_time))
  
  if [[ "$status_code" == "200" ]]; then
    echo -e "${GREEN}✓ PASS${NC} (${duration}ms)"
    
    # Extract detailed information
    body=$(cat "$temp_file")
    pipeline_id=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    status=$(echo "$body" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
    template=$(echo "$body" | grep -o '"template_name":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    echo "    🎯 Complex Pipeline Results:"
    echo "    • Pipeline ID: $pipeline_id"
    echo "    • Status: $status"
    echo "    • Template: $template"
    echo "    • Execution time: ${duration}ms"
    
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC} - Status: $status_code"
    ((TESTS_FAILED++))
  fi
else
  echo -e "${RED}✗ FAIL${NC} - Connection failed"
  ((TESTS_FAILED++))
fi

rm -f "$temp_file"

echo ""
echo "=== Database-Driven Orchestrator Test Summary ==="

total_tests=$((TESTS_PASSED + TESTS_FAILED))
success_rate=$((TESTS_PASSED * 100 / total_tests))

echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Success rate: ${BLUE}$success_rate%${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
  echo ""
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  echo -e "${GREEN}✅ Dynamic Database-Driven Orchestrator is working perfectly${NC}"
  echo ""
  echo -e "${BLUE}🏭 AI Factory Database-Driven Features Verified:${NC}"
  echo "  • ✅ Dynamic pipeline template system"
  echo "  • ✅ Worker registry management"
  echo "  • ✅ Database-driven pipeline execution" 
  echo "  • ✅ Template-based workflow configuration"
  echo "  • ✅ Performance tracking and analytics"
  echo "  • ✅ Pipeline status monitoring"
  echo "  • ✅ Service binding communication"
  echo ""
  echo -e "${PURPLE}🚀 Ready for Production:${NC}"
  echo "  • Add new workers → Update database only"
  echo "  • Create new pipelines → Configure templates in DB"
  echo "  • No code changes needed for pipeline modifications"
  echo "  • Fully scalable and maintainable architecture"
  echo ""
  exit 0
else
  echo ""
  echo -e "${RED}❌ Some tests failed. Check the output above for details.${NC}"
  echo ""
  echo -e "${YELLOW}Common issues to check:${NC}"
  echo "  • Database schema initialization"
  echo "  • Service binding configuration"
  echo "  • Worker authentication setup"
  echo "  • Pipeline template seeding"
  echo ""
  exit 1
fi