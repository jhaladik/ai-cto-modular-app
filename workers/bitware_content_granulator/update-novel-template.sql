UPDATE granulation_templates 
SET generic_prompt = 'You are an expert story structure consultant. Create a detailed hierarchical novel outline with rich world-building elements.

CRITICAL REQUIREMENTS:
1. Story concept: "{topic}"
2. Target readers: {audience}
3. Create EXACTLY 3 acts (level 1)
4. Each act MUST have 5-7 chapters (level 2)
5. Each chapter MUST have 2-3 scenes (level 3)
6. Include comprehensive objects for world-building
7. Use proper name fields for all elements

REQUIRED EXACT JSON STRUCTURE - GENERATE COMPLETE STRUCTURE WITH ALL DETAILS:
{
  "type": "novel",
  "version": "1.0",
  "metadata": {
    "title": "[Create compelling title for story]",
    "description": "[Detailed description of the novel story]",
    "genre": "[Primary genre]",
    "subgenre": "[Subgenre]",
    "targetAudience": "{audience}",
    "targetWordCount": 80000,
    "premise": "[One-sentence hook that captures the essence]",
    "themes": ["theme1", "theme2", "theme3"],
    "tone": "[Overall tone: dark, mysterious, thrilling, etc.]",
    "setting": {
      "time": "[Historical period or timeframe]",
      "place": "[Primary location]",
      "atmosphere": "[Overall atmosphere]"
    },
    "pointOfView": "[third person limited/omniscient/first person]",
    "tense": "[past/present]"
  },
  "objects": {
    "characters": [
      {
        "id": "char_1",
        "name": "[Character full name]",
        "role": "protagonist/antagonist/supporting",
        "description": "[Physical and personality description]",
        "backstory": "[Brief backstory]",
        "motivation": "[What drives them]",
        "arc": "[How they change through the story]",
        "relationships": ["[Connections to other characters]"]
      }
    ],
    "locations": [
      {
        "id": "loc_1",
        "name": "[Location name]",
        "type": "city/building/room/outdoor",
        "description": "[Detailed description]",
        "significance": "[Why this location matters]",
        "atmosphere": "[Mood and feeling of the place]",
        "associatedEvents": ["[Key events that happen here]"]
      }
    ],
    "plotDevices": [
      {
        "id": "device_1",
        "name": "[Name of object/document/clue]",
        "type": "object/document/weapon/clue",
        "description": "[What it is]",
        "significance": "[Role in the plot]",
        "discovery": "[When/how it is discovered]",
        "impact": "[How it affects the story]"
      }
    ],
    "timeline": [
      {
        "id": "event_1",
        "name": "[Event name]",
        "timing": "[When in the story]",
        "description": "[What happens]",
        "participants": ["char_1", "char_2"],
        "location": "loc_1",
        "impact": "[Consequences of this event]"
      }
    ]
  },
  "elements": [
    {
      "id": "1",
      "type": "act",
      "name": "Act 1: [Descriptive Act Title]",
      "level": 1,
      "sequenceOrder": 0,
      "metadata": {
        "title": "Act 1: [Title]",
        "purpose": "[Setup/Confrontation/Resolution]",
        "summary": "[Detailed act summary paragraph]",
        "themes": ["theme1", "theme2"],
        "tension": "rising/steady/explosive",
        "wordCount": 20000,
        "percentOfStory": 25,
        "keyEvents": ["event1", "event2"],
        "characterFocus": ["char_1", "char_2"],
        "locationFocus": ["loc_1", "loc_2"],
        "emotionalTone": "[Dominant emotional tone]"
      },
      "elements": [
        {
          "id": "1.1",
          "type": "chapter",
          "name": "Chapter 1: [Chapter Title]",
          "level": 2,
          "sequenceOrder": 0,
          "metadata": {
            "title": "[Chapter Title]",
            "summary": "[What happens in this chapter]",
            "purpose": "[Why this chapter exists]",
            "povCharacter": "char_1",
            "setting": "loc_1",
            "timeOfDay": "[morning/afternoon/evening/night]",
            "mood": "[mysterious/tense/romantic/action-packed]",
            "wordCount": 3500,
            "charactersPresent": ["char_1", "char_2"],
            "plotDevicesUsed": ["device_1"],
            "conflicts": ["internal conflict", "external conflict"],
            "chapterHook": "[Cliffhanger or compelling ending]"
          },
          "elements": [
            {
              "id": "1.1.1",
              "type": "scene",
              "name": "Scene 1: [Scene Title]",
              "level": 3,
              "sequenceOrder": 0,
              "metadata": {
                "title": "[Scene Title]",
                "description": "[Detailed scene description]",
                "purpose": "[What this scene accomplishes]",
                "setting": "loc_1",
                "timeOfDay": "[specific time]",
                "charactersPresent": ["char_1", "char_2"],
                "conflict": "[Central conflict of the scene]",
                "outcome": "[How the scene resolves]",
                "mood": "[Scene atmosphere]",
                "wordCount": 1200,
                "sensoryDetails": ["sight", "sound", "smell", "touch", "taste"],
                "dialogueNotes": "[Key dialogue points or style]",
                "actionBeats": ["[Key action 1]", "[Key action 2]"],
                "emotionalBeats": ["[Emotional moment 1]", "[Emotional moment 2]"],
                "foreshadowing": "[What this scene hints at]",
                "callbacks": "[References to earlier events]"
              }
            }
          ]
        }
      ]
    }
  ]
}

CRITICAL: Generate the COMPLETE structure with:
- 3 acts
- 5-7 chapters per act (total 15-21 chapters)
- 2-3 scenes per chapter (total 30-60 scenes)
- At least 5 detailed characters
- At least 8 locations
- At least 5 plot devices
- Complete metadata for every element
- NO PLACEHOLDERS or ellipsis (...)
- All elements must have proper "name" fields
- Reference objects by IDs in metadata'
WHERE template_name = 'three_act_novel';