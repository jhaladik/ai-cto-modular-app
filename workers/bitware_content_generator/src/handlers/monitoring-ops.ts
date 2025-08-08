import { Env, AuthenticatedRequest, WorkerCapabilities } from '../types';
import { jsonResponse } from '../helpers/http';
import { DatabaseService } from '../services/database';

export async function handleHealthCheck(env: Env): Promise<Response> {
  return jsonResponse({
    status: 'healthy',
    worker: 'bitware-content-generator',
    version: env.VERSION || '1.0.0',
    environment: env.ENVIRONMENT || 'production',
    timestamp: new Date().toISOString(),
  });
}

export async function handleDetailedHealth(env: Env): Promise<Response> {
  const checks = {
    database: false,
    storage: false,
    aiProvider: false,
    services: false,
  };

  // Check database
  try {
    const db = new DatabaseService(env);
    const analytics = await db.getAnalytics(1);
    checks.database = true;
  } catch (error) {
    console.error('Database check failed:', error);
  }

  // Check KV storage
  try {
    await env.CONTENT_CACHE.put('health-check', 'ok', { expirationTtl: 60 });
    const value = await env.CONTENT_CACHE.get('health-check');
    checks.storage = value === 'ok';
  } catch (error) {
    console.error('Storage check failed:', error);
  }

  // Check AI provider (basic check)
  checks.aiProvider = !!(env.OPENAI_API_KEY || env.CLAUDE_API_KEY || env.AI);

  // Check service bindings
  checks.services = !!(env.KEY_ACCOUNT_MANAGER && env.CONTENT_GRANULATOR);

  const allHealthy = Object.values(checks).every(check => check);

  return jsonResponse({
    status: allHealthy ? 'healthy' : 'degraded',
    worker: 'bitware-content-generator',
    version: env.VERSION || '1.0.0',
    environment: env.ENVIRONMENT || 'production',
    checks,
    capabilities: getWorkerCapabilities(env),
    timestamp: new Date().toISOString(),
  }, allHealthy ? 200 : 503);
}

export async function handleHelp(env: Env): Promise<Response> {
  const capabilities = getWorkerCapabilities(env);
  
  const help = {
    worker: 'bitware-content-generator',
    version: env.VERSION || '1.0.0',
    description: 'AI-powered content generation worker that transforms structured outlines into complete content',
    capabilities,
    endpoints: [
      {
        path: 'GET /',
        description: 'Basic health check',
        auth: false,
      },
      {
        path: 'GET /health',
        description: 'Detailed health status with dependency checks',
        auth: false,
      },
      {
        path: 'GET /help',
        description: 'API documentation and capabilities',
        auth: false,
      },
      {
        path: 'POST /api/execute',
        description: 'Main content generation endpoint',
        auth: true,
        body: {
          action: 'generate',
          input: {
            granulatorJobId: 'number',
            topic: 'string',
            structureType: 'course|quiz|novel|workflow|knowledge_map|learning_path',
            structure: 'object',
            wordCountEstimates: 'object',
            contentMetadata: 'object',
          },
          config: {
            aiProvider: 'openai|claude|cloudflare',
            aiModel: 'string',
            temperature: 'number (0-1)',
            maxTokens: 'number',
            qualityValidation: 'boolean',
          },
        },
      },
      {
        path: 'GET /api/templates',
        description: 'List available prompt templates',
        auth: true,
        query: {
          content_type: 'string',
          structure_type: 'string',
        },
      },
      {
        path: 'GET /api/templates/{name}',
        description: 'Get specific template details',
        auth: true,
      },
      {
        path: 'GET /api/jobs',
        description: 'List generation jobs',
        auth: true,
        query: {
          status: 'pending|processing|completed|failed|cancelled',
          limit: 'number',
          offset: 'number',
        },
      },
      {
        path: 'GET /api/jobs/{id}',
        description: 'Get job details',
        auth: true,
      },
      {
        path: 'GET /api/jobs/{id}/status',
        description: 'Get job status and progress',
        auth: true,
      },
      {
        path: 'GET /api/jobs/{id}/content',
        description: 'Get generated content',
        auth: true,
      },
      {
        path: 'POST /api/jobs/{id}/retry',
        description: 'Retry failed job',
        auth: true,
      },
      {
        path: 'POST /api/jobs/{id}/cancel',
        description: 'Cancel in-progress job',
        auth: true,
      },
      {
        path: 'GET /api/stats',
        description: 'Get generation statistics',
        auth: true,
      },
      {
        path: 'GET /api/analytics',
        description: 'Get detailed analytics',
        auth: true,
        query: {
          days: 'number',
        },
      },
      {
        path: 'GET /api/economy/pricing',
        description: 'Get AI provider pricing information',
        auth: true,
      },
      {
        path: 'POST /api/economy/estimate',
        description: 'Estimate generation cost',
        auth: true,
        body: {
          provider: 'string',
          model: 'string',
          structureType: 'string',
          estimatedTokens: 'number',
        },
      },
      {
        path: 'GET /api/economy/stats',
        description: 'Get resource consumption statistics',
        auth: true,
        query: {
          days: 'number',
        },
      },
    ],
    authentication: {
      methods: [
        {
          type: 'API Key',
          header: 'X-API-Key',
          description: 'Client API key for external access',
        },
        {
          type: 'Worker Auth',
          headers: {
            'Authorization': 'Bearer {token}',
            'X-Worker-ID': '{worker-id}',
          },
          description: 'Worker-to-worker authentication',
        },
        {
          type: 'Session Token',
          header: 'x-bitware-session-token',
          description: 'Dashboard session authentication',
        },
      ],
    },
    examples: {
      generation: {
        description: 'Generate content from granulator output',
        request: {
          method: 'POST',
          path: '/api/execute',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'your-api-key',
          },
          body: {
            action: 'generate',
            input: {
              granulatorJobId: 123,
              topic: 'Introduction to Python',
              structureType: 'course',
              structure: '{ /* structure object */ }',
              wordCountEstimates: {
                total: 15000,
                bySection: {
                  lessonContent: 8000,
                  examples: 2000,
                  exercises: 2500,
                },
              },
              contentMetadata: {
                standardParameters: {
                  targetAudience: 'beginners',
                  language: 'en',
                  tone: 'educational',
                  style: 'engaging',
                },
              },
            },
          },
        },
      },
    },
  };

  return jsonResponse(help);
}

