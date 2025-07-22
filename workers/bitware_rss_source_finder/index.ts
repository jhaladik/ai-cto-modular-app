// workers/bitware_rss_source_finder/index.ts
// Bitware Oboe AI Factory - Production Ready v2.0
// First worker in RSS Intelligence Pipeline

// @WORKER
// 🧱 Type: SourceDiscoveryWorker  
// 📍 Path: workers/bitware_rss_source_finder/index.ts
// 🎯 Role: Database-driven RSS feed discovery for any topic
// 🧰 Params: { maxFeeds: 20, language: "en", cacheHours: 24, minQualityScore: 0.5 }
// 📦 Requires: D1 database, KV storage
// 🔄 Outputs: { feeds: [{ url, title, description, qualityScore, topic }] }
// 💾 Storage: { d1: "RSS_SOURCES_DB", kv: "RSS_SOURCE_CACHE" }
// 🧠 AI-NOTE: Uses SQL queries for reliable topic matching. Add sources via /admin endpoint.
// 🏭 AI-FACTORY: Foundation worker - provides curated RSS URLs for content pipeline
// 📅 STATUS: Production Ready - Tested with 31 sources across 9 topics

interface RSSSource {
  id: number;
  url: string;
  title: string;
  description: string;
  topic: string;
  subtopic?: string;
  quality_score: number;
  language: string;
  last_checked: string;
  active: boolean;
}

interface WorkerConfig {
  maxFeeds: number;
  language: string;
  cacheHours: number;
  minQualityScore: number;
}

interface WorkerInput {
  topic: string;
  config?: Partial<WorkerConfig>;
}

interface WorkerOutput {
  status: 'ok' | 'error';
  topic: string;
  feeds: RSSSource[];
  cached: boolean;
  timestamp: string;
  error?: string;
  stats?: {
    total_sources: number;
    filtered_by_quality: number;
    cache_hit: boolean;
  };
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    
    // Public endpoints (no auth required)
    if (url.pathname === '/help') {
      return await handleHelp(env);
    }
    
    if (url.pathname === '/topics') {
      return await handleTopics(env);
    }

    // Admin endpoints (worker auth required)
    if (url.pathname === '/admin/add-source' && request.method === 'POST') {
      if (!validateWorkerAuth(request, env)) {
        return unauthorizedResponse('Worker authentication required for admin functions');
      }
      return await handleAddSource(request, env);
    }

    if (url.pathname === '/admin/stats') {
      if (!validateWorkerAuth(request, env)) {
        return unauthorizedResponse('Worker authentication required for admin functions');
      }
      return await handleStats(env);
    }

    // Main functionality (client or worker auth required)
    if (!validateClientAuth(request, env) && !validateWorkerAuth(request, env)) {
      return unauthorizedResponse('Authentication required: provide X-API-Key or valid worker credentials');
    }

    // Main RSS discovery endpoint
    const topic = url.searchParams.get('topic');
    if (!topic) {
      return errorResponse('Missing topic parameter');
    }

    const config: WorkerConfig = {
      maxFeeds: parseInt(url.searchParams.get('maxFeeds') || '20'),
      language: url.searchParams.get('language') || 'en',
      cacheHours: parseInt(url.searchParams.get('cacheHours') || '24'),
      minQualityScore: parseFloat(url.searchParams.get('minQualityScore') || '0.5')
    };

    try {
      const result = await findRSSFeeds({ topic, config }, env);
      return jsonResponse(result);
    } catch (error) {
      return errorResponse(error.message);
    }
  }
};

// === Core RSS Discovery Logic ===

