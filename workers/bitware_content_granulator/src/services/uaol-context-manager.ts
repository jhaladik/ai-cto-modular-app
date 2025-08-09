/**
 * UAOL Context Manager
 * Manages project context using Universal AI Object Language notations
 * Dramatically reduces context size while maintaining semantic richness
 */

import { D1Database } from '@cloudflare/workers-types';
import { KVNamespace } from '@cloudflare/workers-types';
import { Env } from '../types/env';
import { UAOLParser } from './uaol-parser';
import { UAOLCodec } from './uaol-codec';
import { AdaptiveUAOLCodec } from './adaptive-uaol-codec';

export interface UAOLContext {
  projectId: number;
  contentType: string;
  notations: string[];
  stageNotations: Record<number, string[]>;
  evolutions: Array<{
    from: string;
    to: string;
    trigger: string;
    timestamp: string;
  }>;
  metadata: Record<string, any>;
}

export class UAOLContextManager {
  private parser: UAOLParser;
  private codec: UAOLCodec;
  private adaptiveCodec: AdaptiveUAOLCodec | null = null;

  constructor(
    private db: D1Database,
    private kv: KVNamespace,
    private env: Env
  ) {
    this.parser = new UAOLParser();
    this.codec = new UAOLCodec();
    this.adaptiveCodec = null; // Will be initialized with AI provider
  }

  /**
   * Load UAOL context for a project
   */
  async loadContext(projectId: number): Promise<UAOLContext> {
    // Try cache first
    const cacheKey = `uaol:${projectId}`;
    const cached = await this.kv.get(cacheKey, 'json');
    
    if (cached) {
      return cached as UAOLContext;
    }

    // Load from database
    const context = await this.buildContextFromDatabase(projectId);
    
    // Cache for 1 hour
    await this.kv.put(cacheKey, JSON.stringify(context), {
      expirationTtl: 3600
    });

    return context;
  }

  /**
   * Save UAOL notations from a stage
   */
  async saveStageNotations(
    projectId: number,
    stageNumber: number,
    stageOutput: any,
    aiProvider?: any
  ): Promise<string[]> {
    let notations: string[] = [];
    
    // Use Adaptive UAOL if AI provider available
    if (aiProvider) {
      try {
        // Initialize adaptive codec if needed
        if (!this.adaptiveCodec) {
          this.adaptiveCodec = new AdaptiveUAOLCodec(aiProvider, this.db);
        }
        
        // Get previous notations for context
        const previousNotations = await this.getPreviousNotations(projectId, stageNumber);
        
        // Use adaptive encoding
        notations = await this.adaptiveCodec.encode(
          stageOutput,
          stageNumber,
          projectId,
          previousNotations
        );
        
        console.log(`[UAOL Context] Adaptive encoding produced ${notations.length} notations`);
      } catch (error) {
        console.error('[UAOL Context] Adaptive encoding failed:', error);
        // Fall back to traditional encoding
        const compressed = this.codec.compressStageOutput(stageOutput, stageNumber);
        notations = compressed.notations;
      }
    } else {
      // Use traditional encoding
      const compressed = this.codec.compressStageOutput(stageOutput, stageNumber);
      notations = compressed.notations;
    }
    
    // Store notations in database
    const batch: any[] = [];
    
    for (const notation of notations) {
      try {
        // Extract entity type (first part of notation)
        const parts = notation.split('.');
        const entityType = parts[0] || 'unknown';
        
        batch.push(
          this.db.prepare(`
            INSERT INTO uaol_notations (
              project_id, stage_number, notation, 
              entity_type, rich_data, created_at
            ) VALUES (?, ?, ?, ?, ?, datetime('now'))
          `).bind(
            projectId,
            stageNumber,
            notation,
            entityType,
            JSON.stringify({ source: 'adaptive', stage: stageNumber })
          )
        );
      } catch (e) {
        console.warn(`[UAOL] Skipping invalid notation: ${notation}`);
      }
    }

    if (batch.length > 0) {
      await this.db.batch(batch);
    }

    // Invalidate cache
    await this.kv.delete(`uaol:${projectId}`);

    return notations;
  }

