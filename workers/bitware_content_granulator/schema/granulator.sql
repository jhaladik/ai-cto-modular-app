-- Content Granulator Database Schema

-- Granulation templates and patterns
CREATE TABLE IF NOT EXISTS granulation_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_name TEXT UNIQUE NOT NULL,
  structure_type TEXT NOT NULL CHECK (structure_type IN ('course', 'quiz', 'novel', 'workflow', 'knowledge_map', 'learning_path')),
  template_schema TEXT NOT NULL, -- JSON structure definition
  complexity_level INTEGER CHECK (complexity_level BETWEEN 1 AND 5),
  target_audience TEXT,
  ai_prompt_template TEXT NOT NULL,
  validation_rules TEXT, -- JSON validation criteria
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  usage_count INTEGER DEFAULT 0
);

-- Granulation jobs and results
CREATE TABLE IF NOT EXISTS granulation_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  structure_type TEXT NOT NULL,
  template_id INTEGER,
  granularity_level INTEGER CHECK (granularity_level BETWEEN 1 AND 5),
  target_elements INTEGER, -- Expected number of granulated pieces
  actual_elements INTEGER,
  quality_score REAL CHECK (quality_score >= 0 AND quality_score <= 1),
  processing_time_ms INTEGER,
  cost_usd REAL,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'validating', 'retry')),
  validation_enabled BOOLEAN DEFAULT 0,
  validation_level INTEGER DEFAULT 1 CHECK (validation_level BETWEEN 1 AND 3),
  validation_threshold REAL DEFAULT 85.0,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  client_id TEXT,
  execution_id TEXT,
  FOREIGN KEY (template_id) REFERENCES granulation_templates(id)
);

-- Granulated structure elements
CREATE TABLE IF NOT EXISTS structure_elements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  element_type TEXT NOT NULL, -- 'module', 'chapter', 'question', 'step'
  parent_id INTEGER,
  sequence_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content_outline TEXT,
  metadata TEXT, -- JSON with type-specific data
  ai_reasoning TEXT,
  validation_status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES granulation_jobs(id),
  FOREIGN KEY (parent_id) REFERENCES structure_elements(id)
);

-- Validation results for quality assurance
CREATE TABLE IF NOT EXISTS validation_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  validation_level INTEGER NOT NULL CHECK (validation_level BETWEEN 1 AND 3),
  accuracy_percentage REAL NOT NULL CHECK (accuracy_percentage >= 0 AND accuracy_percentage <= 100),
  questions_asked TEXT NOT NULL, -- JSON array of questions
  scores TEXT NOT NULL, -- JSON array of scores
  passed BOOLEAN NOT NULL,
  retry_count INTEGER DEFAULT 0,
  validation_time_ms INTEGER,
  ai_feedback TEXT, -- Detailed AI explanation
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES granulation_jobs(id)
);

-- Template performance analytics
CREATE TABLE IF NOT EXISTS template_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  usage_date DATE NOT NULL,
  success_rate REAL,
  avg_quality_score REAL,
  avg_processing_time INTEGER,
  avg_validation_accuracy REAL,
  validation_failure_rate REAL,
  user_satisfaction REAL,
  optimization_suggestions TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES granulation_templates(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_status ON granulation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_client ON granulation_jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_execution ON granulation_jobs(execution_id);
CREATE INDEX IF NOT EXISTS idx_elements_job ON structure_elements(job_id);
CREATE INDEX IF NOT EXISTS idx_elements_parent ON structure_elements(parent_id);
CREATE INDEX IF NOT EXISTS idx_validation_job ON validation_results(job_id);
CREATE INDEX IF NOT EXISTS idx_analytics_template ON template_analytics(template_id);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON template_analytics(usage_date);