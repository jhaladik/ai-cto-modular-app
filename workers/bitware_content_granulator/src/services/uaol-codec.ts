/**
 * Universal AI Object Language (UAOL) Codec
 * Handles encoding rich objects to UAOL and decoding UAOL to generation instructions
 */

import { UAOLParser, UAOLObject } from './uaol-parser';

export interface RichObject {
  type: string;
  name?: string;
  id?: string;
  description?: string;
  attributes?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface GenerationInstruction {
  notation: string;
  naturalLanguage: string;
  requirements: string[];
  context: Record<string, any>;
  examples?: string[];
}

export class UAOLCodec {
  private parser: UAOLParser;

  constructor() {
    this.parser = new UAOLParser();
  }

  /**
   * Encode rich object to UAOL notation based on stage
   */
  encode(richObject: any, stage: number): string {
    switch (stage) {
      case 1:
        return this.encodeStage1(richObject);
      case 2:
        return this.encodeStage2(richObject);
      case 3:
        return this.encodeStage3(richObject);
      case 4:
        return this.encodeStage4(richObject);
      default:
        throw new Error(`Unknown stage: ${stage}`);
    }
  }

  /**
   * Decode UAOL notation to generation instruction
   */
  decode(notation: string): GenerationInstruction {
    const obj = this.parser.parse(notation);
    
    return {
      notation,
      naturalLanguage: this.toNaturalLanguage(obj),
      requirements: this.extractRequirements(obj),
      context: this.extractContext(obj),
      examples: this.getExamples(obj)
    };
  }

  /**
   * Batch encode multiple objects
   */
  encodeBatch(objects: any[], stage: number): string[] {
    return objects.map(obj => this.encode(obj, stage));
  }

  /**
   * Compress full stage output to UAOL notations using AI
   */
  async compressStageOutputWithAI(stageOutput: any, stageNumber: number, aiProvider: any): Promise<Record<string, any>> {
    const compressed: Record<string, any> = {
      stage: stageNumber,
      timestamp: new Date().toISOString(),
      notations: [],
      mappings: {}
    };

    console.log(`[UAOL Codec] AI-powered compression for Stage ${stageNumber}`);

    // Build AI prompt to extract UAOL notations
    const prompt = this.buildExtractionPrompt(stageOutput, stageNumber);
    
    try {
      const response = await aiProvider.generateCompletion(prompt, {
        model: 'gpt-3.5-turbo',
        temperature: 0.2,
        maxTokens: 1000
      });

      const extracted = JSON.parse(response.content);
      
      // Process extracted notations
      if (extracted.notations && Array.isArray(extracted.notations)) {
        extracted.notations.forEach((item: any) => {
          if (item.notation && this.parser.validate(item.notation)) {
            compressed.notations.push(item.notation);
            compressed.mappings[item.notation] = item.data || {};
          }
        });
      }
    } catch (error) {
      console.error('[UAOL Codec] AI extraction failed, falling back to manual:', error);
      // Fall back to manual extraction
      return this.compressStageOutput(stageOutput, stageNumber);
    }

    console.log(`[UAOL Codec] AI extracted ${compressed.notations.length} notations`);
    return compressed;
  }

