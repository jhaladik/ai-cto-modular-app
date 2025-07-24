-- ========================================================================
-- AI Factory Orchestrator: Production Templates Schema
-- File: orchestrator_production_templates.sql
-- Purpose: 3 ready-to-use templates based on actual worker specifications
-- ========================================================================

-- Ensure we have the latest database structure
-- Run this after existing schema.sql

-- ========================================================================
-- WORKER REGISTRY: Accurate specifications from actual code
-- ========================================================================

-- Clear existing data to ensure clean state
DELETE FROM pipeline_steps;
DELETE FROM pipeline_templates;
DELETE FROM worker_registry;

-- Insert accurate worker registry based on actual implementations
INSERT INTO worker_registry (
    worker_name, display_name, description, service_binding,
    endpoints, input_format, output_format, dependencies,
    estimated_cost_usd, avg_response_time_ms, timeout_ms,
    is_active, default_config
) VALUES 

-- Topic Researcher (from actual README and code)
('topic_researcher', 'Topic Researcher', 'AI-powered RSS source discovery using web search and LLM validation', 'TOPIC_RESEARCHER', 
 '["/?topic=<topic>&depth=<1-5>&min_quality=<0.0-1.0>", "/admin/stats", "/admin/sessions", "/help", "/capabilities"]', 
 'topic_string_with_params', 'rss_sources_with_quality', '[]', 
 0.02, 30000, 60000, TRUE, 
 '{"default_depth": 3, "default_min_quality": 0.6, "default_max_sources": 20}'),

-- RSS Librarian (based on source finder pattern)
('rss_librarian', 'RSS Librarian', 'Curated RSS source management and discovery from database', 'RSS_LIBRARIAN', 
 '["/?topic=<topic>&max_feeds=<num>", "/sources", "/admin/stats", "/help", "/capabilities"]', 
 'topic_string_with_params', 'curated_rss_feeds', '[]', 
 0.001, 1000, 10000, TRUE, 
 '{"default_max_feeds": 10, "cache_ttl": 3600}'),

-- Feed Fetcher (from actual architecture docs)
('feed_fetcher', 'Feed Fetcher', 'RSS content downloading and article extraction', 'FEED_FETCHER', 
 '["/?feed_url=<url>&max_articles=<num>", "/batch", "/admin/stats", "/help", "/capabilities"]', 
 'rss_urls_array', 'extracted_articles', '["topic_researcher", "rss_librarian"]', 
 0.005, 15000, 45000, TRUE, 
 '{"default_max_articles": 20, "batch_limit": 10, "include_content": true}'),

-- Content Classifier (from integration patterns)
('content_classifier', 'Content Classifier', 'AI-powered content analysis and relevance scoring', 'CONTENT_CLASSIFIER', 
 '["/analyze", "/admin/stats", "/admin/performance", "/help", "/capabilities"]', 
 'articles_array', 'analyzed_articles_with_scores', '["feed_fetcher"]', 
 0.03, 45000, 90000, TRUE, 
 '{"analysis_depth": "standard", "include_summary": true, "min_relevance": 0.7}'),

-- Report Builder (from pipeline architecture)
('report_builder', 'Report Builder', 'Intelligence report generation and formatting', 'REPORT_BUILDER', 
 '["/generate", "/admin/stats", "/help", "/capabilities"]', 
 'analyzed_articles_array', 'formatted_intelligence_report', '["content_classifier"]', 
 0.01, 15000, 30000, TRUE, 
 '{"default_format": "json", "include_insights": true, "max_articles": 50}');

-- ========================================================================
-- TEMPLATE 1: Individual Worker - Topic Research Only
-- ========================================================================

INSERT INTO pipeline_templates (
    name, display_name, description, category, complexity_level,
    estimated_duration_ms, estimated_cost_usd, allows_parallel_execution,
    requires_all_steps, is_active, is_default
) VALUES (
    'topic_research_only', 
    'Topic Research Only', 
    'Quick RSS source discovery using AI research without database dependencies',
    'individual', 'simple',
    30000, 0.02, FALSE, TRUE, TRUE, FALSE
);

-- Get the template ID for topic_research_only
INSERT INTO pipeline_steps (
    template_id, step_order, worker_name, step_name, description,
    is_optional, conditions, input_mapping, output_mapping,
    timeout_override_ms, custom_config
) VALUES (
    (SELECT id FROM pipeline_templates WHERE name = 'topic_research_only'),
    1, 'topic_researcher', 'research_topic', 
    'Discover RSS sources for any topic using AI-powered web search and validation',
    FALSE, '{}',
    '{"topic": "$.topic", "depth": "$.source_discovery_depth", "min_quality": "$.min_quality_threshold", "max_sources": "$.max_sources"}',
    '{"sources": "$.sources", "sources_count": "$.sources_discovered", "avg_quality": "$.avg_quality_score"}',
    60000,
    '{"endpoint": "/?topic={topic}&depth={source_discovery_depth}&min_quality={min_quality_threshold}&max_sources={max_sources}", "method": "GET"}'
);

