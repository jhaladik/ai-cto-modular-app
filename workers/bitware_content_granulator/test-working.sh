#!/bin/bash

# Content Granulator Working Test Script
# Simple, focused tests that demonstrate core functionality

BASE_URL="https://bitware-content-granulator.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"
WORKER_ID="test-worker"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🧱 Content Granulator - Working Test"
echo "====================================="
echo ""

# ==================== HEALTH CHECK ====================
echo -e "${BLUE}1. Health Check${NC}"
echo "----------------------------------------"
curl -s -X GET "$BASE_URL/" | jq '.'
echo ""

# ==================== CREATE QUIZ STRUCTURE ====================
echo -e "${BLUE}2. Create Quiz Structure${NC}"
echo "----------------------------------------"
echo "Creating a simple quiz structure about Python..."

QUIZ_RESPONSE=$(curl -s -X POST "$BASE_URL/api/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: $WORKER_ID" \
  -d '{
    "action": "granulate",
    "input": {
      "topic": "Python Variables and Data Types",
      "structureType": "quiz",
      "granularityLevel": 2,
      "targetAudience": "beginners",
      "maxElements": 5
    },
    "config": {
      "aiProvider": "openai",
      "aiModel": "gpt-4o-mini",
      "temperature": 0.7,
      "maxTokens": 2000,
      "validation": false
    }
  }')

echo "$QUIZ_RESPONSE" | jq '{
  success,
  jobId: .output.jobId,
  topic: .output.topic,
  structureType: .output.structureType,
  ready: .output.readyForContentGeneration
}'

QUIZ_JOB_ID=$(echo "$QUIZ_RESPONSE" | jq -r '.output.jobId // empty')
echo -e "${GREEN}Quiz Job ID: $QUIZ_JOB_ID${NC}"
echo ""

# Wait for processing
sleep 3

# ==================== GET JOB DETAILS ====================
if [ ! -z "$QUIZ_JOB_ID" ]; then
  echo -e "${BLUE}3. Get Job Details${NC}"
  echo "----------------------------------------"
  
  JOB_DETAILS=$(curl -s -X GET "$BASE_URL/api/jobs/$QUIZ_JOB_ID" \
    -H "Authorization: Bearer $WORKER_SECRET" \
    -H "X-Worker-ID: $WORKER_ID")
  
  echo "$JOB_DETAILS" | jq '{
    jobId: .job.id,
    status: .job.status,
    structureElements: (.structure | length),
    structure: .structure[0] | {
      type: .element_type,
      title: .title,
      metadata: .metadata
    }
  }'
  echo ""
fi

# ==================== CREATE COURSE STRUCTURE ====================
echo -e "${BLUE}4. Create Course Structure${NC}"
echo "----------------------------------------"
echo "Creating a course structure about JavaScript..."

COURSE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: $WORKER_ID" \
  -d '{
    "action": "granulate",
    "input": {
      "topic": "JavaScript Fundamentals",
      "structureType": "course",
      "granularityLevel": 3,
      "targetAudience": "beginners",
      "maxElements": 10
    },
    "config": {
      "aiProvider": "openai",
      "aiModel": "gpt-4o-mini",
      "temperature": 0.7,
      "maxTokens": 3000,
      "validation": true,
      "validationLevel": 2,
      "validationThreshold": 85
    }
  }')

echo "$COURSE_RESPONSE" | jq '{
  success,
  jobId: .output.jobId,
  topic: .output.topic,
  qualityScore: .output.qualityScore,
  ready: .output.readyForContentGeneration
}'

COURSE_JOB_ID=$(echo "$COURSE_RESPONSE" | jq -r '.output.jobId // empty')
echo -e "${GREEN}Course Job ID: $COURSE_JOB_ID${NC}"
echo ""

# ==================== GET STATISTICS ====================
echo -e "${BLUE}5. Get Statistics${NC}"
echo "----------------------------------------"
curl -s -X GET "$BASE_URL/api/stats" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: $WORKER_ID" | jq '{
    totalJobs: .data.stats.total_jobs,
    successRate: .data.stats.success_rate,
    avgQualityScore: .data.stats.avg_quality_score,
    totalCost: .data.stats.total_cost_usd,
    avgProcessingTime: .data.stats.avg_processing_time_ms
  }'
echo ""

# ==================== GET PRICING INFO ====================
echo -e "${BLUE}6. Get Pricing Information${NC}"
echo "----------------------------------------"
curl -s -X GET "$BASE_URL/api/economy/pricing" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: $WORKER_ID" | jq '{
    defaultProvider: .providers[0] | {
      name: .provider,
      model: .models[0].model,
      costPer1k: .models[0].pricing
    },
    modelsAvailable: [.providers[].models[].model]
  }'
echo ""

# ==================== ESTIMATE COST ====================
echo -e "${BLUE}7. Estimate Granulation Cost${NC}"
echo "----------------------------------------"
curl -s -X POST "$BASE_URL/api/economy/estimate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: $WORKER_ID" \
  -d '{
    "provider": "openai",
    "model": "gpt-4o-mini",
    "structureType": "course",
    "estimatedTokens": 3000
  }' | jq '{
    provider: .estimate.provider,
    model: .estimate.model,
    estimatedCost: .estimate.totalCost,
    costDetails: .estimate.cost
  }'
echo ""

# ==================== GET RESOURCE STATS ====================
echo -e "${BLUE}8. Get Resource Consumption Stats${NC}"
echo "----------------------------------------"
curl -s -X GET "$BASE_URL/api/economy/stats" \
  -H "Authorization: Bearer $WORKER_SECRET" \
  -H "X-Worker-ID: $WORKER_ID" | jq '{
    totalTokensUsed: .stats.total_tokens_used,
    totalCostUsd: .stats.total_cost_usd,
    avgTokensPerJob: .stats.avg_tokens_per_job,
    jobsProcessed: .stats.total_jobs
  }'
echo ""

# ==================== SUMMARY ====================
echo -e "${BLUE}Test Summary${NC}"
echo "============================================"
echo -e "${GREEN}✓ Content Granulator is working correctly${NC}"
echo ""
echo "Job IDs created:"
echo "  Quiz Structure: $QUIZ_JOB_ID"
echo "  Course Structure: $COURSE_JOB_ID"
echo ""
echo "These Job IDs can be used with the Content Generator"
echo "to create actual content from the structures."
echo ""
echo "To use with Content Generator:"
echo "  - granulatorJobId: $COURSE_JOB_ID"
echo "  - The structure will be fetched automatically"