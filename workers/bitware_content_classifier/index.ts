// @WORKER
// 🧱 Type: AIProcessor
// 📍 Path: workers/bitware_content_classifier/
// 🎯 Role: AI-powered content analysis, topic classification, and relevance scoring
// 🧰 Params: { llm_model: "gpt-4o-mini", batch_size: 10, confidence_threshold: 0.8 }
// 📦 Requires: [openai_api, d1_database, kv_cache]
// 🔄 Outputs: Classified articles with relevance scores, sentiment, and AI insights
// 💾 Storage: { d1: "content_analysis_db", kv: "analysis_cache", k2: "ai_params" }

interface Env {
    // Database and Storage
    CONTENT_ANALYSIS_DB: D1Database;
    ANALYSIS_CACHE: KVNamespace;
    
    // Authentication
    WORKER_SHARED_SECRET: string;
    CLIENT_API_KEY: string;
    
    // External APIs
    OPENAI_API_KEY: string;
  }
  
  interface AnalysisRequest {
    articles: Article[];
    target_topic: string;
    analysis_depth?: 'quick' | 'standard' | 'deep';
    include_summary?: boolean;
    batch_process?: boolean;
    min_confidence?: number;
  }
  
  interface Article {
    article_url: string;
    title: string;
    content: string;
    author?: string;
    pub_date: string;
    source_feed: string;
    word_count: number;
  }
  
  interface ArticleAnalysis {
    article_url: string;
    target_topic: string;
    relevance_score: number;
    confidence_score: number;
    sentiment_score: number;
    detected_topics: string[];
    key_entities: string[];
    quality_score: number;
    summary: string;
    reasoning: string;
    tokens_used: number;
    analyzed_at: string;
  }
  
  interface AnalysisJob {
    id: number;
    target_topic: string;
    analysis_depth: string;
    articles_submitted: number;
    articles_processed: number;
    avg_relevance_score: number;
    processing_cost_usd: number;
    started_at: string;
    completed_at?: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
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
  
        // Health check endpoint
        if (url.pathname === '/health') {
          const health = await checkWorkerHealth(env);
          return jsonResponse(health, { headers: corsHeaders });
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
  
        // Main analysis endpoints
        if (url.pathname === '/analyze' && method === 'POST') {
          return handleAnalysisRequest(request, env, corsHeaders);
        }
  
        if (url.pathname === '/analyze/single' && method === 'POST') {
          return handleSingleAnalysis(request, env, corsHeaders);
        }
  
        if (url.pathname === '/analyze/batch' && method === 'POST') {
          return handleBatchAnalysis(request, env, corsHeaders);
        }
  
        if (url.pathname === '/results' && method === 'GET') {
          return handleResultsQuery(url, env, corsHeaders);
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
  
  // Main analysis handler
  async function handleAnalysisRequest(request: Request, env: Env, corsHeaders: any): Promise<Response> {
    const analysisRequest: AnalysisRequest = await request.json();
    
    // Validate request
    if (!analysisRequest.articles || !analysisRequest.target_topic) {
      return errorResponse('Missing required fields: articles and target_topic', 400);
    }
  
    const {
      articles,
      target_topic,
      analysis_depth = 'standard',
      include_summary = true,
      batch_process = true,
      min_confidence = 0.7
    } = analysisRequest;
  
    // Check cache first
    const cacheKey = `analysis:${target_topic}:${articles.map(a => a.article_url).join(',').slice(0, 100)}`;
    const cached = await env.ANALYSIS_CACHE.get(cacheKey);
    if (cached) {
      const result = JSON.parse(cached);
      result.cached = true;
      return jsonResponse(result, { headers: corsHeaders });
    }
  
    const startTime = Date.now();
  
    try {
      // Create analysis job
      const jobResult = await env.CONTENT_ANALYSIS_DB.prepare(
        `INSERT INTO analysis_jobs (target_topic, analysis_depth, articles_submitted, status) 
         VALUES (?, ?, ?, 'processing') RETURNING id`
      ).bind(target_topic, analysis_depth, articles.length).first();
  
      const jobId = jobResult.id;
  
      // Process articles
      const analysisResults = batch_process && articles.length > 1
        ? await processBatchAnalysis(articles, target_topic, analysis_depth, include_summary, env)
        : await processIndividualAnalysis(articles, target_topic, analysis_depth, include_summary, env);
  
      // Filter by confidence threshold
      const qualityResults = analysisResults.filter(result => result.confidence_score >= min_confidence);
  
      // Store results
      await storeAnalysisResults(jobId, analysisResults, env);
  
      // Calculate costs and update job
      const totalTokens = analysisResults.reduce((sum, result) => sum + result.tokens_used, 0);
      const estimatedCost = calculateOpenAICost(totalTokens, 'gpt-4o-mini');
      const avgRelevance = analysisResults.length > 0 
        ? analysisResults.reduce((sum, result) => sum + result.relevance_score, 0) / analysisResults.length
        : 0;
  
      await env.CONTENT_ANALYSIS_DB.prepare(
        `UPDATE analysis_jobs 
         SET articles_processed = ?, avg_relevance_score = ?, processing_cost_usd = ?, 
             status = 'completed', completed_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).bind(analysisResults.length, avgRelevance, estimatedCost, jobId).run();
  
      const response = {
        status: 'ok',
        job_id: jobId,
        target_topic,
        analysis_depth,
        articles_submitted: articles.length,
        articles_processed: analysisResults.length,
        quality_results: qualityResults.length,
        min_confidence_threshold: min_confidence,
        avg_relevance_score: avgRelevance,
        avg_confidence_score: analysisResults.length > 0 
          ? analysisResults.reduce((sum, r) => sum + r.confidence_score, 0) / analysisResults.length
          : 0,
        analysis_results: qualityResults.sort((a, b) => b.relevance_score - a.relevance_score),
        processing_time_ms: Date.now() - startTime,
        estimated_cost_usd: estimatedCost,
        cached: false,
        timestamp: new Date().toISOString()
      };
  
      // Cache for 2 hours
      await env.ANALYSIS_CACHE.put(cacheKey, JSON.stringify(response), { expirationTtl: 7200 });
  
      return jsonResponse(response, { headers: corsHeaders });
  
    } catch (error) {
      // Update job as failed
      if (jobResult?.id) {
        await env.CONTENT_ANALYSIS_DB.prepare(
          `UPDATE analysis_jobs SET status = 'failed', completed_at = CURRENT_TIMESTAMP WHERE id = ?`
        ).bind(jobResult.id).run();
      }
      
      console.error('Analysis failed:', error);
      throw error;
    }
  }
  
  // Batch processing for efficiency
  async function processBatchAnalysis(
    articles: Article[], 
    target_topic: string, 
    analysis_depth: string,
    include_summary: boolean,
    env: Env
  ): Promise<ArticleAnalysis[]> {
    
    const batchSize = analysis_depth === 'quick' ? 15 : analysis_depth === 'deep' ? 5 : 10;
    const results: ArticleAnalysis[] = [];
  
    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);
      const batchResults = await analyzeBatchWithAI(batch, target_topic, analysis_depth, include_summary, env);
      results.push(...batchResults);
      
      // Rate limiting to avoid overwhelming OpenAI
      if (i + batchSize < articles.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  
    return results;
  }
  
  // Individual processing for single articles or when batch fails
  async function processIndividualAnalysis(
    articles: Article[], 
    target_topic: string, 
    analysis_depth: string,
    include_summary: boolean,
    env: Env
  ): Promise<ArticleAnalysis[]> {
    
    const results: ArticleAnalysis[] = [];
  
    for (const article of articles) {
      try {
        const analysis = await analyzeSingleArticleWithAI(article, target_topic, analysis_depth, include_summary, env);
        results.push(analysis);
        
        // Rate limiting
        if (results.length < articles.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Individual analysis failed for ${article.article_url}:`, error);
        // Continue with other articles
      }
    }
  
    return results;
  }
  
  // AI Analysis Functions
  async function analyzeBatchWithAI(
    articles: Article[], 
    target_topic: string, 
    analysis_depth: string,
    include_summary: boolean,
    env: Env
  ): Promise<ArticleAnalysis[]> {
  
    const maxTokens = analysis_depth === 'quick' ? 1000 : analysis_depth === 'deep' ? 2500 : 1500;
    const summaryInstruction = include_summary ? "Include a concise summary (20-30 words)." : "No summary needed.";
  
    const prompt = `Analyze these ${articles.length} articles for relevance to the topic "${target_topic}".
  
  For each article, provide:
  - Relevance score (0.0-1.0): How relevant is this article to "${target_topic}"?
  - Confidence score (0.0-1.0): How confident are you in your relevance assessment?
  - Sentiment score (-1.0 to 1.0): Overall sentiment (-1=negative, 0=neutral, 1=positive)
  - Detected topics: Main topics/themes in the article (max 5)
  - Key entities: Important people, companies, technologies mentioned (max 5)
  - Quality score (0.0-1.0): Overall article quality and authority
  - Reasoning: Brief explanation of relevance score
  
  ${summaryInstruction}
  
  Articles to analyze:
  
  ${articles.map((article, index) => `
  ARTICLE ${index + 1}:
  URL: ${article.article_url}
  Title: ${article.title}
  Content: ${article.content.slice(0, 500)}...
  Source: ${article.source_feed}
  `).join('\n')}
  
  Respond ONLY with a JSON array of analysis objects:
  [
    {
      "article_url": "full_url_here",
      "relevance_score": 0.85,
      "confidence_score": 0.90,
      "sentiment_score": 0.2,
      "detected_topics": ["topic1", "topic2"],
      "key_entities": ["entity1", "entity2"],
      "quality_score": 0.80,
      "summary": "${include_summary ? 'Brief summary here' : ''}",
      "reasoning": "Explanation of relevance score"
    }
  ]
  
  DO NOT include any text outside the JSON array.`;
  
    try {
      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: maxTokens,
          temperature: 0.1,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });
  
      if (!aiResponse.ok) {
        throw new Error(`OpenAI API error: ${aiResponse.status}`);
      }
  
      const data = await aiResponse.json();
      
      if (!data?.choices?.[0]?.message?.content) {
        throw new Error('Invalid OpenAI response structure');
      }
  
      const responseText = data.choices[0].message.content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      let analysisResults;
      try {
        analysisResults = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Batch analysis JSON parse failed:', parseError, 'Response:', responseText.slice(0, 500));
        throw new Error('Failed to parse AI analysis results');
      }
  
      const tokensUsed = data.usage?.total_tokens || estimateTokens(prompt + responseText);
  
      // Add metadata to each result
      return analysisResults.map((result: any) => ({
        article_url: result.article_url,
        target_topic: target_topic,
        relevance_score: Math.max(0, Math.min(1, result.relevance_score || 0)),
        confidence_score: Math.max(0, Math.min(1, result.confidence_score || 0)),
        sentiment_score: Math.max(-1, Math.min(1, result.sentiment_score || 0)),
        detected_topics: Array.isArray(result.detected_topics) ? result.detected_topics.slice(0, 5) : [],
        key_entities: Array.isArray(result.key_entities) ? result.key_entities.slice(0, 5) : [],
        quality_score: Math.max(0, Math.min(1, result.quality_score || 0.5)),
        summary: result.summary || '',
        reasoning: result.reasoning || '',
        tokens_used: Math.ceil(tokensUsed / analysisResults.length),
        analyzed_at: new Date().toISOString()
      }));
  
    } catch (error) {
      console.error('Batch AI analysis failed:', error);
      // Fallback to individual analysis
      return processIndividualAnalysis(articles, target_topic, analysis_depth, include_summary, env);
    }
  }
  
  async function analyzeSingleArticleWithAI(
    article: Article, 
    target_topic: string, 
    analysis_depth: string,
    include_summary: boolean,
    env: Env
  ): Promise<ArticleAnalysis> {
  
    const maxTokens = analysis_depth === 'quick' ? 500 : analysis_depth === 'deep' ? 1000 : 750;
    const summaryInstruction = include_summary ? "Include a concise summary (20-30 words)." : "No summary needed.";
  
    const prompt = `Analyze this article for relevance to the topic "${target_topic}".
  
  Article:
  URL: ${article.article_url}
  Title: ${article.title}
  Content: ${article.content}
  Source: ${article.source_feed}
  Author: ${article.author || 'Unknown'}
  Published: ${article.pub_date}
  
  Provide analysis with:
  - Relevance score (0.0-1.0): How relevant is this to "${target_topic}"?
  - Confidence score (0.0-1.0): How confident are you in your assessment?
  - Sentiment score (-1.0 to 1.0): Overall sentiment
  - Detected topics: Main topics in the article (max 5)
  - Key entities: Important people, companies, technologies (max 5)
  - Quality score (0.0-1.0): Article quality and authority
  - Reasoning: Brief explanation of your relevance score
  
  ${summaryInstruction}
  
  Respond ONLY with a JSON object:
  {
    "relevance_score": 0.85,
    "confidence_score": 0.90,
    "sentiment_score": 0.2,
    "detected_topics": ["topic1", "topic2"],
    "key_entities": ["entity1", "entity2"],
    "quality_score": 0.80,
    "summary": "${include_summary ? 'Brief summary here' : ''}",
    "reasoning": "Explanation of relevance score"
  }
  
  DO NOT include any text outside the JSON object.`;
  
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: maxTokens,
        temperature: 0.1,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });
  
    if (!aiResponse.ok) {
      throw new Error(`OpenAI API error: ${aiResponse.status}`);
    }
  
    const data = await aiResponse.json();
    
    if (!data?.choices?.[0]?.message?.content) {
      throw new Error('Invalid OpenAI response structure');
    }
  
    const responseText = data.choices[0].message.content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Single analysis JSON parse failed:', parseError, 'Response:', responseText);
      throw new Error('Failed to parse AI analysis result');
    }
  
    const tokensUsed = data.usage?.total_tokens || estimateTokens(prompt + responseText);
  
    return {
      article_url: article.article_url,
      target_topic: target_topic,
      relevance_score: Math.max(0, Math.min(1, result.relevance_score || 0)),
      confidence_score: Math.max(0, Math.min(1, result.confidence_score || 0)),
      sentiment_score: Math.max(-1, Math.min(1, result.sentiment_score || 0)),
      detected_topics: Array.isArray(result.detected_topics) ? result.detected_topics.slice(0, 5) : [],
      key_entities: Array.isArray(result.key_entities) ? result.key_entities.slice(0, 5) : [],
      quality_score: Math.max(0, Math.min(1, result.quality_score || 0.5)),
      summary: result.summary || '',
      reasoning: result.reasoning || '',
      tokens_used: tokensUsed,
      analyzed_at: new Date().toISOString()
    };
  }
  
  // Store analysis results in database
  async function storeAnalysisResults(jobId: number, results: ArticleAnalysis[], env: Env): Promise<void> {
    for (const result of results) {
      await env.CONTENT_ANALYSIS_DB.prepare(
        `INSERT OR REPLACE INTO article_analysis 
         (job_id, article_url, target_topic, relevance_score, confidence_score, sentiment_score,
          detected_topics, key_entities, quality_score, summary, reasoning, tokens_used, analyzed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        jobId,
        result.article_url,
        result.target_topic,
        result.relevance_score,
        result.confidence_score,
        result.sentiment_score,
        JSON.stringify(result.detected_topics),
        JSON.stringify(result.key_entities),
        result.quality_score,
        result.summary,
        result.reasoning,
        result.tokens_used,
        result.analyzed_at
      ).run();
    }
  }
  
  // Admin handlers
  async function handleAdminRequest(url: URL, request: Request, env: Env, corsHeaders: any): Promise<Response> {
    if (url.pathname === '/admin/stats') {
      const stats = await getAnalysisStats(env);
      return jsonResponse(stats, { headers: corsHeaders });
    }
  
    if (url.pathname === '/admin/jobs') {
      const jobs = await getRecentJobs(env);
      return jsonResponse({ jobs }, { headers: corsHeaders });
    }
  
    if (url.pathname === '/admin/results') {
      const jobId = url.searchParams.get('job_id');
      const results = await getJobResults(jobId, env);
      return jsonResponse({ results }, { headers: corsHeaders });
    }
  
    if (url.pathname === '/admin/costs') {
      const costs = await getCostAnalysis(env);
      return jsonResponse(costs, { headers: corsHeaders });
    }
  
    return notFoundResponse();
  }
  
  // Handle single article analysis
  async function handleSingleAnalysis(request: Request, env: Env, corsHeaders: any): Promise<Response> {
    const { article, target_topic, analysis_depth = 'standard', include_summary = true } = await request.json();
    
    if (!article || !target_topic) {
      return errorResponse('Missing required fields: article and target_topic', 400);
    }
  
    try {
      const result = await analyzeSingleArticleWithAI([article], target_topic, analysis_depth, include_summary, env);
      
      return jsonResponse({
        status: 'ok',
        target_topic,
        analysis_result: result[0],
        processing_time_ms: Date.now() - Date.now(),
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders });
  
    } catch (error) {
      console.error('Single analysis failed:', error);
      return errorResponse('Analysis failed', 500);
    }
  }
  
  // Utility functions
  function calculateOpenAICost(tokens: number, model: string): number {
    // GPT-4o-mini pricing (approximate)
    const costPerToken = 0.00000015; // $0.15 per 1M tokens
    return tokens * costPerToken;
  }
  
  function estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
  
  async function checkWorkerHealth(env: Env) {
    try {
      // Test database connection
      const testQuery = await env.CONTENT_ANALYSIS_DB.prepare('SELECT COUNT(*) as count FROM analysis_jobs').first();
      
      return {
        status: 'healthy',
        database: 'connected',
        total_jobs: testQuery.count,
        openai_configured: !!env.OPENAI_API_KEY,
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
  
  // Database query functions
  async function getAnalysisStats(env: Env) {
    const stats = await env.CONTENT_ANALYSIS_DB.prepare(`
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_jobs,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
        AVG(articles_processed) as avg_articles_per_job,
        AVG(avg_relevance_score) as overall_avg_relevance,
        SUM(processing_cost_usd) as total_cost_usd
      FROM analysis_jobs
      WHERE started_at > datetime('now', '-7 days')
    `).first();
  
    const topTopics = await env.CONTENT_ANALYSIS_DB.prepare(`
      SELECT target_topic, COUNT(*) as analysis_count, AVG(avg_relevance_score) as avg_relevance
      FROM analysis_jobs 
      WHERE started_at > datetime('now', '-30 days') AND status = 'completed'
      GROUP BY target_topic
      ORDER BY analysis_count DESC
      LIMIT 10
    `).all();
  
    return {
      ...stats,
      top_topics: topTopics.results
    };
  }
  
  async function getRecentJobs(env: Env) {
    const jobs = await env.CONTENT_ANALYSIS_DB.prepare(`
      SELECT id, target_topic, analysis_depth, articles_submitted, articles_processed,
             avg_relevance_score, processing_cost_usd, status, started_at, completed_at
      FROM analysis_jobs 
      ORDER BY started_at DESC 
      LIMIT 20
    `).all();
  
    return jobs.results;
  }
  
  async function getJobResults(jobId: string, env: Env) {
    if (!jobId) return [];
    
    const results = await env.CONTENT_ANALYSIS_DB.prepare(`
      SELECT article_url, relevance_score, confidence_score, sentiment_score,
             detected_topics, key_entities, quality_score, summary, reasoning, analyzed_at
      FROM article_analysis 
      WHERE job_id = ?
      ORDER BY relevance_score DESC
    `).bind(jobId).all();
  
    return results.results.map(result => ({
      ...result,
      detected_topics: JSON.parse(result.detected_topics || '[]'),
      key_entities: JSON.parse(result.key_entities || '[]')
    }));
  }
  
  async function getCostAnalysis(env: Env) {
    const costStats = await env.CONTENT_ANALYSIS_DB.prepare(`
      SELECT 
        DATE(started_at) as date,
        COUNT(*) as jobs_count,
        SUM(articles_processed) as articles_processed,
        SUM(processing_cost_usd) as daily_cost,
        AVG(processing_cost_usd) as avg_cost_per_job
      FROM analysis_jobs
      WHERE started_at > datetime('now', '-30 days') AND status = 'completed'
      GROUP BY DATE(started_at)
      ORDER BY date DESC
      LIMIT 30
    `).all();
  
    const totalCosts = await env.CONTENT_ANALYSIS_DB.prepare(`
      SELECT 
        SUM(processing_cost_usd) as total_cost,
        SUM(articles_processed) as total_articles,
        AVG(processing_cost_usd / articles_processed) as avg_cost_per_article
      FROM analysis_jobs
      WHERE status = 'completed'
    `).first();
  
    return {
      daily_breakdown: costStats.results,
      totals: totalCosts
    };
  }
  
  // Response helpers
  function getHelpInfo() {
    return {
      worker: 'bitware_content_classifier',
      version: '1.0.0',
      description: 'AI-powered content analysis, topic classification, and relevance scoring',
      endpoints: {
        public: {
          'GET /help': 'This help information',
          'GET /capabilities': 'Worker capabilities and specifications',
          'GET /health': 'Worker health check'
        },
        main: {
          'POST /analyze': 'Analyze articles for relevance and insights',
          'POST /analyze/single': 'Analyze single article',
          'POST /analyze/batch': 'Batch analyze multiple articles',
          'GET /results?job_id=<id>': 'Get analysis results'
        },
        admin: {
          'GET /admin/stats': 'Analysis statistics',
          'GET /admin/jobs': 'Recent analysis jobs',
          'GET /admin/results?job_id=<id>': 'Detailed job results',
          'GET /admin/costs': 'Cost analysis and breakdown'
        }
      },
      analysis_capabilities: {
        relevance_scoring: '0.0-1.0 relevance to target topic',
        sentiment_analysis: '-1.0 to 1.0 sentiment scoring',
        topic_classification: 'Automatic topic detection',
        entity_extraction: 'Key people, companies, technologies',
        quality_assessment: 'Content quality and authority scoring',
        batch_processing: 'Efficient multi-article analysis'
      },
      ai_model: 'gpt-4o-mini via OpenAI API',
      performance: {
        single_article: '2-3 seconds',
        batch_processing: '30-60 seconds for 20 articles',
        cost_per_article: '$0.001-0.003 USD (estimated)'
      }
    };
  }
  
  function getCapabilities() {
    return {
      worker_type: 'AIProcessor',
      role: 'AI-powered content analysis, topic classification, and relevance scoring',
      input_format: {
        articles: 'Article[] (required)',
        target_topic: 'string (required)',
        analysis_depth: '"quick" | "standard" | "deep" (optional)',
        include_summary: 'boolean (optional)',
        batch_process: 'boolean (optional)',
        min_confidence: 'float 0.0-1.0 (optional)'
      },
      output_format: {
        status: 'string',
        job_id: 'number',
        target_topic: 'string',
        articles_processed: 'number',
        analysis_results: 'ArticleAnalysis[]',
        processing_time_ms: 'number',
        estimated_cost_usd: 'number'
      },
      analysis_outputs: {
        relevance_score: 'float 0.0-1.0',
        confidence_score: 'float 0.0-1.0',
        sentiment_score: 'float -1.0 to 1.0',
        detected_topics: 'string[]',
        key_entities: 'string[]',
        quality_score: 'float 0.0-1.0',
        summary: 'string',
        reasoning: 'string'
      },
      storage: {
        d1: 'content_analysis_db',
        kv: 'analysis_cache',
        k2: 'ai_params'
      },
      external_dependencies: ['openai_api'],
      ai_model: 'gpt-4o-mini',
      cost_optimization: {
        batch_processing: 'Groups articles for efficient AI calls',
        caching: '2-hour cache for identical analysis requests',
        rate_limiting: 'Prevents API overload and cost spikes'
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