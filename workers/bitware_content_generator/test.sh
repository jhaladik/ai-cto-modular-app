#!/bin/bash

# Test script for bitware-content-generator
# Usage: ./test.sh [local|staging|production]

ENV=${1:-local}
if [ "$ENV" = "local" ]; then
    BASE_URL="http://localhost:8787"
else
    BASE_URL="https://bitware-content-generator.jhaladik.workers.dev"
fi

echo "🧪 Testing Content Generator Worker"
echo "Environment: $ENV"
echo "Base URL: $BASE_URL"
echo "=================================="

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name=$1
    local endpoint=$2
    local method=$3
    local data=$4
    local headers=$5
    
    echo -e "\n${YELLOW}Test: $test_name${NC}"
    echo "Endpoint: $method $endpoint"
    
    if [ "$method" = "GET" ]; then
        if [ -n "$headers" ]; then
            response=$(curl -s -w "\n%{http_code}" $headers "$BASE_URL$endpoint")
        else
            response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
        fi
    else
        if [ -n "$headers" ]; then
            response=$(curl -s -w "\n%{http_code}" -X $method $headers -d "$data" "$BASE_URL$endpoint")
        else
            response=$(curl -s -w "\n%{http_code}" -X $method -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint")
        fi
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ Test passed (HTTP $http_code)${NC}"
        echo "Response: $(echo $body | jq -r '.success // .status // "OK"' 2>/dev/null || echo "OK")"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ Test failed (HTTP $http_code)${NC}"
        echo "Response: $body"
        ((TESTS_FAILED++))
    fi
}

# Test 1: Health Check
run_test "Health Check" "/" "GET"

# Test 2: Detailed Health Check
run_test "Detailed Health" "/health" "GET"

# Test 3: Help Documentation
run_test "Help Documentation" "/help" "GET"

# Test 4: List Templates (No Auth - Should Fail)
run_test "List Templates (No Auth)" "/api/templates" "GET"

# Test 5: List Templates (With Auth)
run_test "List Templates (With Auth)" "/api/templates" "GET" "" \
    "-H 'X-API-Key: test-key-123'"

# Test 6: Get Specific Template
run_test "Get Template" "/api/templates/course_overview" "GET" "" \
    "-H 'X-API-Key: test-key-123'"

# Test 7: List Jobs
run_test "List Jobs" "/api/jobs?limit=10" "GET" "" \
    "-H 'X-API-Key: test-key-123'"

# Test 8: Get Stats
run_test "Get Stats" "/api/stats" "GET" "" \
    "-H 'X-API-Key: test-key-123'"

# Test 9: Get Pricing
run_test "Get Pricing" "/api/economy/pricing" "GET" "" \
    "-H 'X-API-Key: test-key-123'"

# Test 10: Estimate Cost
estimate_data='{
  "provider": "openai",
  "model": "gpt-4o-mini",
  "structureType": "course",
  "estimatedTokens": 10000
}'
run_test "Estimate Cost" "/api/economy/estimate" "POST" "$estimate_data" \
    "-H 'Content-Type: application/json' -H 'X-API-Key: test-key-123'"

# Test 11: Execute Content Generation (Small Test)
generation_data='{
  "action": "generate",
  "input": {
    "granulatorJobId": 1,
    "topic": "Introduction to Testing",
    "structureType": "course",
    "structure": {
      "modules": [
        {
          "id": "module_1",
          "title": "Getting Started",
          "lessons": [
            {
              "id": "lesson_1",
              "title": "What is Testing?",
              "keyPoints": ["Definition", "Importance", "Types"]
            }
          ]
        }
      ]
    },
    "wordCountEstimates": {
      "total": 1000,
      "bySection": {
        "lessonContent": 500,
        "examples": 300,
        "exercises": 200
      },
      "byPriority": {
        "high": 500,
        "medium": 300,
        "low": 200
      }
    },
    "contentMetadata": {
      "standardParameters": {
        "topic": "Testing",
        "structureType": "course",
        "granularityLevel": 3,
        "targetAudience": "beginners",
        "language": "en",
        "tone": "educational",
        "style": "engaging"
      },
      "generationStrategy": {
        "approach": "hierarchical",
        "parallelizable": true,
        "dependencies": [],
        "batchSize": 5,
        "maxConcurrent": 3
      },
      "contentSpecs": {
        "contentTypes": ["instructional", "examples"],
        "requiredSections": ["overview", "lessons"],
        "optionalSections": ["exercises"]
      },
      "qualityRequirements": {
        "minQualityScore": 75,
        "readabilityTarget": 85,
        "coherenceTarget": 85,
        "completenessTarget": 90,
        "validationRequired": true
      },
      "resourceEstimates": {
        "estimatedTokens": 2000,
        "estimatedTimeMs": 5000,
        "estimatedCostUsd": 0.003
      }
    }
  },
  "config": {
    "aiProvider": "cloudflare",
    "temperature": 0.7,
    "maxTokens": 1000
  }
}'

echo -e "\n${YELLOW}Test: Content Generation (This may take a few seconds...)${NC}"
if [ "$ENV" = "local" ]; then
    echo "Note: This test requires AI provider configuration"
    echo "Skipping in local environment..."
else
    run_test "Execute Content Generation" "/api/execute" "POST" "$generation_data" \
        "-H 'Content-Type: application/json' -H 'X-API-Key: test-key-123'"
fi

# Test 12: Worker-to-Worker Authentication
run_test "Worker Auth" "/api/execute" "POST" '{"action": "generate"}' \
    "-H 'Content-Type: application/json' -H 'Authorization: Bearer internal-worker-auth-token-2024' -H 'X-Worker-ID: test-worker'"

# Test 13: Get Job Status (Non-existent Job)
run_test "Get Job Status (404)" "/api/jobs/99999/status" "GET" "" \
    "-H 'X-API-Key: test-key-123'"

# Test 14: Retry Job (Non-existent)
run_test "Retry Job (404)" "/api/jobs/99999/retry" "POST" "" \
    "-H 'X-API-Key: test-key-123'"

# Test 15: Cancel Job
run_test "Cancel Job" "/api/jobs/1/cancel" "POST" "" \
    "-H 'X-API-Key: test-key-123'"

# Test 16: Get Analytics
run_test "Get Analytics" "/api/analytics?days=7" "GET" "" \
    "-H 'X-API-Key: test-key-123'"

# Test 17: Get Resource Stats
run_test "Get Resource Stats" "/api/economy/stats?days=7" "GET" "" \
    "-H 'X-API-Key: test-key-123'"

# Summary
echo -e "\n=================================="
echo "Test Summary:"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✨${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please review the output above.${NC}"
    exit 1
fi