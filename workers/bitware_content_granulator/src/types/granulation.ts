import { StructureType, GranularityLevel, ValidationConfig } from './index';

export interface GranulationRequest {
  topic: string;
  structureType: StructureType;
  granularityLevel: GranularityLevel;
  templateName: string;
  targetAudience?: string;
  constraints?: {
    maxModules?: number;
    estimatedHours?: number;
    difficultyProgression?: 'linear' | 'exponential' | 'custom';
    maxElements?: number;
  };
  options?: {
    includeAssessments?: boolean;
    includePracticalExercises?: boolean;
    generatePrerequisites?: boolean;
    includeExamples?: boolean;
  };
  validation?: ValidationConfig;
}

export interface GranulationJob {
  id: number;
  topic: string;
  structureType: StructureType;
  templateId: number;
  granularityLevel: GranularityLevel;
  targetElements?: number;
  actualElements?: number;
  qualityScore?: number;
  processingTimeMs?: number;
  costUsd?: number;
  status: 'processing' | 'completed' | 'failed' | 'validating' | 'retry';
  validationEnabled: boolean;
  validationLevel: ValidationLevel;
  validationThreshold: number;
  startedAt: string;
  completedAt?: string;
}

export interface StructureElement {
  id: number;
  jobId: number;
  elementType: string;
  parentId?: number;
  sequenceOrder: number;
  title: string;
  description?: string;
  contentOutline?: string;
  metadata?: any;
  aiReasoning?: string;
  validationStatus?: string;
  createdAt: string;
}

export interface CourseStructure {
  courseOverview: {
    title: string;
    duration: string;
    prerequisites: string[];
    learningOutcomes: string[];
    targetAudience: string;
  };
  modules: Array<{
    id: number;
    title: string;
    sequenceOrder: number;
    estimatedDuration: string;
    learningObjectives: string[];
    lessons: Array<{
      title: string;
      learningObjectives: string[];
      contentOutline: string;
      assessmentPoints: string[];
      practicalExercises?: string[];
    }>;
    assessment?: {
      type: string;
      questions: number;
      passingScore: number;
    };
  }>;
}

export interface QuizStructure {
  quizOverview: {
    title: string;
    totalQuestions: number;
    estimatedTime: string;
    difficultyDistribution: {
      easy: number;
      medium: number;
      hard: number;
    };
  };
  categories: Array<{
    name: string;
    questionCount: number;
    questions: Array<{
      type: 'multiple_choice' | 'true_false' | 'code_completion' | 'essay';
      difficulty: 'easy' | 'medium' | 'hard';
      topic: string;
      skillsTested: string[];
    }>;
  }>;
}

export interface NovelStructure {
  novelOverview: {
    title: string;
    genre: string;
    targetLength: string;
    themes: string[];
    setting: string;
  };
  acts: Array<{
    actNumber: number;
    purpose: string;
    chapters: Array<{
      chapterNumber: number;
      title: string;
      sceneCount: number;
      plotPoints: string[];
      characterDevelopment: string[];
      wordCountTarget: number;
    }>;
  }>;
  characterArcs: Array<{
    characterName: string;
    role: string;
    arcDescription: string;
  }>;
}

export interface WorkflowStructure {
  workflowOverview: {
    name: string;
    purpose: string;
    expectedDuration: string;
    complexity: string;
  };
  phases: Array<{
    name: string;
    sequenceOrder: number;
    steps: Array<{
      stepNumber: number;
      title: string;
      description: string;
      dependencies: number[];
      resources: string[];
      estimatedTime: string;
      decisionPoints?: Array<{
        condition: string;
        outcomes: string[];
      }>;
    }>;
    qualityGates: Array<{
      criteria: string;
      validationMethod: string;
    }>;
  }>;
}