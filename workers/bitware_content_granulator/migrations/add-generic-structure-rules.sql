-- Migration to add generic structure rules to templates
-- This replaces hardcoded structure expectations with flexible level-based rules
-- Date: 2025-08-08

-- Add new columns for generic structure support
ALTER TABLE granulation_templates ADD COLUMN structure_rules TEXT;
ALTER TABLE granulation_templates ADD COLUMN generic_prompt TEXT;

-- Update Educational Course Template with generic structure rules
UPDATE granulation_templates 
SET structure_rules = '{
  "levels": [
    {
      "level": 1,
      "suggestedType": "module",
      "minElements": 3,
      "maxElements": 12,
      "requiredMetadata": ["title", "duration", "objectives"],
      "optionalMetadata": ["description", "prerequisites"],
      "allowsChildren": true
    },
    {
      "level": 2,
      "suggestedType": "lesson",
      "minElements": 2,
      "maxElements": 5,
      "requiredMetadata": ["title", "content"],
      "optionalMetadata": ["duration", "materials"],
      "allowsChildren": true
    },
    {
      "level": 3,
      "suggestedType": "activity",
      "minElements": 1,
      "maxElements": 4,
      "requiredMetadata": ["type", "description"],
      "optionalMetadata": ["duration", "instructions"],
      "allowsChildren": false
    }
  ],
  "globalMetadata": {
    "required": ["title", "description"],
    "optional": ["duration", "targetAudience", "prerequisites", "objectives"]
  }
}',
generic_prompt = 'You are an expert curriculum designer. Create a hierarchical course structure.

INSTRUCTIONS:
1. Topic: "{topic}"
2. Audience: {audience}
3. Create a 3-level hierarchy
4. Use the EXACT JSON structure below

REQUIRED STRUCTURE:
{
  "type": "course",
  "version": "1.0",
  "metadata": {
    "title": "Clear, descriptive course title",
    "description": "2-3 sentence overview",
    "duration": "Total duration estimate",
    "targetAudience": "Target audience description",
    "prerequisites": ["prerequisite 1", "prerequisite 2"],
    "objectives": ["objective 1", "objective 2", "objective 3"]
  },
  "elements": [
    {
      "id": "1",
      "type": "module",
      "name": "Module 1: Introduction",
      "level": 1,
      "sequenceOrder": 0,
      "metadata": {
        "title": "Module title",
        "duration": "1 week",
        "objectives": ["objective 1", "objective 2"],
        "description": "Module description"
      },
      "elements": [
        {
          "id": "1.1",
          "type": "lesson",
          "name": "Lesson 1: Basics",
          "level": 2,
          "sequenceOrder": 0,
          "metadata": {
            "title": "Lesson title",
            "content": "Detailed content outline",
            "duration": "2 hours",
            "materials": ["material 1", "material 2"]
          },
          "elements": [
            {
              "id": "1.1.1",
              "type": "activity",
              "name": "Exercise: Hands-on Practice",
              "level": 3,
              "sequenceOrder": 0,
              "metadata": {
                "type": "exercise",
                "description": "Activity description",
                "duration": "30 minutes",
                "instructions": "Step-by-step instructions"
              }
            }
          ]
        }
      ]
    }
  ]
}

Create {granularity} level-1 elements (modules), each with 2-5 level-2 elements (lessons), and each lesson with 1-4 level-3 elements (activities).
Ensure logical progression and comprehensive coverage of the topic.'
WHERE template_name = 'educational_course_basic';

-- Update Quiz Template with generic structure rules
UPDATE granulation_templates 
SET structure_rules = '{
  "levels": [
    {
      "level": 1,
      "suggestedType": "category",
      "minElements": 2,
      "maxElements": 8,
      "requiredMetadata": ["name", "weight", "description"],
      "optionalMetadata": ["difficulty", "skills"],
      "allowsChildren": true
    },
    {
      "level": 2,
      "suggestedType": "question",
      "minElements": 3,
      "maxElements": 10,
      "requiredMetadata": ["question", "type", "answer"],
      "optionalMetadata": ["explanation", "points", "difficulty"],
      "allowsChildren": false
    }
  ],
  "globalMetadata": {
    "required": ["title", "totalQuestions", "timeLimit"],
    "optional": ["passingScore", "instructions", "difficulty"]
  }
}',
generic_prompt = 'You are an expert assessment designer. Create a hierarchical quiz structure.

INSTRUCTIONS:
1. Topic: "{topic}"
2. Audience: {audience}
3. Create a 2-level hierarchy (categories -> questions)
4. Use the EXACT JSON structure below

