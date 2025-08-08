# Content Granulator Worker Usage Guide

## Overview
The Content Granulator is an AI-powered worker that creates structured content outlines from topics. It supports multiple AI providers (OpenAI, Claude, Cloudflare AI) and can be configured per template or per request.

## Primary Endpoint: `/api/execute`

This is the **recommended endpoint** for all integrations, especially when called from KAM or Resource Manager.

### Request Format
```json
{
  "action": "granulate",
  "input": {
    "topic": "Your topic here",
    "structureType": "course",
    "templateName": "educational_course_basic",
    "granularityLevel": 3,
    "targetAudience": "beginners"
  },
  "config": {
    "aiProvider": "claude",
    "aiModel": "claude-3-haiku-20240307",
    "temperature": 0.7,
    "maxTokens": 4000,
    "validation": true,
    "validationLevel": 2
  }
}
```

## AI Provider Configuration

### Available Providers
1. **OpenAI** (default)
   - Models: `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`
   - Best for: General purpose, high quality
   - Cost: Medium

2. **Claude** (Anthropic)
   - Models: `claude-3-haiku-20240307`, `claude-3-sonnet-20240229`, `claude-3-opus-20240229`, `claude-3-5-sonnet-20241022`
   - Best for: Creative content, complex reasoning
   - Cost: Low (Haiku) to High (Opus)

3. **Cloudflare AI**
   - Models: `@cf/meta/llama-3-8b-instruct`, `@cf/meta/llama-2-7b-chat-int8`, `@cf/mistral/mistral-7b-instruct-v0.1`
   - Best for: Cost-effective, fast processing
   - Cost: Free (included with Workers)

### Configuration Hierarchy
1. **Request-level config** (highest priority)
2. **Template-level config** (from database)
3. **Default config** (fallback)

## Template Configuration

Templates can have default AI provider settings:

```sql
-- Example template with AI configuration
UPDATE granulation_templates 
SET ai_provider_config = json_object(
    'preferredProvider', 'claude',
    'fallbackProviders', json_array('openai', 'cloudflare'),
    'modelPreferences', json_object(
        'openai', 'gpt-4o-mini',
        'claude', 'claude-3-haiku-20240307',
        'cloudflare', '@cf/meta/llama-3-8b-instruct'
    ),
    'temperature', 0.7,
    'maxTokens', 4000,
    'systemPrompt', 'You are an expert course designer...'
)
WHERE template_name = 'educational_course_basic';
```

## Structure Types

- **course**: Educational courses with modules and lessons
- **quiz**: Assessment quizzes with questions and categories
- **novel**: Creative writing with chapters and scenes
- **workflow**: Business processes with steps and decisions
- **knowledge_map**: Concept maps with relationships
- **learning_path**: Progressive skill development paths

## Authentication

### Worker-to-Worker
```bash
curl -X POST https://bitware-content-granulator.jhaladik.workers.dev/api/execute \
  -H "Authorization: Bearer internal-worker-auth-token-2024" \
  -H "X-Worker-ID: your-worker-id" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

### Client API
```bash
curl -X POST https://bitware-content-granulator.jhaladik.workers.dev/api/execute \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

## Example: Using Claude for Creative Content

```json
{
  "action": "granulate",
  "input": {
    "topic": "A mystery novel set in Victorian London",
    "structureType": "novel",
    "templateName": "creative_novel_standard",
    "granularityLevel": 4,
    "targetAudience": "adult readers"
  },
  "config": {
    "aiProvider": "claude",
    "aiModel": "claude-3-5-sonnet-20241022",
    "temperature": 0.8,
    "maxTokens": 6000,
    "systemPrompt": "You are a creative writing expert specializing in mystery novels."
  }
}
```

## Example: Cost-Effective with Cloudflare AI

```json
{
  "action": "granulate",
  "input": {
    "topic": "Customer onboarding process",
    "structureType": "workflow",
    "templateName": "business_workflow_standard"
  },
  "config": {
    "aiProvider": "cloudflare",
    "aiModel": "@cf/meta/llama-3-8b-instruct",
    "temperature": 0.5,
    "maxTokens": 2500
  }
}
```

## Monitoring AI Provider Usage

### Check Available Providers
```bash
GET /api/ai-providers
```

Returns:
```json
{
  "providers": [
    {
      "name": "openai",
      "available": true,
      "defaultModel": "gpt-4o-mini",
      "supportedModels": [...]
    },
    ...
  ],
  "defaultProvider": "openai",
  "totalAvailable": 3
}
```

## Fallback Behavior

If the preferred AI provider is unavailable:
1. System tries fallback providers in order
2. If all fallbacks fail, uses any available provider
3. Returns error only if NO providers are available

## Best Practices

1. **Choose provider based on content type**:
   - Educational content → OpenAI (balanced quality/cost)
   - Creative content → Claude (better creativity)
   - High-volume/simple → Cloudflare AI (free)

2. **Set appropriate temperature**:
   - 0.3-0.5 for factual/technical content
   - 0.7-0.8 for creative content
   - 0.5-0.7 for general use

3. **Configure fallbacks** for production:
   - Always set 2-3 fallback providers
   - Order by preference and cost

4. **Use templates** for consistency:
   - Configure AI settings at template level
   - Override only when needed

## Response Format

```json
{
  "success": true,
  "output": {
    "jobId": 123,
    "topic": "Your topic",
    "structureType": "course",
    "summary": {...},
    "qualityScore": 0.85,
    "structure": {...} // or structureReference for large structures
  },
  "usage": {
    "tokens": {
      "input": 500,
      "output": 2000
    }
  },
  "duration": 3500,
  "cost": 0.003,
  "metadata": {
    "aiProvider": "claude",
    "model": "claude-3-haiku-20240307"
  }
}
```