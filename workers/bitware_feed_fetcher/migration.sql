-- Database Fixes & Optimization for bitware_feed_fetcher
-- Run this after schema.sql to fix any existing data issues and optimize performance

-- Fix any existing NULL handling issues in articles table
-- Convert any problematic empty strings to proper NULLs
UPDATE rss_articles 
SET description = NULL 
WHERE description = '' OR description = 'undefined';

UPDATE rss_articles 
SET author = NULL 
WHERE author = '' OR author = 'undefined';

UPDATE rss_articles 
SET source_feed = NULL 
WHERE source_feed = '' OR source_feed = 'undefined';

-- Ensure word_count has sensible defaults
UPDATE rss_articles 
SET word_count = 0 
WHERE word_count IS NULL;

-- Add any missing indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_articles_title ON rss_articles(title);
CREATE INDEX IF NOT EXISTS idx_articles_author ON rss_articles(author);

-- Create optimized composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_articles_feed_date ON rss_articles(feed_url, pub_date DESC);
CREATE INDEX IF NOT EXISTS idx_articles_job_date ON rss_articles(job_id, pub_date DESC);

-- Add database maintenance views for monitoring
CREATE VIEW IF NOT EXISTS feed_health AS
SELECT 
  feed_url,
  COUNT(*) as total_articles,
  COUNT(DISTINCT source_feed) as feed_names,
  COUNT(CASE WHEN author IS NOT NULL THEN 1 END) as articles_with_authors,
  COUNT(CASE WHEN description IS NOT NULL THEN 1 END) as articles_with_descriptions,
  AVG(word_count) as avg_word_count,
  MAX(pub_date) as latest_article,
  MAX(fetched_at) as last_fetched,
  COUNT(CASE WHEN word_count >= 100 THEN 1 END) as substantial_articles,
  ROUND(100.0 * COUNT(CASE WHEN word_count >= 100 THEN 1 END) / COUNT(*), 1) as quality_percentage
FROM rss_articles 
GROUP BY feed_url
ORDER BY total_articles DESC;

-- View for recent processing performance
CREATE VIEW IF NOT EXISTS processing_performance AS
SELECT 
  DATE(fj.started_at) as process_date,
  COUNT(*) as jobs_processed,
  SUM(fj.feeds_successful) as total_feeds_processed,
  SUM(fj.feeds_failed) as total_feeds_failed,
  SUM(fj.articles_stored) as total_articles_stored,
  AVG(fj.fetch_duration_ms) as avg_processing_time_ms,
  MIN(fj.fetch_duration_ms) as fastest_job_ms,
  MAX(fj.fetch_duration_ms) as slowest_job_ms,
  ROUND(100.0 * SUM(fj.feeds_successful) / (SUM(fj.feeds_successful) + SUM(fj.feeds_failed)), 1) as success_rate_percent
FROM fetch_jobs fj
WHERE fj.status = 'completed'
  AND fj.started_at >= DATE('now', '-7 days')
GROUP BY DATE(fj.started_at)
ORDER BY process_date DESC;

-- View for article quality analysis
CREATE VIEW IF NOT EXISTS content_quality_analysis AS
SELECT 
  CASE 
    WHEN word_count < 50 THEN 'Short (0-49 words)'
    WHEN word_count < 150 THEN 'Medium (50-149 words)'
    WHEN word_count < 300 THEN 'Long (150-299 words)'
    ELSE 'Very Long (300+ words)'
  END as content_length_category,
  COUNT(*) as article_count,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM rss_articles), 1) as percentage,
  AVG(word_count) as avg_words_in_category,
  COUNT(CASE WHEN author IS NOT NULL THEN 1 END) as with_author,
  COUNT(CASE WHEN description IS NOT NULL AND description != title THEN 1 END) as with_description
FROM rss_articles
GROUP BY content_length_category
ORDER BY 
  CASE content_length_category
    WHEN 'Short (0-49 words)' THEN 1
    WHEN 'Medium (50-149 words)' THEN 2  
    WHEN 'Long (150-299 words)' THEN 3
    ELSE 4
  END;

-- Clean up old failed jobs (optional maintenance)
-- DELETE FROM fetch_jobs 
-- WHERE status = 'failed' 
--   AND started_at < datetime('now', '-7 days');

-- Analyze table statistics for query optimization
ANALYZE rss_articles;
ANALYZE fetch_jobs;

-- Verify database integrity
PRAGMA integrity_check;

-- Show current database statistics
SELECT 
  'Database Status' as metric,
  (SELECT COUNT(*) FROM rss_articles) as total_articles,
  (SELECT COUNT(*) FROM fetch_jobs) as total_jobs,
  (SELECT COUNT(*) FROM fetch_jobs WHERE status = 'completed') as completed_jobs,
  (SELECT COUNT(DISTINCT feed_url) FROM rss_articles) as unique_feeds,
  (SELECT COUNT(*) FROM rss_articles WHERE fetched_at >= datetime('now', '-24 hours')) as articles_last_24h;