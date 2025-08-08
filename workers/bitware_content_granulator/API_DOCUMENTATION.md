# Content Granulator API Documentation

## Base URL
```
https://bitware-content-granulator.jhaladik.workers.dev
```

## Authentication

The Content Granulator supports three authentication methods:

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
| `/api/execute` | POST | Yes | Main execution endpoint |
| `/api/templates` | GET | Yes | List available templates |
| `/api/templates/{name}` | GET | Yes | Get template details |
| `/api/jobs` | GET | Yes | List granulation jobs |
| `/api/jobs/{id}` | GET | Yes | Get job details |
| `/api/jobs/{id}/status` | GET | Yes | Get job status |
| `/api/jobs/{id}/structure` | GET | Yes | Get generated structure |
| `/api/jobs/{id}/retry` | POST | Yes | Retry failed job |
| `/api/validate` | POST | Yes | Validate structure |
| `/api/validation/history` | GET | Yes | Get validation history |
| `/api/stats` | GET | Yes | Get granulation statistics |
| `/api/ai-providers` | GET | Yes | List available AI providers |
| `/api/economy/pricing` | GET | Yes | Get pricing information |
| `/api/economy/estimate` | POST | Yes | Estimate cost |
| `/api/economy/stats` | GET | Yes | Get resource consumption stats |

---

## Core Endpoints

### 1. Execute Granulation
**Endpoint:** `POST /api/execute`

**Description:** Main endpoint for content granulation. Creates structured content from a topic.

**Request Body:**
```json
{
  "action": "granulate",
  "input": {
    "topic": "string",                    // Required: Topic to granulate
    "structureType": "string",            // Required: course|quiz|novel|workflow|knowledge_map|learning_path
    "templateName": "string",              // Optional: Specific template to use
    "granularityLevel": 1-5,              // Optional: Detail level (default: 3)
    "targetAudience": "string",            // Optional: Target audience description
    "maxElements": number                 // Optional: Maximum elements to generate
  },
  "config": {
    "aiProvider": "string",               // Optional: openai|claude|cloudflare
    "aiModel": "string",                   // Optional: Specific model to use
    "temperature": 0.0-1.0,                // Optional: AI temperature (default: 0.7)
    "maxTokens": number,                   // Optional: Max tokens (default: 4000)
    "systemPrompt": "string",              // Optional: Custom system prompt
    "validation": boolean,                 // Optional: Enable validation (default: true)
    "validationLevel": 1-3,                // Optional: Validation strictness
    "validationThreshold": number          // Optional: Pass threshold (default: 85)
  },
  "timeout": number                        // Optional: Request timeout in ms
}
```

**Success Response (200):**
```json
{
  "success": true,
  "output": {
    "jobId": 123,
    "topic": "Topic Name",
    "structureType": "course",
    "summary": {
      "totalElements": 20,
      "modules": 3,
      "lessons": 9,
      "assessments": 3,
      "exercises": 9,
      "wordCountEstimates": {
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
      "contentMetadata": {
        "workerChain": {
          "currentWorker": "bitware-content-granulator",
          "nextWorkers": ["content-generator", "quality-validator"],
          "outputFormat": "structured_json",
          "version": "2.0"
        },
        "standardParameters": {
          "topic": "string",
          "structureType": "course",
          "granularityLevel": 3,
          "targetAudience": "string",
          "language": "en",
          "tone": "educational_engaging",
          "style": "educational"
        }
      }
    },
    "qualityScore": 0.92,
    "structure": { /* Full structure object */ },
    "readyForContentGeneration": true
  },
  "usage": {
    "tokens": {
      "input": 500,
      "output": 2000
    }
  },
  "duration": 5432,
  "cost": 0.0025,
  "metadata": {
    "aiProvider": "openai",
    "model": "gpt-4o-mini",
    "validationEnabled": true,
    "storageType": "inline"
  }
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "status": "failed",
  "details": {
    "code": "INVALID_TEMPLATE",
    "context": "Template 'xyz' not found"
  }
}
```

---

### 2. List Templates
**Endpoint:** `GET /api/templates`

**Query Parameters:**
- `structure_type` (optional): Filter by structure type

**Success Response (200):**
```json
{
  "templates": [
    {
      "name": "educational_course_basic",
      "structureType": "course",
      "complexityLevel": 3,
      "targetAudience": "general",
      "usageCount": 150,
      "description": "Basic educational course template"
    }
  ],
  "total": 6
}
```

---

### 3. Get Template Details
**Endpoint:** `GET /api/templates/{name}`

