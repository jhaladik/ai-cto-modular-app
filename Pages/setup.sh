#!/bin/bash
# AI Factory Frontend - Phase 1 Deployment Guide
# @WORKER: DeploymentScript
# 🧱 Type: SetupScript
# 📍 Path: setup.sh
# 🎯 Role: Automated setup and deployment for AI Factory frontend
# 💾 Storage: { cloudflare: "Pages + KV" }

echo "🏭 AI Factory Frontend - Phase 1 Setup"
echo "========================================"

# 1. Project Setup
echo "📁 Setting up project structure..."
mkdir -p ai-factory-frontend
cd ai-factory-frontend

# Create directory structure
mkdir -p functions/api/auth
mkdir -p functions/_shared
mkdir -p public/js/shared
mkdir -p public/css
mkdir -p public/assets

echo "✅ Project structure created"

# 2. Initialize npm project
echo "📦 Initializing npm project..."
npm init -y
npm install --save-dev wrangler@latest

echo "✅ npm project initialized"

# 3. Create KV namespace for session storage
echo "🗂️ Creating KV namespace..."
echo "Please run these commands manually:"
echo "wrangler kv:namespace create 'BITWARE_SESSION_STORE'"
echo "wrangler kv:namespace create 'BITWARE_SESSION_STORE' --preview"
echo ""
echo "Then update wrangler.toml with the namespace IDs"

# 4. Set up environment variables
echo "🔐 Setting up secrets..."
echo "Please run these commands to set your secrets:"
echo ""
echo "wrangler pages secret put CLIENT_API_KEY"
echo "# Enter your CLIENT_API_KEY from backend workers"
echo ""
echo "wrangler pages secret put WORKER_SHARED_SECRET" 
echo "# Enter your WORKER_SHARED_SECRET from backend workers"
echo ""
echo "wrangler pages secret put ADMIN_PASSWORD"
echo "# Enter a secure admin password"
echo ""
echo "wrangler pages secret put USER_PASSWORD"
echo "# Enter a secure user password"

# 5. Configure worker URLs
echo "🔗 Configure your worker URLs in wrangler.toml:"
echo ""
echo "ORCHESTRATOR_URL = 'https://bitware-orchestrator.yourname.workers.dev'"
echo "TOPIC_RESEARCHER_URL = 'https://bitware-topic-researcher.yourname.workers.dev'"
echo "RSS_LIBRARIAN_URL = 'https://bitware-rss-source-finder.yourname.workers.dev'"
echo "FEED_FETCHER_URL = 'https://bitware-feed-fetcher.yourname.workers.dev'"
echo "CONTENT_CLASSIFIER_URL = 'https://bitware-content-classifier.yourname.workers.dev'"
echo "REPORT_BUILDER_URL = 'https://bitware-report-builder.yourname.workers.dev'"

# 6. Development commands
echo ""
echo "🚀 Development Commands:"
echo "======================="
echo ""
echo "# Local development (after setup):"
echo "wrangler pages dev public --local --port 3000"
echo ""
echo "# Deploy to production:"
echo "wrangler pages deploy public"
echo ""
echo "# Deploy to preview:"
echo "wrangler pages deploy public --env preview"

# 7. Testing commands
echo ""
echo "🧪 Testing Commands:"
echo "==================="
echo ""
echo "# Test authentication:"
echo "curl -X POST http://localhost:3000/api/auth/login \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"username\":\"admin\",\"password\":\"admin123\"}'"
echo ""
echo "# Test worker proxy (replace SESSION_TOKEN):"
echo "curl -H 'x-bitware-session-token: YOUR_SESSION_TOKEN' \\"
echo "  http://localhost:3000/api/orchestrator?endpoint=/status"

# Phase 1 Complete Setup Checklist
cat << 'EOF'

📋 Phase 1 Setup Checklist:
===========================

Pre-deployment:
□ Copy all artifact files to project directories
□ Update wrangler.toml with your worker URLs
□ Create KV namespace and update namespace IDs
□ Set all required secrets via wrangler commands
□ Install dependencies: npm install

Deployment:
□ Test locally: wrangler pages dev public --local
□ Verify authentication works with test credentials
□ Test proxy functionality with a backend worker
□ Deploy to preview: wrangler pages deploy public --env preview
□ Test preview deployment
□ Deploy to production: wrangler pages deploy public

Post-deployment verification:
□ Login with admin credentials works
□ Dashboard loads and shows worker status
□ Pipeline overview displays correctly
□ Worker health checks function
□ Session management (login/logout) works
□ All 6 worker proxies respond correctly

Security checklist:
□ Change default passwords in production
□ Verify API keys are not exposed in browser
□ Confirm session tokens expire after 24 hours
□ Test that invalid sessions are rejected
□ Validate CORS protection works

Performance verification:
□ Dashboard loads in < 2 seconds
□ Health checks complete in < 5 seconds
□ Static assets cached by CDN
□ Session validation is fast (< 500ms)

File Structure Summary:
======================

ai-factory-frontend/
├── functions/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login.js           ✅ Session management
│   │   │   ├── logout.js          ✅ Session cleanup
│   │   │   └── validate.js        ✅ Session validation
│   │   ├── orchestrator.js        ✅ Proxy to orchestrator
│   │   ├── topic-researcher.js    ✅ Proxy to topic researcher
│   │   ├── rss-librarian.js       ✅ Proxy to RSS librarian
│   │   ├── feed-fetcher.js        ✅ Proxy to feed fetcher
│   │   ├── content-classifier.js  ✅ Proxy to content classifier
│   │   └── report-builder.js      ✅ Proxy to report builder
│   └── _shared/
│       └── auth-helper.js         ✅ Shared auth utilities
├── public/
│   ├── index.html                 ✅ Main dashboard
│   ├── js/
│   │   ├── shared/
│   │   │   ├── api.js             ✅ API client
│   │   │   ├── auth.js            ✅ Auth client
│   │   │   └── ui.js              ✅ UI helpers
│   │   └── dashboard.js           ✅ Dashboard logic
│   └── css/
│       ├── shared.css             ✅ Common styles
│       └── dashboard.css          ✅ Dashboard styles
├── wrangler.toml                  ✅ Pages configuration
├── package.json                   ✅ Dependencies
└── README.md                      ✅ Documentation

Phase 1 Success Criteria: ✅
============================

✅ Pages Functions proxy authentication works
✅ Dashboard loads and can communicate with orchestrator  
✅ Session management functional
✅ All 6 backend workers accessible through proxy
✅ Real-time health monitoring
✅ Secure credential management
✅ Responsive design for mobile/desktop
✅ Production-ready error handling

Ready for Phase 2: Worker Interface Pages! 🎯

Next Steps:
----------
1. Test Phase 1 deployment thoroughly
2. Begin Phase 2: Individual worker interface pages
3. Implement navigation between worker interfaces
4. Add advanced features and polish in Phase 3

🏭 AI Factory Frontend Phase 1 - COMPLETE! 🎉
EOF

echo ""
echo "🎊 Setup guide complete!"
echo "Follow the checklist above to deploy Phase 1"
echo ""
echo "Remember to:"
echo "1. Update wrangler.toml with your actual worker URLs"
echo "2. Set up KV namespace and update the IDs" 
echo "3. Configure all secrets via wrangler commands"
echo "4. Test locally before deploying to production"
echo ""
echo "Good luck with your AI Factory frontend deployment! 🚀"