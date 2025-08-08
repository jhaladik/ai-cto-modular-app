import { Env } from '../types';
import { 
  GenerationJob, 
  JobStatus, 
  PromptTemplate,
  GenerationSummary,
  QualityMetrics
} from '../types/generation';

export class DatabaseService {
  constructor(private env: Env) {}

  // Job management
  async createJob(data: {
    granulatorJobId: number;
    topic: string;
    structureType: string;
    totalSections: number;
    clientId?: string;
    executionId?: string;
  }): Promise<number> {
    const result = await this.env.DB.prepare(`
      INSERT INTO generation_jobs (
        granulator_job_id, topic, structure_type, total_sections,
        client_id, execution_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))
    `).bind(
      data.granulatorJobId,
      data.topic,
      data.structureType,
      data.totalSections,
      data.clientId || null,
      data.executionId || null
    ).run();

    if (!result.success || !result.meta.last_row_id) {
      throw new Error('Failed to create generation job');
    }

    return result.meta.last_row_id as number;
  }

  async getJob(jobId: number): Promise<GenerationJob | null> {
    const result = await this.env.DB.prepare(`
      SELECT * FROM generation_jobs WHERE id = ?
    `).bind(jobId).first();

    if (!result) return null;

    return this.mapToGenerationJob(result);
  }

  async updateJobStatus(
    jobId: number, 
    status: JobStatus, 
    errorMessage?: string
  ): Promise<void> {
    const updates: string[] = ['status = ?'];
    const values: any[] = [status];

    if (status === 'processing') {
      updates.push('started_at = datetime("now")');
    } else if (status === 'completed' || status === 'failed') {
      updates.push('completed_at = datetime("now")');
    }

    if (errorMessage) {
      updates.push('error_message = ?');
      values.push(errorMessage);
    }

    updates.push('updated_at = datetime("now")');
    values.push(jobId);

    await this.env.DB.prepare(`
      UPDATE generation_jobs 
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...values).run();
  }

  async updateJobProgress(
    jobId: number,
    sectionsCompleted: number,
    currentSection?: string
  ): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) throw new Error('Job not found');

    const progressPercentage = (sectionsCompleted / job.totalSections) * 100;

    await this.env.DB.prepare(`
      UPDATE generation_jobs
      SET sections_completed = ?,
          current_section = ?,
          progress_percentage = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      sectionsCompleted,
      currentSection || null,
      progressPercentage,
      jobId
    ).run();
  }

