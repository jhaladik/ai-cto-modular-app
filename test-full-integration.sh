#!/bin/bash

echo "========================================="
echo "Full Integration Test: KAM → Orchestrator → Granulator"
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

# Test data
CLIENT_ID="test_client_$(date +%s)"
REQUEST_ID=""
EXECUTION_ID=""
STAGE_ID=""
JOB_ID=""

echo -e "${BLUE}Step 1: Create test client in KAM${NC}"
echo "----------------------------------------"

# First, let's login as admin to get a session token
echo "Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$KAM_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@ai-factory.com",
    "password": "admin123",
    "loginType": "admin"
  }')

SESSION_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"sessionToken":"[^"]*' | sed 's/"sessionToken":"//')
echo "Session token: ${SESSION_TOKEN:0:20}..."

# Create a test client
echo -e "\nCreating test client..."
CLIENT_RESPONSE=$(curl -s -X POST "$KAM_URL/clients" \
  -H "Content-Type: application/json" \
  -H "x-bitware-session-token: $SESSION_TOKEN" \
  -d '{
    "name": "Integration Test Client",
    "email": "test@integration.com",
    "subscriptionTier": "premium",
    "monthlyBudget": 1000
  }')

echo "Client response: $CLIENT_RESPONSE"

echo -e "\n${BLUE}Step 2: Create a request in KAM${NC}"
echo "----------------------------------------"

REQUEST_RESPONSE=$(curl -s -X POST "$KAM_URL/requests" \
  -H "Content-Type: application/json" \
  -H "x-bitware-session-token: $SESSION_TOKEN" \
  -d '{
    "title": "Full Integration Test Request",
    "description": "Testing KAM to Orchestrator to Granulator flow",
    "urgency": "normal",
    "requirements": {
      "topic": "Artificial Intelligence Fundamentals",
      "structure_type": "course",
      "audience": "beginners"
    }
  }')

