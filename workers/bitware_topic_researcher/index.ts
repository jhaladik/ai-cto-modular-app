// @WORKER
// 🧱 Type: ContentDiscoverer
// 📍 Path: workers/bitware_topic_researcher/
// 🎯 Role: Discover and validate new RSS sources for topics using AI and web search
// 🧰 Params: { search_engines: ["bing", "google"], llm_model: "gpt-4o-mini" }
// 📦 Requires: [web_search, llm_api, url_validator]
// 🔄 Outputs: New RSS feed URLs with quality scores and metadata
// 💾 Storage: { d1: "topic_research_db", kv: "research_cache", k2: "search_params" }

interface Env {
  // Database and Storage
  TOPIC_RESEARCH_DB: D1Database;
  RESEARCH_CACHE: KVNamespace;
  
  // Authentication
  WORKER_SHARED_SECRET: string;
  CLIENT_API_KEY: string;
  
  // External APIs
  OPENAI_API_KEY: string;
}

interface ResearchRequest {
  topic: string;
  depth?: number;
  exclude_domains?: string[];
  min_quality?: number;
  max_sources?: number;
}

interface DiscoveredSource {
  url: string;
  domain: string;
  title: string;
  description: string;
  quality_score: number;
  validation_status: string;
  discovery_method: string;
  reasoning: string;
}

interface ResearchSession {
  id: number;
  topic: string;
  search_depth: number;
  sources_found: number;
  quality_sources: number;
  research_date: string;
  status: string;
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

      if (url.pathname === '/capabilities') {
        return jsonResponse(getCapabilities(), { headers: corsHeaders });
      }

      // Debug endpoint - remove after testing
      if (url.pathname === '/debug') {
        return jsonResponse({
          client_api_key_available: !!env.CLIENT_API_KEY,
          client_api_key_value: env.CLIENT_API_KEY ? 'SET' : 'NOT_SET',
          worker_secret_available: !!env.WORKER_SHARED_SECRET,
          openai_key_available: !!env.OPENAI_API_KEY,
          openai_key_prefix: env.OPENAI_API_KEY ? env.OPENAI_API_KEY.substring(0, 10) + '...' : 'NOT_SET',
          headers_received: Object.fromEntries(request.headers.entries())
        }, { headers: corsHeaders });
      }

      // Admin endpoints (worker auth required)
      if (url.pathname.startsWith('/admin/')) {
        if (!isValidWorkerAuth(request, env)) {
          return unauthorizedResponse('Worker authentication required');
        }
        return handleAdminRequest(url, request, env, corsHeaders);
      }

      // Main functionality endpoints (client auth required)
      if (!isValidClientAuth(request, env)) {
        return unauthorizedResponse('API key required');
      }

      // Main research endpoint
      if (url.pathname === '/' && method === 'GET') {
        return handleResearchRequest(url, env, corsHeaders);
      }

