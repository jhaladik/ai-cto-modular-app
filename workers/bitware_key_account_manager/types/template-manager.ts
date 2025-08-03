// Template Manager Type Definitions

export interface TemplateParameter {
  parameter_id: string;
  template_name: string;
  parameter_name: string;
  parameter_type: 'text' | 'number' | 'select' | 'boolean' | 'file' | 'array';
  display_name: string;
  description?: string;
  
  // Validation
  required: boolean;
  default_value?: string;
  validation_rules?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    options?: string[];
    maxItems?: number;
  };
  
  // UI Configuration
  ui_component: 'input' | 'textarea' | 'select' | 'checkbox' | 'file-upload' | 'multi-select' | 'dynamic-form' | 'api-config';
  ui_order: number;
  ui_group?: string;
  placeholder?: string;
  help_text?: string;
  
  // Tier Restrictions
  available_tiers: string[];
  editable_tiers: string[];
  
  // Cost Impact
  affects_cost: boolean;
  cost_impact_formula?: string | Record<string, number>;
  
  // Dependencies
  depends_on?: string[];
  conditional_rules?: Record<string, any>;
}

export interface TemplateParameterValue {
  parameter_name: string;
  value: any;
  validated: boolean;
  cost_impact?: number;
}

export interface TemplatePreset {
  preset_id: string;
  template_name: string;
  preset_name: string;
  description?: string;
  tier_restriction: 'basic' | 'standard' | 'premium' | 'enterprise';
  parameter_values: Record<string, any>;
  estimated_cost_usd: number;
  estimated_duration_ms: number;
  is_default: boolean;
}

export interface WorkerDefinition {
  worker_name: string;
  display_name: string;
  description: string;
  input_schema: Record<string, any>; // JSON Schema
  output_schema: Record<string, any>; // JSON Schema
  estimated_duration_ms: number;
  base_cost_usd: number;
  capabilities: string[];
}

export interface PipelineStage {
  stage_index: number;
  worker_name: string;
  stage_name: string;
  description?: string;
  
  // Parameter mapping
  input_mapping: Record<string, string>; // Maps template params to worker inputs
  output_mapping: Record<string, string>; // Maps worker outputs to next stage
  
  // Conditional execution
  condition?: string; // Expression to evaluate
  on_failure: 'continue' | 'stop' | 'retry';
  retry_count?: number;
  
  // Cost modifiers
  cost_multiplier?: number;
}

export interface EnhancedPipelineTemplate {
  template_name: string;
  display_name: string;
  description: string;
  category: string;
  complexity_level: string;
  
  // Pipeline definition
  pipeline_stages: PipelineStage[];
  
  // Parameters
  parameter_schema: TemplateParameter[];
  tier_parameter_limits: {
    basic?: { max_params: number; locked_params: string[] };
    standard?: { max_params: number; locked_params: string[] };
    premium?: { max_params: number; locked_params: string[] };
    enterprise?: { max_params: number; locked_params: string[] };
  };
  
  // Cost calculation
  base_cost_usd: number;
  cost_multipliers: Record<string, number>;
  
  // Examples and documentation
  example_deliverables: {
    name: string;
    description: string;
    preview_url?: string;
    format: string;
    typical_size: string;
  }[];
  
  // Restrictions
  allowed_tiers: string[];
  requires_approval_above_cost?: number;
  max_concurrent_executions?: number;
}

export interface TemplateExecutionRequest {
  request_id: string;
  client_id: string;
  template_name: string;
  parameter_values: Record<string, any>;
  
  // Cost and approval
  estimated_cost_usd: number;
  approved_by?: string;
  approval_timestamp?: Date;
  
  // Execution tracking
  status: 'pending_approval' | 'approved' | 'executing' | 'completed' | 'failed';
  orchestrator_pipeline_id?: string;
  started_at?: Date;
  completed_at?: Date;
  
  // Results
  deliverables?: {
    type: string;
    format: string;
    storage_location: string; // bucket path or db reference
    size_bytes: number;
    download_url?: string;
  }[];
  
  total_cost_usd?: number;
  feedback_score?: number;
  feedback_notes?: string;
}

export interface CostEstimate {
  base_cost: number;
  parameter_costs: {
    parameter_name: string;
    impact: number;
    reason: string;
  }[];
  total_estimated_cost: number;
  cost_breakdown: {
    worker_name: string;
    estimated_cost: number;
    duration_ms: number;
  }[];
  confidence_level: 'high' | 'medium' | 'low';
  warnings?: string[];
}