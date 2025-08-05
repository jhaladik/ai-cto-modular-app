#!/bin/bash

echo "========================================="
echo "Orchestrator 2.0 Comprehensive Test Suite"
echo "========================================="

# Configuration
if [ "$1" == "local" ]; then
    BASE_URL="http://localhost:8787"
    echo "Testing LOCAL environment"
else
    BASE_URL="https://bitware-orchestrator-v2.jhaladik.workers.dev"
    echo "Testing PRODUCTION environment"
fi

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper function to run a test
run_test() {
    local test_name="$1"
    local response="$2"
    local expected_field="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if echo "$response" | grep -q "$expected_field"; then
        echo -e "${GREEN}✓ $test_name passed${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗ $test_name failed${NC}"
        echo "Response: $response"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Helper function to pretty print JSON
pretty_json() {
    echo "$1" | python3 -m json.tool 2>/dev/null || echo "$1"
}

echo ""
echo "=== Phase 1: Public Endpoints ==="
echo "---------------------------------"

# Test 1: Health Check
echo -e "\n${BLUE}Test 1: Health Check${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/")
run_test "Health check" "$RESPONSE" "healthy"
pretty_json "$RESPONSE"

# Test 2: Detailed Health
echo -e "\n${BLUE}Test 2: Detailed Health${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/health")
run_test "Detailed health" "$RESPONSE" "components"

# Test 3: Help Endpoint
echo -e "\n${BLUE}Test 3: Help Documentation${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/help")
run_test "Help endpoint" "$RESPONSE" "bitware-orchestrator-v2"

echo ""
echo "=== Phase 2: Worker Authentication ==="
echo "--------------------------------------"

# Test 4: Get Workers (Worker Auth)
echo -e "\n${BLUE}Test 4: Get Workers List${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/workers" \
    -H "Authorization: Bearer test-worker-token" \
    -H "X-Worker-ID: bitware_key_account_manager")
run_test "Get workers" "$RESPONSE" "workers"

# Test 5: System Metrics
echo -e "\n${BLUE}Test 5: System Metrics${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/metrics" \
    -H "Authorization: Bearer test-worker-token" \
    -H "X-Worker-ID: bitware_key_account_manager")
run_test "System metrics" "$RESPONSE" "metrics"

echo ""
echo "=== Phase 3: Template Management ==="
echo "------------------------------------"

# Test 6: Sync Templates from KAM
echo -e "\n${BLUE}Test 6: Sync Templates${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/templates/sync" \
    -H "Authorization: Bearer test-worker-token" \
    -H "X-Worker-ID: bitware_key_account_manager")
run_test "Template sync" "$RESPONSE" "synced"

# Test 7: Get All Templates
echo -e "\n${BLUE}Test 7: Get Templates${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/templates" \
    -H "X-API-Key: test-client-key")
run_test "Get templates" "$RESPONSE" "templates"

# Test 8: Get Specific Template
echo -e "\n${BLUE}Test 8: Get Template Details${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/templates/quick_research" \
    -H "X-API-Key: test-client-key")
if echo "$RESPONSE" | grep -q "not found"; then
    echo -e "${YELLOW}⚠ Template not found (expected if not synced)${NC}"
else
    run_test "Get template details" "$RESPONSE" "template"
fi

echo ""
echo "=== Phase 4: Resource Management ==="
echo "------------------------------------"

# Test 9: Resource Status
echo -e "\n${BLUE}Test 9: Resource Status${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/resources/status" \
    -H "X-API-Key: test-client-key")
run_test "Resource status" "$RESPONSE" "pools"

# Test 10: Resource Availability
echo -e "\n${BLUE}Test 10: Resource Availability${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/resources/availability" \
    -H "X-API-Key: test-client-key")
run_test "Resource availability" "$RESPONSE" "availability"

# Test 11: Check Resource Availability
echo -e "\n${BLUE}Test 11: Check Specific Resources${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/resources/check" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: test-client-key" \
    -d '{
        "resources": [
            {"type": "api", "name": "openai_gpt4", "quantity": 100},
            {"type": "storage", "name": "kv_storage", "quantity": 10}
        ]
    }')
