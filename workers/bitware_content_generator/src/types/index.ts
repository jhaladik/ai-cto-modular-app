export interface Env {
  // Database
  DB: D1Database;
  
  // Storage
  CONTENT_CACHE: KVNamespace;
  JOB_STATUS: KVNamespace;
  PROMPT_CACHE: KVNamespace;
  CONTENT_STORAGE: R2Bucket;
  
  // Service Bindings
  KEY_ACCOUNT_MANAGER: Fetcher;
  CONTENT_GRANULATOR: Fetcher;
  
  // AI Providers
  OPENAI_API_KEY?: string;
  CLAUDE_API_KEY?: string;
  AI?: any; // Cloudflare AI binding
  
  // Security
  SHARED_SECRET?: string;
  
  // Configuration
  ENVIRONMENT?: string;
  VERSION?: string;
  MAX_CONCURRENT_GENERATIONS?: string;
  DEFAULT_MODEL?: string;
  QUALITY_THRESHOLD?: string;
  MAX_TOKENS_PER_REQUEST?: string;
  DEFAULT_TEMPERATURE?: string;
}

export interface AuthenticatedRequest extends Request {
  auth?: {
    type: 'api_key' | 'worker' | 'session';
    clientId?: string;
    workerId?: string;
    userId?: string;
    sessionToken?: string;
  };
}

export interface StandardResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    timestamp: string;
    version?: string;
    duration?: number;
    [key: string]: any;
  };
}

export interface WorkerCapabilities {
  actions: string[];
  inputFormats: string[];
  outputFormats: string[];
  aiProviders: string[];
  maxConcurrentJobs: number;
  supportedLanguages: string[];
  supportedStructureTypes: string[];
}