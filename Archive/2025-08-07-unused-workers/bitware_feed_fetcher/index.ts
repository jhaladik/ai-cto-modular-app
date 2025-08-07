// @WORKER
// 🧱 Type: ContentExtractor  
// 📍 Path: workers/bitware_feed_fetcher/
// 🎯 Role: Download RSS feeds and extract structured article data
// 🧰 Params: { timeout_ms: 10000, retry_attempts: 3, rate_limit_delay: 1000 }
// 📦 Requires: [http_client, xml_parser, content_extractor]
// 🔄 Outputs: Structured article objects with full content and metadata
// 💾 Storage: { d1: "fetched_articles_db", kv: "feed_cache", k2: "fetch_params" }

interface Env {
  // Database and Storage
  FETCHED_ARTICLES_DB: D1Database;
  FEED_CACHE: KVNamespace;
  
  // Authentication
  WORKER_SHARED_SECRET: string;
  CLIENT_API_KEY: string;
}

interface FetchRequest {
  feed_urls?: string[];
  feed_url?: string;
  max_articles_per_feed?: number;
  include_content?: boolean;
  max_age_hours?: number;
  dedupe_method?: 'url' | 'title' | 'content_hash';
}

interface RSSArticle {
  id?: number;
  job_id?: number;
  article_url: string;
  feed_url: string;
  title: string;
  content: string;
  description?: string;
  author?: string;
  pub_date: string;
  guid: string;
  content_hash: string;
  word_count: number;
  source_feed?: string;
  fetched_at: string;
}

interface FetchJob {
  id: number;
  feed_urls: string[];
  status: string;
  articles_found: number;
  articles_stored: number;
  feeds_successful: number;
  feeds_failed: number;
  fetch_duration_ms: number;
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Worker-ID',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Public endpoints (no auth required)
      if (url.pathname === '/help') {
        return jsonResponse(getHelpInfo(), { headers: corsHeaders });
      }

      // ADD THIS HEALTH ENDPOINT
      if (url.pathname === '/health') {
        const health = await checkWorkerHealth(env);
        return jsonResponse(health, { headers: corsHeaders });
      }


      if (url.pathname === '/capabilities') {
        return jsonResponse(getCapabilities(), { headers: corsHeaders });
      }

      // Admin endpoints (worker auth required)
      if (url.pathname.startsWith('/admin/')) {
        if (!isValidWorkerAuth(request, env)) {
          return unauthorizedResponse('Worker authentication required');
        }
        return handleAdminRequest(url, request, env, corsHeaders);
      }

      // Check if endpoint exists before checking auth (fixes 404 routing)
      const validEndpoints = ['/', '/batch'];
      if (!validEndpoints.includes(url.pathname)) {
        return notFoundResponse();
      }

      // Main functionality endpoints (client auth required)
      if (!isValidClientAuth(request, env)) {
        return unauthorizedResponse('API key required');
      }

      // Single feed endpoint
      if (url.pathname === '/' && method === 'GET') {
        return handleSingleFeedRequest(url, env, corsHeaders);
      }

      // Batch processing endpoint
      if (url.pathname === '/batch' && method === 'POST') {
        return handleBatchFeedRequest(request, env, corsHeaders);
      }

      return notFoundResponse();

    } catch (error) {
      console.error('Worker error:', error);
      return errorResponse('Internal server error', 500);
    }
  }
};

// Authentication functions
function isValidClientAuth(request: Request, env: Env): boolean {
  const apiKey = request.headers.get('X-API-Key');
  return apiKey === env.CLIENT_API_KEY;
}

function isValidWorkerAuth(request: Request, env: Env): boolean {
  const authHeader = request.headers.get('Authorization');
  const workerID = request.headers.get('X-Worker-ID');
  return authHeader === `Bearer ${env.WORKER_SHARED_SECRET}` && workerID;
}

