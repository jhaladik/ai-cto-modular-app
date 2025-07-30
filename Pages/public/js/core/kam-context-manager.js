/**
 * KAM Context Manager - Frontend Component
 * Manages client context and permissions for Phase 1 integration
 */

class KAMContextManager {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.initialized = false;
        this.clientProfile = null;
        this.userType = null;
        this.permissions = new Map();
        this.sessionToken = localStorage.getItem('bitware-session-token');
    }

    async initialize() {
        try {
            console.log('🏢 Initializing KAM Context Manager...');
            
            if (!this.sessionToken) {
                console.warn('⚠️ No session token found');
                return false;
            }

            // Get current user session info
            const sessionInfo = await this.getCurrentSession();
            if (!sessionInfo) {
                console.warn('⚠️ Could not get session info');
                return false;
            }

            this.userType = sessionInfo.userType || sessionInfo.role;
            console.log(`👤 User type detected: ${this.userType}`);

            // Only try to load client profile for actual clients, not admin/internal users
            if (this.userType === 'client' && sessionInfo.username) {
                await this.loadClientProfile(sessionInfo.username);
            } else if (this.userType === 'admin' || this.userType === 'internal') {
                console.log('🔑 Admin/Internal user - skipping client profile loading');
                // For admin users, we don't need a client profile
                this.clientProfile = null;
            } else if (sessionInfo.username && !this.userType) {
                // Unknown user type, try to determine by attempting client lookup
                console.log('❓ Unknown user type, attempting client profile lookup...');
                await this.loadClientProfile(sessionInfo.username);
                // If we found a client profile, user is a client
                if (this.clientProfile) {
                    this.userType = 'client';
                } else {
                    // Default to admin if no client profile found
                    this.userType = 'admin';
                }
            }

            // Build permissions based on role and client profile
            this.buildPermissions();

            this.initialized = true;
            console.log('✅ KAM Context initialized:', {
                userType: this.userType,
                clientProfile: !!this.clientProfile,
                permissionCount: this.permissions.size
            });

            // Emit event for Phase 1 integration
            window.dispatchEvent(new CustomEvent('kamContextReady', {
                detail: this.getContext()
            }));

            return true;

        } catch (error) {
            console.error('❌ KAM Context initialization failed:', error);
            return false;
        }
    }

    async getCurrentSession() {
        try {
            // Try to get session data from localStorage first
            const sessionData = localStorage.getItem('bitware-session-data');
            if (sessionData) {
                const session = JSON.parse(sessionData);
                console.log('📋 Session data from localStorage:', session);
                return session;
            }

            // If no session data, try to validate current session token
            if (this.sessionToken) {
                console.log('🔍 Validating session token...');
                
                try {
                    // Simple session validation - just check if KAM health endpoint works
                    const response = await fetch('/api/kam/health', {
                        headers: {
                            'x-bitware-session-token': this.sessionToken,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        // Session is valid, return basic info
                        // Check if we have any stored user info
                        const storedUser = localStorage.getItem('current-user');
                        if (storedUser) {
                            const userData = JSON.parse(storedUser);
                            return {
                                userType: userData.role || userData.userType || 'admin',
                                username: userData.username || userData.email || 'admin@company.com',
                                role: userData.role || 'admin'
                            };
                        }

                        // Default fallback for valid sessions
                        return {
                            userType: 'admin',
                            username: 'admin@company.com',
                            role: 'admin'
                        };
                    }
                } catch (error) {
                    console.warn('Session validation failed:', error);
                }
            }

            console.warn('⚠️ No valid session found');
            return null;

        } catch (error) {
            console.error('Session retrieval failed:', error);
            return null;
        }
    }

    async loadClientProfile(email) {
        try {
            console.log('🔍 Loading client profile for:', email);
            
            // Call KAM proxy to get client profile
            const response = await fetch(`/api/kam/client?email=${encodeURIComponent(email)}`, {
                headers: {
                    'x-bitware-session-token': this.sessionToken,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.client) {
                    this.clientProfile = data.client;
                    console.log('✅ Client profile loaded:', this.clientProfile.company_name);
                } else {
                    console.log('ℹ️ No client profile found for email (this is normal for admin users)');
                }
            } else if (response.status === 500) {
                console.log('⚠️ Client profile lookup failed (500) - likely an admin user, not a client');
                // This is expected for admin users - they don't have client profiles
                this.clientProfile = null;
            } else if (response.status === 404) {
                console.log('ℹ️ Client profile not found (404) - user is not a client');
                this.clientProfile = null;
            } else {
                console.warn(`⚠️ Client profile lookup failed with status: ${response.status}`);
                this.clientProfile = null;
            }

        } catch (error) {
            console.warn('⚠️ Failed to load client profile (this is normal for admin users):', error.message);
            // Don't treat this as a critical error - admin users won't have client profiles
            this.clientProfile = null;
        }
    }

    buildPermissions() {
        this.permissions.clear();

        console.log(`🔑 Building permissions for userType: ${this.userType}, hasClientProfile: ${!!this.clientProfile}`);

        if (this.userType === 'admin' || this.userType === 'internal') {
            // Admin gets all permissions
            this.permissions.set('*', true);
            this.permissions.set('dashboard_access', true);
            this.permissions.set('admin_access', true);
            this.permissions.set('worker_access', true);
            this.permissions.set('view_reports', true);
            this.permissions.set('account_access', true);
            this.permissions.set('billing_access', true);
            console.log('🔑 Admin permissions granted');
        } else if (this.clientProfile) {
            // Client permissions based on subscription tier
            const tier = this.clientProfile.subscription_tier;
            const tierPermissions = {
                'basic': ['view_own_data', 'submit_basic_requests', 'dashboard_access'],
                'standard': ['view_own_data', 'submit_requests', 'view_basic_analytics', 'dashboard_access', 'account_access'],
                'premium': ['view_own_data', 'submit_requests', 'view_analytics', 'api_access', 'dashboard_access', 'account_access', 'billing_access', 'view_reports'],
                'enterprise': ['view_own_data', 'submit_requests', 'view_analytics', 'api_access', 'custom_reports', 'dashboard_access', 'account_access', 'billing_access', 'view_reports']
            };

            const perms = tierPermissions[tier] || tierPermissions['basic'];
            perms.forEach(perm => this.permissions.set(perm, true));
            this.permissions.set('worker_access', true); // All clients can access workers
            console.log(`🔑 Client permissions granted for tier: ${tier}`);
        } else if (this.userType === 'client') {
            // Client user but no profile loaded - give basic permissions
            const basicPerms = ['dashboard_access', 'view_own_data', 'worker_access'];
            basicPerms.forEach(perm => this.permissions.set(perm, true));
            console.log('🔑 Basic client permissions granted (no profile)');
        } else {
            // Unknown user type - give basic dashboard access
            this.permissions.set('dashboard_access', true);
            console.log('🔑 Basic dashboard permissions granted (unknown user type)');
        }

        console.log('🔑 Final permissions:', Array.from(this.permissions.keys()));
    }

    hasPermission(permission) {
        return this.permissions.has('*') || this.permissions.has(permission);
    }

    canAccessWorker(workerId) {
        if (this.userType === 'admin') return true;
        
        if (!this.clientProfile) return false;

        const workerPermissions = {
            'topic-researcher': ['basic', 'standard', 'premium', 'enterprise'],
            'universal-researcher': ['premium', 'enterprise'],
            'content-classifier': ['standard', 'premium', 'enterprise'],
            'report-builder': ['premium', 'enterprise']
        };

        const allowedTiers = workerPermissions[workerId] || ['enterprise'];
        return allowedTiers.includes(this.clientProfile.subscription_tier);
    }

    getContext() {
        return {
            initialized: this.initialized,
            userType: this.userType,
            clientProfile: this.clientProfile,
            permissions: Array.from(this.permissions.keys()),
            company_name: this.clientProfile?.company_name || (this.userType === 'admin' ? 'Admin User' : 'Unknown'),
            subscription_tier: this.clientProfile?.subscription_tier || (this.userType === 'admin' ? 'admin' : 'basic'),
            monthly_budget: this.clientProfile?.monthly_budget_usd || (this.userType === 'admin' ? 999999 : 0),
            used_budget: this.clientProfile?.used_budget_current_month || 0,
            is_admin: this.userType === 'admin' || this.userType === 'internal',
            has_client_profile: !!this.clientProfile
        };
    }

    clearContext() {
        this.initialized = false;
        this.clientProfile = null;
        this.userType = null;
        this.permissions.clear();
        console.log('🧹 KAM Context cleared');
    }

    async refresh() {
        console.log('🔄 Refreshing KAM Context...');
        this.clearContext();
        return await this.initialize();
    }
}

// Make available globally for Phase 1 integration
window.KAMContextManager = KAMContextManager;