run_test "Check resources" "$RESPONSE" "all_available"

# Test 12: Get Client Quotas
echo -e "\n${BLUE}Test 12: Get Client Quotas${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/resources/quotas" \
    -H "X-API-Key: test-client-key")
run_test "Get quotas" "$RESPONSE" "quotas"

echo ""
echo "=== Phase 5: Pipeline Estimation ==="
echo "------------------------------------"

# Test 13: Estimate Pipeline Execution
echo -e "\n${BLUE}Test 13: Estimate Execution Cost${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/estimate" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: test-client-key" \
    -d '{
        "template_name": "quick_research",
        "parameters": {
            "topic": "AI trends in 2024",
            "depth": "comprehensive"
        }
    }')
run_test "Estimate execution" "$RESPONSE" "estimated_cost_usd"
pretty_json "$RESPONSE"

echo ""
echo "=== Phase 6: Pipeline Execution ==="
echo "-----------------------------------"

# Test 14: Execute Pipeline
echo -e "\n${BLUE}Test 14: Execute Pipeline${NC}"
EXECUTION_RESPONSE=$(curl -s -X POST "$BASE_URL/execute" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: test-client-key" \
    -d '{
        "request_id": "test_req_'$(date +%s)'",
        "template_name": "quick_research",
        "parameters": {
            "topic": "Quantum computing applications",
            "max_results": 10
        },
        "priority": "high"
    }')
run_test "Execute pipeline" "$EXECUTION_RESPONSE" "execution_id"
pretty_json "$EXECUTION_RESPONSE"

# Extract execution ID
EXEC_ID=$(echo "$EXECUTION_RESPONSE" | grep -o '"execution_id":"[^"]*' | cut -d'"' -f4)
echo "Execution ID: $EXEC_ID"

# Test 15: Check Progress
echo -e "\n${BLUE}Test 15: Check Execution Progress${NC}"
if [ ! -z "$EXEC_ID" ]; then
    sleep 2
    RESPONSE=$(curl -s -X GET "$BASE_URL/progress/$EXEC_ID" \
        -H "X-API-Key: test-client-key")
    run_test "Check progress" "$RESPONSE" "status"
    pretty_json "$RESPONSE"
else
    echo -e "${YELLOW}⚠ Skipping - no execution ID${NC}"
fi

# Test 16: Get Execution Details
echo -e "\n${BLUE}Test 16: Get Execution Details${NC}"
if [ ! -z "$EXEC_ID" ]; then
    RESPONSE=$(curl -s -X GET "$BASE_URL/execution/$EXEC_ID" \
        -H "X-API-Key: test-client-key")
    run_test "Get execution details" "$RESPONSE" "execution"
else
    echo -e "${YELLOW}⚠ Skipping - no execution ID${NC}"
fi

# Test 17: Get Execution Queue
echo -e "\n${BLUE}Test 17: Get Execution Queue${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/queue" \
    -H "X-API-Key: test-client-key")
run_test "Get queue" "$RESPONSE" "queue"

echo ""
echo "=== Phase 7: Worker Handshake Protocol ==="
echo "------------------------------------------"

# Test 18: Send Worker Handshake
echo -e "\n${BLUE}Test 18: Worker Handshake${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/handshake/receive" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer test-worker-token" \
    -H "X-Worker-ID: bitware_topic_researcher" \
    -d '{
        "execution_id": "test_exec_123",
        "stage_id": "test_stage_456",
        "stage_order": 1,
        "control": {
            "action": "continue",
            "priority": "normal",
            "checkpoint_enabled": true,
            "timeout_ms": 60000,
            "retry_count": 0,
            "max_retries": 3
        },
        "data_ref": {
            "storage_type": "inline",
            "inline_data": {"test": "data"},
            "size_bytes": 17,
            "content_type": "application/json",
            "checksum": "abc123",
            "expires_at": "'$(date -u -d "+1 hour" '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u '+%Y-%m-%dT%H:%M:%SZ')'"
        },
        "summary": {
            "items_processed": 5,
            "quality_score": 0.95,
            "confidence_level": 0.9,
            "processing_time_ms": 1500,
            "resource_usage": {"api_calls": 3},
            "errors": [],
            "warnings": [],
            "metrics": {"accuracy": 0.95},
            "continue_pipeline": true
        },
        "next": {
            "worker_name": "bitware_content_classifier",
            "action": "classify",
            "stage_order": 2,
            "params": {},
            "required_resources": ["openai_api"],
            "estimated_time_ms": 30000
        }
    }')
