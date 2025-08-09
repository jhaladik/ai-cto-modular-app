# Content Granulator API Documentation v4.0

## Overview

The Content Granulator is a professional content development platform that uses a **4-stage progressive refinement system** to generate ANY type of content - novels, courses, documentaries, games, podcasts, research papers, and more. Based on proven creative methodologies, it transforms ideas into production-ready content structures.

### Key Features
- **Universal Multi-Stage System**: 4-stage progressive refinement for any content type
- **Professional Methodology**: Based on real-world creative processes
- **Object-Centric Design**: Define once, reference throughout
- **200-Word Descriptions**: Rich, detailed descriptions at every level
- **Universal Content Support**: Works with novels, courses, documentaries, podcasts, papers, games, etc.
- **Progressive Refinement**: Each stage builds on the previous
- **Research Identification**: Know what needs research before writing
- **Template-Driven**: Pre-configured templates for different content types
- **Multiple AI Providers**: OpenAI, Claude, Cloudflare AI
- **Smart Storage**: Automatic KV/R2 tiering for large structures
- **Cost Tracking**: Monitor token usage and costs per stage

## Base URL
```
https://bitware-content-granulator.jhaladik.workers.dev
```

## Authentication

All API endpoints (except health checks) require authentication using bearer token and worker ID:

```http
Authorization: Bearer {WORKER_SECRET}
X-Worker-ID: {WORKER_ID}
```

## Universal Content Structure Format

All content structures follow this universal, object-centric format:

```typescript
{
  "type": "novel|course|podcast|paper|documentary|game|etc",
  "version": "2.0",
  "metadata": {
    "title": "Content title",
    "description": "Comprehensive description",
    "targetAudience": "Target audience description",
    "purpose": "entertain|educate|inform|persuade",
    "estimatedDuration": "Time/length estimate",
    "tags": ["tag1", "tag2"],
    "typeSpecific": {
      // Properties specific to content type
      // For novel: genre, setting, themes
      // For podcast: format, frequency, hosts
      // For course: level, prerequisites, outcomes
    }
  },
  
  "objects": {
    "provided": {
      // User-supplied objects that MUST be included
      "mandatory": [
        {
          "id": "user_obj_1",
          "type": "character|location|concept|resource",
          "name": "Object name",
          "properties": { /* Custom properties */ },
          "usage_requirements": {
            "min_appearances": 5,
            "placement": ["1.1", "2.3"]
          }
        }
      ],
      "optional": [ /* Optional user objects */ ]
    },
    
    "generated": {
      // AI-generated objects
      "actors": [
        {
          "id": "actor_1",
          "type": "character|host|author|instructor",
          "name": "Full name",
          "role": "Role in content",
          "description": "Detailed description",
          "attributes": { /* Type-specific attributes */ },
          "appearances": ["1.1", "1.2", "2.1"]
        }
      ],
      "locations": [
        {
          "id": "loc_1",
          "type": "physical|virtual|conceptual",
          "name": "Location name",
          "description": "Detailed description",
          "atmosphere": "Mood/feeling",
          "usage": ["1.1", "2.3"]
        }
      ],
      "concepts": [
        {
          "id": "concept_1",
          "type": "theme|topic|skill|theory",
          "name": "Concept name",
          "description": "What it represents",
          "importance": "core|supporting|background"
        }
      ],
      "resources": [
        {
          "id": "resource_1",
          "type": "document|tool|reference|media",
          "name": "Resource name",
          "description": "What it is",
          "format": "Type of resource"
        }
      ]
    }
  },
  
  "elements": [
    {
      "id": "1",
      "type": "act|module|season|section",
      "name": "Descriptive name",
      "level": 1,  // ALWAYS 3 levels: 1, 2, 3
      "sequenceOrder": 0,
      "metadata": {
        "summary": "Detailed summary",
        "duration": "Estimated time/length",
        "objects": {
          "featured": ["actor_1", "loc_1"],
          "introduced": ["concept_1"],
          "referenced": ["resource_1"]
        },
        "contentGuidance": {
          "tone": "serious|casual|academic",
          "style": "narrative|expository|instructional",
          "techniques": ["technique1", "technique2"]
        }
      },
      "elements": [
        {
          "id": "1.1",
          "type": "chapter|episode|lesson",
          "name": "Level 2 name",
          "level": 2,
          "sequenceOrder": 0,
          "metadata": { /* ... */ },
          "elements": [
            {
              "id": "1.1.1",
              "type": "scene|segment|activity",
              "name": "Level 3 name",
              "level": 3,
              "sequenceOrder": 0,
              "metadata": {
                "description": "Detailed description",
                "objects": {
                  "actors": ["actor_1"],
                  "location": "loc_1",
                  "concepts": ["concept_1"]
                }
              }
            }
          ]
        }
      ]
    }
  ]
}
```

