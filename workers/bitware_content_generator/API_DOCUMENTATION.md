# Content Generator API Documentation

## Base URL
```
https://bitware-content-generator.jhaladik.workers.dev
```

## Authentication

The Content Generator supports three authentication methods:

### 1. Worker-to-Worker Authentication
```http
Authorization: Bearer internal-worker-auth-token-2024
X-Worker-ID: your-worker-id
```

### 2. Client API Key Authentication
```http
X-API-Key: your-api-key
```

### 3. Session Token Authentication
```http
x-bitware-session-token: your-session-token
```

---

## Endpoints Overview

| Endpoint | Method | Auth Required | Description |
|----------|--------|--------------|-------------|
| `/` | GET | No | Health check |
| `/health` | GET | No | Detailed health status |
| `/help` | GET | No | API documentation |
| `/api/execute` | POST | Yes | Main content generation endpoint |
| `/api/templates` | GET | Yes | List prompt templates |
| `/api/templates/{name}` | GET | Yes | Get template details |
| `/api/jobs` | GET | Yes | List generation jobs |
| `/api/jobs/{id}` | GET | Yes | Get job details |
| `/api/jobs/{id}/status` | GET | Yes | Get job status |
| `/api/jobs/{id}/content` | GET | Yes | Get generated content |
| `/api/jobs/{id}/retry` | POST | Yes | Retry failed job |
| `/api/jobs/{id}/cancel` | POST | Yes | Cancel in-progress job |
| `/api/stats` | GET | Yes | Get generation statistics |
| `/api/analytics` | GET | Yes | Get detailed analytics |
| `/api/economy/pricing` | GET | Yes | Get AI provider pricing |
| `/api/economy/estimate` | POST | Yes | Estimate generation cost |
| `/api/economy/stats` | GET | Yes | Get resource consumption stats |

---

## Core Endpoints

### 1. Execute Content Generation
**Endpoint:** `POST /api/execute`

**Description:** Main endpoint for content generation. Takes structured output from Content Granulator and generates complete content.