**Success Response (200):**
```json
{
  "template": {
    "name": "educational_course_basic",
    "structureType": "course",
    "complexityLevel": 3,
    "targetAudience": "general",
    "schema": {
      "courseOverview": {
        "title": "string",
        "description": "string",
        "duration": "string",
        "prerequisites": ["string"],
        "learningOutcomes": ["string"]
      },
      "modules": []
    },
    "validationRules": {
      "minModules": 2,
      "maxModules": 10,
      "minLessonsPerModule": 2
    },
    "usageCount": 150,
    "createdAt": "2025-01-01T00:00:00Z",
    "aiPromptTemplate": "Template prompt..."
  }
}
```

**Error Response (404):**
```json
{
  "error": "Template not found"
}
```

---

## Job Management Endpoints

### 4. List Jobs
**Endpoint:** `GET /api/jobs`

**Query Parameters:**
- `status` (optional): Filter by status (processing|completed|failed|validating|retry)
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset

**Success Response (200):**
```json
{
  "jobs": [
    {
      "id": 123,
      "topic": "Python Basics",
      "structureType": "course",
      "status": "completed",
      "qualityScore": 0.92,
      "processingTimeMs": 5432,
      "costUsd": 0.0025,
      "createdAt": "2025-01-08T10:00:00Z",
      "completedAt": "2025-01-08T10:00:05Z"
    }
  ],
  "total": 50,
  "page": 1,
  "pageSize": 20
}
```

---

### 5. Get Job Details
**Endpoint:** `GET /api/jobs/{id}`

**Success Response (200):**
```json
{
  "job": {
    "id": 123,
    "topic": "Python Basics",
    "structureType": "course",
    "templateName": "educational_course_basic",
    "granularityLevel": 3,
    "targetAudience": "beginners",
    "status": "completed",
    "actualElements": 20,
    "qualityScore": 0.92,
    "processingTimeMs": 5432,
    "costUsd": 0.0025,
    "validationEnabled": true,
    "validationLevel": 2,
    "validationThreshold": 85,
    "startedAt": "2025-01-08T10:00:00Z",
    "completedAt": "2025-01-08T10:00:05Z",
    "clientId": "client_123",
    "executionId": "exec_456"
  }
}
```

**Error Response (404):**
```json
{
  "error": "Job not found"
}
```

---

### 6. Get Job Structure
**Endpoint:** `GET /api/jobs/{id}/structure`

**Success Response (200):**
```json
{
  "structure": {
    "courseOverview": {
      "title": "Introduction to Python Programming",
      "description": "...",
      "duration": "8 weeks",
      "prerequisites": [],
      "learningOutcomes": []
    },
    "modules": [
      {
        "id": "module_1",
        "title": "Getting Started",
        "lessons": []
      }
    ]
  },
  "storageInfo": {
    "type": "inline",
    "size": 45678
  }
}
```

---

### 7. Retry Failed Job
**Endpoint:** `POST /api/jobs/{id}/retry`

**Request Body (optional):**
```json
{
  "config": {
    "aiProvider": "claude",
    "maxTokens": 5000
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "newJobId": 124,
  "message": "Job retry initiated"
}
```

---

## Validation Endpoints

### 8. Validate Structure
**Endpoint:** `POST /api/validate`

**Request Body:**
```json
{
  "jobId": 123,
  "structure": { /* Optional: Structure to validate */ },
  "validationLevel": 1-3,
  "threshold": 85
}
```

**Success Response (200):**
```json
{
  "valid": true,
  "score": 92,
  "details": {
    "structureCompleteness": 95,
    "contentCoherence": 90,
    "qualityMetrics": 91
  },
  "issues": [],
  "recommendations": []
}
```

---

## Economy Endpoints

### 9. Get Pricing Information
**Endpoint:** `GET /api/economy/pricing`

**Success Response (200):**
```json
{
  "providers": [
    {
      "provider": "openai",
      "models": [
        {
          "model": "gpt-4o-mini",
          "pricing": {
            "promptPer1k": "$0.00015",
            "completionPer1k": "$0.0006",
            "promptRaw": 0.00015,
            "completionRaw": 0.0006
          },
          "example1k": "$0.0005",
          "example10k": "$0.0046"
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
      "reason": "Best balance of cost, quality, and speed"
    },
    "highQuality": {
      "provider": "claude",
      "model": "claude-3-5-sonnet-20241022",
      "reason": "Excellent for creative and complex content"
    }
  },
  "lastUpdated": "2025-01-08"
}
```

---

### 10. Estimate Cost
**Endpoint:** `POST /api/economy/estimate`

**Request Body:**
```json
{
  "provider": "openai",
  "model": "gpt-4o-mini",
  "structureType": "course",
  "granularityLevel": 3,
  "tokens": 5000
}
```

