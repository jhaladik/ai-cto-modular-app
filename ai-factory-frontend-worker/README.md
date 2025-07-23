# AI Factory Frontend Worker

**🏭 Cloudflare Worker with Service Bindings for AI Factory Backend**

A complete migration from Cloudflare Pages + Functions to a proper Cloudflare Worker architecture with service bindings, following the **Bitware Oboe** methodology for AI-maintainable modular systems.

## 🎯 Architecture

```
Browser → Frontend Worker → Service Bindings → Backend Workers
   ↓              ↓                ↓              ↓
Static HTML   Auth + Routing   Direct Worker    AI Factory Pipeline
Interface     Session Mgmt     Communication    Worker Execution
```

### Key Benefits of Worker Architecture
- **✅ True Service Bindings**: Direct worker-to-worker communication
- **✅ No HTTP Overhead**: Eliminates network latency between workers
- **✅ Consistent Architecture**: All components are Cloudflare Workers
- **✅ Better Performance**: Service bindings are faster than HTTP calls
- **✅ Simplified Auth**: Single authentication layer
- **✅ Type Safety**: TypeScript throughout the entire stack

## 🏗️ Project Structure

```
ai-factory-frontend-worker/
├── src/
│   ├── index.ts                     # Main worker entry point
│   ├── auth/
│   │   └── session.ts               # Authentication & session management
│   └── static/
│       ├── assets.ts                # Static asset serving system
│       ├── html/                    # Embedded HTML pages
│       │   ├── dashboard.ts         # Main dashboard
│       │   ├── orchestrator.ts      # Pipeline orchestrator interface
│       │   ├── topic-researcher.ts  # Topic discovery interface
│       │   ├── rss-librarian.ts     # RSS source management
│       │   ├── feed-fetcher.ts      # Article fetching interface
│       │   ├── content-classifier.ts # AI classification interface
│       │   └── report-builder.ts    # Report generation interface
│       ├── css/
│       │   ├── shared.ts            # Common styles
│       │   └── components.ts        # Component-specific styles
│       └── js/
│           ├── api.ts               # API client with service binding support
│           ├── auth.ts              # Authentication client
│           └── ui.ts                # UI helper utilities
├── wrangler.toml                    # Worker configuration with service bindings
├── package.json                     # Dependencies and scripts
└── README.md                        # This file
```

## 🚀 Quick Setup

### Prerequisites
- Node.js 18+ 
- Wrangler CLI 4.25+
- Existing AI Factory backend workers deployed
- Cloudflare account with Workers enabled

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Service Bindings
Update `wrangler.toml` with your actual worker service names:

```toml
[[services]]
binding = "ORCHESTRATOR"
service = "bitware-orchestrator"  # Your actual service name

[[services]]
binding = "TOPIC_RESEARCHER"
service = "bitware-topic-researcher"  # Your actual service name

# ... configure all other services
```

### 3. Create KV Namespace
```bash
wrangler kv:namespace create SESSION_STORE
wrangler kv:namespace create SESSION_STORE --preview
```

Update `wrangler.toml` with the returned namespace IDs.

### 4. Set Secrets
```bash
wrangler secret put CLIENT_API_KEY
wrangler secret put WORKER_SHARED_SECRET
wrangler secret put ADMIN_PASSWORD
wrangler secret put USER_PASSWORD
```

### 5. Deploy
```bash
# Development deployment
npm run dev

# Production deployment
npm run deploy
```

## 🔐 Authentication

**Default Credentials (Change in Production):**
- Admin: `admin` / `admin123`
- User: `user` / `user123`

**Security Features:**
- Server-side session validation via KV storage
- 24-hour session timeout (configurable)
- API keys never exposed to browser
- Service binding authentication between workers
- Automatic session cleanup

## 🧰 Backend Worker Integration

### Service Binding Configuration
Each backend worker must be configured as a service binding:

```toml
# In wrangler.toml
[[services]]
binding = "ORCHESTRATOR"
service = "bitware-orchestrator"
```

### Supported Workers
1. **🎯 Orchestrator** - Pipeline coordination and orchestration
2. **🔍 Topic Researcher** - RSS source discovery and topic analysis  
3. **📚 RSS Librarian** - Source curation and library management
4. **📡 Feed Fetcher** - Article extraction and content processing
5. **🧠 Content Classifier** - AI-powered content analysis and classification
6. **📄 Report Builder** - Intelligence report generation

### Communication Flow
```typescript
// Frontend Worker → Backend Worker via Service Binding
const response = await env.ORCHESTRATOR.fetch(new Request('https://internal/orchestrate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Auth': env.WORKER_SHARED_SECRET
  },
  body: JSON.stringify(request)
}));
```

## 📱 User Interfaces

### Main Dashboard (`/`)
- Pipeline control and monitoring
- Worker status overview  
- Quick actions and analytics
- Navigation to individual worker interfaces

### Individual Worker Interfaces
- **`/orchestrator`** - Pipeline orchestration and coordination
- **`/topic-researcher`** - Topic discovery and research tools
- **`/rss-librarian`** - RSS source management and curation
- **`/feed-fetcher`** - Article fetching and processing
- **`/content-classifier`** - AI-powered content analysis
- **`/report-builder`** - Intelligence report generation

