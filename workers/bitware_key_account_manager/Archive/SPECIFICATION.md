// Enhanced Orchestrator with Key Account Manager Integration
// workers/bitware_orchestrator/index.ts - Additional KAM Integration

// ==================== ENHANCED INTERFACES ====================

interface ClientContext {
  client_id: string;
  request_id: string;
  subscription_tier: 'basic' | 'standard' | 'premium' | 'enterprise';
  monthly_budget_remaining: number;
  preferences: {
    communication_style: string;
    preferred_formats: string[];
    priority_topics: string[];
  };
}

interface EnhancedOrchestrationRequest {
  topic: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  quality_level?: 'basic' | 'standard' | 'premium' | 'enterprise';
  optimize_for?: 'speed' | 'cost' | 'quality' | 'balanced';
  
  // ✅ NEW: Client context integration
  client_context?: ClientContext;
  originated_from?: 'email' | 'dashboard' | 'api' | 'proactive_suggestion';
  
  // ✅ NEW: KAM-specific parameters
  personalization_level?: 'standard' | 'high' | 'enterprise';
  auto_deliver?: boolean;
  follow_up_schedule?: string;
}

interface Env {
  // Existing services
  ORCHESTRATION_DB: D1Database;
  PIPELINE_CACHE: KVNamespace;
  TOPIC_RESEARCHER: Fetcher;
  RSS_LIBRARIAN: Fetcher;
  FEED_FETCHER: Fetcher;
  CONTENT_CLASSIFIER: Fetcher;
  REPORT_BUILDER: Fetcher;
  
  // ✅ NEW: Key Account Manager integration
  KEY_ACCOUNT_MANAGER: Fetcher;
  
  // Authentication
  CLIENT_API_KEY: string;
  WORKER_SHARED_SECRET: string;
}

// ==================== ENHANCED ORCHESTRATION WITH KAM ====================

