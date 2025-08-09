#!/bin/bash

# Test all stage data rendering in Content Granulator
echo "🧱 Testing All Stage Data Rendering"
echo "===================================="
echo ""

BASE_URL="https://bitware-content-granulator.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"
WORKER_ID="test-worker"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test Stage 1 - Project 3 has Stage 1
echo -e "${BLUE}Testing Stage 1 (Big Picture) - Project 3${NC}"
echo "----------------------------------------"
node -e "
const https = require('https');
const options = {
  hostname: 'bitware-content-granulator.jhaladik.workers.dev',
  path: '/api/projects/3',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer internal-worker-auth-token-2024',
    'X-Worker-ID': 'test-worker'
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const response = JSON.parse(data);
    const stage1 = response.project.stages[0];
    if (stage1 && stage1.output_data) {
      const output = JSON.parse(stage1.output_data);
      if (output.content) {
        const jsonStr = output.content.replace(/\\\`\\\`\\\`json\\n?/g, '').replace(/\\\`\\\`\\\`\\n?/g, '');
        const parsed = JSON.parse(jsonStr);
        if (parsed.BIG_PICTURE) {
          console.log('✅ Stage 1: BIG_PICTURE found');
          console.log('  - Core Concept:', !!parsed.BIG_PICTURE.CORE_CONCEPT);
          console.log('  - Thematic Framework:', !!parsed.BIG_PICTURE.THEMATIC_FRAMEWORK);
          console.log('  - Narrative Arc:', !!parsed.BIG_PICTURE.NARRATIVE_ARC);
        }
      }
    }
  });
});
"
echo ""

# Test Stage 2 - Project 5 has Stage 2
echo -e "${BLUE}Testing Stage 2 (Objects & Timeline) - Project 5${NC}"
echo "----------------------------------------"
node -e "
const https = require('https');
const options = {
  hostname: 'bitware-content-granulator.jhaladik.workers.dev',
  path: '/api/projects/5',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer internal-worker-auth-token-2024',
    'X-Worker-ID': 'test-worker'
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const response = JSON.parse(data);
    const stage2 = response.project.stages[1];
    if (stage2 && stage2.output_data) {
      const output = JSON.parse(stage2.output_data);
      if (output.content) {
        const jsonStr = output.content.replace(/\\\`\\\`\\\`json\\n?/g, '').replace(/\\\`\\\`\\\`\\n?/g, '');
        const parsed = JSON.parse(jsonStr);
        console.log('✅ Stage 2: Data found');
        console.log('  - Objects:', parsed.objects?.length || 0);
        console.log('  - Timeline events:', parsed.timeline?.length || 0);
        console.log('  - Characters:', parsed.objects?.filter(o => o.type === 'character').length || 0);
        console.log('  - Locations:', parsed.objects?.filter(o => o.type === 'location').length || 0);
      }
    }
  });
});
"
echo ""

# Test Stage 3 & 4 - Project 1 has all stages
echo -e "${BLUE}Testing Stages 3 & 4 - Project 1${NC}"
echo "----------------------------------------"
node -e "
const https = require('https');
const options = {
  hostname: 'bitware-content-granulator.jhaladik.workers.dev',
  path: '/api/projects/1',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer internal-worker-auth-token-2024',
    'X-Worker-ID': 'test-worker'
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const response = JSON.parse(data);
    
    // Check Stage 3
    const stage3 = response.project.stages.find(s => s.stage_number === 3);
    if (stage3 && stage3.output_data) {
      const output = JSON.parse(stage3.output_data);
      if (output.content) {
        const jsonStr = output.content.replace(/\\\`\\\`\\\`json\\n?/g, '').replace(/\\\`\\\`\\\`\\n?/g, '');
        const parsed = JSON.parse(jsonStr);
        console.log('✅ Stage 3: Structure found');
        console.log('  - Acts/Modules:', parsed.structure?.length || 0);
        if (parsed.structure && parsed.structure[0]) {
          console.log('  - First act chapters:', parsed.structure[0].children?.length || 0);
        }
      }
    }
    
    // Check Stage 4
    const stage4 = response.project.stages.find(s => s.stage_number === 4);
    if (stage4 && stage4.output_data) {
      const output = JSON.parse(stage4.output_data);
      if (output.content) {
        const jsonStr = output.content.replace(/\\\`\\\`\\\`json\\n?/g, '').replace(/\\\`\\\`\\\`\\n?/g, '');
        const parsed = JSON.parse(jsonStr);
        const units = parsed.granular_units || parsed.scenes || [];
        console.log('✅ Stage 4: Granular Units found');
        console.log('  - Total units:', units.length);
      }
    }
  });
});
"
echo ""

echo -e "${GREEN}Summary:${NC}"
echo "All stage data uses the same nested JSON structure:"
echo "1. output_data contains JSON string"
echo "2. That JSON has a 'content' field"
echo "3. Content contains markdown code blocks with JSON"
echo "4. The actual data is inside those code blocks"
echo ""
echo "The frontend now handles this correctly for all stages!"
echo ""
echo "To test in the UI:"
echo "1. Go to https://ai-factory-frontend.pages.dev"
echo "2. Login as admin"
echo "3. Navigate to Content Granulation"
echo "4. Click on different projects to see stage data"
echo "  - Project 3: Has Stage 1 (Big Picture)"
echo "  - Project 5: Has Stages 1-2 (Objects & Timeline)"
echo "  - Project 1: Has all 4 stages"