-- Fix the course template prompt to specify exact JSON structure

UPDATE granulation_templates 
SET ai_prompt_template = 'Create a comprehensive course structure for "{topic}" targeting {audience}. 

Return a JSON object with EXACTLY this structure:
{
  "courseOverview": {
    "title": "Course title",
    "description": "Brief description",
    "duration": "Total duration (e.g., 8 weeks)",
    "prerequisites": ["prerequisite 1", "prerequisite 2"]
  },
  "modules": [
    {
      "title": "Module title",
      "estimatedDuration": "Duration (e.g., 1 week)",
      "learningObjectives": ["objective 1", "objective 2"],
      "lessons": [
        {
          "title": "Lesson title",
          "contentOutline": "Detailed outline of lesson content",
          "learningObjectives": ["lesson objective 1", "lesson objective 2"],
          "practicalExercises": ["exercise 1", "exercise 2"],
          "assessmentPoints": ["assessment 1", "assessment 2"]
        }
      ],
      "assessment": {
        "type": "quiz/assignment/project",
        "description": "Assessment description",
        "weight": "Percentage of total grade"
      }
    }
  ]
}

Generate {granularity} modules with logical progression from basic to advanced concepts. Each module should contain 2-4 lessons.'
WHERE template_name = 'educational_course_basic';

-- Fix quiz template
UPDATE granulation_templates 
SET ai_prompt_template = 'Design a quiz structure for assessing knowledge of "{topic}" for {audience}.

Return a JSON object with EXACTLY this structure:
{
  "quizOverview": {
    "title": "Quiz title",
    "description": "Brief description",
    "totalQuestions": 25,
    "timeLimit": "60 minutes",
    "passingScore": 70
  },
  "categories": [
    {
      "name": "Category name",
      "description": "What this category tests",
      "questionCount": 8,
      "questions": [
        {
          "difficulty": "easy/medium/hard",
          "type": "multiple_choice/true_false/essay",
          "points": 5
        }
      ]
    }
  ]
}

Create {granularity} categories with questions of varying difficulty (40% easy, 45% medium, 15% hard).'
WHERE template_name = 'quiz_assessment_standard';

-- Fix novel template
UPDATE granulation_templates 
SET ai_prompt_template = 'Develop a novel outline for a story about "{topic}" aimed at {audience}.

Return a JSON object with EXACTLY this structure:
{
  "novelOverview": {
    "title": "Novel title",
    "genre": "Genre",
    "targetLength": "80000 words",
    "themes": ["theme 1", "theme 2"]
  },
  "acts": [
    {
      "actNumber": 1,
      "title": "Act title",
      "purpose": "setup/confrontation/resolution",
      "chapters": [
        {
          "chapterNumber": 1,
          "title": "Chapter title",
          "summary": "What happens in this chapter",
          "plotPoints": ["key event 1", "key event 2"],
          "characterDevelopment": ["character growth point"]
        }
      ]
    }
  ],
  "characters": {
    "protagonist": {
      "name": "Character name",
      "arc": "Character journey description"
    },
    "supporting": [
      {
        "name": "Character name",
        "role": "Role in story"
      }
    ]
  }
}

Create a three-act structure with Act 1: 6 chapters (setup), Act 2: 12 chapters (confrontation), Act 3: 6 chapters (resolution).'
WHERE template_name = 'three_act_novel';

-- Fix workflow template
UPDATE granulation_templates 
SET ai_prompt_template = 'Design a workflow structure for "{topic}" suitable for {audience}.

Return a JSON object with EXACTLY this structure:
{
  "workflowOverview": {
    "title": "Workflow title",
    "description": "Brief description",
    "estimatedDuration": "Total time",
    "requiredResources": ["resource 1", "resource 2"]
  },
  "phases": [
    {
      "name": "Phase name",
      "purpose": "What this phase accomplishes",
      "steps": [
        {
          "stepNumber": 1,
          "title": "Step title",
          "description": "Detailed step description",
          "estimatedTime": "30 minutes",
          "requiredResources": ["resource 1"],
          "dependencies": ["previous step"],
          "decisionPoint": false
        }
      ],
      "qualityGate": {
        "criteria": ["criterion 1", "criterion 2"],
        "approver": "Role/person"
      }
    }
  ]
}

Create {granularity} phases (initiation, execution, completion) with detailed steps, decision points, and quality gates.'
WHERE template_name = 'business_process_standard';