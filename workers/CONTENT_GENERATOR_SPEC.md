# Content Generator Worker Specification

## Overview

The Content Generator worker (`bitware_content_generator`) consumes structured output from the Content Granulator and generates actual content based on the structure and specifications provided. It follows the established worker pattern and integrates seamlessly with the AI Factory pipeline.

## Core Responsibilities

1. **Consume Granulator Output**: Parse structured content outlines from Content Granulator
2. **Generate Content**: Create actual text content for each element in the structure
3. **Maintain Coherence**: Ensure consistency across generated sections
4. **Track Progress**: Report generation progress for long-running jobs
5. **Optimize Resources**: Batch generation for efficiency while respecting token limits
6. **Quality Assurance**: Validate generated content meets specifications

## Input Format (From Content Granulator)

```typescript
interface ContentGeneratorInput {
  // From Granulator Output
  jobId: number;
  granulatorJobId: number;
  topic: string;
  structureType: 'course' | 'quiz' | 'novel' | 'workflow' | 'knowledge_map' | 'learning_path';
  
  // Structure to Generate Content For
  structure: any;  // Full hierarchical structure
  structureReference?: {
    type: 'kv' | 'r2';
    location: string;
  };
  
  // Generation Requirements
  wordCountEstimates: {
    total: number;  // e.g., 15000-25000 for course
    bySection: {
      moduleIntroductions?: number;  // e.g., 1200
      lessonContent?: number;        // e.g., 8000
      examples?: number;              // e.g., 2000
      exercises?: number;             // e.g., 2500
      assessments?: number;           // e.g., 1300
    };
    byPriority: {
      high: number;    // Must generate (e.g., 7500)
      medium: number;  // Should generate (e.g., 4500)
      low: number;     // Nice to have (e.g., 3000)
    };
  };
  
  // Content Specifications
  contentMetadata: {
    standardParameters: {
      topic: string;
      structureType: string;
      granularityLevel: number;
      targetAudience: string;
      language: string;  // Default: 'en'
      tone: string;      // e.g., 'educational_engaging'
      style: string;     // e.g., 'educational'
    };
    generationStrategy: {
      approach: 'hierarchical' | 'sequential' | 'parallel';
      parallelizable: boolean;
      dependencies: Array<{from: string; to: string}>;
      batchSize: number;
      maxConcurrent: number;
    };
    contentSpecs: {
      contentTypes: string[];      // ['instructional', 'examples', 'exercises']
      requiredSections: string[];  // Must be generated
      optionalSections: string[];  // Can skip if constrained
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
  };
}
```

## Output Format

```typescript
interface ContentGeneratorOutput {
  success: boolean;
  output: {
    jobId: number;
    granulatorJobId: number;
    topic: string;
    structureType: string;
    
    // Generated Content
    content: GeneratedContent;  // Full content or reference
    contentReference?: {
      type: 'kv' | 'r2';
      location: string;
      size: number;
    };
    
    // Generation Summary
    summary: {
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
    };
    
    // Quality Metrics
    qualityMetrics: {
      overallScore: number;
      readability: number;
      coherence: number;
      completeness: number;
      topicRelevance: number;
    };
    
    // Ready for Next Stage
    readyForPackaging: boolean;
    packagingMetadata: {
      availableFormats: string[];  // ['html', 'pdf', 'docx', 'audio']
      recommendedFormat: string;
      estimatedPackagingTime: number;
    };
  };
  
  // Standard Worker Response Fields
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
      currentWorker: 'bitware-content-generator';
      previousWorker: 'bitware-content-granulator';
      nextWorkers: ['content-packager', 'quality-validator'];
      outputFormat: 'structured_content_json';
      version: '1.0';
    };
  };
}
```

## Generated Content Structure

