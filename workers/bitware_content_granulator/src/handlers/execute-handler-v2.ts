import { Env, AuthenticatedRequest } from '../types';
import { jsonResponse, parseJsonBody } from '../helpers/http';
import { GranulatorServiceV2 } from '../services/granulator-v2';
import { StorageManager } from '../services/storage-manager';

interface ExecuteRequest {
  action: string;
  input: any;
  params?: any;
  config?: any;
  timeout?: number;
}

/**
 * Execute handler v2 - Uses generic structure approach
 */
export async function handleExecuteV2(env: Env, request: AuthenticatedRequest): Promise<Response> {
  try {
    const body = await parseJsonBody<ExecuteRequest>(request);
    
    // Extract request ID and client ID from headers
    const requestId = request.headers.get('X-Request-ID') || null;
    const clientId = request.headers.get('X-Client-ID') || null;
    
    // Handle different actions
    switch (body.action) {
      case 'granulate':
        return handleGranulateActionV2(env, body, clientId || undefined, requestId || undefined);
      
      case 'validate':
        return handleValidateAction(env, body);
      
      case 'process':
      default:
        // Default to granulate for backward compatibility
        return handleGranulateActionV2(env, body, clientId || undefined, requestId || undefined);
    }
  } catch (error) {
    console.error('Execute error:', error);
    return jsonResponse({ 
      error: error instanceof Error ? error.message : 'Execution failed',
      status: 'failed'
    }, 500);
  }
}

async function handleGranulateActionV2(
  env: Env, 
  request: ExecuteRequest, 
  clientId?: string, 
  executionId?: string
): Promise<Response> {
  try {
    console.log('Starting granulation v2 with request:', JSON.stringify(request));
    
    const granulator = new GranulatorServiceV2(env);
    const storage = new StorageManager(env);
    
    // Map input and params to granulation request format
    const granulationRequest = {
      topic: request.input?.topic || request.input?.description || 'Unknown Topic',
      structureType: request.params?.structureType || request.input?.structureType || 'generic',
      templateName: request.input?.templateName || determineTemplateName(request.input?.structureType),
      granularityLevel: request.input?.granularityLevel || 3,
      targetAudience: request.input?.targetAudience || 'general',
      constraints: {
        maxElements: request.input?.maxElements || request.config?.maxElements || 100
      },
      validation: {
        enabled: request.config?.validation !== false,
        level: request.config?.validationLevel || 2,
        threshold: request.config?.validationThreshold || 85
      },
      // AI configuration from config or params
      aiConfig: request.config?.aiProvider ? {
        provider: request.config.aiProvider,
        model: request.config.aiModel,
        temperature: request.config.temperature,
        maxTokens: request.config.maxTokens,
        systemPrompt: request.config.systemPrompt
      } : request.params?.aiConfig
    };
    
    // Perform granulation
    const result = await granulator.granulate(
      granulationRequest, 
      clientId, 
      executionId
    );
    
    // Store structure if large
    const structureSize = JSON.stringify(result.structure).length;
    const storageInfo = await storage.storeStructure(
      result.jobId, 
      result.structure, 
      structureSize
    );
    
    // Return response in Resource Manager expected format
    const response: any = {
      success: true,
      output: {
        jobId: result.jobId,
        topic: granulationRequest.topic,
        structureType: granulationRequest.structureType,
        structure: result.structure, // Always include the generic structure
        summary: {
          totalElements: result.structure.summary?.totalElements || 0,
          levels: result.structure.summary?.levelCounts || {},
          qualityScore: result.qualityScore
        },
        readyForContentGeneration: true
      },
      usage: {
        tokens: {
          input: result.summary?.tokensUsed?.input || 0,
          output: result.summary?.tokensUsed?.output || 0
        }
      },
      duration: result.processingTimeMs,
      metadata: {
        validationEnabled: granulationRequest.validation.enabled,
        accuracyPercentage: result.validationResult?.accuracyPercentage,
        storageType: storageInfo.type,
        structureVersion: '2.0' // Indicate this is the new generic structure
      }
    };
    
    // Add storage reference if not inline
    if (storageInfo.type !== 'inline') {
      response.output.structureReference = storageInfo;
    }
    
    // Add cost information if available
    if (result.costUsd) {
      response.cost = result.costUsd;
    }
    
    return jsonResponse(response);
  } catch (error) {
    console.error('Granulation v2 error:', error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Granulation failed',
      status: 'failed'
    }, 500);
  }
}

async function handleValidateAction(env: Env, request: ExecuteRequest): Promise<Response> {
  // Placeholder for validation action
  return jsonResponse({
    success: true,
    output: {
      valid: true,
      message: 'Validation not yet implemented'
    }
  });
}

function determineTemplateName(structureType?: string): string {
  // Map structure types to default template names
  const templateMap: Record<string, string> = {
    'course': 'educational_course_basic',
    'quiz': 'quiz_assessment_standard',
    'novel': 'three_act_novel',
    'workflow': 'business_process_standard',
    'knowledge_map': 'concept_map_hierarchical',
    'learning_path': 'skill_development_path'
  };
  
  return templateMap[structureType || ''] || 'educational_course_basic';
}