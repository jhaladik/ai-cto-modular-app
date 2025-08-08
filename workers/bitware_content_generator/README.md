# Content Generator Worker

AI-powered content generation worker that transforms structured outlines from the Content Granulator into complete, high-quality content.

## Overview

The Content Generator is a critical component in the AI Factory pipeline, taking structured content outlines and generating actual content using multiple AI providers. It supports courses, quizzes, workflows, and more.

## Features

- 🤖 **Multi-AI Provider Support**: OpenAI, Claude, and Cloudflare AI with automatic fallback
- 📝 **Multiple Content Types**: Courses, quizzes, workflows, knowledge maps, learning paths
- 💾 **Intelligent Storage**: Automatic tiering between inline, KV, and R2 storage
- 📊 **Quality Validation**: Multi-dimensional quality scoring and validation
- 💰 **Cost Optimization**: Real-time cost tracking and provider selection
- 🔄 **Progressive Generation**: Hierarchical content generation with context management
- 📈 **Analytics & Monitoring**: Comprehensive metrics and resource tracking
- 🔐 **Three-Tier Authentication**: API key, worker-to-worker, and session authentication

## Architecture

```
Input (from Granulator) → Content Generator → Output (to Packager)
                              ↓
                    - Parse Structure
                    - Create Sections
                    - Generate Content
                    - Validate Quality
                    - Store Results
```

## Installation

```bash
cd workers/bitware_content_generator
npm install
```

## Configuration

### Environment Variables

Create a `.dev.vars` file for local development:

```env
# AI Providers
OPENAI_API_KEY=your_openai_key
CLAUDE_API_KEY=your_claude_key

# Security
SHARED_SECRET=internal-worker-auth-token-2024

# Configuration
DEFAULT_MODEL=gpt-4o-mini
QUALITY_THRESHOLD=75
MAX_CONCURRENT_GENERATIONS=5
MAX_TOKENS_PER_REQUEST=4000
DEFAULT_TEMPERATURE=0.7
```

### Database Setup

```bash
# Create database
wrangler d1 create content-generator-db

# Initialize schema
wrangler d1 execute content-generator-db --file=schema/schema.sql

# Seed with default templates
wrangler d1 execute content-generator-db --file=schema/seed.sql
```

### Storage Setup

```bash
# Create KV namespaces
wrangler kv:namespace create CONTENT_CACHE
wrangler kv:namespace create JOB_STATUS
wrangler kv:namespace create PROMPT_CACHE

# Create R2 bucket
wrangler r2 bucket create content-generator-storage
```

## Development

```bash
# Start local development server
npm run dev

# Run tests
./test.sh local

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy
```

## API Endpoints

### Public Endpoints
- `GET /` - Health check
- `GET /health` - Detailed health status
- `GET /help` - API documentation

### Main Execution
- `POST /api/execute` - Generate content from structure

### Job Management
- `GET /api/jobs` - List generation jobs
- `GET /api/jobs/{id}` - Get job details
- `GET /api/jobs/{id}/status` - Get job status
- `GET /api/jobs/{id}/content` - Get generated content
- `POST /api/jobs/{id}/retry` - Retry failed job
- `POST /api/jobs/{id}/cancel` - Cancel job

### Templates & Configuration
- `GET /api/templates` - List prompt templates
- `GET /api/templates/{name}` - Get template details

### Analytics & Economy
- `GET /api/stats` - Generation statistics
- `GET /api/analytics` - Detailed analytics
- `GET /api/economy/pricing` - AI provider pricing
- `POST /api/economy/estimate` - Estimate generation cost
- `GET /api/economy/stats` - Resource consumption stats

## Usage Example

```javascript
// Generate content from granulator output
const response = await fetch('https://bitware-content-generator.workers.dev/api/execute', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key'
  },
  body: JSON.stringify({
    action: 'generate',
    input: {
      granulatorJobId: 123,
      topic: 'Introduction to Python',
      structureType: 'course',
      structure: { /* structure from granulator */ },
      wordCountEstimates: {
        total: 15000,
        bySection: {
          lessonContent: 8000,
          examples: 2000,
          exercises: 2500
        }
      },
      contentMetadata: {
        standardParameters: {
          targetAudience: 'beginners',
          language: 'en',
          tone: 'educational',
          style: 'engaging'
        }
      }
    },
    config: {
      aiProvider: 'openai',
      aiModel: 'gpt-4o-mini',
      temperature: 0.7
    }
  })
});

const result = await response.json();
console.log('Generated content:', result);
```

