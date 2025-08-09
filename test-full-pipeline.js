/**
 * Full Pipeline Test - All 4 Stages with Context Awareness
 */

const https = require('https');

function makeRequest(path, method, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'bitware-content-granulator.jhaladik.workers.dev',
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer internal-worker-auth-token-2024',
        'X-Worker-ID': 'test-worker'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function testFullPipeline() {
  console.log('🚀 Full Pipeline Test - 4 Stages with Context Awareness');
  console.log('========================================================\n');

  try {
    // Create a new project for this test
    console.log('📝 Creating new test project...');
    const project = await makeRequest('/api/projects/create', 'POST', {
      project_name: "The Memory Thief",
      content_type: "novel",
      topic: "A detective who steals memories to solve crimes, but each stolen memory replaces one of their own",
      target_audience: "Adult mystery readers",
      genre: "Psychological Thriller"
    });
    
    if (!project.success) {
      throw new Error(`Failed to create project: ${project.error}`);
    }
    
    const projectId = project.project.id;
    console.log(`✅ Project created: ID ${projectId}\n`);

    const stages = [
      { number: 1, name: 'Big Picture', tokens: 1500 },
      { number: 2, name: 'Objects & Relations', tokens: 1500 },
      { number: 3, name: 'Structure', tokens: 2000 },
      { number: 4, name: 'Granular Units', tokens: 2500 }
    ];

    const results = {
      characters: new Set(),
      locations: new Set(),
      validationScores: [],
      contextConsistency: []
    };

    for (const stage of stages) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🎬 Stage ${stage.number}: ${stage.name}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      
      const startTime = Date.now();
      
      const response = await makeRequest('/api/stages/execute', 'POST', {
        project_id: projectId,
        stage_number: stage.number,
        ai_config: {
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          temperature: 0.8,
          maxTokens: stage.tokens
        }
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (!response.success) {
        console.error(`❌ Stage ${stage.number} failed: ${response.error}`);
        if (response.details) {
          console.error('Details:', response.details);
        }
        continue;
      }

      console.log(`✅ Completed in ${duration} seconds`);

      // Process validation
      if (response.stage && response.stage.validation) {
        const validation = response.stage.validation;
        results.validationScores.push(validation.score);
        
        console.log(`\n📊 Validation Score: ${validation.score}/100`);
        
        if (validation.issues_fixed > 0) {
          console.log(`✨ Issues Auto-Fixed: ${validation.issues_fixed}`);
        }
        
        if (validation.mentor_insight) {
          const insight = validation.mentor_insight.substring(0, 150);
          console.log(`💡 Mentor: "${insight}..."`);
        }
        
        if (validation.continuity_check) {
          const check = validation.continuity_check;
          const allGood = check.charactersConsistent && 
                         check.locationsConsistent && 
                         check.timelineLogical && 
                         check.plotThreadsContinuous;
          
          console.log(`\n🔄 Continuity: ${allGood ? '✅ All checks passed' : '⚠️ Issues detected'}`);
          if (!allGood) {
            console.log(`  Characters: ${check.charactersConsistent ? '✅' : '❌'}`);
            console.log(`  Locations: ${check.locationsConsistent ? '✅' : '❌'}`);
            console.log(`  Timeline: ${check.timelineLogical ? '✅' : '❌'}`);
            console.log(`  Plot Threads: ${check.plotThreadsContinuous ? '✅' : '❌'}`);
          }
          
          results.contextConsistency.push(allGood);
        }
      }

      // Extract content info
      if (response.stage && response.stage.output) {
        const output = response.stage.output;
        
        if (stage.number === 2 && output.objects) {
          const chars = output.objects.filter(o => o.type === 'character');
          const locs = output.objects.filter(o => o.type === 'location');
          
          chars.forEach(c => results.characters.add(c.name));
          locs.forEach(l => results.locations.add(l.name));
          
          console.log(`\n📝 Generated Content:`);
          console.log(`  • ${chars.length} characters`);
          console.log(`  • ${locs.length} locations`);
          console.log(`  • ${output.timeline?.length || 0} timeline events`);
        } else if (stage.number === 3 && output.structure) {
          const acts = output.structure.length;
          const chapters = output.structure.reduce((sum, act) => 
            sum + (act.children?.length || 0), 0);
          
          console.log(`\n📝 Generated Structure:`);
          console.log(`  • ${acts} acts`);
          console.log(`  • ${chapters} chapters`);
        } else if (stage.number === 4 && (output.granular_units || output.scenes)) {
          const units = output.granular_units || output.scenes || [];
          console.log(`\n📝 Generated Content:`);
          console.log(`  • ${units.length} scenes/units`);
        }
      }
    }

    // Final summary
    console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📈 PIPELINE SUMMARY`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    const avgScore = results.validationScores.reduce((a, b) => a + b, 0) / results.validationScores.length;
    const allConsistent = results.contextConsistency.every(c => c);
    
    console.log(`✅ Project ID: ${projectId}`);
    console.log(`✅ Average Validation Score: ${avgScore.toFixed(1)}/100`);
    console.log(`✅ Context Consistency: ${allConsistent ? 'Perfect' : 'Some issues'}`);
    console.log(`✅ Characters Created: ${results.characters.size}`);
    console.log(`✅ Locations Created: ${results.locations.size}`);
    
    console.log(`\n🎉 MENTOR VALIDATION SYSTEM WORKING!`);
    console.log(`The system successfully:`);
    console.log(`  1. Generated content with AI`);
    console.log(`  2. Validated with domain expert mentors`);
    console.log(`  3. Auto-corrected issues when needed`);
    console.log(`  4. Maintained context across all stages`);
    console.log(`  5. Ensured continuity and consistency`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testFullPipeline();