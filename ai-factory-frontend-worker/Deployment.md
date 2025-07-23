# AI Factory Frontend Worker - Deployment Guide

**Complete step-by-step deployment guide for migrating from Pages to Worker architecture**

## 📋 Pre-Deployment Checklist

### ✅ Requirements Verification
- [ ] Node.js 18+ installed
- [ ] Wrangler CLI 4.25+ installed (`npm install -g wrangler`)
- [ ] Cloudflare account with Workers Paid plan
- [ ] All 6 backend workers deployed and functional:
  - `bitware-orchestrator`
  - `bitware-topic-researcher` 
  - `bitware-rss-source-finder`
  - `bitware-feed-fetcher`
  - `bitware-content-classifier`
  - `bitware-report-builder`

### ✅ Backend Worker Verification
```bash
# Test each backend worker is accessible
curl https://bitware-orchestrator.yourname.workers.dev/status
curl https://bitware-topic-researcher.yourname.workers.dev/status
# ... test all workers
```

## 🚀 Step-by-Step Deployment

### Step 1: Project Setup
```bash
# Clone/create project directory
mkdir ai-factory-frontend-worker
cd ai-factory-frontend-worker

# Initialize npm project
npm init -y

# Install dependencies
npm install --save-dev wrangler@latest typescript@latest
npm install --save-dev @cloudflare/workers-types@latest
```

### Step 2: Create Project Structure
```bash
# Create directory structure
mkdir -p src/auth src/static/html src/static/css src/static/js

# Copy all the TypeScript files from the artifacts above into their respective directories
```

### Step 3: Configure Wrangler
Create `wrangler.toml` with your specific configuration:

```toml
name = "ai-factory-frontend-worker"
main = "src/index.ts"
compatibility_date = "2025-01-20"
compatibility_flags = ["nodejs_compat"]

# KV Storage for sessions
[[kv_namespaces]]
binding = "SESSION_STORE"
id = "YOUR_KV_NAMESPACE_ID"  # Replace with actual ID

# 🔥 SERVICE BINDINGS - UPDATE WITH YOUR ACTUAL SERVICE NAMES
[[services]]
binding = "ORCHESTRATOR"
service = "bitware-orchestrator"  # Your actual orchestrator service name

[[services]]
binding = "TOPIC_RESEARCHER"
service = "bitware-topic-researcher"  # Your actual service name

[[services]]
binding = "RSS_LIBRARIAN"
service = "bitware-rss-source-finder"  # Your actual service name

[[services]]
binding = "FEED_FETCHER"
service = "bitware-feed-fetcher"  # Your actual service name

[[services]]
binding = "CONTENT_CLASSIFIER"
service = "bitware-content-classifier"  # Your actual service name

[[services]]
binding = "REPORT_BUILDER"
service = "bitware-report-builder"  # Your actual service name

# Environment variables
[vars]
FRONTEND_VERSION = "2.0.0"
SESSION_TIMEOUT_HOURS = 24
ENABLE_DEBUG_LOGGING = false
CACHE_STATIC_ASSETS = true
STATIC_CACHE_TTL_SECONDS = 3600

# Production environment
[env.production]
ENABLE_DEBUG_LOGGING = false
SESSION_TIMEOUT_HOURS = 24
CACHE_STATIC_ASSETS = true

# Development environment
[env.dev]
ENABLE_DEBUG_LOGGING = true
SESSION_TIMEOUT_HOURS = 1
CACHE_STATIC_ASSETS = false
```

### Step 4: Create KV Namespace
```bash
# Create KV namespace for session storage
wrangler kv:namespace create SESSION_STORE

# Create preview namespace for development
wrangler kv:namespace create SESSION_STORE --preview

# Output will show namespace IDs - update wrangler.toml with these IDs
```

**Important**: Update your `wrangler.toml` with the returned namespace IDs:
```toml
[[kv_namespaces]]
binding = "SESSION_STORE"
id = "abc123def456ghi789"  # Replace with your actual ID
```

### Step 5: Configure Secrets
```bash
# Set authentication secrets
wrangler secret put CLIENT_API_KEY
# Enter: your-client-api-key-from-backend-workers

wrangler secret put WORKER_SHARED_SECRET
# Enter: your-worker-shared-secret-from-backend-workers

wrangler secret put ADMIN_PASSWORD
# Enter: secure-admin-password-123

wrangler secret put USER_PASSWORD
# Enter: secure-user-password-123
```