## Content Types

### Course Generation
- Overview with introduction, prerequisites, learning outcomes
- Module introductions and summaries
- Detailed lesson content with examples
- Exercises and assessments
- Course conclusion

### Quiz Generation
- Comprehensive instructions
- Categorized questions
- Multiple question types
- Detailed explanations
- Hints and solutions

### Workflow Generation
- Workflow overview and purpose
- Step-by-step instructions
- Input/output specifications
- Tools and resources
- Success criteria

## Quality Metrics

The generator evaluates content across multiple dimensions:

- **Readability**: Appropriate for target audience
- **Coherence**: Logical flow and consistency
- **Completeness**: All required sections present
- **Topic Relevance**: Content matches the topic
- **Engagement**: Clear and interesting presentation

## Storage Strategy

Content is automatically stored based on size:

- **Inline (<25KB)**: Stored directly in database
- **KV (25KB-128KB)**: Cached in KV namespace
- **R2 (>128KB)**: Stored in R2 bucket

## AI Provider Selection

### Default Recommendations
- **Cost-Effective**: Cloudflare AI (free with Workers)
- **Balanced**: OpenAI GPT-4o-mini
- **High Quality**: Claude 3.5 Sonnet

### Automatic Fallback
If the primary provider fails, the system automatically falls back to:
1. Secondary provider (if configured)
2. Cloudflare AI (always available)

## Performance Optimization

- **Batch Processing**: Groups similar content for efficiency
- **Parallel Generation**: Up to 5 concurrent generations
- **Progressive Enhancement**: Generates high-priority content first
- **Context Management**: Maintains coherence across sections
- **Caching**: Templates and generated content cached

## Monitoring

### Real-time Progress
Progress is tracked in KV storage and can be monitored:
```javascript
const status = await KV.get(`job-${jobId}`);
// Returns: { status, progress, currentSection, ... }
```

### Analytics Dashboard
Track key metrics:
- Generation speed (words/minute)
- Quality scores
- Cost per 1000 words
- Provider performance
- Success rates

## Error Handling

### Automatic Retry
Failed sections are automatically retried with:
- Progressive backoff (1s, 5s, 15s)
- Model fallback on repeated failures
- Maximum 3 retry attempts

### Error Codes
- `INVALID_STRUCTURE` - Malformed input structure
- `GENERATION_FAILED` - AI generation failed
- `QUALITY_THRESHOLD_NOT_MET` - Content below quality threshold
- `RESOURCE_LIMIT_EXCEEDED` - Token/cost limits exceeded

## Database Schema

### Core Tables
- `generation_jobs` - Job tracking and metrics
- `content_sections` - Individual section generation
- `prompt_templates` - Reusable prompt templates
- `generation_analytics` - Usage and performance metrics
- `ai_provider_usage` - Provider-specific tracking

## Testing

Run the comprehensive test suite:
```bash
./test.sh local   # Local testing
./test.sh staging # Staging environment
./test.sh production # Production tests
```

## Deployment

```bash
# Deploy to production
npm run deploy

# View logs
wrangler tail

# Check database
wrangler d1 execute content-generator-db --command="SELECT * FROM generation_jobs ORDER BY created_at DESC LIMIT 5"
```

## Integration with Pipeline

### Input from Granulator
The Content Generator expects structured output from the Content Granulator including:
- Structure definition
- Word count estimates
- Content metadata
- Generation parameters

### Output to Packager
Generates complete content ready for packaging into various formats:
- HTML
- PDF
- DOCX
- Markdown
- Audio

## Troubleshooting

### Common Issues

1. **AI Provider Errors**
   - Check API keys are configured
   - Verify rate limits not exceeded
   - Check provider service status

2. **Storage Errors**
   - Ensure KV namespaces created
   - Check R2 bucket permissions
   - Verify storage limits

3. **Quality Issues**
   - Adjust temperature settings
   - Modify prompt templates
   - Change AI model

## Support

For issues or questions:
- Check `/help` endpoint for latest documentation
- Review error messages for specific guidance
- Monitor `/health` endpoint for service status

## License

MIT