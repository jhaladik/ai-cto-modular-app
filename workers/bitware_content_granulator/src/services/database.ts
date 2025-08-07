import { Env, StructureType, GranularityLevel } from '../types';
import { GranulationJob, StructureElement, GranulationTemplate } from '../types/granulation';
import { ValidationResult } from '../types';

export class DatabaseService {
  constructor(private env: Env) {}

  // Template operations
  async getTemplates(structureType?: string): Promise<GranulationTemplate[]> {
    let query = 'SELECT * FROM granulation_templates';
    const params: any[] = [];
    
    if (structureType) {
      query += ' WHERE structure_type = ?';
      params.push(structureType);
    }
    
    query += ' ORDER BY usage_count DESC';
    
    const result = await this.env.DB.prepare(query)
      .bind(...params)
      .all();
    
    // Map snake_case database columns to camelCase TypeScript properties
    return result.results.map((row: any) => ({
      id: row.id,
      templateName: row.template_name,
      structureType: row.structure_type as StructureType,
      templateSchema: row.template_schema,
      complexityLevel: row.complexity_level as GranularityLevel,
      targetAudience: row.target_audience,
      aiPromptTemplate: row.ai_prompt_template,
      validationRules: row.validation_rules,
      createdAt: row.created_at,
      usageCount: row.usage_count
    }));
  }

  async getTemplate(templateName: string): Promise<GranulationTemplate | null> {
    // First try exact match
    let result = await this.env.DB.prepare(
      'SELECT * FROM granulation_templates WHERE template_name = ?'
    )
      .bind(templateName)
      .first();
    
    // If not found, try to find by structure type
    if (!result) {
      result = await this.env.DB.prepare(
        'SELECT * FROM granulation_templates WHERE structure_type = ? ORDER BY usage_count DESC LIMIT 1'
      )
        .bind(templateName)
        .first();
    }
    
    // If still not found, try partial match
    if (!result) {
      result = await this.env.DB.prepare(
        'SELECT * FROM granulation_templates WHERE template_name LIKE ? ORDER BY usage_count DESC LIMIT 1'
      )
        .bind(`%${templateName}%`)
        .first();
    }
    
    // Map snake_case database columns to camelCase TypeScript properties
    if (result) {
      const mapped: GranulationTemplate = {
        id: result.id as number,
        templateName: result.template_name as string || result.templateName as string,
        structureType: result.structure_type as StructureType || result.structureType as StructureType,
        templateSchema: result.template_schema || result.templateSchema || '{}',
        complexityLevel: result.complexity_level as GranularityLevel || result.complexityLevel as GranularityLevel || 3,
        targetAudience: result.target_audience as string || result.targetAudience as string || 'general',
        aiPromptTemplate: result.ai_prompt_template as string || result.aiPromptTemplate as string,
        validationRules: result.validation_rules || result.validationRules || null,
        createdAt: result.created_at as string || result.createdAt as string || new Date().toISOString(),
        usageCount: result.usage_count as number || result.usageCount as number || 0
      };
      return mapped;
    }
    
    return null;
  }

  async incrementTemplateUsage(templateId: number): Promise<void> {
    await this.env.DB.prepare(
      'UPDATE granulation_templates SET usage_count = usage_count + 1 WHERE id = ?'
    )
      .bind(templateId)
      .run();
  }

