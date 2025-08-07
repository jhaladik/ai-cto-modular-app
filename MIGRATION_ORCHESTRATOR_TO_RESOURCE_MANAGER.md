# Migration Plan: Orchestrator v2 to Resource Manager

## Overview
This document outlines the complete migration process from Orchestrator v2 to the new Resource Manager system.

## Migration Benefits
- ✅ **Simplified Architecture** - No complex handshake protocol
- ✅ **Better Resource Control** - Token bucket rate limiting
- ✅ **Cost Optimization** - Automatic cost reduction strategies
- ✅ **Improved Performance** - Direct worker execution
- ✅ **Real-time Budget Control** - Prevents overspending
- ✅ **Fair Scheduling** - Multi-level priority queues

## Migration Steps

### Phase 1: Deploy Resource Manager (Day 1)

#### 1.1 Create Cloudflare Resources
```bash
# Create D1 Database
wrangler d1 create resource-manager-db

# Create KV Namespaces
wrangler kv:namespace create "RESOURCE_CACHE"
wrangler kv:namespace create "EXECUTION_QUEUE"
wrangler kv:namespace create "COST_TRACKING"

# Create R2 Bucket
wrangler r2 bucket create resource-manager-data
```

#### 1.2 Update wrangler.toml with IDs
After creating resources, update the IDs in `workers/bitware_resource_manager/wrangler.toml`

#### 1.3 Deploy Resource Manager
```bash
cd workers/bitware_resource_manager

# Install dependencies
npm install

# Initialize database
wrangler d1 execute resource-manager-db --file=schema.sql

# Deploy to production
npm run deploy
```

### Phase 2: Update KAM Integration (Day 1-2)

#### 2.1 Add Resource Manager Service Binding to KAM
Update `workers/bitware_key_account_manager/wrangler.toml`:
```toml
[[services]]
binding = "RESOURCE_MANAGER"
service = "bitware-resource-manager"
```

#### 2.2 Update KAM Request Execution
Replace Orchestrator v2 calls with Resource Manager calls in KAM.

#### 2.3 Update Template Execution Flow
KAM should now:
1. Authenticate client
2. Validate template
3. Call Resource Manager `/api/execute` instead of Orchestrator v2

### Phase 3: Update Frontend (Day 2)

#### 3.1 Create Resource Manager Proxy
Create new proxy for Resource Manager in Pages.

#### 3.2 Update Frontend Components
Update orchestrator references to use Resource Manager endpoints.

### Phase 4: Update Workers (Day 2-3)

#### 4.1 Remove Handshake Protocol
Workers no longer need handshake support. They should accept direct execution requests.

#### 4.2 Standardize Response Format
All workers should return:
```json
{
  "success": true,
  "output": {},
  "usage": {
    "tokens": { "input": 0, "output": 0 },
    "duration": 0
  },
  "metadata": {}
}
```

### Phase 5: Data Migration (Day 3)

#### 5.1 Export Orchestrator v2 Data
Export any valuable data from Orchestrator v2 database.

#### 5.2 Import Historical Data
Import relevant historical data into Resource Manager database.

### Phase 6: Testing & Validation (Day 3-4)

#### 6.1 Run Test Suite
Test all Resource Manager endpoints.

#### 6.2 End-to-End Testing
Test complete flow from client request to worker execution.

#### 6.3 Performance Testing
Verify improved performance over Orchestrator v2.

### Phase 7: Cutover (Day 4)

#### 7.1 Update DNS/Routes
Point all traffic to Resource Manager.

#### 7.2 Monitor System
Watch for any issues during first 24 hours.

#### 7.3 Decommission Orchestrator v2
After successful validation, remove Orchestrator v2.

## Rollback Plan

If issues arise:
1. Route traffic back to Orchestrator v2
2. Investigate and fix issues
3. Retry migration

## Success Criteria

- ✅ All client requests processed successfully
- ✅ Resource limits enforced
- ✅ Costs tracked accurately
- ✅ No service disruptions
- ✅ Performance improved over Orchestrator v2

## Timeline

- **Day 1**: Deploy Resource Manager, Update KAM
- **Day 2**: Update Frontend and Workers
- **Day 3**: Data Migration and Testing
- **Day 4**: Cutover and Monitoring
- **Day 5**: Decommission Orchestrator v2