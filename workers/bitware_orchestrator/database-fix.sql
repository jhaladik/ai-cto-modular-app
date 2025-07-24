-- Quick database fix for orchestrator
-- File: workers/bitware_orchestrator/database_fix.sql

-- Add missing template_name column to pipeline_executions
ALTER TABLE pipeline_executions ADD COLUMN template_name TEXT;

-- Update existing records to have template_name
UPDATE pipeline_executions SET template_name = 'unknown' WHERE template_name IS NULL;