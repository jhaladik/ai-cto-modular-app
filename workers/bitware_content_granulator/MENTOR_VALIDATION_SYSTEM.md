# 🎓 Mentor Validation & Context-Aware Generation System

## Overview

The Content Granulator v4.0 now features an advanced **Mentor Validation System** with **Context-Aware Generation**. This system ensures high-quality content generation with expert-level validation, continuity checking, and automatic correction capabilities.

## Key Components

### 1. Mentor Validator (`src/services/mentor-validator.ts`)
An expert system that validates generated content with domain-specific expertise:
- **Novel Mentor**: Bestselling novelist with 20 years experience
- **Course Mentor**: Certified instructional designer
- **Documentary Mentor**: Award-winning documentary director
- **Podcast Mentor**: Successful podcast producer

### 2. Context Manager (`src/services/context-manager.ts`)
Manages project context across all stages to ensure continuity:
- Tracks characters, locations, timeline events, and plot threads
- Builds context-aware prompts for generation
- Maintains consistency across all stages
- Stores context in KV cache and D1 database

### 3. Database Schema
New tables for context and validation:
- `project_context`: Stores characters, locations, timeline, plot threads
- `mentor_reports`: Validation scores and insights
- `correction_history`: Tracks automated corrections
- `template_validation_rules`: Domain-specific validation rules
- `project_style_guides`: Writing style consistency

## How It Works

### Stage Execution Flow

1. **Context Loading**: For stages 2-4, loads full project context
2. **Prompt Enhancement**: Adds context to generation prompt
3. **Content Generation**: Uses OpenAI to generate content
4. **Mentor Validation**: Expert validates with Cloudflare AI
5. **Automatic Correction**: If score < 70, generates corrections
6. **Context Update**: Saves new context elements
7. **Report Storage**: Stores validation report

### Validation Process

```javascript
// The system performs these checks:
1. Content Quality (score 0-100)
2. Character Consistency 
3. Location Consistency
4. Timeline Logic
5. Plot Thread Continuity
6. Style Consistency
```

## API Endpoints

### Multi-Stage Content Generation

#### Create Project
```http
POST /api/projects/create
Authorization: Bearer internal-worker-auth-token-2024
X-Worker-ID: your-worker-id

{
  "project_name": "The Quantum Detective",
  "content_type": "novel",  // or "course", "documentary", "podcast"
  "topic": "A detective with ability to see 5 minutes into the future",
  "target_audience": "Adult mystery readers",
  "genre": "Mystery Thriller"
}
```

#### Execute Stage
```http
POST /api/stages/execute
Authorization: Bearer internal-worker-auth-token-2024
X-Worker-ID: your-worker-id

{
  "project_id": 1,
  "stage_number": 1,  // 1-4
  "ai_config": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "temperature": 0.8,
    "maxTokens": 8000
  }
}
```

#### Get Project Status
```http
GET /api/projects/{projectId}
Authorization: Bearer internal-worker-auth-token-2024
X-Worker-ID: your-worker-id
```

#### List Projects
```http
GET /api/projects?status=in_progress&content_type=novel
Authorization: Bearer internal-worker-auth-token-2024
X-Worker-ID: your-worker-id
```

## Authentication

All API calls require:
```javascript
headers: {
  'Authorization': 'Bearer internal-worker-auth-token-2024',
  'X-Worker-ID': 'your-worker-id'
}
```

## Testing the System

### Quick Test Script
```bash
# Test Stage 1 with mentor validation
node test-mentor-quick.js
```

### Full Test Script
```bash
# Test all 4 stages with context awareness
node test-mentor-validation.js
```

### Context-Aware Test
```bash
# Test if Stage 2 uses context from Stage 1
node test-context-aware.js
```

## Stage Descriptions

### Stage 1: Big Picture
- **Novel**: Core concept, themes, narrative arc
- **Course**: Learning objectives, prerequisites, pedagogical approach
- **Validation**: Premise originality, theme integration, structure

### Stage 2: Objects & Relations
- **Novel**: Characters, locations, timeline
- **Course**: Concepts, resources, tools
- **Validation**: Character depth, location detail, timeline logic
- **Context**: Uses Stage 1 themes and concepts

### Stage 3: Structure
- **Novel**: Acts, chapters, scenes outline
- **Course**: Modules, lessons, topics
- **Validation**: Pacing, chapter purpose, continuity
- **Context**: Uses characters/locations from Stage 2

### Stage 4: Granular Units
- **Novel**: Individual scenes with dialogue
- **Course**: Learning activities with exercises
- **Validation**: Scene conflict, character consistency
- **Context**: Uses all previous stages