  async updateJobMetrics(
    jobId: number,
    metrics: {
      totalWords?: number;
      tokensUsed?: number;
      costUsd?: number;
      processingTimeMs?: number;
      qualityScore?: number;
      readabilityScore?: number;
      coherenceScore?: number;
      completenessScore?: number;
    }
  ): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];

    if (metrics.totalWords !== undefined) {
      updates.push('total_words = ?');
      values.push(metrics.totalWords);
    }
    if (metrics.tokensUsed !== undefined) {
      updates.push('tokens_used = ?');
      values.push(metrics.tokensUsed);
    }
    if (metrics.costUsd !== undefined) {
      updates.push('cost_usd = ?');
      values.push(metrics.costUsd);
    }
    if (metrics.processingTimeMs !== undefined) {
      updates.push('processing_time_ms = ?');
      values.push(metrics.processingTimeMs);
    }
    if (metrics.qualityScore !== undefined) {
      updates.push('quality_score = ?');
      values.push(metrics.qualityScore);
    }
    if (metrics.readabilityScore !== undefined) {
      updates.push('readability_score = ?');
      values.push(metrics.readabilityScore);
    }
    if (metrics.coherenceScore !== undefined) {
      updates.push('coherence_score = ?');
      values.push(metrics.coherenceScore);
    }
    if (metrics.completenessScore !== undefined) {
      updates.push('completeness_score = ?');
      values.push(metrics.completenessScore);
    }

    if (updates.length === 0) return;

    updates.push('updated_at = datetime("now")');
    values.push(jobId);

    await this.env.DB.prepare(`
      UPDATE generation_jobs
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...values).run();
  }

  async updateJobStorage(
    jobId: number,
    storageType: 'inline' | 'kv' | 'r2',
    location: string,
    size: number
  ): Promise<void> {
    await this.env.DB.prepare(`
      UPDATE generation_jobs
      SET content_storage_type = ?,
          content_location = ?,
          content_size = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(storageType, location, size, jobId).run();
  }

  async listJobs(
    status?: JobStatus,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ jobs: GenerationJob[]; total: number }> {
    let query = 'SELECT * FROM generation_jobs';
    let countQuery = 'SELECT COUNT(*) as count FROM generation_jobs';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      countQuery += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    
    const [jobsResult, countResult] = await Promise.all([
      this.env.DB.prepare(query).bind(...params, limit, offset).all(),
      this.env.DB.prepare(countQuery).bind(...(status ? [status] : [])).first()
    ]);

    const jobs = jobsResult.results.map(row => this.mapToGenerationJob(row));
    const total = (countResult as any)?.count || 0;

    return { jobs, total };
  }

  // Content sections management
  async createContentSection(data: {
    jobId: number;
    sectionId: string;
    sectionType: string;
    parentSectionId?: string;
    sequenceNumber?: number;
    title?: string;
    priority?: 'high' | 'medium' | 'low';
  }): Promise<number> {
    const result = await this.env.DB.prepare(`
      INSERT INTO content_sections (
        job_id, section_id, section_type, parent_section_id,
        sequence_number, title, priority, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
    `).bind(
      data.jobId,
      data.sectionId,
      data.sectionType,
      data.parentSectionId || null,
      data.sequenceNumber || null,
      data.title || null,
      data.priority || 'medium'
    ).run();

    if (!result.success || !result.meta.last_row_id) {
      throw new Error('Failed to create content section');
    }

    return result.meta.last_row_id as number;
  }

  async updateContentSection(
    id: number,
    data: {
      content?: string;
      wordCount?: number;
      status?: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
      qualityScore?: number;
      errorMessage?: string;
    }
  ): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.content !== undefined) {
      updates.push('content = ?');
      values.push(data.content);
    }
    if (data.wordCount !== undefined) {
      updates.push('word_count = ?');
      values.push(data.wordCount);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.qualityScore !== undefined) {
      updates.push('quality_score = ?');
      values.push(data.qualityScore);
    }
    if (data.errorMessage !== undefined) {
      updates.push('error_message = ?');
      values.push(data.errorMessage);
    }

    if (updates.length === 0) return;

    updates.push('updated_at = datetime("now")');
    values.push(id);

    await this.env.DB.prepare(`
      UPDATE content_sections
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...values).run();
  }

  async getContentSections(jobId: number): Promise<any[]> {
    const result = await this.env.DB.prepare(`
      SELECT * FROM content_sections
      WHERE job_id = ?
      ORDER BY sequence_number, created_at
    `).bind(jobId).all();

    return result.results;
  }

  async getPendingSections(
    jobId: number,
    priority?: 'high' | 'medium' | 'low',
    limit: number = 10
  ): Promise<any[]> {
    let query = `
      SELECT * FROM content_sections
      WHERE job_id = ? AND status = 'pending'
    `;
    const params: any[] = [jobId];

    if (priority) {
      query += ' AND priority = ?';
      params.push(priority);
    }

    query += ' ORDER BY priority DESC, sequence_number LIMIT ?';
    params.push(limit);

    const result = await this.env.DB.prepare(query).bind(...params).all();
    return result.results;
  }

  // Prompt templates
  async getPromptTemplate(name: string): Promise<PromptTemplate | null> {
    const result = await this.env.DB.prepare(`
      SELECT * FROM prompt_templates
      WHERE name = ? AND is_active = 1
    `).bind(name).first();

    if (!result) return null;

    return this.mapToPromptTemplate(result);
  }

  async getPromptTemplatesByType(
    contentType: string,
    structureType?: string
  ): Promise<PromptTemplate[]> {
    let query = `
      SELECT * FROM prompt_templates
      WHERE content_type = ? AND is_active = 1
    `;
    const params: any[] = [contentType];

    if (structureType) {
      query += ' AND (structure_type = ? OR structure_type IS NULL)';
      params.push(structureType);
    }

    const result = await this.env.DB.prepare(query).bind(...params).all();
    return result.results.map(row => this.mapToPromptTemplate(row));
  }

  async updatePromptTemplateUsage(
    templateId: number,
    qualityScore: number,
    generationTimeMs: number
  ): Promise<void> {
    // Get current stats
    const current = await this.env.DB.prepare(`
      SELECT usage_count, avg_quality_score, avg_generation_time_ms
      FROM prompt_templates WHERE id = ?
    `).bind(templateId).first();

    if (!current) return;

    const currentCount = (current as any).usage_count || 0;
    const currentQuality = (current as any).avg_quality_score || 0;
    const currentTime = (current as any).avg_generation_time_ms || 0;

    // Calculate new averages
    const newCount = currentCount + 1;
    const newQuality = ((currentQuality * currentCount) + qualityScore) / newCount;
    const newTime = ((currentTime * currentCount) + generationTimeMs) / newCount;

    await this.env.DB.prepare(`
      UPDATE prompt_templates
      SET usage_count = ?,
          avg_quality_score = ?,
          avg_generation_time_ms = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(newCount, newQuality, newTime, templateId).run();
  }

  // Analytics
  async recordAnalytics(data: {
    jobId: number;
    success: boolean;
    wordsGenerated: number;
    sectionsGenerated: number;
    tokensUsed: number;
    costUsd: number;
    generationTimeMs: number;
    qualityScore?: number;
    provider: string;
    model: string;
    structureType: string;
  }): Promise<void> {
    const date = new Date().toISOString().split('T')[0];

    // Get or create today's analytics record
    const existing = await this.env.DB.prepare(`
      SELECT * FROM generation_analytics WHERE date = ?
    `).bind(date).first();

    if (existing) {
      // Update existing record
      const current = existing as any;
      const totalJobs = current.total_jobs + 1;
      const successfulJobs = current.successful_jobs + (data.success ? 1 : 0);
      const failedJobs = current.failed_jobs + (data.success ? 0 : 1);
      const totalWords = current.total_words_generated + data.wordsGenerated;
      const totalSections = current.total_sections_generated + data.sectionsGenerated;
      const totalTokens = current.total_tokens_used + data.tokensUsed;
      const totalCost = current.total_cost_usd + data.costUsd;

      await this.env.DB.prepare(`
        UPDATE generation_analytics
        SET total_jobs = ?,
            successful_jobs = ?,
            failed_jobs = ?,
            total_words_generated = ?,
            total_sections_generated = ?,
            total_tokens_used = ?,
            total_cost_usd = ?,
            avg_words_per_job = ?,
            avg_sections_per_job = ?,
            avg_cost_per_1k_words = ?,
            avg_generation_time_ms = ?
        WHERE date = ?
      `).bind(
        totalJobs,
        successfulJobs,
        failedJobs,
        totalWords,
        totalSections,
        totalTokens,
        totalCost,
        totalWords / totalJobs,
        totalSections / totalJobs,
        totalWords > 0 ? (totalCost / (totalWords / 1000)) : 0,
        ((current.avg_generation_time_ms * current.total_jobs) + data.generationTimeMs) / totalJobs,
        date
      ).run();
    } else {
      // Create new record
      await this.env.DB.prepare(`
        INSERT INTO generation_analytics (
          date, total_jobs, successful_jobs, failed_jobs,
          total_words_generated, total_sections_generated,
          total_tokens_used, total_cost_usd,
          avg_words_per_job, avg_sections_per_job,
          avg_cost_per_1k_words, avg_generation_time_ms,
          avg_quality_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        date,
        1,
        data.success ? 1 : 0,
        data.success ? 0 : 1,
        data.wordsGenerated,
        data.sectionsGenerated,
        data.tokensUsed,
        data.costUsd,
        data.wordsGenerated,
        data.sectionsGenerated,
        data.wordsGenerated > 0 ? (data.costUsd / (data.wordsGenerated / 1000)) : 0,
        data.generationTimeMs,
        data.qualityScore || 0
      ).run();
    }

    // Record AI provider usage
    await this.env.DB.prepare(`
      INSERT INTO ai_provider_usage (
        job_id, provider, model, tokens_input, tokens_output,
        total_tokens, cost_usd, latency_ms, success, request_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'generation')
    `).bind(
      data.jobId,
      data.provider,
      data.model,
      0, // Will be updated with actual values
      data.tokensUsed,
      data.tokensUsed,
      data.costUsd,
      data.generationTimeMs,
      data.success ? 1 : 0
    ).run();
  }

  async getAnalytics(days: number = 7): Promise<any> {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const startDate = date.toISOString().split('T')[0];

    const result = await this.env.DB.prepare(`
      SELECT * FROM generation_analytics
      WHERE date >= ?
      ORDER BY date DESC
    `).bind(startDate).all();

    return result.results;
  }

  // Helper methods
  private mapToGenerationJob(row: any): GenerationJob {
    return {
      id: row.id,
      granulatorJobId: row.granulator_job_id,
      topic: row.topic,
      structureType: row.structure_type,
      status: row.status,
      totalSections: row.total_sections,
      sectionsCompleted: row.sections_completed,
      currentSection: row.current_section,
      progressPercentage: row.progress_percentage,
      totalWords: row.total_words,
      tokensUsed: row.tokens_used,
      costUsd: row.cost_usd,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      estimatedCompletion: row.estimated_completion,
      processingTimeMs: row.processing_time_ms,
      contentStorageType: row.content_storage_type,
      contentLocation: row.content_location,
      contentSize: row.content_size,
      qualityScore: row.quality_score,
      readabilityScore: row.readability_score,
      coherenceScore: row.coherence_score,
      completenessScore: row.completeness_score,
      aiProvider: row.ai_provider,
      modelsUsed: row.models_used ? JSON.parse(row.models_used) : [],
      retryCount: row.retry_count,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapToPromptTemplate(row: any): PromptTemplate {
    return {
      id: row.id,
      name: row.name,
      contentType: row.content_type,
      template: row.template,
      variables: JSON.parse(row.variables),
      recommendedModel: row.recommended_model,
      temperature: row.temperature,
      maxTokens: row.max_tokens,
      usageCount: row.usage_count,
      avgQualityScore: row.avg_quality_score,
      avgGenerationTimeMs: row.avg_generation_time_ms,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}