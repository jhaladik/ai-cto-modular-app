-- Resource Manager Schema
-- This schema defines the tables needed for the Resource Manager to operate

-- Resource Queue table for tracking requests in queue
CREATE TABLE IF NOT EXISTS resource_queue (
  request_id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  queue_name TEXT DEFAULT 'normal',
  resource_requirements TEXT, -- JSON
  estimated_wait_ms INTEGER,
  status TEXT DEFAULT 'queued',
  enqueued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  scheduled_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resource_queue_status ON resource_queue(status);
CREATE INDEX IF NOT EXISTS idx_resource_queue_priority ON resource_queue(priority);
CREATE INDEX IF NOT EXISTS idx_resource_queue_client ON resource_queue(client_id);

-- Performance Metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_type TEXT NOT NULL,
  metric_value REAL,
  metadata TEXT, -- JSON
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);

-- Cost Tracking table
CREATE TABLE IF NOT EXISTS cost_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  units_consumed REAL,
  unit_cost REAL,
  total_cost REAL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cost_tracking_request ON cost_tracking(request_id);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_client ON cost_tracking(client_id);

-- Resource Alerts table
CREATE TABLE IF NOT EXISTS resource_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'warning',
  resource_type TEXT,
  threshold_value REAL,
  current_value REAL,
  message TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_resource_alerts_resolved ON resource_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_resource_alerts_created ON resource_alerts(created_at);

-- Execution Results table (for tracking completed executions)
CREATE TABLE IF NOT EXISTS execution_results (
  request_id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  status TEXT NOT NULL,
  output TEXT, -- JSON
  usage_metrics TEXT, -- JSON
  total_cost REAL,
  execution_time_ms INTEGER,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_execution_results_client ON execution_results(client_id);
CREATE INDEX IF NOT EXISTS idx_execution_results_status ON execution_results(status);

-- Template Registry (local cache of templates from KAM)
CREATE TABLE IF NOT EXISTS template_registry (
  template_name TEXT PRIMARY KEY,
  worker_flow TEXT NOT NULL, -- JSON
  resource_estimates TEXT, -- JSON
  avg_execution_time_ms INTEGER,
  avg_cost_usd REAL,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Client Resource Limits
CREATE TABLE IF NOT EXISTS client_resource_limits (
  client_id TEXT PRIMARY KEY,
  daily_request_limit INTEGER DEFAULT 100,
  daily_cost_limit_usd REAL DEFAULT 100.0,
  concurrent_execution_limit INTEGER DEFAULT 5,
  priority_tier TEXT DEFAULT 'standard',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily Usage Tracking
CREATE TABLE IF NOT EXISTS daily_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  usage_date DATE NOT NULL,
  request_count INTEGER DEFAULT 0,
  total_cost_usd REAL DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  avg_execution_time_ms INTEGER,
  UNIQUE(client_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_usage_client_date ON daily_usage(client_id, usage_date);