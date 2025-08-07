# workers/bitware_rss_source_finder/test.sh
#!/bin/bash

# Test script for bitware_rss_source_finder v2.0 (Database-driven)
# This tests the redesigned worker with D1 database integration

echo "🧪 Testing Bitware RSS Source Finder Worker v2.0 (Database-Driven)"
echo "================================================================="

# Configuration - UPDATE THESE VALUES
WORKER_URL="https://bitware-rss-source-finder.jhaladik.workers.dev"
API_KEY="bitware-client-api-2024"
WORKER_SECRET="bitware-internal-auth-2024"

echo ""
echo "📋 Test 0: Help endpoint (no auth required)"
curl -s "$WORKER_URL/help"
echo -e "\n"

echo ""
echo "📋 Test 1: Available topics (no auth required)"  
curl -s "$WORKER_URL/topics"
echo -e "\n"

echo ""
echo "📋 Test 2: AI topic search (database-driven)"
curl -s -H "X-API-Key: $API_KEY" "$WORKER_URL?topic=ai&maxFeeds=5"
echo -e "\n"

echo ""
echo "📋 Test 3: Climate with quality filtering"
curl -s -H "X-API-Key: $API_KEY" "$WORKER_URL?topic=climate&minQualityScore=0.85&maxFeeds=3"
echo -e "\n"

echo ""
echo "📋 Test 4: Cryptocurrency topic (should find database sources)"
curl -s -H "X-API-Key: $API_KEY" "$WORKER_URL?topic=crypto&maxFeeds=4"
echo -e "\n"

echo ""
echo "📋 Test 5: Science with high quality filter"
curl -s -H "X-API-Key: $API_KEY" "$WORKER_URL?topic=science&minQualityScore=0.90&maxFeeds=3"
echo -e "\n"

echo ""
echo "📋 Test 6: Space topic search"
curl -s -H "X-API-Key: $API_KEY" "$WORKER_URL?topic=space&maxFeeds=4"
echo -e "\n"

echo ""
echo "📋 Test 7: Gaming topic search" 
curl -s -H "X-API-Key: $API_KEY" "$WORKER_URL?topic=gaming&maxFeeds=3"
echo -e "\n"

echo ""
echo "📋 Test 8: Business/Finance topic"
curl -s -H "X-API-Key: $API_KEY" "$WORKER_URL?topic=business&maxFeeds=3"
echo -e "\n"

echo ""
echo "📋 Test 9: Error handling - missing topic"
curl -s -H "X-API-Key: $API_KEY" "$WORKER_URL"
echo -e "\n"

echo ""
echo "📋 Test 10: Authentication test - no API key (should fail)"
curl -s "$WORKER_URL?topic=test"
echo -e "\n"

echo ""
echo "📋 Test 11: Cache performance test"
echo "First call (database query):"
time curl -s -H "X-API-Key: $API_KEY" "$WORKER_URL?topic=technology&maxFeeds=5" > /dev/null
echo "Second call (should be cached and faster):"
time curl -s -H "X-API-Key: $API_KEY" "$WORKER_URL?topic=technology&maxFeeds=5" > /dev/null
echo -e "\n"

echo ""
echo "📋 Test 12: Database stats (admin endpoint)"
curl -s -H "Authorization: Bearer $WORKER_SECRET" \
     -H "X-Worker-ID: test-client" \
     "$WORKER_URL/admin/stats"
echo -e "\n"

echo ""
echo "📋 Test 13: Add new source (admin endpoint)"
curl -s -X POST \
     -H "Authorization: Bearer $WORKER_SECRET" \
     -H "X-Worker-ID: test-client" \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://example.com/test-feed.xml",
       "title": "Test RSS Feed", 
       "description": "Test feed for demonstration",
       "topic": "test",
       "quality_score": 0.6
     }' \
     "$WORKER_URL/admin/add-source"
echo -e "\n"

echo ""
echo "✅ Tests completed!"
echo ""
echo "🔍 What to verify:"
echo "- Help and topics endpoints work without auth"
echo "- Database queries return real RSS sources (not just Google News)"
echo "- Quality filtering works (higher scores = better sources)"  
echo "- Caching improves performance on repeated calls"
echo "- Admin endpoints require worker authentication"
echo "- Stats show actual database content"
echo ""
echo "🚀 Next steps:"
echo "1. Create D1 database: wrangler d1 create RSS_SOURCES_DB"
echo "2. Update wrangler.toml with database_id"
echo "3. Initialize schema: wrangler d1 execute RSS_SOURCES_DB --file=schema.sql"
echo "4. Populate data: wrangler d1 execute RSS_SOURCES_DB --file=seed.sql"  
echo "5. Create KV namespace: wrangler kv:namespace create RSS_SOURCE_CACHE"
echo "6. Update wrangler.toml with KV namespace ID"
echo "7. Deploy: wrangler deploy"
echo "8. Update WORKER_URL, API_KEY, and WORKER_SECRET in this test script"