-- ========================================================================
-- TEMPLATE 2: Smart Source Discovery - Intelligent Routing
-- ========================================================================

INSERT INTO pipeline_templates (
    name, display_name, description, category, complexity_level,
    estimated_duration_ms, estimated_cost_usd, allows_parallel_execution,
    requires_all_steps, is_active, is_default
) VALUES (
    'smart_source_discovery', 
    'Smart Source Discovery', 
    'Intelligent routing: Check librarian first, supplement with research if needed',
    'combination', 'moderate',
    35000, 0.025, FALSE, FALSE, TRUE, FALSE
);

-- Step 1: Check RSS Librarian first
INSERT INTO pipeline_steps (
    template_id, step_order, worker_name, step_name, description,
    is_optional, conditions, input_mapping, output_mapping,
    timeout_override_ms, custom_config
) VALUES (
    (SELECT id FROM pipeline_templates WHERE name = 'smart_source_discovery'),
    1, 'rss_librarian', 'check_existing_sources', 
    'Check curated database for existing high-quality sources',
    FALSE, '{}',
    '{"topic": "$.topic", "max_feeds": "$.max_sources"}',
    '{"library_sources": "$.sources", "library_count": "$.sources_count", "sufficient": "$.sources_count >= 5"}',
    10000,
    '{"endpoint": "/?topic={topic}&max_feeds={max_sources}", "method": "GET"}'
);

-- Step 2: Research new sources if librarian insufficient
INSERT INTO pipeline_steps (
    template_id, step_order, worker_name, step_name, description,
    is_optional, conditions, input_mapping, output_mapping,
    timeout_override_ms, custom_config
) VALUES (
    (SELECT id FROM pipeline_templates WHERE name = 'smart_source_discovery'),
    2, 'topic_researcher', 'supplement_with_research', 
    'Discover additional sources if librarian results are insufficient',
    TRUE, '{"library_count": "< 5"}',
    '{"topic": "$.topic", "depth": "$.source_discovery_depth", "min_quality": "$.min_quality_threshold"}',
    '{"research_sources": "$.sources", "research_count": "$.sources_discovered", "combined_sources": "$.library_sources + $.research_sources"}',
    60000,
    '{"endpoint": "/?topic={topic}&depth={source_discovery_depth}&min_quality={min_quality_threshold}", "method": "GET"}'
);

-- ========================================================================
-- TEMPLATE 3: Complete Intelligence Pipeline - Full 5-Worker Chain
-- ========================================================================

INSERT INTO pipeline_templates (
    name, display_name, description, category, complexity_level,
    estimated_duration_ms, estimated_cost_usd, allows_parallel_execution,
    requires_all_steps, is_active, is_default
) VALUES (
    'complete_intelligence_pipeline', 
    'Complete Intelligence Pipeline', 
    'Full AI Factory pipeline: Source discovery → Content extraction → Analysis → Report generation',
    'full_pipeline', 'advanced',
    180000, 0.12, FALSE, TRUE, TRUE, TRUE
);

-- Step 1: Source Discovery (Smart routing)
INSERT INTO pipeline_steps (
    template_id, step_order, worker_name, step_name, description,
    is_optional, conditions, input_mapping, output_mapping,
    timeout_override_ms, custom_config
) VALUES (
    (SELECT id FROM pipeline_templates WHERE name = 'complete_intelligence_pipeline'),
    1, 'rss_librarian', 'initial_source_lookup', 
    'Get curated sources from library as starting point',
    FALSE, '{}',
    '{"topic": "$.topic", "max_feeds": 8}',
    '{"initial_sources": "$.sources", "initial_count": "$.sources_count"}',
    10000,
    '{"endpoint": "/?topic={topic}&max_feeds=8", "method": "GET"}'
);

-- Step 2: Supplement with AI Research
INSERT INTO pipeline_steps (
    template_id, step_order, worker_name, step_name, description,
    is_optional, conditions, input_mapping, output_mapping,
    timeout_override_ms, custom_config
) VALUES (
    (SELECT id FROM pipeline_templates WHERE name = 'complete_intelligence_pipeline'),
    2, 'topic_researcher', 'enhance_source_discovery', 
    'Add AI-discovered sources to expand coverage',
    FALSE, '{}',
    '{"topic": "$.topic", "depth": "$.source_discovery_depth", "min_quality": 0.7, "max_sources": 10}',
    '{"research_sources": "$.sources", "all_sources": "$.initial_sources + $.research_sources", "total_sources": "$.initial_count + $.sources_discovered"}',
    60000,
    '{"endpoint": "/?topic={topic}&depth={source_discovery_depth}&min_quality=0.7&max_sources=10", "method": "GET"}'
);

