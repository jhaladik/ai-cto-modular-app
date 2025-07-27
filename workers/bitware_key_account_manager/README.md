# 🤝 Bitware Key Account Manager

**AI-powered client relationship management and communication processing worker**

## 📋 Worker Overview

**Worker Type**: ClientRelationshipManager  
**Role**: Client profile management, communication analysis, template intelligence  
**Integration**: Backend worker that extends existing Pages frontend  
**Storage**: D1 database + KV caching + Orchestrator service binding  

## 🏗️ Architecture

### Core Responsibilities
- **Client Profile Management** - Subscription tiers, budgets, preferences, analytics
- **Communication Processing** - Email analysis, intent detection, sentiment scoring
- **Template Intelligence** - AI-powered template recommendation and selection
- **Pipeline Transparency** - Track worker sessions for client visibility
- **Budget Management** - Monitor usage and spending across client accounts

### Integration Strategy
```
Pages Frontend → Functions → Key Account Manager → Orchestrator → Workers
     ↓              ↓              ↓                ↓           ↓
 User Interface  Auth Proxy   Client Mgmt     Pipeline Coord  AI Processing
```

## 🚀 Quick Start

### 1. Deploy the Worker

```bash
# Clone and setup
cd workers/bitware_key_account_manager

# Install dependencies
npm install

# Create database and KV namespace
wrangler d1 create key-account-management-db
wrangler kv:namespace create KAM_CACHE
wrangler kv:namespace create KAM_CACHE --preview

# Update wrangler.toml with the returned IDs

# Initialize database
wrangler d1 execute key-account-management-db --file=schema.sql
wrangler d1 execute key-account-management-db --file=seed.sql

# Set secrets
wrangler secret put CLIENT_API_KEY
wrangler secret put WORKER_SHARED_SECRET  
wrangler secret put OPENAI_API_KEY

# Deploy
wrangler deploy
```

### 2. Test the Deployment

```bash
# Run comprehensive test suite
chmod +x test.sh
./test.sh

# Or test individual endpoints
curl https://your-worker.dev/help
curl -H "X-API-Key: your-key" https://your-worker.dev/templates
```

## 📚 API Reference

### 🌐 Public Endpoints (No Authentication)

#### `GET /help`
Worker documentation and available endpoints.

#### `GET /capabilities`
Worker features and AI capabilities.

#### `GET /health`
Health check with database and service binding status.

### 🔑 Main Endpoints (Client Authentication: X-API-Key)

#### `GET /client?email=<email>`
Retrieve client profile by email address.

```bash
curl -H "X-API-Key: your-key" \
  "https://your-worker.dev/client?email=client@company.com"
```

#### `POST /client`
Create new client profile.

```bash
curl -X POST -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "TechCorp Solutions",
    "primary_contact_email": "contact@techcorp.com",
    "subscription_tier": "premium",
    "monthly_budget_usd": 500.0,
    "communication_style": "professional"
  }' \
  https://your-worker.dev/client
```

#### `POST /analyze-communication`
Analyze client communication with AI for intent, sentiment, and urgency.

```bash
curl -X POST -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "We need urgent market research for AI trends. Critical for board meeting!",
    "type": "email_inbound",
    "client_id": "client_123",
    "sender_email": "ceo@company.com"
  }' \
  https://your-worker.dev/analyze-communication
```

#### `POST /recommend-template`
Get AI-powered template recommendation based on client context and request.

```bash
curl -X POST -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{
    "client_email": "contact@techcorp.com",
    "request": "comprehensive competitive intelligence analysis for fintech sector"
  }' \
  https://your-worker.dev/recommend-template
```

#### `GET /templates`
List all available pipeline templates with performance characteristics.

### 🔧 Admin Endpoints (Worker Authentication: Bearer Token + Worker-ID)

#### `GET /admin/stats`
Usage statistics and analytics.

#### `GET /admin/clients`
List all client profiles (limited to 50 most recent).

