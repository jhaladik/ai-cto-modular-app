#!/bin/bash
# test.sh - Comprehensive test suite for bitware_key_account_manager
# Tests all endpoints: public, main (client auth), and admin (worker auth)

# Configuration
WORKER_URL="${WORKER_URL:-https://bitware-key-account-manager.jhaladik.workers.dev}"
CLIENT_API_KEY="external-client-api-key-2024"
WORKER_SHARED_SECRET="internal-worker-auth-token-2024"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test helper functions
test_endpoint() {
    local description="$1"
    local method="$2"
    local endpoint="$3"
    local headers="$4"
    local data="$5"
    local expected_status="$6"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "\n${BLUE}Test $TOTAL_TESTS: $description${NC}"
    echo "  → $method $endpoint"
    
    # Build curl command
    local curl_cmd="curl -s -w '%{http_code}' -X $method"
    
    # Add headers if provided
    if [ -n "$headers" ]; then
        while IFS= read -r header; do
            curl_cmd="$curl_cmd -H '$header'"
        done <<< "$headers"
    fi
    
    # Add data if provided (for POST requests)
    if [ -n "$data" ] && [ "$method" = "POST" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    # Add URL
    curl_cmd="$curl_cmd '$WORKER_URL$endpoint'"
    
    # Execute request
    local response=$(eval $curl_cmd)
    local status_code="${response: -3}"
    local response_body="${response%???}"
    
    # Check status code
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "  ✅ ${GREEN}Status: $status_code (expected $expected_status)${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        
        # Try to pretty print JSON response if it's valid JSON
        if echo "$response_body" | jq . >/dev/null 2>&1; then
            echo "  📄 Response:"
            echo "$response_body" | jq . | sed 's/^/    /'
        else
            echo "  📄 Response: $response_body"
        fi
    else
        echo -e "  ❌ ${RED}Status: $status_code (expected $expected_status)${NC}"
        echo "  📄 Response: $response_body"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

echo -e "${YELLOW}🧪 Starting Key Account Manager Worker Tests${NC}"
echo "Worker URL: $WORKER_URL"
echo "Testing with Client API Key: ${CLIENT_API_KEY:0:10}..."
echo "Testing with Worker Secret: ${WORKER_SHARED_SECRET:0:10}..."

# ==================== PUBLIC ENDPOINTS (NO AUTH) ====================

echo -e "\n${YELLOW}📖 Testing Public Endpoints (No Authentication)${NC}"

test_endpoint "Help endpoint" \
    "GET" \
    "/help" \
    "" \
    "" \
    "200"

test_endpoint "Capabilities endpoint" \
    "GET" \
    "/capabilities" \
    "" \
    "" \
    "200"

test_endpoint "Health check endpoint" \
    "GET" \
    "/health" \
    "" \
    "" \
    "200"

# ==================== MAIN ENDPOINTS (CLIENT AUTH) ====================

echo -e "\n${YELLOW}🔑 Testing Main Endpoints (Client Authentication)${NC}"

# Test client authentication - should fail without API key
test_endpoint "Client endpoint without auth (should fail)" \
    "GET" \
    "/client?email=test@example.com" \
    "" \
    "" \
    "401"

# Test with valid API key
CLIENT_HEADERS="X-API-Key: $CLIENT_API_KEY
Content-Type: application/json"

test_endpoint "Get non-existent client" \
    "GET" \
    "/client?email=nonexistent@example.com" \
    "$CLIENT_HEADERS" \
    "" \
    "200"

test_endpoint "Get existing client (from seed data)" \
    "GET" \
    "/client?email=sarah.johnson@techcorp.com" \
    "$CLIENT_HEADERS" \
    "" \
    "200"

test_endpoint "Create new client" \
    "POST" \
    "/client" \
    "$CLIENT_HEADERS" \
    '{
        "company_name": "Test Company",
        "primary_contact_email": "test.user@testcompany.com",
        "subscription_tier": "standard",
        "monthly_budget_usd": 250.0,
        "communication_style": "casual"
    }' \
    "200"

test_endpoint "Try to create duplicate client (should conflict)" \
    "POST" \
    "/client" \
    "$CLIENT_HEADERS" \
    '{
        "company_name": "Test Company Duplicate",
        "primary_contact_email": "test.user@testcompany.com",
        "subscription_tier": "premium"
    }' \
    "409"

test_endpoint "Analyze communication content" \
    "POST" \
    "/analyze-communication" \
    "$CLIENT_HEADERS" \
    '{
        "content": "Hi, I need urgent help with market research for AI trends. This is critical for our board meeting tomorrow!",
        "type": "email_inbound",
        "subject": "Urgent AI Market Research Request",
        "sender_email": "ceo@example.com"
    }' \
    "200"

test_endpoint "Analyze communication with client storage" \
    "POST" \
    "/analyze-communication" \
    "$CLIENT_HEADERS" \
    '{
        "client_id": "client_demo_001",
        "content": "Can you provide a weekly summary of technology trends? Nothing urgent, just regular updates.",
        "type": "email_inbound",
        "subject": "Weekly Tech Updates",
        "sender_email": "sarah.johnson@techcorp.com"
    }' \
    "200"

