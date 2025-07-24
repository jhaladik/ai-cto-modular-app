-- Analytics Migration Script for bitware_topic_researcher
-- File: workers/bitware_topic_researcher/migration_analytics.sql
-- Run this to add analytics fields to existing database

-- Add performance tracking columns to research_sessions table
ALTER TABLE research_sessions ADD COLUMN research_time_ms INTEGER DEFAULT 0;
ALTER TABLE research_sessions ADD COLUMN ai_processing_time_ms INTEGER DEFAULT 0;
ALTER TABLE research_sessions ADD COLUMN validation_time_ms INTEGER DEFAULT 0;
ALTER TABLE research_sessions ADD COLUMN cache_hit BOOLEAN DEFAULT FALSE;
ALTER TABLE research_sessions ADD COLUMN error_message TEXT;
ALTER TABLE research_sessions ADD COLUMN avg_quality_score REAL DEFAULT 0.0;
ALTER TABLE research_sessions ADD COLUMN min_quality_threshold REAL DEFAULT 0.6;
ALTER TABLE research_sessions ADD COLUMN max_sources_requested INTEGER DEFAULT 10;

-- Add validation metrics to discovered_sources table
ALTER TABLE discovered_sources ADD COLUMN http_status_code INTEGER;
ALTER TABLE discovered_sources ADD COLUMN response_time_ms INTEGER DEFAULT 0;
ALTER TABLE discovered_sources ADD COLUMN feed_type TEXT;
ALTER TABLE discovered_sources ADD COLUMN last_updated DATETIME;

-- Create performance analytics aggregation table
CREATE TABLE IF NOT EXISTS performance_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    hour INTEGER NOT NULL,
    
    -- Session metrics
    sessions_count INTEGER DEFAULT 0,
    successful_sessions INTEGER DEFAULT 0,
    failed_sessions INTEGER DEFAULT 0,
    cached_sessions INTEGER DEFAULT 0,
    
    -- Performance metrics
    avg_response_time_ms REAL DEFAULT 0.0,
    min_response_time_ms INTEGER DEFAULT 0,
    max_response_time_ms INTEGER DEFAULT 0,
    
    -- Discovery metrics  
    total_sources_discovered INTEGER DEFAULT 0,
    avg_quality_score REAL DEFAULT 0.0,
    
    -- Efficiency metrics
    cache_hit_rate REAL DEFAULT 0.0,
    avg_sources_per_session REAL DEFAULT 0.0,
    
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (date, hour)
);

-- Create indexes for analytics performance
CREATE INDEX IF NOT EXISTS idx_research_sessions_date ON research_sessions(research_date);
CREATE INDEX IF NOT EXISTS idx_research_sessions_topic ON research_sessions(topic);
CREATE INDEX IF NOT EXISTS idx_research_sessions_status ON research_sessions(status);
CREATE INDEX IF NOT EXISTS idx_research_sessions_performance ON research_sessions(research_time_ms, status);

CREATE INDEX IF NOT EXISTS idx_discovered_sources_session ON discovered_sources(session_id);
CREATE INDEX IF NOT EXISTS idx_discovered_sources_quality ON discovered_sources(quality_score);
CREATE INDEX IF NOT EXISTS idx_discovered_sources_domain ON discovered_sources(domain);
CREATE INDEX IF NOT EXISTS idx_discovered_sources_method ON discovered_sources(discovery_method);

CREATE INDEX IF NOT EXISTS idx_performance_analytics_date ON performance_analytics(date, hour);

-- Create views for common analytics queries
CREATE VIEW IF NOT EXISTS v_session_performance AS
SELECT 
    date(research_date) as date,
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_sessions,
    ROUND(AVG(CASE WHEN research_time_ms > 0 THEN research_time_ms END), 2) as avg_response_time_ms,
    ROUND(AVG(sources_found), 2) as avg_sources_found,
    ROUND(AVG(quality_sources), 2) as avg_quality_sources,
    ROUND(COUNT(CASE WHEN cache_hit THEN 1 END) * 100.0 / COUNT(*), 2) as cache_hit_rate_percent
FROM research_sessions 
WHERE status IN ('completed', 'failed')
GROUP BY date(research_date)
ORDER BY date DESC;

CREATE VIEW IF NOT EXISTS v_top_performing_topics AS
SELECT 
    topic,
    COUNT(*) as research_count,
    ROUND(AVG(quality_sources), 2) as avg_quality_sources,
    ROUND(AVG(CASE WHEN research_time_ms > 0 THEN research_time_ms END), 2) as avg_response_time_ms,
    MAX(research_date) as last_researched,
    ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*), 2) as success_rate_percent
FROM research_sessions 
WHERE research_date > datetime('now', '-30 days')
GROUP BY topic
HAVING COUNT(*) >= 1
ORDER BY avg_quality_sources DESC, success_rate_percent DESC
LIMIT 20;

CREATE VIEW IF NOT EXISTS v_source_quality_distribution AS
SELECT 
    CASE 
        WHEN quality_score >= 0.9 THEN 'excellent'
        WHEN quality_score >= 0.8 THEN 'high'
        WHEN quality_score >= 0.7 THEN 'good'
        WHEN quality_score >= 0.6 THEN 'moderate'
        ELSE 'low'
    END as quality_tier,
    COUNT(*) as count,
    ROUND(AVG(quality_score), 3) as avg_score,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM discovered_sources), 2) as percentage
FROM discovered_sources
WHERE quality_score > 0
GROUP BY quality_tier
ORDER BY avg_score DESC;