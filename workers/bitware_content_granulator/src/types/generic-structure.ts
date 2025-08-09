/**
 * Generic Hierarchical Structure System
 * 
 * This system allows any template to define its structure using levels
 * without hardcoding specific property names or structure types.
 */

/**
 * Core structure element that can represent any hierarchical content
 */
export interface GenericStructureElement {
  id: string;                           // Unique identifier (e.g., "1", "1.1", "1.1.1")
  type: string;                          // Generic type (e.g., "section", "unit", "item")
  name: string;                          // Human-readable name
  level: number;                         // Hierarchy level (1, 2, 3, etc.)
  sequenceOrder: number;                 // Order within same level
  metadata: Record<string, any>;         // Flexible properties bag
  elements?: GenericStructureElement[];  // Nested child elements
}

/**
 * Root structure container
 */
export interface GenericStructure {
  type: string;                          // Structure type (course, quiz, novel, etc.)
  version: string;                       // Structure version
  metadata: {
    title: string;
    description?: string;
    [key: string]: any;                  // Any additional metadata
  };
  objects?: {                            // Object-centric content entities
    provided?: any;                      // User-provided mandatory/optional objects
    generated?: {                        // AI-generated objects
      actors?: any[];
      locations?: any[];
      concepts?: any[];
      resources?: any[];
      [key: string]: any;
    };
    [key: string]: any;
  };
  elements: GenericStructureElement[];   // Top-level elements
  summary?: {
    totalElements: number;
    levelCounts: Record<number, number>; // Count of elements at each level
    [key: string]: any;
  };
}

/**
 * Template structure rules that define constraints
 */
export interface StructureLevelRule {
  level: number;                         // Level number (1, 2, 3, etc.)
  suggestedType: string;                 // Suggested type name (module, lesson, etc.)
  minElements: number;                   // Minimum elements at this level
  maxElements: number;                   // Maximum elements at this level
  requiredMetadata?: string[];           // Required metadata fields
  optionalMetadata?: string[];           // Optional metadata fields
  allowsChildren: boolean;               // Whether this level can have children
}

/**
 * Template structure definition
 */
export interface TemplateStructureDefinition {
  templateName: string;
  structureType: string;
  description: string;
  levels: StructureLevelRule[];
  globalMetadata?: {                     // Metadata required at root level
    required: string[];
    optional: string[];
  };
  examples?: {
    levelNames: Record<number, string[]>; // Example names for each level
  };
}

/**
 * Validation result for structure
 */
export interface StructureValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * AI generation instructions
 */
export interface AIStructurePrompt {
  basePrompt: string;
  structureFormat: string;               // JSON format example
  rules: StructureLevelRule[];
  examples?: any[];
  constraints?: {
    totalElements?: number;
    maxDepth?: number;
    [key: string]: any;
  };
}

/**
 * Storage format for database
 */
export interface StoredStructureElement {
  id?: number;
  jobId: number;
  elementId: string;                     // The element's ID (e.g., "1.2.3")
  elementType: string;                   // Generic type
  level: number;
  parentId?: number;                     // Database ID of parent element
  sequenceOrder: number;
  title: string;
  description?: string;
  metadata?: any;                        // JSON blob
  createdAt?: string;
}

/**
 * Helper type for structure traversal
 */
export type StructureVisitor<T> = (
  element: GenericStructureElement,
  level: number,
  parent?: GenericStructureElement
) => T;

/**
 * Structure statistics
 */
export interface StructureStats {
  totalElements: number;
  maxDepth: number;
  elementsPerLevel: Record<number, number>;
  averageChildrenPerParent: number;
  metadataCompleteness: number;         // Percentage of required metadata filled
}