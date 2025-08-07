import { Env, AuthenticatedRequest } from '../types';
import { jsonResponse, parseJsonBody } from '../helpers/http';
import { GranulatorService } from '../services/granulator';
import { StorageManager } from '../services/storage-manager';

interface ExecuteRequest {
  action: string;
  input: any;
  params?: any;
  config?: any;
  timeout?: number;
}

export async function handleExecute(env: Env, request: AuthenticatedRequest): Promise<Response> {
  try {
    const body = await parseJsonBody<ExecuteRequest>(request);
    
    // Extract request ID and client ID from headers (use null for database compatibility)
    const requestId = request.headers.get('X-Request-ID') || null;
    const clientId = request.headers.get('X-Client-ID') || null;
    
    // Handle different actions
    switch (body.action) {
      case 'granulate':
        return handleGranulateAction(env, body, clientId, requestId);
      
      case 'validate':
        return handleValidateAction(env, body);
      
      case 'process':
      default:
        // Default to granulate for backward compatibility
        return handleGranulateAction(env, body, clientId, requestId);
    }
  } catch (error) {
    console.error('Execute error:', error);
    return jsonResponse({ 
      error: error.message || 'Execution failed',
      status: 'failed'
    }, 500);
  }
}

async function handleGranulateAction(env: Env, request: ExecuteRequest, clientId?: string, executionId?: string): Promise<Response> {
  const granulator = new GranulatorService(env);
  const storage = new StorageManager(env);
  
  // Map input and params to granulation request format
  const granulationRequest = {
    topic: request.input?.topic || request.input?.description || 'Unknown Topic',
    structureType: request.params?.structureType || request.input?.structureType || 'course',
    templateName: request.input?.templateName || determineTemplateName(request.params?.structureType),
    granularityLevel: request.input?.granularityLevel || 3,
    targetAudience: request.input?.targetAudience || 'general',
    constraints: {
      maxElements: request.input?.maxElements || request.config?.maxElements || 100
    },
    validation: {
      enabled: request.config?.validation !== false,
      level: request.config?.validationLevel || 2,
      threshold: request.config?.validationThreshold || 85
    }
  };
  
  // Perform granulation (ensure null instead of undefined)
  const result = await granulator.granulate(granulationRequest, clientId || null, executionId || null);
  
  // Store structure if large
  const structureSize = storage.getStructureSize(result.structure);
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
      summary: result.summary,
      qualityScore: result.qualityScore,
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
      storageType: storageInfo.type
    }
  };
  
  // Include structure or reference based on size
  if (storageInfo.type === 'inline') {
    response.output.structure = result.structure;
  } else {
    response.output.structureReference = storageInfo;
  }
  
  // Add cost information if available
  if (result.costUsd) {
    response.cost = result.costUsd;
  }
  
  return jsonResponse(response);
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
  const templateMap = {
    'course': 'educational_course_basic',
    'quiz': 'quiz_assessment_standard',
    'novel': 'creative_novel_standard',
    'workflow': 'business_workflow_standard',
    'knowledge_map': 'knowledge_mapping_standard',
    'learning_path': 'learning_path_standard'
  };
  
  return templateMap[structureType] || 'educational_course_basic';
}