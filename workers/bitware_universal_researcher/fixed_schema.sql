-- ===========================================
-- Universal Researcher 2.0 - Fixed Database Schema
-- ===========================================
-- Fix for D1_ERROR: near "INDEX": syntax error at offset 592: SQLITE_ERROR

-- Drop existing tables if they exist
DROP TABLE IF EXISTS discovered_sources;
DROP TABLE IF EXISTS discovery_sessions;

-- Universal Discovery Sessions
-- Tracks each discovery request with full client context
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
  completed_at DATETIME,
  CONSTRAINT check_status CHECK (status IN ('active', 'completed', 'failed'))
);

-- Universal Discovered Sources
-- Platform-agnostic source storage with rich metadata
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_platform CHECK (platform IN ('rss', 'youtube', 'podcast', 'academic', 'social')),
  CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES discovery_sessions(id)
);

-- Create indexes separately (D1 compatible syntax)
CREATE INDEX idx_discovery_sessions_client ON discovery_sessions(client_id);
CREATE INDEX idx_discovery_sessions_pipeline ON discovery_sessions(pipeline_id);
CREATE INDEX idx_discovery_sessions_status ON discovery_sessions(status);
CREATE INDEX idx_discovery_sessions_created ON discovery_sessions(created_at);

CREATE INDEX idx_discovered_sources_session ON discovered_sources(session_id);
CREATE INDEX idx_discovered_sources_client ON discovered_sources(client_id);
CREATE INDEX idx_discovered_sources_platform ON discovered_sources(platform);
CREATE INDEX idx_discovered_sources_quality ON discovered_sources(quality_score);
CREATE INDEX idx_discovered_sources_created ON discovered_sources(created_at);

-- Create unique constraint separately
CREATE UNIQUE INDEX idx_discovered_sources_unique ON discovered_sources(client_id, platform, identifier);

-- Test the schema with sample data
INSERT INTO discovery_sessions (
  id, client_id, request_id, pipeline_id, template_capability, 
  template_parameters, input_data, status
) VALUES (
  'test_session_001',
  'test_client_001', 
  'req_test_001',
  'pipe_test_001',
  'search_rss',
  '{"depth": 3, "quality_threshold": 0.7}',
  '{"topic": "test"}',
  'completed'
);

INSERT INTO discovered_sources (
  id, session_id, client_id, platform, identifier, title, description,
  quality_score, relevance_score, discovery_method, metadata, verified
) VALUES (
  'src_test_001',
  'test_session_001',
  'test_client_001',
  'rss',
  'https://example.com/feed.xml',
  'Test RSS Feed',
  'A test RSS feed for validation',
  0.85,
  0.90,
  'test_insertion',
  '{"feed_type": "rss", "language": "en"}',
  1
);

-- Verify the data was inserted correctly
SELECT 'Schema validation - Sessions count:' as check_type, COUNT(*) as count FROM discovery_sessions;
SELECT 'Schema validation - Sources count:' as check_type, COUNT(*) as count FROM discovered_sources;

-- Clean up test data
DELETE FROM discovered_sources WHERE id = 'src_test_001';
DELETE FROM discovery_sessions WHERE id = 'test_session_001';