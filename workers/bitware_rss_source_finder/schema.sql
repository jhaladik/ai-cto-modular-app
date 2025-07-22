-- RSS Sources Database Schema
-- This creates the core table for storing RSS feed metadata

CREATE TABLE IF NOT EXISTS rss_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT NOT NULL,
  subtopic TEXT,
  quality_score REAL DEFAULT 0.7,
  language TEXT DEFAULT 'en',
  last_checked DATETIME DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_topic ON rss_sources(topic);
CREATE INDEX IF NOT EXISTS idx_active ON rss_sources(active);
CREATE INDEX IF NOT EXISTS idx_quality ON rss_sources(quality_score);
CREATE INDEX IF NOT EXISTS idx_language ON rss_sources(language);
CREATE INDEX IF NOT EXISTS idx_topic_active ON rss_sources(topic, active);

---