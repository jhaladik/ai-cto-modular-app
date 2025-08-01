// Fixed KAM Router - Authentication Flow Compatible
// File: Pages/public/js/core/kam-router.js
// This version properly waits for authentication and doesn't interfere with login flow

class KAMRouter {
  constructor() {
    this.kamContext = null;
    this.routes = new Map();
    this.currentRoute = null;
    this.fallbackRoute = '/dashboard';
    this.initialized = false;
    this.layout = null;
    this.authenticationChecked = false;
  }

  async initialize(kamContext) {
    if (this.initialized) return;

    console.log('🎯 KAM Router: Starting initialization...');

    // IMPORTANT: Only initialize after authentication is confirmed
    if (!this.isAuthenticated()) {
      console.log('❌ Authentication not confirmed, aborting router initialization');
      return false;
    }

    this.kamContext = kamContext;
    this.registerRoutes();
    this.setupEventListeners();
    
    // Initialize layout ONLY after authentication
    await this.initializeLayout();
    
    // Handle initial route
    await this.handleRouteChange();
    
    this.initialized = true;
    console.log('✅ KAM Router initialized successfully');
    return true;
  }

  /**
   * Check if user is properly authenticated
   */
  isAuthenticated() {
    const sessionToken = localStorage.getItem('bitware-session-token');
    const userInfo = localStorage.getItem('bitware-user-info');
    
    if (!sessionToken || !userInfo) {
      console.log('🔒 No valid session found');
      return false;
    }
  
    try {
      const user = JSON.parse(userInfo);
      if (!user) {
        console.log('🔒 Invalid user object');
        return false;
      }
      
      // FLEXIBLE: Accept various user identifier formats
      const hasIdentifier = user.email || user.username || user.user_id || user.id;
      
      if (!hasIdentifier) {
        console.log('🔒 No user identifier found');
        console.log('🔍 User object keys:', Object.keys(user));
        return false;
      }
      
      console.log('✅ Authentication confirmed for:', hasIdentifier);
      return true;
    } catch (error) {
      console.log('🔒 Failed to parse user info:', error);
      return false;
    }
  }
  