#### `POST /admin/sync-templates`
Sync pipeline templates from orchestrator.

## 🧠 AI Capabilities

### Communication Analysis
- **Intent Detection**: Identifies request types (report_request, question, feedback, etc.)
- **Sentiment Analysis**: Scores communication sentiment from -1.0 (negative) to 1.0 (positive)
- **Urgency Assessment**: Classifies urgency levels (low, medium, high, critical)
- **Escalation Detection**: Flags communications requiring human attention

### Template Intelligence
- **Context-Aware Recommendations**: Considers client tier, budget, and communication style
- **Performance Optimization**: Matches templates to client requirements and constraints
- **Cost Estimation**: Provides accurate cost and time estimates for template execution
- **Success Prediction**: Uses historical data to predict template success likelihood

## 💾 Database Schema

### Core Tables

#### `clients`
Client profiles with subscription details, preferences, and analytics.

#### `client_communications`
All client communications with AI analysis results.

#### `client_requests`
Pipeline requests linked to communications and orchestrator executions.

#### `pipeline_worker_sessions`
Worker session tracking for client transparency.

#### `pipeline_template_cache`
Cached templates from orchestrator with keyword triggers and usage patterns.

#### `template_usage_analytics`
Template usage tracking and performance analytics.

#### `client_needs_analysis`
AI-generated client behavior analysis and predictions.

### Performance Indexes
- Client email lookups: `idx_clients_email`
- Communication processing: `idx_communications_client`, `idx_communications_date`
- Request tracking: `idx_requests_client`, `idx_requests_status`
- Template analytics: `idx_template_usage_client`, `idx_template_usage_template`

## 🔗 Integration with AI Factory

### Orchestrator Integration
```typescript
// Service binding for direct communication
const kamResult = await env.KEY_ACCOUNT_MANAGER.fetch(new Request('https://internal/recommend-template', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${env.WORKER_SHARED_SECRET}`,
    'X-Worker-ID': 'bitware_orchestrator',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    client_email: clientEmail,
    request: userRequest
  })
}));
```

### Pages Frontend Extension
```javascript
// Extended session management
async function getClientContext(sessionToken) {
  const response = await apiClient.callWorker('key-account-manager', `/session-context?token=${sessionToken}`);
  return response.client_context;
}

// Client transparency dashboard
async function getClientTransparency(requestId) {
  const response = await apiClient.callWorker('key-account-manager', `/transparency?request_id=${requestId}`);
  return response.worker_breakdown;
}
```

### Worker Chain Integration
The Key Account Manager coordinates with other workers in the pipeline:

1. **Client Request** → KAM analyzes and recommends template
2. **Template Selection** → KAM calls orchestrator with recommended template
3. **Pipeline Execution** → KAM tracks worker sessions for transparency
4. **Results Delivery** → KAM formats results based on client preferences

## 🔒 Security & Authentication

### Multi-Layer Security
1. **Client Authentication**: API key validation for external requests
2. **Worker Authentication**: Bearer token + Worker ID for internal communication
3. **Data Isolation**: Client data segregated with proper foreign key constraints
4. **PII Protection**: Sensitive client data encrypted and access-controlled

### Best Practices
- All database queries use parameterized binding (no SQL injection risk)
- Communication content is analyzed but not stored in plain text logs
- Client budgets and financial data are protected with additional access controls
- AI analysis results include confidence scores for transparency

## 📊 Performance & Monitoring

### Caching Strategy
- **Client Profiles**: 1 hour KV cache for frequently accessed profiles
- **Template Data**: 24 hour cache with automatic orchestrator sync
- **Communication Analysis**: 30 minutes cache for repeated analysis requests

### Performance Targets
- **Client Lookups**: < 100ms (cached) / < 500ms (database)
- **AI Analysis**: < 2 seconds for communication processing
- **Template Recommendations**: < 1 second with cached templates
- **Database Queries**: < 500ms for all standard operations

### Monitoring Endpoints
- `/health` - Overall system health and database connectivity
- `/admin/stats` - Performance metrics and usage analytics
- Template sync status and orchestrator integration health

## 🧪 Development & Testing

### Local Development
```bash
# Start local development server
npm run dev