async function findRSSFeeds(input: WorkerInput, env: any): Promise<WorkerOutput> {
  const { topic, config = {} } = input;
  const finalConfig: WorkerConfig = {
    maxFeeds: 20,
    language: 'en',
    cacheHours: 24,
    minQualityScore: 0.5,
    ...config
  };

  // Check cache first
  const cacheKey = `rss_sources:${topic.toLowerCase()}:${finalConfig.language}:${finalConfig.minQualityScore}`;
  const cached = await env.RSS_SOURCE_CACHE?.get(cacheKey);
  
  if (cached) {
    const cachedData = JSON.parse(cached);
    return {
      status: 'ok',
      topic,
      feeds: cachedData.feeds,
      cached: true,
      timestamp: new Date().toISOString(),
      stats: { ...cachedData.stats, cache_hit: true }
    };
  }

  // Query database for sources
  const feeds = await querySourcesFromDB(topic, finalConfig, env);
  
  // Get stats
  const stats = await getQueryStats(topic, finalConfig, env);

  // Cache results
  const result = {
    feeds,
    stats: { ...stats, cache_hit: false }
  };

  if (env.RSS_SOURCE_CACHE) {
    await env.RSS_SOURCE_CACHE.put(
      cacheKey, 
      JSON.stringify(result),
      { expirationTtl: finalConfig.cacheHours * 3600 }
    );
  }

  return {
    status: 'ok',
    topic,
    feeds,
    cached: false,
    timestamp: new Date().toISOString(),
    stats: result.stats
  };
}

async function querySourcesFromDB(topic: string, config: WorkerConfig, env: any): Promise<RSSSource[]> {
  if (!env.RSS_SOURCES_DB) {
    throw new Error('Database not configured');
  }

  const topicPattern = `%${topic.toLowerCase()}%`;
  
  // Main query: find sources by topic, subtopic, or title/description keywords
  const query = `
    SELECT id, url, title, description, topic, subtopic, quality_score, language, last_checked, active
    FROM rss_sources 
    WHERE active = 1
    AND language = ?
    AND quality_score >= ?
    AND (
      LOWER(topic) LIKE ? 
      OR LOWER(subtopic) LIKE ?
      OR LOWER(title) LIKE ?
      OR LOWER(description) LIKE ?
    )
    ORDER BY quality_score DESC, topic = ? DESC
    LIMIT ?
  `;

  try {
    const result = await env.RSS_SOURCES_DB
      .prepare(query)
      .bind(
        config.language,
        config.minQualityScore,
        topicPattern,
        topicPattern,
        topicPattern,
        topicPattern,
        topic.toLowerCase(),
        config.maxFeeds
      )
      .all();

    return result.results || [];
  } catch (error) {
    console.error('Database query failed:', error);
    throw new Error('Failed to query RSS sources database');
  }
}

async function getQueryStats(topic: string, config: WorkerConfig, env: any) {
  if (!env.RSS_SOURCES_DB) {
    return { total_sources: 0, filtered_by_quality: 0 };
  }

  const topicPattern = `%${topic.toLowerCase()}%`;

  try {
    // Total matching sources
    const totalResult = await env.RSS_SOURCES_DB
      .prepare(`
        SELECT COUNT(*) as count
        FROM rss_sources 
        WHERE active = 1
        AND language = ?
        AND (
          LOWER(topic) LIKE ? 
          OR LOWER(subtopic) LIKE ?
          OR LOWER(title) LIKE ?
          OR LOWER(description) LIKE ?
        )
      `)
      .bind(config.language, topicPattern, topicPattern, topicPattern, topicPattern)
      .first();

    // Sources above quality threshold
    const qualityResult = await env.RSS_SOURCES_DB
      .prepare(`
        SELECT COUNT(*) as count
        FROM rss_sources 
        WHERE active = 1
        AND language = ?
        AND quality_score >= ?
        AND (
          LOWER(topic) LIKE ? 
          OR LOWER(subtopic) LIKE ?
          OR LOWER(title) LIKE ?
          OR LOWER(description) LIKE ?
        )
      `)
      .bind(config.language, config.minQualityScore, topicPattern, topicPattern, topicPattern, topicPattern)
      .first();

    return {
      total_sources: totalResult?.count || 0,
      filtered_by_quality: qualityResult?.count || 0
    };
  } catch (error) {
    console.error('Stats query failed:', error);
    return { total_sources: 0, filtered_by_quality: 0 };
  }
}

// === Admin Endpoints ===

