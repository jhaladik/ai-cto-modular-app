# workers/bitware_rss_source_finder/README.md

# Bitware RSS Source Finder Worker v2.0

## 🔄 **Database-First Redesign**

This worker has been completely redesigned with proper D1 database integration, eliminating hardcoded JavaScript objects and complex matching logic in favor of reliable SQL queries.

## 🏗️ **Architecture**

### **Database Schema (D1)**
```sql
CREATE TABLE rss_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT NOT NULL,
  subtopic TEXT,
  quality_score REAL DEFAULT 0.7,
  language TEXT DEFAULT 'en',
  last_checked DATETIME DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_topic ON rss_sources(topic);
CREATE INDEX idx_active ON rss_sources(active);
CREATE INDEX idx_quality ON rss_sources(quality_score);
CREATE INDEX idx_language ON rss_sources(language);
```

### **Storage Components**
- **D1 Database**: `RSS_SOURCES_DB` - Stores all RSS source metadata
- **KV Cache**: `RSS_SOURCE_CACHE` - Caches query results for performance

## 🎯 **For AI Composers**

### **What This Worker Does**
I am a **database-driven RSS discovery service**. Give me any topic, and I'll return the highest-quality RSS feeds for that topic based on:
- Exact topic matches
- Subtopic matches  
- Title/description keyword matches
- Quality scoring (0.0 to 1.0)
- Language filtering

### **How To Use Me**

#### **Basic Discovery**
```bash
curl -H "X-API-Key: your-key" \
  "https://worker-url/?topic=artificial%20intelligence&maxFeeds=5"
```

#### **Quality Filtering**
```bash
curl -H "X-API-Key: your-key" \
  "https://worker-url/?topic=climate&minQualityScore=0.8&maxFeeds=10"
```

#### **Get Available Topics**
```bash
curl "https://worker-url/topics"  # No auth required
```

### **Response Format**
```json
{
  "status": "ok",
  "topic": "ai",
  "feeds": [
    {
      "id": 1,
      "url": "https://spectrum.ieee.org/rss/artificial-intelligence",
      "title": "IEEE Spectrum AI",
      "description": "Latest AI research and applications",
      "topic": "ai",
      "subtopic": "research",
      "quality_score": 0.95,
      "language": "en",
      "active": true
    }
  ],
  "cached": false,
  "timestamp": "2024-01-01T00:00:00Z",
  "stats": {
    "total_sources": 15,
    "filtered_by_quality": 8,
    "cache_hit": false
  }
}
```

## 🛠️ **Database Management**

### **Adding Sources (Admin Endpoint)**
```bash
curl -X POST \
  -H "Authorization: Bearer worker-shared-secret" \
  -H "X-Worker-ID: admin-client" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/feed.xml",
    "title": "Example AI News",
    "description": "Latest AI developments",
    "topic": "ai",
    "subtopic": "business",
    "quality_score": 0.8,
    "language": "en"
  }' \
  "https://worker-url/admin/add-source"
```

### **Database Statistics**
```bash
curl -H "Authorization: Bearer worker-shared-secret" \
     -H "X-Worker-ID: admin-client" \
     "https://worker-url/admin/stats"
```

