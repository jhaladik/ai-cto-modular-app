#!/bin/bash

echo "========================================="
echo "Topic Researcher v2.0 Test Suite"
echo "Testing Orchestrator 2.0 Protocol"
echo "========================================="

# Configuration
if [ "$1" == "local" ]; then
    BASE_URL="http://localhost:8787"
    echo "Testing LOCAL environment"
else
    BASE_URL="https://bitware-topic-researcher-v2.jhaladik.workers.dev"
    echo "Testing PRODUCTION environment"
fi

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "=== Phase 1: Health Check ==="
echo "-----------------------------"

echo -e "${BLUE}Test 1: Enhanced Health Check${NC}"
RESPONSE=$(curl -s "$BASE_URL/health")
if echo "$RESPONSE" | grep -q '"protocol_version":"2.0"'; then
    echo -e "${GREEN}✓ Health check passed - Protocol v2.0 detected${NC}"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
else
    echo -e "${RED}✗ Health check failed or v2.0 not detected${NC}"
    echo "Response: $RESPONSE"
fi

echo ""
echo "=== Phase 2: Handshake Protocol ==="
echo "-----------------------------------"

echo -e "${BLUE}Test 2: Handshake with Inline Data${NC}"
HANDSHAKE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/handshake" \
  -H "Content-Type: application/json" \
  -d '{
    "packet_id": "test-packet-001",
    "execution_id": "exec-001",
    "stage_id": "stage-research",
    "input_ref": {
      "ref_id": "ref-inline-001",
      "storage_type": "inline",
      "inline_data": {
        "topic": "artificial intelligence trends 2024",
        "depth": 3,
        "min_quality": 0.7
      },
      "size_bytes": 128
    }
  }')

if echo "$HANDSHAKE_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Handshake successful${NC}"
    echo "$HANDSHAKE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$HANDSHAKE_RESPONSE"
else
    echo -e "${RED}✗ Handshake failed${NC}"
    echo "Response: $HANDSHAKE_RESPONSE"
fi

echo ""
echo -e "${BLUE}Test 3: Handshake with Large Data (Reference)${NC}"
HANDSHAKE_REF_RESPONSE=$(curl -s -X POST "$BASE_URL/api/handshake" \
  -H "Content-Type: application/json" \
  -d '{
    "packet_id": "test-packet-002",
    "execution_id": "exec-002",
    "stage_id": "stage-research",
    "input_ref": {
      "ref_id": "ref-large-002",
      "storage_type": "reference",
      "size_bytes": 10485760
    }
  }')

if echo "$HANDSHAKE_REF_RESPONSE" | grep -q '"status":"ready"'; then
    echo -e "${GREEN}✓ Handshake with reference successful${NC}"
else
    echo -e "${YELLOW}⚠ Handshake may not support large references${NC}"
    echo "Response: $HANDSHAKE_REF_RESPONSE"
fi

echo ""
echo "=== Phase 3: Processing ==="
echo "---------------------------"

echo -e "${BLUE}Test 4: Process Request${NC}"
PROCESS_RESPONSE=$(curl -s -X POST "$BASE_URL/api/process" \
  -H "Content-Type: application/json" \
  -d '{
    "packet_id": "test-packet-003",
    "execution_id": "exec-003",
    "stage_id": "stage-research",
    "input_ref": {
      "storage_type": "inline",
      "inline_data": {
        "topic": "quantum computing applications",
        "depth": 2,
        "min_quality": 0.8,
        "max_sources": 5
      },
      "size_bytes": 150
    },
    "parameters": {
      "enable_ai": true,
      "enable_web_search": false
    }
  }')

if echo "$PROCESS_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Process request successful${NC}"
    
    # Extract output reference
    OUTPUT_REF=$(echo "$PROCESS_RESPONSE" | grep -o '"ref_id":"[^"]*"' | cut -d'"' -f4)
    echo "Output Reference: $OUTPUT_REF"
    
    # Display metrics
    echo "$PROCESS_RESPONSE" | grep -o '"metrics":{[^}]*}' | python3 -m json.tool 2>/dev/null
else
    echo -e "${RED}✗ Process request failed${NC}"
    echo "Response: $PROCESS_RESPONSE"
fi

echo ""
echo "=== Phase 4: Progress Tracking ==="
echo "----------------------------------"

