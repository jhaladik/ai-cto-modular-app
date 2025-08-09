/**
 * Debug Stage 2 encoding issue
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

async function debugStage2() {
  console.log('🔍 Debugging Stage 2 Adaptive UAOL\n');

  try {
    // Create a simple test project
    console.log('📝 Creating test project...');
    const project = await makeRequest('/api/v2/projects/create', 'POST', {
      project_name: "Debug Test",
      content_type: "novel",
      topic: "A simple test story",
      target_audience: "Test",
      genre: "Test"
    });
    
    if (!project.success) {
      throw new Error(`Failed to create project: ${project.error}`);
    }
    
    const projectId = project.project.id;
    console.log(`✅ Project created: ID ${projectId}\n`);

    // Run Stage 1
    console.log('🎬 Running Stage 1...');
    const stage1 = await makeRequest('/api/v2/stages/execute', 'POST', {
      project_id: projectId,
      stage_number: 1,
      ai_config: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1000
      }
    });

    if (!stage1.success) {
      console.error('❌ Stage 1 failed:', stage1.error);
      return;
    }

    console.log('✅ Stage 1 completed');
    console.log(`   Notations: ${stage1.stage?.uaol_notations?.length || 0}`);
    if (stage1.stage?.uaol_notations?.length > 0) {
      console.log('   Sample:', stage1.stage.uaol_notations[0]);
    }

    // Run Stage 2
    console.log('\n🎬 Running Stage 2...');
    const stage2 = await makeRequest('/api/v2/stages/execute', 'POST', {
      project_id: projectId,
      stage_number: 2,
      ai_config: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1500
      }
    });

    if (!stage2.success) {
      console.error('❌ Stage 2 failed:', stage2.error);
      if (stage2.stack) console.error('Stack:', stage2.stack);
      return;
    }

    console.log('✅ Stage 2 completed');
    console.log(`   Notations: ${stage2.stage?.uaol_notations?.length || 0}`);
    
    // Show the output structure
    if (stage2.stage?.output) {
      console.log('\n📋 Stage 2 Output Structure:');
      const output = stage2.stage.output;
      console.log('   Type:', typeof output);
      console.log('   Keys:', Object.keys(output).join(', '));
      
      // If it has content field, show it
      if (output.content) {
        console.log('   Content type:', typeof output.content);
        console.log('   Content preview:', output.content.substring(0, 200));
        
        // Try to extract actual JSON from content
        if (output.content.includes('```json')) {
          console.log('\n   ⚠️  Content contains markdown JSON block!');
          const jsonMatch = output.content.match(/```json\n([\s\S]*?)\n```/);
          if (jsonMatch) {
            try {
              const extracted = JSON.parse(jsonMatch[1]);
              console.log('   Extracted keys:', Object.keys(extracted).join(', '));
            } catch (e) {
              console.log('   Failed to parse extracted JSON:', e.message);
            }
          }
        }
      }
    }

    // Check database for saved notations
    console.log('\n📊 Checking saved notations...');
    const dbCheck = await makeRequest(`/api/v2/projects/${projectId}`, 'GET', null);
    if (dbCheck.success && dbCheck.project) {
      console.log(`   Total stages: ${dbCheck.project.stages?.length || 0}`);
      if (dbCheck.project.notations) {
        console.log(`   Total notations: ${dbCheck.project.notations.length}`);
      }
    }

  } catch (error) {
    console.error('\n❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the debug
debugStage2();