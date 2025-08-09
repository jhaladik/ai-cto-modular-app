/**
 * Test Stage 3 with Project 15
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

async function testStage3() {
  console.log('🎬 Testing Stage 3 for Project 15');
  console.log('===================================\n');

  try {
    const stage3 = await makeRequest('/api/stages/execute', 'POST', {
      project_id: 15,
      stage_number: 3,
      ai_config: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        temperature: 0.8,
        maxTokens: 1000
      }
    });

    if (stage3.success) {
      console.log('✅ Stage 3 executed successfully!');
      
      if (stage3.stage && stage3.stage.validation) {
        console.log(`Validation score: ${stage3.stage.validation.score}/100`);
        
        if (stage3.stage.validation.continuity_check) {
          const check = stage3.stage.validation.continuity_check;
          console.log('\nContinuity Check:');
          console.log(`  Characters: ${check.charactersConsistent ? '✅' : '❌'}`);
          console.log(`  Locations: ${check.locationsConsistent ? '✅' : '❌'}`);
          console.log(`  Timeline: ${check.timelineLogical ? '✅' : '❌'}`);
          console.log(`  Plot Threads: ${check.plotThreadsContinuous ? '✅' : '❌'}`);
        }
      }
      
      if (stage3.stage && stage3.stage.output && stage3.stage.output.structure) {
        const structure = stage3.stage.output.structure;
        console.log(`\nGenerated ${structure.length} acts`);
        const totalChapters = structure.reduce((sum, act) => 
          sum + (act.children?.length || 0), 0);
        console.log(`Total chapters: ${totalChapters}`);
      }
    } else {
      console.log('❌ Stage 3 failed');
      console.log('Error:', stage3.error);
      if (stage3.details) {
        console.log('Details:', stage3.details);
      }
    }

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  }
}

testStage3();