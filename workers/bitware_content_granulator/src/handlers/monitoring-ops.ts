import { Env, AuthenticatedRequest } from '../types';
import { jsonResponse } from '../helpers/http';
import { DatabaseService } from '../services/database';

export async function handleHealthCheck(env: Env): Promise<Response> {
  return jsonResponse({
    status: 'healthy',
    service: 'bitware-content-granulator',
    version: env.VERSION || '1.0.0',
    timestamp: new Date().toISOString()
  });
}

export async function handleDetailedHealth(env: Env): Promise<Response> {
  const checks = {
    database: false,
    openai: false,
    kv: false,
    r2: false
  };

  // Check database
  try {
    const db = new DatabaseService(env);
    await db.getTemplates();
    checks.database = true;
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  // Check OpenAI
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}` }
    });
    checks.openai = response.ok;
  } catch (error) {
    console.error('OpenAI health check failed:', error);
  }

  // Check KV
  try {
    await env.TEMPLATE_CACHE.put('health-check', 'ok', { expirationTtl: 60 });
    const value = await env.TEMPLATE_CACHE.get('health-check');
    checks.kv = value === 'ok';
  } catch (error) {
    console.error('KV health check failed:', error);
  }

  // Check R2
  try {
    await env.STRUCTURE_STORAGE.put('health-check.txt', 'ok');
    const object = await env.STRUCTURE_STORAGE.get('health-check.txt');
    checks.r2 = object !== null;
    if (object) await env.STRUCTURE_STORAGE.delete('health-check.txt');
  } catch (error) {
    console.error('R2 health check failed:', error);
  }

  const allHealthy = Object.values(checks).every(check => check);

  return jsonResponse({
    status: allHealthy ? 'healthy' : 'degraded',
    service: 'bitware-content-granulator',
    version: env.VERSION || '1.0.0',
    checks,
    capabilities: {
      structureTypes: ['course', 'quiz', 'novel', 'workflow', 'knowledge_map', 'learning_path'],
      granularityLevels: [1, 2, 3, 4, 5],
      validationLevels: [1, 2, 3],
      maxElementsPerJob: 500,
      supportedLanguages: ['en'],
      aiModel: 'gpt-4o-mini'
    },
    timestamp: new Date().toISOString()
  }, allHealthy ? 200 : 503);
}

export async function handleHelp(env: Env): Promise<Response> {
  return jsonResponse({
    worker: 'bitware-content-granulator',
    version: env.VERSION || '1.0.0',
    description: 'AI-powered content granulation into structured knowledge components',
    endpoints: {
      public: ['/', '/health', '/help'],
      templates: ['/api/templates', '/api/templates/{name}'],
      granulation: [
        '/api/granulate',
        '/api/granulate/quiz',
        '/api/granulate/novel',
        '/api/granulate/workflow'
      ],
      jobs: ['/api/jobs/{id}', '/api/jobs/{id}/status'],
      validation: ['/api/validate', '/api/validation/history'],
      handshake: ['/api/handshake', '/api/process', '/api/acknowledge', '/api/progress/{id}'],
      admin: ['/api/admin/stats', '/api/admin/templates', '/api/admin/analytics']
    },
    authentication: {
      client: 'X-API-Key header',
      worker: 'Bearer token + X-Worker-ID header',
      session: 'x-bitware-session-token header'
    },
    structureTypes: ['course', 'quiz', 'novel', 'workflow', 'knowledge_map', 'learning_path'],
    features: {
      aiPowered: true,
      validation: true,
      templateBased: true,
      progressTracking: true,
      orchestratorV2Compatible: true
    }
  });
}

export async function handleGetTemplates(env: Env, request: AuthenticatedRequest): Promise<Response> {
  try {
    const url = new URL(request.url);
    const structureType = url.searchParams.get('structure_type');
    
    const db = new DatabaseService(env);
    const templates = await db.getTemplates(structureType || undefined);
    
    return jsonResponse({
      templates: templates.map(t => ({
        name: t.template_name || t.templateName,
        structureType: t.structure_type || t.structureType,
        complexityLevel: t.complexity_level || t.complexityLevel,
        targetAudience: t.target_audience || t.targetAudience,
        usageCount: t.usage_count || t.usageCount,
        description: `${t.structure_type || t.structureType} template for ${t.target_audience || t.targetAudience || 'general audience'}`
      })),
      total: templates.length
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return jsonResponse({ error: 'Failed to fetch templates' }, 500);
  }
}

export async function handleGetTemplate(env: Env, templateName: string, request: AuthenticatedRequest): Promise<Response> {
  try {
    const db = new DatabaseService(env);
    const template = await db.getTemplate(templateName);
    
    if (!template) {
      return jsonResponse({ error: 'Template not found' }, 404);
    }
    
    return jsonResponse({
      template: {
        name: template.template_name || template.templateName,
        structureType: template.structure_type || template.structureType,
        complexityLevel: template.complexity_level || template.complexityLevel,
        targetAudience: template.target_audience || template.targetAudience,
        schema: JSON.parse(template.template_schema || template.templateSchema),
        validationRules: template.validation_rules || template.validationRules ? JSON.parse(template.validation_rules || template.validationRules) : null,
        usageCount: template.usage_count || template.usageCount,
        createdAt: template.created_at || template.createdAt,
        aiPromptTemplate: template.ai_prompt_template || template.aiPromptTemplate
      }
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    return jsonResponse({ error: 'Failed to fetch template' }, 500);
  }
}