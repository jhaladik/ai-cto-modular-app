/**
 * Test Stage 3 only with existing project
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
  console.log('🎬 Testing Stage 3 with existing project\n');

  try {
    // Use an existing project that has completed Stage 2
    const projectId = 25; // Project with completed Stage 1 & 2
    
    console.log(`📝 Using project ID: ${projectId}`);
    console.log('🚀 Executing Stage 3...\n');
    
    const startTime = Date.now();
    
    const response = await makeRequest('/api/v2/stages/execute', 'POST', {
      project_id: projectId,
      stage_number: 3,
      ai_config: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 2000
      }
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    if (!response.success) {
      console.error(`❌ Stage 3 failed: ${response.error}`);
      if (response.stack) {
        console.error('Stack trace:', response.stack);
      }
      return;
    }

    console.log(`✅ Stage 3 completed in ${duration} seconds`);
    
    if (response.stage) {
      console.log('\n📊 Results:');
      console.log(`   • Status: ${response.stage.status}`);
      console.log(`   • Validation Score: ${response.stage.validation?.score || 'N/A'}/100`);
      console.log(`   • UAOL Notations: ${response.stage.uaol_notations?.length || 0}`);
      
      if (response.stage.uaol_notations && response.stage.uaol_notations.length > 0) {
        console.log('\n🔤 Sample Notations:');
        response.stage.uaol_notations.slice(0, 3).forEach(n => {
          console.log(`   • ${n}`);
        });
      }
      
      if (response.stage.output) {
        console.log('\n📖 Structure Output:');
        console.log(JSON.stringify(response.stage.output, null, 2).substring(0, 500) + '...');
      }
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testStage3();