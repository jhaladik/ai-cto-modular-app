import { 
  GenericStructure, 
  GenericStructureElement, 
  TemplateStructureDefinition,
  StructureValidationResult,
  StructureStats,
  StoredStructureElement
} from '../types/generic-structure';
import { DatabaseService } from './database';
import { Env } from '../types';

export class GenericStructureService {
  constructor(
    private env: Env,
    private db: DatabaseService
  ) {}

  /**
   * Transform any AI response into a generic structure
   */
  transformToGenericStructure(
    aiResponse: any,
    structureType: string,
    templateDef?: TemplateStructureDefinition
  ): GenericStructure {
    console.log('Transforming AI response to generic structure');
    console.log('Structure type:', structureType);
    console.log('AI response has type:', aiResponse?.type);
    
    try {
      // If response already follows generic structure format
      if (this.isGenericStructure(aiResponse)) {
        console.log('Response already in generic structure format');
        return aiResponse as GenericStructure;
      }

      console.log('Transforming non-generic structure...');
      
      // Extract metadata with error handling
      let metadata: Record<string, any>;
      try {
        metadata = this.extractRootMetadata(aiResponse, structureType);
        console.log('Extracted metadata:', Object.keys(metadata));
      } catch (metaError) {
        console.error('Failed to extract metadata:', metaError);
        metadata = {
          title: `Untitled ${structureType}`,
          description: 'Generated structure'
        };
      }

      // Extract elements with error handling
      let elements: GenericStructureElement[];
      try {
        elements = this.extractElements(aiResponse, 1, templateDef);
        console.log('Extracted elements count:', elements.length);
      } catch (elemError) {
        console.error('Failed to extract elements:', elemError);
        // If we have an elements array directly, use it
        if (Array.isArray(aiResponse.elements)) {
          console.log('Using elements array directly from response');
          elements = aiResponse.elements;
        } else {
          throw new Error(`Cannot extract elements from response: ${elemError.message}`);
        }
      }

      // Create structure
      const structure: GenericStructure = {
        type: structureType,
        version: '1.0',
        metadata,
        elements
      };

      // Calculate summary with error handling
      try {
        structure.summary = this.calculateSummary(structure.elements);
        console.log('Calculated summary:', structure.summary);
      } catch (summaryError) {
        console.warn('Failed to calculate summary:', summaryError);
        structure.summary = {
          totalElements: elements.length,
          levelCounts: {}
        };
      }

      return structure;
      
    } catch (error) {
      console.error('Critical error in transformToGenericStructure:', error);
      console.error('AI Response preview:', JSON.stringify(aiResponse).substring(0, 500));
      throw new Error(`Failed to transform structure: ${error.message}`);
    }
  }

  /**
   * Check if response already follows generic structure format
   */
  private isGenericStructure(response: any): boolean {
    return response?.type && 
           response?.metadata && 
           Array.isArray(response?.elements) &&
           response.elements.every((e: any) => 
             e.id && e.type && e.level !== undefined
           );
  }

  /**
   * Extract root metadata from various response formats
   */
  private extractRootMetadata(response: any, structureType: string): Record<string, any> {
    const metadata: Record<string, any> = {};

    // Try common patterns
    const possibleRoots = [
      response,
      response[structureType],
      response[`${structureType}Overview`],
      response.overview,
      response.metadata
    ];

    for (const root of possibleRoots) {
      if (root && typeof root === 'object') {
        // Extract title
        metadata.title = metadata.title || 
                        root.title || 
                        root.name || 
                        root.courseName || 
                        root.quizTitle ||
                        `Untitled ${structureType}`;

        // Extract description
        metadata.description = metadata.description ||
                              root.description ||
                              root.summary ||
                              root.overview;

        // Extract other common fields
        if (root.duration) metadata.duration = root.duration;
        if (root.targetAudience) metadata.targetAudience = root.targetAudience;
        if (root.difficulty) metadata.difficulty = root.difficulty;
        if (root.prerequisites) metadata.prerequisites = root.prerequisites;
        if (root.objectives) metadata.objectives = root.objectives;
        if (root.learningOutcomes) metadata.learningOutcomes = root.learningOutcomes;
      }
    }

    return metadata;
  }

