-- ============================================
-- Resource Manager Complete Database Schema
-- Version: 2.0
-- Description: Comprehensive schema for resource management, 
--              queue orchestration, and cost optimization
-- ============================================

-- Drop existing tables to ensure clean setup
DROP TABLE IF EXISTS performance_metrics;
DROP TABLE IF EXISTS resource_alerts;
DROP TABLE IF EXISTS optimization_history;
DROP TABLE IF EXISTS optimization_cache;
DROP TABLE IF EXISTS worker_registry;
DROP TABLE IF EXISTS execution_history;
DROP TABLE IF EXISTS cost_tracking;
DROP TABLE IF EXISTS resource_usage;
DROP TABLE IF EXISTS client_fairness;
DROP TABLE IF EXISTS client_budgets;
DROP TABLE IF EXISTS client_quotas;
DROP TABLE IF EXISTS resource_queue;
DROP TABLE IF EXISTS resource_allocations;
DROP TABLE IF EXISTS dedicated_pools;
DROP TABLE IF EXISTS resource_pools;
DROP TABLE IF EXISTS tier_configurations;
DROP TABLE IF EXISTS template_resource_requirements;

-- ============================================
-- Core Resource Management Tables
-- ============================================

-- Client tier configurations
CREATE TABLE tier_configurations (
    tier_name TEXT PRIMARY KEY CHECK(tier_name IN ('basic', 'standard', 'premium', 'enterprise')),
    priority_base INTEGER NOT NULL,
    max_concurrent_requests INTEGER NOT NULL,
    monthly_budget_usd REAL NOT NULL,
    rate_limit_multiplier REAL DEFAULT 1.0,
    cost_discount_percentage REAL DEFAULT 0,
    features TEXT, -- JSON array of enabled features
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resource pools (Token Bucket implementation)
CREATE TABLE resource_pools (
    pool_id TEXT PRIMARY KEY,
    pool_name TEXT NOT NULL,
    resource_type TEXT NOT NULL CHECK(resource_type IN ('api', 'infrastructure', 'service', 'storage')),
    provider TEXT,
    
    -- Token bucket configuration
    max_capacity INTEGER NOT NULL,
    current_tokens REAL NOT NULL DEFAULT 0,
    refill_rate REAL NOT NULL, -- tokens per second
    last_refill_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Cost configuration
    cost_per_unit REAL DEFAULT 0,
    cost_unit TEXT DEFAULT 'request', -- 'request', 'token', 'byte', 'query'
    
    -- Pool settings
    pool_type TEXT DEFAULT 'shared' CHECK(pool_type IN ('shared', 'reserved', 'dedicated')),
    is_active BOOLEAN DEFAULT 1,
    metadata TEXT, -- JSON for additional configuration
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dedicated resource pools for enterprise clients
CREATE TABLE dedicated_pools (
    pool_id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    resource_pool_id TEXT NOT NULL,
    
    -- Custom limits for this client
    max_capacity INTEGER NOT NULL,
    current_tokens REAL NOT NULL DEFAULT 0,
    refill_rate REAL NOT NULL,
    last_refill_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Validity
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_pool_id) REFERENCES resource_pools(pool_id),
    UNIQUE(client_id, resource_pool_id)
);

-- ============================================
-- Queue Management Tables
-- ============================================

-- Main execution queue with multi-level priorities
CREATE TABLE resource_queue (
    queue_id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL UNIQUE,
    client_id TEXT NOT NULL,
    
    -- Request details
    template_name TEXT NOT NULL,
    input_data TEXT, -- JSON
    worker_flow TEXT, -- JSON array of worker stages
    parameters TEXT, -- JSON
    
    -- Queue management
    queue_name TEXT NOT NULL CHECK(queue_name IN ('immediate', 'fast', 'normal', 'batch', 'deferred')),
    base_priority INTEGER NOT NULL DEFAULT 50,
    calculated_priority REAL NOT NULL DEFAULT 50,
    
    -- Timing
    queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estimated_start_time TIMESTAMP,
    estimated_duration_ms INTEGER,
    max_wait_time_ms INTEGER,
    
    -- Status tracking
    status TEXT DEFAULT 'queued' CHECK(status IN ('queued', 'scheduled', 'executing', 'completed', 'failed', 'cancelled')),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Resource requirements
    estimated_cost_usd REAL,
    resource_requirements TEXT, -- JSON
    
    -- Execution context
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resource allocations for active executions
CREATE TABLE resource_allocations (
    allocation_id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    
    -- Resource details
    resource_pool_id TEXT NOT NULL,
    pool_type TEXT CHECK(pool_type IN ('shared', 'reserved', 'dedicated')),
    amount REAL NOT NULL,
    
    -- Timing
    allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    released_at TIMESTAMP,
    
    -- Status
    status TEXT DEFAULT 'allocated' CHECK(status IN ('allocated', 'consumed', 'released', 'expired')),
    actual_usage REAL,
    cost_usd REAL DEFAULT 0,
    
    FOREIGN KEY (resource_pool_id) REFERENCES resource_pools(pool_id),
    FOREIGN KEY (request_id) REFERENCES resource_queue(request_id)
);

-- ============================================
-- Client Management Tables
-- ============================================

-- Client quotas and limits
CREATE TABLE client_quotas (
    client_id TEXT NOT NULL,
    date DATE NOT NULL,
    
    -- Daily quotas
    requests_today INTEGER DEFAULT 0,
    requests_limit_today INTEGER,
    
    -- Monthly quotas  
    requests_month INTEGER DEFAULT 0,
    requests_limit_month INTEGER,
    
    -- Cost tracking
    cost_today_usd REAL DEFAULT 0,
    cost_month_usd REAL DEFAULT 0,
    budget_month_usd REAL,
    
    -- Resource-specific quotas
    api_calls_today INTEGER DEFAULT 0,
    storage_bytes_used INTEGER DEFAULT 0,
    compute_ms_used INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (client_id, date)
);

-- Client budgets and billing
CREATE TABLE client_budgets (
    client_id TEXT PRIMARY KEY,
    tier TEXT NOT NULL CHECK(tier IN ('basic', 'standard', 'premium', 'enterprise')),
    
    -- Budget configuration
    monthly_budget_usd REAL NOT NULL,
    budget_alert_threshold REAL DEFAULT 0.8, -- Alert at 80% by default
    hard_limit_enabled BOOLEAN DEFAULT 1,
    
    -- Current usage
    current_month_usage_usd REAL DEFAULT 0,
    current_month_requests INTEGER DEFAULT 0,
    last_reset_date DATE,
    
    -- Optimization settings
    auto_optimize_enabled BOOLEAN DEFAULT 1,
    optimization_aggressiveness TEXT DEFAULT 'moderate' CHECK(optimization_aggressiveness IN ('conservative', 'moderate', 'aggressive')),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client fairness tracking for queue prioritization
CREATE TABLE client_fairness (
    client_id TEXT PRIMARY KEY,
    
    -- Usage tracking for fairness
    requests_last_hour INTEGER DEFAULT 0,
    requests_last_day INTEGER DEFAULT 0,
    avg_priority_last_hour REAL DEFAULT 50,
    
    -- Fairness score (0-10, higher is better)
    fairness_score REAL DEFAULT 5,
    last_high_priority_request TIMESTAMP,
    consecutive_high_priority INTEGER DEFAULT 0,
    
    -- Starvation prevention
    longest_wait_time_ms INTEGER DEFAULT 0,
    starved_requests INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Execution and Cost Tracking Tables
-- ============================================

-- Detailed execution history
CREATE TABLE execution_history (
    execution_id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    
    -- Execution details
    template_name TEXT NOT NULL,
    worker_flow TEXT, -- JSON array of executed stages
    input_data TEXT, -- JSON
    output_data TEXT, -- JSON
    
    -- Timing
    queued_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    total_duration_ms INTEGER,
    queue_wait_time_ms INTEGER,
    
    -- Status
    status TEXT CHECK(status IN ('success', 'partial', 'failed', 'timeout', 'cancelled')),
    error_details TEXT, -- JSON
    
    -- Resource usage
    total_cost_usd REAL,
    resource_usage TEXT, -- JSON detailed breakdown
    optimization_savings_usd REAL DEFAULT 0,
    
    -- Performance metrics
    stages_completed INTEGER,
    stages_total INTEGER,
    retry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES resource_queue(request_id)
);

-- Cost tracking with detailed breakdown
CREATE TABLE cost_tracking (
    cost_id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    
    -- Cost breakdown
    resource_type TEXT NOT NULL,
    resource_pool_id TEXT,
    usage_amount REAL NOT NULL,
    unit_cost REAL NOT NULL,
    total_cost REAL NOT NULL,
    
    -- Optimization
    original_cost REAL,
    optimization_method TEXT, -- 'model_downgrade', 'batching', 'caching', etc.
    savings_amount REAL DEFAULT 0,
    
    -- Billing
    billed BOOLEAN DEFAULT 0,
    billing_period TEXT, -- YYYY-MM
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES resource_queue(request_id),
    FOREIGN KEY (resource_pool_id) REFERENCES resource_pools(pool_id)
);

-- Resource usage analytics
CREATE TABLE resource_usage (
    usage_id TEXT PRIMARY KEY,
    resource_pool_id TEXT NOT NULL,
    
    -- Time window
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    period_type TEXT CHECK(period_type IN ('minute', 'hour', 'day', 'month')),
    
    -- Usage metrics
    total_requests INTEGER DEFAULT 0,
    total_tokens_consumed REAL DEFAULT 0,
    total_cost_usd REAL DEFAULT 0,
    
    -- Utilization
    avg_utilization_percentage REAL,
    peak_utilization_percentage REAL,
    
    -- Client breakdown
    unique_clients INTEGER DEFAULT 0,
    top_clients TEXT, -- JSON array
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_pool_id) REFERENCES resource_pools(pool_id)
);

-- ============================================
-- Optimization and Caching Tables
-- ============================================

-- Optimization cache for reusable results
CREATE TABLE optimization_cache (
    cache_key TEXT PRIMARY KEY,
    
    -- Cache details
    template_name TEXT NOT NULL,
    input_hash TEXT NOT NULL,
    output_data TEXT, -- JSON
    
    -- Validity
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    hit_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Cost savings
    original_cost_usd REAL,
    total_savings_usd REAL DEFAULT 0,
    
    -- Metadata
    confidence_score REAL DEFAULT 1.0,
    is_stale BOOLEAN DEFAULT 0
);

-- Optimization history and analytics
CREATE TABLE optimization_history (
    optimization_id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    
    -- Optimization details
    optimization_type TEXT NOT NULL, -- 'model_downgrade', 'batching', 'caching', 'compression', 'scheduling'
    original_config TEXT, -- JSON
    optimized_config TEXT, -- JSON
    
    -- Results
    original_cost_usd REAL,
    optimized_cost_usd REAL,
    savings_usd REAL,
    performance_impact TEXT, -- JSON metrics
    
    -- Decision factors
    decision_factors TEXT, -- JSON
    confidence_score REAL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES resource_queue(request_id)
);

-- ============================================
-- Worker and System Management Tables
-- ============================================

-- Worker registry for available workers
CREATE TABLE worker_registry (
    worker_name TEXT PRIMARY KEY,
    worker_type TEXT NOT NULL,
    
    -- Capabilities
    capabilities TEXT, -- JSON array
    supported_actions TEXT, -- JSON array
    max_concurrent_requests INTEGER DEFAULT 10,
    
    -- Performance
    avg_response_time_ms INTEGER,
    success_rate REAL DEFAULT 1.0,
    last_health_check TIMESTAMP,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'degraded', 'maintenance', 'offline')),
    status_message TEXT,
    
    -- Resource requirements
    typical_resource_usage TEXT, -- JSON
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Template resource requirements
CREATE TABLE template_resource_requirements (
    template_name TEXT PRIMARY KEY,
    
    -- Resource estimates
    estimated_api_tokens INTEGER DEFAULT 0,
    estimated_compute_ms INTEGER DEFAULT 0,
    estimated_storage_bytes INTEGER DEFAULT 0,
    estimated_total_cost_usd REAL DEFAULT 0,
    
    -- Typical configuration
    typical_worker_flow TEXT, -- JSON
    typical_duration_ms INTEGER,
    
    -- Requirements by tier
    requirements_by_tier TEXT, -- JSON object with tier-specific configs
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System alerts and monitoring
CREATE TABLE resource_alerts (
    alert_id TEXT PRIMARY KEY,
    
    -- Alert details
    alert_type TEXT NOT NULL, -- 'resource_low', 'budget_exceeded', 'queue_backup', 'worker_failure', etc.
    severity TEXT NOT NULL CHECK(severity IN ('info', 'warning', 'error', 'critical')),
    
    -- Context
    resource_pool_id TEXT,
    client_id TEXT,
    worker_name TEXT,
    
    -- Message
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    details TEXT, -- JSON
    
    -- Resolution
    acknowledged BOOLEAN DEFAULT 0,
    acknowledged_by TEXT,
    acknowledged_at TIMESTAMP,
    resolved BOOLEAN DEFAULT 0,
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance metrics for monitoring
CREATE TABLE performance_metrics (
    metric_id TEXT PRIMARY KEY,
    
    -- Time window
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    period_minutes INTEGER DEFAULT 1,
    
    -- Queue metrics
    queue_depth_immediate INTEGER DEFAULT 0,
    queue_depth_fast INTEGER DEFAULT 0,
    queue_depth_normal INTEGER DEFAULT 0,
    queue_depth_batch INTEGER DEFAULT 0,
    queue_depth_deferred INTEGER DEFAULT 0,
    
    -- Execution metrics
    requests_completed INTEGER DEFAULT 0,
    requests_failed INTEGER DEFAULT 0,
    avg_queue_wait_ms INTEGER,
    avg_execution_time_ms INTEGER,
    
    -- Resource metrics
    resource_utilization TEXT, -- JSON with pool utilization percentages
    
    -- Cost metrics
    total_cost_usd REAL DEFAULT 0,
    optimization_savings_usd REAL DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- Queue indexes
CREATE INDEX idx_queue_status ON resource_queue(status);
CREATE INDEX idx_queue_priority ON resource_queue(queue_name, calculated_priority DESC);
CREATE INDEX idx_queue_client ON resource_queue(client_id, status);
CREATE INDEX idx_queue_created ON resource_queue(queued_at);

-- Allocation indexes
CREATE INDEX idx_allocation_request ON resource_allocations(request_id);
CREATE INDEX idx_allocation_client ON resource_allocations(client_id);
CREATE INDEX idx_allocation_status ON resource_allocations(status);
CREATE INDEX idx_allocation_pool ON resource_allocations(resource_pool_id);

-- Execution history indexes
CREATE INDEX idx_execution_request ON execution_history(request_id);
CREATE INDEX idx_execution_client ON execution_history(client_id);
CREATE INDEX idx_execution_status ON execution_history(status);
CREATE INDEX idx_execution_created ON execution_history(created_at DESC);

-- Cost tracking indexes
CREATE INDEX idx_cost_request ON cost_tracking(request_id);
CREATE INDEX idx_cost_client ON cost_tracking(client_id);
CREATE INDEX idx_cost_period ON cost_tracking(billing_period);
CREATE INDEX idx_cost_billed ON cost_tracking(billed);

-- Client quota indexes
CREATE INDEX idx_quota_client_date ON client_quotas(client_id, date DESC);

-- Alert indexes
CREATE INDEX idx_alert_severity ON resource_alerts(severity, acknowledged);
CREATE INDEX idx_alert_type ON resource_alerts(alert_type);
CREATE INDEX idx_alert_created ON resource_alerts(created_at DESC);

-- Cache indexes
CREATE INDEX idx_cache_template ON optimization_cache(template_name);
CREATE INDEX idx_cache_expires ON optimization_cache(expires_at);
CREATE INDEX idx_cache_hash ON optimization_cache(input_hash);

-- Performance metric indexes
CREATE INDEX idx_metrics_timestamp ON performance_metrics(timestamp DESC);

-- ============================================
-- Triggers for Updated Timestamps
-- ============================================

-- Update timestamp triggers
CREATE TRIGGER update_resource_pools_timestamp 
AFTER UPDATE ON resource_pools
BEGIN
    UPDATE resource_pools SET updated_at = CURRENT_TIMESTAMP WHERE pool_id = NEW.pool_id;
END;

CREATE TRIGGER update_resource_queue_timestamp 
AFTER UPDATE ON resource_queue
BEGIN
    UPDATE resource_queue SET updated_at = CURRENT_TIMESTAMP WHERE queue_id = NEW.queue_id;
END;

CREATE TRIGGER update_client_quotas_timestamp 
AFTER UPDATE ON client_quotas
BEGIN
    UPDATE client_quotas SET updated_at = CURRENT_TIMESTAMP 
    WHERE client_id = NEW.client_id AND date = NEW.date;
END;

CREATE TRIGGER update_client_budgets_timestamp 
AFTER UPDATE ON client_budgets
BEGIN
    UPDATE client_budgets SET updated_at = CURRENT_TIMESTAMP WHERE client_id = NEW.client_id;
END;

CREATE TRIGGER update_worker_registry_timestamp 
AFTER UPDATE ON worker_registry
BEGIN
    UPDATE worker_registry SET updated_at = CURRENT_TIMESTAMP WHERE worker_name = NEW.worker_name;
END;

-- ============================================
-- Initial Seed Data
-- ============================================

-- Insert tier configurations
INSERT INTO tier_configurations (tier_name, priority_base, max_concurrent_requests, monthly_budget_usd, rate_limit_multiplier, cost_discount_percentage) VALUES
('basic', 10, 5, 100, 1.0, 0),
('standard', 20, 20, 500, 1.5, 5),
('premium', 30, 50, 1000, 2.0, 10),
('enterprise', 40, 100, 5000, 3.0, 20);

-- Insert default resource pools based on specification
INSERT INTO resource_pools (pool_id, pool_name, resource_type, provider, max_capacity, current_tokens, refill_rate, cost_per_unit, cost_unit) VALUES
-- API Resources
('openai-gpt4', 'OpenAI GPT-4', 'api', 'OpenAI', 10000, 10000, 166, 0.00003, 'token'),
('openai-gpt35', 'OpenAI GPT-3.5', 'api', 'OpenAI', 90000, 90000, 1500, 0.0000015, 'token'),
('anthropic-claude', 'Anthropic Claude', 'api', 'Anthropic', 20000, 20000, 333, 0.00002, 'token'),

-- Service Resources
('email-sendgrid', 'SendGrid Email', 'service', 'SendGrid', 1000, 1000, 16, 0.0001, 'request'),
('sms-twilio', 'Twilio SMS', 'service', 'Twilio', 500, 500, 8, 0.0075, 'request'),

-- Infrastructure Resources
('database-d1', 'Cloudflare D1', 'infrastructure', 'Cloudflare', 50000, 50000, 833, 0, 'query'),
('storage-kv', 'Cloudflare KV', 'storage', 'Cloudflare', 100000, 100000, 1666, 0.0000005, 'request'),
('storage-r2', 'Cloudflare R2', 'storage', 'Cloudflare', 1000000, 1000000, 10000, 0.0000001, 'byte');

-- Insert worker registry entries
INSERT INTO worker_registry (worker_name, worker_type, capabilities, supported_actions, status) VALUES
('bitware-content-granulator', 'processor', '["content_structuring", "ai_generation"]', '["granulate", "validate"]', 'active'),
('bitware-topic-researcher', 'processor', '["research", "analysis"]', '["research", "analyze"]', 'active'),
('bitware-rss-source-finder', 'collector', '["rss_discovery", "feed_validation"]', '["discover", "validate"]', 'active'),
('bitware-feed-fetcher', 'collector', '["feed_fetching", "content_extraction"]', '["fetch", "extract"]', 'active'),
('bitware-content-classifier', 'processor', '["classification", "categorization"]', '["classify", "categorize"]', 'active'),
('bitware-report-builder', 'generator', '["report_generation", "formatting"]', '["generate", "format"]', 'active'),
('bitware-universal-researcher', 'processor', '["research", "analysis", "generation"]', '["research", "process"]', 'active');

-- Insert template resource requirements
INSERT INTO template_resource_requirements (template_name, estimated_api_tokens, estimated_compute_ms, estimated_storage_bytes, estimated_total_cost_usd) VALUES
('content_granulation', 2000, 5000, 10240, 0.15),
('topic_research', 3000, 8000, 20480, 0.25),
('market_analysis', 5000, 12000, 51200, 0.45),
('competitor_intelligence', 4000, 10000, 40960, 0.35),
('content_monitoring', 1000, 3000, 5120, 0.08),
('sentiment_analysis', 1500, 4000, 8192, 0.12),
('news_aggregation', 500, 2000, 4096, 0.05),
('comprehensive_report', 8000, 20000, 102400, 0.75);

-- ============================================
-- End of Schema
-- ============================================