```typescript
interface GeneratedContent {
  // For Course Type
  courseContent?: {
    overview: {
      title: string;
      description: string;  // 200-300 words
      introduction: string; // 500-800 words
      prerequisites: string[]; // Each 50-100 words
      learningOutcomes: string[]; // Each 50-100 words
    };
    modules: Array<{
      id: string;
      title: string;
      introduction: string;  // 300-500 words
      lessons: Array<{
        id: string;
        title: string;
        content: string;      // 800-1500 words
        keyPoints: string[];  // Each 100-200 words
        examples: Array<{
          title: string;
          description: string; // 200-400 words
          code?: string;
        }>;
        exercises: Array<{
          title: string;
          instructions: string; // 150-300 words
          solution?: string;    // 200-400 words
        }>;
      }>;
      summary: string;        // 200-300 words
      assessment: {
        instructions: string;  // 100-200 words
        questions: Array<{
          question: string;
          type: string;
          options?: string[];
          answer: string;
          explanation: string; // 100-200 words
        }>;
      };
    }>;
    conclusion: string;       // 500-800 words
  };
  
  // For Quiz Type
  quizContent?: {
    instructions: string;     // 200-300 words
    categories: Array<{
      name: string;
      description: string;    // 100-200 words
      questions: Array<{
        id: string;
        question: string;     // 50-150 words
        context?: string;     // 100-200 words
        options: string[];    // Each 20-50 words
        correctAnswer: string;
        explanation: string;  // 100-200 words
        hints?: string[];     // Each 50-100 words
      }>;
    }>;
  };
  
  // Metadata
  metadata: {
    totalWords: number;
    readingTime: string;
    difficulty: string;
    keywords: string[];
    summary: string;         // 200-300 word summary
  };
}
```

## API Endpoints

Following the worker pattern, Content Generator will implement:

### Core Endpoints
- `GET /` - Health check
- `GET /health` - Detailed health status
- `GET /help` - API documentation

### Main Execution
- `POST /api/execute` - Generate content from structure

### Generation Management
- `GET /api/jobs` - List generation jobs
- `GET /api/jobs/{id}` - Get job details
- `GET /api/jobs/{id}/status` - Get generation status
- `GET /api/jobs/{id}/content` - Get generated content
- `POST /api/jobs/{id}/retry` - Retry failed generation
- `POST /api/jobs/{id}/cancel` - Cancel in-progress job

### Content Operations
- `POST /api/generate/section` - Generate specific section
- `POST /api/generate/batch` - Batch generation
- `GET /api/content/{id}` - Retrieve content
- `POST /api/content/validate` - Validate content quality

### Templates & Prompts
- `GET /api/prompts` - List generation prompts
- `GET /api/prompts/{type}` - Get prompt template
- `POST /api/prompts/test` - Test prompt

### Analytics & Economy
- `GET /api/stats` - Generation statistics
- `GET /api/economy/stats` - Resource consumption
- `POST /api/economy/estimate` - Estimate generation cost

## Generation Strategy

### 1. Hierarchical Generation
Generate content top-down, maintaining context:
1. Generate overview/introduction
2. Generate module introductions
3. Generate lesson content
4. Generate exercises/assessments
5. Generate summaries/conclusion

### 2. Batch Processing
- Group similar content types for efficiency
- Respect token limits (4000-8000 per batch)
- Maintain context across batches

### 3. Progressive Enhancement
- **Phase 1**: Generate required sections (high priority)
- **Phase 2**: Generate supporting content (medium priority)
- **Phase 3**: Generate optional enhancements (low priority)

### 4. Context Management
```typescript
interface GenerationContext {
  globalContext: {
    topic: string;
    audience: string;
    tone: string;
    style: string;
    previousSections: string[];  // Summaries of generated content
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
```

## AI Provider Configuration

### Recommended Models by Content Type

```typescript
const MODEL_RECOMMENDATIONS = {
  instructional: {
    primary: 'gpt-4o-mini',
    fallback: 'claude-3-haiku',
    cloudflare: '@cf/meta/llama-3-8b-instruct'
  },
  creative: {
    primary: 'claude-3-5-sonnet',
    fallback: 'gpt-4o',
    cloudflare: '@cf/meta/llama-3-70b-instruct'
  },
  technical: {
    primary: 'gpt-4o',
    fallback: 'claude-3-5-sonnet',
    cloudflare: '@cf/deepseek-ai/deepseek-coder-6.7b-instruct'
  },
  quiz: {
    primary: 'gpt-4o-mini',
    fallback: 'claude-3-haiku',
    cloudflare: '@cf/meta/llama-3-8b-instruct'
  }
};
```

