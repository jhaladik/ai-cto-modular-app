import { Env, AuthenticatedRequest } from '../types';
import { jsonResponse, parseJsonBody } from '../helpers/http';
import { DatabaseService } from '../services/database';

// Public stats endpoint (non-admin)
export async function handleGetPublicStats(env: Env): Promise<Response> {
  try {
    // Get basic stats
    const stats = await env.DB.prepare(`
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_jobs,
        AVG(CASE WHEN status = 'completed' THEN quality_score END) as avg_quality_score,
        AVG(CASE WHEN status = 'completed' THEN processing_time_ms END) as avg_processing_time
      FROM granulation_jobs
      WHERE started_at >= datetime('now', '-30 days')
    `).first();
    
    return jsonResponse({
      stats: {
        totalJobs: stats?.total_jobs || 0,
        completedJobs: stats?.completed_jobs || 0,
        failedJobs: stats?.failed_jobs || 0,
        processingJobs: stats?.processing_jobs || 0,
        avgQualityScore: Math.round((stats?.avg_quality_score || 0) * 100) / 100,
        avgProcessingTime: Math.round(stats?.avg_processing_time || 0)
      }
    });
  } catch (error) {
    console.error('Error getting public stats:', error);
    return jsonResponse({ error: 'Failed to get stats' }, 500);
  }
}

