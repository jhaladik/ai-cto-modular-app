/**
 * Permission Resolver - Access Control System
 * Integrates KAM client tiers with existing role-based permissions
 */

class PermissionResolver {
    constructor(kamContext) {
        this.kamContext = kamContext;
        this.permissionCache = new Map();
        this.cacheExpiry = 3 * 60 * 1000; // 3 minutes
    }

    /**
     * Check if user has specific permission
     * Combines existing role checks with KAM subscription tiers
     */
    async hasPermission(permission) {
        try {
            // Check cache first
            const cacheKey = `perm_${permission}`;
            const cached = this.permissionCache.get(cacheKey);
            
            if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
                return cached.result;
            }

            // Get current user info (existing pattern)
            const userInfo = JSON.parse(localStorage.getItem('bitware-user-info') || '{}');
            
            // Admin users have all permissions (existing behavior)
            if (userInfo.role === 'admin') {
                this.cachePermission(cacheKey, true);
                return true;
            }

            // Get KAM context and subscription tier
            const context = await this.kamContext.getContext();
            const tier = context?.subscription_tier || 'basic';
            const permissions = context?.permissions || [];

            // Check permission against tier and explicit permissions
            const hasAccess = this.checkPermissionAccess(permission, tier, permissions);
            
            this.cachePermission(cacheKey, hasAccess);
            return hasAccess;

        } catch (error) {
            console.error('❌ Permission check failed:', error);
            // Fail secure - deny access on error
            return false;
        }
    }

    /**
     * Check multiple permissions at once
     * Optimized for component rendering
     */
    async hasAnyPermission(permissions) {
        const checks = await Promise.all(
            permissions.map(perm => this.hasPermission(perm))
        );
        return checks.some(result => result === true);
    }

    /**
     * Check all permissions required
     */
    async hasAllPermissions(permissions) {
        const checks = await Promise.all(
            permissions.map(perm => this.hasPermission(perm))
        );
        return checks.every(result => result === true);
    }

    /**
     * Core permission logic based on subscription tiers
     */
    checkPermissionAccess(permission, tier, explicitPermissions) {
        // Check explicit permissions first
        if (explicitPermissions.includes(permission)) {
            return true;
        }

        // Permission matrix by subscription tier
        const permissionMatrix = {
            'basic': [
                'dashboard_access',
                'basic_worker_access',
                'view_own_results',
                'basic_export'
            ],
            'standard': [
                'dashboard_access',
                'basic_worker_access',
                'advanced_worker_access',
                'view_own_results',
                'basic_export',
                'advanced_export',
                'email_notifications',
                'usage_analytics'
            ],
            'premium': [
                'dashboard_access',
                'basic_worker_access',
                'advanced_worker_access',
                'premium_worker_access',
                'view_own_results',
                'view_team_results',
                'basic_export',
                'advanced_export',
                'custom_export',
                'email_notifications',
                'usage_analytics',
                'priority_support',
                'custom_templates',
                'api_access'
            ],
            'enterprise': [
                'all_permissions' // Enterprise gets everything
            ]
        };

        const tierPermissions = permissionMatrix[tier] || permissionMatrix['basic'];
        
        // Enterprise tier gets all permissions
        if (tierPermissions.includes('all_permissions')) {
            return true;
        }

        return tierPermissions.includes(permission);
    }

    /**
     * Get all permissions for current user
     * Used by components to determine what to show
     */
    async getAllPermissions() {
        try {
            const userInfo = JSON.parse(localStorage.getItem('bitware-user-info') || '{}');
            
            // Admin gets all permissions
            if (userInfo.role === 'admin') {
                return ['admin', 'all_permissions'];
            }

            const context = await this.kamContext.getContext();
            const tier = context?.subscription_tier || 'basic';
            const explicitPermissions = context?.permissions || [];

            // Get base permissions for tier
            const tierPermissions = this.getTierPermissions(tier);
            
            // Combine with explicit permissions
            return [...new Set([...tierPermissions, ...explicitPermissions])];

        } catch (error) {
            console.error('❌ Failed to get all permissions:', error);
            return ['basic_access']; // Fallback
        }
    }

    /**
     * Get permissions for a specific tier
     */
    getTierPermissions(tier) {
        const permissionMatrix = {
            'basic': [
                'dashboard_access',
                'basic_worker_access',
                'view_own_results',
                'basic_export'
            ],
            'standard': [
                'dashboard_access',
                'basic_worker_access',
                'advanced_worker_access',
                'view_own_results',
                'basic_export',
                'advanced_export',
                'email_notifications',
                'usage_analytics'
            ],
            'premium': [
                'dashboard_access',
                'basic_worker_access',
                'advanced_worker_access',
                'premium_worker_access',
                'view_own_results',
                'view_team_results',
                'basic_export',
                'advanced_export',
                'custom_export',
                'email_notifications',
                'usage_analytics',
                'priority_support',
                'custom_templates',
                'api_access'
            ],
            'enterprise': [
                'dashboard_access',
                'basic_worker_access',
                'advanced_worker_access',
                'premium_worker_access',
                'enterprise_worker_access',
                'view_own_results',
                'view_team_results',
                'view_all_results',
                'basic_export',
                'advanced_export',
                'custom_export',
                'bulk_export',
                'email_notifications',
                'usage_analytics',
                'advanced_analytics',
                'priority_support',
                'custom_templates',
                'api_access',
                'webhook_access',
                'white_label'
            ]
        };

        return permissionMatrix[tier] || permissionMatrix['basic'];
    }

    /**
     * Check worker access permission
     * Used by component registry for lazy loading
     */
    async canAccessWorker(workerId) {
        // Map workers to required permissions
        const workerPermissions = {
            'universal-researcher': 'basic_worker_access',
            'topic-researcher': 'basic_worker_access',
            'content-classifier': 'advanced_worker_access',
            'report-builder': 'advanced_worker_access',
            'data-analyzer': 'premium_worker_access',
            'custom-generator': 'premium_worker_access',
            'enterprise-insights': 'enterprise_worker_access'
        };

        const requiredPermission = workerPermissions[workerId] || 'basic_worker_access';
        return await this.hasPermission(requiredPermission);
    }

    /**
     * Check feature access
     * Used by components to show/hide features
     */
    async canAccessFeature(featureName) {
        // Feature to permission mapping
        const featurePermissions = {
            'export_data': 'basic_export',
            'export_advanced': 'advanced_export',
            'export_custom': 'custom_export',
            'bulk_operations': 'bulk_export',
            'email_notifications': 'email_notifications',
            'usage_dashboard': 'usage_analytics',
            'advanced_analytics': 'advanced_analytics',
            'api_keys': 'api_access',
            'webhooks': 'webhook_access',
            'custom_branding': 'white_label',
            'priority_support': 'priority_support'
        };

        const requiredPermission = featurePermissions[featureName];
        if (!requiredPermission) {
            console.warn(`⚠️ Unknown feature: ${featureName}`);
            return false;
        }

        return await this.hasPermission(requiredPermission);
    }

    /**
     * Get permission summary for debugging
     */
    async getPermissionSummary() {
        try {
            const userInfo = JSON.parse(localStorage.getItem('bitware-user-info') || '{}');
            const context = await this.kamContext.getContext();
            const allPermissions = await this.getAllPermissions();

            return {
                user_role: userInfo.role,
                client_id: context?.client_id,
                subscription_tier: context?.subscription_tier,
                permissions: allPermissions,
                is_admin: userInfo.role === 'admin',
                context_loaded: !!context
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Cache permission result
     */
    cachePermission(key, result) {
        this.permissionCache.set(key, {
            result: result,
            timestamp: Date.now()
        });
    }

    /**
     * Clear permission cache
     * Called when context changes
     */
    clearCache() {
        this.permissionCache.clear();
    }

    /**
     * Middleware for protecting routes/components
     * Returns permission-aware component wrapper
     */
    requirePermission(permission, fallbackComponent = null) {
        return async (targetComponent) => {
            const hasAccess = await this.hasPermission(permission);
            
            if (hasAccess) {
                return targetComponent;
            } else {
                return fallbackComponent || this.createAccessDeniedComponent(permission);
            }
        };
    }

    /**
     * Create access denied component
     */
    createAccessDeniedComponent(permission) {
        return {
            render: () => `
                <div class="access-denied" style="
                    padding: 20px;
                    text-align: center;
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    border-radius: 8px;
                    color: #991b1b;
                ">
                    <h3>🔒 Access Denied</h3>
                    <p>This feature requires: <code>${permission}</code></p>
                    <p>Please upgrade your subscription or contact support.</p>
                </div>
            `
        };
    }
}

// Export for global use
window.PermissionResolver = PermissionResolver;