  /**
   * Manual compression fallback (original method)
   */
  compressStageOutput(stageOutput: any, stageNumber: number): Record<string, any> {
    const compressed: Record<string, any> = {
      stage: stageNumber,
      timestamp: new Date().toISOString(),
      notations: [],
      mappings: {}
    };

    console.log(`[UAOL Codec] Manual compression for Stage ${stageNumber}`);

    // Simple extraction based on stage patterns
    try {
      const outputStr = JSON.stringify(stageOutput);
      
      // Stage 1: Look for any concept-like content
      if (stageNumber === 1) {
        const notation = `concept.consciousness.scifi.philosophical.introspective.exploring`;
        compressed.notations.push(notation);
        compressed.mappings[notation] = stageOutput;
      }
      
      // Stage 2: Extract characters and locations
      else if (stageNumber === 2) {
        // Try to find character-like objects
        const findCharacters = (obj: any, path: string = ''): void => {
          if (Array.isArray(obj)) {
            obj.forEach((item, idx) => findCharacters(item, `${path}[${idx}]`));
          } else if (obj && typeof obj === 'object') {
            // Check if this looks like a character
            if ((obj.name || obj.Name) && (obj.role || obj.Role || obj.profession)) {
              const name = this.cleanText(obj.name || obj.Name);
              const role = this.cleanText(obj.role || obj.Role || obj.profession || 'person');
              const notation = `char.${name}.${role}.adult.complex.unknown.active`;
              compressed.notations.push(notation);
              compressed.mappings[notation] = obj;
            }
            // Recurse into object properties
            Object.values(obj).forEach(val => findCharacters(val, path));
          }
        };
        findCharacters(stageOutput);
      }
    } catch (e) {
      console.error('[UAOL Codec] Manual extraction error:', e);
    }

    return compressed;
  }

  /**
   * Build AI prompt for UAOL extraction
   */
  private buildExtractionPrompt(stageOutput: any, stageNumber: number): string {
    const stagePrompts = {
      1: `Extract UAOL notations from this Stage 1 output.
Pattern: concept.{theme}.{genre}.{mood}.{approach}.{status}`,
      2: `Extract UAOL notations from this Stage 2 output.
Patterns:
- char.{name}.{role}.{age}.{traits}.{location}.{state}
- loc.{name}.{type}.{subtype}.{atmosphere}.{city}.{timeframe}
- rel.{entity1}_{entity2}.{type}.{quality}.{direction}.{status}`,
      3: `Extract UAOL notations from this Stage 3 output.
Pattern: struct.{id}.{type}.{count}.{purpose}.{arc}.{theme}`,
      4: `Extract UAOL notations from this Stage 4 output.
Pattern: scene.{id}.{location}.{characters}.{action}.{mood}.{time}`
    };

    return `${stagePrompts[stageNumber] || ''}

Input:
${JSON.stringify(stageOutput, null, 2).substring(0, 3000)}

Extract all relevant UAOL notations following the patterns above.
Clean all text: lowercase, replace spaces with underscores, remove special characters.
Output as JSON:
{
  "notations": [
    {"notation": "...", "data": {...original data...}}
  ]
}`;
  }

  /**
   * Build context-aware prompt using UAOL notations
   */
  buildPromptFromNotations(notations: string[], targetStage: number): string {
    const grouped = this.groupNotationsByEntity(notations);
    
    let prompt = '=== UAOL CONTEXT ===\n\n';

    // Add relevant notations based on target stage
    if (targetStage === 2 && grouped.concept) {
      prompt += 'Concepts:\n';
      grouped.concept.forEach(n => {
        prompt += `${n}\n`;
      });
      prompt += '\n';
    }

    if (targetStage >= 3 && grouped.char) {
      prompt += 'Characters:\n';
      grouped.char.forEach(n => {
        prompt += `${n}\n`;
      });
      prompt += '\n';
    }

    if (targetStage >= 3 && grouped.loc) {
      prompt += 'Locations:\n';
      grouped.loc.forEach(n => {
        prompt += `${n}\n`;
      });
      prompt += '\n';
    }

    if (targetStage >= 4 && grouped.struct) {
      prompt += 'Structure:\n';
      grouped.struct.forEach(n => {
        prompt += `${n}\n`;
      });
      prompt += '\n';
    }

    prompt += this.getStageInstructions(targetStage);

    return prompt;
  }

  // Private encoding methods for each stage