## Multi-Stage Generation System (NEW! v4.0)

The 4-stage progressive refinement system for professional content generation.

### The 4 Stages

1. **Stage 1: Big Picture** - Vision, framework, and overall concept
2. **Stage 2: Objects & Relations** - Characters, locations, concepts, timeline
3. **Stage 3: Structure** - Hierarchical units with 200-word descriptions
4. **Stage 4: Granular Units** - Atomic units ready for content generation

### Multi-Stage Endpoints

#### 1. Create Project
**POST** `/api/projects/create`

Creates a new multi-stage content project.

##### Request Body
```json
{
  "project_name": "The Quantum Detective",
  "content_type": "novel",  // novel, course, documentary, podcast, research_paper, game
  "topic": "A detective story in cyberpunk Tokyo",
  "target_audience": "Adult sci-fi readers",
  "genre": "Cyberpunk Mystery",  // optional
  "metadata": {  // optional, content-type specific
    "setting": "Tokyo 2087",
    "tone": "Dark and philosophical"
  }
}
```

##### Response
```json
{
  "success": true,
  "project": {
    "id": 1,
    "project_name": "The Quantum Detective",
    "content_type": "novel",
    "topic": "A detective story in cyberpunk Tokyo",
    "current_stage": 1,
    "total_stages": 4,
    "status": "in_progress",
    "created_at": "2025-08-08T15:31:39Z"
  }
}
```

#### 2. Execute Stage
**POST** `/api/stages/execute`

Executes a specific stage of the content generation process.

##### Request Body
```json
{
  "project_id": 1,
  "stage_number": 1,  // 1-4
  "ai_config": {  // optional
    "provider": "openai",
    "model": "gpt-4o-mini",
    "temperature": 0.8,
    "maxTokens": 16000
  }
}
```

##### Response
```json
{
  "success": true,
  "stage": {
    "id": 1,
    "stage_number": 1,
    "stage_name": "big_picture",
    "output": {
      // Stage-specific output structure
    },
    "tokens_used": {
      "input": 500,
      "output": 2000
    },
    "next_stage": 2
  }
}
```

#### 3. Get Project Status
**GET** `/api/projects/{projectId}`

Retrieves complete project status and progress.

##### Response
```json
{
  "success": true,
  "project": {
    "id": 1,
    "project_name": "The Quantum Detective",
    "content_type": "novel",
    "current_stage": 3,
    "status": "in_progress",
    "stages": [
      {
        "stage_number": 1,
        "stage_name": "big_picture",
        "status": "completed",
        "completed_at": "2025-08-08T15:32:00Z"
      },
      {
        "stage_number": 2,
        "stage_name": "objects_relations",
        "status": "completed",
        "completed_at": "2025-08-08T15:33:00Z"
      }
    ],
    "statistics": {
      "objects": 25,
      "structural_units": 21,
      "granular_units": 0,
      "completed_stages": 2
    }
  }
}
```

### Stage Output Structures

#### Stage 1: Big Picture Output
```json
{
  "core_concept": {
    "premise": "Central story premise",
    "genre": "Genre and sub-genre",
    "unique_proposition": "What makes it unique"
  },
  "thematic_framework": {
    "primary_theme": "Main theme",
    "secondary_themes": ["theme1", "theme2"],
    "philosophical_questions": ["question1"],
    "emotional_journey": "Reader's emotional arc"
  },
  "narrative_arc": {
    "beginning": "Initial state",
    "middle": "Complications",
    "end": "Resolution",
    "turning_points": ["point1", "point2"]
  },
  "world_vision": {
    "setting": "Where and when",
    "atmosphere": "Tone and mood",
    "rules": "World rules/logic"
  },
  "conflicts": {
    "external": "Main external conflict",
    "internal": "Character's internal struggle",
    "philosophical": "Deeper questions"
  }
}
```

#### Stage 2: Objects & Relations Output
```json
{
  "objects": [
    {
      "type": "character",
      "code": "char_protagonist",
      "name": "Kai Nakamura",
      "description": "200-word character description...",
      "backstory": "200-word backstory...",
      "relationships": {
        "char_antagonist": "rival",
        "char_mentor": "student"
      },
      "metadata": {
        "role": "protagonist",
        "arc": "zero to hero"
      }
    }
  ],
  "timeline": [
    {
      "time": "10 years before story",
      "description": "The quantum incident that changed everything",
      "type": "backstory",
      "objects": ["char_protagonist", "loc_tokyo"],
      "impact": "critical"
    }
  ]
}
```

