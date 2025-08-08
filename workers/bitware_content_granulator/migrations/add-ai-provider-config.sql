-- Migration to add AI provider configuration to templates
-- This allows templates to specify preferred AI providers and models

-- Add AI configuration columns to granulation_templates
ALTER TABLE granulation_templates ADD COLUMN ai_provider_config TEXT;
-- JSON structure: {
--   "preferredProvider": "openai" | "claude" | "cloudflare",
--   "fallbackProviders": ["claude", "openai"],
--   "modelPreferences": {
--     "openai": "gpt-4o-mini",
--     "claude": "claude-3-haiku-20240307",
--     "cloudflare": "@cf/meta/llama-3-8b-instruct"
--   },
--   "temperature": 0.7,
--   "maxTokens": 4000,
--   "systemPrompt": "Custom system prompt for this template"
-- }

-- Add cost optimization settings
ALTER TABLE granulation_templates ADD COLUMN cost_optimization TEXT;
-- JSON structure: {
--   "maxCostPerJob": 0.05,
--   "preferLowCostProviders": true,
--   "fallbackOnCostExceed": true
-- }

-- Update existing templates with default AI configuration
UPDATE granulation_templates 
SET ai_provider_config = json_object(
    'preferredProvider', 'openai',
    'fallbackProviders', json_array('claude', 'cloudflare'),
    'modelPreferences', json_object(
        'openai', 'gpt-4o-mini',
        'claude', 'claude-3-haiku-20240307',
        'cloudflare', '@cf/meta/llama-3-8b-instruct'
    ),
    'temperature', 0.7,
    'maxTokens', 4000
)
WHERE ai_provider_config IS NULL;

-- Add specific configurations for different template types
UPDATE granulation_templates 
SET ai_provider_config = json_object(
    'preferredProvider', 'claude',
    'fallbackProviders', json_array('openai', 'cloudflare'),
    'modelPreferences', json_object(
        'openai', 'gpt-4o',
        'claude', 'claude-3-5-sonnet-20241022',
        'cloudflare', '@cf/mistral/mistral-7b-instruct-v0.1'
    ),
    'temperature', 0.8,
    'maxTokens', 6000,
    'systemPrompt', 'You are an expert creative writer specializing in narrative structures.'
)
WHERE structure_type = 'novel';

UPDATE granulation_templates 
SET ai_provider_config = json_object(
    'preferredProvider', 'openai',
    'fallbackProviders', json_array('claude', 'cloudflare'),
    'modelPreferences', json_object(
        'openai', 'gpt-4o-mini',
        'claude', 'claude-3-haiku-20240307',
        'cloudflare', '@cf/meta/llama-3-8b-instruct'
    ),
    'temperature', 0.3,
    'maxTokens', 3000,
    'systemPrompt', 'You are an expert quiz designer. Create precise, unambiguous questions.'
)
WHERE structure_type = 'quiz';

UPDATE granulation_templates 
SET ai_provider_config = json_object(
    'preferredProvider', 'cloudflare',
    'fallbackProviders', json_array('openai', 'claude'),
    'modelPreferences', json_object(
        'openai', 'gpt-3.5-turbo',
        'claude', 'claude-3-haiku-20240307',
        'cloudflare', '@cf/meta/llama-3-8b-instruct'
    ),
    'temperature', 0.5,
    'maxTokens', 2500,
    'systemPrompt', 'You are a business process expert. Create clear, actionable workflow structures.',
    'costOptimization', json_object(
        'maxCostPerJob', 0.01,
        'preferLowCostProviders', true
    )
)
WHERE structure_type = 'workflow';

-- Add AI provider usage tracking
CREATE TABLE IF NOT EXISTS ai_provider_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_used INTEGER,
  cost_usd REAL,
  response_time_ms INTEGER,
  success BOOLEAN DEFAULT 1,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES granulation_jobs(id)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_provider ON ai_provider_usage(provider);
CREATE INDEX IF NOT EXISTS idx_ai_usage_job ON ai_provider_usage(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_date ON ai_provider_usage(created_at);