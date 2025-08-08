// Input from Content Granulator
export interface ContentGeneratorInput {
  jobId?: number;
  granulatorJobId: number;
  topic: string;
  structureType: StructureType;
  
  // Structure to generate content for
  structure: any;
  structureReference?: {
    type: 'kv' | 'r2';
    location: string;
  };
  
  // Generation requirements
  wordCountEstimates: WordCountEstimates;
  contentMetadata: ContentMetadata;
  
  // Optional overrides
  config?: GenerationConfig;
}

export type StructureType = 'course' | 'quiz' | 'novel' | 'workflow' | 'knowledge_map' | 'learning_path';

export interface WordCountEstimates {
  total: number;
  bySection: {
    moduleIntroductions?: number;
    lessonContent?: number;
    examples?: number;
    exercises?: number;
    assessments?: number;
    summaries?: number;
    [key: string]: number | undefined;
  };
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface ContentMetadata {
  standardParameters: {
    topic: string;
    structureType: string;
    granularityLevel: number;
    targetAudience: string;
    language: string;
    tone: string;
    style: string;
  };
  generationStrategy: {
    approach: 'hierarchical' | 'sequential' | 'parallel';
    parallelizable: boolean;
    dependencies: Array<{from: string; to: string}>;
    batchSize: number;
    maxConcurrent: number;
  };
  contentSpecs: {
    contentTypes: string[];
    requiredSections: string[];
    optionalSections: string[];
  };
  qualityRequirements: {
    minQualityScore: number;
    readabilityTarget: number;
    coherenceTarget: number;
    completenessTarget: number;
    validationRequired: boolean;
  };
  resourceEstimates: {
    estimatedTokens: number;
    estimatedTimeMs: number;
    estimatedCostUsd: number;
  };
}

export interface GenerationConfig {
  aiProvider?: 'openai' | 'claude' | 'cloudflare';
  aiModel?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  enableCaching?: boolean;
  qualityValidation?: boolean;
  progressCallbackUrl?: string;
}

// Output format
export interface ContentGeneratorOutput {
  success: boolean;
  output: {
    jobId: number;
    granulatorJobId: number;
    topic: string;
    structureType: string;
    
    // Generated content
    content?: GeneratedContent;
    contentReference?: {
      type: 'kv' | 'r2';
      location: string;
      size: number;
    };
    
    // Generation summary
    summary: GenerationSummary;
    
    // Quality metrics
    qualityMetrics: QualityMetrics;
    
    // Ready for next stage
    readyForPackaging: boolean;
    packagingMetadata: PackagingMetadata;
  };
  
  // Standard worker response fields
  usage: {
    tokens: {
      input: number;
      output: number;
    };
  };
  duration: number;
  cost: number;
  metadata: {
    aiProvider: string;
    models: string[];
    batchesProcessed: number;
    retries: number;
    workerChain: {
      currentWorker: string;
      previousWorker: string;
      nextWorkers: string[];
      outputFormat: string;
      version: string;
    };
  };
}

export interface GenerationSummary {
  totalSections: number;
  sectionsGenerated: number;
  totalWords: number;
  wordsBySection: Record<string, number>;
  generationTime: number;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  costUsd: number;
}

export interface QualityMetrics {
  overallScore: number;
  readability: number;
  coherence: number;
  completeness: number;
  topicRelevance: number;
}

export interface PackagingMetadata {
  availableFormats: string[];
  recommendedFormat: string;
  estimatedPackagingTime: number;
}

// Generated content structure
export interface GeneratedContent {
  courseContent?: CourseContent;
  quizContent?: QuizContent;
  workflowContent?: WorkflowContent;
  metadata: ContentMetadataOutput;
}

export interface CourseContent {
  overview: {
    title: string;
    description: string;
    introduction: string;
    prerequisites: string[];
    learningOutcomes: string[];
  };
  modules: ModuleContent[];
  conclusion: string;
}

export interface ModuleContent {
  id: string;
  title: string;
  introduction: string;
  lessons: LessonContent[];
  summary: string;
  assessment: AssessmentContent;
}

export interface LessonContent {
  id: string;
  title: string;
  content: string;
  keyPoints: string[];
  examples: ExampleContent[];
  exercises: ExerciseContent[];
}

export interface ExampleContent {
  title: string;
  description: string;
  code?: string;
}

export interface ExerciseContent {
  title: string;
  instructions: string;
  solution?: string;
}

export interface AssessmentContent {
  instructions: string;
  questions: QuestionContent[];
}

export interface QuestionContent {
  question: string;
  type: string;
  options?: string[];
  answer: string;
  explanation: string;
}

export interface QuizContent {
  instructions: string;
  categories: Array<{
    name: string;
    description: string;
    questions: Array<{
      id: string;
      question: string;
      context?: string;
      options: string[];
      correctAnswer: string;
      explanation: string;
      hints?: string[];
    }>;
  }>;
}

export interface WorkflowContent {
  overview: {
    name: string;
    description: string;
    purpose: string;
  };
  steps: Array<{
    id: string;
    name: string;
    description: string;
    instructions: string;
    inputs: string[];
    outputs: string[];
  }>;
}

export interface ContentMetadataOutput {
  totalWords: number;
  readingTime: string;
  difficulty: string;
  keywords: string[];
  summary: string;
}

// Job management
export interface GenerationJob {
  id: number;
  granulatorJobId: number;
  topic: string;
  structureType: string;
  status: JobStatus;
  
  // Progress tracking
  totalSections: number;
  sectionsCompleted: number;
  currentSection?: string;
  progressPercentage: number;
  
  // Resource usage
  totalWords: number;
  tokensUsed: number;
  costUsd: number;
  
  // Timing
  startedAt?: string;
  completedAt?: string;
  estimatedCompletion?: string;
  processingTimeMs?: number;
  
  // Storage
  contentStorageType?: 'inline' | 'kv' | 'r2';
  contentLocation?: string;
  contentSize?: number;
  
  // Quality
  qualityScore?: number;
  readabilityScore?: number;
  coherenceScore?: number;
  completenessScore?: number;
  
  // Metadata
  aiProvider?: string;
  modelsUsed?: string[];
  retryCount: number;
  errorMessage?: string;
  
  createdAt: string;
  updatedAt: string;
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

// Generation context for maintaining coherence
export interface GenerationContext {
  globalContext: {
    topic: string;
    audience: string;
    tone: string;
    style: string;
    previousSections: string[];
  };
  localContext: {
    currentModule?: string;
    currentLesson?: string;
    relatedConcepts: string[];
    definedTerms: Record<string, string>;
  };
  constraints: {
    maxTokensPerRequest: number;
    targetWordCount: number;
    requiredKeywords: string[];
  };
}

// Prompt template
export interface PromptTemplate {
  id: number;
  name: string;
  contentType: string;
  template: string;
  variables: string[];
  recommendedModel?: string;
  temperature?: number;
  maxTokens?: number;
  usageCount: number;
  avgQualityScore?: number;
  avgGenerationTimeMs?: number;
  createdAt: string;
  updatedAt: string;
}