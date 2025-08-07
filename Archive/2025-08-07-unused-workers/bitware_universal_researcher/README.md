# 🔬 Universal Researcher 2.0 - Implementation Guide

## 📋 Implementation Overview

Universal Researcher 2.0 is a complete replacement for the current topic researcher, featuring:

- **Template-driven execution** with StandardWorkerResponse format
- **Multi-platform discovery** (RSS, YouTube, podcasts, academic sources)
- **Client context tracking** with proper client_id integration  
- **Backward compatibility** with v1.0 API endpoints
- **Universal database schema** for cross-platform source storage

## 🚀 Deployment Steps

### 1. Create New Worker (30 minutes)

```bash
# Create worker directory
mkdir workers/bitware_universal_researcher
cd workers/bitware_universal_researcher

# Copy implementation files
# - index.ts (main worker code)
# - wrangler.toml (configuration)
# - schema.sql (database schema)
# - test.sh (test suite)
```

### 2. Database & Storage Setup (15 minutes)

```bash
# Create D1 database
wrangler d1 create universal-discovery-db
# Update wrangler.toml with returned database ID

# Create KV namespace
wrangler kv:namespace create DISCOVERY_CACHE  
# Update wrangler.toml with returned namespace ID

# Initialize database schema
wrangler d1 execute universal-discovery-db --file=schema.sql --remote
```

### 3. Configure Secrets (10 minutes)

```bash
# Required secrets
wrangler secret put CLIENT_API_KEY
wrangler secret put WORKER_SHARED_SECRET
wrangler secret put OPENAI_API_KEY

# Optional for enhanced capabilities
wrangler secret put YOUTUBE_API_KEY
wrangler secret put GOOGLE_SEARCH_API_KEY
wrangler secret put GOOGLE_SEARCH_ENGINE_ID
```

### 4. Deploy & Test (20 minutes)

```bash
# Deploy worker
wrangler deploy

# Run comprehensive test suite
chmod +x test.sh
./test.sh

# Test specific capabilities
curl https://bitware-universal-researcher.yourdomain.workers.dev/health
curl https://bitware-universal-researcher.yourdomain.workers.dev/templates
```

## 🔄 Integration with Existing System

### Update Orchestrator Integration

**Replace orchestrator service binding:**

```toml
# In workers/bitware_orchestrator/wrangler.toml
[[services]]
binding = "UNIVERSAL_RESEARCHER"  # Changed from TOPIC_RESEARCHER
service = "bitware-universal-researcher"
```

**Update orchestrator worker registry:**

```sql
-- Update worker registry in orchestrator database
UPDATE worker_registry 
SET 
  worker_name = 'universal_researcher',
  service_binding = 'UNIVERSAL_RESEARCHER',
  capabilities = 'multi_platform_discovery,template_driven,client_context',
  input_format = 'template_execution',
  output_format = 'standard_worker_response'
WHERE worker_name = 'topic_researcher';
```

### Update Frontend Integration

**Update Pages Functions proxy:**

```toml
# In Pages wrangler.toml
[[services]]
binding = "UNIVERSAL_RESEARCHER"
service = "bitware-universal-researcher"
```

**Update dashboard worker URLs:**

```toml
# In Pages wrangler.toml [vars]
UNIVERSAL_RESEARCHER_URL = "https://bitware-universal-researcher.yourdomain.workers.dev"
```

## 🎯 Template System Usage

### RSS Discovery Template

```json
{
  "context": {
    "client_id": "acme_corp_001",
    "request_id": "req_12345",
    "pipeline_id": "pipe_67890",
    "billing_tier": "pro"
  },
  "template": {
    "capability": "search_rss",
    "parameters": {
      "depth": 3,
      "quality_threshold": 0.8
    },
    "output_format": "standard"
  },
  "data": {
    "topic": "artificial intelligence"
  }
}
```

### YouTube Discovery Template