  /**
   * Recursively extract elements from various response formats
   */
  private extractElements(
    data: any,
    level: number,
    templateDef?: TemplateStructureDefinition,
    parentId: string = ''
  ): GenericStructureElement[] {
    const elements: GenericStructureElement[] = [];
    
    try {
      if (!data) {
        console.log(`No data at level ${level}`);
        return elements;
      }

      // Get level rules if available
      const levelRule = templateDef?.levels.find(l => l.level === level);
      const suggestedType = levelRule?.suggestedType || `level${level}`;
      console.log(`Extracting elements at level ${level}, suggested type: ${suggestedType}`);

      // Try to find arrays of elements in the data
      let possibleArrays: [string, any[]][];
      try {
        possibleArrays = this.findArraysInObject(data);
        console.log(`Found ${possibleArrays.length} possible element arrays at level ${level}`);
      } catch (findError) {
        console.error('Error finding arrays:', findError);
        possibleArrays = [];
      }
      
      for (const [key, array] of possibleArrays) {
        if (Array.isArray(array)) {
          console.log(`Processing array '${key}' with ${array.length} items`);
          
          array.forEach((item, index) => {
            try {
              const elementId = parentId ? `${parentId}.${index + 1}` : `${index + 1}`;
              
              const element: GenericStructureElement = {
                id: elementId,
                type: this.inferElementType(key, item, suggestedType),
                name: this.extractElementName(item),
                level: level,
                sequenceOrder: index,
                metadata: this.extractElementMetadata(item),
                elements: undefined
              };

              // Recursively extract children
              if (level < 5) { // Max depth of 5
                try {
                  const childArrays = this.findArraysInObject(item);
                  if (childArrays.length > 0) {
                    element.elements = this.extractElements(
                      item,
                      level + 1,
                      templateDef,
                      elementId
                    );
                  }
                } catch (childError) {
                  console.warn(`Failed to extract children for element ${elementId}:`, childError);
                  // Continue without children
                }
              }

              elements.push(element);
            } catch (itemError) {
              console.error(`Failed to process item at index ${index}:`, itemError);
              console.error('Item preview:', JSON.stringify(item).substring(0, 200));
              // Skip this item and continue
            }
          });
        }
      }

      // If no arrays found but object has properties, treat them as elements
      if (elements.length === 0 && typeof data === 'object') {
        const keys = Object.keys(data).filter(k => 
          typeof data[k] === 'object' && 
          !Array.isArray(data[k]) &&
          !['metadata', 'overview', 'summary'].includes(k)
        );

        keys.forEach((key, index) => {
          try {
            const elementId = parentId ? `${parentId}.${index + 1}` : `${index + 1}`;
            
            const element: GenericStructureElement = {
              id: elementId,
              type: suggestedType,
              name: this.humanizeKey(key),
              level: level,
              sequenceOrder: index,
              metadata: data[key],
              elements: undefined
            };

            // Try to extract child elements
            if (level < 5) {
              try {
                const childElements = this.extractElements(
                  data[key],
                  level + 1,
                  templateDef,
                  elementId
                );
                if (childElements && childElements.length > 0) {
                  element.elements = childElements;
                }
              } catch (childError) {
                console.warn(`Failed to extract children for key ${key}:`, childError);
              }
            }

            elements.push(element);
          } catch (keyError) {
            console.error(`Failed to process key ${key}:`, keyError);
            // Skip this key and continue
          }
        });
      }

      return elements;
      
    } catch (error) {
      console.error(`Critical error in extractElements at level ${level}:`, error);
      console.error('Data preview:', JSON.stringify(data).substring(0, 300));
      // Return what we have so far
      return elements;
    }
  }

  /**
   * Find arrays in an object (potential child elements)
   */
  private findArraysInObject(obj: any): [string, any[]][] {
    const arrays: [string, any[]][] = [];
    
    if (!obj || typeof obj !== 'object') return arrays;

    // Common array property names to check first
    const priorityKeys = [
      'elements', 'children', 'items',
      'modules', 'lessons', 'sections',
      'categories', 'questions', 'chapters',
      'phases', 'steps', 'tasks',
      'concepts', 'topics', 'units'
    ];
    
    // Arrays that should NOT be treated as child elements
    const metadataArrayKeys = [
      'options', 'skills', 'prerequisites', 'objectives',
      'learningOutcomes', 'instructions', 'resources',
      'tools', 'stakeholders', 'deliverables', 'examples',
      'tags', 'keywords', 'themes', 'characters'
    ];

    // Check priority keys first
    for (const key of priorityKeys) {
      if (Array.isArray(obj[key])) {
        // Only treat as child elements if array contains objects
        if (obj[key].length > 0 && typeof obj[key][0] === 'object') {
          arrays.push([key, obj[key]]);
          return arrays; // Return first match
        }
      }
    }

    // Then check all other keys (but skip metadata arrays)
    for (const key of Object.keys(obj)) {
      if (Array.isArray(obj[key]) && 
          !priorityKeys.includes(key) && 
          !metadataArrayKeys.includes(key)) {
        // Only treat as child elements if array contains objects
        if (obj[key].length > 0 && typeof obj[key][0] === 'object') {
          arrays.push([key, obj[key]]);
        }
      }
    }

    return arrays;
  }

