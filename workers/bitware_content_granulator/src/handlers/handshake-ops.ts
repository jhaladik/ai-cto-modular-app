import { Env, AuthenticatedRequest } from '../types';
import { jsonResponse, parseJsonBody } from '../helpers/http';
import { DatabaseService } from '../services/database';
import { GranulatorService } from '../services/granulator';
import { StorageManager } from '../services/storage-manager';
import { HandshakeRequest, HandshakeResponse, ProcessResponse, ProgressUpdate } from '../types/handshake';
import { GranulationRequest } from '../types/granulation';

export async function handleHandshake(env: Env, request: AuthenticatedRequest): Promise<Response> {
  try {
    const body = await parseJsonBody<HandshakeRequest>(request);
    
    // Validate request
    if (!body.executionId || !body.inputData?.topic) {
      return jsonResponse({ 
        error: 'Invalid handshake request',
        accepted: false 
      }, 400);
    }
    
    // Check resource availability
    const estimatedTokens = body.resourceRequirements?.estimatedTokens || 2000;
    const timeoutMs = body.resourceRequirements?.timeoutMs || 30000;
    
    // Accept the handshake
    const response: HandshakeResponse = {
      executionId: body.executionId,
      workerId: 'bitware-content-granulator',
      accepted: true,
      estimatedCompletionMs: Math.min(timeoutMs, 20000), // Usually completes in 20s
      resourceRequirements: {
        cpu: 0.5,
        memory: 256,
        apiCalls: 2 // One for structure, one for validation
      },
      capabilities: {
        supportedStructures: ['course', 'quiz', 'novel', 'workflow', 'knowledge_map', 'learning_path'],
        maxGranularity: 5,
        validationSupported: true
      }
    };
    
    // Store handshake info for later processing
    const storage = new StorageManager(env);
    try {
      await storage.storeProgress(body.executionId, {
        status: 'accepted',
        handshakeData: body,
        acceptedAt: new Date().toISOString()
      });
    } catch (kvError) {
      console.warn('KV storage failed, continuing without caching:', kvError);
      // Continue without storing progress - we can still process the handshake
    }
    
    return jsonResponse(response);
  } catch (error) {
    console.error('Handshake error:', error);
    return jsonResponse({ 
      error: error.message,
      accepted: false 
    }, 500);
  }
}

