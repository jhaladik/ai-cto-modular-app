# Worker Pattern Analysis: Content Granulator as Standard Template

## Executive Summary

The Content Granulator worker (`bitware_content_granulator`) serves as the definitive pattern for all workers in our AI Factory system. This analysis documents the complete worker architecture, patterns, and standards that must be followed by all future workers including Content Generator and Content Packager.

## 1. Standard Worker Architecture

### 1.1 Core Directory Structure
```
bitware_[worker_name]/
├── src/
│   ├── index.ts                 # Main entry point with routing
│   ├── types/
│   │   ├── index.ts             # Core types (Env, AuthenticatedRequest)
│   │   └── [worker].ts          # Worker-specific types
│   ├── handlers/                # Modular endpoint handlers
│   │   ├── execute-handler.ts   # Main execution logic
│   │   ├── monitoring-ops.ts    # Health, help, templates
│   │   ├── [worker]-ops.ts      # Core worker operations
│   │   ├── admin-ops.ts         # Admin/analytics endpoints
│   │   └── economy-ops.ts       # Resource/cost management
│   ├── services/                # Business logic layer
│   │   ├── database.ts          # Database operations
│   │   ├── [worker].ts          # Main service class
│   │   ├── ai-provider.ts       # Multi-AI provider support
│   │   ├── validation.ts        # Quality validation
│   │   └── storage-manager.ts   # KV/R2 storage management
│   └── helpers/                 # Utility functions
│       ├── auth.ts              # 3-tier authentication
│       ├── http.ts              # Standard HTTP responses
│       ├── prompts.ts           # AI prompt management
│       └── economy.ts           # Cost/efficiency calculations
├── schema/                      # Database schema files
│   ├── [worker].sql            # Main schema
│   ├── seed.sql                # Default data
│   └── migration_*.sql         # Schema migrations
├── migrations/                  # Applied migrations
├── wrangler.toml               # Cloudflare configuration
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
├── test.sh                     # Comprehensive tests
└── README.md                   # Worker documentation
```

### 1.2 Main Entry Point Pattern (`src/index.ts`)
```typescript
import { Env, AuthenticatedRequest } from './types';
import { authenticateRequest, isPublicEndpoint } from './helpers/auth';
import { corsHeaders, jsonResponse, errorResponse, notFound } from './helpers/http';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // Handle CORS preflight
      if (method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      // Public endpoints (no auth required)
      if (method === 'GET' && path === '/') return handleHealthCheck(env);
      if (method === 'GET' && path === '/health') return handleDetailedHealth(env);
      if (method === 'GET' && path === '/help') return handleHelp(env);

      // Authenticate non-public endpoints
      let authenticatedRequest: AuthenticatedRequest | null = null;
      if (!isPublicEndpoint(path)) {
        authenticatedRequest = await authenticateRequest(request, env);
      }

      // Route to specific handlers...
      // Main execution endpoint
      if (method === 'POST' && path === '/api/execute') {
        return handleExecute(env, authenticatedRequest!);
      }

      // Worker-specific endpoints...

      return notFound();
    } catch (error) {
      console.error('Request error:', error);
      return errorResponse(error instanceof Error ? error.message : 'Internal server error', 500);
    }
  }
};
```

## 2. API Endpoint Patterns

### 2.1 Standard Endpoint Structure

Every worker MUST implement these endpoints:

#### Public Endpoints (No Authentication)
- `GET /` - Basic health check
- `GET /health` - Detailed health with dependencies
- `GET /help` - API documentation and capabilities

#### Authenticated Endpoints
- `POST /api/execute` - Main worker execution (Resource Manager compatible)
- `GET /api/templates` - List available templates
- `GET /api/templates/{name}` - Get template details
- `GET /api/stats` - Usage statistics

#### Admin Endpoints (Worker Auth Only)
- `GET /api/admin/stats` - Administrative statistics
- `POST /api/admin/templates` - Template management
- `GET /api/admin/analytics` - Analytics data

#### Economy Endpoints
- `GET /api/economy/stats` - Resource consumption stats
- `POST /api/economy/estimate` - Cost estimation
- `GET /api/economy/pricing` - Pricing information

### 2.2 Execute Handler Pattern

The `/api/execute` endpoint is the core interface for Resource Manager integration:

```typescript
interface ExecuteRequest {
  action: string;           // 'granulate', 'generate', 'package', etc.
  input: any;              // Worker-specific input data
  params?: any;            // Processing parameters
  config?: any;            // AI configuration
  timeout?: number;        // Execution timeout
}

interface ExecuteResponse {
  success: boolean;
  output: {
    [workerSpecific]: any; // Worker-specific output
    summary: any;          // Processing summary
    readyForNext: boolean; // Chain continuation flag
  };
  usage: {
    tokens: {
      input: number;
      output: number;
    };
  };
  duration: number;        // Processing time in ms
  cost?: number;           // Cost in USD
  metadata: {
    [key: string]: any;    // Additional metadata
  };
}
```

