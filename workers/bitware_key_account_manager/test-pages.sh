#!/bin/bash
# test_pages_integration.sh
# Test Pages Functions proxy to KAM worker integration

set -e

# Configuration - UPDATE THESE WITH YOUR ACTUAL URLS
PAGES_URL="https://ai-factory-frontend.pages.dev"
ADMIN_EMAIL="admin@company.com"
ADMIN_PASSWORD="admin123"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counter
TEST_COUNT=0
PASS_COUNT=0

# Session token
SESSION_TOKEN=""

print_test() {
    TEST_COUNT=$((TEST_COUNT + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ Test $TEST_COUNT: $2${NC}"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "${RED}✗ Test $TEST_COUNT: $2${NC}"
    fi
}

test_pages_endpoint() {
    local endpoint=$1
    local method=$2
    local headers=$3
    local data=$4
    local description=$5
    local expected_status=${6:-200}
    
    echo -e "\n${BLUE}Testing Pages: $description${NC}"
    echo "URL: $PAGES_URL$endpoint"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "%{http_code}" -X "$method" "$PAGES_URL$endpoint" $headers -d "$data")
    else
        response=$(curl -s -w "%{http_code}" -X "$method" "$PAGES_URL$endpoint" $headers)
    fi
    
    status_code="${response: -3}"
    body="${response%???}"
    
    echo "Status: $status_code"
    echo "Response: $body" | jq . 2>/dev/null || echo "Response: $body"
    
    if [ "$status_code" -eq "$expected_status" ]; then
        print_test 0 "$description"
        return 0
    else
        print_test 1 "$description (Expected: $expected_status, Got: $status_code)"
        return 1
    fi
}

echo -e "${YELLOW}🌐 Testing Pages → KAM Worker Integration${NC}"
echo "Pages URL: $PAGES_URL"
echo "=============================================="

# ==================== AUTHENTICATION VIA PAGES ====================

echo -e "\n${BLUE}🔐 Testing Authentication via Pages${NC}"

# Test login via Pages auth proxy
AUTH_DATA='{
  "username": "'$ADMIN_EMAIL'",
  "password": "'$ADMIN_PASSWORD'",
  "loginType": "admin"
}'

echo -e "\n${YELLOW}Testing Pages login endpoint...${NC}"
response=$(curl -s -w "%{http_code}" -X POST "$PAGES_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "$AUTH_DATA")

status_code="${response: -3}"
body="${response%???}"

echo "Login Status: $status_code"
echo "Login Response: $body" | jq . 2>/dev/null || echo "Login Response: $body"

if [ "$status_code" -eq 200 ]; then
    SESSION_TOKEN=$(echo "$body" | jq -r '.token // empty' 2>/dev/null)
    if [ -n "$SESSION_TOKEN" ] && [ "$SESSION_TOKEN" != "null" ]; then
        print_test 0 "Pages login successful"
        echo "Session Token: ${SESSION_TOKEN:0:20}..."
    else
        print_test 1 "Pages login failed - no token received"
    fi
else
    print_test 1 "Pages login failed - status $status_code"
fi

# ==================== KAM ENDPOINTS VIA PAGES PROXY ====================

echo -e "\n${BLUE}👥 Testing KAM endpoints via Pages proxy${NC}"

if [ -n "$SESSION_TOKEN" ]; then
    # Test KAM clients endpoint via Pages proxy
    KAM_REQUEST='{
      "endpoint": "/clients",
      "method": "GET",
      "data": {}
    }'
    
    test_pages_endpoint "/api/key-account-manager" \
        "POST" \
        "-H \"Content-Type: application/json\" -H \"X-Session-Token: $SESSION_TOKEN\"" \
        "$KAM_REQUEST" \
        "Get clients via Pages proxy"
    
    # Test KAM dashboard stats via Pages proxy
    STATS_REQUEST='{
      "endpoint": "/dashboard/stats",
      "method": "GET",
      "data": {}
    }'
    
    test_pages_endpoint "/api/key-account-manager" \
        "POST" \
        "-H \"Content-Type: application/json\" -H \"X-Session-Token: $SESSION_TOKEN\"" \
        "$STATS_REQUEST" \
        "Get dashboard stats via Pages proxy"
    
    # Test KAM users endpoint via Pages proxy
    USERS_REQUEST='{
      "endpoint": "/users",
      "method": "GET",
      "data": {}
    }'
    
    test_pages_endpoint "/api/key-account-manager" \
        "POST" \
        "-H \"Content-Type: application/json\" -H \"X-Session-Token: $SESSION_TOKEN\"" \
        "$USERS_REQUEST" \
        "Get users via Pages proxy"