-- Step 3: Content Extraction
INSERT INTO pipeline_steps (
    template_id, step_order, worker_name, step_name, description,
    is_optional, conditions, input_mapping, output_mapping,
    timeout_override_ms, custom_config
) VALUES (
    (SELECT id FROM pipeline_templates WHERE name = 'complete_intelligence_pipeline'),
    3, 'feed_fetcher', 'extract_articles', 
    'Download and extract articles from all discovered RSS sources',
    FALSE, '{"total_sources": "> 0"}',
    '{"feed_urls": "$.all_sources", "max_articles_per_feed": "$.max_articles"}',
    '{"articles": "$.articles", "articles_count": "$.articles_processed", "sources_processed": "$.feeds_processed"}',
    90000,
    '{"endpoint": "/batch", "method": "POST", "body": {"feed_urls": "{all_sources}", "max_articles_per_feed": "{max_articles}"}}'
);

-- Step 4: AI Content Analysis
INSERT INTO pipeline_steps (
    template_id, step_order, worker_name, step_name, description,
    is_optional, conditions, input_mapping, output_mapping,
    timeout_override_ms, custom_config
) VALUES (
    (SELECT id FROM pipeline_templates WHERE name = 'complete_intelligence_pipeline'),
    4, 'content_classifier', 'analyze_relevance', 
    'AI-powered analysis of article relevance and quality scoring',
    FALSE, '{"articles_count": "> 0"}',
    '{"articles": "$.articles", "target_topic": "$.topic", "analysis_depth": "$.quality_level"}',
    '{"analyzed_articles": "$.analyzed_articles", "relevant_articles": "$.relevant_count", "avg_relevance": "$.avg_relevance_score"}',
    90000,
    '{"endpoint": "/analyze", "method": "POST", "body": {"articles": "{articles}", "target_topic": "{topic}", "analysis_depth": "{quality_level}"}}'
);

-- Step 5: Intelligence Report Generation
INSERT INTO pipeline_steps (
    template_id, step_order, worker_name, step_name, description,
    is_optional, conditions, input_mapping, output_mapping,
    timeout_override_ms, custom_config
) VALUES (
    (SELECT id FROM pipeline_templates WHERE name = 'complete_intelligence_pipeline'),
    5, 'report_builder', 'generate_intelligence_report', 
    'Create formatted intelligence report with insights and summaries',
    FALSE, '{"relevant_articles": "> 0"}',
    '{"analyzed_articles": "$.analyzed_articles", "report_type": "executive_summary", "output_format": "$.output_format"}',
    '{"final_report": "$.report", "executive_summary": "$.summary", "key_insights": "$.insights"}',
    30000,
    '{"endpoint": "/generate", "method": "POST", "body": {"analyzed_articles": "{analyzed_articles}", "report_type": "executive_summary", "output_format": "{output_format}"}}'
);

-- ========================================================================
-- VERIFICATION QUERIES
-- ========================================================================

-- Check that all templates were created
SELECT 
    name, 
    display_name, 
    category, 
    estimated_duration_ms/1000 as duration_seconds,
    estimated_cost_usd 
FROM pipeline_templates 
WHERE is_active = TRUE
ORDER BY complexity_level;

-- Check that all steps were created
SELECT 
    pt.name as template_name,
    ps.step_order,
    ps.worker_name,
    ps.step_name,
    ps.is_optional
FROM pipeline_templates pt
JOIN pipeline_steps ps ON pt.id = ps.template_id
WHERE pt.is_active = TRUE
ORDER BY pt.name, ps.step_order;

-- Check worker registry
SELECT 
    worker_name,
    display_name,
    input_format,
    output_format,
    estimated_cost_usd,
    timeout_ms/1000 as timeout_seconds
FROM worker_registry 
WHERE is_active = TRUE
ORDER BY worker_name;

-- ========================================================================
-- TESTING QUERIES - Use these to verify templates work
-- ========================================================================

-- Test template availability
SELECT COUNT(*) as total_templates FROM pipeline_templates WHERE is_active = TRUE;

-- Test steps per template
SELECT 
    pt.name,
    COUNT(ps.id) as step_count,
    COUNT(CASE WHEN ps.is_optional = FALSE THEN 1 END) as required_steps
FROM pipeline_templates pt
LEFT JOIN pipeline_steps ps ON pt.id = ps.template_id
WHERE pt.is_active = TRUE
GROUP BY pt.id, pt.name;

-- Test worker dependencies
SELECT 
    ps.template_id,
    pt.name as template_name,
    ps.step_order,
    ps.worker_name,
    wr.dependencies
FROM pipeline_steps ps
JOIN pipeline_templates pt ON ps.template_id = pt.id
JOIN worker_registry wr ON ps.worker_name = wr.worker_name
WHERE pt.is_active = TRUE
ORDER BY ps.template_id, ps.step_order;