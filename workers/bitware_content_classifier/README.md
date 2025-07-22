# bitware_content_classifier

## AI-Powered Content Analysis Engine 🧠

**Worker Type:** AIProcessor  
**Pipeline Position:** Stage 4 of 5 in AI Factory RSS Intelligence Pipeline  
**AI Model:** OpenAI GPT-4o-mini  
**Performance:** 2-3 seconds per article, 30-60 seconds for 20-article batches  

### Overview

The `bitware_content_classifier` is the intelligent core of the AI Factory RSS Pipeline. It transforms raw RSS articles from the `bitware_feed_fetcher` into rich, AI-analyzed content with relevance scores, sentiment analysis, topic classification, and key insights.

This worker follows the **Bitware Oboe** methodology for AI-maintainable modular systems, ensuring complete independence, comprehensive documentation, and seamless integration with other pipeline workers.

---

## 🎯 Core Capabilities

### AI-Powered Analysis
- **Relevance Scoring** (0.0-1.0): Rate article relevance to target topics
- **Sentiment Analysis** (-1.0 to 1.0): Positive/negative/neutral sentiment detection  
- **Topic Classification**: Automatic detection of main themes and topics
- **Entity Extraction**: Key people, companies, technologies identification
- **Quality Assessment**: Content quality and authority scoring
- **Smart Summarization**: AI-generated concise summaries

### Performance Optimization
- **Batch Processing**: Efficient multi-article analysis in single AI calls
- **Intelligent Caching**: 2-hour KV cache for identical requests
- **Cost Management**: OpenAI token usage optimization and cost tracking
- **Error Recovery**: Graceful handling of AI API failures with retry logic

### Enterprise Features
- **Database-First Design**: Complete analysis history in D1 database
- **Admin Monitoring**: Comprehensive stats, cost tracking, and job management  
- **Quality Metrics**: Confidence scoring and analysis quality assessment
- **Integration Ready**: Standard APIs for worker-to-worker communication

---

## 📊 Database Schema

### Core Tables

```sql
-- Analysis jobs track each AI processing request
analysis_jobs (
    id, target_topic, analysis_depth, articles_submitted,
    articles_processed, avg_relevance_score, processing_cost_usd,
    status, started_at, completed_at
)

-- Article analysis stores AI insights for each article  
article_analysis (
    id, job_id, article_url, target_topic, relevance_score,
    confidence_score, sentiment_score, detected_topics,
    key_entities, quality_score, summary, reasoning, analyzed_at
)
```

### Analytics Tables
- `topic_performance` - Topic-specific analysis metrics
- `cost_tracking` - Daily cost breakdown and budget management
- `quality_metrics` - Analysis quality distribution tracking

---

## 🔗 API Reference

### Public Endpoints (No Authentication)

#### `GET /help`
Returns comprehensive worker documentation and API specifications.

```bash
curl https://your-worker.workers.dev/help
```

#### `GET /capabilities` 
Returns worker capabilities, input/output formats, and integration specifications.

#### `GET /health`
Health check endpoint for monitoring and load balancing.

```json
{
  "status": "healthy",
  "database": "connected", 
  "total_jobs": 42,
  "openai_configured": true
}
```

### Main Analysis Endpoints (Client Authentication Required)

#### `POST /analyze` - Comprehensive Article Analysis