  /**
   * Get previous stage notations
   */
  private async getPreviousNotations(projectId: number, currentStage: number): Promise<string[]> {
    const result = await this.db.prepare(`
      SELECT notation FROM uaol_notations 
      WHERE project_id = ? AND stage_number < ?
      ORDER BY stage_number, created_at
    `).bind(projectId, currentStage).all();
    
    return result.results.map((r: any) => r.notation);
  }

  /**
   * Build context-aware prompt using UAOL
   */
  async buildUAOLPrompt(
    projectId: number,
    stageNumber: number,
    basePrompt: string
  ): Promise<string> {
    const context = await this.loadContext(projectId);
    
    // Get relevant notations for this stage
    const relevantNotations = this.getRelevantNotations(context, stageNumber);
    
    // Build UAOL context section
    let uaolPrompt = `=== UAOL CONTEXT ===\n`;
    uaolPrompt += `Project Type: ${context.contentType}\n`;
    uaolPrompt += `Current Stage: ${stageNumber}\n\n`;

    // Add stage-specific context
    switch (stageNumber) {
      case 2:
        uaolPrompt += this.buildStage2Context(relevantNotations);
        break;
      case 3:
        uaolPrompt += this.buildStage3Context(relevantNotations);
        break;
      case 4:
        uaolPrompt += this.buildStage4Context(relevantNotations);
        break;
    }

    // Add generation instructions
    uaolPrompt += this.getGenerationInstructions(stageNumber, context.contentType);

    // Add base prompt
    uaolPrompt += `\n=== YOUR TASK ===\n${basePrompt}\n`;

    return uaolPrompt;
  }

  /**
   * Track evolution of UAOL objects
   */
  async trackEvolution(
    projectId: number,
    fromNotation: string,
    toNotation: string,
    trigger: string
  ): Promise<void> {
    await this.db.prepare(`
      INSERT INTO uaol_evolutions (
        project_id, from_notation, to_notation, 
        trigger, created_at
      ) VALUES (?, ?, ?, ?, datetime('now'))
    `).bind(projectId, fromNotation, toNotation, trigger).run();

    // Invalidate cache
    await this.kv.delete(`uaol:${projectId}`);
  }

  /**
   * Get character notations from context
   */
  getCharacters(context: UAOLContext): string[] {
    return context.notations.filter(n => n.startsWith('char.'));
  }

  /**
   * Get location notations from context
   */
  getLocations(context: UAOLContext): string[] {
    return context.notations.filter(n => n.startsWith('loc.'));
  }

  /**
   * Get structure notations from context
   */
  getStructure(context: UAOLContext): string[] {
    return context.notations.filter(n => n.startsWith('struct.'));
  }

  /**
   * Expand UAOL notation to rich object (for human display)
   */
  async expandNotation(notation: string): Promise<any> {
    // First check if we have the rich data stored
    const stored = await this.db.prepare(`
      SELECT rich_data FROM uaol_notations 
      WHERE notation = ? LIMIT 1
    `).bind(notation).first();

    if (stored && stored.rich_data) {
      return JSON.parse(stored.rich_data as string);
    }

    // Otherwise, use AI to expand
    return this.expandWithAI(notation);
  }

  // Private helper methods