```json
{
  "context": {
    "client_id": "acme_corp_001",
    "request_id": "req_12346", 
    "pipeline_id": "pipe_67891",
    "billing_tier": "enterprise"
  },
  "template": {
    "capability": "search_youtube",
    "parameters": {
      "content_type": "channels",
      "subscriber_threshold": 10000
    },
    "output_format": "standard"
  },
  "data": {
    "topic": "machine learning tutorials"
  }
}
```

### Multi-Platform Discovery Template

```json
{
  "context": {
    "client_id": "acme_corp_001",
    "request_id": "req_12347",
    "pipeline_id": "pipe_67892", 
    "billing_tier": "enterprise"
  },
  "template": {
    "capability": "search_all",
    "parameters": {
      "platforms": ["rss", "youtube", "podcasts"],
      "max_per_platform": 10
    },
    "output_format": "standard"
  },
  "data": {
    "topic": "blockchain technology"
  }
}
```

## 📊 StandardWorkerResponse Format

Universal Researcher 2.0 returns consistent responses:

```json
{
  "status": "ok",
  "timestamp": "2025-07-29T12:00:00.000Z",
  "cached": false,
  "metrics": {
    "total_requests": 157,
    "success_rate": 94.2,
    "active_jobs": 2,
    "last_error_count": 1,
    "avg_response_time_ms": 1847
  },
  "health": {
    "status": "healthy",
    "database_connected": true,
    "external_apis_connected": true,
    "last_check": "2025-07-29T12:00:00.000Z"
  },
  "data": {
    "session_id": "session_1722254400_abc123",
    "sources": [
      {
        "id": "src_1722254400_def456",
        "platform": "rss",
        "identifier": "https://feeds.example.com/ai-news.xml",
        "title": "AI News Feed",
        "description": "Latest AI developments...",
        "quality_score": 0.92,
        "relevance_score": 0.88,
        "discovery_method": "ai_search_query: AI research feeds",
        "metadata": {
          "feed_type": "rss",
          "last_updated": "2025-07-29T11:30:00.000Z",
          "item_count": 45,
          "language": "en"
        },
        "verified": true
      }
    ],
    "platform_breakdown": {
      "rss": 8,
      "youtube": 5,
      "podcast": 2
    },
    "avg_quality_score": 0.87,
    "total_sources": 15,
    "execution_time_ms": 2140,
    "template_used": "search_all",
    "client_context": {
      "client_id": "acme_corp_001",
      "request_id": "req_12347",
      "pipeline_id": "pipe_67892",
      "billing_tier": "enterprise"
    }
  }
}
```

## 🔙 Backward Compatibility

Universal Researcher 2.0 maintains full v1.0 compatibility:

```bash
# V1.0 endpoint still works
curl "https://bitware-universal-researcher.yourdomain.workers.dev/?topic=AI&depth=3" \
  -H "X-API-Key: your-key"

# Returns v1.0 compatible format:
{
  "sources": [...],
  "session_id": "...",
  "quality_score": 0.87
}
```

## 🎨 Frontend Dashboard Updates

### Worker Card Updates

Add template selection to researcher card in admin dashboard:

```html
<div class="worker-card universal-researcher">
  <h3>🔬 Universal Researcher</h3>
  
  <!-- Template Selection -->
  <div class="template-selector">
    <label>Template:</label>
    <select id="researcher-template">
      <option value="search_rss">RSS Discovery</option>
      <option value="search_youtube">YouTube Discovery</option>
      <option value="search_all">Multi-Platform</option>
    </select>
  </div>
  
  <!-- Client Context -->
  <div class="client-context">
    <label>Client ID:</label>
    <input type="text" id="client-id" placeholder="acme_corp_001">
  </div>
  
  <!-- Topic Input -->
  <div class="topic-input">
    <label>Topic:</label>
    <input type="text" id="topic" placeholder="artificial intelligence">
  </div>
  
  <!-- Execute Button -->
  <button onclick="executeUniversalResearch()">Execute Research</button>
  
  <!-- Results Display -->
  <div class="results-display">
    <!-- Platform breakdown, source counts, quality scores -->
  </div>
</div>
```