# Test against local instance
WORKER_URL="http://localhost:8787" ./test.sh

# Watch database changes
npx wrangler d1 execute key-account-management-db --command="SELECT * FROM clients ORDER BY created_at DESC LIMIT 5"
```

### Test Coverage
The test suite covers:
- ✅ All public endpoints (help, capabilities, health)
- ✅ Client authentication and authorization
- ✅ Client management (create, retrieve, update)
- ✅ Communication analysis with AI integration
- ✅ Template recommendation engine
- ✅ Admin endpoints and worker authentication
- ✅ Error handling and edge cases
- ✅ Performance and caching validation
- ✅ Integration scenarios and workflows

### Database Management
```bash
# Reset database (destructive!)
npm run db:reset

# View recent activity
npx wrangler d1 execute key-account-management-db --command="
  SELECT c.company_name, cc.subject, cc.sent_at 
  FROM client_communications cc 
  JOIN clients c ON cc.client_id = c.client_id 
  ORDER BY cc.sent_at DESC LIMIT 10"

# Check template sync status
npx wrangler d1 execute key-account-management-db --command="
  SELECT template_name, last_synced_from_orchestrator 
  FROM pipeline_template_cache 
  WHERE is_active = 1"
```

## 🔄 Deployment Environments

### Development
- Lower budget limits and faster template sync for rapid testing
- Enhanced logging and debug information
- Relaxed timeouts for debugging

### Staging
- Production-like configuration for final testing
- Moderate limits and realistic performance targets
- Integration testing with other workers

### Production
- Full budget limits and optimized performance
- Enhanced monitoring and alerting
- Automatic failover and recovery

### Enterprise
- Higher limits for enterprise clients
- Extended timeouts for complex analyses
- Advanced analytics and custom features

## 🤝 Contributing

### Development Workflow
1. Fork the repository and create a feature branch
2. Make changes following the established patterns
3. Run the full test suite and ensure all tests pass
4. Test integration with orchestrator and Pages frontend
5. Submit pull request with comprehensive description

### Code Standards
- Follow TypeScript best practices and type safety
- Maintain test coverage above 95%
- Document all public APIs and integration points
- Use semantic commit messages and proper versioning

## 📞 Support & Documentation

### Getting Help
- **GitHub Issues**: [Report bugs and request features](https://github.com/your-org/ai-factory/issues)
- **Discord**: #bitware-key-account-manager channel
- **Documentation**: Complete Bitware Oboe methodology in project knowledge

### Related Workers
- [Bitware Orchestrator](../bitware_orchestrator/README.md) - Pipeline coordination
- [Bitware Topic Researcher](../bitware_topic_researcher/README.md) - Source discovery
- [Bitware RSS Librarian](../bitware_rss_source_finder/README.md) - Source curation

---

## 🎯 Key Features Summary

✅ **Complete Client Management** - Profiles, budgets, preferences, analytics  
✅ **AI-Powered Communication Analysis** - Intent, sentiment, urgency detection  
✅ **Intelligent Template Recommendations** - Context-aware pipeline selection  
✅ **Pipeline Transparency** - Track worker sessions for client visibility  
✅ **Budget Management** - Real-time usage tracking and alerts  
✅ **Multi-Tier Support** - Basic, Standard, Premium, Enterprise subscriptions  
✅ **Orchestrator Integration** - Seamless pipeline coordination  
✅ **Pages Frontend Extension** - Unified authentication and session management  
✅ **Production Ready** - Comprehensive testing, monitoring, and documentation  

**Built with ❤️ using the Bitware Oboe methodology for AI-maintainable distributed systems**

*Last updated: July 27, 2025*  
*Version: 1.0.0*  
*Status: Ready for Implementation* 🚀