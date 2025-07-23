#!/bin/bash
# AI Factory Frontend Worker - Automated Setup Script
# 🏭 Converts from Pages + Functions to Worker + Service Bindings architecture

set -e  # Exit on any error

echo "🏭 AI Factory Frontend Worker - Automated Setup"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
log_info "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    log_error "Node.js version 18+ required. Found version: $(node --version)"
    exit 1
fi
log_success "Node.js $(node --version) detected"

# Check Wrangler
if ! command -v wrangler &> /dev/null; then
    log_warning "Wrangler CLI not found. Installing..."
    npm install -g wrangler@latest
fi

WRANGLER_VERSION=$(wrangler --version | head -n1 | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')
log_success "Wrangler $WRANGLER_VERSION detected"

# Check Cloudflare authentication
log_info "Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    log_warning "Not authenticated with Cloudflare. Please run 'wrangler login' first."
    echo "Would you like to authenticate now? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        wrangler login
    else
        log_error "Cloudflare authentication required. Run 'wrangler login' and try again."
        exit 1
    fi
fi
log_success "Cloudflare authentication verified"

# Project setup
log_info "Setting up project structure..."

# Create directories
mkdir -p src/auth
mkdir -p src/static/html
mkdir -p src/static/css  
mkdir -p src/static/js

log_success "Project directories created"

# Initialize npm if needed
if [ ! -f package.json ]; then
    log_info "Initializing npm project..."
    npm init -y > /dev/null
    log_success "npm project initialized"
fi

# Install dependencies
log_info "Installing dependencies..."
npm install --save-dev wrangler@latest typescript@latest @cloudflare/workers-types@latest > /dev/null
log_success "Dependencies installed"

# KV Namespace creation
log_info "Creating KV namespace for session storage..."

# Check if KV namespace already exists in wrangler.toml
if [ -f wrangler.toml ] && grep -q "SESSION_STORE" wrangler.toml; then
    log_warning "KV namespace already configured in wrangler.toml"
else
    echo "Creating KV namespace..."
    KV_OUTPUT=$(wrangler kv:namespace create SESSION_STORE 2>/dev/null || true)
    KV_PREVIEW_OUTPUT=$(wrangler kv:namespace create SESSION_STORE --preview 2>/dev/null || true)
    
    if [[ $KV_OUTPUT == *"id ="* ]]; then
        KV_ID=$(echo "$KV_OUTPUT" | grep -o 'id = "[^"]*"' | cut -d'"' -f2)
        KV_PREVIEW_ID=$(echo "$KV_PREVIEW_OUTPUT" | grep -o 'id = "[^"]*"' | cut -d'"' -f2)
        log_success "KV namespace created - ID: $KV_ID"
        
        # Store KV IDs for wrangler.toml update
        echo "KV_NAMESPACE_ID=$KV_ID" > .env.setup
        echo "KV_PREVIEW_ID=$KV_PREVIEW_ID" >> .env.setup
    else
        log_warning "KV namespace creation output unclear. Please check manually."
    fi
fi

# Backend worker verification
log_info "Verifying backend workers..."

echo ""
echo "Please verify your backend workers are deployed:"
echo "1. bitware-orchestrator"
echo "2. bitware-topic-researcher"  
echo "3. bitware-rss-source-finder"
echo "4. bitware-feed-fetcher"
echo "5. bitware-content-classifier"
echo "6. bitware-report-builder"
echo ""

wrangler list 2>/dev/null || log_warning "Could not list workers. Please verify manually."

echo ""
echo "Do all 6 backend workers appear in the list above? (y/n)"
read -r workers_ready

if [[ ! "$workers_ready" =~ ^[Yy]$ ]]; then
    log_warning "Please deploy all backend workers before continuing."
    log_info "You can continue this setup later by running this script again."
    exit 1
fi

log_success "Backend workers verified"

# Configuration
log_info "Setting up configuration..."

# Create basic wrangler.toml if it doesn't exist
if [ ! -f wrangler.toml ]; then
    log_info "Creating wrangler.toml configuration..."
    
    # Get KV namespace ID if we created it
    KV_ID=""
    if [ -f .env.setup ]; then
        source .env.setup
        KV_ID=$KV_NAMESPACE_ID
    fi
    
    cat > wrangler.toml << EOF
name = "ai-factory-frontend-worker"
main = "src/index.ts"
compatibility_date = "2025-01-20"
compatibility_flags = ["nodejs_compat"]

# Worker configuration
minify = true

# KV Storage binding for session management
[[kv_namespaces]]
binding = "SESSION_STORE"
id = "${KV_ID:-YOUR_KV_NAMESPACE_ID}"

# 🔥 SERVICE BINDINGS TO BACKEND WORKERS
# UPDATE THESE WITH YOUR ACTUAL SERVICE NAMES
[[services]]
binding = "ORCHESTRATOR"
service = "bitware-orchestrator"

[[services]]
binding = "TOPIC_RESEARCHER"
service = "bitware-topic-researcher"

[[services]]
binding = "RSS_LIBRARIAN"
service = "bitware-rss-source-finder"

[[services]]
binding = "FEED_FETCHER"
service = "bitware-feed-fetcher"

[[services]]
binding = "CONTENT_CLASSIFIER"
service = "bitware-content-classifier"

[[services]]
binding = "REPORT_BUILDER"
service = "bitware-report-builder"

# Environment variables
[vars]
FRONTEND_VERSION = "2.0.0"
SESSION_TIMEOUT_HOURS = 24
ENABLE_DEBUG_LOGGING = true
CACHE_STATIC_ASSETS = true
STATIC_CACHE_TTL_SECONDS = 3600

# Development environment
[env.dev]
ENABLE_DEBUG_LOGGING = true
SESSION_TIMEOUT_HOURS = 1
CACHE_STATIC_ASSETS = false

# Production environment  
[env.production]
ENABLE_DEBUG_LOGGING = false
SESSION_TIMEOUT_HOURS = 24
CACHE_STATIC_ASSETS = true
EOF

    log_success "wrangler.toml created"
else
    log_warning "wrangler.toml already exists - skipping creation"
fi

# Update package.json scripts
log_info "Updating package.json scripts..."

# Create a temporary script to update package.json
cat > update_package.js << 'EOF'
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

packageJson.scripts = {
  ...packageJson.scripts,
  "dev": "wrangler dev --local --port 3000",
  "dev:remote": "wrangler dev --remote",
  "build": "echo 'Wrangler handles TypeScript compilation'",
  "deploy": "wrangler deploy",
  "deploy:production": "wrangler deploy --env production",
  "deploy:dev": "wrangler deploy --env dev",
  "setup:secrets": "echo 'Run: wrangler secret put CLIENT_API_KEY && wrangler secret put WORKER_SHARED_SECRET && wrangler secret put ADMIN_PASSWORD && wrangler secret put USER_PASSWORD'",
  "validate": "wrangler validate",
  "tail": "wrangler tail",
  "logs": "wrangler tail --format pretty"
};

packageJson.engines = {
  "node": ">=18.0.0"
};

fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
EOF

node update_package.js
rm update_package.js
log_success "package.json scripts updated"

# Secrets setup prompt
log_info "Setting up secrets..."
echo ""
echo "You need to configure the following secrets:"
echo "1. CLIENT_API_KEY - API key for backend workers"
echo "2. WORKER_SHARED_SECRET - Shared secret between workers"
echo "3. ADMIN_PASSWORD - Password for admin user"
echo "4. USER_PASSWORD - Password for regular user"
echo ""
echo "Would you like to set these up now? (y/n)"
read -r setup_secrets

if [[ "$setup_secrets" =~ ^[Yy]$ ]]; then
    echo ""
    log_info "Setting up secrets..."
    
    echo "Enter CLIENT_API_KEY (from your backend workers):"
    wrangler secret put CLIENT_API_KEY
    
    echo "Enter WORKER_SHARED_SECRET (from your backend workers):"
    wrangler secret put WORKER_SHARED_SECRET
    
    echo "Enter ADMIN_PASSWORD (create a secure password):"
    wrangler secret put ADMIN_PASSWORD
    
    echo "Enter USER_PASSWORD (create a secure password):"  
    wrangler secret put USER_PASSWORD
    
    log_success "Secrets configured"
else
    log_warning "Secrets not configured. Run 'npm run setup:secrets' later."
fi

# Cleanup
if [ -f .env.setup ]; then
    rm .env.setup
fi

# Final instructions
echo ""
echo "=============================================="  
log_success "Setup completed successfully!"
echo ""
echo "Next steps:"
echo ""
echo "1. 📝 Copy all the TypeScript files from the artifacts into their respective directories:"
echo "   - src/index.ts (main worker)"
echo "   - src/auth/session.ts (authentication)"
echo "   - src/static/ files (all static assets)"
echo ""
echo "2. 🔧 Update wrangler.toml with your actual worker service names:"
echo "   - Run 'wrangler list' to see your deployed workers"
echo "   - Update the 'service' fields in the [[services]] sections"
echo ""
echo "3. 🧪 Test locally:"
echo "   - Run 'npm run dev' to start development server"
echo "   - Visit http://localhost:3000 to test"
echo ""
echo "4. 🚀 Deploy to production:"
echo "   - Run 'npm run deploy' when ready"
echo ""
echo "5. 🔍 Monitor and verify:"
echo "   - Use 'npm run logs' to monitor real-time logs"
echo "   - Test all worker interfaces thoroughly"
echo ""
echo "📖 For detailed instructions, see:"
echo "   - README.md - Complete documentation"
echo "   - DEPLOYMENT.md - Step-by-step deployment guide"
echo ""

if [[ "$setup_secrets" =~ ^[Yy]$ ]]; then
    log_success "✅ Ready for file copying and deployment!"
else
    log_warning "⚠️  Remember to configure secrets before deployment"
fi

echo ""
echo "🎉 AI Factory Frontend Worker setup complete!"