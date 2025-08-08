import { Env, AuthenticatedRequest } from '../types';
import { jsonResponse, parseJsonBody } from '../helpers/http';
import { DatabaseService } from '../services/database';
import { GranulatorService } from '../services/granulator';
import { ValidationService } from '../services/validation';
import { StorageManager } from '../services/storage-manager';
import { GranulationRequest } from '../types/granulation';

export async function handleGranulate(env: Env, request: AuthenticatedRequest): Promise<Response> {
  try {
    const body = await parseJsonBody<GranulationRequest>(request);
    
    // Validate required fields
    if (!body.topic || !body.structureType || !body.templateName) {
      return jsonResponse({ 
        error: 'Missing required fields: topic, structureType, templateName' 
      }, 400);
    }

    const granulator = new GranulatorService(env);
    const storage = new StorageManager(env);
    
    // Extract client ID from auth
    const clientId = request.auth?.clientId || 'direct-api';
    
    // Perform granulation
    const result = await granulator.granulate(body, clientId);
    
    // Store structure if large
    const structureSize = storage.getStructureSize(result.structure);
    const storageInfo = await storage.storeStructure(
      result.jobId, 
      result.structure, 
      structureSize
    );
    
    // Return response based on storage type
    const response: any = {
      status: 'completed',
      jobId: result.jobId,
      topic: body.topic,
      structureType: body.structureType,
      granulationSummary: result.summary,
      qualityScore: result.qualityScore,
      processingTimeMs: result.processingTimeMs,
      readyForContentGeneration: true
    };
    
    if (result.validationResult) {
      response.validation = {
        enabled: true,
        accuracyPercentage: result.validationResult.accuracyPercentage,
        passed: result.validationResult.passed,
        levelUsed: result.validationResult.levelUsed,
        validationTimeMs: result.validationResult.validationTimeMs
      };
    }
    
    if (storageInfo.type === 'inline') {
      response.structure = result.structure;
    } else {
      response.structureReference = storageInfo;
    }
    
    return jsonResponse(response);
  } catch (error) {
    console.error('Granulation error:', error);
    return jsonResponse({ 
      error: error instanceof Error ? error.message : 'Granulation failed',
      status: 'failed'
    }, 500);
  }
}


