-- Orchestrator 2.0 Core Schema
-- Main tables for pipeline management and orchestration

-- Pipeline templates (synced from KAM)
CREATE TABLE IF NOT EXISTS pipeline_templates (
  template_name TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  subscription_tier TEXT CHECK(subscription_tier IN ('basic', 'standard', 'premium', 'enterprise')),
  stages_config TEXT NOT NULL, -- JSON array of stages
  parameters_config TEXT NOT NULL, -- JSON array of parameters
  estimated_cost_usd REAL,
  estimated_time_ms INTEGER,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pipeline executions
CREATE TABLE IF NOT EXISTS pipeline_executions (
  execution_id TEXT PRIMARY KEY,
  request_id TEXT,
  client_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  parameters TEXT, -- JSON parameters
  status TEXT CHECK(status IN ('pending', 'running', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
  priority TEXT CHECK(priority IN ('low', 'normal', 'high', 'critical')) DEFAULT 'normal',
  started_at DATETIME,
  completed_at DATETIME,
  total_cost_usd REAL,
  total_time_ms INTEGER,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  checkpoint_data TEXT, -- JSON checkpoint data for recovery
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_name) REFERENCES pipeline_templates(template_name)
);

-- Stage executions
CREATE TABLE IF NOT EXISTS stage_executions (
  stage_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  worker_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  status TEXT CHECK(status IN ('pending', 'running', 'completed', 'failed', 'skipped')) DEFAULT 'pending',
  input_reference TEXT, -- KV/R2 reference to input data
  output_reference TEXT, -- KV/R2 reference to output data
  summary_data TEXT, -- JSON summary for handshake
  cost_usd REAL,
  time_ms INTEGER,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_id) REFERENCES pipeline_executions(execution_id)
);

-- Execution queue for prioritization
CREATE TABLE IF NOT EXISTS execution_queue (
  queue_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  priority INTEGER NOT NULL, -- Numeric priority for sorting (higher = more important)
  estimated_start_time DATETIME,
  dependencies TEXT, -- JSON array of execution IDs this depends on
  status TEXT CHECK(status IN ('queued', 'ready', 'blocked', 'processing')) DEFAULT 'queued',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_id) REFERENCES pipeline_executions(execution_id)
);

-- Data references for handshake protocol
CREATE TABLE IF NOT EXISTS data_references (
  ref_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  stage_id TEXT,
  storage_type TEXT CHECK(storage_type IN ('KV', 'R2', 'D1', 'inline')) NOT NULL,
  storage_key TEXT,
  inline_data TEXT, -- For small inline data
  size_bytes INTEGER NOT NULL,
  content_type TEXT,
  checksum TEXT NOT NULL,
  compression TEXT CHECK(compression IN ('none', 'gzip', 'brotli')) DEFAULT 'none',
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_id) REFERENCES pipeline_executions(execution_id),
  FOREIGN KEY (stage_id) REFERENCES stage_executions(stage_id)
);

-- Handshake packets for inter-worker communication
CREATE TABLE IF NOT EXISTS handshake_packets (
  packet_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  from_worker TEXT NOT NULL,
  to_worker TEXT NOT NULL,
  packet_data TEXT NOT NULL, -- JSON handshake packet
  status TEXT CHECK(status IN ('sent', 'acknowledged', 'processed', 'failed')) DEFAULT 'sent',
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at DATETIME,
  processed_at DATETIME,
  FOREIGN KEY (execution_id) REFERENCES pipeline_executions(execution_id),
  FOREIGN KEY (stage_id) REFERENCES stage_executions(stage_id)
);

-- Checkpoints for failure recovery
CREATE TABLE IF NOT EXISTS execution_checkpoints (
  checkpoint_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  checkpoint_data TEXT NOT NULL, -- JSON state data
  data_references TEXT, -- JSON array of data reference IDs
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_id) REFERENCES pipeline_executions(execution_id)
);

-- Pipeline metrics for optimization
CREATE TABLE IF NOT EXISTS pipeline_metrics (
  metric_id TEXT PRIMARY KEY,
  template_name TEXT NOT NULL,
  execution_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  avg_cost_usd REAL,
  avg_time_ms INTEGER,
  min_time_ms INTEGER,
  max_time_ms INTEGER,
  p95_time_ms INTEGER,
  last_execution_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_name) REFERENCES pipeline_templates(template_name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_executions_client ON pipeline_executions(client_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON pipeline_executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_priority ON pipeline_executions(priority);
CREATE INDEX IF NOT EXISTS idx_executions_created ON pipeline_executions(created_at);
CREATE INDEX IF NOT EXISTS idx_stages_execution ON stage_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_stages_status ON stage_executions(status);
CREATE INDEX IF NOT EXISTS idx_queue_priority ON execution_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_queue_status ON execution_queue(status);
CREATE INDEX IF NOT EXISTS idx_data_refs_execution ON data_references(execution_id);
CREATE INDEX IF NOT EXISTS idx_handshake_execution ON handshake_packets(execution_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_execution ON execution_checkpoints(execution_id);