-- Two-Step Content Generation System

-- Step 1: Creative Generation Prompt (gets the rich content)
UPDATE granulation_templates 
SET generic_prompt = 'STEP 1: CREATIVE CONTENT GENERATION

Create comprehensive content plan for: "{topic}"
Type: {structureType}
Audience: {audience}

Generate a detailed outline including:

1. OBJECTS/ENTITIES (minimum requirements):
   - 6+ main characters/people/speakers with full details
   - 5+ locations/settings with atmosphere
   - 5+ key concepts/themes/topics
   - 4+ important items/resources/references
   
2. STRUCTURE OUTLINE:
   - {granularity} main parts/acts/modules
   - 5-7 chapters/episodes/sections per main part
   - 2-4 scenes/segments/activities per chapter
   
3. For each structural element include:
   - Clear title and purpose
   - Which objects appear/are referenced
   - Key events or content
   - Connections to other elements

Format your response as a comprehensive narrative outline, not JSON. Be creative and detailed!

USER PROVIDED OBJECTS (must include):
{userObjects}

Now create the full content plan for "{topic}".',

ai_prompt_template = 'STEP 2: STRUCTURE TRANSFORMATION

Take the creative content from Step 1 and transform it into this EXACT JSON structure:

{
  "type": "{structureType}",
  "version": "2.0",
  "metadata": {
    "title": "[from content]",
    "description": "[from content]",
    "targetAudience": "{audience}"
  },
  "objects": {
    "actors": [
      {"id": "actor_1", "name": "[name]", "role": "[role]", "description": "[desc]"}
    ],
    "locations": [
      {"id": "loc_1", "name": "[name]", "description": "[desc]"}
    ],
    "concepts": [
      {"id": "concept_1", "name": "[name]", "importance": "[level]"}
    ],
    "resources": [
      {"id": "resource_1", "name": "[name]", "type": "[type]"}
    ]
  },
  "elements": [
    {
      "id": "1",
      "type": "[level1type]",
      "name": "[from content]",
      "level": 1,
      "sequenceOrder": 0,
      "metadata": {
        "summary": "[from content]",
        "objects": {
          "featured": ["actor_1", "loc_1"]
        }
      },
      "elements": [
        {
          "id": "1.1",
          "type": "[level2type]",
          "name": "[from content]",
          "level": 2,
          "sequenceOrder": 0,
          "metadata": {
            "summary": "[from content]",
            "objects": {
              "actors": ["actor_1"],
              "location": "loc_1"
            }
          },
          "elements": [
            {
              "id": "1.1.1",
              "type": "[level3type]",
              "name": "[from content]",
              "level": 3,
              "sequenceOrder": 0,
              "metadata": {
                "description": "[from content]",
                "objects": {
                  "actors": ["actor_1"],
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

CRITICAL: 
- Create 3 levels of hierarchy
- Every level 2 MUST have level 3 children
- Include ALL objects from Step 1
- Reference objects by ID throughout'
WHERE template_name = 'three_act_novel';

-- Add a new field to track two-step processing
ALTER TABLE granulation_templates ADD COLUMN IF NOT EXISTS use_two_step BOOLEAN DEFAULT true;
ALTER TABLE granulation_templates ADD COLUMN IF NOT EXISTS step1_prompt TEXT;
ALTER TABLE granulation_templates ADD COLUMN IF NOT EXISTS step2_prompt TEXT;

-- Set the two-step prompts
UPDATE granulation_templates 
SET use_two_step = true,
    step1_prompt = generic_prompt,
    step2_prompt = ai_prompt_template
WHERE template_name = 'three_act_novel';