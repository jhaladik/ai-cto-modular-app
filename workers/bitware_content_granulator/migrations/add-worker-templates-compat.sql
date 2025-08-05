-- Add worker templates table to Content Granulator
-- This migration maintains backward compatibility with existing API

-- First, create the new granulator_templates table
CREATE TABLE IF NOT EXISTS granulator_templates (
    template_id TEXT PRIMARY KEY,
    template_name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    
    -- Core configuration
    structure_type TEXT NOT NULL CHECK (structure_type IN ('course', 'quiz', 'novel', 'workflow', 'knowledge_map', 'learning_path')),
    base_parameters TEXT NOT NULL, -- JSON with default params
    parameter_schema TEXT, -- JSON schema for validation
    
    -- Resource and cost estimation
    min_tokens INTEGER NOT NULL,
    max_tokens INTEGER NOT NULL,
    avg_tokens INTEGER NOT NULL,
    token_multiplier REAL DEFAULT 1.5,
    
    estimated_time_ms INTEGER NOT NULL,
    cpu_units REAL DEFAULT 0.5,
    memory_mb INTEGER DEFAULT 256,
    
    -- Tier restrictions
    minimum_tier TEXT NOT NULL CHECK (minimum_tier IN ('basic', 'standard', 'premium', 'enterprise')),
    recommended_tier TEXT,
    tier_reason TEXT,
    
    -- Cost calculation
    base_cost_usd REAL NOT NULL,
    cost_per_1k_tokens REAL DEFAULT 0.00015,
    
    -- Capabilities
    supports_validation BOOLEAN DEFAULT true,
    max_granularity_level INTEGER DEFAULT 5,
    supports_streaming BOOLEAN DEFAULT false,
    
    -- For backward compatibility
    complexity_level TEXT GENERATED ALWAYS AS (
        CASE minimum_tier
            WHEN 'basic' THEN 'Basic'
            WHEN 'standard' THEN 'Standard'
            WHEN 'premium' THEN 'Advanced'
            WHEN 'enterprise' THEN 'Enterprise'
        END
    ) STORED,
    target_audience TEXT DEFAULT 'general',
    usage_count INTEGER DEFAULT 0,
    
    -- Metadata
    version TEXT DEFAULT '1.0',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create a view that matches the old templates table structure
-- This ensures backward compatibility with existing code
CREATE VIEW IF NOT EXISTS templates AS
SELECT 
    template_name,
    template_name as templateName,
    structure_type,
    structure_type as structureType,
    complexity_level,
    complexity_level as complexityLevel,
    target_audience,
    target_audience as targetAudience,
    parameter_schema as template_schema,
    parameter_schema as templateSchema,
    base_parameters as validation_rules,
    base_parameters as validationRules,
    usage_count,
    usage_count as usageCount,
    created_at,
    created_at as createdAt,
    CASE 
        WHEN structure_type = 'course' THEN 
            'Generate a comprehensive course structure for the topic: {{topic}}'
        WHEN structure_type = 'quiz' THEN 
            'Create quiz questions for the topic: {{topic}}'
        WHEN structure_type = 'novel' THEN 
            'Create a novel structure for the story: {{topic}}'
        WHEN structure_type = 'workflow' THEN 
            'Design a workflow for the process: {{topic}}'
        WHEN structure_type = 'knowledge_map' THEN 
            'Create a knowledge map for the topic: {{topic}}'
        WHEN structure_type = 'learning_path' THEN 
            'Design a learning path for: {{topic}}'
    END as ai_prompt_template,
    CASE 
        WHEN structure_type = 'course' THEN 
            'Generate a comprehensive course structure for the topic: {{topic}}'
        WHEN structure_type = 'quiz' THEN 
            'Create quiz questions for the topic: {{topic}}'
        WHEN structure_type = 'novel' THEN 
            'Create a novel structure for the story: {{topic}}'
        WHEN structure_type = 'workflow' THEN 
            'Design a workflow for the process: {{topic}}'
        WHEN structure_type = 'knowledge_map' THEN 
            'Create a knowledge map for the topic: {{topic}}'
        WHEN structure_type = 'learning_path' THEN 
            'Design a learning path for: {{topic}}'
    END as aiPromptTemplate
FROM granulator_templates
WHERE is_active = true;

-- Insert initial templates
INSERT INTO granulator_templates (
    template_id, template_name, display_name, description,
    structure_type, base_parameters,
    min_tokens, max_tokens, avg_tokens, estimated_time_ms,
    minimum_tier, base_cost_usd, target_audience
) VALUES 
(
    'course_v1',
    'course',
    'Course Structure Generator',
    'Generates comprehensive course outlines',
    'course',
    '{"granularityLevel": 3, "validationEnabled": true}',
    1500, 5000, 2500, 20000,
    'standard', 0.05, 'educators'
),
(
    'quiz_v1',
    'quiz',
    'Quiz Generator',
    'Creates assessment questions',
    'quiz',
    '{"questionsPerTopic": 5, "validationEnabled": true}',
    800, 3000, 1500, 15000,
    'basic', 0.02, 'general'
),
(
    'novel_v1',
    'novel',
    'Novel Structure Planner',
    'Creates detailed novel outlines',
    'novel',
    '{"granularityLevel": 4, "includeCharacterArcs": true}',
    3000, 10000, 5000, 35000,
    'premium', 0.12, 'writers'
),
(
    'workflow_v1',
    'workflow',
    'Workflow Designer',
    'Creates business process workflows',
    'workflow',
    '{"includeDecisionPoints": true, "validationEnabled": true}',
    1200, 4000, 2000, 18000,
    'standard', 0.04, 'business professionals'
),
(
    'knowledge_map_v1',
    'knowledge_map',
    'Knowledge Mapper',
    'Creates comprehensive knowledge maps',
    'knowledge_map',
    '{"includeRelationships": true, "maxDepth": 5}',
    2000, 7000, 3500, 25000,
    'premium', 0.08, 'researchers'
),
(
    'learning_path_v1',
    'learning_path',
    'Learning Path Designer',
    'Creates personalized learning paths',
    'learning_path',
    '{"includeAssessments": true, "multiPathSupport": true}',
    4000, 15000, 7000, 45000,
    'enterprise', 0.20, 'educators'
);

-- Create indexes for performance
CREATE INDEX idx_granulator_templates_type ON granulator_templates(structure_type);
CREATE INDEX idx_granulator_templates_tier ON granulator_templates(minimum_tier);
CREATE INDEX idx_granulator_templates_active ON granulator_templates(is_active);