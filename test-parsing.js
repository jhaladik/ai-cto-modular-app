// Test the Big Picture data parsing logic

// Simulate the actual data structure from the database
const rawStageData = {
    output_data: JSON.stringify({
        content: `\`\`\`json
{
  "BIG_PICTURE": {
    "CORE_CONCEPT": {
      "central_premise": "In a world where memories can be purchased and traded, a memory thief discovers a conspiracy that could alter the fabric of reality itself.",
      "genre": "Science Fiction",
      "sub_genre": "Dystopian",
      "unique_selling_proposition": "A gripping exploration of identity and memory that melds high-stakes action with profound philosophical questions."
    },
    "THEMATIC_FRAMEWORK": {
      "primary_theme": "The nature of identity and self",
      "secondary_themes": ["Memory as currency", "Reality vs perception", "Corporate control"],
      "philosophical_questions": ["What makes us who we are?", "Can memories be owned?"],
      "emotional_journey": "From confusion to revelation to empowerment"
    },
    "NARRATIVE_ARC": {
      "beginning": "Discovery of the memory theft",
      "middle": "Uncovering the conspiracy",
      "end": "Confronting the truth about reality",
      "key_turning_points": ["First memory theft", "Discovery of the corporation", "Reality revelation"]
    },
    "WORLD_VISION": {
      "setting_overview": "Tokyo, 2087",
      "time_period": "Near future dystopia",
      "atmosphere_and_tone": "Dark, cyberpunk, philosophical",
      "rules_of_the_world": "Memories can be extracted, stored, and traded"
    },
    "CORE_CONFLICTS": {
      "external_conflict": "Memory thief vs the corporation",
      "internal_conflict": "Identity crisis and moral dilemmas",
      "societal_philosophical_conflict": "Individual freedom vs corporate control",
      "stakes_and_consequences": "The nature of reality itself"
    }
  }
}
\`\`\``
    })
};

// Parse function from granulation-page-v4.js
function parseBigPictureData(data) {
    let parsedData = data;
    
    // Handle nested content field with markdown
    if (data.content && typeof data.content === 'string') {
        try {
            // Remove markdown code blocks if present
            let jsonStr = data.content;
            if (jsonStr.includes('```json')) {
                jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            }
            parsedData = JSON.parse(jsonStr);
            
            // Extract BIG_PICTURE if it exists
            if (parsedData.BIG_PICTURE) {
                parsedData = parsedData.BIG_PICTURE;
            }
        } catch (e) {
            console.error('Failed to parse stage content:', e);
            parsedData = data;
        }
    }
    
    return parsedData;
}

// Test the parsing
console.log('Testing Big Picture data parsing...\n');

const output = JSON.parse(rawStageData.output_data);
console.log('1. Raw output_data structure:');
console.log('   - Has content field:', !!output.content);
console.log('   - Content type:', typeof output.content);
console.log('   - Content starts with:', output.content.substring(0, 30));

const parsed = parseBigPictureData(output);
console.log('\n2. Parsed data structure:');
console.log('   - Has CORE_CONCEPT:', !!parsed.CORE_CONCEPT);
console.log('   - Has THEMATIC_FRAMEWORK:', !!parsed.THEMATIC_FRAMEWORK);
console.log('   - Has NARRATIVE_ARC:', !!parsed.NARRATIVE_ARC);
console.log('   - Has WORLD_VISION:', !!parsed.WORLD_VISION);
console.log('   - Has CORE_CONFLICTS:', !!parsed.CORE_CONFLICTS);

console.log('\n3. Extracted values:');
console.log('   - Central Premise:', parsed.CORE_CONCEPT?.central_premise || 'NOT FOUND');
console.log('   - Genre:', parsed.CORE_CONCEPT?.genre || 'NOT FOUND');
console.log('   - Primary Theme:', parsed.THEMATIC_FRAMEWORK?.primary_theme || 'NOT FOUND');
console.log('   - Setting:', parsed.WORLD_VISION?.setting_overview || 'NOT FOUND');
console.log('   - External Conflict:', parsed.CORE_CONFLICTS?.external_conflict || 'NOT FOUND');

console.log('\n✅ Test complete!');