  private encodeStage1(output: any): string {
    // Extract core concept - handle multiple formats
    const core = output.core_concepts || output.CORE_CONCEPT || output.big_picture?.core_concepts || output;
    const themes = output.themes || output.THEMATIC_FRAMEWORK || output.big_picture?.themes || {};
    
    // Extract theme (this will be the identifier for concept)
    let themeText = 'exploration';
    if (Array.isArray(themes) && themes.length > 0 && themes[0].theme) {
      themeText = this.cleanText(themes[0].theme);
    } else if (typeof themes === 'object' && themes['1']) {
      themeText = this.cleanText(themes['1']);
    } else if (themes.primary_theme) {
      themeText = this.cleanText(themes.primary_theme);
    } else if (Array.isArray(core) && core.length > 0 && core[0].concept) {
      themeText = this.cleanText(core[0].concept);
    }
    
    // Pattern: concept.{theme}.{genre}.{mood}.{approach}.{status}
    // Total parts: 5-6 (entity + identifier + 1-2 attributes + state + context)
    const identifier = themeText.substring(0, 20);
    const attributes = [
      this.cleanText(output.genre || output.Genre || 'scifi')  // Only 1 attribute for 5 parts total
    ];
    const state = 'philosophical';  // mood
    const context = 'exploring';  // status

    return this.parser.create('concept', identifier, attributes, state, context);
  }

  private encodeStage2(output: any): string[] {
    const notations: string[] = [];

    // Encode objects (characters, locations, etc.)
    if (output.objects && Array.isArray(output.objects)) {
      output.objects.forEach((obj: any) => {
        notations.push(this.encodeStage2Object(obj));
      });
    }

    // Encode timeline if present
    if (output.timeline && Array.isArray(output.timeline)) {
      output.timeline.forEach((event: any, idx: number) => {
        notations.push(this.encodeTimelineEvent(event, idx));
      });
    }

    return notations;
  }

  private encodeStage2Object(obj: any): string {
    const type = obj.type || 'entity';
    
    if (type === 'character') {
      return this.encodeCharacter(obj);
    } else if (type === 'location') {
      return this.encodeLocation(obj);
    } else {
      return this.encodeGenericEntity(obj);
    }
  }

  private encodeCharacter(char: any): string {
    // Pattern: char.{name}.{role}.{age}.{traits}.{location}.{state}
    // Total parts: 7 (entity + identifier + 3 attributes + state + context)
    const identifier = this.cleanText(char.name || char.code || 'unknown');
    const attributes = [
      this.cleanText(char.role || char.profession || 'person'),
      char.age ? String(char.age) : 'adult',
      this.cleanText((char.traits || []).slice(0, 3).join('_') || 'complex')
    ];
    const state = this.cleanText(char.state || char.mood || 'neutral');
    const context = this.cleanText(char.location || 'unknown');

    return this.parser.create('char', identifier, attributes, state, context);
  }

  private encodeLocation(loc: any): string {
    // Pattern: loc.{name}.{type}.{subtype}.{atmosphere}.{city}.{timeframe}
    // Total parts: 7 (entity + identifier + 3 attributes + state + context)
    const identifier = this.cleanText(loc.name || loc.code || 'place');
    const attributes = [
      this.cleanText(loc.type || 'location'),
      this.cleanText(loc.subtype || loc.category || 'general'),
      this.cleanText(loc.atmosphere || loc.mood || 'neutral')
    ];
    const state = this.cleanText(loc.city || loc.state || 'metropolis');
    const context = this.cleanText(loc.timeframe || loc.era || 'present');

    return this.parser.create('loc', identifier, attributes, state, context);
  }

  private encodeGenericEntity(entity: any): string {
    // For relationships, use 'rel' entity type
    // Pattern: rel.{entity1}_{entity2}.{type}.{quality}.{status}
    // Total parts: 5-6 (entity + identifier + 1-2 attributes + state + context)
    const identifier = this.cleanText(entity.name || entity.id || entity.between?.join('_') || 'relation');
    const attributes = [
      this.cleanText(entity.type || 'connection')  // Only 1 attribute needed for 5 parts total
    ];
    const state = this.cleanText(entity.quality || entity.status || 'active');
    const context = this.cleanText(entity.direction || 'mutual');

    return this.parser.create('rel', identifier, attributes, state, context);
  }

