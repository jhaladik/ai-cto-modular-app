# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🔄 Latest Updates

### 2025-08-05 - Content Granulator DEPLOYED WITH FULL FRONTEND! 🧱

#### Content Granulator Worker & Frontend Complete
- **✅ Content Granulator Live**: https://bitware-content-granulator.jhaladik.workers.dev
- **✅ Frontend Integration**: Full admin UI with templates, jobs, and deliverables management
- **✅ Database Schema Fixed**: Added missing columns (actualElements, qualityScore, processingTimeMs, costUsd)
- **✅ Structure Transformation**: Handles OpenAI response variations automatically

#### Content Granulator Features Implemented
**Worker Capabilities**:
- **AI-Powered Structure Generation**: Uses OpenAI GPT-4o-mini for content structuring
- **Template Management**: 8 predefined templates (course, quiz, novel, workflow, etc.)
- **Validation System**: 3-level AI validation with configurable thresholds
- **Storage Management**: Automatic KV/R2 tiering for large structures
- **Handshake Protocol**: Supports Orchestrator 2.0 reference-based data transfer

**Frontend Features**:
- **Three-Tab Interface**: Jobs, Templates, and Deliverables views
- **Template Testing**: Test templates with sample data before using
- **Template Editing**: Admin users can modify prompts and validation rules
- **Job Management**: Create, monitor, and retry granulation jobs
- **Structure Viewer**: Tree-based visualization for generated structures
- **Export/Download**: Export structures as JSON files

**API Endpoints**:
```javascript
// Templates
GET  /api/templates             // List all templates
GET  /api/templates/{name}      // Get template details
POST /api/templates/{name}/test // Test template
PUT  /api/templates/{name}      // Update template (admin)

// Jobs
POST /api/granulate            // Create granulation job
GET  /api/jobs                 // List jobs
GET  /api/jobs/{id}            // Get job details
GET  /api/jobs/{id}/structure  // Get generated structure
POST /api/jobs/{id}/retry      // Retry failed job

// Stats & Health
GET  /api/stats                // Granulation statistics
GET  /health                   // Health check
```

### 2025-08-04 - Orchestrator 2.0 DEPLOYED TO PRODUCTION! 🚀

#### Phase 1 & 2 COMPLETE - Full Production Deployment
- **✅ Orchestrator 2.0 Live**: https://bitware-orchestrator-v2.jhaladik.workers.dev
- **✅ Mock Worker Deployed**: https://bitware-mock-worker.jhaladik.workers.dev
- **✅ Database Initialized**: 31 tables deployed to production D1
- **✅ All Cloud Resources Created**:
  - D1 Database: `orchestrator-v2-db` (ID: 99a86f8e-35f8-42b7-b016-99c58f62531d)
  - KV Namespaces: EXECUTION_CACHE, RESOURCE_CACHE, DATA_REFS
  - R2 Bucket: `orchestrator-v2-data`

#### Orchestrator 2.0 Architecture Implemented
**Core Services (Production Ready)**:
- **ResourceManager**: Quota tracking, allocation, usage monitoring, cost calculation
- **PipelineExecutor**: Stage orchestration, retry logic, failure recovery
- **StorageManager**: Intelligent KV/R2 tiering with automatic compression
- **QueueManager**: Priority-based execution with dependency resolution
- **WorkerCoordinator**: Handshake protocol, worker health monitoring

**Handshake Protocol Features**:
- Reference-based data transfer (80% bandwidth reduction)
- Automatic storage selection (inline/KV/R2 based on size)
- Checkpoint-based failure recovery
- Resource requirement negotiation
- Progress tracking and metrics

