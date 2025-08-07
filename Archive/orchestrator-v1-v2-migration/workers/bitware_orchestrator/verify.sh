#!/bin/bash

# Quick verification script for orchestrator fixes
# File: workers/bitware_orchestrator/verify.sh

WORKER_URL="https://bitware-orchestrator.jhaladik.workers.dev"
CLIENT_API_KEY="external-client-api-key-2024"

echo "🔍 Quick Orchestrator Verification"
echo "=================================="

# Test 1: Basic pipeline execution
echo -n "Testing basic pipeline... "
RESPONSE=$(curl -s -X POST -H "X-API-Key: $CLIENT_API_KEY" -H "Content-Type: application/json" \
  -d '{"topic": "verification test", "pipeline_template": "basic_research_pipeline"}' \
  "$WORKER_URL/orchestrate")

if echo "$RESPONSE" | grep -q '"status":"ok"'; then
  PIPELINE_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  echo "✅ SUCCESS - Pipeline ID: $PIPELINE_ID"
  
  # Test 2: Pipeline status lookup
  echo -n "Testing pipeline status... "
  sleep 2  # Give it a moment
  STATUS_RESPONSE=$(curl -s "$WORKER_URL/pipeline/$PIPELINE_ID")
  
  if echo "$STATUS_RESPONSE" | grep -q '"pipeline"'; then
    echo "✅ SUCCESS - Status lookup working"
  else
    echo "❌ FAILED - Status: $(echo "$STATUS_RESPONSE" | head -c 100)"
  fi
else
  echo "❌ FAILED - Pipeline execution failed"
  echo "Response: $(echo "$RESPONSE" | head -c 200)"
fi

# Test 3: Templates
echo -n "Testing templates... "
TEMPLATES=$(curl -s "$WORKER_URL/templates")
if echo "$TEMPLATES" | grep -q '"templates"'; then
  COUNT=$(echo "$TEMPLATES" | grep -o '"name":' | wc -l)
  echo "✅ SUCCESS - $COUNT templates available"
else
  echo "❌ FAILED"
fi

echo ""
echo "🎯 If all tests pass, orchestrator is working correctly!"