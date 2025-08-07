#!/bin/bash

# Bitware Report Builder - Complete Setup Script
# Sets up databases, KV storage, and all required configurations

echo "🏭 Bitware Report Builder - Complete Setup"
echo "==========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if wrangler is available
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Wrangler CLI not found. Please install with: npm install -g wrangler${NC}"
    exit 1
fi

# Check if logged in
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Please login to Cloudflare first: wrangler login${NC}"
    exit 1
fi

echo "=== Phase 5: Required Secrets ==="

echo -e "${YELLOW}🔐 Set these secrets before deploying:${NC}"
echo ""
echo "1. OpenAI API Key:"
echo "   wrangler secret put OPENAI_API_KEY"
echo ""
echo "2. Worker Shared Secret:"
echo "   wrangler secret put WORKER_SHARED_SECRET"
echo "   Use: internal-worker-auth-token-2024"
echo ""
echo "3. Client API Key:"
echo "   wrangler secret put CLIENT_API_KEY"
echo "   Use: external-client-api-key-2024"
echo ""

echo "=== Phase 6: Optional Integration Setup ==="

echo -e "${BLUE}🔗 For full pipeline integration, you'll also need:${NC}"
echo ""
echo "1. Content Classifier Database Access:"
echo "   - Ensure bitware-content-analysis-db exists"
echo "   - Add binding in wrangler.toml for CONTENT_ANALYSIS_DB"
echo ""
echo "2. Feed Fetcher Database Access:"
echo "   - Ensure fetched-articles-db exists"  
echo "   - Add binding in wrangler.toml for FETCHED_ARTICLES_DB"
echo ""
echo "Example additional bindings for wrangler.toml:"
echo ""
echo "[[d1_databases]]"
echo "binding = \"CONTENT_ANALYSIS_DB\""
echo "database_name = \"bitware-content-analysis-db\""
echo "database_id = \"YOUR_CONTENT_CLASSIFIER_DB_ID\""
echo ""
echo "[[d1_databases]]"
echo "binding = \"FETCHED_ARTICLES_DB\""
echo "database_name = \"fetched-articles-db\""
echo "database_id = \"YOUR_FEED_FETCHER_DB_ID\""
echo ""

echo "=== Phase 7: Testing Setup ==="

echo -e "${GREEN}🧪 To test your setup:${NC}"
echo ""
echo "1. Update wrangler.toml with the database/KV IDs above"
echo "2. Set the required secrets"
echo "3. Deploy: npm run deploy:dev"
echo "4. Test: npm run test"
echo ""

echo "=== Phase 8: Sample Data (Optional) ==="

echo -e "${BLUE}📊 Add sample data for testing:${NC}"
echo ""
echo "wrangler d1 execute bitware-report-generation-db --command=\""
echo "INSERT INTO report_jobs (report_type, topic_filters, articles_analyzed, status, completed_at) VALUES "
echo "('executive_summary', '[\\\"artificial intelligence\\\"]', 15, 'completed', datetime('now', '-1 hour'));"
echo "\""
echo ""

echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo ""
echo "Next steps:"
echo "1. ✏️  Update wrangler.toml with the IDs shown above"
echo "2. 🔐 Set the required secrets"
echo "3. 🚀 Deploy with: npm run deploy:dev"
echo "4. 🧪 Test with: npm run test"
echo ""
echo "The worker includes fallback sample data, so it will work even without"
echo "the content classifier database initially."