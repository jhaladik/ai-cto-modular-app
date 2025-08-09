# Multi-Stage Book Generation System

## Overview
A sophisticated 4-stage progressive refinement system for generating books, based on professional authoring methodology.

## Stage 1: Big Picture (Concept & Vision)
**Purpose**: Establish the overall concept, theme, and vision
**Output**: High-level narrative arc and thematic framework

### Prompt Structure:
```
Create a comprehensive BIG PICTURE for: "{topic}"

Generate:
1. CORE CONCEPT
   - Central premise (1-2 sentences)
   - Genre and sub-genre
   - Target audience and market positioning
   - Unique selling proposition

2. THEMATIC FRAMEWORK
   - Primary theme and message
   - Secondary themes (3-5)
   - Philosophical questions explored
   - Emotional journey for reader

3. NARRATIVE ARC
   - Beginning: Initial state/problem
   - Middle: Escalation and complications
   - End: Resolution and transformation
   - Key turning points (3-5)

4. WORLD VISION
   - Setting overview
   - Time period/timeline
   - Atmosphere and tone
   - Rules of the world (if applicable)

5. CORE CONFLICTS
   - External conflict
   - Internal conflict
   - Societal/philosophical conflict
   - Stakes and consequences
```

## Stage 2: Objects & Timelines (World Building)
**Purpose**: Define all entities, relationships, and chronology
**Output**: Complete object database and timeline

### Prompt Structure:
```
Based on the big picture, create detailed OBJECTS AND TIMELINES:

1. CHARACTER OBJECTS (minimum 10)
   For each character:
   - Name and role
   - Backstory (200 words)
   - Motivations and goals
   - Relationships with others
   - Character arc/transformation
   - Key scenes they appear in

2. LOCATION OBJECTS (minimum 8)
   For each location:
   - Name and type
   - Physical description (100 words)
   - Emotional atmosphere
   - Historical significance
   - Events that occur there
   - Symbolic meaning

3. CONCEPT OBJECTS (minimum 6)
   - Technologies/magic systems
   - Social structures
   - Historical events
   - Cultural elements
   - Philosophical concepts
   - Important items/artifacts

4. TIMELINE & PATHS
   - Pre-story events (backstory)
   - Main story chronology
   - Character journey paths
   - Parallel storylines
   - Cause-effect chains
   - Foreshadowing elements

5. RELATIONSHIP MAP
   - Character connections
   - Power dynamics
   - Alliances and conflicts
   - Evolution of relationships
```

## Stage 3: Structure with 200-Word Descriptions
**Purpose**: Create detailed chapter structure with rich descriptions
**Output**: Complete chapter outline with 200-word descriptions each

### Prompt Structure:
```
Create a detailed STRUCTURE with 200-word descriptions:

For each of 3 ACTS:
  
  ACT [Number]: [Act Title]
  Purpose: [Act's role in story]
  
  For each of 5-7 CHAPTERS:
    
    CHAPTER [Number]: [Chapter Title]
    
    200-WORD DESCRIPTION including:
    - Opening hook and scene setting
    - Main events and plot progression
    - Character development moments
    - Dialogue highlights or key conversations
    - Emotional beats and tension points
    - Revelations or discoveries
    - Action sequences (if applicable)
    - Internal monologue/reflection
    - Foreshadowing or callbacks
    - Chapter ending (cliffhanger/resolution)
    
    METADATA:
    - POV Character: [who narrates]
    - Primary Location: [where it happens]
    - Time: [when in timeline]
    - Featured Objects: [characters, items, concepts]
    - Word Count Target: [expected length]
    - Emotional Tone: [mood/atmosphere]
    - Plot Function: [what it accomplishes]
```

## Stage 4: Sub-Chapter Expansion
**Purpose**: Break chapters into scenes with granular descriptions
**Output**: Scene-level outline with 200-word descriptions

### Prompt Structure:
```
For CHAPTER [X], create SUB-CHAPTERS (scenes):

Break into 3-5 SCENES, each with:

SCENE [Number]: [Scene Title]

200-WORD DESCRIPTION including:
- Specific opening line/image
- Detailed action beats
- Dialogue snippets (actual lines)
- Sensory details (sights, sounds, smells)
- Character thoughts/emotions
- Micro-tensions and conflicts
- Environmental details
- Body language and expressions
- Pacing and rhythm notes
- Transition to next scene

SCENE METADATA:
- Estimated Word Count: [1000-3000]
- Writing Style: [descriptive/dialogue-heavy/action/introspective]
- Research Needed: [specific topics to research]
- Objects Featured: [specific characters, items]
- Emotional Arc: [starting emotion → ending emotion]
- Key Lines: [memorable quotes or descriptions]
- Author Notes: [specific writing techniques to use]
```

## Integration with Content Generator

After Stage 4, each scene is ready for the Content Generator with:
- 200-word detailed description
- Specific objects to include
- Research topics identified
- Target word count
- Style and tone guidelines
- Emotional progression mapped

### Content Generator Input:
```json
{
  "sceneId": "1.1.1",
  "description": "[200-word scene description]",
  "targetWordCount": 2000,
  "style": "descriptive",
  "objects": {
    "characters": ["protagonist", "antagonist"],
    "location": "abandoned_warehouse",
    "concepts": ["betrayal", "redemption"]
  },
  "researchTopics": ["police procedures", "warehouse layouts"],
  "emotionalArc": "suspicion → revelation → shock",
  "keyLines": ["I never thought it would be you", "The truth was hidden in plain sight"]
}
```

## Database Schema for Multi-Stage

```sql
-- Stage tracking
CREATE TABLE book_generation_stages (
  id INTEGER PRIMARY KEY,
  book_id INTEGER,
  stage_number INTEGER, -- 1-4
  stage_name TEXT, -- big_picture, objects_timelines, structure, sub_chapters
  status TEXT, -- pending, in_progress, completed
  input_data TEXT, -- JSON of previous stage output
  output_data TEXT, -- JSON of this stage output
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Object library for Stage 2
CREATE TABLE book_objects (
  id INTEGER PRIMARY KEY,
  book_id INTEGER,
  object_type TEXT, -- character, location, concept, item
  object_id TEXT, -- unique identifier
  name TEXT,
  description TEXT,
  metadata TEXT, -- JSON with type-specific details
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Timeline events for Stage 2
CREATE TABLE book_timeline (
  id INTEGER PRIMARY KEY,
  book_id INTEGER,
  event_time TEXT, -- relative or absolute time
  event_description TEXT,
  involved_objects TEXT, -- JSON array of object_ids
  impact_level TEXT, -- major, minor, background
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Benefits of This Approach

1. **Progressive Refinement**: Each stage builds on the previous, ensuring consistency
2. **Object Consistency**: Objects defined once, referenced throughout
3. **Research Identification**: Knows exactly what needs research before writing
4. **Controllable Output**: Each stage can be reviewed/edited before proceeding
5. **Parallel Processing**: Multiple scenes can be generated simultaneously
6. **Quality Control**: 200-word descriptions ensure rich, detailed content
7. **Reusability**: Objects and timelines can be reused for sequels/spin-offs

## Implementation Plan

1. **Template System**: Create templates for each stage
2. **State Management**: Track progress through stages
3. **Object Registry**: Maintain consistent object references
4. **Validation**: Ensure each stage meets requirements before proceeding
5. **Handoff**: Clean API between Granulator and Content Generator