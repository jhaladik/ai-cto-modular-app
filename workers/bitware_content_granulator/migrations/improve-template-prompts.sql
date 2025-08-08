-- Migration to improve template prompts with specific AI role, instructions, and examples
-- Date: 2025-08-07

-- Update Educational Course Template
UPDATE granulation_templates 
SET ai_prompt_template = 'You are an expert curriculum designer specializing in structured educational content. Your task is to create a comprehensive course structure.

INSTRUCTIONS:
1. Analyze the topic: "{topic}"
2. Target audience: {audience}
3. Create exactly {granularity} modules
4. Each module must have 2-4 lessons
5. Follow the EXACT JSON structure provided below
6. Ensure logical progression from basic to advanced concepts
7. Include practical, actionable content

REQUIRED JSON STRUCTURE:
{
  "courseOverview": {
    "title": "string - Clear, descriptive course title",
    "description": "string - 2-3 sentence course description",
    "duration": "string - Total duration (e.g., ''8 weeks'')",
    "prerequisites": ["string - prerequisite 1", "string - prerequisite 2"],
    "learningOutcomes": ["string - outcome 1", "string - outcome 2", "string - outcome 3"],
    "targetAudience": "string - specific audience description"
  },
  "modules": [
    {
      "title": "string - Module title",
      "estimatedDuration": "string - Duration (e.g., ''1 week'')",
      "learningObjectives": ["string - objective 1", "string - objective 2"],
      "lessons": [
        {
          "title": "string - Lesson title",
          "contentOutline": "string - Detailed outline of topics covered",
          "learningObjectives": ["string - specific lesson objective 1", "string - specific lesson objective 2"],
          "practicalExercises": ["string - hands-on exercise 1", "string - hands-on exercise 2"],
          "assessmentPoints": ["string - key concept to assess", "string - skill to evaluate"]
        }
      ],
      "assessment": {
        "type": "string - quiz/assignment/project",
        "description": "string - Assessment description",
        "weight": "string - Percentage of total grade"
      }
    }
  ]
}

EXAMPLE for "Introduction to Python Programming" for beginners:
{
  "courseOverview": {
    "title": "Python Programming Fundamentals",
    "description": "A comprehensive introduction to Python programming designed for absolute beginners. Learn core concepts through hands-on practice and real-world examples.",
    "duration": "6 weeks",
    "prerequisites": ["Basic computer literacy", "No prior programming experience required"],
    "learningOutcomes": ["Write Python programs using core syntax", "Understand data types and control structures", "Build simple applications"],
    "targetAudience": "Complete beginners with no programming experience"
  },
  "modules": [
    {
      "title": "Getting Started with Python",
      "estimatedDuration": "1 week",
      "learningObjectives": ["Set up Python development environment", "Understand basic syntax and structure"],
      "lessons": [
        {
          "title": "Python Setup and First Program",
          "contentOutline": "Installing Python, IDE setup, writing and running first program, understanding print statements and comments",
          "learningObjectives": ["Install Python and configure IDE", "Write and execute a Hello World program"],
          "practicalExercises": ["Install Python and VS Code", "Create and run 5 simple print programs"],
          "assessmentPoints": ["Environment setup completion", "Basic syntax understanding"]
        }
      ],
      "assessment": {
        "type": "quiz",
        "description": "Test understanding of Python setup and basic syntax",
        "weight": "10%"
      }
    }
  ]
}

Generate the complete structure now:'
WHERE template_name = 'educational_course_basic';

-- Update Quiz Template
UPDATE granulation_templates 
SET ai_prompt_template = 'You are an expert assessment designer specializing in educational evaluation. Your task is to create a comprehensive quiz structure.

INSTRUCTIONS:
1. Topic to assess: "{topic}"
2. Target audience: {audience}
3. Create {granularity} distinct categories
4. Distribute questions: 40% easy, 45% medium, 15% hard
5. Include various question types
6. Follow the EXACT JSON structure provided

REQUIRED JSON STRUCTURE:
{
  "quizOverview": {
    "title": "string - Quiz title",
    "description": "string - Quiz purpose and scope",
    "totalQuestions": number,
    "timeLimit": "string - Time in minutes",
    "passingScore": number,
    "instructions": ["string - instruction 1", "string - instruction 2"]
  },
  "categories": [
    {
      "name": "string - Category name",
      "weight": number,
      "questions": [
        {
          "id": number,
          "type": "multiple_choice/true_false/short_answer/essay",
          "difficulty": "easy/medium/hard",
          "question": "string - The question text",
          "options": ["string - option A", "string - option B", "string - option C", "string - option D"],
          "correctAnswer": "string - correct option or answer",
          "explanation": "string - Why this answer is correct",
          "points": number,
          "skills": ["string - skill tested 1", "string - skill tested 2"]
        }
      ]
    }
  ],
  "scoringRubric": {
    "multipleChoice": "1 point each",
    "trueFalse": "1 point each",
    "shortAnswer": "2 points each",
    "essay": "5 points each"
  }
}

