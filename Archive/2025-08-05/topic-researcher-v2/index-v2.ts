// @WORKER v2.0 - Orchestrator 2.0 Compatible
// 🧱 Type: ContentDiscoverer
// 📍 Path: workers/bitware_topic_researcher/
// 🎯 Role: Discover and validate new RSS sources for topics using AI and web search
// 🔄 Supports: Orchestrator 2.0 Handshake Protocol

interface Env {
  // Database and Storage
  TOPIC_RESEARCH_DB: D1Database;
  RESEARCH_CACHE: KVNamespace;
  PROGRESS_CACHE: KVNamespace;
  RESULT_CACHE: KVNamespace;
  
  // Authentication
  WORKER_SHARED_SECRET: string;
  CLIENT_API_KEY: string;
  
  // External APIs
  OPENAI_API_KEY: string;
  
  // Orchestrator URL
  ORCHESTRATOR_URL?: string;
}

interface HandshakePacket {
  packet_id: string;
  execution_id: string;
  stage_id: string;
  input_ref: DataReference;
  parameters?: any;
}

interface DataReference {
  ref_id: string;
  storage_type: 'inline' | 'reference' | 'KV' | 'R2';
  storage_key?: string;
  inline_data?: any;
  size_bytes: number;
  expires_at?: string;
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
      // ============= ORCHESTRATOR 2.0 ENDPOINTS =============
      
      // Enhanced health check for Orchestrator 2.0
      if (url.pathname === '/health') {
        const health = await getEnhancedHealth(env);
        return jsonResponse(health, { headers: corsHeaders });
      }

      // Handshake endpoint - NEW
      if (url.pathname === '/api/handshake' && method === 'POST') {
        const packet = await request.json() as HandshakePacket;
        return handleHandshake(packet, env);
      }

      // Process endpoint with reference support - NEW
      if (url.pathname === '/api/process' && method === 'POST') {
        const packet = await request.json() as HandshakePacket;
        return handleProcess(packet, env);
      }

      // Progress reporting - NEW
      if (url.pathname.startsWith('/api/progress/')) {
        const packetId = url.pathname.split('/').pop();
        return getProgress(packetId!, env);
      }

      // Acknowledge endpoint - NEW
      if (url.pathname === '/api/acknowledge' && method === 'POST') {
        const data = await request.json();
        return handleAcknowledge(data, env);
      }

      // ============= LEGACY ENDPOINTS (Backward Compatible) =============
      
      if (url.pathname === '/help') {
        return jsonResponse(getHelpInfo(), { headers: corsHeaders });
      }

      if (url.pathname === '/capabilities') {
        return jsonResponse(getCapabilities(), { headers: corsHeaders });
      }

      // Legacy research endpoint
      if (url.pathname === '/api/research' && method === 'POST') {
        if (!authenticateRequest(request, env)) {
          return jsonResponse({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        const researchRequest = await request.json() as ResearchRequest;
        const results = await performResearch(researchRequest, env);
        return jsonResponse(results, { headers: corsHeaders });
      }

      return jsonResponse({ error: 'Not found' }, { status: 404, headers: corsHeaders });

    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500, headers: corsHeaders });
    }
  }
};

// ============= ORCHESTRATOR 2.0 HANDLERS =============

async function handleHandshake(packet: HandshakePacket, env: Env): Promise<Response> {
  try {
    // Validate we can process this input
    const canProcess = await validateInput(packet.input_ref);
    
    return jsonResponse({
      success: true,
      packet_id: packet.packet_id,
      worker_name: 'bitware_topic_researcher',
      status: canProcess ? 'ready' : 'incompatible',
      capabilities: {
        input_types: ['text', 'json', 'reference'],
        output_types: ['json', 'html'],
        max_processing_time_ms: 120000,
        supports_streaming: false,
        supports_checkpoints: true,
        protocol_version: '2.0'
      },
      resource_requirements: {
        min_memory_mb: 128,
        max_memory_mb: 512,
        estimated_cpu_ms: 5000,
        api_calls: {
          openai: 10,
          anthropic: 0
        }
      }
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      packet_id: packet.packet_id,
      error: error instanceof Error ? error.message : 'Handshake failed'
    }, { status: 500 });
  }
}

