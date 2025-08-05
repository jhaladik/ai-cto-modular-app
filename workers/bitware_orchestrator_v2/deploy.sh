#!/bin/bash

echo "========================================="
echo "Orchestrator 2.0 Deployment Script"
echo "========================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if we're deploying to production or staging
ENV=${1:-staging}

if [ "$ENV" == "production" ] || [ "$ENV" == "prod" ]; then
    echo -e "${RED}WARNING: Deploying to PRODUCTION${NC}"
    echo "Are you sure? (yes/no)"
    read -r confirmation
    if [ "$confirmation" != "yes" ]; then
        echo "Deployment cancelled"
        exit 1
    fi
    ENV_FLAG=""
    ENV_NAME="production"
else
    ENV_FLAG="--env staging"
    ENV_NAME="staging"
fi

echo -e "\n${BLUE}Deploying to: $ENV_NAME${NC}"
echo "================================"

# Step 1: Install dependencies
echo -e "\n${YELLOW}Step 1: Installing dependencies...${NC}"
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi

# Step 2: Build TypeScript (if needed)
echo -e "\n${YELLOW}Step 2: Building TypeScript...${NC}"
npx tsc --noEmit
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ TypeScript build successful${NC}"
else
    echo -e "${RED}✗ TypeScript build failed${NC}"
    exit 1
fi

# Step 3: Create D1 database if it doesn't exist
echo -e "\n${YELLOW}Step 3: Setting up D1 database...${NC}"
if [ "$ENV_NAME" == "production" ]; then
    DB_NAME="orchestrator-v2-db"
else
    DB_NAME="orchestrator-v2-db-staging"
fi

# Check if database exists
wrangler d1 list | grep -q "$DB_NAME"
if [ $? -ne 0 ]; then
    echo "Creating database: $DB_NAME"
    wrangler d1 create "$DB_NAME"
    echo -e "${GREEN}✓ Database created${NC}"
    
    # Get the database ID and update wrangler.toml
    echo -e "${YELLOW}Please update the database_id in wrangler.toml with the ID shown above${NC}"
    echo "Press enter when done..."
    read
else
    echo -e "${GREEN}✓ Database already exists${NC}"
fi

# Step 4: Initialize database schema
echo -e "\n${YELLOW}Step 4: Initializing database schema...${NC}"
echo "Running orchestrator.sql..."
wrangler d1 execute "$DB_NAME" --file=schema/orchestrator.sql $ENV_FLAG
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Orchestrator schema initialized${NC}"
else
    echo -e "${RED}✗ Failed to initialize orchestrator schema${NC}"
fi

echo "Running resources.sql..."
wrangler d1 execute "$DB_NAME" --file=schema/resources.sql $ENV_FLAG
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Resources schema initialized${NC}"
else
    echo -e "${RED}✗ Failed to initialize resources schema${NC}"
fi

echo "Running execution.sql..."
wrangler d1 execute "$DB_NAME" --file=schema/execution.sql $ENV_FLAG
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Execution schema initialized${NC}"
else
    echo -e "${RED}✗ Failed to initialize execution schema${NC}"
fi

# Step 5: Seed initial data
echo -e "\n${YELLOW}Step 5: Seeding initial data...${NC}"
wrangler d1 execute "$DB_NAME" --file=schema/seed.sql $ENV_FLAG
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Initial data seeded${NC}"
else
    echo -e "${YELLOW}⚠ Seed data may already exist (this is okay)${NC}"
fi

# Step 6: Create KV namespaces if they don't exist
echo -e "\n${YELLOW}Step 6: Setting up KV namespaces...${NC}"
KV_NAMESPACES=("orchestrator-v2-execution-cache" "orchestrator-v2-resource-cache" "orchestrator-v2-data-refs")

if [ "$ENV_NAME" == "staging" ]; then
    KV_NAMESPACES=("orchestrator-v2-execution-cache-staging" "orchestrator-v2-resource-cache-staging" "orchestrator-v2-data-refs-staging")
fi

for namespace in "${KV_NAMESPACES[@]}"; do
    wrangler kv:namespace list | grep -q "$namespace"
    if [ $? -ne 0 ]; then
        echo "Creating KV namespace: $namespace"
        wrangler kv:namespace create "${namespace#orchestrator-v2-}"
        echo -e "${GREEN}✓ Created $namespace${NC}"
    else
        echo -e "${GREEN}✓ $namespace already exists${NC}"
    fi
done

# Step 7: Create R2 bucket if it doesn't exist
echo -e "\n${YELLOW}Step 7: Setting up R2 bucket...${NC}"
if [ "$ENV_NAME" == "production" ]; then
    R2_BUCKET="orchestrator-v2-data"
else
    R2_BUCKET="orchestrator-v2-data-staging"
fi

wrangler r2 bucket list | grep -q "$R2_BUCKET"
if [ $? -ne 0 ]; then
    echo "Creating R2 bucket: $R2_BUCKET"
    wrangler r2 bucket create "$R2_BUCKET"
    echo -e "${GREEN}✓ R2 bucket created${NC}"
else
    echo -e "${GREEN}✓ R2 bucket already exists${NC}"
fi

# Step 8: Deploy the worker
echo -e "\n${YELLOW}Step 8: Deploying Orchestrator 2.0...${NC}"
wrangler deploy $ENV_FLAG
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Orchestrator 2.0 deployed successfully!${NC}"
else
    echo -e "${RED}✗ Deployment failed${NC}"
    exit 1
fi

# Step 9: Run health check
echo -e "\n${YELLOW}Step 9: Running health check...${NC}"
if [ "$ENV_NAME" == "production" ]; then
    WORKER_URL="https://bitware-orchestrator-v2.workers.dev"
else
    WORKER_URL="https://bitware-orchestrator-v2-staging.workers.dev"
fi

sleep 3
HEALTH_RESPONSE=$(curl -s "$WORKER_URL/health")
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    echo "$HEALTH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$HEALTH_RESPONSE"
else
    echo -e "${RED}✗ Health check failed${NC}"
    echo "$HEALTH_RESPONSE"
fi

# Step 10: Sync templates from KAM (if available)
echo -e "\n${YELLOW}Step 10: Syncing templates from KAM...${NC}"
SYNC_RESPONSE=$(curl -s -X POST "$WORKER_URL/templates/sync" \
    -H "Authorization: Bearer orchestrator-secret" \
    -H "X-Worker-ID: bitware_orchestrator_v2")

if echo "$SYNC_RESPONSE" | grep -q "synced"; then
    echo -e "${GREEN}✓ Templates synced${NC}"
    echo "$SYNC_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$SYNC_RESPONSE"
else
    echo -e "${YELLOW}⚠ Template sync failed (KAM might not be available)${NC}"
fi

echo ""
echo "========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "========================================="
echo ""
echo "Worker URL: $WORKER_URL"
echo "Environment: $ENV_NAME"
echo ""
echo "Next steps:"
echo "1. Test the deployment: ./test.sh prod"
echo "2. Check logs: wrangler tail $ENV_FLAG"
echo "3. Monitor metrics: $WORKER_URL/metrics"
echo ""
echo "To deploy mock workers for testing:"
echo "  wrangler deploy mock-worker.js --name mock-topic-researcher"
echo "  wrangler deploy mock-worker.js --name mock-rss-finder"
echo "  etc."