// Single feed handler
async function handleSingleFeedRequest(url: URL, env: Env, corsHeaders: any): Promise<Response> {
  const feedUrl = url.searchParams.get('feed_url');
  if (!feedUrl) {
    return errorResponse('Missing required parameter: feed_url', 400);
  }

  const maxArticles = parseInt(url.searchParams.get('max_articles') || '20');
  const includeContent = url.searchParams.get('include_content') === 'true';
  
  const cacheKey = `feed:${feedUrl}:${maxArticles}`;
  
  // Check cache first
  const cached = await env.FEED_CACHE.get(cacheKey);
  if (cached) {
    const result = JSON.parse(cached);
    result.cached = true;
    return jsonResponse(result, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    // Create job record
    const jobResult = await env.FETCHED_ARTICLES_DB.prepare(
      `INSERT INTO fetch_jobs (feed_urls, status) 
       VALUES (?, 'processing') RETURNING id`
    ).bind(JSON.stringify([feedUrl])).first();

    const jobId = jobResult.id;

    // Process the feed
    const articles = await processSingleFeed(feedUrl, maxArticles, includeContent, env);
    
    // Store articles
    const storedCount = await storeArticles(jobId, articles, env);

    // Update job status
    const duration = Date.now() - startTime;
    await env.FETCHED_ARTICLES_DB.prepare(
      `UPDATE fetch_jobs 
       SET status = 'completed', articles_found = ?, articles_stored = ?, 
           feeds_successful = 1, feeds_failed = 0, fetch_duration_ms = ?, completed_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(articles.length, storedCount, duration, jobId).run();

    const response = {
      status: 'ok',
      job_id: jobId,
      feed_url: feedUrl,
      articles_found: articles.length,
      articles_stored: storedCount,
      articles: articles.slice(0, 50), // Limit response size
      processing_time_ms: duration,
      cached: false,
      timestamp: new Date().toISOString()
    };

    // Cache for 30 minutes
    await env.FEED_CACHE.put(cacheKey, JSON.stringify(response), { expirationTtl: 1800 });

    return jsonResponse(response, { headers: corsHeaders });

  } catch (error) {
    console.error('Single feed fetch failed:', error);
    return errorResponse(`Feed fetch failed: ${error.message}`, 500);
  }
}

// Batch feed handler
async function handleBatchFeedRequest(request: Request, env: Env, corsHeaders: any): Promise<Response> {
  try {
    const body = await request.json() as FetchRequest;
    const feedUrls = body.feed_urls || [];
    
    if (!Array.isArray(feedUrls) || feedUrls.length === 0) {
      return errorResponse('Invalid or empty feed_urls array', 400);
    }

    if (feedUrls.length > 20) {
      return errorResponse('Maximum 20 feeds per batch request', 400);
    }

    const maxArticlesPerFeed = body.max_articles_per_feed || 20;
    const includeContent = body.include_content || false;
    
    const startTime = Date.now();
    
    // Create batch job
    const jobResult = await env.FETCHED_ARTICLES_DB.prepare(
      `INSERT INTO fetch_jobs (feed_urls, status) 
       VALUES (?, 'processing') RETURNING id`
    ).bind(JSON.stringify(feedUrls)).first();

    const jobId = jobResult.id;

    // Process all feeds
    const results = await processFeedsBatch(feedUrls, maxArticlesPerFeed, includeContent, env);
    
    // Aggregate all articles
    const allArticles: RSSArticle[] = [];
    let successfulFeeds = 0;
    let failedFeeds = 0;
    
    for (const result of results) {
      if (result.success) {
        allArticles.push(...result.articles);
        successfulFeeds++;
      } else {
        failedFeeds++;
      }
    }

    // Store articles
    const storedCount = await storeArticles(jobId, allArticles, env);

    // Update job status
    const duration = Date.now() - startTime;
    await env.FETCHED_ARTICLES_DB.prepare(
      `UPDATE fetch_jobs 
       SET status = 'completed', articles_found = ?, articles_stored = ?, 
           feeds_successful = ?, feeds_failed = ?, fetch_duration_ms = ?, completed_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(allArticles.length, storedCount, successfulFeeds, failedFeeds, duration, jobId).run();

    const response = {
      status: 'ok',
      job_id: jobId,
      feeds_processed: feedUrls.length,
      feeds_successful: successfulFeeds,
      feeds_failed: failedFeeds,
      total_articles: allArticles.length,
      articles_stored: storedCount,
      duplicates_skipped: allArticles.length - storedCount,
      processing_time_ms: duration,
      articles: allArticles.slice(0, 100), // Limit response size
      feed_summary: results.map(r => ({
        feed_url: r.feedUrl,
        status: r.success ? 'success' : 'failed',
        articles_found: r.success ? r.articles.length : 0,
        error: r.success ? undefined : r.error,
        latest_article: r.success && r.articles.length > 0 ? r.articles[0].pub_date : undefined,
        feed_title: r.success && r.articles.length > 0 ? r.feedTitle : undefined
      })),
      timestamp: new Date().toISOString()
    };

    return jsonResponse(response, { headers: corsHeaders });

  } catch (error) {
    console.error('Batch feed fetch failed:', error);
    return errorResponse(`Batch fetch failed: ${error.message}`, 500);
  }
}

// RSS Processing Functions
async function processSingleFeed(
  feedUrl: string,
  maxArticles: number,
  includeContent: boolean,
  env: Env
): Promise<RSSArticle[]> {
  
  // Retry logic for better reliability
  const maxRetries = 2;
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const feedResponse = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BitwareFeedBot/1.0; +https://bitware.ai/bot)',
          'Accept': 'application/rss+xml, application/atom+xml, text/xml, application/xml, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        signal: AbortSignal.timeout(20000) // 20 second timeout
      });

      if (!feedResponse.ok) {
        throw new Error(`HTTP ${feedResponse.status}: ${feedResponse.statusText}`);
      }

      const feedContent = await feedResponse.text();
      return parseRSSContent(feedContent, feedUrl, maxArticles);
      
    } catch (error) {
      lastError = error;
      console.warn(`Feed fetch attempt ${attempt + 1} failed for ${feedUrl}:`, error.message);
      
      // Don't retry on certain errors
      if (error.message.includes('404') || error.message.includes('403')) {
        throw error;
      }
      
      // Wait before retry
      if (attempt < maxRetries) {
        await sleep(1000 * (attempt + 1)); // 1s, 2s delay
      }
    }
  }
  
  throw lastError || new Error('Feed fetch failed after retries');
}

