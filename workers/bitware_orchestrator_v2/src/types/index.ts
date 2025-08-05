export * from './pipeline';
export * from './resources';
export * from './execution';
export * from './handshake';

export interface Env {
  DB: D1Database;
  EXECUTION_CACHE: KVNamespace;
  RESOURCE_CACHE: KVNamespace;
  DATA_REFS: KVNamespace;
  DATA_STORAGE: R2Bucket;
  
  KAM: Fetcher;
  TOPIC_RESEARCHER?: Fetcher;
  RSS_FINDER?: Fetcher;
  FEED_FETCHER?: Fetcher;
  CONTENT_CLASSIFIER?: Fetcher;
  REPORT_BUILDER?: Fetcher;
  UNIVERSAL_RESEARCHER?: Fetcher;
  OPTIMIZER?: Fetcher;
  
  ENVIRONMENT: string;
  VERSION: string;
  WORKER_SHARED_SECRET?: string;
}

export interface AuthenticatedRequest extends Request {
  auth?: {
    type: 'worker' | 'api' | 'session';
    workerId?: string;
    clientId?: string;
    userId?: string;
    permissions?: string[];
  };
}