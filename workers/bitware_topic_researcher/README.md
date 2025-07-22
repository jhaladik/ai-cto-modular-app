# Bitware Topic Researcher 🔍

**AI-powered RSS source discovery worker using web search and LLM validation**

A Bitware Oboe worker that discovers and validates new RSS sources for any topic using web search combined with AI analysis for quality scoring and validation.

## 🧱 Worker Specifications

- **Type**: ContentDiscoverer
- **Role**: Discover and validate new RSS sources for topics using AI and web search
- **Storage**: D1 database + KV cache + parameter storage
- **Dependencies**: OpenAI API, web search capabilities
- **Performance**: 5-15 second response times, 1-hour caching

## 🚀 Quick Start

### 1. Prerequisites

```bash
# Install dependencies
npm install

# Login to Cloudflare
npx wrangler login
```

### 2. Create Resources

```bash
# Create D1 database
npx wrangler d1 create topic-research-db

# Create KV namespace
npx wrangler kv:namespace create RESEARCH_CACHE

# Update wrangler.toml with the returned IDs
```

### 3. Initialize Database

```bash
# Create schema
npx wrangler d1 execute topic-research-db --file=schema.sql

# Optional: Add seed data if you have any
# npx wrangler d1 execute topic-research-db --file=seed.sql
```

### 4. Set Secrets

```bash
# Set OpenAI API key
npx wrangler secret put OPENAI_API_KEY
# Enter your OpenAI API key when prompted
```

### 5. Deploy

```bash
# Deploy to development
npm run deploy-dev

# Deploy to production  
npm run deploy-prod
```

### 6. Test

```bash
# Run comprehensive test suite
chmod +x test.sh
./test.sh
```

## 📋 API Reference

### Public Endpoints (No Auth Required)

#### `GET /help`
Returns worker documentation and API reference.

**Response:**
```json
{
  "worker": "bitware_topic_researcher",
  "version": "1.0.0",
  "description": "Discover and validate new RSS sources...",
  "endpoints": {...},
  "parameters": {...}
}
```

#### `GET /capabilities`
Returns worker capabilities and specifications.

### Main Endpoints (Client Auth Required)

**Authentication:** `X-API-Key: your-api-key`

#### `GET /?topic=<topic>&depth=<1-5>&min_quality=<0.0-1.0>`
Research RSS sources for a topic.

**Parameters:**
- `topic` (required): Topic to research (e.g., "quantum computing")
- `depth` (optional): Research depth 1-5 (default: 3)
- `exclude_domains` (optional): Comma-separated domains to exclude
- `min_quality` (optional): Minimum quality score 0.0-1.0 (default: 0.6)
- `max_sources` (optional): Maximum sources to return (default: 20)

**Example:**
```bash
curl -H "X-API-Key: your-key" \
  "https://your-worker.workers.dev/?topic=artificial%20intelligence&depth=3&min_quality=0.7"
```

**Response:**
```json
{
  "status": "ok",
  "topic": "artificial intelligence",
  "session_id": 123,
  "sources_discovered": 15,
  "quality_sources": 8,
  "sources": [
    {
      "url": "https://example.com/ai-feed.xml",
      "domain": "example.com",
      "title": "AI Research Updates",
      "quality_score": 0.85,
      "validation_status": "valid",
      "discovery_method": "web_search"
    }
  ],
  "research_time_ms": 8500,
  "cached": false
}
```

### Admin Endpoints (Worker Auth Required)

**Authentication:** 
- `Authorization: Bearer worker-shared-secret`
- `X-Worker-ID: bitware_topic_researcher`

#### `GET /admin/stats`
Research statistics and metrics.

#### `GET /admin/sessions`
Recent research sessions.

#### `GET /admin/sources?session_id=<id>`
Sources discovered in a specific session.

## 🏭 Integration with AI Factory

### Worker Chain Integration

The Topic Researcher integrates with other workers in the pipeline:

```typescript
// Discover new sources
const researchResults = await fetch('https://bitware-topic-researcher.workers.dev/', {
  headers: { 'X-API-Key': apiKey },
  method: 'GET',
  url: `?topic=${topic}&depth=3&min_quality=0.7`
});

// Pass discovered sources to librarian for curation
const libraryResults = await fetch('https://bitware-rss-librarian.workers.dev/admin/add-sources', {
  headers: { 
    'Authorization': `Bearer ${workerSecret}`,
    'X-Worker-ID': 'bitware_topic_researcher',
    'Content-Type': 'application/json'
  },
  method: 'POST',
  body: JSON.stringify({ sources: researchResults.sources })
});
```

### Data Flow

1. **Input**: Topic string + research parameters
2. **Processing**: Web search + AI validation + quality scoring
3. **Output**: Validated RSS sources with quality scores
4. **Next Step**: Sources flow to RSS Librarian for curation

## 🧠 AI Capabilities

### Web Search Discovery
- Generates intelligent search queries based on topic
- Searches for RSS directories, blog aggregators, news sites
- Adapts search depth based on topic complexity

### AI-Enhanced Discovery
- Uses OpenAI GPT-4o-mini to suggest authoritative sources for topics
- Identifies domain authority and content relevance
- Suggests sources not found through web search

### Quality Scoring
- AI-powered assessment of source authority using OpenAI
- Relevance scoring for specific topics
- Update frequency and content quality analysis
- Scores range from 0.0 (poor) to 1.0 (excellent)

