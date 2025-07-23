// AI Factory Frontend Worker - Authentication Client
// @WORKER: FrontendWorker
// 🧱 Type: StaticJS
// 📍 Path: src/static/js/auth.ts
// 🎯 Role: Handle client-side authentication logic
// 💾 Storage: { localStorage: "session_token" }

export const AUTH_JS = `
/**
 * AI Factory Authentication Client
 * Handles login, logout, and session validation
 */
class AIFactoryAuth {
    constructor() {
        this.sessionToken = this.getStoredToken();
        this.currentUser = this.getStoredUser();
        this.baseUrl = window.location.origin;
    }

    /**
     * Get stored session token from localStorage
     */
    getStoredToken() {
        return localStorage.getItem('session-token') || 
               localStorage.getItem('bitware-session-token');
    }

    /**
     * Get stored user data from localStorage
     */
    getStoredUser() {
        const userData = localStorage.getItem('user-data');
        if (userData) {
            try {
                return JSON.parse(userData);
            } catch (e) {
                console.warn('Invalid user data in localStorage');
                localStorage.removeItem('user-data');
            }
        }
        return null;
    }

    /**
     * Store session token and user data
     */
    storeSession(token, user, expiresAt) {
        this.sessionToken = token;
        this.currentUser = user;
        
        localStorage.setItem('session-token', token);
        localStorage.setItem('bitware-session-token', token); // Backward compatibility
        localStorage.setItem('user-data', JSON.stringify(user));
        localStorage.setItem('session-expires', expiresAt);
        
        console.log(`✅ Session stored for user: \$user.username + ' (' + user.role + ')');
    }

    /**
     * Clear session data
     */
    clearSession() {
        this.sessionToken = null;
        this.currentUser = null;
        
        localStorage.removeItem('session-token');
        localStorage.removeItem('bitware-session-token');
        localStorage.removeItem('user-data');
        localStorage.removeItem('session-expires');
        
        console.log('🚪 Session cleared');
    }

    /**
     * Login with username and password
     */
    async login(username, password) {
        try {
            console.log(`🔐 Attempting login for user: \${username}`);
            
            const response = await fetch(`$\{this.baseUrl\}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.storeSession(data.session_token, data.user, data.expires_at);
                
                // Dispatch custom event for login success
                window.dispatchEvent(new CustomEvent('auth:login', {
                    detail: { user: data.user }
                }));
                
                return {
                    success: true,
                    user: data.user,
                    message: data.message
                };
            } else {
                console.warn(`❌ Login failed for user: $\{username\}`);
                return {
                    success: false,
                    message: data.message || 'Login failed'
                };
            }

        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                message: error.message || 'Network error during login'
            };
        }
    }

    /**
     * Logout current user
     */
    async logout() {
        try {
            console.log('🚪 Logging out...');
            
            // Call logout endpoint if we have a token
            if (this.sessionToken) {
                await fetch(`$\{this.baseUrl\}/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-session-token': this.sessionToken
                    }
                });
            }

            // Clear local session data
            const user = this.currentUser;
            this.clearSession();
            
            // Dispatch custom event for logout
            window.dispatchEvent(new CustomEvent('auth:logout', {
                detail: { user: user }
            }));
            
            return { success: true };

        } catch (error) {
            console.error('Logout error:', error);
            // Still clear local session even if server call fails
            this.clearSession();
            return { success: true };
        }
    }

    /**
     * Check if user is currently authenticated
     */
    async isAuthenticated() {
        if (!this.sessionToken) {
            return false;
        }

        // Check if token is expired locally
        const expiresAt = localStorage.getItem('session-expires');
        if (expiresAt) {
            const now = new Date();
            const expires = new Date(expiresAt);
            if (now >= expires) {
                console.log('🕐 Session expired locally');
                this.clearSession();
                return false;
            }
        }

        // Validate with server
        try {
            const response = await fetch(`$\{this.baseUrl\}/api/auth/validate`, {
                method: 'GET',
                headers: {
                    'x-session-token': this.sessionToken
                }
            });

            const data = await response.json();

            if (response.ok && data.valid) {
                // Update user data if returned
                if (data.user) {
                    this.currentUser = data.user;
                    localStorage.setItem('user-data', JSON.stringify(data.user));
                }
                
                return true;
            } else {
                console.log('🚫 Session validation failed');
                this.clearSession();
                return false;
            }

        } catch (error) {
            console.error('Authentication check failed:', error);
            return false;
        }
    }

    /**
     * Get current user data
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get current session token
     */
    getSessionToken() {
        return this.sessionToken;
    }

    /**
     * Check if current user has specific role
     */
    hasRole(role) {
        return this.currentUser && this.currentUser.role === role;
    }

    /**
     * Check if current user is admin
     */
    isAdmin() {
        return this.hasRole('admin');
    }

    /**
     * Check if current user is regular user
     */
    isUser() {
        return this.hasRole('user');
    }

    /**
     * Get authentication status information
     */
    async getAuthStatus() {
        try {
            const response = await fetch(`$\{this.baseUrl\}/api/auth/status`, {
                method: 'GET'
            });

            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Failed to get auth status');
            }

        } catch (error) {
            console.error('Auth status error:', error);
            return null;
        }
    }

    /**
     * Setup automatic session renewal
     */
    setupSessionRenewal(intervalMinutes = 30) {
        setInterval(async () => {
            if (this.sessionToken) {
                console.log('🔄 Checking session validity...');
                const isValid = await this.isAuthenticated();
                
                if (!isValid) {
                    console.log('🚫 Session invalid, redirecting to login');
                    window.dispatchEvent(new CustomEvent('auth:session-expired'));
                }
            }
        }, intervalMinutes * 60 * 1000);
    }

    /**
     * Setup authentication event listeners
     */
    setupEventListeners() {
        // Listen for session expiration
        window.addEventListener('auth:session-expired', () => {
            alert('Your session has expired. Please login again.');
            this.redirectToLogin();
        });

        // Listen for authentication errors
        window.addEventListener('auth:error', (event) => {
            console.error('Authentication error:', event.detail);
            this.clearSession();
            this.redirectToLogin();
        });
    }

    /**
     * Redirect to login (for single-page apps)
     */
    redirectToLogin() {
        if (typeof window.showLogin === 'function') {
            window.showLogin();
        } else {
            // Reload page to show login form
            window.location.reload();
        }
    }

    /**
     * Handle authentication errors from API calls
     */
    handleAuthError(error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            this.clearSession();
            window.dispatchEvent(new CustomEvent('auth:error', {
                detail: { error: error.message }
            }));
        }
    }

    /**
     * Initialize authentication system
     */
    async init() {
        console.log('🔐 Initializing AI Factory Authentication');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup automatic session renewal
        this.setupSessionRenewal();
        
        // Check initial authentication state
        const isAuth = await this.isAuthenticated();
        console.log(`Initial auth state: $\{isAuth ? 'authenticated' : 'not authenticated'\}`);
        
        return isAuth;
    }

    /**
     * Get session expiration time
     */
    getSessionExpiration() {
        const expiresAt = localStorage.getItem('session-expires');
        return expiresAt ? new Date(expiresAt) : null;
    }

    /**
     * Get time until session expires
     */
    getTimeUntilExpiration() {
        const expiresAt = this.getSessionExpiration();
        if (!expiresAt) return null;
        
        const now = new Date();
        const timeLeft = expiresAt.getTime() - now.getTime();
        return Math.max(0, timeLeft);
    }

    /**
     * Format time until expiration in human readable format
     */
    formatTimeUntilExpiration() {
        const timeLeft = this.getTimeUntilExpiration();
        if (!timeLeft) return null;
        
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `\${hours}h $\{minutes\}m`;
        } else {
            return `$\{minutes\}m`;
        }
    }
}

// Make authentication client available globally
window.AIFactoryAuth = AIFactoryAuth;
`;