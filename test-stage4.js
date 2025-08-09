/**
 * Test Stage 4 with Project 15
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

async function testStage4() {
  console.log('🎬 Testing Stage 4 for Project 15');
  console.log('===================================\n');

  try {
    const stage4 = await makeRequest('/api/stages/execute', 'POST', {
      project_id: 15,
      stage_number: 4,
      ai_config: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        temperature: 0.8,
        maxTokens: 1500
      }
    });

    if (stage4.success) {
      console.log('✅ Stage 4 executed successfully!');
      
      if (stage4.stage && stage4.stage.validation) {
        console.log(`Validation score: ${stage4.stage.validation.score}/100`);
        
        if (stage4.stage.validation.continuity_check) {
          const check = stage4.stage.validation.continuity_check;
          console.log('\nContinuity Check:');
          console.log(`  Characters: ${check.charactersConsistent ? '✅' : '❌'}`);
          console.log(`  Locations: ${check.locationsConsistent ? '✅' : '❌'}`);
          console.log(`  Timeline: ${check.timelineLogical ? '✅' : '❌'}`);
          console.log(`  Plot Threads: ${check.plotThreadsContinuous ? '✅' : '❌'}`);
        }
        
        if (stage4.stage.validation.mentor_insight) {
          const insight = stage4.stage.validation.mentor_insight.substring(0, 200);
          console.log(`\nMentor: "${insight}..."`);
        }
      }
      
      if (stage4.stage && stage4.stage.output) {
        const output = stage4.stage.output;
        const units = output.granular_units || output.scenes || [];
        console.log(`\nGenerated ${units.length} scenes/units`);
        
        if (units.length > 0) {
          console.log('\nFirst scene preview:');
          const firstScene = units[0];
          console.log(`  Title: ${firstScene.title || firstScene.name || 'Scene 1'}`);
          if (firstScene.content) {
            console.log(`  Content: "${firstScene.content.substring(0, 100)}..."`);
          }
        }
      }
      
      console.log('\n🎉 Full Pipeline Complete!');
      console.log('The Context-Aware Mentor Validation System is working!');
      
    } else {
      console.log('❌ Stage 4 failed');
      console.log('Error:', stage4.error);
      if (stage4.details) {
        console.log('Details:', stage4.details);
      }
    }

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  }
}

testStage4();