-- Migration: Add reasoning column to discovered_sources table
-- Run this to update existing database

-- Add reasoning column if it doesn't exist
ALTER TABLE discovered_sources ADD COLUMN reasoning TEXT;

-- Verify the column was added
PRAGMA table_info(discovered_sources);