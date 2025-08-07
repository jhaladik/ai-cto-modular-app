export interface PipelineTemplate {
  template_name: string;
  display_name: string;
  description: string;
  category: string;
  subscription_tier: 'basic' | 'standard' | 'premium' | 'enterprise';
  stages: PipelineStage[];
  parameters: TemplateParameter[];
  estimated_cost_usd: number;
  estimated_time_ms: number;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  stage_order: number;
  worker_name: string;
  action: string;
  input_schema: any;
  output_schema: any;
  resource_requirements: ResourceRequirement[];
  can_parallel: boolean;
  retry_config: RetryConfig;
  timeout_ms: number;
}

export interface TemplateParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  default_value?: any;
  description: string;
  validation_rules?: ValidationRule[];
  allowed_values?: any[];
}

export interface ResourceRequirement {
  resource_type: 'api' | 'storage' | 'compute' | 'network';
  resource_name: string;
  quantity: number;
  unit: string;
}

export interface RetryConfig {
  max_attempts: number;
  backoff_type: 'linear' | 'exponential';
  initial_delay_ms: number;
  max_delay_ms: number;
}

export interface ValidationRule {
  type: 'min' | 'max' | 'pattern' | 'custom';
  value: any;
  error_message: string;
}

export interface PipelineExecution {
  execution_id: string;
  request_id: string;
  client_id: string;
  template_name: string;
  parameters: any;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'critical';
  started_at?: string;
  completed_at?: string;
  total_cost_usd?: number;
  total_time_ms?: number;
  estimated_time_ms?: number;
  error_message?: string;
  retry_count: number;
  checkpoint_data?: any;
  created_at: string;
  updated_at: string;
}

export interface StageExecution {
  stage_id: string;
  execution_id: string;
  worker_name: string;
  stage_order: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  input_reference?: string;
  output_reference?: string;
  summary_data?: any;
  cost_usd?: number;
  time_ms?: number;
  error_message?: string;
  retry_count: number;
  started_at?: string;
  completed_at?: string;
}