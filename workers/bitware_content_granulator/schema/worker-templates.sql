-- Worker Templates for Content Granulator
-- Each template defines a specific granulation operation with its own tier requirements

CREATE TABLE IF NOT EXISTS granulator_templates (
    template_id TEXT PRIMARY KEY,
    template_name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    
    -- Core configuration
    structure_type TEXT NOT NULL CHECK (structure_type IN ('course', 'quiz', 'novel', 'workflow', 'knowledge_map', 'learning_path')),
    base_parameters TEXT NOT NULL, -- JSON with default params
    parameter_schema TEXT, -- JSON schema for validation
    
    -- Resource and cost estimation (Worker knows best!)
    min_tokens INTEGER NOT NULL,
    max_tokens INTEGER NOT NULL,
    avg_tokens INTEGER NOT NULL,
    token_multiplier REAL DEFAULT 1.5, -- Complexity multiplier
    
    estimated_time_ms INTEGER NOT NULL,
    cpu_units REAL DEFAULT 0.5,
    memory_mb INTEGER DEFAULT 256,
    
    -- Tier restrictions - Workers know their complexity!
    minimum_tier TEXT NOT NULL CHECK (minimum_tier IN ('basic', 'standard', 'premium', 'enterprise')),
    recommended_tier TEXT,
    tier_reason TEXT, -- Why this tier is required
    
    -- Cost calculation
    base_cost_usd REAL NOT NULL,
    cost_per_1k_tokens REAL DEFAULT 0.00015,
    
    -- Capabilities
    supports_validation BOOLEAN DEFAULT true,
    max_granularity_level INTEGER DEFAULT 5,
    supports_streaming BOOLEAN DEFAULT false,
    supports_incremental BOOLEAN DEFAULT false,
    
    -- Quality metrics
    typical_quality_score REAL DEFAULT 0.85,
    validation_threshold REAL DEFAULT 0.7,
    
    -- Metadata
    version TEXT DEFAULT '1.0',
    is_active BOOLEAN DEFAULT true,
    deprecated_by TEXT, -- Reference to newer template version
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_granulator_templates_type ON granulator_templates(structure_type);
CREATE INDEX idx_granulator_templates_tier ON granulator_templates(minimum_tier);
CREATE INDEX idx_granulator_templates_active ON granulator_templates(is_active);

-- Insert Content Granulator templates with accurate tier requirements
INSERT INTO granulator_templates (
    template_id, template_name, display_name, description,
    structure_type, base_parameters, parameter_schema,
    min_tokens, max_tokens, avg_tokens, token_multiplier,
    estimated_time_ms, minimum_tier, recommended_tier, tier_reason,
    base_cost_usd
) VALUES 
-- Basic Tier Templates
(
    'quiz_basic_v1',
    'quiz_generator_basic',
    'Basic Quiz Generator',
    'Generates simple quizzes with multiple choice questions',
    'quiz',
    '{
        "granularityLevel": 2,
        "questionsPerTopic": 5,
        "questionTypes": ["multiple_choice"],
        "includeFeedback": false,
        "validationEnabled": true,
        "validationLevel": 1
    }',
    '{
        "type": "object",
        "properties": {
            "topic": {"type": "string", "required": true},
            "difficulty": {"type": "string", "enum": ["easy", "medium"]}
        }
    }',
    800, 3000, 1500, 1.2,
    15000, 'basic', 'basic', 'Simple structure with minimal AI processing',
    0.02
),

-- Standard Tier Templates
(
    'course_structure_v1',
    'course_structure_standard',
    'Standard Course Structure',
    'Generates course outlines with chapters and topics',
    'course',
    '{
        "granularityLevel": 3,
        "includeObjectives": true,
        "includePrerequisites": false,
        "includeDuration": true,
        "validationEnabled": true,
        "validationLevel": 2
    }',
    '{
        "type": "object",
        "properties": {
            "topic": {"type": "string", "required": true},
            "depth": {"type": "integer", "min": 1, "max": 3},
            "targetAudience": {"type": "string"}
        }
    }',
    1500, 5000, 2500, 1.5,
    20000, 'standard', 'standard', 'Moderate complexity course structure generation',
    0.05
),

(
    'workflow_standard_v1',
    'workflow_designer_standard',
    'Standard Workflow Designer',
    'Creates business process workflows with basic branching',
    'workflow',
    '{
        "granularityLevel": 3,
        "includeDecisionPoints": true,
        "includeRoles": true,
        "maxBranches": 5,
        "validationEnabled": true,
        "validationLevel": 2
    }',
    null,
    1200, 4000, 2000, 1.4,
    18000, 'standard', 'standard', 'Business logic requires structured thinking',
    0.04
),