**API Endpoints (30+ endpoints)**:
```typescript
// Public endpoints
GET  /                          // Health check
GET  /health                    // Detailed health
GET  /help                      // API documentation

// Template management
POST /api/templates/sync        // Sync with KAM
GET  /api/templates            // List templates
GET  /api/templates/{name}     // Template details

// Pipeline execution
POST /api/pipelines/execute    // Execute pipeline
GET  /api/executions/{id}      // Execution status
POST /api/executions/{id}/cancel // Cancel execution

// Resource management
GET  /api/resources/status     // Resource pool status
POST /api/resources/check      // Check availability
POST /api/resources/allocate   // Reserve resources

// Worker coordination
POST /api/workers/handshake    // Initiate handshake
POST /api/workers/acknowledge  // Confirm receipt
GET  /api/workers/status       // Worker health
```

**Database Schema (31 tables across 3 files)**:
- `orchestrator.sql`: Core pipeline and execution tables
- `resources.sql`: Resource management and worker registry
- `execution.sql`: Execution history and analytics

**Test Coverage**:
- 30 comprehensive test scenarios in `test.sh`
- Mock worker for isolated testing
- Production deployment verified

### Next Phase: Worker Migration (Phase 3)
Starting migration of existing workers to support Orchestrator 2.0 handshake protocol.

### 2025-08-04 - Orchestrator 2.0 Planning (Earlier)
- **Designed Orchestrator 2.0 Architecture**: Complete resource management system
- **Defined Handshake Protocol**: Reference-based data transfer to minimize bandwidth
- **Created Implementation Plan**: 5-phase development approach

### 2025-08-03 - MASSIVE PROGRESS DAY!

### Today's Major Accomplishments (16 Commits!)

#### 1. ✅ Complete Admin Dashboard System
- **Enhanced Dashboard**: System monitoring with real-time stats
- **Client Management**: Full CRUD with edit modal, address fields, budget tracking
- **User Management**: Advanced system with tier-based permissions, CSV import/export, bulk operations
- **Request Management**: Complete request lifecycle with template assignment and execution tracking
- **Template Manager**: Full UI with parameter configuration and tier restrictions

#### 2. ✅ Request Management System Implementation
- Created comprehensive RequestsPage component with tabbed interface (pending/processing/completed/failed)
- Template selection modal with confidence scoring
- Mock template execution flow with worker sessions
- Deliverables management section
- Complete API integration with KAM backend:
  - GET/POST /requests endpoints
  - Template assignment and execution
  - Communication tracking
  - Worker session management

#### 3. ✅ Subscription Tier-Based Features
- Template filtering by client subscription tier (basic/standard/premium/enterprise)
- Tier restrictions on template parameters
- Visual tier badges in UI
- Permission system based on subscription levels
- Budget tracking and warnings

#### 4. ✅ Database Enhancements
- Added template_parameters table for detailed parameter definitions
- Created template_parameter_presets for common configurations
- Added allowed_tiers column for tier-based restrictions
- Seeded 8 predefined pipeline templates across categories
- Complete schema for request tracking, communications, and analytics

#### 5. ✅ Critical Bug Fixes
- Fixed authentication errors (401) for admin endpoints
- Resolved login JSON parsing error (deployment issue)
- Fixed client detail page loading and navigation persistence
- Corrected Template Manager binding errors
- Fixed visual inconsistencies in UI components

### Technical Debt Resolved
- Cleaned up duplicate code in KAM worker and Pages functions
- Standardized authentication flow across all endpoints
- Improved error handling and user feedback
- Added proper loading states throughout

### Current System State
- ✅ Full admin dashboard operational
- ✅ Complete client and user management
- ✅ Request lifecycle management working
- ✅ Template Manager Phase 1 complete
- ✅ Authentication and session management stable
- ✅ Database schema comprehensive and indexed

### Today's Impact - By The Numbers
- **16 Commits** delivered
- **50 Files** modified
- **12,388 Lines** added (vs 536 removed)
- **Major Components Created**:
  - requests-page.js (1,091 lines)
  - users-page.js (1,570 lines)  
  - template-manager.js (701 lines)
  - dashboard-page.js (391 lines)
  - permissions system (480+ lines)
