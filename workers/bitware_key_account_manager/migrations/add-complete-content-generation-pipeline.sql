-- Add complete content generation pipeline templates combining Granulator and Generator
-- These master templates follow the existing worker_flow JSON structure

INSERT INTO pipeline_template_cache (
    template_name, display_name, description, category, complexity_level,
    worker_flow, typical_use_cases, keyword_triggers,
    estimated_duration_ms, estimated_cost_usd, min_cost_usd, max_cost_usd,
    is_active, requires_premium, sync_source, created_at, updated_at
) VALUES 

-- Complete Course Creation Pipeline (Granulator -> Generator)
(
    'complete_course_creation',
    'Complete Course Creation Pipeline',
    'Full course creation: structure generation followed by content generation',
    'Education',
    'Advanced',
    '[
        {
            "worker": "bitware-content-granulator",
            "step": 1,
            "action": "granulate",
            "params": {
                "structureType": "course",
                "granularityLevel": 4,
                "validationEnabled": true,
                "targetAudience": "{{input.audience}}",
                "language": "{{input.language}}",
                "tone": "{{input.tone}}",
                "style": "{{input.style}}"
            },
            "deliverable_action": "pass",
            "output_mapping": "structure -> course_structure"
        },
        {
            "worker": "bitware-content-generator",
            "step": 2,
            "action": "generate",
            "params": {
                "granulatorJobId": "{{stage_1.jobId}}",
                "topic": "{{input.topic}}",
                "structureType": "course",
                "structure": "{{stage_1.output.structure}}",
                "wordCountEstimates": "{{stage_1.output.wordCountEstimates}}",
                "contentMetadata": "{{stage_1.output.contentMetadata}}"
            },
            "deliverable_action": "store",
            "output_mapping": "content -> final_course"
        }
    ]',
    '["Complete online course creation", "Educational content with full text", "Training program development", "Comprehensive learning materials"]',
    '["course", "education", "training", "learning", "complete", "full", "content", "generate"]',
    120000, 0.15, 0.10, 0.30,
    1, 0, 'manual_seed', datetime('now'), datetime('now')
),

-- Complete Quiz Generation Pipeline (Granulator -> Generator)
(
    'complete_quiz_generation',
    'Complete Quiz Generation Pipeline',
    'Full quiz creation: structure generation followed by question content generation',
    'Assessment',
    'Standard',
    '[
        {
            "worker": "bitware-content-granulator",
            "step": 1,
            "action": "granulate",
            "params": {
                "structureType": "quiz",
                "granularityLevel": 3,
                "validationEnabled": true,
                "questionsPerTopic": "{{input.questionsPerTopic}}",
                "difficultyLevel": "{{input.difficulty}}",
                "targetAudience": "{{input.audience}}"
            },
            "deliverable_action": "pass",
            "output_mapping": "structure -> quiz_structure"
        },
        {
            "worker": "bitware-content-generator",
            "step": 2,
            "action": "generate",
            "params": {
                "granulatorJobId": "{{stage_1.jobId}}",
                "topic": "{{input.topic}}",
                "structureType": "quiz",
                "structure": "{{stage_1.output.structure}}",
                "wordCountEstimates": "{{stage_1.output.wordCountEstimates}}",
                "contentMetadata": "{{stage_1.output.contentMetadata}}"
            },
            "deliverable_action": "store",
            "output_mapping": "content -> final_quiz"
        }
    ]',
    '["Complete quiz creation", "Assessment generation with answers", "Test creation", "Evaluation materials"]',
    '["quiz", "test", "assessment", "questions", "complete", "generate", "answers"]',
    60000, 0.08, 0.05, 0.15,
    1, 0, 'manual_seed', datetime('now'), datetime('now')
),

-- Complete Novel Writing Pipeline (Granulator -> Generator)
(
    'complete_novel_writing',
    'Complete Novel Writing Pipeline',
    'Full novel creation: plot structure followed by chapter content generation',
    'Creative',
    'Premium',
    '[
        {
            "worker": "bitware-content-granulator",
            "step": 1,
            "action": "granulate",
            "params": {
                "structureType": "novel",
                "granularityLevel": 5,
                "validationEnabled": true,
                "genre": "{{input.genre}}",
                "chapters": "{{input.chapters}}",
                "targetLength": "{{input.targetLength}}"
            },
            "deliverable_action": "pass",
            "output_mapping": "structure -> novel_structure"
        },
        {
            "worker": "bitware-content-generator",
            "step": 2,
            "action": "generate",
            "params": {
                "granulatorJobId": "{{stage_1.jobId}}",
                "topic": "{{input.premise}}",
                "structureType": "novel",
                "structure": "{{stage_1.output.structure}}",
                "wordCountEstimates": "{{stage_1.output.wordCountEstimates}}",
                "contentMetadata": "{{stage_1.output.contentMetadata}}",
                "writingStyle": "{{input.style}}",
                "tone": "{{input.tone}}"
            },
            "deliverable_action": "store",
            "output_mapping": "content -> final_novel"
        }
    ]',
    '["Complete novel writing", "Book creation", "Story development", "Creative writing projects"]',
    '["novel", "book", "story", "fiction", "writing", "complete", "chapters", "creative"]',
    180000, 0.25, 0.15, 0.50,
    1, 1, 'manual_seed', datetime('now'), datetime('now')
),

