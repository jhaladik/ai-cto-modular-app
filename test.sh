#!/bin/bash
# Updated test script with working credentials from KAM worker

WORKER_URL="https://bitware-key-account-manager.jhaladik.workers.dev"
CLIENT_API_KEY="external-client-api-key-2024"
WORKER_SHARED_SECRET="internal-worker-auth-token-2024"
ADMIN_WORKER_ID="bitware_admin_dashboard"

echo "🔑 FIXED KAM Worker Authentication & Role Retrieval Tests"
echo "========================================================"

# Test 1: Health check (✅ WORKING)
echo "Test 1: KAM Health Check"
curl -s "$WORKER_URL/health" 
echo ""

# Test 2: Use CORRECT credentials from KAM worker code
echo "Test 2: Auth Validation with CORRECT Admin Credentials"
curl -s -X POST "$WORKER_URL/auth/validate-user" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
  -H "X-Worker-ID: pages-auth-proxy" \
  -d '{
    "email": "admin@company.com",
    "password": "admin123",
    "expected_role": "admin"
  }' 
echo ""

echo "Test 2b: Auth Validation with Client Credentials"
curl -s -X POST "$WORKER_URL/auth/validate-user" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
  -H "X-Worker-ID: pages-auth-proxy" \
  -d '{
    "email": "sarah.johnson@techcorp.com",
    "password": "client123",
    "expected_role": "client"
  }' 
echo ""

echo "Test 2c: Auth Validation with User Credentials"
curl -s -X POST "$WORKER_URL/auth/validate-user" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
  -H "X-Worker-ID: pages-auth-proxy" \
  -d '{
    "email": "user@company.com",
    "password": "user123",
    "expected_role": "user"
  }' 
echo ""

# Test 3: Get Client Role Data (✅ WORKING)
echo "Test 3: Get Client Role Data (seed data)"
curl -s -X GET "$WORKER_URL/client?email=sarah.johnson@techcorp.com" \
  -H "X-API-Key: $CLIENT_API_KEY" \
  -H "Content-Type: application/json" 
echo ""

# Test 4: Admin stats (✅ WORKING)
echo "Test 4: Admin Stats (Role: admin required)"
curl -s -X GET "$WORKER_URL/admin/stats" \
  -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
  -H "X-Worker-ID: $ADMIN_WORKER_ID" 
echo ""

# Test 5: Session registration with CORRECT parameters
echo "Test 5: Session Registration with Correct Parameters"
curl -s -X POST "$WORKER_URL/session/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
  -H "X-Worker-ID: pages-auth-proxy" \
  -d '{
    "session_token": "test-session-12345",
    "user_id": "admin-user-001",
    "client_id": null,
    "login_method": "dashboard",
    "expires_at": "2025-07-31T12:00:00Z"
  }' 
echo ""

echo "Test 5b: Session Registration for Client User"
curl -s -X POST "$WORKER_URL/session/register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
  -H "X-Worker-ID: pages-auth-proxy" \
  -d '{
    "session_token": "test-client-session-67890",
    "user_id": "client-user-001", 
    "client_id": "client_demo_001",
    "login_method": "dashboard",
    "expires_at": "2025-07-31T12:00:00Z"
  }' 
echo ""

# Test 6: Check actual endpoints that exist
echo "Test 6: Available Admin Endpoints"
echo "Admin Clients:"
curl -s -X GET "$WORKER_URL/admin/clients" \
  -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
  -H "X-Worker-ID: $ADMIN_WORKER_ID" 
echo ""

# Test 7: Communication analysis (real endpoint)
echo "Test 7: Communication Analysis"
curl -s -X POST "$WORKER_URL/analyze-communication" \
  -H "X-API-Key: $CLIENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hi, I need urgent market research for our board meeting tomorrow!",
    "client_email": "sarah.johnson@techcorp.com",
    "channel": "email"
  }' 
echo ""