- **Database Enhancements**: 5 new migrations, 2 new tables, 8 seed templates
- **CSS Styling**: 1,500+ lines of modern admin theme

## Tomorrow's Roadmap

### Phase 1: Orchestrator 2.0
- Parse templates from KAM
- Execute pipeline stages sequentially
- Coordinate worker pool
- Track execution costs
- Compile results

### Phase 2: Topic Researcher Integration
- Standardize I/O format
- Implement orchestrator protocol
- Add progress reporting
- Cost tracking

### Phase 3: Complete Template Manager
- Dynamic cost estimation (Phase 2)
- Template preview system (Phase 3)
- Orchestrator integration (Phase 4)
- Cost approval workflow (Phase 5)
- Deliverable storage (Phase 6)

## Architecture Overview

This is an AI Factory application built on Cloudflare's edge infrastructure using a microservices architecture. The system processes RSS feeds through an intelligent pipeline for topic research, content classification, and report generation.

### Key Account Manager (KAM) - Central Authentication & Client Management

The KAM worker serves as the authentication and client management hub for the entire system, implementing:

**Three-Tier Authentication:**
1. **Client API Auth**: `X-API-Key` header for external client access
2. **Worker-to-Worker Auth**: Bearer token + `X-Worker-ID` for internal communication
3. **Session Token Auth**: `x-bitware-session-token` for dashboard users

