-- Migrate existing pipeline_template_cache to new master_templates structure
-- This separates orchestration logic from worker implementation details

-- First, let's analyze what we need to migrate
-- The existing templates that are just single-worker calls will become simple master templates

-- Content Granulator single-stage templates
INSERT INTO master_templates (
    template_id, template_name, display_name, description, category,
    pipeline_stages, typical_use_cases, keyword_triggers
)
SELECT 
    'cg_' || substr(template_name, 18) || '_001' as template_id,
    template_name,
    display_name,
    description,
    LOWER(category) as category,
    json_array(
        json_object(
            'stage_order', 1,
            'worker', 'bitware-content-granulator',
            'template_ref', 
            CASE 
                WHEN template_name = 'content_granulation_quiz' THEN 'quiz_basic_v1'
                WHEN template_name = 'content_granulation_course' THEN 'course_structure_v1'
                WHEN template_name = 'content_granulation_workflow' THEN 'workflow_standard_v1'
                WHEN template_name = 'content_granulation_novel' THEN 'novel_structure_v1'
                WHEN template_name = 'content_granulation_knowledge_map' THEN 'knowledge_map_v1'
                WHEN template_name = 'content_granulation_learning_path' THEN 'learning_path_v1'
            END,
            'description', 'Generate ' || LOWER(substr(template_name, 18)),
            'required', json('true')
        )
    ) as pipeline_stages,
    typical_use_cases,
    keyword_triggers
FROM pipeline_template_cache
WHERE template_name LIKE 'content_granulation_%'
AND is_active = 1;

-- Multi-stage pipeline templates
INSERT INTO master_templates (
    template_id, template_name, display_name, description, category,
    pipeline_stages, typical_use_cases, keyword_triggers, max_execution_time_ms
)
VALUES
-- Educational Content Pipeline (already has multi-stage)
(
    'edu_pipeline_001',
    'educational_content_pipeline',
    'Educational Content Pipeline',
    'Complete educational content creation: research topic, generate course structure, create assessments',
    'education',
    '[
        {
            "stage_order": 1,
            "worker": "bitware-topic-researcher",
            "template_ref": "comprehensive_research_v1",
            "description": "Research the topic comprehensively",
            "params_override": {
                "depth": "comprehensive",
                "include_examples": true
            },
            "required": true
        },
        {
            "stage_order": 2,
            "worker": "bitware-content-granulator",
            "template_ref": "course_structure_v2",
            "description": "Generate course structure",
            "input_mapping": {
                "topic": "{{stage_1.output.research_results}}"
            },
            "params_override": {
                "depth": 4
            },
            "required": true
        },
        {
            "stage_order": 3,
            "worker": "bitware-content-granulator",
            "template_ref": "quiz_generator_v1",
            "description": "Create assessments",
            "input_mapping": {
                "topics": "{{stage_2.output.structure.chapters}}"
            },
            "required": false
        }
    ]',
    '["Complete course development", "Educational content pipeline", "Training material creation", "Curriculum with assessments"]',
    '["education", "course", "training", "curriculum", "assessment", "complete"]',
    180000
),

-- Content Analysis Pipeline
(
    'analysis_pipeline_001',
    'content_analysis_pipeline',
    'Content Analysis & Structure Pipeline',
    'Analyze existing content and restructure it into organized knowledge',
    'analysis',
    '[
        {
            "stage_order": 1,
            "worker": "bitware-content-analyzer",
            "template_ref": "comprehensive_analysis_v1",
            "description": "Analyze content comprehensively",
            "required": true
        },
        {
            "stage_order": 2,
            "worker": "bitware-content-granulator",
            "template_ref": "knowledge_map_v1",
            "description": "Create knowledge map",
            "input_mapping": {
                "topic": "{{stage_1.output.summary}}",
                "context": "{{stage_1.output.insights}}"
            },
            "required": true
        }
    ]',
    '["Content restructuring", "Knowledge extraction", "Information architecture", "Content optimization"]',
    '["analyze", "restructure", "optimize", "knowledge", "extract"]',
    120000
);

-- Now let's create a mapping table to track the migration
CREATE TABLE IF NOT EXISTS template_migration_map (
    old_template_name TEXT PRIMARY KEY,
    new_template_id TEXT NOT NULL,
    worker_template_ref TEXT,
    migration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Record the mappings
INSERT INTO template_migration_map (old_template_name, new_template_id, worker_template_ref)
SELECT 
    template_name as old_template_name,
    'cg_' || substr(template_name, 18) || '_001' as new_template_id,
    CASE 
        WHEN template_name = 'content_granulation_quiz' THEN 'quiz_basic_v1'
        WHEN template_name = 'content_granulation_course' THEN 'course_structure_v1'
        WHEN template_name = 'content_granulation_workflow' THEN 'workflow_standard_v1'
        WHEN template_name = 'content_granulation_novel' THEN 'novel_structure_v1'
        WHEN template_name = 'content_granulation_knowledge_map' THEN 'knowledge_map_v1'
        WHEN template_name = 'content_granulation_learning_path' THEN 'learning_path_v1'
    END as worker_template_ref
FROM pipeline_template_cache
WHERE template_name LIKE 'content_granulation_%';

-- Update any references in client_requests to use new template IDs
UPDATE client_requests
SET selected_template = (
    SELECT new_template_id 
    FROM template_migration_map 
    WHERE old_template_name = client_requests.selected_template
)
WHERE selected_template IN (
    SELECT old_template_name FROM template_migration_map
);

-- Add a flag to track migrated templates
ALTER TABLE pipeline_template_cache 
ADD COLUMN migrated_to_v2 BOOLEAN DEFAULT false;

UPDATE pipeline_template_cache 
SET migrated_to_v2 = true
WHERE template_name IN (
    SELECT old_template_name FROM template_migration_map
);