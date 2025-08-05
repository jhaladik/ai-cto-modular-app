import { StructureType, GranularityLevel } from './index';

export interface GranulationTemplate {
  id: number;
  templateName: string;
  structureType: StructureType;
  templateSchema: any;
  complexityLevel: GranularityLevel;
  targetAudience?: string;
  aiPromptTemplate: string;
  validationRules?: any;
  createdAt: string;
  usageCount: number;
}

export interface TemplateAnalytics {
  id: number;
  templateId: number;
  usageDate: string;
  successRate: number;
  avgQualityScore: number;
  avgProcessingTime: number;
  avgValidationAccuracy?: number;
  validationFailureRate?: number;
  userSatisfaction?: number;
  optimizationSuggestions?: string;
}