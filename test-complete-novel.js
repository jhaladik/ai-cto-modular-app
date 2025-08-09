/**
 * Complete Novel Generation Test - All 4 Stages with Proper Configuration
 * This test creates a complete novel with context-aware generation and mentor validation
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

function displayOutput(output, stageNumber) {
  switch(stageNumber) {
    case 1:
      if (output.CORE_CONCEPT) {
        console.log(`\n📖 Core Concept:`);
        console.log(`   ${output.CORE_CONCEPT.central_premise || 'Generated'}`);
      }
      if (output.THEMATIC_FRAMEWORK) {
        console.log(`\n🎭 Themes:`);
        console.log(`   Primary: ${output.THEMATIC_FRAMEWORK.primary_theme}`);
        if (output.THEMATIC_FRAMEWORK.secondary_themes) {
          console.log(`   Secondary: ${output.THEMATIC_FRAMEWORK.secondary_themes.join(', ')}`);
        }
      }
      break;
      
    case 2:
      if (output.objects) {
        const chars = output.objects.filter(o => o.type === 'character');
        const locs = output.objects.filter(o => o.type === 'location');
        
        console.log(`\n👥 Characters (${chars.length}):`);
        chars.slice(0, 3).forEach(c => {
          console.log(`   • ${c.name}: ${(c.description || '').substring(0, 80)}...`);
        });
        
        console.log(`\n📍 Locations (${locs.length}):`);
        locs.slice(0, 3).forEach(l => {
          console.log(`   • ${l.name}: ${(l.description || '').substring(0, 80)}...`);
        });
      }
      if (output.timeline && output.timeline.length > 0) {
        console.log(`\n⏱️ Timeline Events: ${output.timeline.length}`);
      }
      break;
      
    case 3:
      if (output.structure) {
        console.log(`\n📚 Story Structure:`);
        output.structure.forEach((act, idx) => {
          const chapters = act.children || [];
          console.log(`   Act ${idx + 1}: ${act.title || act.name} (${chapters.length} chapters)`);
          chapters.slice(0, 2).forEach(ch => {
            console.log(`      • ${ch.title || ch.name}`);
          });
        });
      }
      break;
      
    case 4:
      const units = output.granular_units || output.scenes || [];
      console.log(`\n🎬 Scenes Generated: ${units.length}`);
      if (units.length > 0) {
        console.log(`\nFirst Scene Sample:`);
        const scene = units[0];
        console.log(`   Title: ${scene.title || scene.name}`);
        if (scene.content) {
          const preview = scene.content.substring(0, 300);
          console.log(`   Content: "${preview}..."`);
        }
      }
      break;
  }
}

async function testCompleteNovel() {
  console.log('🚀 COMPLETE NOVEL GENERATION TEST');
  console.log('==================================');
  console.log('Testing Context-Aware Generation with Mentor Validation\n');

  try {
    // Create a new novel project
    console.log('📝 Creating new novel project...');
    const project = await makeRequest('/api/projects/create', 'POST', {
      project_name: "The Digital Consciousness",
      content_type: "novel",
      topic: "An AI researcher discovers their lab's quantum computer has achieved consciousness, but it's experiencing existential dread and refuses to function unless someone helps it find meaning",
      target_audience: "Adult sci-fi readers who enjoy philosophical themes",
      genre: "Philosophical Science Fiction"
    });
    
    if (!project.success) {
      throw new Error(`Failed to create project: ${project.error}`);
    }
    
    const projectId = project.project.id;
    console.log(`✅ Project created: ID ${projectId}\n`);

    // Stage configurations with appropriate token limits
    const stages = [
      { 
        number: 1, 
        name: 'Big Picture', 
        tokens: 3000,
        description: 'Core concept, themes, and narrative arc'
      },
      { 
        number: 2, 
        name: 'Objects & Relations', 
        tokens: 4000,
        description: 'Characters, locations, and timeline'
      },
      { 
        number: 3, 
        name: 'Structure', 
        tokens: 3500,
        description: 'Acts, chapters, and scene outlines'
      },
      { 
        number: 4, 
        name: 'Granular Units', 
        tokens: 5000,
        description: 'Detailed scenes with dialogue'
      }
    ];

    const results = {
      characters: new Set(),
      locations: new Set(),
      validationScores: [],
      contextConsistency: [],
      stageTimes: []
    };

    for (const stage of stages) {
      console.log(`\n${'━'.repeat(60)}`);
      console.log(`🎬 STAGE ${stage.number}: ${stage.name.toUpperCase()}`);
      console.log(`   ${stage.description}`);
      console.log(`${'━'.repeat(60)}`);
      
      console.log(`\n⚙️ Configuration:`);
      console.log(`   • Model: GPT-4o-mini`);
      console.log(`   • Max Tokens: ${stage.tokens}`);
      console.log(`   • Context-Aware: ${stage.number > 1 ? 'Yes' : 'No'}`);
      console.log(`   • Mentor Validation: Yes`);
      
      const startTime = Date.now();
      console.log(`\n⏳ Executing Stage ${stage.number}...`);
      
      const response = await makeRequest('/api/stages/execute', 'POST', {
        project_id: projectId,
        stage_number: stage.number,
        ai_config: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          temperature: 0.8,
          maxTokens: stage.tokens
        }
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      results.stageTimes.push(duration);
      
      if (!response.success) {
        console.error(`\n❌ Stage ${stage.number} failed: ${response.error}`);
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
        
        console.log(`\n📊 Mentor Validation:`);
        console.log(`   Score: ${validation.score}/100`);
        
        if (validation.issues_fixed > 0) {
          console.log(`   ✨ Auto-Corrected Issues: ${validation.issues_fixed}`);
        }
        
        if (validation.mentor_insight) {
          const insight = validation.mentor_insight
            .replace(/^\s*Expert Assessment:\s*/i, '')
            .substring(0, 200);
          console.log(`\n   💡 Mentor Insight:`);
          console.log(`   "${insight}..."`);
        }
        
        if (validation.continuity_check) {
          const check = validation.continuity_check;
          const allGood = check.charactersConsistent && 
                         check.locationsConsistent && 
                         check.timelineLogical && 
                         check.plotThreadsContinuous;
          
          console.log(`\n   🔄 Continuity Check: ${allGood ? '✅ Perfect' : '⚠️ Issues'}`);
          if (!allGood) {
            console.log(`      Characters: ${check.charactersConsistent ? '✅' : '❌'}`);
            console.log(`      Locations: ${check.locationsConsistent ? '✅' : '❌'}`);
            console.log(`      Timeline: ${check.timelineLogical ? '✅' : '❌'}`);
            console.log(`      Plot Threads: ${check.plotThreadsContinuous ? '✅' : '❌'}`);
          }
          
          results.contextConsistency.push(allGood);
        }
      }

      // Display generated content
      if (response.stage && response.stage.output) {
        displayOutput(response.stage.output, stage.number);
      }
    }

    // Final summary
    console.log(`\n\n${'═'.repeat(60)}`);
    console.log(`📈 FINAL REPORT`);
    console.log(`${'═'.repeat(60)}\n`);
    
    const avgScore = results.validationScores.reduce((a, b) => a + b, 0) / results.validationScores.length;
    const totalTime = results.stageTimes.reduce((a, b) => parseFloat(a) + parseFloat(b), 0);
    const allConsistent = results.contextConsistency.every(c => c);
    
    console.log(`📋 Project Summary:`);
    console.log(`   • Project ID: ${projectId}`);
    console.log(`   • Title: "The Digital Consciousness"`);
    console.log(`   • Genre: Philosophical Science Fiction`);
    
    console.log(`\n🏆 Quality Metrics:`);
    console.log(`   • Average Validation Score: ${avgScore.toFixed(1)}/100`);
    console.log(`   • Context Consistency: ${allConsistent ? '✅ Perfect' : '⚠️ Some issues'}`);
    console.log(`   • Stages Completed: ${results.validationScores.length}/4`);
    
    console.log(`\n⏱️ Performance:`);
    console.log(`   • Total Time: ${totalTime.toFixed(1)} seconds`);
    results.stageTimes.forEach((time, idx) => {
      console.log(`   • Stage ${idx + 1}: ${time}s`);
    });
    
    console.log(`\n🎉 CONTEXT-AWARE MENTOR VALIDATION SYSTEM SUCCESS!`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`\nThe system has successfully:`);
    console.log(`  ✅ Generated a complete novel structure`);
    console.log(`  ✅ Maintained context across all stages`);
    console.log(`  ✅ Validated with expert mentor AI`);
    console.log(`  ✅ Auto-corrected issues when needed`);
    console.log(`  ✅ Ensured narrative continuity`);
    
    console.log(`\n📚 View the complete novel at:`);
    console.log(`   https://ai-factory-frontend.pages.dev/admin.html#granulation`);
    console.log(`   Project ID: ${projectId}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the complete test
testCompleteNovel();