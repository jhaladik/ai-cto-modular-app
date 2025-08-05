# Template Architecture V2 - Separation of Concerns

## Overview

This document describes the new template architecture that separates orchestration templates (KAM) from worker implementation templates.

## 1. Master Templates (KAM) - Orchestration Only

### Schema
```sql
CREATE TABLE master_templates (
    template_id TEXT PRIMARY KEY,
    template_name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    
    -- Pipeline stages referencing worker templates
    pipeline_stages TEXT NOT NULL, -- JSON array of stage definitions
    
    -- Overall pipeline metadata
    typical_use_cases TEXT, -- JSON array
    keyword_triggers TEXT, -- JSON array for AI matching
    
    -- Pipeline-level settings
    max_execution_time_ms INTEGER DEFAULT 300000,
    allow_partial_completion BOOLEAN DEFAULT false,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Example Master Template
```json
{
  "template_id": "edu_content_001",
  "template_name": "educational_content_pipeline",
  "display_name": "Educational Content Creation Pipeline",
  "description": "Creates comprehensive educational content with course structure and assessments",
  "category": "education",
  "pipeline_stages": [
    {
      "stage_order": 1,
      "worker": "bitware-content-granulator",
      "template_ref": "course_structure_v2",
      "description": "Generate course outline",
      "params_override": {
        "depth": 4,
        "includePrerequisites": true
      },
      "required": true
    },
    {
      "stage_order": 2,
      "worker": "bitware-content-granulator",
      "template_ref": "quiz_generator_v1",
      "description": "Create assessments",
      "input_mapping": {
        "topics": "{{stage_1.output.chapters[*].topics}}"
      },
      "required": false,
      "condition": "{{stage_1.output.chapter_count}} > 3"
    }
  ],
  "typical_use_cases": ["course creation", "curriculum development", "training materials"],
  "keyword_triggers": ["course", "curriculum", "educational", "training"]
}
```

## 2. Worker Templates - Implementation Details

### Content Granulator Template Schema
```sql
CREATE TABLE granulator_templates (
    template_id TEXT PRIMARY KEY,
    template_name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    
    -- Core configuration
    structure_type TEXT NOT NULL,
    base_parameters TEXT NOT NULL, -- JSON with default params
    parameter_schema TEXT, -- JSON schema for validation
    
    -- Resource and cost estimation
    min_tokens INTEGER NOT NULL,
    max_tokens INTEGER NOT NULL,
    avg_tokens INTEGER NOT NULL,
    token_multiplier REAL DEFAULT 1.5, -- Based on complexity
    
    estimated_time_ms INTEGER NOT NULL,
    cpu_units REAL DEFAULT 0.5,
    memory_mb INTEGER DEFAULT 256,
    
    -- Tier restrictions (Worker knows best!)
    minimum_tier TEXT NOT NULL CHECK (minimum_tier IN ('basic', 'standard', 'premium', 'enterprise')),
    recommended_tier TEXT,
    
    -- Cost calculation
    base_cost_usd REAL NOT NULL,
    cost_per_1k_tokens REAL DEFAULT 0.00015,
    
    -- Capabilities
    supports_validation BOOLEAN DEFAULT true,
    max_granularity_level INTEGER DEFAULT 5,
    supports_streaming BOOLEAN DEFAULT false,
    
    -- Metadata
    version TEXT DEFAULT '1.0',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Example Worker Template
```json
{
  "template_id": "course_structure_v2",
  "template_name": "course_structure_advanced",
  "display_name": "Advanced Course Structure Generator",
  "description": "Generates comprehensive course outlines with learning objectives and prerequisites",
  "structure_type": "course",
  "base_parameters": {
    "granularityLevel": 3,
    "includeObjectives": true,
    "includePrerequisites": true,
    "includeDuration": true,
    "validationEnabled": true,
    "validationLevel": 2
  },
  "parameter_schema": {
    "type": "object",
    "properties": {
      "depth": { "type": "integer", "min": 1, "max": 5 },
      "targetAudience": { "type": "string" }
    }
  },
  "min_tokens": 1500,
  "max_tokens": 8000,
  "avg_tokens": 3500,
  "token_multiplier": 1.8,
  "estimated_time_ms": 25000,
  "minimum_tier": "standard",
  "recommended_tier": "premium",
  "base_cost_usd": 0.05,
  "cost_per_1k_tokens": 0.00015
}
```

## 3. Execution Flow

### Step 1: KAM Receives Request
```javascript
// Client requests: "Create a comprehensive course on Machine Learning"
// KAM assigns master template: "educational_content_pipeline"
```

### Step 2: KAM Initiates Execution
```javascript
// KAM sends to Orchestrator
{
  "master_template_id": "edu_content_001",
  "parameters": {
    "topic": "Machine Learning",
    "audience": "beginners"
  },
  "client_tier": "premium"
}
```

### Step 3: Orchestrator Processes Pipeline
```javascript
// For each stage in master template:
async function executeStage(stage, context) {
  // 1. Get worker template details
  const workerTemplate = await worker.getTemplate(stage.template_ref);
  
  // 2. Check tier eligibility
  if (!isClientTierSufficient(context.client_tier, workerTemplate.minimum_tier)) {
    throw new Error(`Template requires ${workerTemplate.minimum_tier} tier`);
  }
  
  // 3. Merge parameters
  const params = {
    ...workerTemplate.base_parameters,
    ...context.parameters,
    ...stage.params_override
  };
  
  // 4. Execute via handshake
  return await worker.execute(workerTemplate.template_id, params);
}
```

### Step 4: Worker Execution
```javascript
// Content Granulator receives:
{
  "template_id": "course_structure_v2",
  "parameters": {
    "topic": "Machine Learning",
    "depth": 4,
    "includePrerequisites": true,
    // ... merged params
  }
}

// Worker:
// 1. Loads its own template configuration
// 2. Validates parameters against schema
// 3. Estimates actual cost based on input
// 4. Executes with full knowledge of requirements
```

## 4. Benefits of This Architecture

1. **Separation of Concerns**
   - KAM: Orchestration and pipeline flow
   - Workers: Implementation details and constraints

2. **Independent Evolution**
   - Workers can update templates without KAM changes
   - New worker versions maintain compatibility

3. **Accurate Tier/Cost Management**
   - Workers know their true complexity
   - Tier restrictions enforced where they matter

4. **Flexible Composition**
   - Mix and match worker templates
   - Conditional stages based on previous outputs

5. **Better Resource Planning**
   - Workers provide accurate resource estimates
   - Orchestrator can make intelligent scheduling decisions

## 5. Migration Strategy

### Phase 1: Schema Creation
1. Create new master_templates table in KAM
2. Create worker_templates tables in each worker
3. Keep existing tables for backward compatibility

### Phase 2: Data Migration
1. Extract orchestration logic to master templates
2. Extract implementation details to worker templates
3. Create reference mappings

### Phase 3: Code Updates
1. Update KAM to use master templates
2. Update Orchestrator to fetch worker templates
3. Update workers to expose template endpoints

### Phase 4: Cleanup
1. Remove old template tables
2. Remove duplicated logic