### **Initial Data Population Script**
```sql
-- High-quality AI sources
INSERT INTO rss_sources (url, title, description, topic, subtopic, quality_score, language) VALUES
('https://spectrum.ieee.org/rss/artificial-intelligence', 'IEEE Spectrum AI', 'Latest AI research and applications', 'ai', 'research', 0.95, 'en'),
('https://www.technologyreview.com/feed/', 'MIT Technology Review', 'Cutting-edge technology and AI news', 'ai', 'research', 0.90, 'en'),
('https://venturebeat.com/ai/feed/', 'VentureBeat AI', 'AI business and startup news', 'ai', 'business', 0.85, 'en'),
('https://www.artificialintelligence-news.com/feed/', 'AI News', 'Artificial intelligence industry coverage', 'ai', 'industry', 0.80, 'en');

-- Climate sources
INSERT INTO rss_sources (url, title, description, topic, subtopic, quality_score, language) VALUES
('https://grist.org/feed/', 'Grist Climate News', 'Environmental journalism on climate change', 'climate', 'environment', 0.90, 'en'),
('https://www.climatechangenews.com/feed/', 'Climate Change News', 'Global climate policy and science', 'climate', 'policy', 0.88, 'en'),
('https://insideclimatenews.org/feed/', 'Inside Climate News', 'Climate science and policy reporting', 'climate', 'science', 0.85, 'en');

-- Science sources  
INSERT INTO rss_sources (url, title, description, topic, subtopic, quality_score, language) VALUES
('https://www.nature.com/nature.rss', 'Nature', 'Leading international weekly journal of science', 'science', 'research', 0.98, 'en'),
('https://www.sciencemag.org/rss/current.xml', 'Science Magazine', 'Cutting-edge research and discoveries', 'science', 'research', 0.95, 'en'),
('https://feeds.feedburner.com/sciencedaily', 'ScienceDaily', 'Latest research news across all sciences', 'science', 'news', 0.82, 'en');

-- Add more topics as needed...
```

## 🔧 **Deployment Setup**

### **1. Create D1 Database**
```bash
wrangler d1 create RSS_SOURCES_DB
# Copy the database_id from output to wrangler.toml
```

### **2. Create KV Namespace**
```bash
wrangler kv:namespace create RSS_SOURCE_CACHE
# Copy the id from output to wrangler.toml
```

### **3. Initialize Database Schema**
```bash
wrangler d1 execute RSS_SOURCES_DB --file=schema.sql
```

### **4. Populate Initial Data**
```bash
wrangler d1 execute RSS_SOURCES_DB --file=seed.sql
```

### **5. Deploy**
```bash
wrangler deploy
```

## 📊 **Quality Scoring Guidelines**

- **0.95-1.0**: Premier academic/research sources (Nature, IEEE, Science)
- **0.85-0.94**: High-quality news organizations (MIT Tech Review, Reuters)
- **0.70-0.84**: Good industry publications (TechCrunch, VentureBeat)
- **0.50-0.69**: Community/blog sources (Reddit, Medium)
- **Below 0.50**: Low-quality or questionable sources

## 🔄 **Integration with Other Workers**

### **As Input Provider**
This worker serves as the **entry point** for RSS-based AI pipelines:

1. **bitware_feed_fetcher** - Takes my URLs and downloads actual RSS content
2. **bitware_content_analyzer** - Takes my categorized sources for targeted analysis
3. **bitware_trend_detector** - Uses my quality scores to weight trend analysis

### **API Contract for Workers**
```typescript
// Worker-to-worker authentication
headers: {
  'Authorization': 'Bearer ${WORKER_SHARED_SECRET}',
  'X-Worker-ID': 'calling_worker_name'
}

// Standard response format all workers can expect
interface RSSSourceResponse {
  status: 'ok' | 'error';
  feeds: Array<{
    url: string;
    title: string;
    quality_score: number;
    topic: string;
    subtopic?: string;
  }>;
  stats: {
    total_sources: number;
    filtered_by_quality: number;
  };
}
```

## 🧠 **AI Composer Guidelines**

### **When To Use This Worker**
- ✅ Need RSS feeds for any topic
- ✅ Want quality-scored, curated sources
- ✅ Building news aggregation or analysis pipelines
- ✅ Need reliable, cached RSS discovery

### **When NOT To Use This Worker**
- ❌ Need real-time social media feeds (use social media workers)
- ❌ Want full article content (use feed fetcher workers after me)
- ❌ Need non-RSS data sources (use web scrapers)

### **Optimization Tips**
- Use `minQualityScore` parameter to filter for high-quality sources only
- Cache results by using consistent parameters
- Use `/topics` endpoint to see available categories before querying
- Monitor `/admin/stats` to understand source distribution

## 📈 **Performance Characteristics**

