/**
 * Quick Test for Mentor Validation System
 * Just tests Stage 1 to verify the system is working
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
          console.error('Failed to parse response:', data);
          reject(e);
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function quickTest() {
  console.log('🚀 Quick Mentor Validation Test');
  console.log('================================\n');

  try {
    // Create a simple test project
    console.log('📝 Creating test project...');
    const project = await makeRequest('/api/projects/create', 'POST', {
      project_name: "Quick Test Novel",
      content_type: "novel",
      topic: "A short story about a time traveler",
      target_audience: "Adults",
      genre: "Sci-Fi"
    });
    
    if (!project.success) {
      throw new Error(`Failed to create project: ${project.error}`);
    }
    
    const projectId = project.project.id;
    console.log(`✅ Project created: ID ${projectId}\n`);

    // Test just Stage 1 with minimal tokens
    console.log('🎬 Testing Stage 1 with Mentor Validation...');
    console.log('This will test:');
    console.log('  - Context-aware prompt generation');
    console.log('  - AI generation with OpenAI');
    console.log('  - Mentor validation with Cloudflare AI');
    console.log('  - Automatic correction if needed\n');
    
    const startTime = Date.now();
    
    const stage1 = await makeRequest('/api/stages/execute', 'POST', {
      project_id: projectId,
      stage_number: 1,
      ai_config: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        temperature: 0.8,
        maxTokens: 2000  // Limited tokens for quick test
      }
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    if (!stage1.success) {
      console.error(`❌ Stage 1 failed: ${stage1.error}`);
      if (stage1.details) {
        console.error('Details:', stage1.details);
      }
      return;
    }

    console.log(`✅ Stage 1 completed in ${duration} seconds\n`);

    // Display validation results
    if (stage1.stage && stage1.stage.validation) {
      const validation = stage1.stage.validation;
      
      console.log('📊 Mentor Validation Results:');
      console.log(`  Score: ${validation.score}/100`);
      
      if (validation.issues_fixed > 0) {
        console.log(`  ✨ Issues Fixed: ${validation.issues_fixed}`);
      }
      
      if (validation.mentor_insight) {
        console.log(`\n  💡 Mentor Insight:`);
        console.log(`  "${validation.mentor_insight}"`);
      }
      
      if (validation.continuity_check) {
        const check = validation.continuity_check;
        console.log('\n  🔄 Continuity Check:');
        console.log(`    Characters: ${check.charactersConsistent ? '✅' : '❌'}`);
        console.log(`    Locations: ${check.locationsConsistent ? '✅' : '❌'}`);
        console.log(`    Timeline: ${check.timelineLogical ? '✅' : '❌'}`);
        console.log(`    Plot Threads: ${check.plotThreadsContinuous ? '✅' : '❌'}`);
      }
    } else {
      console.log('⚠️ No validation data in response');
      console.log('(The mentor validation may be disabled or failed)');
    }

    // Display generated content summary
    if (stage1.stage && stage1.stage.output) {
      const output = stage1.stage.output;
      console.log('\n📄 Generated Content Summary:');
      
      if (output.CORE_CONCEPT) {
        console.log(`  Core Premise: ${output.CORE_CONCEPT.central_premise || 'Generated'}`);
      }
      if (output.THEMATIC_FRAMEWORK) {
        console.log(`  Primary Theme: ${output.THEMATIC_FRAMEWORK.primary_theme || 'Generated'}`);
      }
      
      // Show first 200 chars of output
      const preview = JSON.stringify(output).substring(0, 200);
      console.log(`\n  Preview: ${preview}...`);
    }

    console.log('\n✅ Quick Test Complete!');
    console.log('========================');
    
    if (stage1.stage && stage1.stage.validation && stage1.stage.validation.score) {
      if (stage1.stage.validation.score >= 70) {
        console.log('🎉 The mentor validation system is working correctly!');
      } else {
        console.log('⚠️ Content generated but validation score is low.');
        console.log('   The mentor system is working but content quality needs improvement.');
      }
    } else {
      console.log('⚠️ The system generated content but mentor validation may not be fully operational.');
      console.log('   Check the worker logs for any errors.');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the quick test
quickTest();