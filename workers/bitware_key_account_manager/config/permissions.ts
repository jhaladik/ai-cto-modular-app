// Permission configuration based on subscription tiers
// workers/bitware_key_account_manager/config/permissions.ts

export interface Permission {
  feature: string;
  description: string;
  tiers: string[];
}

export interface TierConfig {
  name: string;
  displayName: string;
  limits: {
    monthly_requests: number;
    max_users: number;
    api_rate_limit: number; // requests per minute
    data_retention_days: number;
    priority_support: boolean;
    custom_integrations: boolean;
    advanced_analytics: boolean;
    white_label: boolean;
  };
}

// Tier configurations
export const TIER_CONFIGS: Record<string, TierConfig> = {
  basic: {
    name: 'basic',
    displayName: 'Basic',
    limits: {
      monthly_requests: 100,
      max_users: 2,
      api_rate_limit: 10,
      data_retention_days: 30,
      priority_support: false,
      custom_integrations: false,
      advanced_analytics: false,
      white_label: false
    }
  },
  standard: {
    name: 'standard',
    displayName: 'Standard',
    limits: {
      monthly_requests: 500,
      max_users: 5,
      api_rate_limit: 30,
      data_retention_days: 90,
      priority_support: false,
      custom_integrations: false,
      advanced_analytics: false,
      white_label: false
    }
  },
  premium: {
    name: 'premium',
    displayName: 'Premium',
    limits: {
      monthly_requests: 2000,
      max_users: 20,
      api_rate_limit: 60,
      data_retention_days: 365,
      priority_support: true,
      custom_integrations: true,
      advanced_analytics: true,
      white_label: false
    }
  },
  enterprise: {
    name: 'enterprise',
    displayName: 'Enterprise',
    limits: {
      monthly_requests: -1, // unlimited
      max_users: -1, // unlimited
      api_rate_limit: 120,
      data_retention_days: -1, // unlimited
      priority_support: true,
      custom_integrations: true,
      advanced_analytics: true,
      white_label: true
    }
  }
};

// Feature permissions mapped to tiers
export const FEATURE_PERMISSIONS: Permission[] = [
  // Core Features
  {
    feature: 'dashboard_access',
    description: 'Access to client dashboard',
    tiers: ['basic', 'standard', 'premium', 'enterprise']
  },
  {
    feature: 'basic_requests',
    description: 'Submit basic AI requests',
    tiers: ['basic', 'standard', 'premium', 'enterprise']
  },
  
  // Standard Features
  {
    feature: 'bulk_operations',
    description: 'Bulk request processing',
    tiers: ['standard', 'premium', 'enterprise']
  },
  {
    feature: 'request_history',
    description: 'View full request history',
    tiers: ['standard', 'premium', 'enterprise']
  },
  {
    feature: 'basic_analytics',
    description: 'Basic usage analytics',
    tiers: ['standard', 'premium', 'enterprise']
  },
  
  // Premium Features
  {
    feature: 'advanced_analytics',
    description: 'Advanced analytics and insights',
    tiers: ['premium', 'enterprise']
  },
  {
    feature: 'custom_templates',
    description: 'Create custom request templates',
    tiers: ['premium', 'enterprise']
  },
  {
    feature: 'api_access',
    description: 'Direct API access',
    tiers: ['premium', 'enterprise']
  },
  {
    feature: 'priority_processing',
    description: 'Priority request processing',
    tiers: ['premium', 'enterprise']
  },
  {
    feature: 'export_data',
    description: 'Export data and reports',
    tiers: ['premium', 'enterprise']
  },
  
  // Enterprise Features
  {
    feature: 'white_label',
    description: 'White-label branding',
    tiers: ['enterprise']
  },
  {
    feature: 'sso_integration',
    description: 'Single Sign-On integration',
    tiers: ['enterprise']
  },
  {
    feature: 'custom_workflows',
    description: 'Custom workflow automation',
    tiers: ['enterprise']
  },
  {
    feature: 'dedicated_support',
    description: 'Dedicated support team',
    tiers: ['enterprise']
  },
  {
    feature: 'audit_logs',
    description: 'Complete audit trail access',
    tiers: ['enterprise']
  }
];

// Helper functions
export function hasPermission(userTier: string, feature: string): boolean {
  const permission = FEATURE_PERMISSIONS.find(p => p.feature === feature);
  return permission ? permission.tiers.includes(userTier) : false;
}

export function getTierLimits(tier: string): TierConfig['limits'] | null {
  const config = TIER_CONFIGS[tier];
  return config ? config.limits : null;
}

export function canAddMoreUsers(tier: string, currentUserCount: number): boolean {
  const limits = getTierLimits(tier);
  if (!limits) return false;
  
  // -1 means unlimited
  if (limits.max_users === -1) return true;
  
  return currentUserCount < limits.max_users;
}

export function getRemainingRequests(tier: string, usedRequests: number): number {
  const limits = getTierLimits(tier);
  if (!limits) return 0;
  
  // -1 means unlimited
  if (limits.monthly_requests === -1) return -1;
  
  return Math.max(0, limits.monthly_requests - usedRequests);
}

export function getAvailableFeatures(tier: string): string[] {
  return FEATURE_PERMISSIONS
    .filter(permission => permission.tiers.includes(tier))
    .map(permission => permission.feature);
}