async function processFeedsBatch(
  feedUrls: string[],
  maxArticlesPerFeed: number,
  includeContent: boolean,
  env: Env
): Promise<Array<{feedUrl: string, success: boolean, articles: RSSArticle[], error?: string, feedTitle?: string}>> {
  
  const results = [];
  
  // Process feeds with some concurrency but not too aggressive
  const chunks = chunkArray(feedUrls, 3); // Process 3 at a time
  
  for (const chunk of chunks) {
    const chunkPromises = chunk.map(async (feedUrl) => {
      try {
        const articles = await processSingleFeed(feedUrl, maxArticlesPerFeed, includeContent, env);
        return {
          feedUrl,
          success: true,
          articles,
          feedTitle: articles.length > 0 ? articles[0].source_feed : undefined
        };
      } catch (error) {
        return {
          feedUrl,
          success: false,
          articles: [],
          error: error.message
        };
      }
    });
    
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
    
    // Brief pause between chunks to be respectful
    if (results.length < feedUrls.length) {
      await sleep(500);
    }
  }
  
  return results;
}

// RSS Parsing
function parseRSSContent(xmlContent: string, feedUrl: string, maxArticles: number): RSSArticle[] {
  try {
    const articles: RSSArticle[] = [];
    
    // Determine feed type and extract basic info
    const isAtom = xmlContent.includes('<feed') && xmlContent.includes('xmlns="http://www.w3.org/2005/Atom"');
    const feedTitle = extractFeedTitle(xmlContent, isAtom);
    
    if (isAtom) {
      articles.push(...parseAtomFeed(xmlContent, feedUrl, feedTitle, maxArticles));
    } else {
      articles.push(...parseRSSFeed(xmlContent, feedUrl, feedTitle, maxArticles));
    }
    
    return articles.slice(0, maxArticles);
    
  } catch (error) {
    console.error('RSS parsing failed:', error);
    throw new Error(`Feed parsing failed: ${error.message}`);
  }
}

