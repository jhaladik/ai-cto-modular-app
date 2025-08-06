-- Add course_creation template to KAM
INSERT INTO pipeline_template_cache (
  template_name,
  display_name,
  description,
  category,
  subscription_tier,
  pipeline_stages,
  max_execution_time_ms,
  estimated_cost_usd,
  success_rate,
  usage_frequency,
  created_at,
  last_synced
) VALUES (
  'course_creation',
  'AI-Powered Course Creation',
  'Create structured educational courses using AI content granulation',
  'education',
  'premium',
  '[{"stage_order": 1, "worker_name": "bitware-content-granulator", "template_ref": "course", "action": "granulate", "params_override": {"structure_type": "course", "granularity_level": 3}}]',
  60000,
  0.05,
  0.95,
  'high',
  datetime('now'),
  datetime('now')
);