-- Simplified master templates migration for KAM
-- Focus on orchestration, not implementation details

-- Create master templates table
CREATE TABLE IF NOT EXISTS master_templates (
    template_id TEXT PRIMARY KEY,
    template_name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    pipeline_stages TEXT NOT NULL, -- JSON array
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert simplified master templates that reference worker templates
INSERT INTO master_templates (template_id, template_name, display_name, description, category, pipeline_stages)
VALUES 
-- Single-stage granulator templates
('mt_course_001', 'course_creation', 'Course Creation', 'Create structured course content', 'education',
'[{"stage": 1, "worker": "bitware-content-granulator", "template_ref": "course_v1"}]'),

('mt_quiz_001', 'quiz_generation', 'Quiz Generation', 'Generate assessment questions', 'education',
'[{"stage": 1, "worker": "bitware-content-granulator", "template_ref": "quiz_v1"}]'),

('mt_novel_001', 'novel_planning', 'Novel Planning', 'Plan novel structure', 'creative',
'[{"stage": 1, "worker": "bitware-content-granulator", "template_ref": "novel_v1"}]'),

('mt_workflow_001', 'workflow_design', 'Workflow Design', 'Design business workflows', 'business',
'[{"stage": 1, "worker": "bitware-content-granulator", "template_ref": "workflow_v1"}]'),

('mt_knowledge_001', 'knowledge_mapping', 'Knowledge Mapping', 'Create knowledge maps', 'research',
'[{"stage": 1, "worker": "bitware-content-granulator", "template_ref": "knowledge_map_v1"}]'),

('mt_learning_001', 'learning_path_design', 'Learning Path Design', 'Design learning paths', 'education',
'[{"stage": 1, "worker": "bitware-content-granulator", "template_ref": "learning_path_v1"}]'),

-- Multi-stage pipeline example
('mt_edu_complete_001', 'complete_education_pipeline', 'Complete Education Pipeline', 'Research and create full educational content', 'education',
'[
  {"stage": 1, "worker": "bitware-topic-researcher", "template_ref": "research_v1"},
  {"stage": 2, "worker": "bitware-content-granulator", "template_ref": "course_v1", "input_map": "{{stage_1.summary}}"},
  {"stage": 3, "worker": "bitware-content-granulator", "template_ref": "quiz_v1", "input_map": "{{stage_2.chapters}}"}
]');

-- Create mapping from old template names
CREATE TABLE IF NOT EXISTS template_name_mapping (
    old_name TEXT PRIMARY KEY,
    new_master_id TEXT NOT NULL,
    FOREIGN KEY (new_master_id) REFERENCES master_templates(template_id)
);

INSERT INTO template_name_mapping (old_name, new_master_id)
VALUES 
('content_granulation_course', 'mt_course_001'),
('content_granulation_quiz', 'mt_quiz_001'),
('content_granulation_novel', 'mt_novel_001'),
('content_granulation_workflow', 'mt_workflow_001'),
('content_granulation_knowledge_map', 'mt_knowledge_001'),
('content_granulation_learning_path', 'mt_learning_001'),
('educational_content_pipeline', 'mt_edu_complete_001');