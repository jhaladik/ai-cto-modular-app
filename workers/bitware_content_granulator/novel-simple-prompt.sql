UPDATE granulation_templates 
SET generic_prompt = 'Generate a complete novel structure as valid JSON for: "{topic}"
Target audience: {audience}

STEP 1 - Create this EXACT JSON structure:

{
  "type": "novel",
  "version": "1.0",
  "metadata": {
    "title": "[Novel title here]",
    "description": "[One paragraph description]",
    "genre": "[Genre]",
    "targetAudience": "{audience}",
    "premise": "[One sentence premise]",
    "themes": ["theme1", "theme2", "theme3"]
  },
  "objects": {
    "characters": [
      {"id": "char_1", "name": "[Name]", "role": "protagonist", "description": "[Description]"},
      {"id": "char_2", "name": "[Name]", "role": "antagonist", "description": "[Description]"},
      {"id": "char_3", "name": "[Name]", "role": "supporting", "description": "[Description]"}
    ],
    "locations": [
      {"id": "loc_1", "name": "[Location]", "type": "primary", "description": "[Description]"},
      {"id": "loc_2", "name": "[Location]", "type": "secondary", "description": "[Description]"}
    ]
  },
  "elements": [
    {
      "id": "1",
      "type": "act",
      "name": "Act 1: [Title]",
      "level": 1,
      "sequenceOrder": 0,
      "metadata": {
        "title": "Act 1: [Title]",
        "purpose": "Setup",
        "summary": "[Act summary]"
      },
      "elements": [
        {
          "id": "1.1",
          "type": "chapter", 
          "name": "Chapter 1: [Title]",
          "level": 2,
          "sequenceOrder": 0,
          "metadata": {
            "title": "Chapter 1: [Title]",
            "summary": "[Chapter summary]",
            "povCharacter": "char_1",
            "setting": "loc_1"
          },
          "elements": [
            {
              "id": "1.1.1",
              "type": "scene",
              "name": "Scene 1: [Title]",
              "level": 3,
              "sequenceOrder": 0,
              "metadata": {
                "description": "[What happens in this scene]",
                "characters": ["char_1", "char_2"],
                "location": "loc_1",
                "purpose": "[Scene purpose]"
              }
            },
            {
              "id": "1.1.2",
              "type": "scene",
              "name": "Scene 2: [Title]",
              "level": 3,
              "sequenceOrder": 1,
              "metadata": {
                "description": "[What happens]",
                "characters": ["char_1"],
                "location": "loc_1"
              }
            }
          ]
        },
        {
          "id": "1.2",
          "type": "chapter",
          "name": "Chapter 2: [Title]",
          "level": 2,
          "sequenceOrder": 1,
          "metadata": {
            "title": "Chapter 2: [Title]",
            "summary": "[Summary]"
          },
          "elements": [
            {
              "id": "1.2.1",
              "type": "scene",
              "name": "Scene 1: [Title]",
              "level": 3,
              "sequenceOrder": 0,
              "metadata": {
                "description": "[Scene description]"
              }
            }
          ]
        }
      ]
    },
    {
      "id": "2",
      "type": "act",
      "name": "Act 2: [Title]",
      "level": 1,
      "sequenceOrder": 1,
      "metadata": {
        "title": "Act 2: [Title]",
        "purpose": "Confrontation",
        "summary": "[Act summary]"
      },
      "elements": [
        "[... more chapters with scenes ...]"
      ]
    },
    {
      "id": "3",
      "type": "act",
      "name": "Act 3: [Title]",
      "level": 1,
      "sequenceOrder": 2,
      "metadata": {
        "title": "Act 3: [Title]",
        "purpose": "Resolution",
        "summary": "[Act summary]"
      },
      "elements": [
        "[... more chapters with scenes ...]"
      ]
    }
  ]
}

STEP 2 - REQUIREMENTS:
- Create EXACTLY 3 acts
- Each act MUST have 5-6 chapters
- Each chapter MUST have 2-3 scenes
- Total: ~45 scenes across the novel
- Every element MUST have "name", "type", "level", "id", "sequenceOrder", "metadata"
- Scenes are level 3 and MUST be inside chapters

STEP 3 - Fill in ALL placeholders [like this] with actual content for "{topic}"

CRITICAL: Generate COMPLETE structure with ALL scenes. No placeholders!'
WHERE template_name = 'three_act_novel';