  private async buildContextFromDatabase(projectId: number): Promise<UAOLContext> {
    // Load project metadata
    const project = await this.db.prepare(`
      SELECT * FROM content_generation_projects WHERE id = ?
    `).bind(projectId).first();

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Load all UAOL notations for this project
    const notations = await this.db.prepare(`
      SELECT * FROM uaol_notations 
      WHERE project_id = ? 
      ORDER BY stage_number, created_at
    `).bind(projectId).all();

    // Load evolutions
    const evolutions = await this.db.prepare(`
      SELECT * FROM uaol_evolutions 
      WHERE project_id = ? 
      ORDER BY created_at
    `).bind(projectId).all();

    // Build context
    const context: UAOLContext = {
      projectId,
      contentType: project.content_type as string,
      notations: [],
      stageNotations: {},
      evolutions: [],
      metadata: project.metadata as any || {}
    };

    // Process notations
    const notationResults = notations.results || [];
    for (const notation of notationResults) {
      context.notations.push(notation.notation as string);
      
      const stage = notation.stage_number as number;
      if (!context.stageNotations[stage]) {
        context.stageNotations[stage] = [];
      }
      context.stageNotations[stage].push(notation.notation as string);
    }

    // Process evolutions
    const evolutionResults = evolutions.results || [];
    for (const evolution of evolutionResults) {
      context.evolutions.push({
        from: evolution.from_notation as string,
        to: evolution.to_notation as string,
        trigger: evolution.trigger as string,
        timestamp: evolution.created_at as string
      });
    }

    return context;
  }

  private getRelevantNotations(context: UAOLContext, stageNumber: number): string[] {
    const relevant: string[] = [];

    // For each stage, include notations from previous stages
    for (let stage = 1; stage < stageNumber; stage++) {
      if (context.stageNotations[stage]) {
        relevant.push(...context.stageNotations[stage]);
      }
    }

    return relevant;
  }

  private buildStage2Context(notations: string[]): string {
    const concepts = notations.filter(n => n.startsWith('concept.'));
    
    let context = 'Previous Stage Concepts:\n';
    concepts.forEach(concept => {
      context += `  ${concept}\n`;
      context += `  Meaning: ${this.parser.extractMeaning(concept)}\n\n`;
    });

    context += '\nTask: Generate characters, locations, and relationships based on these concepts.\n';
    return context;
  }

  private buildStage3Context(notations: string[]): string {
    const chars = notations.filter(n => n.startsWith('char.'));
    const locs = notations.filter(n => n.startsWith('loc.'));
    const concepts = notations.filter(n => n.startsWith('concept.'));
    const themes = notations.filter(n => n.startsWith('theme.'));
    
    // Extract just the essential identifiers to minimize prompt size
    const charNames = chars.map(c => c.split('.')[1]).slice(0, 10); // Max 10 characters
    const locNames = locs.map(l => l.split('.')[1]).slice(0, 8);    // Max 8 locations
    const coreThemes = [...concepts, ...themes].map(t => t.split('.')[1]).slice(0, 5); // Max 5 themes

    let context = '=== STAGE 3: STRUCTURE CREATION ===\n\n';
    context += 'AVAILABLE ENTITIES (use these in your structure):\n';
    context += `Characters: ${charNames.join(', ')}\n`;
    context += `Locations: ${locNames.join(', ')}\n`;
    context += `Core Themes: ${coreThemes.join(', ')}\n\n`;
    
    context += 'TASK: Create a 3-act structure with chapters.\n';
    context += 'REQUIREMENTS:\n';
    context += '- Each act must reference available characters\n';
    context += '- Each chapter must use at least one location\n';
    context += '- Structure must advance the core themes\n';
    context += '- Output clean JSON with acts/chapters hierarchy\n\n';
    context += 'OUTPUT FORMAT:\n';
    context += '{\n';
    context += '  "structure": [\n';
    context += '    {\n';
    context += '      "act": 1,\n';
    context += '      "title": "Act Title",\n';
    context += '      "chapters": [\n';
    context += '        {"number": 1, "title": "Chapter Title", "location": "loc_name", "focus": "char_name"}\n';
    context += '      ]\n';
    context += '    }\n';
    context += '  ]\n';
    context += '}\n';
    
    return context;
  }

