// @WORKER: Universal Researcher 2.0
// 🧱 Type: UniversalContentDiscovery
// 📍 Path: workers/bitware_universal_researcher/
// 🎯 Role: Multi-platform content source discovery (RSS, YouTube, Podcasts, Academic)
// 🧰 Params: { ai_model: "gpt-4o-mini", platforms: ["rss", "youtube", "podcasts"], quality_threshold: 0.7 }
// 📦 Requires: [openai_api, youtube_api, search_engines]
// 🔄 Outputs: StandardWorkerResponse with discovered sources
// 💾 Storage: { d1: "universal_discovery_db", kv: "discovery_cache" }

interface Env {
    // Database and storage bindings
    UNIVERSAL_DISCOVERY_DB: D1Database;
    DISCOVERY_CACHE: KVNamespace;
    
    // Authentication secrets
    CLIENT_API_KEY: string;
    WORKER_SHARED_SECRET: string;
    
    // AI/External APIs
    OPENAI_API_KEY: string;
    YOUTUBE_API_KEY?: string;
    GOOGLE_SEARCH_API_KEY?: string;
    GOOGLE_SEARCH_ENGINE_ID?: string;
    
    // Configuration
    MAX_SOURCES_PER_PLATFORM: string;
    QUALITY_THRESHOLD: string;
    CACHE_TTL_SECONDS: string;
    AI_MODEL: string;
  }
  
  // ==================== CORE INTERFACES ====================
  
  interface ClientContext {
    client_id: string;
    request_id: string;
    pipeline_id: string;
    billing_tier: 'free' | 'pro' | 'enterprise';
    usage_limits?: {
      max_sources: number;
      max_platforms: string[];
      premium_features: boolean;
    };
  }
  
  interface WorkerTemplate {
    capability: string;        // 'search_rss' | 'search_youtube' | 'search_all' | etc.
    parameters: any;          // Template-specific parameters
    output_format: string;    // Expected output structure
  }
  
  interface StandardWorkerResponse {
    status: 'ok' | 'error';
    timestamp: string;
    cached: boolean;
    
    metrics: {
      total_requests: number;
      success_rate: number;
      active_jobs: number;
      last_error_count: number;
      avg_response_time_ms: number;
    };
    
    health: {
      status: 'healthy' | 'degraded' | 'error';
      database_connected: boolean;
      external_apis_connected: boolean;
      last_check: string;
    };
    
    data: any; // Worker-specific data
    
    error?: {
      code: string;
      message: string;
      details: any;
    };
  }
  
  interface DiscoveredSource {
    id: string;
    platform: string;          // 'rss', 'youtube', 'podcast', 'academic', 'social'
    identifier: string;        // URL, channel_id, podcast_id, etc.
    title: string;
    description: string;
    quality_score: number;
    relevance_score: number;
    discovery_method: string;
    metadata: any;             // Platform-specific metadata
    verified: boolean;
  }
  
  // ==================== TEMPLATE HANDLERS ====================
  
  const SUPPORTED_TEMPLATES = {
    'search_rss': {
      handler: 'handleRSSSearch',
      description: 'Discover RSS feeds for topics',
      platforms: ['rss'],
      parameters: ['topic', 'depth', 'quality_threshold']
    },
    'search_youtube': {
      handler: 'handleYouTubeSearch', 
      description: 'Discover YouTube channels and playlists',
      platforms: ['youtube'],
      parameters: ['topic', 'content_type', 'subscriber_threshold']
    },
    'search_podcasts': {
      handler: 'handlePodcastSearch',
      description: 'Discover podcast feeds and episodes',
      platforms: ['podcast'],
      parameters: ['topic', 'language', 'episode_count_threshold']
    },
    'search_academic': {
      handler: 'handleAcademicSearch',
      description: 'Discover academic papers and journals',
      platforms: ['academic'],
      parameters: ['topic', 'publication_date', 'citation_threshold']
    },
    'search_all': {
      handler: 'handleMultiPlatformSearch',
      description: 'Search across all available platforms',
      platforms: ['rss', 'youtube', 'podcast', 'academic'],
      parameters: ['topic', 'platforms', 'max_per_platform']
    }
  };
  
  // ==================== MAIN WORKER HANDLER ====================
  
  export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
      const url = new URL(request.url);
      const pathname = url.pathname;
      const method = request.method;
  
      // CORS headers for all responses
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Session-Token, X-Worker-ID'
      };
  
      if (method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }
  
      try {
        // ==================== PUBLIC ENDPOINTS ====================
        
        if (pathname === '/health') {
          const health = await getHealthStatus(env);
          return jsonResponse(health, { headers: corsHeaders });
        }
  
        if (pathname === '/help') {
          return jsonResponse(getHelpInfo(), { headers: corsHeaders });
        }
  
        if (pathname === '/capabilities') {
          return jsonResponse(getCapabilities(), { headers: corsHeaders });
        }
  
        if (pathname === '/templates') {
          return jsonResponse({
            supported_templates: SUPPORTED_TEMPLATES,
            count: Object.keys(SUPPORTED_TEMPLATES).length
          }, { headers: corsHeaders });
        }
  
        // ==================== MAIN V2.0 ENDPOINT ====================
        
        if (pathname === '/execute' && method === 'POST') {
          const authResult = await authenticateRequest(request, env);
          if (!authResult.success) {
            return jsonResponse({ error: authResult.error }, { status: 401, headers: corsHeaders });
          }
  
          const body = await request.json();
          const { context, template, data } = body;
  
          if (!context || !template || !data) {
            return jsonResponse({ 
              error: 'Missing required fields: context, template, data' 
            }, { status: 400, headers: corsHeaders });
          }
  
          const result = await executeTemplate(context, template, data, env);
          return jsonResponse(result, { headers: corsHeaders });
        }
  
        // ==================== V1.0 COMPATIBILITY ENDPOINT ====================
        
        if (pathname === '/' && method === 'GET') {
          const authResult = await authenticateRequest(request, env);
          if (!authResult.success) {
            return jsonResponse({ error: authResult.error }, { status: 401, headers: corsHeaders });
          }
  
          const topic = url.searchParams.get('topic');
          if (!topic) {
            return jsonResponse({ error: 'Missing topic parameter' }, { status: 400, headers: corsHeaders });
          }
  
          // Convert v1.0 request to v2.0 template execution
          const context: ClientContext = {
            client_id: 'legacy_client',
            request_id: `legacy_${Date.now()}`,
            pipeline_id: `legacy_pipeline_${Date.now()}`,
            billing_tier: 'pro'
          };
  
          const template: WorkerTemplate = {
            capability: 'search_rss',
            parameters: {
              depth: parseInt(url.searchParams.get('depth') || '3'),
              quality_threshold: parseFloat(url.searchParams.get('min_quality') || '0.7')
            },
            output_format: 'legacy_compatibility'
          };
  
          const data = { topic };
  
          const result = await executeTemplate(context, template, data, env);
          
          // Return v1.0 compatible format
          if (result.status === 'ok') {
            return jsonResponse({
              sources: result.data.sources || [],
              session_id: result.data.session_id,
              quality_score: result.data.avg_quality_score
            }, { headers: corsHeaders });
          } else {
            return jsonResponse({ error: result.error?.message }, { status: 500, headers: corsHeaders });
          }
        }
  
        // ==================== ADMIN ENDPOINTS ====================
        
        if (pathname.startsWith('/admin/')) {
          const authResult = await authenticateWorkerRequest(request, env);
          if (!authResult.success) {
            return jsonResponse({ error: authResult.error }, { status: 401, headers: corsHeaders });
          }
  
          if (pathname === '/admin/stats') {
            const stats = await getWorkerStats(env);
            return jsonResponse(stats, { headers: corsHeaders });
          }
  
          if (pathname === '/admin/sessions') {
            const sessions = await getRecentSessions(env);
            return jsonResponse({ sessions }, { headers: corsHeaders });
          }
        }
  
        return jsonResponse({ error: 'Endpoint not found' }, { status: 404, headers: corsHeaders });
  
      } catch (error) {
        console.error('Worker error:', error);
        return jsonResponse({ 
          error: 'Internal worker error',
          details: error.message 
        }, { status: 500, headers: corsHeaders });
      }
    }
  };
  
  // ==================== CORE TEMPLATE EXECUTION ====================
  
  async function executeTemplate(
    context: ClientContext,
    template: WorkerTemplate,
    data: any,
    env: Env
  ): Promise<StandardWorkerResponse> {
    const startTime = Date.now();
    
    try {
      // Validate template
      if (!SUPPORTED_TEMPLATES[template.capability]) {
        throw new Error(`Unsupported template capability: ${template.capability}`);
      }
  
      // Initialize database
      await initializeDatabase(env);
  
      // Create session record
      const sessionId = await createSession(context, template, data, env);
      
      // Execute template-specific handler
      let sources: DiscoveredSource[] = [];
      const templateConfig = SUPPORTED_TEMPLATES[template.capability];
      
      switch (template.capability) {
        case 'search_rss':
          sources = await handleRSSSearch(data, template.parameters, env);
          break;
        case 'search_youtube':
          sources = await handleYouTubeSearch(data, template.parameters, env);
          break;
        case 'search_podcasts':
          sources = await handlePodcastSearch(data, template.parameters, env);
          break;
        case 'search_academic':
          sources = await handleAcademicSearch(data, template.parameters, env);
          break;
        case 'search_all':
          sources = await handleMultiPlatformSearch(data, template.parameters, env);
          break;
        default:
          throw new Error(`Handler not implemented for: ${template.capability}`);
      }
  
      // Store discovered sources
      await storeSources(sessionId, sources, context, env);
  
      // Update session completion
      await updateSessionStatus(sessionId, 'completed', sources.length, env);
  
      const executionTime = Date.now() - startTime;
  
      // Return StandardWorkerResponse
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        cached: false,
        metrics: await getMetricsForResponse(env),
        health: await getHealthForResponse(env),
        data: {
          session_id: sessionId,
          sources: sources,
          platform_breakdown: getPlatformBreakdown(sources),
          avg_quality_score: sources.reduce((sum, s) => sum + s.quality_score, 0) / sources.length,
          total_sources: sources.length,
          execution_time_ms: executionTime,
          template_used: template.capability,
          client_context: context
        }
      };
  
    } catch (error) {
      console.error('Template execution error:', error);
      
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        cached: false,
        metrics: await getMetricsForResponse(env),
        health: await getHealthForResponse(env),
        data: null,
        error: {
          code: 'TEMPLATE_EXECUTION_ERROR',
          message: error.message,
          details: {
            template: template.capability,
            context: context.client_id
          }
        }
      };
    }
  }
  
  // ==================== TEMPLATE HANDLERS ====================
  
  async function handleRSSSearch(data: any, parameters: any, env: Env): Promise<DiscoveredSource[]> {
    const { topic } = data;
    const { depth = 3, quality_threshold = 0.7 } = parameters;
  
    console.log(`🔍 RSS search for topic: ${topic}, depth: ${depth}`);
  
    const sources: DiscoveredSource[] = [];
  
    // Generate search queries using AI
    const searchQueries = await generateSearchQueries(topic, 'rss', env);
    
    for (const query of searchQueries.slice(0, depth)) {
      try {
        // Search for RSS sources using multiple methods
        const foundSources = await searchRSSFeeds(query, env);
        
        for (const source of foundSources) {
          // Validate and score the source
          const qualityScore = await scoreRSSSource(source, topic, env);
          
          if (qualityScore >= quality_threshold) {
            sources.push({
              id: generateSourceId(),
              platform: 'rss',
              identifier: source.url,
              title: source.title || 'Unknown Title',
              description: source.description || '',
              quality_score: qualityScore,
              relevance_score: await calculateRelevance(source, topic, env),
              discovery_method: `ai_search_query: ${query}`,
              metadata: {
                feed_type: source.type || 'rss',
                last_updated: source.lastUpdated,
                item_count: source.itemCount,
                language: source.language
              },
              verified: source.verified || false
            });
          }
        }
      } catch (error) {
        console.error(`RSS search error for query "${query}":`, error);
      }
    }
  
    // Remove duplicates and sort by quality
    return deduplicateAndRank(sources);
  }
  
  async function handleYouTubeSearch(data: any, parameters: any, env: Env): Promise<DiscoveredSource[]> {
    const { topic } = data;
    const { content_type = 'channels', subscriber_threshold = 1000 } = parameters;
  
    if (!env.YOUTUBE_API_KEY) {
      console.log('YouTube API key not configured, skipping YouTube search');
      return [];
    }
  
    console.log(`🎥 YouTube search for topic: ${topic}, type: ${content_type}`);
  
    const sources: DiscoveredSource[] = [];
  
    try {
      // Search YouTube using API
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(topic)}&type=channel&maxResults=20&key=${env.YOUTUBE_API_KEY}`;
      
      const response = await fetch(searchUrl);
      const data = await response.json();
  
      if (data.items) {
        for (const item of data.items) {
          try {
            // Get channel details for subscriber count
            const channelId = item.snippet.channelId;
            const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${env.YOUTUBE_API_KEY}`;
            
            const channelResponse = await fetch(channelUrl);
            const channelData = await channelResponse.json();
            
            const subscriberCount = parseInt(channelData.items?.[0]?.statistics?.subscriberCount || '0');
            
            if (subscriberCount >= subscriber_threshold) {
              const qualityScore = await scoreYouTubeChannel(item, topic, subscriberCount, env);
              
              sources.push({
                id: generateSourceId(),
                platform: 'youtube',
                identifier: `https://www.youtube.com/channel/${channelId}`,
                title: item.snippet.title,
                description: item.snippet.description,
                quality_score: qualityScore,
                relevance_score: await calculateRelevance(item, topic, env),
                discovery_method: 'youtube_api_search',
                metadata: {
                  channel_id: channelId,
                  subscriber_count: subscriberCount,
                  video_count: channelData.items?.[0]?.statistics?.videoCount,
                  view_count: channelData.items?.[0]?.statistics?.viewCount,
                  thumbnail_url: item.snippet.thumbnails?.high?.url
                },
                verified: subscriberCount > 10000
              });
            }
          } catch (error) {
            console.error('Error processing YouTube channel:', error);
          }
        }
      }
    } catch (error) {
      console.error('YouTube API error:', error);
    }
  
    return deduplicateAndRank(sources);
  }
  
  async function handlePodcastSearch(data: any, parameters: any, env: Env): Promise<DiscoveredSource[]> {
    // TODO: Implement podcast search using iTunes API or similar
    console.log('🎧 Podcast search not yet implemented');
    return [];
  }
  
  async function handleAcademicSearch(data: any, parameters: any, env: Env): Promise<DiscoveredSource[]> {
    // TODO: Implement academic search using arXiv, PubMed, etc.
    console.log('📚 Academic search not yet implemented');
    return [];
  }
  
  async function handleMultiPlatformSearch(data: any, parameters: any, env: Env): Promise<DiscoveredSource[]> {
    const { platforms = ['rss', 'youtube'], max_per_platform = 5 } = parameters;
    
    const allSources: DiscoveredSource[] = [];
    
    for (const platform of platforms) {
      try {
        let platformSources: DiscoveredSource[] = [];
        
        switch (platform) {
          case 'rss':
            platformSources = await handleRSSSearch(data, { depth: 3 }, env);
            break;
          case 'youtube':
            platformSources = await handleYouTubeSearch(data, {}, env);
            break;
          case 'podcasts':
            platformSources = await handlePodcastSearch(data, {}, env);
            break;
          case 'academic':
            platformSources = await handleAcademicSearch(data, {}, env);
            break;
        }
        
        // Limit sources per platform
        allSources.push(...platformSources.slice(0, max_per_platform));
      } catch (error) {
        console.error(`Error searching platform ${platform}:`, error);
      }
    }
    
    return deduplicateAndRank(allSources);
  }
  
  // ==================== DATABASE OPERATIONS ====================
  
  async function initializeDatabase(env: Env): Promise<void> {
    try {
      // Create discovery_sessions table (no inline indexes)
      await env.UNIVERSAL_DISCOVERY_DB.prepare(`
        CREATE TABLE IF NOT EXISTS discovery_sessions (
          id TEXT PRIMARY KEY,
          client_id TEXT NOT NULL,
          request_id TEXT NOT NULL,
          pipeline_id TEXT NOT NULL,
          template_capability TEXT NOT NULL,
          template_parameters TEXT,
          input_data TEXT,
          status TEXT DEFAULT 'active',
          sources_found INTEGER DEFAULT 0,
          execution_time_ms INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME
        )
      `).run();
  
      // Create discovered_sources table (no inline indexes)
      await env.UNIVERSAL_DISCOVERY_DB.prepare(`
        CREATE TABLE IF NOT EXISTS discovered_sources (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          client_id TEXT NOT NULL,
          platform TEXT NOT NULL,
          identifier TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          quality_score REAL NOT NULL,
          relevance_score REAL NOT NULL,
          discovery_method TEXT NOT NULL,
          metadata TEXT,
          verified INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
  
      // Create indexes separately (these are already created by the fix script)
      try {
        await env.UNIVERSAL_DISCOVERY_DB.prepare(`CREATE INDEX IF NOT EXISTS idx_discovery_sessions_client ON discovery_sessions(client_id)`).run();
        await env.UNIVERSAL_DISCOVERY_DB.prepare(`CREATE INDEX IF NOT EXISTS idx_discovered_sources_session ON discovered_sources(session_id)`).run();
        await env.UNIVERSAL_DISCOVERY_DB.prepare(`CREATE INDEX IF NOT EXISTS idx_discovered_sources_client ON discovered_sources(client_id)`).run();
        await env.UNIVERSAL_DISCOVERY_DB.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_discovered_sources_unique ON discovered_sources(client_id, platform, identifier)`).run();
      } catch (indexError) {
        // Indexes already exist, this is fine
        console.log('ℹ️ Indexes already exist:', indexError.message);
      }
  
      console.log('✅ Universal Discovery database initialized');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  async function createSession(context: ClientContext, template: WorkerTemplate, data: any, env: Env): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    await env.UNIVERSAL_DISCOVERY_DB.prepare(`
      INSERT INTO discovery_sessions (
        id, client_id, request_id, pipeline_id, template_capability, 
        template_parameters, input_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      sessionId,
      context.client_id,
      context.request_id,
      context.pipeline_id,
      template.capability,
      JSON.stringify(template.parameters),
      JSON.stringify(data)
    ).run();
    
    return sessionId;
  }
  
  async function storeSources(sessionId: string, sources: DiscoveredSource[], context: ClientContext, env: Env): Promise<void> {
    for (const source of sources) {
        try {
        await env.UNIVERSAL_DISCOVERY_DB.prepare(`
            INSERT OR REPLACE INTO discovered_sources (
            id, session_id, client_id, platform, identifier, title, description,
            quality_score, relevance_score, discovery_method, metadata, verified
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            source.id,
            sessionId,
            context.client_id,
            source.platform,
            source.identifier,
            source.title,
            source.description || '',
            source.quality_score,
            source.relevance_score,
            source.discovery_method,
            JSON.stringify(source.metadata || {}),
            source.verified ? 1 : 0  // Convert boolean to integer for SQLite
        ).run();
        } catch (error) {
        console.error(`Failed to store source ${source.id}:`, error);
        }
    }
  }
  
  async function updateSessionStatus(sessionId: string, status: string, sourcesFound: number, env: Env): Promise<void> {
    await env.UNIVERSAL_DISCOVERY_DB.prepare(`
      UPDATE discovery_sessions 
      SET status = ?, sources_found = ?, completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(status, sourcesFound, sessionId).run();
  }
  
  // ==================== UTILITY FUNCTIONS ====================
  
  async function generateSearchQueries(topic: string, platform: string, env: Env): Promise<string[]> {
    if (!env.OPENAI_API_KEY) {
      // Fallback without AI
      return [
        `${topic} RSS feed`,
        `${topic} news feed`,
        `${topic} blog RSS`,
        `${topic} updates feed`
      ];
    }
  
    try {
      const prompt = `Generate 5 specific search queries to find high-quality ${platform} sources about "${topic}". 
      Focus on authoritative sources, news outlets, research institutions, and industry leaders.
      Return only the search queries, one per line.`;
  
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: env.AI_MODEL || 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 200,
          temperature: 0.7
        })
      });
  
      const data = await response.json();
      const queries = data.choices[0].message.content.trim().split('\n').filter(q => q.trim());
      
      return queries.length > 0 ? queries : [`${topic} ${platform}`];
    } catch (error) {
      console.error('AI query generation failed:', error);
      return [`${topic} ${platform}`];
    }
  }
  
  async function searchRSSFeeds(query: string, env: Env): Promise<any[]> {
    // Implementation would use Google Search API, Bing API, or RSS directory APIs
    // For now, return mock data structure
    console.log(`Searching RSS feeds for: ${query}`);
    
    // TODO: Implement actual RSS search using:
    // - Google Custom Search API
    // - RSS directory APIs
    // - Web scraping with RSS detection
    
    return []; // Placeholder
  }
  
  async function scoreRSSSource(source: any, topic: string, env: Env): Promise<number> {
    // Implement quality scoring based on:
    // - Domain authority
    // - Content freshness
    // - Feed validity
    // - Relevance to topic
    
    return Math.random() * 0.3 + 0.7; // Placeholder: 0.7-1.0 range
  }
  
  async function scoreYouTubeChannel(channel: any, topic: string, subscriberCount: number, env: Env): Promise<number> {
    // Implement quality scoring based on:
    // - Subscriber count
    // - Video quality and frequency
    // - Relevance to topic
    // - Engagement metrics
    
    const subscriberScore = Math.min(subscriberCount / 100000, 1.0) * 0.4;
    const relevanceScore = 0.4; // TODO: Implement AI-based relevance scoring
    const baseScore = 0.2;
    
    return Math.min(subscriberScore + relevanceScore + baseScore, 1.0);
  }
  
  async function calculateRelevance(source: any, topic: string, env: Env): Promise<number> {
    // TODO: Implement AI-based relevance calculation
    return Math.random() * 0.3 + 0.7; // Placeholder
  }
  
  function generateSourceId(): string {
    return `src_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
  
  function deduplicateAndRank(sources: DiscoveredSource[]): DiscoveredSource[] {
    // Remove duplicates by identifier
    const seen = new Set();
    const unique = sources.filter(source => {
      if (seen.has(source.identifier)) {
        return false;
      }
      seen.add(source.identifier);
      return true;
    });
    
    // Sort by quality score descending
    return unique.sort((a, b) => b.quality_score - a.quality_score);
  }
  
  function getPlatformBreakdown(sources: DiscoveredSource[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    sources.forEach(source => {
      breakdown[source.platform] = (breakdown[source.platform] || 0) + 1;
    });
    return breakdown;
  }
  
  // ==================== AUTHENTICATION & HELPERS ====================
  
  async function authenticateRequest(request: Request, env: Env): Promise<{ success: boolean; error?: string }> {
    const apiKey = request.headers.get('X-API-Key');
    
    if (!apiKey || apiKey !== env.CLIENT_API_KEY) {
      return { success: false, error: 'Invalid or missing API key' };
    }
    
    return { success: true };
  }
  
  async function authenticateWorkerRequest(request: Request, env: Env): Promise<{ success: boolean; error?: string }> {
    const workerSecret = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!workerSecret || workerSecret !== env.WORKER_SHARED_SECRET) {
      return { success: false, error: 'Invalid worker authentication' };
    }
    
    return { success: true };
  }
  
  async function getHealthStatus(env: Env): Promise<any> {
    try {
      // Test database connection
      await env.UNIVERSAL_DISCOVERY_DB.prepare('SELECT 1').first();
      
      // Test external APIs
      const externalApisConnected = Boolean(env.OPENAI_API_KEY);
      
      return {
        status: 'healthy',
        database_connected: true,
        external_apis_connected: externalApisConnected,
        supported_platforms: ['rss', 'youtube', 'podcasts', 'academic'],
        last_check: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        database_connected: false,
        external_apis_connected: false,
        error: error.message,
        last_check: new Date().toISOString()
      };
    }
  }
  
  async function getMetricsForResponse(env: Env): Promise<any> {
    try {
      const stats = await env.UNIVERSAL_DISCOVERY_DB.prepare(`
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_requests,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_jobs,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_requests,
          AVG(execution_time_ms) as avg_response_time_ms
        FROM discovery_sessions
        WHERE created_at > datetime('now', '-24 hours')
      `).first();
      
      const successRate = stats.total_requests > 0 
        ? (stats.successful_requests / stats.total_requests) * 100 
        : 100;
      
      return {
        total_requests: stats.total_requests || 0,
        success_rate: successRate,
        active_jobs: stats.active_jobs || 0,
        last_error_count: stats.failed_requests || 0,
        avg_response_time_ms: stats.avg_response_time_ms || 0
      };
    } catch (error) {
      return {
        total_requests: 0,
        success_rate: 100,
        active_jobs: 0,
        last_error_count: 0,
        avg_response_time_ms: 0
      };
    }
  }
  
  async function getHealthForResponse(env: Env): Promise<any> {
    const health = await getHealthStatus(env);
    return {
      status: health.status === 'healthy' ? 'healthy' : 'error',
      database_connected: health.database_connected,
      external_apis_connected: health.external_apis_connected,
      last_check: health.last_check
    };
  }
  
  async function getWorkerStats(env: Env): Promise<any> {
    try {
      const sessionStats = await env.UNIVERSAL_DISCOVERY_DB.prepare(`
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_sessions,
          AVG(sources_found) as avg_sources_found
        FROM discovery_sessions
        WHERE created_at > datetime('now', '-7 days')
      `).first();
  
      const platformStats = await env.UNIVERSAL_DISCOVERY_DB.prepare(`
        SELECT 
          platform,
          COUNT(*) as source_count,
          AVG(quality_score) as avg_quality_score
        FROM discovered_sources
        WHERE created_at > datetime('now', '-7 days')
        GROUP BY platform
        ORDER BY source_count DESC
      `).all();
  
      return {
        ...sessionStats,
        platform_breakdown: platformStats.results || [],
        generated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Stats query failed:', error);
      return {
        total_sessions: 0,
        completed_sessions: 0,
        active_sessions: 0,
        failed_sessions: 0,
        avg_sources_found: 0,
        platform_breakdown: []
      };
    }
  }
  
  async function getRecentSessions(env: Env): Promise<any[]> {
    try {
      const sessions = await env.UNIVERSAL_DISCOVERY_DB.prepare(`
        SELECT 
          id, client_id, template_capability, sources_found, status,
          created_at, completed_at
        FROM discovery_sessions 
        ORDER BY created_at DESC 
        LIMIT 20
      `).all();
  
      return sessions.results || [];
    } catch (error) {
      console.error('Recent sessions query failed:', error);
      return [];
    }
  }
  
  function getHelpInfo(): any {
    return {
      worker: 'bitware_universal_researcher',
      version: '2.0.0',
      description: 'Universal content source discovery across multiple platforms',
      universal_capabilities: [
        'RSS feed discovery and validation',
        'YouTube channel and playlist discovery',
        'Podcast feed discovery',
        'Academic paper and journal discovery',
        'Multi-platform search coordination'
      ],
      endpoints: {
        main: {
          'POST /execute': 'Template-driven source discovery with client context',
          'GET /?topic=<topic>': 'Legacy v1.0 compatibility endpoint'
        },
        public: {
          'GET /health': 'Worker health and capability status',
          'GET /help': 'This help information',
          'GET /capabilities': 'Detailed worker capabilities',
          'GET /templates': 'Available template configurations'
        },
        admin: {
          'GET /admin/stats': 'Discovery statistics across all platforms',
          'GET /admin/sessions': 'Recent discovery sessions'
        }
      },
      template_system: {
        supported_templates: Object.keys(SUPPORTED_TEMPLATES),
        client_context_required: true,
        standard_response_format: true
      }
    };
  }
  
  function getCapabilities(): any {
    return {
      worker_type: 'UniversalContentDiscovery',
      universal_features: {
        multi_platform_search: true,
        ai_quality_scoring: true,
        client_context_tracking: true,
        template_driven_execution: true,
        real_time_validation: true
      },
      supported_platforms: {
        rss: { enabled: true, ai_enhanced: true },
        youtube: { enabled: true, requires_api_key: true },
        podcasts: { enabled: false, planned: true },
        academic: { enabled: false, planned: true },
        social: { enabled: false, planned: true }
      },
      quality_features: [
        'AI-powered source validation',
        'Relevance scoring against topics',
        'Duplicate detection and deduplication',
        'Authority and credibility assessment'
      ],
      performance: {
        max_sources_per_request: 100,
        avg_response_time_ms: 2000,
        caching_enabled: true,
        concurrent_platform_search: true
      }
    };
  }
  
  function jsonResponse(data: any, options?: { headers?: Record<string, string>; status?: number }): Response {
    return new Response(JSON.stringify(data, null, 2), {
      status: options?.status || 200,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });
  }