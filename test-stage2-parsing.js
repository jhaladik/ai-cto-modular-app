const https = require('https');

// Fetch project 5 data
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
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    const response = JSON.parse(data);
    const stage2Data = response.project.stages[1];
    
    console.log('Stage 2 Status:', stage2Data.status);
    console.log('Stage 2 Name:', stage2Data.stage_name);
    
    // Parse the nested data
    const outputData = JSON.parse(stage2Data.output_data);
    
    if (outputData.content) {
      // Remove markdown code blocks
      let jsonStr = outputData.content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      const parsedContent = JSON.parse(jsonStr);
      
      console.log('\nParsed Stage 2 Data:');
      console.log('- Total objects:', parsedContent.objects?.length || 0);
      console.log('- Characters:', parsedContent.objects?.filter(o => o.type === 'character').length || 0);
      console.log('- Locations:', parsedContent.objects?.filter(o => o.type === 'location').length || 0);
      console.log('- Timeline events:', parsedContent.timeline?.length || 0);
      
      if (parsedContent.objects && parsedContent.objects.length > 0) {
        console.log('\nFirst character:');
        const firstChar = parsedContent.objects.find(o => o.type === 'character');
        if (firstChar) {
          console.log('  Name:', firstChar.name);
          console.log('  Code:', firstChar.code);
          console.log('  Description (first 200 chars):', firstChar.description.substring(0, 200) + '...');
        }
      }
      
      if (parsedContent.timeline && parsedContent.timeline.length > 0) {
        console.log('\nFirst timeline event:');
        console.log('  Time:', parsedContent.timeline[0].time);
        console.log('  Description:', parsedContent.timeline[0].description);
      }
      
      console.log('\n✅ Stage 2 data parsing successful!');
    } else {
      console.log('No content field in Stage 2 data');
    }
  });
}).on('error', (e) => {
  console.error('Error:', e);
});