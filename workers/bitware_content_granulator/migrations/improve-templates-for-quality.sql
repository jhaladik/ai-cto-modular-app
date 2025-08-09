-- Improve template prompts for higher quality structures
-- Date: 2025-08-08

-- Update Quiz Template for better quality
UPDATE granulation_templates 
SET generic_prompt = 'You are an expert assessment designer. Create a comprehensive hierarchical quiz structure.

CRITICAL REQUIREMENTS:
1. Topic: "{topic}"
2. Audience: {audience}
3. Create EXACTLY {granularity} categories (level 1)
4. Each category MUST have 3-5 questions (level 2)
5. Fill ALL metadata fields completely
6. Use proper spelling (category not categorie)

REQUIRED JSON STRUCTURE:
{
  "type": "quiz",
  "version": "1.0",
  "metadata": {
    "title": "Comprehensive {topic} Assessment",
    "description": "A detailed assessment covering all aspects of {topic} for {audience}",
    "totalQuestions": 15,
    "timeLimit": "45 minutes",
    "passingScore": 75,
    "difficulty": "mixed",
    "targetAudience": "{audience}",
    "instructions": [
      "Read each question carefully",
      "Select the best answer for multiple choice",
      "Provide detailed answers for short answer questions"
    ],
    "gradeLevel": "appropriate level",
    "subject": "subject area",
    "keywords": ["keyword1", "keyword2", "keyword3"]
  },
  "elements": [
    {
      "id": "1",
      "type": "category",
      "name": "Fundamentals of {topic}",
      "level": 1,
      "sequenceOrder": 0,
      "metadata": {
        "name": "Fundamentals",
        "weight": 40,
        "description": "Basic concepts and definitions",
        "difficulty": "easy to medium",
        "skills": ["recall", "understanding", "basic application"],
        "learningObjectives": ["objective 1", "objective 2"],
        "timeEstimate": "15 minutes",
        "questionCount": 5
      },
      "elements": [
        {
          "id": "1.1",
          "type": "question",
          "name": "Definition Question",
          "level": 2,
          "sequenceOrder": 0,
          "metadata": {
            "question": "Complete question text here?",
            "type": "multiple_choice",
            "answer": "correct answer",
            "options": ["option A", "option B", "option C", "option D"],
            "explanation": "Detailed explanation of why this answer is correct",
            "points": 2,
            "difficulty": "easy",
            "skills": ["recall", "comprehension"],
            "timeEstimate": "2 minutes",
            "hint": "Think about the basic definition",
            "category": "fundamentals",
            "subcategory": "definitions"
          }
        },
        {
          "id": "1.2",
          "type": "question",
          "name": "Application Question",
          "level": 2,
          "sequenceOrder": 1,
          "metadata": {
            "question": "How would you apply X in situation Y?",
            "type": "short_answer",
            "answer": "Expected answer outline",
            "explanation": "Key points to cover in the answer",
            "points": 3,
            "difficulty": "medium",
            "skills": ["application", "analysis"],
            "timeEstimate": "3 minutes",
            "rubric": "Points for clarity, accuracy, examples",
            "category": "fundamentals",
            "subcategory": "application"
          }
        },
        {
          "id": "1.3",
          "type": "question",
          "name": "True/False Question",
          "level": 2,
          "sequenceOrder": 2,
          "metadata": {
            "question": "Statement to evaluate as true or false",
            "type": "true_false",
            "answer": "true",
            "explanation": "Why this statement is true/false",
            "points": 1,
            "difficulty": "easy",
            "skills": ["comprehension"],
            "timeEstimate": "1 minute",
            "category": "fundamentals"
          }
        }
      ]
    },
    {
      "id": "2",
      "type": "category",
      "name": "Advanced {topic} Concepts",
      "level": 1,
      "sequenceOrder": 1,
      "metadata": {
        "name": "Advanced Concepts",
        "weight": 60,
        "description": "Complex applications and analysis",
        "difficulty": "medium to hard",
        "skills": ["analysis", "synthesis", "evaluation"],
        "learningObjectives": ["objective 3", "objective 4"],
        "timeEstimate": "30 minutes",
        "questionCount": 5
      },
      "elements": [
        "... more questions following same pattern ..."
      ]
    }
  ]
}