#### Stage 3: Structure Output
```json
{
  "structure": [
    {
      "type": "act",
      "code": "1",
      "title": "The Discovery",
      "description": "200-word act description...",
      "children": [
        {
          "type": "chapter",
          "code": "1.1",
          "title": "Neon Shadows",
          "description": "200-word chapter description including opening hook, main events, character development, dialogue highlights, emotional beats, revelations, action sequences, reflection moments, and chapter ending...",
          "objects": ["char_protagonist", "loc_tokyo_streets"],
          "word_count": 5000,
          "metadata": {
            "pov": "Kai Nakamura",
            "tone": "mysterious",
            "plot_function": "inciting incident"
          }
        }
      ]
    }
  ]
}
```

#### Stage 4: Granular Units Output
```json
{
  "granular_units": [
    {
      "type": "scene",
      "code": "1.1.1",
      "parent_code": "1.1",
      "title": "The Crime Scene",
      "description": "200-word scene description with specific opening line, detailed action beats, dialogue snippets, sensory details, character emotions, micro-tensions, environmental details, body language, pacing notes, and transition...",
      "word_count": 2000,
      "style": "descriptive",
      "research": ["quantum computing basics", "Tokyo street layout"],
      "objects": ["char_protagonist", "char_victim", "loc_crime_scene"],
      "arc": "curiosity → discovery → shock",
      "key_lines": [
        "The quantum signature was impossible to fake",
        "In 2087 Tokyo, even death had gone digital"
      ],
      "notes": "Establish noir atmosphere, introduce quantum mystery"
    }
  ]
}
```

## Legacy Single-Stage Endpoints

### 1. Execute Granulation (Legacy)
**POST** `/api/execute`

Creates a new content structure using AI in a single operation.

#### Request Body
```json
{
  "action": "granulate",
  "input": {
    "topic": "Subject matter to structure",
    "structureType": "course|quiz|novel|workflow",
    "granularityLevel": 3,  // Number of top-level elements
    "targetAudience": "Target audience description",
    "maxElements": 30       // Maximum total elements
  },
  "config": {
    "aiProvider": "openai",
    "aiModel": "gpt-4o-mini",
    "temperature": 0.7,
    "maxTokens": 4000,
    "validation": false,
    "validationLevel": 2,
    "validationThreshold": 85
  }
}
```

#### Response
```json
{
  "success": true,
  "output": {
    "jobId": 123,
    "topic": "Subject matter",
    "structureType": "course",
    "structure": { /* Generic structure object */ },
    "summary": {
      "totalElements": 25,
      "levels": {
        "1": 3,
        "2": 10,
        "3": 12
      },
      "qualityScore": 0.85
    },
    "readyForContentGeneration": true
  },
  "usage": {
    "tokens": {
      "input": 500,
      "output": 2000
    }
  },
  "duration": 5000,
  "cost": 0.0025
}
```

### 2. Get Job Details
**GET** `/api/jobs/{jobId}`

Retrieves details of a specific granulation job.

#### Response
```json
{
  "job": {
    "id": 123,
    "topic": "Python Programming",
    "structureType": "course",
    "status": "completed",
    "qualityScore": 0.85,
    "processingTimeMs": 5000,
    "costUsd": 0.0025
  },
  "structure": { /* Generic structure object */ }
}
```

### 3. List Templates
**GET** `/api/templates`

Returns available structure templates.

#### Query Parameters
- `structureType` (optional): Filter by structure type

#### Response
```json
{
  "templates": [
    {
      "templateName": "educational_course_basic",
      "structureType": "course",
      "description": "Basic educational course structure",
      "structureRules": {
        "levels": [
          {
            "level": 1,
            "suggestedType": "module",
            "minElements": 3,
            "maxElements": 12,
            "requiredMetadata": ["title", "duration", "objectives"]
          }
        ]
      }
    }
  ]
}
```

### 4. Get Template Details
**GET** `/api/templates/{templateName}`

Returns detailed information about a specific template.

### 5. Get Statistics
**GET** `/api/stats`

Returns granulation statistics.

#### Response
```json
{
  "data": {
    "stats": {
      "total_jobs": 100,
      "success_rate": 95.5,
      "avg_quality_score": 0.82,
      "total_cost_usd": 12.50,
      "avg_processing_time_ms": 4500
    }
  }
}
```

## Structure Types

### Course Structure
- **Level 1**: Modules
- **Level 2**: Lessons
- **Level 3**: Activities