**Request Body:**
```json
{
  "action": "generate",
  "input": {
    "granulatorJobId": 123,                       // Required: Job ID from Content Granulator
    "topic": "string",                            // Required: Topic for content generation
    "structureType": "string",                    // Required: course|quiz|novel|workflow|knowledge_map|learning_path
    "structure": {},                              // Required: Structure from granulator (or use structureReference)
    "structureReference": {                       // Optional: Reference if structure stored externally
      "type": "kv|r2",
      "location": "string"
    },
    "wordCountEstimates": {                       // Required: Word count targets
      "total": 15000,
      "bySection": {
        "moduleIntroductions": 1200,
        "lessonContent": 8000,
        "examples": 2000,
        "exercises": 2500,
        "assessments": 1300
      },
      "byPriority": {
        "high": 7500,
        "medium": 4500,
        "low": 3000
      }
    },
    "contentMetadata": {                          // Required: Generation parameters
      "standardParameters": {
        "topic": "string",
        "structureType": "string",
        "granularityLevel": 1-5,
        "targetAudience": "string",
        "language": "en",
        "tone": "string",
        "style": "string"
      },
      "generationStrategy": {
        "approach": "hierarchical|sequential|parallel",
        "parallelizable": boolean,
        "dependencies": [],
        "batchSize": 5,
        "maxConcurrent": 3
      },
      "contentSpecs": {
        "contentTypes": ["instructional", "examples", "exercises"],
        "requiredSections": ["overview", "lessons"],
        "optionalSections": ["exercises", "assessments"]
      },
      "qualityRequirements": {
        "minQualityScore": 75,
        "readabilityTarget": 85,
        "coherenceTarget": 85,
        "completenessTarget": 90,
        "validationRequired": true
      },
      "resourceEstimates": {
        "estimatedTokens": 50000,
        "estimatedTimeMs": 30000,
        "estimatedCostUsd": 0.075
      }
    }
  },
  "config": {                                      // Optional: Override default settings
    "aiProvider": "openai|claude|cloudflare",
    "aiModel": "gpt-4o-mini",
    "temperature": 0.7,
    "maxTokens": 4000,
    "systemPrompt": "string",
    "enableCaching": true,
    "qualityValidation": true,
    "progressCallbackUrl": "https://webhook.url"
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "output": {
    "jobId": 456,
    "granulatorJobId": 123,
    "topic": "Introduction to Python",
    "structureType": "course",
    "content": {                                  // Inline if < 25KB
      "courseContent": {
        "overview": {
          "title": "Introduction to Python Programming",
          "description": "A comprehensive guide...",
          "introduction": "Welcome to the world of Python...",
          "prerequisites": ["Basic computer skills"],
          "learningOutcomes": ["Understand Python syntax", "Write basic programs"]
        },
        "modules": [
          {
            "id": "module_1",
            "title": "Getting Started with Python",
            "introduction": "In this module...",
            "lessons": [
              {
                "id": "lesson_1",
                "title": "Installing Python",
                "content": "Let's begin by installing Python...",
                "keyPoints": ["Download from python.org", "Choose correct version"],
                "examples": [
                  {
                    "title": "Hello World Example",
                    "description": "Your first Python program",
                    "code": "print('Hello, World!')"
                  }
                ],
                "exercises": [
                  {
                    "title": "Practice Exercise 1",
                    "instructions": "Create a program that...",
                    "solution": "Here's one way to solve it..."
                  }
                ]
              }
            ],
            "summary": "In this module, we covered...",
            "assessment": {
              "instructions": "Complete the following questions",
              "questions": [
                {
                  "question": "What is Python?",
                  "type": "multiple_choice",
                  "options": ["A snake", "A programming language", "A framework", "A database"],
                  "answer": "A programming language",
                  "explanation": "Python is a high-level programming language..."
                }
              ]
            }
          }
        ],
        "conclusion": "Congratulations on completing..."
      },
      "metadata": {
        "totalWords": 15234,
        "readingTime": "76 minutes",
        "difficulty": "beginner",
        "keywords": ["Python", "programming", "basics"],
        "summary": "This course provides a comprehensive introduction..."
      }
    },
    "contentReference": {                         // If >= 25KB
      "type": "kv",
      "location": "content-job-456",
      "size": 125678
    },
    "summary": {
      "totalSections": 15,
      "sectionsGenerated": 15,
      "totalWords": 15234,
      "wordsBySection": {
        "overview": 523,
        "modules": 8456,
        "lessons": 5234,
        "conclusion": 421
      },
      "generationTime": 28543,
      "tokensUsed": {
        "input": 12000,
        "output": 38000,
        "total": 50000
      },
      "costUsd": 0.075
    },
    "qualityMetrics": {
      "overallScore": 92,
      "readability": 88,
      "coherence": 94,
      "completeness": 95,
      "topicRelevance": 91
    },
    "readyForPackaging": true,
    "packagingMetadata": {
      "availableFormats": ["html", "pdf", "docx", "markdown", "audio"],
      "recommendedFormat": "html",
      "estimatedPackagingTime": 15000
    }
  },
  "usage": {
    "tokens": {
      "input": 12000,
      "output": 38000
    }
  },
  "duration": 28543,
  "cost": 0.075,
  "metadata": {
    "aiProvider": "openai",
    "models": ["gpt-4o-mini"],
    "batchesProcessed": 8,
    "retries": 0,
    "workerChain": {
      "currentWorker": "bitware-content-generator",
      "previousWorker": "bitware-content-granulator",
      "nextWorkers": ["content-packager", "quality-validator"],
      "outputFormat": "structured_content_json",
      "version": "1.0.0"
    }
  }
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "metadata": {
    "timestamp": "2025-01-08T10:00:00Z",
    "details": {
      "code": "INVALID_STRUCTURE",
      "context": "Structure data is malformed or missing required fields"
    }
  }
}
```

---

### 2. List Prompt Templates
**Endpoint:** `GET /api/templates`