run_test "Worker handshake" "$RESPONSE" "packet_id"

# Extract packet ID for acknowledgment
PACKET_ID=$(echo "$RESPONSE" | grep -o '"packet_id":"[^"]*' | cut -d'"' -f4)

# Test 19: Acknowledge Handshake
echo -e "\n${BLUE}Test 19: Acknowledge Handshake${NC}"
if [ ! -z "$PACKET_ID" ]; then
    RESPONSE=$(curl -s -X POST "$BASE_URL/handshake/acknowledge" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer test-worker-token" \
        -H "X-Worker-ID: bitware_content_classifier" \
        -d '{
            "packet_id": "'$PACKET_ID'",
            "status": "acknowledged"
        }')
    run_test "Acknowledge handshake" "$RESPONSE" "success"
else
    echo -e "${YELLOW}⚠ Skipping - no packet ID${NC}"
fi

echo ""
echo "=== Phase 8: Resource Operations (Worker) ==="
echo "---------------------------------------------"

# Test 20: Allocate Resources
echo -e "\n${BLUE}Test 20: Allocate Resources${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/resources/allocate" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer test-worker-token" \
    -H "X-Worker-ID: bitware_topic_researcher" \
    -d '{
        "execution_id": "test_exec_789",
        "resources": [
            {"type": "api", "name": "openai_gpt4", "quantity": 500},
            {"type": "storage", "name": "kv_storage", "quantity": 5}
        ]
    }')
run_test "Allocate resources" "$RESPONSE" "allocations"

# Test 21: Record Resource Usage
echo -e "\n${BLUE}Test 21: Record Resource Usage${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/resources/usage" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer test-worker-token" \
    -H "X-Worker-ID: bitware_topic_researcher" \
    -d '{
        "execution_id": "test_exec_789",
        "stage_id": "test_stage_999",
        "usage": [
            {"type": "api", "name": "openai_gpt4", "quantity": 450, "unit": "tokens", "cost": 0.0135},
            {"type": "storage", "name": "kv_storage", "quantity": 3, "unit": "MB", "cost": 0.0003}
        ]
    }')
run_test "Record usage" "$RESPONSE" "recorded"

# Test 22: Create Resource Snapshot
echo -e "\n${BLUE}Test 22: Resource Snapshot${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/resources/snapshot" \
    -H "X-API-Key: test-client-key")
run_test "Resource snapshot" "$RESPONSE" "snapshots"

echo ""
echo "=== Phase 9: Advanced Operations ==="
echo "------------------------------------"

# Test 23: Cancel Execution
echo -e "\n${BLUE}Test 23: Cancel Execution${NC}"
if [ ! -z "$EXEC_ID" ]; then
    RESPONSE=$(curl -s -X POST "$BASE_URL/execution/$EXEC_ID/cancel" \
        -H "X-API-Key: test-client-key")
    run_test "Cancel execution" "$RESPONSE" "success"
else
    echo -e "${YELLOW}⚠ Skipping - no execution ID${NC}"
fi

# Test 24: Retry Failed Execution
echo -e "\n${BLUE}Test 24: Retry Execution${NC}"
# First create a failed execution for testing
FAILED_EXEC=$(curl -s -X POST "$BASE_URL/execute" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: test-client-key" \
    -d '{
        "request_id": "test_fail_'$(date +%s)'",
        "template_name": "non_existent_template",
        "parameters": {},
        "priority": "low"
    }')
