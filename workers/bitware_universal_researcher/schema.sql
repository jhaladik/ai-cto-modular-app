-- Universal Discovery Sessions
-- Tracks each discovery request with full client context
CREATE TABLE IF NOT EXISTS discovery_sessions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  pipeline_id TEXT NOT NULL,
  template_capability TEXT NOT NULL,
  template_parameters TEXT, -- JSON
  input_data TEXT, -- JSON
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  sources_found INTEGER DEFAULT 0,
  execution_time_ms INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_discovery_sessions_client ON discovery_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_discovery_sessions_pipeline ON discovery_sessions(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_discovery_sessions_status ON discovery_sessions(status);
CREATE INDEX IF NOT EXISTS idx_discovery_sessions_created ON discovery_sessions(created_at);

-- Universal Discovered Sources
-- Platform-agnostic source storage with rich metadata
CREATE TABLE IF NOT EXISTS discovered_sources (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('rss', 'youtube', 'podcast', 'academic', 'social')),
  identifier TEXT NOT NULL, -- URL, channel_id, podcast_id, doi, etc.
  title TEXT NOT NULL,
  description TEXT,
  quality_score REAL NOT NULL,
  relevance_score REAL NOT NULL,
  discovery_method TEXT NOT NULL,
  metadata TEXT, -- JSON with platform-specific data
  verified BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES discovery_sessions(id)
);

-- Indexes for performance and uniqueness
CREATE INDEX IF NOT EXISTS idx_discovered_sources_session ON discovered_sources(session_id);
CREATE INDEX IF NOT EXISTS idx_discovered_sources_client ON discovered_sources(client_id);
CREATE INDEX IF NOT EXISTS idx_discovered_sources_platform ON discovered_sources(platform);
CREATE INDEX IF NOT EXISTS idx_discovered_sources_quality ON discovered_sources(quality_score);
CREATE INDEX IF NOT EXISTS idx_discovered_sources_created ON discovered_sources(created_at);

-- Prevent duplicate sources per client (same platform + identifier)
CREATE UNIQUE INDEX IF NOT EXISTS idx_discovered_sources_unique 
ON discovered_sources(client_id, platform, identifier);

-- Performance Analytics View
CREATE VIEW IF NOT EXISTS discovery_analytics AS
SELECT 
  platform,
  COUNT(*) as total_sources,
  AVG(quality_score) as avg_quality,
  AVG(relevance_score) as avg_relevance,
  COUNT(CASE WHEN verified = TRUE THEN 1 END) as verified_sources,
  DATE(created_at) as discovery_date
FROM discovered_sources
GROUP BY platform, DATE(created_at)
ORDER BY discovery_date DESC, total_sources DESC;

-- Client Performance Summary
CREATE VIEW IF NOT EXISTS client_discovery_summary AS
SELECT 
  client_id,
  COUNT(DISTINCT session_id) as total_sessions,
  COUNT(*) as total_sources_discovered,
  AVG(quality_score) as avg_quality_score,
  COUNT(DISTINCT platform) as platforms_used,
  MAX(created_at) as last_discovery,
  COUNT(CASE WHEN created_at > datetime('now', '-30 days') THEN 1 END) as sources_last_30_days
FROM discovered_sources
GROUP BY client_id
ORDER BY total_sources_discovered DESC;