### Quiz Structure
- **Level 1**: Categories
- **Level 2**: Questions

### Novel Structure
- **Level 1**: Acts
- **Level 2**: Chapters
- **Level 3**: Scenes

### Workflow Structure
- **Level 1**: Phases
- **Level 2**: Steps
- **Level 3**: Tasks

## Quality Score Calculation

Quality scores range from 0 to 1 and are based on:

1. **Metadata Completeness (30%)**: How many metadata fields are filled
2. **Structure Depth (20%)**: Number of hierarchy levels
3. **Element Count (20%)**: Total number of elements
4. **Balance (30%)**: Average children per parent element

Target quality score: > 0.7

## Template Structure Rules

Templates define constraints for each level:

```json
{
  "levels": [
    {
      "level": 1,
      "suggestedType": "module",
      "minElements": 3,
      "maxElements": 12,
      "requiredMetadata": ["title", "duration", "objectives"],
      "allowsChildren": true
    },
    {
      "level": 2,
      "suggestedType": "lesson",
      "minElements": 2,
      "maxElements": 5,
      "requiredMetadata": ["title", "content"],
      "allowsChildren": true
    }
  ]
}
```

## Best Practices

1. **Structure Design**
   - Aim for 20-40 total elements for good quality scores
   - Ensure balanced distribution across levels
   - Fill all metadata fields

2. **API Usage**
   - Use appropriate granularity levels (3-5 for most cases)
   - Choose the right AI model for your needs
   - Enable validation for critical content

3. **Cost Optimization**
   - Use gpt-4o-mini for most tasks
   - Reserve gpt-4o for complex structures
   - Consider Cloudflare AI for simple structures

## Content Type Examples

### Novel Generation Workflow
```javascript
// 1. Create novel project
const project = await createProject({
  project_name: "The Quantum Detective",
  content_type: "novel",
  topic: "A detective in cyberpunk Tokyo investigates quantum crimes",
  target_audience: "Adult sci-fi thriller readers",
  genre: "Cyberpunk Mystery"
});

// 2. Generate Big Picture (themes, conflicts, world)
await executeStage(project.id, 1);

// 3. Generate Objects (characters, locations, timeline)
await executeStage(project.id, 2);

// 4. Generate Structure (acts, chapters with 200-word descriptions)
await executeStage(project.id, 3);

// 5. Generate Scenes (detailed scenes ready for writing)
await executeStage(project.id, 4);
```

### Course Generation Workflow
```javascript
// 1. Create course project
const project = await createProject({
  project_name: "Machine Learning Fundamentals",
  content_type: "course",
  topic: "Introduction to ML for beginners",
  target_audience: "Programming students",
  metadata: {
    duration: "8 weeks",
    level: "beginner"
  }
});

// 2. Generate Learning Objectives & Pedagogy
await executeStage(project.id, 1);

// 3. Generate Concepts & Resources
await executeStage(project.id, 2);

// 4. Generate Modules & Lessons
await executeStage(project.id, 3);

// 5. Generate Activities & Exercises
await executeStage(project.id, 4);
```

### Documentary Generation Workflow
```javascript
// 1. Create documentary project
const project = await createProject({
  project_name: "Climate Change: The Human Story",
  content_type: "documentary",
  topic: "Personal stories of climate change impact",
  target_audience: "General audience",
  metadata: {
    format: "6-part series",
    duration: "60 minutes each"
  }
});

// 2. Generate Thesis & Arguments
await executeStage(project.id, 1);

// 3. Generate Subjects & Evidence
await executeStage(project.id, 2);

// 4. Generate Episode Structure
await executeStage(project.id, 3);

// 5. Generate Scenes & Interviews
await executeStage(project.id, 4);
```

### Podcast Series Workflow
```javascript
// 1. Create podcast project
const project = await createProject({
  project_name: "Tech Founders Unplugged",
  content_type: "podcast",
  topic: "Interviews with startup founders",
  target_audience: "Entrepreneurs and tech enthusiasts",
  metadata: {
    format: "interview",
    frequency: "weekly",
    episode_length: "45 minutes"
  }
});

// Execute all 4 stages...
```

## Error Codes

- `400`: Bad Request - Invalid input parameters
- `401`: Unauthorized - Invalid authentication
- `404`: Not Found - Resource not found
- `500`: Internal Server Error - Processing failed

## Example: Creating a Novel Structure

