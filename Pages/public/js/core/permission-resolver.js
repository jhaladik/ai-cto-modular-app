/**
 * Permission Resolver - Frontend Component
 * Resolves user permissions based on KAM context
 */

class PermissionResolver {
    constructor(kamContext) {
        this.kamContext = kamContext;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    async hasPermission(permission) {
        try {
            // Check cache first
            const cacheKey = `perm_${permission}`;
            const cached = this.cache.get(cacheKey);
            
            if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
                return cached.value;
            }

            // Get permission from KAM context
            let hasAccess = false;
            
            if (this.kamContext && this.kamContext.initialized) {
                hasAccess = this.kamContext.hasPermission(permission);
            } else {
                // Fallback: basic permission logic
                hasAccess = this.getBasicPermission(permission);
            }

            // Cache result
            this.cache.set(cacheKey, {
                value: hasAccess,
                timestamp: Date.now()
            });

            return hasAccess;

        } catch (error) {
            console.error('❌ Permission check failed:', error);
            // Fail securely - deny access on error
            return false;
        }
    }

    // Enhanced Permission Resolver - Client Detail Permissions
    // File: Pages/public/js/core/permission-resolver.js
    // Add these permissions to the existing getBasicPermission method

    // Modify the getBasicPermission method to include client detail permissions:
    // Replace the existing basicPermissions array with this enhanced version:

    getBasicPermission(permission) {
        // Basic fallback permissions when KAM context is not available
        const sessionData = localStorage.getItem('bitware-user-info');
        if (!sessionData) return false;

        try {
            const session = JSON.parse(sessionData);
            const role = session.role || session.userType;

            // Admin gets everything
            if (role === 'admin' || role === 'internal') {
                return true;
            }

            // Account managers get client management permissions
            if (role === 'account_manager') {
                const accountManagerPermissions = [
                    'dashboard_access',
                    'view_own_data',
                    'admin_access',        // Limited admin access
                    'view_client_details', // NEW: Can view client details
                    'manage_clients'       // NEW: Can manage assigned clients
                ];
                return accountManagerPermissions.includes(permission);
            }

            // Basic permissions for regular users
            const basicPermissions = [
                'dashboard_access',
                'view_own_data'
            ];

            return basicPermissions.includes(permission);

        } catch (error) {
            console.error('Basic permission check failed:', error);
            return false;
        }
    }

    // Add new method for client-specific permission checking:
    async canViewClientDetails(clientId) {
        try {
            // Admin can view all client details
            const hasAdminAccess = await this.hasPermission('admin_access');
            if (hasAdminAccess) {
                return { allowed: true, reason: 'Admin access' };
            }

            // Account managers can view assigned clients
            const hasClientDetailAccess = await this.hasPermission('view_client_details');
            if (hasClientDetailAccess) {
                // TODO: Add logic to check if account manager is assigned to this client
                // For now, allow all account managers to view all clients
                return { allowed: true, reason: 'Account manager access' };
            }

            // Clients can only view their own details
            if (this.kamContext?.clientProfile?.client_id === clientId) {
                return { allowed: true, reason: 'Own client record' };
            }

            return { allowed: false, reason: 'Insufficient permissions' };

        } catch (error) {
            console.error('Client detail permission check failed:', error);
            return { allowed: false, reason: 'Permission check error' };
        }
    }

    // Add method to check bulk client operations:
    async canPerformClientBulkOperations() {
        const hasAdminAccess = await this.hasPermission('admin_access');
        const hasClientManagement = await this.hasPermission('manage_clients');
        
        return hasAdminAccess || hasClientManagement;
    }

    // Update the canAccessComponent method to include client detail component:
    async canAccessComponent(componentName) {
        const componentPermissions = {
            'executiveSummary': 'admin_access',
            'workerGrid': 'worker_access',
            'clientGrid': 'admin_access',
            'clientDetailPage': 'view_client_details',  // NEW: Client detail page
            'clientManagement': 'admin_access',         // NEW: Client management
            'financialDashboard': 'admin_access',
            'systemAnalytics': 'dashboard_access',
            'userProfile': 'dashboard_access'
        };

        const requiredPermission = componentPermissions[componentName] || 'dashboard_access';
        return await this.hasPermission(requiredPermission);
    }

    async canAccessComponent(componentName) {
        const componentPermissions = {
            'executiveSummary': 'admin_access',
            'workerGrid': 'worker_access',
            'clientGrid': 'admin_access',
            'financialDashboard': 'admin_access',
            'systemAnalytics': 'dashboard_access',
            'userProfile': 'dashboard_access'
        };

        const requiredPermission = componentPermissions[componentName] || 'dashboard_access';
        return await this.hasPermission(requiredPermission);
    }

    async canAccessWorker(workerId) {
        if (this.kamContext && this.kamContext.initialized) {
            return this.kamContext.canAccessWorker(workerId);
        }

        // Fallback: admin can access all, others get basic access
        const session = localStorage.getItem('bitware-user-info');
        if (!session) return false;

        try {
            const sessionData = JSON.parse(session);
            const role = sessionData.role || sessionData.userType;
            
            if (role === 'admin' || role === 'internal') {
                return true;
            }

            // Basic workers available to all authenticated users
            const basicWorkers = ['topic-researcher', 'content-classifier'];
            return basicWorkers.includes(workerId);

        } catch (error) {
            console.error('Worker access check failed:', error);
            return false;
        }
    }

    async getPermissionSummary() {
        try {
            const permissions = {};

            const standardPermissions = [
                'dashboard_access',
                'admin_access', 
                'worker_access',
                'view_own_data',
                'submit_requests',
                'view_analytics'
            ];

            for (const perm of standardPermissions) {
                permissions[perm] = await this.hasPermission(perm);
            }

            return {
                permissions,
                user_type: this.kamContext?.userType || 'unknown',
                subscription_tier: this.kamContext?.clientProfile?.subscription_tier || 'none',
                cache_size: this.cache.size,
                last_check: new Date().toISOString()
            };

        } catch (error) {
            console.error('Permission summary failed:', error);
            return {};
        }
    }

    clearCache() {
        this.cache.clear();
        console.log('🧹 Permission cache cleared');
    }

    // Check if user meets subscription tier requirements
    meetsSubscriptionRequirement(requiredTier) {
        if (!this.kamContext?.clientProfile) {
            return this.kamContext?.userType === 'admin'; // Admin bypasses tier requirements
        }

        const tierHierarchy = ['basic', 'standard', 'premium', 'enterprise'];
        const userTierIndex = tierHierarchy.indexOf(this.kamContext.clientProfile.subscription_tier);
        const requiredTierIndex = tierHierarchy.indexOf(requiredTier);

        return userTierIndex >= requiredTierIndex;
    }

    // Check budget availability
    async checkBudgetAccess(estimatedCost = 0) {
        if (!this.kamContext?.clientProfile) {
            return { approved: true, reason: 'Admin user' };
        }

        const profile = this.kamContext.clientProfile;
        const remainingBudget = profile.monthly_budget_usd - profile.used_budget_current_month;

        if (remainingBudget < estimatedCost) {
            return {
                approved: false,
                reason: 'Insufficient budget',
                remaining: remainingBudget,
                required: estimatedCost
            };
        }

        return {
            approved: true,
            remaining: remainingBudget,
            usage_percentage: (profile.used_budget_current_month / profile.monthly_budget_usd) * 100
        };
    }
}

// Make available globally for Phase 1 integration
window.PermissionResolver = PermissionResolver;