IMPORTANT:
- Create EXACTLY {granularity} categories
- Each category MUST have 3-5 questions
- Fill EVERY metadata field with meaningful content
- Use consistent, proper spelling
- Ensure logical difficulty progression
- Total structure should have 10-20 elements minimum'
WHERE template_name = 'quiz_assessment_standard';

-- Update Course Template for better quality
UPDATE granulation_templates 
SET generic_prompt = 'You are an expert curriculum designer. Create a comprehensive hierarchical course structure.

CRITICAL REQUIREMENTS:
1. Topic: "{topic}"
2. Audience: {audience}
3. Create EXACTLY {granularity} modules (level 1)
4. Each module MUST have 3-5 lessons (level 2)
5. Each lesson MUST have 2-4 activities (level 3)
6. Fill ALL metadata fields completely

REQUIRED JSON STRUCTURE:
{
  "type": "course",
  "version": "1.0",
  "metadata": {
    "title": "Complete {topic} Course",
    "description": "A comprehensive course covering all aspects of {topic} designed for {audience}",
    "duration": "8 weeks",
    "targetAudience": "{audience}",
    "prerequisites": ["prerequisite 1", "prerequisite 2"],
    "objectives": [
      "Master fundamental concepts",
      "Apply knowledge in practical scenarios",
      "Build real-world projects"
    ],
    "level": "beginner/intermediate/advanced",
    "format": "self-paced online",
    "assessmentStrategy": "continuous assessment with projects",
    "certificateAvailable": true,
    "estimatedHours": 40,
    "skills": ["skill 1", "skill 2", "skill 3"]
  },
  "elements": [
    {
      "id": "1",
      "type": "module",
      "name": "Module 1: Introduction to {topic}",
      "level": 1,
      "sequenceOrder": 0,
      "metadata": {
        "title": "Introduction to {topic}",
        "description": "Foundation concepts and principles",
        "duration": "2 weeks",
        "objectives": [
          "Understand basic concepts",
          "Learn fundamental principles",
          "Apply basic techniques"
        ],
        "prerequisites": ["Basic computer skills"],
        "assessmentType": "quiz and practical project",
        "weight": "25%",
        "estimatedHours": 10,
        "difficulty": "beginner",
        "resources": ["textbook chapter 1", "video lectures", "practice exercises"]
      },
      "elements": [
        {
          "id": "1.1",
          "type": "lesson",
          "name": "Lesson 1: Getting Started",
          "level": 2,
          "sequenceOrder": 0,
          "metadata": {
            "title": "Getting Started with {topic}",
            "content": "Introduction to key concepts, terminology, and setup",
            "duration": "3 hours",
            "objectives": [
              "Define key terms",
              "Set up environment",
              "Run first example"
            ],
            "materials": ["slides", "setup guide", "glossary"],
            "videoUrl": "placeholder-url",
            "readingTime": "30 minutes",
            "practiceTime": "2 hours",
            "difficulty": "easy",
            "keywords": ["introduction", "basics", "setup"]
          },
          "elements": [
            {
              "id": "1.1.1",
              "type": "activity",
              "name": "Video Lecture: Introduction",
              "level": 3,
              "sequenceOrder": 0,
              "metadata": {
                "type": "video",
                "description": "Watch introductory video covering key concepts",
                "duration": "20 minutes",
                "instructions": [
                  "Watch the video",
                  "Take notes on key terms",
                  "Prepare questions"
                ],
                "resources": ["video link", "transcript"],
                "interactive": false,
                "required": true,
                "points": 5
              }
            },
            {
              "id": "1.1.2",
              "type": "activity",
              "name": "Hands-on Exercise: Setup",
              "level": 3,
              "sequenceOrder": 1,
              "metadata": {
                "type": "exercise",
                "description": "Complete environment setup and run hello world",
                "duration": "45 minutes",
                "instructions": [
                  "Install required software",
                  "Configure environment",
                  "Run test program"
                ],
                "resources": ["setup guide", "troubleshooting FAQ"],
                "interactive": true,
                "required": true,
                "points": 10,
                "submissionType": "screenshot"
              }
            },
            {
              "id": "1.1.3",
              "type": "activity",
              "name": "Quiz: Basic Concepts",
              "level": 3,
              "sequenceOrder": 2,
              "metadata": {
                "type": "quiz",
                "description": "Test understanding of basic concepts",
                "duration": "15 minutes",
                "questions": 10,
                "passingScore": 70,
                "attempts": 3,
                "required": true,
                "points": 15
              }
            }
          ]
        },
        {
          "id": "1.2",
          "type": "lesson",
          "name": "Lesson 2: Core Principles",
          "level": 2,
          "sequenceOrder": 1,
          "metadata": {
            "title": "Core Principles",
            "content": "Deep dive into fundamental principles",
            "duration": "3 hours",
            "objectives": ["Understand principles", "Apply in examples"],
            "materials": ["textbook chapter 2", "code examples"],
            "difficulty": "medium"
          },
          "elements": [
            "... more activities ..."
          ]
        }
      ]
    },
    {
      "id": "2",
      "type": "module",
      "name": "Module 2: Intermediate Concepts",
      "level": 1,
      "sequenceOrder": 1,
      "metadata": {
        "title": "Intermediate Concepts",
        "description": "Building on foundations",
        "duration": "2 weeks",
        "... complete metadata ..."
      },
      "elements": [
        "... more lessons with activities ..."
      ]
    }
  ]
}