**Query Parameters:**
- `content_type` (optional): Filter by content type (overview, module, lesson, etc.)
- `structure_type` (optional): Filter by structure type (course, quiz, etc.)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": 1,
        "name": "course_overview",
        "contentType": "overview",
        "structureType": "course",
        "recommendedModel": "gpt-4o-mini",
        "temperature": 0.7,
        "maxTokens": 3000,
        "usageCount": 150,
        "avgQualityScore": 88.5,
        "avgGenerationTimeMs": 3500,
        "createdAt": "2025-01-01T00:00:00Z"
      },
      {
        "id": 2,
        "name": "lesson_content",
        "contentType": "lesson",
        "structureType": "course",
        "recommendedModel": "gpt-4o-mini",
        "temperature": 0.7,
        "maxTokens": 4000,
        "usageCount": 450,
        "avgQualityScore": 91.2,
        "avgGenerationTimeMs": 4200
      }
    ],
    "total": 10
  }
}
```

---

### 3. Get Template Details
**Endpoint:** `GET /api/templates/{name}`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "template": {
      "id": 1,
      "name": "course_overview",
      "contentType": "overview",
      "template": "Generate a comprehensive course overview for \"{topic}\"...",
      "variables": ["topic", "audience", "tone", "style"],
      "recommendedModel": "gpt-4o-mini",
      "temperature": 0.7,
      "maxTokens": 3000,
      "systemPrompt": "You are an expert educational content creator...",
      "usageCount": 150,
      "avgQualityScore": 88.5,
      "avgGenerationTimeMs": 3500,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-08T00:00:00Z"
    }
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Template not found"
}
```

---

## Job Management Endpoints

### 4. List Generation Jobs
**Endpoint:** `GET /api/jobs`

**Query Parameters:**
- `status` (optional): Filter by status (pending|processing|completed|failed|cancelled)
- `limit` (optional): Number of results (default: 20, max: 100)
- `offset` (optional): Pagination offset

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": 456,
        "granulatorJobId": 123,
        "topic": "Introduction to Python",
        "structureType": "course",
        "status": "completed",
        "progressPercentage": 100,
        "totalSections": 15,
        "sectionsCompleted": 15,
        "totalWords": 15234,
        "tokensUsed": 50000,
        "costUsd": 0.075,
        "qualityScore": 92,
        "startedAt": "2025-01-08T10:00:00Z",
        "completedAt": "2025-01-08T10:00:30Z",
        "processingTimeMs": 28543,
        "createdAt": "2025-01-08T09:59:45Z"
      }
    ],
    "total": 250,
    "page": 1,
    "pageSize": 20,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### 5. Get Job Details
**Endpoint:** `GET /api/jobs/{id}`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "job": {
      "id": 456,
      "granulatorJobId": 123,
      "topic": "Introduction to Python",
      "structureType": "course",
      "status": "completed",
      "totalSections": 15,
      "sectionsCompleted": 15,
      "currentSection": null,
      "progressPercentage": 100,
      "totalWords": 15234,
      "tokensUsed": 50000,
      "costUsd": 0.075,
      "startedAt": "2025-01-08T10:00:00Z",
      "completedAt": "2025-01-08T10:00:30Z",
      "estimatedCompletion": null,
      "processingTimeMs": 28543,
      "contentStorageType": "kv",
      "contentLocation": "content-job-456",
      "contentSize": 125678,
      "qualityScore": 92,
      "readabilityScore": 88,
      "coherenceScore": 94,
      "completenessScore": 95,
      "aiProvider": "openai",
      "modelsUsed": ["gpt-4o-mini"],
      "retryCount": 0,
      "errorMessage": null,
      "createdAt": "2025-01-08T09:59:45Z",
      "updatedAt": "2025-01-08T10:00:30Z"
    },
    "sections": {
      "total": 15,
      "completed": 15,
      "failed": 0,
      "pending": 0
    }
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Job not found"
}
```

---

### 6. Get Job Status
**Endpoint:** `GET /api/jobs/{id}/status`

**Description:** Get real-time status and progress of a generation job.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "jobId": 456,
    "status": "processing",
    "progress": {
      "percentage": 67,
      "sectionsCompleted": 10,
      "totalSections": 15,
      "currentSection": "module_3_lesson_2"
    },
    "metrics": {
      "wordsGenerated": 10234,
      "tokensUsed": 33456,
      "costUsd": 0.050
    },
    "timing": {
      "startedAt": "2025-01-08T10:00:00Z",
      "estimatedCompletion": "2025-01-08T10:00:45Z",
      "elapsedMs": 18234
    },
    "realtime": {
      "status": "processing",
      "progress": {
        "percentage": 67,
        "currentSection": "module_3_lesson_2",
        "sectionsCompleted": 10,
        "totalSections": 15
      },
      "message": "Generating lesson content for 'Advanced Topics'",
      "updatedAt": "2025-01-08T10:00:18Z"
    }
  }
}
```

