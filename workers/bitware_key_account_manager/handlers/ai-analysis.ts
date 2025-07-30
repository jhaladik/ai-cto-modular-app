// handlers/ai-analysis.ts
// AI analysis and communication processing handlers

import { OpenAIService } from '../services/openai';
import { DatabaseService } from '../services/database';

// Helper function to create JSON response
function jsonResponse(data: any, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    ...init
  });
}

// Helper function to create error response
function errorResponse(error: string, status: number = 400) {
  return jsonResponse({ success: false, error }, { status });
}

// ==================== ANALYZE COMMUNICATION ====================
export async function handleAnalyzeCommunication(
  request: Request, 
  env: any, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json();
    const { content, client_id, client_email } = body;

    if (!content) {
      return errorResponse('Content is required for analysis');
    }

    // Validate content length
    if (content.length > 10000) {
      return errorResponse('Content too long. Maximum 10,000 characters allowed.');
    }

    const db = new DatabaseService(env.KEY_ACCOUNT_MANAGEMENT_DB);
    const aiService = new OpenAIService(env.OPENAI_API_KEY);

    // Get client context if provided
    let clientContext = null;
    if (client_id) {
      clientContext = await db.getClientById(client_id);
    } else if (client_email) {
      clientContext = await db.getClientByEmail(client_email);
    }

    // Perform AI analysis
    const analysis = await aiService.analyzeCommunication(content, clientContext);

    // Log communication if client is identified
    if (clientContext) {
      await db.logCommunication(
        clientContext.client_id,
        content,
        analysis.intent,
        analysis.sentiment
      );
    }

    return jsonResponse({
      success: true,
      analysis: {
        ...analysis,
        processed_at: new Date().toISOString(),
        client_identified: !!clientContext,
        client_tier: clientContext?.subscription_tier || null
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Analyze communication error:', error);
    return errorResponse('Failed to analyze communication', 500);
  }
}

// ==================== RECOMMEND TEMPLATE ====================
export async function handleRecommendTemplate(
  request: Request, 
  env: any, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json();
    const { analysis, client_id } = body;

    if (!analysis || !analysis.intent) {
      return errorResponse('Communication analysis is required');
    }

    const db = new DatabaseService(env.KEY_ACCOUNT_MANAGEMENT_DB);
    const aiService = new OpenAIService(env.OPENAI_API_KEY);

    // Get available templates
    const templates = await db.getTemplates();
    
    if (templates.length === 0) {
      return errorResponse('No templates available. Please sync templates first.');
    }

    // Get client context for budget checking
    let clientContext = null;
    if (client_id) {
      clientContext = await db.getClientById(client_id);
    }

    // Get AI recommendation
    const recommendation = await aiService.recommendTemplate(analysis, templates);

    // Check budget if client is known
    let budgetCheck = null;
    if (clientContext) {
      const remainingBudget = clientContext.monthly_budget_usd - clientContext.used_budget_current_month;
      budgetCheck = {
        approved: remainingBudget >= recommendation.estimated_cost,
        remaining_budget: remainingBudget,
        estimated_cost: recommendation.estimated_cost
      };
    }

    return jsonResponse({
      success: true,
      recommendation: {
        ...recommendation,
        budget_check: budgetCheck,
        generated_at: new Date().toISOString()
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Recommend template error:', error);
    return errorResponse('Failed to recommend template', 500);
  }
}

// ==================== GET TEMPLATES ====================
export async function handleGetTemplates(
  request: Request, 
  env: any, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const db = new DatabaseService(env.KEY_ACCOUNT_MANAGEMENT_DB);
    const templates = await db.getTemplates();

    // If no templates exist (table missing or empty), return defaults
    if (templates.length === 0) {
      const defaultTemplates = [
        {
          name: 'complete_intelligence_pipeline',
          data: {
            description: 'Full intelligence report with analysis',
            estimated_cost: 0.25,
            estimated_time: 180,
            capabilities: ['research', 'analysis', 'report_generation']
          },
          lastUpdated: new Date().toISOString()
        },
        {
          name: 'basic_research_pipeline',
          data: {
            description: 'Basic topic research and source discovery',
            estimated_cost: 0.10,
            estimated_time: 60,
            capabilities: ['research', 'source_discovery']
          },
          lastUpdated: new Date().toISOString()
        },
        {
          name: 'competitive_analysis_pipeline',
          data: {
            description: 'Focused competitive intelligence analysis',
            estimated_cost: 0.30,
            estimated_time: 240,
            capabilities: ['research', 'competitive_analysis', 'market_intelligence']
          },
          lastUpdated: new Date().toISOString()
        }
      ];

      return jsonResponse({
        success: true,
        templates: defaultTemplates,
        source: 'default_templates',
        message: 'Using default templates. Run /admin/sync-templates to load from orchestrator.'
      }, { headers: corsHeaders });
    }

    return jsonResponse({
      success: true,
      templates: templates,
      source: 'database'
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Get templates error:', error);
    return errorResponse('Failed to retrieve templates', 500);
  }
}

// ==================== CLASSIFY INTENT ====================
export async function handleClassifyIntent(
  request: Request, 
  env: any, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return errorResponse('Content is required for intent classification');
    }

    const aiService = new OpenAIService(env.OPENAI_API_KEY);
    const intent = await aiService.classifyIntent(content);

    return jsonResponse({
      success: true,
      intent: intent,
      classified_at: new Date().toISOString()
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Classify intent error:', error);
    return errorResponse('Failed to classify intent', 500);
  }
}

// ==================== SENTIMENT ANALYSIS ====================
export async function handleSentimentAnalysis(
  request: Request, 
  env: any, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return errorResponse('Content is required for sentiment analysis');
    }

    const aiService = new OpenAIService(env.OPENAI_API_KEY);
    
    // Quick sentiment analysis using the communication analysis method
    const analysis = await aiService.analyzeCommunication(content);

    return jsonResponse({
      success: true,
      sentiment: {
        score: analysis.sentiment,
        label: analysis.sentiment > 0.3 ? 'positive' : 
               analysis.sentiment < -0.3 ? 'negative' : 'neutral',
        confidence: analysis.confidence
      },
      analyzed_at: new Date().toISOString()
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return errorResponse('Failed to analyze sentiment', 500);
  }
}