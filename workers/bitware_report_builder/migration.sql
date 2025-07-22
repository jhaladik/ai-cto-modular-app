-- Migration to add missing tables for bitware_report_builder
-- Run with: wrangler d1 execute bitware-report-generation-db --file=migration.sql

-- Add missing report_jobs table
CREATE TABLE IF NOT EXISTS report_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_type TEXT NOT NULL CHECK (report_type IN ('executive_summary', 'trend_analysis', 'technical_deep_dive', 'competitive_intelligence', 'daily_briefing')),
    topic_filters TEXT DEFAULT '[]',
    time_range TEXT DEFAULT '7d',
    output_format TEXT DEFAULT 'json',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    articles_analyzed INTEGER DEFAULT 0,
    generation_time_ms INTEGER,
    estimated_cost_usd REAL DEFAULT 0.0,
    error_message TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Add missing generated_reports table
CREATE TABLE IF NOT EXISTS generated_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    report_format TEXT NOT NULL,
    report_title TEXT NOT NULL,
    executive_summary TEXT,
    key_insights TEXT DEFAULT '[]',
    report_content TEXT NOT NULL,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES report_jobs(id) ON DELETE CASCADE
);

-- Add missing report_analytics table
CREATE TABLE IF NOT EXISTS report_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    view_type TEXT,
    feedback_score INTEGER,
    accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES generated_reports(id) ON DELETE CASCADE
);

-- Add missing topic_performance table
CREATE TABLE IF NOT EXISTS topic_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL,
    total_reports INTEGER DEFAULT 1,
    avg_relevance_score REAL DEFAULT 0.0,
    last_analyzed DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (topic)
);

-- Add missing entity_tracking table
CREATE TABLE IF NOT EXISTS entity_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_name TEXT NOT NULL,
    total_mentions INTEGER DEFAULT 1,
    avg_sentiment REAL DEFAULT 0.0,
    last_mentioned DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (entity_name)
);

-- Add missing cost_tracking table
CREATE TABLE IF NOT EXISTS cost_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    reports_generated INTEGER DEFAULT 0,
    total_cost_usd REAL DEFAULT 0.0,
    UNIQUE (date)
);

-- Add essential indexes
CREATE INDEX IF NOT EXISTS idx_report_jobs_status ON report_jobs(status);
CREATE INDEX IF NOT EXISTS idx_generated_reports_job ON generated_reports(job_id);
CREATE INDEX IF NOT EXISTS idx_report_analytics_report ON report_analytics(report_id);

-- Add sample data for immediate testing
INSERT OR IGNORE INTO report_jobs (id, report_type, topic_filters, articles_analyzed, status, completed_at) VALUES 
(1, 'executive_summary', '["artificial intelligence"]', 15, 'completed', datetime('now', '-1 hour'));

INSERT OR IGNORE INTO generated_reports (job_id, report_format, report_title, executive_summary, report_content) VALUES 
(1, 'json', 'Sample AI Report', 'AI sector shows strong innovation trends', '{"sample": "report"}');

-- Verify migration
SELECT 'Migration completed - Tables:' as status;
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;