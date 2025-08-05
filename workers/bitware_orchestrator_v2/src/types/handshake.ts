export interface HandshakePacket {
  packet_id: string;
  pipeline_id: string;
  execution_id: string;
  stage_id: string;
  stage_order: number;
  timestamp: string;
  
  control: ControlData;
  data_ref: DataReferenceInfo;
  summary: StageSummary;
  next: NextStageInstructions;
}

export interface ControlData {
  action: 'continue' | 'abort' | 'retry' | 'skip';
  priority: 'low' | 'normal' | 'high' | 'critical';
  checkpoint_enabled: boolean;
  timeout_ms: number;
  retry_count: number;
  max_retries: number;
}

export interface DataReferenceInfo {
  storage_type: 'KV' | 'R2' | 'D1' | 'inline';
  storage_key?: string;
  inline_data?: any;
  size_bytes: number;
  content_type: string;
  checksum: string;
  compression?: 'none' | 'gzip' | 'brotli';
  encryption?: 'none' | 'aes-256';
  expires_at: string;
}

export interface StageSummary {
  items_processed: number;
  items_total?: number;
  quality_score: number;
  confidence_level: number;
  processing_time_ms: number;
  resource_usage: {
    api_calls?: number;
    tokens_used?: number;
    storage_mb?: number;
  };
  errors: ErrorInfo[];
  warnings: string[];
  metrics: { [key: string]: any };
  continue_pipeline: boolean;
}

export interface ErrorInfo {
  code: string;
  message: string;
  severity: 'warning' | 'error' | 'critical';
  recoverable: boolean;
  timestamp: string;
}

export interface NextStageInstructions {
  worker_name: string;
  action: string;
  stage_order: number;
  params: any;
  required_resources: string[];
  estimated_time_ms: number;
  skip_conditions?: SkipCondition[];
}

export interface SkipCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'not_contains';
  value: any;
  action: 'skip' | 'abort' | 'continue';
}

export interface HandshakeResponse {
  packet_id: string;
  status: 'accepted' | 'rejected' | 'queued';
  queue_position?: number;
  estimated_start_time?: string;
  rejection_reason?: string;
  alternative_worker?: string;
}

export interface WorkerHandshake {
  worker_id: string;
  worker_name: string;
  version: string;
  capabilities: string[];
  supported_actions: string[];
  resource_limits: {
    max_concurrent_executions: number;
    max_input_size_mb: number;
    timeout_ms: number;
  };
  health_status: 'healthy' | 'degraded' | 'unhealthy';
  current_load: {
    active_executions: number;
    queue_length: number;
    cpu_usage_percent: number;
    memory_usage_mb: number;
  };
}

export interface DataTransferProtocol {
  protocol_version: '2.0';
  transfer_method: 'reference' | 'direct' | 'streaming';
  max_inline_size_bytes: number;
  supported_storage: ('KV' | 'R2' | 'D1')[];
  compression_supported: ('none' | 'gzip' | 'brotli')[];
  encryption_supported: ('none' | 'aes-256')[];
}

export interface HandshakeAcknowledgment {
  packet_id: string;
  stage_id: string;
  worker_name: string;
  received_at: string;
  data_retrieved: boolean;
  processing_started: boolean;
  acknowledgment_type: 'received' | 'processing' | 'completed' | 'failed';
  message?: string;
}