  // Job operations
  async createJob(params: {
    topic: string;
    structureType: string;
    templateId: number;
    granularityLevel: number;
    targetElements?: number;
    validationEnabled: boolean;
    validationLevel: number;
    validationThreshold: number;
    clientId?: string;
    executionId?: string;
  }): Promise<number> {
    // Log params to debug
    console.log('DatabaseService.createJob called with params:', params);
    
    // Validate required fields
    if (!params.topic || !params.structureType || params.templateId === undefined) {
      throw new Error(`Missing required fields: topic=${params.topic}, structureType=${params.structureType}, templateId=${params.templateId}`);
    }
    const result = await this.env.DB.prepare(`
      INSERT INTO granulation_jobs (
        topic, structure_type, template_id, granularity_level,
        target_elements, validation_enabled, validation_level,
        validation_threshold, client_id, execution_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        params.topic || 'Unknown Topic',
        params.structureType || 'course',
        params.templateId || 1,
        params.granularityLevel || 3,
        params.targetElements || null,
        params.validationEnabled ? 1 : 0,
        params.validationLevel || 1,
        params.validationThreshold || 85,
        params.clientId || null,
        params.executionId || null
      )
      .run();
    
    return result.meta.last_row_id as number;
  }

  async updateJob(jobId: number, updates: Partial<GranulationJob>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    
    // Map camelCase to snake_case for database columns
    const columnMap: Record<string, string> = {
      actualElements: 'actual_elements',
      qualityScore: 'quality_score',
      processingTimeMs: 'processing_time_ms',
      costUsd: 'cost_usd',
      completedAt: 'completed_at',
      validationEnabled: 'validation_enabled',
      validationLevel: 'validation_level',
      validationThreshold: 'validation_threshold',
      startedAt: 'started_at',
      clientId: 'client_id',
      executionId: 'execution_id',
      templateId: 'template_id',
      structureType: 'structure_type',
      granularityLevel: 'granularity_level',
      targetElements: 'target_elements'
    };
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id') {
        // Convert undefined to null for database compatibility
        const dbValue = value === undefined ? null : value;
        // Use snake_case column name if mapped, otherwise use as-is
        const columnName = columnMap[key] || key;
        fields.push(`${columnName} = ?`);
        values.push(dbValue);
      }
    });
    
    if (fields.length === 0) return;
    
    values.push(jobId);
    
    try {
      await this.env.DB.prepare(`
        UPDATE granulation_jobs 
        SET ${fields.join(', ')}
        WHERE id = ?
      `)
        .bind(...values)
        .run();
    } catch (error) {
      console.error('Database update error:', error);
      console.error('Fields:', fields);
      console.error('Values:', values);
      throw error;
    }
  }

  async getJob(jobId: number): Promise<GranulationJob | null> {
    const result = await this.env.DB.prepare(
      'SELECT * FROM granulation_jobs WHERE id = ?'
    )
      .bind(jobId)
      .first();
    
    return result as GranulationJob | null;
  }

  async getJobByExecutionId(executionId: string): Promise<GranulationJob | null> {
    const result = await this.env.DB.prepare(
      'SELECT * FROM granulation_jobs WHERE execution_id = ?'
    )
      .bind(executionId)
      .first();
    
    return result as GranulationJob | null;
  }

  // Structure element operations
  async createStructureElement(element: Omit<StructureElement, 'id' | 'createdAt'>): Promise<number> {
    const result = await this.env.DB.prepare(`
      INSERT INTO structure_elements (
        job_id, element_type, parent_id, sequence_order,
        title, description, content_outline, metadata,
        ai_reasoning, validation_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        element.jobId,
        element.elementType,
        element.parentId || null,
        element.sequenceOrder,
        element.title,
        element.description || null,
        element.contentOutline || null,
        element.metadata ? JSON.stringify(element.metadata) : null,
        element.aiReasoning || null,
        element.validationStatus || 'pending'
      )
      .run();
    
    return result.meta.last_row_id as number;
  }

  async getStructureElements(jobId: number): Promise<StructureElement[]> {
    const result = await this.env.DB.prepare(`
      SELECT * FROM structure_elements 
      WHERE job_id = ? 
      ORDER BY parent_id, sequence_order
    `)
      .bind(jobId)
      .all();
    
    return result.results.map(row => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : null
    })) as StructureElement[];
  }

  // Validation operations
  async saveValidationResult(result: {
    jobId: number;
    validationLevel: number;
    accuracyPercentage: number;
    questionsAsked: string[];
    scores: number[];
    passed: boolean;
    retryCount: number;
    validationTimeMs: number;
    aiFeedback?: string;
  }): Promise<void> {
    await this.env.DB.prepare(`
      INSERT INTO validation_results (
        job_id, validation_level, accuracy_percentage,
        questions_asked, scores, passed, retry_count,
        validation_time_ms, ai_feedback
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        result.jobId,
        result.validationLevel,
        result.accuracyPercentage,
        JSON.stringify(result.questionsAsked),
        JSON.stringify(result.scores),
        result.passed ? 1 : 0,
        result.retryCount,
        result.validationTimeMs,
        result.aiFeedback || null
      )
      .run();
  }

  async getValidationHistory(jobId: number): Promise<any[]> {
    const result = await this.env.DB.prepare(`
      SELECT * FROM validation_results 
      WHERE job_id = ? 
      ORDER BY created_at DESC
    `)
      .bind(jobId)
      .all();
    
    return result.results.map(row => ({
      ...row,
      questionsAsked: JSON.parse(row.questions_asked as string),
      scores: JSON.parse(row.scores as string)
    }));
  }

  // Analytics operations
  async recordAnalytics(templateId: number, metrics: {
    success: boolean;
    qualityScore: number;
    processingTime: number;
    validationAccuracy?: number;
    validationFailed?: boolean;
  }): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if analytics record exists for today
    const existing = await this.env.DB.prepare(
      'SELECT id FROM template_analytics WHERE template_id = ? AND usage_date = ?'
    )
      .bind(templateId, today)
      .first();
    
    if (existing) {
      // Update existing record
      await this.env.DB.prepare(`
        UPDATE template_analytics SET
          success_rate = (success_rate * usage_count + ?) / (usage_count + 1),
          avg_quality_score = (avg_quality_score * usage_count + ?) / (usage_count + 1),
          avg_processing_time = (avg_processing_time * usage_count + ?) / (usage_count + 1),
          avg_validation_accuracy = CASE 
            WHEN ? IS NOT NULL THEN (COALESCE(avg_validation_accuracy, 0) * usage_count + ?) / (usage_count + 1)
            ELSE avg_validation_accuracy
          END,
          validation_failure_rate = CASE
            WHEN ? IS NOT NULL THEN (validation_failure_rate * usage_count + ?) / (usage_count + 1)
            ELSE validation_failure_rate
          END,
          usage_count = usage_count + 1
        WHERE id = ?
      `)
        .bind(
          metrics.success ? 1 : 0,
          metrics.qualityScore || 0,
          metrics.processingTime || 0,
          metrics.validationAccuracy !== undefined ? metrics.validationAccuracy : null,
          metrics.validationAccuracy || 0,
          metrics.validationFailed !== undefined ? 1 : null,
          metrics.validationFailed ? 1 : 0,
          existing.id
        )
        .run();
    } else {
      // Create new record
      await this.env.DB.prepare(`
        INSERT INTO template_analytics (
          template_id, usage_date, success_rate,
          avg_quality_score, avg_processing_time,
          avg_validation_accuracy, validation_failure_rate,
          usage_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
        .bind(
          templateId,
          today,
          metrics.success ? 1 : 0,
          metrics.qualityScore || 0,
          metrics.processingTime || 0,
          metrics.validationAccuracy !== undefined ? metrics.validationAccuracy : null,
          metrics.validationFailed ? 1 : 0,
          1  // Initial usage count
        )
        .run();
    }
  }

  // Stats operations
  async getStats(): Promise<any> {
    const totalGranulations = await this.env.DB.prepare(
      'SELECT COUNT(*) as count FROM granulation_jobs WHERE status = "completed"'
    ).first();
    
    const templateUsage = await this.env.DB.prepare(`
      SELECT structure_type, COUNT(*) as count 
      FROM granulation_jobs 
      WHERE status = "completed"
      GROUP BY structure_type
    `).all();
    
    const avgScores = await this.env.DB.prepare(`
      SELECT 
        AVG(quality_score) as avg_quality_score,
        AVG(processing_time_ms) as avg_processing_time
      FROM granulation_jobs 
      WHERE status = "completed"
    `).first();
    
    const validationStats = await this.env.DB.prepare(`
      SELECT 
        AVG(accuracy_percentage) as avg_accuracy,
        SUM(CASE WHEN passed = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as failure_rate
      FROM validation_results
    `).first();
    
    return {
      totalGranulations: totalGranulations?.count || 0,
      templateUsage: Object.fromEntries(
        templateUsage.results.map((r: any) => [r.structure_type, r.count])
      ),
      avgQualityScore: avgScores?.avg_quality_score || 0,
      avgProcessingTime: avgScores?.avg_processing_time || 0,
      validationAccuracy: validationStats?.avg_accuracy || 0,
      validationFailureRate: validationStats?.failure_rate || 0
    };
  }
}