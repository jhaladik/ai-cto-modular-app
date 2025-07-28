#!/bin/bash

# ===========================================
# 🏭 AI Factory Worker Performance Data Collection
# ===========================================
# Use these curl commands to get actual JSON formats from each worker
# for building the Admin Dashboard Worker Performance Grid

# Worker URLs
KEY_ACCOUNT_MANAGER_URL="https://bitware-key-account-manager.jhaladik.workers.dev"
ORCHESTRATOR_URL="https://bitware-orchestrator.jhaladik.workers.dev"
TOPIC_RESEARCHER_URL="https://bitware-topic-researcher.jhaladik.workers.dev"
RSS_LIBRARIAN_URL="https://bitware-rss-source-finder.jhaladik.workers.dev"
FEED_FETCHER_URL="https://bitware-feed-fetcher.jhaladik.workers.dev"
CONTENT_CLASSIFIER_URL="https://bitware-content-classifier.jhaladik.workers.dev"
REPORT_BUILDER_URL="https://bitware-report-builder.jhaladik.workers.dev"

# Authentication
WORKER_SHARED_SECRET="internal-worker-auth-token-2024"
ADMIN_WORKER_ID="bitware_admin_dashboard"

echo "🏭 AI Factory Worker Performance Data Collection"
echo "=============================================="
echo ""

# ===========================================
# 🔑 KEY ACCOUNT MANAGER
# ===========================================
echo "🔑 KEY ACCOUNT MANAGER"
echo "====================="

echo "Health Check:"
curl -s "$KEY_ACCOUNT_MANAGER_URL/health" | jq '.'
echo ""

echo "Admin Stats:"
curl -s -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
     -H "X-Worker-ID: $ADMIN_WORKER_ID" \
     "$KEY_ACCOUNT_MANAGER_URL/admin/stats" | jq '.'
echo ""

echo "Capabilities:"
curl -s "$KEY_ACCOUNT_MANAGER_URL/capabilities" | jq '.'
echo ""
echo "----------------------------------------"

# ===========================================
# 🎭 ORCHESTRATOR  
# ===========================================
echo "🎭 ORCHESTRATOR"
echo "==============="

echo "Health Check:"
curl -s "$ORCHESTRATOR_URL/health" | jq '.'
echo ""

echo "Admin Stats:"
curl -s -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
     -H "X-Worker-ID: $ADMIN_WORKER_ID" \
     "$ORCHESTRATOR_URL/admin/stats" | jq '.'
echo ""

echo "Admin Performance:"
curl -s -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
     -H "X-Worker-ID: $ADMIN_WORKER_ID" \
     "$ORCHESTRATOR_URL/admin/performance" | jq '.'
echo ""

echo "Admin Costs:"
curl -s -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
     -H "X-Worker-ID: $ADMIN_WORKER_ID" \
     "$ORCHESTRATOR_URL/admin/costs" | jq '.'
echo ""

echo "Pipeline Health:"
curl -s -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
     -H "X-Worker-ID: $ADMIN_WORKER_ID" \
     "$ORCHESTRATOR_URL/pipeline-health" | jq '.'
echo ""
echo "----------------------------------------"

# ===========================================
# 🎯 TOPIC RESEARCHER
# ===========================================
echo "🎯 TOPIC RESEARCHER"
echo "==================="

echo "Health Check:"
curl -s "$TOPIC_RESEARCHER_URL/health" | jq '.'
echo ""

echo "Admin Stats:"
curl -s -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
     -H "X-Worker-ID: $ADMIN_WORKER_ID" \
     "$TOPIC_RESEARCHER_URL/admin/stats" | jq '.'
echo ""

echo "Admin Analytics:"
curl -s -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
     -H "X-Worker-ID: $ADMIN_WORKER_ID" \
     "$TOPIC_RESEARCHER_URL/admin/analytics" | jq '.'
echo ""

echo "Admin Performance:"
curl -s -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
     -H "X-Worker-ID: $ADMIN_WORKER_ID" \
     "$TOPIC_RESEARCHER_URL/admin/performance" | jq '.'
echo ""

echo "Capabilities:"
curl -s "$TOPIC_RESEARCHER_URL/capabilities" | jq '.'
echo ""
echo "----------------------------------------"

# ===========================================
# 📚 RSS LIBRARIAN
# ===========================================
echo "📚 RSS LIBRARIAN"
echo "================"

echo "Health Check:"
curl -s "$RSS_LIBRARIAN_URL/health" | jq '.'
echo ""

echo "Admin Stats:"
curl -s -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
     -H "X-Worker-ID: $ADMIN_WORKER_ID" \
     "$RSS_LIBRARIAN_URL/admin/stats" | jq '.'
echo ""

echo "Capabilities:"
curl -s "$RSS_LIBRARIAN_URL/capabilities" | jq '.'
echo ""
echo "----------------------------------------"

# ===========================================
# 📡 FEED FETCHER
# ===========================================
echo "📡 FEED FETCHER"
echo "==============="

echo "Health Check:"
curl -s "$FEED_FETCHER_URL/health" | jq '.'
echo ""