-- Complete Workflow Documentation Pipeline (Granulator -> Generator)
(
    'complete_workflow_documentation',
    'Complete Workflow Documentation Pipeline',
    'Full workflow documentation: process structure followed by detailed step content',
    'Business',
    'Standard',
    '[
        {
            "worker": "bitware-content-granulator",
            "step": 1,
            "action": "granulate",
            "params": {
                "structureType": "workflow",
                "granularityLevel": 4,
                "validationEnabled": true,
                "processType": "{{input.processType}}",
                "complexity": "{{input.complexity}}"
            },
            "deliverable_action": "pass",
            "output_mapping": "structure -> workflow_structure"
        },
        {
            "worker": "bitware-content-generator",
            "step": 2,
            "action": "generate",
            "params": {
                "granulatorJobId": "{{stage_1.jobId}}",
                "topic": "{{input.processName}}",
                "structureType": "workflow",
                "structure": "{{stage_1.output.structure}}",
                "wordCountEstimates": "{{stage_1.output.wordCountEstimates}}",
                "contentMetadata": "{{stage_1.output.contentMetadata}}"
            },
            "deliverable_action": "store",
            "output_mapping": "content -> final_workflow"
        }
    ]',
    '["Complete workflow documentation", "Process documentation", "SOP creation", "Business procedures"]',
    '["workflow", "process", "procedure", "documentation", "SOP", "complete", "steps"]',
    90000, 0.12, 0.08, 0.20,
    1, 0, 'manual_seed', datetime('now'), datetime('now')
),

-- Complete Knowledge Base Creation (Granulator -> Generator)
(
    'complete_knowledge_base',
    'Complete Knowledge Base Creation',
    'Full knowledge base: knowledge map structure followed by article content generation',
    'Knowledge Management',
    'Premium',
    '[
        {
            "worker": "bitware-content-granulator",
            "step": 1,
            "action": "granulate",
            "params": {
                "structureType": "knowledge_map",
                "granularityLevel": 5,
                "validationEnabled": true,
                "domain": "{{input.domain}}",
                "depth": "{{input.depth}}"
            },
            "deliverable_action": "pass",
            "output_mapping": "structure -> knowledge_structure"
        },
        {
            "worker": "bitware-content-generator",
            "step": 2,
            "action": "generate",
            "params": {
                "granulatorJobId": "{{stage_1.jobId}}",
                "topic": "{{input.topic}}",
                "structureType": "knowledge_map",
                "structure": "{{stage_1.output.structure}}",
                "wordCountEstimates": "{{stage_1.output.wordCountEstimates}}",
                "contentMetadata": "{{stage_1.output.contentMetadata}}"
            },
            "deliverable_action": "store",
            "output_mapping": "content -> final_knowledge_base"
        }
    ]',
    '["Complete knowledge base creation", "Documentation system", "Information architecture", "Reference materials"]',
    '["knowledge", "documentation", "reference", "information", "complete", "articles", "base"]',
    150000, 0.20, 0.15, 0.35,
    1, 1, 'manual_seed', datetime('now'), datetime('now')
),

-- Complete Learning Path Pipeline (Granulator -> Generator)
(
    'complete_learning_path',
    'Complete Learning Path Pipeline',
    'Full learning path: structure generation followed by learning content creation',
    'Education',
    'Premium',
    '[
        {
            "worker": "bitware-content-granulator",
            "step": 1,
            "action": "granulate",
            "params": {
                "structureType": "learning_path",
                "granularityLevel": 4,
                "validationEnabled": true,
                "skillLevel": "{{input.skillLevel}}",
                "targetRole": "{{input.targetRole}}"
            },
            "deliverable_action": "pass",
            "output_mapping": "structure -> path_structure"
        },
        {
            "worker": "bitware-content-generator",
            "step": 2,
            "action": "generate",
            "params": {
                "granulatorJobId": "{{stage_1.jobId}}",
                "topic": "{{input.topic}}",
                "structureType": "learning_path",
                "structure": "{{stage_1.output.structure}}",
                "wordCountEstimates": "{{stage_1.output.wordCountEstimates}}",
                "contentMetadata": "{{stage_1.output.contentMetadata}}"
            },
            "deliverable_action": "store",
            "output_mapping": "content -> final_learning_path"
        }
    ]',
    '["Personalized learning paths", "Skill development programs", "Career progression guides", "Training roadmaps"]',
    '["learning", "path", "skill", "development", "career", "training", "roadmap"]',
    120000, 0.18, 0.12, 0.30,
    1, 1, 'manual_seed', datetime('now'), datetime('now')
),