**Success Response (200):**
```json
{
  "estimate": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "structureType": "course",
    "granularityLevel": 3,
    "tokens": {
      "prompt": 1500,
      "completion": 3500,
      "total": 5000
    },
    "cost": {
      "prompt": "$0.0002",
      "completion": "$0.0021",
      "total": "$0.0023",
      "totalRaw": 0.00225
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
      "savings": "$0.0023",
      "note": "Included with Workers subscription"
    }
  ]
}
```

---

### 11. Get Resource Consumption Stats
**Endpoint:** `GET /api/economy/stats`

**Query Parameters:**
- `days` (optional): Number of days to look back (default: 7)

**Success Response (200):**
```json
{
  "period": "7 days",
  "summary": {
    "totalCost": "$15.42",
    "totalCostRaw": 15.42,
    "potentialSavings": "$8.50",
    "totalRequests": 523,
    "totalTokens": 1250000
  },
  "dailyUsage": [
    {
      "date": "2025-01-08",
      "provider": "openai",
      "model": "gpt-4o-mini",
      "requests": 75,
      "tokens": 178500,
      "cost": "$2.20",
      "costRaw": 2.20,
      "avgProcessingTime": 4500,
      "throughput": 150
    }
  ],
  "providerBreakdown": [
    {
      "provider": "openai",
      "requests": 350,
      "tokens": 875000,
      "totalCost": "$10.50",
      "totalCostRaw": 10.50,
      "avgCostPer1k": "$0.012",
      "avgProcessingTime": 4200,
      "efficiency": {
        "high": 280,
        "medium": 60,
        "low": 10
      }
    }
  ],
  "topModels": [
    {
      "model": "gpt-4o-mini",
      "provider": "openai",
      "usageCount": 300,
      "avgCost": "$0.025",
      "avgCostRaw": 0.025,
      "avgTokens": 2500,
      "avgTime": 4000,
      "throughput": 625
    }
  ]
}
```

---

## Error Handling

### Error Response Format
All error responses follow this structure:

