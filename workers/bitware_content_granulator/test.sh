#!/bin/bash

# Content Granulator Worker Test Script
# Tests all endpoints with various authentication methods

# Update this with your production URL after deployment
BASE_URL="https://bitware-content-granulator.YOUR_SUBDOMAIN.workers.dev"
# For local testing use: BASE_URL="http://localhost:8787"
API_KEY="external-client-api-key-2024"
WORKER_SECRET="internal-worker-auth-token-2024"
SESSION_TOKEN="test-session-token"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧱 Testing Content Granulator Worker"
echo "===================================="

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
    fi
}

# Test 1: Health Check
echo -e "\n${YELLOW}Test 1: Health Check (Public)${NC}"
curl -s -X GET "$BASE_URL/" | jq '.'
print_result $? "Basic health check"

# Test 2: Detailed Health
echo -e "\n${YELLOW}Test 2: Detailed Health Check${NC}"
curl -s -X GET "$BASE_URL/health" | jq '.'
print_result $? "Detailed health check"

# Test 3: Help Endpoint
echo -e "\n${YELLOW}Test 3: Help Documentation${NC}"
curl -s -X GET "$BASE_URL/help" | jq '.'
print_result $? "Help endpoint"

# Test 4: Get Templates (Client Auth)
echo -e "\n${YELLOW}Test 4: Get Templates${NC}"
curl -s -X GET "$BASE_URL/api/templates" \
  -H "X-API-Key: $API_KEY" | jq '.'
print_result $? "Get all templates"

# Test 5: Get Specific Template
echo -e "\n${YELLOW}Test 5: Get Specific Template${NC}"
curl -s -X GET "$BASE_URL/api/templates/educational_course_basic" \
  -H "X-API-Key: $API_KEY" | jq '.'
print_result $? "Get specific template"

# Test 6: Basic Course Granulation
echo -e "\n${YELLOW}Test 6: Course Granulation${NC}"
COURSE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/granulate" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "topic": "Introduction to Machine Learning",
    "structureType": "course",
    "templateName": "educational_course_basic",
    "granularityLevel": 3,
    "targetAudience": "beginners",
    "constraints": {
      "maxModules": 8,
      "estimatedHours": 16
    },
    "options": {
      "includeAssessments": true,
      "includePracticalExercises": true,
      "generatePrerequisites": true
    },
    "validation": {
      "enabled": true,
      "level": 2,
      "threshold": 90
    }
  }')
echo "$COURSE_RESPONSE" | jq '.'
JOB_ID=$(echo "$COURSE_RESPONSE" | jq -r '.jobId // empty')
print_result $? "Course granulation"

# Test 7: Quiz Generation
echo -e "\n${YELLOW}Test 7: Quiz Generation${NC}"
curl -s -X POST "$BASE_URL/api/granulate/quiz" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "topic": "Python Programming Basics",
    "questionCount": 20,
    "difficultyDistribution": {
      "easy": 40,
      "medium": 40,
      "hard": 20
    },
    "questionTypes": ["multiple_choice", "true_false", "code_completion"],
    "targetAudience": "beginners"
  }' | jq '.'
print_result $? "Quiz generation"

# Test 8: Novel Outline
echo -e "\n${YELLOW}Test 8: Novel Outline Generation${NC}"
curl -s -X POST "$BASE_URL/api/granulate/novel" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "novelConcept": "A detective solving mysteries in a steampunk Victorian London",
    "genre": "mystery_steampunk",
    "targetLength": "80000_words",
    "structurePreferences": {
      "chapterCount": 24
    },
    "characterRequirements": {
      "protagonistCount": 1,
      "majorCharacters": 4,
      "minorCharacters": 8
    }
  }' | jq '.'
print_result $? "Novel outline generation"

# Test 9: Workflow Generation
echo -e "\n${YELLOW}Test 9: Workflow Generation${NC}"
curl -s -X POST "$BASE_URL/api/granulate/workflow" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "workflowName": "Customer Onboarding Process",
    "targetAudience": "operations_team",
    "constraints": {
      "maxSteps": 15,
      "includeDecisionPoints": true
    }
  }' | jq '.'
print_result $? "Workflow generation"

# Test 10: Get Job Details
if [ ! -z "$JOB_ID" ]; then
  echo -e "\n${YELLOW}Test 10: Get Job Details${NC}"
  curl -s -X GET "$BASE_URL/api/jobs/$JOB_ID" \
    -H "X-API-Key: $API_KEY" | jq '.'
  print_result $? "Get job details"
fi

# Test 11: Get Job Status
if [ ! -z "$JOB_ID" ]; then
  echo -e "\n${YELLOW}Test 11: Get Job Status${NC}"
  curl -s -X GET "$BASE_URL/api/jobs/$JOB_ID/status" \
    -H "X-API-Key: $API_KEY" | jq '.'
  print_result $? "Get job status"
fi

# Test 12: Manual Validation
if [ ! -z "$JOB_ID" ]; then
  echo -e "\n${YELLOW}Test 12: Manual Validation${NC}"
  curl -s -X POST "$BASE_URL/api/validate" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d "{
      \"jobId\": $JOB_ID,
      \"validationLevel\": 3
    }" | jq '.'
  print_result $? "Manual validation"