export async function handleGetJob(env: Env, jobId: number, request: AuthenticatedRequest): Promise<Response> {
  try {
    const db = new DatabaseService(env);
    const storage = new StorageManager(env);
    
    const job = await db.getJob(jobId);
    if (!job) {
      return jsonResponse({ error: 'Job not found' }, 404);
    }
    
    // Check if user has access to this job
    if (request.auth.type === 'client' && job.clientId !== request.auth.clientId) {
      return jsonResponse({ error: 'Access denied' }, 403);
    }
    
    // Get structure elements
    const elements = await db.getStructureElements(jobId);
    
    // Build hierarchical structure
    const structure = buildHierarchicalStructure(elements);
    
    return jsonResponse({
      job: {
        id: job.id,
        topic: job.topic,
        structureType: job.structureType,
        granularityLevel: job.granularityLevel,
        status: job.status,
        qualityScore: job.qualityScore,
        processingTimeMs: job.processingTimeMs,
        costUsd: job.costUsd,
        startedAt: job.startedAt,
        completedAt: job.completedAt
      },
      structure,
      elementCount: elements.length
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    return jsonResponse({ error: 'Failed to fetch job' }, 500);
  }
}

export async function handleGetJobStatus(env: Env, jobId: number, request: AuthenticatedRequest): Promise<Response> {
  try {
    const db = new DatabaseService(env);
    
    const job = await db.getJob(jobId);
    if (!job) {
      return jsonResponse({ error: 'Job not found' }, 404);
    }
    
    // Check access
    if (request.auth.type === 'client' && job.clientId !== request.auth.clientId) {
      return jsonResponse({ error: 'Access denied' }, 403);
    }
    
    return jsonResponse({
      jobId: job.id,
      status: job.status,
      progress: job.status === 'completed' ? 100 : 50,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      qualityScore: job.qualityScore
    });
  } catch (error) {
    console.error('Error fetching job status:', error);
    return jsonResponse({ error: 'Failed to fetch job status' }, 500);
  }
}

export async function handleValidate(env: Env, request: AuthenticatedRequest): Promise<Response> {
  try {
    const body = await parseJsonBody<{
      jobId: number;
      validationLevel?: number;
      customThreshold?: number;
    }>(request);
    
    if (!body.jobId) {
      return jsonResponse({ error: 'jobId required' }, 400);
    }
    
    const db = new DatabaseService(env);
    const validation = new ValidationService(env);
    
    // Get job and structure
    const job = await db.getJob(body.jobId);
    if (!job) {
      return jsonResponse({ error: 'Job not found' }, 404);
    }
    
    // Check access
    if (request.auth.type === 'client' && job.clientId !== request.auth.clientId) {
      return jsonResponse({ error: 'Access denied' }, 403);
    }
    
    // Get structure elements and rebuild
    const elements = await db.getStructureElements(body.jobId);
    const structure = buildHierarchicalStructure(elements);
    
    // Perform validation
    const result = await validation.validate(
      structure,
      job.topic,
      job.structureType as any,
      (body.validationLevel || job.validationLevel) as any,
      'general audience' // TODO: Get from job metadata
    );
    
    // Save validation result
    await db.saveValidationResult({
      jobId: body.jobId,
      validationLevel: result.levelUsed,
      accuracyPercentage: result.accuracyPercentage,
      questionsAsked: [],
      scores: result.details.questionScores,
      passed: result.passed,
      retryCount: 0,
      validationTimeMs: result.validationTimeMs,
      aiFeedback: result.aiFeedback
    });
    
    return jsonResponse({
      validation: result,
      jobId: body.jobId,
      recommendRetry: !result.passed && result.accuracyPercentage < 70
    });
  } catch (error) {
    console.error('Validation error:', error);
    return jsonResponse({ error: 'Validation failed' }, 500);
  }
}

export async function handleGetValidationHistory(env: Env, jobId: number, request: AuthenticatedRequest): Promise<Response> {
  try {
    const db = new DatabaseService(env);
    
    // Check job exists and user has access
    const job = await db.getJob(jobId);
    if (!job) {
      return jsonResponse({ error: 'Job not found' }, 404);
    }
    
    if (request.auth.type === 'client' && job.clientId !== request.auth.clientId) {
      return jsonResponse({ error: 'Access denied' }, 403);
    }
    
    const history = await db.getValidationHistory(jobId);
    
    return jsonResponse({
      jobId,
      validations: history.map(v => ({
        timestamp: v.created_at,
        level: v.validation_level,
        accuracy: v.accuracy_percentage,
        passed: v.passed,
        questions: v.questionsAsked,
        scores: v.scores,
        feedback: v.ai_feedback
      }))
    });
  } catch (error) {
    console.error('Error fetching validation history:', error);
    return jsonResponse({ error: 'Failed to fetch validation history' }, 500);
  }
}

// Helper function to build hierarchical structure from flat elements
function buildHierarchicalStructure(elements: any[]): any {
  const elementMap = new Map();
  const rootElements: any[] = [];
  
  // First pass: create map
  elements.forEach(el => {
    elementMap.set(el.id, {
      ...el,
      children: []
    });
  });
  
  // Second pass: build hierarchy
  elements.forEach(el => {
    if (el.parentId) {
      const parent = elementMap.get(el.parentId);
      if (parent) {
        parent.children.push(elementMap.get(el.id));
      }
    } else {
      rootElements.push(elementMap.get(el.id));
    }
  });
  
  // Sort by sequence order
  const sortBySequence = (items: any[]) => {
    items.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    items.forEach(item => {
      if (item.children?.length > 0) {
        sortBySequence(item.children);
      }
    });
  };
  
  sortBySequence(rootElements);
  
  return rootElements.length === 1 ? rootElements[0] : rootElements;
}

// List all jobs
export async function handleGetJobs(env: Env, request: AuthenticatedRequest): Promise<Response> {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const clientId = url.searchParams.get('client_id');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    // Build query
    let query = `
      SELECT 
        j.id, j.client_id, j.topic, j.structure_type, 
        t.template_name,
        j.status, j.quality_score, j.validation_level, 
        CASE WHEN j.validation_enabled = 1 THEN 
          CASE WHEN v.passed = 1 THEN 1 ELSE 0 END 
        ELSE NULL END as validation_passed,
        j.processing_time_ms, j.cost_usd, j.started_at, j.completed_at
      FROM granulation_jobs j
      LEFT JOIN granulation_templates t ON j.template_id = t.id
      LEFT JOIN validation_results v ON j.id = v.job_id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    // Apply filters
    if (status) {
      query += ` AND j.status = ?`;
      params.push(status);
    }
    
    if (clientId && request.auth.type === 'worker') {
      query += ` AND j.client_id = ?`;
      params.push(clientId);
    } else if (request.auth.type === 'client') {
      query += ` AND j.client_id = ?`;
      params.push(request.auth.clientId);
    }
    
    query += ` ORDER BY j.started_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const jobs = await env.DB.prepare(query).bind(...params).all();
    
    return jsonResponse({
      jobs: jobs.results,
      total: jobs.results.length,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error listing jobs:', error);
    return jsonResponse({ error: 'Failed to list jobs' }, 500);
  }
}

// Get job structure
export async function handleGetJobStructure(env: Env, jobId: number, request: AuthenticatedRequest): Promise<Response> {
  try {
    const db = new DatabaseService(env);
    const storage = new StorageManager(env);
    
    // Get job
    const job = await db.getJob(jobId);
    if (!job) {
      return jsonResponse({ error: 'Job not found' }, 404);
    }
    
    // Check access
    if (request.auth.type === 'client' && job.clientId !== request.auth.clientId) {
      return jsonResponse({ error: 'Access denied' }, 403);
    }
    
    // Get structure from storage
    let structure = await storage.getStructure(jobId);
    
    // If not in storage, try to get from database (inline storage)
    if (!structure) {
      const elements = await db.getStructureElements(jobId);
      if (elements && elements.length > 0) {
        structure = buildHierarchicalStructure(elements);
      }
    }
    
    if (!structure) {
      return jsonResponse({ error: 'Structure not found' }, 404);
    }
    
    return jsonResponse({
      jobId,
      structure,
      metadata: {
        topic: job.topic,
        structureType: job.structureType,
        templateName: job.templateName,
        qualityScore: job.qualityScore,
        validationPassed: job.validationPassed,
        createdAt: job.createdAt
      }
    });
  } catch (error) {
    console.error('Error getting job structure:', error);
    return jsonResponse({ error: 'Failed to get job structure' }, 500);
  }
}

// Retry failed job
export async function handleRetryJob(env: Env, jobId: number, request: AuthenticatedRequest): Promise<Response> {
  try {
    // Get job with template info
    const jobResult = await env.DB.prepare(`
      SELECT j.*, t.template_name 
      FROM granulation_jobs j
      LEFT JOIN granulation_templates t ON j.template_id = t.id
      WHERE j.id = ?
    `).bind(jobId).first();
    
    if (!jobResult) {
      return jsonResponse({ error: 'Job not found' }, 404);
    }
    
    // Check access
    if (request.auth.type === 'client' && jobResult.client_id !== request.auth.clientId) {
      return jsonResponse({ error: 'Access denied' }, 403);
    }
    
    // Check if job can be retried
    if (jobResult.status !== 'failed') {
      return jsonResponse({ error: 'Only failed jobs can be retried' }, 400);
    }
    
    // Create new granulation request
    const granulator = new GranulatorService(env);
    const result = await granulator.granulate({
      topic: jobResult.topic as string,
      structureType: jobResult.structure_type as any,
      templateName: jobResult.template_name as string || 'default',
      granularityLevel: 3,
      targetAudience: 'general audience'
    }, jobResult.client_id as string);
    
    return jsonResponse({
      status: 'success',
      newJobId: result.jobId,
      originalJobId: jobId
    });
  } catch (error) {
    console.error('Error retrying job:', error);
    return jsonResponse({ error: 'Failed to retry job' }, 500);
  }
}