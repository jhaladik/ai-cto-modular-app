-- Resource Manager Database Schema
-- Central resource management and execution coordination

-- Resource pools and limits
CREATE TABLE IF NOT EXISTS resource_pools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK(type IN ('api', 'infrastructure', 'business')),
  provider TEXT,
  capacity INTEGER NOT NULL,
  refill_rate REAL NOT NULL,
  current_tokens REAL NOT NULL DEFAULT 0,
  cost_per_unit REAL DEFAULT 0,
  last_refill TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dedicated pools for enterprise clients
CREATE TABLE IF NOT EXISTS dedicated_pools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  resource_type TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  refill_rate REAL NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_id, resource_type)
);

-- Resource allocations tracking
CREATE TABLE IF NOT EXISTS resource_allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL,
  client_id INTEGER NOT NULL,
  resource_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  pool_type TEXT CHECK(pool_type IN ('shared', 'reserved', 'dedicated')),
  allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  released_at TIMESTAMP,
  status TEXT CHECK(status IN ('allocated', 'consumed', 'released', 'failed')) DEFAULT 'allocated',
  cost_usd REAL DEFAULT 0
);

-- Execution queue
CREATE TABLE IF NOT EXISTS resource_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL UNIQUE,
  client_id INTEGER NOT NULL,
  template_name TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 50,
  queue_name TEXT NOT NULL CHECK(queue_name IN ('immediate', 'fast', 'normal', 'batch', 'deferred')),
  resource_requirements TEXT NOT NULL, -- JSON
  estimated_cost REAL,
  estimated_wait_ms INTEGER,
  estimated_duration_ms INTEGER,
  status TEXT CHECK(status IN ('queued', 'scheduled', 'executing', 'completed', 'failed', 'cancelled')) DEFAULT 'queued',
  queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  scheduled_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3
);

-- Client quotas and fairness tracking
CREATE TABLE IF NOT EXISTS client_quotas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  date DATE NOT NULL,
  tier TEXT NOT NULL CHECK(tier IN ('basic', 'standard', 'premium', 'enterprise')),
  requests_today INTEGER DEFAULT 0,
  tokens_used_today INTEGER DEFAULT 0,
  cost_today REAL DEFAULT 0,
  requests_month INTEGER DEFAULT 0,
  tokens_used_month INTEGER DEFAULT 0,
  cost_month REAL DEFAULT 0,
  priority_modifier INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_id, date)
);

-- Resource usage history
CREATE TABLE IF NOT EXISTS resource_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resource_type TEXT NOT NULL,
  client_id INTEGER,
  request_id TEXT,
  amount_requested INTEGER,
  amount_consumed INTEGER,
  wait_time_ms INTEGER,
  success BOOLEAN DEFAULT 1,
  error_reason TEXT
);

-- Cost tracking
CREATE TABLE IF NOT EXISTS cost_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL,
  client_id INTEGER NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  provider TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  amount_used INTEGER,
  unit_cost REAL,
  total_cost REAL,
  currency TEXT DEFAULT 'USD'
);

-- Execution history
CREATE TABLE IF NOT EXISTS execution_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL UNIQUE,
  client_id INTEGER NOT NULL,
  template_name TEXT NOT NULL,
  input_data TEXT, -- JSON
  output_data TEXT, -- JSON
  status TEXT CHECK(status IN ('success', 'failure', 'partial', 'timeout', 'cancelled')),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER,
  total_cost REAL DEFAULT 0,
  error_message TEXT,
  worker_responses TEXT, -- JSON array of worker responses
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Worker registry
CREATE TABLE IF NOT EXISTS worker_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  version TEXT,
  status TEXT CHECK(status IN ('active', 'inactive', 'maintenance', 'deprecated')) DEFAULT 'active',
  capabilities TEXT, -- JSON array
  resource_requirements TEXT, -- JSON
  endpoints TEXT, -- JSON
  timeout_ms INTEGER DEFAULT 30000,
  retry_policy TEXT, -- JSON
  last_health_check TIMESTAMP,
  health_status TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resource optimization cache
CREATE TABLE IF NOT EXISTS optimization_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cache_key TEXT NOT NULL UNIQUE,
  optimization_type TEXT,
  original_request TEXT, -- JSON
  optimized_request TEXT, -- JSON
  savings_estimate REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

-- Alerts and monitoring
CREATE TABLE IF NOT EXISTS resource_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_type TEXT NOT NULL,
  severity TEXT CHECK(severity IN ('info', 'warning', 'error', 'critical')),
  resource_type TEXT,
  client_id INTEGER,
  message TEXT NOT NULL,
  details TEXT, -- JSON
  acknowledged BOOLEAN DEFAULT 0,
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value REAL NOT NULL,
  labels TEXT, -- JSON
  aggregation_period TEXT DEFAULT '1m'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_allocations_request ON resource_allocations(request_id);
CREATE INDEX IF NOT EXISTS idx_allocations_client ON resource_allocations(client_id, allocated_at);
CREATE INDEX IF NOT EXISTS idx_allocations_status ON resource_allocations(status);

CREATE INDEX IF NOT EXISTS idx_queue_status_priority ON resource_queue(status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_queue_client ON resource_queue(client_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_scheduled ON resource_queue(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_quotas_client_date ON client_quotas(client_id, date);

CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON resource_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_client ON resource_usage(client_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_cost_client ON cost_tracking(client_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_cost_request ON cost_tracking(request_id);

CREATE INDEX IF NOT EXISTS idx_execution_client ON execution_history(client_id, created_at);
CREATE INDEX IF NOT EXISTS idx_execution_status ON execution_history(status);

CREATE INDEX IF NOT EXISTS idx_alerts_severity ON resource_alerts(severity, acknowledged);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON resource_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_metrics_type ON performance_metrics(metric_type, timestamp);

-- Insert default resource pools
INSERT OR IGNORE INTO resource_pools (name, type, provider, capacity, refill_rate, cost_per_unit) VALUES
  ('openai-gpt4', 'api', 'openai', 10000, 166, 0.03),
  ('openai-gpt35', 'api', 'openai', 90000, 1500, 0.0015),
  ('email', 'api', 'sendgrid', 1000, 16, 0.0001),
  ('sms', 'api', 'twilio', 500, 8, 0.0075),
  ('database', 'infrastructure', 'cloudflare-d1', 50000, 833, 0),
  ('storage-kv', 'infrastructure', 'cloudflare-kv', 100000, 1666, 0.0000005),
  ('storage-r2', 'infrastructure', 'cloudflare-r2', 10000, 166, 0.000015);

-- Insert default workers
INSERT OR IGNORE INTO worker_registry (name, version, capabilities, resource_requirements) VALUES
  ('topic_researcher', '1.0', '["research", "openai"]', '{"openai-gpt4": 1000}'),
  ('content_granulator', '2.0', '["structure", "validation", "openai"]', '{"openai-gpt4": 2000}'),
  ('rss_source_finder', '1.0', '["web-scraping", "discovery"]', '{"database": 100}'),
  ('feed_fetcher', '1.0', '["rss", "extraction"]', '{"database": 500}'),
  ('content_classifier', '1.0', '["classification", "openai"]', '{"openai-gpt35": 5000}'),
  ('report_builder', '1.0', '["reporting", "compilation"]', '{"storage-kv": 100}'),
  ('universal_researcher', '2.0', '["research", "multi-provider"]', '{"openai-gpt4": 3000}');