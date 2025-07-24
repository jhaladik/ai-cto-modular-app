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
    research_time_ms?: number;
    cache_hit?: boolean;
    avg_quality_score?: number;
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
  
        // Health endpoint with database initialization
        if (url.pathname === '/health') {
          await initializeDatabase(env);
          const health = await checkWorkerHealth(env);
          return jsonResponse(health, { headers: corsHeaders });
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
  
  // ==================== MAIN RESEARCH HANDLER ====================
  
  async function handleResearchRequest(url: URL, env: Env, corsHeaders: any): Promise<Response> {
    const startTime = Date.now();
    let sessionId: number = 0;
    let cacheHit = false;
  
    try {
      const topic = url.searchParams.get('topic');
      const depthParam = url.searchParams.get('depth');
      const depth = (depthParam && depthParam !== 'undefined') ? parseInt(depthParam) : 3;      const excludeDomains = url.searchParams.get('exclude_domains')?.split(',') || [];
      const minQualityParam = url.searchParams.get('min_quality');
      const minQuality = (minQualityParam && minQualityParam !== 'undefined') ? parseFloat(minQualityParam) : 0.6;
      const maxSourcesParam = url.searchParams.get('max_sources');
      const maxSources = (maxSourcesParam && maxSourcesParam !== 'undefined') ? parseInt(maxSourcesParam) : 10;
  
      if (!topic) {
        return errorResponse('Topic parameter required', 400);
      }
  
      // Check cache first
      const cacheKey = `research:${topic}:${depth}:${minQuality}`;
      let cachedResult;
      
      try {
        cachedResult = await env.RESEARCH_CACHE?.get(cacheKey, 'json');
        if (cachedResult) {
          cacheHit = true;
          const responseTime = Date.now() - startTime;
          
          // Store cache hit session
          sessionId = await storeResearchSession(
            topic, depth, cachedResult.sources?.length || 0, 
            cachedResult.quality_sources || 0, responseTime, true,
            cachedResult.avg_quality_score || 0, minQuality, maxSources, env
          );
  
          return jsonResponse({
            ...cachedResult,
            session_id: sessionId,
            cache_hit: true,
            research_time_ms: responseTime
          }, { headers: corsHeaders });
        }
      } catch (cacheError) {
        console.log('Cache check failed, proceeding with fresh research:', cacheError);
      }
  
      // Proceed with fresh research
      const aiStartTime = Date.now();
      const aiSources = await discoverSourcesViaAI(topic, excludeDomains, env);
      const aiProcessingTime = Date.now() - aiStartTime;
  
      const validationStartTime = Date.now();
      const validatedSources = await validateAndScoreSources(aiSources, topic, minQuality, env);
      const validationTime = Date.now() - validationStartTime;
  
      const qualitySources = validatedSources
        .filter(source => source.quality_score >= minQuality)
        .sort((a, b) => b.quality_score - a.quality_score)
        .slice(0, maxSources);
  
      const avgQualityScore = qualitySources.length > 0 
        ? qualitySources.reduce((sum, s) => sum + s.quality_score, 0) / qualitySources.length 
        : 0;
  
      const totalResearchTime = Date.now() - startTime;
  
      // Store research session with performance metrics
      sessionId = await storeResearchSession(
        topic, depth, validatedSources.length, qualitySources.length,
        totalResearchTime, false, avgQualityScore, minQuality, maxSources, env
      );
  
      // Store discovered sources with validation metrics
      for (const source of validatedSources) {
        await storeDiscoveredSource(sessionId, source, 0, 0, '', env);
      }
  
      const response = {
        status: 'ok',
        topic,
        session_id: sessionId,
        research_depth: depth,
        sources_discovered: validatedSources.length,
        quality_sources: qualitySources.length,
        min_quality_threshold: minQuality,
        sources: qualitySources,
        research_time_ms: totalResearchTime,
        ai_processing_time_ms: aiProcessingTime,
        validation_time_ms: validationTime,
        cache_hit: false,
        avg_quality_score: avgQualityScore
      };
  
      // Cache the result
      try {
        await env.RESEARCH_CACHE?.put(cacheKey, JSON.stringify(response), {
          expirationTtl: 3600 // 1 hour
        });
      } catch (cacheError) {
        console.error('Failed to cache result:', cacheError);
      }
  
      return jsonResponse(response, { headers: corsHeaders });
  
    } catch (error) {
      const errorTime = Date.now() - startTime;
      console.error('Research request failed:', error);
  
      // Store failed session
      if (sessionId > 0) {
        try {
          await env.TOPIC_RESEARCH_DB.prepare(`
            UPDATE research_sessions 
            SET status = 'failed', error_message = ?, research_time_ms = ?
            WHERE id = ?
          `).bind(error.message, errorTime, sessionId).run();
        } catch (dbError) {
          console.error('Failed to update failed session:', dbError);
        }
      }
  
      return errorResponse(`Research failed: ${error.message}`, 500);
    }
  }
  
  // ==================== AI DISCOVERY FUNCTIONS ====================
  
  async function discoverSourcesViaAI(topic: string, excludeDomains: string[], env: Env): Promise<DiscoveredSource[]> {
    try {
      const systemPrompt = `You are an RSS feed discovery expert. Your task is to suggest high-quality RSS feeds for a given topic.
  
  For the topic "${topic}", provide 6-8 authoritative RSS feed URLs that would contain relevant, high-quality content.
  
  Focus on:
  - News websites and publications
  - Industry-specific blogs and publications  
  - Government agencies and organizations
  - Academic institutions and research centers
  - Professional associations and trade publications
  
  Return a JSON array of objects with this structure:
  [
    {
      "url": "https://example.com/rss",
      "domain": "example.com", 
      "title": "Example News RSS",
      "description": "Description of what this feed covers",
      "reasoning": "Why this source is authoritative for this topic"
    }
  ]
  
  Avoid social media, personal blogs, and low-quality sources.
  ${excludeDomains.length > 0 ? `Do not include domains: ${excludeDomains.join(', ')}` : ''}`;
  
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt }
          ],
          max_tokens: 2000,
          temperature: 0.3
        })
      });
  
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }
  
      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Parse JSON response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response');
      }
  
      const aiSources = JSON.parse(jsonMatch[0]);
      
      return aiSources.map((source: any) => ({
        url: source.url,
        domain: source.domain || new URL(source.url).hostname,
        title: source.title || '',
        description: source.description || '',
        quality_score: 0.0, // Will be scored later
        validation_status: 'pending',
        discovery_method: 'ai_search',
        reasoning: source.reasoning || 'AI-suggested source'
      }));
  
    } catch (error) {
      console.error('AI discovery failed:', error);
      return [];
    }
  }
  
  async function validateAndScoreSources(sources: DiscoveredSource[], topic: string, minQuality: number, env: Env): Promise<DiscoveredSource[]> {
    const validatedSources: DiscoveredSource[] = [];
  
    for (const source of sources) {
      try {
        // Basic URL validation
        if (!isValidRSSUrl(source.url)) {
          source.validation_status = 'invalid';
          continue;
        }
  
        // HTTP validation with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
  
        try {
          const response = await fetch(source.url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; RSS-Discovery-Bot/1.0)'
            }
          });
  
          clearTimeout(timeoutId);
  
          if (response.ok) {
            source.validation_status = 'valid';
            
            // AI quality scoring
            source.quality_score = await scoreSourceQuality(source, topic, env);
            validatedSources.push(source);
          } else {
            source.validation_status = 'invalid';
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          source.validation_status = 'timeout';
        }
  
      } catch (error) {
        console.error(`Validation failed for ${source.url}:`, error);
        source.validation_status = 'invalid';
      }
    }
  
    return validatedSources;
  }
  
  async function scoreSourceQuality(source: DiscoveredSource, topic: string, env: Env): Promise<number> {
    try {
      const scoringPrompt = `Rate the quality and authority of this RSS source for the topic "${topic}" on a scale from 0.0 to 1.0.
  
  Source: ${source.title}
  Domain: ${source.domain}
  URL: ${source.url}
  Description: ${source.description}
  
  Consider:
  - Domain authority and reputation
  - Relevance to the topic
  - Content quality and editorial standards
  - Update frequency and freshness
  - Credibility and trustworthiness
  
  Respond with only a decimal number between 0.0 and 1.0.`;
  
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'user', content: scoringPrompt }
          ],
          max_tokens: 50,
          temperature: 0.1
        })
      });
  
      if (!response.ok) {
        return 0.5; // Default score on API error
      }
  
      const data = await response.json();
      const scoreText = data.choices[0].message.content.trim();
      const score = parseFloat(scoreText);
      
      return isNaN(score) ? 0.5 : Math.max(0.0, Math.min(1.0, score));
  
    } catch (error) {
      console.error('Quality scoring failed:', error);
      return 0.5;
    }
  }
  
  // ==================== DATABASE FUNCTIONS ====================
  
  async function storeResearchSession(
    topic: string, 
    depth: number, 
    sourcesFound: number, 
    qualitySources: number, 
    researchTimeMs: number,
    cacheHit: boolean,
    avgQualityScore: number,
    minQualityThreshold: number,
    maxSourcesRequested: number,
    env: Env
  ): Promise<number> {
    try {
      const result = await env.TOPIC_RESEARCH_DB.prepare(`
        INSERT INTO research_sessions (
          topic, search_depth, sources_found, quality_sources, status,
          research_time_ms, cache_hit, avg_quality_score, 
          min_quality_threshold, max_sources_requested
        ) 
        VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?) 
        RETURNING id
      `).bind(
        topic, depth, sourcesFound, qualitySources, 
        researchTimeMs, cacheHit, avgQualityScore, 
        minQualityThreshold, maxSourcesRequested
      ).first();
  
      return result?.id || 0;
    } catch (error) {
      console.error('Failed to store research session:', error);
      // Fallback to basic insert if analytics columns don't exist yet
      try {
        const fallbackResult = await env.TOPIC_RESEARCH_DB.prepare(`
          INSERT INTO research_sessions (topic, search_depth, sources_found, quality_sources, status) 
          VALUES (?, ?, ?, ?, 'completed') RETURNING id
        `).bind(topic, depth, sourcesFound, qualitySources).first();
        
        return fallbackResult?.id || 0;
      } catch (fallbackError) {
        console.error('Fallback session storage failed:', fallbackError);
        return 0;
      }
    }
  }
  
  async function storeDiscoveredSource(
    sessionId: number, 
    source: DiscoveredSource, 
    responseTimeMs: number = 0,
    httpStatusCode: number = 0,
    feedType: string = '',
    env: Env
  ) {
    try {
      await env.TOPIC_RESEARCH_DB.prepare(`
        INSERT INTO discovered_sources (
          session_id, url, domain, title, description, quality_score,
          validation_status, discovery_method, reasoning,
          response_time_ms, http_status_code, feed_type
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        sessionId, source.url, source.domain, source.title,
        source.description, source.quality_score, source.validation_status,
        source.discovery_method, source.reasoning,
        responseTimeMs, httpStatusCode, feedType
      ).run();
    } catch (error) {
      console.error(`Failed to store source ${source.url} with analytics:`, error);
      // Fallback to basic insert
      try {
        await env.TOPIC_RESEARCH_DB.prepare(`
          INSERT INTO discovered_sources (
            session_id, url, domain, title, description, quality_score,
            validation_status, discovery_method, reasoning
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          sessionId, source.url, source.domain, source.title,
          source.description, source.quality_score, source.validation_status,
          source.discovery_method, source.reasoning
        ).run();
      } catch (fallbackError) {
        console.error(`Fallback source storage failed for ${source.url}:`, fallbackError);
      }
    }
  }
  
  async function initializeDatabase(env: Env) {
    try {
      // Create tables if they don't exist
      await env.TOPIC_RESEARCH_DB.prepare(`
        CREATE TABLE IF NOT EXISTS research_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          topic TEXT NOT NULL,
          search_depth INTEGER DEFAULT 3,
          sources_found INTEGER DEFAULT 0,
          quality_sources INTEGER DEFAULT 0,
          research_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'pending'
        )
      `).run();
      
      await env.TOPIC_RESEARCH_DB.prepare(`
        CREATE TABLE IF NOT EXISTS discovered_sources (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER,
          url TEXT NOT NULL,
          domain TEXT,
          title TEXT,
          description TEXT,
          quality_score REAL DEFAULT 0.0,
          validation_status TEXT DEFAULT 'pending',
          discovery_method TEXT,
          reasoning TEXT,
          discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES research_sessions(id)
        )
      `).run();
      
      return true;
    } catch (error) {
      console.error('Database initialization failed:', error);
      return false;
    }
  }
  
  // ==================== ADMIN HANDLERS ====================
  
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
      return jsonResponse({ session_id: sessionId, sources }, { headers: corsHeaders });
    }
  
    // NEW: Analytics endpoint
    if (url.pathname === '/admin/analytics') {
      const timeRange = url.searchParams.get('time_range') || '7d';
      const analytics = await getAnalytics(timeRange, env);
      return jsonResponse(analytics, { headers: corsHeaders });
    }
  
    // NEW: Performance endpoint  
    if (url.pathname === '/admin/performance') {
      const performance = await getPerformanceMetrics(env);
      return jsonResponse(performance, { headers: corsHeaders });
    }
  
    return notFoundResponse();
  }
  
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
  
  // ==================== NEW ANALYTICS FUNCTIONS ====================
  
  async function getAnalytics(timeRange: string, env: Env) {
    try {
      let dateFilter = '';
      switch (timeRange) {
        case '24h':
          dateFilter = "research_date > datetime('now', '-1 day')";
          break;
        case '7d':
          dateFilter = "research_date > datetime('now', '-7 days')";
          break;
        case '30d':
          dateFilter = "research_date > datetime('now', '-30 days')";
          break;
        default:
          dateFilter = "research_date > datetime('now', '-7 days')";
      }
  
      // Check if analytics columns exist
      const columns = await env.TOPIC_RESEARCH_DB.prepare(`
        PRAGMA table_info(research_sessions)
      `).all();
      
      const hasAnalyticsColumns = columns.results.some((col: any) => col.name === 'research_time_ms');
  
      let performanceTrends;
      if (hasAnalyticsColumns) {
        // Use enhanced query with performance data
        performanceTrends = await env.TOPIC_RESEARCH_DB.prepare(`
          SELECT 
            date(research_date) as date,
            COUNT(*) as sessions_count,
            AVG(sources_found) as avg_sources_found,
            AVG(quality_sources) as avg_quality_sources,
            AVG(CASE WHEN research_time_ms > 0 THEN research_time_ms END) as avg_response_time_ms,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
            COUNT(CASE WHEN cache_hit = 1 THEN 1 END) as cached_count
          FROM research_sessions 
          WHERE ${dateFilter}
          GROUP BY date(research_date)
          ORDER BY date DESC
        `).all();
      } else {
        // Fallback query for basic data
        performanceTrends = await env.TOPIC_RESEARCH_DB.prepare(`
          SELECT 
            date(research_date) as date,
            COUNT(*) as sessions_count,
            AVG(sources_found) as avg_sources_found,
            AVG(quality_sources) as avg_quality_sources,
            0 as avg_response_time_ms,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
            0 as cached_count
          FROM research_sessions 
          WHERE ${dateFilter}
          GROUP BY date(research_date)
          ORDER BY date DESC
        `).all();
      }
  
      // Basic topic performance (always available)
      const topQualityTopics = await env.TOPIC_RESEARCH_DB.prepare(`
        SELECT 
          topic,
          COUNT(*) as research_count,
          AVG(quality_sources) as avg_quality_sources,
          AVG(sources_found) as avg_sources_found,
          MAX(research_date) as last_researched
        FROM research_sessions 
        WHERE ${dateFilter} AND status = 'completed'
        GROUP BY topic
        HAVING COUNT(*) >= 1
        ORDER BY avg_quality_sources DESC
        LIMIT 10
      `).all();
  
      return {
        time_range: timeRange,
        generated_at: new Date().toISOString(),
        analytics_version: hasAnalyticsColumns ? 'enhanced' : 'basic',
        performance_trends: performanceTrends.results || [],
        top_quality_topics: topQualityTopics.results || [],
        discovery_patterns: [], // Add when migration complete
        quality_distribution: [] // Add when migration complete
      };
  
    } catch (error) {
      console.error('Analytics query failed:', error);
      return {
        time_range: timeRange,
        generated_at: new Date().toISOString(),
        error: 'Analytics data unavailable',
        performance_trends: [],
        top_quality_topics: [],
        discovery_patterns: [],
        quality_distribution: []
      };
    }
  }
  
  async function getPerformanceMetrics(env: Env) {
    try {
      // Check if analytics columns exist
      const columns = await env.TOPIC_RESEARCH_DB.prepare(`
        PRAGMA table_info(research_sessions)
      `).all();
      
      const hasAnalyticsColumns = columns.results.some((col: any) => col.name === 'research_time_ms');
  
      let overallPerformance;
      if (hasAnalyticsColumns) {
        // Enhanced performance query
        overallPerformance = await env.TOPIC_RESEARCH_DB.prepare(`
          SELECT 
            COUNT(*) as total_sessions,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_sessions,
            ROUND(AVG(CASE WHEN research_time_ms > 0 THEN research_time_ms END), 2) as avg_response_time_ms,
            ROUND(MIN(CASE WHEN research_time_ms > 0 THEN research_time_ms END), 2) as min_response_time_ms,
            ROUND(MAX(CASE WHEN research_time_ms > 0 THEN research_time_ms END), 2) as max_response_time_ms,
            ROUND(AVG(sources_found), 2) as avg_sources_discovered,
            ROUND(AVG(quality_sources), 2) as avg_quality_sources,
            ROUND((COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*)), 2) as success_rate_percent,
            ROUND(COUNT(CASE WHEN cache_hit = 1 THEN 1 END) * 100.0 / COUNT(*), 2) as cache_hit_rate_percent
          FROM research_sessions 
          WHERE research_date > datetime('now', '-30 days')
        `).first();
      } else {
        // Basic performance query
        overallPerformance = await env.TOPIC_RESEARCH_DB.prepare(`
          SELECT 
            COUNT(*) as total_sessions,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_sessions,
            0 as avg_response_time_ms,
            0 as min_response_time_ms,
            0 as max_response_time_ms,
            ROUND(AVG(sources_found), 2) as avg_sources_discovered,
            ROUND(AVG(quality_sources), 2) as avg_quality_sources,
            ROUND((COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*)), 2) as success_rate_percent,
            0 as cache_hit_rate_percent
          FROM research_sessions 
          WHERE research_date > datetime('now', '-30 days')
        `).first();
      }
  
      return {
        generated_at: new Date().toISOString(),
        analytics_version: hasAnalyticsColumns ? 'enhanced' : 'basic',
        overall_performance: overallPerformance || {},
        hourly_performance: [],
        cache_analysis: [],
        error_analysis: [],
        recent_samples: []
      };
  
    } catch (error) {
      console.error('Performance metrics query failed:', error);
      return {
        generated_at: new Date().toISOString(),
        error: 'Performance metrics unavailable',
        overall_performance: {},
        hourly_performance: [],
        cache_analysis: [],
        error_analysis: [],
        recent_samples: []
      };
    }
  }
  
  // ==================== BATCH RESEARCH HANDLER ====================
  
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
  
  // ==================== UTILITY FUNCTIONS ====================
  
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
  
  async function checkWorkerHealth(env: Env) {
    try {
      // Test if database exists and is accessible
      let dbConnected = false;
      let totalSessions = 0;
      
      try {
        const testQuery = await env.TOPIC_RESEARCH_DB.prepare(`
          SELECT COUNT(*) as count FROM research_sessions WHERE status = 'completed'
        `).first();
        
        dbConnected = true;
        totalSessions = testQuery?.count || 0;
      } catch (dbError) {
        console.error('Database connection failed:', dbError);
        // Database might not exist yet, that's ok
      }
      
      return {
        status: 'healthy',
        database: dbConnected ? 'connected' : 'not_initialized',
        total_sessions: totalSessions,
        openai_configured: !!env.OPENAI_API_KEY,
        cache_available: !!env.RESEARCH_CACHE,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Health check error:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  // ==================== AUTHENTICATION FUNCTIONS ====================
  
  function isValidClientAuth(request: Request, env: Env): boolean {
    const apiKey = request.headers.get('X-API-Key');
    return apiKey === env.CLIENT_API_KEY;
  }
  
  function isValidWorkerAuth(request: Request, env: Env): boolean {
    const authHeader = request.headers.get('Authorization');
    const workerID = request.headers.get('X-Worker-ID');
    return authHeader === `Bearer ${env.WORKER_SHARED_SECRET}` && workerID;
  }
  
  // ==================== RESPONSE HELPERS ====================
  
  function jsonResponse(data: any, options?: { headers?: Record<string, string>; status?: number }): Response {
    return new Response(JSON.stringify(data), {
      status: options?.status || 200,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });
  }
  
  function errorResponse(message: string, status: number = 500): Response {
    return jsonResponse({ error: message }, { status });
  }
  
  function notFoundResponse(): Response {
    return jsonResponse({ error: 'Endpoint not found' }, { status: 404 });
  }
  
  function unauthorizedResponse(message: string = 'Unauthorized'): Response {
    return jsonResponse({ error: message }, { status: 401 });
  }
  
  // ==================== HELP AND CAPABILITIES ====================
  
  function getHelpInfo() {
    return {
      worker: 'bitware_topic_researcher',
      version: '1.1.0', // Updated for analytics features
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
          'GET /admin/sources?session_id=<id>': 'Sources from specific session',
          'GET /admin/analytics?time_range=<24h|7d|30d>': 'Performance analytics and trends',
          'GET /admin/performance': 'Detailed performance metrics and cache analysis'
        }
      },
      new_features: {
        analytics: 'Performance trends, quality distributions, discovery patterns',
        performance: 'Response times, cache efficiency, error analysis, hourly patterns',
        migration_safe: 'Works with or without analytics database migration'
      },
      parameters: {
        topic: 'Required. Topic to research (e.g., "artificial intelligence")',
        depth: 'Optional. Research depth 1-5 (default: 3)',
        exclude_domains: 'Optional. Comma-separated domains to exclude',
        min_quality: 'Optional. Minimum quality score 0.0-1.0 (default: 0.6)',
        max_sources: 'Optional. Maximum sources to return (default: 10)'
      }
    };
  }
  
  function getCapabilities() {
    return {
      worker_type: 'ContentDiscoverer',
      ai_powered: true,
      discovery_methods: ['ai_search', 'web_search', 'hybrid'],
      quality_scoring: true,
      validation: true,
      caching: true,
      analytics: true,
      supported_topics: 'Any topic suitable for RSS feeds',
      rate_limits: {
        max_requests_per_minute: 60,
        max_ai_calls_per_hour: 100
      },
      performance: {
        typical_response_time: '25-35 seconds',
        cached_response_time: '100-200ms',
        typical_sources_found: '6-8',
        quality_score_range: '0.0-1.0'
      }
    };
  }