-- Report Generation Database Schema
-- bitware_report_builder worker
-- Database: report_generation_db

-- Report jobs track each intelligence report generation request
CREATE TABLE IF NOT EXISTS report_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_type TEXT NOT NULL CHECK (report_type IN ('executive_summary', 'trend_analysis', 'technical_deep_dive', 'competitive_intelligence', 'daily_briefing')),
    topic_filters TEXT DEFAULT '[]', -- JSON array of topics to filter by
    time_range TEXT DEFAULT '7d' CHECK (time_range IN ('24h', '7d', '30d', 'custom')),
    start_date DATETIME,
    end_date DATETIME,
    output_format TEXT DEFAULT 'json' CHECK (output_format IN ('json', 'html', 'markdown', 'email')),
    min_relevance_score REAL DEFAULT 0.0,
    entity_focus TEXT DEFAULT '[]', -- JSON array of entities to focus on
    sentiment_filter TEXT DEFAULT 'all' CHECK (sentiment_filter IN ('positive', 'negative', 'neutral', 'all')),
    
    -- Processing status and results
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    articles_analyzed INTEGER DEFAULT 0,
    generation_time_ms INTEGER,
    ai_tokens_used INTEGER,
    estimated_cost_usd REAL DEFAULT 0.0,
    error_message TEXT,
    
    -- Timestamps
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    
    -- Quality metrics
    data_quality_score REAL DEFAULT 0.0,
    confidence_avg REAL DEFAULT 0.0,
    relevance_avg REAL DEFAULT 0.0
);

-- Generated reports store the actual report content and metadata
CREATE TABLE IF NOT EXISTS generated_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    report_format TEXT NOT NULL,
    report_title TEXT NOT NULL,
    executive_summary TEXT,
    key_insights TEXT DEFAULT '[]', -- JSON array of key insights
    trend_analysis TEXT DEFAULT '{}', -- JSON object with trend data
    detailed_analysis TEXT, -- Full detailed analysis content
    report_content TEXT NOT NULL, -- Complete report as JSON
    
    -- Report metadata
    word_count INTEGER DEFAULT 0,
    sections_count INTEGER DEFAULT 0,
    charts_included BOOLEAN DEFAULT FALSE,
    sources_cited INTEGER DEFAULT 0,
    
    -- Access and sharing
    is_public BOOLEAN DEFAULT FALSE,
    access_count INTEGER DEFAULT 0,
    last_accessed DATETIME,
    
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (job_id) REFERENCES report_jobs(id) ON DELETE CASCADE,
    UNIQUE(job_id, report_format) -- One report per job per format
);

-- Report analytics track usage, performance, and feedback
CREATE TABLE IF NOT EXISTS report_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    
    -- Usage tracking
    view_type TEXT CHECK (view_type IN ('web', 'api', 'download', 'email')),
    user_agent TEXT,
    ip_address TEXT,
    referrer TEXT,
    
    -- Engagement metrics
    time_spent_seconds INTEGER,
    sections_viewed TEXT DEFAULT '[]', -- JSON array of sections viewed
    actions_taken TEXT DEFAULT '[]', -- JSON array of actions (download, share, etc.)
    
    -- Feedback and quality
    feedback_score INTEGER CHECK (feedback_score BETWEEN 1 AND 5),
    feedback_comment TEXT,
    usefulness_rating INTEGER CHECK (usefulness_rating BETWEEN 1 AND 5),
    
    accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (report_id) REFERENCES generated_reports(id) ON DELETE CASCADE
);

-- Topic performance tracking for intelligence insights
CREATE TABLE IF NOT EXISTS topic_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL,
    
    -- Coverage metrics
    total_reports INTEGER DEFAULT 1,
    total_articles_analyzed INTEGER DEFAULT 0,
    avg_relevance_score REAL DEFAULT 0.0,
    avg_sentiment_score REAL DEFAULT 0.0,
    avg_quality_score REAL DEFAULT 0.0,
    
    -- Trend indicators
    trend_direction TEXT CHECK (trend_direction IN ('rising', 'stable', 'declining')),
    momentum_score REAL DEFAULT 0.0, -- -1.0 to 1.0 indicating trend strength
    
    -- Time tracking
    first_analyzed DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_analyzed DATETIME DEFAULT CURRENT_TIMESTAMP,
    peak_activity_date DATETIME,
    
    UNIQUE (topic)
);