### JavaScript Integration

```javascript
async function executeUniversalResearch() {
  const template = document.getElementById('researcher-template').value;
  const clientId = document.getElementById('client-id').value;
  const topic = document.getElementById('topic').value;
  
  const requestBody = {
    context: {
      client_id: clientId || 'default_client',
      request_id: `req_${Date.now()}`,
      pipeline_id: `pipe_${Date.now()}`,
      billing_tier: 'pro'
    },
    template: {
      capability: template,
      parameters: getTemplateParameters(template),
      output_format: 'standard'
    },
    data: { topic }
  };
  
  const response = await fetch('/api/universal-researcher/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Token': getSessionToken()
    },
    body: JSON.stringify(requestBody)
  });
  
  const result = await response.json();
  displayUniversalResults(result);
}

function displayUniversalResults(result) {
  if (result.status === 'ok') {
    // Display sources by platform
    const breakdown = result.data.platform_breakdown;
    const sources = result.data.sources;
    
    // Update UI with platform breakdown and source list
    updatePlatformBreakdown(breakdown);
    updateSourcesList(sources);
    updateMetrics(result.metrics);
  } else {
    showError(result.error);
  }
}
```

## 🧪 Testing & Validation

### Comprehensive Test Coverage

The provided test suite validates:

- ✅ **Template system execution** (RSS, YouTube, multi-platform)
- ✅ **StandardWorkerResponse format** compliance
- ✅ **V1.0 backward compatibility** 
- ✅ **Authentication & authorization**
- ✅ **Error handling** for invalid requests
- ✅ **Database integration** and session tracking
- ✅ **Performance** and caching behavior

### Production Readiness Checklist

- [ ] **Database migrations** completed
- [ ] **Service bindings** updated in orchestrator
- [ ] **Frontend integration** tested
- [ ] **API keys configured** (OpenAI, YouTube, etc.)
- [ ] **Performance benchmarks** meet requirements
- [ ] **Error monitoring** configured
- [ ] **Backup & rollback plan** in place

## 🚀 Next Steps

### Week 1: Foundation Deployment
1. **Day 1-2:** Deploy Universal Researcher 2.0
2. **Day 3:** Update orchestrator integration
3. **Day 4:** Test end-to-end pipeline execution
4. **Day 5:** Update frontend dashboard

### Week 2: Enhanced Capabilities  
1. **Day 1-2:** Implement YouTube API integration
2. **Day 3-4:** Add podcast discovery capabilities
3. **Day 5:** Performance optimization and caching

### Week 3: Production Hardening
1. **Day 1-2:** Load testing and performance tuning
2. **Day 3-4:** Error handling and monitoring
3. **Day 5:** Documentation and training

## 🔄 Migration Strategy

### Gradual Rollout

1. **Deploy Universal Researcher** alongside existing topic researcher
2. **Feature flag** to route requests to new worker
3. **Shadow testing** - run both workers, compare results
4. **Gradual traffic shift** - 10% → 50% → 100%
5. **Decommission** old topic researcher

### Rollback Plan

- Keep old topic researcher deployed during transition
- Environment variable to switch between workers
- Database backup before migration
- Instant rollback capability if issues occur

## 📈 Success Metrics

### Technical KPIs
- **Response time** < 2 seconds for RSS discovery
- **Success rate** > 95% for all template executions
- **Template coverage** - all capabilities functional
- **Database performance** - queries < 100ms

### Business KPIs  
- **Source quality** - average score > 0.8
- **Platform diversity** - 3+ platforms per multi-search
- **Client satisfaction** - smooth transition from v1.0
- **Cost efficiency** - maintain or reduce per-request cost

---

**Universal Researcher 2.0 is ready for deployment and represents a major step toward AI Factory v2.0's universal worker architecture.**