-- Content Analysis Database Schema
-- bitware_content_classifier worker
-- Database: content_analysis_db

-- Analysis jobs table tracks each AI processing request
CREATE TABLE IF NOT EXISTS analysis_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_topic TEXT NOT NULL,
    analysis_depth TEXT DEFAULT 'standard' CHECK (analysis_depth IN ('quick', 'standard', 'deep')),
    articles_submitted INTEGER DEFAULT 0,
    articles_processed INTEGER DEFAULT 0,
    avg_relevance_score REAL DEFAULT 0.0,
    avg_confidence_score REAL DEFAULT 0.0,
    processing_cost_usd REAL DEFAULT 0.0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    
    -- Performance tracking
    processing_time_ms INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0
);

-- Indexes for analysis_jobs
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_topic ON analysis_jobs(target_topic);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_started_at ON analysis_jobs(started_at);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_cost ON analysis_jobs(processing_cost_usd);

-- Article analysis results table stores AI insights for each article
CREATE TABLE IF NOT EXISTS article_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    article_url TEXT NOT NULL,
    target_topic TEXT NOT NULL,
    
    -- Core AI analysis scores (0.0-1.0 range)
    relevance_score REAL NOT NULL CHECK (relevance_score >= 0.0 AND relevance_score <= 1.0),
    confidence_score REAL NOT NULL CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    quality_score REAL NOT NULL CHECK (quality_score >= 0.0 AND quality_score <= 1.0),
    
    -- Sentiment analysis (-1.0 to 1.0 range)
    sentiment_score REAL NOT NULL CHECK (sentiment_score >= -1.0 AND sentiment_score <= 1.0),
    
    -- AI-extracted content (stored as JSON arrays)
    detected_topics TEXT DEFAULT '[]', -- JSON array of detected topics
    key_entities TEXT DEFAULT '[]',    -- JSON array of key entities
    
    -- AI-generated insights
    summary TEXT,
    reasoning TEXT,
    
    -- Processing metadata
    tokens_used INTEGER DEFAULT 0,
    analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (job_id) REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    
    -- Prevent duplicate analysis of same article for same topic
    UNIQUE (article_url, target_topic)
);

-- Indexes for article_analysis
CREATE INDEX IF NOT EXISTS idx_article_analysis_job_id ON article_analysis(job_id);
CREATE INDEX IF NOT EXISTS idx_article_analysis_article_url ON article_analysis(article_url);
CREATE INDEX IF NOT EXISTS idx_article_analysis_topic ON article_analysis(target_topic);
CREATE INDEX IF NOT EXISTS idx_article_analysis_relevance ON article_analysis(relevance_score);
CREATE INDEX IF NOT EXISTS idx_article_analysis_sentiment ON article_analysis(sentiment_score);
CREATE INDEX IF NOT EXISTS idx_article_analysis_quality ON article_analysis(quality_score);
CREATE INDEX IF NOT EXISTS idx_article_analysis_analyzed_at ON article_analysis(analyzed_at);

-- Topic performance tracking table for analytics
CREATE TABLE IF NOT EXISTS topic_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL,
    analysis_count INTEGER DEFAULT 1,
    avg_relevance_score REAL DEFAULT 0.0,
    avg_confidence_score REAL DEFAULT 0.0,
    avg_sentiment_score REAL DEFAULT 0.0,
    total_cost_usd REAL DEFAULT 0.0,
    last_analysis_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (topic)
);

-- Index for topic performance
CREATE INDEX IF NOT EXISTS idx_topic_performance_topic ON topic_performance(topic);
CREATE INDEX IF NOT EXISTS idx_topic_performance_count ON topic_performance(analysis_count);

-- Cost tracking table for budget management
CREATE TABLE IF NOT EXISTS cost_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL, -- YYYY-MM-DD format
    total_jobs INTEGER DEFAULT 0,
    total_articles INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost_usd REAL DEFAULT 0.0,
    avg_cost_per_article REAL DEFAULT 0.0,
    
    UNIQUE (date)
);

-- Index for cost tracking
CREATE INDEX IF NOT EXISTS idx_cost_tracking_date ON cost_tracking(date);

-- Analysis quality metrics table
CREATE TABLE IF NOT EXISTS quality_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    
    -- Distribution metrics
    high_relevance_count INTEGER DEFAULT 0,    -- relevance_score >= 0.8
    medium_relevance_count INTEGER DEFAULT 0,  -- 0.5 <= relevance_score < 0.8
    low_relevance_count INTEGER DEFAULT 0,     -- relevance_score < 0.5
    
    high_confidence_count INTEGER DEFAULT 0,   -- confidence_score >= 0.8
    medium_confidence_count INTEGER DEFAULT 0, -- 0.5 <= confidence_score < 0.8
    low_confidence_count INTEGER DEFAULT 0,    -- confidence_score < 0.5
    
    -- Sentiment distribution
    positive_sentiment_count INTEGER DEFAULT 0, -- sentiment_score > 0.2
    neutral_sentiment_count INTEGER DEFAULT 0,  -- -0.2 <= sentiment_score <= 0.2
    negative_sentiment_count INTEGER DEFAULT 0, -- sentiment_score < -0.2
    
    -- Quality distribution
    high_quality_count INTEGER DEFAULT 0,    -- quality_score >= 0.8
    medium_quality_count INTEGER DEFAULT 0,  -- 0.5 <= quality_score < 0.8
    low_quality_count INTEGER DEFAULT 0,     -- quality_score < 0.5
    
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (job_id) REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    UNIQUE (job_id)
);

-- Index for quality metrics
CREATE INDEX IF NOT EXISTS idx_quality_metrics_job_id ON quality_metrics(job_id);

