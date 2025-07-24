-- Feed fetcher configuration fix
-- File: workers/bitware_orchestrator/feed_fetcher_fix.sql

-- Update feed fetcher step to use correct parameters
UPDATE pipeline_steps 
SET input_mapping = '{"feed_urls": "$.all_sources", "max_articles_per_feed": "$.max_articles"}'
WHERE worker_name = 'feed_fetcher';

-- Also update the step to be optional so pipeline doesn't fail if feed fetcher has issues
UPDATE pipeline_steps 
SET is_optional = true
WHERE worker_name = 'feed_fetcher';