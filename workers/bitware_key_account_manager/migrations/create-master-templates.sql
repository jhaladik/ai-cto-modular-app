-- Create new master templates table for KAM
-- This table only contains orchestration logic, not implementation details

CREATE TABLE IF NOT EXISTS master_templates (
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

-- Create index for quick lookups
CREATE INDEX idx_master_templates_name ON master_templates(template_name);
CREATE INDEX idx_master_templates_category ON master_templates(category);
CREATE INDEX idx_master_templates_active ON master_templates(is_active);

-- Insert example master templates
INSERT INTO master_templates (
    template_id, template_name, display_name, description, category,
    pipeline_stages, typical_use_cases, keyword_triggers
) VALUES 
(
    'edu_content_001',
    'educational_content_pipeline',
    'Educational Content Creation Pipeline',
    'Creates comprehensive educational content with course structure and assessments',
    'education',
    '[
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
    ]',
    '["course creation", "curriculum development", "training materials"]',
    '["course", "curriculum", "educational", "training", "learning"]'
),
(
    'content_structure_001',
    'simple_content_structure',
    'Simple Content Structure',
    'Creates a single structured content piece',
    'content',
    '[
        {
            "stage_order": 1,
            "worker": "bitware-content-granulator",
            "template_ref": "knowledge_map_v1",
            "description": "Generate knowledge map",
            "required": true
        }
    ]',
    '["knowledge mapping", "content structure", "information architecture"]',
    '["structure", "organize", "map", "knowledge"]'
),
(
    'research_analysis_001',
    'research_and_structure',
    'Research and Structure Pipeline',
    'Research a topic and create structured content',
    'research',
    '[
        {
            "stage_order": 1,
            "worker": "bitware-topic-researcher",
            "template_ref": "comprehensive_research_v1",
            "description": "Research topic",
            "required": true
        },
        {
            "stage_order": 2,
            "worker": "bitware-content-granulator",
            "template_ref": "knowledge_map_v1",
            "description": "Structure findings",
            "input_mapping": {
                "topic": "{{stage_1.output.summary}}",
                "context": "{{stage_1.output.key_findings}}"
            },
            "required": true
        }
    ]',
    '["research analysis", "topic exploration", "structured research"]',
    '["research", "analyze", "explore", "investigate"]'
);