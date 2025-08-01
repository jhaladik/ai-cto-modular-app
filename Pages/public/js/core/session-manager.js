/**
 * Session Manager - Clean Version
 * Manages user sessions with proper interval cleanup and no memory leaks
 */
class SessionManager {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.sessionData = null;
        this.refreshInterval = null;
        this.refreshIntervalTime = 300000; // 5 minutes ONLY - no excessive refreshing
        this.isDestroyed = false;
        
        // Bind methods for event handlers
        this.validateSession = this.validateSession.bind(this);
        this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
        
        // Auto-cleanup on page unload
        window.addEventListener('beforeunload', this.handleBeforeUnload);
    }

    /**
     * Validate current session
     */
    async validateSession() {
        if (this.isDestroyed) return false;
        
        try {
            const token = this.getSessionToken();
            if (!token) {
                console.warn('⚠️ No session token found');
                return false;
            }

            // Simple session validation
            const response = await fetch('/api/auth/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-bitware-session-token': token
                }
            });

            if (!response.ok) {
                throw new Error(`Session validation failed: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.valid) {
                this.sessionData = {
                    user: data.user,
                    authenticated: true,
                    loaded: new Date().toISOString()
                };
                
                // Initialize KAM context if not already done
                if (!this.sessionData.kamContext) {
                    await this.initializeKAMContextFromLogin(data);
                }
                
                return true;
            } else {
                console.warn('⚠️ Session invalid');
                return false;
            }

        } catch (error) {
            console.error('❌ Session validation error:', error);
            return false;
        }
    }

    /**
     * Determine user type from session data - FOR ROUTING DECISIONS
     */
    determineUserType() {
        if (!this.sessionData) return 'client';
        
        // Method 1: Check explicit user role
        if (this.sessionData.user?.role) {
            const role = this.sessionData.user.role.toLowerCase();
            if (role === 'admin' || role === 'administrator') return 'admin';
            if (role === 'client' || role === 'customer') return 'client';
        }
        
        // Method 2: Check user type field
        if (this.sessionData.user?.user_type) {
            const userType = this.sessionData.user.user_type.toLowerCase();
            if (userType === 'admin' || userType === 'administrator') return 'admin';
            if (userType === 'client' || userType === 'customer') return 'client';
        }
        
        // Method 3: Check KAM context
        if (this.sessionData.kamContext?.is_admin) return 'admin';
        
        // Method 4: Check admin indicators
        if (this.sessionData.user?.is_admin || 
            this.sessionData.user?.admin || 
            this.sessionData.kamContext?.client_id === 'admin_user' ||
            this.sessionData.kamContext?.client_id === 'admin_fallback') {
            return 'admin';
        }
        
        // Method 5: Check enterprise tier (might indicate admin)
        if (this.sessionData.kamContext?.subscription_tier === 'enterprise' && 
            this.sessionData.kamContext?.fallback) {
            return 'admin';
        }
        
        // Default to client
        return 'client';
    }

    /**
     * Get user type for routing
     */
    getUserType() {
        return this.determineUserType();
    }

    /**
     * Check if user is admin
     */
    isAdmin() {
        return this.determineUserType() === 'admin';
    }

    /**
     * Check if user is client
     */
    isClient() {
        return this.determineUserType() === 'client';
    }

    /**
     * Initialize KAM context from login response - INTEGRATED APPROACH
     */
    async initializeKAMContextFromLogin(loginData) {
        if (this.isDestroyed) return;
        
        try {
            console.log('🔄 Initializing KAM context from login data...');

            let kamContext = null;
            
            // Method 1: Use KAM context from login response if available
            if (loginData.kamContext) {
                console.log('✅ Using KAM context from login response');
                kamContext = loginData.kamContext;
            }
            
            // Method 2: Check if user data indicates client vs admin
            else if (loginData.user) {
                const user = loginData.user;
                console.log('🔍 Analyzing user data for KAM context...', user);
                
                // If user has client_id or is marked as client, fetch their context
                if (user.client_id || user.role === 'client' || user.user_type === 'client') {
                    try {
                        const clientId = user.client_id || user.username;
                        console.log(`📡 Fetching client context for: ${clientId}`);
                        
                        const response = await this.apiClient.kamRequest(`/client?client_id=${encodeURIComponent(clientId)}`);
                        
                        if (response && response.success && response.client) {
                            kamContext = {
                                client_id: response.client.client_id,
                                company_name: response.client.company_name,
                                contact_email: response.client.contact_email,
                                subscription_tier: response.client.subscription_tier,
                                account_status: response.client.account_status,
                                monthly_budget_usd: response.client.monthly_budget_usd,
                                used_budget_current_month: response.client.used_budget_current_month,
                                fallback: false
                            };
                            console.log('✅ Client context loaded from KAM worker');
                        }
                    } catch (error) {
                        console.warn('⚠️ Failed to load client context from KAM worker:', error.message);
                    }
                }
                
                // If user is admin, create admin context
                else if (user.role === 'admin' || user.user_type === 'admin' || user.is_admin) {
                    kamContext = {
                        client_id: 'admin_user',
                        company_name: 'AI Factory Admin',
                        contact_email: user.email || user.username,
                        subscription_tier: 'enterprise',
                        account_status: 'active',
                        is_admin: true,
                        fallback: false
                    };
                    console.log('✅ Admin context created');
                }
            }

            // Method 3: Try email-based lookup as fallback
            if (!kamContext && this.sessionData.user?.email) {
                try {
                    console.log('🔍 Trying email-based KAM lookup...');
                    const response = await this.apiClient.kamRequest(
                        `/client?email=${encodeURIComponent(this.sessionData.user.email)}`
                    );
                    
                    if (response && response.success && response.client) {
                        const clientData = response.client;
                        kamContext = {
                            client_id: clientData.client_id,
                            company_name: clientData.company_name,
                            contact_email: clientData.contact_email,
                            subscription_tier: clientData.subscription_tier,
                            account_status: clientData.account_status,
                            monthly_budget_usd: clientData.monthly_budget_usd,
                            used_budget_current_month: clientData.used_budget_current_month,
                            fallback: false
                        };
                        console.log('✅ Email-based KAM context loaded');
                    }
                } catch (error) {
                    console.warn('⚠️ Email-based KAM lookup failed:', error.message);
                }
            }

            // Method 4: Create fallback context
            if (!kamContext) {
                console.log('🆘 Creating fallback KAM context...');
                kamContext = {
                    client_id: 'fallback_user',
                    company_name: this.sessionData.user?.username || 'Unknown User',
                    contact_email: this.sessionData.user?.email || 'unknown@example.com',
                    subscription_tier: 'basic',
                    account_status: 'active',
                    fallback: true
                };
            }

            this.sessionData.kamContext = kamContext;
            
            console.log('✅ KAM context initialized:', {
                client_id: kamContext.client_id,
                company_name: kamContext.company_name,
                tier: kamContext.subscription_tier,
                is_admin: kamContext.is_admin || false,
                fallback: kamContext.fallback
            });

            // Notify components that context is ready
            this.notifyContextReady();

        } catch (error) {
            console.error('❌ KAM context initialization failed:', error);
            
            // Set absolute fallback context
            this.sessionData.kamContext = {
                client_id: 'error_fallback',
                company_name: 'Error Fallback',
                subscription_tier: 'basic',
                account_status: 'active',
                fallback: true,
                error: true
            };
        }
    }

    /**
     * Login user with credentials - INTEGRATED WITH KEY ACCOUNT MANAGER
     */
    async login(username, password) {
        try {
            console.log('🔐 Starting login process...');
            
            // Step 1: Call the login API which integrates with key_account_manager
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                throw new Error(`Login failed: ${response.status}`);
            }

            const data = await response.json();
            console.log('📡 Login response received:', data);
            
            if (data.success && data.token) {
                // Store session token
                localStorage.setItem('bitware-session-token', data.token);
                
                // Set initial session data from login response
                this.sessionData = {
                    user: data.user,
                    authenticated: true,
                    loaded: new Date().toISOString()
                };

                console.log('✅ Login successful, session established');
                
                // Step 2: Get full KAM context from key_account_manager worker
                await this.initializeKAMContextFromLogin(data);

                // Step 3: Start session refresh with proper cleanup
                this.startSessionRefresh();

                // Step 4: Determine user type for routing
                const userType = this.determineUserType();
                console.log(`👤 User type determined: ${userType}`);

                return { 
                    success: true, 
                    user: data.user,
                    userType: userType,
                    kamContext: this.sessionData.kamContext
                };
            } else {
                throw new Error(data.message || 'Login failed');
            }

        } catch (error) {
            console.error('❌ Login failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Logout user and cleanup
     */
    async logout() {
        try {
            const token = this.getSessionToken();
            
            if (token) {
                // Call logout endpoint
                const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'x-bitware-session-token': token,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    console.warn('⚠️ Logout endpoint failed, continuing with local cleanup');
                }
            }
            
        } catch (error) {
            console.warn('⚠️ Logout request failed:', error);
        } finally {
            // Always perform local cleanup
            this.clearSession();
            
            console.log('✅ Logout completed');
            
            // Redirect to login
            window.location.href = '/login.html';
        }
    }

    /**
     * Clear session data and cleanup
     */
    clearSession() {
        // Stop refresh interval
        this.stopSessionRefresh();
        
        // Clear stored data
        localStorage.removeItem('bitware-session-token');
        localStorage.removeItem('bitware-session-data');
        
        // Clear session data
        this.sessionData = null;
        
        // Notify components
        this.notifySessionCleared();
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!(this.sessionData?.authenticated && this.getSessionToken());
    }

    /**
     * Get session token
     */
    getSessionToken() {
        return localStorage.getItem('bitware-session-token');
    }

    /**
     * Start automatic session refresh - SINGLE INTERVAL ONLY
     */
    startSessionRefresh() {
        // Always stop existing interval first
        this.stopSessionRefresh();
        
        if (this.isDestroyed) return;

        console.log('⏰ Starting session refresh (5 minute interval)');
        
        this.refreshInterval = setInterval(async () => {
            if (this.isDestroyed) {
                this.stopSessionRefresh();
                return;
            }
            
            try {
                const isValid = await this.validateSession();
                if (!isValid) {
                    console.warn('⚠️ Session validation failed during refresh');
                    // Don't auto-logout on refresh failure - let user continue
                }
            } catch (error) {
                console.error('❌ Session refresh failed:', error);
                // Don't spam console or auto-logout on network errors
            }
        }, this.refreshIntervalTime);
    }

    /**
     * Stop automatic session refresh
     */
    stopSessionRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            console.log('⏹️ Session refresh stopped');
        }
    }

    /**
     * Notify components that KAM context is ready
     */
    notifyContextReady() {
        if (this.isDestroyed) return;
        
        window.dispatchEvent(new CustomEvent('kamContextReady', {
            detail: this.sessionData.kamContext
        }));
    }

    /**
     * Notify components that session was cleared
     */
    notifySessionCleared() {
        window.dispatchEvent(new CustomEvent('sessionCleared'));
    }

    /**
     * Get session summary for debugging
     */
    getSessionSummary() {
        return {
            authenticated: this.isAuthenticated(),
            user: this.sessionData?.user?.email || this.sessionData?.user?.username,
            user_role: this.sessionData?.user?.role,
            kam_context_loaded: !!this.sessionData?.kamContext,
            client_id: this.sessionData?.kamContext?.client_id,
            subscription_tier: this.sessionData?.kamContext?.subscription_tier,
            is_fallback_context: this.sessionData?.kamContext?.fallback || false,
            refresh_active: !!this.refreshInterval,
            session_age: this.sessionData?.loaded ? 
                Math.round((Date.now() - new Date(this.sessionData.loaded).getTime()) / 1000) : 0
        };
    }

    /**
     * Handle page unload - cleanup intervals
     */
    handleBeforeUnload() {
        this.destroy();
    }

    /**
     * Destroy session manager and cleanup all resources
     */
    destroy() {
        this.isDestroyed = true;
        this.stopSessionRefresh();
        
        // Remove event listeners
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
        
        console.log('🗑️ SessionManager destroyed');
    }
}

// Initialize global session manager when API client is ready
window.addEventListener('DOMContentLoaded', () => {
    if (window.apiClient && !window.sessionManager) {
        window.sessionManager = new SessionManager(window.apiClient);
        console.log('✅ Session Manager initialized');
    }
});

// Export for global use
window.SessionManager = SessionManager;