-- Entity tracking for competitive intelligence and key player analysis
CREATE TABLE IF NOT EXISTS entity_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_name TEXT NOT NULL,
    entity_type TEXT CHECK (entity_type IN ('person', 'company', 'technology', 'location', 'organization', 'product')),
    
    -- Mention statistics
    total_mentions INTEGER DEFAULT 1,
    positive_mentions INTEGER DEFAULT 0,
    neutral_mentions INTEGER DEFAULT 0,
    negative_mentions INTEGER DEFAULT 0,
    avg_sentiment REAL DEFAULT 0.0,
    
    -- Context analysis
    common_topics TEXT DEFAULT '[]', -- JSON array of topics this entity appears in
    related_entities TEXT DEFAULT '[]', -- JSON array of frequently co-mentioned entities
    key_contexts TEXT DEFAULT '[]', -- JSON array of important contexts/phrases
    
    -- Trend tracking
    mention_trend TEXT CHECK (mention_trend IN ('increasing', 'stable', 'decreasing')),
    sentiment_trend TEXT CHECK (sentiment_trend IN ('improving', 'stable', 'declining')),
    
    first_mentioned DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_mentioned DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (entity_name)
);

-- Report scheduling for automated report generation
CREATE TABLE IF NOT EXISTS scheduled_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Report configuration
    report_type TEXT NOT NULL,
    topic_filters TEXT DEFAULT '[]',
    time_range TEXT DEFAULT '7d',
    output_format TEXT DEFAULT 'json',
    min_relevance_score REAL DEFAULT 0.7,
    
    -- Scheduling
    schedule_frequency TEXT CHECK (schedule_frequency IN ('daily', 'weekly', 'monthly')),
    schedule_time TEXT, -- HH:MM format
    schedule_day INTEGER, -- Day of week (1-7) or day of month (1-31)
    timezone TEXT DEFAULT 'UTC',
    
    -- Delivery settings
    delivery_method TEXT CHECK (delivery_method IN ('email', 'webhook', 'storage')),
    delivery_config TEXT DEFAULT '{}', -- JSON config for delivery (emails, webhook URLs, etc.)
    
    -- Status and execution
    is_active BOOLEAN DEFAULT TRUE,
    last_executed DATETIME,
    next_execution DATETIME,
    execution_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    last_error TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cost tracking for budget management and optimization
CREATE TABLE IF NOT EXISTS cost_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL, -- YYYY-MM-DD format
    
    -- Report generation costs
    reports_generated INTEGER DEFAULT 0,
    total_articles_processed INTEGER DEFAULT 0,
    total_ai_tokens INTEGER DEFAULT 0,
    openai_cost_usd REAL DEFAULT 0.0,
    
    -- Processing metrics
    avg_generation_time_ms REAL DEFAULT 0.0,
    total_processing_time_ms INTEGER DEFAULT 0,
    
    -- Cost efficiency metrics
    cost_per_report REAL DEFAULT 0.0,
    cost_per_article REAL DEFAULT 0.0,
    tokens_per_report REAL DEFAULT 0.0,
    
    UNIQUE (date)
);

-- Indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_report_jobs_type ON report_jobs(report_type);
CREATE INDEX IF NOT EXISTS idx_report_jobs_status ON report_jobs(status);
CREATE INDEX IF NOT EXISTS idx_report_jobs_started ON report_jobs(started_at);
CREATE INDEX IF NOT EXISTS idx_report_jobs_completed ON report_jobs(completed_at);
CREATE INDEX IF NOT EXISTS idx_report_jobs_topics ON report_jobs(topic_filters);