**Headers:**
- `X-API-Key: your-client-api-key`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "articles": [
    {
      "article_url": "https://www.bbc.com/news/technology/ai-breakthrough",
      "title": "AI Breakthrough Shows Human-Level Reasoning",
      "content": "Researchers have developed a revolutionary AI system...",
      "author": "Technology Reporter",
      "pub_date": "2025-07-22T10:00:00Z",
      "source_feed": "BBC Technology",
      "word_count": 247
    }
  ],
  "target_topic": "artificial intelligence",
  "analysis_depth": "standard",
  "include_summary": true,
  "min_confidence": 0.7
}
```

**Response:**
```json
{
  "status": "ok",
  "job_id": 42,
  "target_topic": "artificial intelligence", 
  "articles_processed": 1,
  "quality_results": 1,
  "avg_relevance_score": 0.94,
  "analysis_results": [
    {
      "article_url": "https://www.bbc.com/news/technology/ai-breakthrough",
      "relevance_score": 0.94,
      "confidence_score": 0.91,
      "sentiment_score": 0.3,
      "detected_topics": ["artificial intelligence", "machine learning", "research"],
      "key_entities": ["Stanford University", "neural networks", "automation"],
      "quality_score": 0.88,
      "summary": "Stanford researchers develop AI system with human-level reasoning capabilities",
      "reasoning": "Highly relevant due to direct focus on AI research breakthroughs..."
    }
  ],
  "processing_time_ms": 3420,
  "estimated_cost_usd": 0.0023
}
```

#### `POST /analyze/single` - Single Article Analysis
Optimized endpoint for analyzing individual articles.

#### `POST /analyze/batch` - Batch Processing
High-efficiency endpoint for processing multiple articles with advanced batching.

### Admin Endpoints (Worker Authentication Required)

**Headers:**
- `Authorization: Bearer worker-shared-secret`
- `X-Worker-ID: bitware_content_classifier`

#### `GET /admin/stats` - Analysis Statistics
```json
{
  "total_jobs": 156,
  "completed_jobs": 142,
  "avg_articles_per_job": 8.5,
  "overall_avg_relevance": 0.78,
  "total_cost_usd": 12.43,
  "top_topics": [
    {"topic": "artificial intelligence", "analysis_count": 23, "avg_relevance": 0.85}
  ]
}
```

#### `GET /admin/jobs` - Recent Analysis Jobs
Returns list of recent analysis jobs with status and performance metrics.

#### `GET /admin/costs` - Cost Analysis  
Detailed cost breakdown by date, job, and article with budget tracking.

---

## 🚀 Quick Start

### 1. Deploy the Worker

```bash
# Clone and setup
git clone your-repo/ai-factory-pipeline
cd workers/bitware_content_classifier

# Install dependencies
npm install

# Setup database and KV storage
npm run setup

# Configure secrets
wrangler secret put OPENAI_API_KEY
wrangler secret put WORKER_SHARED_SECRET  
wrangler secret put CLIENT_API_KEY

# Deploy to development
npm run deploy:dev
```

### 2. Test the Deployment

```bash
# Set environment variables
export WORKER_URL="https://your-worker.workers.dev"
export CLIENT_API_KEY="your-client-key"

# Run comprehensive test suite
npm test
```

### 3. Analyze Articles

```javascript
// Example integration
const articles = await feedFetcher.getRecentArticles('technology');

const analysis = await fetch('https://your-worker.workers.dev/analyze', {
  method: 'POST',
  headers: {
    'X-API-Key': 'your-client-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    articles: articles,
    target_topic: 'artificial intelligence',
    analysis_depth: 'standard',
    min_confidence: 0.7
  })
});

