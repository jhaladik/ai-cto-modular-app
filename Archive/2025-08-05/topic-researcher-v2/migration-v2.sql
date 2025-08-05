-- Migration for Topic Researcher v2.0 (Orchestrator 2.0 Support)

-- Add protocol tracking to research sessions
ALTER TABLE research_sessions ADD COLUMN protocol_version TEXT DEFAULT '1.0';
ALTER TABLE research_sessions ADD COLUMN packet_id TEXT;
ALTER TABLE research_sessions ADD COLUMN execution_id TEXT;
ALTER TABLE research_sessions ADD COLUMN stage_id TEXT;

-- Create table for tracking handshake packets
CREATE TABLE IF NOT EXISTS handshake_packets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  packet_id TEXT UNIQUE NOT NULL,
  execution_id TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  input_ref TEXT,
  output_ref TEXT,
  processing_time_ms INTEGER,
  tokens_used INTEGER,
  api_calls_made INTEGER,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

-- Create table for progress tracking
CREATE TABLE IF NOT EXISTS progress_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  packet_id TEXT NOT NULL,
  progress INTEGER NOT NULL,
  message TEXT,
  stage TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create table for checkpoint storage
CREATE TABLE IF NOT EXISTS checkpoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  packet_id TEXT NOT NULL,
  execution_id TEXT NOT NULL,
  checkpoint_data TEXT NOT NULL,
  checkpoint_number INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_handshake_packet_id ON handshake_packets(packet_id);
CREATE INDEX IF NOT EXISTS idx_handshake_execution_id ON handshake_packets(execution_id);
CREATE INDEX IF NOT EXISTS idx_progress_packet_id ON progress_tracking(packet_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_packet_id ON checkpoints(packet_id);
CREATE INDEX IF NOT EXISTS idx_sessions_packet_id ON research_sessions(packet_id);

-- Create view for v2 performance metrics
CREATE VIEW IF NOT EXISTS v_protocol_v2_metrics AS
SELECT 
  date(created_at) as date,
  COUNT(*) as total_requests,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_requests,
  AVG(processing_time_ms) as avg_processing_time,
  SUM(tokens_used) as total_tokens,
  SUM(api_calls_made) as total_api_calls,
  AVG(CASE WHEN status = 'completed' THEN 1.0 ELSE 0.0 END) as success_rate
FROM handshake_packets
WHERE protocol_version = '2.0'
GROUP BY date(created_at);

-- Insert initial v2 worker stats
INSERT OR IGNORE INTO worker_stats (
  worker_name,
  protocol_version,
  capabilities,
  last_health_check
) VALUES (
  'bitware_topic_researcher',
  '2.0',
  '{"supports_handshake":true,"supports_references":true,"supports_checkpoints":true,"supports_progress":true}',
  CURRENT_TIMESTAMP
);