-- Add validation score column to stages table if it doesn't exist
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we need to handle this carefully
-- This will fail silently if the column already exists
ALTER TABLE content_generation_stages ADD COLUMN validation_score INTEGER DEFAULT NULL;