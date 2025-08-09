# Universal Multi-Stage Content Generation System

## Overview
A sophisticated 4-stage progressive refinement system for generating ANY type of content - novels, courses, documentaries, games, podcasts, research papers, and more.

## The 4-Stage Universal Process

### Stage 1: Big Picture (Vision & Framework)
**Purpose**: Establish the overall concept, goals, and framework
**Universal Output**: High-level vision and structural approach

**Adapts to Content Type:**
- **Novel**: Theme, narrative arc, conflicts
- **Course**: Learning objectives, pedagogical approach
- **Documentary**: Central thesis, arguments, visual approach
- **Podcast**: Show concept, format, season arc
- **Research**: Hypothesis, methodology, contribution
- **Game**: Core mechanics, player journey, world rules

### Stage 2: Objects & Relations (Building Blocks)
**Purpose**: Define all entities, relationships, and sequences
**Universal Output**: Complete object database and relationship map

**Universal Objects:**
- **Entities**: Characters, speakers, instructors, subjects, players
- **Locations**: Physical spaces, virtual environments, contexts
- **Concepts**: Theories, themes, mechanics, principles
- **Resources**: Tools, datasets, evidence, artifacts
- **Timeline**: Chronology, prerequisites, dependencies

### Stage 3: Structure (200-Word Units)
**Purpose**: Create detailed structural units with rich descriptions
**Universal Output**: Hierarchical structure with 200-word descriptions

**Universal Structure Levels:**
- **Level 1**: Acts, Seasons, Modules, Parts, Sections
- **Level 2**: Chapters, Episodes, Lessons, Segments
- **Level 3**: Scenes, Activities, Exercises, Subsections

Each unit gets:
- 200-word detailed description
- Metadata (perspective, setting, tone, function)
- Object references
- Size targets

### Stage 4: Granular Expansion (Final Details)
**Purpose**: Break structural units into atomic pieces ready for generation
**Universal Output**: Granular units with 200-word descriptions

**Universal Granular Units:**
- **Narrative**: Scenes with dialogue and action
- **Educational**: Activities with learning outcomes
- **Documentary**: Interview segments and b-roll
- **Interactive**: Gameplay moments and choices
- **Academic**: Arguments with evidence

## Content Type Configurations

### Novel
```
Stage 1: Theme, plot, world-building
Stage 2: Characters, locations, timeline
Stage 3: Acts → Chapters (200 words each)
Stage 4: Scenes (200 words each)
Output: Ready for narrative generation
```

### Online Course
```
Stage 1: Learning objectives, prerequisites
Stage 2: Concepts, tools, case studies
Stage 3: Modules → Lessons (200 words each)
Stage 4: Activities, exercises (200 words each)
Output: Ready for educational content generation
```

### Documentary
```
Stage 1: Thesis, arguments, approach
Stage 2: Subjects, evidence, locations
Stage 3: Episodes → Segments (200 words each)
Stage 4: Scenes, interviews (200 words each)
Output: Ready for script generation
```

### Podcast Series
```
Stage 1: Show concept, audience, format
Stage 2: Guests, topics, recurring segments
Stage 3: Episodes (200 words each)
Stage 4: Segments, talking points (200 words each)
Output: Ready for episode script generation
```

### Research Paper
```
Stage 1: Research question, methodology
Stage 2: Theories, datasets, citations
Stage 3: Sections (200 words each)
Stage 4: Arguments, evidence (200 words each)
Output: Ready for academic writing
```

### Video Game
```
Stage 1: Core loop, player journey
Stage 2: Characters, mechanics, items
Stage 3: Acts → Levels (200 words each)
Stage 4: Encounters, puzzles (200 words each)
Output: Ready for quest/dialogue generation
```

## Database Schema

### Core Tables
1. **content_generation_projects**: Track any content project
2. **content_generation_stages**: Track progress through 4 stages
3. **content_objects**: Universal object storage
4. **content_timeline**: Sequences and dependencies
5. **content_structural_units**: Hierarchical structure (3 levels)
6. **content_granular_units**: Atomic units for generation

### Universal Fields
- **unit_type**: Flexible (chapter, lesson, episode, level, etc.)
- **object_type**: Flexible (character, concept, mechanic, etc.)
- **size_unit**: Flexible (words, minutes, pages, interactions)
- **execution_style**: Flexible (narrative, interactive, visual, etc.)

## API Endpoints

### Project Management
```
POST /api/projects/create
GET  /api/projects/{id}
PUT  /api/projects/{id}/advance-stage
```

### Stage Execution
```
POST /api/stages/execute
GET  /api/stages/{projectId}/{stageNumber}
POST /api/stages/{id}/retry
```

### Object Management
```
POST /api/objects/create
GET  /api/objects/{projectId}
PUT  /api/objects/{id}
GET  /api/objects/{projectId}/relationships
```

### Structure Management
```
GET  /api/structure/{projectId}
POST /api/structure/units/create
GET  /api/structure/units/{id}/children
```

### Content Generation Handoff
```
POST /api/granular-units/{id}/generate
GET  /api/granular-units/{projectId}/ready
```

## Benefits of Universal System

1. **Content Agnostic**: Works for ANY content type
2. **Progressive Refinement**: Each stage builds on previous
3. **Consistent Quality**: 200-word descriptions ensure richness
4. **Object Reusability**: Define once, use throughout
5. **Parallel Processing**: Multiple units can be processed simultaneously
6. **Research Identification**: Know what needs research before writing
7. **Flexible Metadata**: Adapts to content-specific needs
8. **Scalable**: From short stories to multi-season series

## Integration Points

### Input Sources
- User prompts
- Existing outlines
- Research documents
- Content briefs

### Output Destinations
- Content Generator (for final writing)
- Review systems
- Publishing platforms
- Collaboration tools

## Usage Example

```javascript
// Create a project (any content type)
const project = await createProject({
  content_type: "documentary",
  topic: "The History of Quantum Computing",
  target_audience: "Tech-savvy general audience",
  total_stages: 4
});

// Execute Stage 1: Big Picture
const stage1 = await executeStage(project.id, 1, {
  prompt: "Create comprehensive vision for documentary..."
});

// Execute Stage 2: Objects & Relations
const stage2 = await executeStage(project.id, 2, {
  input: stage1.output,
  prompt: "Define interview subjects, locations, evidence..."
});

// Execute Stage 3: Structure
const stage3 = await executeStage(project.id, 3, {
  input: stage2.output,
  prompt: "Create episode structure with 200-word descriptions..."
});

// Execute Stage 4: Granular Units
const stage4 = await executeStage(project.id, 4, {
  input: stage3.output,
  prompt: "Break into scenes and segments with 200-word descriptions..."
});

// Hand off to Content Generator
const content = await generateContent(stage4.granular_units);
```

## Configuration Flexibility

Each content type can customize:
- Number of stages (3-5)
- Stage names and prompts
- Object types needed
- Structure hierarchy
- Metadata fields
- Size units
- Quality criteria

## Future Enhancements

1. **Stage Templates Library**: Pre-built stage configurations
2. **Object Libraries**: Reusable object collections
3. **Collaborative Editing**: Multi-user stage refinement
4. **Version Control**: Track changes across stages
5. **Quality Metrics**: Automated quality assessment
6. **Cross-Project Reuse**: Share objects between projects
7. **AI Learning**: Improve prompts based on outcomes