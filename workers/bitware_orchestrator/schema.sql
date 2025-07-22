-- Orchestration Database Schema
-- bitware_orchestrator worker
-- Database: orchestration_db

-- Pipeline executions track each complete pipeline run with performance metrics
CREATE TABLE IF NOT EXISTS pipeline_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pipeline_id TEXT UNIQUE NOT NULL,
    
    -- Business context
    topic TEXT NOT NULL,
    urgency TEXT DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
    quality_level TEXT DEFAULT 'standard' CHECK (quality_level IN ('basic', 'standard', 'premium', 'enterprise')),
    budget_limit REAL DEFAULT 0.0,
    deadline_minutes INTEGER,
    output_format TEXT DEFAULT 'json',
    
    -- Execution strategy and configuration
    execution_strategy TEXT NOT NULL,
    optimize_for TEXT DEFAULT 'balanced' CHECK (optimize_for IN ('speed', 'cost', 'quality', 'balanced')),
    parallel_processing_enabled BOOLEAN DEFAULT TRUE,
    source_discovery_depth INTEGER DEFAULT 3,
    content_analysis_depth TEXT DEFAULT 'standard',
    
    -- Performance results
    total_execution_time_ms INTEGER,
    total_cost_usd REAL DEFAULT 0.0,
    sources_discovered INTEGER DEFAULT 0,
    articles_processed INTEGER DEFAULT 0,
    final_quality_score REAL DEFAULT 0.0,
    
    -- Pipeline status and health
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'partial', 'failed')),
    error_message TEXT,
    
    -- Timestamps
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    
    -- Account context (for multi-tenant future)
    account_id TEXT,
    user_id TEXT
);

-- Worker performance tracking for each worker in each pipeline execution
CREATE TABLE IF NOT EXISTS worker_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pipeline_id TEXT NOT NULL,
    worker_name TEXT NOT NULL CHECK (worker_name IN (
        'topic_researcher', 'rss_librarian', 'feed_fetcher', 
        'content_classifier', 'report_builder'
    )),
    
    -- Performance metrics
    execution_time_ms INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    cost_usd REAL DEFAULT 0.0,
    cache_hit BOOLEAN DEFAULT FALSE,
    
    -- Quality and bottleneck analysis
    bottlenecks_detected TEXT DEFAULT '[]', -- JSON array of detected bottlenecks
    optimization_applied TEXT DEFAULT '[]', -- JSON array of optimizations applied
    
    -- Error tracking
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (pipeline_id) REFERENCES pipeline_executions(pipeline_id) ON DELETE CASCADE
);

-- Optimization insights track successful optimizations and their impact
CREATE TABLE IF NOT EXISTS optimization_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pipeline_id TEXT NOT NULL,
    
    -- Optimization details
    optimization_type TEXT NOT NULL CHECK (optimization_type IN (
        'parallel_execution', 'intelligent_caching', 'cost_optimization',
        'resource_pooling', 'adaptive_timeout', 'partial_recovery'
    )),
    optimization_description TEXT,
    
    -- Impact metrics
    time_saved_ms INTEGER DEFAULT 0,
    cost_saved_usd REAL DEFAULT 0.0,
    quality_impact_score REAL DEFAULT 0.0, -- -1.0 to 1.0
    
    -- Context
    trigger_condition TEXT, -- What triggered this optimization
    success BOOLEAN DEFAULT TRUE,
    
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (pipeline_id) REFERENCES pipeline_executions(pipeline_id) ON DELETE CASCADE
);

-- Performance baselines track historical performance for comparison
CREATE TABLE IF NOT EXISTS performance_baselines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Baseline context
    topic_category TEXT, -- Categorized topics for comparison
    execution_strategy TEXT NOT NULL,
    quality_level TEXT NOT NULL,
    
    -- Baseline metrics (rolling averages)
    baseline_execution_time_ms INTEGER,
    baseline_cost_usd REAL,
    baseline_quality_score REAL,
    baseline_success_rate REAL,
    
    -- Statistical data
    sample_size INTEGER DEFAULT 1,
    standard_deviation_time REAL,
    p95_execution_time_ms INTEGER,
    p99_execution_time_ms INTEGER,
    
    -- Maintenance timestamps
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (topic_category, execution_strategy, quality_level)
);