**Security Note**: Use strong, unique passwords for production!

### Step 6: Update Backend Worker Names
In `wrangler.toml`, replace the service names with your actual deployed worker names:

```bash
# List your deployed workers to get exact names
wrangler list

# Update wrangler.toml with actual service names
```

### Step 7: Local Development Test
```bash
# Start local development server
wrangler dev --local --port 3000

# Test in another terminal
curl http://localhost:3000/
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Step 8: Remote Development Test
```bash
# Test with real service bindings
wrangler dev --remote --port 3000

# Verify service bindings work
curl http://localhost:3000/api/orchestrator/status
```

### Step 9: Production Deployment
```bash
# Deploy to production
wrangler deploy

# Verify deployment
curl https://ai-factory-frontend-worker.yourname.workers.dev/

# Test authentication
curl -X POST https://ai-factory-frontend-worker.yourname.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## 🔧 Configuration Details

### Service Binding Configuration
Each backend worker must be properly bound. Update these in `wrangler.toml`:

```toml
# Example with actual service names
[[services]]
binding = "ORCHESTRATOR"
service = "my-actual-orchestrator-worker-name"

[[services]]
binding = "TOPIC_RESEARCHER"
service = "my-actual-topic-researcher-worker-name"
```

**Finding Your Service Names:**
```bash
# List all your workers
wrangler list

# Get worker details
wrangler status <worker-name>
```

### Environment Variables
Customize these variables in `wrangler.toml`:

```toml
[vars]
FRONTEND_VERSION = "2.0.0"
SESSION_TIMEOUT_HOURS = 24          # Session timeout in hours
ENABLE_DEBUG_LOGGING = false        # Enable detailed logging
CACHE_STATIC_ASSETS = true          # Cache HTML/CSS/JS files
STATIC_CACHE_TTL_SECONDS = 3600     # Cache duration (1 hour)
```

### Authentication Configuration
Set these secrets for authentication:

```bash
# Backend integration
wrangler secret put CLIENT_API_KEY        # API key for backend workers
wrangler secret put WORKER_SHARED_SECRET  # Shared secret between workers

# User authentication  
wrangler secret put ADMIN_PASSWORD        # Admin user password
wrangler secret put USER_PASSWORD         # Regular user password
```

## 🧪 Testing & Verification

### Functional Testing Checklist

#### ✅ Basic Functionality
- [ ] Frontend worker deploys successfully
- [ ] Static assets load (HTML, CSS, JS)
- [ ] Authentication system works (login/logout)
- [ ] Session management functions properly

#### ✅ Service Binding Testing
```bash
# Test each service binding
curl -H "x-session-token: YOUR_SESSION_TOKEN" \
  https://your-worker.workers.dev/api/orchestrator/status

curl -H "x-session-token: YOUR_SESSION_TOKEN" \
  https://your-worker.workers.dev/api/topic-researcher/status

# Repeat for all 6 workers
```

#### ✅ Interface Testing
- [ ] Dashboard loads and shows worker status
- [ ] Orchestrator interface functions
- [ ] Topic Researcher interface works
- [ ] RSS Librarian interface operational  
- [ ] Feed Fetcher interface functional
- [ ] Content Classifier interface works
- [ ] Report Builder interface operational

#### ✅ Authentication Flow
```bash
# Test complete auth flow
curl -X POST https://your-worker.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Use returned session token for authenticated requests
curl -H "x-session-token: RETURNED_TOKEN" \
  https://your-worker.workers.dev/api/orchestrator/status
```

### Performance Testing
```bash
# Test response times
time curl https://your-worker.workers.dev/

# Test service binding performance
time curl -H "x-session-token: TOKEN" \
  https://your-worker.workers.dev/api/orchestrator/status
```

## 🚨 Troubleshooting

### Common Issues & Solutions

#### Service Binding Errors
**Error**: "Service binding not found"
```bash
# Check service names
wrangler list

# Verify binding configuration in wrangler.toml
[[services]]
binding = "ORCHESTRATOR"
service = "exact-worker-name-from-list"
```

