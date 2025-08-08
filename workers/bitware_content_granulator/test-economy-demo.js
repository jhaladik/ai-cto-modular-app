// Demo script to show economy tracking in action
// Tests with a simple request and shows cost tracking

const API_URL = 'https://bitware-content-granulator.jhaladik.workers.dev';
const WORKER_SECRET = 'internal-worker-auth-token-2024';
const WORKER_ID = 'test-worker';

async function runGranulation() {
  console.log('🚀 Running granulation with economy tracking demo\n');
  
  const request = {
    action: 'granulate',
    input: {
      topic: 'Cloud Computing Basics',
      structureType: 'course',
      templateName: 'educational_course_basic',
      granularityLevel: 1,
      targetAudience: 'beginners'
    },
    config: {
      aiProvider: 'openai',
      aiModel: 'gpt-4o-mini',
      temperature: 0.5,
      maxTokens: 2000
    }
  };

  console.log('📤 Request details:');
  console.log('  Topic:', request.input.topic);
  console.log('  Template:', request.input.templateName);
  console.log('  AI Provider:', request.config.aiProvider);
  console.log('  Model:', request.config.aiModel);
  console.log('  Max Tokens:', request.config.maxTokens);
  console.log('');

  try {
    // First get cost estimate
    console.log('💰 Getting cost estimate...');
    const estimateResponse = await fetch(`${API_URL}/api/economy/estimate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WORKER_SECRET}`,
        'X-Worker-ID': WORKER_ID
      },
      body: JSON.stringify({
        provider: request.config.aiProvider,
        model: request.config.aiModel,
        structureType: request.input.structureType,
        granularityLevel: request.input.granularityLevel
      })
    });

    if (estimateResponse.ok) {
      const estimate = await estimateResponse.json();
      console.log('\n📊 Cost Estimate:');
      console.log('  Estimated tokens:', estimate.estimate.tokens.total);
      console.log('  Estimated cost:', estimate.estimate.cost.total);
      console.log('  Cost breakdown:');
      console.log('    - Prompt:', estimate.estimate.cost.prompt);
      console.log('    - Completion:', estimate.estimate.cost.completion);
      
      if (estimate.alternatives && estimate.alternatives.length > 0) {
        console.log('\n💡 Cost-saving alternatives:');
        estimate.alternatives.forEach(alt => {
          console.log(`  - ${alt.provider}/${alt.model}: ${alt.cost} (Save: ${alt.savings})`);
        });
      }
    }

    // Now run the actual granulation
    console.log('\n🔄 Running granulation...');
    const start = Date.now();
    
    const response = await fetch(`${API_URL}/api/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WORKER_SECRET}`,
        'X-Worker-ID': WORKER_ID
      },
      body: JSON.stringify(request)
    });

    const duration = Date.now() - start;

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Error:', error.substring(0, 200));
      return;
    }

    const result = await response.json();
    
    console.log('\n✅ Granulation completed!');
    console.log('\n📈 Performance & Economy Metrics:');
    console.log('  Job ID:', result.output?.jobId);
    console.log('  Processing time:', duration, 'ms');
    console.log('  Quality score:', result.output?.qualityScore);
    
    if (result.usage) {
      console.log('\n📊 Token Usage:');
      console.log('  Input tokens:', result.usage.tokens?.input || 0);
      console.log('  Output tokens:', result.usage.tokens?.output || 0);
      console.log('  Total tokens:', result.usage.tokens?.total || 0);
    }
    
    if (result.cost !== undefined) {
      console.log('\n💵 Actual Cost:');
      console.log('  Total cost: $' + (result.cost || 0).toFixed(4));
    }
    
    if (result.metadata) {
      console.log('\n🤖 AI Provider Details:');
      console.log('  Provider used:', result.metadata.aiProvider);
      console.log('  Model used:', result.metadata.model);
    }

    // Get resource consumption stats
    console.log('\n📊 Fetching resource consumption stats...');
    const statsResponse = await fetch(`${API_URL}/api/economy/stats?days=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${WORKER_SECRET}`,
        'X-Worker-ID': WORKER_ID
      }
    });

    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log('\n📈 Resource Consumption Summary (Last 24h):');
      console.log('  Total requests:', stats.summary.totalRequests);
      console.log('  Total tokens:', stats.summary.totalTokens);
      console.log('  Total cost:', stats.summary.totalCost);
      
      if (stats.providerBreakdown && stats.providerBreakdown.length > 0) {
        console.log('\n🔄 Provider Usage:');
        stats.providerBreakdown.forEach(p => {
          console.log(`  ${p.provider}:`);
          console.log(`    - Requests: ${p.requests}`);
          console.log(`    - Tokens: ${p.tokens}`);
          console.log(`    - Cost: ${p.totalCost}`);
          console.log(`    - Avg time: ${p.avgProcessingTime}ms`);
        });
      }
    }

    return result;
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the demo
console.log('='.repeat(60));
console.log('CONTENT GRANULATOR - ECONOMY TRACKING DEMO');
console.log('='.repeat(60));
console.log('');

runGranulation().then(() => {
  console.log('\n' + '='.repeat(60));
  console.log('Demo completed!');
});