  private buildStage4Context(notations: string[]): string {
    const chars = notations.filter(n => n.startsWith('char.'));
    const locs = notations.filter(n => n.startsWith('loc.'));
    const structs = notations.filter(n => n.startsWith('struct.'));
    
    // Extract identifiers efficiently
    const charNames = chars.map(c => c.split('.')[1]).slice(0, 10);
    const locNames = locs.map(l => l.split('.')[1]).slice(0, 8);
    
    // Extract structure summary (acts and chapter counts)
    const structureSummary = structs.slice(0, 3).map(s => {
      const parts = s.split('.');
      return `${parts[1] || 'act'}(${parts[2] || ''})`; // e.g., "act1(introduction)"
    });

    let context = '=== STAGE 4: SCENE GENERATION ===\n\n';
    context += 'AVAILABLE ELEMENTS:\n';
    context += `Characters: ${charNames.join(', ')}\n`;
    context += `Locations: ${locNames.join(', ')}\n`;
    context += `Structure: ${structureSummary.join(' → ')}\n\n`;
    
    context += 'TASK: Generate detailed scenes for each chapter.\n';
    context += 'REQUIREMENTS:\n';
    context += '- Each scene must use characters from the list\n';
    context += '- Each scene must be set in a listed location\n';
    context += '- Scenes must follow the established structure\n';
    context += '- Include conflict, dialogue hints, and emotional beats\n\n';
    context += 'OUTPUT FORMAT:\n';
    context += '{\n';
    context += '  "scenes": [\n';
    context += '    {\n';
    context += '      "id": "scene_1_1",\n';
    context += '      "act": 1,\n';
    context += '      "chapter": 1,\n';
    context += '      "location": "location_name",\n';
    context += '      "characters": ["char1", "char2"],\n';
    context += '      "conflict": "What tension drives this scene",\n';
    context += '      "outcome": "How scene advances plot"\n';
    context += '    }\n';
    context += '  ]\n';
    context += '}\n';

    // Continue with existing structure display if needed
    if (structs.length > 0 && false) { // Disabled verbose structure output
      context += '\nDetailed Structure:\n';
      structs.forEach(struct => {
        const parsed = this.parser.parse(struct);
        context += `  ${parsed.identifier}: ${parsed.attributes.join(' ')}\n`;
      });
      context += '\n';
    }

    context += 'Task: Generate detailed scenes using these elements.\n';
    return context;
  }

  private getGenerationInstructions(stage: number, contentType: string): string {
    let instructions = '\n=== GENERATION INSTRUCTIONS ===\n';

    switch (stage) {
      case 2:
        instructions += 'Generate characters and locations that embody the established themes.\n';
        instructions += 'Use the character and location names in your output.\n';
        instructions += 'Keep descriptions concise but meaningful.\n';
        break;

      case 3:
        instructions += 'Create a coherent 3-act structure.\n';
        instructions += 'Reference characters and locations by name only.\n';
        instructions += 'Focus on plot progression and pacing.\n';
        break;

      case 4:
        instructions += 'Generate scenes that bring the structure to life.\n';
        instructions += 'Use established characters and locations.\n';
        instructions += 'Focus on conflict and character development.\n';
        instructions += 'Each scene should have clear purpose and outcome.\n';
        break;
    }

    return instructions;
  }

  private async expandWithAI(notation: string): Promise<any> {
    const instruction = this.codec.decode(notation);
    
    // Use Cloudflare AI to expand the notation
    try {
      // @ts-ignore - Cloudflare AI binding
      const response = await this.env.AI.run('@cf/meta/llama-2-7b-chat-fp16', {
        messages: [
          {
            role: 'system',
            content: 'You are an expert at expanding UAOL notations into rich descriptions.'
          },
          {
            role: 'user',
            content: `Expand this UAOL notation into a rich object:\n${notation}\n\n${instruction.naturalLanguage}`
          }
        ],
        max_tokens: 500
      });

      return {
        notation,
        expanded: response.response,
        instruction: instruction.naturalLanguage
      };
    } catch (error) {
      console.error('Failed to expand notation with AI:', error);
      return {
        notation,
        error: 'Expansion failed',
        instruction: instruction.naturalLanguage
      };
    }
  }
}

// Export factory function
export function createUAOLContextManager(db: D1Database, kv: KVNamespace, env: Env) {
  return new UAOLContextManager(db, kv, env);
}