-- Premium Tier Templates
(
    'course_structure_v2',
    'course_structure_advanced',
    'Advanced Course Structure Generator',
    'Comprehensive course outlines with learning paths and prerequisites',
    'course',
    '{
        "granularityLevel": 4,
        "includeObjectives": true,
        "includePrerequisites": true,
        "includeDuration": true,
        "includeAssessments": true,
        "includeLearningPath": true,
        "validationEnabled": true,
        "validationLevel": 3
    }',
    '{
        "type": "object",
        "properties": {
            "topic": {"type": "string", "required": true},
            "depth": {"type": "integer", "min": 1, "max": 5},
            "targetAudience": {"type": "string"},
            "prerequisiteLevel": {"type": "string", "enum": ["none", "basic", "intermediate", "advanced"]}
        }
    }',
    2500, 8000, 4000, 1.8,
    30000, 'premium', 'premium', 'Complex educational structure with interdependencies',
    0.10
),

(
    'novel_structure_v1',
    'novel_planner_advanced',
    'Advanced Novel Structure Planner',
    'Creates detailed novel outlines with character arcs and plot threads',
    'novel',
    '{
        "granularityLevel": 4,
        "includeCharacterArcs": true,
        "includePlotThreads": true,
        "includeChapterSummaries": true,
        "includeSceneSuggestions": true,
        "validationEnabled": true,
        "validationLevel": 2
    }',
    null,
    3000, 10000, 5000, 2.0,
    35000, 'premium', 'premium', 'Creative writing requires sophisticated AI capabilities',
    0.12
),

(
    'knowledge_map_v1',
    'knowledge_mapper_advanced',
    'Advanced Knowledge Mapper',
    'Creates comprehensive knowledge maps with concept relationships',
    'knowledge_map',
    '{
        "granularityLevel": 4,
        "includeRelationships": true,
        "includeHierarchy": true,
        "includeCrossTopic": true,
        "maxDepth": 5,
        "validationEnabled": true,
        "validationLevel": 3
    }',
    null,
    2000, 7000, 3500, 1.7,
    25000, 'premium', 'premium', 'Complex relationship mapping requires advanced processing',
    0.08
),

-- Enterprise Tier Templates
(
    'learning_path_v1',
    'learning_path_enterprise',
    'Enterprise Learning Path Designer',
    'Creates personalized learning paths with skill mapping and assessments',
    'learning_path',
    '{
        "granularityLevel": 5,
        "includeSkillMapping": true,
        "includeAssessments": true,
        "includePrerequisites": true,
        "includeTimeEstimates": true,
        "includePersonalization": true,
        "multiPathSupport": true,
        "validationEnabled": true,
        "validationLevel": 3
    }',
    '{
        "type": "object",
        "properties": {
            "topic": {"type": "string", "required": true},
            "learnerProfiles": {"type": "array", "items": {"type": "string"}},
            "skillLevels": {"type": "array", "items": {"type": "string"}},
            "timeConstraints": {"type": "object"}
        }
    }',
    4000, 15000, 7000, 2.5,
    45000, 'enterprise', 'enterprise', 'Personalized learning paths require extensive AI processing and analysis',
    0.20
),

(
    'quiz_generator_v1',
    'quiz_generator_adaptive',
    'Adaptive Quiz Generator',
    'Generates adaptive assessments with multiple question types and difficulty levels',
    'quiz',
    '{
        "granularityLevel": 4,
        "questionsPerTopic": 10,
        "questionTypes": ["multiple_choice", "true_false", "short_answer", "essay"],
        "includeFeedback": true,
        "includeExplanations": true,
        "adaptiveDifficulty": true,
        "validationEnabled": true,
        "validationLevel": 3
    }',
    null,
    2000, 8000, 4000, 1.9,
    28000, 'enterprise', 'enterprise', 'Adaptive assessments require sophisticated question generation',
    0.15
);

-- Create usage tracking table
CREATE TABLE IF NOT EXISTS template_usage_stats (
    stat_id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    execution_date DATE NOT NULL,
    execution_count INTEGER DEFAULT 0,
    total_tokens_used INTEGER DEFAULT 0,
    total_cost_usd REAL DEFAULT 0,
    avg_quality_score REAL,
    avg_execution_time_ms INTEGER,
    tier_breakdown TEXT, -- JSON with counts per tier
    FOREIGN KEY (template_id) REFERENCES granulator_templates(template_id),
    UNIQUE(template_id, execution_date)
);

CREATE INDEX idx_template_usage_date ON template_usage_stats(execution_date);
CREATE INDEX idx_template_usage_template ON template_usage_stats(template_id);