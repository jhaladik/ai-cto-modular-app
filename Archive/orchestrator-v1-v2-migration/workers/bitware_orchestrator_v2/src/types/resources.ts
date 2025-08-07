export interface ResourcePool {
  openai_api: ApiResource;
  anthropic_api: ApiResource;
  email_quota: QuotaResource;
  worker_capacity: WorkerCapacity;
  storage: StorageResource;
}

export interface ApiResource {
  provider: string;
  daily_limit: number;
  used_today: number;
  rate_limit_per_minute: number;
  current_rate: number;
  cost_per_1k_tokens: number;
  reset_time: string;
}

export interface QuotaResource {
  resource_name: string;
  period: 'daily' | 'weekly' | 'monthly';
  limit: number;
  used_current_period: number;
  reset_date: string;
}

export interface WorkerCapacity {
  [workerName: string]: {
    max_concurrent: number;
    active_count: number;
    queue_length: number;
    avg_execution_time_ms: number;
    health_status: 'healthy' | 'degraded' | 'unhealthy';
  };
}

export interface StorageResource {
  kv_usage: {
    used_mb: number;
    limit_mb: number;
    percentage_used: number;
  };
  r2_usage: {
    used_gb: number;
    limit_gb: number | null;
    object_count: number;
  };
  d1_usage: {
    rows_count: number;
    size_mb: number;
  };
}

export interface ResourceAllocation {
  allocation_id: string;
  execution_id: string;
  resource_type: string;
  resource_name: string;
  quantity_allocated: number;
  allocated_at: string;
  released_at?: string;
  expires_at?: string;
  status: 'reserved' | 'active' | 'released';
}

export interface ResourceUsage {
  usage_id: string;
  resource_type: 'api' | 'storage' | 'worker' | 'network';
  resource_name: string;
  execution_id: string;
  stage_id?: string;
  quantity_used: number;
  unit: string;
  cost_usd: number;
  timestamp: string;
}

export interface ResourceEstimate {
  resource_type: string;
  resource_name: string;
  estimated_quantity: number;
  unit: string;
  estimated_cost_usd: number;
  availability: 'available' | 'limited' | 'unavailable';
  availability_message?: string;
}

export interface ResourceQuota {
  client_id: string;
  resource_type: string;
  quota_limit: number;
  quota_used: number;
  quota_period: 'daily' | 'weekly' | 'monthly';
  reset_date: string;
  overage_allowed: boolean;
  overage_rate_usd?: number;
}