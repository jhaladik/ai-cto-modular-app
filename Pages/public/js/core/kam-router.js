/**
 * KAM Router - Clean Version
 * Simple routing system - NO COMPLEX LOGIC, NO EXCESSIVE INTERVALS
 */
class KAMRouter {
    constructor() {
        this.currentRoute = '/';
        this.routes = new Map();
        this.middlewares = [];
        this.isInitialized = false;
        
        // Bind methods
        this.handlePopState = this.handlePopState.bind(this);
        this.navigate = this.navigate.bind(this);
        
        // Listen for browser back/forward
        window.addEventListener('popstate', this.handlePopState);
    }

    /**
     * Initialize the router
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('⚠️ Router already initialized');
            return;
        }

        console.log('🧭 Initializing KAM Router...');
        
        try {
            // Set up default routes
            this.setupDefaultRoutes();
            
            // Get initial route from URL hash or use appropriate default
            let initialRoute = this.getRouteFromHash();
            
            if (!initialRoute) {
                // Use different defaults for admin vs client
                const userType = window.sessionManager?.sessionData?.user?.role || 'client';
                initialRoute = userType === 'admin' ? '/dashboard' : '/my-account';
                console.log(`📍 Using default route for ${userType}: ${initialRoute}`);
            }
            
            // Navigate to initial route
            await this.navigate(initialRoute, { replace: true });
            
            this.isInitialized = true;
            console.log(`✅ KAM Router initialized on route: ${this.currentRoute}`);
            
        } catch (error) {
            console.error('❌ Router initialization failed:', error);
            throw error;
        }
    }

    /**
     * Set up default routes - DIFFERENT FOR ADMIN VS CLIENT
     */
    setupDefaultRoutes() {
        // Universal routes
        this.addRoute('/dashboard', () => this.loadDashboard());
        
        // Admin routes
        this.addRoute('/clients', () => this.loadClientsPage());
        this.addRoute('/clients/:id', (params) => this.loadClientDetail(params.id));
        this.addRoute('/users', () => this.loadUserManagement());
        this.addRoute('/requests', () => this.loadRequestsPage());
        this.addRoute('/templates', () => this.loadTemplateManager());
        this.addRoute('/orchestrator', () => this.loadOrchestrator());
        this.addRoute('/granulation', () => this.loadGranulationPage());
        
        // Client routes  
        this.addRoute('/my-account', () => this.loadMyAccount());
        this.addRoute('/my-reports', () => this.loadMyReports());
        this.addRoute('/billing', () => this.loadBilling());
        
        // Worker routes
        this.addRoute('/workers/:worker', (params) => this.loadWorker(params.worker));
        
        // Settings and misc
        this.addRoute('/settings', () => this.loadSettings());
        this.addRoute('/help', () => this.loadHelp());
        this.addRoute('/contact', () => this.loadContact());
    }

    /**
     * Add a route
     */
    addRoute(path, handler) {
        this.routes.set(path, handler);
    }

    /**
     * Navigate to a route
     */
    async navigate(path, options = {}) {
        try {
            console.log(`🧭 Navigating to: ${path}`);
            
            // Update browser history if not replacing
            if (!options.replace) {
                window.history.pushState({ path }, '', `#${path}`);
            } else {
                window.history.replaceState({ path }, '', `#${path}`);
            }
            
            this.currentRoute = path;
            
            // Find matching route
            const { handler, params } = this.matchRoute(path);
            
            if (handler) {
                // Execute any middlewares first
                for (const middleware of this.middlewares) {
                    const result = await middleware(path, params);
                    if (result === false) {
                        console.log('🛑 Navigation blocked by middleware');
                        return;
                    }
                }
                
                // Execute route handler
                await handler(params);
                
            } else {
                console.warn(`⚠️ No route handler found for: ${path}`);
                await this.handleNotFound(path);
            }
            
        } catch (error) {
            console.error('❌ Navigation error:', error);
            await this.handleNavigationError(path, error);
        }
    }

    /**
     * Match route and extract parameters
     */
    matchRoute(path) {
        // Try exact match first
        const exactHandler = this.routes.get(path);
        if (exactHandler) {
            return { handler: exactHandler, params: {} };
        }

        // Try parameter matching
        for (const [routePath, handler] of this.routes) {
            if (routePath.includes(':')) {
                const match = this.matchParameterRoute(path, routePath);
                if (match) {
                    return { handler, params: match };
                }
            }
        }

        return { handler: null, params: {} };
    }