### Prompt Templates

```typescript
const PROMPT_TEMPLATES = {
  lesson: `Generate educational content for the following lesson:
Topic: {topic}
Target Audience: {audience}
Tone: {tone}
Style: {style}
Word Count Target: {wordCount}

Lesson Title: {lessonTitle}
Learning Objectives: {objectives}

Context from Previous Sections:
{context}

Requirements:
- Include practical examples
- Use clear, engaging language
- Include {numExamples} examples
- Add {numKeyPoints} key takeaways

Generate the lesson content:`,

  exercise: `Create an exercise for the following lesson:
Topic: {topic}
Lesson: {lessonTitle}
Difficulty: {difficulty}
Type: {exerciseType}

Context:
{lessonSummary}

Requirements:
- Clear instructions (150-300 words)
- Step-by-step guidance
- Include hints if needed
- Provide solution with explanation

Generate the exercise:`,
};
```

## Database Schema

```sql
-- Generation jobs table
CREATE TABLE generation_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  granulator_job_id INTEGER NOT NULL,
  topic TEXT NOT NULL,
  structure_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  
  -- Progress tracking
  total_sections INTEGER,
  sections_completed INTEGER DEFAULT 0,
  current_section TEXT,
  progress_percentage REAL DEFAULT 0,
  
  -- Resource usage
  total_words INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0,
  
  -- Timing
  started_at TEXT,
  completed_at TEXT,
  estimated_completion TEXT,
  processing_time_ms INTEGER,
  
  -- Storage
  content_storage_type TEXT, -- 'inline', 'kv', 'r2'
  content_location TEXT,
  content_size INTEGER,
  
  -- Quality
  quality_score REAL,
  readability_score REAL,
  coherence_score REAL,
  completeness_score REAL,
  
  -- Metadata
  ai_provider TEXT,
  models_used TEXT, -- JSON array
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Content sections table
CREATE TABLE content_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  section_id TEXT NOT NULL,
  section_type TEXT NOT NULL, -- 'overview', 'module', 'lesson', 'exercise', etc.
  parent_section_id TEXT,
  
  -- Content
  title TEXT,
  content TEXT,
  word_count INTEGER,
  
  -- Generation details
  prompt_used TEXT,
  tokens_input INTEGER,
  tokens_output INTEGER,
  generation_time_ms INTEGER,
  model_used TEXT,
  
  -- Quality
  quality_score REAL,
  
  -- Status
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES generation_jobs(id)
);

-- Prompt templates
CREATE TABLE prompt_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  content_type TEXT NOT NULL,
  template TEXT NOT NULL,
  variables TEXT NOT NULL, -- JSON array of required variables
  
  -- Configuration
  recommended_model TEXT,
  temperature REAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2000,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  avg_quality_score REAL,
  avg_generation_time_ms INTEGER,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Generation analytics
CREATE TABLE generation_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  
  -- Volume metrics
  total_jobs INTEGER DEFAULT 0,
  successful_jobs INTEGER DEFAULT 0,
  failed_jobs INTEGER DEFAULT 0,
  
  -- Content metrics
  total_words_generated INTEGER DEFAULT 0,
  total_sections_generated INTEGER DEFAULT 0,
  
  -- Resource metrics
  total_tokens_used INTEGER DEFAULT 0,
  total_cost_usd REAL DEFAULT 0,
  avg_cost_per_1k_words REAL,
  
  -- Performance metrics
  avg_generation_time_ms INTEGER,
  avg_words_per_minute REAL,
  avg_quality_score REAL,
  
  -- Provider breakdown
  provider_stats TEXT, -- JSON with per-provider statistics
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date)
);

-- Create indexes
CREATE INDEX idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX idx_generation_jobs_granulator ON generation_jobs(granulator_job_id);
CREATE INDEX idx_content_sections_job ON content_sections(job_id);
CREATE INDEX idx_content_sections_status ON content_sections(status);
```

