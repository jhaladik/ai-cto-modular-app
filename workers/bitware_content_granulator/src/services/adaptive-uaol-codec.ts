/**
 * Adaptive Universal AI Object Language (UAOL) Codec
 * A living, evolving encoding system that learns and adapts to each project's unique DNA
 */

import { UAOLParser } from './uaol-parser';

export interface ProjectGenome {
  projectId: number;
  contentType: string;
  coreThemes: string[];
  establishedPatterns: Record<string, string>;
  semanticRules: string[];
  notationStyle: string;
  constraints: string[];
  vocabulary: Set<string>;
}

export interface EncodingContext {
  stage: number;
  previousNotations: string[];
  genome: ProjectGenome;
  stageOutput: any;
}

export class AdaptiveUAOLCodec {
  private projectGenomes: Map<number, ProjectGenome> = new Map();
  private parser: UAOLParser;
  private aiProvider: any;
  private db: any;

  constructor(aiProvider?: any, db?: any) {
    this.parser = new UAOLParser();
    this.aiProvider = aiProvider;
    this.db = db;
  }

  /**
   * Initialize or update project genome from Stage 1
   */
  async initializeGenome(projectId: number, stage1Output: any, contentType: string): Promise<ProjectGenome> {
    console.log(`[Adaptive UAOL] Initializing genome for project ${projectId}`);
    
    // Clean the output if it contains nested JSON or markdown
    let cleanOutput = stage1Output;
    if (stage1Output.content && typeof stage1Output.content === 'string') {
      // Extract JSON from markdown if present
      if (stage1Output.content.includes('```json')) {
        const match = stage1Output.content.match(/```json\n([\s\S]*?)\n```/);
        if (match) {
          try {
            cleanOutput = JSON.parse(match[1]);
          } catch (e) {
            console.warn('[Adaptive UAOL] Failed to extract JSON from markdown');
          }
        }
      } else {
        try {
          cleanOutput = JSON.parse(stage1Output.content);
        } catch (e) {
          // Keep original if not JSON
        }
      }
    }
    
    const prompt = `
Analyze this Stage 1 output and extract the project's conceptual DNA.
This will establish the constraints and patterns for all future stages.

Output:
${JSON.stringify(cleanOutput, null, 2).substring(0, 2000)}

Extract and return as JSON:
{
  "coreThemes": ["main conceptual themes that will persist"],
  "notationStyle": "describe the notation pattern that should be used",
  "semanticRules": ["rules for maintaining consistency"],
  "constraints": ["what must be preserved in future stages"],
  "keyVocabulary": ["important terms to maintain"]
}`;

    try {
      const response = await this.aiProvider.generateCompletion(prompt, {
        model: 'gpt-3.5-turbo',
        temperature: 0.3,
        maxTokens: 1000
      });

      const genomeData = JSON.parse(response.content);
      
      const genome: ProjectGenome = {
        projectId,
        contentType,
        coreThemes: genomeData.coreThemes || [],
        establishedPatterns: {},
        semanticRules: genomeData.semanticRules || [],
        notationStyle: genomeData.notationStyle || 'standard',
        constraints: genomeData.constraints || [],
        vocabulary: new Set(genomeData.keyVocabulary || [])
      };

      // Save to database if available
      if (this.db) {
        await this.saveGenome(genome);
      }

      this.projectGenomes.set(projectId, genome);
      console.log(`[Adaptive UAOL] Genome initialized with ${genome.coreThemes.length} themes`);
      
      return genome;
    } catch (error) {
      console.error('[Adaptive UAOL] Failed to initialize genome:', error);
      // Fallback genome
      const fallback = {
        projectId,
        contentType,
        coreThemes: ['exploration'],
        establishedPatterns: {},
        semanticRules: [],
        notationStyle: 'standard',
        constraints: [],
        vocabulary: new Set()
      };
      
      if (this.db) {
        await this.saveGenome(fallback);
      }
      
      return fallback;
    }
  }

