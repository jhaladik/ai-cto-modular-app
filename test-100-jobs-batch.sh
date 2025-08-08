#!/bin/bash

# Batch test: Run 100 jobs through KAM to Content Granulator
# This will help us understand template management and performance

echo "================================================"
echo "KAM to Content Granulator - 100 Jobs Batch Test"
echo "================================================"
echo ""

# Configuration
KAM_URL="https://bitware-key-account-manager.jhaladik.workers.dev"
WORKER_SECRET="internal-worker-auth-token-2024"
WORKER_ID="bitware_admin_dashboard"
CLIENT_ID="client_demo_001"
TEMPLATE_NAME="content_granulation_course"
BATCH_SIZE=100
PARALLEL_JOBS=5  # Number of concurrent requests

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Arrays to store results
declare -a REQUEST_IDS=()
declare -a EXECUTION_IDS=()
declare -a STATUSES=()
declare -i SUCCESS_COUNT=0
declare -i FAILED_COUNT=0
declare -i PENDING_COUNT=0

# Topics for variety
TOPICS=(
    "Python Flask Web Development"
    "JavaScript React Applications"
    "Node.js Backend Development"
    "Machine Learning Fundamentals"
    "Data Science with Python"
    "Cloud Architecture on AWS"
    "DevOps Best Practices"
    "Mobile App Development"
    "Cybersecurity Essentials"
    "Database Design Patterns"
    "API Development Guide"
    "Microservices Architecture"
    "Docker and Kubernetes"
    "Test-Driven Development"
    "Agile Project Management"
)

