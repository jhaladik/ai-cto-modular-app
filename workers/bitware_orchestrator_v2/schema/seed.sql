-- Seed data for Orchestrator 2.0
-- Initialize worker registry and resource pools

-- Insert worker registry data
INSERT OR REPLACE INTO worker_registry (
  worker_name, display_name, version, capabilities, resource_requirements,
  max_concurrent_executions, avg_execution_time_ms, avg_cost_usd, health_status
) VALUES
  ('bitware_topic_researcher', 'Topic Researcher', '1.0.0', 
   '["research", "ai_analysis", "content_generation"]',
   '{"api": ["openai"], "memory_mb": 128, "timeout_ms": 300000}',
   5, 45000, 0.15, 'healthy'),
   
  ('bitware_rss_source_finder', 'RSS Source Finder', '1.0.0',
   '["rss_discovery", "feed_validation", "source_ranking"]',
   '{"memory_mb": 64, "timeout_ms": 60000}',
   10, 15000, 0.02, 'healthy'),
   
  ('bitware_feed_fetcher', 'Feed Fetcher', '1.0.0',
   '["feed_parsing", "article_extraction", "content_cleaning"]',
   '{"memory_mb": 128, "timeout_ms": 120000}',
   10, 30000, 0.05, 'healthy'),
   
  ('bitware_content_classifier', 'Content Classifier', '1.0.0',
   '["classification", "sentiment_analysis", "relevance_scoring"]',
   '{"api": ["openai"], "memory_mb": 128, "timeout_ms": 180000}',
   5, 60000, 0.20, 'healthy'),
   
  ('bitware_report_builder', 'Report Builder', '1.0.0',
   '["report_generation", "formatting", "visualization"]',
   '{"memory_mb": 256, "timeout_ms": 120000}',
   5, 40000, 0.10, 'healthy'),
   
  ('bitware_universal_researcher', 'Universal Researcher 2.0', '2.0.0',
   '["advanced_research", "multi_source", "deep_analysis"]',
   '{"api": ["openai", "anthropic"], "memory_mb": 512, "timeout_ms": 600000}',
   3, 180000, 0.50, 'healthy'),
   
  ('bitware_ai_factory_optimizer', 'AI Factory Optimizer', '1.0.0',
   '["optimization", "performance_analysis", "cost_reduction"]',
   '{"memory_mb": 128, "timeout_ms": 60000}',
   5, 20000, 0.05, 'healthy');

-- Insert resource pools configuration
INSERT OR REPLACE INTO resource_pools (
  resource_type, resource_name, provider, daily_limit, monthly_limit,
  rate_limit_per_minute, cost_per_unit, unit_type, reset_schedule
) VALUES
  ('api', 'openai_gpt4', 'OpenAI', 10000, 300000, 100, 0.00003, 'tokens', 'daily'),
  ('api', 'openai_gpt35', 'OpenAI', 50000, 1500000, 200, 0.000001, 'tokens', 'daily'),
  ('api', 'anthropic_claude', 'Anthropic', 5000, 150000, 50, 0.00002, 'tokens', 'daily'),
  ('storage', 'kv_storage', 'Cloudflare', NULL, 1000, NULL, 0.0001, 'mb', 'monthly'),
  ('storage', 'r2_storage', 'Cloudflare', NULL, NULL, NULL, 0.000015, 'gb', 'monthly'),
  ('email', 'email_quota', 'SendGrid', 100, 3000, 10, 0.001, 'emails', 'monthly'),
  ('worker', 'cpu_time', 'Cloudflare', NULL, 100000, NULL, 0.000001, 'ms', 'monthly');

-- Insert default client quotas (example for testing)
INSERT OR REPLACE INTO client_quotas (
  client_id, resource_type, resource_name, quota_limit, quota_period,
  quota_used, overage_allowed, overage_rate_usd
) VALUES
  ('default_client', 'api', 'openai_gpt4', 1000, 'daily', 0, 1, 0.00005),
  ('default_client', 'api', 'openai_gpt35', 5000, 'daily', 0, 1, 0.000002),
  ('default_client', 'storage', 'r2_storage', 10, 'monthly', 0, 1, 0.00002),
  ('default_client', 'email', 'email_quota', 50, 'monthly', 0, 0, NULL);

