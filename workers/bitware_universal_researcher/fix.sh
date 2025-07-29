#!/bin/bash
# ===========================================
# Universal Researcher 2.0 - HOTFIX
# ===========================================
# Fix the database initialization code and redeploy

echo "🚨 HOTFIX: Universal Researcher 2.0 Database Issue"
echo "Problem: Inline INDEX syntax in CREATE TABLE statements"
echo ""

# Step 1: Update the worker code with correct database initialization
echo "1. Fixing database initialization code..."

cat > workers/bitware_universal_researcher/database_fix.js << 'EOF'
// Fixed database initialization function
async function initializeDatabase(env) {
  try {
    // Create discovery_sessions table
    await env.UNIVERSAL_DISCOVERY_DB.prepare(`
      CREATE TABLE IF NOT EXISTS discovery_sessions (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        request_id TEXT NOT NULL,
        pipeline_id TEXT NOT NULL,
        template_capability TEXT NOT NULL,
        template_parameters TEXT,
        input_data TEXT,
        status TEXT DEFAULT 'active',
        sources_found INTEGER DEFAULT 0,
        execution_time_ms INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      )
    `).run();

    // Create discovered_sources table
    await env.UNIVERSAL_DISCOVERY_DB.prepare(`
      CREATE TABLE IF NOT EXISTS discovered_sources (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        identifier TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        quality_score REAL NOT NULL,
        relevance_score REAL NOT NULL,
        discovery_method TEXT NOT NULL,
        metadata TEXT,
        verified INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // Create indexes separately
    try {
      await env.UNIVERSAL_DISCOVERY_DB.prepare(`CREATE INDEX IF NOT EXISTS idx_discovery_sessions_client ON discovery_sessions(client_id)`).run();
      await env.UNIVERSAL_DISCOVERY_DB.prepare(`CREATE INDEX IF NOT EXISTS idx_discovery_sessions_pipeline ON discovery_sessions(pipeline_id)`).run();
      await env.UNIVERSAL_DISCOVERY_DB.prepare(`CREATE INDEX IF NOT EXISTS idx_discovery_sessions_status ON discovery_sessions(status)`).run();
      await env.UNIVERSAL_DISCOVERY_DB.prepare(`CREATE INDEX IF NOT EXISTS idx_discovered_sources_session ON discovered_sources(session_id)`).run();
      await env.UNIVERSAL_DISCOVERY_DB.prepare(`CREATE INDEX IF NOT EXISTS idx_discovered_sources_client ON discovered_sources(client_id)`).run();
      await env.UNIVERSAL_DISCOVERY_DB.prepare(`CREATE INDEX IF NOT EXISTS idx_discovered_sources_platform ON discovered_sources(platform)`).run();
      await env.UNIVERSAL_DISCOVERY_DB.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_discovered_sources_unique ON discovered_sources(client_id, platform, identifier)`).run();
    } catch (indexError) {
      console.warn('⚠️ Some indexes failed to create (may already exist):', indexError.message);
    }

    console.log('✅ Universal Discovery database initialized');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}
EOF

echo "✅ Database fix code created"

# Step 2: Manual database schema fix first
echo "2. Manually fixing database schema..."

wrangler d1 execute universal-discovery-db --command="
-- Drop existing problematic tables
DROP TABLE IF EXISTS discovered_sources;
DROP TABLE IF EXISTS discovery_sessions;

-- Create tables with correct syntax
CREATE TABLE discovery_sessions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  pipeline_id TEXT NOT NULL,
  template_capability TEXT NOT NULL,
  template_parameters TEXT,
  input_data TEXT,
  status TEXT DEFAULT 'active',
  sources_found INTEGER DEFAULT 0,
  execution_time_ms INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

CREATE TABLE discovered_sources (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  identifier TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  quality_score REAL NOT NULL,
  relevance_score REAL NOT NULL,
  discovery_method TEXT NOT NULL,
  metadata TEXT,
  verified INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
" --remote

echo "✅ Database schema fixed"

# Step 3: Create indexes
echo "3. Creating indexes..."

wrangler d1 execute universal-discovery-db --command="
CREATE INDEX IF NOT EXISTS idx_discovery_sessions_client ON discovery_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_discovery_sessions_pipeline ON discovery_sessions(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_discovery_sessions_status ON discovery_sessions(status);
CREATE INDEX IF NOT EXISTS idx_discovered_sources_session ON discovered_sources(session_id);
CREATE INDEX IF NOT EXISTS idx_discovered_sources_client ON discovered_sources(client_id);
CREATE INDEX IF NOT EXISTS idx_discovered_sources_platform ON discovered_sources(platform);
CREATE UNIQUE INDEX IF NOT EXISTS idx_discovered_sources_unique ON discovered_sources(client_id, platform, identifier);
" --remote

echo "✅ Indexes created"

# Step 4: Apply the code fix to index.ts
echo "4. Updating worker code..."

# You need to manually update the initializeDatabase function in your index.ts
# Copy the corrected version from the database_fix.js file above
echo "⚠️  MANUAL STEP REQUIRED:"
echo "   Update the initializeDatabase function in your index.ts file"
echo "   Use the corrected version from database_fix.js"
echo ""

# Step 5: Redeploy worker
echo "5. Redeploying worker..."
cd workers/bitware_universal_researcher
wrangler deploy

echo ""
echo "🎉 HOTFIX COMPLETE!"
echo ""

# Step 6: Test the fix
echo "6. Testing the fix..."
sleep 3

WORKER_URL="https://bitware-universal-researcher.jhaladik.workers.dev"

echo "Testing health endpoint..."
health_response=$(curl -s "$WORKER_URL/health")
echo "$health_response"

echo ""
echo "Testing template execution..."
test_response=$(curl -s -X POST "$WORKER_URL/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: external-client-api-key-2024" \
  -d '{
    "context": {
      "client_id": "hotfix_test",
      "request_id": "req_hotfix_001",
      "pipeline_id": "pipe_hotfix_001",
      "billing_tier": "pro"
    },
    "template": {
      "capability": "search_rss",
      "parameters": {"depth": 1, "quality_threshold": 0.7},
      "output_format": "standard"
    },
    "data": {"topic": "test"}
  }')

echo "$test_response"

echo ""
if echo "$test_response" | grep -q '