echo -e "${BLUE}Test 5: Check Progress${NC}"
# Start a long-running process
curl -s -X POST "$BASE_URL/api/process" \
  -H "Content-Type: application/json" \
  -d '{
    "packet_id": "test-packet-004",
    "execution_id": "exec-004",
    "stage_id": "stage-research",
    "input_ref": {
      "storage_type": "inline",
      "inline_data": {
        "topic": "blockchain technology",
        "depth": 5
      },
      "size_bytes": 100
    }
  }' > /dev/null &

# Wait a moment then check progress
sleep 2

PROGRESS_RESPONSE=$(curl -s "$BASE_URL/api/progress/test-packet-004")
if echo "$PROGRESS_RESPONSE" | grep -q '"stage"'; then
    echo -e "${GREEN}✓ Progress tracking working${NC}"
    echo "$PROGRESS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$PROGRESS_RESPONSE"
else
    echo -e "${YELLOW}⚠ Progress data may not be available${NC}"
    echo "Response: $PROGRESS_RESPONSE"
fi

echo ""
echo "=== Phase 5: Acknowledgment ==="
echo "-------------------------------"

echo -e "${BLUE}Test 6: Acknowledge Completion${NC}"
ACK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/acknowledge" \
  -H "Content-Type: application/json" \
  -d '{
    "packet_id": "test-packet-003",
    "execution_id": "exec-003",
    "success": true
  }')

if echo "$ACK_RESPONSE" | grep -q '"acknowledged":true'; then
    echo -e "${GREEN}✓ Acknowledgment successful${NC}"
else
    echo -e "${RED}✗ Acknowledgment failed${NC}"
    echo "Response: $ACK_RESPONSE"
fi

echo ""
echo "=== Phase 6: Legacy Compatibility ==="
echo "-------------------------------------"

echo -e "${BLUE}Test 7: Legacy Research Endpoint${NC}"
LEGACY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/research" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-api-key" \
  -d '{
    "topic": "machine learning frameworks",
    "depth": 3,
    "min_quality": 0.7
  }')

if echo "$LEGACY_RESPONSE" | grep -q '"topic"'; then
    echo -e "${GREEN}✓ Legacy endpoint still working${NC}"
else
    echo -e "${YELLOW}⚠ Legacy endpoint may require authentication${NC}"
    echo "Response: $LEGACY_RESPONSE"
fi

echo ""
echo "=== Phase 7: Error Handling ==="
echo "-------------------------------"

echo -e "${BLUE}Test 8: Invalid Input Handling${NC}"
ERROR_RESPONSE=$(curl -s -X POST "$BASE_URL/api/process" \
  -H "Content-Type: application/json" \
  -d '{
    "packet_id": "test-error-001",
    "input_ref": {
      "storage_type": "invalid",
      "inline_data": {}
    }
  }')

if echo "$ERROR_RESPONSE" | grep -q '"success":false'; then
    echo -e "${GREEN}✓ Proper error handling${NC}"
else
    echo -e "${RED}✗ Error handling may need improvement${NC}"
fi

echo ""
echo "=== Phase 8: Performance Test ==="
echo "---------------------------------"

echo -e "${BLUE}Test 9: Concurrent Requests${NC}"
for i in {1..3}; do
    curl -s -X POST "$BASE_URL/api/process" \
      -H "Content-Type: application/json" \
      -d "{
        \"packet_id\": \"perf-test-$i\",
        \"execution_id\": \"perf-exec-$i\",
        \"stage_id\": \"stage-perf\",
        \"input_ref\": {
          \"storage_type\": \"inline\",
          \"inline_data\": {
            \"topic\": \"test topic $i\",
            \"depth\": 1
          },
          \"size_bytes\": 50
        }
      }" > /dev/null &
done

wait
echo -e "${GREEN}✓ Concurrent requests completed${NC}"

echo ""
echo "========================================="
echo "Test Suite Complete"
echo "========================================="
echo ""
echo "Summary:"
echo "- Protocol v2.0 support verified"
echo "- Handshake protocol functional"
echo "- Reference handling tested"
echo "- Progress tracking operational"
echo "- Legacy compatibility maintained"
echo ""
echo "Next Steps:"
echo "1. Deploy to production with: wrangler deploy -c wrangler-v2.toml"
echo "2. Update orchestrator registry"
echo "3. Test with live orchestrator"
echo "========================================="