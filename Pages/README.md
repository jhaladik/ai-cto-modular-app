# README.md
# AI Factory Frontend - Phase 1: Authentication Proxy

**🏭 Cloudflare Pages + Functions Authentication Proxy for AI Factory Backend**

Following the **Bitware Oboe** methodology for AI-maintainable modular systems.

## 🎯 Phase 1 Deliverables ✅

- ✅ **Cloudflare Pages Functions** - Secure authentication proxy for all 6 backend workers
- ✅ **Simple Session Management** - Login/logout with KV storage
- ✅ **Main Dashboard** - Central interface with pipeline overview and worker status
- ✅ **Secure API Proxy** - No secrets in browser, all authentication handled server-side

## 🏗️ Architecture

```
Browser → Cloudflare Pages Functions → Backend Workers
   ↓              ↓                        ↓
Static HTML   Auth Proxy              AI Factory Pipeline
Interface     Session Management      Worker Execution
```

### Request Flow
1. **User Login** → Simple username/password → Session token stored in KV
2. **Dashboard Load** → Validate session → Show worker status
3. **Worker Calls** → Session validation → Proxy to backend with API keys
4. **Security** → All secrets stay in Pages Functions, never exposed to browser

## 🚀 Quick Setup

### 1. Clone and Initialize
```bash
git clone https://github.com/your-org/ai-factory-frontend.git
cd ai-factory-frontend
npm install
```

### 2. Create KV Namespace
```bash
wrangler kv:namespace create "BITWARE_SESSION_STORE"
wrangler kv:namespace create "BITWARE_SESSION_STORE" --preview
```

### 3. Update wrangler.toml
```toml
# Update with your KV namespace IDs and worker URLs
[[env.production.kv_namespaces]]
binding = "BITWARE_SESSION_STORE"
id = "your-actual-kv-namespace-id"

# Update worker URLs
ORCHESTRATOR_URL = "https://bitware-orchestrator.yourdomain.workers.dev"
```

### 4. Set Secrets
```bash
wrangler pages secret put CLIENT_API_KEY
wrangler pages secret put WORKER_SHARED_SECRET
wrangler pages secret put ADMIN_PASSWORD
wrangler pages secret put USER_PASSWORD
```

### 5. Deploy
```bash
# Local development
npm run dev

# Deploy to production
npm run deploy
```

## 🔐 Authentication

**Default Credentials (Change in Production):**
- Admin: `admin` / `admin123`
- User: `user` / `user123`

**Security Features:**
- Session tokens with 24-hour expiration
- Server-side session validation
- API keys never exposed to browser
- Automatic session cleanup

## 🧰 Supported Workers

1. **🎯 Orchestrator** - Pipeline coordination
2. **🔍 Topic Researcher** - RSS source discovery  
3. **📚 RSS Librarian** - Source curation
4. **📡 Feed Fetcher** - Article extraction
5. **🧠 Content Classifier** - AI analysis
6. **📊 Report Builder** - Intelligence reports

## 🔧 API Usage

### Authentication
```javascript
// Login
const result = await authClient.login('admin', 'password');

// Call worker through proxy
const data = await apiClient.callWorker('orchestrator', '/status');

// Logout  
await authClient.logout();
```

### Worker Communication
```javascript
// Get RSS sources
const sources = await apiClient.getRSSSources('AI');

// Research topic
const research = await apiClient.researchTopic('machine learning');

// Check system health
const health = await apiClient.checkWorkerHealth();
```

## 📊 Dashboard Features

- **🏭 Pipeline Overview** - Visual status of all 6 workers
- **⚡ Real-time Health Checks** - 30-second status updates
- **🔐 Secure Session Management** - Automatic session validation
- **📱 Responsive Design** - Works on desktop and mobile
- **🎯 Worker Navigation** - Quick access to all interfaces

## 🧱 Bitware Oboe Compliance

- **✅ Complete Independence** - Each proxy function is self-contained
- **✅ AI-Readable Metadata** - All files include structured documentation
- **✅ Simple Architecture** - Clear separation of concerns
- **✅ No Hidden Dependencies** - Explicit configuration and setup
- **✅ Database-First Design** - Session management uses KV storage

## 📈 Performance

- **Static Asset Delivery** - Global CDN via Cloudflare Pages
- **Edge Function Proxy** - Minimal latency authentication layer
- **Efficient Session Management** - KV storage with automatic expiration
- **Real-time Health Monitoring** - Live system status updates

## 🔄 Next Phases

### Phase 2: Worker Interface Pages (2-3 days)
- 6 individual HTML pages for each worker
- Direct worker interaction interfaces
- Comprehensive navigation system

### Phase 3: Navigation and Polish (1 day)  
- Enhanced responsive design
- Error handling improvements
- Performance optimizations

## 🛡️ Security Best Practices

- All API keys stored as Pages secrets
- Session tokens with automatic expiration
- No sensitive data in browser localStorage
- CORS protection through same-origin proxy
- Input validation on all endpoints

## 📞 Support

- **Documentation**: [Bitware Oboe Manual](./docs/bitware-oboe-manual.md)
- **Issues**: [GitHub Issues](https://github.com/your-org/ai-factory-frontend/issues)
- **Discord**: #ai-factory-frontend

---

**Built with ❤️ using the Bitware Oboe methodology for AI-maintainable distributed systems**

*Last updated: July 22, 2025*  
*Version: 1.0.0 (Phase 1)*  
*Status: Production Ready* ✅