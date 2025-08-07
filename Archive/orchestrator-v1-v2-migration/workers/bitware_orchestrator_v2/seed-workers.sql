-- Seed worker registry with initial workers
INSERT INTO worker_registry (
  worker_name, display_name, version, capabilities, 
  resource_requirements, max_concurrent_executions, 
  avg_execution_time_ms, avg_cost_usd, health_status, is_active
) VALUES (
  'bitware-content-granulator',
  'Content Granulator',
  '1.0.0',
  '["granulate", "structure", "validate"]',
  '{"cpu": 1, "memory": 128, "api_calls": 10}',
  10,
  5000,
  0.001,
  'healthy',
  1
);

INSERT INTO worker_registry (
  worker_name, display_name, version, capabilities, 
  resource_requirements, max_concurrent_executions, 
  avg_execution_time_ms, avg_cost_usd, health_status, is_active
) VALUES (
  'bitware-topic-researcher',
  'Topic Researcher',
  '1.0.0',
  '["research", "analyze", "summarize"]',
  '{"cpu": 2, "memory": 256, "api_calls": 50}',
  5,
  30000,
  0.01,
  'healthy',
  1
);