async function handleEnhancedOrchestration(request: Request, env: Env, corsHeaders: any): Promise<Response> {
  const orchestrationRequest: EnhancedOrchestrationRequest = await request.json();
  
  if (!orchestrationRequest.topic) {
    return errorResponse('Missing required field: topic', 400);
  }

  const startTime = Date.now();
  const pipelineId = `pipe_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  
  try {
    console.log(`🎯 Starting KAM-enhanced pipeline ${pipelineId} for topic: ${orchestrationRequest.topic}`);
    
    // ✅ NEW: Client context enrichment
    const clientContext = await enrichClientContext(orchestrationRequest, env);
    
    // ✅ NEW: Personalized execution strategy
    const strategy = await determinePersonalizedStrategy(orchestrationRequest, clientContext, env);
    
    console.log(`🧠 Using personalized strategy: ${strategy.name} for client tier: ${clientContext?.subscription_tier || 'unknown'}`);
    
    const workerResults: WorkerResult[] = [];
    let sourcesDiscovered = 0;
    let articlesProcessed = 0;
    
    // Check service bindings including KAM
    if (!env.TOPIC_RESEARCHER || !env.RSS_LIBRARIAN || !env.FEED_FETCHER || 
        !env.CONTENT_CLASSIFIER || !env.REPORT_BUILDER || !env.KEY_ACCOUNT_MANAGER) {
      throw new Error('Service bindings not configured (including Key Account Manager)');
    }

    // ✅ ENHANCED: Client-aware pipeline execution
    
    // Stage 1: Topic Research (with client preferences)
    const topicParams = await personalizeTopicResearch(orchestrationRequest, clientContext);
    const topicResult = await executeWorkerViaBinding(
      env.TOPIC_RESEARCHER, 'topic_researcher', '/', topicParams, env, 'GET'
    );
    workerResults.push(topicResult);
    
    if (!topicResult.success) {
      throw new Error(`Topic research failed: ${topicResult.error}`);
    }
    
    // Stage 2: RSS Source Discovery (with quality preferences)
    const rssParams = await personalizeRSSDiscovery(topicResult.data, clientContext);
    const rssResult = await executeWorkerViaBinding(
      env.RSS_LIBRARIAN, 'rss_librarian', '/', rssParams, env, 'GET'
    );
    workerResults.push(rssResult);
    sourcesDiscovered = rssResult.data?.sources_found || 0;
    
    // Stage 3: Feed Fetching (with content volume preferences)
    const feedParams = await personalizeFeedFetching(rssResult.data, clientContext);
    const feedResult = await executeWorkerViaBinding(
      env.FEED_FETCHER, 'feed_fetcher', '/', feedParams, env, 'GET'
    );
    workerResults.push(feedResult);
    articlesProcessed = feedResult.data?.articles_processed || 0;
    
    // Stage 4: Content Classification (with client interest analysis)
    const classificationParams = await personalizeContentClassification(feedResult.data, clientContext);
    const classificationResult = await executeWorkerViaBinding(
      env.CONTENT_CLASSIFIER, 'content_classifier', '/', classificationParams, env, 'POST'
    );
    workerResults.push(classificationResult);
    
    // Stage 5: Report Building (with personalized formatting)
    const reportParams = await personalizeReportBuilding(classificationResult.data, clientContext);
    const reportResult = await executeWorkerViaBinding(
      env.REPORT_BUILDER, 'report_builder', '/generate', reportParams, env, 'POST'
    );
    workerResults.push(reportResult);
    
    // ✅ NEW: Stage 6: KAM Client Management
    if (orchestrationRequest.client_context) {
      const kamParams = {
        client_id: orchestrationRequest.client_context.client_id,
        request_id: orchestrationRequest.client_context.request_id,
        pipeline_id: pipelineId,
        execution_results: workerResults,
        auto_deliver: orchestrationRequest.auto_deliver || false,
        follow_up_schedule: orchestrationRequest.follow_up_schedule
      };
      
      const kamResult = await executeWorkerViaBinding(
        env.KEY_ACCOUNT_MANAGER, 'key_account_manager', '/pipeline/complete', kamParams, env, 'POST'
      );
      workerResults.push(kamResult);
    }
    
    const endTime = Date.now();
    const totalExecutionTime = endTime - startTime;
    const totalCost = workerResults.reduce((sum, result) => sum + (result.cost_usd || 0), 0);
    
    // Calculate quality score with client preferences
    const qualityScore = await calculatePersonalizedQualityScore(workerResults, clientContext);
    
    // ✅ NEW: Enhanced performance tracking with client data
    await recordEnhancedPipelineExecution({
      pipeline_id: pipelineId,
      topic: orchestrationRequest.topic,
      client_context: orchestrationRequest.client_context,
      strategy: strategy.name,
      total_execution_time_ms: totalExecutionTime,
      total_cost_usd: totalCost,
      sources_discovered: sourcesDiscovered,
      articles_processed: articlesProcessed,
      final_quality_score: qualityScore,
      status: 'completed',
      worker_results: workerResults,
      optimization_applied: strategy.optimizations,
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date(endTime).toISOString()
    }, env);

    // ✅ NEW: Client-specific response format
    const response = await formatClientResponse({
      pipeline_id: pipelineId,
      status: 'completed',
      execution_strategy: strategy.name,
      total_execution_time_ms: totalExecutionTime,
      total_cost_usd: totalCost,
      sources_discovered: sourcesDiscovered,
      articles_processed: articlesProcessed,
      final_quality_score: qualityScore,
      worker_results: workerResults,
      client_context: orchestrationRequest.client_context
    }, clientContext);

    return jsonResponse(response, { headers: corsHeaders });

  } catch (error) {
    console.error(`Pipeline ${pipelineId} failed:`, error);
    
    // ✅ NEW: Client-aware error handling
    if (orchestrationRequest.client_context) {
      await notifyClientOfFailure(orchestrationRequest.client_context, error, env);
    }
    
    return errorResponse(`Pipeline execution failed: ${error.message}`, 500, corsHeaders);
  }
}

// ==================== CLIENT CONTEXT ENRICHMENT ====================

async function enrichClientContext(request: EnhancedOrchestrationRequest, env: Env): Promise<ClientContext | null> {
  if (!request.client_context) return null;
  
  try {
    // Get comprehensive client data from KAM
    const clientData = await env.KEY_ACCOUNT_MANAGER.fetch(`/client/context/${request.client_context.client_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.WORKER_SHARED_SECRET}`,
        'X-Worker-ID': 'orchestrator'
      }
    });
    
    if (!clientData.ok) return request.client_context;
    
    const enrichedData = await clientData.json();
    
    return {
      ...request.client_context,
      subscription_tier: enrichedData.subscription_tier,
      monthly_budget_remaining: enrichedData.budget_remaining,
      preferences: {
        communication_style: enrichedData.communication_style || 'professional',
        preferred_formats: enrichedData.preferred_formats || ['json'],
        priority_topics: enrichedData.priority_topics || []
      }
    };
    
  } catch (error) {
    console.warn('Failed to enrich client context:', error);
    return request.client_context;
  }
}

async function determinePersonalizedStrategy(request: EnhancedOrchestrationRequest, clientContext: ClientContext | null, env: Env) {
  if (!clientContext) {
    // Use standard strategy for non-client requests
    return getExecutionStrategy(request.optimize_for || 'balanced');
  }
  
  // ✅ Client-specific strategy optimization
  const tier = clientContext.subscription_tier;
  const budgetRemaining = clientContext.monthly_budget_remaining;
  
  if (tier === 'enterprise') {
    return {
      name: 'enterprise_optimized',
      timeout_ms: 600000, // 10 minutes
      parallel_processing: true,
      cache_aggressiveness: 'moderate',
      quality_threshold: 0.95,
      cost_limit: Math.min(budgetRemaining * 0.1, 5.0),
      optimizations: ['enterprise_quality', 'parallel_execution', 'comprehensive_analysis']
    };
  } else if (tier === 'premium') {
    return {
      name: 'premium_balanced',
      timeout_ms: 300000, // 5 minutes
      parallel_processing: true,
      cache_aggressiveness: 'balanced',
      quality_threshold: 0.90,
      cost_limit: Math.min(budgetRemaining * 0.15, 2.0),
      optimizations: ['premium_quality', 'smart_caching', 'optimized_routing']
    };
  } else {
    return {
      name: 'standard_efficient',
      timeout_ms: 180000, // 3 minutes
      parallel_processing: false,
      cache_aggressiveness: 'aggressive',
      quality_threshold: 0.80,
      cost_limit: Math.min(budgetRemaining * 0.2, 0.5),
      optimizations: ['cost_optimization', 'aggressive_caching', 'efficient_routing']
    };
  }
}

// ==================== PERSONALIZATION FUNCTIONS ====================

async function personalizeTopicResearch(request: EnhancedOrchestrationRequest, clientContext: ClientContext | null) {
  const baseParams = {
    topic: request.topic,
    quality_level: request.quality_level || 'standard'
  };
  
  if (!clientContext) return baseParams;
  
  return {
    ...baseParams,
    priority_areas: clientContext.preferences.priority_topics,
    analysis_depth: clientContext.subscription_tier === 'enterprise' ? 'comprehensive' : 'standard',
    include_competitive_intel: clientContext.subscription_tier !== 'basic'
  };
}

async function personalizeRSSDiscovery(topicData: any, clientContext: ClientContext | null) {
  const baseParams = {
    topics: topicData.research_angles || [topicData.topic],
    max_sources: 10
  };
  
  if (!clientContext) return baseParams;
  
  const maxSourcesByTier = {
    basic: 5,
    standard: 10,
    premium: 20,
    enterprise: 50
  };
  
  return {
    ...baseParams,
    max_sources: maxSourcesByTier[clientContext.subscription_tier] || 10,
    quality_threshold: clientContext.subscription_tier === 'enterprise' ? 0.9 : 0.7,
    include_specialized_sources: clientContext.subscription_tier !== 'basic'
  };
}

async function personalizeContentClassification(feedData: any, clientContext: ClientContext | null) {
  const baseParams = {
    articles: feedData.articles || [],
    analysis_type: 'relevance_scoring'
  };
  
  if (!clientContext) return baseParams;
  
  return {
    ...baseParams,
    personalization_context: {
      client_interests: clientContext.preferences.priority_topics,
      analysis_depth: clientContext.subscription_tier === 'enterprise' ? 'deep' : 'standard',
      include_sentiment: clientContext.subscription_tier !== 'basic',
      include_trends: clientContext.subscription_tier === 'enterprise'
    }
  };
}

async function personalizeReportBuilding(classificationData: any, clientContext: ClientContext | null) {
  const baseParams = {
    analyzed_articles: classificationData.analyzed_articles || [],
    report_type: 'executive_summary'
  };
  
  if (!clientContext) return baseParams;
  
  return {
    ...baseParams,
    output_format: clientContext.preferences.preferred_formats[0] || 'json',
    communication_style: clientContext.preferences.communication_style,
    detail_level: clientContext.subscription_tier === 'enterprise' ? 'comprehensive' : 'standard',
    include_visualizations: clientContext.subscription_tier !== 'basic',
    personalization: {
      company_context: true,
      industry_focus: true,
      executive_summary: clientContext.preferences.communication_style === 'executive'
    }
  };
}

// ==================== ENHANCED TRACKING ====================

async function recordEnhancedPipelineExecution(execution: any, env: Env) {
  // Store in orchestrator database with client context
  await env.ORCHESTRATION_DB.prepare(`
    INSERT INTO pipeline_executions (
      pipeline_id, topic, urgency, quality_level, budget_limit,
      execution_strategy, optimize_for, parallel_processing_enabled,
      total_execution_time_ms, total_cost_usd, sources_discovered,
      articles_processed, final_quality_score, status,
      started_at, completed_at, account_id, user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    execution.pipeline_id,
    execution.topic,
    execution.client_context?.urgency || 'medium',
    execution.client_context?.quality_level || 'standard',
    execution.client_context?.monthly_budget_remaining || 0.0,
    execution.strategy,
    execution.client_context?.optimize_for || 'balanced',
    true,
    execution.total_execution_time_ms,
    execution.total_cost_usd,
    execution.sources_discovered,
    execution.articles_processed,
    execution.final_quality_score,
    execution.status,
    execution.started_at,
    execution.completed_at,
    execution.client_context?.client_id || null,
    execution.client_context?.client_id || null
  ).run();

  // ✅ NEW: Also record in KAM for client tracking
  if (execution.client_context) {
    await env.KEY_ACCOUNT_MANAGER.fetch('/admin/record-execution', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.WORKER_SHARED_SECRET}`,
        'X-Worker-ID': 'orchestrator'
      },
      body: JSON.stringify({
        client_id: execution.client_context.client_id,
        pipeline_execution: execution
      })
    });
  }
}

async function formatClientResponse(response: any, clientContext: ClientContext | null) {
  if (!clientContext) return response;
  
  // ✅ Client-specific response formatting
  const clientResponse = {
    ...response,
    client_context: {
      client_id: clientContext.client_id,
      subscription_tier: clientContext.subscription_tier,
      personalization_applied: true
    },
    billing: {
      cost_charged: response.total_cost_usd,
      budget_remaining: Math.max(0, clientContext.monthly_budget_remaining - response.total_cost_usd)
    }
  };
  
  // Remove internal worker details for client response
  if (clientContext.subscription_tier === 'basic') {
    delete clientResponse.worker_results;
    clientResponse.summary = 'Processing completed successfully';
  }
  
  return clientResponse;
}

async function notifyClientOfFailure(clientContext: ClientContext, error: Error, env: Env) {
  try {
    await env.KEY_ACCOUNT_MANAGER.fetch('/communication/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.WORKER_SHARED_SECRET}`,
        'X-Worker-ID': 'orchestrator'
      },
      body: JSON.stringify({
        client_id: clientContext.client_id,
        notification_type: 'pipeline_failure',
        message: `Your intelligence request encountered an issue: ${error.message}. Our team has been notified and will assist you shortly.`,
        urgency: 'high'
      })
    });
  } catch (notificationError) {
    console.error('Failed to notify client of failure:', notificationError);
  }
}