IMPORTANT:
- Create EXACTLY {granularity} modules
- Each module MUST have 3-5 lessons
- Each lesson MUST have 2-4 activities
- Fill EVERY metadata field with meaningful content
- Ensure logical progression
- Total structure should have 20-40 elements minimum
- Use consistent terminology throughout'
WHERE template_name = 'educational_course_basic';

-- Update Novel Template
UPDATE granulation_templates 
SET generic_prompt = 'You are an expert story structure consultant. Create a detailed hierarchical novel outline.

CRITICAL REQUIREMENTS:
1. Story concept: "{topic}"
2. Target readers: {audience}
3. Create EXACTLY 3 acts (level 1)
4. Each act MUST have 4-8 chapters (level 2)
5. Each chapter MUST have 2-4 scenes (level 3)
6. Fill ALL metadata fields

REQUIRED JSON STRUCTURE:
{
  "type": "novel",
  "version": "1.0",
  "metadata": {
    "title": "{topic} - A Novel",
    "description": "Complete novel outline for {topic}",
    "genre": "primary genre",
    "subgenre": "subgenre",
    "targetAudience": "{audience}",
    "targetWordCount": 80000,
    "premise": "One-sentence premise",
    "themes": ["theme 1", "theme 2", "theme 3"],
    "tone": "overall tone",
    "setting": "time and place",
    "pointOfView": "third person limited",
    "tense": "past tense"
  },
  "elements": [
    {
      "id": "1",
      "type": "act",
      "name": "Act 1: Setup",
      "level": 1,
      "sequenceOrder": 0,
      "metadata": {
        "title": "Act 1: Setup",
        "purpose": "Introduce world, characters, and conflict",
        "summary": "Detailed act summary",
        "themes": ["introduction", "world-building"],
        "tension": "rising",
        "wordCount": 20000,
        "chapters": 6,
        "keyEvents": ["inciting incident", "first plot point"],
        "characterArcs": ["protagonist introduction", "stakes established"]
      },
      "elements": [
        {
          "id": "1.1",
          "type": "chapter",
          "name": "Chapter 1: Opening",
          "level": 2,
          "sequenceOrder": 0,
          "metadata": {
            "title": "Opening Hook",
            "summary": "Chapter summary with key events",
            "purpose": "Hook reader and introduce protagonist",
            "pov": "protagonist",
            "setting": "specific location",
            "mood": "mysterious",
            "wordCount": 3500,
            "scenes": 3,
            "characters": ["protagonist", "mentor"],
            "conflicts": ["internal doubt", "external threat"]
          },
          "elements": [
            {
              "id": "1.1.1",
              "type": "scene",
              "name": "Opening Scene",
              "level": 3,
              "sequenceOrder": 0,
              "metadata": {
                "description": "Detailed scene description",
                "purpose": "Hook with action or intrigue",
                "setting": "specific location and time",
                "characters": ["protagonist"],
                "conflict": "immediate problem",
                "outcome": "cliffhanger or question",
                "mood": "tense",
                "wordCount": 1200,
                "sensoryDetails": ["sight", "sound", "touch"],
                "dialogue": "key dialogue points"
              }
            }
          ]
        }
      ]
    }
  ]
}