test_endpoint "Get template recommendation" \
    "POST" \
    "/recommend-template" \
    "$CLIENT_HEADERS" \
    '{
        "client_email": "sarah.johnson@techcorp.com",
        "request": "I need a comprehensive analysis of the cryptocurrency market with competitive intelligence and trend forecasting"
    }' \
    "200"

test_endpoint "Get template recommendation for non-existent client" \
    "POST" \
    "/recommend-template" \
    "$CLIENT_HEADERS" \
    '{
        "client_email": "nonexistent@example.com",
        "request": "Market analysis request"
    }' \
    "400"

test_endpoint "List available templates" \
    "GET" \
    "/templates" \
    "$CLIENT_HEADERS" \
    "" \
    "200"

# Test edge cases
test_endpoint "Analyze communication without content (should fail)" \
    "POST" \
    "/analyze-communication" \
    "$CLIENT_HEADERS" \
    '{"type": "email_inbound"}' \
    "400"

test_endpoint "Create client without email (should fail)" \
    "POST" \
    "/client" \
    "$CLIENT_HEADERS" \
    '{"company_name": "No Email Company"}' \
    "400"

# ==================== ADMIN ENDPOINTS (WORKER AUTH) ====================

echo -e "\n${YELLOW}🔧 Testing Admin Endpoints (Worker Authentication)${NC}"

# Test worker authentication - should fail without proper auth
test_endpoint "Admin stats without auth (should fail)" \
    "GET" \
    "/admin/stats" \
    "" \
    "" \
    "401"

# Test with valid worker authentication
WORKER_HEADERS="Authorization: Bearer $WORKER_SHARED_SECRET
X-Worker-ID: bitware_orchestrator
Content-Type: application/json"

test_endpoint "Get admin statistics" \
    "GET" \
    "/admin/stats" \
    "$WORKER_HEADERS" \
    "" \
    "200"

test_endpoint "List all clients (admin)" \
    "GET" \
    "/admin/clients" \
    "$WORKER_HEADERS" \
    "" \
    "200"

test_endpoint "Sync templates from orchestrator" \
    "POST" \
    "/admin/sync-templates" \
    "$WORKER_HEADERS" \
    "" \
    "200"

# ==================== ERROR HANDLING ====================

echo -e "\n${YELLOW}🚨 Testing Error Handling${NC}"

test_endpoint "Non-existent endpoint" \
    "GET" \
    "/nonexistent" \
    "$CLIENT_HEADERS" \
    "" \
    "404"

test_endpoint "Invalid HTTP method on client endpoint" \
    "DELETE" \
    "/client" \
    "$CLIENT_HEADERS" \
    "" \
    "404"

# ==================== PERFORMANCE TESTS ====================

echo -e "\n${YELLOW}⚡ Testing Performance & Caching${NC}"

# Test caching by making the same request twice
echo "Testing caching performance..."
start_time=$(date +%s%N)
test_endpoint "First call to templates (no cache)" \
    "GET" \
    "/templates" \
    "$CLIENT_HEADERS" \
    "" \
    "200"
first_call_time=$(($(date +%s%N) - start_time))

start_time=$(date +%s%N)
test_endpoint "Second call to templates (should be cached)" \
    "GET" \
    "/templates" \
    "$CLIENT_HEADERS" \
    "" \
    "200"
second_call_time=$(($(date +%s%N) - start_time))

echo "  📊 First call: $((first_call_time / 1000000))ms"
echo "  📊 Second call: $((second_call_time / 1000000))ms"

if [ $second_call_time -lt $first_call_time ]; then
    echo -e "  ✅ ${GREEN}Caching appears to be working${NC}"
else
    echo -e "  ⚠️  ${YELLOW}Caching may not be working as expected${NC}"
fi

# ==================== INTEGRATION TESTS ====================

echo -e "\n${YELLOW}🔗 Testing Integration Scenarios${NC}"

# Test full workflow: create client, analyze communication, get recommendation
test_endpoint "Full workflow - Create client for integration test" \
    "POST" \
    "/client" \
    "$CLIENT_HEADERS" \
    '{
        "company_name": "Integration Test Corp",
        "primary_contact_email": "integration@testcorp.com",
        "subscription_tier": "premium",
        "monthly_budget_usd": 1000.0,
        "communication_style": "technical"
    }' \
    "200"

test_endpoint "Full workflow - Analyze communication for new client" \
    "POST" \
    "/analyze-communication" \
    "$CLIENT_HEADERS" \
    '{
        "content": "We need comprehensive competitive intelligence analysis for the fintech sector, including trend forecasting and regulatory analysis.",
        "type": "email_inbound",
        "subject": "Fintech Intelligence Request",
        "sender_email": "integration@testcorp.com"
    }' \
    "200"

test_endpoint "Full workflow - Get recommendation for new client" \
    "POST" \
    "/recommend-template" \
    "$CLIENT_HEADERS" \
    '{
        "client_email": "integration@testcorp.com",
        "request": "comprehensive competitive intelligence analysis for fintech with trend forecasting"
    }' \
    "200"

# ==================== TEST SUMMARY ====================

echo -e "\n${YELLOW}📊 Test Summary${NC}"
echo "======================================"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n🎉 ${GREEN}All tests passed! Worker is functioning correctly.${NC}"
    exit 0
else
    echo -e "\n❌ ${RED}Some tests failed. Please review the output above.${NC}"
    exit 1
fi