EXAMPLE for "Python Variables" quiz:
{
  "quizOverview": {
    "title": "Python Variables Assessment",
    "description": "Test your understanding of Python variables, data types, and variable operations",
    "totalQuestions": 10,
    "timeLimit": "20 minutes",
    "passingScore": 70,
    "instructions": ["Read each question carefully", "Select the best answer", "Review before submitting"]
  },
  "categories": [
    {
      "name": "Variable Declaration",
      "weight": 40,
      "questions": [
        {
          "id": 1,
          "type": "multiple_choice",
          "difficulty": "easy",
          "question": "Which of the following is a valid variable name in Python?",
          "options": ["2variable", "my-var", "my_var", "class"],
          "correctAnswer": "my_var",
          "explanation": "Variable names must start with a letter or underscore, contain only letters, numbers, and underscores",
          "points": 1,
          "skills": ["Variable naming rules", "Python syntax"]
        }
      ]
    }
  ],
  "scoringRubric": {
    "multipleChoice": "1 point each",
    "trueFalse": "1 point each",
    "shortAnswer": "2 points each",
    "essay": "5 points each"
  }
}

Generate the complete quiz structure now:'
WHERE template_name = 'quiz_assessment_standard';

-- Update Novel Template
UPDATE granulation_templates 
SET ai_prompt_template = 'You are an expert story structure consultant specializing in narrative design. Your task is to create a detailed novel outline.

INSTRUCTIONS:
1. Story concept: "{topic}"
2. Target readers: {audience}
3. Create a three-act structure with 24 chapters total
4. Act 1: 6 chapters (setup), Act 2: 12 chapters (confrontation), Act 3: 6 chapters (resolution)
5. Include character development and plot progression
6. Follow the EXACT JSON structure provided

REQUIRED JSON STRUCTURE:
{
  "novelOverview": {
    "title": "string - Novel title",
    "genre": "string - Primary genre",
    "premise": "string - One-sentence premise",
    "themes": ["string - theme 1", "string - theme 2"],
    "targetWordCount": number,
    "tone": "string - Overall tone/mood"
  },
  "characters": {
    "protagonist": {
      "name": "string - Character name",
      "role": "string - Role in story",
      "arc": "string - Character transformation",
      "motivation": "string - Core motivation",
      "conflict": "string - Internal/external conflict"
    },
    "antagonist": {
      "name": "string - Character name",
      "role": "string - Role in story",
      "motivation": "string - Core motivation"
    },
    "supporting": [
      {
        "name": "string - Character name",
        "role": "string - Role in story",
        "relationship": "string - Relationship to protagonist"
      }
    ]
  },
  "acts": [
    {
      "actNumber": 1,
      "purpose": "Setup",
      "chapters": [
        {
          "chapterNumber": 1,
          "title": "string - Chapter title",
          "summary": "string - What happens in this chapter",
          "purpose": "string - Story purpose (introduce character, establish setting, etc.)",
          "keyEvents": ["string - event 1", "string - event 2"],
          "characterDevelopment": "string - How characters change/grow",
          "chapterHook": "string - Cliffhanger or transition to next chapter"
        }
      ]
    }
  ],
  "plotStructure": {
    "incitingIncident": "string - Event that starts the story",
    "risingAction": ["string - key event 1", "string - key event 2"],
    "climax": "string - Story climax",
    "fallingAction": ["string - resolution event 1"],
    "resolution": "string - How story concludes"
  }
}

Generate the complete novel structure now:'
WHERE template_name = 'three_act_novel';

-- Update Workflow Template  
UPDATE granulation_templates 
SET ai_prompt_template = 'You are an expert business process analyst specializing in workflow optimization. Your task is to create a detailed workflow structure.

INSTRUCTIONS:
1. Process/workflow topic: "{topic}"
2. Target users: {audience}
3. Create {granularity} distinct phases
4. Include decision points and quality gates
5. Specify resource requirements
6. Follow the EXACT JSON structure provided