async function handleProcess(packet: HandshakePacket, env: Env): Promise<Response> {
  const startTime = Date.now();
  let tokenCount = 0;
  let apiCallCount = 0;

  try {
    // Report initial progress
    await reportProgress(packet.packet_id, 10, 'Starting topic research', env);

    // Retrieve input data from reference
    const inputData = await retrieveData(packet.input_ref, env);
    
    // Validate input is a ResearchRequest
    const researchRequest = inputData as ResearchRequest;
    if (!researchRequest.topic) {
      throw new Error('Invalid input: topic is required');
    }

    // Report research starting
    await reportProgress(packet.packet_id, 20, `Researching topic: ${researchRequest.topic}`, env);

    // Perform the actual research
    const results = await performResearch(researchRequest, env, async (progress, message) => {
      await reportProgress(packet.packet_id, 20 + (progress * 0.7), message, env);
    });

    // Count tokens and API calls (simplified)
    tokenCount = estimateTokens(JSON.stringify(results));
    apiCallCount = results.sources ? results.sources.length : 0;

    // Store result and get reference
    const outputRef = await storeResult(results, env);

    // Report completion
    await reportProgress(packet.packet_id, 100, 'Research completed', env);

    return jsonResponse({
      success: true,
      packet_id: packet.packet_id,
      output_ref: outputRef,
      metrics: {
        processing_time_ms: Date.now() - startTime,
        tokens_used: tokenCount,
        api_calls_made: apiCallCount,
        sources_found: results.sources?.length || 0,
        quality_sources: results.sources?.filter((s: any) => s.quality_score > 0.7).length || 0
      }
    });

  } catch (error) {
    await reportProgress(packet.packet_id, -1, `Error: ${error}`, env);
    
    return jsonResponse({
      success: false,
      packet_id: packet.packet_id,
      error: error instanceof Error ? error.message : 'Processing failed',
      metrics: {
        processing_time_ms: Date.now() - startTime,
        tokens_used: tokenCount,
        api_calls_made: apiCallCount
      }
    }, { status: 500 });
  }
}

async function getProgress(packetId: string, env: Env): Promise<Response> {
  const progress = await env.PROGRESS_CACHE?.get(`progress:${packetId}`);
  
  if (!progress) {
    return jsonResponse({
      stage: 'unknown',
      progress: 0,
      message: 'No progress data available'
    });
  }

  return jsonResponse(JSON.parse(progress));
}

async function handleAcknowledge(data: any, env: Env): Promise<Response> {
  const { packet_id, execution_id, success } = data;
  
  // Clean up progress data
  if (env.PROGRESS_CACHE) {
    await env.PROGRESS_CACHE.delete(`progress:${packet_id}`);
  }
  
  // Log acknowledgment
  console.log(`Acknowledged packet ${packet_id}: ${success ? 'success' : 'failure'}`);
  
  return jsonResponse({
    success: true,
    packet_id,
    acknowledged: true
  });
}

// ============= HELPER FUNCTIONS =============

async function validateInput(inputRef: DataReference): Promise<boolean> {
  // Check if we support this storage type
  if (!['inline', 'reference', 'KV', 'R2'].includes(inputRef.storage_type)) {
    return false;
  }
  
  // Check size limits
  if (inputRef.size_bytes > 10 * 1024 * 1024) { // 10MB limit
    return false;
  }
  
  return true;
}

