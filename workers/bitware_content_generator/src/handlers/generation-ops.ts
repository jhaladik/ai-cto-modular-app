import { Env, AuthenticatedRequest } from '../types';
import { jsonResponse, getQueryParam, getNumericQueryParam } from '../helpers/http';
import { DatabaseService } from '../services/database';
import { GenerationJob, JobStatus } from '../types/generation';

export async function handleListJobs(
  env: Env,
  request: AuthenticatedRequest,
  url: URL
): Promise<Response> {
  try {
    const status = getQueryParam(url, 'status') as JobStatus | undefined;
    const limit = getNumericQueryParam(url, 'limit', 20);
    const offset = getNumericQueryParam(url, 'offset', 0);

    const db = new DatabaseService(env);
    const { jobs, total } = await db.listJobs(status, limit!, offset!);

    return jsonResponse({
      jobs,
      total,
      page: Math.floor(offset! / limit!) + 1,
      pageSize: limit,
      hasNext: offset! + limit! < total,
      hasPrev: offset! > 0,
    });
  } catch (error) {
    console.error('Error listing jobs:', error);
    return jsonResponse({ error: 'Failed to list jobs' }, 500);
  }
}

export async function handleGetJob(
  env: Env,
  request: AuthenticatedRequest,
  jobId: number
): Promise<Response> {
  try {
    const db = new DatabaseService(env);
    const job = await db.getJob(jobId);

    if (!job) {
      return jsonResponse({ error: 'Job not found' }, 404);
    }

    // Get content sections for additional details
    const sections = await db.getContentSections(jobId);
    
    return jsonResponse({
      job,
      sections: {
        total: sections.length,
        completed: sections.filter((s: any) => s.status === 'completed').length,
        failed: sections.filter((s: any) => s.status === 'failed').length,
        pending: sections.filter((s: any) => s.status === 'pending').length,
      },
    });
  } catch (error) {
    console.error('Error getting job:', error);
    return jsonResponse({ error: 'Failed to get job' }, 500);
  }
}

export async function handleGetJobStatus(
  env: Env,
  request: AuthenticatedRequest,
  jobId: number
): Promise<Response> {
  try {
    const db = new DatabaseService(env);
    const job = await db.getJob(jobId);

    if (!job) {
      return jsonResponse({ error: 'Job not found' }, 404);
    }

    // Try to get real-time status from KV
    const kvStatus = await env.JOB_STATUS.get(`job-${jobId}`, { type: 'json' });
    
    const status = {
      jobId: job.id,
      status: job.status,
      progress: {
        percentage: job.progressPercentage,
        sectionsCompleted: job.sectionsCompleted,
        totalSections: job.totalSections,
        currentSection: job.currentSection,
      },
      metrics: {
        wordsGenerated: job.totalWords,
        tokensUsed: job.tokensUsed,
        costUsd: job.costUsd,
      },
      timing: {
        startedAt: job.startedAt,
        estimatedCompletion: job.estimatedCompletion,
        elapsedMs: job.processingTimeMs,
      },
      ...(kvStatus && { realtime: kvStatus }),
    };

    return jsonResponse(status);
  } catch (error) {
    console.error('Error getting job status:', error);
    return jsonResponse({ error: 'Failed to get job status' }, 500);
  }
}

