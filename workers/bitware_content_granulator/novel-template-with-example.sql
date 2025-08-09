UPDATE granulation_templates 
SET generic_prompt = 'You are an expert story structure consultant. Create a detailed hierarchical novel outline following the EXACT format shown in the example below.

TASK: Create a complete novel structure for "{topic}" targeting {audience}.

REQUIREMENTS:
- 3 acts total
- 5-6 chapters per act
- 2-3 scenes per chapter
- Include rich objects (characters, locations, items)
- Use the EXACT JSON structure from the example
- Generate COMPLETE content, no placeholders

EXAMPLE STRUCTURE TO FOLLOW:

{
  "type": "novel",
  "version": "1.0",
  "metadata": {
    "title": "Shadows Over Baker Street",
    "description": "A dark mystery unfolds in Victorian London as Detective James Blackwood investigates a series of murders linked to an ancient conspiracy",
    "genre": "Mystery",
    "subgenre": "Historical Detective Fiction",
    "targetAudience": "Adult mystery readers",
    "targetWordCount": 80000,
    "premise": "A brilliant but troubled detective must solve a series of ritualistic murders that threaten to expose the dark underbelly of Victorian high society",
    "themes": ["justice vs revenge", "class struggle", "the price of truth"],
    "tone": "Dark, atmospheric, suspenseful",
    "setting": {
      "time": "1888, Victorian Era",
      "place": "London, England",
      "atmosphere": "Foggy, gaslit streets hiding secrets"
    },
    "pointOfView": "Third person limited",
    "tense": "Past"
  },
  "objects": {
    "characters": [
      {
        "id": "char_blackwood",
        "name": "Detective James Blackwood",
        "role": "protagonist",
        "age": 35,
        "description": "Tall, sharp-featured man with piercing grey eyes and prematurely greying hair",
        "personality": "Brilliant, obsessive, haunted by past failures",
        "backstory": "Former military officer turned detective after a scandal in India",
        "motivation": "Seeking redemption and justice",
        "arc": "From cynical loner to someone who learns to trust again",
        "skills": ["deduction", "combat", "disguise"],
        "relationships": {
          "char_margaret": "complicated attraction",
          "char_hawthorne": "nemesis"
        }
      },
      {
        "id": "char_margaret",
        "name": "Margaret Ashford",
        "role": "supporting",
        "age": 28,
        "description": "Intelligent woman with auburn hair, defying Victorian conventions",
        "personality": "Independent, clever, secretly vulnerable",
        "backstory": "Sister of the first victim, trained as a nurse",
        "motivation": "Find her brother''s killer",
        "arc": "From grieving sister to empowered investigator"
      },
      {
        "id": "char_hawthorne",
        "name": "Lady Victoria Hawthorne",
        "role": "antagonist",
        "age": 42,
        "description": "Elegant aristocrat with cold blue eyes and perfect composure",
        "personality": "Manipulative, ruthless, supremely confident",
        "backstory": "Inherited vast wealth and power, leads a secret society",
        "motivation": "Maintain power and protect ancient secrets",
        "arc": "Gradual reveal of her true nature and past"
      }
    ],
    "locations": [
      {
        "id": "loc_baker_street",
        "name": "Baker Street",
        "type": "street",
        "description": "Busy Victorian street with gas lamps and horse-drawn carriages",
        "significance": "Blackwood''s office location",
        "atmosphere": "Bustling by day, sinister by night",
        "details": {
          "sounds": "Horse hooves on cobblestones, street vendors",
          "smells": "Coal smoke, horse manure, baking bread",
          "sights": "Georgian buildings, gas lamps, fog"
        }
      },
      {
        "id": "loc_crime_scene",
        "name": "Whitechapel Alley",
        "type": "alley",
        "description": "Narrow, dark alley between decrepit buildings",
        "significance": "First murder location",
        "atmosphere": "Oppressive, dangerous",
        "details": {
          "lighting": "Single flickering gas lamp",
          "condition": "Wet cobblestones, peeling walls"
        }
      }
    ],
    "items": [
      {
        "id": "item_cipher",
        "name": "The Babylon Cipher",
        "type": "document",
        "description": "Ancient coded document written in multiple languages",
        "significance": "Key to understanding the murders",
        "discovery": "Found in victim''s possession",
        "properties": {
          "age": "200 years old",
          "material": "Vellum",
          "languages": ["Latin", "Hebrew", "Unknown symbols"]
        }
      },
      {
        "id": "item_ring",
        "name": "Obsidian Signet Ring",
        "type": "jewelry",
        "description": "Black ring with strange engravings",
        "significance": "Mark of the secret society",
        "discovery": "Worn by Lady Hawthorne"
      }
    ]
  },
  "elements": [
    {
      "id": "1",
      "type": "act",
      "name": "Act I: The Shadow Falls",
      "level": 1,
      "sequenceOrder": 0,
      "metadata": {
        "purpose": "Setup and introduction",
        "summary": "Detective Blackwood is called to investigate a bizarre murder in Whitechapel. As he delves deeper, he discovers connections to high society and meets Margaret Ashford, whose brother was the victim. Together they begin uncovering a conspiracy.",
        "themes": ["introduction of mystery", "establishing atmosphere"],
        "tension": "building",
        "targetWordCount": 20000,
        "keyEvents": ["discovery of first body", "meeting Margaret", "finding the cipher"],
        "characterFocus": ["char_blackwood", "char_margaret"],
        "locationFocus": ["loc_baker_street", "loc_crime_scene"]
      },
      "elements": [
        {
          "id": "1.1",
          "type": "chapter",
          "name": "Chapter 1: Blood in the Fog",
          "level": 2,
          "sequenceOrder": 0,
          "metadata": {
            "summary": "Blackwood is summoned to a gruesome crime scene in Whitechapel where he discovers ritualistic elements",
            "povCharacter": "char_blackwood",
            "setting": "loc_crime_scene",
            "timeframe": "Night, 3 AM",
            "mood": "dark and foreboding",
            "targetWordCount": 3500,
            "charactersPresent": ["char_blackwood"],
            "itemsIntroduced": ["item_cipher"],
            "chapterHook": "The victim''s dying message points to something larger"
          },
          "elements": [
            {
              "id": "1.1.1",
              "type": "scene",
              "name": "The Summoning",
              "level": 3,
              "sequenceOrder": 0,
              "metadata": {
                "description": "Blackwood is awakened and summoned to the crime scene",
                "setting": "loc_baker_street",
                "time": "2:30 AM",
                "participants": ["char_blackwood"],
                "mood": "urgent",
                "targetWordCount": 800,
                "purpose": "Establish protagonist and urgency",
                "sensoryDetails": {
                  "sounds": ["pounding on door", "rain on windows"],
                  "sights": ["dark room", "gaslight shadows"],
                  "physical": ["cold air", "fatigue"]
                },
                "dialogueStyle": "terse and urgent",
                "actionBeats": ["waking up", "getting dressed", "grabbing coat and hat"],
                "emotionalArc": "annoyance to concern"
              }
            },
            {
              "id": "1.1.2",
              "type": "scene",
              "name": "The Crime Scene",
              "level": 3,
              "sequenceOrder": 1,
              "metadata": {
                "description": "Blackwood examines the body and discovers disturbing ritualistic elements",
                "setting": "loc_crime_scene",
                "time": "3:00 AM",
                "participants": ["char_blackwood"],
                "mood": "horrific discovery",
                "targetWordCount": 1500,
                "purpose": "Introduce the mystery and its supernatural elements",
                "clues": ["strange symbols", "item_cipher", "positioning of body"],
                "sensoryDetails": {
                  "sights": ["blood patterns", "symbols on walls", "victim''s expression"],
                  "smells": ["blood", "incense", "decay"],
                  "atmosphere": ["fog", "flickering gaslight", "watching shadows"]
                }
              }
            }
          ]
        }
      ]
    }
  ]
}

NOW CREATE A COMPLETE STRUCTURE FOR: "{topic}"
TARGET AUDIENCE: {audience}

Follow the example format EXACTLY but with your own creative content. Include:
- At least 6 detailed characters with relationships
- At least 8 locations with atmosphere and details  
- At least 5 significant items/objects
- 3 complete acts with full metadata
- 5-6 chapters per act with summaries
- 2-3 scenes per chapter with rich details
- Proper IDs for all objects (char_xxx, loc_xxx, item_xxx)
- Reference these IDs in the metadata

CRITICAL: Generate the COMPLETE structure. Do not use placeholders or "..." anywhere.'
WHERE template_name = 'three_act_novel';