-- Add Content Granulator templates to pipeline_template_cache
-- Simplified version without template_parameters table dependency

INSERT INTO pipeline_template_cache (
    template_name, display_name, description, category, complexity_level,
    worker_flow, typical_use_cases, keyword_triggers,
    estimated_duration_ms, estimated_cost_usd, min_cost_usd, max_cost_usd,
    is_active, requires_premium, sync_source, created_at, updated_at
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
    1, 0, 'manual_seed', datetime('now'), datetime('now')
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
    1, 0, 'manual_seed', datetime('now'), datetime('now')
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
    1, 0, 'manual_seed', datetime('now'), datetime('now')
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
    1, 0, 'manual_seed', datetime('now'), datetime('now')
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
    1, 1, 'manual_seed', datetime('now'), datetime('now')
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
    1, 1, 'manual_seed', datetime('now'), datetime('now')
);