---

### 7. Get Generated Content
**Endpoint:** `GET /api/jobs/{id}/content`

**Description:** Retrieve the complete generated content for a job.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "jobId": 456,
    "topic": "Introduction to Python",
    "structureType": "course",
    "content": {
      "courseContent": {
        "overview": { /* ... */ },
        "modules": [ /* ... */ ],
        "conclusion": "..."
      },
      "metadata": {
        "totalWords": 15234,
        "readingTime": "76 minutes",
        "difficulty": "beginner",
        "keywords": ["Python", "programming"],
        "summary": "..."
      }
    },
    "metadata": {
      "totalWords": 15234,
      "qualityScore": 92,
      "generatedAt": "2025-01-08T10:00:30Z",
      "storageType": "kv",
      "size": 125678
    }
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Content not available",
  "status": "processing",
  "message": "Job must be completed to retrieve content"
}
```

---

### 8. Retry Failed Job
**Endpoint:** `POST /api/jobs/{id}/retry`

**Request Body (optional):**
```json
{
  "config": {
    "aiProvider": "claude",
    "aiModel": "claude-3-haiku",
    "maxTokens": 5000
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "success": true,
    "jobId": 456,
    "message": "Job queued for retry",
    "retryCount": 1
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Job cannot be retried",
  "status": "completed",
  "message": "Only failed jobs can be retried"
}
```

---

### 9. Cancel Job
**Endpoint:** `POST /api/jobs/{id}/cancel`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "success": true,
    "jobId": 456,
    "message": "Job cancelled successfully"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Job cannot be cancelled",
  "status": "completed",
  "message": "Job is already completed or cancelled"
}
```

---

## Analytics Endpoints

### 10. Get Statistics
**Endpoint:** `GET /api/stats`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_jobs": 500,
      "completed_jobs": 450,
      "failed_jobs": 30,
      "active_jobs": 20,
      "total_words_generated": 7500000,
      "total_tokens_used": 25000000,
      "total_cost": 375.50,
      "avg_quality_score": 88.5,
      "avg_processing_time": 25000
    },
    "recentTrends": [
      {
        "date": "2025-01-08",
        "total_jobs": 75,
        "successful_jobs": 70,
        "failed_jobs": 5,
        "total_words_generated": 1125000,
        "total_tokens_used": 3750000,
        "total_cost_usd": 56.25,
        "avg_quality_score": 89.2
      }
    ],
    "topTemplates": [
      {
        "name": "lesson_content",
        "content_type": "lesson",
        "usage_count": 1250,
        "avg_quality_score": 91.5,
        "avg_generation_time_ms": 4200
      }
    ],
    "structureTypes": [
      {
        "structure_type": "course",
        "count": 300,
        "avg_words": 15000,
        "avg_quality": 90.5,
        "avg_cost": 0.075
      },
      {
        "structure_type": "quiz",
        "count": 150,
        "avg_words": 5000,
        "avg_quality": 88.0,
        "avg_cost": 0.025
      }
    ],
    "capabilities": {
      "maxConcurrentJobs": 5,
      "defaultModel": "gpt-4o-mini",
      "qualityThreshold": 75
    }
  }
}
```

---

### 11. Get Analytics
**Endpoint:** `GET /api/analytics`

**Query Parameters:**
- `days` (optional): Number of days to look back (default: 7)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "period": "7 days",
    "dailyMetrics": [
      {
        "date": "2025-01-08",
        "total_jobs": 75,
        "total_words_generated": 1125000,
        "total_cost_usd": 56.25,
        "avg_quality_score": 89.2,
        "avg_generation_time_ms": 24500
      }
    ],
    "trends": {
      "jobs": 15,
      "words": 22,
      "cost": 18,
      "quality": 2
    },
    "providerBreakdown": [
      {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "usage_count": 350,
        "total_tokens": 8750000,
        "total_cost": 131.25,
        "avg_latency": 3500,
        "success_rate": 95.0
      },
      {
        "provider": "claude",
        "model": "claude-3-haiku",
        "usage_count": 100,
        "total_tokens": 2000000,
        "total_cost": 25.00,
        "avg_latency": 2800,
        "success_rate": 97.0
      }
    ],
    "qualityDistribution": [
      {
        "quality_level": "excellent",
        "count": 280
      },
      {
        "quality_level": "good",
        "count": 150
      },
      {
        "quality_level": "acceptable",
        "count": 50
      },
      {
        "quality_level": "poor",
        "count": 20
      }
    ],
    "summary": {
      "totalJobs": 500,
      "totalWords": 7500000,
      "totalCost": 375.50,
      "avgQuality": 88.5
    }
  }
}
```

