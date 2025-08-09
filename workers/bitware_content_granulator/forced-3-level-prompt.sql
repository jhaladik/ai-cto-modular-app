UPDATE granulation_templates 
SET generic_prompt = 'Generate a 3-level hierarchical structure for: "{topic}"
Audience: {audience}

CRITICAL: You MUST generate EXACTLY 3 levels of hierarchy!

Level 1: {granularity} main sections
Level 2: 5-6 subsections per main section  
Level 3: 2-3 items per subsection

REQUIRED JSON FORMAT:
{
  "type": "{structureType}",
  "version": "2.0",
  "metadata": {
    "title": "[Title]",
    "description": "[Description]",
    "targetAudience": "{audience}"
  },
  "objects": {
    "characters": [
      {"id": "char_1", "name": "[Name]", "role": "[Role]"}
    ],
    "locations": [
      {"id": "loc_1", "name": "[Location]", "description": "[Description]"}
    ]
  },
  "elements": [
    {
      "id": "1",
      "type": "section",
      "name": "Section 1 Name",
      "level": 1,
      "sequenceOrder": 0,
      "metadata": {"summary": "[Summary]"},
      "elements": [
        {
          "id": "1.1",
          "type": "subsection",
          "name": "Subsection 1.1 Name",
          "level": 2,
          "sequenceOrder": 0,
          "metadata": {"summary": "[Summary]"},
          "elements": [
            {
              "id": "1.1.1",
              "type": "item",
              "name": "Item 1.1.1 Name",
              "level": 3,
              "sequenceOrder": 0,
              "metadata": {"description": "[Description]"}
            },
            {
              "id": "1.1.2",
              "type": "item",
              "name": "Item 1.1.2 Name",
              "level": 3,
              "sequenceOrder": 1,
              "metadata": {"description": "[Description]"}
            }
          ]
        },
        {
          "id": "1.2",
          "type": "subsection",
          "name": "Subsection 1.2 Name",
          "level": 2,
          "sequenceOrder": 1,
          "metadata": {"summary": "[Summary]"},
          "elements": [
            {
              "id": "1.2.1",
              "type": "item",
              "name": "Item 1.2.1 Name",
              "level": 3,
              "sequenceOrder": 0,
              "metadata": {"description": "[Description]"}
            }
          ]
        }
      ]
    }
  ]
}

CRITICAL RULES:
1. EVERY level 1 element MUST contain level 2 elements
2. EVERY level 2 element MUST contain level 3 elements
3. NO element can be empty - all must have "elements" array with children
4. Generate COMPLETE structure - no placeholders
5. Total should be ~50 elements across all 3 levels

Now generate the COMPLETE 3-level structure for "{topic}".'
WHERE template_name = 'three_act_novel';