## Validation Scoring

- **90-100**: Excellent quality, ready for use
- **70-89**: Good quality, minor improvements possible
- **50-69**: Needs improvement, will be auto-corrected
- **Below 50**: Major issues, requires regeneration

## Key Features

### 1. Expert Validation
- Domain-specific expertise for each content type
- Professional-level quality assessment
- Constructive feedback and suggestions

### 2. Continuity Checking
- Characters remain consistent
- Locations don't contradict
- Timeline stays logical
- Plot threads continue properly

### 3. Automatic Correction
- Fixes validation issues automatically
- Re-validates after correction
- Stores correction history

### 4. Context Awareness
- Each stage knows about previous stages
- References established elements
- Maintains consistency throughout

### 5. Style Consistency
- Tracks writing style examples
- Maintains tone, POV, tense
- Ensures vocabulary consistency

## Database Tables

### Content Generation Tables
- `content_generation_projects`: Main project records
- `content_generation_stages`: Stage outputs and metadata
- `content_objects`: Characters, locations, concepts
- `content_structural_units`: Acts, chapters, modules
- `content_granular_units`: Scenes, activities

### Context & Validation Tables
- `project_context`: Persistent context storage
- `mentor_reports`: Validation results
- `correction_history`: Fix tracking
- `template_validation_rules`: Validation rules
- `context_references`: Element relationships

## Environment Variables & Bindings

Required in `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "JOB_CACHE"
id = "your-kv-namespace-id"

[[d1_databases]]
binding = "DB"
database_name = "content-granulator-db"
database_id = "your-database-id"

[ai]
binding = "AI"
```

## Deployment

```bash
# Run migrations
cd workers/bitware_content_granulator
wrangler d1 execute content-granulator-db --file=migrations/005_add_context_tables.sql --remote
wrangler d1 execute content-granulator-db --file=migrations/006_add_validation_score.sql --remote

# Deploy worker
npm run deploy
```

## Production URLs

- **Worker**: https://bitware-content-granulator.jhaladik.workers.dev
- **Frontend**: https://ai-factory-frontend.pages.dev/admin.html#granulation

## Example Response

```json
{
  "success": true,
  "stage": {
    "id": 1,
    "stage_number": 1,
    "stage_name": "big_picture",
    "output": {
      "CORE_CONCEPT": {
        "central_premise": "A detective can see 5 minutes into the future...",
        "genre": "Mystery Thriller"
      },
      "THEMATIC_FRAMEWORK": {
        "primary_theme": "The burden of knowledge",
        "secondary_themes": ["Free will vs determinism"]
      }
    },
    "validation": {
      "score": 85,
      "issues_fixed": 2,
      "mentor_insight": "Strong premise with compelling conflict...",
      "continuity_check": {
        "charactersConsistent": true,
        "locationsConsistent": true,
        "timelineLogical": true,
        "plotThreadsContinuous": true
      }
    },
    "next_stage": 2
  }
}
```

## Benefits

1. **Higher Quality**: Expert validation ensures professional-grade content
2. **Consistency**: Context awareness maintains continuity
3. **Efficiency**: Automatic correction reduces manual work
4. **Scalability**: Works for any content type
5. **Traceability**: Full history of validations and corrections

## Future Enhancements

1. **Custom Validators**: Add your own validation rules
2. **Multi-Language**: Support for non-English content
3. **Collaborative Review**: Multiple mentors per stage
4. **Learning System**: Improve based on corrections
5. **Template Library**: Pre-validated templates

## Troubleshooting

### Common Issues

1. **"No such table" errors**: Run migrations on remote database
2. **"Cannot iterate" errors**: Update to latest deployed version
3. **Low validation scores**: Adjust temperature and prompts
4. **Timeout errors**: Reduce maxTokens for faster generation

### Debug Mode

Check worker logs:
```bash
wrangler tail --name bitware-content-granulator
```

### Support

For issues or questions:
- Check error details in response
- Review worker logs
- Verify database migrations
- Ensure proper authentication headers

## Architecture Summary

```
User Request
    ↓
Multi-Stage Handler
    ↓
Context Manager (loads previous stages)
    ↓
AI Generation (OpenAI with context)
    ↓
Mentor Validator (Cloudflare AI)
    ↓
Automatic Correction (if needed)
    ↓
Context Update (save for next stage)
    ↓
Response with Validation
```

This system represents a significant advancement in AI content generation, combining the creative power of large language models with the quality assurance of expert validation and the consistency of context-aware generation.