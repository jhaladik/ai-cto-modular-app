-- Migration to add missing tables for Content Granulator

-- Job structures table to store the generated structures
CREATE TABLE IF NOT EXISTS job_structures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL UNIQUE,
  structure_data TEXT NOT NULL, -- JSON of the complete structure
  storage_ref TEXT, -- Reference to KV or R2 storage if data is large
  element_count INTEGER,
  depth_levels INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES granulation_jobs(id)
);

-- API usage tracking for cost management
CREATE TABLE IF NOT EXISTS api_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER,
  api_provider TEXT NOT NULL, -- 'openai', etc.
  model_name TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cached_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER,
  cost_usd REAL,
  request_type TEXT, -- 'granulation', 'validation', etc.
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES granulation_jobs(id)
);

-- Add indexes for the new tables
CREATE INDEX IF NOT EXISTS idx_job_structures_job ON job_structures(job_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_job ON api_usage(job_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_date ON api_usage(created_at);