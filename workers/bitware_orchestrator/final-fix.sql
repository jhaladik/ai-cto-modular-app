-- Final database fix for orchestrator
-- File: workers/bitware_orchestrator/final_fix.sql

-- Add missing columns to pipeline_executions table
ALTER TABLE pipeline_executions ADD COLUMN request_data TEXT DEFAULT '{}';

-- Update any existing records to have request_data
UPDATE pipeline_executions SET request_data = '{}' WHERE request_data IS NULL;