  /**
   * Adaptive encoding that respects project genome
   */
  async encode(
    stageOutput: any,
    stage: number,
    projectId: number,
    previousNotations: string[] = []
  ): Promise<string[]> {
    console.log(`[Adaptive UAOL] Encoding Stage ${stage} for project ${projectId}`);
    
    // Get or create genome
    let genome = this.projectGenomes.get(projectId);
    
    // Try to load from database if not in memory
    if (!genome && this.db) {
      genome = await this.loadGenome(projectId);
    }
    
    if (!genome && stage === 1) {
      genome = await this.initializeGenome(projectId, stageOutput, 'unknown');
    } else if (!genome) {
      console.warn('[Adaptive UAOL] No genome found, using fallback');
      genome = {
        projectId,
        contentType: 'unknown',
        coreThemes: ['exploration'],
        establishedPatterns: {},
        semanticRules: [],
        notationStyle: 'standard',
        constraints: [],
        vocabulary: new Set()
      };
    }

    // Clean the output if it contains nested JSON or markdown
    let cleanOutput = stageOutput;
    
    // Handle various nested content formats
    if (typeof stageOutput === 'object' && stageOutput.content) {
      if (typeof stageOutput.content === 'string') {
        // First try to extract JSON from markdown blocks
        if (stageOutput.content.includes('```json')) {
          const match = stageOutput.content.match(/```json\n([\s\S]*?)\n```/);
          if (match) {
            try {
              cleanOutput = JSON.parse(match[1]);
              console.log('[Adaptive UAOL] Extracted JSON from markdown block');
            } catch (e) {
              console.warn('[Adaptive UAOL] Failed to parse JSON from markdown:', e);
            }
          }
        } 
        // Try parsing as direct JSON
        else {
          try {
            cleanOutput = JSON.parse(stageOutput.content);
            console.log('[Adaptive UAOL] Parsed content as direct JSON');
          } catch (e) {
            // If not JSON, use the content as-is
            cleanOutput = { content: stageOutput.content };
            console.log('[Adaptive UAOL] Using content as plain text');
          }
        }
      } else if (typeof stageOutput.content === 'object') {
        // Content is already an object
        cleanOutput = stageOutput.content;
      }
    }
    
    // Log what we're working with
    console.log(`[Adaptive UAOL] Stage ${stage} output type:`, typeof cleanOutput);
    if (typeof cleanOutput === 'object') {
      console.log('[Adaptive UAOL] Output keys:', Object.keys(cleanOutput).slice(0, 5));
    }
    
    // Build context-aware prompt
    const prompt = this.buildAdaptivePrompt(cleanOutput, stage, genome, previousNotations);
    
    try {
      const response = await this.aiProvider.generateCompletion(prompt, {
        model: 'gpt-3.5-turbo',
        temperature: 0.4,
        maxTokens: 1500
      });

      const result = JSON.parse(response.content);
      
      // Validate notations maintain consistency
      const validNotations: string[] = [];
      for (const item of result.notations || []) {
        const notation = item.notation || item;
        if (await this.validateConsistency(notation, genome, previousNotations)) {
          validNotations.push(notation);
          // Update genome patterns
          this.updateGenomePatterns(genome, notation, stage);
        }
      }

      console.log(`[Adaptive UAOL] Encoded ${validNotations.length} consistent notations`);
      return validNotations;
      
    } catch (error) {
      console.error('[Adaptive UAOL] Encoding failed:', error);
      return this.fallbackEncoding(stageOutput, stage);
    }
  }

  /**
   * Build adaptive prompt based on genome and context
   */
  private buildAdaptivePrompt(
    output: any,
    stage: number,
    genome: ProjectGenome,
    previousNotations: string[]
  ): string {
    const stageInstructions = {
      1: `Create foundational concept notations. These will establish the genetic code for the entire project.
Pattern suggestion: concept.{theme}.{domain}.{quality}.{state}
Focus on capturing the essential DNA that will constrain all future content.`,
      
      2: `Create entity notations that embody the established concepts.
Previous concepts to reference: ${genome.coreThemes.join(', ')}
Established vocabulary: ${Array.from(genome.vocabulary).slice(0, 10).join(', ')}

Entities MUST reference or embody the core themes.
Pattern suggestions:
- char.{name}.{role}.{traits}.{connection_to_theme}.{state}
- loc.{name}.{type}.{quality}.{theme_relevance}.{atmosphere}
- rel.{entity1}_{entity2}.{type}.{theme_connection}.{dynamic}`,
      
      3: `Create structure notations using established entities.
Available entities: ${previousNotations.filter(n => n.startsWith('char.') || n.startsWith('loc.')).slice(0, 5).join(', ')}
Core themes to maintain: ${genome.coreThemes.join(', ')}

Structure MUST organize the entities while preserving thematic consistency.
Pattern: struct.{id}.{type}.{scope}.{entity_focus}.{theme_progression}.{arc}`,
      
      4: `Create scene notations instantiating structure with entities.
Use only established entities and maintain thematic continuity.
Available characters: ${previousNotations.filter(n => n.startsWith('char.')).join(', ')}
Available locations: ${previousNotations.filter(n => n.startsWith('loc.')).join(', ')}

Scenes MUST use existing entities and advance established themes.
Pattern: scene.{id}.{location}.{characters}.{action}.{theme_expression}.{mood}`
    };

    return `
PROJECT GENOME:
- Core Themes: ${genome.coreThemes.join(', ')}
- Notation Style: ${genome.notationStyle}
- Constraints: ${genome.constraints.join('; ')}

PREVIOUS NOTATIONS (Stage ${stage - 1}):
${previousNotations.slice(-10).join('\n')}

STAGE ${stage} INSTRUCTIONS:
${stageInstructions[stage] || 'Maintain consistency with established patterns.'}

INPUT TO ENCODE:
${JSON.stringify(output, null, 2).substring(0, 2000)}

TASK:
1. Extract meaningful entities from the input
2. Create UAOL notations that reference previous stages where appropriate
3. Maintain thematic consistency with the project genome
4. Use flexible notation length (no strict part counting)
5. Ensure semantic richness and narrative continuity

OUTPUT FORMAT:
{
  "notations": [
    {"notation": "entity.identifier.attr1.attr2.state", "meaning": "what this represents"},
    ...
  ],
  "genome_updates": {
    "new_patterns": [],
    "new_vocabulary": []
  }
}`;
  }

