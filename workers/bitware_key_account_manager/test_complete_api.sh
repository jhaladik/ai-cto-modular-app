#!/bin/bash
# workers/bitware_key_account_manager/test_complete_api.sh
# Comprehensive test suite for KAM worker API endpoints
# Tests all endpoints specified in frontend specification

set -e

# Configuration
BASE_URL="https://bitware-key-account-manager.jhaladik.workers.dev"
CLIENT_API_KEY="external-client-api-key-2024"
WORKER_SECRET="internal-worker-auth-token-2024"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TEST_COUNT=0
PASS_COUNT=0
FAIL_COUNT=0

# Session token (will be set after login)
SESSION_TOKEN=""

# Function to print test results
print_test() {
    TEST_COUNT=$((TEST_COUNT + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ Test $TEST_COUNT: $2${NC}"
        PASS_COUNT=$((PASS_COUNT + 1))
    else
        echo -e "${RED}✗ Test $TEST_COUNT: $2${NC}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
}

# Function to run curl and check response
test_endpoint() {
    local method=$1
    local endpoint=$2
    local headers=$3
    local data=$4
    local description=$5
    local expected_status=${6:-200}
    
    echo -e "\n${BLUE}Testing: $description${NC}"
    echo "curl -s -w \"%{http_code}\" -X $method \"$BASE_URL$endpoint\" $headers $data"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "%{http_code}" -X "$method" "$BASE_URL$endpoint" $headers -d "$data")
    else
        response=$(curl -s -w "%{http_code}" -X "$method" "$BASE_URL$endpoint" $headers)
    fi
    
    # Extract status code (last 3 characters)
    status_code="${response: -3}"
    # Extract body (all but last 3 characters)
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

echo -e "${YELLOW}🚀 Starting KAM Worker API Test Suite${NC}"
echo "Base URL: $BASE_URL"
echo "========================================"

# ==================== PUBLIC ENDPOINTS ====================

echo -e "\n${BLUE}📡 Testing Public Endpoints${NC}"

test_endpoint "GET" "/help" "" "" "Health check endpoint"

test_endpoint "GET" "/capabilities" "" "" "Capabilities endpoint"

test_endpoint "GET" "/health" "" "" "System health endpoint"

# ==================== AUTHENTICATION ENDPOINTS ====================

echo -e "\n${BLUE}🔐 Testing Authentication Endpoints${NC}"

# Test login with admin credentials
AUTH_DATA='{
  "username": "admin@company.com",
  "password": "admin123",
  "expected_role": "admin"
}'

echo -e "\n${YELLOW}Attempting admin login...${NC}"
response=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "$AUTH_DATA")

status_code="${response: -3}"
body="${response%???}"

echo "Login Status: $status_code"
echo "Login Response: $body" | jq . 2>/dev/null || echo "Login Response: $body"

if [ "$status_code" -eq 200 ]; then
    SESSION_TOKEN=$(echo "$body" | jq -r '.token // empty' 2>/dev/null)
    if [ -n "$SESSION_TOKEN" ] && [ "$SESSION_TOKEN" != "null" ]; then
        print_test 0 "Admin login successful"
        echo "Session Token: ${SESSION_TOKEN:0:20}..."
    else
        print_test 1 "Admin login failed - no token received"
    fi
else
    print_test 1 "Admin login failed - status $status_code"
fi

# Test session validation (if we have a token)
if [ -n "$SESSION_TOKEN" ]; then
    test_endpoint "POST" "/auth/validate" \
        "-H \"x-bitware-session-token: $SESSION_TOKEN\"" \
        "" \
        "Session token validation"
fi

# ==================== CLIENT MANAGEMENT ENDPOINTS ====================

echo -e "\n${BLUE}👥 Testing Client Management Endpoints${NC}"

if [ -n "$SESSION_TOKEN" ]; then
    # Test get all clients (admin only)
    test_endpoint "GET" "/clients" \
        "-H \"x-bitware-session-token: $SESSION_TOKEN\"" \
        "" \
        "Get all clients list (admin)"
    
    # Test get client by email
    test_endpoint "GET" "/client?email=admin@company.com" \
        "-H \"x-bitware-session-token: $SESSION_TOKEN\"" \
        "" \
        "Get client by email"
    
    # Test get specific client (using first client if available)
    test_endpoint "GET" "/client/client_001" \
        "-H \"x-bitware-session-token: $SESSION_TOKEN\"" \
        "" \
        "Get specific client by ID" \
        404  # Expected 404 if client doesn't exist
else
    echo -e "${YELLOW}⚠️ Skipping client tests - no session token${NC}"
fi

# ==================== USER MANAGEMENT ENDPOINTS ====================

