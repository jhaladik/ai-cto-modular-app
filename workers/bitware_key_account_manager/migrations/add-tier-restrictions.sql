-- Add tier restrictions to pipeline templates
-- This migration adds a column to specify which subscription tiers can access each template

-- Add the new column with default value (all tiers)
ALTER TABLE pipeline_template_cache 
ADD COLUMN allowed_tiers TEXT DEFAULT '["basic","standard","premium","enterprise"]';

-- Update existing templates with appropriate tier restrictions
-- Basic tier gets only simple templates
UPDATE pipeline_template_cache 
SET allowed_tiers = '["basic","standard","premium","enterprise"]'
WHERE complexity_level = 'basic' OR template_name LIKE '%basic%';

-- Standard tier and above get intermediate templates
UPDATE pipeline_template_cache 
SET allowed_tiers = '["standard","premium","enterprise"]'
WHERE complexity_level = 'intermediate' AND allowed_tiers = '["basic","standard","premium","enterprise"]';

-- Premium tier and above get advanced templates
UPDATE pipeline_template_cache 
SET allowed_tiers = '["premium","enterprise"]'
WHERE (complexity_level = 'advanced' OR requires_premium = TRUE) 
AND allowed_tiers != '["basic","standard","premium","enterprise"]';

-- Enterprise only templates (highest complexity or cost)
UPDATE pipeline_template_cache 
SET allowed_tiers = '["enterprise"]'
WHERE (estimated_cost_usd > 0.50 OR template_name LIKE '%enterprise%' OR template_name LIKE '%comprehensive%')
AND complexity_level = 'advanced';

-- Show the results
SELECT template_name, display_name, complexity_level, allowed_tiers 
FROM pipeline_template_cache 
ORDER BY complexity_level, template_name;