function parseRSSFeed(xmlContent: string, feedUrl: string, feedTitle: string, maxArticles: number): RSSArticle[] {
  const articles: RSSArticle[] = [];
  
  // Extract items using regex (simple but effective for most RSS feeds)
  const itemMatches = xmlContent.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];
  
  for (let i = 0; i < Math.min(itemMatches.length, maxArticles); i++) {
    const item = itemMatches[i];
    
    try {
      const title = extractXMLTag(item, 'title');
      const link = extractXMLTag(item, 'link');
      const description = extractXMLTag(item, 'description');
      const author = extractXMLTag(item, 'author') || extractXMLTag(item, 'dc:creator');
      const pubDate = extractXMLTag(item, 'pubDate');
      const guid = extractXMLTag(item, 'guid') || link;
      
      if (title && link) {
        const content = cleanTextContent(description || title);
        
        articles.push({
          article_url: cleanUrl(link),
          feed_url: feedUrl,
          title: cleanTextContent(title),
          content,
          description: description ? cleanTextContent(description) : null, // Ensure null instead of undefined
          author: author ? cleanTextContent(author) : null,               // Ensure null instead of undefined
          pub_date: standardizePubDate(pubDate),
          guid: guid || link,
          content_hash: generateContentHash(title + (description || '')),
          word_count: countWords(content),
          source_feed: feedTitle || null,                                  // Ensure null instead of undefined
          fetched_at: new Date().toISOString()
        });
      }
    } catch (itemError) {
      console.warn('Failed to parse RSS item:', itemError);
      continue;
    }
  }
  
  return articles;
}

function parseAtomFeed(xmlContent: string, feedUrl: string, feedTitle: string, maxArticles: number): RSSArticle[] {
  const articles: RSSArticle[] = [];
  
  // Extract entries using regex
  const entryMatches = xmlContent.match(/<entry[^>]*>[\s\S]*?<\/entry>/gi) || [];
  
  for (let i = 0; i < Math.min(entryMatches.length, maxArticles); i++) {
    const entry = entryMatches[i];
    
    try {
      const title = extractXMLTag(entry, 'title');
      const linkMatch = entry.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/);
      const link = linkMatch ? linkMatch[1] : '';
      const summary = extractXMLTag(entry, 'summary') || extractXMLTag(entry, 'content');
      const author = extractXMLTag(entry, 'author');
      const published = extractXMLTag(entry, 'published') || extractXMLTag(entry, 'updated');
      const id = extractXMLTag(entry, 'id') || link;
      
      if (title && link) {
        const content = cleanTextContent(summary || title);
        
        articles.push({
          article_url: cleanUrl(link),
          feed_url: feedUrl,
          title: cleanTextContent(title),
          content,
          description: summary ? cleanTextContent(summary) : null,        // Ensure null instead of undefined
          author: author ? cleanTextContent(author) : null,               // Ensure null instead of undefined
          pub_date: standardizePubDate(published),
          guid: id || link,
          content_hash: generateContentHash(title + (summary || '')),
          word_count: countWords(content),
          source_feed: feedTitle || null,                                 // Ensure null instead of undefined
          fetched_at: new Date().toISOString()
        });
      }
    } catch (itemError) {
      console.warn('Failed to parse Atom entry:', itemError);
      continue;
    }
  }
  
  return articles;
}

// Utility functions
function extractFeedTitle(xmlContent: string, isAtom: boolean): string {
  const titleTag = isAtom ? 'title' : 'title';
  const match = xmlContent.match(new RegExp(`<${titleTag}[^>]*>([^<]+)<\/${titleTag}>`, 'i'));
  return match ? cleanTextContent(match[1]) : 'Unknown Feed';
}