      if (url.pathname === '/research' && method === 'POST') {
        return handleBatchResearch(request, env, corsHeaders);
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

// Main research handler
async function handleResearchRequest(url: URL, env: Env, corsHeaders: any): Promise<Response> {
  const topic = url.searchParams.get('topic');
  if (!topic) {
    return errorResponse('Missing required parameter: topic', 400);
  }

  const depth = parseInt(url.searchParams.get('depth') || '3');
  const excludeDomains = url.searchParams.get('exclude_domains')?.split(',') || [];
  const minQuality = parseFloat(url.searchParams.get('min_quality') || '0.6');
  const maxSources = parseInt(url.searchParams.get('max_sources') || '20');

  const cacheKey = `research:${topic}:${depth}:${minQuality}`;
  
  // Check cache first
  const cached = await env.RESEARCH_CACHE.get(cacheKey);
  if (cached) {
    const result = JSON.parse(cached);
    result.cached = true;
    return jsonResponse(result, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let sessionId: number;

  try {
    // Create research session
    const sessionResult = await env.TOPIC_RESEARCH_DB.prepare(
      `INSERT INTO research_sessions (topic, search_depth, status) 
       VALUES (?, ?, 'active') RETURNING id`
    ).bind(topic, depth).first();

    sessionId = sessionResult.id;

    // Phase 1: AI-Based RSS Discovery (realistic approach)
    const aiSources = await discoverSourcesViaAI(topic, excludeDomains, env);
    
    // Phase 2: Validation and Quality Scoring
    const validatedSources = await validateAndScoreSources(aiSources, topic, minQuality, env);

    // Phase 3: Store results
    await storeDiscoveredSources(sessionId, validatedSources, env);

    // Update session status
    await env.TOPIC_RESEARCH_DB.prepare(
      `UPDATE research_sessions 
       SET sources_found = ?, quality_sources = ?, status = 'completed'
       WHERE id = ?`
    ).bind(
      validatedSources.length,
      validatedSources.filter(s => s.quality_score >= minQuality).length,
      sessionId
    ).run();

    const qualitySources = validatedSources
      .filter(source => source.quality_score >= minQuality)
      .sort((a, b) => b.quality_score - a.quality_score)
      .slice(0, maxSources);

    const response = {
      status: 'ok',
      topic,
      session_id: sessionId,
      research_depth: depth,
      sources_discovered: validatedSources.length,
      quality_sources: qualitySources.length,
      min_quality_threshold: minQuality,
      sources: qualitySources,
      research_time_ms: Date.now() - startTime,
      cached: false,
      timestamp: new Date().toISOString()
    };

    // Cache for 1 hour
    await env.RESEARCH_CACHE.put(cacheKey, JSON.stringify(response), { expirationTtl: 3600 });

    return jsonResponse(response, { headers: corsHeaders });

  } catch (error) {
    console.error('Research failed:', error);
    
    // Update session as failed if we have a session ID
    if (sessionId) {
      try {
        await env.TOPIC_RESEARCH_DB.prepare(
          `UPDATE research_sessions SET status = 'failed' WHERE id = ?`
        ).bind(sessionId).run();
      } catch (dbError) {
        console.error('Failed to update session status:', dbError);
      }
    }
    
    return errorResponse(`Research failed: ${error.message}`, 500);
  }
}

// AI-enhanced discovery - FIXED VERSION
async function discoverSourcesViaAI(
  topic: string,
  excludeDomains: string[],
  env: Env
): Promise<DiscoveredSource[]> {
  
  try {
    // Check if OpenAI API key is available
    if (!env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1500,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: `You are an expert at finding authoritative RSS news sources. 

Topic: "${topic}"

Suggest 8-12 high-quality RSS sources that would be authoritative for this topic. Focus on:
- Major news organizations (BBC, Reuters, AP, etc.)
- Industry publications and trade journals  
- Academic institutions and research centers
- Government agencies and official sources
- Well-known technology blogs and expert commentary sites

Exclude these domains: ${excludeDomains.join(', ')}

For each suggestion, provide the most likely RSS feed URL. Many sites use patterns like:
- /feed/
- /feeds/
- /rss/
- /rss.xml
- /feed.xml

Respond with ONLY a valid JSON array (no markdown, no backticks):
[
  {
    "url": "https://example.com/feed/",
    "domain": "example.com",
    "title": "Example Authority Feed", 
    "description": "Brief description of why this source is authoritative for ${topic}"
  }
]`
        }]
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`OpenAI API error: ${aiResponse.status} - ${errorText}`);
    }

    const data = await aiResponse.json();
    
    // Check if API response has expected structure (OpenAI format)
    if (!data || !data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      console.error('Invalid OpenAI API response structure:', JSON.stringify(data));
      throw new Error('Invalid OpenAI API response structure');
    }
    
    let responseText = data.choices[0].message.content.trim();
    
    // Clean up response text (remove markdown formatting if present)
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let aiSuggestions;
    try {
      aiSuggestions = JSON.parse(responseText);
    } catch (parseError) {
      console.error('AI discovery JSON parse failed:', parseError, 'Response:', responseText);
      throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }
    
    // Validate that we got an array
    if (!Array.isArray(aiSuggestions)) {
      throw new Error('AI response is not an array');
    }
    
    return aiSuggestions
      .filter(suggestion => suggestion.url && suggestion.domain && suggestion.title)
      .map((suggestion: any) => ({
        url: suggestion.url,
        domain: suggestion.domain,
        title: suggestion.title,
        description: suggestion.description || `Suggested RSS source for ${topic}`,
        quality_score: 0.7, // AI suggestions start higher
        validation_status: 'pending',
        discovery_method: 'ai_suggestion',
        reasoning: suggestion.description || `AI-suggested authoritative source for ${topic}`
      }));

  } catch (error) {
    console.error('AI discovery failed:', error);
    
    // Return fallback sources for common topics to ensure worker doesn't completely fail
    return getFallbackSources(topic, excludeDomains);
  }
}

// Fallback sources when AI fails
function getFallbackSources(topic: string, excludeDomains: string[]): DiscoveredSource[] {
  const commonSources = [
    {
      url: 'https://feeds.reuters.com/reuters/technologyNews',
      domain: 'reuters.com',
      title: 'Reuters Technology News',
      description: 'Reuters technology news feed'
    },
    {
      url: 'https://rss.cnn.com/rss/cnn_tech.rss',
      domain: 'cnn.com', 
      title: 'CNN Technology',
      description: 'CNN technology news feed'
    },
    {
      url: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
      domain: 'bbc.co.uk',
      title: 'BBC Technology News',
      description: 'BBC technology news feed'
    }
  ];

  return commonSources
    .filter(source => !excludeDomains.some(domain => source.domain.includes(domain)))
    .map(source => ({
      ...source,
      quality_score: 0.8,
      validation_status: 'pending',
      discovery_method: 'fallback',
      reasoning: `Fallback authoritative source for ${topic}`
    }));
}

// Source validation and quality scoring - IMPROVED VERSION
async function validateAndScoreSources(
  sources: DiscoveredSource[],
  topic: string,
  minQuality: number,
  env: Env
): Promise<DiscoveredSource[]> {
  
  const validatedSources: DiscoveredSource[] = [];
  
  for (const source of sources) {
    try {
      // Basic URL validation
      if (!isValidRSSUrl(source.url)) {
        source.validation_status = 'invalid';
        source.quality_score = 0.0;
        source.reasoning += ' | Invalid URL format';
        continue;
      }

      // Try to fetch the feed to validate it exists and is accessible
      try {
        const feedResponse = await fetch(source.url, { 
          method: 'HEAD',
          headers: { 
            'User-Agent': 'Bitware RSS Researcher/1.0',
            'Accept': 'application/rss+xml, application/atom+xml, text/xml'
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (!feedResponse.ok) {
          source.validation_status = 'invalid';
          source.quality_score = 0.0;
          source.reasoning += ` | HTTP ${feedResponse.status}`;
          continue;
        }
      } catch (fetchError) {
        source.validation_status = 'error';
        source.quality_score = 0.0;
        source.reasoning += ` | Fetch failed: ${fetchError.message}`;
        continue;
      }

      // AI quality scoring
      const qualityScore = await scoreSourceQuality(source, topic, env);
      source.quality_score = qualityScore;
      source.validation_status = qualityScore >= minQuality ? 'valid' : 'low_quality';

      validatedSources.push(source);

    } catch (error) {
      source.validation_status = 'error';
      source.quality_score = 0.0;
      source.reasoning += ` | Validation error: ${error.message}`;
      console.error(`Validation failed for ${source.url}:`, error);
    }
  }

  return validatedSources;
}

// AI quality scoring - FIXED VERSION
async function scoreSourceQuality(source: DiscoveredSource, topic: string, env: Env): Promise<number> {
  try {
    if (!env.OPENAI_API_KEY) {
      return 0.5; // Default score if no API key
    }

    const scoringResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: `Score the quality and relevance of this RSS source for the topic "${topic}":

URL: ${source.url}
Domain: ${source.domain}  
Title: ${source.title}
Description: ${source.description}

Consider:
- Domain authority and reputation (major news sites = high, unknown blogs = low)
- Relevance to the topic "${topic}" (exact match = high, tangential = low)
- Likely update frequency and content quality
- Whether this is an authoritative source

Respond with ONLY a valid JSON object (no markdown, no backticks):
{
  "quality_score": 0.85,
  "reasoning": "Brief explanation of the score"
}

Score range: 0.0 (poor/irrelevant) to 1.0 (excellent/highly relevant)`
        }]
      })
    });

    if (!scoringResponse.ok) {
      console.error('OpenAI scoring API error:', scoringResponse.status);
      return 0.5; // Default neutral score
    }

    const data = await scoringResponse.json();
    
    // Check if API response has expected structure (OpenAI format)
    if (!data || !data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      console.error('Invalid OpenAI scoring API response structure:', JSON.stringify(data));
      return 0.5; // Default neutral score
    }
    
    let responseText = data.choices[0].message.content.trim();
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let scoreResult;
    try {
      scoreResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Quality scoring JSON parse failed:', parseError, 'Response:', responseText);
      return 0.5; // Default neutral score
    }
    
    // Validate score result
    if (typeof scoreResult.quality_score !== 'number') {
      console.error('Invalid quality score format:', scoreResult);
      return 0.5;
    }
    
    // Update reasoning with AI feedback
    source.reasoning += ` | AI Score: ${scoreResult.reasoning || 'No reasoning provided'}`;
    
    return Math.max(0.0, Math.min(1.0, scoreResult.quality_score));

  } catch (error) {
    console.error('Quality scoring failed:', error);
    return 0.5; // Default neutral score
  }
}

