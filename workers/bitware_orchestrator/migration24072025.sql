-- Safe Step-by-Step Database Schema for Orchestrator
-- File: workers/bitware_orchestrator/safe_schema.sql
-- Avoids foreign key constraint issues during initial creation

-- Step 1: Create basic tables first (no foreign keys)
CREATE TABLE IF NOT EXISTS worker_registry (
    worker_name TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    version TEXT DEFAULT '1.0.0',
    service_binding TEXT NOT NULL,
    endpoints TEXT NOT NULL,
    input_format TEXT NOT NULL,
    output_format TEXT NOT NULL,
    dependencies TEXT DEFAULT '[]',
    optional_dependencies TEXT DEFAULT '[]',
    estimated_cost_usd REAL DEFAULT 0.01,
    avg_response_time_ms INTEGER DEFAULT 5000,
    timeout_ms INTEGER DEFAULT 60000,
    max_retries INTEGER DEFAULT 2,
    is_active BOOLEAN DEFAULT TRUE,
    health_check_endpoint TEXT DEFAULT '/health',
    last_health_check DATETIME,
    health_status TEXT DEFAULT 'unknown',
    default_config TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pipeline_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    version TEXT DEFAULT '1.0.0',
    category TEXT DEFAULT 'general',
    complexity_level TEXT DEFAULT 'standard',
    estimated_duration_ms INTEGER DEFAULT 120000,
    estimated_cost_usd REAL DEFAULT 0.10,
    allows_parallel_execution BOOLEAN DEFAULT FALSE,
    requires_all_steps BOOLEAN DEFAULT TRUE,
    failure_tolerance TEXT DEFAULT 'strict',
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pipeline_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL,
    step_order INTEGER NOT NULL,
    worker_name TEXT NOT NULL,
    step_name TEXT NOT NULL,
    description TEXT,
    is_optional BOOLEAN DEFAULT FALSE,
    can_run_parallel BOOLEAN DEFAULT FALSE,
    conditions TEXT DEFAULT '{}',
    input_mapping TEXT DEFAULT '{}',
    output_mapping TEXT DEFAULT '{}',
    timeout_override_ms INTEGER,
    retry_override INTEGER,
    custom_config TEXT DEFAULT '{}',
    depends_on_steps TEXT DEFAULT '[]',
    blocks_steps TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pipeline_executions (
    id TEXT PRIMARY KEY,
    template_id INTEGER,
    template_name TEXT,
    topic TEXT NOT NULL,
    request_data TEXT,
    client_context TEXT DEFAULT '{}',
    strategy TEXT DEFAULT 'balanced',
    urgency TEXT DEFAULT 'medium',
    quality_level TEXT DEFAULT 'standard',
    optimize_for TEXT DEFAULT 'balanced',
    total_execution_time_ms INTEGER,
    total_cost_usd REAL DEFAULT 0.0,
    estimated_cost_usd REAL DEFAULT 0.0,
    sources_discovered INTEGER DEFAULT 0,
    articles_processed INTEGER DEFAULT 0,
    final_quality_score REAL DEFAULT 0.0,
    status TEXT CHECK (status IN ('running', 'completed', 'partial', 'failed', 'cancelled')),
    error_message TEXT,
    optimization_applied TEXT DEFAULT '[]',
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

CREATE TABLE IF NOT EXISTS worker_execution_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pipeline_id TEXT NOT NULL,
    step_order INTEGER NOT NULL,
    worker_name TEXT NOT NULL,
    endpoint_called TEXT,
    method_used TEXT DEFAULT 'GET',
    input_data TEXT,
    success BOOLEAN NOT NULL,
    output_data TEXT,
    error_message TEXT,
    execution_time_ms INTEGER NOT NULL,
    cost_usd REAL DEFAULT 0.0,
    cache_hit BOOLEAN DEFAULT FALSE,
    retry_count INTEGER DEFAULT 0,
    quality_score REAL,
    bottlenecks_detected TEXT DEFAULT '[]',
    optimization_opportunities TEXT DEFAULT '[]',
    communication_method TEXT DEFAULT 'service_binding',
    http_status_code INTEGER,
    response_time_ms INTEGER,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_status ON pipeline_executions(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_started ON pipeline_executions(started_at);
CREATE INDEX IF NOT EXISTS idx_worker_results_pipeline ON worker_execution_results(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_worker_results_worker ON worker_execution_results(worker_name);

-- Step 3: Insert worker registry data
INSERT OR REPLACE INTO worker_registry (
    worker_name, display_name, description, service_binding,
    endpoints, input_format, output_format, dependencies,
    estimated_cost_usd, avg_response_time_ms, timeout_ms
) VALUES 
('topic_researcher', 'Topic Researcher', 'AI-powered RSS source discovery using web search and LLM validation', 'TOPIC_RESEARCHER', '["/" , "/admin/analytics", "/admin/performance", "/admin/stats", "/admin/sessions"]', 'topic_string', 'rss_sources', '[]', 0.02, 30000, 60000),
('rss_librarian', 'RSS Librarian', 'Curated RSS source management and discovery', 'RSS_LIBRARIAN', '["/", "/sources", "/admin/stats"]', 'topic_string', 'rss_feeds', '[]', 0.001, 1000, 10000),
('feed_fetcher', 'Feed Fetcher', 'RSS content downloading and article extraction', 'FEED_FETCHER', '["/fetch", "/batch", "/admin/stats"]', 'rss_urls', 'articles', '["topic_researcher", "rss_librarian"]', 0.005, 15000, 45000),
('content_classifier', 'Content Classifier', 'AI-powered content analysis and relevance scoring', 'CONTENT_CLASSIFIER', '["/analyze", "/admin/stats", "/admin/performance"]', 'articles', 'analyzed_articles', '["feed_fetcher"]', 0.03, 45000, 90000),
('report_builder', 'Report Builder', 'Intelligence report generation and formatting', 'REPORT_BUILDER', '["/generate", "/admin/stats"]', 'analyzed_articles', 'intelligence_report', '["content_classifier"]', 0.01, 15000, 30000);

-- Step 4: Insert pipeline templates
INSERT OR REPLACE INTO pipeline_templates (id, name, display_name, description, category, complexity_level, estimated_duration_ms, estimated_cost_usd, allows_parallel_execution, is_default) VALUES 
(1, 'rss_intelligence_pipeline', 'RSS Intelligence Pipeline', 'Complete RSS intelligence gathering from topic research to final report', 'rss_intelligence', 'standard', 120000, 0.08, false, true),
(2, 'basic_research_pipeline', 'Basic Research Pipeline', 'Simple topic research for RSS source discovery only', 'research', 'basic', 30000, 0.02, false, false);

-- Step 5: Insert pipeline steps
INSERT OR REPLACE INTO pipeline_steps (template_id, step_order, worker_name, step_name, description, is_optional, conditions, input_mapping, output_mapping) VALUES 
(1, 1, 'topic_researcher', 'Topic Research', 'Discover RSS sources for the topic', false, '{}', '{"topic": "$.topic", "depth": "$.source_discovery_depth", "min_quality": 0.7}', '{"sources": "$.sources", "quality_score": "$.avg_quality_score"}'),
(1, 2, 'rss_librarian', 'Source Curation', 'Find curated RSS sources', true, '{}', '{"topic": "$.topic", "max_feeds": 15}', '{"additional_sources": "$.sources"}'),
(1, 3, 'feed_fetcher', 'Content Fetching', 'Download articles from RSS feeds', false, '{"sources_available": "> 0"}', '{"sources": "$.all_sources", "max_articles": "$.max_articles"}', '{"articles": "$.articles", "articles_count": "$.articles_processed"}'),
(1, 4, 'content_classifier', 'Content Analysis', 'AI analysis of article relevance', false, '{"articles_available": "> 0"}', '{"articles": "$.articles", "topic": "$.topic"}', '{"analyzed_articles": "$.analyzed_articles", "insights": "$.insights"}'),
(1, 5, 'report_builder', 'Report Generation', 'Generate final intelligence report', false, '{"analyzed_articles_available": "> 0"}', '{"articles": "$.analyzed_articles", "topic": "$.topic", "report_type": "executive_summary"}', '{"report": "$.report", "summary": "$.summary"}'),
(2, 1, 'topic_researcher', 'Topic Research', 'Discover RSS sources for the topic', false, '{}', '{"topic": "$.topic", "depth": "$.source_discovery_depth", "min_quality": 0.7}', '{"sources": "$.sources", "quality_score": "$.avg_quality_score"}');