# Function to create and execute a request
create_and_execute_request() {
    local job_num=$1
    local topic_index=$((job_num % ${#TOPICS[@]}))
    local topic="${TOPICS[$topic_index]} - Job #${job_num}"
    
    echo -e "${BLUE}[Job ${job_num}/${BATCH_SIZE}]${NC} Creating request for: ${topic}"
    
    # Step 1: Create request
    local request_response=$(curl -s -X POST "${KAM_URL}/requests" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${WORKER_SECRET}" \
        -H "X-Worker-ID: ${WORKER_ID}" \
        -d "{
            \"client_id\": \"${CLIENT_ID}\",
            \"request_type\": \"content_granulation\",
            \"message\": \"Create a course for ${topic} optimized for 10,000 words\",
            \"urgency_level\": \"normal\"
        }")
    
    local request_id=$(echo "$request_response" | python -c "import sys, json; print(json.load(sys.stdin).get('request_id', ''))" 2>/dev/null)
    
    if [ -z "$request_id" ]; then
        echo -e "${RED}  ✗ Failed to create request${NC}"
        ((FAILED_COUNT++))
        return 1
    fi
    
    REQUEST_IDS+=("$request_id")
    
    # Step 2: Assign template
    local update_response=$(curl -s -X PUT "${KAM_URL}/requests/${request_id}" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${WORKER_SECRET}" \
        -H "X-Worker-ID: ${WORKER_ID}" \
        -d "{
            \"selected_template\": \"${TEMPLATE_NAME}\",
            \"template_confidence_score\": 90
        }")
    
    # Step 3: Execute request
    local execute_response=$(curl -s -X POST "${KAM_URL}/requests/${request_id}/execute" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${WORKER_SECRET}" \
        -H "X-Worker-ID: ${WORKER_ID}" \
        -d "{
            \"parameters\": {
                \"topic\": \"${topic}\",
                \"structureType\": \"course\",
                \"templateName\": \"educational_course_basic\",
                \"granularityLevel\": 2,
                \"targetAudience\": \"Professionals\",
                \"constraints\": {
                    \"maxElements\": 12,
                    \"targetWordCount\": 10000
                }
            }
        }")
    
    local execution_id=$(echo "$execute_response" | python -c "import sys, json; print(json.load(sys.stdin).get('execution_id', ''))" 2>/dev/null)
    
    if [ -z "$execution_id" ]; then
        echo -e "${RED}  ✗ Failed to execute request${NC}"
        ((FAILED_COUNT++))
        return 1
    fi
    
    EXECUTION_IDS+=("$execution_id")
    echo -e "${GREEN}  ✓ Request ${request_id} queued${NC}"
    ((SUCCESS_COUNT++))
    
    return 0
}

# Function to check request status
check_request_status() {
    local request_id=$1
    local status_response=$(curl -s -X GET "${KAM_URL}/requests/${request_id}" \
        -H "Authorization: Bearer ${WORKER_SECRET}" \
        -H "X-Worker-ID: ${WORKER_ID}")
    
    local status=$(echo "$status_response" | python -c "import sys, json; print(json.load(sys.stdin).get('request', {}).get('request_status', 'unknown'))" 2>/dev/null)
    echo "$status"
}

# Main execution
echo -e "${YELLOW}Starting batch test with ${BATCH_SIZE} jobs...${NC}"
echo "Client: ${CLIENT_ID}"
echo "Template: ${TEMPLATE_NAME}"
echo ""

# Start time
START_TIME=$(date +%s)

# Create requests in batches
echo -e "${BLUE}Phase 1: Creating and executing requests${NC}"
echo "----------------------------------------"

for ((i=1; i<=BATCH_SIZE; i++)); do
    create_and_execute_request $i &
    
    # Control parallelism
    if [ $((i % PARALLEL_JOBS)) -eq 0 ]; then
        wait
    fi
done

# Wait for all background jobs to complete
wait

echo ""
echo -e "${BLUE}Phase 2: Waiting for processing (30 seconds)${NC}"
echo "----------------------------------------"
sleep 30

# Check statuses
echo ""
echo -e "${BLUE}Phase 3: Checking request statuses${NC}"
echo "----------------------------------------"

COMPLETED_COUNT=0
PROCESSING_COUNT=0
FAILED_STATUS_COUNT=0

for request_id in "${REQUEST_IDS[@]}"; do
    status=$(check_request_status "$request_id")
    STATUSES+=("$status")
    
    case "$status" in
        "completed")
            ((COMPLETED_COUNT++))
            ;;
        "processing")
            ((PROCESSING_COUNT++))
            ;;
        "failed")
            ((FAILED_STATUS_COUNT++))
            ;;
        *)
            ((PENDING_COUNT++))
            ;;
    esac
done

# End time
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Generate report
echo ""
echo "================================================"
echo -e "${YELLOW}BATCH TEST RESULTS${NC}"
echo "================================================"
echo ""
echo "📊 Summary Statistics:"
echo "----------------------"
echo "Total Jobs Attempted: ${BATCH_SIZE}"
echo "Successfully Queued: ${SUCCESS_COUNT}"
echo "Failed to Queue: ${FAILED_COUNT}"
echo ""
echo "📈 Processing Status:"
echo "--------------------"
echo "Completed: ${COMPLETED_COUNT}"
echo "Processing: ${PROCESSING_COUNT}"
echo "Failed: ${FAILED_STATUS_COUNT}"
echo "Pending/Unknown: ${PENDING_COUNT}"
echo ""
echo "⏱️ Performance Metrics:"
echo "---------------------"
echo "Total Duration: ${DURATION} seconds"
echo "Average Time per Job: $(echo "scale=2; $DURATION / $BATCH_SIZE" | bc) seconds"
echo "Jobs per Minute: $(echo "scale=2; $BATCH_SIZE * 60 / $DURATION" | bc)"
echo ""

