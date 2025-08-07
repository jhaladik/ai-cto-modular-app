// Mock Worker for Testing Orchestrator 2.0
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Basic CORS headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Worker-ID'
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }
    
    // Mock endpoints
    if (path === '/') {
      return new Response(JSON.stringify({
        status: 'healthy',
        service: 'mock-worker',
        version: '1.0.0'
      }), { headers });
    }
    
    if (path === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        service: 'mock-worker',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        capabilities: {
          input_types: ['text', 'json', 'reference'],
          output_types: ['json', 'html', 'csv'],
          max_processing_time_ms: 60000,
          supports_streaming: false
        }
      }), { headers });
    }
    
    if (path === '/api/handshake') {
      const body = await request.json();
      return new Response(JSON.stringify({
        success: true,
        packet_id: body.packet_id,
        worker_name: 'mock-worker',
        status: 'ready',
        capabilities: {
          input_types: ['text', 'json', 'reference'],
          output_types: ['json', 'html', 'csv'],
          max_processing_time_ms: 60000,
          supports_streaming: false
        },
        resource_requirements: {
          min_memory_mb: 128,
          max_memory_mb: 512,
          estimated_cpu_ms: 1000,
          api_calls: {
            openai: 0,
            anthropic: 0
          }
        }
      }), { headers });
    }
    
    if (path === '/api/process') {
      const body = await request.json();
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
      
      return new Response(JSON.stringify({
        success: true,
        packet_id: body.packet_id,
        output: {
          processed: true,
          timestamp: new Date().toISOString(),
          input_size: JSON.stringify(body.input || {}).length,
          result: {
            message: "Mock processing completed",
            data: {
              sample: "This is mock output data",
              metadata: {
                processor: "mock-worker",
                version: "1.0.0"
              }
            }
          }
        },
        metrics: {
          processing_time_ms: Math.random() * 1000,
          tokens_used: Math.floor(Math.random() * 1000),
          api_calls_made: 0
        }
      }), { headers });
    }
    
    if (path === '/api/acknowledge') {
      const body = await request.json();
      return new Response(JSON.stringify({
        success: true,
        packet_id: body.packet_id,
        acknowledged: true
      }), { headers });
    }
    
    return new Response(JSON.stringify({
      error: 'Not found',
      path: path
    }), { 
      status: 404,
      headers 
    });
  }
};