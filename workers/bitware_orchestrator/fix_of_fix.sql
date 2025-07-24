-- Safe column addition fix for orchestrator
-- File: workers/bitware_orchestrator/safe_fix.sql

-- Check current table structure first
PRAGMA table_info(pipeline_executions);

-- Add only the missing columns (avoiding duplicates)
-- Note: SQLite doesn't have IF NOT EXISTS for ALTER TABLE, so we'll be selective

-- Try adding strategy column (might fail if exists)
ALTER TABLE pipeline_executions ADD COLUMN strategy TEXT DEFAULT 'balanced';

-- Update existing records to have proper values
UPDATE pipeline_executions SET template_name = 'unknown' WHERE template_name IS NULL;
UPDATE pipeline_executions SET strategy = 'balanced' WHERE strategy IS NULL;
UPDATE pipeline_executions SET request_data = '{}' WHERE request_data IS NULL;