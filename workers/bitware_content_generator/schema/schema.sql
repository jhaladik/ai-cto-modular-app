-- Content Generator Database Schema

-- Generation jobs table
CREATE TABLE IF NOT EXISTS generation_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  granulator_job_id INTEGER NOT NULL,
  topic TEXT NOT NULL,
  structure_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  
  -- Progress tracking
  total_sections INTEGER,
  sections_completed INTEGER DEFAULT 0,
  current_section TEXT,
  progress_percentage REAL DEFAULT 0,
  
  -- Resource usage
  total_words INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0,
  
  -- Timing
  started_at TEXT,
  completed_at TEXT,
  estimated_completion TEXT,
  processing_time_ms INTEGER,
  
  -- Storage
  content_storage_type TEXT CHECK (content_storage_type IN ('inline', 'kv', 'r2')),
  content_location TEXT,
  content_size INTEGER,
  
  -- Quality metrics
  quality_score REAL,
  readability_score REAL,
  coherence_score REAL,
  completeness_score REAL,
  
  -- Metadata
  ai_provider TEXT,
  models_used TEXT, -- JSON array
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  client_id TEXT,
  execution_id TEXT,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Content sections table
CREATE TABLE IF NOT EXISTS content_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  section_id TEXT NOT NULL,
  section_type TEXT NOT NULL, -- 'overview', 'module', 'lesson', 'exercise', 'assessment', etc.
  parent_section_id TEXT,
  sequence_number INTEGER,
  
  -- Content
  title TEXT,
  content TEXT,
  word_count INTEGER,
  
  -- Generation details
  prompt_used TEXT,
  tokens_input INTEGER,
  tokens_output INTEGER,
  generation_time_ms INTEGER,
  model_used TEXT,
  temperature REAL,
  
  -- Quality
  quality_score REAL,
  readability_score REAL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES generation_jobs(id) ON DELETE CASCADE
);

-- Prompt templates table
CREATE TABLE IF NOT EXISTS prompt_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  content_type TEXT NOT NULL,
  structure_type TEXT,
  template TEXT NOT NULL,
  variables TEXT NOT NULL, -- JSON array of required variables
  
  -- Configuration
  recommended_model TEXT,
  temperature REAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2000,
  system_prompt TEXT,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  avg_quality_score REAL,
  avg_generation_time_ms INTEGER,
  success_rate REAL,
  
  -- Metadata
  is_active BOOLEAN DEFAULT 1,
  version INTEGER DEFAULT 1,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Generation analytics table
CREATE TABLE IF NOT EXISTS generation_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  
  -- Volume metrics
  total_jobs INTEGER DEFAULT 0,
  successful_jobs INTEGER DEFAULT 0,
  failed_jobs INTEGER DEFAULT 0,
  cancelled_jobs INTEGER DEFAULT 0,
  
  -- Content metrics
  total_words_generated INTEGER DEFAULT 0,
  total_sections_generated INTEGER DEFAULT 0,
  avg_words_per_job REAL,
  avg_sections_per_job REAL,
  
  -- Resource metrics
  total_tokens_used INTEGER DEFAULT 0,
  total_cost_usd REAL DEFAULT 0,
  avg_cost_per_1k_words REAL,
  avg_tokens_per_1k_words REAL,
  
  -- Performance metrics
  avg_generation_time_ms INTEGER,
  avg_words_per_minute REAL,
  avg_quality_score REAL,
  avg_readability_score REAL,
  
  -- Provider breakdown
  provider_stats TEXT, -- JSON with per-provider statistics
  model_stats TEXT, -- JSON with per-model statistics
  
  -- Structure type breakdown
  structure_type_stats TEXT, -- JSON with per-type statistics
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date)
);

-- AI provider usage table
CREATE TABLE IF NOT EXISTS ai_provider_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  
  -- Usage metrics
  tokens_input INTEGER,
  tokens_output INTEGER,
  total_tokens INTEGER,
  cost_usd REAL,
  
  -- Performance
  latency_ms INTEGER,
  success BOOLEAN DEFAULT 1,
  error_message TEXT,
  
  -- Request details
  request_type TEXT, -- 'generation', 'validation', 'retry'
  section_id TEXT,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES generation_jobs(id) ON DELETE CASCADE
);

-- Generation batches table (for tracking batch processing)
CREATE TABLE IF NOT EXISTS generation_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  batch_number INTEGER,
  
  -- Batch details
  section_ids TEXT, -- JSON array of section IDs
  total_sections INTEGER,
  completed_sections INTEGER DEFAULT 0,
  
  -- Resource usage
  tokens_used INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  
  -- Timing
  started_at TEXT,
  completed_at TEXT,
  processing_time_ms INTEGER,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES generation_jobs(id) ON DELETE CASCADE
);

-- Content validation results table
CREATE TABLE IF NOT EXISTS validation_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  section_id TEXT,
  
  -- Validation scores
  overall_score REAL,
  relevance_score REAL,
  completeness_score REAL,
  coherence_score REAL,
  readability_score REAL,
  engagement_score REAL,
  
  -- Issues and suggestions
  issues TEXT, -- JSON array
  suggestions TEXT, -- JSON array
  
  -- Validation details
  validator_model TEXT,
  validation_prompt TEXT,
  validation_time_ms INTEGER,
  passed BOOLEAN DEFAULT 0,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES generation_jobs(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_granulator ON generation_jobs(granulator_job_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_created ON generation_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_content_sections_job ON content_sections(job_id);
CREATE INDEX IF NOT EXISTS idx_content_sections_status ON content_sections(status);
CREATE INDEX IF NOT EXISTS idx_content_sections_priority ON content_sections(priority);
CREATE INDEX IF NOT EXISTS idx_ai_provider_usage_job ON ai_provider_usage(job_id);
CREATE INDEX IF NOT EXISTS idx_generation_batches_job ON generation_batches(job_id);
CREATE INDEX IF NOT EXISTS idx_generation_batches_status ON generation_batches(status);
CREATE INDEX IF NOT EXISTS idx_validation_results_job ON validation_results(job_id);
CREATE INDEX IF NOT EXISTS idx_generation_analytics_date ON generation_analytics(date);

-- Triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_generation_jobs_timestamp 
AFTER UPDATE ON generation_jobs
BEGIN
  UPDATE generation_jobs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_content_sections_timestamp 
AFTER UPDATE ON content_sections
BEGIN
  UPDATE content_sections SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_prompt_templates_timestamp 
AFTER UPDATE ON prompt_templates
BEGIN
  UPDATE prompt_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;