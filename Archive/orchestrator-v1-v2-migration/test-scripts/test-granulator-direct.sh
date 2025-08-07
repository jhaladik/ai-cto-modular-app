#\!/bin/bash

echo "Creating Data Security Course for Young Entrepreneurs"
echo "======================================================"

# Create job directly in database with all required fields
cd workers/bitware_content_granulator

JOB_ID=$(wrangler d1 execute content-granulator-db --remote --command="
INSERT INTO granulation_jobs (
  topic, 
  structure_type, 
  template_id, 
  granularity_level, 
  status,
  client_id,
  validation_enabled,
  validation_level,
  validation_threshold,
  target_elements,
  started_at,
  actual_elements,
  quality_score,
  processing_time_ms,
  cost_usd
) VALUES (
  'Data Security for Young Entrepreneurs - 2 Hour Course',
  'course',
  1,
  3,
  'completed',
  'client_demo_001',
  1,
  2, 
  85,
  8,
  datetime('now'),
  0,
  0.85,
  1000,
  0.05
) RETURNING id" | grep -o '"id":[0-9]*' | cut -d':' -f2)

echo "Created job with ID: $JOB_ID"

# Now call the generation endpoint
echo ""
echo "Generating structure through API..."

curl -s -X POST "https://bitware-content-granulator.jhaladik.workers.dev/api/jobs/$JOB_ID/generate"   -H "Authorization: Bearer internal-worker-auth-token-2024"   -H "X-Worker-ID: test"   -d '{}' | head -c 500

echo ""
echo "Checking job details..."

curl -s "https://bitware-content-granulator.jhaladik.workers.dev/api/jobs/$JOB_ID"   -H "Authorization: Bearer internal-worker-auth-token-2024"   -H "X-Worker-ID: test" | head -c 1500