## Error Handling

### Error Codes
- `INVALID_STRUCTURE` - Input structure is malformed
- `MISSING_GRANULATOR_DATA` - Required granulator output missing
- `GENERATION_FAILED` - AI generation failed
- `QUALITY_THRESHOLD_NOT_MET` - Generated content below quality threshold
- `RESOURCE_LIMIT_EXCEEDED` - Token/cost limits exceeded
- `SECTION_DEPENDENCY_ERROR` - Required section not generated

### Retry Strategy
1. **Automatic Retry**: Failed sections retry up to 3 times
2. **Progressive Backoff**: 1s, 5s, 15s delays
3. **Model Fallback**: Switch to alternative model on failure
4. **Partial Success**: Continue with other sections if one fails

## Quality Validation

### Validation Checks
1. **Word Count**: Within ±20% of target
2. **Readability**: Flesch reading ease appropriate for audience
3. **Completeness**: All required sections present
4. **Coherence**: Consistent terminology and style
5. **Relevance**: Content matches topic and objectives

### Quality Scoring
```typescript
interface QualityScore {
  overall: number;          // 0-100
  components: {
    relevance: number;      // Topic adherence
    completeness: number;   // Section coverage
    coherence: number;      // Internal consistency
    readability: number;    // Appropriate for audience
    engagement: number;     // Interest and clarity
  };
  issues: string[];         // Identified problems
  suggestions: string[];    // Improvement recommendations
}
```

## Performance Optimization

### Caching Strategy
- Cache generated sections in KV (TTL: 24 hours)
- Cache prompt templates (TTL: 1 hour)
- Cache model responses for retry

### Parallel Processing
- Generate independent sections concurrently
- Maximum 5 concurrent AI requests
- Batch similar content types

### Resource Management
- Monitor token usage per job
- Implement cost caps per job
- Switch to cheaper models for low-priority content

## Integration Requirements

### Input Validation
- Verify granulator job exists and is complete
- Validate structure format
- Check resource estimates against limits

### Output Preparation
- Format content for Content Packager
- Include packaging metadata
- Provide format recommendations

### Progress Reporting
- Real-time progress updates via KV
- Webhook notifications for long jobs
- Status polling endpoint

## Testing Requirements

### Unit Tests
- Prompt generation
- Content parsing
- Quality validation
- Error handling

### Integration Tests
- Granulator output consumption
- AI provider integration
- Database operations
- Storage management

### Load Tests
- Concurrent job handling
- Large content generation
- Resource limit enforcement

## Deployment Configuration

```toml
name = "bitware-content-generator"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"
VERSION = "1.0.0"
MAX_CONCURRENT_GENERATIONS = "5"
DEFAULT_MODEL = "gpt-4o-mini"
QUALITY_THRESHOLD = "75"

[[d1_databases]]
binding = "DB"
database_name = "content-generator-db"
database_id = "xxx"

[[kv_namespaces]]
binding = "CONTENT_CACHE"
id = "xxx"

[[kv_namespaces]]
binding = "JOB_STATUS"
id = "xxx"

[[r2_buckets]]
binding = "CONTENT_STORAGE"
bucket_name = "content-generator-storage"

[[services]]
binding = "KEY_ACCOUNT_MANAGER"
service = "bitware-key-account-manager"

[ai]
binding = "AI"
```

## Success Metrics

1. **Generation Speed**: >500 words per minute
2. **Quality Score**: Average >80/100
3. **Success Rate**: >95% job completion
4. **Cost Efficiency**: <$0.01 per 1000 words
5. **Resource Utilization**: <80% token limit usage

## Future Enhancements

1. **Multi-language Support**: Generate content in multiple languages
2. **Style Transfer**: Apply different writing styles dynamically
3. **Content Personalization**: Adapt content to user preferences
4. **Incremental Generation**: Resume interrupted jobs
5. **Version Control**: Track content revisions
6. **Collaborative Generation**: Multiple AI models working together
7. **Real-time Streaming**: Stream content as it's generated
8. **Content Templates**: Pre-defined content patterns for common use cases