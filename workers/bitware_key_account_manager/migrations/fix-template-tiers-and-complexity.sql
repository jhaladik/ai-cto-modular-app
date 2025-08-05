-- Fix template complexity levels and tier configuration
-- Standardize complexity_level to lowercase: basic, standard, advanced, enterprise
-- Fix allowed_tiers to properly restrict access based on subscription tiers

-- First, standardize all complexity_level to lowercase
UPDATE pipeline_template_cache 
SET complexity_level = LOWER(complexity_level);

-- Fix allowed_tiers based on template requirements and complexity

-- Basic templates - available to all tiers
UPDATE pipeline_template_cache
SET allowed_tiers = '["basic","standard","premium","enterprise"]',
    requires_premium = 0
WHERE template_name IN (
    'content_generation_basic',
    'quick_answer',
    'topic_research_basic',
    'content_granulation_quiz'
);

-- Standard templates - available to standard and above
UPDATE pipeline_template_cache
SET allowed_tiers = '["standard","premium","enterprise"]',
    requires_premium = 0,
    complexity_level = 'standard'
WHERE template_name IN (
    'content_analysis_pipeline',
    'customer_sentiment_analysis',
    'document_summarizer',
    'sustainability_report',
    'news_monitoring',
    'content_granulation_course',
    'content_granulation_workflow'
);

-- Premium templates - available to premium and enterprise only
UPDATE pipeline_template_cache
SET allowed_tiers = '["premium","enterprise"]',
    requires_premium = 1,
    complexity_level = 'advanced'
WHERE template_name IN (
    'market_research_pipeline',
    'data_analysis_advanced',
    'technical_documentation',
    'content_granulation_novel',
    'content_granulation_knowledge_map',
    'content_granulation_learning_path'
);

-- Enterprise templates - enterprise only
UPDATE pipeline_template_cache
SET allowed_tiers = '["enterprise"]',
    requires_premium = 1,
    complexity_level = 'enterprise'
WHERE template_name IN (
    'competitive_intelligence',
    'comprehensive_analysis',
    'trend_analysis'
);

-- Special case: Educational Content Pipeline (multi-stage, advanced but available to all for demo)
UPDATE pipeline_template_cache
SET allowed_tiers = '["standard","premium","enterprise"]',
    requires_premium = 0,
    complexity_level = 'advanced'
WHERE template_name = 'educational_content_pipeline';

-- Ensure all complexity levels are consistent
UPDATE pipeline_template_cache
SET complexity_level = 'standard'
WHERE complexity_level = 'intermediate';

-- Add missing columns if they don't exist (for older deployments)
-- Note: SQLite doesn't support ADD COLUMN IF NOT EXISTS, so this might fail if column exists
-- That's OK - the important updates above will still work

-- Final verification: Set default allowed_tiers for any templates that might have NULL
UPDATE pipeline_template_cache
SET allowed_tiers = '["basic","standard","premium","enterprise"]'
WHERE allowed_tiers IS NULL OR allowed_tiers = '';

-- Update estimated costs based on complexity
UPDATE pipeline_template_cache
SET estimated_cost_usd = CASE
    WHEN complexity_level = 'basic' THEN 0.05
    WHEN complexity_level = 'standard' THEN 0.12
    WHEN complexity_level = 'advanced' THEN 0.25
    WHEN complexity_level = 'enterprise' THEN 0.50
    ELSE estimated_cost_usd
END
WHERE estimated_cost_usd IS NULL OR estimated_cost_usd = 0;

-- Update min/max costs based on complexity
UPDATE pipeline_template_cache
SET 
    min_cost_usd = CASE
        WHEN complexity_level = 'basic' THEN 0.02
        WHEN complexity_level = 'standard' THEN 0.08
        WHEN complexity_level = 'advanced' THEN 0.15
        WHEN complexity_level = 'enterprise' THEN 0.30
        ELSE min_cost_usd
    END,
    max_cost_usd = CASE
        WHEN complexity_level = 'basic' THEN 0.10
        WHEN complexity_level = 'standard' THEN 0.20
        WHEN complexity_level = 'advanced' THEN 0.40
        WHEN complexity_level = 'enterprise' THEN 1.00
        ELSE max_cost_usd
    END
WHERE min_cost_usd IS NULL OR min_cost_usd = 0;