-- Bitware Feed Fetcher Database Schema
-- This schema stores RSS fetch jobs and extracted article data

-- Fetch jobs track each RSS processing request (single feed or batch)
CREATE TABLE IF NOT EXISTS fetch_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feed_urls TEXT NOT NULL, -- JSON array of feed URLs processed
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  articles_found INTEGER DEFAULT 0,
  articles_stored INTEGER DEFAULT 0,
  feeds_successful INTEGER DEFAULT 0,
  feeds_failed INTEGER DEFAULT 0,
  fetch_duration_ms INTEGER,
  error_message TEXT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

-- RSS articles stores all extracted article data from feeds
CREATE TABLE IF NOT EXISTS rss_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  article_url TEXT NOT NULL, -- Primary deduplication key
  feed_url TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT, -- RSS description or full content
  description TEXT, -- Original RSS description field
  author TEXT,
  pub_date DATETIME,
  guid TEXT, -- RSS GUID for tracking
  content_hash TEXT, -- For content-based deduplication
  word_count INTEGER DEFAULT 0,
  source_feed TEXT, -- Feed title/name
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key relationship
  FOREIGN KEY (job_id) REFERENCES fetch_jobs(id) ON DELETE CASCADE,
  
  -- Prevent duplicate articles by URL
  UNIQUE(article_url)
);

-- Create indexes for performance (as separate statements)
CREATE INDEX IF NOT EXISTS idx_jobs_status ON fetch_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_started ON fetch_jobs(started_at);
CREATE INDEX IF NOT EXISTS idx_jobs_completed ON fetch_jobs(completed_at);

CREATE INDEX IF NOT EXISTS idx_articles_job ON rss_articles(job_id);
CREATE INDEX IF NOT EXISTS idx_articles_feed ON rss_articles(feed_url);
CREATE INDEX IF NOT EXISTS idx_articles_pubdate ON rss_articles(pub_date);
CREATE INDEX IF NOT EXISTS idx_articles_fetched ON rss_articles(fetched_at);
CREATE INDEX IF NOT EXISTS idx_articles_source ON rss_articles(source_feed);
CREATE INDEX IF NOT EXISTS idx_articles_hash ON rss_articles(content_hash);
CREATE INDEX IF NOT EXISTS idx_articles_words ON rss_articles(word_count);

-- View for quick job summaries with article counts
CREATE VIEW IF NOT EXISTS job_summary AS
SELECT 
  fj.id,
  fj.feed_urls,
  fj.status,
  fj.articles_found,
  fj.articles_stored,
  fj.feeds_successful,
  fj.feeds_failed,
  fj.fetch_duration_ms,
  fj.started_at,
  fj.completed_at,
  COUNT(ra.id) as actual_articles_count,
  AVG(ra.word_count) as avg_word_count,
  MAX(ra.pub_date) as latest_article_date,
  MIN(ra.pub_date) as earliest_article_date
FROM fetch_jobs fj
LEFT JOIN rss_articles ra ON fj.id = ra.job_id
GROUP BY fj.id, fj.feed_urls, fj.status, fj.articles_found, fj.articles_stored, 
         fj.feeds_successful, fj.feeds_failed, fj.fetch_duration_ms, fj.started_at, fj.completed_at;

-- View for recent quality articles (good content with metadata)
CREATE VIEW IF NOT EXISTS quality_articles AS
SELECT 
  ra.id,
  ra.job_id,
  ra.article_url,
  ra.feed_url,
  ra.title,
  ra.description,
  ra.author,
  ra.pub_date,
  ra.source_feed,
  ra.word_count,
  ra.fetched_at,
  fj.started_at as job_started
FROM rss_articles ra
JOIN fetch_jobs fj ON ra.job_id = fj.id
WHERE ra.word_count >= 50 -- Articles with substantial content
  AND ra.title IS NOT NULL
  AND ra.title != ''
  AND ra.pub_date >= datetime('now', '-30 days') -- Recent articles only
ORDER BY ra.pub_date DESC;

-- View for feed performance tracking
CREATE VIEW IF NOT EXISTS feed_performance AS
SELECT 
  ra.feed_url,
  ra.source_feed,
  COUNT(*) as total_articles,
  COUNT(DISTINCT ra.job_id) as fetch_sessions,
  AVG(ra.word_count) as avg_word_count,
  MAX(ra.pub_date) as latest_article,
  MIN(ra.fetched_at) as first_fetched,
  MAX(ra.fetched_at) as last_fetched,
  COUNT(CASE WHEN ra.word_count >= 100 THEN 1 END) as quality_articles
FROM rss_articles ra
WHERE ra.fetched_at >= datetime('now', '-7 days') -- Last week's data
GROUP BY ra.feed_url, ra.source_feed
HAVING total_articles >= 5 -- Only feeds with reasonable article counts
ORDER BY total_articles DESC;