echo "Admin Stats:"
curl -s -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
     -H "X-Worker-ID: $ADMIN_WORKER_ID" \
     "$FEED_FETCHER_URL/admin/stats" | jq '.'
echo ""

echo "Capabilities:"
curl -s "$FEED_FETCHER_URL/capabilities" | jq '.'
echo ""
echo "----------------------------------------"

# ===========================================
# 🧠 CONTENT CLASSIFIER
# ===========================================
echo "🧠 CONTENT CLASSIFIER"
echo "====================="

echo "Health Check:"
curl -s "$CONTENT_CLASSIFIER_URL/health" | jq '.'
echo ""

echo "Admin Stats:"
curl -s -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
     -H "X-Worker-ID: $ADMIN_WORKER_ID" \
     "$CONTENT_CLASSIFIER_URL/admin/stats" | jq '.'
echo ""

echo "Admin Performance:"
curl -s -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
     -H "X-Worker-ID: $ADMIN_WORKER_ID" \
     "$CONTENT_CLASSIFIER_URL/admin/performance" | jq '.'
echo ""

echo "Capabilities:"
curl -s "$CONTENT_CLASSIFIER_URL/capabilities" | jq '.'
echo ""
echo "----------------------------------------"

# ===========================================
# 📊 REPORT BUILDER
# ===========================================
echo "📊 REPORT BUILDER"
echo "================="

echo "Health Check:"
curl -s "$REPORT_BUILDER_URL/health" | jq '.'
echo ""

echo "Admin Stats:"
curl -s -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
     -H "X-Worker-ID: $ADMIN_WORKER_ID" \
     "$REPORT_BUILDER_URL/admin/stats" | jq '.'
echo ""

echo "Capabilities:"
curl -s "$REPORT_BUILDER_URL/capabilities" | jq '.'
echo ""
echo "----------------------------------------"

# ===========================================
# 🔍 COMPACT VERSION - Get All Essential Data
# ===========================================
echo ""
echo "🔍 COMPACT DATA COLLECTION FOR WORKER GRID"
echo "==========================================="

echo "{"
echo '  "workers": {'

# Key Account Manager
echo '    "key_account_manager": {'
echo '      "health":'
curl -s "$KEY_ACCOUNT_MANAGER_URL/health"
echo ','
echo '      "admin_stats":'
curl -s -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
     -H "X-Worker-ID: $ADMIN_WORKER_ID" \
     "$KEY_ACCOUNT_MANAGER_URL/admin/stats"
echo '    },'

# Orchestrator
echo '    "orchestrator": {'
echo '      "health":'
curl -s "$ORCHESTRATOR_URL/health"
echo ','
echo '      "admin_stats":'
curl -s -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
     -H "X-Worker-ID: $ADMIN_WORKER_ID" \
     "$ORCHESTRATOR_URL/admin/stats"
echo ','
echo '      "admin_performance":'
curl -s -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
     -H "X-Worker-ID: $ADMIN_WORKER_ID" \
     "$ORCHESTRATOR_URL/admin/performance"
echo '    },'

# Topic Researcher  
echo '    "topic_researcher": {'
echo '      "health":'
curl -s "$TOPIC_RESEARCHER_URL/health"
echo ','
echo '      "admin_stats":'
curl -s -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
     -H "X-Worker-ID: $ADMIN_WORKER_ID" \
     "$TOPIC_RESEARCHER_URL/admin/stats"
echo '    },'

# RSS Librarian
echo '    "rss_librarian": {'
echo '      "health":'
curl -s "$RSS_LIBRARIAN_URL/health"
echo ','
echo '      "admin_stats":'
curl -s -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
     -H "X-Worker-ID: $ADMIN_WORKER_ID" \
     "$RSS_LIBRARIAN_URL/admin/stats"
echo '    },'

# Feed Fetcher
echo '    "feed_fetcher": {'
echo '      "health":'
curl -s "$FEED_FETCHER_URL/health"
echo ','
echo '      "admin_stats":'
curl -s -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
     -H "X-Worker-ID: $ADMIN_WORKER_ID" \
     "$FEED_FETCHER_URL/admin/stats"
echo '    },'

# Content Classifier
echo '    "content_classifier": {'
echo '      "health":'
curl -s "$CONTENT_CLASSIFIER_URL/health"
echo ','
echo '      "admin_stats":'
curl -s -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
     -H "X-Worker-ID: $ADMIN_WORKER_ID" \
     "$CONTENT_CLASSIFIER_URL/admin/stats"
echo '    },'

# Report Builder
echo '    "report_builder": {'
echo '      "health":'
curl -s "$REPORT_BUILDER_URL/health"
echo ','
echo '      "admin_stats":'
curl -s -H "Authorization: Bearer $WORKER_SHARED_SECRET" \
     -H "X-Worker-ID: $ADMIN_WORKER_ID" \
     "$REPORT_BUILDER_URL/admin/stats"
echo '    }'

echo '  }'
echo '}'

echo ""
echo "✅ Data collection complete!"
echo "Use this JSON structure to build the Worker Performance Grid component."