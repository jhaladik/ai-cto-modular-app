# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- 10 D1 tables including users, clients, sessions, communications
- KV caching for performance (1-24 hour TTLs)
- Event-driven triggers for session cleanup
- Comprehensive indexing for query optimization

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
     - `clients-page.js`: Admin client management interface
     - `client-detail-page.js`: Multi-tab client detail views
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
   - `/_shared/`: Authentication helpers

2. **Backend Workers (/workers/)**: 
   
   **Worker 2.0:**
   - `bitware_universal_researcher`: Advanced research capabilities with enhanced AI features
   
   **Workers 1.0 (Production Ready):**
   - `bitware_key_account_manager`: Client relationship management and authentication
   - `bitware_orchestrator`: Central pipeline coordinator
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
- `POST /auth/login` - User login (returns session token)
- `POST /auth/validate` - Session validation
- `GET /client/{id}` - Get client details
- `GET /clients` - List all clients (admin only)
- `POST /client/{id}/budget-check` - Check budget availability
- `GET /dashboard/stats` - Admin dashboard statistics
- `POST /recommend-template` - AI-powered template recommendation

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

## Common Tasks

### Adding a New Frontend Page
1. Create component in `/public/js/components/`
2. Add route in `kam-router.js`
3. Import in appropriate HTML file (admin.html or client.html)
4. Add navigation item in `ai-factory-layout.js`
5. Create CSS if needed in `/public/css/components/`

### Frontend Navigation Structure
**Admin Navigation:**
- Dashboard (home)
- Clients Management
- Analytics (placeholder)
- Reports (placeholder)
- Settings

**Client Navigation:**
- My Account (default view)
- Analytics (placeholder)
- Reports (placeholder)
- Settings

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