async function handleAddSource(request: Request, env: any) {
  try {
    const sourceData = await request.json();
    
    // Validate required fields
    const required = ['url', 'title', 'description', 'topic'];
    for (const field of required) {
      if (!sourceData[field]) {
        return errorResponse(`Missing required field: ${field}`);
      }
    }

    // Insert into database
    const result = await env.RSS_SOURCES_DB
      .prepare(`
        INSERT INTO rss_sources (url, title, description, topic, subtopic, quality_score, language, last_checked, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        sourceData.url,
        sourceData.title,
        sourceData.description,
        sourceData.topic.toLowerCase(),
        sourceData.subtopic?.toLowerCase() || null,
        sourceData.quality_score || 0.7,
        sourceData.language || 'en',
        new Date().toISOString(),
        sourceData.active !== false
      )
      .run();

    return jsonResponse({
      status: 'ok',
      message: 'Source added successfully',
      id: result.meta.last_row_id
    });

  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return errorResponse('URL already exists', 409);
    }
    return errorResponse(`Failed to add source: ${error.message}`);
  }
}

async function handleStats(env: any) {
  if (!env.RSS_SOURCES_DB) {
    return errorResponse('Database not configured');
  }

  try {
    // Get topic distribution
    const topicsResult = await env.RSS_SOURCES_DB
      .prepare('SELECT topic, COUNT(*) as count FROM rss_sources WHERE active = 1 GROUP BY topic ORDER BY count DESC')
      .all();

    // Get quality distribution
    const qualityResult = await env.RSS_SOURCES_DB
      .prepare(`
        SELECT 
          CASE 
            WHEN quality_score >= 0.9 THEN 'high'
            WHEN quality_score >= 0.7 THEN 'medium'
            ELSE 'low'
          END as quality_tier,
          COUNT(*) as count
        FROM rss_sources WHERE active = 1
        GROUP BY quality_tier
      `)
      .all();

    // Get total count
    const totalResult = await env.RSS_SOURCES_DB
      .prepare('SELECT COUNT(*) as total FROM rss_sources WHERE active = 1')
      .first();

    return jsonResponse({
      status: 'ok',
      stats: {
        total_sources: totalResult?.total || 0,
        by_topic: topicsResult.results || [],
        by_quality: qualityResult.results || [],
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return errorResponse(`Failed to get stats: ${error.message}`);
  }
}

// === Public Endpoints ===

async function handleHelp(env: any) {
  return jsonResponse({
    status: 'ok',
    service: 'Bitware RSS Source Finder',
    version: '2.0.0',
    description: 'Database-driven RSS feed discovery with quality scoring',
    endpoints: {
      main: {
        path: '/?topic={topic}&maxFeeds={n}&language={lang}&minQualityScore={score}',
        auth: 'X-API-Key header required',
        description: 'Find RSS feeds for given topic'
      },
      help: {
        path: '/help',
        auth: 'none',
        description: 'This help information'
      },
      topics: {
        path: '/topics',
        auth: 'none', 
        description: 'List available topics in database'
      },
      admin: {
        path: '/admin/*',
        auth: 'Worker authentication required',
        description: 'Admin functions for managing sources'
      }
    },
    examples: [
      '/?topic=ai&maxFeeds=5',
      '/?topic=climate&minQualityScore=0.8',
      '/?topic=crypto&maxFeeds=10&language=en'
    ]
  });
}

async function handleTopics(env: any) {
  if (!env.RSS_SOURCES_DB) {
    return jsonResponse({
      status: 'error',
      error: 'Database not configured',
      fallback_topics: ['ai', 'climate', 'crypto', 'science', 'space', 'health', 'gaming', 'business']
    });
  }

  try {
    const result = await env.RSS_SOURCES_DB
      .prepare(`
        SELECT topic, COUNT(*) as source_count, AVG(quality_score) as avg_quality
        FROM rss_sources 
        WHERE active = 1 
        GROUP BY topic 
        ORDER BY source_count DESC
      `)
      .all();

    return jsonResponse({
      status: 'ok',
      topics: result.results || [],
      total_topics: (result.results || []).length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return errorResponse(`Failed to get topics: ${error.message}`);
  }
}

// === Utility Functions ===

function validateClientAuth(request: Request, env: any): boolean {
  const clientKey = request.headers.get('X-API-Key');
  return clientKey === env.CLIENT_API_KEY;
}

function validateWorkerAuth(request: Request, env: any): boolean {
  const authHeader = request.headers.get('Authorization');
  const workerID = request.headers.get('X-Worker-ID');
  return authHeader === `Bearer ${env.WORKER_SHARED_SECRET}` && workerID;
}

function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

function errorResponse(message: string, status: number = 400): Response {
  return jsonResponse({ status: 'error', error: message }, status);
}

function unauthorizedResponse(message: string): Response {
  return jsonResponse({ status: 'error', error: message }, 401);
}