-- Insert sample pipeline templates (will be synced from KAM later)
INSERT OR REPLACE INTO pipeline_templates (
  template_name, display_name, description, category, subscription_tier,
  stages_config, parameters_config, estimated_cost_usd, estimated_time_ms
) VALUES
  ('quick_research', 'Quick Research', 'Fast topic research with AI analysis', 
   'research', 'basic',
   '[{"order":1,"worker":"bitware_topic_researcher","action":"research"}]',
   '[{"name":"topic","type":"string","required":true}]',
   0.15, 45000),
   
  ('content_monitoring', 'Content Monitoring', 'Monitor RSS feeds for relevant content',
   'monitoring', 'standard',
   '[{"order":1,"worker":"bitware_rss_source_finder","action":"find"},{"order":2,"worker":"bitware_feed_fetcher","action":"fetch"},{"order":3,"worker":"bitware_content_classifier","action":"classify"}]',
   '[{"name":"keywords","type":"array","required":true},{"name":"sources","type":"number","required":false}]',
   0.27, 105000),
   
  ('comprehensive_report', 'Comprehensive Report', 'Full analysis with report generation',
   'reporting', 'premium',
   '[{"order":1,"worker":"bitware_topic_researcher","action":"research"},{"order":2,"worker":"bitware_rss_source_finder","action":"find"},{"order":3,"worker":"bitware_feed_fetcher","action":"fetch"},{"order":4,"worker":"bitware_content_classifier","action":"classify"},{"order":5,"worker":"bitware_report_builder","action":"build"}]',
   '[{"name":"topic","type":"string","required":true},{"name":"depth","type":"string","required":false}]',
   0.52, 190000);

-- Initialize pipeline metrics
INSERT OR REPLACE INTO pipeline_metrics (
  template_name, execution_count, success_count, failure_count,
  avg_cost_usd, avg_time_ms, min_time_ms, max_time_ms, p95_time_ms
) VALUES
  ('quick_research', 0, 0, 0, 0.15, 45000, 40000, 50000, 48000),
  ('content_monitoring', 0, 0, 0, 0.27, 105000, 90000, 120000, 115000),
  ('comprehensive_report', 0, 0, 0, 0.52, 190000, 170000, 210000, 205000);

-- Initialize resource availability snapshot
INSERT INTO resource_availability (
  snapshot_id, resource_type, resource_name, total_capacity, 
  used_capacity, available_capacity, utilization_percentage
) VALUES
  ('init_openai_gpt4', 'api', 'openai_gpt4', 10000, 0, 10000, 0.0),
  ('init_openai_gpt35', 'api', 'openai_gpt35', 50000, 0, 50000, 0.0),
  ('init_kv_storage', 'storage', 'kv_storage', 1000, 0, 1000, 0.0),
  ('init_r2_storage', 'storage', 'r2_storage', 10240, 0, 10240, 0.0);

-- Initialize worker performance baselines
INSERT INTO worker_performance (
  worker_name, date, execution_count, success_count, failure_count,
  avg_execution_time_ms, min_execution_time_ms, max_execution_time_ms,
  p95_execution_time_ms, total_cost_usd, error_rate
) VALUES
  ('bitware_topic_researcher', date('now'), 0, 0, 0, 45000, 40000, 50000, 48000, 0.0, 0.0),
  ('bitware_rss_source_finder', date('now'), 0, 0, 0, 15000, 12000, 18000, 17000, 0.0, 0.0),
  ('bitware_feed_fetcher', date('now'), 0, 0, 0, 30000, 25000, 35000, 33000, 0.0, 0.0),
  ('bitware_content_classifier', date('now'), 0, 0, 0, 60000, 50000, 70000, 68000, 0.0, 0.0),
  ('bitware_report_builder', date('now'), 0, 0, 0, 40000, 35000, 45000, 43000, 0.0, 0.0);