async function calculatePersonalizedQualityScore(workerResults: WorkerResult[], clientContext: ClientContext | null): Promise<number> {
  const baseScore = workerResults.reduce((sum, result) => {
    return sum + (result.data?.quality_score || 0.8);
  }, 0) / workerResults.length;
  
  if (!clientContext) return baseScore;
  
  // ✅ Adjust quality score based on client expectations
  const tierMultipliers = {
    basic: 0.9,      // Lower expectations
    standard: 1.0,   // Baseline
    premium: 1.05,   // Higher standards
    enterprise: 1.1  // Highest standards
  };
  
  return Math.min(1.0, baseScore * (tierMultipliers[clientContext.subscription_tier] || 1.0));
}

// ==================== KAM WORKER HEALTH CHECK ====================

async function checkKAMHealth(env: Env): Promise<any> {
  try {
    const response = await env.KEY_ACCOUNT_MANAGER.fetch(new Request('https://internal/health'));
    if (response.ok) {
      const healthData = await response.json();
      return {
        status: 'online',
        response_time_ms: Date.now() - startTime,
        clients_managed: healthData.total_clients || 0,
        active_communications: healthData.active_communications || 0,
        pending_requests: healthData.pending_requests || 0
      };
    } else {
      return { status: 'error', error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { status: 'offline', error: error.message };
  }
}

// ==================== ENHANCED HEALTH CHECK ====================

async function handleEnhancedPipelineHealthCheck(env: Env, corsHeaders: any): Promise<Response> {
  try {
    const orchestratorHealth = await checkOrchestratorHealth(env);
    
    console.log('🎯 Using Service Bindings for enhanced health checks (including KAM)...');
    
    // Check all service bindings including KAM
    if (!env.TOPIC_RESEARCHER || !env.RSS_LIBRARIAN || !env.FEED_FETCHER || 
        !env.CONTENT_CLASSIFIER || !env.REPORT_BUILDER || !env.KEY_ACCOUNT_MANAGER) {
      return jsonResponse({
        status: 'error',
        message: 'Service bindings not configured (missing Key Account Manager)',
        workers: {},
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders, status: 500 });
    }
    
    // Enhanced worker health checks including KAM
    const workerHealthChecks = await Promise.allSettled([
      env.TOPIC_RESEARCHER.fetch(new Request('https://internal/health')),
      env.RSS_LIBRARIAN.fetch(new Request('https://internal/health')),
      env.FEED_FETCHER.fetch(new Request('https://internal/health')),
      env.CONTENT_CLASSIFIER.fetch(new Request('https://internal/health')),
      env.REPORT_BUILDER.fetch(new Request('https://internal/health')),
      env.KEY_ACCOUNT_MANAGER.fetch(new Request('https://internal/health')) // ✅ NEW
    ]);
    
    const workers = {
      topic_researcher: await processWorkerHealth(workerHealthChecks[0], 'topic_researcher'),
      rss_librarian: await processWorkerHealth(workerHealthChecks[1], 'rss_librarian'),
      feed_fetcher: await processWorkerHealth(workerHealthChecks[2], 'feed_fetcher'),
      content_classifier: await processWorkerHealth(workerHealthChecks[3], 'content_classifier'),
      report_builder: await processWorkerHealth(workerHealthChecks[4], 'report_builder'),
      key_account_manager: await processWorkerHealth(workerHealthChecks[5], 'key_account_manager') // ✅ NEW
    };
    
    const totalWorkers = Object.keys(workers).length;
    const onlineWorkers = Object.values(workers).filter((w: any) => w.status === 'online').length;
    
    const response = {
      status: onlineWorkers === totalWorkers ? 'healthy' : 
              onlineWorkers > totalWorkers * 0.5 ? 'degraded' : 'unhealthy',
      
      workers: workers,
      
      total_workers: totalWorkers,
      online_workers: onlineWorkers,
      offline_workers: totalWorkers - onlineWorkers,
      
      orchestrator: {
        status: orchestratorHealth.status,
        database: orchestratorHealth.database,
        cache: orchestratorHealth.cache,
        service_bindings: orchestratorHealth.service_bindings,
        total_pipelines: orchestratorHealth.total_pipelines,
        ready: orchestratorHealth.orchestration_ready
      },
      
      // ✅ NEW: KAM-specific health information
      client_management: {
        kam_status: workers.key_account_manager.status,
        total_clients: workers.key_account_manager.clients_managed || 0,
        active_communications: workers.key_account_manager.active_communications || 0,
        pending_requests: workers.key_account_manager.pending_requests || 0
      },
      
      communication_method: 'cloudflare_service_bindings_with_kam',
      timestamp: new Date().toISOString(),
      cache_ttl: 300
    };
    
    return jsonResponse(response, { headers: corsHeaders });
    
  } catch (error) {
    console.error('Enhanced service bindings health check failed:', error);
    
    return jsonResponse({
      status: 'error',
      workers: {},
      error: 'Enhanced health check system failure (KAM integration)',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders, status: 500 });
  }
}