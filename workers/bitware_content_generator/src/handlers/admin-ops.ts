import { Env, AuthenticatedRequest } from '../types';
import { jsonResponse, getNumericQueryParam } from '../helpers/http';
import { DatabaseService } from '../services/database';

export async function handleGetStats(
  env: Env,
  request: AuthenticatedRequest
): Promise<Response> {
  try {
    const db = new DatabaseService(env);
    
    // Get overall statistics
    const [jobStats, recentAnalytics] = await Promise.all([
      env.DB.prepare(`
        SELECT 
          COUNT(*) as total_jobs,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_jobs,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_jobs,
          SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as active_jobs,
          SUM(total_words) as total_words_generated,
          SUM(tokens_used) as total_tokens_used,
          SUM(cost_usd) as total_cost,
          AVG(quality_score) as avg_quality_score,
          AVG(processing_time_ms) as avg_processing_time
        FROM generation_jobs
        WHERE created_at > datetime('now', '-30 days')
      `).first(),
      db.getAnalytics(7)
    ]);

    // Get template usage stats
    const templateStats = await env.DB.prepare(`
      SELECT 
        name,
        content_type,
        usage_count,
        avg_quality_score,
        avg_generation_time_ms
      FROM prompt_templates
      WHERE is_active = 1
      ORDER BY usage_count DESC
      LIMIT 10
    `).all();

    // Get structure type breakdown
    const structureStats = await env.DB.prepare(`
      SELECT 
        structure_type,
        COUNT(*) as count,
        AVG(total_words) as avg_words,
        AVG(quality_score) as avg_quality,
        AVG(cost_usd) as avg_cost
      FROM generation_jobs
      WHERE status = 'completed'
      GROUP BY structure_type
    `).all();

    return jsonResponse({
      overview: jobStats,
      recentTrends: recentAnalytics,
      topTemplates: templateStats.results,
      structureTypes: structureStats.results,
      capabilities: {
        maxConcurrentJobs: parseInt(env.MAX_CONCURRENT_GENERATIONS || '5'),
        defaultModel: env.DEFAULT_MODEL || 'gpt-4o-mini',
        qualityThreshold: parseInt(env.QUALITY_THRESHOLD || '75'),
      },
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    return jsonResponse({ error: 'Failed to get statistics' }, 500);
  }
}

export async function handleGetAnalytics(
  env: Env,
  request: AuthenticatedRequest,
  url: URL
): Promise<Response> {
  try {
    const days = getNumericQueryParam(url, 'days', 7);
    
    const db = new DatabaseService(env);
    const analytics = await db.getAnalytics(days!);

    // Calculate trends
    const trends = calculateTrends(analytics);

    // Get provider breakdown for the period
    const providerStats = await env.DB.prepare(`
      SELECT 
        provider,
        model,
        COUNT(*) as usage_count,
        SUM(tokens_input + tokens_output) as total_tokens,
        SUM(cost_usd) as total_cost,
        AVG(latency_ms) as avg_latency,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate
      FROM ai_provider_usage
      WHERE created_at > datetime('now', '-' || ? || ' days')
      GROUP BY provider, model
      ORDER BY usage_count DESC
    `).bind(days).all();

    // Get quality distribution
    const qualityDistribution = await env.DB.prepare(`
      SELECT 
        CASE 
          WHEN quality_score >= 90 THEN 'excellent'
          WHEN quality_score >= 80 THEN 'good'
          WHEN quality_score >= 70 THEN 'acceptable'
          ELSE 'poor'
        END as quality_level,
        COUNT(*) as count
      FROM generation_jobs
      WHERE quality_score IS NOT NULL
        AND created_at > datetime('now', '-' || ? || ' days')
      GROUP BY quality_level
    `).bind(days).all();

    return jsonResponse({
      period: `${days} days`,
      dailyMetrics: analytics,
      trends,
      providerBreakdown: providerStats.results,
      qualityDistribution: qualityDistribution.results,
      summary: {
        totalJobs: analytics.reduce((sum: number, day: any) => sum + day.total_jobs, 0),
        totalWords: analytics.reduce((sum: number, day: any) => sum + day.total_words_generated, 0),
        totalCost: analytics.reduce((sum: number, day: any) => sum + day.total_cost_usd, 0),
        avgQuality: analytics.reduce((sum: number, day: any, _, arr: any[]) => 
          sum + day.avg_quality_score / arr.length, 0),
      },
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    return jsonResponse({ error: 'Failed to get analytics' }, 500);
  }
}

function calculateTrends(analytics: any[]): any {
  if (analytics.length < 2) {
    return {
      jobs: 0,
      words: 0,
      cost: 0,
      quality: 0,
    };
  }

  const recent = analytics[0];
  const previous = analytics[analytics.length - 1];

  return {
    jobs: calculatePercentageChange(recent.total_jobs, previous.total_jobs),
    words: calculatePercentageChange(recent.total_words_generated, previous.total_words_generated),
    cost: calculatePercentageChange(recent.total_cost_usd, previous.total_cost_usd),
    quality: calculatePercentageChange(recent.avg_quality_score, previous.avg_quality_score),
  };
}

function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}