### Validation Pipeline
- URL format validation for RSS feeds
- HTTP status checking for feed availability
- Content type verification
- Duplicate detection and prevention

## 📊 Database Schema

### Research Sessions
Tracks each topic research request with metadata and results.

```sql
CREATE TABLE research_sessions (
  id INTEGER PRIMARY KEY,
  topic TEXT NOT NULL,
  search_depth INTEGER DEFAULT 3,
  sources_found INTEGER DEFAULT 0,
  quality_sources INTEGER DEFAULT 0,
  research_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active'
);
```

### Discovered Sources
Stores all RSS feeds found during research with quality metrics.

```sql
CREATE TABLE discovered_sources (
  id INTEGER PRIMARY KEY,
  session_id INTEGER,
  url TEXT UNIQUE NOT NULL,
  domain TEXT NOT NULL,
  title TEXT,
  description TEXT,
  quality_score REAL,
  validation_status TEXT,
  discovery_method TEXT,
  discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🔒 Security

### Authentication Layers

1. **Client → Worker**: API key validation
2. **Worker → Worker**: Shared secret + Worker ID
3. **Worker → External APIs**: Service-specific keys (OpenAI)

### Data Protection
- Parameterized SQL queries prevent injection
- Input validation and sanitization
- Rate limiting via Cloudflare
- CORS headers for browser security

## 🚦 Performance

### Response Times
- **Cold start**: 5-15 seconds (includes AI processing)
- **Cached results**: 100-500ms
- **Cache duration**: 1 hour per topic+depth combination

### Optimization Features
- KV caching for repeated requests
- Batch processing for multiple sources
- Efficient database indexing
- Smart query generation

## 🧪 Testing Strategy

### Automated Test Suite
The included `test.sh` script validates:

1. **Public endpoints** (help, capabilities, CORS)
2. **Authentication** (client keys, worker auth, invalid access)
3. **Main functionality** (various topics, parameters)
4. **Caching performance** (speed improvement verification)
5. **Admin operations** (stats, sessions, source management)
6. **Edge cases** (long topics, special characters, invalid params)

### Manual Testing Topics
For comprehensive testing, try these diverse topics:
- "artificial intelligence" (tech)
- "climate change" (science)
- "quantum computing" (specialized tech)
- "renewable energy" (industry)
- "cybersecurity" (security)

## 🔧 Troubleshooting

### Common Issues

**High response times:**
- Check OpenAI API status and rate limits
- Verify web search is functioning
- Monitor D1 database performance

**Low quality scores:**
- Adjust `min_quality` parameter
- Check if topic is too specific/broad
- Review AI scoring prompts for relevance

**No sources discovered:**
- Verify topic spelling and relevance
- Check excluded domains list
- Try reducing quality threshold
- Increase search depth

### Monitoring

```bash
# View real-time logs
npm run logs

# Check database statistics
curl -H "Authorization: Bearer $WORKER_SECRET" \
     -H "X-Worker-ID: bitware_topic_researcher" \
     "https://your-worker.workers.dev/admin/stats"
```

## 🛠 Development

### Local Development
```bash
# Run locally with hot reload
npm run dev

# Test against local instance
WORKER_URL="http://localhost:8787" ./test.sh
```

### Database Management
```bash
# View local database
npx wrangler d1 execute topic-research-db --command="SELECT * FROM research_sessions LIMIT 10"

# Reset database (destructive!)
npx wrangler d1 execute topic-research-db --file=schema.sql
```

## 🔄 Integration Patterns

### With RSS Librarian
```javascript
// Combine discovered sources with curated library
const [research, library] = await Promise.all([
  fetch('bitware-topic-researcher/?topic=' + topic),
  fetch('bitware-rss-librarian/?topic=' + topic)
]);

const allSources = [...research.sources, ...library.feeds];
```

### With Feed Fetcher
```javascript
// Pass discovered URLs to fetcher
const sources = research.sources.map(s => s.url);
const articles = await fetch('bitware-feed-fetcher/batch', {
  method: 'POST',
  body: JSON.stringify({ feed_urls: sources })
});
```

## 📈 Roadmap

### Phase 1 (Current) ✅
- Web search discovery
- AI quality scoring
- Basic validation
- Database storage

### Phase 2 (Next)
- Advanced content analysis
- Source freshness tracking
- Enhanced duplicate detection
- Performance optimizations

### Phase 3 (Future)
- Machine learning quality models
- Predictive source recommendations
- Advanced topic categorization
- Integration with content analysis

## 🏭 AI Factory Context

This worker is part of the **AI Factory RSS Pipeline**:

1. **bitware_topic_researcher** (this worker) - Discovers new sources
2. **bitware_rss_librarian** - Serves curated sources
3. **bitware_feed_fetcher** - Downloads RSS content
4. **bitware_content_classifier** - AI analysis and relevance
5. **bitware_report_builder** - Formatted output
6. **bitware_orchestrator** - Pipeline coordination

Each worker operates independently with its own database and storage, following the Bitware Oboe methodology for AI-maintainable systems.

## 📞 Support

For issues, feature requests, or integration support:
- Check the test suite output for specific error details
- Review database logs via admin endpoints
- Monitor OpenAI API usage and quotas
- Verify Cloudflare Workers performance metrics

---

**Status: Production Ready** ✅  
**Last Updated**: January 2025  
**Version**: 1.0.0