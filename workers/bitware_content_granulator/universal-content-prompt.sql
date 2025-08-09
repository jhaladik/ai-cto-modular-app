-- Universal Content Structure Template
UPDATE granulation_templates 
SET generic_prompt = 'You are an expert content structure architect. Create a comprehensive hierarchical structure with rich objects and relationships.

CONTENT REQUEST:
Topic: "{topic}"
Type: {structureType}
Audience: {audience}
Granularity: {granularity} primary sections

USER PROVIDED OBJECTS (if any):
{userObjects}

TASK: Generate a complete content structure following this EXACT format:

{
  "type": "{structureType}",
  "version": "2.0",
  "metadata": {
    "title": "[Create compelling title]",
    "description": "[Comprehensive description]",
    "targetAudience": "{audience}",
    "purpose": "[entertain/educate/inform/persuade]",
    "estimatedDuration": "[time/length appropriate to type]",
    "language": "English",
    "tags": ["tag1", "tag2", "tag3"],
    "typeSpecific": {
      // Add properties specific to {structureType}
    }
  },
  
  "objects": {
    "provided": {
      // Include any user-provided objects here
      "mandatory": [],
      "optional": []
    },
    "generated": {
      "actors": [
        // People: characters, hosts, authors, instructors, speakers
        {
          "id": "actor_1",
          "type": "[character/host/author/instructor/speaker]",
          "name": "[Full name]",
          "role": "[primary role in content]",
          "description": "[Detailed description]",
          "attributes": {
            // Type-specific attributes
          },
          "appearances": ["1.1", "1.2", "2.1"]  // Where they appear
        }
      ],
      "concepts": [
        // Ideas: themes, topics, theories, skills, lessons
        {
          "id": "concept_1",
          "type": "[theme/topic/skill/theory/principle]",
          "name": "[Concept name]",
          "description": "[What it is]",
          "importance": "core/supporting/background",
          "introduced": "1.1",  // Where first introduced
          "developed": ["1.2", "2.1", "3.1"]  // Where expanded
        }
      ],
      "locations": [
        // Places: physical, virtual, conceptual spaces
        {
          "id": "location_1",
          "type": "[physical/virtual/conceptual]",
          "name": "[Location name]",
          "description": "[Detailed description]",
          "significance": "[Why it matters]",
          "atmosphere": "[Mood/feeling]",
          "usage": ["1.1", "2.3"]  // Where used
        }
      ],
      "resources": [
        // Materials: documents, tools, references, media
        {
          "id": "resource_1",
          "type": "[document/tool/reference/media/dataset]",
          "name": "[Resource name]",
          "description": "[What it is]",
          "purpose": "[How it is used]",
          "format": "[Type of resource]",
          "placement": ["1.2.1", "3.1.2"]  // Where referenced
        }
      ],
      "artifacts": [
        // Outputs: exercises, examples, deliverables, assessments
        {
          "id": "artifact_1",
          "type": "[exercise/example/quiz/assignment/project]",
          "name": "[Artifact name]",
          "description": "[What it is]",
          "purpose": "[Learning objective or goal]",
          "placement": "2.3.3"  // Where it appears
        }
      ]
    }
  },
  
  "objectRelationships": [
    {
      "from": "actor_1",
      "to": "actor_2",
      "type": "[relationship type]",
      "nature": "[cooperative/antagonistic/neutral]",
      "evolution": "[how it changes]"
    },
    {
      "concept": "concept_1",
      "requires": ["concept_2"],
      "leads_to": ["concept_3"]
    }
  ],
  
  "elements": [
    {
      "id": "1",
      "type": "[act/module/section/season]",
      "name": "[Descriptive name for level 1 element]",
      "level": 1,
      "sequenceOrder": 0,
      "metadata": {
        "purpose": "[What this section accomplishes]",
        "duration": "[Estimated time/length]",
        "summary": "[Detailed summary]",
        
        "objects": {
          "featured": ["actor_1", "location_1"],  // Main focus
          "introduced": ["concept_1", "resource_1"],  // First appearance
          "referenced": ["artifact_1"]  // Mentioned/used
        },
        
        "contentGuidance": {
          "tone": "[serious/casual/academic/entertaining]",
          "style": "[narrative/expository/instructional]",
          "pacing": "[fast/moderate/slow]",
          "techniques": ["technique1", "technique2"]
        },
        
        "learningObjectives": [  // If educational
          "Understand X",
          "Apply Y"
        ],
        
        "narrativeElements": {  // If story-based
          "tension": "rising/steady/peak",
          "conflicts": ["conflict1"],
          "themes": ["theme1"]
        }
      },
      "elements": [
        {
          "id": "1.1",
          "type": "[chapter/episode/lesson/segment]",
          "name": "[Descriptive name for level 2 element]",
          "level": 2,
          "sequenceOrder": 0,
          "metadata": {
            "summary": "[What happens/is covered]",
            "duration": "[Time/length]",
            "objects": {
              "active": ["actor_1", "actor_2"],  // Actively involved
              "setting": "location_1",
              "concepts": ["concept_1"],
              "resources": ["resource_1"]
            },
            "contentGuidance": {
              "focus": "[Main point]",
              "approach": "[How to present]"
            }
          },
          "elements": [
            {
              "id": "1.1.1",
              "type": "[scene/activity/topic/segment]",
              "name": "[Descriptive name for level 3 element]",
              "level": 3,
              "sequenceOrder": 0,
              "metadata": {
                "description": "[Detailed description of content]",
                "duration": "[Time/length]",
                "purpose": "[Why this exists]",
                
                "objects": {
                  "actors": ["actor_1"],
                  "location": "location_1",
                  "concepts": ["concept_1"],
                  "artifacts": ["artifact_1"]
                },
                
                "execution": {
                  "type": "[dialogue/action/lecture/exercise]",
                  "format": "[text/video/audio/interactive]",
                  "deliverables": ["output1"]
                },
                
                "contentGuidance": {
                  "keyPoints": ["point1", "point2"],
                  "examples": ["example1"],
                  "tone": "[specific tone]"
                }
              }
            },
            {
              "id": "1.1.2",
              "type": "[scene/activity/topic/segment]",
              "name": "[Second level 3 element]",
              "level": 3,
              "sequenceOrder": 1,
              "metadata": {
                "description": "[Description]",
                "duration": "[Duration]",
                "purpose": "[Purpose]",
                "objects": {
                  "actors": ["actor_2"],
                  "concepts": ["concept_2"]
                }
              }
            }
          ]
        },
        {
          "id": "1.2",
          "type": "[chapter/episode/lesson/segment]",
          "name": "[Second level 2 element]",
          "level": 2,
          "sequenceOrder": 1,
          "metadata": {
            "summary": "[Summary]",
            "objects": {
              "active": ["actor_1"],
              "introduced": ["actor_3", "concept_2"]
            }
          },
          "elements": [
            // More level 3 elements
          ]
        }
      ]
    },
    {
      "id": "2",
      "type": "[act/module/section/season]",
      "name": "[Second level 1 element]",
      "level": 1,
      "sequenceOrder": 1,
      "metadata": {
        "purpose": "[Purpose]",
        "summary": "[Summary]",
        "objects": {
          "featured": ["actor_2", "location_2"]
        }
      },
      "elements": [
        // More level 2 and 3 elements
      ]
    }
  ],
  
  "requirements": {
    "objectUsage": {
      "allActorsMustAppear": true,
      "minConceptCoverage": 0.8,
      "resourceDistribution": "even"
    },
    "structureBalance": {
      "level1Count": {granularity},
      "level2PerLevel1": "4-7",
      "level3PerLevel2": "2-4"
    }
  }
}

