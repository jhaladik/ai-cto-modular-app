import { Env } from '../types';
import { DatabaseService } from '../services/database';
import { AIProviderFactory } from '../services/ai-provider';
import { MentorValidator } from '../services/mentor-validator';
import { ContextManager } from '../services/context-manager';

/**
 * Universal Multi-Stage Content Generation Handler
 * Manages the 4-stage progressive refinement process for any content type
 */
export class MultiStageHandler {
  private db: DatabaseService;
  private env: Env;
  private contextManager: ContextManager;
  private mentorValidator?: MentorValidator;

  constructor(env: Env) {
    this.env = env;
    this.db = new DatabaseService(env);
    // Use JOB_CACHE as the KV namespace for context storage
    this.contextManager = new ContextManager(env.DB, env.JOB_CACHE || env.TEMPLATE_CACHE, env);
  }

  /**
   * List all projects
   */
  async listProjects(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const status = url.searchParams.get('status');
      const contentType = url.searchParams.get('content_type');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      let query = `
        SELECT 
          id, project_name, content_type, topic, target_audience,
          genre, current_stage, total_stages, status,
          created_at, updated_at, completed_at, metadata
        FROM content_generation_projects
        WHERE 1=1
      `;
      const params: any[] = [];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      if (contentType) {
        query += ' AND content_type = ?';
        params.push(contentType);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const result = await this.env.DB.prepare(query).bind(...params).all();

      return new Response(JSON.stringify({
        success: true,
        projects: result.results || [],
        total: result.results?.length || 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error listing projects:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to list projects',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Create a new multi-stage content project
   */
  async createProject(request: Request): Promise<Response> {
    try {
      const body = await request.json() as {
        project_name: string;
        content_type: string; // novel, course, documentary, podcast, etc.
        topic: string;
        target_audience?: string;
        genre?: string;
        metadata?: Record<string, any>;
      };

      // Validate required fields
      if (!body.project_name || !body.content_type || !body.topic) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Missing required fields: project_name, content_type, topic'
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Create project in database
      const result = await this.env.DB.prepare(`
        INSERT INTO content_generation_projects (
          project_name, content_type, topic, target_audience, 
          genre, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        body.project_name,
        body.content_type,
        body.topic,
        body.target_audience || null,
        body.genre || null,
        JSON.stringify(body.metadata || {})
      ).run();

      const projectId = result.meta.last_row_id;

      // Get the created project
      const project = await this.env.DB.prepare(`
        SELECT * FROM content_generation_projects WHERE id = ?
      `).bind(projectId).first();

      return new Response(JSON.stringify({
        success: true,
        project: {
          id: projectId,
          ...project
        }
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error creating project:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Execute a specific stage of content generation
   */
  async executeStage(request: Request): Promise<Response> {
    try {
      const body = await request.json() as {
        project_id: number;
        stage_number: number;
        ai_config?: {
          provider?: string;
          model?: string;
          temperature?: number;
          maxTokens?: number;
        };
      };

      // Get project details
      const project = await this.env.DB.prepare(`
        SELECT * FROM content_generation_projects WHERE id = ?
      `).bind(body.project_id).first();

      if (!project) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Project not found'
        }), { status: 404 });
      }

      // Check if stage is valid
      if (body.stage_number < 1 || body.stage_number > 4) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid stage number. Must be 1-4'
        }), { status: 400 });
      }

      // Get previous stage output if not stage 1
      let previousStageOutput = null;
      if (body.stage_number > 1) {
        const previousStage = await this.env.DB.prepare(`
          SELECT output_data FROM content_generation_stages 
          WHERE project_id = ? AND stage_number = ? AND status = 'completed'
        `).bind(body.project_id, body.stage_number - 1).first();

        if (!previousStage) {
          return new Response(JSON.stringify({
            success: false,
            error: `Stage ${body.stage_number - 1} must be completed first`
          }), { status: 400 });
        }

        previousStageOutput = JSON.parse(previousStage.output_data as string);
      }

      // Create stage record
      const stageResult = await this.env.DB.prepare(`
        INSERT INTO content_generation_stages (
          project_id, stage_number, stage_name, status, 
          input_data, created_at
        ) VALUES (?, ?, ?, 'in_progress', ?, datetime('now'))
      `).bind(
        body.project_id,
        body.stage_number,
        this.getStageName(body.stage_number),
        JSON.stringify(previousStageOutput)
      ).run();

      const stageId = stageResult.meta.last_row_id;

      // Initialize mentor validator for this content type
      this.mentorValidator = new MentorValidator(this.env, project.content_type as string);

      // Load project context once
      const context = body.stage_number > 1 
        ? await this.contextManager.loadProjectContext(body.project_id)
        : { 
            projectId: body.project_id, 
            contentType: project.content_type as string,
            previousStages: [],
            characters: new Map(),
            locations: new Map(),
            timeline: [],
            plotThreads: new Map(),
            styleGuide: {
              tone: 'neutral',
              pov: 'third-person',
              tense: 'past',
              vocabularyLevel: 'standard',
              pacingPreference: 'moderate',
              examples: []
            },
            metadata: {}
          };

      // Build context-aware prompt
      const basePrompt = await this.buildStagePrompt(
        project.content_type as string,
        body.stage_number,
        project.topic as string,
        project.target_audience as string,
        previousStageOutput
      );

      // Enhance prompt with context for stages 2-4
      let prompt = basePrompt;
      if (body.stage_number > 1) {
        prompt = await this.contextManager.buildContextualPrompt(
          body.project_id,
          body.stage_number,
          basePrompt
        );
      }

      // Execute AI generation
      const aiConfig = body.ai_config || {};
      const provider = aiConfig.provider || 'openai';
      const aiProvider = AIProviderFactory.create(provider as any, this.env);
      const model = aiConfig.model || aiProvider.getDefaultModel();

      // Determine appropriate max tokens based on stage
      const defaultMaxTokens = body.stage_number === 4 ? 4000 : 8000;

      const aiResponse = await aiProvider.generateCompletion(prompt, {
        model,
        temperature: aiConfig.temperature || 0.8,
        maxTokens: aiConfig.maxTokens || defaultMaxTokens,
        systemPrompt: this.getSystemPrompt(body.stage_number)
      });

      // Parse and store the output
      let output: any;
      try {
        output = JSON.parse(aiResponse.content);
      } catch {
        // If not JSON, wrap in object
        output = { content: aiResponse.content };
      }

      // Validate with mentor
      const mentorReport = await this.mentorValidator.validate(
        output,
        body.stage_number,
        context
      );

      // If validation fails, attempt correction
      let finalOutput = output;
      let finalReport = mentorReport;
      
      if (mentorReport.score < 70 && mentorReport.issues.length > 0) {
        console.log(`Mentor validation score: ${mentorReport.score}. Attempting correction...`);
        
        // Build correction prompt
        const correctionPrompt = await this.mentorValidator.buildCorrectionPrompt(
          output,
          mentorReport.issues,
          context
        );

        // Generate corrected version
        const correctionResponse = await aiProvider.generateCompletion(correctionPrompt, {
          model,
          temperature: 0.7, // Lower temperature for corrections
          maxTokens: aiConfig.maxTokens || 16000,
          systemPrompt: this.getSystemPrompt(body.stage_number)
        });

        try {
          finalOutput = JSON.parse(correctionResponse.content);
        } catch {
          finalOutput = { content: correctionResponse.content };
        }

        // Re-validate corrected output
        finalReport = await this.mentorValidator.validate(
          finalOutput,
          body.stage_number,
          context
        );

        // Store correction history
        await this.storeCorrectionHistory(
          body.project_id,
          body.stage_number,
          output,
          finalOutput,
          mentorReport.issues,
          finalReport.score
        );
      }

      // Update context with new data
      await this.contextManager.saveContextUpdate(
        body.project_id,
        body.stage_number,
        context
      );

      // Save mentor report
      await this.saveMentorReport(
        body.project_id,
        body.stage_number,
        finalReport
      );

      // Process stage-specific data
      await this.processStageOutput(
        body.project_id,
        stageId,
        body.stage_number,
        finalOutput  // Use validated/corrected output
      );

      // Update stage record
      await this.env.DB.prepare(`
        UPDATE content_generation_stages 
        SET status = 'completed',
            output_data = ?,
            ai_model = ?,
            tokens_used = ?,
            cost_usd = ?,
            validation_score = ?,
            completed_at = datetime('now')
        WHERE id = ?
      `).bind(
        JSON.stringify(finalOutput),
        model,
        (aiResponse.usage?.promptTokens || 0) + (aiResponse.usage?.completionTokens || 0),
        this.calculateCost(aiResponse.usage, provider, model),
        finalReport.score,
        stageId
      ).run();

      // Update project stage
      await this.env.DB.prepare(`
        UPDATE content_generation_projects 
        SET current_stage = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).bind(
        body.stage_number,
        body.project_id
      ).run();

      return new Response(JSON.stringify({
        success: true,
        stage: {
          id: stageId,
          stage_number: body.stage_number,
          stage_name: this.getStageName(body.stage_number),
          output: finalOutput,
          tokens_used: aiResponse.usage,
          validation: {
            score: finalReport.score,
            issues_fixed: mentorReport.score < finalReport.score ? mentorReport.issues.length : 0,
            mentor_insight: finalReport.mentorInsight,
            continuity_check: finalReport.continuityCheck
          },
          next_stage: body.stage_number < 4 ? body.stage_number + 1 : null
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error executing stage:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Get project status and overview
   */
  async getProjectStatus(request: Request, projectId: string): Promise<Response> {
    try {
      // Get project details
      const project = await this.env.DB.prepare(`
        SELECT * FROM content_generation_projects WHERE id = ?
      `).bind(projectId).first();

      if (!project) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Project not found'
        }), { status: 404 });
      }

      // Get stages
      const stages = await this.env.DB.prepare(`
        SELECT * FROM content_generation_stages 
        WHERE project_id = ? 
        ORDER BY stage_number
      `).bind(projectId).all();

      // Get object count
      const objectCount = await this.env.DB.prepare(`
        SELECT COUNT(*) as count FROM content_objects WHERE project_id = ?
      `).bind(projectId).first();

      // Get structural units count
      const structuralCount = await this.env.DB.prepare(`
        SELECT COUNT(*) as count FROM content_structural_units WHERE project_id = ?
      `).bind(projectId).first();

      // Get granular units count
      const granularCount = await this.env.DB.prepare(`
        SELECT COUNT(*) as count FROM content_granular_units WHERE project_id = ?
      `).bind(projectId).first();

      return new Response(JSON.stringify({
        success: true,
        project: {
          ...project,
          stages: stages.results,
          statistics: {
            objects: objectCount?.count || 0,
            structural_units: structuralCount?.count || 0,
            granular_units: granularCount?.count || 0,
            completed_stages: stages.results.filter((s: any) => s.status === 'completed').length
          }
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error getting project status:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Process and store stage-specific output
   */
  private async processStageOutput(
    projectId: number,
    stageId: number,
    stageNumber: number,
    output: any
  ): Promise<void> {
    switch (stageNumber) {
      case 1:
        // Stage 1: Big Picture - just store the vision
        break;

      case 2:
        // Stage 2: Objects & Relations
        await this.storeObjects(projectId, stageId, output);
        await this.storeTimeline(projectId, stageId, output);
        break;

      case 3:
        // Stage 3: Structure
        await this.storeStructuralUnits(projectId, stageId, output);
        break;

      case 4:
        // Stage 4: Granular Units
        await this.storeGranularUnits(projectId, stageId, output);
        break;
    }
  }

  /**
   * Store objects from Stage 2
   */
  private async storeObjects(projectId: number, stageId: number, output: any): Promise<void> {
    const objects = output.objects || [];
    
    for (const obj of objects) {
      await this.env.DB.prepare(`
        INSERT INTO content_objects (
          project_id, stage_id, object_type, object_code, 
          name, description, extended_info, relationships, 
          metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        projectId,
        stageId,
        obj.type,
        obj.code || obj.id,
        obj.name,
        obj.description,
        obj.extended_info || obj.backstory || null,
        JSON.stringify(obj.relationships || {}),
        JSON.stringify(obj.metadata || {})
      ).run();
    }
  }

  /**
   * Store timeline from Stage 2
   */
  private async storeTimeline(projectId: number, stageId: number, output: any): Promise<void> {
    const timeline = output.timeline || [];
    
    for (let i = 0; i < timeline.length; i++) {
      const event = timeline[i];
      await this.env.DB.prepare(`
        INSERT INTO content_timeline (
          project_id, stage_id, sequence_order, time_marker,
          event_description, event_type, involved_objects,
          impact_level, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        projectId,
        stageId,
        i + 1,
        event.time,
        event.description,
        event.type || 'main_content',
        JSON.stringify(event.objects || []),
        event.impact || 'important'
      ).run();
    }
  }

  /**
   * Store structural units from Stage 3
   */
  private async storeStructuralUnits(projectId: number, stageId: number, output: any): Promise<void> {
    const units = output.structural_units || output.structure || [];
    
    const storeUnit = async (unit: any, parentId: number | null = null, level: number = 1) => {
      const result = await this.env.DB.prepare(`
        INSERT INTO content_structural_units (
          project_id, stage_id, parent_unit_id, unit_level,
          unit_type, unit_code, title, description,
          featured_objects, target_size, size_unit,
          metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        projectId,
        stageId,
        parentId,
        level,
        unit.type,
        unit.code || unit.id,
        unit.title || unit.name,
        unit.description,
        JSON.stringify(unit.objects || []),
        unit.target_size || unit.word_count || null,
        unit.size_unit || 'words',
        JSON.stringify(unit.metadata || {})
      ).run();

      const unitId = result.meta.last_row_id;

      // Recursively store children
      if (unit.children || unit.elements) {
        const children = unit.children || unit.elements;
        for (const child of children) {
          await storeUnit(child, unitId, level + 1);
        }
      }
    };

    for (const unit of units) {
      await storeUnit(unit);
    }
  }

  /**
   * Store granular units from Stage 4
   */
  private async storeGranularUnits(projectId: number, stageId: number, output: any): Promise<void> {
    const units = output.granular_units || output.scenes || output.activities || [];
    
    for (const unit of units) {
      // Find parent structural unit
      const parent = await this.env.DB.prepare(`
        SELECT id FROM content_structural_units 
        WHERE project_id = ? AND unit_code = ?
      `).bind(projectId, unit.parent_code || unit.chapter_code).first();

      if (parent) {
        await this.env.DB.prepare(`
          INSERT INTO content_granular_units (
            project_id, structural_unit_id, stage_id,
            unit_number, unit_type, unit_code, title,
            description, estimated_size, size_unit,
            execution_style, research_needed, featured_objects,
            progression_arc, key_elements, creator_notes,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).bind(
          projectId,
          parent.id,
          stageId,
          unit.number || 1,
          unit.type || 'scene',
          unit.code || unit.id,
          unit.title || unit.name,
          unit.description,
          unit.estimated_size || unit.word_count || 2000,
          unit.size_unit || 'words',
          unit.style || 'narrative',
          JSON.stringify(unit.research || []),
          JSON.stringify(unit.objects || []),
          unit.arc || unit.progression || null,
          JSON.stringify(unit.key_elements || unit.key_lines || []),
          unit.notes || null
        ).run();
      }
    }
  }

  /**
   * Build stage-specific prompt
   */
  private async buildStagePrompt(
    contentType: string,
    stageNumber: number,
    topic: string,
    audience: string,
    previousOutput: any
  ): Promise<string> {
    const stagePrompts = {
      novel: {
        1: `Create a comprehensive BIG PICTURE for a novel about: "${topic}"
Target audience: ${audience || 'general readers'}

Generate:
1. CORE CONCEPT
   - Central premise (1-2 sentences)
   - Genre and sub-genre
   - Unique selling proposition

2. THEMATIC FRAMEWORK
   - Primary theme and message
   - Secondary themes (3-5)
   - Philosophical questions explored
   - Emotional journey for reader

3. NARRATIVE ARC
   - Beginning: Initial state/problem
   - Middle: Escalation and complications
   - End: Resolution and transformation
   - Key turning points (3-5)

4. WORLD VISION
   - Setting overview
   - Time period/timeline
   - Atmosphere and tone
   - Rules of the world

5. CORE CONFLICTS
   - External conflict
   - Internal conflict
   - Societal/philosophical conflict
   - Stakes and consequences

Format as JSON with clear sections.`,

        2: `Based on the big picture, create detailed OBJECTS AND TIMELINE for the novel.

Previous output:
${JSON.stringify(previousOutput, null, 2)}

Generate JSON with:
{
  "objects": [
    {
      "type": "character",
      "code": "char_protagonist",
      "name": "Full Name",
      "description": "200-word character description",
      "backstory": "200-word backstory",
      "relationships": {},
      "metadata": {}
    }
  ],
  "timeline": [
    {
      "time": "10 years before story",
      "description": "Event description",
      "type": "backstory",
      "objects": ["char_protagonist"],
      "impact": "critical"
    }
  ]
}

Include minimum:
- 10 characters with 200-word descriptions
- 8 locations with atmosphere
- Complete timeline of events`,

        3: `Create detailed STRUCTURE with 200-word descriptions for each chapter.

Using objects from Stage 2:
${JSON.stringify(previousOutput, null, 2)}

Generate JSON with 3 acts, each with 5-7 chapters:
{
  "structure": [
    {
      "type": "act",
      "code": "1",
      "title": "Act Title",
      "description": "200-word act description",
      "children": [
        {
          "type": "chapter",
          "code": "1.1",
          "title": "Chapter Title",
          "description": "200-word chapter description including opening hook, main events, character development, dialogue highlights, emotional beats, revelations, action, reflection, and ending",
          "objects": ["char_protagonist", "loc_main"],
          "word_count": 5000,
          "metadata": {
            "pov": "character_name",
            "tone": "suspenseful"
          }
        }
      ]
    }
  ]
}`,

        4: `Break down chapters into SCENES with 200-word descriptions.

Structure from Stage 3:
${JSON.stringify(previousOutput, null, 2)}

For each chapter, create 3-5 scenes:
{
  "granular_units": [
    {
      "type": "scene",
      "code": "1.1.1",
      "parent_code": "1.1",
      "title": "Scene Title",
      "description": "200-word scene description with opening line, action beats, dialogue snippets, sensory details, character emotions, tensions, environment, body language, pacing, and transition",
      "word_count": 2000,
      "style": "descriptive",
      "research": ["topic1", "topic2"],
      "objects": ["char_protagonist"],
      "arc": "calm → tension → revelation",
      "key_lines": ["Important dialogue", "Key description"],
      "notes": "Writing guidance"
    }
  ]
}`
      },

      course: {
        1: `Create a comprehensive BIG PICTURE for a course about: "${topic}"
Target audience: ${audience || 'learners'}

Generate:
1. LEARNING OBJECTIVES
   - Primary learning outcomes
   - Skills to be developed
   - Knowledge to be gained

2. PREREQUISITE KNOWLEDGE
   - Required background
   - Recommended preparation

3. COURSE STRUCTURE
   - Pedagogical approach
   - Assessment strategy
   - Learning progression

4. CONTENT SCOPE
   - Topics covered
   - Depth of coverage
   - Practical applications

Format as JSON with clear sections.`,

        2: `Create OBJECTS AND LEARNING PATHS for the course.

Previous output:
${JSON.stringify(previousOutput, null, 2)}

Generate JSON with concepts, tools, resources, and learning sequence.`,

        3: `Create MODULES and LESSONS with 200-word descriptions.

Generate JSON with modules containing lessons, each with detailed descriptions.`,

        4: `Create ACTIVITIES and EXERCISES with 200-word descriptions.

Break down lessons into specific learning activities.`
      },

      documentary: {
        1: `Create a BIG PICTURE for a documentary about: "${topic}"
Target audience: ${audience || 'viewers'}

Include thesis, arguments, narrative approach, and visual strategy.`,

        2: `Create SUBJECTS, EVIDENCE, and CHRONOLOGY for the documentary.`,

        3: `Create EPISODE STRUCTURE with 200-word descriptions.`,

        4: `Create SCENES and INTERVIEW SEGMENTS with 200-word descriptions.`
      }
    };

    // Get prompts for content type, default to novel if not found
    const prompts = stagePrompts[contentType] || stagePrompts.novel;
    return prompts[stageNumber] || prompts[1];
  }

  /**
   * Get system prompt for stage
   */
  private getSystemPrompt(stageNumber: number): string {
    const prompts = {
      1: 'You are a creative visionary and strategic planner. Create comprehensive, well-structured frameworks.',
      2: 'You are a world-builder and relationship designer. Create rich, detailed objects and connections.',
      3: 'You are a structural architect. Create clear, hierarchical structures with detailed descriptions.',
      4: 'You are a detail-oriented scene designer. Create granular units ready for content generation.'
    };
    return prompts[stageNumber] || prompts[1];
  }

  /**
   * Get stage name
   */
  private getStageName(stageNumber: number): string {
    const names = {
      1: 'big_picture',
      2: 'objects_relations',
      3: 'structure',
      4: 'granular_units'
    };
    return names[stageNumber] || 'unknown';
  }

  /**
   * Calculate cost based on token usage
   */
  private calculateCost(
    usage: any,
    provider: string,
    model: string
  ): number {
    if (!usage) return 0;
    
    const rates = {
      'openai': {
        'gpt-4o': { input: 0.005, output: 0.015 },
        'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
        'default': { input: 0.0001, output: 0.0002 }
      },
      'default': {
        'default': { input: 0.0001, output: 0.0001 }
      }
    };

    const providerRates = rates[provider] || rates['default'];
    const modelRates = providerRates[model] || providerRates['default'];

    return ((usage.promptTokens || 0) * modelRates.input / 1000) +
           ((usage.completionTokens || 0) * modelRates.output / 1000);
  }

  /**
   * Save mentor validation report
   */
  private async saveMentorReport(
    projectId: number,
    stageNumber: number,
    report: any
  ): Promise<void> {
    try {
      await this.env.DB.prepare(`
        INSERT INTO mentor_reports (
          project_id, stage_number, validation_score,
          issues, suggestions, corrections_applied,
          mentor_insight, continuity_check, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        projectId,
        stageNumber,
        report.score,
        JSON.stringify(report.issues),
        JSON.stringify(report.suggestions),
        JSON.stringify(report.corrections),
        report.mentorInsight,
        JSON.stringify(report.continuityCheck)
      ).run();
    } catch (error) {
      console.error('Failed to save mentor report:', error);
      // Non-critical, continue
    }
  }

  /**
   * Store correction history
   */
  private async storeCorrectionHistory(
    projectId: number,
    stageNumber: number,
    original: any,
    corrected: any,
    issues: any[],
    finalScore: number
  ): Promise<void> {
    try {
      await this.env.DB.prepare(`
        INSERT INTO correction_history (
          project_id, stage_number, original_content,
          corrected_content, issues_fixed, final_score,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        projectId,
        stageNumber,
        JSON.stringify(original),
        JSON.stringify(corrected),
        JSON.stringify(issues),
        finalScore
      ).run();
    } catch (error) {
      console.error('Failed to store correction history:', error);
      // Non-critical, continue
    }
  }
}