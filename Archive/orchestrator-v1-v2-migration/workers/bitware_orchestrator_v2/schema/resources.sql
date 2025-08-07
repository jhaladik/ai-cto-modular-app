-- Orchestrator 2.0 Resource Management Schema
-- Tables for tracking and managing system resources

-- Worker registry
CREATE TABLE IF NOT EXISTS worker_registry (
  worker_name TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  version TEXT,
  capabilities TEXT, -- JSON array of capabilities
  resource_requirements TEXT, -- JSON resource requirements
  max_concurrent_executions INTEGER DEFAULT 1,
  avg_execution_time_ms INTEGER,
  avg_cost_usd REAL,
  health_status TEXT CHECK(health_status IN ('healthy', 'degraded', 'unhealthy')) DEFAULT 'healthy',
  last_health_check DATETIME,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Resource pools configuration
CREATE TABLE IF NOT EXISTS resource_pools (
  resource_type TEXT NOT NULL,
  resource_name TEXT NOT NULL,
  provider TEXT,
  daily_limit INTEGER,
  monthly_limit INTEGER,
  rate_limit_per_minute INTEGER,
  cost_per_unit REAL,
  unit_type TEXT, -- tokens, calls, mb, etc.
  reset_schedule TEXT, -- cron expression or daily/monthly
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (resource_type, resource_name)
);

-- Resource usage tracking
CREATE TABLE IF NOT EXISTS resource_usage (
  usage_id TEXT PRIMARY KEY,
  resource_type TEXT NOT NULL,
  resource_name TEXT NOT NULL,
  execution_id TEXT,
  stage_id TEXT,
  quantity_used INTEGER NOT NULL,
  unit TEXT NOT NULL,
  cost_usd REAL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_id) REFERENCES pipeline_executions(execution_id),
  FOREIGN KEY (stage_id) REFERENCES stage_executions(stage_id)
);

-- Resource allocations (reservations)
CREATE TABLE IF NOT EXISTS resource_allocations (
  allocation_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_name TEXT NOT NULL,
  quantity_allocated INTEGER NOT NULL,
  allocated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  released_at DATETIME,
  status TEXT CHECK(status IN ('reserved', 'active', 'released', 'expired')) DEFAULT 'reserved',
  FOREIGN KEY (execution_id) REFERENCES pipeline_executions(execution_id)
);

-- Client resource quotas
CREATE TABLE IF NOT EXISTS client_quotas (
  client_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_name TEXT,
  quota_limit INTEGER NOT NULL,
  quota_period TEXT CHECK(quota_period IN ('daily', 'weekly', 'monthly')) NOT NULL,
  quota_used INTEGER DEFAULT 0,
  reset_date DATETIME,
  overage_allowed BOOLEAN DEFAULT 0,
  overage_rate_usd REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (client_id, resource_type, resource_name)
);

-- Resource availability snapshots
CREATE TABLE IF NOT EXISTS resource_availability (
  snapshot_id TEXT PRIMARY KEY,
  resource_type TEXT NOT NULL,
  resource_name TEXT NOT NULL,
  total_capacity INTEGER,
  used_capacity INTEGER,
  available_capacity INTEGER,
  utilization_percentage REAL,
  queue_length INTEGER DEFAULT 0,
  avg_wait_time_ms INTEGER,
  snapshot_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Worker performance metrics
CREATE TABLE IF NOT EXISTS worker_performance (
  worker_name TEXT NOT NULL,
  date DATE NOT NULL,
  execution_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  avg_execution_time_ms INTEGER,
  min_execution_time_ms INTEGER,
  max_execution_time_ms INTEGER,
  p95_execution_time_ms INTEGER,
  total_cost_usd REAL,
  error_rate REAL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (worker_name, date),
  FOREIGN KEY (worker_name) REFERENCES worker_registry(worker_name)
);

-- API usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
  usage_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL, -- openai, anthropic, etc.
  api_key_id TEXT,
  execution_id TEXT,
  endpoint TEXT,
  tokens_used INTEGER,
  cost_usd REAL,
  response_time_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_id) REFERENCES pipeline_executions(execution_id)
);

-- Storage usage tracking
CREATE TABLE IF NOT EXISTS storage_usage (
  usage_id TEXT PRIMARY KEY,
  storage_type TEXT CHECK(storage_type IN ('KV', 'R2', 'D1')) NOT NULL,
  execution_id TEXT,
  operation TEXT CHECK(operation IN ('read', 'write', 'delete', 'list')) NOT NULL,
  size_bytes INTEGER,
  cost_usd REAL,
  latency_ms INTEGER,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_id) REFERENCES pipeline_executions(execution_id)
);

-- Resource predictions based on historical data
CREATE TABLE IF NOT EXISTS resource_predictions (
  prediction_id TEXT PRIMARY KEY,
  template_name TEXT NOT NULL,
  parameter_hash TEXT, -- Hash of parameters for grouping similar requests
  predicted_cost_usd REAL,
  predicted_time_ms INTEGER,
  predicted_api_tokens INTEGER,
  predicted_storage_mb INTEGER,
  confidence_level REAL,
  sample_size INTEGER,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_name) REFERENCES pipeline_templates(template_name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_resource_usage_execution ON resource_usage(execution_id);
CREATE INDEX IF NOT EXISTS idx_resource_usage_timestamp ON resource_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_allocations_execution ON resource_allocations(execution_id);
CREATE INDEX IF NOT EXISTS idx_allocations_status ON resource_allocations(status);
CREATE INDEX IF NOT EXISTS idx_quotas_client ON client_quotas(client_id);
CREATE INDEX IF NOT EXISTS idx_availability_resource ON resource_availability(resource_type, resource_name);
CREATE INDEX IF NOT EXISTS idx_worker_perf_date ON worker_performance(date);
CREATE INDEX IF NOT EXISTS idx_api_usage_execution ON api_usage(execution_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_storage_usage_execution ON storage_usage(execution_id);
CREATE INDEX IF NOT EXISTS idx_predictions_template ON resource_predictions(template_name);