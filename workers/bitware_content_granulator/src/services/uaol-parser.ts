/**
 * Universal AI Object Language (UAOL) Parser
 * Handles parsing, validation, and manipulation of UAOL notations
 */

export interface UAOLObject {
  // Core notation components
  entity: string;       // char, loc, rel, scene, concept, struct
  identifier: string;   // unique name or ID
  attributes: string[]; // ordered semantic attributes
  state: string;        // current state/mood/phase
  context: string;      // temporal/spatial context
  
  // Full notation string
  notation: string;
  
  // Metadata
  stage?: number;
  timestamp?: string;
}

export interface UAOLEvolution {
  from: string;
  to: string;
  trigger: string;
  timestamp: string;
}

export class UAOLParser {
  // Delimiter for UAOL notation (using dot for hierarchical clarity)
  private readonly DELIMITER = '.';
  
  // Entity type definitions
  private readonly ENTITY_TYPES = {
    concept: { minParts: 5, maxParts: 6 },
    char: { minParts: 7, maxParts: 8 },
    loc: { minParts: 7, maxParts: 8 },
    rel: { minParts: 5, maxParts: 6 },
    struct: { minParts: 6, maxParts: 7 },
    scene: { minParts: 7, maxParts: 8 },
    event: { minParts: 4, maxParts: 5 }
  };

  /**
   * Parse UAOL notation string into structured object
   */
  parse(notation: string): UAOLObject {
    if (!notation || typeof notation !== 'string') {
      throw new Error('Invalid UAOL notation: empty or not a string');
    }

    const parts = notation.split(this.DELIMITER);
    if (parts.length < 2) {
      throw new Error(`Invalid UAOL notation: ${notation}`);
    }

    const entity = parts[0];
    
    // Be more flexible - accept any entity type
    // This allows for evolution and adaptation
    const entityDef = this.ENTITY_TYPES[entity];
    
    // If unknown entity type, still parse it
    if (!entityDef) {
      console.warn(`Unknown entity type: ${entity}, parsing flexibly`);
      return {
        entity,
        identifier: parts[1],
        attributes: parts.slice(2, Math.max(2, parts.length - 2)),
        state: parts.length > 2 ? parts[parts.length - 2] : '',
        context: parts.length > 3 ? parts[parts.length - 1] : '',
        notation
      };
    }

    // For known entities, be more lenient with part counts
    // Allow flexibility for adaptive encoding
    if (parts.length < 2 || parts.length > 12) {
      throw new Error(
        `Invalid UAOL notation for ${entity}: too few or too many parts (${parts.length})`
      );
    }

    return {
      entity,
      identifier: parts[1],
      attributes: parts.slice(2, Math.max(2, parts.length - 2)),
      state: parts.length > 2 ? parts[parts.length - 2] : '',
      context: parts.length > 3 ? parts[parts.length - 1] : '',
      notation
    };
  }

