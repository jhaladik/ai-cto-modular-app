-- Orchestrator 2.0 Execution Management Schema
-- Tables for tracking execution history, deliverables, and analytics

-- Execution history for analysis
CREATE TABLE IF NOT EXISTS execution_history (
  history_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  parameters_hash TEXT, -- Hash for grouping similar executions
  status TEXT NOT NULL,
  total_stages INTEGER,
  completed_stages INTEGER,
  failed_stages INTEGER,
  skipped_stages INTEGER,
  total_cost_usd REAL,
  total_time_ms INTEGER,
  items_processed INTEGER,
  quality_score REAL,
  created_at DATETIME,
  completed_at DATETIME,
  archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_id) REFERENCES pipeline_executions(execution_id)
);

-- Deliverables produced by pipelines
CREATE TABLE IF NOT EXISTS deliverables (
  deliverable_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  request_id TEXT,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK(type IN ('report', 'data', 'file', 'visualization', 'api_response')) NOT NULL,
  format TEXT, -- pdf, json, csv, html, etc.
  storage_type TEXT CHECK(storage_type IN ('KV', 'R2', 'D1', 'external')) NOT NULL,
  storage_reference TEXT NOT NULL,
  size_bytes INTEGER,
  mime_type TEXT,
  preview_available BOOLEAN DEFAULT 0,
  preview_reference TEXT,
  metadata TEXT, -- JSON additional metadata
  access_count INTEGER DEFAULT 0,
  last_accessed_at DATETIME,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_id) REFERENCES pipeline_executions(execution_id)
);

-- Execution events for detailed tracking
CREATE TABLE IF NOT EXISTS execution_events (
  event_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  stage_id TEXT,
  event_type TEXT NOT NULL, -- started, completed, failed, retried, checkpoint, etc.
  event_data TEXT, -- JSON event details
  severity TEXT CHECK(severity IN ('info', 'warning', 'error', 'critical')) DEFAULT 'info',
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_id) REFERENCES pipeline_executions(execution_id),
  FOREIGN KEY (stage_id) REFERENCES stage_executions(stage_id)
);

-- Execution dependencies
CREATE TABLE IF NOT EXISTS execution_dependencies (
  dependency_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  depends_on_execution_id TEXT NOT NULL,
  dependency_type TEXT CHECK(dependency_type IN ('data', 'sequence', 'resource')) NOT NULL,
  required BOOLEAN DEFAULT 1,
  satisfied BOOLEAN DEFAULT 0,
  satisfied_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_id) REFERENCES pipeline_executions(execution_id)
);

-- Stage metrics for optimization
CREATE TABLE IF NOT EXISTS stage_metrics (
  worker_name TEXT NOT NULL,
  action TEXT NOT NULL,
  date DATE NOT NULL,
  execution_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  avg_time_ms INTEGER,
  min_time_ms INTEGER,
  max_time_ms INTEGER,
  p95_time_ms INTEGER,
  avg_input_size_bytes INTEGER,
  avg_output_size_bytes INTEGER,
  avg_cost_usd REAL,
  error_patterns TEXT, -- JSON common error patterns
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (worker_name, action, date)
);

-- Execution cost breakdown
CREATE TABLE IF NOT EXISTS cost_breakdown (
  breakdown_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  stage_id TEXT,
  cost_category TEXT NOT NULL, -- api, storage, compute, network
  cost_item TEXT NOT NULL, -- specific item (e.g., openai_gpt4, r2_storage)
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  unit_cost_usd REAL NOT NULL,
  total_cost_usd REAL NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_id) REFERENCES pipeline_executions(execution_id),
  FOREIGN KEY (stage_id) REFERENCES stage_executions(stage_id)
);

-- Quality metrics for executions
CREATE TABLE IF NOT EXISTS quality_metrics (
  metric_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  stage_id TEXT,
  metric_name TEXT NOT NULL,
  metric_value REAL NOT NULL,
  metric_unit TEXT,
  threshold_value REAL,
  passed_threshold BOOLEAN,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_id) REFERENCES pipeline_executions(execution_id),
  FOREIGN KEY (stage_id) REFERENCES stage_executions(stage_id)
);

-- Retry attempts tracking
CREATE TABLE IF NOT EXISTS retry_attempts (
  retry_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  error_code TEXT,
  error_message TEXT,
  retry_delay_ms INTEGER,
  succeeded BOOLEAN DEFAULT 0,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_id) REFERENCES pipeline_executions(execution_id),
  FOREIGN KEY (stage_id) REFERENCES stage_executions(stage_id)
);

-- Client execution statistics
CREATE TABLE IF NOT EXISTS client_execution_stats (
  client_id TEXT NOT NULL,
  date DATE NOT NULL,
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  total_cost_usd REAL DEFAULT 0,
  total_time_ms INTEGER DEFAULT 0,
  avg_cost_usd REAL,
  avg_time_ms INTEGER,
  most_used_template TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (client_id, date)
);

-- Template execution patterns
CREATE TABLE IF NOT EXISTS execution_patterns (
  pattern_id TEXT PRIMARY KEY,
  template_name TEXT NOT NULL,
  parameter_pattern TEXT, -- JSON pattern of common parameters
  frequency INTEGER DEFAULT 1,
  avg_success_rate REAL,
  avg_cost_usd REAL,
  avg_time_ms INTEGER,
  optimal_resource_config TEXT, -- JSON optimal resource allocation
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_name) REFERENCES pipeline_templates(template_name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_history_client ON execution_history(client_id);
CREATE INDEX IF NOT EXISTS idx_history_template ON execution_history(template_name);
CREATE INDEX IF NOT EXISTS idx_deliverables_execution ON deliverables(execution_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_client ON deliverables(client_id);
CREATE INDEX IF NOT EXISTS idx_events_execution ON execution_events(execution_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON execution_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_dependencies_execution ON execution_dependencies(execution_id);
CREATE INDEX IF NOT EXISTS idx_stage_metrics_date ON stage_metrics(date);
CREATE INDEX IF NOT EXISTS idx_cost_execution ON cost_breakdown(execution_id);
CREATE INDEX IF NOT EXISTS idx_quality_execution ON quality_metrics(execution_id);
CREATE INDEX IF NOT EXISTS idx_retry_execution ON retry_attempts(execution_id);
CREATE INDEX IF NOT EXISTS idx_client_stats_date ON client_execution_stats(date);
CREATE INDEX IF NOT EXISTS idx_patterns_template ON execution_patterns(template_name);