REQUIRED STRUCTURE:
{
  "type": "quiz",
  "version": "1.0",
  "metadata": {
    "title": "Quiz title",
    "totalQuestions": 20,
    "timeLimit": "30 minutes",
    "passingScore": 70,
    "instructions": ["instruction 1", "instruction 2"],
    "difficulty": "intermediate"
  },
  "elements": [
    {
      "id": "1",
      "type": "category",
      "name": "Fundamentals",
      "level": 1,
      "sequenceOrder": 0,
      "metadata": {
        "name": "Category name",
        "weight": 40,
        "description": "Questions about fundamentals",
        "difficulty": "easy",
        "skills": ["skill1", "skill2"]
      },
      "elements": [
        {
          "id": "1.1",
          "type": "question",
          "name": "Question 1",
          "level": 2,
          "sequenceOrder": 0,
          "metadata": {
            "question": "What is...?",
            "type": "multiple_choice",
            "answer": "correct answer",
            "options": ["option A", "option B", "option C", "option D"],
            "explanation": "Why this is correct",
            "points": 1,
            "difficulty": "easy"
          }
        }
      ]
    }
  ]
}

Create {granularity} categories with appropriate questions.
Distribute difficulty: 40% easy, 45% medium, 15% hard.'
WHERE template_name = 'quiz_assessment_standard';

-- Update Novel Template with generic structure rules
UPDATE granulation_templates 
SET structure_rules = '{
  "levels": [
    {
      "level": 1,
      "suggestedType": "act",
      "minElements": 3,
      "maxElements": 5,
      "requiredMetadata": ["title", "purpose", "summary"],
      "optionalMetadata": ["themes", "tension"],
      "allowsChildren": true
    },
    {
      "level": 2,
      "suggestedType": "chapter",
      "minElements": 3,
      "maxElements": 10,
      "requiredMetadata": ["title", "summary", "purpose"],
      "optionalMetadata": ["pov", "setting", "mood"],
      "allowsChildren": true
    },
    {
      "level": 3,
      "suggestedType": "scene",
      "minElements": 2,
      "maxElements": 5,
      "requiredMetadata": ["description", "purpose"],
      "optionalMetadata": ["characters", "conflict", "outcome"],
      "allowsChildren": false
    }
  ],
  "globalMetadata": {
    "required": ["title", "genre", "premise"],
    "optional": ["themes", "targetWordCount", "tone", "setting"]
  }
}',
generic_prompt = 'You are an expert story structure consultant. Create a hierarchical novel outline.

INSTRUCTIONS:
1. Story concept: "{topic}"
2. Target readers: {audience}
3. Create a 3-level hierarchy (acts -> chapters -> scenes)
4. Use the EXACT JSON structure below

REQUIRED STRUCTURE:
{
  "type": "novel",
  "version": "1.0",
  "metadata": {
    "title": "Novel title",
    "genre": "Primary genre",
    "premise": "One-sentence premise",
    "themes": ["theme 1", "theme 2"],
    "targetWordCount": 80000,
    "tone": "Overall tone",
    "setting": "Time and place"
  },
  "elements": [
    {
      "id": "1",
      "type": "act",
      "name": "Act 1: Setup",
      "level": 1,
      "sequenceOrder": 0,
      "metadata": {
        "title": "Act title",
        "purpose": "Setup and introduction",
        "summary": "What happens in this act",
        "themes": ["theme explored"],
        "tension": "Rising"
      },
      "elements": [
        {
          "id": "1.1",
          "type": "chapter",
          "name": "Chapter 1: Opening",
          "level": 2,
          "sequenceOrder": 0,
          "metadata": {
            "title": "Chapter title",
            "summary": "Chapter summary",
            "purpose": "Introduce protagonist",
            "pov": "Third person limited",
            "setting": "Location",
            "mood": "Mysterious"
          },
          "elements": [
            {
              "id": "1.1.1",
              "type": "scene",
              "name": "Opening Scene",
              "level": 3,
              "sequenceOrder": 0,
              "metadata": {
                "description": "Scene description",
                "purpose": "Hook the reader",
                "characters": ["protagonist", "mentor"],
                "conflict": "Internal struggle",
                "outcome": "Decision made"
              }
            }
          ]
        }
      ]
    }
  ]
}

Create a complete three-act structure with compelling narrative arc.'
WHERE template_name = 'three_act_novel';