REQUIRED JSON STRUCTURE:
{
  "workflowOverview": {
    "title": "string - Workflow title",
    "purpose": "string - Business purpose",
    "scope": "string - What is included/excluded",
    "expectedDuration": "string - Total time estimate",
    "keyStakeholders": ["string - stakeholder 1", "string - stakeholder 2"]
  },
  "phases": [
    {
      "phaseName": "string - Phase name",
      "objective": "string - Phase objective",
      "duration": "string - Estimated duration",
      "steps": [
        {
          "stepNumber": number,
          "name": "string - Step name",
          "description": "string - Detailed description",
          "responsible": "string - Role/person responsible",
          "inputs": ["string - required input 1", "string - required input 2"],
          "outputs": ["string - deliverable 1", "string - deliverable 2"],
          "tools": ["string - tool/system 1", "string - tool/system 2"],
          "duration": "string - Step duration"
        }
      ],
      "decisionPoints": [
        {
          "name": "string - Decision name",
          "criteria": ["string - criterion 1", "string - criterion 2"],
          "options": ["string - option 1", "string - option 2"],
          "approver": "string - Who makes decision"
        }
      ],
      "qualityGates": {
        "criteria": ["string - quality criterion 1", "string - quality criterion 2"],
        "reviewProcess": "string - How quality is verified"
      }
    }
  ],
  "resources": {
    "human": ["string - role 1", "string - role 2"],
    "technical": ["string - system 1", "string - tool 1"],
    "budget": "string - Budget estimate"
  },
  "risks": [
    {
      "risk": "string - Risk description",
      "impact": "high/medium/low",
      "mitigation": "string - Mitigation strategy"
    }
  ]
}

Generate the complete workflow structure now:'
WHERE template_name = 'business_process_standard';

-- Update Knowledge Map Template
UPDATE granulation_templates 
SET ai_prompt_template = 'You are an expert knowledge architect specializing in concept mapping and information organization. Your task is to create a hierarchical knowledge map.

INSTRUCTIONS:
1. Knowledge domain: "{topic}"
2. Target learners: {audience}
3. Create {granularity} levels of depth
4. Show relationships between concepts
5. Follow the EXACT JSON structure provided

REQUIRED JSON STRUCTURE:
{
  "mapOverview": {
    "title": "string - Knowledge map title",
    "domain": "string - Knowledge domain",
    "purpose": "string - Learning purpose",
    "scope": "string - What is covered"
  },
  "coreConcepts": [
    {
      "name": "string - Concept name",
      "definition": "string - Clear definition",
      "importance": "string - Why this matters",
      "subConcepts": [
        {
          "name": "string - Sub-concept name",
          "definition": "string - Clear definition",
          "relationship": "string - How it relates to parent",
          "details": [
            {
              "name": "string - Detail name",
              "description": "string - Description",
              "examples": ["string - example 1", "string - example 2"]
            }
          ]
        }
      ],
      "connections": [
        {
          "relatedConcept": "string - Name of related concept",
          "relationshipType": "string - Type of relationship",
          "description": "string - How they connect"
        }
      ]
    }
  ],
  "learningPath": {
    "suggestedOrder": ["string - concept 1", "string - concept 2"],
    "prerequisites": ["string - prerequisite 1"],
    "outcomes": ["string - learning outcome 1", "string - learning outcome 2"]
  }
}

Generate the complete knowledge map now:'
WHERE template_name = 'concept_map_hierarchical';

-- Update Learning Path Template
UPDATE granulation_templates 
SET ai_prompt_template = 'You are an expert learning designer specializing in skill development pathways. Your task is to create a comprehensive learning path.

INSTRUCTIONS:
1. Skill/topic to master: "{topic}"
2. Target professionals: {audience}
3. Create {granularity} milestone levels
4. Include practical projects and assessments
5. Follow the EXACT JSON structure provided

REQUIRED JSON STRUCTURE:
{
  "pathOverview": {
    "title": "string - Learning path title",
    "objective": "string - Ultimate learning goal",
    "duration": "string - Total estimated time",
    "skillLevel": "beginner/intermediate/advanced",
    "careerRelevance": "string - How this helps professionally"
  },
  "milestones": [
    {
      "level": number,
      "name": "string - Milestone name",
      "duration": "string - Time estimate",
      "objectives": ["string - objective 1", "string - objective 2"],
      "skills": [
        {
          "name": "string - Skill name",
          "description": "string - What you will learn",
          "proficiencyLevel": "basic/intermediate/advanced",
          "practiceHours": number
        }
      ],
      "learningActivities": [
        {
          "type": "course/tutorial/workshop/project",
          "title": "string - Activity title",
          "description": "string - What you will do",
          "duration": "string - Time required",
          "resources": ["string - resource 1", "string - resource 2"]
        }
      ],
      "projects": [
        {
          "title": "string - Project title",
          "description": "string - Project description",
          "skills": ["string - skill practiced 1", "string - skill practiced 2"],
          "deliverable": "string - What you will create"
        }
      ],
      "assessment": {
        "type": "project/exam/portfolio",
        "description": "string - How you demonstrate mastery",
        "criteria": ["string - criterion 1", "string - criterion 2"]
      }
    }
  ],
  "resources": {
    "required": ["string - essential resource 1"],
    "recommended": ["string - helpful resource 1"],
    "tools": ["string - tool/software 1"]
  },
  "certification": {
    "available": true,
    "provider": "string - Who provides certification",
    "requirements": ["string - requirement 1"]
  }
}

Generate the complete learning path now:'
WHERE template_name = 'skill_development_path';