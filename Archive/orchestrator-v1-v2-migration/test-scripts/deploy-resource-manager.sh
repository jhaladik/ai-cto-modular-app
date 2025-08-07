#!/bin/bash

# Resource Manager Deployment Script
# This script deploys the Resource Manager and migrates from Orchestrator v2

set -e

echo "======================================"
echo "Resource Manager Deployment Script"
echo "======================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}Error: wrangler CLI is not installed${NC}"
    echo "Please install it with: npm install -g wrangler"
    exit 1
fi

echo -e "\n${YELLOW}Step 1: Creating Cloudflare Resources${NC}"
echo "========================================"

# Create D1 Database
echo "Creating D1 database..."
DB_OUTPUT=$(wrangler d1 create resource-manager-db 2>&1 || true)
if echo "$DB_OUTPUT" | grep -q "already exists"; then
    echo -e "${YELLOW}Database already exists${NC}"
else
    echo -e "${GREEN}Database created${NC}"
fi

# Extract database ID
echo "Please update the database_id in wrangler.toml with the ID shown above"
read -p "Enter the database ID: " DB_ID

# Create KV Namespaces
echo -e "\nCreating KV namespaces..."

echo "Creating RESOURCE_CACHE..."
KV1=$(wrangler kv:namespace create "RESOURCE_CACHE" 2>&1 || true)
if echo "$KV1" | grep -q "already exists"; then
    echo -e "${YELLOW}RESOURCE_CACHE already exists${NC}"
else
    echo -e "${GREEN}RESOURCE_CACHE created${NC}"
    echo "$KV1"
fi

echo "Creating EXECUTION_QUEUE..."
KV2=$(wrangler kv:namespace create "EXECUTION_QUEUE" 2>&1 || true)
if echo "$KV2" | grep -q "already exists"; then
    echo -e "${YELLOW}EXECUTION_QUEUE already exists${NC}"
else
    echo -e "${GREEN}EXECUTION_QUEUE created${NC}"
    echo "$KV2"
fi

echo "Creating COST_TRACKING..."
KV3=$(wrangler kv:namespace create "COST_TRACKING" 2>&1 || true)
if echo "$KV3" | grep -q "already exists"; then
    echo -e "${YELLOW}COST_TRACKING already exists${NC}"
else
    echo -e "${GREEN}COST_TRACKING created${NC}"
    echo "$KV3"
fi

# Create R2 Bucket
echo -e "\nCreating R2 bucket..."
R2_OUTPUT=$(wrangler r2 bucket create resource-manager-data 2>&1 || true)
if echo "$R2_OUTPUT" | grep -q "already exists"; then
    echo -e "${YELLOW}R2 bucket already exists${NC}"
else
    echo -e "${GREEN}R2 bucket created${NC}"
fi

echo -e "\n${YELLOW}Step 2: Updating Configuration${NC}"
echo "========================================"

cd workers/bitware_resource_manager

# Prompt for KV namespace IDs
echo "Please update the KV namespace IDs in wrangler.toml"
echo "You can find them in the output above or by running:"
echo "  wrangler kv:namespace list"
read -p "Press Enter when you've updated wrangler.toml..."

echo -e "\n${YELLOW}Step 3: Installing Dependencies${NC}"
echo "========================================"
npm install

echo -e "\n${YELLOW}Step 4: Initializing Database${NC}"
echo "========================================"
echo "Running database migrations..."
wrangler d1 execute resource-manager-db --file=schema.sql

echo -e "\n${YELLOW}Step 5: Deploying Resource Manager${NC}"
echo "========================================"
wrangler deploy

echo -e "\n${YELLOW}Step 6: Updating KAM Service Binding${NC}"
echo "========================================"
cd ../bitware_key_account_manager

# Check if Resource Manager binding exists
if grep -q "RESOURCE_MANAGER" wrangler.toml; then
    echo -e "${YELLOW}Resource Manager binding already exists in KAM${NC}"
else
    echo "Adding Resource Manager service binding to KAM..."
    cat >> wrangler.toml << EOF

[[services]]
binding = "RESOURCE_MANAGER"
service = "bitware-resource-manager"
EOF
    echo -e "${GREEN}Service binding added${NC}"
fi

echo -e "\n${YELLOW}Step 7: Testing Resource Manager${NC}"
echo "========================================"
cd ../bitware_resource_manager

# Get the deployed URL
DEPLOYED_URL=$(wrangler deploy --dry-run 2>&1 | grep -oE 'https://[^ ]+\.workers\.dev' | head -1)

if [ -z "$DEPLOYED_URL" ]; then
    DEPLOYED_URL="https://bitware-resource-manager.jhaladik.workers.dev"
fi

echo "Testing Resource Manager at: $DEPLOYED_URL"

# Test health endpoint
echo -n "Testing health endpoint... "
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYED_URL/health")
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ (Status: $HEALTH_RESPONSE)${NC}"
fi

# Test resource availability
echo -n "Testing resource availability... "
RESOURCE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYED_URL/api/resources/availability")
if [ "$RESOURCE_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ (Status: $RESOURCE_RESPONSE)${NC}"
fi

echo -e "\n${YELLOW}Step 8: Migration Checklist${NC}"
echo "========================================"
echo "Please complete the following manual steps:"
echo ""
echo "[ ] 1. Update KAM to call Resource Manager instead of Orchestrator v2"
echo "    - Update execute endpoint in KAM"
echo "    - Change from /api/pipelines/execute to /api/execute"
echo ""
echo "[ ] 2. Update Pages frontend"
echo "    - Create /functions/api/resource-manager.js proxy"
echo "    - Update orchestrator-page.js to use Resource Manager"
echo ""
echo "[ ] 3. Update worker bindings in other workers"
echo "    - Remove ORCHESTRATOR_V2 binding"
echo "    - Add RESOURCE_MANAGER binding"
echo ""
echo "[ ] 4. Test end-to-end flow"
echo "    - Create a test request through KAM"
echo "    - Verify execution through Resource Manager"
echo "    - Check cost tracking"
echo ""
echo "[ ] 5. Monitor for 24 hours"
echo "    - Check logs: wrangler tail --name bitware-resource-manager"
echo "    - Monitor metrics: $DEPLOYED_URL/metrics"
echo "    - Review alerts: $DEPLOYED_URL/admin/alerts"
echo ""
echo "[ ] 6. Decommission Orchestrator v2"
echo "    - Remove orchestrator-v2 worker"
echo "    - Delete orchestrator-v2 database"
echo "    - Remove old KV namespaces"

echo -e "\n${GREEN}========================================"
echo "Resource Manager Deployment Complete!"
echo "========================================${NC}"
echo ""
echo "Resource Manager URL: $DEPLOYED_URL"
echo "Next step: Update KAM to use Resource Manager"
echo ""
echo "To rollback if needed:"
echo "  1. Update KAM to use Orchestrator v2 again"
echo "  2. Run: wrangler delete --name bitware-resource-manager"