---

## Economy Endpoints

### 12. Get Pricing Information
**Endpoint:** `GET /api/economy/pricing`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "provider": "openai",
        "models": [
          {
            "model": "gpt-4o",
            "pricing": {
              "promptPer1k": "$0.0025",
              "completionPer1k": "$0.01",
              "promptRaw": 0.0025,
              "completionRaw": 0.01
            },
            "example1k": "$0.0125",
            "example10k": "$0.125"
          },
          {
            "model": "gpt-4o-mini",
            "pricing": {
              "promptPer1k": "$0.00015",
              "completionPer1k": "$0.0006",
              "promptRaw": 0.00015,
              "completionRaw": 0.0006
            },
            "example1k": "$0.00075",
            "example10k": "$0.0075"
          }
        ]
      },
      {
        "provider": "claude",
        "models": [
          {
            "model": "claude-3-5-sonnet",
            "pricing": {
              "promptPer1k": "$0.003",
              "completionPer1k": "$0.015",
              "promptRaw": 0.003,
              "completionRaw": 0.015
            },
            "example1k": "$0.018",
            "example10k": "$0.18"
          }
        ]
      },
      {
        "provider": "cloudflare",
        "models": [
          {
            "model": "@cf/meta/llama-3-8b-instruct",
            "pricing": {
              "promptPer1k": "Free",
              "completionPer1k": "Free",
              "promptRaw": 0,
              "completionRaw": 0
            },
            "example1k": "Free",
            "example10k": "Free"
          }
        ]
      }
    ],
    "recommendations": {
      "costEffective": {
        "provider": "cloudflare",
        "model": "@cf/meta/llama-3-8b-instruct",
        "reason": "Free with Workers subscription"
      },
      "balanced": {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "reason": "Best balance of cost, quality, and speed for content generation"
      },
      "highQuality": {
        "provider": "claude",
        "model": "claude-3-5-sonnet",
        "reason": "Excellent for creative and complex content"
      }
    },
    "notes": {
      "tokenEstimation": "Roughly 750 words per 1000 tokens",
      "typicalContent": {
        "lesson": "1500-2000 tokens",
        "module": "5000-8000 tokens",
        "course": "50000-100000 tokens"
      }
    },
    "lastUpdated": "2025-01-08"
  }
}
```

---

### 13. Estimate Cost
**Endpoint:** `POST /api/economy/estimate`

**Request Body:**
```json
{
  "provider": "openai",
  "model": "gpt-4o-mini",
  "structureType": "course",
  "estimatedTokens": 50000,
  "wordCount": 15000
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "estimate": {
      "provider": "openai",
      "model": "gpt-4o-mini",
      "structureType": "course",
      "tokens": {
        "prompt": 10000,
        "completion": 40000,
        "total": 50000
      },
      "cost": {
        "prompt": "$0.0015",
        "completion": "$0.024",
        "total": "$0.0255",
        "totalRaw": 0.0255
      },
      "pricing": {
        "promptPer1k": "$0.00015",
        "completionPer1k": "$0.0006"
      }
    },
    "alternatives": [
      {
        "provider": "cloudflare",
        "model": "@cf/meta/llama-3-8b-instruct",
        "cost": "Free",
        "savings": "$0.0255",
        "note": "Included with Workers subscription"
      },
      {
        "provider": "claude",
        "model": "claude-3-haiku",
        "cost": "$0.0525",
        "savings": "-$0.027",
        "note": "Higher quality but more expensive"
      }
    ],
    "assumptions": {
      "inputOutputRatio": "20/80",
      "wordsPerToken": 0.75,
      "estimatedTime": "100 seconds"
    }
  }
}
```

---

### 14. Get Resource Stats
**Endpoint:** `GET /api/economy/stats`

**Query Parameters:**
- `days` (optional): Number of days to look back (default: 7)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "period": "7 days",
    "summary": {
      "totalCost": "$375.50",
      "totalCostRaw": 375.50,
      "potentialSavings": "$187.75",
      "totalTokens": 25000000,
      "totalWords": 7500000,
      "totalJobs": 500,
      "avgCostPer1kWords": 0.05,
      "avgTokensPer1kWords": 3333
    },
    "dailyUsage": [
      {
        "date": "2025-01-08",
        "jobs": 75,
        "words": 1125000,
        "tokens": 3750000,
        "cost": "$56.25",
        "costRaw": 56.25,
        "avgCostPer1kWords": 0.05
      }
    ],
    "providerBreakdown": [
      {
        "provider": "openai",
        "requests": 350,
        "tokens": 20000000,
        "totalCost": "$300.00",
        "totalCostRaw": 300.00,
        "avgCostPer1k": "$0.015",
        "avgLatency": 3500,
        "successRate": "95%"
      },
      {
        "provider": "cloudflare",
        "requests": 50,
        "tokens": 1000000,
        "totalCost": "$0.00",
        "totalCostRaw": 0,
        "avgCostPer1k": "$0.00",
        "avgLatency": 2000,
        "successRate": "98%"
      }
    ],
    "recommendations": [
      "Increase usage of free Cloudflare AI models for suitable content",
      "Consider using GPT-4o-mini instead of GPT-4o for lower costs",
      "Batch similar content generation to improve efficiency"
    ]
  }
}
```