else
    echo -e "${YELLOW}⚠️ Skipping KAM tests - no session token${NC}"
fi

# ==================== FRONTEND API CLIENT SIMULATION ====================

echo -e "\n${BLUE}🎯 Simulating Frontend API Client Usage${NC}"

if [ -n "$SESSION_TOKEN" ]; then
    # Simulate how the frontend api-client.js would call these endpoints
    
    echo -e "\n${YELLOW}Frontend simulation: apiClient.kamRequest('/clients', 'GET')${NC}"
    FRONTEND_CLIENTS_REQUEST='{
      "endpoint": "/clients",
      "method": "GET",
      "data": {}
    }'
    
    response=$(curl -s -w "%{http_code}" -X POST "$PAGES_URL/api/key-account-manager" \
      -H "Content-Type: application/json" \
      -H "X-Session-Token: $SESSION_TOKEN" \
      -d "$FRONTEND_CLIENTS_REQUEST")
    
    status_code="${response: -3}"
    body="${response%???}"
    
    if [ "$status_code" -eq 200 ]; then
        echo -e "${GREEN}✓ Frontend client list API call works${NC}"
        echo "Sample response structure:"
        echo "$body" | jq '.clients[0] // .message // "No clients found"' 2>/dev/null || echo "Response: $body"
    else
        echo -e "${RED}✗ Frontend client list API call failed: $status_code${NC}"
    fi
    
    echo -e "\n${YELLOW}Frontend simulation: apiClient.kamRequest('/dashboard/stats', 'GET')${NC}"
    FRONTEND_STATS_REQUEST='{
      "endpoint": "/dashboard/stats",
      "method": "GET",
      "data": {}
    }'
    
    response=$(curl -s -w "%{http_code}" -X POST "$PAGES_URL/api/key-account-manager" \
      -H "Content-Type: application/json" \
      -H "X-Session-Token: $SESSION_TOKEN" \
      -d "$FRONTEND_STATS_REQUEST")
    
    status_code="${response: -3}"
    body="${response%???}"
    
    if [ "$status_code" -eq 200 ]; then
        echo -e "${GREEN}✓ Frontend dashboard stats API call works${NC}"
        echo "Sample response structure:"
        echo "$body" | jq '.stats // .message // "No stats found"' 2>/dev/null || echo "Response: $body"
    else
        echo -e "${RED}✗ Frontend dashboard stats API call failed: $status_code${NC}"
    fi
fi

# ==================== TEST SUMMARY ====================

echo -e "\n${YELLOW}=============================================="
echo "🏁 Pages Integration Test Complete"
echo "=============================================="
echo "Total Tests: $TEST_COUNT"
echo -e "Passed: ${GREEN}$PASS_COUNT${NC}"

if [ $PASS_COUNT -eq $TEST_COUNT ]; then
    echo -e "${GREEN}🎉 All Pages integration tests passed!${NC}"
    echo ""
    echo -e "${BLUE}✅ Your frontend should now work with these exact API calls:${NC}"
    echo ""
    echo "// Login"
    echo "await fetch('/api/auth/login', {"
    echo "  method: 'POST',"
    echo "  headers: { 'Content-Type': 'application/json' },"
    echo "  body: JSON.stringify({ username: 'admin@company.com', password: 'admin123', loginType: 'admin' })"
    echo "});"
    echo ""
    echo "// KAM API calls"
    echo "await fetch('/api/key-account-manager', {"
    echo "  method: 'POST',"
    echo "  headers: { 'Content-Type': 'application/json', 'X-Session-Token': sessionToken },"
    echo "  body: JSON.stringify({ endpoint: '/clients', method: 'GET', data: {} })"
    echo "});"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Some integration tests failed.${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting checklist:${NC}"
    echo "1. Verify Pages URL is correct"
    echo "2. Check that KAM worker is deployed and running"
    echo "3. Verify wrangler.toml service bindings are configured"
    echo "4. Check environment variables (CLIENT_API_KEY, WORKER_SHARED_SECRET)"
    echo "5. Run database schema extension if not done yet"
    exit 1
fi