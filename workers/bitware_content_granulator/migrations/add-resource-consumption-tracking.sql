-- Migration: Add resource consumption tracking
-- Tracks detailed resource usage for cost analysis and optimization

-- Add columns to granulation_jobs for resource tracking
ALTER TABLE granulation_jobs 
ADD COLUMN IF NOT EXISTS tokens_prompt INTEGER DEFAULT 0;

ALTER TABLE granulation_jobs 
ADD COLUMN IF NOT EXISTS tokens_completion INTEGER DEFAULT 0;

ALTER TABLE granulation_jobs 
ADD COLUMN IF NOT EXISTS tokens_total INTEGER DEFAULT 0;

ALTER TABLE granulation_jobs 
ADD COLUMN IF NOT EXISTS ai_provider TEXT;

ALTER TABLE granulation_jobs 
ADD COLUMN IF NOT EXISTS ai_model TEXT;

ALTER TABLE granulation_jobs 
ADD COLUMN IF NOT EXISTS cost_breakdown JSON;

-- Create resource consumption tracking table
CREATE TABLE IF NOT EXISTS resource_consumption (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- AI Resource Usage
  ai_provider TEXT NOT NULL,
  ai_model TEXT NOT NULL,
  tokens_prompt INTEGER NOT NULL,
  tokens_completion INTEGER NOT NULL,
  tokens_total INTEGER NOT NULL,
  
  -- Cost Tracking
  cost_prompt REAL NOT NULL,
  cost_completion REAL NOT NULL,
  cost_total REAL NOT NULL,
  cost_per_1k_tokens REAL,
  
  -- Performance Metrics
  processing_time_ms INTEGER NOT NULL,
  tokens_per_second REAL,
  
  -- Resource Efficiency
  efficiency_rating TEXT CHECK (efficiency_rating IN ('high', 'medium', 'low')),
  
  -- Additional Metadata
  request_type TEXT, -- 'granulation', 'validation', 'retry'
  client_id TEXT,
  execution_id TEXT,
  
  FOREIGN KEY (job_id) REFERENCES granulation_jobs(id)
);

-- Create daily aggregation view for cost reporting
CREATE VIEW IF NOT EXISTS daily_resource_usage AS
SELECT 
  DATE(timestamp) as date,
  ai_provider,
  ai_model,
  COUNT(*) as request_count,
  SUM(tokens_total) as total_tokens,
  SUM(cost_total) as total_cost,
  AVG(cost_per_1k_tokens) as avg_cost_per_1k,
  AVG(processing_time_ms) as avg_processing_time,
  AVG(tokens_per_second) as avg_throughput
FROM resource_consumption
GROUP BY DATE(timestamp), ai_provider, ai_model;

-- Create provider comparison view
CREATE VIEW IF NOT EXISTS provider_comparison AS
SELECT 
  ai_provider,
  COUNT(*) as total_requests,
  SUM(tokens_total) as total_tokens,
  SUM(cost_total) as total_cost,
  AVG(cost_per_1k_tokens) as avg_cost_per_1k,
  AVG(processing_time_ms) as avg_processing_time,
  AVG(tokens_per_second) as avg_throughput,
  SUM(CASE WHEN efficiency_rating = 'high' THEN 1 ELSE 0 END) as high_efficiency_count,
  SUM(CASE WHEN efficiency_rating = 'medium' THEN 1 ELSE 0 END) as medium_efficiency_count,
  SUM(CASE WHEN efficiency_rating = 'low' THEN 1 ELSE 0 END) as low_efficiency_count
FROM resource_consumption
GROUP BY ai_provider;

-- Create model performance view
CREATE VIEW IF NOT EXISTS model_performance AS
SELECT 
  ai_model,
  ai_provider,
  COUNT(*) as usage_count,
  AVG(tokens_total) as avg_tokens,
  AVG(cost_total) as avg_cost,
  MIN(cost_total) as min_cost,
  MAX(cost_total) as max_cost,
  AVG(processing_time_ms) as avg_time_ms,
  AVG(tokens_per_second) as avg_throughput
FROM resource_consumption
GROUP BY ai_model, ai_provider
ORDER BY usage_count DESC;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_resource_consumption_timestamp 
ON resource_consumption(timestamp);

CREATE INDEX IF NOT EXISTS idx_resource_consumption_provider 
ON resource_consumption(ai_provider, ai_model);

CREATE INDEX IF NOT EXISTS idx_resource_consumption_job 
ON resource_consumption(job_id);