#\!/bin/bash

# Test novel template with generic structure
echo "Testing novel template with updated prompt..."

curl -X POST https://bitware-content-granulator.jhaladik.workers.dev/api/execute   -H "Authorization: Bearer test-secret"   -H "X-Worker-ID: test-worker"   -H "Content-Type: application/json"   -d '{
    "action": "granulate",
    "input": {
      "topic": "A Mystery in Victorian London",
      "structureType": "novel",
      "granularityLevel": 3,
      "targetAudience": "adult mystery readers",
      "maxElements": 40
    },
    "config": {
      "aiProvider": "openai",
      "aiModel": "gpt-4o-mini",
      "temperature": 0.8,
      "maxTokens": 4000,
      "validation": false
    }
  }' | jq '.'

echo "Test completed."
