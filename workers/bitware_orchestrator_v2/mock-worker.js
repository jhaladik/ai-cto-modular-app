// Mock Worker for Testing Orchestrator 2.0
// This simulates worker responses when actual workers aren't available

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Worker-ID, X-Orchestrator-ID, X-Execution-ID, X-Stage-ID',
      'Content-Type': 'application/json'
    };

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Health check
    if (path === '/health' || path === '/') {
      return new Response(JSON.stringify({
        status: 'healthy',
        worker: 'mock_worker',
        timestamp: new Date().toISOString()
      }), { headers: corsHeaders });
    }

    // Mock research endpoint
    if (path === '/api/research' && method === 'POST') {
      const body = await request.json();
      const executionId = request.headers.get('X-Execution-ID');
      const stageId = request.headers.get('X-Stage-ID');

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));

      return new Response(JSON.stringify({
        success: true,
        output: {
          topic: body.topic || 'Unknown topic',
          findings: [
            {
              title: 'Key Finding 1',
              description: 'This is a mock finding about ' + (body.topic || 'the topic'),
              relevance: 0.95,
              source: 'Mock Source A'
            },
            {
              title: 'Key Finding 2', 
              description: 'Another important mock finding',
              relevance: 0.88,
              source: 'Mock Source B'
            },
            {
              title: 'Key Finding 3',
              description: 'Additional mock research data',
              relevance: 0.82,
              source: 'Mock Source C'
            }
          ],
          metadata: {
            sources_analyzed: 10,
            confidence_score: 0.92,
            processing_time_ms: 1500
          }
        },
        summary: {
          items_processed: 10,
          quality_score: 0.92,
          confidence_level: 0.9,
          processing_time_ms: 1500,
          resource_usage: {
            api_calls: 3,
            tokens_used: 450
          },
          errors: [],
          warnings: [],
          metrics: {
            accuracy: 0.92,
            coverage: 0.85
          },
          continue_pipeline: true
        },
        resource_usage: [
          {
            type: 'api',
            name: 'openai_gpt4',
            quantity: 450,
            unit: 'tokens',
            cost: 0.0135
          }
        ],
        execution_context: {
          execution_id: executionId,
          stage_id: stageId,
          worker: 'mock_topic_researcher'
        }
      }), { headers: corsHeaders });
    }

    // Mock RSS finder endpoint
    if (path === '/api/find' && method === 'POST') {
      const body = await request.json();
      
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 500));

      return new Response(JSON.stringify({
        success: true,
        output: {
          sources: [
            {
              url: 'https://mock-feed-1.com/rss',
              title: 'Mock RSS Feed 1',
              relevance: 0.9,
              articles_count: 25
            },
            {
              url: 'https://mock-feed-2.com/feed',
              title: 'Mock RSS Feed 2',
              relevance: 0.85,
              articles_count: 18
            }
          ],
          total_sources: 2
        },
        summary: {
          items_processed: 2,
          quality_score: 0.88,
          confidence_level: 0.85,
          processing_time_ms: 1000,
          resource_usage: {},
          errors: [],
          warnings: [],
          metrics: {
            sources_found: 2,
            sources_validated: 2
          },
          continue_pipeline: true
        },
        resource_usage: []
      }), { headers: corsHeaders });
    }

    // Mock feed fetcher endpoint
    if (path === '/api/fetch' && method === 'POST') {
      const body = await request.json();
      
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));

      return new Response(JSON.stringify({
        success: true,
        output: {
          articles: [
            {
              title: 'Mock Article 1',
              content: 'This is mock content for article 1',
              url: 'https://mock-article-1.com',
              published_date: new Date().toISOString(),
              relevance: 0.92
            },
            {
              title: 'Mock Article 2',
              content: 'This is mock content for article 2',
              url: 'https://mock-article-2.com',
              published_date: new Date().toISOString(),
              relevance: 0.87
            }
          ],
          total_fetched: 2
        },
        summary: {
          items_processed: 2,
          quality_score: 0.9,
          confidence_level: 0.88,
          processing_time_ms: 1500,
          resource_usage: {
            network_requests: 2
          },
          errors: [],
          warnings: [],
          metrics: {
            articles_fetched: 2,
            fetch_success_rate: 1.0
          },
          continue_pipeline: true
        },
        resource_usage: []
      }), { headers: corsHeaders });
    }

    // Mock classifier endpoint
    if (path === '/api/classify' && method === 'POST') {
      const body = await request.json();
      
      await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 1000));

      return new Response(JSON.stringify({
        success: true,
        output: {
          classifications: [
            {
              category: 'Technology',
              confidence: 0.95,
              subcategories: ['AI', 'Machine Learning'],
              sentiment: 'positive',
              importance: 'high'
            },
            {
              category: 'Business',
              confidence: 0.82,
              subcategories: ['Innovation'],
              sentiment: 'neutral',
              importance: 'medium'
            }
          ],
          summary_text: 'Content classified as primarily Technology-related with Business implications'
        },
        summary: {
          items_processed: 2,
          quality_score: 0.88,
          confidence_level: 0.85,
          processing_time_ms: 2000,
          resource_usage: {
            api_calls: 2,
            tokens_used: 300
          },
          errors: [],
          warnings: [],
          metrics: {
            classification_accuracy: 0.88,
            categories_identified: 2
          },
          continue_pipeline: true
        },
        resource_usage: [
          {
            type: 'api',
            name: 'openai_gpt35',
            quantity: 300,
            unit: 'tokens',
            cost: 0.0003
          }
        ]
      }), { headers: corsHeaders });
    }

    // Mock report builder endpoint
    if (path === '/api/build' && method === 'POST') {
      const body = await request.json();
      
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2500 + 1500));

      const report = {
        title: 'Intelligence Report',
        date: new Date().toISOString(),
        executive_summary: 'This mock report summarizes findings on the requested topic.',
        sections: [
          {
            title: 'Key Findings',
            content: 'Mock finding 1: Important discovery\nMock finding 2: Relevant trend\nMock finding 3: Critical insight'
          },
          {
            title: 'Analysis',
            content: 'Based on mock data analysis, we observe significant patterns in the research area.'
          },
          {
            title: 'Recommendations',
            content: '1. Take action on finding 1\n2. Monitor trend from finding 2\n3. Investigate finding 3 further'
          }
        ],
        metadata: {
          sources_count: 10,
          confidence_level: 0.9,
          generation_time_ms: 2000
        }
      };

      return new Response(JSON.stringify({
        success: true,
        output: report,
        summary: {
          items_processed: 1,
          quality_score: 0.92,
          confidence_level: 0.9,
          processing_time_ms: 2000,
          resource_usage: {
            api_calls: 1,
            tokens_used: 500
          },
          errors: [],
          warnings: [],
          metrics: {
            report_sections: 3,
            word_count: 150
          },
          continue_pipeline: false // Last stage
        },
        resource_usage: [
          {
            type: 'api',
            name: 'openai_gpt4',
            quantity: 500,
            unit: 'tokens',
            cost: 0.015
          }
        ],
        deliverable: {
          type: 'report',
          format: 'json',
          size_bytes: JSON.stringify(report).length,
          storage_reference: 'mock_report_' + Date.now()
        }
      }), { headers: corsHeaders });
    }

    // Mock handshake acknowledgment
    if (path === '/api/handshake' && method === 'POST') {
      const body = await request.json();
      
      return new Response(JSON.stringify({
        success: true,
        packet_id: body.handshake?.packet_id || 'mock_packet_' + Date.now(),
        status: 'accepted',
        message: 'Handshake received and accepted by mock worker'
      }), { headers: corsHeaders });
    }

    // Default 404
    return new Response(JSON.stringify({
      error: 'Endpoint not found',
      path: path,
      method: method
    }), { 
      status: 404,
      headers: corsHeaders 
    });
  }
};