---

## Error Handling

### Error Response Format
All error responses follow this structure:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "metadata": {
    "timestamp": "2025-01-08T10:00:00Z",
    "details": {
      "code": "ERROR_CODE",
      "context": "Additional context about the error",
      "suggestion": "How to fix the error"
    }
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_AUTH` | 401 | Authentication failed |
| `INVALID_API_KEY` | 401 | API key is invalid or expired |
| `INVALID_SESSION` | 401 | Session token is invalid |
| `INVALID_WORKER_AUTH` | 401 | Worker authentication failed |
| `JOB_NOT_FOUND` | 404 | Job ID doesn't exist |
| `TEMPLATE_NOT_FOUND` | 404 | Template doesn't exist |
| `INVALID_STRUCTURE` | 400 | Input structure is malformed |
| `MISSING_GRANULATOR_DATA` | 400 | Required granulator output missing |
| `INVALID_STRUCTURE_TYPE` | 400 | Structure type not supported |
| `MISSING_REQUIRED_FIELD` | 400 | Required field is missing |
| `GENERATION_FAILED` | 500 | AI generation failed |
| `QUALITY_THRESHOLD_NOT_MET` | 422 | Generated content below quality threshold |
| `RESOURCE_LIMIT_EXCEEDED` | 429 | Token/cost limits exceeded |
| `SECTION_DEPENDENCY_ERROR` | 500 | Required section not generated |
| `AI_PROVIDER_ERROR` | 500 | AI provider request failed |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `STORAGE_ERROR` | 500 | Failed to store content |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `REQUEST_TIMEOUT` | 408 | Request took too long |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Error Examples

#### Authentication Error (401)
```json
{
  "success": false,
  "error": "Invalid API key",
  "metadata": {
    "timestamp": "2025-01-08T10:00:00Z",
    "details": {
      "code": "INVALID_API_KEY",
      "suggestion": "Check your API key is correct and not expired"
    }
  }
}
```

#### Validation Error (400)
```json
{
  "success": false,
  "error": "Missing required field",
  "metadata": {
    "timestamp": "2025-01-08T10:00:00Z",
    "details": {
      "code": "MISSING_REQUIRED_FIELD",
      "field": "wordCountEstimates",
      "suggestion": "Include wordCountEstimates in your request"
    }
  }
}
```

#### AI Provider Error (500)
```json
{
  "success": false,
  "error": "AI generation failed",
  "metadata": {
    "timestamp": "2025-01-08T10:00:00Z",
    "details": {
      "code": "AI_PROVIDER_ERROR",
      "provider": "openai",
      "originalError": "Rate limit exceeded",
      "suggestion": "Try again later or use a different AI provider"
    }
  }
}
```

---

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Default limits:**
  - 100 requests per minute per API key
  - 10 concurrent generation jobs per API key
  - 100MB maximum request size

- **Rate limit headers:**
  ```http
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 95
  X-RateLimit-Reset: 1704714000
  ```

- **Rate limit exceeded response (429):**
  ```json
  {
    "success": false,
    "error": "Rate limit exceeded",
    "metadata": {
      "timestamp": "2025-01-08T10:00:00Z",
      "details": {
        "code": "RATE_LIMIT_EXCEEDED",
        "limit": 100,
        "reset": "2025-01-08T10:01:00Z",
        "suggestion": "Please wait before making more requests"
      }
    }
  }
  ```

---

## Content Structure Types

### Course Content Structure
```json
{
  "courseContent": {
    "overview": {
      "title": "string",
      "description": "string (200-300 words)",
      "introduction": "string (500-800 words)",
      "prerequisites": ["string (50-100 words each)"],
      "learningOutcomes": ["string (50-100 words each)"]
    },
    "modules": [
      {
        "id": "string",
        "title": "string",
        "introduction": "string (300-500 words)",
        "lessons": [
          {
            "id": "string",
            "title": "string",
            "content": "string (800-1500 words)",
            "keyPoints": ["string (100-200 words each)"],
            "examples": [
              {
                "title": "string",
                "description": "string (200-400 words)",
                "code": "string (optional)"
              }
            ],
            "exercises": [
              {
                "title": "string",
                "instructions": "string (150-300 words)",
                "solution": "string (200-400 words)"
              }
            ]
          }
        ],
        "summary": "string (200-300 words)",
        "assessment": {
          "instructions": "string (100-200 words)",
          "questions": [
            {
              "question": "string",
              "type": "multiple_choice|true_false|short_answer",
              "options": ["string"],
              "answer": "string",
              "explanation": "string (100-200 words)"
            }
          ]
        }
      }
    ],
    "conclusion": "string (500-800 words)"
  }
}
```

### Quiz Content Structure
```json
{
  "quizContent": {
    "instructions": "string (200-300 words)",
    "categories": [
      {
        "name": "string",
        "description": "string (100-200 words)",
        "questions": [
          {
            "id": "string",
            "question": "string (50-150 words)",
            "context": "string (100-200 words, optional)",
            "options": ["string (20-50 words each)"],
            "correctAnswer": "string",
            "explanation": "string (100-200 words)",
            "hints": ["string (50-100 words each)"]
          }
        ]
      }
    ]
  }
}
```

### Workflow Content Structure
```json
{
  "workflowContent": {
    "overview": {
      "name": "string",
      "description": "string (300-500 words)",
      "purpose": "string (200-300 words)"
    },
    "steps": [
      {
        "id": "string",
        "name": "string",
        "description": "string (200-300 words)",
        "instructions": "string (400-600 words)",
        "inputs": ["string"],
        "outputs": ["string"]
      }
    ]
  }
}
```

---

## Webhooks & Callbacks

For long-running generation operations, you can provide a callback URL:

**Request with callback:**
```json
{
  "action": "generate",
  "input": { /* ... */ },
  "config": {
    "progressCallbackUrl": "https://your-server.com/webhook",
    "callbackHeaders": {
      "Authorization": "Bearer your-token"
    },
    "callbackRetries": 3
  }
}
```

**Progress callback payload:**
```json
{
  "event": "generation.progress",
  "jobId": 456,
  "status": "processing",
  "progress": {
    "percentage": 67,
    "sectionsCompleted": 10,
    "totalSections": 15,
    "currentSection": "module_3_lesson_2"
  },
  "timestamp": "2025-01-08T10:00:18Z"
}
```

**Completion callback payload:**
```json
{
  "event": "generation.completed",
  "jobId": 456,
  "status": "completed",
  "result": {
    "totalWords": 15234,
    "qualityScore": 92,
    "costUsd": 0.075
  },
  "timestamp": "2025-01-08T10:00:30Z"
}
```

---

## Best Practices

1. **Always specify word count estimates** for accurate content generation
2. **Use appropriate AI providers:**
   - OpenAI GPT-4o-mini: Best for general educational content
   - Claude 3.5 Sonnet: Excellent for creative and complex content
   - Cloudflare AI: Cost-effective for simple content
3. **Enable quality validation** for production content
4. **Implement progress monitoring** for long-running jobs
5. **Use caching** to avoid regenerating identical content
6. **Handle all error codes** appropriately in your application
7. **Monitor costs** using economy endpoints
8. **Batch similar content** for efficiency

---

## SDK Examples

### JavaScript/Node.js
```javascript
const response = await fetch('https://bitware-content-generator.jhaladik.workers.dev/api/execute', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer internal-worker-auth-token-2024',
    'X-Worker-ID': 'your-worker',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'generate',
    input: {
      granulatorJobId: 123,
      topic: 'Python Basics',
      structureType: 'course',
      structure: granulatorOutput.structure,
      wordCountEstimates: granulatorOutput.wordCountEstimates,
      contentMetadata: granulatorOutput.contentMetadata
    },
    config: {
      aiProvider: 'openai',
      aiModel: 'gpt-4o-mini',
      temperature: 0.7
    }
  })
});

