/**
 * Get Stage 4 full output
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

async function getStage4Output() {
  console.log('📄 Getting Stage 4 Output');
  console.log('=========================\n');

  try {
    const status = await makeRequest('/api/projects/15', 'GET');
    
    if (status.success) {
      const stage4 = status.project.stages.find(s => s.stage_number === 4 && s.status === 'completed');
      
      if (stage4 && stage4.output_data) {
        const rawOutput = typeof stage4.output_data === 'string' 
          ? JSON.parse(stage4.output_data) 
          : stage4.output_data;
        
        console.log('Raw output structure:');
        console.log(JSON.stringify(rawOutput, null, 2).substring(0, 1000));
        
        // Check if it's wrapped
        let actualOutput = rawOutput;
        if (rawOutput.content && typeof rawOutput.content === 'string') {
          try {
            actualOutput = JSON.parse(rawOutput.content);
          } catch (e) {
            console.log('\nContent is not JSON, it\'s text');
          }
        }
        
        // Count scenes
        const units = actualOutput.granular_units || actualOutput.scenes || [];
        console.log(`\n✅ Found ${units.length} scenes/units`);
        
        if (units.length > 0) {
          console.log('\nFirst scene:');
          console.log(JSON.stringify(units[0], null, 2));
        }
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

getStage4Output();