## 3. Authentication Patterns (3-Tier System)

### 3.1 Authentication Types

1. **Client API Authentication**
   - Header: `X-API-Key: client_api_key`
   - Validates with KAM worker
   - Used for external client requests

2. **Worker-to-Worker Authentication** 
   - Headers: `Authorization: Bearer shared_secret` + `X-Worker-ID: worker_name`
   - Direct service binding communication
   - Used for internal worker communication

3. **Session Authentication**
   - Header: `x-bitware-session-token: session_token`
   - Validates with KAM worker
   - Used for dashboard/admin interface

### 3.2 Authentication Implementation

```typescript
export async function authenticateRequest(request: Request, env: Env): Promise<AuthenticatedRequest> {
  const apiKey = request.headers.get('X-API-Key');
  const authHeader = request.headers.get('Authorization');
  const sessionToken = request.headers.get('x-bitware-session-token');
  const workerId = request.headers.get('X-Worker-ID');

  // Worker-to-worker authentication
  if (authHeader && workerId) {
    const token = authHeader.replace('Bearer ', '');
    if (token === env.SHARED_SECRET) {
      return request as AuthenticatedRequest;
    }
    throw new Error('Invalid worker authentication');
  }

  // Session-based authentication
  if (sessionToken) {
    const validateResponse = await env.KEY_ACCOUNT_MANAGER.fetch(
      new Request('https://worker/auth/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.SHARED_SECRET}`,
          'X-Worker-ID': 'bitware-[worker-name]'
        },
        body: JSON.stringify({ sessionToken })
      })
    );
    if (!validateResponse.ok) throw new Error('Invalid session');
    const sessionData = await validateResponse.json();
    // Set auth data...
  }

  // Client API key authentication
  if (apiKey) {
    const validateResponse = await env.KEY_ACCOUNT_MANAGER.fetch(/*...*/);
    // Validate and set auth data...
  }

  throw new Error('No valid authentication provided');
}
```

## 4. Database Schema Patterns

### 4.1 Standard Table Structure

Every worker should have these core tables:

1. **Templates Table** - Worker-specific templates
2. **Jobs Table** - Execution tracking
3. **Results/Elements Table** - Generated content/structures
4. **Validation Results** - Quality assurance data  
5. **Analytics** - Performance metrics
6. **Resource Consumption** - Cost/usage tracking

### 4.2 Content Granulator Schema Example

```sql
-- Core templates
CREATE TABLE granulation_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_name TEXT UNIQUE NOT NULL,
  structure_type TEXT NOT NULL,
  template_schema TEXT NOT NULL,      -- JSON structure
  ai_prompt_template TEXT NOT NULL,
  validation_rules TEXT,             -- JSON validation criteria
  usage_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Job tracking
CREATE TABLE granulation_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  structure_type TEXT NOT NULL,
  template_id INTEGER,
  status TEXT DEFAULT 'processing',
  quality_score REAL,
  processing_time_ms INTEGER,
  cost_usd REAL,
  client_id TEXT,
  execution_id TEXT,             -- For Resource Manager tracking
  estimated_total_words INTEGER, -- For next worker in chain
  content_generation_metadata TEXT, -- JSON for next worker
  deliverable_specs TEXT,        -- JSON output specifications
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

-- Generated structures/content
CREATE TABLE structure_elements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  element_type TEXT NOT NULL,
  parent_id INTEGER,
  sequence_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  content_outline TEXT,
  target_word_count INTEGER,     -- For content generation
  content_type TEXT,             -- Content classification
  generation_priority INTEGER,   -- Processing priority
  content_tone TEXT,             -- Tone guidelines
  key_points TEXT,               -- JSON array of key points
  metadata TEXT,                 -- JSON element-specific data
  FOREIGN KEY (job_id) REFERENCES granulation_jobs(id)
);
```

## 5. Error Handling Patterns

### 5.1 Standard HTTP Responses

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization, X-Worker-ID, x-bitware-session-token'
};

export function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message, status }, status);
}
```

### 5.2 Database Error Handling

Always wrap database operations in try-catch blocks and handle graceful failures:

```typescript
try {
  const result = await this.env.DB.prepare(query).bind(...params).run();
  return result.meta.last_row_id as number;
} catch (error) {
  console.error('Database operation failed:', error);
  throw new Error(`Database operation failed: ${error.message}`);
}
```