export async function handleProcess(env: Env, request: AuthenticatedRequest): Promise<Response> {
  try {
    const body = await parseJsonBody<{ executionId: string }>(request);
    
    if (!body.executionId) {
      return jsonResponse({ error: 'executionId required' }, 400);
    }
    
    const storage = new StorageManager(env);
    const progressData = await storage.getProgress(body.executionId);
    
    if (!progressData || progressData.status !== 'accepted') {
      return jsonResponse({ error: 'Invalid execution ID or handshake not completed' }, 400);
    }
    
    const handshakeData = progressData.handshakeData as HandshakeRequest;
    
    // Update progress
    await storage.storeProgress(body.executionId, {
      ...progressData,
      status: 'processing',
      progress: 10,
      startedAt: new Date().toISOString()
    });
    
    try {
      // Convert handshake data to granulation request
      const granulationRequest: GranulationRequest = {
        topic: handshakeData.inputData.topic,
        structureType: handshakeData.inputData.structureType as any,
        granularityLevel: handshakeData.inputData.granularityLevel as any,
        templateName: handshakeData.inputData.templateName,
        targetAudience: handshakeData.inputData.targetAudience,
        constraints: handshakeData.inputData.constraints,
        options: handshakeData.inputData.options,
        validation: handshakeData.validationConfig
      };
      
      // Update progress to 30%
      await storage.storeProgress(body.executionId, {
        ...progressData,
        progress: 30,
        stage: 'Generating structure with AI'
      });
      
      // Perform granulation
      const granulator = new GranulatorService(env);
      const result = await granulator.granulate(
        granulationRequest,
        request.auth.clientId,
        body.executionId
      );
      
      // Update progress to 80%
      await storage.storeProgress(body.executionId, {
        ...progressData,
        progress: 80,
        stage: 'Finalizing and storing results'
      });
      
      // Store structure based on size
      const structureSize = storage.getStructureSize(result.structure);
      const storageInfo = await storage.storeStructure(
        result.jobId,
        result.structure,
        structureSize
      );
      
      // Update progress to 100%
      await storage.storeProgress(body.executionId, {
        ...progressData,
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
        result
      });
      
      // Prepare response
      const response: ProcessResponse = {
        executionId: body.executionId,
        status: 'completed',
        progress: 100,
        result: {
          jobId: result.jobId,
          structure: storageInfo.type === 'inline' ? result.structure : undefined,
          granulationSummary: result.summary,
          qualityScore: result.qualityScore,
          validation: result.validationResult
        },
        metrics: {
          tokensUsed: Math.ceil(result.costUsd * 1000000 / 0.15), // Estimate tokens from cost
          processingTimeMs: result.processingTimeMs,
          costUsd: result.costUsd
        },
        dataReference: storageInfo.type !== 'inline' ? storageInfo : undefined
      };
      
      return jsonResponse(response);
    } catch (error) {
      // Update progress with error
      await storage.storeProgress(body.executionId, {
        ...progressData,
        status: 'failed',
        error: error.message,
        failedAt: new Date().toISOString()
      });
      
      const response: ProcessResponse = {
        executionId: body.executionId,
        status: 'failed',
        progress: progressData.progress || 0,
        error: {
          code: 'GRANULATION_FAILED',
          message: error.message,
          retryable: true
        },
        metrics: {
          tokensUsed: 0,
          processingTimeMs: Date.now() - new Date(progressData.startedAt).getTime(),
          costUsd: 0
        }
      };
      
      return jsonResponse(response, 500);
    }
  } catch (error) {
    console.error('Process error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

export async function handleAcknowledge(env: Env, request: AuthenticatedRequest): Promise<Response> {
  try {
    const body = await parseJsonBody<{
      executionId: string;
      status: 'received' | 'processed' | 'failed';
      message?: string;
    }>(request);
    
    if (!body.executionId || !body.status) {
      return jsonResponse({ error: 'executionId and status required' }, 400);
    }
    
    const storage = new StorageManager(env);
    const progressData = await storage.getProgress(body.executionId);
    
    if (!progressData) {
      return jsonResponse({ error: 'Execution not found' }, 404);
    }
    
    // Update acknowledgment
    await storage.storeProgress(body.executionId, {
      ...progressData,
      acknowledged: true,
      acknowledgedAt: new Date().toISOString(),
      acknowledgmentStatus: body.status,
      acknowledgmentMessage: body.message
    });
    
    return jsonResponse({
      executionId: body.executionId,
      acknowledged: true,
      status: body.status
    });
  } catch (error) {
    console.error('Acknowledge error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

export async function handleGetProgress(env: Env, executionId: string, request: AuthenticatedRequest): Promise<Response> {
  try {
    const storage = new StorageManager(env);
    const progressData = await storage.getProgress(executionId);
    
    if (!progressData) {
      return jsonResponse({ error: 'Execution not found' }, 404);
    }
    
    const response: ProgressUpdate = {
      executionId,
      progress: progressData.progress || 0,
      stage: progressData.stage || 'Initializing',
      message: progressData.status === 'failed' 
        ? `Failed: ${progressData.error}` 
        : `${progressData.stage || 'Processing'} (${progressData.progress}%)`,
      estimatedRemainingMs: progressData.status === 'completed' 
        ? 0 
        : Math.max(0, 20000 - (Date.now() - new Date(progressData.startedAt || Date.now()).getTime()))
    };
    
    return jsonResponse(response);
  } catch (error) {
    console.error('Get progress error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}