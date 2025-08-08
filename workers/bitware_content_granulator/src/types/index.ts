export interface Env {
  DB: D1Database;
  TEMPLATE_CACHE: KVNamespace;
  JOB_CACHE: KVNamespace;
  STRUCTURE_STORAGE: R2Bucket;
  KEY_ACCOUNT_MANAGER: Fetcher;
  OPENAI_API_KEY: string;
  CLAUDE_API_KEY?: string;
  AI?: any; // Cloudflare AI binding
  SHARED_SECRET: string;
  ENVIRONMENT?: string;
  VERSION?: string;
}

export interface AuthenticatedRequest extends Request {
  auth: {
    type: 'client' | 'worker' | 'session';
    clientId?: string;
    workerId?: string;
    userId?: string;
    apiKey?: string;
  };
}

export type StructureType = 'course' | 'quiz' | 'novel' | 'workflow' | 'knowledge_map' | 'learning_path';
export type GranularityLevel = 1 | 2 | 3 | 4 | 5;
export type ValidationLevel = 1 | 2 | 3;

export interface ValidationConfig {
  enabled: boolean;
  level: ValidationLevel;
  threshold: number;
  retryOnFail?: boolean;
  maxRetries?: number;
}

export interface ValidationResult {
  accuracyPercentage: number;
  levelUsed: ValidationLevel;
  threshold: number;
  passed: boolean;
  details: {
    questionScores: number[];
    weightedAverage: number;
    aiConfidence: number;
  };
  retryCount: number;
  validationTimeMs: number;
  aiFeedback?: string;
}