## 6. Storage Management Patterns

### 6.1 Intelligent Storage Tiering

The Content Granulator implements a three-tier storage system that should be standard:

```typescript
async storeStructure(jobId: number, structure: any, size: number): Promise<StorageInfo> {
  const sizeKB = size / 1024;
  
  if (sizeKB < 25) {
    // Small: return inline (no storage)
    return { type: 'inline' };
  } else if (sizeKB < 128) {
    // Medium: store in KV
    const key = `structure:${jobId}`;
    await this.env.JOB_CACHE.put(key, JSON.stringify(structure), {
      expirationTtl: 86400 * 7 // 7 days
    });
    return { type: 'kv', location: key };
  } else {
    // Large: store in R2
    const key = `structures/${jobId}.json`;
    await this.env.STRUCTURE_STORAGE.put(key, JSON.stringify(structure));
    return { type: 'r2', location: key };
  }
}
```

### 6.2 Storage Configuration (wrangler.toml)

```toml
# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "[worker-name]-db"

# KV Namespaces
[[kv_namespaces]]
binding = "TEMPLATE_CACHE"  # Template caching
id = "template-cache-id"

[[kv_namespaces]] 
binding = "JOB_CACHE"       # Job results and progress
id = "job-cache-id"

# R2 Storage
[[r2_buckets]]
binding = "STRUCTURE_STORAGE" # Large result storage
bucket_name = "[worker-name]-data"

# Service bindings
[[services]]
binding = "KEY_ACCOUNT_MANAGER"
service = "bitware-key-account-manager"
```

## 7. Monitoring and Statistics Patterns

### 7.1 Health Check Implementation

```typescript
export async function handleHealthCheck(env: Env): Promise<Response> {
  return jsonResponse({
    status: 'healthy',
    service: 'bitware-[worker-name]',
    version: env.VERSION || '1.0.0',
    timestamp: new Date().toISOString()
  });
}

export async function handleDetailedHealth(env: Env): Promise<Response> {
  const checks = {
    database: await checkDatabase(env),
    ai_providers: await checkAIProviders(env),
    kv: await checkKV(env),
    r2: await checkR2(env)
  };
  
  const allHealthy = Object.values(checks).every(check => check);
  
  return jsonResponse({
    status: allHealthy ? 'healthy' : 'degraded',
    service: 'bitware-[worker-name]',
    version: env.VERSION || '1.0.0',
    checks,
    capabilities: {
      // Worker-specific capabilities
    },
    timestamp: new Date().toISOString()
  }, allHealthy ? 200 : 503);
}
```

### 7.2 Statistics and Analytics

Every worker should track:
- Job success/failure rates
- Processing times
- Resource consumption (tokens, cost)
- Quality scores
- Error patterns

```typescript
async recordAnalytics(templateId: number, metrics: {
  success: boolean;
  qualityScore: number;
  processingTime: number;
  validationAccuracy?: number;
  costUsd?: number;
}): Promise<void> {
  // Update daily analytics with rolling averages
}
```

## 8. Content Granulator Output Format

### 8.1 Standard Output Structure

The Content Granulator produces standardized output that serves as input for subsequent workers:

```typescript
interface GranulatorOutput {
  // Core Results
  jobId: number;
  topic: string;
  structureType: 'course' | 'quiz' | 'novel' | 'workflow' | 'knowledge_map' | 'learning_path';
  summary: {
    totalElements: number;
    modules?: number;
    lessons?: number;
    wordCountEstimates: WordCountEstimates;
    contentMetadata: ContentMetadata;
  };
  qualityScore: number;
  readyForContentGeneration: boolean;
  
  // Storage Information
  structure?: any;           // Inline for small structures
  structureReference?: {     // Reference for large structures
    type: 'kv' | 'r2';
    location: string;
  };
  
  // Resource Usage
  processingTimeMs: number;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  costUsd: number;
  
  // Validation Results
  validationResult?: {
    accuracyPercentage: number;
    passed: boolean;
    aiFeedback?: string;
  };
}
```

### 8.2 Word Count Estimates

Critical for Content Generator planning:

```typescript
interface WordCountEstimates {
  total: number;
  bySection: {
    moduleIntroductions?: number;
    lessonContent?: number;
    examples?: number;
    exercises?: number;
    assessments?: number;
    summaries?: number;
    // Structure-specific sections
  };
  byPriority: {
    high: number;    // Core content - must generate
    medium: number;  // Supporting content
    low: number;     // Optional content
  };
}
```

### 8.3 Content Generation Metadata

Provides detailed specifications for the Content Generator:

```typescript
interface ContentMetadata {
  // Worker Chain Information
  workerChain: {
    currentWorker: 'bitware-content-granulator';
    nextWorkers: ['content-generator', 'quality-validator'];
    outputFormat: 'structured_json';
    version: '2.0';
  };
  
  // Standard Parameters
  standardParameters: {
    topic: string;
    structureType: string;
    granularityLevel: number;
    targetAudience: string;
    language: 'en';
    tone: string;
    style: string;
  };
  
  // Generation Strategy
  generationStrategy: {
    approach: 'hierarchical';
    parallelizable: boolean;
    dependencies: Dependency[];
    batchSize: number;
    maxConcurrent: number;
  };
  
  // Content Specifications
  contentSpecs: {
    contentTypes: string[];        // ['instructional', 'examples', 'exercises']
    requiredSections: string[];    // Must be generated
    optionalSections: string[];    // Can be skipped if resource constrained
  };
  
  // Quality Requirements
  qualityRequirements: {
    minQualityScore: number;
    readabilityTarget: number;
    coherenceTarget: number;
    completenessTarget: number;
    validationRequired: boolean;
  };
  
  // Resource Estimates
  resourceEstimates: {
    estimatedTokens: number;
    estimatedTimeMs: number;
    estimatedCostUsd: number;
    storageRequired: 'small' | 'medium' | 'large';
  };
}
```

## 9. AI Provider Integration Patterns

### 9.1 Multi-Provider Architecture

Workers should support multiple AI providers with fallback:

```typescript
interface AIProviderInterface {
  generateCompletion(prompt: string, config: AIConfig): Promise<AIResponse>;
  isAvailable(): Promise<boolean>;
  calculateCost(tokens: TokenUsage, model: string): number;
  getDefaultModel(): string;
}

class AIProviderFactory {
  static create(provider: 'openai' | 'claude' | 'cloudflare', env: Env): AIProviderInterface;
  static getBestAvailableProvider(env: Env, preferred?: string): Promise<AIProviderInterface>;
}
```

### 9.2 Cost Optimization

```typescript
interface CostOptimization {
  maxCostPerJob?: number;
  preferLowCostProviders?: boolean;
  fallbackOnCostExceed?: boolean;
}

function calculateResourceEfficiency(usage: ResourceUsage): EfficiencyMetrics {
  return {
    tokensPerSecond: usage.tokensUsed.total / (usage.processingTimeMs / 1000),
    costPerToken: usage.costUsd / usage.tokensUsed.total,
    efficiency: 'high' | 'medium' | 'low'
  };
}
```

## 10. Template System Patterns

### 10.1 Template Structure

Every worker should support templates with these components:

```typescript
interface WorkerTemplate {
  id: number;
  templateName: string;
  structureType: string;
  templateSchema: any;           // JSON structure definition
  complexityLevel: 1 | 2 | 3 | 4 | 5;
  targetAudience: string;
  aiPromptTemplate: string;      // Parameterized prompt
  validationRules: any;          // JSON validation criteria
  aiProviderConfig?: {           // AI provider preferences
    preferredProvider?: string;
    fallbackProviders?: string[];
    modelPreferences?: Record<string, string>;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
  costOptimization?: CostOptimization;
  usageCount: number;
  createdAt: string;
}
```

### 10.2 Prompt Generation

Templates should use parameterized prompts:

```typescript
function generatePrompt(
  topic: string,
  structureType: string,
  baseTemplate: string,
  granularityLevel: number,
  audience: string,
  constraints?: any,
  options?: any
): string {
  return baseTemplate
    .replace('{topic}', topic)
    .replace('{audience}', audience)
    .replace('{granularity}', granularityLevel.toString())
    // Additional parameter substitution...
}
```

## 11. Testing Patterns

### 11.1 Comprehensive Test Script

Every worker must include a `test.sh` script:

```bash
#!/bin/bash
# Test script for bitware-[worker-name]

echo "🧪 Testing Worker: bitware-[worker-name]"

# Test 1: Health Check
echo "Test 1: Health Check"
curl -s http://localhost:8787/ | jq '.'

# Test 2: Detailed Health
echo "Test 2: Detailed Health Check"  
curl -s http://localhost:8787/health | jq '.'

# Test 3: Help Documentation
echo "Test 3: Help Documentation"
curl -s http://localhost:8787/help | jq '.'

# Test 4: Main Execute Function
echo "Test 4: Execute Function"
curl -X POST http://localhost:8787/api/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key" \
  -d '{
    "action": "[worker-action]",
    "input": {
      "topic": "Test Topic"
    }
  }' | jq '.'

# Additional worker-specific tests...
```

