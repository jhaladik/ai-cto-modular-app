#!/bin/bash

echo "🧪 Testing Content Granulator - Full Debug"
echo "========================================="
echo ""
echo "Running curl command to trigger the worker..."
echo ""

curl -X POST https://bitware-content-granulator.jhaladik.workers.dev/api/granulate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer internal-worker-auth-token-2024" \
  -H "X-Worker-ID: orchestrator" \
  -d '{
    "topic": "Python Basics",
    "structureType": "course", 
    "templateName": "educational_course_basic",
    "granularityLevel": 2,
    "targetAudience": "beginners"
  }' \
  -v \
  2>&1

echo ""
echo "✅ Request sent. Check the wrangler tail output for logs!"