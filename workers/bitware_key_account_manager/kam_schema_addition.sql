-- Optional schema additions for KAM worker
-- Add these tables to enable template storage and enhanced communication tracking

-- ==================== TEMPLATE MANAGEMENT ====================

-- Pipeline templates cache from orchestrator
CREATE TABLE IF NOT EXISTS pipeline_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_name TEXT UNIQUE NOT NULL,
    template_data TEXT NOT NULL, -- JSON with template configuration
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==================== ENHANCED COMMUNICATION TRACKING ====================

-- Optional: Add new allowed communication types if needed
-- Note: This would modify existing table, so only run if you want to extend communication types
-- ALTER TABLE client_communications ADD COLUMN api_request_type TEXT;

-- Alternative: Create an index for better performance on existing communications table
CREATE INDEX IF NOT EXISTS idx_client_communications_client_id 
ON client_communications(client_id);

CREATE INDEX IF NOT EXISTS idx_client_communications_processed_at 
ON client_communications(processed_at);

-- ==================== USAGE TRACKING (Optional) ====================

-- Track API usage for billing integration
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    processing_time_ms INTEGER,
    tokens_used INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0.0,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (client_id) REFERENCES clients(client_id)
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_client_timestamp 
ON api_usage_logs(client_id, timestamp);