// Store discovered sources in database
async function storeDiscoveredSources(
  sessionId: number, 
  sources: DiscoveredSource[], 
  env: Env
): Promise<void> {
  
  for (const source of sources) {
    try {
      await env.TOPIC_RESEARCH_DB.prepare(
        `INSERT OR IGNORE INTO discovered_sources 
         (session_id, url, domain, title, description, quality_score, validation_status, discovery_method, reasoning)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        sessionId,
        source.url,
        source.domain, 
        source.title,
        source.description,
        source.quality_score,
        source.validation_status,
        source.discovery_method,
        source.reasoning
      ).run();
    } catch (dbError) {
      console.error(`Failed to store source ${source.url}:`, dbError);
    }
  }
}

// Batch research handler
async function handleBatchResearch(request: Request, env: Env, corsHeaders: any): Promise<Response> {
  try {
    const body = await request.json();
    const topics = body.topics || [];
    
    if (!Array.isArray(topics) || topics.length === 0) {
      return errorResponse('Invalid topics array', 400);
    }

    const results = [];
    for (const topic of topics.slice(0, 5)) { // Limit to 5 topics
      try {
        // Simulate URL for individual research
        const fakeUrl = new URL(`/?topic=${encodeURIComponent(topic)}`, request.url);
        const result = await handleResearchRequest(fakeUrl, env, {});
        const data = await result.json();
        results.push(data);
      } catch (error) {
        results.push({
          status: 'error',
          topic,
          error: error.message
        });
      }
    }

    return jsonResponse({ 
      status: 'ok',
      results 
    }, { headers: corsHeaders });

  } catch (error) {
    return errorResponse(`Batch research failed: ${error.message}`, 500);
  }
}

// Admin handlers
async function handleAdminRequest(url: URL, request: Request, env: Env, corsHeaders: any): Promise<Response> {
  if (url.pathname === '/admin/stats') {
    const stats = await getResearchStats(env);
    return jsonResponse(stats, { headers: corsHeaders });
  }

  if (url.pathname === '/admin/sessions') {
    const sessions = await getRecentSessions(env);
    return jsonResponse({ sessions }, { headers: corsHeaders });
  }

  if (url.pathname === '/admin/sources' && request.method === 'GET') {
    const sessionId = url.searchParams.get('session_id');
    const sources = await getSessionSources(sessionId, env);
    return jsonResponse({ sources }, { headers: corsHeaders });
  }

  return notFoundResponse();
}

// Helper functions
function isValidRSSUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:' && (
      url.includes('/feed') ||
      url.includes('/feeds') ||
      url.includes('/rss') ||
      url.includes('.xml') ||
      url.includes('.rss') ||
      url.includes('atom') ||
      url.includes('feed.php') ||
      url.includes('rss.php')
    );
  } catch {
    return false;
  }
}

// Database query functions
async function getResearchStats(env: Env) {
  try {
    const stats = await env.TOPIC_RESEARCH_DB.prepare(`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_sessions,
        AVG(sources_found) as avg_sources_found,
        AVG(quality_sources) as avg_quality_sources
      FROM research_sessions
      WHERE research_date > datetime('now', '-7 days')
    `).first();

    const topTopics = await env.TOPIC_RESEARCH_DB.prepare(`
      SELECT topic, COUNT(*) as research_count
      FROM research_sessions 
      WHERE research_date > datetime('now', '-30 days')
      GROUP BY topic
      ORDER BY research_count DESC
      LIMIT 10
    `).all();

    return {
      ...stats,
      top_topics: topTopics.results
    };
  } catch (error) {
    console.error('Stats query failed:', error);
    return {
      total_sessions: 0,
      completed_sessions: 0,
      active_sessions: 0,
      failed_sessions: 0,
      avg_sources_found: 0,
      avg_quality_sources: 0,
      top_topics: []
    };
  }
}

async function getRecentSessions(env: Env) {
  try {
    const sessions = await env.TOPIC_RESEARCH_DB.prepare(`
      SELECT * FROM research_sessions 
      ORDER BY research_date DESC 
      LIMIT 20
    `).all();

    return sessions.results;
  } catch (error) {
    console.error('Recent sessions query failed:', error);
    return [];
  }
}

async function getSessionSources(sessionId: string, env: Env) {
  if (!sessionId) return [];
  
  try {
    const sources = await env.TOPIC_RESEARCH_DB.prepare(`
      SELECT id, session_id, url, domain, title, description, quality_score, 
             validation_status, discovery_method, reasoning, discovered_at
      FROM discovered_sources 
      WHERE session_id = ?
      ORDER BY quality_score DESC
    `).bind(sessionId).all();

    return sources.results;
  } catch (error) {
    console.error('Session sources query failed:', error);
    return [];
  }
}

// Response helpers
function getHelpInfo() {
  return {
    worker: 'bitware_topic_researcher',
    version: '1.0.0',
    description: 'Discover and validate new RSS sources for topics using AI and web search',
    endpoints: {
      public: {
        'GET /help': 'This help information',
        'GET /capabilities': 'Worker capabilities and specifications',
        'GET /debug': 'Debug information (remove in production)'
      },
      main: {
        'GET /?topic=<topic>&depth=<1-5>&min_quality=<0.0-1.0>': 'Research RSS sources for topic',
        'POST /research': 'Batch research multiple topics'
      },
      admin: {
        'GET /admin/stats': 'Research statistics',
        'GET /admin/sessions': 'Recent research sessions',
        'GET /admin/sources?session_id=<id>': 'Sources from specific session'
      }
    },
    parameters: {
      topic: 'Required. Topic to research (e.g., "quantum computing")',
      depth: 'Optional. Research depth 1-5 (default: 3)',
      exclude_domains: 'Optional. Comma-separated domains to exclude',
      min_quality: 'Optional. Minimum quality score 0.0-1.0 (default: 0.6)',
      max_sources: 'Optional. Maximum sources to return (default: 20)'
    },
    authentication: {
      client: 'X-API-Key header required for main endpoints',
      worker: 'Authorization: Bearer + X-Worker-ID headers for admin endpoints'
    },
    ai_model: 'gpt-4o-mini via OpenAI API'
  };
}

function getCapabilities() {
  return {
    worker_type: 'ContentDiscoverer',
    role: 'Discover and validate new RSS sources for topics using AI and web search',
    input_format: {
      topic: 'string (required)',
      depth: 'integer 1-5 (optional)',
      exclude_domains: 'string[] (optional)', 
      min_quality: 'float 0.0-1.0 (optional)',
      max_sources: 'integer (optional)'
    },
    output_format: {
      status: 'string',
      topic: 'string',
      sources_discovered: 'integer',
      quality_sources: 'integer', 
      sources: 'DiscoveredSource[]',
      research_time_ms: 'integer'
    },
    storage: {
      d1: 'topic_research_db',
      kv: 'research_cache',
      k2: 'search_params'
    },
    external_dependencies: ['openai_api'],
    ai_model: 'gpt-4o-mini',
    performance: {
      typical_response_time: '5-15 seconds',
      cache_duration: '1 hour',
      rate_limits: '60 requests/hour per client'
    }
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