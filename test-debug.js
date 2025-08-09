/**
 * Debug test to check what's happening with Stage 2
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
          // Return raw data if not JSON
          resolve({ raw: data });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function debugTest() {
  console.log('🔍 Debug Test for Stage 2 Error');
  console.log('=================================\n');

  try {
    // First, let's check project status
    console.log('📋 Checking project 14 status...');
    const status = await makeRequest('/api/projects/14', 'GET');
    
    if (status.success) {
      console.log('✅ Project found');
      console.log(`  Stages completed: ${status.project.statistics?.completed_stages || 0}`);
      
      if (status.project.stages) {
        console.log('  Stage details:');
        status.project.stages.forEach(stage => {
          console.log(`    - Stage ${stage.stage_number}: ${stage.status}`);
        });
      }
    } else {
      console.log('❌ Project status check failed:', status.error);
    }

    // Try Stage 2 with detailed error capture
    console.log('\n🎬 Attempting Stage 2 execution with minimal config...');
    const stage2 = await makeRequest('/api/stages/execute', 'POST', {
      project_id: 14,
      stage_number: 2,
      ai_config: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',  // Faster model for testing
        temperature: 0.7,
        maxTokens: 1000  // Minimal tokens
      }
    });

    if (stage2.success) {
      console.log('✅ Stage 2 executed successfully!');
      if (stage2.stage && stage2.stage.validation) {
        console.log(`  Validation score: ${stage2.stage.validation.score}/100`);
      }
    } else {
      console.log('❌ Stage 2 failed');
      console.log('  Error:', stage2.error);
      if (stage2.details) {
        console.log('  Details:', stage2.details);
      }
      if (stage2.stack) {
        console.log('  Stack trace preview:', stage2.stack.substring(0, 500));
      }
    }

  } catch (error) {
    console.error('\n❌ Debug test error:', error.message);
  }
}

debugTest();