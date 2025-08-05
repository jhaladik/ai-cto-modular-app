-- Add Content Granulator templates to pipeline_template_cache
-- These templates use only the content granulator worker since it's the only one with handshake protocol

INSERT INTO pipeline_template_cache (
    template_name, display_name, description, category, complexity_level,
    worker_flow, typical_use_cases, keyword_triggers,
    estimated_duration_ms, estimated_cost_usd, min_cost_usd, max_cost_usd,
    is_active, requires_premium, allowed_tiers, sync_source, created_at, updated_at
) VALUES 
(
    'content_granulation_course',
    'Course Structure Generator',
    'Generate comprehensive course structure with modules, lessons, and learning objectives',
    'content_structuring',
    'Standard',
    '[{"worker": "bitware-content-granulator", "step": 1, "action": "granulate", "params": {"structureType": "course"}}]',
    '["Online course creation", "Educational content planning", "Training program design", "Curriculum development"]',
    '["course", "curriculum", "training", "education", "learning", "module", "lesson"]',
    20000, 0.05, 0.03, 0.10,
    1, 0, 'basic,standard,premium,enterprise', 'manual_seed', datetime('now'), datetime('now')
),
(
    'content_granulation_quiz',
    'Quiz Generator',
    'Create structured quizzes with questions, answers, and explanations',
    'content_structuring',
    'Basic',
    '[{"worker": "bitware-content-granulator", "step": 1, "action": "granulate", "params": {"structureType": "quiz"}}]',
    '["Assessment creation", "Knowledge testing", "Training evaluation", "Educational quizzes"]',
    '["quiz", "test", "assessment", "questions", "exam", "evaluation"]',
    15000, 0.03, 0.02, 0.05,
    1, 0, 'basic,standard,premium,enterprise', 'manual_seed', datetime('now'), datetime('now')
),
(
    'content_granulation_novel',
    'Novel Structure Planner',
    'Plan novel structure with chapters, scenes, and character arcs',
    'content_structuring',
    'Advanced',
    '[{"worker": "bitware-content-granulator", "step": 1, "action": "granulate", "params": {"structureType": "novel"}}]',
    '["Book planning", "Story structure", "Chapter outlines", "Creative writing"]',
    '["novel", "book", "story", "chapter", "fiction", "writing", "plot"]',
    25000, 0.08, 0.05, 0.15,
    1, 0, 'standard,premium,enterprise', 'manual_seed', datetime('now'), datetime('now')
),
(
    'content_granulation_workflow',
    'Workflow Designer',
    'Design detailed workflows with steps, decision points, and dependencies',
    'content_structuring',
    'Standard',
    '[{"worker": "bitware-content-granulator", "step": 1, "action": "granulate", "params": {"structureType": "workflow"}}]',
    '["Process documentation", "Business workflows", "Operational procedures", "Task automation"]',
    '["workflow", "process", "procedure", "steps", "automation", "flow"]',
    20000, 0.05, 0.03, 0.10,
    1, 0, 'basic,standard,premium,enterprise', 'manual_seed', datetime('now'), datetime('now')
),
(
    'content_granulation_knowledge_map',
    'Knowledge Map Creator',
    'Create comprehensive knowledge maps with interconnected concepts',
    'content_structuring',
    'Advanced',
    '[{"worker": "bitware-content-granulator", "step": 1, "action": "granulate", "params": {"structureType": "knowledge_map"}}]',
    '["Knowledge management", "Concept mapping", "Information architecture", "Learning paths"]',
    '["knowledge", "map", "concept", "information", "architecture", "structure"]',
    30000, 0.10, 0.07, 0.20,
    1, 1, 'premium,enterprise', 'manual_seed', datetime('now'), datetime('now')
),
(
    'content_granulation_learning_path',
    'Learning Path Designer',
    'Design personalized learning paths with prerequisites and milestones',
    'content_structuring',
    'Advanced',
    '[{"worker": "bitware-content-granulator", "step": 1, "action": "granulate", "params": {"structureType": "learning_path"}}]',
    '["Personalized learning", "Training programs", "Skill development", "Educational pathways"]',
    '["learning", "path", "training", "skill", "development", "education"]',
    25000, 0.08, 0.05, 0.15,
    1, 1, 'premium,enterprise', 'manual_seed', datetime('now'), datetime('now')
);

-- Update template parameter definitions for granulator templates
INSERT INTO template_parameters (
    parameter_id, template_name, parameter_name, parameter_type,
    display_name, description, required, default_value,
    validation_rules, ui_component, ui_order, ui_group,
    placeholder, help_text, available_tiers
) VALUES 
-- Common parameters for all granulator templates
('param_gran_topic', 'content_granulation_course', 'topic', 'text',
 'Topic', 'The main topic or subject to structure', 1, NULL,
 '{"minLength": 3, "maxLength": 500}', 'input', 1, 'Basic',
 'e.g., Introduction to Machine Learning', 'Enter the main topic for content structuring', 'basic,standard,premium,enterprise'),
 
('param_gran_granularity', 'content_granulation_course', 'granularityLevel', 'number',
 'Granularity Level', 'Level of detail (1-5, where 5 is most detailed)', 0, '3',
 '{"min": 1, "max": 5}', 'select', 2, 'Basic',
 'Select detail level', 'Higher levels create more detailed structures', 'basic,standard,premium,enterprise'),

('param_gran_audience', 'content_granulation_course', 'targetAudience', 'text',
 'Target Audience', 'Who is this content for?', 0, 'general',
 '{"maxLength": 200}', 'input', 3, 'Basic',
 'e.g., beginners, professionals, students', 'Specify your target audience', 'standard,premium,enterprise'),

('param_gran_validation', 'content_granulation_course', 'validationEnabled', 'boolean',
 'Enable Validation', 'Run AI validation on generated structure', 0, 'true',
 '{}', 'checkbox', 4, 'Advanced',
 NULL, 'Validates structure quality and completeness', 'premium,enterprise'),

('param_gran_val_level', 'content_granulation_course', 'validationLevel', 'number',
 'Validation Level', 'Validation thoroughness (1-3)', 0, '2',
 '{"min": 1, "max": 3}', 'select', 5, 'Advanced',
 'Select validation level', 'Higher levels perform more thorough validation', 'premium,enterprise');

-- Copy parameters to other templates (with appropriate template_name)
-- This would be repeated for each template...