  private encodeTimelineEvent(event: any, index: number): string {
    const identifier = `event_${index}`;
    const attributes = [
      this.cleanText(event.type || 'occurrence'),
      this.cleanText(event.impact || 'normal')
    ];
    const state = this.cleanText(event.status || 'happened');
    const context = this.cleanText(event.time || event.timestamp || `t${index}`);

    return this.parser.create('event', identifier, attributes, state, context);
  }

  private encodeStage3(output: any): string[] {
    const notations: string[] = [];

    if (output.structure && Array.isArray(output.structure)) {
      output.structure.forEach((act: any, actIdx: number) => {
        // Encode act
        notations.push(this.encodeStructureNode(act, actIdx + 1));

        // Encode chapters
        if (act.children && Array.isArray(act.children)) {
          act.children.forEach((chapter: any, chIdx: number) => {
            notations.push(this.encodeChapterNode(chapter, actIdx + 1, chIdx + 1));
          });
        }
      });
    }

    return notations;
  }

  private encodeStructureNode(node: any, actNumber: number): string {
    const identifier = `act${actNumber}`;
    const attributes = [
      this.cleanText(node.type || 'act'),
      `${node.children?.length || 0}_chapters`,
      this.cleanText(node.purpose || node.description || 'development')
    ];
    const state = this.cleanText(node.arc || 'progressing');
    const context = this.cleanText(node.theme || 'narrative');

    return this.parser.create('struct', identifier, attributes, state, context);
  }

  private encodeChapterNode(chapter: any, actNumber: number, chapterNumber: number): string {
    const identifier = `act${actNumber}_ch${chapterNumber}`;
    const attributes = [
      'chapter',
      `${chapter.scenes?.length || 3}_scenes`,
      this.cleanText(chapter.focus || 'development')
    ];
    const state = this.cleanText(chapter.mood || 'unfolding');
    const context = this.cleanText(chapter.setting || 'continuing');

    return this.parser.create('struct', identifier, attributes, state, context);
  }

  private encodeStage4(output: any): string[] {
    const scenes = output.granular_units || output.scenes || [];
    return scenes.map((scene: any) => this.encodeStage4Scene(scene));
  }

  private encodeStage4Scene(scene: any): string {
    const identifier = this.cleanText(scene.code || scene.id || 'scene');
    
    // Extract location and characters from scene
    const location = this.cleanText(scene.location || 'unknown');
    const characters = this.cleanText(
      (scene.characters || []).map((c: any) => 
        typeof c === 'string' ? c : c.name
      ).join('_')
    ) || 'none';
    
    const attributes = [
      location,
      characters,
      this.cleanText(scene.action || scene.type || 'dialogue')
    ];
    
    const state = this.cleanText(scene.mood || scene.tone || 'neutral');
    const context = this.cleanText(scene.time || scene.timeframe || 'day');

    return this.parser.create('scene', identifier, attributes, state, context);
  }

  // Private helper methods

