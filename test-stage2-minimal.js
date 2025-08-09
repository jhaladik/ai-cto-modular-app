/**
 * Minimal Stage 2 test with very low tokens
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

async function testStage2() {
  console.log('🎯 Minimal Stage 2 Test');
  console.log('========================\n');

  try {
    // Use existing project 14
    console.log('📋 Using project 14 for Stage 2 test');
    console.log('🔧 Minimal config: 500 tokens, gpt-3.5-turbo\n');
    
    const stage2 = await makeRequest('/api/stages/execute', 'POST', {
      project_id: 14,
      stage_number: 2,
      ai_config: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',  // Faster model
        temperature: 0.7,
        maxTokens: 500  // Very minimal
      }
    });

    if (stage2.success) {
      console.log('✅ Stage 2 executed successfully!');
      
      if (stage2.stage && stage2.stage.validation) {
        console.log(`Validation score: ${stage2.stage.validation.score}/100`);
        
        if (stage2.stage.validation.mentor_insight) {
          console.log(`Mentor: "${stage2.stage.validation.mentor_insight}"`);
        }
      }
      
      if (stage2.stage && stage2.stage.output) {
        const output = stage2.stage.output;
        if (output.objects) {
          const chars = output.objects.filter(o => o.type === 'character').length;
          const locs = output.objects.filter(o => o.type === 'location').length;
          console.log(`\nGenerated: ${chars} characters, ${locs} locations`);
        }
      }
    } else {
      console.log('❌ Stage 2 failed');
      console.log('Error:', stage2.error);
      if (stage2.details) {
        console.log('Details:', stage2.details);
      }
      if (stage2.stack) {
        // Show first 500 chars of stack
        console.log('Stack:', stage2.stack.substring(0, 500));
      }
    }

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  }
}

testStage2();