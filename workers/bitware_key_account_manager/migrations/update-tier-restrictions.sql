-- Update tier restrictions based on complexity and cost
-- Basic tier: Only basic complexity templates
UPDATE pipeline_template_cache 
SET allowed_tiers = '["basic","standard","premium","enterprise"]'
WHERE complexity_level IN ('basic', 'Basic');

-- Standard tier and above: intermediate complexity
UPDATE pipeline_template_cache 
SET allowed_tiers = '["standard","premium","enterprise"]'
WHERE complexity_level IN ('standard', 'Standard', 'intermediate', 'Intermediate');

-- Premium tier and above: premium/advanced complexity
UPDATE pipeline_template_cache 
SET allowed_tiers = '["premium","enterprise"]'
WHERE complexity_level IN ('premium', 'Premium', 'advanced', 'Advanced');

-- Enterprise only: enterprise complexity or high cost
UPDATE pipeline_template_cache 
SET allowed_tiers = '["enterprise"]'
WHERE complexity_level IN ('enterprise', 'Enterprise') 
   OR estimated_cost_usd > 0.50
   OR template_name LIKE '%comprehensive%'
   OR template_name LIKE '%enterprise%';

-- Special case: News monitoring is standard+
UPDATE pipeline_template_cache 
SET allowed_tiers = '["standard","premium","enterprise"]'
WHERE template_name = 'news_monitoring';

-- Show the results
SELECT template_name, display_name, complexity_level, estimated_cost_usd, allowed_tiers 
FROM pipeline_template_cache 
ORDER BY 
  CASE 
    WHEN allowed_tiers = '["enterprise"]' THEN 1
    WHEN allowed_tiers = '["premium","enterprise"]' THEN 2
    WHEN allowed_tiers = '["standard","premium","enterprise"]' THEN 3
    ELSE 4
  END,
  template_name;