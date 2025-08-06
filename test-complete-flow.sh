#!/bin/bash

echo "========================================="
echo "Complete Integration Test with Error Handling"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
KAM_URL="https://bitware-key-account-manager.jhaladik.workers.dev"
ORCH_URL="https://bitware-orchestrator-v2.jhaladik.workers.dev"
GRAN_URL="https://bitware-content-granulator.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to test endpoints
test_endpoint() {
    local name=$1
    local response=$2
    local expected=$3
    
    if [[ $response == *"$expected"* ]]; then
        echo -e "${GREEN}✓ $name${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ $name${NC}"
        echo "  Response: ${response:0:100}..."
        ((TESTS_FAILED++))
        return 1
    fi
}

echo -e "${BLUE}==== Phase 1: Service Health Checks ====${NC}"
echo ""

# Test KAM
echo "1.1 Testing KAM health..."
KAM_HEALTH=$(curl -s "$KAM_URL/health")
test_endpoint "KAM health check" "$KAM_HEALTH" "healthy"

# Test Orchestrator
echo -e "\n1.2 Testing Orchestrator v2 health..."
ORCH_HEALTH=$(curl -s "$ORCH_URL/health")
test_endpoint "Orchestrator health check" "$ORCH_HEALTH" "healthy"

# Test Granulator
echo -e "\n1.3 Testing Granulator health..."
GRAN_HEALTH=$(curl -s "$GRAN_URL/health")
test_endpoint "Granulator health check" "$GRAN_HEALTH" "healthy"

echo -e "\n${BLUE}==== Phase 2: Simple Orchestrator Test ====${NC}"
echo ""

echo "2.1 Testing direct orchestrator execution..."
ORCH_TEST=$(curl -s -X POST "$ORCH_URL/api/test/queue-execution" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: test-worker" \
  -d '{"client_id": "test_simple"}')

if test_endpoint "Orchestrator queue test" "$ORCH_TEST" "success"; then
    EXECUTION_ID=$(echo $ORCH_TEST | grep -o '"execution_id":"[^"]*' | sed 's/"execution_id":"//')
    echo "  Execution ID: $EXECUTION_ID"
    
    # Wait for execution
    echo "  Waiting for execution to complete..."
    sleep 5
    
    # Check stage status
    echo -e "\n2.2 Checking stage creation..."
    cd workers/bitware_orchestrator_v2
    STAGES=$(wrangler d1 execute orchestrator-v2-db --remote --command="SELECT COUNT(*) as count FROM stage_executions WHERE execution_id = '$EXECUTION_ID'" 2>&1)
    cd ../..
    
    if [[ $STAGES == *'"count": 1'* ]] || [[ $STAGES == *'"count":1'* ]]; then
        echo -e "${GREEN}✓ Stage created successfully${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ Stage creation failed${NC}"
        ((TESTS_FAILED++))
    fi
fi

echo -e "\n${BLUE}==== Phase 3: Granulator Direct Test ====${NC}"
echo ""

echo "3.1 Testing granulator handshake..."
HANDSHAKE=$(curl -s -X POST "$GRAN_URL/api/handshake" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: bitware-orchestrator-v2" \
  -d '{
    "executionId": "test_direct_'$(date +%s)'",
    "stageId": "stage_test",
    "action": "granulate",
    "inputData": {
      "topic": "Test Topic for Direct Granulation",
      "structure_type": "course",
      "template_name": "course"
    }
  }')

test_endpoint "Granulator handshake" "$HANDSHAKE" "accepted"

echo -e "\n${BLUE}==== Phase 4: KAM Template Check ====${NC}"
echo ""

echo "4.1 Checking master templates in KAM..."
TEMPLATE_CHECK=$(curl -s -X GET "$KAM_URL/api/master-templates/course_creation" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: bitware-orchestrator-v2")

if test_endpoint "KAM master template fetch" "$TEMPLATE_CHECK" "template_name"; then
    echo "  Template found: course_creation"
else
    echo "  Checking template structure..."
    echo "$TEMPLATE_CHECK" | head -20
fi

echo -e "\n${BLUE}==== Phase 5: Full Integration Test ====${NC}"
echo ""

echo "5.1 Creating execution via Orchestrator (bypassing KAM request creation)..."
FULL_TEST=$(curl -s -X POST "$ORCH_URL/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: bitware-key-account-manager" \
  -d '{
    "template_name": "course_creation",
    "client_id": "integration_test_client",
    "parameters": {
      "topic": "Complete Integration Test - AI Fundamentals",
      "audience": "beginners",
      "structure_type": "course"
    },
    "priority": "high"
  }')

if test_endpoint "Full pipeline execution" "$FULL_TEST" "execution_id"; then
    FULL_EXEC_ID=$(echo $FULL_TEST | grep -o '"execution_id":"[^"]*' | sed 's/"execution_id":"//')
    echo "  Full execution ID: $FULL_EXEC_ID"
    
    echo "  Waiting for processing..."
    sleep 8
    
    # Check final status
    echo -e "\n5.2 Checking execution status..."
    EXEC_STATUS=$(curl -s -X GET "$ORCH_URL/execution/$FULL_EXEC_ID" \
      -H "Authorization: Bearer $WORKER_SECRET" \
      -H "X-Worker-ID: test-worker")
    
    echo "  Status response: ${EXEC_STATUS:0:200}..."
    
    # Check stages
    echo -e "\n5.3 Checking stage executions..."
    cd workers/bitware_orchestrator_v2
    FULL_STAGES=$(wrangler d1 execute orchestrator-v2-db --remote --command="SELECT stage_id, worker_name, status FROM stage_executions WHERE execution_id = '$FULL_EXEC_ID'" 2>&1)
    cd ../..
    
    if [[ $FULL_STAGES == *"bitware-content-granulator"* ]]; then
        echo -e "${GREEN}✓ Granulator stage found${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ Granulator stage not found${NC}"
        ((TESTS_FAILED++))
    fi
    
    # Check handshake
    echo -e "\n5.4 Checking handshake packets..."
    cd workers/bitware_orchestrator_v2
    HANDSHAKES=$(wrangler d1 execute orchestrator-v2-db --remote --command="SELECT COUNT(*) as count FROM handshake_packets WHERE execution_id = '$FULL_EXEC_ID'" 2>&1)
    cd ../..
    
    if [[ $HANDSHAKES == *'"count": 1'* ]] || [[ $HANDSHAKES == *'"count":1'* ]]; then
        echo -e "${GREEN}✓ Handshake packet created${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ No handshake packet found${NC}"
        ((TESTS_FAILED++))
    fi
fi

echo -e "\n${YELLOW}=========================================${NC}"
echo -e "${YELLOW}Test Summary${NC}"
echo -e "${YELLOW}=========================================${NC}"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ ALL TESTS PASSED!${NC}"
    echo "The integration is working correctly."
else
    echo -e "\n${RED}✗ Some tests failed${NC}"
    echo "Review the output above for details."
fi

echo -e "\nCommon issues to check:"
echo "1. Worker registry - ensure workers are registered in orchestrator DB"
echo "2. Service bindings - check wrangler.toml for correct bindings"
echo "3. Template names - ensure consistency between KAM and orchestrator"
echo "4. Authentication - verify worker secrets match"

echo -e "\nTest completed at $(date)"