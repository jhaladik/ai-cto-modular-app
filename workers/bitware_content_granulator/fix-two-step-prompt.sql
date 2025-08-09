-- Fix Step 2 prompt to be more explicit about using Step 1 content
UPDATE granulation_templates 
SET step2_prompt = 'STEP 2: STRUCTURE TRANSFORMATION

CRITICAL INSTRUCTIONS:
1. You MUST use the creative content from Step 1 (provided below)
2. DO NOT generate new content - ONLY organize what Step 1 provided
3. Extract ALL characters, locations, concepts from Step 1
4. Map the acts/chapters/scenes described in Step 1 to the structure

Transform Step 1 content into this EXACT JSON structure:

{
  "type": "{structureType}",
  "version": "2.0",
  "metadata": {
    "title": "[Extract from Step 1 content]",
    "description": "[Extract from Step 1 content]",
    "targetAudience": "{audience}",
    "typeSpecific": {
      "genre": "[Extract from Step 1]",
      "setting": "[Extract from Step 1]",
      "themes": ["[Extract from Step 1]"]
    }
  },
  "objects": {
    "provided": {userObjects},
    "generated": {
      "actors": [
        // Extract ALL characters mentioned in Step 1
        {"id": "actor_1", "name": "[from Step 1]", "role": "[from Step 1]", "description": "[from Step 1]"}
      ],
      "locations": [
        // Extract ALL locations mentioned in Step 1
        {"id": "loc_1", "name": "[from Step 1]", "description": "[from Step 1]"}
      ],
      "concepts": [
        // Extract ALL themes/concepts from Step 1
        {"id": "concept_1", "name": "[from Step 1]", "importance": "core|supporting"}
      ],
      "resources": [
        // Extract any items/tools/documents from Step 1
        {"id": "resource_1", "name": "[from Step 1]", "type": "[type]"}
      ]
    }
  },
  "elements": [
    // MUST have exactly 3 acts (level 1)
    {
      "id": "1",
      "type": "act",
      "name": "[Act title from Step 1]",
      "level": 1,
      "sequenceOrder": 0,
      "metadata": {
        "summary": "[Act summary from Step 1]",
        "objects": {
          "featured": ["[actor/location IDs that appear]"]
        }
      },
      "elements": [
        // MUST have 5-7 chapters per act (level 2)
        {
          "id": "1.1",
          "type": "chapter",
          "name": "[Chapter title from Step 1]",
          "level": 2,
          "sequenceOrder": 0,
          "metadata": {
            "summary": "[Chapter summary from Step 1]"
          },
          "elements": [
            // MUST have 2-4 scenes per chapter (level 3)
            {
              "id": "1.1.1",
              "type": "scene",
              "name": "[Scene title from Step 1]",
              "level": 3,
              "sequenceOrder": 0,
              "metadata": {
                "description": "[Scene description from Step 1]",
                "objects": {
                  "actors": ["[actor IDs in this scene]"],
                  "location": "[location ID]"
                }
              }
            }
          ]
        }
      ]
    }
  ]
}

REMEMBER:
- Use ONLY content from Step 1 below
- Include ALL user-provided objects
- Create EXACTLY 3 levels (acts -> chapters -> scenes)
- Every chapter MUST have scenes

===== CONTENT FROM STEP 1 =====
'
WHERE template_name = 'three_act_novel';

-- Also update Step 1 to be more structured
UPDATE granulation_templates 
SET step1_prompt = 'STEP 1: CREATIVE CONTENT GENERATION

Create a detailed story outline for: "{topic}"
Type: Novel
Audience: {audience}

IMPORTANT: Your outline MUST include the following user-provided objects:
{userObjects}

Generate a comprehensive narrative outline with:

1. STORY OVERVIEW:
   - Title: [creative title]
   - Genre: [specific genre]
   - Setting: [time and place]
   - Main themes: [3-5 themes]
   - Core conflict: [central conflict]

2. CHARACTERS (minimum 6, MUST include user-provided):
   For each character provide:
   - Name: [full name]
   - Role: [protagonist/antagonist/supporting]
   - Description: [physical and personality]
   - Arc: [character development]
   - Key relationships: [with other characters]

3. LOCATIONS (minimum 5):
   For each location provide:
   - Name: [location name]
   - Description: [detailed description]
   - Atmosphere: [mood/feeling]
   - Significance: [why it matters to the story]

4. THREE-ACT STRUCTURE:
   
   ACT 1 - SETUP (Act title):
   [Overall act description]
   
   Chapter 1: [Chapter title]
   - Summary: [what happens]
   - Characters: [who appears]
   - Location: [where it takes place]
   - Scene 1: [scene description]
   - Scene 2: [scene description]
   - Scene 3: [scene description]
   
   Chapter 2-5: [Follow same format]
   
   ACT 2 - CONFRONTATION (Act title):
   [Overall act description]
   
   Chapter 6-12: [Follow same format with 2-4 scenes each]
   
   ACT 3 - RESOLUTION (Act title):
   [Overall act description]
   
   Chapter 13-17: [Follow same format with 2-4 scenes each]

5. KEY CONCEPTS/THEMES:
   - [Theme 1]: [how it''s explored]
   - [Theme 2]: [how it''s explored]
   - [Theme 3]: [how it''s explored]

6. IMPORTANT ITEMS/RESOURCES:
   - [Item 1]: [description and significance]
   - [Item 2]: [description and significance]

Be creative and detailed! This outline will be transformed into a structured format in Step 2.'
WHERE template_name = 'three_act_novel';