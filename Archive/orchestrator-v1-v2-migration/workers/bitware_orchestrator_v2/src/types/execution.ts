export interface ExecutionContext {
  execution_id: string;
  request_id: string;
  client_id: string;
  template_name: string;
  parameters: any;
  priority: ExecutionPriority;
  resources: AllocatedResources;
  checkpoints: Checkpoint[];
  metrics: ExecutionMetrics;
  created_at: string;
}

export type ExecutionPriority = 'low' | 'normal' | 'high' | 'critical';

export interface AllocatedResources {
  api_tokens: number;
  storage_mb: number;
  worker_slots: Map<string, number>;
  reserved_until: string;
}

export interface Checkpoint {
  checkpoint_id: string;
  execution_id: string;
  stage_order: number;
  checkpoint_data: any;
  data_references: DataReference[];
  created_at: string;
}

export interface DataReference {
  ref_id: string;
  storage_type: 'KV' | 'R2' | 'D1';
  storage_key: string;
  size_bytes: number;
  content_type: string;
  checksum: string;
  expires_at: string;
  created_at: string;
}

export interface ExecutionMetrics {
  stages_completed: number;
  stages_total: number;
  progress_percentage: number;
  current_stage: string;
  items_processed: number;
  errors_count: number;
  warnings_count: number;
  cost_accumulated_usd: number;
  time_elapsed_ms: number;
  estimated_remaining_ms: number;
}

export interface ExecutionPlan {
  plan_id: string;
  execution_id: string;
  stages: PlannedStage[];
  dependencies: StageDependency[];
  resource_requirements: ResourceEstimate[];
  estimated_total_cost_usd: number;
  estimated_total_time_ms: number;
  parallelization_opportunities: ParallelGroup[];
}

export interface PlannedStage {
  stage_order: number;
  worker_name: string;
  action: string;
  estimated_time_ms: number;
  estimated_cost_usd: number;
  can_parallel: boolean;
  dependencies: number[];
}

export interface StageDependency {
  stage_from: number;
  stage_to: number;
  dependency_type: 'data' | 'sequence' | 'resource';
  optional: boolean;
}

export interface ParallelGroup {
  group_id: string;
  stages: number[];
  max_parallel: number;
  resource_constraint?: string;
}

export interface ExecutionResult {
  execution_id: string;
  status: 'completed' | 'failed' | 'cancelled';
  final_output?: any;
  deliverables: Deliverable[];
  metrics: ExecutionMetrics;
  total_cost_usd: number;
  total_time_ms: number;
  error_message?: string;
  completed_at: string;
}

export interface Deliverable {
  deliverable_id: string;
  execution_id: string;
  name: string;
  type: 'report' | 'data' | 'file' | 'visualization';
  format: string;
  storage_reference: string;
  size_bytes: number;
  preview_available: boolean;
  created_at: string;
}

export interface ExecutionEstimate {
  feasible: boolean;
  estimated_cost_usd: number;
  estimated_time_ms: number;
  confidence_level: number;
  resource_availability: ResourceAvailability[];
  breakdown: StageEstimate[];
  warnings: string[];
}

export interface ResourceAvailability {
  resource_type: string;
  resource_name: string;
  status: 'available' | 'limited' | 'unavailable';
  available_quantity: number;
  required_quantity: number;
  wait_time_ms?: number;
}

export interface StageEstimate {
  stage_order: number;
  worker_name: string;
  estimated_time_ms: number;
  estimated_cost_usd: number;
  confidence_level: number;
  resource_requirements: ResourceRequirement[];
}

import { ResourceRequirement } from './pipeline';
import { ResourceEstimate } from './resources';
export { ResourceRequirement, ResourceEstimate };