  /**
   * Infer element type from context
   */
  private inferElementType(arrayKey: string, item: any, suggestedType: string): string {
    // If item has explicit type, use it
    if (item.type) return item.type;
    if (item.elementType) return item.elementType;
    
    // Infer from array name
    const singular = arrayKey.replace(/s$/, ''); // Simple singularization
    if (singular !== arrayKey) return singular;
    
    // Use suggested type
    return suggestedType;
  }

  /**
   * Extract element name from various formats
   */
  private extractElementName(item: any): string {
    return item.name ||
           item.title ||
           item.label ||
           item.heading ||
           item.question ||
           item.topic ||
           item.chapterTitle ||
           item.moduleName ||
           'Unnamed Element';
  }

  /**
   * Extract metadata from element
   */
  private extractElementMetadata(item: any): Record<string, any> {
    const metadata: Record<string, any> = {};
    
    // Copy all properties, but handle arrays of strings differently from arrays of objects
    for (const [key, value] of Object.entries(item)) {
      if (['id', 'type', 'name', 'title', 'level', 'elements', 'children'].includes(key)) {
        continue; // Skip these special keys
      }
      
      if (Array.isArray(value)) {
        // Check if it's an array of simple values (strings, numbers) vs objects
        if (value.length > 0 && typeof value[0] !== 'object') {
          // It's an array of simple values, keep it as metadata
          metadata[key] = value;
        }
        // If it's an array of objects, it will be processed as child elements
      } else {
        metadata[key] = value;
      }
    }
    
    return metadata;
  }