-- Create views for common queries
CREATE VIEW IF NOT EXISTS analysis_summary AS
SELECT 
    aj.id,
    aj.target_topic,
    aj.analysis_depth,
    aj.articles_submitted,
    aj.articles_processed,
    aj.avg_relevance_score,
    aj.processing_cost_usd,
    aj.status,
    aj.started_at,
    aj.completed_at,
    COUNT(aa.id) as stored_analyses,
    AVG(aa.relevance_score) as actual_avg_relevance,
    AVG(aa.confidence_score) as avg_confidence,
    AVG(aa.sentiment_score) as avg_sentiment,
    SUM(aa.tokens_used) as total_tokens
FROM analysis_jobs aj
LEFT JOIN article_analysis aa ON aj.id = aa.job_id
GROUP BY aj.id;

-- Performance optimization view
CREATE VIEW IF NOT EXISTS top_performing_topics AS
SELECT 
    target_topic,
    COUNT(*) as analysis_count,
    AVG(avg_relevance_score) as avg_relevance,
    AVG(avg_confidence_score) as avg_confidence,
    SUM(processing_cost_usd) as total_cost,
    AVG(articles_processed) as avg_articles_per_job,
    MAX(started_at) as last_analysis
FROM analysis_jobs 
WHERE status = 'completed'
GROUP BY target_topic
HAVING analysis_count >= 3
ORDER BY avg_relevance DESC, analysis_count DESC;

-- Recent high-quality analyses view
CREATE VIEW IF NOT EXISTS recent_quality_analyses AS
SELECT 
    aa.article_url,
    aa.target_topic,
    aa.relevance_score,
    aa.confidence_score,
    aa.sentiment_score,
    aa.quality_score,
    aa.detected_topics,
    aa.key_entities,
    aa.summary,
    aa.analyzed_at,
    aj.analysis_depth
FROM article_analysis aa
JOIN analysis_jobs aj ON aa.job_id = aj.id
WHERE aa.relevance_score >= 0.7 
  AND aa.confidence_score >= 0.7
  AND aa.analyzed_at > datetime('now', '-7 days')
ORDER BY aa.relevance_score DESC, aa.confidence_score DESC
LIMIT 100;

-- Triggers for automatic metric calculation

-- Update topic performance when new analysis is added
CREATE TRIGGER IF NOT EXISTS update_topic_performance 
AFTER INSERT ON analysis_jobs
WHEN NEW.status = 'completed'
BEGIN
    INSERT OR REPLACE INTO topic_performance (
        topic, 
        analysis_count, 
        avg_relevance_score, 
        total_cost_usd, 
        last_analysis_date
    )
    SELECT 
        NEW.target_topic,
        COALESCE((SELECT analysis_count FROM topic_performance WHERE topic = NEW.target_topic), 0) + 1,
        (COALESCE((SELECT avg_relevance_score * analysis_count FROM topic_performance WHERE topic = NEW.target_topic), 0) + NEW.avg_relevance_score) / 
        (COALESCE((SELECT analysis_count FROM topic_performance WHERE topic = NEW.target_topic), 0) + 1),
        COALESCE((SELECT total_cost_usd FROM topic_performance WHERE topic = NEW.target_topic), 0) + NEW.processing_cost_usd,
        NEW.completed_at;
END;

-- Update daily cost tracking
CREATE TRIGGER IF NOT EXISTS update_cost_tracking
AFTER UPDATE ON analysis_jobs
WHEN NEW.status = 'completed' AND OLD.status != 'completed'
BEGIN
    INSERT OR REPLACE INTO cost_tracking (
        date,
        total_jobs,
        total_articles,
        total_cost_usd
    )
    SELECT 
        DATE(NEW.completed_at),
        COALESCE((SELECT total_jobs FROM cost_tracking WHERE date = DATE(NEW.completed_at)), 0) + 1,
        COALESCE((SELECT total_articles FROM cost_tracking WHERE date = DATE(NEW.completed_at)), 0) + NEW.articles_processed,
        COALESCE((SELECT total_cost_usd FROM cost_tracking WHERE date = DATE(NEW.completed_at)), 0) + NEW.processing_cost_usd;
    
    -- Update average cost per article
    UPDATE cost_tracking 
    SET avg_cost_per_article = CASE 
        WHEN total_articles > 0 THEN total_cost_usd / total_articles 
        ELSE 0 
    END
    WHERE date = DATE(NEW.completed_at);
END;

-- Sample data insertion for testing
INSERT OR IGNORE INTO analysis_jobs (
    target_topic,
    analysis_depth,
    articles_submitted,
    articles_processed,
    avg_relevance_score,
    processing_cost_usd,
    status,
    completed_at
) VALUES 
('artificial intelligence', 'standard', 15, 12, 0.82, 0.045, 'completed', datetime('now', '-2 hours')),
('climate change', 'deep', 8, 8, 0.91, 0.067, 'completed', datetime('now', '-1 day')),
('quantum computing', 'quick', 25, 23, 0.75, 0.028, 'completed', datetime('now', '-3 hours'));

-- Validation functions (stored as comments for reference)
/*
-- Function to validate relevance score range
CREATE TRIGGER validate_relevance_score
BEFORE INSERT ON article_analysis
FOR EACH ROW
WHEN NEW.relevance_score < 0.0 OR NEW.relevance_score > 1.0
BEGIN
    SELECT RAISE(ABORT, 'Relevance score must be between 0.0 and 1.0');
END;

-- Function to validate sentiment score range  
CREATE TRIGGER validate_sentiment_score
BEFORE INSERT ON article_analysis
FOR EACH ROW
WHEN NEW.sentiment_score < -1.0 OR NEW.sentiment_score > 1.0
BEGIN
    SELECT RAISE(ABORT, 'Sentiment score must be between -1.0 and 1.0');
END;
*/