-- Worker health monitoring tracks the health of individual workers
CREATE TABLE IF NOT EXISTS worker_health_monitoring (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_name TEXT NOT NULL,
    
    -- Health status
    status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'unreachable')),
    last_response_time_ms INTEGER,
    success_rate_24h REAL, -- Success rate over last 24 hours
    avg_execution_time_24h INTEGER,
    
    -- Error tracking
    consecutive_failures INTEGER DEFAULT 0,
    last_error_message TEXT,
    last_success_at DATETIME,
    last_failure_at DATETIME,
    
    -- Capacity and performance
    current_load_estimate REAL DEFAULT 0.0, -- 0.0 = idle, 1.0 = fully loaded
    recommended_max_concurrent INTEGER DEFAULT 1,
    
    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cost tracking and budget management
CREATE TABLE IF NOT EXISTS cost_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL, -- YYYY-MM-DD format
    
    -- Daily aggregations
    total_pipelines INTEGER DEFAULT 0,
    successful_pipelines INTEGER DEFAULT 0,
    total_cost_usd REAL DEFAULT 0.0,
    
    -- Worker-specific costs
    topic_researcher_cost_usd REAL DEFAULT 0.0,
    rss_librarian_cost_usd REAL DEFAULT 0.0,
    feed_fetcher_cost_usd REAL DEFAULT 0.0,
    content_classifier_cost_usd REAL DEFAULT 0.0,
    report_builder_cost_usd REAL DEFAULT 0.0,
    
    -- Cost efficiency metrics
    avg_cost_per_pipeline REAL DEFAULT 0.0,
    cost_per_article_processed REAL DEFAULT 0.0,
    cost_savings_from_optimization REAL DEFAULT 0.0,
    
    -- Account-based tracking (for future multi-tenant support)
    account_id TEXT,
    
    UNIQUE (date, account_id)
);

-- Execution strategy performance analysis
CREATE TABLE IF NOT EXISTS strategy_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    strategy_name TEXT NOT NULL,
    
    -- Usage statistics
    total_executions INTEGER DEFAULT 1,
    successful_executions INTEGER DEFAULT 0,
    partial_executions INTEGER DEFAULT 0,
    failed_executions INTEGER DEFAULT 0,
    
    -- Performance metrics
    avg_execution_time_ms INTEGER,
    avg_cost_usd REAL,
    avg_quality_score REAL,
    
    -- Trend analysis
    trend_execution_time TEXT, -- 'improving', 'stable', 'degrading'
    trend_cost TEXT,
    trend_quality TEXT,
    
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (strategy_name)
);

-- Topic performance tracking for topic-specific optimizations
CREATE TABLE IF NOT EXISTS topic_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL,
    topic_category TEXT, -- Auto-categorized topic type
    
    -- Performance history
    total_pipelines INTEGER DEFAULT 1,
    successful_pipelines INTEGER DEFAULT 0,
    avg_execution_time_ms INTEGER,
    avg_cost_usd REAL,
    avg_sources_discovered INTEGER,
    avg_articles_processed INTEGER,
    avg_quality_score REAL,
    
    -- Optimization insights
    best_strategy TEXT, -- Which strategy works best for this topic
    common_bottlenecks TEXT, -- JSON array of frequent bottlenecks
    optimization_recommendations TEXT, -- JSON array of recommendations
    
    first_processed DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_processed DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (topic)
);