REQUEST_ID=$(echo $REQUEST_RESPONSE | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')
echo "Created request ID: $REQUEST_ID"

echo -e "\n${BLUE}Step 3: Assign template to request${NC}"
echo "----------------------------------------"

# Update request with template assignment
TEMPLATE_RESPONSE=$(curl -s -X PUT "$KAM_URL/requests/$REQUEST_ID" \
  -H "Content-Type: application/json" \
  -H "x-bitware-session-token: $SESSION_TOKEN" \
  -d '{
    "assigned_template": "course_creation",
    "status": "assigned"
  }')

echo "Template assignment response: $TEMPLATE_RESPONSE"

echo -e "\n${BLUE}Step 4: Execute via Orchestrator v2${NC}"
echo "----------------------------------------"

# Execute the pipeline through Orchestrator v2
EXECUTE_RESPONSE=$(curl -s -X POST "$ORCH_URL/api/pipelines/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer internal-worker-auth-token-2024" \
  -H "X-Worker-ID: bitware-key-account-manager" \
  -d '{
    "template_name": "course_creation",
    "client_id": "kam_test_client",
    "request_id": "'$REQUEST_ID'",
    "parameters": {
      "topic": "Artificial Intelligence Fundamentals",
      "audience": "beginners",
      "structure_type": "course"
    },
    "priority": "high"
  }')

EXECUTION_ID=$(echo $EXECUTE_RESPONSE | grep -o '"execution_id":"[^"]*' | sed 's/"execution_id":"//')
echo "Execution ID: $EXECUTION_ID"
echo "Full response: $EXECUTE_RESPONSE"

if [ -z "$EXECUTION_ID" ]; then
  echo -e "${RED}Failed to get execution ID. Response: $EXECUTE_RESPONSE${NC}"
  exit 1
fi

echo -e "\n${BLUE}Step 5: Check execution status${NC}"
echo "----------------------------------------"

sleep 3
STATUS_RESPONSE=$(curl -s -X GET "$ORCH_URL/api/executions/$EXECUTION_ID" \
  -H "Authorization: Bearer internal-worker-auth-token-2024" \
  -H "X-Worker-ID": "test-client")

echo "Execution status: $STATUS_RESPONSE"

echo -e "\n${BLUE}Step 6: Check stage executions in database${NC}"
echo "----------------------------------------"

cd workers/bitware_orchestrator_v2
STAGES=$(wrangler d1 execute orchestrator-v2-db --remote --command="SELECT stage_id, worker_name, status, error_message FROM stage_executions WHERE execution_id = '$EXECUTION_ID'" 2>&1 | grep -A 20 '"results"')
cd ../..

echo "Stage executions: $STAGES"

# Extract stage ID
STAGE_ID=$(echo $STAGES | grep -o '"stage_id":"[^"]*' | head -1 | sed 's/"stage_id":"//')
echo "Stage ID: $STAGE_ID"

echo -e "\n${BLUE}Step 7: Check handshake packets${NC}"
echo "----------------------------------------"

cd workers/bitware_orchestrator_v2
HANDSHAKES=$(wrangler d1 execute orchestrator-v2-db --remote --command="SELECT packet_id, to_worker, status FROM handshake_packets WHERE execution_id = '$EXECUTION_ID'" 2>&1 | grep -A 10 '"results"')
cd ../..

echo "Handshake packets: $HANDSHAKES"

echo -e "\n${BLUE}Step 8: Check granulator job${NC}"
echo "----------------------------------------"

# Check if granulator created a job
cd workers/bitware_content_granulator
GRAN_JOBS=$(wrangler d1 execute content-granulator-db --remote --command="SELECT id, topic, status, execution_id FROM granulation_jobs WHERE execution_id = '$EXECUTION_ID'" 2>&1 | grep -A 10 '"results"')
cd ../..

echo "Granulator jobs: $GRAN_JOBS"
JOB_ID=$(echo $GRAN_JOBS | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')

if [ ! -z "$JOB_ID" ]; then
  echo -e "${GREEN}✓ Granulator job created: $JOB_ID${NC}"
  
  echo -e "\n${BLUE}Step 9: Get job structure${NC}"
  echo "----------------------------------------"
  
  STRUCTURE_RESPONSE=$(curl -s -X GET "$GRAN_URL/api/jobs/$JOB_ID/structure" \
    -H "Authorization: Bearer internal-worker-auth-token-2024" \
    -H "X-Worker-ID: bitware-orchestrator-v2")
  
  echo "Structure response (first 500 chars): ${STRUCTURE_RESPONSE:0:500}..."
fi

echo -e "\n${BLUE}Step 10: Check data references${NC}"
echo "----------------------------------------"

cd workers/bitware_orchestrator_v2
DATA_REFS=$(wrangler d1 execute orchestrator-v2-db --remote --command="SELECT ref_id, storage_type, storage_key, size_bytes FROM data_references WHERE execution_id = '$EXECUTION_ID'" 2>&1 | grep -A 10 '"results"')
cd ../..

echo "Data references: $DATA_REFS"

echo -e "\n${BLUE}Step 11: Check deliverables${NC}"
echo "----------------------------------------"

cd workers/bitware_orchestrator_v2
DELIVERABLES=$(wrangler d1 execute orchestrator-v2-db --remote --command="SELECT deliverable_id, name, type, storage_type FROM deliverables WHERE execution_id = '$EXECUTION_ID'" 2>&1 | grep -A 10 '"results"')
cd ../..

echo "Deliverables: $DELIVERABLES"

echo -e "\n${BLUE}Step 12: Final execution summary${NC}"
echo "----------------------------------------"

FINAL_STATUS=$(curl -s -X GET "$ORCH_URL/api/executions/$EXECUTION_ID" \
  -H "Authorization: Bearer internal-worker-auth-token-2024" \
  -H "X-Worker-ID": "test-client")

echo "Final execution status:"
echo $FINAL_STATUS | python -m json.tool 2>/dev/null || echo $FINAL_STATUS

echo -e "\n${YELLOW}=========================================${NC}"
echo -e "${YELLOW}Test Summary${NC}"
echo -e "${YELLOW}=========================================${NC}"
echo "Request ID: $REQUEST_ID"
echo "Execution ID: $EXECUTION_ID"
echo "Stage ID: $STAGE_ID"
echo "Granulator Job ID: $JOB_ID"

# Check overall success
if [ ! -z "$JOB_ID" ] && [ "$JOB_ID" != "null" ]; then
  echo -e "\n${GREEN}✓ Full integration test PASSED!${NC}"
  echo "The request flowed successfully through KAM → Orchestrator → Granulator"
else
  echo -e "\n${RED}✗ Full integration test FAILED${NC}"
  echo "Check the logs above for error details"
fi

echo -e "\nTest completed at $(date)"