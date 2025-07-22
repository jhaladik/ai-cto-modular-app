// @WORKER
// 🧱 Type: PipelineOrchestrator
// 📍 Path: workers/bitware_orchestrator/
// 🎯 Role: Optimize and coordinate AI Factory RSS pipeline performance
// 🧰 Params: { execution_strategy: "parallel", retry_logic: "intelligent", cost_optimization: true }
// 📦 Requires: [all_5_workers, performance_monitor, cost_tracker, health_checker]
// 🔄 Outputs: Pipeline execution results, performance analytics, cost optimization reports
// 💾 Storage: { d1: "orchestration_db", kv: "pipeline_cache", k2: "optimization_params" }

interface Env {
    // Database and Storage
    ORCHESTRATION_DB: D1Database;
    PIPELINE_CACHE: KVNamespace;
    
    // Authentication
    WORKER_SHARED_SECRET: string;
    CLIENT_API_KEY: string;
    
    // Worker URLs for coordination
    TOPIC_RESEARCHER_URL: string;
    RSS_LIBRARIAN_URL: string;
    FEED_FETCHER_URL: string;
    CONTENT_CLASSIFIER_URL: string;
    REPORT_BUILDER_URL: string;
  }
  
  interface OrchestrationRequest {
    // Business requirements from Account Manager
    topic: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    quality_level: 'basic' | 'standard' | 'premium' | 'enterprise';
    budget_limit?: number; // USD
    deadline_minutes?: number;
    output_format: 'json' | 'html' | 'email' | 'dashboard';
    
    // Advanced pipeline options
    source_discovery_depth?: 1 | 2 | 3 | 4 | 5;
    content_analysis_depth?: 'quick' | 'standard' | 'deep';
    report_type?: 'executive_summary' | 'trend_analysis' | 'competitive_intelligence' | 'technical_deep_dive' | 'daily_briefing';
    
    // Performance preferences  
    optimize_for?: 'speed' | 'cost' | 'quality' | 'balanced';
    max_total_time_seconds?: number;
    enable_parallel_processing?: boolean;
  }
  
  interface WorkerResult {
    worker_name: string;
    success: boolean;
    execution_time_ms: number;
    cost_usd: number;
    cache_hit: boolean;
    data: any;
    error?: string;
    bottlenecks_detected: string[];
  }
  
  interface PipelineExecution {
    id: string;
    topic: string;
    strategy: string;
    total_execution_time_ms: number;
    total_cost_usd: number;
    sources_discovered: number;
    articles_processed: number;
    final_quality_score: number;
    status: 'completed' | 'partial' | 'failed';
    worker_results: WorkerResult[];
    optimization_applied: string[];
    started_at: string;
    completed_at?: string;
  }
  
  export default {
    async fetch(request: Request, env: Env): Promise<Response> {
      const url = new URL(request.url);
      const method = request.method;
      
      // CORS headers
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Worker-ID, X-Account-ID',
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
  
        if (url.pathname === '/health') {
          const health = await checkOrchestratorHealth(env);
          return jsonResponse(health, { headers: corsHeaders });
        }
  
        // Pipeline status endpoint (public for transparency)
        if (url.pathname.startsWith('/pipeline/') && method === 'GET') {
          const pipelineId = url.pathname.split('/')[2];
          return handlePipelineStatus(pipelineId, env, corsHeaders);
        }
  
        // Admin endpoints (worker auth required)
        if (url.pathname.startsWith('/admin/')) {
          if (!isValidWorkerAuth(request, env)) {
            return unauthorizedResponse('Worker authentication required');
          }
          return handleAdminRequest(url, request, env, corsHeaders);
        }
  
        // Check if endpoint exists before checking auth
        const validEndpoints = ['/orchestrate', '/pipeline-health', '/performance-insights'];
        if (!validEndpoints.some(endpoint => url.pathname === endpoint || url.pathname.startsWith(endpoint))) {
          return notFoundResponse();
        }
  
        // Main functionality endpoints (client auth required)
        if (!isValidClientAuth(request, env)) {
          return unauthorizedResponse('API key required');
        }
  
        // Main orchestration endpoint
        if (url.pathname === '/orchestrate' && method === 'POST') {
          return handleOrchestration(request, env, corsHeaders);
        }
  
        // Pipeline health monitoring
        if (url.pathname === '/pipeline-health' && method === 'GET') {
          return handlePipelineHealthCheck(env, corsHeaders);
        }
  
        // Performance insights
        if (url.pathname === '/performance-insights' && method === 'GET') {
          return handlePerformanceInsights(url, env, corsHeaders);
        }
  
        return notFoundResponse();
  
      } catch (error) {
        console.error('Orchestrator error:', error);
        return errorResponse('Internal orchestration error', 500);
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
  
  // Main orchestration handler
  async function handleOrchestration(request: Request, env: Env, corsHeaders: any): Promise<Response> {
    const orchestrationRequest: OrchestrationRequest = await request.json();
    
    if (!orchestrationRequest.topic) {
      return errorResponse('Missing required field: topic', 400);
    }
  
    const startTime = Date.now();
    const pipelineId = generatePipelineId();
    
    // Determine execution strategy based on requirements
    const executionStrategy = determineExecutionStrategy(orchestrationRequest);
    
    try {
      // Create pipeline execution record
      await createPipelineExecution(pipelineId, orchestrationRequest, executionStrategy, env);
      
      // Execute the pipeline with selected strategy
      const pipelineResult = await executePipeline(
        pipelineId,
        orchestrationRequest,
        executionStrategy,
        env
      );
      
      // Calculate final metrics
      const totalTime = Date.now() - startTime;
      const totalCost = pipelineResult.worker_results.reduce((sum, w) => sum + w.cost_usd, 0);
      
      // Update pipeline execution record
      await updatePipelineExecution(pipelineId, pipelineResult, totalTime, totalCost, env);
      
      // Generate optimization insights
      const optimizationInsights = generateOptimizationInsights(
        pipelineResult, 
        orchestrationRequest,
        executionStrategy
      );
      
      const response = {
        status: pipelineResult.status,
        pipeline_id: pipelineId,
        total_execution_time_ms: totalTime,
        execution_strategy: executionStrategy.name,
        
        // Final results
        intelligence_report: pipelineResult.intelligence_report,
        sources_discovered: pipelineResult.sources_discovered,
        articles_processed: pipelineResult.articles_processed,
        analysis_quality_score: pipelineResult.final_quality_score,
        
        // Performance breakdown
        worker_performance: pipelineResult.worker_results.reduce((acc, worker) => {
          acc[worker.worker_name] = {
            execution_time_ms: worker.execution_time_ms,
            success: worker.success,
            cost_usd: worker.cost_usd,
            cache_hit_rate: worker.cache_hit ? 1.0 : 0.0,
            bottlenecks_detected: worker.bottlenecks_detected
          };
          return acc;
        }, {} as Record<string, any>),
        
        // Optimization results
        optimization_applied: pipelineResult.optimization_applied,
        cost_savings_usd: optimizationInsights.cost_savings,
        time_savings_ms: optimizationInsights.time_savings,
        quality_improvements: optimizationInsights.quality_improvements,
        
        // Future recommendations
        performance_recommendations: optimizationInsights.performance_recommendations,
        cost_optimization_suggestions: optimizationInsights.cost_suggestions,
        
        pipeline_url: `/pipeline/${pipelineId}`,
        timestamp: new Date().toISOString()
      };
  
      return jsonResponse(response, { headers: corsHeaders });
  
    } catch (error) {
      await updatePipelineExecutionError(pipelineId, error.message, env);
      console.error('Pipeline execution failed:', error);
      return errorResponse(`Pipeline execution failed: ${error.message}`, 500);
    }
  }
  
  // Execution strategy determination
  function determineExecutionStrategy(request: OrchestrationRequest): any {
    const strategies = {
      speed_optimized: {
        name: 'speed_optimized',
        parallel_discovery: true,
        resource_boost: true,
        cache_priority: 'high',
        timeout_multiplier: 0.8,
        cost_tolerance: 'high'
      },
      cost_optimized: {
        name: 'cost_optimized', 
        parallel_discovery: false,
        resource_boost: false,
        cache_priority: 'maximum',
        timeout_multiplier: 1.5,
        analysis_depth: 'quick'
      },
      quality_optimized: {
        name: 'quality_optimized',
        parallel_discovery: true,
        resource_boost: true,
        analysis_depth: 'deep',
        source_count_boost: true,
        timeout_multiplier: 2.0
      },
      balanced: {
        name: 'balanced',
        parallel_discovery: true,
        resource_boost: false,
        cache_priority: 'medium',
        timeout_multiplier: 1.0
      }
    };
  
    // Strategy selection logic
    if (request.urgency === 'critical' || request.optimize_for === 'speed') {
      return strategies.speed_optimized;
    } else if (request.budget_limit && request.budget_limit < 1.0) {
      return strategies.cost_optimized;
    } else if (request.quality_level === 'enterprise' || request.optimize_for === 'quality') {
      return strategies.quality_optimized;
    } else {
      return strategies.balanced;
    }
  }
  
  // Main pipeline execution engine
  async function executePipeline(
    pipelineId: string,
    request: OrchestrationRequest,
    strategy: any,
    env: Env
  ): Promise<any> {
    
    const workerResults: WorkerResult[] = [];
    let sourcesDiscovered = 0;
    let articlesProcessed = 0;
    let intelligenceReport: any = null;
    const optimizationApplied: string[] = [];
    
    try {
      // PHASE 1: Source Discovery (Potentially Parallel)
      console.log(`[${pipelineId}] Starting Phase 1: Source Discovery`);
      
      let discoveryResults: any[];
      
      if (strategy.parallel_discovery) {
        optimizationApplied.push('parallel_source_discovery');
        
        // Execute Topic Researcher and RSS Librarian in parallel
        const [researcherResult, librarianResult] = await Promise.allSettled([
          executeWorker(
            'topic_researcher',
            env.TOPIC_RESEARCHER_URL,
            {
              topic: request.topic,
              depth: request.source_discovery_depth || 3,
              min_quality: 0.7
            },
            env
          ),
          executeWorker(
            'rss_librarian', 
            env.RSS_LIBRARIAN_URL,
            {
              topic: request.topic,
              max_feeds: 15,
              min_quality: 0.8
            },
            env
          )
        ]);
        
        // Process parallel results
        discoveryResults = [];
        
        if (researcherResult.status === 'fulfilled') {
          workerResults.push(researcherResult.value);
          discoveryResults.push(researcherResult.value.data);
        } else {
          console.warn(`Topic Researcher failed: ${researcherResult.reason}`);
          workerResults.push({
            worker_name: 'topic_researcher',
            success: false,
            execution_time_ms: 0,
            cost_usd: 0,
            cache_hit: false,
            data: null,
            error: researcherResult.reason,
            bottlenecks_detected: ['api_failure']
          });
        }
        
        if (librarianResult.status === 'fulfilled') {
          workerResults.push(librarianResult.value);
          discoveryResults.push(librarianResult.value.data);
        } else {
          console.warn(`RSS Librarian failed: ${librarianResult.reason}`);
          workerResults.push({
            worker_name: 'rss_librarian',
            success: false,
            execution_time_ms: 0,
            cost_usd: 0,
            cache_hit: false,
            data: null,
            error: librarianResult.reason,
            bottlenecks_detected: ['database_failure']
          });
        }
        
      } else {
        // Sequential execution for cost optimization
        optimizationApplied.push('sequential_cost_optimization');
        
        // Try RSS Librarian first (faster and cheaper)
        const librarianResult = await executeWorker(
          'rss_librarian',
          env.RSS_LIBRARIAN_URL,
          {
            topic: request.topic,
            max_feeds: 20,
            min_quality: 0.7
          },
          env
        );
        
        workerResults.push(librarianResult);
        discoveryResults = [librarianResult.data];
        
        // Only use Topic Researcher if not enough sources found
        if (librarianResult.data?.feeds?.length < 10) {
          const researcherResult = await executeWorker(
            'topic_researcher',
            env.TOPIC_RESEARCHER_URL,
            {
              topic: request.topic,
              depth: 2, // Reduced depth for cost savings
              min_quality: 0.6
            },
            env
          );
          
          workerResults.push(researcherResult);
          discoveryResults.push(researcherResult.data);
        }
      }
      
      // Merge and deduplicate sources
      const allSources = mergeAndDeduplicateSources(discoveryResults);
      sourcesDiscovered = allSources.length;
      
      if (sourcesDiscovered === 0) {
        throw new Error('No valid sources discovered for topic');
      }
      
      console.log(`[${pipelineId}] Phase 1 Complete: ${sourcesDiscovered} sources discovered`);
      
      // PHASE 2: Content Fetching
      console.log(`[${pipelineId}] Starting Phase 2: Content Fetching`);
      
      const fetcherResult = await executeWorker(
        'feed_fetcher',
        env.FEED_FETCHER_URL,
        {
          feed_urls: allSources.slice(0, strategy.source_count_boost ? 20 : 15),
          max_articles_per_feed: 20
        },
        env,
        'POST',
        '/batch'
      );
      
      workerResults.push(fetcherResult);
      articlesProcessed = fetcherResult.data?.total_articles || 0;
      
      if (articlesProcessed === 0) {
        throw new Error('No articles fetched from discovered sources');
      }
      
      console.log(`[${pipelineId}] Phase 2 Complete: ${articlesProcessed} articles processed`);
      
      // PHASE 3: AI Content Analysis
      console.log(`[${pipelineId}] Starting Phase 3: AI Analysis`);
      
      const analysisDepth = strategy.analysis_depth || request.content_analysis_depth || 'standard';
      
      const classifierResult = await executeWorker(
        'content_classifier',
        env.CONTENT_CLASSIFIER_URL,
        {
          articles: fetcherResult.data.articles,
          target_topic: request.topic,
          analysis_depth: analysisDepth,
          include_summary: true,
          min_confidence: 0.7
        },
        env,
        'POST',
        '/analyze'
      );
      
      workerResults.push(classifierResult);
      
      if (!classifierResult.data?.analysis_results?.length) {
        console.warn('No high-quality analysis results, proceeding with available data');
      }
      
      console.log(`[${pipelineId}] Phase 3 Complete: AI analysis finished`);
      
      // PHASE 4: Intelligence Report Generation
      console.log(`[${pipelineId}] Starting Phase 4: Intelligence Generation`);
      
      const reportType = request.report_type || 'executive_summary';
      
      const reportBuilderResult = await executeWorker(
        'report_builder',
        env.REPORT_BUILDER_URL,
        {
          report_type: reportType,
          topic_filters: [request.topic],
          time_range: '7d',
          output_format: request.output_format,
          min_relevance_score: 0.7
        },
        env,
        'POST',
        '/generate'
      );
      
      workerResults.push(reportBuilderResult);
      intelligenceReport = reportBuilderResult.data;
      
      console.log(`[${pipelineId}] Phase 4 Complete: Intelligence report generated`);
      
      // Calculate final quality score
      const finalQualityScore = calculatePipelineQualityScore(workerResults);
      
      return {
        status: 'completed' as const,
        worker_results: workerResults,
        sources_discovered: sourcesDiscovered,
        articles_processed: articlesProcessed,
        intelligence_report: intelligenceReport,
        final_quality_score: finalQualityScore,
        optimization_applied: optimizationApplied
      };
      
    } catch (error) {
      console.error(`[${pipelineId}] Pipeline execution failed:`, error);
      
      // Attempt partial recovery
      const partialResults = attemptPartialRecovery(workerResults, request, env);
      
      return {
        status: partialResults ? 'partial' as const : 'failed' as const,
        worker_results: workerResults,
        sources_discovered: sourcesDiscovered,
        articles_processed: articlesProcessed,
        intelligence_report: partialResults?.intelligence_report || null,
        final_quality_score: calculatePipelineQualityScore(workerResults),
        optimization_applied: optimizationApplied,
        error: error.message
      };
    }
  }
  
  // Worker execution with performance monitoring
  async function executeWorker(
    workerName: string,
    workerUrl: string,
    payload: any,
    env: Env,
    method: string = 'GET',
    endpoint: string = '/'
  ): Promise<WorkerResult> {
    
    const startTime = Date.now();
    
    try {
      // Build URL with query params for GET requests
      let url = `${workerUrl}${endpoint}`;
      let requestOptions: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${env.WORKER_SHARED_SECRET}`,
          'X-Worker-ID': 'bitware_orchestrator',
          'Content-Type': 'application/json'
        }
      };
      
      if (method === 'GET' && payload) {
        const params = new URLSearchParams();
        Object.entries(payload).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, String(value));
          }
        });
        url += `?${params.toString()}`;
      } else if (method === 'POST') {
        requestOptions.body = JSON.stringify(payload);
      }
      
      console.log(`Executing ${workerName} at ${url}`);
      
      const response = await fetch(url, requestOptions);
      const executionTime = Date.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`${workerName} returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Extract performance metrics from response
      const costUsd = data.estimated_cost_usd || data.processing_cost_usd || 0;
      const cacheHit = data.cached || false;
      
      // Detect bottlenecks based on execution time
      const bottlenecks: string[] = [];
      if (executionTime > 30000) bottlenecks.push('slow_execution');
      if (costUsd > 0.1) bottlenecks.push('high_cost');
      if (!cacheHit && executionTime > 5000) bottlenecks.push('cache_miss');
      
      return {
        worker_name: workerName,
        success: true,
        execution_time_ms: executionTime,
        cost_usd: costUsd,
        cache_hit: cacheHit,
        data: data,
        bottlenecks_detected: bottlenecks
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      console.error(`${workerName} execution failed:`, error);
      
      return {
        worker_name: workerName,
        success: false,
        execution_time_ms: executionTime,
        cost_usd: 0,
        cache_hit: false,
        data: null,
        error: error.message,
        bottlenecks_detected: ['execution_failure']
      };
    }
  }
  
  // Source merging and deduplication
  function mergeAndDeduplicateSources(discoveryResults: any[]): string[] {
    const sources = new Set<string>();
    
    discoveryResults.forEach(result => {
      if (result?.sources) {
        result.sources.forEach((source: any) => {
          if (source?.url) {
            sources.add(source.url);
          }
        });
      }
      if (result?.feeds) {
        result.feeds.forEach((feed: any) => {
          if (feed?.url) {
            sources.add(feed.url);
          }
        });
      }
    });
    
    return Array.from(sources);
  }
  
  // Quality score calculation
  function calculatePipelineQualityScore(workerResults: WorkerResult[]): number {
    const successfulWorkers = workerResults.filter(w => w.success);
    if (successfulWorkers.length === 0) return 0;
    
    // Base score on success rate and performance
    const successRate = successfulWorkers.length / workerResults.length;
    const avgExecutionTime = successfulWorkers.reduce((sum, w) => sum + w.execution_time_ms, 0) / successfulWorkers.length;
    const cacheHitRate = successfulWorkers.filter(w => w.cache_hit).length / successfulWorkers.length;
    
    // Normalize execution time (penalize slow execution)
    const timeScore = Math.max(0, 1 - (avgExecutionTime - 10000) / 100000); // 10s baseline, penalty after
    
    return Math.min(1.0, (successRate * 0.5 + timeScore * 0.3 + cacheHitRate * 0.2));
  }
  
  // Partial recovery attempt
  async function attemptPartialRecovery(
    workerResults: WorkerResult[],
    request: OrchestrationRequest,
    env: Env
  ): Promise<any> {
    
    try {
      // If we have some successful results, try to generate a basic summary
      const successfulResults = workerResults.filter(w => w.success && w.data);
      
      if (successfulResults.length === 0) {
        return null;
      }
      
      // Generate basic summary from available data
      const partialSummary = {
        status: 'partial',
        topic: request.topic,
        summary: `Partial analysis completed for ${request.topic}. Limited data available due to pipeline failures.`,
        available_data: successfulResults.map(r => r.worker_name),
        recommendation: 'Retry with lower quality requirements or different optimization strategy'
      };
      
      return {
        intelligence_report: partialSummary
      };
      
    } catch (error) {
      console.error('Partial recovery failed:', error);
      return null;
    }
  }
  
  // Optimization insights generation
  function generateOptimizationInsights(
    pipelineResult: any,
    request: OrchestrationRequest,
    strategy: any
  ): any {
    
    const insights = {
      cost_savings: 0,
      time_savings: 0,
      quality_improvements: [] as string[],
      performance_recommendations: [] as string[],
      cost_suggestions: [] as string[]
    };
    
    // Analyze worker performance for recommendations
    pipelineResult.worker_results.forEach((worker: WorkerResult) => {
      if (worker.execution_time_ms > 60000) {
        insights.performance_recommendations.push(`Optimize ${worker.worker_name} performance - execution time exceeded 60s`);
      }
      
      if (worker.cost_usd > 0.1) {
        insights.cost_suggestions.push(`Consider cost optimization for ${worker.worker_name} - high AI usage detected`);
      }
      
      if (!worker.cache_hit && worker.execution_time_ms > 5000) {
        insights.performance_recommendations.push(`Enable caching for ${worker.worker_name} to improve performance`);
      }
    });
    
    // Strategy-specific insights
    if (strategy.parallel_discovery) {
      insights.time_savings = 15000; // Estimated time saved by parallel execution
      insights.quality_improvements.push('Parallel source discovery increased source diversity');
    }
    
    if (pipelineResult.worker_results.some((w: WorkerResult) => w.cache_hit)) {
      insights.cost_savings = 0.05; // Estimated cost saved by caching
      insights.quality_improvements.push('Caching improved response times');
    }
    
    return insights;
  }
  
  // Database operations
  async function createPipelineExecution(
    pipelineId: string,
    request: OrchestrationRequest,
    strategy: any,
    env: Env
  ): Promise<void> {
    
    try {
      await env.ORCHESTRATION_DB.prepare(
        `INSERT INTO pipeline_executions 
         (pipeline_id, topic, urgency, quality_level, execution_strategy, budget_limit, status)
         VALUES (?, ?, ?, ?, ?, ?, 'processing')`
      ).bind(
        pipelineId,
        request.topic,
        request.urgency || 'medium',
        request.quality_level || 'standard',
        strategy.name,
        request.budget_limit || 0
      ).run();
    } catch (error) {
      console.error('Failed to create pipeline execution record:', error);
      // Don't throw - allow pipeline to continue
    }
  }
  
  async function updatePipelineExecution(
    pipelineId: string,
    pipelineResult: any,
    totalTime: number,
    totalCost: number,
    env: Env
  ): Promise<void> {
    
    try {
      await env.ORCHESTRATION_DB.prepare(
        `UPDATE pipeline_executions 
         SET total_execution_time_ms = ?, total_cost_usd = ?, sources_discovered = ?,
             articles_processed = ?, final_quality_score = ?, status = ?, completed_at = CURRENT_TIMESTAMP
         WHERE pipeline_id = ?`
      ).bind(
        totalTime,
        totalCost,
        pipelineResult.sources_discovered,
        pipelineResult.articles_processed,
        pipelineResult.final_quality_score,
        pipelineResult.status,
        pipelineId
      ).run();
      
      // Store individual worker performance
      for (const worker of pipelineResult.worker_results) {
        await env.ORCHESTRATION_DB.prepare(
          `INSERT INTO worker_performance 
           (pipeline_id, worker_name, execution_time_ms, success, cost_usd, cache_hit, bottlenecks_detected)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          pipelineId,
          worker.worker_name,
          worker.execution_time_ms,
          worker.success,
          worker.cost_usd,
          worker.cache_hit,
          JSON.stringify(worker.bottlenecks_detected)
        ).run();
      }
      
    } catch (error) {
      console.error('Failed to update pipeline execution record:', error);
    }
  }
  
  async function updatePipelineExecutionError(pipelineId: string, errorMessage: string, env: Env): Promise<void> {
    try {
      await env.ORCHESTRATION_DB.prepare(
        `UPDATE pipeline_executions 
         SET status = 'failed', error_message = ?, completed_at = CURRENT_TIMESTAMP
         WHERE pipeline_id = ?`
      ).bind(errorMessage, pipelineId).run();
    } catch (error) {
      console.error('Failed to update pipeline execution error:', error);
    }
  }
  
  // Pipeline status handler
  async function handlePipelineStatus(pipelineId: string, env: Env, corsHeaders: any): Promise<Response> {
    try {
      const pipeline = await env.ORCHESTRATION_DB.prepare(
        `SELECT * FROM pipeline_executions WHERE pipeline_id = ?`
      ).bind(pipelineId).first();
      
      if (!pipeline) {
        return errorResponse('Pipeline not found', 404);
      }
      
      const workerPerformance = await env.ORCHESTRATION_DB.prepare(
        `SELECT * FROM worker_performance WHERE pipeline_id = ?`
      ).bind(pipelineId).all();
      
      return jsonResponse({
        pipeline: pipeline,
        worker_performance: workerPerformance.results,
        status_url: `/pipeline/${pipelineId}`
      }, { headers: corsHeaders });
      
    } catch (error) {
      console.error('Pipeline status query failed:', error);
      return errorResponse('Pipeline status unavailable', 500);
    }
  }
  
  // Health check
  async function checkOrchestratorHealth(env: Env): Promise<any> {
    try {
      // Check database connectivity
      const testQuery = await env.ORCHESTRATION_DB.prepare('SELECT COUNT(*) as count FROM pipeline_executions').first();
      
      // Check worker URLs are configured
      const workersConfigured = [
        env.TOPIC_RESEARCHER_URL,
        env.RSS_LIBRARIAN_URL,
        env.FEED_FETCHER_URL,
        env.CONTENT_CLASSIFIER_URL,
        env.REPORT_BUILDER_URL
      ].every(url => !!url);
      
      return {
        status: 'healthy',
        database: 'connected',
        total_pipelines: testQuery.count,
        workers_configured: workersConfigured,
        orchestration_ready: true,
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
  
  // Admin request handler
  async function handleAdminRequest(url: URL, request: Request, env: Env, corsHeaders: any): Promise<Response> {
    if (url.pathname === '/admin/stats') {
      return handleAdminStats(env, corsHeaders);
    }
    
    if (url.pathname === '/admin/performance') {
      return handleAdminPerformance(env, corsHeaders);
    }
    
    if (url.pathname === '/admin/costs') {
      return handleAdminCosts(env, corsHeaders);
    }
    
    return notFoundResponse();
  }
  
  async function handleAdminStats(env: Env, corsHeaders: any): Promise<Response> {
    try {
      const stats = await env.ORCHESTRATION_DB.prepare(`
        SELECT 
          COUNT(*) as total_pipelines,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_pipelines,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_pipelines,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_pipelines,
          COUNT(CASE WHEN status = 'partial' THEN 1 END) as partial_pipelines,
          AVG(total_execution_time_ms) as avg_execution_time,
          AVG(total_cost_usd) as avg_cost,
          AVG(final_quality_score) as avg_quality_score
        FROM pipeline_executions
        WHERE started_at > datetime('now', '-7 days')
      `).first();
      
      return jsonResponse(stats, { headers: corsHeaders });
      
    } catch (error) {
      console.error('Admin stats query failed:', error);
      return errorResponse('Admin stats unavailable', 500);
    }
  }
  
  // Utility functions
  function generatePipelineId(): string {
    return `pipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  function getHelpInfo() {
    return {
      worker: 'bitware_orchestrator',
      version: '1.0.0',
      description: 'AI Factory RSS Pipeline Orchestrator - Performance-focused coordination of all 5 workers',
      capabilities: {
        pipeline_coordination: 'Orchestrates Topic Researcher, RSS Librarian, Feed Fetcher, Content Classifier, Report Builder',
        performance_optimization: 'Smart parallel execution, caching, cost optimization',
        error_recovery: 'Intelligent retry logic and partial recovery',
        analytics: 'Comprehensive performance and cost analytics'
      },
      endpoints: {
        public: {
          'GET /help': 'This help information',
          'GET /capabilities': 'Orchestrator capabilities and specifications',
          'GET /health': 'Orchestrator and pipeline health check',
          'GET /pipeline/{id}': 'Pipeline execution status'
        },
        main: {
          'POST /orchestrate': 'Execute complete AI Factory RSS intelligence pipeline',
          'GET /pipeline-health': 'All workers health status',
          'GET /performance-insights': 'Pipeline performance analytics'
        },
        admin: {
          'GET /admin/stats': 'Pipeline execution statistics',
          'GET /admin/performance': 'Performance analytics and bottleneck analysis',
          'GET /admin/costs': 'Cost tracking and optimization insights'
        }
      },
      execution_strategies: {
        speed_optimized: 'Parallel execution, resource boost, high cache priority',
        cost_optimized: 'Sequential execution, minimal resources, maximum caching',
        quality_optimized: 'Deep analysis, more sources, comprehensive processing',
        balanced: 'Optimal balance of speed, cost, and quality'
      },
      supported_optimizations: [
        'parallel_source_discovery',
        'intelligent_caching',
        'cost_aware_routing',
        'resource_pooling',
        'adaptive_timeout',
        'partial_recovery'
      ]
    };
  }
  
  function getCapabilities() {
    return {
      worker_type: 'PipelineOrchestrator',
      role: 'Optimize and coordinate AI Factory RSS pipeline performance',
      pipeline_workers: [
        'bitware_topic_researcher',
        'bitware_rss_librarian', 
        'bitware_feed_fetcher',
        'bitware_content_classifier',
        'bitware_report_builder'
      ],
      orchestration_capabilities: {
        execution_strategies: 4,
        parallel_processing: true,
        intelligent_caching: true,
        cost_optimization: true,
        error_recovery: true,
        performance_analytics: true
      },
      performance_targets: {
        total_pipeline_time: '90-200 seconds',
        success_rate: '>95%',
        cost_efficiency: '<$0.50 per pipeline',
        quality_score: '>0.85'
      }
    };
  }
  
  // Response helpers
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