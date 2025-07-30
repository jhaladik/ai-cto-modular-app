#!/bin/bash

# ===========================================
# 🤝 KAM Data Collection - JSON Output Only
# ===========================================

KEY_ACCOUNT_MANAGER_URL="https://bitware-key-account-manager.jhaladik.workers.dev"
WORKER_SHARED_SECRET="internal-worker-auth-token-2024"
CLIENT_API_KEY="external-client-api-key-2024"
ADMIN_WORKER_ID="bitware_admin_dashboard"

make_admin_call() {
    curl -s -X "${2:-GET}" \
         -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
         -H "X-Worker-ID: $ADMIN_WORKER_ID" \
         -H "Content-Type: application/json" \
         "$KEY_ACCOUNT_MANAGER_URL$1"
}

make_client_call() {
    if [ -n "$3" ]; then
        curl -s -X "${2:-GET}" \
             -H "X-API-Key: $CLIENT_API_KEY" \
             -H "Content-Type: application/json" \
             -d "$3" \
             "$KEY_ACCOUNT_MANAGER_URL$1"
    else
        curl -s -X "${2:-GET}" \
             -H "X-API-Key: $CLIENT_API_KEY" \
             -H "Content-Type: application/json" \
             "$KEY_ACCOUNT_MANAGER_URL$1"
    fi
}

echo "{"
echo '  "health":'
curl -s "$KEY_ACCOUNT_MANAGER_URL/health"
echo ','

echo '  "capabilities":'
curl -s "$KEY_ACCOUNT_MANAGER_URL/capabilities"
echo ','

echo '  "admin_stats":'
make_admin_call "/admin/stats"
echo ','

echo '  "clients":'
make_admin_call "/admin/clients"
echo ','

echo '  "templates":'
make_client_call "/templates"
echo ','

echo '  "communications":'
make_admin_call "/admin/communications"
echo ','

echo '  "sample_communication_analysis":'
make_client_call "/analyze-communication" "POST" '{
    "content": "Need urgent AI market research for board meeting",
    "type": "email_inbound",
    "client_id": "test",
    "sender_email": "ceo@test.com"
}'
echo ','

echo '  "sample_template_recommendation":'
make_client_call "/recommend-template" "POST" '{
    "client_email": "admin@testcompany.com",
    "request": "competitive intelligence analysis for fintech"
}'
echo ','

echo '  "sample_client_lookup":'
make_client_call "/client?email=admin@testcompany.com"

echo '}'