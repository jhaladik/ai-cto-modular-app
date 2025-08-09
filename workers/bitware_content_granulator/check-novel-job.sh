#\!/bin/bash

BASE_URL="https://bitware-content-granulator.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"
WORKER_ID="test-worker"

JOB_ID=272

echo "Fetching job details for novel structure..."

curl -s -X GET "$BASE_URL/api/jobs/$JOB_ID"   -H "Authorization: Bearer $WORKER_SECRET"   -H "X-Worker-ID: $WORKER_ID" | jq '.'

