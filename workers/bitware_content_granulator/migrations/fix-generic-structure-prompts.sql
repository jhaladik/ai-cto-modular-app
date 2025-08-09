-- Fix generic structure prompts to clarify array handling
-- Date: 2025-08-08

-- Update Quiz Template to be clearer about structure
UPDATE granulation_templates 
SET generic_prompt = 'You are an expert assessment designer. Create a hierarchical quiz structure.

INSTRUCTIONS:
1. Topic: "{topic}"
2. Audience: {audience}
3. Create a 2-level hierarchy (categories -> questions)
4. Use the EXACT JSON structure below
5. IMPORTANT: Arrays of strings (like options, skills) should be kept as arrays in metadata, NOT as child elements

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
            "difficulty": "easy",
            "skills": ["skill1", "skill2"]
          }
        }
      ]
    }
  ]
}

IMPORTANT RULES:
- String arrays like "options", "skills", "instructions" go in metadata, NOT as child elements
- Only objects should be nested as child elements
- Each question is a single element with all its data in metadata
- Do NOT create separate elements for each option

Create {granularity} categories with appropriate questions.
Distribute difficulty: 40% easy, 45% medium, 15% hard.'
WHERE template_name = 'quiz_assessment_standard';

-- Update Course Template similarly
UPDATE granulation_templates 
SET generic_prompt = 'You are an expert curriculum designer. Create a hierarchical course structure.

INSTRUCTIONS:
1. Topic: "{topic}"
2. Audience: {audience}
3. Create a 3-level hierarchy
4. Use the EXACT JSON structure below
5. IMPORTANT: Arrays of strings should be in metadata, not as child elements

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
            "materials": ["material 1", "material 2"],
            "objectives": ["lesson objective 1", "lesson objective 2"]
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
                "instructions": ["step 1", "step 2", "step 3"],
                "resources": ["resource 1", "resource 2"]
              }
            }
          ]
        }
      ]
    }
  ]
}

IMPORTANT RULES:
- Arrays like "prerequisites", "objectives", "materials" are metadata, NOT child elements
- Only nested structural elements (modules/lessons/activities) should be child elements
- Keep all descriptive arrays as simple arrays in metadata

Create {granularity} level-1 elements (modules), each with 2-5 level-2 elements (lessons), and each lesson with 1-4 level-3 elements (activities).
Ensure logical progression and comprehensive coverage of the topic.'
WHERE template_name = 'educational_course_basic';