# Orchestrator V1/V2 Migration Archive

**Archive Date**: 2025-08-07

## Summary
This archive contains all files related to the migration from Orchestrator V1 and V2 to the new Resource Manager architecture.

## Contents

### Documentation Files
- `DEBUG_PLAN.md` - Initial debugging plan for orchestrator issues
- `DEPLOYMENT_SUCCESS.md` - Deployment status of Resource Manager
- `INTEGRATION_STATUS.md` - Integration progress tracking
- `MIGRATION_ORCHESTRATOR_TO_RESOURCE_MANAGER.md` - Migration guide
- `MIGRATION_SUMMARY.md` - Summary of migration steps
- `NEXT_CHAT_ORCHESTRATOR_ISSUES.md` - Issues to address
- `NEXT_CHAT_TEMPLATE_ISSUE.md` - Template-related issues
- `NEXT_STEPS_WORKFLOW.md` - Workflow planning
- `ORCHESTRATOR_TIMEOUT_FIXES.md` - Timeout issue solutions
- `ORCHESTRATOR_V2_PROPER_ARCHITECTURE.md` - V2 architecture documentation
- `DATA_SECURITY_COURSE_STATUS.md` - Test course creation example

### Test Scripts (/test-scripts)
All test shell scripts used during migration:
- Various integration test scripts
- Queue testing scripts
- Direct execution tests
- Monitoring scripts
- Deployment scripts

### Test Outputs (/test-outputs)
JSON response files from testing:
- `datasec-course.json`
- `execute-response.json`
- `granulator-response.json`
- `test-queue-2.json`

### Workers (/workers)
Old orchestrator implementations:
- `bitware_orchestrator` - Original V1 orchestrator
- `bitware_orchestrator_v2` - V2 with handshake protocol

## Migration Result
✅ Successfully migrated to Resource Manager architecture
- Simplified architecture (removed handshake protocol)
- Dynamic template routing
- Token bucket rate limiting
- Multi-level priority queues

## Current Production System
- **Resource Manager** (`bitware_resource_manager`) - Active
- **KAM** - Updated to use Resource Manager
- **Content Granulator** - Integrated with `/api/execute` endpoint

## Note
These files are archived for historical reference. The active system now uses the Resource Manager architecture.