-- Update Workflow Template with generic structure rules
UPDATE granulation_templates 
SET structure_rules = '{
  "levels": [
    {
      "level": 1,
      "suggestedType": "phase",
      "minElements": 3,
      "maxElements": 7,
      "requiredMetadata": ["name", "objective", "duration"],
      "optionalMetadata": ["dependencies", "deliverables"],
      "allowsChildren": true
    },
    {
      "level": 2,
      "suggestedType": "step",
      "minElements": 2,
      "maxElements": 8,
      "requiredMetadata": ["name", "description", "responsible"],
      "optionalMetadata": ["inputs", "outputs", "tools"],
      "allowsChildren": true
    },
    {
      "level": 3,
      "suggestedType": "task",
      "minElements": 1,
      "maxElements": 5,
      "requiredMetadata": ["name", "description"],
      "optionalMetadata": ["duration", "priority"],
      "allowsChildren": false
    }
  ],
  "globalMetadata": {
    "required": ["title", "purpose", "scope"],
    "optional": ["duration", "stakeholders", "resources"]
  }
}',
generic_prompt = 'You are an expert business process analyst. Create a hierarchical workflow structure.

INSTRUCTIONS:
1. Process: "{topic}"
2. Users: {audience}
3. Create a 3-level hierarchy (phases -> steps -> tasks)
4. Use the EXACT JSON structure below

REQUIRED STRUCTURE:
{
  "type": "workflow",
  "version": "1.0",
  "metadata": {
    "title": "Workflow title",
    "purpose": "Business purpose",
    "scope": "What is included",
    "duration": "Total time estimate",
    "stakeholders": ["stakeholder 1", "stakeholder 2"],
    "resources": ["resource 1", "resource 2"]
  },
  "elements": [
    {
      "id": "1",
      "type": "phase",
      "name": "Phase 1: Initiation",
      "level": 1,
      "sequenceOrder": 0,
      "metadata": {
        "name": "Phase name",
        "objective": "Phase objective",
        "duration": "2 weeks",
        "dependencies": [],
        "deliverables": ["deliverable 1"]
      },
      "elements": [
        {
          "id": "1.1",
          "type": "step",
          "name": "Step 1: Planning",
          "level": 2,
          "sequenceOrder": 0,
          "metadata": {
            "name": "Step name",
            "description": "Detailed description",
            "responsible": "Role/person",
            "inputs": ["input 1"],
            "outputs": ["output 1"],
            "tools": ["tool 1"]
          },
          "elements": [
            {
              "id": "1.1.1",
              "type": "task",
              "name": "Task 1: Document requirements",
              "level": 3,
              "sequenceOrder": 0,
              "metadata": {
                "name": "Task name",
                "description": "Task description",
                "duration": "2 hours",
                "priority": "high"
              }
            }
          ]
        }
      ]
    }
  ]
}

Create {granularity} phases with detailed steps and tasks.'
WHERE template_name = 'business_process_standard';

-- Update remaining templates similarly
UPDATE granulation_templates 
SET structure_rules = '{
  "levels": [
    {
      "level": 1,
      "suggestedType": "concept",
      "minElements": 3,
      "maxElements": 10,
      "requiredMetadata": ["name", "definition", "importance"],
      "optionalMetadata": ["prerequisites", "applications"],
      "allowsChildren": true
    },
    {
      "level": 2,
      "suggestedType": "subconcept",
      "minElements": 2,
      "maxElements": 6,
      "requiredMetadata": ["name", "definition", "relationship"],
      "optionalMetadata": ["examples", "connections"],
      "allowsChildren": true
    },
    {
      "level": 3,
      "suggestedType": "detail",
      "minElements": 1,
      "maxElements": 4,
      "requiredMetadata": ["name", "description"],
      "optionalMetadata": ["examples", "resources"],
      "allowsChildren": false
    }
  ],
  "globalMetadata": {
    "required": ["title", "domain", "purpose"],
    "optional": ["scope", "targetAudience", "prerequisites"]
  }
}',
generic_prompt = 'Create a hierarchical knowledge map using the generic structure format...'
WHERE template_name = 'concept_map_hierarchical';

UPDATE granulation_templates 
SET structure_rules = '{
  "levels": [
    {
      "level": 1,
      "suggestedType": "milestone",
      "minElements": 3,
      "maxElements": 8,
      "requiredMetadata": ["name", "objective", "duration"],
      "optionalMetadata": ["skills", "assessment"],
      "allowsChildren": true
    },
    {
      "level": 2,
      "suggestedType": "skill",
      "minElements": 2,
      "maxElements": 5,
      "requiredMetadata": ["name", "description", "proficiencyLevel"],
      "optionalMetadata": ["practiceHours", "resources"],
      "allowsChildren": true
    },
    {
      "level": 3,
      "suggestedType": "activity",
      "minElements": 1,
      "maxElements": 4,
      "requiredMetadata": ["type", "title", "description"],
      "optionalMetadata": ["duration", "deliverable"],
      "allowsChildren": false
    }
  ],
  "globalMetadata": {
    "required": ["title", "objective", "duration"],
    "optional": ["skillLevel", "careerRelevance", "certification"]
  }
}',
generic_prompt = 'Create a hierarchical learning path using the generic structure format...'
WHERE template_name = 'skill_development_path';