FAILED_ID=$(echo "$FAILED_EXEC" | grep -o '"execution_id":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$FAILED_ID" ]; then
    sleep 1
    RESPONSE=$(curl -s -X POST "$BASE_URL/execution/$FAILED_ID/retry" \
        -H "X-API-Key: test-client-key")
    run_test "Retry execution" "$RESPONSE" "new_execution_id"
else
    echo -e "${YELLOW}⚠ Skipping - no failed execution${NC}"
fi

echo ""
echo "=== Phase 10: Stress Testing ==="
echo "--------------------------------"

# Test 25: Multiple Concurrent Executions
echo -e "\n${BLUE}Test 25: Queue Multiple Executions${NC}"
EXEC_COUNT=0
for i in {1..3}; do
    RESPONSE=$(curl -s -X POST "$BASE_URL/execute" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: test-client-key" \
        -d '{
            "request_id": "stress_test_'$i'_'$(date +%s)'",
            "template_name": "quick_research",
            "parameters": {
                "topic": "Test topic '$i'",
                "iteration": '$i'
            },
            "priority": "normal"
        }')
    
    if echo "$RESPONSE" | grep -q "execution_id"; then
        EXEC_COUNT=$((EXEC_COUNT + 1))
        echo -e "${GREEN}✓ Execution $i queued${NC}"
    else
        echo -e "${RED}✗ Execution $i failed${NC}"
    fi
done
echo "Successfully queued $EXEC_COUNT/3 executions"

# Test 26: Check Queue After Multiple Submissions
echo -e "\n${BLUE}Test 26: Queue Status After Load${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/queue" \
    -H "X-API-Key: test-client-key")
run_test "Queue after load" "$RESPONSE" "stats"
pretty_json "$RESPONSE"

echo ""
echo "=== Phase 11: Error Handling ==="
echo "--------------------------------"

# Test 27: Invalid Template
echo -e "\n${BLUE}Test 27: Invalid Template Error${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/estimate" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: test-client-key" \
    -d '{
        "template_name": "non_existent_template",
        "parameters": {}
    }')
if echo "$RESPONSE" | grep -q "not found"; then
    echo -e "${GREEN}✓ Proper error handling for invalid template${NC}"
else
    echo -e "${RED}✗ Should return 'not found' error${NC}"
fi

# Test 28: Unauthorized Access
echo -e "\n${BLUE}Test 28: Unauthorized Access${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/workers")
if echo "$RESPONSE" | grep -q "Unauthorized"; then
    echo -e "${GREEN}✓ Proper auth enforcement${NC}"
else
    echo -e "${RED}✗ Should require authentication${NC}"
fi

# Test 29: Invalid JSON
echo -e "\n${BLUE}Test 29: Invalid JSON Handling${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/execute" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: test-client-key" \
    -d 'invalid json{')
if echo "$RESPONSE" | grep -q "error"; then
    echo -e "${GREEN}✓ Handles invalid JSON${NC}"
else
    echo -e "${RED}✗ Should handle invalid JSON${NC}"
fi

# Test 30: Resource Exhaustion
echo -e "\n${BLUE}Test 30: Resource Exhaustion Check${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/resources/check" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: test-client-key" \
    -d '{
        "resources": [
            {"type": "api", "name": "openai_gpt4", "quantity": 999999}
        ]
    }')
if echo "$RESPONSE" | grep -q '"all_available":false'; then
    echo -e "${GREEN}✓ Detects resource exhaustion${NC}"
else
    echo -e "${YELLOW}⚠ May have unlimited resources configured${NC}"
fi

echo ""
echo "========================================="
echo "Test Results Summary"
echo "========================================="
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
echo -e "Success Rate: $SUCCESS_RATE%"

if [ $SUCCESS_RATE -ge 80 ]; then
    echo -e "\n${GREEN}✓ Orchestrator 2.0 is functioning well!${NC}"
elif [ $SUCCESS_RATE -ge 60 ]; then
    echo -e "\n${YELLOW}⚠ Orchestrator 2.0 has some issues${NC}"
else
    echo -e "\n${RED}✗ Orchestrator 2.0 needs attention${NC}"
fi

echo ""
echo "Note: Some tests may fail if:"
echo "1. Workers are not deployed/running"
echo "2. KAM service is not available"
echo "3. Database is not initialized"
echo "4. Running against local dev without all services"
echo ""
echo "For full testing, ensure all services are running."