async function retrieveData(inputRef: DataReference, env: Env): Promise<any> {
  if (inputRef.storage_type === 'inline') {
    return inputRef.inline_data;
  }
  
  if (inputRef.storage_type === 'reference' || inputRef.storage_type === 'KV') {
    // Try to fetch from our cache first
    if (env.RESULT_CACHE && inputRef.ref_id) {
      const cached = await env.RESULT_CACHE.get(inputRef.ref_id);
      if (cached) {
        return JSON.parse(cached);
      }
    }
    
    // Fetch from orchestrator
    if (env.ORCHESTRATOR_URL) {
      const response = await fetch(
        `${env.ORCHESTRATOR_URL}/api/data/${inputRef.ref_id}`,
        {
          headers: {
            'Authorization': `Bearer ${env.WORKER_SHARED_SECRET}`,
            'X-Worker-ID': 'bitware_topic_researcher'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch reference: ${inputRef.ref_id}`);
      }
      
      return await response.json();
    }
  }
  
  throw new Error(`Unsupported storage type: ${inputRef.storage_type}`);
}

async function storeResult(data: any, env: Env): Promise<DataReference> {
  const serialized = JSON.stringify(data);
  const sizeBytes = new TextEncoder().encode(serialized).length;
  
  // Small data: return inline
  if (sizeBytes < 1024) {
    return {
      ref_id: `ref_${Date.now()}`,
      storage_type: 'inline',
      inline_data: data,
      size_bytes: sizeBytes
    };
  }
  
  // Medium data: store in KV
  if (env.RESULT_CACHE && sizeBytes < 1024 * 1024) { // < 1MB
    const ref_id = `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await env.RESULT_CACHE.put(ref_id, serialized, {
      expirationTtl: 86400 // 24 hours
    });
    
    return {
      ref_id,
      storage_type: 'KV',
      storage_key: ref_id,
      size_bytes: sizeBytes,
      expires_at: new Date(Date.now() + 86400000).toISOString()
    };
  }
  
  // Large data: return reference for orchestrator to handle
  return {
    ref_id: `ref_${Date.now()}_large`,
    storage_type: 'reference',
    size_bytes: sizeBytes
  };
}

async function reportProgress(
  packetId: string, 
  progress: number, 
  message: string, 
  env: Env
): Promise<void> {
  if (!env.PROGRESS_CACHE) return;
  
  await env.PROGRESS_CACHE.put(
    `progress:${packetId}`,
    JSON.stringify({
      stage: progress < 0 ? 'error' : progress >= 100 ? 'completed' : 'processing',
      progress: Math.max(0, Math.min(100, progress)),
      message,
      timestamp: new Date().toISOString()
    }),
    { expirationTtl: 3600 } // 1 hour
  );
}

async function getEnhancedHealth(env: Env): Promise<any> {
  // Initialize database if needed
  await initializeDatabase(env);
  
  // Get basic stats
  const stats = await getWorkerStats(env);
  
  return {
    status: 'healthy',
    service: 'bitware_topic_researcher',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    capabilities: {
      protocol_version: '2.0',
      supports_handshake: true,
      supports_references: true,
      supports_checkpoints: true,
      supports_progress: true,
      input_types: ['text', 'json', 'reference'],
      output_types: ['json', 'html'],
      max_processing_time_ms: 120000,
      supports_streaming: false
    },
    resources: {
      current_load: stats.currentLoad || 0,
      queue_length: stats.queueLength || 0,
      avg_processing_time_ms: stats.avgProcessingTime || 60000,
      total_sessions: stats.totalSessions || 0,
      cache_hit_rate: stats.cacheHitRate || 0
    }
  };
}

// ============= LEGACY FUNCTIONS (Keep for backward compatibility) =============

async function performResearch(
  request: ResearchRequest, 
  env: Env,
  progressCallback?: (progress: number, message: string) => Promise<void>
): Promise<any> {
  const startTime = Date.now();
  const topic = request.topic;
  const depth = request.depth || 3;
  const minQuality = request.min_quality || 0.7;
  const maxSources = request.max_sources || 10;
  
  if (progressCallback) {
    await progressCallback(0, 'Starting research');
  }

  // Check cache first
  const cacheKey = `research:${topic}:${depth}:${minQuality}`;
  const cached = await env.RESEARCH_CACHE?.get(cacheKey);
  
  if (cached) {
    const cachedData = JSON.parse(cached);
    if (Date.now() - cachedData.timestamp < 3600000) { // 1 hour cache
      if (progressCallback) {
        await progressCallback(100, 'Retrieved from cache');
      }
      return cachedData.data;
    }
  }

  if (progressCallback) {
    await progressCallback(30, 'Searching for sources');
  }

  // Perform actual research (simplified for brevity)
  const sources: DiscoveredSource[] = [];
  
  // Mock research process
  const mockSources = [
    {
      url: `https://example.com/rss/${topic}`,
      domain: 'example.com',
      title: `${topic} News Feed`,
      description: `Latest updates on ${topic}`,
      quality_score: 0.85,
      validation_status: 'valid',
      discovery_method: 'ai_search',
      reasoning: 'High-quality source with regular updates'
    }
  ];

  for (const source of mockSources) {
    if (progressCallback) {
      await progressCallback(50, `Validating ${source.domain}`);
    }
    
    // Validate and score
    source.quality_score = await scoreSourceQuality(source, topic, env);
    
    if (source.quality_score >= minQuality) {
      sources.push(source);
    }
    
    if (sources.length >= maxSources) break;
  }

  if (progressCallback) {
    await progressCallback(80, 'Storing results');
  }

  // Store session
  const sessionId = await storeResearchSession(
    topic,
    depth,
    sources.length,
    sources.filter(s => s.quality_score >= minQuality).length,
    Date.now() - startTime,
    false,
    sources.reduce((acc, s) => acc + s.quality_score, 0) / sources.length,
    minQuality,
    maxSources,
    env
  );

  // Store sources
  for (const source of sources) {
    await storeDiscoveredSource(sessionId, source, 0, 200, 'rss', env);
  }

  const result = {
    topic,
    sources,
    session_id: sessionId,
    research_time_ms: Date.now() - startTime,
    timestamp: new Date().toISOString()
  };

  // Cache result
  if (env.RESEARCH_CACHE) {
    await env.RESEARCH_CACHE.put(
      cacheKey,
      JSON.stringify({ data: result, timestamp: Date.now() }),
      { expirationTtl: 3600 }
    );
  }

  if (progressCallback) {
    await progressCallback(100, 'Research complete');
  }

  return result;
}

// ============= UTILITY FUNCTIONS =============

function jsonResponse(data: any, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers
    }
  });
}

function authenticateRequest(request: Request, env: Env): boolean {
  const apiKey = request.headers.get('X-API-Key');
  const workerId = request.headers.get('X-Worker-ID');
  const authHeader = request.headers.get('Authorization');
  
  // Worker authentication
  if (workerId && authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return token === env.WORKER_SHARED_SECRET;
  }
  
  // Client API key authentication
  return apiKey === env.CLIENT_API_KEY;
}

function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

async function initializeDatabase(env: Env): Promise<void> {
  // Database initialization logic here
  console.log('Database initialized');
}

async function getWorkerStats(env: Env): Promise<any> {
  // Get worker statistics from database
  try {
    const stats = await env.TOPIC_RESEARCH_DB.prepare(`
      SELECT 
        COUNT(*) as total_sessions,
        AVG(research_time_ms) as avg_processing_time,
        AVG(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hit_rate
      FROM research_sessions
      WHERE research_date > datetime('now', '-1 day')
    `).first();
    
    return {
      totalSessions: stats?.total_sessions || 0,
      avgProcessingTime: stats?.avg_processing_time || 60000,
      cacheHitRate: stats?.cache_hit_rate || 0,
      currentLoad: 0,
      queueLength: 0
    };
  } catch (error) {
    return {
      totalSessions: 0,
      avgProcessingTime: 60000,
      cacheHitRate: 0,
      currentLoad: 0,
      queueLength: 0
    };
  }
}

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
    return 0;
  }
}

