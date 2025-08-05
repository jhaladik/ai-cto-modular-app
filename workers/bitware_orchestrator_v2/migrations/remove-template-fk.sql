-- Remove foreign key constraint from pipeline_executions
-- In our new architecture, templates are fetched from KAM, not stored locally

-- SQLite doesn't support ALTER TABLE DROP CONSTRAINT
-- So we need to recreate the table without the foreign key

-- Create new table without foreign key
CREATE TABLE IF NOT EXISTS pipeline_executions_new (
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
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy data from old table
INSERT INTO pipeline_executions_new SELECT * FROM pipeline_executions;

-- Drop old table
DROP TABLE pipeline_executions;

-- Rename new table
ALTER TABLE pipeline_executions_new RENAME TO pipeline_executions;

-- Recreate indexes
CREATE INDEX idx_pipeline_executions_status ON pipeline_executions(status);
CREATE INDEX idx_pipeline_executions_client ON pipeline_executions(client_id);
CREATE INDEX idx_pipeline_executions_created ON pipeline_executions(created_at);