echo -e "\n${BLUE}👤 Testing User Management Endpoints${NC}"

if [ -n "$SESSION_TOKEN" ]; then
    # Test get all users (admin only)
    test_endpoint "GET" "/users" \
        "-H \"x-bitware-session-token: $SESSION_TOKEN\"" \
        "" \
        "Get all users list (admin)"
    
    # Test create new user
    USER_DATA='{
      "username": "test.user",
      "email": "test.user@company.com",
      "full_name": "Test User",
      "role": "client",
      "password": "testpass123"
    }'
    
    test_endpoint "POST" "/users" \
        "-H \"x-bitware-session-token: $SESSION_TOKEN\" -H \"Content-Type: application/json\"" \
        "$USER_DATA" \
        "Create new user"
else
    echo -e "${YELLOW}⚠️ Skipping user management tests - no session token${NC}"
fi

# ==================== DASHBOARD ENDPOINTS ====================

echo -e "\n${BLUE}📊 Testing Dashboard Endpoints${NC}"

if [ -n "$SESSION_TOKEN" ]; then
    test_endpoint "GET" "/dashboard/stats" \
        "-H \"x-bitware-session-token: $SESSION_TOKEN\"" \
        "" \
        "Get dashboard statistics (admin)"
else
    echo -e "${YELLOW}⚠️ Skipping dashboard tests - no session token${NC}"
fi

# ==================== LEGACY WORKER ENDPOINTS ====================

echo -e "\n${BLUE}🔧 Testing Legacy Worker Endpoints${NC}"

# Test legacy user validation (worker auth)
LEGACY_USER_DATA='{
  "email": "admin@company.com",
  "password": "admin123",
  "expected_role": "admin"
}'

test_endpoint "POST" "/auth/validate-user" \
    "-H \"Authorization: Bearer $WORKER_SECRET\" -H \"X-Worker-ID: test-runner\" -H \"Content-Type: application/json\"" \
    "$LEGACY_USER_DATA" \
    "Legacy user validation (worker auth)"

# ==================== ERROR HANDLING TESTS ====================

echo -e "\n${BLUE}❌ Testing Error Handling${NC}"

# Test unauthorized access
test_endpoint "GET" "/clients" \
    "" \
    "" \
    "Unauthorized access to clients" \
    401

# Test invalid session token
test_endpoint "GET" "/clients" \
    "-H \"x-bitware-session-token: invalid_token\"" \
    "" \
    "Invalid session token" \
    401

# Test invalid endpoint
test_endpoint "GET" "/nonexistent" \
    "" \
    "" \
    "Invalid endpoint" \
    404

# Test malformed JSON
test_endpoint "POST" "/auth/login" \
    "-H \"Content-Type: application/json\"" \
    "invalid json" \
    "Malformed JSON request" \
    400

# ==================== LOGOUT TEST ====================

echo -e "\n${BLUE}🚪 Testing Logout${NC}"

if [ -n "$SESSION_TOKEN" ]; then
    test_endpoint "POST" "/auth/logout" \
        "-H \"x-bitware-session-token: $SESSION_TOKEN\"" \
        "" \
        "User logout"
    
    # Verify token is invalidated
    test_endpoint "POST" "/auth/validate" \
        "-H \"x-bitware-session-token: $SESSION_TOKEN\"" \
        "" \
        "Session invalidated after logout" \
        401
fi

# ==================== TEST SUMMARY ====================

echo -e "\n${YELLOW}========================================"
echo "🏁 Test Suite Complete"
echo "========================================"
echo "Total Tests: $TEST_COUNT"
echo -e "Passed: ${GREEN}$PASS_COUNT${NC}"
echo -e "Failed: ${RED}$FAIL_COUNT${NC}"

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Check the output above.${NC}"
    exit 1
fi

# ==================== FRONTEND INTEGRATION TESTS ====================

echo -e "\n${BLUE}🌐 Frontend Integration Verification${NC}"
echo "The following endpoints should work with your frontend:"
echo ""
echo "✓ POST /api/auth/login (via Pages proxy)"
echo "✓ POST /api/auth/validate (via Pages proxy)"
echo "✓ POST /api/auth/logout (via Pages proxy)"
echo "✓ GET /api/kam/clients (via Pages proxy)"
echo "✓ GET /api/kam/client/{id} (via Pages proxy)"
echo "✓ GET /api/kam/client?email={email} (via Pages proxy)"
echo "✓ GET /api/kam/users (via Pages proxy)"
echo "✓ POST /api/kam/users (via Pages proxy)"
echo "✓ GET /api/kam/dashboard/stats (via Pages proxy)"
echo ""
echo "Frontend should use these exact endpoint paths through the Pages proxy."