const results = await analysis.json();
// Use results.analysis_results for high-relevance articles
```

---

## 🔄 Pipeline Integration

### Input Source
Receives structured articles from `bitware_feed_fetcher`:
```sql
SELECT article_url, title, content, author, pub_date, source_feed, word_count 
FROM rss_articles 
WHERE fetched_at > datetime('now', '-24 hours')
```

### Output Destination  
Provides analyzed articles to `bitware_report_builder`:
```sql
SELECT aa.*, aj.target_topic, aj.analysis_depth
FROM article_analysis aa
JOIN analysis_jobs aj ON aa.job_id = aj.id  
WHERE aa.relevance_score >= 0.7
ORDER BY aa.relevance_score DESC
```

### Worker-to-Worker Communication

```javascript
// Called by bitware_report_builder
const classifierResponse = await fetch('https://content-classifier.workers.dev/analyze', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${WORKER_SHARED_SECRET}`,
    'X-Worker-ID': 'bitware_report_builder',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    articles: fetchedArticles,
    target_topic: 'climate change',
    analysis_depth: 'deep'
  })
});
```

---

## ⚙️ Configuration

### Analysis Depth Options

- **`quick`** - Fast processing, essential metrics only (500 tokens, ~$0.001)
- **`standard`** - Balanced analysis with full insights (1500 tokens, ~$0.003) 
- **`deep`** - Comprehensive analysis with detailed reasoning (2500 tokens, ~$0.005)

### Performance Tuning

```toml
# wrangler.toml
[vars]
MAX_BATCH_SIZE = 15           # Articles per AI call
CACHE_TTL_HOURS = 4           # KV cache duration
MAX_COST_PER_REQUEST = 2.0    # USD cost limit
REQUEST_TIMEOUT_MS = 60000    # 60 second timeout
```

### Cost Management

```javascript
// Built-in cost tracking and limits
{
  "estimated_cost_usd": 0.023,
  "daily_cost_limit": 100.0,
  "tokens_used": 1847,
  "cost_per_article": 0.0023
}
```

---

## 📈 Monitoring & Analytics

### Key Performance Indicators
- **Analysis Accuracy**: Relevance score consistency > 0.8
- **Processing Speed**: < 60 seconds for 20-article batches  
- **Cost Efficiency**: < $0.003 per article analysis
- **Error Rate**: < 5% API failures with graceful recovery

### Built-in Analytics

```sql
-- Top performing topics
SELECT * FROM top_performing_topics;

-- Recent high-quality analyses  
SELECT * FROM recent_quality_analyses;

-- Cost trends
SELECT date, total_cost_usd, avg_cost_per_article 
FROM cost_tracking 
ORDER BY date DESC LIMIT 30;
```

### Admin Dashboard Data

The admin endpoints provide comprehensive metrics for:
- Analysis job success rates and performance
- Topic-specific relevance score distributions  
- Daily/monthly cost breakdowns and trends
- AI model performance and token usage
- Quality score distributions and confidence levels

---

## 🧪 Testing

### Comprehensive Test Suite

```bash
# Run full test suite (25+ tests)
npm test

# Test specific functionality
./test.sh test_single_article_analysis
./test.sh test_batch_processing  
./test.sh test_cost_tracking
```

### Test Categories

1. **Basic Endpoints** - Help, capabilities, health, CORS
2. **Authentication** - Client keys, worker auth, edge cases
3. **AI Analysis** - Single articles, batches, caching, performance
4. **Admin Functions** - Stats, jobs, costs, monitoring
5. **Error Handling** - API failures, malformed data, recovery

### Performance Benchmarks

- Single article analysis: < 5 seconds
- 10-article batch: < 30 seconds  
- 20-article batch: < 60 seconds
- Cache hit response: < 200ms
- Cost per article: $0.001-$0.003

---

## 🔧 Deployment

### Environment Setup

```bash
# Development
npm run deploy:dev
export WORKER_URL="https://bitware-content-classifier-dev.workers.dev"

# Staging  
npm run deploy:staging
export WORKER_URL="https://bitware-content-classifier-staging.workers.dev"

# Production
npm run deploy:prod
export WORKER_URL="https://bitware-content-classifier-prod.workers.dev"
```

### Database Migration

```bash
# Create database
wrangler d1 create bitware-content-analysis-db

# Initialize schema
wrangler d1 execute bitware-content-analysis-db --file=schema.sql

# Apply migrations (if needed)
wrangler d1 execute bitware-content-analysis-db --file=migration.sql
```

### Secrets Management

```bash
# Required secrets
wrangler secret put OPENAI_API_KEY          # OpenAI API key
wrangler secret put WORKER_SHARED_SECRET    # Inter-worker auth
wrangler secret put CLIENT_API_KEY          # Client authentication
```

---

## 🛡️ Security

### Authentication Layers
1. **Client Auth**: X-API-Key for external clients
2. **Worker Auth**: Bearer token + Worker-ID for internal communication  
3. **Admin Auth**: Worker authentication for admin endpoints

### Data Protection
- All analysis data stored in isolated D1 database
- No persistent storage of API keys or sensitive content
- Automatic data retention policies and cleanup
- CORS headers for secure browser integration

### Cost Protection
- Per-request and daily cost limits
- Token usage monitoring and alerting
- Rate limiting to prevent API abuse
- Graceful degradation on quota exhaustion

---

## 🔗 Integration Examples

### With bitware_feed_fetcher

```javascript
// Get articles from feed fetcher
const feedResponse = await fetch('https://feed-fetcher.workers.dev/batch', {
  headers: { 'X-API-Key': CLIENT_KEY }
});
const { articles } = await feedResponse.json();

// Analyze with content classifier
const analysisResponse = await fetch('https://content-classifier.workers.dev/analyze', {
  method: 'POST',
  headers: { 
    'X-API-Key': CLIENT_KEY,
    'Content-Type': 'application/json' 
  },
  body: JSON.stringify({
    articles: articles,
    target_topic: 'artificial intelligence',
    min_confidence: 0.8
  })
});
```

### With bitware_report_builder

```javascript
// Content classifier provides analyzed articles
const { analysis_results } = classifierResponse;

// Report builder consumes the analysis
const reportResponse = await fetch('https://report-builder.workers.dev/generate', {
  method: 'POST', 
  headers: { 'X-API-Key': CLIENT_KEY },
  body: JSON.stringify({
    analyzed_articles: analysis_results,
    report_type: 'intelligence_summary'
  })
});
```

### Direct Integration

```javascript
const ContentClassifier = {
  analyze: async (articles, topic, options = {}) => {
    const response = await fetch('https://content-classifier.workers.dev/analyze', {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.CLASSIFIER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        articles,
        target_topic: topic,
        analysis_depth: options.depth || 'standard',
        min_confidence: options.minConfidence || 0.7
      })
    });
    return response.json();
  }
};

// Usage
const results = await ContentClassifier.analyze(articles, 'climate tech', {
  depth: 'deep',
  minConfidence: 0.8
});
```

---

## 📋 Troubleshooting

### Common Issues

**OpenAI API Errors**
```javascript
{
  "status": "error",
  "error": "OpenAI API error: 429"
}
```
*Solution*: Check API rate limits, verify API key, consider reducing batch size

**High Processing Costs**
```javascript
{
  "estimated_cost_usd": 0.15,
  "warning": "High cost detected"
}
```
*Solution*: Use 'quick' analysis depth, reduce batch sizes, implement caching

**Low Relevance Scores**
```javascript
{
  "avg_relevance_score": 0.23,
  "quality_results": 0
}
```
*Solution*: Refine target topics, check article quality, adjust confidence thresholds

### Debug Mode

```bash
# Enable detailed logging
export DEBUG=true
wrangler dev --env development

# Monitor real-time logs  
wrangler tail --env production
```

### Performance Optimization

```javascript
// Optimize for cost
{
  "analysis_depth": "quick",
  "batch_process": true,
  "min_confidence": 0.6
}

// Optimize for accuracy
{
  "analysis_depth": "deep", 
  "include_summary": true,
  "min_confidence": 0.8
}
```

---

## 📚 Additional Resources

### Documentation
- [Bitware Oboe Manual](../docs/bitware-oboe-manual.md)
- [AI Factory Pipeline Overview](../README.md)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)

### Related Workers
- [`bitware_topic_researcher`](../bitware_topic_researcher/) - RSS source discovery
- [`bitware_rss_librarian`](../bitware_rss_librarian/) - Curated source management
- [`bitware_feed_fetcher`](../bitware_feed_fetcher/) - Article content extraction  
- [`bitware_report_builder`](../bitware_report_builder/) - Intelligence report generation

### Support
- GitHub Issues: [AI Factory Pipeline Issues](https://github.com/your-org/ai-factory-pipeline/issues)
- Discord: #ai-factory-support
- Email: ai-factory-support@your-org.com

---

## 📄 License

MIT License - See [LICENSE](../LICENSE) file for details.

---

**Built with ❤️ using the Bitware Oboe methodology for AI-maintainable modular systems**

*Last updated: July 22, 2025*