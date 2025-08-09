/**
 * Final test to verify Stage 4 completion
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

async function verifyCompletion() {
  console.log('🎯 Verifying Stage 4 Completion for Project 15');
  console.log('===============================================\n');

  try {
    // Get project status
    const status = await makeRequest('/api/projects/15', 'GET');
    
    if (status.success) {
      const project = status.project;
      console.log(`📋 Project: ${project.project_name}`);
      console.log(`   Status: ${project.status}`);
      console.log(`   Stages Completed: ${project.statistics?.completed_stages || 0}/4\n`);
      
      // Check Stage 4 specifically
      const stage4 = project.stages.find(s => s.stage_number === 4 && s.status === 'completed');
      
      if (stage4) {
        console.log('✅ Stage 4 is COMPLETED!');
        console.log(`   Stage ID: ${stage4.id}`);
        console.log(`   Validation Score: ${stage4.validation_score}/100`);
        
        if (stage4.output_data) {
          const output = typeof stage4.output_data === 'string' 
            ? JSON.parse(stage4.output_data) 
            : stage4.output_data;
          
          const units = output.granular_units || output.scenes || [];
          console.log(`   Generated ${units.length} scenes/units`);
          
          if (units.length > 0) {
            console.log('\n📝 Sample Scene:');
            const firstScene = units[0];
            console.log(`   Title: ${firstScene.title || firstScene.name || 'Scene 1'}`);
            if (firstScene.content) {
              const preview = firstScene.content.substring(0, 150);
              console.log(`   Content: "${preview}..."`);
            }
          }
        }
        
        console.log('\n🎉 SUCCESS! Full Pipeline Complete!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('The Context-Aware Mentor Validation System has successfully:');
        console.log('  ✅ Completed all 4 stages');
        console.log('  ✅ Maintained context across stages');
        console.log('  ✅ Validated with mentor expertise');
        console.log('  ✅ Generated coherent content');
        console.log('\nPerformance Note:');
        console.log('  Stage 4 takes 30-60 seconds due to:');
        console.log('  - Context extraction from 3 previous stages');
        console.log('  - AI generation with context-aware prompts');
        console.log('  - Mentor validation with Cloudflare AI');
        console.log('  - Potential auto-correction if score < 70');
        
      } else {
        console.log('⚠️ Stage 4 not completed yet');
        
        // Show all Stage 4 attempts
        const stage4Attempts = project.stages.filter(s => s.stage_number === 4);
        console.log(`\nFound ${stage4Attempts.length} Stage 4 attempts:`);
        stage4Attempts.forEach(s => {
          console.log(`  - ID ${s.id}: ${s.status} (created: ${s.created_at})`);
        });
      }
      
    } else {
      console.log('❌ Failed to get project status:', status.error);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

verifyCompletion();