CREATE INDEX IF NOT EXISTS idx_generated_reports_job ON generated_reports(job_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_public ON generated_reports(is_public);
CREATE INDEX IF NOT EXISTS idx_generated_reports_generated ON generated_reports(generated_at);
CREATE INDEX IF NOT EXISTS idx_generated_reports_access ON generated_reports(access_count);

CREATE INDEX IF NOT EXISTS idx_analytics_report ON report_analytics(report_id);
CREATE INDEX IF NOT EXISTS idx_analytics_accessed ON report_analytics(accessed_at);
CREATE INDEX IF NOT EXISTS idx_analytics_feedback ON report_analytics(feedback_score);

CREATE INDEX IF NOT EXISTS idx_topic_performance_topic ON topic_performance(topic);
CREATE INDEX IF NOT EXISTS idx_topic_performance_reports ON topic_performance(total_reports);
CREATE INDEX IF NOT EXISTS idx_topic_performance_last ON topic_performance(last_analyzed);

CREATE INDEX IF NOT EXISTS idx_entity_tracking_name ON entity_tracking(entity_name);
CREATE INDEX IF NOT EXISTS idx_entity_tracking_type ON entity_tracking(entity_type);
CREATE INDEX IF NOT EXISTS idx_entity_tracking_mentions ON entity_tracking(total_mentions);
CREATE INDEX IF NOT EXISTS idx_entity_tracking_sentiment ON entity_tracking(avg_sentiment);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_active ON scheduled_reports(is_active);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next ON scheduled_reports(next_execution);

CREATE INDEX IF NOT EXISTS idx_cost_tracking_date ON cost_tracking(date);

-- Views for common analytical queries

-- Report generation summary with performance metrics
CREATE VIEW IF NOT EXISTS report_generation_summary AS
SELECT 
    rj.id as job_id,
    rj.report_type,
    rj.topic_filters,
    rj.time_range,
    rj.status,
    rj.articles_analyzed,
    rj.generation_time_ms,
    rj.estimated_cost_usd,
    rj.data_quality_score,
    rj.started_at,
    rj.completed_at,
    gr.id as report_id,
    gr.report_title,
    gr.word_count,
    gr.access_count,
    gr.is_public,
    COUNT(ra.id) as total_views,
    AVG(ra.feedback_score) as avg_feedback_score
FROM report_jobs rj
LEFT JOIN generated_reports gr ON rj.id = gr.job_id
LEFT JOIN report_analytics ra ON gr.id = ra.report_id
GROUP BY rj.id, gr.id;

-- Top performing reports based on engagement and feedback
CREATE VIEW IF NOT EXISTS top_performing_reports AS
SELECT 
    gr.id,
    gr.report_title,
    gr.report_format,
    rj.report_type,
    gr.access_count,
    COUNT(ra.id) as total_interactions,
    AVG(ra.feedback_score) as avg_feedback,
    AVG(ra.usefulness_rating) as avg_usefulness,
    AVG(ra.time_spent_seconds) as avg_engagement_time,
    gr.generated_at
FROM generated_reports gr
JOIN report_jobs rj ON gr.job_id = rj.id
LEFT JOIN report_analytics ra ON gr.id = ra.report_id
WHERE gr.generated_at > datetime('now', '-30 days')
GROUP BY gr.id
HAVING total_interactions >= 5 OR avg_feedback >= 4.0
ORDER BY 
    (access_count * 0.3 + 
     COALESCE(avg_feedback, 3) * 0.4 + 
     COALESCE(avg_usefulness, 3) * 0.3) DESC
LIMIT 50;

-- Topic intelligence dashboard with trend analysis
CREATE VIEW IF NOT EXISTS topic_intelligence_dashboard AS
SELECT 
    tp.topic,
    tp.total_reports,
    tp.total_articles_analyzed,
    tp.avg_relevance_score,
    tp.avg_sentiment_score,
    tp.trend_direction,
    tp.momentum_score,
    COUNT(DISTINCT rj.id) as reports_last_30_days,
    AVG(rj.data_quality_score) as recent_data_quality,
    MAX(tp.last_analyzed) as latest_analysis,
    -- Related entities for this topic
    GROUP_CONCAT(DISTINCT et.entity_name) as key_entities
FROM topic_performance tp
LEFT JOIN report_jobs rj ON JSON_EXTRACT(rj.topic_filters, '$[0]') = tp.topic
    AND rj.started_at > datetime('now', '-30 days')
    AND rj.status = 'completed'
LEFT JOIN entity_tracking et ON JSON_EXTRACT(et.common_topics, '$[0]') = tp.topic
    AND et.total_mentions >= 5
GROUP BY tp.topic
ORDER BY tp.total_reports DESC, tp.last_analyzed DESC;

-- Cost efficiency analysis view
CREATE VIEW IF NOT EXISTS cost_efficiency_analysis AS
SELECT 
    DATE(rj.started_at) as generation_date,
    rj.report_type,
    COUNT(*) as reports_generated,
    SUM(rj.articles_analyzed) as total_articles,
    SUM(rj.ai_tokens_used) as total_tokens,
    SUM(rj.estimated_cost_usd) as total_cost,
    AVG(rj.estimated_cost_usd) as avg_cost_per_report,
    AVG(rj.generation_time_ms) as avg_generation_time,
    AVG(rj.data_quality_score) as avg_quality_score,
    SUM(rj.estimated_cost_usd) / SUM(rj.articles_analyzed) as cost_per_article,
    SUM(rj.ai_tokens_used) / COUNT(*) as tokens_per_report
FROM report_jobs rj
WHERE rj.status = 'completed' 
  AND rj.started_at > datetime('now', '-90 days')
GROUP BY DATE(rj.started_at), rj.report_type
ORDER BY generation_date DESC, total_cost DESC;

-- Entity relationship analysis for competitive intelligence
CREATE VIEW IF NOT EXISTS entity_relationship_analysis AS
SELECT 
    et1.entity_name as primary_entity,
    et1.entity_type as primary_type,
    et1.total_mentions as primary_mentions,
    et1.avg_sentiment as primary_sentiment,
    et2.entity_name as related_entity,
    et2.entity_type as related_type,
    et2.total_mentions as related_mentions,
    et2.avg_sentiment as related_sentiment,
    -- Calculate relationship strength based on co-occurrence
    CASE 
        WHEN et1.total_mentions > et2.total_mentions THEN et2.total_mentions * 1.0 / et1.total_mentions
        ELSE et1.total_mentions * 1.0 / et2.total_mentions
    END as relationship_strength
FROM entity_tracking et1
JOIN entity_tracking et2 ON et1.id < et2.id
WHERE JSON_EXTRACT(et1.related_entities, '$') LIKE '%' || et2.entity_name || '%'
   OR JSON_EXTRACT(et2.related_entities, '$') LIKE '%' || et1.entity_name || '%'
ORDER BY relationship_strength DESC
LIMIT 100;

-- Triggers for automatic data maintenance

-- Update topic performance when reports are completed
CREATE TRIGGER IF NOT EXISTS update_topic_performance_on_completion
AFTER UPDATE ON report_jobs
WHEN NEW.status = 'completed' AND OLD.status != 'completed'
BEGIN
    -- Update or insert topic performance for each topic in the report
    INSERT OR REPLACE INTO topic_performance (
        topic,
        total_reports,
        total_articles_analyzed,
        avg_relevance_score,
        avg_sentiment_score,
        last_analyzed
    )
    SELECT 
        topic_value.value as topic,
        COALESCE((SELECT total_reports FROM topic_performance WHERE topic = topic_value.value), 0) + 1,
        COALESCE((SELECT total_articles_analyzed FROM topic_performance WHERE topic = topic_value.value), 0) + NEW.articles_analyzed,
        (COALESCE((SELECT avg_relevance_score * total_reports FROM topic_performance WHERE topic = topic_value.value), 0) + NEW.relevance_avg) / 
        (COALESCE((SELECT total_reports FROM topic_performance WHERE topic = topic_value.value), 0) + 1),
        (COALESCE((SELECT avg_sentiment_score * total_reports FROM topic_performance WHERE topic = topic_value.value), 0) + 0) / 
        (COALESCE((SELECT total_reports FROM topic_performance WHERE topic = topic_value.value), 0) + 1),
        NEW.completed_at
    FROM JSON_EACH(NEW.topic_filters) AS topic_value;
END;

-- Update daily cost tracking when jobs complete
CREATE TRIGGER IF NOT EXISTS update_daily_costs
AFTER UPDATE ON report_jobs  
WHEN NEW.status = 'completed' AND OLD.status != 'completed'
BEGIN
    INSERT OR REPLACE INTO cost_tracking (
        date,
        reports_generated,
        total_articles_processed,
        total_ai_tokens,
        openai_cost_usd,
        total_processing_time_ms,
        avg_generation_time_ms,
        cost_per_report,
        cost_per_article,
        tokens_per_report
    )
    SELECT 
        DATE(NEW.completed_at) as date,
        COALESCE((SELECT reports_generated FROM cost_tracking WHERE date = DATE(NEW.completed_at)), 0) + 1,
        COALESCE((SELECT total_articles_processed FROM cost_tracking WHERE date = DATE(NEW.completed_at)), 0) + NEW.articles_analyzed,
        COALESCE((SELECT total_ai_tokens FROM cost_tracking WHERE date = DATE(NEW.completed_at)), 0) + NEW.ai_tokens_used,
        COALESCE((SELECT openai_cost_usd FROM cost_tracking WHERE date = DATE(NEW.completed_at)), 0) + NEW.estimated_cost_usd,
        COALESCE((SELECT total_processing_time_ms FROM cost_tracking WHERE date = DATE(NEW.completed_at)), 0) + NEW.generation_time_ms,
        -- Recalculate averages
        (COALESCE((SELECT total_processing_time_ms FROM cost_tracking WHERE date = DATE(NEW.completed_at)), 0) + NEW.generation_time_ms) / 
        (COALESCE((SELECT reports_generated FROM cost_tracking WHERE date = DATE(NEW.completed_at)), 0) + 1),
        (COALESCE((SELECT openai_cost_usd FROM cost_tracking WHERE date = DATE(NEW.completed_at)), 0) + NEW.estimated_cost_usd) / 
        (COALESCE((SELECT reports_generated FROM cost_tracking WHERE date = DATE(NEW.completed_at)), 0) + 1),
        CASE 
            WHEN NEW.articles_analyzed > 0 THEN NEW.estimated_cost_usd / NEW.articles_analyzed
            ELSE 0 
        END,
        NEW.ai_tokens_used;
END;

-- Update report access count
CREATE TRIGGER IF NOT EXISTS update_report_access_count
AFTER INSERT ON report_analytics
BEGIN
    UPDATE generated_reports 
    SET access_count = access_count + 1,
        last_accessed = NEW.accessed_at
    WHERE id = NEW.report_id;
END;

-- Sample data for development and testing
INSERT OR IGNORE INTO report_jobs (
    report_type, topic_filters, time_range, articles_analyzed, 
    status, data_quality_score, estimated_cost_usd, completed_at
) VALUES 
('executive_summary', '["artificial intelligence"]', '7d', 25, 'completed', 0.87, 0.12, datetime('now', '-2 hours')),
('trend_analysis', '["climate change", "sustainability"]', '30d', 42, 'completed', 0.91, 0.18, datetime('now', '-1 day')),
('daily_briefing', '["technology"]', '24h', 15, 'completed', 0.83, 0.08, datetime('now', '-3 hours')),
('competitive_intelligence', '["electric vehicles"]', '7d', 33, 'processing', 0.0, 0.0, NULL);

-- Insert corresponding sample reports
INSERT OR IGNORE INTO generated_reports (
    job_id, report_format, report_title, executive_summary, 
    report_content, word_count, is_public
) VALUES 
(1, 'json', 'AI Development Executive Summary', 'Significant breakthroughs in AI reasoning capabilities with multiple major companies announcing new models and frameworks.', '{"sample": "report"}', 450, TRUE),
(2, 'html', 'Climate Technology Trend Analysis', 'Growing investment in carbon capture technology and renewable energy innovations showing strong momentum.', '{"sample": "report"}', 720, TRUE),
(3, 'json', 'Daily Technology Briefing', 'Key developments in quantum computing research and semiconductor manufacturing updates.', '{"sample": "report"}', 280, FALSE);

-- Performance optimization
ANALYZE report_jobs;
ANALYZE generated_reports;
ANALYZE report_analytics;

-- Verify database integrity
PRAGMA integrity_check;