  /**
   * Convert camelCase/snake_case to human readable
   */
  private humanizeKey(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^\w/, c => c.toUpperCase())
      .trim();
  }

  /**
   * Calculate structure summary statistics
   */
  private calculateSummary(elements: GenericStructureElement[]): any {
    const summary = {
      totalElements: 0,
      levelCounts: {} as Record<number, number>
    };

    const countElements = (elems: GenericStructureElement[]) => {
      for (const elem of elems) {
        summary.totalElements++;
        summary.levelCounts[elem.level] = (summary.levelCounts[elem.level] || 0) + 1;
        
        if (elem.elements) {
          countElements(elem.elements);
        }
      }
    };

    countElements(elements);
    return summary;
  }

  /**
   * Validate structure against template rules
   */
  validateStructure(
    structure: GenericStructure,
    templateDef: TemplateStructureDefinition
  ): StructureValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate root metadata
    if (templateDef.globalMetadata?.required) {
      for (const field of templateDef.globalMetadata.required) {
        if (!structure.metadata[field]) {
          errors.push(`Missing required root metadata: ${field}`);
        }
      }
    }

    // Validate levels
    for (const rule of templateDef.levels) {
      const elementsAtLevel = this.getElementsByLevel(structure.elements, rule.level);
      
      if (elementsAtLevel.length < rule.minElements) {
        errors.push(`Level ${rule.level} has ${elementsAtLevel.length} elements, minimum is ${rule.minElements}`);
      }
      
      if (elementsAtLevel.length > rule.maxElements) {
        warnings.push(`Level ${rule.level} has ${elementsAtLevel.length} elements, maximum is ${rule.maxElements}`);
      }

      // Check required metadata for each element
      if (rule.requiredMetadata) {
        for (const elem of elementsAtLevel) {
          for (const field of rule.requiredMetadata) {
            if (!elem.metadata[field]) {
              warnings.push(`Element ${elem.id} missing metadata: ${field}`);
            }
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Get all elements at a specific level
   */
  private getElementsByLevel(
    elements: GenericStructureElement[],
    level: number
  ): GenericStructureElement[] {
    const result: GenericStructureElement[] = [];
    
    const traverse = (elems: GenericStructureElement[]) => {
      for (const elem of elems) {
        if (elem.level === level) {
          result.push(elem);
        }
        if (elem.elements) {
          traverse(elem.elements);
        }
      }
    };
    
    traverse(elements);
    return result;
  }

  /**
   * Store generic structure in database
   */
  async storeStructure(
    jobId: number,
    structure: GenericStructure
  ): Promise<void> {
    console.log(`Storing generic structure for job ${jobId}`);
    
    try {
      // Validate structure before storing
      if (!structure || !structure.type) {
        throw new Error('Invalid structure: missing type');
      }
      
      if (!structure.metadata) {
        console.warn('Structure missing metadata, using defaults');
        structure.metadata = {
          title: 'Untitled',
          description: 'No description'
        };
      }
      
      // Store root element with error handling
      let rootId: number;
      try {
        console.log('Creating root element...');
        rootId = await this.db.createStructureElement({
          jobId,
          elementType: structure.type || 'unknown',
          sequenceOrder: 0,
          title: structure.metadata.title || 'Untitled',
          description: structure.metadata.description || '',
          metadata: structure.metadata
        });
        console.log('Root element created with ID:', rootId);
      } catch (rootError) {
        console.error('Failed to create root element:', rootError);
        throw new Error(`Failed to store root element: ${rootError.message}`);
      }

      // Recursively store elements with error handling
      if (structure.elements && structure.elements.length > 0) {
        try {
          console.log(`Storing ${structure.elements.length} child elements...`);
          await this.storeElements(jobId, structure.elements, rootId);
          console.log('All elements stored successfully');
        } catch (elemError) {
          console.error('Failed to store child elements:', elemError);
          throw new Error(`Failed to store child elements: ${elemError.message}`);
        }
      } else {
        console.log('No child elements to store');
      }
      
    } catch (error) {
      console.error('Critical error in storeStructure:', error);
      console.error('Structure preview:', JSON.stringify({
        type: structure?.type,
        metadataKeys: Object.keys(structure?.metadata || {}),
        elementsCount: structure?.elements?.length
      }));
      throw error;
    }
  }

  /**
   * Recursively store elements
   */
  private async storeElements(
    jobId: number,
    elements: GenericStructureElement[],
    parentId?: number
  ): Promise<void> {
    if (!elements || !Array.isArray(elements)) {
      console.warn('No elements to store or invalid elements array');
      return;
    }
    
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      
      try {
        // Validate element
        if (!element) {
          console.warn(`Skipping null element at index ${i}`);
          continue;
        }
        
        // Ensure required fields have values
        const elementData = {
          jobId,
          elementType: element.type || 'unknown',
          parentId,
          sequenceOrder: element.sequenceOrder ?? i,
          title: element.name || `Element ${i + 1}`,
          metadata: {
            ...(element.metadata || {}),
            elementId: element.id || `${parentId}-${i}`,
            level: element.level ?? 1
          }
        };
        
        console.log(`Storing element ${i + 1}/${elements.length}: ${elementData.title}`);
        
        let elementId: number;
        try {
          elementId = await this.db.createStructureElement(elementData);
        } catch (dbError) {
          console.error(`Failed to store element ${elementData.title}:`, dbError);
          console.error('Element data:', JSON.stringify(elementData).substring(0, 500));
          throw new Error(`Database error storing element: ${dbError.message}`);
        }

        // Store children recursively
        if (element.elements && element.elements.length > 0) {
          console.log(`Storing ${element.elements.length} children for element ${elementData.title}`);
          try {
            await this.storeElements(jobId, element.elements, elementId);
          } catch (childError) {
            console.error(`Failed to store children of element ${elementData.title}:`, childError);
            throw new Error(`Failed to store child elements: ${childError.message}`);
          }
        }
        
      } catch (error) {
        console.error(`Error processing element at index ${i}:`, error);
        console.error('Element preview:', JSON.stringify(element).substring(0, 500));
        throw error;
      }
    }
  }

  /**
   * Calculate structure statistics
   */
  calculateStats(structure: GenericStructure): StructureStats {
    let totalElements = 0;
    let maxDepth = 0;
    const elementsPerLevel: Record<number, number> = {};
    let totalParents = 0;
    let totalChildren = 0;

    const traverse = (elements: GenericStructureElement[], depth: number = 1) => {
      maxDepth = Math.max(maxDepth, depth);
      
      for (const elem of elements) {
        totalElements++;
        elementsPerLevel[elem.level] = (elementsPerLevel[elem.level] || 0) + 1;
        
        if (elem.elements && elem.elements.length > 0) {
          totalParents++;
          totalChildren += elem.elements.length;
          traverse(elem.elements, depth + 1);
        }
      }
    };

    traverse(structure.elements);

    return {
      totalElements,
      maxDepth,
      elementsPerLevel,
      averageChildrenPerParent: totalParents > 0 ? totalChildren / totalParents : 0,
      metadataCompleteness: this.calculateMetadataCompleteness(structure)
    };
  }

  /**
   * Calculate how complete the metadata is
   */
  private calculateMetadataCompleteness(structure: GenericStructure): number {
    let totalFields = 0;
    let filledFields = 0;

    const checkMetadata = (metadata: Record<string, any>) => {
      for (const value of Object.values(metadata)) {
        totalFields++;
        if (value !== null && value !== undefined && value !== '') {
          filledFields++;
        }
      }
    };

    checkMetadata(structure.metadata);
    
    const traverse = (elements: GenericStructureElement[]) => {
      for (const elem of elements) {
        checkMetadata(elem.metadata);
        if (elem.elements) {
          traverse(elem.elements);
        }
      }
    };
    
    traverse(structure.elements);

    return totalFields > 0 ? (filledFields / totalFields) * 100 : 0;
  }
}