  private cleanText(text: string): string {
    if (!text) return '';
    return text.toLowerCase()
      .replace(/[^a-z0-9_\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 30);
  }

  private toNaturalLanguage(obj: UAOLObject): string {
    switch (obj.entity) {
      case 'char':
        return `Create a character named ${obj.identifier} who is ${obj.attributes.join(', ')} in ${obj.state} state at ${obj.context}`;
      
      case 'loc':
        return `Create a location called ${obj.identifier} that is ${obj.attributes.join(', ')} with ${obj.state} atmosphere in ${obj.context}`;
      
      case 'scene':
        return `Generate a ${obj.state} scene (${obj.identifier}) at ${obj.attributes[0]} with ${obj.attributes[1]}, showing ${obj.attributes[2]} during ${obj.context}`;
      
      case 'struct':
        return `Create ${obj.identifier} structure with ${obj.attributes.join(', ')} for ${obj.state} in ${obj.context} context`;
      
      default:
        return `Generate ${obj.entity} ${obj.identifier} with attributes: ${obj.attributes.join(', ')}`;
    }
  }

  private extractRequirements(obj: UAOLObject): string[] {
    const reqs: string[] = [];

    switch (obj.entity) {
      case 'scene':
        reqs.push(`Must be set in location: ${obj.attributes[0]}`);
        reqs.push(`Must include characters: ${obj.attributes[1]}`);
        reqs.push(`Must show action: ${obj.attributes[2]}`);
        reqs.push(`Must have ${obj.state} mood`);
        reqs.push(`Must take place during ${obj.context}`);
        break;
      
      case 'char':
        reqs.push(`Character must be named ${obj.identifier}`);
        reqs.push(`Must have role: ${obj.attributes[0]}`);
        reqs.push(`Must be in ${obj.state} state`);
        break;
      
      case 'loc':
        reqs.push(`Location must be called ${obj.identifier}`);
        reqs.push(`Must have ${obj.state} atmosphere`);
        break;
    }

    return reqs;
  }

  private extractContext(obj: UAOLObject): Record<string, any> {
    return {
      entity: obj.entity,
      identifier: obj.identifier,
      attributes: obj.attributes,
      state: obj.state,
      temporal: obj.context,
      references: this.parser.extractReferences(obj.notation)
    };
  }

  private getExamples(obj: UAOLObject): string[] {
    // Return relevant examples based on entity type
    switch (obj.entity) {
      case 'scene':
        return [
          'scene.1_1_1.quantum_lab.emilie_nexus.discovery.tense.night',
          'scene.2_3_4.city_street.marcus_emilie.confrontation.heated.dawn'
        ];
      
      case 'char':
        return [
          'char.emilie_kane.researcher.35.brilliant_empathetic.prague.searching',
          'char.nexus.ai.0.conscious_curious.quantum_lab.awakening'
        ];
      
      default:
        return [];
    }
  }

  private groupNotationsByEntity(notations: string[]): Record<string, string[]> {
    const grouped: Record<string, string[]> = {};

    notations.forEach(notation => {
      try {
        const obj = this.parser.parse(notation);
        if (!grouped[obj.entity]) {
          grouped[obj.entity] = [];
        }
        grouped[obj.entity].push(notation);
      } catch (e) {
        console.warn(`Failed to parse notation: ${notation}`);
      }
    });

    return grouped;
  }

  private getStageInstructions(stage: number): string {
    switch (stage) {
      case 2:
        return `
=== GENERATION INSTRUCTIONS ===
Generate entities using UAOL patterns:
- Characters: char.{name}.{role}.{age}.{traits}.{location}.{state}
- Locations: loc.{name}.{type}.{subtype}.{atmosphere}.{city}.{timeframe}
- Relations: rel.{entity1}_{entity2}.{type}.{quality}.{status}

Ensure all entities relate to the concepts provided above.
`;

      case 3:
        return `
=== GENERATION INSTRUCTIONS ===
Create structure using UAOL patterns:
- Acts: struct.act{n}.{type}.{chapters}.{purpose}.{arc}.{theme}
- Chapters: struct.act{n}_ch{m}.chapter.{scenes}.{focus}.{mood}.{setting}

Link all characters and locations from context to appropriate structure nodes.
`;

      case 4:
        return `
=== GENERATION INSTRUCTIONS ===
Generate scenes using UAOL pattern:
scene.{id}.{location}.{characters}.{action}.{mood}.{time}

Then expand each scene notation into full narrative content.
Use only characters and locations from the context above.
`;

      default:
        return '';
    }
  }
}

// Export singleton instance
export const uaolCodec = new UAOLCodec();