function extractXMLTag(content: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

function cleanTextContent(text: string): string {
  return text
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') // Remove CDATA
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') // Decode entities
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'") // More entities
    .trim();
}

function cleanUrl(url: string): string {
  try {
    return new URL(url.trim()).toString();
  } catch {
    return url.trim();
  }
}

function standardizePubDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  
  try {
    const date = new Date(dateStr);
    return date.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function generateContentHash(content: string): string {
  // Simple hash function (could use crypto.subtle for better hashing in production)
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Database operations
async function storeArticles(jobId: number, articles: RSSArticle[], env: Env): Promise<number> {
  let storedCount = 0;
  
  for (const article of articles) {
    try {
      await env.FETCHED_ARTICLES_DB.prepare(
        `INSERT OR IGNORE INTO rss_articles 
         (job_id, article_url, feed_url, title, content, description, author, pub_date, guid, content_hash, word_count, source_feed, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        jobId,
        article.article_url,
        article.feed_url,
        article.title,
        article.content || null,           // Fix: handle undefined -> null
        article.description || null,       // Fix: handle undefined -> null  
        article.author || null,            // Fix: handle undefined -> null
        article.pub_date,
        article.guid,
        article.content_hash,
        article.word_count || 0,           // Fix: default to 0
        article.source_feed || null,       // Fix: handle undefined -> null
        article.fetched_at
      ).run();
      
      storedCount++;
    } catch (dbError) {
      if (!dbError.message.includes('UNIQUE constraint failed')) {
        console.error(`Failed to store article ${article.article_url}:`, dbError);
      }
      // Skip duplicates silently
    }
  }
  
  return storedCount;
}

// Admin handlers
async function handleAdminRequest(url: URL, request: Request, env: Env, corsHeaders: any): Promise<Response> {
  if (url.pathname === '/admin/stats') {
    const stats = await getFetchStats(env);
    return jsonResponse(stats, { headers: corsHeaders });
  }

  if (url.pathname === '/admin/jobs') {
    const jobs = await getRecentJobs(env);
    return jsonResponse({ jobs }, { headers: corsHeaders });
  }

  if (url.pathname === '/admin/articles' && request.method === 'GET') {
    const jobId = url.searchParams.get('job_id');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const articles = await getJobArticles(jobId, limit, env);
    return jsonResponse({ articles }, { headers: corsHeaders });
  }

  return notFoundResponse();
}

async function getFetchStats(env: Env) {
  try {
    const stats = await env.FETCHED_ARTICLES_DB.prepare(`
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as active_jobs,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
        AVG(articles_found) as avg_articles_found,
        AVG(articles_stored) as avg_articles_stored,
        AVG(fetch_duration_ms) as avg_duration_ms
      FROM fetch_jobs
      WHERE started_at > datetime('now', '-7 days')
    `).first();

    const articleStats = await env.FETCHED_ARTICLES_DB.prepare(`
      SELECT 
        COUNT(*) as total_articles,
        COUNT(DISTINCT feed_url) as unique_feeds,
        COUNT(DISTINCT source_feed) as unique_sources,
        AVG(word_count) as avg_word_count
      FROM rss_articles
      WHERE fetched_at > datetime('now', '-7 days')
    `).first();

    return {
      ...stats,
      ...articleStats
    };
  } catch (error) {
    console.error('Stats query failed:', error);
    return {
      total_jobs: 0,
      completed_jobs: 0,
      active_jobs: 0,
      failed_jobs: 0,
      avg_articles_found: 0,
      avg_articles_stored: 0,
      avg_duration_ms: 0,
      total_articles: 0,
      unique_feeds: 0,
      unique_sources: 0,
      avg_word_count: 0
    };
  }
}

async function getRecentJobs(env: Env) {
  try {
    const jobs = await env.FETCHED_ARTICLES_DB.prepare(`
      SELECT id, feed_urls, status, articles_found, articles_stored, 
             feeds_successful, feeds_failed, fetch_duration_ms, started_at, completed_at
      FROM fetch_jobs 
      ORDER BY started_at DESC 
      LIMIT 20
    `).all();

    return jobs.results.map(job => ({
      ...job,
      feed_urls: JSON.parse(job.feed_urls)
    }));
  } catch (error) {
    console.error('Recent jobs query failed:', error);
    return [];
  }
}

async function getJobArticles(jobId: string, limit: number, env: Env) {
  if (!jobId) return [];
  
  try {
    const articles = await env.FETCHED_ARTICLES_DB.prepare(`
      SELECT id, article_url, feed_url, title, description, author, pub_date, 
             source_feed, word_count, fetched_at
      FROM rss_articles 
      WHERE job_id = ?
      ORDER BY pub_date DESC
      LIMIT ?
    `).bind(jobId, limit).all();

    return articles.results;
  } catch (error) {
    console.error('Job articles query failed:', error);
    return [];
  }
}

// Response helpers
function getHelpInfo() {
  return {
    worker: 'bitware_feed_fetcher',
    version: '1.0.0',
    description: 'Download RSS feeds and extract structured article data',
    endpoints: {
      public: {
        'GET /help': 'This help information',
        'GET /capabilities': 'Worker capabilities and specifications'
      },
      main: {
        'GET /?feed_url=<url>&max_articles=<num>': 'Fetch single RSS feed',
        'POST /batch': 'Process multiple RSS feeds in batch'
      },
      admin: {
        'GET /admin/stats': 'Fetch statistics and metrics',
        'GET /admin/jobs': 'Recent fetch jobs',
        'GET /admin/articles?job_id=<id>&limit=<num>': 'Articles from specific job'
      }
    },
    parameters: {
      feed_url: 'Required for single feed. RSS/Atom feed URL to process',
      max_articles: 'Optional. Maximum articles per feed (default: 20)',
      feed_urls: 'Required for batch. Array of RSS feed URLs',
      max_articles_per_feed: 'Optional for batch. Articles per feed (default: 20)',
      include_content: 'Optional. Extract full content vs RSS only (default: false)'
    },
    authentication: {
      client: 'X-API-Key header required for main endpoints',
      worker: 'Authorization: Bearer + X-Worker-ID headers for admin endpoints'
    },
    processing: 'RSS 2.0, RSS 1.0, and Atom feed formats supported'
  };
}

async function checkWorkerHealth(env: Env) {
  try {
    // Test database connection
    const testQuery = await env.FETCHED_ARTICLES_DB.prepare(`
      SELECT COUNT(*) as count FROM fetch_jobs WHERE status = 'completed'
    `).first();
    
    return {
      status: 'healthy',
      database: 'connected',
      total_jobs: testQuery.count || 0,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

function getCapabilities() {
  return {
    worker_type: 'ContentExtractor',
    role: 'Download RSS feeds and extract structured article data',
    input_format: {
      single: 'GET ?feed_url=<url>&max_articles=<num>',
      batch: 'POST /batch {feed_urls: string[], max_articles_per_feed?: number}'
    },
    output_format: {
      status: 'string',
      job_id: 'number',
      articles_found: 'number',
      articles_stored: 'number',
      articles: 'RSSArticle[]',
      processing_time_ms: 'number'
    },
    supported_formats: ['RSS 2.0', 'RSS 1.0', 'Atom 1.0'],
    storage: {
      d1: 'fetched_articles_db',
      kv: 'feed_cache'
    },
    performance: {
      single_feed: '2-5 seconds',
      batch_processing: '10-30 seconds for 5-10 feeds',
      cache_duration: '30 minutes',
      max_batch_size: '20 feeds'
    },
    deduplication: 'By article URL with content hash fallback'
  };
}

function jsonResponse(data: any, options: { headers?: any } = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    headers: { 
      'Content-Type': 'application/json',
      ...options.headers 
    }
  });
}

function errorResponse(message: string, status: number = 500) {
  return new Response(JSON.stringify({ 
    status: 'error', 
    error: message,
    timestamp: new Date().toISOString()
  }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function unauthorizedResponse(message: string) {
  return errorResponse(message, 401);
}

function notFoundResponse() {
  return errorResponse('Endpoint not found', 404);
}