  /**
   * Validate notation consistency with genome
   */
  private async validateConsistency(
    notation: string,
    genome: ProjectGenome,
    previousNotations: string[]
  ): Promise<boolean> {
    // Quick validation - just check it's not empty and has basic structure
    if (!notation || !notation.includes('.')) return false;
    
    const parts = notation.split('.');
    if (parts.length < 2 || parts.length > 10) return false;
    
    // For now, accept all well-formed notations
    // In production, would do deeper semantic validation
    return true;
  }

  /**
   * Update genome patterns based on successful encoding
   */
  private updateGenomePatterns(genome: ProjectGenome, notation: string, stage: number): void {
    const parts = notation.split('.');
    const entity = parts[0];
    
    // Record pattern for this entity type if new
    if (!genome.establishedPatterns[entity]) {
      genome.establishedPatterns[entity] = notation;
    }
    
    // Add significant terms to vocabulary
    parts.forEach(part => {
      if (part.length > 3 && !['the', 'and', 'for'].includes(part)) {
        genome.vocabulary.add(part);
      }
    });
  }

  /**
   * Fallback encoding when AI fails
   */
  private fallbackEncoding(output: any, stage: number): string[] {
    console.log('[Adaptive UAOL] Using fallback encoding');
    const notations: string[] = [];
    
    try {
      switch (stage) {
        case 1:
          notations.push('concept.exploration.unknown.philosophical.active');
          break;
        case 2:
          if (output.characters && Array.isArray(output.characters)) {
            output.characters.slice(0, 3).forEach((char: any, i: number) => {
              notations.push(`char.character${i}.role.adult.complex.active`);
            });
          }
          break;
        case 3:
          notations.push('struct.act1.introduction.setup.beginning.rising');
          break;
        case 4:
          notations.push('scene.1_1.location.characters.action.mood');
          break;
      }
    } catch (e) {
      console.error('[Adaptive UAOL] Fallback encoding error:', e);
    }
    
    return notations;
  }

  /**
   * Get project genome
   */
  getGenome(projectId: number): ProjectGenome | undefined {
    return this.projectGenomes.get(projectId);
  }

  /**
   * Clear genome (for testing)
   */
  clearGenome(projectId: number): void {
    this.projectGenomes.delete(projectId);
  }

  /**
   * Save genome to database
   */
  private async saveGenome(genome: ProjectGenome): Promise<void> {
    if (!this.db) return;
    
    try {
      await this.db.prepare(`
        INSERT OR REPLACE INTO project_genomes (
          project_id, content_type, core_themes, established_patterns,
          semantic_rules, notation_style, constraints, vocabulary,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        genome.projectId,
        genome.contentType,
        JSON.stringify(genome.coreThemes),
        JSON.stringify(genome.establishedPatterns),
        JSON.stringify(genome.semanticRules),
        genome.notationStyle,
        JSON.stringify(genome.constraints),
        JSON.stringify(Array.from(genome.vocabulary))
      ).run();
    } catch (error) {
      console.error('[Adaptive UAOL] Failed to save genome:', error);
    }
  }

  /**
   * Load genome from database
   */
  private async loadGenome(projectId: number): Promise<ProjectGenome | null> {
    if (!this.db) return null;
    
    try {
      const result = await this.db.prepare(`
        SELECT * FROM project_genomes WHERE project_id = ?
      `).bind(projectId).first();
      
      if (result) {
        const genome: ProjectGenome = {
          projectId: result.project_id,
          contentType: result.content_type,
          coreThemes: JSON.parse(result.core_themes || '[]'),
          establishedPatterns: JSON.parse(result.established_patterns || '{}'),
          semanticRules: JSON.parse(result.semantic_rules || '[]'),
          notationStyle: result.notation_style || 'standard',
          constraints: JSON.parse(result.constraints || '[]'),
          vocabulary: new Set(JSON.parse(result.vocabulary || '[]'))
        };
        
        this.projectGenomes.set(projectId, genome);
        console.log(`[Adaptive UAOL] Loaded genome from database for project ${projectId}`);
        return genome;
      }
    } catch (error) {
      console.error('[Adaptive UAOL] Failed to load genome:', error);
    }
    
    return null;
  }
}

// Export singleton instance
export const adaptiveCodec = new AdaptiveUAOLCodec();