async function storeDiscoveredSource(
  sessionId: number,
  source: DiscoveredSource,
  responseTimeMs: number,
  httpStatusCode: number,
  feedType: string,
  env: Env
): Promise<void> {
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
    console.error('Failed to store discovered source:', error);
  }
}

async function scoreSourceQuality(
  source: DiscoveredSource,
  topic: string,
  env: Env
): Promise<number> {
  // Simplified scoring - would use OpenAI in production
  return source.quality_score || 0.5;
}

function getHelpInfo(): any {
  return {
    service: 'Bitware Topic Researcher',
    version: '2.0.0',
    protocol: 'Orchestrator 2.0',
    endpoints: {
      '/health': 'Enhanced health check with capabilities',
      '/api/handshake': 'Initiate processing handshake',
      '/api/process': 'Process with reference data',
      '/api/progress/{packet_id}': 'Get processing progress',
      '/api/acknowledge': 'Acknowledge completion',
      '/api/research': 'Legacy research endpoint'
    }
  };
}

function getCapabilities(): any {
  return {
    protocol_version: '2.0',
    supports_handshake: true,
    supports_references: true,
    supports_checkpoints: true,
    supports_progress: true,
    input_types: ['text', 'json', 'reference'],
    output_types: ['json', 'html'],
    max_processing_time_ms: 120000,
    supports_streaming: false
  };
}