    /**
     * Match route with parameters (e.g., /clients/:id)
     */
    matchParameterRoute(path, routePath) {
        const pathParts = path.split('/').filter(p => p);
        const routeParts = routePath.split('/').filter(p => p);

        if (pathParts.length !== routeParts.length) {
            return null;
        }

        const params = {};
        
        for (let i = 0; i < routeParts.length; i++) {
            const routePart = routeParts[i];
            const pathPart = pathParts[i];

            if (routePart.startsWith(':')) {
                // Parameter part
                const paramName = routePart.substring(1);
                params[paramName] = pathPart;
            } else if (routePart !== pathPart) {
                // Static part doesn't match
                return null;
            }
        }

        return params;
    }

    /**
     * Handle browser back/forward
     */
    async handlePopState(event) {
        const path = event.state?.path || this.getRouteFromHash() || '/dashboard';
        this.currentRoute = path;
        
        // Find and execute route handler without updating history
        const { handler, params } = this.matchRoute(path);
        if (handler) {
            await handler(params);
        }
    }

    /**
     * Get route from URL hash
     */
    getRouteFromHash() {
        const hash = window.location.hash;
        return hash ? hash.substring(1) : null;
    }

    /**
     * Add middleware
     */
    addMiddleware(middleware) {
        this.middlewares.push(middleware);
    }

    // =============================================================================
    // ROUTE HANDLERS - Delegate to Layout
    // =============================================================================

    async loadDashboard() {
        if (window.aiFactoryLayout) {
            await window.aiFactoryLayout.navigate('/dashboard');
        } else {
            this.showLayoutError('Dashboard');
        }
    }

    async loadClientsPage() {
        if (window.aiFactoryLayout) {
            await window.aiFactoryLayout.navigate('/clients');
        } else {
            this.showLayoutError('Clients');
        }
    }

    async loadClientDetail(clientId) {
        if (window.aiFactoryLayout) {
            await window.aiFactoryLayout.navigate(`/clients/${clientId}`);
        } else {
            this.showLayoutError('Client Detail');
        }
    }

    async loadMyAccount() {
        // For client portal - show their own account details
        if (window.sessionManager?.sessionData?.kamContext?.client_id) {
            const clientId = window.sessionManager.sessionData.kamContext.client_id;
            if (window.aiFactoryLayout) {
                await window.aiFactoryLayout.navigate(`/clients/${clientId}`);
            } else {
                this.showLayoutError('My Account');
            }
        } else {
            this.showError('My Account', 'Unable to load account information. Please refresh the page.');
        }
    }

    async loadMyReports() {
        this.showComingSoon('My Reports', 'Your personal reports and analytics will be available here.');
    }

    async loadUserManagement() {
        if (window.aiFactoryLayout) {
            await window.aiFactoryLayout.navigate('/users');
        } else {
            this.showComingSoon('User Management', 'User management interface will be available here.');
        }
    }

    async loadRequestsPage() {
        if (window.aiFactoryLayout) {
            await window.aiFactoryLayout.navigate('/requests');
        } else {
            this.showLayoutError('Requests');
        }
    }

    async loadTemplateManager() {
        if (window.aiFactoryLayout) {
            await window.aiFactoryLayout.navigate('/templates');
        } else {
            this.showLayoutError('Template Manager');
        }
    }

    async loadOrchestrator() {
        if (window.aiFactoryLayout) {
            await window.aiFactoryLayout.navigate('/orchestrator');
        } else {
            this.showLayoutError('Orchestrator');
        }
    }

    async loadGranulationPage() {
        if (window.aiFactoryLayout) {
            await window.aiFactoryLayout.navigate('/granulation');
        } else {
            this.showLayoutError('Content Granulator');
        }
    }

    async loadBilling() {
        this.showComingSoon('Billing', 'Billing information and payment methods will be available here.');
    }

    async loadWorker(workerName) {
        if (window.aiFactoryLayout) {
            await window.aiFactoryLayout.navigate(`/workers/${workerName}`);
        } else {
            this.showComingSoon(`${workerName}`, `The ${workerName} worker interface is currently under development.`);
        }
    }

    async loadSettings() {
        this.showComingSoon('Settings', 'Account settings and preferences will be available here.');
    }

    async loadHelp() {
        this.showComingSoon('Help & Documentation', 'Documentation, tutorials, and help resources will be available here.');
    }

    async loadContact() {
        this.showComingSoon('Contact Support', 'Support contact form and live chat will be available here.');
    }

    // =============================================================================
    // ERROR AND PLACEHOLDER HANDLERS
    // =============================================================================

    async handleNotFound(path) {
        console.warn(`📍 Route not found: ${path}`);
        
        const contentArea = document.getElementById('route-content') || document.getElementById('main-content');
        if (contentArea) {
            contentArea.innerHTML = `
                <div class="error-state">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
                    <h3>Page Not Found</h3>
                    <p>The page <code>${path}</code> could not be found.</p>
                    <div class="error-actions">
                        <button class="btn btn-primary" onclick="router.navigate('/dashboard')">
                            🏠 Go to Dashboard
                        </button>
                    </div>
                </div>
            `;
        }
    }