export async function handleListTemplates(
  env: Env,
  request: AuthenticatedRequest
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const contentType = url.searchParams.get('content_type');
    const structureType = url.searchParams.get('structure_type');

    const db = new DatabaseService(env);
    
    let templates;
    if (contentType) {
      templates = await db.getPromptTemplatesByType(contentType, structureType || undefined);
    } else {
      // Get all templates - simplified query for now
      const result = await env.DB.prepare(`
        SELECT * FROM prompt_templates WHERE is_active = 1
      `).all();
      templates = result.results;
    }

    return jsonResponse({
      templates,
      total: templates.length,
    });
  } catch (error) {
    console.error('Error listing templates:', error);
    return jsonResponse({ error: 'Failed to list templates' }, 500);
  }
}

export async function handleGetTemplate(
  env: Env,
  request: AuthenticatedRequest,
  name: string
): Promise<Response> {
  try {
    const db = new DatabaseService(env);
    const template = await db.getPromptTemplate(name);

    if (!template) {
      return jsonResponse({ error: 'Template not found' }, 404);
    }

    return jsonResponse({ template });
  } catch (error) {
    console.error('Error getting template:', error);
    return jsonResponse({ error: 'Failed to get template' }, 500);
  }
}

function getWorkerCapabilities(env: Env): WorkerCapabilities {
  return {
    actions: ['generate', 'validate', 'retry'],
    inputFormats: ['granulator_output', 'structured_json'],
    outputFormats: ['generated_content', 'structured_json'],
    aiProviders: [
      env.OPENAI_API_KEY ? 'openai' : null,
      env.CLAUDE_API_KEY ? 'claude' : null,
      env.AI ? 'cloudflare' : null,
    ].filter(Boolean) as string[],
    maxConcurrentJobs: parseInt(env.MAX_CONCURRENT_GENERATIONS || '5'),
    supportedLanguages: ['en'], // Can be extended
    supportedStructureTypes: [
      'course',
      'quiz',
      'novel',
      'workflow',
      'knowledge_map',
      'learning_path',
    ],
  };
}