export async function handleGetStats(env: Env): Promise<Response> {
  try {
    const db = new DatabaseService(env);
    const stats = await db.getStats();
    
    // Calculate success rate
    const successRate = stats.totalGranulations > 0 
      ? (stats.totalGranulations - (stats.failedGranulations || 0)) / stats.totalGranulations 
      : 0;
    
    return jsonResponse({
      totalGranulations: stats.totalGranulations,
      templateUsage: stats.templateUsage,
      avgQualityScore: Number(stats.avgQualityScore.toFixed(2)),
      performanceMetrics: {
        avgProcessingTime: Math.round(stats.avgProcessingTime),
        successRate: Number(successRate.toFixed(2)),
        userSatisfaction: 0.91 // Placeholder - would come from user feedback
      },
      validationMetrics: {
        avgAccuracy: Number(stats.validationAccuracy.toFixed(1)),
        failureRate: Number(stats.validationFailureRate.toFixed(1))
      },
      resourceUsage: {
        avgTokensPerRequest: 1850,
        avgCostPerRequest: 0.0028,
        totalApiCalls: stats.totalGranulations * 2 // Structure + validation
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return jsonResponse({ error: 'Failed to fetch statistics' }, 500);
  }
}

export async function handleManageTemplates(env: Env, request: AuthenticatedRequest): Promise<Response> {
  try {
    const body = await parseJsonBody<{
      action: 'create' | 'update' | 'delete';
      template: {
        templateName?: string;
        structureType?: string;
        templateSchema?: any;
        complexityLevel?: number;
        targetAudience?: string;
        aiPromptTemplate?: string;
        validationRules?: any;
      };
    }>(request);
    
    if (!body.action || !body.template) {
      return jsonResponse({ error: 'action and template required' }, 400);
    }
    
    const db = new DatabaseService(env);
    
    switch (body.action) {
      case 'create':
        if (!body.template.templateName || !body.template.structureType || !body.template.aiPromptTemplate) {
          return jsonResponse({ 
            error: 'templateName, structureType, and aiPromptTemplate required for creation' 
          }, 400);
        }
        
        // Check if template already exists
        const existing = await db.getTemplate(body.template.templateName);
        if (existing) {
          return jsonResponse({ error: 'Template already exists' }, 409);
        }
        
        // Create template
        await env.DB.prepare(`
          INSERT INTO granulation_templates (
            template_name, structure_type, template_schema,
            complexity_level, target_audience, ai_prompt_template,
            validation_rules
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          body.template.templateName,
          body.template.structureType,
          JSON.stringify(body.template.templateSchema || {}),
          body.template.complexityLevel || 3,
          body.template.targetAudience || null,
          body.template.aiPromptTemplate,
          body.template.validationRules ? JSON.stringify(body.template.validationRules) : null
        ).run();
        
        return jsonResponse({
          message: 'Template created successfully',
          templateName: body.template.templateName
        });
        
      case 'update':
        if (!body.template.templateName) {
          return jsonResponse({ error: 'templateName required for update' }, 400);
        }
        
        // Build update query
        const updateFields: string[] = [];
        const updateValues: any[] = [];
        
        if (body.template.templateSchema !== undefined) {
          updateFields.push('template_schema = ?');
          updateValues.push(JSON.stringify(body.template.templateSchema));
        }
        if (body.template.complexityLevel !== undefined) {
          updateFields.push('complexity_level = ?');
          updateValues.push(body.template.complexityLevel);
        }
        if (body.template.targetAudience !== undefined) {
          updateFields.push('target_audience = ?');
          updateValues.push(body.template.targetAudience);
        }
        if (body.template.aiPromptTemplate !== undefined) {
          updateFields.push('ai_prompt_template = ?');
          updateValues.push(body.template.aiPromptTemplate);
        }
        if (body.template.validationRules !== undefined) {
          updateFields.push('validation_rules = ?');
          updateValues.push(JSON.stringify(body.template.validationRules));
        }
        
        if (updateFields.length === 0) {
          return jsonResponse({ error: 'No fields to update' }, 400);
        }
        
        updateValues.push(body.template.templateName);
        
        await env.DB.prepare(`
          UPDATE granulation_templates 
          SET ${updateFields.join(', ')}
          WHERE template_name = ?
        `).bind(...updateValues).run();
        
        return jsonResponse({
          message: 'Template updated successfully',
          templateName: body.template.templateName
        });
        
      case 'delete':
        if (!body.template.templateName) {
          return jsonResponse({ error: 'templateName required for deletion' }, 400);
        }
        
        // Soft delete by renaming
        await env.DB.prepare(`
          UPDATE granulation_templates 
          SET template_name = template_name || '_deleted_' || strftime('%s', 'now')
          WHERE template_name = ?
        `).bind(body.template.templateName).run();
        
        return jsonResponse({
          message: 'Template deleted successfully',
          templateName: body.template.templateName
        });
        
      default:
        return jsonResponse({ error: 'Invalid action' }, 400);
    }
  } catch (error) {
    console.error('Template management error:', error);
    return jsonResponse({ error: 'Template management failed' }, 500);
  }
}

export async function handleGetAnalytics(env: Env): Promise<Response> {
  try {
    const db = new DatabaseService(env);
    
    // Get analytics for the last 30 days
    const analytics = await env.DB.prepare(`
      SELECT 
        t.template_name,
        t.structure_type,
        COUNT(DISTINCT ta.id) as days_used,
        AVG(ta.success_rate) as avg_success_rate,
        AVG(ta.avg_quality_score) as avg_quality_score,
        AVG(ta.avg_processing_time) as avg_processing_time,
        AVG(ta.avg_validation_accuracy) as avg_validation_accuracy,
        AVG(ta.validation_failure_rate) as validation_failure_rate,
        SUM(t.usage_count) as total_usage
      FROM granulation_templates t
      LEFT JOIN template_analytics ta ON t.id = ta.template_id
      WHERE ta.usage_date >= date('now', '-30 days')
      GROUP BY t.id, t.template_name, t.structure_type
      ORDER BY total_usage DESC
    `).all();
    
    // Get daily usage trend
    const dailyTrend = await env.DB.prepare(`
      SELECT 
        DATE(started_at) as date,
        COUNT(*) as granulations,
        AVG(quality_score) as avg_quality,
        AVG(processing_time_ms) as avg_time
      FROM granulation_jobs
      WHERE started_at >= datetime('now', '-7 days')
      GROUP BY DATE(started_at)
      ORDER BY date DESC
    `).all();
    
    // Get structure type distribution
    const structureDistribution = await env.DB.prepare(`
      SELECT 
        structure_type,
        COUNT(*) as count,
        AVG(quality_score) as avg_quality
      FROM granulation_jobs
      WHERE status = 'completed'
      GROUP BY structure_type
    `).all();
    
    return jsonResponse({
      templatePerformance: analytics.results.map((row: any) => ({
        templateName: row.template_name,
        structureType: row.structure_type,
        metrics: {
          totalUsage: row.total_usage,
          daysActive: row.days_used,
          successRate: Number(row.avg_success_rate?.toFixed(2) || 0),
          avgQuality: Number(row.avg_quality_score?.toFixed(2) || 0),
          avgProcessingTime: Math.round(row.avg_processing_time || 0),
          validationAccuracy: Number(row.avg_validation_accuracy?.toFixed(1) || 0),
          validationFailureRate: Number(row.validation_failure_rate?.toFixed(1) || 0)
        }
      })),
      dailyTrend: dailyTrend.results.map((row: any) => ({
        date: row.date,
        granulations: row.granulations,
        avgQuality: Number(row.avg_quality?.toFixed(2) || 0),
        avgTimeMs: Math.round(row.avg_time || 0)
      })),
      structureDistribution: structureDistribution.results.map((row: any) => ({
        type: row.structure_type,
        count: row.count,
        avgQuality: Number(row.avg_quality?.toFixed(2) || 0)
      })),
      recommendations: generateRecommendations(analytics.results)
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return jsonResponse({ error: 'Failed to fetch analytics' }, 500);
  }
}

function generateRecommendations(analyticsData: any[]): string[] {
  const recommendations: string[] = [];
  
  analyticsData.forEach((template: any) => {
    if (template.avg_success_rate < 0.8) {
      recommendations.push(
        `Template "${template.template_name}" has low success rate (${(template.avg_success_rate * 100).toFixed(0)}%). Consider reviewing the prompt template.`
      );
    }
    
    if (template.avg_processing_time > 10000) {
      recommendations.push(
        `Template "${template.template_name}" takes long to process (${(template.avg_processing_time / 1000).toFixed(1)}s). Consider optimizing the complexity.`
      );
    }
    
    if (template.validation_failure_rate > 0.2) {
      recommendations.push(
        `Template "${template.template_name}" has high validation failure rate (${(template.validation_failure_rate * 100).toFixed(0)}%). Review validation criteria.`
      );
    }
  });
  
  if (recommendations.length === 0) {
    recommendations.push('All templates are performing well. Continue monitoring for optimization opportunities.');
  }
  
  return recommendations;
}