    async handleNavigationError(path, error) {
        console.error(`❌ Navigation error for ${path}:`, error);
        
        const contentArea = document.getElementById('route-content') || document.getElementById('main-content');
        if (contentArea) {
            contentArea.innerHTML = `
                <div class="error-state">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">💥</div>
                    <h3>Navigation Error</h3>
                    <p>Failed to load <code>${path}</code></p>
                    <p style="font-size: 0.875rem; color: var(--text-secondary);">${error.message}</p>
                    <div class="error-actions">
                        <button class="btn btn-primary" onclick="router.navigate('/dashboard')">
                            🏠 Go to Dashboard
                        </button>
                        <button class="btn btn-secondary" onclick="window.location.reload()">
                            🔄 Reload Page
                        </button>
                    </div>
                </div>
            `;
        }
    }

    showLayoutError(pageName) {
        const contentArea = document.getElementById('route-content') || document.getElementById('main-content');
        if (contentArea) {
            contentArea.innerHTML = `
                <div class="error-state">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <h3>Component Error</h3>
                    <p>The ${pageName} component is not available.</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">
                        🔄 Reload Page
                    </button>
                </div>
            `;
        }
    }

    showError(title, message) {
        const contentArea = document.getElementById('route-content') || document.getElementById('main-content');
        if (contentArea) {
            contentArea.innerHTML = `
                <div class="error-state">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
                    <h3>${title} Error</h3>
                    <p>${message}</p>
                    <div class="error-actions">
                        <button class="btn btn-primary" onclick="router.navigate('/dashboard')">
                            🏠 Go to Dashboard
                        </button>
                    </div>
                </div>
            `;
        }
    }

    showComingSoon(title, description) {
        const contentArea = document.getElementById('route-content') || document.getElementById('main-content');
        if (contentArea) {
            contentArea.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🚧</div>
                    <div class="empty-state-content">
                        <h3>${title} Coming Soon</h3>
                        <p>${description}</p>
                        <button class="btn btn-primary" onclick="router.navigate('/dashboard')">
                            ← Back to Dashboard
                        </button>
                    </div>
                </div>
            `;
        }
    }

    // =============================================================================
    // UTILITY METHODS
    // =============================================================================

    /**
     * Get current route
     */
    getCurrentRoute() {
        return this.currentRoute;
    }

    /**
     * Check if router is initialized
     */
    isReady() {
        return this.isInitialized;
    }

    /**
     * Reload current route
     */
    async reload() {
        await this.navigate(this.currentRoute, { replace: true });
    }

    /**
     * Go back in history
     */
    goBack() {
        window.history.back();
    }

    /**
     * Go forward in history
     */
    goForward() {
        window.history.forward();
    }

    /**
     * Get route parameters (if current route has them)
     */
    getParams() {
        const { params } = this.matchRoute(this.currentRoute);
        return params;
    }

    /**
     * Cleanup method
     */
    destroy() {
        window.removeEventListener('popstate', this.handlePopState);
        this.routes.clear();
        this.middlewares = [];
        this.isInitialized = false;
        console.log('🗑️ KAMRouter destroyed');
    }
}

// Authentication middleware
function authMiddleware(path, params) {
    // Skip auth check for login/logout pages
    if (path === '/login' || path === '/logout') {
        return true;
    }

    // Check if user is authenticated
    if (window.sessionManager && !window.sessionManager.isAuthenticated()) {
        console.warn('🔐 Authentication required, redirecting to login');
        window.location.href = '/login.html';
        return false;
    }

    return true;
}

// Permission middleware
function permissionMiddleware(path, params) {
    // Check if user has permission for this route
    if (window.sessionManager?.sessionData?.user) {
        const userRole = window.sessionManager.sessionData.user.role;
        
        // Admin-only routes
        const adminRoutes = ['/settings', '/billing', '/analytics'];
        if (adminRoutes.some(route => path.startsWith(route)) && userRole !== 'admin') {
            console.warn('🚫 Admin access required');
            window.router.navigate('/dashboard');
            return false;
        }
    }

    return true;
}

// Initialize global router when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    if (!window.router) {
        window.router = new KAMRouter();
        
        // Add middlewares
        window.router.addMiddleware(authMiddleware);
        window.router.addMiddleware(permissionMiddleware);
        
        console.log('✅ KAM Router created (not initialized yet)');
    }
});

// Export for global use
window.KAMRouter = KAMRouter;