**Pages-to-KAM Authentication Flow:**
- Pages functions validate sessions using KV store (BITWARE_SESSION_STORE)
- Admin endpoints (/dashboard, /clients, /client/*, /users) use worker-to-worker auth
- Non-admin endpoints use client API key auth
- KAM trusts Pages proxy validation when using worker auth (doesn't re-validate sessions)

**Core Capabilities:**
- User management (admin, client, support roles)
- Session management with 24-hour expiration
- Client profile and subscription management
- AI-powered communication analysis (OpenAI integration)
- Pipeline template intelligence and recommendations
- Budget tracking and usage analytics

**Database Architecture:**
- 12+ D1 tables including:
  - Core: users, clients, sessions
  - Requests: client_requests, worker_sessions
  - Communications: client_communications, communication_analytics
  - Templates: pipeline_template_cache, template_parameters, template_parameter_presets
  - Analytics: template_usage_analytics, worker_performance_metrics
- KV caching for performance (1-24 hour TTLs)
- Event-driven triggers for session cleanup
- Comprehensive indexing for query optimization
- Tier-based restrictions on templates and parameters

### Core Architecture Components

1. **Frontend (Pages/)**: Cloudflare Pages SPA Application
   
   **HTML Entry Points:**
   - `index.html`: Landing page with role detection
   - `login.html`: Multi-role authentication interface
   - `admin.html`: Administrative dashboard SPA
   - `client.html`: Client portal SPA
   
   **JavaScript Architecture (`/public/js/`):**
   - **Core Modules:**
     - `session-manager.js`: Central authentication & session management (5-min refresh)
     - `api-client.js`: Unified API layer for all worker communications
     - `kam-router.js`: Hash-based SPA routing with role protection
     - `kam-context-manager.js`: Client permissions & subscription management
   - **UI Components:**
     - `ai-factory-layout.js`: Main application shell (sidebar, header, tabs)
     - `ui-components.js`: Reusable UI library (cards, modals, toasts)
     - `dashboard-page.js`: System monitoring and analytics dashboard
     - `clients-page.js`: Admin client management with add/edit modals
     - `client-detail-page.js`: Multi-tab client detail views
     - `users-page.js`: Advanced user management with CSV import/export
     - `requests-page.js`: Request lifecycle management with template assignment
     - `template-manager.js`: Template configuration with tier restrictions
     - `permissions-display.js`: Permission system visualization
     - `granulation-page.js`: Content granulation management with template testing
     - `orchestrator-page.js`: Pipeline execution and monitoring
   - **Shared Utilities:**
     - `auth.js`: Browser authentication client
     - `api.js`: Legacy orchestrator communication
     - `ui.js`: Common UI helpers
   
   **Styling (`/public/css/`):**
   - `shared.css`: Design system variables and utilities
   - `admin-modern.css`: Main layout and component styles
   - Component-specific CSS in `/components/`
   
   **Backend Functions (`/functions/`):**
   - `/api/auth/`: Login, logout, validation endpoints
   - `/api/kam/[path].js`: Dynamic proxy to KAM worker
   - `/api/granulator/[path].js`: Dynamic proxy to Content Granulator
   - `/_shared/`: Authentication helpers

2. **Backend Workers (/workers/)**: 
   
   **Worker 2.0:**
   - `bitware_universal_researcher`: Advanced research capabilities with enhanced AI features
   - `bitware_orchestrator_v2`: Resource-aware pipeline orchestration with handshake protocol
   - `bitware_content_granulator`: AI-powered content structure generation
   
   **Workers 1.0 (Production Ready):**
   - `bitware_key_account_manager`: Client relationship management and authentication
   - `bitware_orchestrator`: Central pipeline coordinator (legacy)
   - `bitware_topic_researcher`: AI-powered research
   - `bitware_rss_source_finder`: RSS discovery
   - `bitware_feed_fetcher`: Article extraction
   - `bitware_content_classifier`: AI content analysis
   - `bitware_report_builder`: Intelligence report generation
   - `bitware_ai_factory_optimizer`: System optimization and performance

3. **Data Layer**:
   - Cloudflare D1 (SQLite) for structured data
   - Cloudflare KV for caching and sessions
   - Service bindings for direct worker-to-worker communication

## Development Commands

### Frontend Development (Pages)
```bash
cd Pages
npm run dev                  # Start local development server (port 3000)
npm run deploy              # Deploy to production
npm run deploy:preview      # Deploy to preview environment
npm run test:auth          # Test authentication system
npm run test:proxy         # Test proxy functionality
```

### Worker Development
```bash
cd workers/[worker-name]
npm run dev                 # Start local development
npm run deploy             # Deploy to production
npm run deploy:staging     # Deploy to staging
npm run db:init           # Initialize database schema
npm run db:seed           # Seed database with test data
npm run db:reset          # Reset database
./test.sh                 # Run comprehensive tests
```

### System-wide Testing
```bash
./test.sh                  # Run integration tests from root
```

## Frontend Architecture Patterns

### Module Loading Order
The frontend uses a specific module loading sequence to ensure dependencies are available:
```javascript
// From admin.html - correct loading order:
1. auth.js          // Authentication utilities
2. api.js           // API communication layer
3. ui.js            // UI helpers
4. session-manager.js    // Session management
5. api-client.js         // Enhanced API client
6. kam-context-manager.js // Context management
7. permission-resolver.js // Permission system
8. kam-router.js         // Routing system
9. ui-components.js      // UI component library
10. ai-factory-layout.js // Main layout
11. clients-page.js      // Feature pages
12. client-detail-page.js
```

### Component Communication
- Components communicate through the API Client module
- State is managed locally within components (no global state)
- Session Manager broadcasts authentication events
- Router handles navigation between components

### Responsive Design Breakpoints
- Mobile: < 768px (sidebar becomes overlay)
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Error Handling Strategy
- All API calls wrapped in try-catch blocks
- Fallback UI states for loading/error conditions
- Toast notifications for user feedback
- Comprehensive error logging to console

## Key Development Patterns

### Authentication Flow
1. All client requests are authenticated through key_account_manager worker
2. API keys validated against database and KV store sessions
3. Worker-to-worker calls use service bindings (no auth needed)
4. Public endpoints explicitly marked in worker code

### KAM Authentication Headers
```javascript
// Client API authentication
headers: { 'X-API-Key': 'client_api_key' }

// Worker-to-worker authentication
headers: { 
  'Authorization': 'Bearer worker_shared_secret',
  'X-Worker-ID': 'bitware_orchestrator'
}

// Dashboard session authentication
headers: { 'x-bitware-session-token': 'session_token' }
```

### KAM Key Endpoints

**Authentication:**
- `POST /auth/login` - User login (returns session token)
- `POST /auth/validate` - Session validation
- `POST /auth/logout` - Session termination
- `POST /auth/validate-user` - Legacy endpoint for Pages auth proxy

**Client Management:**
- `GET /clients` - List all clients with stats (admin only)
- `POST /clients` - Create new client
- `GET /client/{id}` - Get client details
- `PUT /client` - Update client information
- `GET /client?email={email}` - Get client by email
- `POST /client/{id}/budget-check` - Check budget availability

**User Management:**
- `GET /users` - List all users with pagination and search
- `POST /users` - Create new user
- `GET /users/{id}` - Get specific user
- `PUT /users/{id}` - Update user details
- `DELETE /users/{id}` - Soft delete user

**Request Management:**
- `GET /requests` - List requests with filters (status, urgency)
- `POST /requests` - Create new request
- `GET /requests/{id}` - Get request details
- `PUT /requests/{id}` - Update request (assign template)
- `POST /requests/{id}/execute` - Execute template

**Template Management:**
- `GET /templates` - List templates (filtered by tier)
- `GET /templates/detailed` - Get templates with parameters
- `POST /templates/sync` - Sync with orchestrator
- `POST /recommend-template` - AI-powered template recommendation

**Communications:**
- `GET /communications?client_id={id}` - Get client communications
- `POST /communications` - Create communication record

**Dashboard & Analytics:**
- `GET /dashboard/stats` - Admin dashboard statistics
- `GET /permissions/check` - Check user permissions
- `GET /permissions/my-permissions` - Get current user permissions

### Database Operations
- All workers use D1 with prepared statements
- Schema files in `schema.sql` for each worker
- Transactions used for data integrity
- Standard fields: id, created_at, updated_at

### API Patterns
Every worker follows this structure:
- GET `/` - Health check
- GET `/health` - Detailed health status
- POST `/api/[endpoint]` - Main functionality
- Authentication via `X-API-Key` header

### Service Bindings
Workers communicate via bindings defined in `wrangler.toml`:
```toml
[[services]]
binding = "WORKER_NAME"
service = "bitware-worker-name"
```

## Important Architectural Decisions

1. **Bitware Oboe Methodology**: Code is structured for AI maintainability with clear patterns and comprehensive documentation

2. **Configuration-Driven**: Pipeline changes are made via database configuration, not code changes

3. **Error Handling**: All workers return standardized error responses with proper HTTP status codes

4. **Performance**: KV caching used extensively, with TTLs appropriate to data type

5. **Security**: Multi-layer authentication with session management and API key rotation support

## 🚨 CRITICAL: Worker Proxy Implementation Pattern

### The KAM/Orchestrator Pattern (REQUIRED for all new workers)
All new worker proxies in Pages functions MUST follow this exact pattern:

1. **Proxy File Structure**: `/functions/api/[worker-name].js` (single file, NOT [path].js)
2. **Request Method**: ALL requests come as POST to the proxy
3. **Request Body Format**:
```javascript
{
    endpoint: "/actual/endpoint/path",
    method: "GET|POST|PUT|DELETE",  // The real HTTP method
    data: {}  // Request payload for POST/PUT
}
```

4. **Proxy Implementation Example** (from orchestrator.js):
```javascript
export async function onRequestPost(context) {
    const { request, env } = context;
    
    // Parse the KAM-pattern request
    const { endpoint, method = 'GET', data = {} } = await request.json();
    
    // Validate session
    const sessionToken = request.headers.get('x-bitware-session-token');
    // ... session validation ...
    
    // Forward to worker using service binding
    if (env.WORKER_NAME) {
        const serviceRequest = new Request(`https://worker${endpoint}`, {
            method: method,
            headers: {
                'Authorization': `Bearer ${env.WORKER_SECRET}`,
                'X-Worker-ID': 'bitware_pages_proxy'
            },
            body: method !== 'GET' ? JSON.stringify(data) : undefined
        });
        
        return await env.WORKER_NAME.fetch(serviceRequest);
    }
}
```

5. **Frontend API Client Usage**:
```javascript
// WRONG - Direct REST call
await fetch('/api/granulator/templates', { method: 'GET' })

// CORRECT - KAM pattern
await fetch('/api/granulator', {
    method: 'POST',
    body: JSON.stringify({
        endpoint: '/templates',
        method: 'GET'
    })
})
```

### Service Bindings vs URLs
- Always use service bindings when available (env.WORKER_NAME)
- Service bindings are faster and more secure than HTTP calls
- Only fall back to URLs for external workers or testing

### Common Mistakes to Avoid
1. ❌ Using `[path].js` catch-all routes - these don't work with the KAM pattern
2. ❌ Trying to forward the original HTTP method directly
3. ❌ Not wrapping all requests in POST with endpoint/method/data
4. ❌ Using makeRequest() in api-client.js instead of the proper proxy pattern

### Fixing the Granulator
To fix the granulator proxy:
1. Rename `/api/granulator/[path].js` to `/api/granulator.js`
2. Change it to only accept POST requests
3. Parse `{endpoint, method, data}` from request body
4. Update api-client.js to use the KAM pattern for all granulator calls

## Common Tasks

### Adding a New Frontend Page
1. Create component in `/public/js/components/`
2. Add route in `kam-router.js`
3. Import in appropriate HTML file (admin.html or client.html)
4. Add navigation item in `ai-factory-layout.js`
5. Create CSS if needed in `/public/css/components/`

### Frontend Navigation Structure
**Admin Navigation:**
- Dashboard (system monitoring, stats)
- Clients Management (CRUD, budgets)
- Users Management (permissions, CSV import/export)
- Requests (lifecycle management, template assignment)
- Template Manager (pipeline configuration, tier restrictions)
- Settings (placeholder)

**Client Navigation:**
- My Account (default view)
- Analytics (placeholder)
- Reports (placeholder)
- Settings (placeholder)

### Adding a New Worker
1. Copy an existing worker directory as template
2. Update `wrangler.toml` with new worker details
3. Add service bindings to orchestrator
4. Create database schema
5. Implement standard API endpoints
6. Add comprehensive `test.sh` script

### Modifying the Pipeline
1. Update orchestrator's pipeline configuration in database
2. Ensure worker endpoints match expected inputs/outputs
3. Test with `./test.sh` at root level

### Debugging
- Check worker logs: `wrangler tail --name [worker-name]`
- Test individual endpoints with `test.sh` scripts
- Verify service bindings in `wrangler.toml`
- Check KV session data for auth issues

## Critical Files to Understand

### Frontend
1. `/Pages/public/js/core/session-manager.js` - Session lifecycle management
2. `/Pages/public/js/core/api-client.js` - Unified API communication
3. `/Pages/public/js/core/kam-router.js` - SPA routing system
4. `/Pages/public/js/components/ai-factory-layout.js` - Main application shell
5. `/Pages/functions/api/kam/[path].js` - KAM proxy implementation

### Backend
1. `/workers/bitware_key_account_manager/index.ts` - Core authentication logic
2. `/workers/bitware_key_account_manager/handlers/` - Modular endpoint handlers
   - `admin-ops.ts` - Admin operations (user/client management)
   - `client-ops.ts` - Client CRUD and budget operations
   - `ai-analysis.ts` - Communication analysis and template recommendation
3. `/workers/bitware_key_account_manager/services/` - Service layer
   - `database.ts` - D1 database service with TypeScript interfaces
   - `openai.ts` - AI communication analysis service
4. `/workers/bitware_key_account_manager/schema.sql` - Core database schema
5. `/workers/bitware_key_account_manager/schema_extension_unified.sql` - User auth extensions
6. `/workers/bitware_orchestrator/src/index.js` - Pipeline coordination
7. `/workers/bitware_universal_researcher/src/index.js` - Worker 2.0 patterns

### Configuration
1. `/Pages/wrangler.toml` - Service bindings and KV namespace
2. Root `test.sh` - Integration test patterns

## 🚀 Deployment Commands

### Critical: Always Deploy Pages Correctly
```bash
# WRONG - Will result in 405 errors, functions won't deploy
wrangler pages deploy Pages --project-name=ai-factory-frontend

# CORRECT - Must be from Pages directory
cd Pages
wrangler pages deploy public --project-name=ai-factory-frontend
```

### Deploy Workers
```bash
# KAM Worker
cd workers/bitware_key_account_manager
npm run deploy

# Orchestrator
cd workers/bitware_orchestrator
npm run deploy

# Any other worker
cd workers/[worker-name]
npm run deploy
```

### Database Operations
```bash
# Run migrations
cd workers/bitware_key_account_manager
wrangler d1 execute key-account-management-db --file=migrations/your-migration.sql

# Execute SQL directly
wrangler d1 execute key-account-management-db --command="SELECT * FROM users LIMIT 5"
```

### Session Testing
```bash
# Test login
curl -X POST https://ai-factory-frontend.pages.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@ai-factory.com","password":"admin123","loginType":"admin"}'
```

## 📦 Seeded Templates (Available in System)

1. **market_research_pipeline** - Comprehensive market analysis (Premium)
2. **content_monitoring_pipeline** - Real-time content tracking (Standard)
3. **competitor_analysis_pipeline** - Competitive intelligence (Enterprise)
4. **trend_detection_pipeline** - Trend identification (Standard)
5. **crisis_monitoring_pipeline** - Crisis detection (Enterprise)
6. **sentiment_analysis_pipeline** - Sentiment tracking (Basic)
7. **news_aggregation_pipeline** - News compilation (Basic)
8. **comprehensive_report_pipeline** - Full analysis reports (Enterprise)

## 🐛 Known Issues & Solutions

### Issue: Login returns "Unexpected end of JSON input"
**Solution**: Deploy Pages correctly from Pages directory
```bash
cd Pages
wrangler pages deploy public --project-name=ai-factory-frontend
```

### Issue: Template Manager binding errors
**Solution**: All methods referenced in templates must be defined and bound in constructor

### Issue: 401 Authentication errors on admin endpoints
**Solution**: Ensure endpoints are included in isAdminEndpoint check in KAM proxy

### Issue: 405 Method Not Allowed on API calls
**Solution**: Pages functions not deployed - use correct deployment command

## 📊 System Capabilities

### Current Features
- **Multi-role authentication** (admin, user, client)
- **Complete CRUD operations** for clients, users, requests, templates
- **Tier-based restrictions** (basic, standard, premium, enterprise)
- **Budget management** with usage tracking and warnings
- **Request lifecycle** from creation to template execution
- **Template management** with parameter configuration
- **Communication tracking** and AI analysis
- **CSV import/export** for user management
- **Real-time dashboard** with system statistics
- **Session management** with 24-hour expiration

### Ready for Production
- Authentication system ✅
- Client management ✅
- User management ✅
- Request creation and tracking ✅
- Template selection and filtering ✅
- Dashboard and monitoring ✅
- Database schema and migrations ✅

### Pending Development
- Orchestrator 2.0 integration
- Worker pool coordination
- Dynamic cost calculation
- Template preview system
- Cost approval workflow
- Deliverable storage (R2/D1)
- Client self-service portal
- Advanced analytics dashboard