# Save detailed results
RESULTS_FILE="batch-test-results-$(date +%Y%m%d-%H%M%S).json"
echo "{" > "$RESULTS_FILE"
echo "  \"summary\": {" >> "$RESULTS_FILE"
echo "    \"total_jobs\": ${BATCH_SIZE}," >> "$RESULTS_FILE"
echo "    \"success_count\": ${SUCCESS_COUNT}," >> "$RESULTS_FILE"
echo "    \"failed_count\": ${FAILED_COUNT}," >> "$RESULTS_FILE"
echo "    \"completed_count\": ${COMPLETED_COUNT}," >> "$RESULTS_FILE"
echo "    \"processing_count\": ${PROCESSING_COUNT}," >> "$RESULTS_FILE"
echo "    \"duration_seconds\": ${DURATION}" >> "$RESULTS_FILE"
echo "  }," >> "$RESULTS_FILE"
echo "  \"request_ids\": [" >> "$RESULTS_FILE"
for i in "${!REQUEST_IDS[@]}"; do
    echo -n "    \"${REQUEST_IDS[$i]}\"" >> "$RESULTS_FILE"
    if [ $i -lt $((${#REQUEST_IDS[@]} - 1)) ]; then
        echo "," >> "$RESULTS_FILE"
    else
        echo "" >> "$RESULTS_FILE"
    fi
done
echo "  ]," >> "$RESULTS_FILE"
echo "  \"statuses\": [" >> "$RESULTS_FILE"
for i in "${!STATUSES[@]}"; do
    echo -n "    \"${STATUSES[$i]}\"" >> "$RESULTS_FILE"
    if [ $i -lt $((${#STATUSES[@]} - 1)) ]; then
        echo "," >> "$RESULTS_FILE"
    else
        echo "" >> "$RESULTS_FILE"
    fi
done
echo "  ]" >> "$RESULTS_FILE"
echo "}" >> "$RESULTS_FILE"

echo "📁 Detailed results saved to: ${RESULTS_FILE}"
echo ""

# Template Manager Insights
echo "================================================"
echo -e "${YELLOW}TEMPLATE MANAGER INSIGHTS${NC}"
echo "================================================"
echo ""
echo "🔍 Key Findings for Template Management:"
echo ""
echo "1. Template Mapping:"
echo "   - KAM Template: content_granulation_course"
echo "   - Granulator Template: educational_course_basic"
echo "   - Mapping must be maintained in worker_flow configuration"
echo ""
echo "2. Performance Observations:"
if [ $SUCCESS_COUNT -gt 80 ]; then
    echo "   ✅ High success rate (${SUCCESS_COUNT}/${BATCH_SIZE})"
else
    echo "   ⚠️ Lower success rate (${SUCCESS_COUNT}/${BATCH_SIZE}) - investigate failures"
fi
echo ""
echo "3. Queue Processing:"
echo "   - Parallel processing capability: ${PARALLEL_JOBS} concurrent jobs"
echo "   - Average processing time: $(echo "scale=2; $DURATION / $BATCH_SIZE" | bc) seconds/job"
echo ""
echo "4. Recommendations:"
echo "   • Implement template versioning system"
echo "   • Add template validation before execution"
echo "   • Create template synchronization mechanism"
echo "   • Monitor queue depth and processing times"
echo "   • Implement retry logic for failed jobs"
echo ""

# Check Content Granulator database
echo "📊 Checking Content Granulator Database:"
echo "----------------------------------------"
GRAN_JOBS=$(cd workers/bitware_content_granulator && wrangler d1 execute content-granulator-db --remote --command="SELECT COUNT(*) as count FROM granulation_jobs WHERE id > 99" 2>/dev/null | python -c "import sys, json; data=json.load(sys.stdin); print(data[0]['results'][0]['count'] if data else 0)" 2>/dev/null)
echo "New jobs in Granulator: ${GRAN_JOBS:-unknown}"
echo ""

echo "✅ Batch test complete!"
echo ""
echo "Next Steps:"
echo "1. Review the results file: ${RESULTS_FILE}"
echo "2. Check worker logs for any errors"
echo "3. Implement template synchronization based on findings"
echo "4. Create template management documentation"