### Features
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Real-time Updates** - Live status updates and progress tracking
- **Interactive Charts** - Data visualization and analytics
- **Export Capabilities** - Download results in multiple formats
- **Search & Filter** - Advanced filtering and search functionality

## 🔧 Development

### Local Development
```bash
# Start development server with local bindings
npm run dev

# Development with remote bindings (for testing)
npm run dev:remote
```

### Environment Configuration
- **Development**: `wrangler dev --local` (simulated bindings)
- **Staging**: `wrangler dev --remote` (real worker bindings)
- **Production**: `wrangler deploy --env production`

### Adding New Features
1. **Static Assets**: Add to `src/static/` and register in `assets.ts`
2. **API Endpoints**: Add routing logic in `src/index.ts`
3. **Authentication**: Extend `src/auth/session.ts` as needed
4. **UI Components**: Add JavaScript/CSS to respective files

## 🛠️ API Reference

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/validate` - Session validation
- `GET /api/auth/status` - Authentication system status

### Worker Proxy Endpoints
All backend workers are accessible via service bindings:
- `POST /api/orchestrator/*` - Orchestrator operations
- `POST /api/topic-researcher/*` - Topic research operations
- `POST /api/rss-librarian/*` - RSS library operations
- `POST /api/feed-fetcher/*` - Feed fetching operations
- `POST /api/content-classifier/*` - Content classification
- `POST /api/report-builder/*` - Report generation

### Request Format
```javascript
// All API requests require session authentication
const response = await fetch('/api/orchestrator/orchestrate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken
  },
  body: JSON.stringify({
    topic: 'artificial intelligence',
    optimize_for: 'balanced'
  })
});
```

## 📊 Performance

### Service Binding Benefits
- **Latency**: ~1ms vs ~50-100ms for HTTP calls
- **Throughput**: No network bandwidth limitations
- **Reliability**: No DNS resolution or network failures
- **Cost**: No additional request charges between workers

### Caching Strategy
- **Static Assets**: Cached with ETags and max-age headers
- **API Responses**: Intelligent caching at orchestrator level
- **Session Data**: KV storage with TTL-based expiration

## 🔒 Security

### Authentication Flow
1. User submits credentials to `/api/auth/login`
2. Frontend worker validates against stored passwords
3. Session token generated and stored in KV
4. All subsequent requests validated against KV session store
5. Backend workers authenticate via shared secret headers

### Security Features
- **Session Management**: Secure token-based authentication
- **Secret Management**: All secrets stored in Wrangler secrets
- **CORS Protection**: Properly configured CORS headers
- **Input Validation**: All user inputs validated and sanitized
- **Rate Limiting**: Built into Cloudflare Workers platform

## 🚨 Monitoring & Debugging

### Logging
```bash
# View real-time logs
npm run logs

# Tail logs with formatting  
npm run tail
```

### Health Checks
The system includes comprehensive health monitoring:
- Worker availability checks
- Service binding connectivity
- Session store health
- API response times

### Error Handling
- Comprehensive error catching and logging
- User-friendly error messages
- Automatic retry logic for transient failures
- Graceful degradation when services unavailable

## 📋 Migration from Pages

### Key Changes from Pages Architecture
1. **Service Bindings**: Direct worker communication vs HTTP proxy
2. **Embedded Assets**: Static files embedded in worker vs separate hosting
3. **Single Worker**: One worker handling all requests vs Pages + Functions
4. **TypeScript**: Full TypeScript support vs JavaScript functions
5. **Better Performance**: Eliminated network hops and latency

### Migration Steps
1. Deploy this frontend worker
2. Update DNS to point to worker instead of Pages
3. Verify all service bindings are working
4. Test authentication and all interfaces
5. Decommission old Pages project

## 🔮 Future Enhancements

### Planned Features
- **WebSocket Support**: Real-time pipeline updates
- **Offline Mode**: Progressive Web App capabilities
- **Advanced Analytics**: Enhanced reporting and insights
- **Multi-tenancy**: Support for multiple organizations
- **API Rate Limiting**: Per-user rate limiting
- **Audit Logging**: Comprehensive activity logging

### Performance Optimizations  
- **Edge Caching**: Intelligent edge caching strategies
- **Bundle Optimization**: Minimize worker script size
- **Lazy Loading**: On-demand loading of worker interfaces
- **Connection Pooling**: Optimize service binding connections

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Make changes and test locally with `npm run dev`
4. Ensure all interfaces work with backend workers
5. Test authentication and session management
6. Submit pull request with comprehensive description

### Code Standards
- **TypeScript**: Strict mode enabled, no `any` types
- **ESLint**: Code linting and formatting
- **Comments**: Comprehensive JSDoc comments
- **Testing**: Unit tests for critical functionality
- **Security**: Security review for all authentication code

## 📞 Support

### Getting Help
- **Documentation**: Check this README and inline comments
- **Issues**: Create GitHub issue with reproduction steps  
- **Logs**: Use `npm run logs` to debug issues
- **Health Check**: Visit worker URL to test basic functionality

### Common Issues
1. **Service Binding Errors**: Verify backend workers are deployed and named correctly
2. **Authentication Issues**: Check secret configuration and KV namespace
3. **CORS Errors**: Ensure proper CORS headers in responses
4. **Performance Issues**: Monitor worker CPU and memory usage

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ using Cloudflare Workers and the Bitware Oboe methodology for AI-maintainable systems.**