export async function handleGetJobContent(
  env: Env,
  request: AuthenticatedRequest,
  jobId: number
): Promise<Response> {
  try {
    const db = new DatabaseService(env);
    const job = await db.getJob(jobId);

    if (!job) {
      return jsonResponse({ error: 'Job not found' }, 404);
    }

    if (job.status !== 'completed') {
      return jsonResponse({ 
        error: 'Content not available', 
        status: job.status,
        message: 'Job must be completed to retrieve content' 
      }, 400);
    }

    // Retrieve content based on storage type
    let content = null;
    
    if (job.contentStorageType === 'inline') {
      // Content should be in the database
      const sections = await db.getContentSections(jobId);
      content = buildContentFromSections(sections);
    } else if (job.contentStorageType === 'kv' && job.contentLocation) {
      // Content in KV storage
      content = await env.CONTENT_CACHE.get(job.contentLocation, { type: 'json' });
    } else if (job.contentStorageType === 'r2' && job.contentLocation) {
      // Content in R2 storage
      const object = await env.CONTENT_STORAGE.get(job.contentLocation);
      if (object) {
        const text = await object.text();
        content = JSON.parse(text);
      }
    }

    if (!content) {
      return jsonResponse({ error: 'Content not found in storage' }, 404);
    }

    return jsonResponse({
      jobId: job.id,
      topic: job.topic,
      structureType: job.structureType,
      content,
      metadata: {
        totalWords: job.totalWords,
        qualityScore: job.qualityScore,
        generatedAt: job.completedAt,
        storageType: job.contentStorageType,
        size: job.contentSize,
      },
    });
  } catch (error) {
    console.error('Error getting job content:', error);
    return jsonResponse({ error: 'Failed to get job content' }, 500);
  }
}

export async function handleRetryJob(
  env: Env,
  request: AuthenticatedRequest,
  jobId: number
): Promise<Response> {
  try {
    const db = new DatabaseService(env);
    const job = await db.getJob(jobId);

    if (!job) {
      return jsonResponse({ error: 'Job not found' }, 404);
    }

    if (job.status !== 'failed') {
      return jsonResponse({ 
        error: 'Job cannot be retried', 
        status: job.status,
        message: 'Only failed jobs can be retried' 
      }, 400);
    }

    // Parse optional config from request body
    let config = {};
    try {
      const body = await request.json();
      config = body.config || {};
    } catch {}

    // Update job status to pending for retry
    await db.updateJobStatus(jobId, 'pending');
    
    // Increment retry count
    await env.DB.prepare(`
      UPDATE generation_jobs 
      SET retry_count = retry_count + 1,
          error_message = NULL,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(jobId).run();

    // TODO: Trigger actual retry processing
    // This would typically queue the job for reprocessing
    
    return jsonResponse({
      success: true,
      jobId,
      message: 'Job queued for retry',
      retryCount: job.retryCount + 1,
    });
  } catch (error) {
    console.error('Error retrying job:', error);
    return jsonResponse({ error: 'Failed to retry job' }, 500);
  }
}

export async function handleCancelJob(
  env: Env,
  request: AuthenticatedRequest,
  jobId: number
): Promise<Response> {
  try {
    const db = new DatabaseService(env);
    const job = await db.getJob(jobId);

    if (!job) {
      return jsonResponse({ error: 'Job not found' }, 404);
    }

    if (job.status === 'completed' || job.status === 'cancelled') {
      return jsonResponse({ 
        error: 'Job cannot be cancelled', 
        status: job.status,
        message: 'Job is already completed or cancelled' 
      }, 400);
    }

    // Update job status to cancelled
    await db.updateJobStatus(jobId, 'cancelled');

    // Clear any pending processing flags
    await env.JOB_STATUS.delete(`job-${jobId}`);

    // TODO: Send cancellation signal to any active processing

    return jsonResponse({
      success: true,
      jobId,
      message: 'Job cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling job:', error);
    return jsonResponse({ error: 'Failed to cancel job' }, 500);
  }
}

// Helper function to rebuild content from sections
function buildContentFromSections(sections: any[]): any {
  const content: any = {
    sections: [],
    metadata: {
      totalSections: sections.length,
      totalWords: 0,
    },
  };

  // Group sections by type and hierarchy
  const sectionMap = new Map();
  
  for (const section of sections) {
    sectionMap.set(section.section_id, section);
    content.metadata.totalWords += section.word_count || 0;
  }

  // Build hierarchical structure
  for (const section of sections) {
    if (!section.parent_section_id) {
      // Top-level section
      content.sections.push({
        id: section.section_id,
        type: section.section_type,
        title: section.title,
        content: section.content,
        wordCount: section.word_count,
        children: sections
          .filter(s => s.parent_section_id === section.section_id)
          .map(child => ({
            id: child.section_id,
            type: child.section_type,
            title: child.title,
            content: child.content,
            wordCount: child.word_count,
          })),
      });
    }
  }

  return content;
}