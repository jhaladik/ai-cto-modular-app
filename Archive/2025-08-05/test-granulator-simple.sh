#!/bin/bash

echo "🧪 Testing Content Granulator"
echo "============================="
echo ""

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s https://bitware-content-granulator.jhaladik.workers.dev/health | head -c 100
echo ""
echo ""

# Test templates endpoint
echo "2. Testing templates endpoint..."
curl -s -X GET https://bitware-content-granulator.jhaladik.workers.dev/api/templates \
  -H "Authorization: Bearer internal-worker-auth-token-2024" \
  -H "X-Worker-ID: test-client" | head -c 200
echo ""
echo ""

# Test creating a simple job
echo "3. Testing granulation with minimal parameters..."
curl -X POST https://bitware-content-granulator.jhaladik.workers.dev/api/granulate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer internal-worker-auth-token-2024" \
  -H "X-Worker-ID: orchestrator" \
  -d '{
    "topic": "Python Programming Basics",
    "structureType": "course",
    "templateName": "educational_course_basic",
    "granularityLevel": 2,
    "targetAudience": "beginners",
    "constraints": {
      "maxElements": 20
    }
  }'
echo ""
echo ""

echo "✅ Test complete!"