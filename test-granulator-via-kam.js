// Test Content Granulator via KAM and Cloudflare Queues
// This simulates how the system will actually work in production

const KAM_URL = 'https://bitware-key-account-manager.jhaladik.workers.dev';

async function testGranulatorViaKAM() {
  console.log('🚀 Testing Content Granulator via KAM for 10,000-word content\n');
  
  // First, we need to login to get a session token
  console.log('1️⃣ Logging in to KAM...\n');
  
  const loginResponse = await fetch(`${KAM_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: 'admin@ai-factory.com',
      password: 'admin123',
      loginType: 'admin'
    })
  });

  if (!loginResponse.ok) {
    console.error('❌ Login failed');
    const error = await loginResponse.text();
    console.error(error);
    return;
  }

  const loginData = await loginResponse.json();
  const sessionToken = loginData.sessionToken;
  console.log('✅ Logged in successfully\n');
  console.log('Session Token:', sessionToken.substring(0, 20) + '...\n');

  // Now create a request for content granulation
  console.log('2️⃣ Creating content granulation request...\n');
  
  const granulationRequest = {
    clientId: 1, // Assuming client ID 1 exists
    requestType: 'content_granulation',
    urgency: 'high',
    description: 'Generate a 10,000-word Python Web Development course structure',
    requirements: {
      topic: "Python Web Development Fundamentals",
      structureType: "course",
      templateName: "educational_course_basic",
      granularityLevel: 2, // Compact structure for 10K words
      targetAudience: "Junior developers learning web development",
      constraints: {
        maxElements: 12, // 3 modules × 3 lessons each
        targetWordCount: 10000,
        focusAreas: [
          "Flask basics",
          "REST API development",
          "Database integration"
        ]
      },
      options: {
        includeExamples: true,
        includePracticalExercises: true,
        detailLevel: "intermediate",
        contentDensity: "balanced"
      },
      validation: {
        enabled: false // Skip validation for speed
      }
    },
    expectedDeliverable: {
      type: 'course_structure',
      format: 'json',
      estimatedWords: 10000,
      sections: {
        modules: 3,
        lessonsPerModule: 3,
        wordsPerLesson: 1000,
        includeAssessments: true
      }
    }
  };

  const requestResponse = await fetch(`${KAM_URL}/requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bitware-session-token': sessionToken
    },
    body: JSON.stringify(granulationRequest)
  });

  if (!requestResponse.ok) {
    console.error('❌ Failed to create request');
    const error = await requestResponse.text();
    console.error(error);
    return;
  }

  const requestData = await requestResponse.json();
  console.log('✅ Request created successfully\n');
  console.log('Request ID:', requestData.requestId);
  console.log('Status:', requestData.status);
  console.log('Created At:', requestData.createdAt, '\n');

  // Now trigger the granulation by assigning a template
  console.log('3️⃣ Assigning template and triggering granulation...\n');
  
  const templateAssignment = {
    templateId: 'educational_course_basic',
    parameters: granulationRequest.requirements
  };

  const assignResponse = await fetch(`${KAM_URL}/requests/${requestData.requestId}/assign-template`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bitware-session-token': sessionToken
    },
    body: JSON.stringify(templateAssignment)
  });

  if (!assignResponse.ok) {
    console.error('❌ Failed to assign template');
    const error = await assignResponse.text();
    console.error(error);
    return;
  }

  const assignData = await assignResponse.json();
  console.log('✅ Template assigned and job queued\n');
  console.log('Queue Status:', assignData.queueStatus);
  console.log('Job ID:', assignData.jobId);
  
  // Check request status
  console.log('\n4️⃣ Checking request status...\n');
  
  const statusResponse = await fetch(`${KAM_URL}/requests/${requestData.requestId}`, {
    method: 'GET',
    headers: {
      'x-bitware-session-token': sessionToken
    }
  });

  if (statusResponse.ok) {
    const statusData = await statusResponse.json();
    console.log('Request Status:', statusData.status);
    console.log('Processing Stage:', statusData.processingStage);
    console.log('Assigned Template:', statusData.assignedTemplate);
    
    if (statusData.granulationResult) {
      console.log('\n📊 Granulation Results:');
      console.log('Total Elements:', statusData.granulationResult.totalElements);
      console.log('Word Count Estimate:', statusData.granulationResult.wordCountEstimate);
      console.log('Quality Score:', statusData.granulationResult.qualityScore);
    }
  }

  console.log('\n💡 Note: The granulation job has been queued and will be processed by the Content Granulator worker.');
  console.log('Check the worker logs (wrangler tail) to see the processing details.');
  console.log('The structure will be optimized for generating ~10,000 words of content.');
  
  return requestData.requestId;
}

// Alternative: Direct test with worker binding (if available)
async function testDirectGranulation() {
  console.log('🔧 Direct Content Granulator Test (for development)\n');
  
  const testRequest = {
    topic: "Python Web Development Fundamentals",
    structureType: "course", 
    templateName: "educational_course_basic",
    granularityLevel: 2,
    targetAudience: "Junior developers",
    constraints: {
      maxElements: 12,
      targetWordCount: 10000
    },
    options: {
      includeExamples: true,
      includePracticalExercises: true
    },
    validation: {
      enabled: false
    }
  };

  console.log('📋 Test Request:', JSON.stringify(testRequest, null, 2));
  console.log('\n🎯 Expected Output:');
  console.log('- 3 modules (Flask, REST APIs, Databases)');
  console.log('- 3 lessons per module');
  console.log('- ~1,000 words per lesson');
  console.log('- Total: ~10,000 words');
  console.log('\n📊 Word Distribution:');
  console.log('- Module introductions: 3 × 400 = 1,200 words');
  console.log('- Lesson content: 9 × 800 = 7,200 words');
  console.log('- Examples: 9 × 200 = 1,800 words');
  console.log('- Exercises: 9 × 100 = 900 words');
  console.log('- Assessments: 3 × 300 = 900 words');
  console.log('- Total estimate: ~12,000 words (with buffer)');
}

// Run the test
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === '--direct') {
    testDirectGranulation();
  } else {
    testGranulatorViaKAM().then((requestId) => {
      if (requestId) {
        console.log(`\n✅ Test complete! Request ID: ${requestId}`);
        console.log('Monitor the request at: https://ai-factory-frontend.pages.dev/admin.html#requests');
      }
    }).catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
  }
}

module.exports = { testGranulatorViaKAM, testDirectGranulation };