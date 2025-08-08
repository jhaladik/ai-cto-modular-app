// Test script for AI provider selection in Content Granulator
// Tests OpenAI, Claude, and Cloudflare AI providers

const API_URL = 'https://bitware-content-granulator.jhaladik.workers.dev';
const WORKER_SECRET = 'internal-worker-auth-token-2024';
const WORKER_ID = 'test-worker';

async function testAIProvider(providerConfig, description) {
  console.log(`\n🤖 Testing ${description}`);
  console.log('Provider:', providerConfig.aiProvider);
  console.log('Model:', providerConfig.aiModel);
  
  const request = {
    action: 'granulate',
    input: {
      topic: 'Introduction to Machine Learning',
      structureType: 'course',
      templateName: 'educational_course_basic',
      granularityLevel: 2,
      targetAudience: 'beginners'
    },
    config: providerConfig
  };

  try {
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

    const result = await response.json();
    const duration = Date.now() - start;

    if (!response.ok) {
      console.error('❌ Error:', result.error || 'Request failed');
      return;
    }

    console.log('✅ Success!');
    console.log('  Job ID:', result.output?.jobId);
    console.log('  Duration:', duration, 'ms');
    console.log('  AI Provider Used:', result.metadata?.aiProvider);
    console.log('  Model Used:', result.metadata?.model);
    console.log('  Cost:', result.cost ? `$${result.cost.toFixed(4)}` : 'N/A');
    console.log('  Quality Score:', result.output?.qualityScore);
    
    if (result.usage?.tokens) {
      console.log('  Tokens:', `${result.usage.tokens.input} in / ${result.usage.tokens.output} out`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function runTests() {
  console.log('🧪 AI Provider Selection Test Suite');
  console.log('=====================================');
  
  // Test 1: OpenAI (default)
  await testAIProvider({
    aiProvider: 'openai',
    aiModel: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 3000
  }, 'OpenAI GPT-4o-mini');

  // Test 2: Claude
  await testAIProvider({
    aiProvider: 'claude',
    aiModel: 'claude-3-haiku-20240307',
    temperature: 0.7,
    maxTokens: 4000
  }, 'Claude 3 Haiku');

  // Test 3: Cloudflare AI
  await testAIProvider({
    aiProvider: 'cloudflare',
    aiModel: '@cf/meta/llama-3-8b-instruct',
    temperature: 0.5,
    maxTokens: 2500
  }, 'Cloudflare Llama 3');

  // Test 4: Auto-select (no provider specified)
  await testAIProvider({
    temperature: 0.7,
    maxTokens: 3000
  }, 'Auto-select Provider');

  // Test 5: Check available providers
  console.log('\n📋 Checking Available Providers');
  try {
    const response = await fetch(`${API_URL}/api/ai-providers`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${WORKER_SECRET}`,
        'X-Worker-ID': WORKER_ID
      }
    });
    
    const providers = await response.json();
    console.log('Available providers:', JSON.stringify(providers, null, 2));
  } catch (error) {
    console.error('Error checking providers:', error.message);
  }
}

// Run tests
runTests().catch(console.error);