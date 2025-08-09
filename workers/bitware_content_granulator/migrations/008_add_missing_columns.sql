-- Add missing columns for UAOL system

-- Add error column if it doesn't exist
ALTER TABLE content_generation_stages ADD COLUMN error TEXT;

-- Add updated_at column if it doesn't exist  
ALTER TABLE content_generation_stages ADD COLUMN updated_at DATETIME;

-- Add validation_report column for mentor system
ALTER TABLE content_generation_stages ADD COLUMN validation_report TEXT;

-- Add processing_time_ms column
ALTER TABLE content_generation_stages ADD COLUMN processing_time_ms INTEGER;