-- Add example multi-stage template to demonstrate pipeline with multiple workers
-- This shows how KAM templates orchestrate multiple worker templates

INSERT INTO pipeline_template_cache (
    template_name, display_name, description, category, complexity_level,
    worker_flow, typical_use_cases, keyword_triggers,
    estimated_duration_ms, estimated_cost_usd, min_cost_usd, max_cost_usd,
    is_active, requires_premium, sync_source, created_at, updated_at
) VALUES 
(
    'educational_content_pipeline',
    'Educational Content Pipeline',
    'Complete educational content creation: research topic, generate course structure, create assessments',
    'Education',
    'Advanced',
    '[
        {
            "worker": "topic_researcher",
            "step": 1,
            "action": "research",
            "params": {
                "depth": "comprehensive",
                "include_examples": true
            },
            "deliverable_action": "pass",
            "output_mapping": "research_results -> topic"
        },
        {
            "worker": "bitware-content-granulator",
            "step": 2,
            "action": "granulate",
            "params": {
                "structureType": "course",
                "granularityLevel": 4,
                "validationEnabled": true
            },
            "deliverable_action": "store_and_pass",
            "output_mapping": "structure -> course_outline"
        },
        {
            "worker": "bitware-content-granulator",
            "step": 3,
            "action": "granulate",
            "params": {
                "structureType": "quiz",
                "granularityLevel": 3,
                "basedOn": "{{previous.course_outline}}"
            },
            "deliverable_action": "store",
            "output_mapping": null
        }
    ]',
    '["Complete course development", "Educational content pipeline", "Training material creation", "Curriculum with assessments"]',
    '["education", "course", "training", "curriculum", "assessment", "complete"]',
    65000, 0.18, 0.12, 0.30,
    1, 1, 'manual_seed', datetime('now'), datetime('now')
),
(
    'content_analysis_pipeline',
    'Content Analysis & Structure Pipeline',
    'Analyze existing content and restructure it into organized knowledge',
    'Analysis',
    'Standard',
    '[
        {
            "worker": "content_analyzer",
            "step": 1,
            "action": "analyze",
            "params": {
                "analysis_type": "comprehensive"
            },
            "deliverable_action": "pass",
            "output_mapping": "analysis -> content_insights"
        },
        {
            "worker": "bitware-content-granulator",
            "step": 2,
            "action": "granulate",
            "params": {
                "structureType": "knowledge_map",
                "granularityLevel": 3,
                "useInsights": "{{previous.content_insights}}"
            },
            "deliverable_action": "store",
            "output_mapping": null
        }
    ]',
    '["Content restructuring", "Knowledge extraction", "Information architecture", "Content optimization"]',
    '["analyze", "restructure", "optimize", "knowledge", "extract"]',
    40000, 0.12, 0.08, 0.20,
    1, 0, 'manual_seed', datetime('now'), datetime('now')
);