-- Multi-Format Content Pipeline (Granulator + Generator for multiple formats)
(
    'multi_format_content_pipeline',
    'Multi-Format Content Pipeline',
    'Generate content in multiple formats: course + quiz + workflow from single topic',
    'Multi-Purpose',
    'Enterprise',
    '[
        {
            "worker": "bitware-content-granulator",
            "step": 1,
            "action": "granulate",
            "params": {
                "structureType": "course",
                "granularityLevel": 4,
                "validationEnabled": true,
                "targetAudience": "{{input.audience}}"
            },
            "deliverable_action": "pass",
            "output_mapping": "structure -> course_structure"
        },
        {
            "worker": "bitware-content-generator",
            "step": 2,
            "action": "generate",
            "params": {
                "granulatorJobId": "{{stage_1.jobId}}",
                "topic": "{{input.topic}}",
                "structureType": "course",
                "structure": "{{stage_1.output.structure}}",
                "wordCountEstimates": "{{stage_1.output.wordCountEstimates}}",
                "contentMetadata": "{{stage_1.output.contentMetadata}}"
            },
            "deliverable_action": "store_and_pass",
            "output_mapping": "content -> course_content"
        },
        {
            "worker": "bitware-content-granulator",
            "step": 3,
            "action": "granulate",
            "params": {
                "structureType": "quiz",
                "granularityLevel": 3,
                "validationEnabled": true,
                "basedOn": "{{stage_1.output.structure}}"
            },
            "deliverable_action": "pass",
            "output_mapping": "structure -> quiz_structure"
        },
        {
            "worker": "bitware-content-generator",
            "step": 4,
            "action": "generate",
            "params": {
                "granulatorJobId": "{{stage_3.jobId}}",
                "topic": "{{input.topic}}",
                "structureType": "quiz",
                "structure": "{{stage_3.output.structure}}",
                "wordCountEstimates": "{{stage_3.output.wordCountEstimates}}",
                "courseContext": "{{stage_2.output.content}}"
            },
            "deliverable_action": "store_and_pass",
            "output_mapping": "content -> quiz_content"
        },
        {
            "worker": "bitware-content-granulator",
            "step": 5,
            "action": "granulate",
            "params": {
                "structureType": "workflow",
                "granularityLevel": 3,
                "validationEnabled": true,
                "processName": "Learning {{input.topic}}"
            },
            "deliverable_action": "pass",
            "output_mapping": "structure -> workflow_structure"
        },
        {
            "worker": "bitware-content-generator",
            "step": 6,
            "action": "generate",
            "params": {
                "granulatorJobId": "{{stage_5.jobId}}",
                "topic": "Learning Process for {{input.topic}}",
                "structureType": "workflow",
                "structure": "{{stage_5.output.structure}}",
                "wordCountEstimates": "{{stage_5.output.wordCountEstimates}}"
            },
            "deliverable_action": "store",
            "output_mapping": "content -> workflow_content"
        }
    ]',
    '["Complete learning package", "Multi-format content", "Comprehensive training materials", "Enterprise content suite"]',
    '["complete", "multi-format", "comprehensive", "package", "suite", "enterprise", "all-in-one"]',
    300000, 0.45, 0.30, 0.75,
    1, 1, 'manual_seed', datetime('now'), datetime('now')
),

-- Research + Structure + Generate Pipeline (Full content creation)
(
    'research_structure_generate',
    'Research, Structure & Generate Pipeline',
    'Complete content pipeline: research topic, create structure, generate content',
    'Comprehensive',
    'Advanced',
    '[
        {
            "worker": "topic_researcher",
            "step": 1,
            "action": "research",
            "params": {
                "depth": "comprehensive",
                "include_examples": true,
                "include_statistics": true
            },
            "deliverable_action": "pass",
            "output_mapping": "research_results -> topic_insights"
        },
        {
            "worker": "bitware-content-granulator",
            "step": 2,
            "action": "granulate",
            "params": {
                "structureType": "{{input.contentType}}",
                "granularityLevel": 4,
                "validationEnabled": true,
                "enrichWithResearch": "{{stage_1.output.research_results}}"
            },
            "deliverable_action": "pass",
            "output_mapping": "structure -> content_structure"
        },
        {
            "worker": "bitware-content-generator",
            "step": 3,
            "action": "generate",
            "params": {
                "granulatorJobId": "{{stage_2.jobId}}",
                "topic": "{{input.topic}}",
                "structureType": "{{input.contentType}}",
                "structure": "{{stage_2.output.structure}}",
                "wordCountEstimates": "{{stage_2.output.wordCountEstimates}}",
                "contentMetadata": "{{stage_2.output.contentMetadata}}",
                "researchContext": "{{stage_1.output.research_results}}"
            },
            "deliverable_action": "store",
            "output_mapping": "content -> final_content"
        }
    ]',
    '["Research-based content creation", "Data-driven content", "Comprehensive content development", "Expert content generation"]',
    '["research", "comprehensive", "data-driven", "expert", "complete", "structured"]',
    180000, 0.30, 0.20, 0.50,
    1, 1, 'manual_seed', datetime('now'), datetime('now')
);