## 12. Worker Chain Integration

### 12.1 Resource Manager Compatible Output

All workers must return output compatible with Resource Manager orchestration:

```typescript
interface ResourceManagerCompatibleOutput {
  success: boolean;
  output: {
    // Worker-specific output
    readyForNext: boolean;       // Chain continuation flag
    nextWorkerRecommendation?: string;
  };
  usage: {
    tokens: { input: number; output: number; };
  };
  duration: number;
  cost?: number;
  metadata: {
    workerChain: {
      currentWorker: string;
      nextWorkers: string[];
      outputFormat: string;
      version: string;
    };
    // Additional metadata for chain coordination
  };
}
```

### 12.2 Dependency Management

Workers should explicitly declare their dependencies and output:

```typescript
interface WorkerChainMetadata {
  dependencies: {
    requires: string[];          // Previous workers in chain
    provides: string[];          // Capabilities this worker adds
    dataFormats: {
      input: string[];          // Accepted input formats
      output: string[];         // Generated output formats
    };
  };
  
  compatibility: {
    minResourceManagerVersion: string;
    supportedWorkers: Record<string, string>; // Worker name -> min version
  };
}
```

## 13. Environment and Configuration Patterns

### 13.1 Environment Interface

```typescript
interface Env {
  // Database
  DB: D1Database;
  
  // Storage
  TEMPLATE_CACHE: KVNamespace;
  JOB_CACHE: KVNamespace; 
  STRUCTURE_STORAGE: R2Bucket;
  
  // Service Bindings
  KEY_ACCOUNT_MANAGER: Fetcher;
  
  // AI Providers
  OPENAI_API_KEY: string;
  CLAUDE_API_KEY?: string;
  AI?: any; // Cloudflare AI binding
  
  // Security
  SHARED_SECRET: string;
  
  // Configuration
  ENVIRONMENT?: string;
  VERSION?: string;
}
```

### 13.2 Configuration Best Practices

1. **Secrets Management**: Use Wrangler secrets for API keys
2. **Environment Variables**: Use for non-sensitive configuration
3. **Service Bindings**: Prefer over HTTP calls for worker communication
4. **Resource Limits**: Configure appropriate timeouts and limits

## 14. Deployment and DevOps Patterns

### 14.1 Wrangler Configuration Template

```toml
name = "bitware-[worker-name]"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[env.production]
vars = { ENVIRONMENT = "production", VERSION = "1.0.0" }

[env.staging]
vars = { ENVIRONMENT = "staging", VERSION = "1.0.0" }

# Database, KV, R2, and service bindings...
```

### 14.2 CI/CD Considerations

1. **Database Migrations**: Run before deployment
2. **Health Checks**: Verify after deployment
3. **Rollback Strategy**: Maintain previous version capability
4. **Monitoring**: Set up alerts for error rates and performance

## 15. Implementation Checklist for New Workers

### 15.1 Core Requirements

- [ ] Implement standard directory structure
- [ ] Create main entry point with routing
- [ ] Implement 3-tier authentication
- [ ] Create database schema with standard tables
- [ ] Implement storage management (inline/KV/R2)
- [ ] Add comprehensive error handling
- [ ] Create detailed help documentation
- [ ] Implement health checks with dependency validation
- [ ] Add resource consumption tracking
- [ ] Create comprehensive test suite

### 15.2 Integration Requirements  

- [ ] Resource Manager compatible execute endpoint
- [ ] Worker chain metadata generation
- [ ] Standard output format with next-worker specifications
- [ ] Template system with AI provider configuration
- [ ] Cost optimization and tracking
- [ ] Quality validation integration
- [ ] Progress tracking for long-running operations

### 15.3 Production Readiness

- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation complete
- [ ] Monitoring and alerting
- [ ] Disaster recovery procedures
- [ ] Load testing completed

## Conclusion

The Content Granulator worker establishes the definitive pattern for all workers in our AI Factory system. This architecture ensures consistency, maintainability, and scalability across the entire worker ecosystem. All future workers (Content Generator, Content Packager, etc.) must follow these patterns to ensure seamless integration and optimal performance.

The key innovations demonstrated by the Content Granulator include:

1. **Multi-AI Provider Support** with intelligent fallback
2. **Intelligent Storage Tiering** based on content size
3. **Comprehensive Resource Tracking** for cost optimization
4. **Worker Chain Compatibility** with detailed metadata
5. **Template-Driven Configuration** with validation
6. **Three-Tier Authentication** supporting multiple use cases
7. **Comprehensive Testing** with automated validation

These patterns provide the foundation for building a robust, scalable, and maintainable AI Factory system.