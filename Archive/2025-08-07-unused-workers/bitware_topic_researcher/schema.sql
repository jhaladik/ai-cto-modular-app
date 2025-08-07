-- Bitware Topic Researcher Database Schema
-- This schema stores research sessions and discovered RSS sources

-- Research sessions track each topic research request
CREATE TABLE IF NOT EXISTS research_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  search_depth INTEGER DEFAULT 3,
  sources_found INTEGER DEFAULT 0,
  quality_sources INTEGER DEFAULT 0,
  research_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active' -- active, completed, failed
);

-- Discovered sources stores all RSS feeds found during research
CREATE TABLE IF NOT EXISTS discovered_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  title TEXT,
  description TEXT,
  quality_score REAL DEFAULT 0.0,
  validation_status TEXT DEFAULT 'pending', -- pending, valid, invalid, duplicate, error, low_quality
  discovery_method TEXT NOT NULL, -- web_search, ai_suggestion, referral
  reasoning TEXT, -- AI explanation for quality score and relevance
  discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key relationship
  FOREIGN KEY (session_id) REFERENCES research_sessions(id) ON DELETE CASCADE,
  
  -- Prevent duplicate URLs
  UNIQUE(url)
);

-- Create indexes for performance (as separate statements)
CREATE INDEX IF NOT EXISTS idx_research_topic ON research_sessions(topic);
CREATE INDEX IF NOT EXISTS idx_research_date ON research_sessions(research_date);
CREATE INDEX IF NOT EXISTS idx_research_status ON research_sessions(status);

CREATE INDEX IF NOT EXISTS idx_sources_session ON discovered_sources(session_id);
CREATE INDEX IF NOT EXISTS idx_sources_domain ON discovered_sources(domain);
CREATE INDEX IF NOT EXISTS idx_sources_quality ON discovered_sources(quality_score);
CREATE INDEX IF NOT EXISTS idx_sources_status ON discovered_sources(validation_status);
CREATE INDEX IF NOT EXISTS idx_sources_method ON discovered_sources(discovery_method);
CREATE INDEX IF NOT EXISTS idx_sources_date ON discovered_sources(discovered_at);

-- View for quick session summaries
CREATE VIEW IF NOT EXISTS session_summary AS
SELECT 
  rs.id,
  rs.topic,
  rs.search_depth,
  rs.research_date,
  rs.status,
  COUNT(ds.id) as total_sources,
  COUNT(CASE WHEN ds.validation_status = 'valid' THEN 1 END) as valid_sources,
  AVG(CASE WHEN ds.validation_status = 'valid' THEN ds.quality_score END) as avg_quality_score,
  MAX(ds.quality_score) as max_quality_score
FROM research_sessions rs
LEFT JOIN discovered_sources ds ON rs.id = ds.session_id
GROUP BY rs.id, rs.topic, rs.search_depth, rs.research_date, rs.status;

-- View for quality sources (valid and high-scoring)
CREATE VIEW IF NOT EXISTS quality_sources AS
SELECT 
  ds.id,
  ds.session_id,
  ds.url,
  ds.domain,
  ds.title,
  ds.description,
  ds.quality_score,
  ds.validation_status,
  ds.discovery_method,
  ds.reasoning,
  ds.discovered_at,
  rs.topic,
  rs.research_date
FROM discovered_sources ds
JOIN research_sessions rs ON ds.session_id = rs.id
WHERE ds.validation_status = 'valid' 
  AND ds.quality_score >= 0.7
ORDER BY ds.quality_score DESC;