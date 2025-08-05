# 🧱 Content Granulator Worker

AI-powered content granulation service that transforms topics into structured knowledge frameworks using OpenAI GPT-4o-mini.

## 🎯 Overview

The Content Granulator is a sophisticated worker that breaks down complex topics into hierarchical, structured components suitable for content generation. It supports multiple structure types (courses, quizzes, novels, workflows) and includes an intelligent validation system.

## 🚀 Features

- **AI-Powered Granulation**: Uses OpenAI GPT-4o-mini for intelligent structure generation
- **Multiple Structure Types**: Course, Quiz, Novel, Workflow, Knowledge Map, Learning Path
- **Validation System**: 3-level validation using information theory principles
- **Orchestrator 2.0 Compatible**: Full handshake protocol support
- **Reference-Based Storage**: Intelligent storage selection (inline/KV/R2)
- **Template Engine**: Pre-configured templates for consistent results
- **Progress Tracking**: Real-time progress updates for long-running operations

## 📋 Prerequisites

- Cloudflare Workers account
- Wrangler CLI installed
- OpenAI API key
- Node.js 18+ installed

## 🛠️ Installation

1. **Install dependencies**:
```bash
cd workers/bitware_content_granulator
npm install
```

2. **Configure wrangler.toml**:
Update the database IDs and KV namespace IDs in `wrangler.toml` with your actual values.

## 🚀 Deployment

### Direct Production Deployment

1. **Run the deployment script**:
```bash
./deploy.sh
```

This script will:
- Set the OpenAI API key secret
- Set the shared authentication secret
- Deploy to production

2. **Initialize the database**:
```bash
npm run db:init
```

3. **Seed the database with templates**:
```bash
npm run db:seed
```

4. **Update test.sh with your production URL**:
Edit `test.sh` and replace `YOUR_SUBDOMAIN` with your actual Cloudflare subdomain.

5. **Run tests**:
```bash
./test.sh
```

## 🔑 Authentication

The worker supports three authentication methods:

1. **Client API Key**: `X-API-Key: external-client-api-key-2024`
2. **Worker-to-Worker**: `Authorization: Bearer internal-worker-auth-token-2024` + `X-Worker-ID: worker-name`
3. **Session Token**: `x-bitware-session-token: session-token`

## 📡 API Endpoints

### Public Endpoints
- `GET /` - Health check
- `GET /health` - Detailed health status
- `GET /help` - API documentation

### Template Endpoints
- `GET /api/templates` - List available templates
- `GET /api/templates/{name}` - Get specific template details

### Granulation Endpoints
- `POST /api/granulate` - Main granulation endpoint
- `POST /api/granulate/quiz` - Specialized quiz generation
- `POST /api/granulate/novel` - Novel outline generation
- `POST /api/granulate/workflow` - Workflow structure generation

### Job Management
- `GET /api/jobs/{id}` - Get job details and structure
- `GET /api/jobs/{id}/status` - Get job status

### Validation
- `POST /api/validate` - Manual validation of structure
- `GET /api/validation/history?job_id={id}` - Get validation history

### Orchestrator 2.0 Handshake
- `POST /api/handshake` - Initiate processing
- `POST /api/process` - Execute granulation
- `POST /api/acknowledge` - Confirm completion
- `GET /api/progress/{id}` - Get progress updates

### Admin Endpoints (Worker Auth Required)
- `GET /api/admin/stats` - System statistics
- `POST /api/admin/templates` - Manage templates
- `GET /api/admin/analytics` - Performance analytics

## 💻 Example Usage

### Basic Course Granulation
```bash
curl -X POST https://bitware-content-granulator.YOUR_SUBDOMAIN.workers.dev/api/granulate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: external-client-api-key-2024" \
  -d '{
    "topic": "Introduction to Machine Learning",
    "structureType": "course",
    "templateName": "educational_course_basic",
    "granularityLevel": 3,
    "targetAudience": "beginners",
    "validation": {
      "enabled": true,
      "level": 2,
      "threshold": 90
    }
  }'
```

### Quiz Generation
```bash
curl -X POST https://bitware-content-granulator.YOUR_SUBDOMAIN.workers.dev/api/granulate/quiz \
  -H "Content-Type: application/json" \
  -H "X-API-Key: external-client-api-key-2024" \
  -d '{
    "topic": "Python Programming",
    "questionCount": 25,
    "difficultyDistribution": {
      "easy": 40,
      "medium": 40,
      "hard": 20
    }
  }'
```

## 🧪 Validation System

The worker includes a sophisticated validation system with three levels:

1. **Level 1**: Single high-entropy question for quick validation
2. **Level 2**: Two discriminative questions for balanced validation
3. **Level 3**: Three comprehensive questions for thorough validation

Each structure type has specific accuracy thresholds:
- Course: 90%
- Quiz: 95%
- Novel: 80%
- Workflow: 85%

## 📊 Structure Types

### Course
- Modules with lessons
- Learning objectives
- Assessments and exercises
- Prerequisites and duration estimates

### Quiz
- Categorized questions
- Difficulty distribution
- Multiple question types
- Skill assessment mapping

### Novel
- Three-act structure
- Chapter breakdowns
- Character arcs
- Plot points and themes

### Workflow
- Phased approach
- Decision points
- Dependencies
- Resource requirements

## 🔧 Configuration

### Environment Variables
- `OPENAI_API_KEY`: Your OpenAI API key
- `SHARED_SECRET`: Worker authentication secret
- `ENVIRONMENT`: 'production' or 'staging'
- `VERSION`: Worker version

### Database Schema
The worker uses 5 main tables:
- `granulation_templates`: Template definitions
- `granulation_jobs`: Job tracking
- `structure_elements`: Hierarchical elements
- `validation_results`: Validation history
- `template_analytics`: Performance metrics

## 📈 Monitoring

Monitor worker performance through:
- `/api/admin/stats` - Overall statistics
- `/api/admin/analytics` - Detailed analytics
- CloudFlare dashboard - Request metrics
- Validation success rates

## 🐛 Troubleshooting

### Common Issues

1. **OpenAI API Errors**
   - Check API key is valid
   - Monitor rate limits
   - Verify account has credits

2. **Validation Failures**
   - Review threshold settings
   - Check template quality
   - Analyze failure patterns

3. **Storage Issues**
   - Verify KV namespace bindings
   - Check R2 bucket configuration
   - Monitor storage quotas

## 🤝 Integration with Orchestrator

The Content Granulator is designed to work seamlessly with Orchestrator 2.0:

1. Orchestrator sends handshake request
2. Granulator accepts and provides resource estimates
3. Orchestrator triggers processing
4. Granulator reports progress
5. Results stored with appropriate references
6. Orchestrator acknowledges completion

## 📝 License

This worker is part of the AI Factory system and follows the same licensing terms.