```bash
curl -X POST https://bitware-content-granulator.jhaladik.workers.dev/api/execute \
  -H "Authorization: Bearer YOUR_SECRET" \
  -H "X-Worker-ID: YOUR_WORKER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "granulate",
    "input": {
      "topic": "A Mystery in Victorian London",
      "structureType": "novel",
      "granularityLevel": 3,
      "targetAudience": "adult mystery readers",
      "maxElements": 30
    },
    "config": {
      "aiProvider": "openai",
      "aiModel": "gpt-4o-mini",
      "temperature": 0.8,
      "maxTokens": 4000,
      "validation": false
    }
  }'
```

## Frontend Integration Guide

### For the Granulation Page

The frontend granulation page should be updated to support both legacy single-stage and new multi-stage generation:

#### UI Components Needed

1. **Project Creation Form**
   - Project name input
   - Content type selector (novel, course, documentary, podcast, etc.)
   - Topic textarea
   - Target audience input
   - Genre input (optional)
   - Metadata fields (dynamic based on content type)

2. **Stage Progress Tracker**
   - Visual indicator showing 4 stages
   - Current stage highlight
   - Stage status (pending, in_progress, completed, failed)
   - Time and cost per stage

3. **Stage Execution Panel**
   - Execute button for each stage
   - AI configuration options (model, temperature, max tokens)
   - Stage output viewer (collapsible JSON/formatted view)
   - Retry failed stages

4. **Objects & Timeline Viewer** (After Stage 2)
   - Character cards with descriptions
   - Location gallery
   - Timeline visualization
   - Relationship graph

5. **Structure Explorer** (After Stage 3)
   - Tree view of acts/chapters/scenes
   - 200-word description previews
   - Word count targets
   - Object references

6. **Granular Units List** (After Stage 4)
   - Scene/activity cards
   - Research topics highlighted
   - Key lines preview
   - Ready for generation indicator

#### Sample Frontend Code

```javascript
// Create a new project
async function createProject(projectData) {
  const response = await fetch('/api/granulator', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bitware-session-token': sessionToken
    },
    body: JSON.stringify({
      endpoint: '/projects/create',
      method: 'POST',
      data: projectData
    })
  });
  return response.json();
}

// Execute a stage
async function executeStage(projectId, stageNumber) {
  const response = await fetch('/api/granulator', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bitware-session-token': sessionToken
    },
    body: JSON.stringify({
      endpoint: '/stages/execute',
      method: 'POST',
      data: {
        project_id: projectId,
        stage_number: stageNumber,
        ai_config: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          temperature: 0.8,
          maxTokens: 16000
        }
      }
    })
  });
  return response.json();
}

// Get project status
async function getProjectStatus(projectId) {
  const response = await fetch('/api/granulator', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bitware-session-token': sessionToken
    },
    body: JSON.stringify({
      endpoint: `/projects/${projectId}`,
      method: 'GET'
    })
  });
  return response.json();
}
```

#### UI Flow

1. **Create Project**
   - User fills in project details
   - Selects content type
   - Clicks "Create Project"

2. **Stage 1: Big Picture**
   - Auto-executes or user clicks "Generate Big Picture"
   - Shows vision, themes, conflicts
   - User can review and proceed

3. **Stage 2: Objects & Relations**
   - Click "Generate Objects & Timeline"
   - Display character cards, location gallery
   - Show timeline visualization

4. **Stage 3: Structure**
   - Click "Generate Structure"
   - Display hierarchical tree view
   - Show 200-word descriptions on hover/click

5. **Stage 4: Granular Units**
   - Click "Generate Scenes/Activities"
   - Display scene cards with details
   - Mark as "Ready for Content Generation"

6. **Export/Handoff**
   - Export complete structure as JSON
   - Send to Content Generator
   - Download for offline use

### Progressive Enhancement

The UI should support:
- **Progress Saving**: Save after each stage
- **Stage Editing**: Allow editing stage output before proceeding
- **Partial Execution**: Skip stages if needed
- **Batch Processing**: Multiple projects in parallel
- **Templates**: Save successful projects as templates
- **Collaboration**: Share projects with team members

## Version History

### v4.0 (Current)
- Universal multi-stage generation system
- 4-stage progressive refinement process
- Support for any content type
- 200-word descriptions at all levels
- Object-centric architecture
- Research identification
- Cost tracking per stage

### v3.0
- Universal content structure for ANY content type
- Object-centric design with entities (actors, locations, concepts, resources)
- Two-step generation process (creative → structured)
- User parametrization through mandatory/optional objects
- Enhanced 3-level hierarchy guarantee
- Objects referenced throughout structure

### v2.0
- Generic hierarchical structure system
- Template-driven architecture
- Improved quality scoring
- Better array handling for metadata

### v1.0
- Initial release with hardcoded structures
- Basic template support