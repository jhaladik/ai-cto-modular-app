/**
 * KAM Context Manager - Core Infrastructure
 * Integrates with existing session management and provides client context
 */

class KAMContextManager {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.clientContext = null;
        this.contextCache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        this.initialized = false;
    }

    /**
     * Initialize KAM context from existing session
     * Extends current session validation without breaking existing flow
     */
    async initialize() {
        try {
            // Use existing session token pattern
            const sessionToken = localStorage.getItem('bitware-session-token');
            if (!sessionToken) {
                console.log('🔑 No session token - KAM context unavailable');
                return false;
            }

            // Get basic user info from existing pattern
            const userInfo = JSON.parse(localStorage.getItem('bitware-user-info') || '{}');
            
            // Fetch extended KAM context
            await this.loadClientContext(userInfo);
            
            this.initialized = true;
            console.log('✅ KAM Context initialized:', this.clientContext?.client_id || 'No client context');
            return true;
        } catch (error) {
            console.error('❌ KAM Context initialization failed:', error);
            return false;
        }
    }

    /**
     * Load client context from KAM worker
     * Links existing session to KAM client profiles
     */
    async loadClientContext(userInfo) {
        try {
            // Check cache first
            const cacheKey = `client_${userInfo.email || userInfo.username}`;
            const cached = this.contextCache.get(cacheKey);
            
            if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
                this.clientContext = cached.data;
                return;
            }

            // Fetch from KAM worker using existing API pattern
            let clientData = null;
            
            if (userInfo.email) {
                // Try client lookup by email
                try {
                    clientData = await this.apiClient.callWorker('key-account-manager', `/client?email=${encodeURIComponent(userInfo.email)}`);
                } catch (error) {
                    console.log('📧 Client lookup by email failed, trying fallback');
                }
            }

            // Fallback for admin users - get default context
            if (!clientData && userInfo.role === 'admin') {
                clientData = {
                    client_id: 'admin_user',
                    company_name: 'AI Factory Admin',
                    subscription_tier: 'enterprise',
                    monthly_budget_usd: 10000,
                    permissions: ['admin', 'all_workers', 'client_management'],
                    preferences: {
                        communication_style: 'technical',
                        preferred_report_formats: ['detailed', 'executive']
                    }
                };
            }

            // Store in cache and context
            if (clientData) {
                this.contextCache.set(cacheKey, {
                    data: clientData,
                    timestamp: Date.now()
                });
                this.clientContext = clientData;
            }

        } catch (error) {
            console.error('❌ Failed to load client context:', error);
            // Graceful fallback - create minimal context
            this.clientContext = {
                client_id: 'fallback_user',
                subscription_tier: 'basic',
                permissions: ['basic_access']
            };
        }
    }

    /**
     * Get current client context
     * Ensures context is available and fresh
     */
    async getContext() {
        if (!this.initialized) {
            await this.initialize();
        }
        
        return this.clientContext;
    }

    /**
     * Get client permissions
     * Integrates with existing role-based access
     */
    async getPermissions() {
        const context = await this.getContext();
        if (!context) return ['guest'];

        // Combine KAM permissions with existing role permissions
        const userInfo = JSON.parse(localStorage.getItem('bitware-user-info') || '{}');
        const rolePermissions = userInfo.role === 'admin' ? ['admin', 'all_workers'] : ['basic_access'];
        const kamPermissions = context.permissions || [];

        return [...new Set([...rolePermissions, ...kamPermissions])];
    }

    /**
     * Get subscription tier
     * Used by permission resolver and billing
     */
    async getSubscriptionTier() {
        const context = await this.getContext();
        return context?.subscription_tier || 'basic';
    }

    /**
     * Get budget information
     * Used for cost tracking and limits
     */
    async getBudgetInfo() {
        const context = await this.getContext();
        return {
            monthly_budget: context?.monthly_budget_usd || 100,
            current_usage: context?.current_usage_usd || 0,
            remaining_budget: (context?.monthly_budget_usd || 100) - (context?.current_usage_usd || 0)
        };
    }

    /**
     * Get client preferences
     * Used by components for personalization
     */
    async getPreferences() {
        const context = await this.getContext();
        return context?.preferences || {
            communication_style: 'formal',
            preferred_report_formats: ['executive']
        };
    }

    /**
     * Update client context
     * Syncs changes back to KAM worker
     */
    async updateContext(updates) {
        try {
            if (!this.clientContext) return false;

            // Update local context
            this.clientContext = { ...this.clientContext, ...updates };

            // Sync to KAM worker (if client exists)
            if (this.clientContext.client_id && this.clientContext.client_id !== 'admin_user') {
                await this.apiClient.callWorker('key-account-manager', `/client/${this.clientContext.client_id}`, 'PUT', updates);
            }

            // Clear cache to force refresh
            this.contextCache.clear();
            
            return true;
        } catch (error) {
            console.error('❌ Failed to update client context:', error);
            return false;
        }
    }

    /**
     * Track usage for billing
     * Integrates with existing worker cost tracking
     */
    async trackUsage(workerId, cost, metadata = {}) {
        try {
            const context = await this.getContext();
            if (!context || !context.client_id) return;

            const usageData = {
                client_id: context.client_id,
                worker_id: workerId,
                cost_usd: cost,
                metadata: metadata,
                timestamp: new Date().toISOString()
            };

            // Send to KAM worker for usage tracking
            await this.apiClient.callWorker('key-account-manager', '/usage-tracking', 'POST', usageData);
            
        } catch (error) {
            console.error('❌ Usage tracking failed:', error);
        }
    }

    /**
     * Check if feature is available for current client
     * Used by permission resolver
     */
    async hasFeature(featureName) {
        const tier = await this.getSubscriptionTier();
        const permissions = await getPermissions();

        // Feature matrix based on subscription tier
        const featureMatrix = {
            'basic': ['dashboard_access', 'basic_reports'],
            'standard': ['dashboard_access', 'basic_reports', 'advanced_reports', 'email_support'],
            'premium': ['dashboard_access', 'basic_reports', 'advanced_reports', 'email_support', 'priority_support', 'custom_templates'],
            'enterprise': ['all_features']
        };

        const tierFeatures = featureMatrix[tier] || [];
        return tierFeatures.includes(featureName) || tierFeatures.includes('all_features') || permissions.includes('admin');
    }

    /**
     * Clear context and cache
     * Used during logout or context refresh
     */
    clearContext() {
        this.clientContext = null;
        this.contextCache.clear();
        this.initialized = false;
    }
}

// Export for global use
window.KAMContextManager = KAMContextManager;