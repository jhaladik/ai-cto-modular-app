// Permission service for checking user permissions
// workers/bitware_key_account_manager/services/permissions.ts

import { DatabaseService } from './database';
import { 
  hasPermission, 
  getTierLimits, 
  canAddMoreUsers, 
  getRemainingRequests,
  getAvailableFeatures,
  TIER_CONFIGS 
} from '../config/permissions';

export interface PermissionContext {
  userId: string;
  userRole: string;
  clientId?: string;
  subscriptionTier?: string;
  requestedFeature?: string;
}

export class PermissionService {
  constructor(private db: DatabaseService) {}

  /**
   * Check if a user has permission to access a feature
   */
  async checkFeatureAccess(context: PermissionContext): Promise<{
    allowed: boolean;
    reason?: string;
    tierRequired?: string;
  }> {
    // Admins have access to everything
    if (context.userRole === 'admin') {
      return { allowed: true };
    }

    // Support staff have limited access
    if (context.userRole === 'support') {
      const supportFeatures = ['dashboard_access', 'basic_requests', 'request_history'];
      const allowed = !context.requestedFeature || supportFeatures.includes(context.requestedFeature);
      return { 
        allowed,
        reason: allowed ? undefined : 'Support staff do not have access to this feature'
      };
    }

    // For client users, check their subscription tier
    if (context.userRole === 'client') {
      if (!context.clientId) {
        return { 
          allowed: false, 
          reason: 'No client associated with this user' 
        };
      }

      // Get client subscription tier
      const client = await this.db.getClientById(context.clientId);
      if (!client) {
        return { 
          allowed: false, 
          reason: 'Client not found' 
        };
      }

      if (client.account_status !== 'active' && client.account_status !== 'trial') {
        return { 
          allowed: false, 
          reason: `Account is ${client.account_status}` 
        };
      }

      const tier = client.subscription_tier || 'basic';

      // Check if feature is available for this tier
      if (context.requestedFeature) {
        const hasAccess = hasPermission(tier, context.requestedFeature);
        if (!hasAccess) {
          // Find the minimum tier required
          const tierRequired = this.getMinimumTierForFeature(context.requestedFeature);
          return { 
            allowed: false, 
            reason: `This feature requires ${tierRequired} tier or higher`,
            tierRequired
          };
        }
      }

      return { allowed: true };
    }

    return { 
      allowed: false, 
      reason: 'Unknown user role' 
    };
  }

  /**
   * Check if client can add more users
   */
  async checkUserLimit(clientId: string): Promise<{
    allowed: boolean;
    currentCount: number;
    limit: number;
    reason?: string;
  }> {
    const client = await this.db.getClientById(clientId);
    if (!client) {
      return { 
        allowed: false, 
        currentCount: 0,
        limit: 0,
        reason: 'Client not found' 
      };
    }

    const tier = client.subscription_tier || 'basic';
    const limits = getTierLimits(tier);
    if (!limits) {
      return { 
        allowed: false, 
        currentCount: 0,
        limit: 0,
        reason: 'Invalid subscription tier' 
      };
    }

    // Count current users for this client
    const users = await this.db.getAllUsers();
    const currentCount = users.filter(u => u.client_id === clientId).length;

    const allowed = canAddMoreUsers(tier, currentCount);

    return {
      allowed,
      currentCount,
      limit: limits.max_users,
      reason: allowed ? undefined : `User limit reached for ${tier} tier (${currentCount}/${limits.max_users})`
    };
  }

  /**
   * Check request quota for client
   */
  async checkRequestQuota(clientId: string): Promise<{
    allowed: boolean;
    used: number;
    limit: number;
    remaining: number;
    reason?: string;
  }> {
    const client = await this.db.getClientById(clientId);
    if (!client) {
      return { 
        allowed: false, 
        used: 0,
        limit: 0,
        remaining: 0,
        reason: 'Client not found' 
      };
    }

    const tier = client.subscription_tier || 'basic';
    const limits = getTierLimits(tier);
    if (!limits) {
      return { 
        allowed: false, 
        used: 0,
        limit: 0,
        remaining: 0,
        reason: 'Invalid subscription tier' 
      };
    }

    // For now, use a simple counter from the client record
    // In production, this would query actual request logs
    const used = Math.floor(client.used_budget_current_month || 0);
    const remaining = getRemainingRequests(tier, used);
    const allowed = remaining === -1 || remaining > 0;

    return {
      allowed,
      used,
      limit: limits.monthly_requests,
      remaining,
      reason: allowed ? undefined : `Monthly request limit reached for ${tier} tier`
    };
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string): Promise<{
    tier: string;
    tierDisplayName: string;
    features: string[];
    limits: any;
    usage: {
      requests: { used: number; limit: number; remaining: number };
      users: { current: number; limit: number; canAddMore: boolean };
    };
  }> {
    const user = await this.db.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Default response for non-client users
    if (user.role !== 'client' || !user.client_id) {
      const tier = user.role === 'admin' ? 'enterprise' : 'basic';
      const config = TIER_CONFIGS[tier];
      return {
        tier,
        tierDisplayName: config.displayName,
        features: user.role === 'admin' ? 
          getAvailableFeatures('enterprise') : 
          ['dashboard_access', 'basic_requests'],
        limits: config.limits,
        usage: {
          requests: { used: 0, limit: -1, remaining: -1 },
          users: { current: 0, limit: -1, canAddMore: true }
        }
      };
    }

    // Get client details
    const client = await this.db.getClientById(user.client_id);
    if (!client) {
      throw new Error('Client not found');
    }

    const tier = client.subscription_tier || 'basic';
    const config = TIER_CONFIGS[tier];
    
    // Get usage data
    const requestQuota = await this.checkRequestQuota(user.client_id);
    const userLimit = await this.checkUserLimit(user.client_id);

    return {
      tier,
      tierDisplayName: config.displayName,
      features: getAvailableFeatures(tier),
      limits: config.limits,
      usage: {
        requests: {
          used: requestQuota.used,
          limit: requestQuota.limit,
          remaining: requestQuota.remaining
        },
        users: {
          current: userLimit.currentCount,
          limit: userLimit.limit,
          canAddMore: userLimit.allowed
        }
      }
    };
  }

  /**
   * Get minimum tier required for a feature
   */
  private getMinimumTierForFeature(feature: string): string {
    const tiers = ['basic', 'standard', 'premium', 'enterprise'];
    
    for (const tier of tiers) {
      if (hasPermission(tier, feature)) {
        const config = TIER_CONFIGS[tier];
        return config ? config.displayName : tier;
      }
    }
    
    return 'Enterprise';
  }
}