  /**
   * Initialize the AI Factory Layout - only after authentication
   */
  async initializeLayout() {
    if (!window.AIFactoryLayout) {
      console.warn('⚠️ AIFactoryLayout not found, using fallback mode');
      return false;
    }

    try {
      const userInfo = JSON.parse(localStorage.getItem('bitware-user-info'));
      const userType = this.determineUserType(userInfo);
      
      this.layout = new window.AIFactoryLayout({
        userType: userType,
        user: userInfo,
        onNavigate: (path) => this.navigate(path),
        showSearch: true
      });

      // Render layout
      const appContainer = document.getElementById('app-container');
      if (appContainer) {
        appContainer.innerHTML = this.layout.render();
        await this.layout.mount();
        console.log('✅ AI Factory Layout initialized');
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to initialize layout:', error);
      return false;
    }
    
    return false;
  }

  /**
   * Determine user type from user info
   */
  determineUserType(userInfo) {
    if (!userInfo) return 'client';
    
    // Check various possible role fields
    if (userInfo.role === 'admin' || 
        userInfo.userType === 'admin' || 
        userInfo.userType === 'internal' ||
        userInfo.email?.includes('@admin') ||
        userInfo.isAdmin === true) {
      return 'admin';
    }
    
    return 'client';
  }

  registerRoutes() {
    // Dashboard routes
    this.routes.set('/dashboard', {
      component: () => this.loadDashboard(),
      permissions: ['dashboard_access'],
      tiers: ['basic', 'standard', 'premium', 'enterprise'],
      title: 'Dashboard'
    });

    this.routes.set('/admin', {
      component: () => this.loadAdminDashboard(),
      permissions: ['admin_access'],
      roles: ['admin'],
      title: 'Admin Dashboard'
    });

    // NEW: Clients page route (converted from modal)
    this.routes.set('/clients', {
      component: () => this.loadClientsPage(),
      permissions: ['admin_access'],
      roles: ['admin'],
      title: 'Client Management'
    });

    // Worker routes
    this.routes.set('/workers/universal-researcher', {
      component: () => this.loadWorkerInterface('universal-researcher'),
      permissions: ['worker_access'],
      tiers: ['basic', 'standard', 'premium', 'enterprise'],
      title: 'Universal Researcher'
    });

    this.routes.set('/workers/content-classifier', {
      component: () => this.loadWorkerInterface('content-classifier'),
      permissions: ['worker_access'],
      tiers: ['standard', 'premium', 'enterprise'],
      title: 'Content Classifier'
    });

    this.routes.set('/workers/report-builder', {
      component: () => this.loadWorkerInterface('report-builder'),
      permissions: ['worker_access'],
      tiers: ['premium', 'enterprise'],
      title: 'Report Builder'
    });

    // Client-specific routes
    this.routes.set('/reports', {
      component: () => this.loadReportsPage(),
      permissions: ['view_reports'],
      tiers: ['basic', 'standard', 'premium', 'enterprise'],
      title: 'My Reports'
    });

    this.routes.set('/account', {
      component: () => this.loadAccountPage(),
      permissions: ['account_access'],
      tiers: ['basic', 'standard', 'premium', 'enterprise'],
      title: 'Account Settings'
    });

    // Error pages
    this.routes.set('/access-denied', {
      component: () => this.loadAccessDeniedPage(),
      permissions: [],
      title: 'Access Denied'
    });

    console.log(`📋 Registered ${this.routes.size} routes`);
  }

  setupEventListeners() {
    // Handle hash changes
    window.addEventListener('hashchange', () => {
      if (this.initialized) {
        this.handleRouteChange();
      }
    });

    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      if (this.initialized) {
        this.handleRouteChange();
      }
    });
  }

  async handleRouteChange() {
    const hash = window.location.hash.slice(1) || this.fallbackRoute;
    await this.navigateToRoute(hash);
  }

  async navigate(path) {
    if (!this.initialized) {
      console.warn('⚠️ Router not initialized, cannot navigate');
      return;
    }

    // Update URL
    if (path.startsWith('/')) {
      window.location.hash = '#' + path;
    } else {
      window.location.hash = '#/' + path;
    }
  }

  async navigateToRoute(path) {
    if (!this.initialized) {
      console.warn('⚠️ Router not initialized, skipping navigation');
      return;
    }

    try {
      console.log(`🧭 Navigating to: ${path}`);

      // Find matching route
      const route = this.findRoute(path);
      if (!route) {
        console.warn(`Route not found: ${path}`);
        return this.navigateToRoute('/dashboard');
      }

      // Check permissions
      const hasAccess = await this.checkRouteAccess(route);
      if (!hasAccess) {
        console.warn(`Access denied for route: ${path}`);
        return this.navigateToRoute('/access-denied');
      }

      // Show loading state
      this.showLoading();

      // Load and render component
      await this.loadRoute(route, path);
      
      // Update current route
      this.currentRoute = path;
      
      // Update layout navigation state
      if (this.layout) {
        this.layout.currentPath = path;
        this.layout.updateActiveStates();
      }
      
      // Update page title
      document.title = route.title ? `${route.title} - AI Factory` : 'AI Factory';

      console.log(`✅ Navigation complete: ${path}`);

    } catch (error) {
      console.error('❌ Navigation error:', error);
      this.showError('Failed to load page');
    }
  }

  findRoute(path) {
    // Direct match
    if (this.routes.has(path)) {
      return { path, ...this.routes.get(path) };
    }

    // Pattern matching for dynamic routes
    for (const [routePath, routeConfig] of this.routes.entries()) {
      const pattern = this.createRoutePattern(routePath);
      const match = path.match(pattern);
      if (match) {
        return { 
          path: routePath, 
          params: this.extractParams(routePath, path),
          ...routeConfig 
        };
      }
    }

    return null;
  }

  createRoutePattern(routePath) {
    const pattern = routePath
      .replace(/:[^/]+/g, '([^/]+)')
      .replace(/\//g, '\\/');
    return new RegExp(`^${pattern}$`);
  }

  extractParams(routePath, actualPath) {
    const routeParts = routePath.split('/');
    const actualParts = actualPath.split('/');
    const params = {};

    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        const paramName = routeParts[i].slice(1);
        params[paramName] = actualParts[i];
      }
    }

    return params;
  }

  async checkRouteAccess(route) {
    const userInfo = JSON.parse(localStorage.getItem('bitware-user-info') || '{}');
    const userType = this.determineUserType(userInfo);

    // Check role requirements
    if (route.roles && route.roles.length > 0) {
      if (!route.roles.includes(userType)) {
        return false;
      }
    }

    // For now, allow all permissions (since we're focusing on auth flow)
    // TODO: Implement proper permission checking with KAM context
    
    return true;
  }

  async loadRoute(route, path) {
    try {
      const component = await route.component();
      await this.renderComponent(component, route.params);
    } catch (error) {
      console.error(`Failed to load route component: ${path}`, error);
      throw error;
    }
  }

  async renderComponent(component, params = {}) {
    let container = document.getElementById('main-content');
    
    // Fallback to app-container if layout not initialized
    if (!container) {
      container = document.getElementById('app-container');
    }
    
    if (!container) {
      console.error('❌ No content container found');
      return;
    }

    if (component && component.render) {
      // Component-based rendering
      container.innerHTML = await component.render(params);
      
      // Mount component if it has mount method
      if (component.mount) {
        await component.mount();
      }
    } else if (typeof component === 'string') {
      // String-based rendering
      container.innerHTML = component;
    }
  }

  // Route component loaders
  async loadDashboard() {
    const userInfo = JSON.parse(localStorage.getItem('bitware-user-info') || '{}');
    const userType = this.determineUserType(userInfo);
    
    if (userType === 'admin') {
      return this.loadAdminDashboard();
    } else {
      return this.loadClientDashboard();
    }
  }

  async loadAdminDashboard() {
    return {
      render: () => {
        return `
          <div class="dashboard-page">
            <div class="page-header">
              <h1 class="page-title">📊 Admin Dashboard</h1>
              <div class="page-actions">
                <button class="btn btn-secondary" onclick="window.location.reload()">
                  🔄 Refresh
                </button>
              </div>
            </div>
            <div id="admin-dashboard-content">
              <div class="dashboard-loading">
                <div class="loading-spinner">🔄</div>
                <p>Loading admin dashboard components...</p>
              </div>
            </div>
          </div>
        `;
      },
      mount: async () => {
        // Initialize existing admin dashboard if available
        if (window.AdminDashboard && !window.adminDashboard) {
          try {
            window.adminDashboard = new window.AdminDashboard();
            await window.adminDashboard.initialize();
            
            // Replace loading with actual content
            const container = document.getElementById('admin-dashboard-content');
            if (container && window.adminDashboard.render) {
              container.innerHTML = window.adminDashboard.render();
            }
          } catch (error) {
            console.error('Failed to initialize admin dashboard:', error);
            document.getElementById('admin-dashboard-content').innerHTML = `
              <div class="error-state">
                <p>Failed to load admin dashboard components</p>
                <button class="btn btn-primary" onclick="window.location.reload()">Retry</button>
              </div>
            `;
          }
        }
      }
    };
  }

  async loadClientDashboard() {
    return {
      render: () => {
        return `
          <div class="dashboard-page">
            <div class="page-header">
              <h1 class="page-title">🎛️ My AI Factory</h1>
              <div class="page-actions">
                <button class="btn btn-secondary" onclick="window.location.reload()">
                  🔄 Refresh
                </button>
              </div>
            </div>
            <div id="client-dashboard-content">
              <div class="dashboard-loading">
                <div class="loading-spinner">🔄</div>
                <p>Loading your dashboard...</p>
              </div>
            </div>
          </div>
        `;
      },
      mount: async () => {
        // Initialize existing client dashboard if available
        if (window.ClientDashboard && !window.clientDashboard) {
          try {
            window.clientDashboard = new window.ClientDashboard();
            await window.clientDashboard.initialize();
            
            // Replace loading with actual content
            const container = document.getElementById('client-dashboard-content');
            if (container && window.clientDashboard.render) {
              container.innerHTML = window.clientDashboard.render();
            }
          } catch (error) {
            console.error('Failed to initialize client dashboard:', error);
            document.getElementById('client-dashboard-content').innerHTML = `
              <div class="error-state">
                <p>Failed to load dashboard components</p>
                <button class="btn btn-primary" onclick="window.location.reload()">Retry</button>
              </div>
            `;
          }
        }
      }
    };
  }

  // NEW: Load clients page (converted from modal)
  async loadClientsPage() {
    if (!window.ClientsPage) {
      return {
        render: () => `
          <div class="error-page">
            <div class="error-icon">❌</div>
            <h1>Component Not Found</h1>
            <p>ClientsPage component not loaded. Make sure clients-page.js is included.</p>
            <button class="btn btn-primary" onclick="kamRouter.navigate('/dashboard')">
              Return to Dashboard
            </button>
          </div>
        `,
        mount: () => Promise.resolve()
      };
    }

    const apiClient = window.apiClient || (window.adminDashboard?.apiClient);
    const clientsPage = new window.ClientsPage(apiClient);
    
    return {
      render: () => clientsPage.render(),
      mount: () => clientsPage.mount()
    };
  }

  async loadWorkerInterface(workerId) {
    return {
      render: () => `
        <div class="worker-page">
          <div class="page-header">
            <h1 class="page-title">${this.getWorkerTitle(workerId)}</h1>
          </div>
          <div class="worker-content">
            <div class="worker-placeholder">
              <div class="worker-icon">🔧</div>
              <h2>Worker Interface</h2>
              <p>Loading ${workerId} interface...</p>
              <button class="btn btn-secondary" onclick="window.location.reload()">
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>
      `,
      mount: () => Promise.resolve()
    };
  }

  // Placeholder pages
  async loadReportsPage() {
    return this.getPlaceholderPage('📋 My Reports', 'Reports functionality coming soon!');
  }

  async loadAccountPage() {
    return this.getPlaceholderPage('👤 Account Settings', 'Account management coming soon!');
  }

  async loadAccessDeniedPage() {
    return {
      render: () => `
        <div class="error-page">
          <div class="error-icon">🚫</div>
          <h1>Access Denied</h1>
          <p>You don't have permission to access this page.</p>
          <div class="error-actions">
            <button class="btn btn-primary" onclick="kamRouter.navigate('/dashboard')">
              Return to Dashboard
            </button>
          </div>
        </div>
      `,
      mount: () => Promise.resolve()
    };
  }

  // Utility methods
  showLoading() {
    const container = document.getElementById('main-content') || 
                    document.getElementById('app-container');
    if (container) {
      container.innerHTML = `
        <div class="loading-state">
          <div class="loading-spinner">🔄</div>
          <div class="loading-text">Loading...</div>
        </div>
      `;
    }
  }

  showError(message) {
    const container = document.getElementById('main-content') || 
                    document.getElementById('app-container');
    if (container) {
      container.innerHTML = `
        <div class="error-state">
          <div class="error-icon">❌</div>
          <div class="error-message">${message}</div>
          <button class="btn btn-primary" onclick="window.location.reload()">
            Refresh Page
          </button>
        </div>
      `;
    }
  }

  getPlaceholderPage(title, message) {
    return {
      render: () => `
        <div class="placeholder-page">
          <div class="page-header">
            <h1 class="page-title">${title}</h1>
          </div>
          <div class="placeholder-content">
            <div class="placeholder-icon">🚧</div>
            <h2>Coming Soon</h2>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="kamRouter.navigate('/dashboard')">
              Return to Dashboard
            </button>
          </div>
        </div>
      `,
      mount: () => Promise.resolve()
    };
  }

  getWorkerTitle(workerId) {
    const titles = {
      'universal-researcher': '🔍 Universal Researcher',
      'content-classifier': '🧠 Content Classifier',
      'report-builder': '📊 Report Builder'
    };
    return titles[workerId] || workerId;
  }

  getCurrentRoute() {
    return this.currentRoute;
  }
}

// Global instance
window.KAMRouter = KAMRouter;
window.kamRouter = new KAMRouter();

// CRITICAL: Only auto-initialize after manual trigger
// This prevents interference with authentication flow
window.initializeAIFactoryRouter = async function() {
  console.log('🎯 Manual router initialization requested...');
  
  try {
    // Check if we have proper authentication
    if (!window.kamRouter.isAuthenticated()) {
      console.log('❌ Authentication check failed, redirecting to login');
      window.location.href = '/login.html';
      return false;
    }

    // Wait for KAM context if available
    let kamContext = null;
    if (window.kamContext?.initialized) {
      kamContext = window.kamContext;
    } else {
      console.log('⚠️ KAM context not available, proceeding with basic context');
      kamContext = { initialized: true }; // Minimal context
    }

    const success = await window.kamRouter.initialize(kamContext);
    
    if (success) {
      console.log('✅ AI Factory Router initialized successfully');
      return true;
    } else {
      console.log('❌ Router initialization failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Router initialization error:', error);
    return false;
  }
};

console.log('✅ Enhanced KAM Router (Auth-Compatible) script loaded');