-- Performance alerts and notifications
CREATE TABLE IF NOT EXISTS performance_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Alert details
    alert_type TEXT NOT NULL CHECK (alert_type IN (
        'performance_degradation', 'cost_spike', 'worker_failure',
        'quality_drop', 'sla_breach', 'capacity_warning'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    title TEXT NOT NULL,
    description TEXT,
    
    -- Context
    pipeline_id TEXT,
    worker_name TEXT,
    metric_name TEXT,
    current_value REAL,
    threshold_value REAL,
    
    -- Status
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
    acknowledged_at DATETIME,
    resolved_at DATETIME,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_topic ON pipeline_executions(topic);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_status ON pipeline_executions(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_started ON pipeline_executions(started_at);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_strategy ON pipeline_executions(execution_strategy);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_account ON pipeline_executions(account_id);

CREATE INDEX IF NOT EXISTS idx_worker_performance_pipeline ON worker_performance(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_worker_performance_worker ON worker_performance(worker_name);
CREATE INDEX IF NOT EXISTS idx_worker_performance_success ON worker_performance(success);
CREATE INDEX IF NOT EXISTS idx_worker_performance_executed ON worker_performance(executed_at);

CREATE INDEX IF NOT EXISTS idx_optimization_insights_pipeline ON optimization_insights(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_optimization_insights_type ON optimization_insights(optimization_type);
CREATE INDEX IF NOT EXISTS idx_optimization_insights_applied ON optimization_insights(applied_at);

CREATE INDEX IF NOT EXISTS idx_worker_health_worker ON worker_health_monitoring(worker_name);
CREATE INDEX IF NOT EXISTS idx_worker_health_status ON worker_health_monitoring(status);
CREATE INDEX IF NOT EXISTS idx_worker_health_checked ON worker_health_monitoring(checked_at);

CREATE INDEX IF NOT EXISTS idx_cost_tracking_date ON cost_tracking(date);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_account ON cost_tracking(account_id);

CREATE INDEX IF NOT EXISTS idx_performance_alerts_type ON performance_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_severity ON performance_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_status ON performance_alerts(status);

-- Views for common analytical queries

-- Pipeline performance summary with success rates and trends
CREATE VIEW IF NOT EXISTS pipeline_performance_summary AS
SELECT 
    pe.execution_strategy,
    pe.quality_level,
    COUNT(*) as total_pipelines,
    COUNT(CASE WHEN pe.status = 'completed' THEN 1 END) as successful_pipelines,
    COUNT(CASE WHEN pe.status = 'partial' THEN 1 END) as partial_pipelines,
    COUNT(CASE WHEN pe.status = 'failed' THEN 1 END) as failed_pipelines,
    ROUND(100.0 * COUNT(CASE WHEN pe.status = 'completed' THEN 1 END) / COUNT(*), 1) as success_rate_percent,
    AVG(pe.total_execution_time_ms) as avg_execution_time,
    AVG(pe.total_cost_usd) as avg_cost,
    AVG(pe.final_quality_score) as avg_quality_score,
    MIN(pe.total_execution_time_ms) as fastest_execution,
    MAX(pe.total_execution_time_ms) as slowest_execution,
    AVG(pe.sources_discovered) as avg_sources,
    AVG(pe.articles_processed) as avg_articles
FROM pipeline_executions pe
WHERE pe.started_at > datetime('now', '-30 days')
GROUP BY pe.execution_strategy, pe.quality_level
ORDER BY success_rate_percent DESC, avg_execution_time ASC;

-- Worker performance analysis with bottleneck identification
CREATE VIEW IF NOT EXISTS worker_performance_analysis AS
SELECT 
    wp.worker_name,
    COUNT(*) as total_executions,
    COUNT(CASE WHEN wp.success THEN 1 END) as successful_executions,
    ROUND(100.0 * COUNT(CASE WHEN wp.success THEN 1 END) / COUNT(*), 1) as success_rate_percent,
    AVG(wp.execution_time_ms) as avg_execution_time,
    MIN(wp.execution_time_ms) as fastest_execution,
    MAX(wp.execution_time_ms) as slowest_execution,
    AVG(wp.cost_usd) as avg_cost,
    ROUND(100.0 * COUNT(CASE WHEN wp.cache_hit THEN 1 END) / COUNT(*), 1) as cache_hit_rate_percent,
    -- Most common bottlenecks
    GROUP_CONCAT(DISTINCT 
        CASE WHEN wp.bottlenecks_detected != '[]' 
        THEN wp.bottlenecks_detected 
        END
    ) as common_bottlenecks
FROM worker_performance wp
WHERE wp.executed_at > datetime('now', '-7 days')
GROUP BY wp.worker_name
ORDER BY success_rate_percent DESC, avg_execution_time ASC;

-- Cost efficiency analysis by strategy and time period
CREATE VIEW IF NOT EXISTS cost_efficiency_analysis AS
SELECT 
    DATE(pe.started_at) as execution_date,
    pe.execution_strategy,
    COUNT(*) as pipelines_executed,
    SUM(pe.total_cost_usd) as total_cost,
    AVG(pe.total_cost_usd) as avg_cost_per_pipeline,
    AVG(pe.total_cost_usd / NULLIF(pe.articles_processed, 0)) as cost_per_article,
    SUM(oi.cost_saved_usd) as total_cost_savings,
    ROUND(100.0 * SUM(oi.cost_saved_usd) / SUM(pe.total_cost_usd), 1) as cost_savings_percent,
    AVG(pe.total_execution_time_ms) as avg_execution_time,
    AVG(pe.final_quality_score) as avg_quality_score
FROM pipeline_executions pe
LEFT JOIN optimization_insights oi ON pe.pipeline_id = oi.pipeline_id AND oi.optimization_type = 'cost_optimization'
WHERE pe.started_at > datetime('now', '-30 days') AND pe.status IN ('completed', 'partial')
GROUP BY DATE(pe.started_at), pe.execution_strategy
ORDER BY execution_date DESC, cost_savings_percent DESC;

-- Real-time pipeline health dashboard
CREATE VIEW IF NOT EXISTS pipeline_health_dashboard AS
SELECT 
    -- Current status
    COUNT(CASE WHEN pe.status = 'processing' THEN 1 END) as currently_processing,
    COUNT(CASE WHEN pe.started_at > datetime('now', '-1 hour') THEN 1 END) as pipelines_last_hour,
    COUNT(CASE WHEN pe.started_at > datetime('now', '-24 hours') THEN 1 END) as pipelines_last_24h,
    
    -- Success rates
    ROUND(100.0 * COUNT(CASE WHEN pe.status = 'completed' AND pe.started_at > datetime('now', '-24 hours') THEN 1 END) / 
          NULLIF(COUNT(CASE WHEN pe.started_at > datetime('now', '-24 hours') THEN 1 END), 0), 1) as success_rate_24h,
    
    -- Performance metrics
    AVG(CASE WHEN pe.started_at > datetime('now', '-24 hours') THEN pe.total_execution_time_ms END) as avg_execution_time_24h,
    AVG(CASE WHEN pe.started_at > datetime('now', '-24 hours') THEN pe.total_cost_usd END) as avg_cost_24h,
    AVG(CASE WHEN pe.started_at > datetime('now', '-24 hours') THEN pe.final_quality_score END) as avg_quality_24h,
    
    -- Worker health
    COUNT(CASE WHEN wh.status = 'healthy' THEN 1 END) as healthy_workers,
    COUNT(CASE WHEN wh.status IN ('degraded', 'unhealthy') THEN 1 END) as unhealthy_workers,
    
    -- Alert counts
    COUNT(CASE WHEN pa.status = 'open' AND pa.severity = 'critical' THEN 1 END) as critical_alerts,
    COUNT(CASE WHEN pa.status = 'open' AND pa.severity = 'warning' THEN 1 END) as warning_alerts
    
FROM pipeline_executions pe
CROSS JOIN worker_health_monitoring wh
CROSS JOIN performance_alerts pa;

-- Top performing topics for optimization insights
CREATE VIEW IF NOT EXISTS top_performing_topics AS
SELECT 
    tp.topic,
    tp.topic_category,
    tp.total_pipelines,
    tp.successful_pipelines,
    ROUND(100.0 * tp.successful_pipelines / tp.total_pipelines, 1) as success_rate_percent,
    tp.avg_execution_time_ms,
    tp.avg_cost_usd,
    tp.avg_quality_score,
    tp.best_strategy,
    tp.last_processed,
    -- Calculate topic performance rank
    ROW_NUMBER() OVER (
        ORDER BY 
            (tp.successful_pipelines * 1.0 / tp.total_pipelines) * 0.4 +
            (1.0 - (tp.avg_execution_time_ms / 120000.0)) * 0.3 + 
            tp.avg_quality_score * 0.3 
        DESC
    ) as performance_rank
FROM topic_performance tp
WHERE tp.total_pipelines >= 3  -- Only topics with sufficient data
ORDER BY performance_rank;

-- Triggers for automatic data maintenance and alerts

-- Update performance baselines when pipelines complete
CREATE TRIGGER IF NOT EXISTS update_performance_baselines
AFTER UPDATE ON pipeline_executions
WHEN NEW.status IN ('completed', 'partial') AND OLD.status = 'processing'
BEGIN
    -- Categorize topic for baseline tracking
    UPDATE OR IGNORE performance_baselines 
    SET 
        baseline_execution_time_ms = (baseline_execution_time_ms * sample_size + NEW.total_execution_time_ms) / (sample_size + 1),
        baseline_cost_usd = (baseline_cost_usd * sample_size + NEW.total_cost_usd) / (sample_size + 1),
        baseline_quality_score = (baseline_quality_score * sample_size + NEW.final_quality_score) / (sample_size + 1),
        sample_size = sample_size + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE execution_strategy = NEW.execution_strategy 
      AND quality_level = NEW.quality_level;
      
    -- Insert new baseline if doesn't exist
    INSERT OR IGNORE INTO performance_baselines 
    (topic_category, execution_strategy, quality_level, baseline_execution_time_ms, 
     baseline_cost_usd, baseline_quality_score, sample_size)
    VALUES ('general', NEW.execution_strategy, NEW.quality_level, 
            NEW.total_execution_time_ms, NEW.total_cost_usd, NEW.final_quality_score, 1);
END;

-- Update worker health based on performance
CREATE TRIGGER IF NOT EXISTS update_worker_health
AFTER INSERT ON worker_performance
BEGIN
    -- Update worker health statistics
    INSERT OR REPLACE INTO worker_health_monitoring 
    (worker_name, last_response_time_ms, consecutive_failures, last_success_at, last_failure_at, checked_at)
    SELECT 
        NEW.worker_name,
        NEW.execution_time_ms,
        CASE WHEN NEW.success THEN 0 ELSE COALESCE((SELECT consecutive_failures FROM worker_health_monitoring WHERE worker_name = NEW.worker_name), 0) + 1 END,
        CASE WHEN NEW.success THEN CURRENT_TIMESTAMP ELSE (SELECT last_success_at FROM worker_health_monitoring WHERE worker_name = NEW.worker_name) END,
        CASE WHEN NOT NEW.success THEN CURRENT_TIMESTAMP ELSE (SELECT last_failure_at FROM worker_health_monitoring WHERE worker_name = NEW.worker_name) END,
        CURRENT_TIMESTAMP;
    
    -- Update worker status based on recent performance
    UPDATE worker_health_monitoring 
    SET status = CASE 
        WHEN consecutive_failures >= 3 THEN 'unhealthy'
        WHEN consecutive_failures = 2 THEN 'degraded' 
        WHEN consecutive_failures <= 1 AND last_response_time_ms < 30000 THEN 'healthy'
        ELSE 'degraded'
    END
    WHERE worker_name = NEW.worker_name;
END;

-- Update topic performance tracking
CREATE TRIGGER IF NOT EXISTS update_topic_performance
AFTER UPDATE ON pipeline_executions  
WHEN NEW.status IN ('completed', 'partial') AND OLD.status = 'processing'
BEGIN
    INSERT OR REPLACE INTO topic_performance 
    (topic, total_pipelines, successful_pipelines, avg_execution_time_ms, avg_cost_usd,
     avg_sources_discovered, avg_articles_processed, avg_quality_score, last_processed)
    SELECT 
        NEW.topic,
        COALESCE((SELECT total_pipelines FROM topic_performance WHERE topic = NEW.topic), 0) + 1,
        COALESCE((SELECT successful_pipelines FROM topic_performance WHERE topic = NEW.topic), 0) + 
            CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
        (COALESCE((SELECT avg_execution_time_ms * total_pipelines FROM topic_performance WHERE topic = NEW.topic), 0) + NEW.total_execution_time_ms) / 
            (COALESCE((SELECT total_pipelines FROM topic_performance WHERE topic = NEW.topic), 0) + 1),
        (COALESCE((SELECT avg_cost_usd * total_pipelines FROM topic_performance WHERE topic = NEW.topic), 0) + NEW.total_cost_usd) / 
            (COALESCE((SELECT total_pipelines FROM topic_performance WHERE topic = NEW.topic), 0) + 1),
        (COALESCE((SELECT avg_sources_discovered * total_pipelines FROM topic_performance WHERE topic = NEW.topic), 0) + NEW.sources_discovered) / 
            (COALESCE((SELECT total_pipelines FROM topic_performance WHERE topic = NEW.topic), 0) + 1),
        (COALESCE((SELECT avg_articles_processed * total_pipelines FROM topic_performance WHERE topic = NEW.topic), 0) + NEW.articles_processed) / 
            (COALESCE((SELECT total_pipelines FROM topic_performance WHERE topic = NEW.topic), 0) + 1),
        (COALESCE((SELECT avg_quality_score * total_pipelines FROM topic_performance WHERE topic = NEW.topic), 0) + NEW.final_quality_score) / 
            (COALESCE((SELECT total_pipelines FROM topic_performance WHERE topic = NEW.topic), 0) + 1),
        CURRENT_TIMESTAMP;
END;

-- Update daily cost tracking
CREATE TRIGGER IF NOT EXISTS update_daily_costs
AFTER UPDATE ON pipeline_executions
WHEN NEW.status IN ('completed', 'partial') AND OLD.status = 'processing'
BEGIN
    INSERT OR REPLACE INTO cost_tracking 
    (date, total_pipelines, successful_pipelines, total_cost_usd, avg_cost_per_pipeline)
    SELECT 
        DATE(NEW.completed_at),
        COALESCE((SELECT total_pipelines FROM cost_tracking WHERE date = DATE(NEW.completed_at)), 0) + 1,
        COALESCE((SELECT successful_pipelines FROM cost_tracking WHERE date = DATE(NEW.completed_at)), 0) + 
            CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
        COALESCE((SELECT total_cost_usd FROM cost_tracking WHERE date = DATE(NEW.completed_at)), 0) + NEW.total_cost_usd,
        (COALESCE((SELECT total_cost_usd FROM cost_tracking WHERE date = DATE(NEW.completed_at)), 0) + NEW.total_cost_usd) / 
            (COALESCE((SELECT total_pipelines FROM cost_tracking WHERE date = DATE(NEW.completed_at)), 0) + 1);
END;

-- Generate performance alerts for critical issues
CREATE TRIGGER IF NOT EXISTS generate_performance_alerts
AFTER UPDATE ON pipeline_executions
WHEN NEW.status IN ('completed', 'partial', 'failed') AND OLD.status = 'processing'
BEGIN
    -- Alert on execution time exceeding threshold
    INSERT INTO performance_alerts (alert_type, severity, title, description, pipeline_id, current_value, threshold_value)
    SELECT 'performance_degradation', 'warning', 'Slow Pipeline Execution',
           'Pipeline execution time exceeded 3 minutes: ' || (NEW.total_execution_time_ms / 1000.0) || ' seconds',
           NEW.pipeline_id, NEW.total_execution_time_ms, 180000
    WHERE NEW.total_execution_time_ms > 180000;
    
    -- Alert on high costs
    INSERT INTO performance_alerts (alert_type, severity, title, description, pipeline_id, current_value, threshold_value)
    SELECT 'cost_spike', 'warning', 'High Pipeline Cost',
           'Pipeline cost exceeded $1.00: $' || NEW.total_cost_usd,
           NEW.pipeline_id, NEW.total_cost_usd, 1.0
    WHERE NEW.total_cost_usd > 1.0;
    
    -- Alert on low quality scores
    INSERT INTO performance_alerts (alert_type, severity, title, description, pipeline_id, current_value, threshold_value)
    SELECT 'quality_drop', 'critical', 'Low Quality Score',
           'Pipeline quality score below 0.5: ' || NEW.final_quality_score,
           NEW.pipeline_id, NEW.final_quality_score, 0.5
    WHERE NEW.final_quality_score < 0.5 AND NEW.status IN ('completed', 'partial');
END;

-- Sample data for testing and development
INSERT OR IGNORE INTO pipeline_executions 
(pipeline_id, topic, urgency, quality_level, execution_strategy, total_execution_time_ms, 
 total_cost_usd, sources_discovered, articles_processed, final_quality_score, status, completed_at)
VALUES 
('pipe_sample_001', 'artificial intelligence', 'medium', 'standard', 'balanced', 
 95000, 0.43, 12, 48, 0.89, 'completed', datetime('now', '-2 hours')),
('pipe_sample_002', 'climate change', 'high', 'premium', 'speed_optimized', 
 67000, 0.67, 15, 62, 0.91, 'completed', datetime('now', '-1 hour')),
('pipe_sample_003', 'quantum computing', 'low', 'basic', 'cost_optimized', 
 142000, 0.21, 8, 31, 0.84, 'completed', datetime('now', '-30 minutes'));

-- Initialize worker health monitoring  
INSERT OR IGNORE INTO worker_health_monitoring 
(worker_name, status, consecutive_failures, checked_at)
VALUES 
('topic_researcher', 'healthy', 0, CURRENT_TIMESTAMP),
('rss_librarian', 'healthy', 0, CURRENT_TIMESTAMP),
('feed_fetcher', 'healthy', 0, CURRENT_TIMESTAMP),
('content_classifier', 'healthy', 0, CURRENT_TIMESTAMP),
('report_builder', 'healthy', 0, CURRENT_TIMESTAMP);

-- Performance optimization  
ANALYZE pipeline_executions;
ANALYZE worker_performance;
ANALYZE optimization_insights;

-- Verify database integrity
PRAGMA integrity_check;