import { ValidationConfig, ValidationResult } from './index';

export interface HandshakeRequest {
  executionId: string;
  pipelineStage: string;
  inputData: {
    topic: string;
    structureType: string;
    granularityLevel: number;
    templateName: string;
    targetAudience?: string;
    constraints?: any;
    options?: any;
  };
  resourceRequirements: {
    estimatedTokens: number;
    timeoutMs: number;
  };
  validationConfig?: ValidationConfig;
  storagePreference?: 'inline' | 'kv' | 'r2';
}

export interface HandshakeResponse {
  executionId: string;
  workerId: string;
  accepted: boolean;
  estimatedCompletionMs: number;
  resourceRequirements: {
    cpu: number;
    memory: number;
    apiCalls: number;
  };
  capabilities: {
    supportedStructures: string[];
    maxGranularity: number;
    validationSupported: boolean;
  };
}

export interface ProcessResponse {
  executionId: string;
  status: 'completed' | 'failed' | 'processing';
  progress: number;
  result?: {
    jobId: number;
    structure: any;
    granulationSummary: any;
    qualityScore: number;
    validation?: ValidationResult;
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  metrics: {
    tokensUsed: number;
    processingTimeMs: number;
    costUsd: number;
  };
  dataReference?: {
    type: 'inline' | 'kv' | 'r2';
    location?: string;
    size?: number;
  };
}

export interface ProgressUpdate {
  executionId: string;
  progress: number;
  stage: string;
  message: string;
  estimatedRemainingMs?: number;
}