  /**
   * Validate UAOL notation
   */
  validate(notation: string): boolean {
    try {
      // More flexible validation
      if (!notation || !notation.includes('.')) return false;
      
      const parts = notation.split(this.DELIMITER);
      // Minimum 2 parts (entity.identifier), maximum 12 for flexibility
      if (parts.length < 2 || parts.length > 12) return false;
      
      // Basic structure validation
      const entity = parts[0];
      const identifier = parts[1];
      
      // Entity and identifier should not be empty
      if (!entity || !identifier) return false;
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create UAOL notation from components
   */
  create(
    entity: string,
    identifier: string,
    attributes: string[],
    state: string,
    context: string
  ): string {
    // Validate entity type
    const entityDef = this.ENTITY_TYPES[entity];
    if (!entityDef) {
      throw new Error(`Unknown entity type: ${entity}`);
    }

    // Clean and validate components
    const cleanId = this.cleanIdentifier(identifier) || 'unknown';
    const cleanAttrs = attributes.map(a => this.cleanAttribute(a) || 'default');
    const cleanState = this.cleanAttribute(state) || 'active';
    const cleanContext = this.cleanAttribute(context) || 'present';

    // Calculate expected attribute count
    // Total parts = entity(1) + identifier(1) + attributes(X) + state(1) + context(1)
    // So attributes should be: minParts - 4 to maxParts - 4
    const minAttrs = entityDef.minParts - 4;
    const maxAttrs = entityDef.maxParts - 4;
    
    // Adjust attributes to fit requirements
    let finalAttrs = cleanAttrs;
    if (finalAttrs.length < minAttrs) {
      // Pad with defaults
      while (finalAttrs.length < minAttrs) {
        finalAttrs.push('default');
      }
    } else if (finalAttrs.length > maxAttrs) {
      // Truncate
      finalAttrs = finalAttrs.slice(0, maxAttrs);
    }

    // Build notation - DO NOT filter empty parts as it changes count
    const parts = [entity, cleanId, ...finalAttrs, cleanState, cleanContext];
    return parts.join(this.DELIMITER);
  }

  /**
   * Extract semantic meaning from UAOL notation
   */
  extractMeaning(notation: string): string {
    const obj = this.parse(notation);
    
    switch (obj.entity) {
      case 'char':
        return `Character ${obj.identifier} is a ${obj.attributes.join(' ')} in ${obj.state} state at ${obj.context}`;
      
      case 'loc':
        return `Location ${obj.identifier} is a ${obj.attributes.join(' ')} place with ${obj.state} atmosphere in ${obj.context}`;
      
      case 'rel':
        return `Relationship between ${obj.identifier} is ${obj.attributes.join(' ')} and ${obj.state} in nature`;
      
      case 'scene':
        return `Scene ${obj.identifier} at ${obj.attributes[0]} with ${obj.attributes.slice(1).join(', ')} in ${obj.state} mood during ${obj.context}`;
      
      case 'concept':
        return `Concept of ${obj.identifier} involving ${obj.attributes.join(', ')} in ${obj.state} state`;
      
      case 'struct':
        return `Structure ${obj.identifier} containing ${obj.attributes.join(' ')} for ${obj.state} purpose`;
      
      default:
        return `${obj.entity} ${obj.identifier} with ${obj.attributes.join(', ')}`;
    }
  }

  /**
   * Evolve UAOL notation based on event
   */
  evolve(currentNotation: string, event: string): string {
    const current = this.parse(currentNotation);
    
    // Parse event notation (event.type.trigger.result)
    const eventParts = event.split(this.DELIMITER);
    if (eventParts[0] !== 'event') {
      throw new Error('Invalid event notation');
    }

    // Apply evolution based on entity type and event
    switch (current.entity) {
      case 'char':
        return this.evolveCharacter(current, eventParts);
      
      case 'rel':
        return this.evolveRelationship(current, eventParts);
      
      case 'loc':
        return this.evolveLocation(current, eventParts);
      
      default:
        // Default evolution: update state
        current.state = eventParts[2] || current.state;
        return this.reconstruct(current);
    }
  }

  /**
   * Compare two UAOL notations for compatibility
   */
  areCompatible(notation1: string, notation2: string): boolean {
    const obj1 = this.parse(notation1);
    const obj2 = this.parse(notation2);

    // Check entity compatibility rules
    if (obj1.entity === 'char' && obj2.entity === 'loc') {
      // Characters can be in locations
      return true;
    }

    if (obj1.entity === 'char' && obj2.entity === 'char') {
      // Characters can interact
      return true;
    }

    if (obj1.entity === 'scene' && (obj2.entity === 'char' || obj2.entity === 'loc')) {
      // Scenes can contain characters and locations
      return true;
    }

    // Check for conflicting states
    if (obj1.state === 'absent' && obj2.state === 'present') {
      return false;
    }

    return true;
  }

  /**
   * Generate relationship notation from two entities
   */
  createRelationship(entity1: string, entity2: string, type: string): string {
    const obj1 = this.parse(entity1);
    const obj2 = this.parse(entity2);
    
    const identifier = `${obj1.identifier}_${obj2.identifier}`;
    const attributes = [type, 'active'];
    const state = 'forming';
    const context = obj1.context || obj2.context || 'present';

    return this.create('rel', identifier, attributes, state, context);
  }

  /**
   * Extract all entity references from a notation
   */
  extractReferences(notation: string): string[] {
    const obj = this.parse(notation);
    const refs: string[] = [];

    // Extract character references from relationships
    if (obj.entity === 'rel') {
      const ids = obj.identifier.split('_');
      refs.push(`char.${ids[0]}`);
      if (ids[1]) refs.push(`char.${ids[1]}`);
    }

    // Extract references from scenes
    if (obj.entity === 'scene' && obj.attributes.length > 1) {
      // Second attribute typically contains character references
      const chars = obj.attributes[1].split('_');
      chars.forEach(c => refs.push(`char.${c}`));
      
      // First attribute is typically location
      refs.push(`loc.${obj.attributes[0]}`);
    }

    return refs;
  }

  // Private helper methods

  private cleanIdentifier(id: string): string {
    return id.toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private cleanAttribute(attr: string): string {
    return attr.toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private reconstruct(obj: UAOLObject): string {
    return this.create(
      obj.entity,
      obj.identifier,
      obj.attributes,
      obj.state,
      obj.context
    );
  }

  private evolveCharacter(current: UAOLObject, eventParts: string[]): string {
    // event.discovery.knowledge.enlightened
    const trigger = eventParts[1];
    const result = eventParts[3] || eventParts[2];

    // Update state based on event
    if (trigger === 'discovery') {
      current.state = result || 'aware';
    } else if (trigger === 'conflict') {
      current.state = result || 'troubled';
    } else if (trigger === 'resolution') {
      current.state = result || 'resolved';
    }

    // Some events might change attributes
    if (trigger === 'growth' && current.attributes.length > 2) {
      // Replace last trait with growth result
      current.attributes[current.attributes.length - 1] = result;
    }

    return this.reconstruct(current);
  }

  private evolveRelationship(current: UAOLObject, eventParts: string[]): string {
    const trigger = eventParts[1];
    const result = eventParts[2];

    // Relationship evolution patterns
    if (trigger === 'conflict') {
      current.state = 'strained';
      current.attributes[1] = 'tense';
    } else if (trigger === 'resolution') {
      current.state = 'strengthened';
      current.attributes[1] = 'close';
    } else if (trigger === 'revelation') {
      current.state = 'transformed';
      current.attributes[0] = result || current.attributes[0];
    }

    return this.reconstruct(current);
  }

  private evolveLocation(current: UAOLObject, eventParts: string[]): string {
    const trigger = eventParts[1];
    const result = eventParts[2];

    // Location changes
    if (trigger === 'destruction') {
      current.state = 'ruined';
      current.attributes[current.attributes.length - 1] = 'devastated';
    } else if (trigger === 'transformation') {
      current.state = result || 'changed';
    }

    return this.reconstruct(current);
  }
}

// Export singleton instance
export const uaolParser = new UAOLParser();