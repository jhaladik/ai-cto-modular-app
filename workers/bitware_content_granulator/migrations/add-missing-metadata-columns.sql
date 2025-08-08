-- Migration to add missing metadata columns to structure_elements table
-- These columns are needed for proper content generation metadata storage

-- Add missing metadata columns to structure_elements
ALTER TABLE structure_elements ADD COLUMN target_word_count INTEGER;
ALTER TABLE structure_elements ADD COLUMN content_type TEXT;
ALTER TABLE structure_elements ADD COLUMN generation_priority INTEGER DEFAULT 1;
ALTER TABLE structure_elements ADD COLUMN content_tone TEXT;
ALTER TABLE structure_elements ADD COLUMN key_points TEXT;

-- Add missing columns to granulation_jobs for tracking
ALTER TABLE granulation_jobs ADD COLUMN estimated_total_words INTEGER;
ALTER TABLE granulation_jobs ADD COLUMN content_generation_metadata TEXT;
ALTER TABLE granulation_jobs ADD COLUMN deliverable_specs TEXT;

-- Add missing columns to granulation_templates for content specs
ALTER TABLE granulation_templates ADD COLUMN content_generation_specs TEXT;
ALTER TABLE granulation_templates ADD COLUMN word_count_targets TEXT;
ALTER TABLE granulation_templates ADD COLUMN content_tone_guidelines TEXT;
ALTER TABLE granulation_templates ADD COLUMN output_format_specs TEXT;
ALTER TABLE granulation_templates ADD COLUMN quality_metrics TEXT;

-- Add missing column to template_analytics
ALTER TABLE template_analytics ADD COLUMN usage_count INTEGER DEFAULT 0;