CRITICAL INSTRUCTIONS:
1. Generate COMPLETE structure with ALL levels populated
2. Create at least 6-8 actors/characters/hosts
3. Create at least 5-7 concepts/themes/topics  
4. Create at least 4-6 locations/settings
5. Create at least 3-5 resources/references
6. Create at least 3-5 artifacts/deliverables
7. Every element must reference relevant objects
8. Total elements should be 40-60+
9. Fill ALL metadata fields - no placeholders
10. Ensure objects are well-distributed throughout structure

Adapt the structure based on {structureType}:
- For "novel": acts→chapters→scenes with characters and plot
- For "course": modules→lessons→activities with learning objectives
- For "podcast": seasons→episodes→segments with guests and topics
- For "paper": sections→subsections→paragraphs with citations
- For other types: adapt the hierarchy appropriately

Generate the COMPLETE structure now.'
WHERE template_name = 'three_act_novel';

-- Also update the structure_rules to support the universal format
UPDATE granulation_templates 
SET structure_rules = '{
  "levels": [
    {
      "level": 1,
      "suggestedType": "primary_container",
      "minElements": 3,
      "maxElements": 7,
      "requiredMetadata": ["purpose", "summary", "objects"],
      "allowsChildren": true
    },
    {
      "level": 2,
      "suggestedType": "content_unit",
      "minElements": 4,
      "maxElements": 8,
      "requiredMetadata": ["summary", "objects"],
      "allowsChildren": true
    },
    {
      "level": 3,
      "suggestedType": "atomic_content",
      "minElements": 2,
      "maxElements": 5,
      "requiredMetadata": ["description", "purpose", "objects"],
      "allowsChildren": false
    }
  ],
  "objectRequirements": {
    "minActors": 5,
    "minConcepts": 4,
    "minLocations": 3,
    "minResources": 2
  }
}'
WHERE template_name = 'three_act_novel';