#### Authentication Issues
**Error**: "Unauthorized" or session issues
```bash
# Verify secrets are set
wrangler secret list

# Check KV namespace
wrangler kv:namespace list

# Test authentication endpoint
curl -v -X POST https://your-worker.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

#### Static Asset Loading Issues
**Error**: CSS/JS files not loading
- Check `assets.ts` imports are correct
- Verify all static files are included in build
- Check browser console for 404 errors

#### Worker Communication Issues
**Error**: Backend workers not responding via service bindings
```bash
# Test backend workers directly
curl https://bitware-orchestrator.yourname.workers.dev/status

# Check service binding configuration
# Verify worker names in wrangler.toml match deployed workers
```

### Debug Mode
Enable debug logging for troubleshooting:

```toml
# In wrangler.toml
[vars]
ENABLE_DEBUG_LOGGING = true
```

```bash
# View real-time logs
wrangler tail
```

### Health Check Endpoints
Test these endpoints to verify system health:

```bash
# Frontend worker health
curl https://your-worker.workers.dev/

# Authentication system health
curl https://your-worker.workers.dev/api/auth/status

# Backend worker health via service bindings
curl -H "x-session-token: TOKEN" \
  https://your-worker.workers.dev/api/orchestrator/status
```

## 🔄 Migration from Pages

### If Migrating from Existing Pages Setup

#### 1. Backup Current Setup
```bash
# Backup Pages configuration
wrangler pages list
wrangler pages deployment list YOUR_PAGES_PROJECT
```

#### 2. DNS Considerations
- **Option A**: Deploy worker with new subdomain (recommended for testing)
- **Option B**: Update DNS after successful testing

#### 3. Environment Variables Migration
Map your existing Pages environment variables to worker secrets:
```bash
# If you had these in Pages
CLIENT_API_KEY → wrangler secret put CLIENT_API_KEY
WORKER_SHARED_SECRET → wrangler secret put WORKER_SHARED_SECRET
```

#### 4. Session Data Migration
Sessions will need to be recreated (users will need to log in again).

#### 5. Gradual Migration
1. Deploy worker to test subdomain
2. Test all functionality thoroughly
3. Update DNS to point to worker
4. Monitor for any issues
5. Decommission Pages project

## 📊 Production Monitoring

### Key Metrics to Monitor
- **Response Times**: Worker execution time
- **Error Rates**: Failed requests and service binding errors  
- **Authentication**: Session creation/validation rates
- **Service Binding Health**: Backend worker availability

### Logging Strategy
```bash
# Real-time monitoring
wrangler tail --format pretty

# Error monitoring
wrangler tail --format json | grep ERROR
```

### Alerts & Monitoring
Set up monitoring for:
- Worker error rate > 1%
- Response time > 5 seconds
- Service binding failures
- Authentication failure rate > 5%

## 🔒 Security Checklist

### Pre-Production Security Review
- [ ] Changed default passwords for admin/user
- [ ] Verified all secrets are properly configured
- [ ] Confirmed CORS headers are appropriate
- [ ] Tested session timeout functionality
- [ ] Verified service binding authentication
- [ ] Reviewed all user input validation

### Production Security Settings
```toml
# Production-safe configuration
[env.production]
ENABLE_DEBUG_LOGGING = false        # Disable debug logs
SESSION_TIMEOUT_HOURS = 24          # Reasonable session timeout
CACHE_STATIC_ASSETS = true          # Enable caching for performance
```

## 🎯 Success Criteria

Your deployment is successful when:
- [ ] Frontend worker deploys without errors
- [ ] All 6 worker interfaces load correctly
- [ ] Authentication flow works end-to-end
- [ ] Service bindings communicate with backend workers
- [ ] Pipeline orchestration functions properly
- [ ] All static assets load correctly
- [ ] Session management works across browser sessions
- [ ] Performance is acceptable (< 2s page loads)

## 📞 Post-Deployment Support

### Immediate Post-Deployment Tasks
1. **Monitor Logs**: Watch for any errors in the first hour
2. **Test All Interfaces**: Verify each worker interface functions
3. **Performance Check**: Confirm response times are acceptable
4. **User Acceptance**: Test with actual users if possible

### Ongoing Maintenance
- **Weekly**: Review error logs and performance metrics
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Review and rotate authentication secrets
- **As Needed**: Scale or optimize based on usage patterns

---

**🎉 Congratulations! Your AI Factory Frontend Worker is now deployed with service bindings architecture!**