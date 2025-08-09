/**
 * Debug Stage 4 - Check what's happening
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

async function debugStage4() {
  console.log('🔍 Stage 4 Debug Analysis');
  console.log('==========================\n');

  try {
    // First check the database directly
    console.log('1️⃣ Checking Stage 4 status in database...');
    const status = await makeRequest('/api/projects/15', 'GET');
    
    if (status.success) {
      const stage4Entries = status.project.stages.filter(s => s.stage_number === 4);
      console.log(`   Found ${stage4Entries.length} Stage 4 entries`);
      
      stage4Entries.forEach((stage, idx) => {
        console.log(`\n   Entry ${idx + 1}:`);
        console.log(`     Status: ${stage.status}`);
        console.log(`     Created: ${stage.created_at}`);
        console.log(`     Updated: ${stage.updated_at}`);
        if (stage.error) {
          console.log(`     Error: ${stage.error}`);
        }
        if (stage.processing_time_ms) {
          console.log(`     Processing time: ${stage.processing_time_ms}ms`);
        }
      });
    }
    
    // Try Stage 4 with VERY minimal config
    console.log('\n2️⃣ Testing Stage 4 with ultra-minimal config...');
    console.log('   - Only 200 tokens');
    console.log('   - GPT-3.5-turbo');
    console.log('   - Temperature 0.5');
    console.log('   - Timeout: 30 seconds\n');
    
    const startTime = Date.now();
    let timedOut = false;
    
    // Set a client-side timeout
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        timedOut = true;
        resolve({ timedOut: true });
      }, 30000);
    });
    
    const requestPromise = makeRequest('/api/stages/execute', 'POST', {
      project_id: 15,
      stage_number: 4,
      ai_config: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        temperature: 0.5,
        maxTokens: 200  // Ultra minimal
      }
    });
    
    const result = await Promise.race([requestPromise, timeoutPromise]);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    if (result.timedOut) {
      console.log(`   ⏱️ Request timed out after ${elapsed} seconds`);
      console.log('   This indicates the worker is stuck somewhere\n');
      
      console.log('3️⃣ Possible causes:');
      console.log('   - Context loading is taking too long');
      console.log('   - AI generation is stuck');
      console.log('   - Mentor validation is hanging');
      console.log('   - Database operations are blocking\n');
      
      console.log('4️⃣ Checking if it\'s a context loading issue...');
      // Try to load context directly
      const contextTest = await makeRequest('/api/projects/15', 'GET');
      if (contextTest.success) {
        const stages = contextTest.project.stages.filter(s => s.status === 'completed');
        console.log(`   Found ${stages.length} completed stages`);
        
        // Estimate context size
        let contextSize = 0;
        stages.forEach(s => {
          if (s.output_data) {
            contextSize += JSON.stringify(s.output_data).length;
          }
        });
        console.log(`   Estimated context size: ${(contextSize / 1024).toFixed(1)} KB`);
        
        if (contextSize > 50000) {
          console.log('   ⚠️ Context is large, might be causing slowdown');
        }
      }
      
    } else if (result.success) {
      console.log(`   ✅ Stage 4 completed in ${elapsed} seconds!`);
      
      if (result.stage && result.stage.validation) {
        console.log(`   Validation score: ${result.stage.validation.score}/100`);
      }
      
      if (result.stage && result.stage.output) {
        const output = result.stage.output;
        const units = output.granular_units || output.scenes || [];
        console.log(`   Generated ${units.length} scenes`);
      }
      
    } else {
      console.log(`   ❌ Stage 4 failed after ${elapsed} seconds`);
      console.log(`   Error: ${result.error}`);
      if (result.details) {
        console.log(`   Details: ${result.details}`);
      }
      if (result.stack) {
        console.log(`   Stack trace (first 300 chars):`);
        console.log(`   ${result.stack.substring(0, 300)}`);
      }
    }
    
    console.log('\n5️⃣ Recommendations:');
    if (timedOut || elapsed > 20) {
      console.log('   🔧 The worker is too slow. Consider:');
      console.log('      - Reducing context passed to Stage 4');
      console.log('      - Disabling mentor validation for Stage 4');
      console.log('      - Using a faster AI model');
      console.log('      - Caching more aggressively');
      console.log('      - Breaking Stage 4 into smaller chunks');
    } else {
      console.log('   ✅ Stage 4 is working but needs optimization');
    }

  } catch (error) {
    console.error('\n❌ Debug failed:', error.message);
  }
}

debugStage4();