Create complete three-act structure with 20-30 total scenes.'
WHERE template_name = 'three_act_novel';

-- Update Workflow Template
UPDATE granulation_templates 
SET generic_prompt = 'You are an expert business process analyst. Create a detailed hierarchical workflow.

CRITICAL REQUIREMENTS:
1. Process: "{topic}"
2. Users: {audience}
3. Create EXACTLY {granularity} phases (level 1)
4. Each phase MUST have 3-6 steps (level 2)
5. Each step MUST have 2-4 tasks (level 3)
6. Fill ALL metadata fields

REQUIRED JSON STRUCTURE:
{
  "type": "workflow",
  "version": "1.0",
  "metadata": {
    "title": "{topic} Workflow",
    "purpose": "Complete workflow for {topic}",
    "scope": "Full process from start to finish",
    "duration": "estimated total time",
    "stakeholders": ["role 1", "role 2", "role 3"],
    "resources": ["resource 1", "resource 2"],
    "tools": ["tool 1", "tool 2"],
    "compliance": ["standard 1", "regulation 1"],
    "kpis": ["efficiency", "quality", "speed"]
  },
  "elements": [
    {
      "id": "1",
      "type": "phase",
      "name": "Phase 1: Initiation",
      "level": 1,
      "sequenceOrder": 0,
      "metadata": {
        "name": "Initiation",
        "objective": "Start and plan the process",
        "duration": "1-2 days",
        "dependencies": [],
        "deliverables": ["project charter", "stakeholder list"],
        "responsible": "project manager",
        "approvals": ["sponsor approval"],
        "risks": ["unclear requirements"],
        "gates": ["approval gate"],
        "metrics": ["time to approval"]
      },
      "elements": [
        {
          "id": "1.1",
          "type": "step",
          "name": "Requirements Gathering",
          "level": 2,
          "sequenceOrder": 0,
          "metadata": {
            "name": "Gather Requirements",
            "description": "Collect and document all requirements",
            "responsible": "business analyst",
            "inputs": ["initial request", "business case"],
            "outputs": ["requirements document"],
            "tools": ["requirements tool", "templates"],
            "duration": "4 hours",
            "skills": ["analysis", "communication"],
            "checkpoints": ["review with stakeholders"]
          },
          "elements": [
            {
              "id": "1.1.1",
              "type": "task",
              "name": "Interview Stakeholders",
              "level": 3,
              "sequenceOrder": 0,
              "metadata": {
                "name": "Stakeholder Interviews",
                "description": "Conduct interviews to gather requirements",
                "duration": "2 hours",
                "priority": "high",
                "assignee": "business analyst",
                "instructions": ["prepare questions", "schedule meetings", "document responses"],
                "deliverable": "interview notes",
                "tools": ["interview template"],
                "completed": false
              }
            }
          ]
        }
      ]
    }
  ]
}

Create complete workflow with all phases, steps, and tasks fully detailed.'
WHERE template_name = 'business_process_standard';