const result = await response.json();
console.log('Generated content:', result);
```

### Python
```python
import requests

response = requests.post(
    'https://bitware-content-generator.jhaladik.workers.dev/api/execute',
    headers={
        'Authorization': 'Bearer internal-worker-auth-token-2024',
        'X-Worker-ID': 'your-worker',
        'Content-Type': 'application/json'
    },
    json={
        'action': 'generate',
        'input': {
            'granulatorJobId': 123,
            'topic': 'Python Basics',
            'structureType': 'course',
            'structure': granulator_output['structure'],
            'wordCountEstimates': granulator_output['wordCountEstimates'],
            'contentMetadata': granulator_output['contentMetadata']
        },
        'config': {
            'aiProvider': 'openai',
            'aiModel': 'gpt-4o-mini'
        }
    }
)

result = response.json()
print('Generated content:', result)
```

### cURL
```bash
curl -X POST https://bitware-content-generator.jhaladik.workers.dev/api/execute \
  -H "Authorization: Bearer internal-worker-auth-token-2024" \
  -H "X-Worker-ID: your-worker" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate",
    "input": {
      "granulatorJobId": 123,
      "topic": "Python Basics",
      "structureType": "course",
      "structure": { },
      "wordCountEstimates": {
        "total": 15000,
        "bySection": { },
        "byPriority": { }
      },
      "contentMetadata": { }
    }
  }'
```

---

## Support

For issues or questions:
- Check the `/help` endpoint for latest documentation
- Review error codes and suggestions in error responses
- Monitor the `/health` endpoint for service status
- Use `/api/ai-providers` to check provider availability