```json
{
  "error": "Human-readable error message",
  "status": 400-500,
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context",
    "suggestion": "How to fix the error"
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
| `TEMPLATE_NOT_FOUND` | 404 | Specified template doesn't exist |
| `JOB_NOT_FOUND` | 404 | Job ID doesn't exist |
| `INVALID_STRUCTURE_TYPE` | 400 | Structure type not supported |
| `INVALID_GRANULARITY` | 400 | Granularity level must be 1-5 |
| `INVALID_JSON` | 400 | Request body is not valid JSON |
| `MISSING_REQUIRED_FIELD` | 400 | Required field is missing |
| `AI_PROVIDER_ERROR` | 500 | AI provider request failed |
| `AI_RESPONSE_INVALID` | 500 | AI returned invalid/unparseable response |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `STORAGE_ERROR` | 500 | Failed to store structure |
| `VALIDATION_FAILED` | 422 | Structure validation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `REQUEST_TIMEOUT` | 408 | Request took too long |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Error Examples

#### Authentication Error (401)
```json
{
  "error": "Invalid API key",
  "status": 401,
  "code": "INVALID_API_KEY",
  "details": {
    "suggestion": "Check your API key is correct and not expired"
  }
}
```

#### Validation Error (400)
```json
{
  "error": "Invalid granularity level",
  "status": 400,
  "code": "INVALID_GRANULARITY",
  "details": {
    "field": "granularityLevel",
    "value": 10,
    "suggestion": "Granularity level must be between 1 and 5"
  }
}
```

#### AI Provider Error (500)
```json
{
  "error": "AI provider request failed",
  "status": 500,
  "code": "AI_PROVIDER_ERROR",
  "details": {
    "provider": "openai",
    "originalError": "Rate limit exceeded",
    "suggestion": "Try again later or use a different AI provider"
  }
}
```

#### Template Not Found (404)
```json
{
  "error": "Template not found",
  "status": 404,
  "code": "TEMPLATE_NOT_FOUND",
  "details": {
    "templateName": "non_existent_template",
    "suggestion": "Use GET /api/templates to list available templates"
  }
}
```

---

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Default limits:**
  - 100 requests per minute per API key
  - 10 concurrent requests per API key
  - 50MB maximum request size

- **Rate limit headers:**
  ```http
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 95
  X-RateLimit-Reset: 1704714000
  ```

- **Rate limit exceeded response (429):**
  ```json
  {
    "error": "Rate limit exceeded",
    "status": 429,
    "code": "RATE_LIMIT_EXCEEDED",
    "details": {
      "limit": 100,
      "reset": "2025-01-08T10:00:00Z",
      "suggestion": "Please wait before making more requests"
    }
  }
  ```

---

## Pagination

Endpoints that return lists support pagination:

**Query Parameters:**
- `limit`: Number of items per page (default: 20, max: 100)
- `offset`: Number of items to skip
- `page`: Page number (alternative to offset)

**Response includes:**
```json
{
  "data": [],
  "pagination": {
    "total": 500,
    "page": 1,
    "pageSize": 20,
    "totalPages": 25,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Content Structure Types

### Course Structure
```json
{
  "courseOverview": {
    "title": "string",
    "description": "string",
    "duration": "string",
    "prerequisites": ["string"],
    "learningOutcomes": ["string"]
  },
  "modules": [
    {
      "id": "module_1",
      "title": "string",
      "description": "string",
      "estimatedDuration": "string",
      "learningObjectives": ["string"],
      "lessons": [
        {
          "id": "lesson_1_1",
          "title": "string",
          "content": "string",
          "keyPoints": ["string"],
          "examples": ["string"],
          "practicalExercises": ["string"]
        }
      ],
      "assessment": {
        "questions": [],
        "passingScore": 70
      }
    }
  ]
}
```

### Quiz Structure
```json
{
  "quizOverview": {
    "title": "string",
    "description": "string",
    "totalQuestions": 20,
    "timeLimit": "30 minutes",
    "passingScore": 70
  },
  "categories": [
    {
      "name": "string",
      "questions": [
        {
          "id": "q_1",
          "type": "multiple_choice",
          "question": "string",
          "options": ["string"],
          "correctAnswer": 0,
          "explanation": "string",
          "difficulty": "easy|medium|hard"
        }
      ]
    }
  ]
}
```

### Workflow Structure
```json
{
  "workflowOverview": {
    "name": "string",
    "description": "string",
    "purpose": "string",
    "stakeholders": ["string"]
  },
  "steps": [
    {
      "id": "step_1",
      "name": "string",
      "description": "string",
      "responsible": "string",
      "inputs": ["string"],
      "outputs": ["string"],
      "tools": ["string"],
      "nextSteps": ["step_2"],
      "conditions": []
    }
  ]
}
```

---

## Webhooks & Callbacks

For long-running operations, you can provide a callback URL:

**Request with callback:**
```json
{
  "action": "granulate",
  "input": { /* ... */ },
  "callback": {
    "url": "https://your-server.com/webhook",
    "headers": {
      "Authorization": "Bearer your-token"
    },
    "retries": 3
  }
}
```

**Callback payload:**
```json
{
  "event": "granulation.completed",
  "jobId": 123,
  "status": "completed",
  "result": { /* Full result */ },
  "timestamp": "2025-01-08T10:00:00Z"
}
```

---

## Best Practices

1. **Always specify AI provider** for consistent results
2. **Use appropriate granularity levels:**
   - 1-2: Basic outline
   - 3: Standard detail (recommended)
   - 4-5: Comprehensive detail
3. **Enable validation** for production use
4. **Cache template information** to reduce API calls
5. **Implement exponential backoff** for retries
6. **Monitor your usage** via economy endpoints
7. **Use callbacks** for long-running operations
8. **Handle all error codes** appropriately

---

## SDK Examples

### JavaScript/Node.js
```javascript
const response = await fetch('https://bitware-content-granulator.jhaladik.workers.dev/api/execute', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer internal-worker-auth-token-2024',
    'X-Worker-ID': 'your-worker',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'granulate',
    input: {
      topic: 'Python Basics',
      structureType: 'course',
      granularityLevel: 3
    },
    config: {
      aiProvider: 'openai',
      aiModel: 'gpt-4o-mini'
    }
  })
});

const result = await response.json();
```

### Python
```python
import requests

response = requests.post(
    'https://bitware-content-granulator.jhaladik.workers.dev/api/execute',
    headers={
        'Authorization': 'Bearer internal-worker-auth-token-2024',
        'X-Worker-ID': 'your-worker',
        'Content-Type': 'application/json'
    },
    json={
        'action': 'granulate',
        'input': {
            'topic': 'Python Basics',
            'structureType': 'course',
            'granularityLevel': 3
        },
        'config': {
            'aiProvider': 'openai',
            'aiModel': 'gpt-4o-mini'
        }
    }
)

result = response.json()
```

### cURL
```bash
curl -X POST https://bitware-content-granulator.jhaladik.workers.dev/api/execute \
  -H "Authorization: Bearer internal-worker-auth-token-2024" \
  -H "X-Worker-ID: your-worker" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "granulate",
    "input": {
      "topic": "Python Basics",
      "structureType": "course",
      "granularityLevel": 3
    },
    "config": {
      "aiProvider": "openai",
      "aiModel": "gpt-4o-mini"
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