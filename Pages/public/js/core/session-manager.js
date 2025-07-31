/**
 * Session Management Extension - KAM Integration
 * Extends existing session management with KAM client context
 * Maintains backward compatibility with current login/logout flows
 */

class SessionManager {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.sessionData = null;
        this.kamContext = null;
        this.sessionKey = 'bitware-session-token';
        this.userInfoKey = 'bitware-user-info';
        this.contextKey = 'bitware-kam-context';
        
        // Session refresh settings
        this.refreshInterval = null;
        this.refreshIntervalTime = 15 * 60 * 1000; // 15 minutes
        
        // Initialize from existing session
        this.loadExistingSession();
    }

    /**
     * Load existing session data (backward compatibility)
     */
    loadExistingSession() {
        try {
            const sessionToken = localStorage.getItem(this.sessionKey);
            const userInfo = localStorage.getItem(this.userInfoKey);
            const kamContext = localStorage.getItem(this.contextKey);

            if (sessionToken && userInfo) {
                this.sessionData = {
                    token: sessionToken,
                    user: JSON.parse(userInfo),
                    kamContext: kamContext ? JSON.parse(kamContext) : null,
                    loaded: new Date()
                };
                
                console.log('🔄 Loaded existing session:', this.sessionData.user.email || this.sessionData.user.username);
            }
        } catch (error) {
            console.error('❌ Failed to load existing session:', error);
            this.clearSession();
        }
    }

    /**
     * Enhanced login with KAM context integration
     * Maintains backward compatibility with existing login flow
     */
    async login(username, password, loginType = 'admin') {
        try {
            console.log('🔐 Starting enhanced login process...');

            // Use existing auth pattern (from auth.js)
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, loginType })
            });

            const data = await response.json();
            
            if (!data.success) {
                return { success: false, error: data.error };
            }

            // Store session data (existing pattern)
            this.sessionData = {
                token: data.sessionToken,
                user: data.user,
                kamContext: null,
                loaded: new Date()
            };

            localStorage.setItem(this.sessionKey, data.sessionToken);
            localStorage.setItem(this.userInfoKey, JSON.stringify(data.user));

            console.log('✅ Basic session established');

            // Initialize KAM context asynchronously (doesn't block login)
            this.initializeKAMContext().catch(error => {
                console.warn('⚠️ KAM context initialization failed (non-blocking):', error.message);
            });

            // Start session refresh
            this.startSessionRefresh();

            return { success: true, user: data.user };

        } catch (error) {
            console.error('❌ Login failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Initialize KAM context after successful login
     */
    async initializeKAMContext() {
        try {
            if (!this.sessionData?.user) {
                throw new Error('No user session available');
            }

            console.log('🔄 Initializing KAM context...');

            // Try to get client context from KAM worker
            let kamContext = null;
            
            if (this.sessionData.user.email) {
                try {
                    const response = await this.apiClient.kamRequest(
                        `/client?email=${encodeURIComponent(this.sessionData.user.email)}`
                    );
                    
                    if (response && response.success && response.client) {
                        const clientData = response.client;
                        kamContext = {
                            client_id: clientData.client_id,
                            company_name: clientData.company_name,
                            subscription_tier: clientData.subscription_tier || 'basic',
                            monthly_budget_usd: clientData.monthly_budget_usd || 100,
                            permissions: clientData.permissions || [],
                            preferences: clientData.preferences || {},
                            loaded: new Date()
                        };
                    }
                } catch (error) {
                    console.log('📧 Client lookup failed, using fallback context');
                }
            }

            // Fallback context for admin users or when KAM lookup fails
            if (!kamContext) {
                kamContext = this.createFallbackContext();
            }

            // Store KAM context
            this.sessionData.kamContext = kamContext;
            localStorage.setItem(this.contextKey, JSON.stringify(kamContext));

            console.log('✅ KAM context initialized:', kamContext.client_id);

            // Notify components that context is ready
            this.notifyContextReady();

        } catch (error) {
            console.warn('⚠️ KAM context initialization failed:', error);
            this.sessionData.kamContext = this.createFallbackContext();
            localStorage.setItem(this.contextKey, JSON.stringify(this.sessionData.kamContext));
        }
    }

    /**
     * Create fallback KAM context when client lookup fails
     */
    createFallbackContext() {
        const isAdmin = this.sessionData?.user?.role === 'admin';
        
        return {
            client_id: isAdmin ? 'admin_session' : 'fallback_client',
            company_name: isAdmin ? 'AI Factory Admin' : 'Unknown Client',
            subscription_tier: isAdmin ? 'enterprise' : 'basic',
            monthly_budget_usd: isAdmin ? 10000 : 100,
            permissions: isAdmin ? ['admin', 'all_workers'] : ['basic_access'],
            preferences: {
                communication_style: 'technical',
                preferred_report_formats: ['detailed']
            },
            fallback: true,
            loaded: new Date()
        };
    }

    /**
     * Enhanced session validation with KAM context
     */
    async validateSession() {
        try {
            if (!this.sessionData?.token) {
                return { valid: false, reason: 'No session token' };
            }

            // Use existing validation pattern (from auth.js)
            const response = await fetch('/api/auth/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-bitware-session-token': this.sessionData.token
                }
            });

            const validation = await response.json();
            
            if (!validation.valid) {
                this.clearSession();
                return validation;
            }

            // Refresh KAM context if missing or stale
            if (!this.sessionData.kamContext || this.isContextStale()) {
                await this.refreshKAMContext();
            }

            return { valid: true, session: this.sessionData };

        } catch (error) {
            console.error('❌ Session validation failed:', error);
            return { valid: false, reason: error.message };
        }
    }

    /**
     * Check if KAM context is stale and needs refresh
     */
    isContextStale() {
        if (!this.sessionData?.kamContext?.loaded) return true;
        
        const contextAge = Date.now() - new Date(this.sessionData.kamContext.loaded).getTime();
        const maxAge = 30 * 60 * 1000; // 30 minutes
        
        return contextAge > maxAge;
    }

    /**
     * Refresh KAM context data
     */
    async refreshKAMContext() {
        try {
            console.log('🔄 Refreshing KAM context...');
            await this.initializeKAMContext();
        } catch (error) {
            console.warn('⚠️ KAM context refresh failed:', error);
        }
    }

    /**
     * Get current session data including KAM context
     */
    getSession() {
        return this.sessionData;
    }

    /**
     * Get KAM context specifically
     */
    getKAMContext() {
        return this.sessionData?.kamContext || null;
    }

    /**
     * Get user info
     */
    getUser() {
        return this.sessionData?.user || null;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!(this.sessionData?.token && this.sessionData?.user);
    }

    /**
     * Update KAM context data
     */
    async updateKAMContext(updates) {
        try {
            if (!this.sessionData?.kamContext) {
                console.warn('⚠️ No KAM context to update');
                return false;
            }

            // Update local context
            this.sessionData.kamContext = {
                ...this.sessionData.kamContext,
                ...updates,
                updated: new Date()
            };

            // Save to localStorage
            localStorage.setItem(this.contextKey, JSON.stringify(this.sessionData.kamContext));

            // Sync to KAM worker if it's a real client (not fallback)
            if (!this.sessionData.kamContext.fallback && this.sessionData.kamContext.client_id) {
                try {
                    await this.apiClient.callWorker(
                        'key-account-manager',
                        `/client/${this.sessionData.kamContext.client_id}`,
                        'PUT',
                        updates
                    );
                } catch (error) {
                    console.warn('⚠️ Failed to sync context updates to KAM worker:', error);
                }
            }

            // Notify components of context change
            this.notifyContextUpdated();
            
            return true;

        } catch (error) {
            console.error('❌ Failed to update KAM context:', error);
            return false;
        }
    }

    /**
     * Enhanced logout with KAM context cleanup
     */
    logout() {
        console.log('🚪 Starting enhanced logout...');
        
        // Stop session refresh
        this.stopSessionRefresh();
        
        // Clear all session data
        this.clearSession();
        
        // Redirect to login (existing pattern)
        window.location.href = '/login.html';
    }

    /**
     * Clear all session data
     */
    clearSession() {
        this.sessionData = null;
        localStorage.removeItem(this.sessionKey);
        localStorage.removeItem(this.userInfoKey);
        localStorage.removeItem(this.contextKey);
        
        // Notify components of session cleared
        this.notifySessionCleared();
    }

    /**
     * Start automatic session refresh
     */
    startSessionRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(async () => {
            try {
                const validation = await this.validateSession();
                if (!validation.valid) {
                    console.log('🔒 Session validation failed during refresh, logging out');
                    this.logout();
                }
            } catch (error) {
                console.error('❌ Session refresh failed:', error);
            }
        }, this.refreshIntervalTime);

        console.log('⏰ Session refresh started');
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
        window.dispatchEvent(new CustomEvent('kamContextReady', {
            detail: this.sessionData.kamContext
        }));
    }

    /**
     * Notify components that KAM context was updated
     */
    notifyContextUpdated() {
        window.dispatchEvent(new CustomEvent('kamContextUpdated', {
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
     * Handle session errors gracefully
     */
    handleSessionError(error) {
        console.error('📡 Session error:', error);
        
        // Don't auto-logout on every error (existing pattern)
        // Let components handle errors gracefully
        return false;
    }
}

// Initialize global session manager
window.addEventListener('DOMContentLoaded', () => {
    if (window.apiClient && !window.sessionManager) {
        window.sessionManager = new SessionManager(window.apiClient);
        console.log('✅ Session Manager initialized');
    }
});

// Export for global use
window.SessionManager = SessionManager;