- **Cold start**: ~200ms (database query + processing)
- **Cached response**: ~50ms (KV retrieval)
- **Cache duration**: Configurable (default 24 hours)
- **Rate limits**: None (controlled by authentication)
- **Scalability**: Excellent (D1 + KV architecture)

## 🔐 **Security**

- **Client API**: X-API-Key header for external access
- **Worker-to-Worker**: Bearer token + Worker-ID for internal communication
- **Admin functions**: Worker authentication required
- **Public endpoints**: /help and /topics (no auth needed)

---

**This worker follows Bitware Oboe principles**: Self-contained, well-documented, database-driven, testable, and ready for AI orchestration.
**Purpose**: Discovers and ranks RSS feed sources for user-specified topics using semantic matching and caching.

**Role**: SourceDiscoveryWorker - Entry point for RSS pipeline

**Input**: Topic string, optional configuration parameters

**Output**: Ranked list of RSS feed URLs with relevance scores

**Storage**: KV cache for performance optimization

**Dependencies**: None (self-contained)

## 🔧 API Interface

### Endpoint
```
GET /?topic={topic}&maxFeeds={number}&language={lang}&cacheHours={hours}
```

### Authentication
**Client requests**: Include `X-API-Key` header with your API key
```bash
curl -H "X-API-Key: your-api-key" "https://worker-url/?topic=ai"
```

**Worker-to-worker requests**: Include worker authentication headers
```bash
curl -H "Authorization: Bearer worker-shared-secret" \
     -H "X-Worker-ID: calling_worker_name" \
     "https://worker-url/?topic=ai"
```

### Parameters
- `topic` (required): Search topic. Try: `ai`, `climate`, `crypto`, `science`, `space`, `gaming`, `health`, `business`
- `maxFeeds` (optional): Maximum feeds to return (default: 20)
- `language` (optional): Language preference (default: "en") 
- `cacheHours` (optional): Cache duration in hours (default: 24)

### Response Format
```json
{
  "status": "ok",
  "topic": "ai",
  "feeds": [
    {
      "url": "https://spectrum.ieee.org/rss/artificial-intelligence",
      "title": "IEEE Spectrum AI",
      "description": "Latest AI research and applications from IEEE",
      "relevanceScore": 0.95,
      "lastChecked": "2024-01-01T00:00:00Z"
    }
  ],
  "cached": false,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Example Requests
```bash
# Get AI sources
curl -H "X-API-Key: your-key" "worker-url/?topic=ai&maxFeeds=5"

# Get climate sources  
curl -H "X-API-Key: your-key" "worker-url/?topic=climate&maxFeeds=3"

# Get crypto sources
curl -H "X-API-Key: your-key" "worker-url/?topic=crypto&maxFeeds=4"

# Help (no auth needed)
curl "worker-url/help"
```

## 🚀 Deployment

### Prerequisites
1. Cloudflare Workers account
2. Wrangler CLI installed
3. KV namespace created

### Setup Steps
```bash
# 1. Create KV namespace and get the ID
wrangler kv:namespace create "RSS_SOURCE_CACHE"

# 2. Update wrangler.toml with the returned KV namespace ID

# 3. Deploy worker (use --env="" to target top-level environment)
wrangler deploy --env=""

# 4. Test deployment
./test.sh
```

## 🧪 Testing
Run the included test script to validate functionality:
```bash
chmod +x test.sh
./test.sh
```

## 🔄 Integration
This worker outputs data compatible with:
- `bitware_feed_scorer` (scores individual articles)
- `bitware_feed_fetcher` (downloads RSS content)
- Any system expecting RSS feed URL lists

## 📈 Performance
- **Caching**: 24-hour default cache reduces API calls
- **Scoring**: Keyword-based relevance ranking
- **Limits**: Configurable max feeds per request
- **Timeout**: 30-second execution limit

## 🛠️ Customization
Modify `getTopicBasedSources()` to add new topic categories or RSS sources.

Update `searchForRSSFeeds()` to integrate with external RSS discovery APIs.

---
