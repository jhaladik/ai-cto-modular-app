-- Add missing columns to granulation_jobs table
-- SQLite doesn't support IF NOT EXISTS for columns, so we'll try each one separately

-- Add actualElements column
ALTER TABLE granulation_jobs ADD COLUMN actualElements INTEGER;

-- Add qualityScore column  
ALTER TABLE granulation_jobs ADD COLUMN qualityScore REAL;