fi

# Test 13: Validation History
if [ ! -z "$JOB_ID" ]; then
  echo -e "\n${YELLOW}Test 13: Validation History${NC}"
  curl -s -X GET "$BASE_URL/api/validation/history?job_id=$JOB_ID" \
    -H "X-API-Key: $API_KEY" | jq '.'
  print_result $? "Validation history"
fi

# Test 14: Orchestrator Handshake (Worker Auth)
echo -e "\n${YELLOW}Test 14: Orchestrator Handshake${NC}"
HANDSHAKE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/handshake" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: test-orchestrator" \
  -d '{
    "executionId": "exec-test-123",
    "pipelineStage": "granulation",
    "inputData": {
      "topic": "Blockchain Technology",
      "structureType": "course",
      "granularityLevel": 3,
      "templateName": "educational_course_basic"
    },
    "resourceRequirements": {
      "estimatedTokens": 2000,
      "timeoutMs": 30000
    },
    "validationConfig": {
      "enabled": true,
      "level": 2,
      "threshold": 85
    }
  }')
echo "$HANDSHAKE_RESPONSE" | jq '.'
print_result $? "Orchestrator handshake"

# Test 15: Process Execution
echo -e "\n${YELLOW}Test 15: Process Execution${NC}"
curl -s -X POST "$BASE_URL/api/process" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: test-orchestrator" \
  -d '{
    "executionId": "exec-test-123"
  }' | jq '.'
print_result $? "Process execution"

# Test 16: Get Progress
echo -e "\n${YELLOW}Test 16: Get Progress${NC}"
curl -s -X GET "$BASE_URL/api/progress/exec-test-123" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: test-orchestrator" | jq '.'
print_result $? "Get progress"

# Test 17: Acknowledge Completion
echo -e "\n${YELLOW}Test 17: Acknowledge Completion${NC}"
curl -s -X POST "$BASE_URL/api/acknowledge" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: test-orchestrator" \
  -d '{
    "executionId": "exec-test-123",
    "status": "received",
    "message": "Structure received and processed"
  }' | jq '.'
print_result $? "Acknowledge completion"

# Test 18: Admin Stats (Worker Auth)
echo -e "\n${YELLOW}Test 18: Admin Statistics${NC}"
curl -s -X GET "$BASE_URL/api/admin/stats" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: test-orchestrator" | jq '.'
print_result $? "Admin statistics"

# Test 19: Admin Analytics
echo -e "\n${YELLOW}Test 19: Admin Analytics${NC}"
curl -s -X GET "$BASE_URL/api/admin/analytics" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: test-orchestrator" | jq '.'
print_result $? "Admin analytics"

# Test 20: Template Management - Create
echo -e "\n${YELLOW}Test 20: Create New Template${NC}"
curl -s -X POST "$BASE_URL/api/admin/templates" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: test-orchestrator" \
  -d '{
    "action": "create",
    "template": {
      "templateName": "test_template",
      "structureType": "course",
      "templateSchema": {
        "test": true
      },
      "complexityLevel": 3,
      "targetAudience": "testers",
      "aiPromptTemplate": "Test template for {topic}",
      "validationRules": {
        "minElements": 5
      }
    }
  }' | jq '.'
print_result $? "Create template"

# Test 21: Session-based Auth
echo -e "\n${YELLOW}Test 21: Session-based Authentication${NC}"
curl -s -X GET "$BASE_URL/api/templates" \
  -H "x-bitware-session-token: $SESSION_TOKEN" | jq '.'
print_result $? "Session-based auth"

# Test 22: Error Handling - Invalid Auth
echo -e "\n${YELLOW}Test 22: Invalid Authentication${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/templates" \
  -H "X-API-Key: invalid-key")
STATUS_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$STATUS_CODE" = "401" ]; then
  print_result 0 "Invalid auth returns 401"
else
  print_result 1 "Invalid auth should return 401, got $STATUS_CODE"
fi

# Test 23: Error Handling - Missing Required Fields
echo -e "\n${YELLOW}Test 23: Missing Required Fields${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/granulate" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"topic": "Test"}')
STATUS_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$STATUS_CODE" = "400" ]; then
  print_result 0 "Missing fields returns 400"
else
  print_result 1 "Missing fields should return 400, got $STATUS_CODE"
fi

# Test 24: Not Found Endpoint
echo -e "\n${YELLOW}Test 24: Not Found Endpoint${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/nonexistent" \
  -H "X-API-Key: $API_KEY")
STATUS_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$STATUS_CODE" = "404" ]; then
  print_result 0 "Not found returns 404"
else
  print_result 1 "Not found should return 404, got $STATUS_CODE"
fi

echo -e "\n${GREEN}✅ Content Granulator tests completed!${NC}"
echo "===================================="
echo ""
echo "Note: Some tests may fail if:"
echo "1. The worker is not running locally"
echo "2. The database has not been initialized"
echo "3. API keys are not configured"
echo "4. OpenAI API key is not set"
echo ""
echo "To run the worker locally:"
echo "cd workers/bitware_content_granulator"
echo "npm install"
echo "wrangler dev"