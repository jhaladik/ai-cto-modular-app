// public/js/core/kam-router.js
// Phase 4: KAM-Based Router - Permission-aware routing with lazy loading

export class KAMRouter {
    constructor() {
      this.kamContext = null;
      this.routes = new Map();
      this.currentRoute = null;
      this.fallbackRoute = '/dashboard';
      this.initialized = false;
    }
  
    async initialize(kamContext) {
      if (this.initialized) return;
  
      this.kamContext = kamContext;
      this.registerRoutes();
      this.setupEventListeners();
      
      // Handle initial route
      await this.handleRouteChange();
      
      this.initialized = true;
      console.log('✅ KAM Router initialized');
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
  
      // Worker routes
      this.routes.set('/workers/topic-researcher', {
        component: () => this.loadWorkerInterface('topic-researcher'),
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
  
      this.routes.set('/billing', {
        component: () => this.loadBillingPage(),
        permissions: ['billing_access'],
        tiers: ['standard', 'premium', 'enterprise'],
        title: 'Billing & Usage'
      });
  
      // Error pages
      this.routes.set('/access-denied', {
        component: () => this.loadAccessDeniedPage(),
        permissions: [],
        title: 'Access Denied'
      });
  
      this.routes.set('/upgrade', {
        component: () => this.loadUpgradePage(),
        permissions: [],
        title: 'Upgrade Plan'
      });
  
      console.log(`📋 Registered ${this.routes.size} routes`);
    }
  
    setupEventListeners() {
      // Handle hash changes
      window.addEventListener('hashchange', () => {
        this.handleRouteChange();
      });
  
      // Handle browser back/forward
      window.addEventListener('popstate', (e) => {
        this.handleRouteChange();
      });
  
      // Handle navigation links
      document.addEventListener('click', (e) => {
        const link = e.target.closest('[data-route]');
        if (link) {
          e.preventDefault();
          this.navigate(link.dataset.route);
        }
      });
    }
  
    async handleRouteChange() {
      const hash = window.location.hash.slice(1) || this.fallbackRoute;
      await this.navigateToRoute(hash);
    }
  
    async navigate(path) {
      // Update URL
      if (path.startsWith('/')) {
        window.location.hash = '#' + path;
      } else {
        window.location.hash = '#/' + path;
      }
      
      // Navigation will be handled by hashchange event
    }
  
    async navigateToRoute(path) {
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
      // Convert route patterns like /workers/:id to regex
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
      if (!this.kamContext) {
        return false;
      }
  
      // Check role requirements
      if (route.roles && route.roles.length > 0) {
        const userRole = this.kamContext.userType;
        if (!route.roles.includes(userRole)) {
          return false;
        }
      }
  
      // Check permission requirements
      if (route.permissions && route.permissions.length > 0) {
        for (const permission of route.permissions) {
          if (!this.kamContext.hasPermission(permission)) {
            return false;
          }
        }
      }
  
      // Check tier requirements
      if (route.tiers && route.tiers.length > 0) {
        const userTier = this.kamContext.clientProfile?.subscription_tier;
        if (!route.tiers.includes(userTier)) {
          return false;
        }
      }
  
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
      const container = document.getElementById('app-container') || 
                      document.getElementById('main-content') || 
                      document.body;
  
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
      const userType = this.kamContext.userType;
      
      if (userType === 'admin') {
        return this.loadAdminDashboard();
      } else {
        return this.loadClientDashboard();
      }
    }
  
    async loadClientDashboard() {
      const { ClientDashboard } = await import('../dashboards/client/client-dashboard.js');
      const dashboard = new ClientDashboard();
      await dashboard.initialize();
      return dashboard;
    }
  
    async loadAdminDashboard() {
      // Use existing admin dashboard but ensure it's enhanced with Phase 3
      if (window.adminDashboard) {
        return {
          render: () => document.getElementById('admin-dashboard').innerHTML,
          mount: () => Promise.resolve()
        };
      }
  
      return {
        render: () => `
          <div class="admin-dashboard">
            <h1>Admin Dashboard</h1>
            <p>Loading admin dashboard...</p>
          </div>
        `,
        mount: async () => {
          // Initialize existing admin dashboard
          if (window.AdminDashboard) {
            window.adminDashboard = new AdminDashboard();
            await window.adminDashboard.init();
          }
        }
      };
    }
  
    async loadWorkerInterface(workerId) {
      try {
        // Use Phase 3 manager to load worker interface
        if (window.phase3Manager) {
          const interfaceComponent = await window.phase3Manager.loadWorkerInterface(workerId, this.kamContext);
          if (interfaceComponent) {
            return interfaceComponent;
          }
        }
  
        // Fallback to direct interface loading
        const interfaceModule = await import(`../workers/${workerId}/interface.js`);
        const InterfaceClass = Object.values(interfaceModule)[0];
        const interfaceComponent = new InterfaceClass(this.kamContext);
        
        return interfaceComponent;
  
      } catch (error) {
        console.error(`Failed to load worker interface: ${workerId}`, error);
        
        // Return fallback interface
        return {
          render: () => `
            <div class="worker-interface-fallback">
              <h1>🔧 ${workerId}</h1>
              <p>Loading interface...</p>
              <div class="loading-spinner">🔄</div>
            </div>
          `,
          mount: () => Promise.resolve()
        };
      }
    }
  
    async loadReportsPage() {
      return {
        render: () => `
          <div class="reports-page">
            <header class="page-header">
              <h1>📊 My Reports</h1>
              <button class="btn-primary" onclick="kamRouter.navigate('/workers/report-builder')">
                ➕ Create New Report
              </button>
            </header>
            
            <div class="reports-grid">
              <div class="report-card">
                <div class="report-preview">📈</div>
                <div class="report-info">
                  <h3>Weekly AI Report</h3>
                  <p>Generated 2 days ago</p>
                  <div class="report-actions">
                    <button class="btn-secondary">View</button>
                    <button class="btn-secondary">Download</button>
                  </div>
                </div>
              </div>
              
              <div class="report-card">
                <div class="report-preview">🔍</div>
                <div class="report-info">
                  <h3>Market Research</h3>
                  <p>Generated 1 week ago</p>
                  <div class="report-actions">
                    <button class="btn-secondary">View</button>
                    <button class="btn-secondary">Download</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `,
        mount: () => Promise.resolve()
      };
    }
  
    async loadAccountPage() {
      const client = this.kamContext.clientProfile;
      
      return {
        render: () => `
          <div class="account-page">
            <header class="page-header">
              <h1>⚙️ Account Settings</h1>
            </header>
            
            <div class="account-sections">
              <section class="account-section">
                <h2>Company Information</h2>
                <div class="form-group">
                  <label>Company Name</label>
                  <input type="text" value="${client.company_name || ''}" readonly>
                </div>
                <div class="form-group">
                  <label>Subscription Tier</label>
                  <input type="text" value="${client.subscription_tier?.toUpperCase() || 'BASIC'}" readonly>
                </div>
              </section>
              
              <section class="account-section">
                <h2>API Access</h2>
                <div class="api-key-section">
                  <label>API Key</label>
                  <div class="api-key-display">
                    <code>••••••••••••••••••••••••••••••••</code>
                    <button class="btn-secondary">Show</button>
                  </div>
                </div>
              </section>
              
              <section class="account-section">
                <h2>Upgrade Plan</h2>
                <p>Unlock more features with a higher tier plan.</p>
                <button class="btn-primary" onclick="kamRouter.navigate('/upgrade')">
                  ⬆️ Upgrade Plan
                </button>
              </section>
            </div>
          </div>
        `,
        mount: () => Promise.resolve()
      };
    }
  
    async loadBillingPage() {
      return {
        render: () => `
          <div class="billing-page">
            <header class="page-header">
              <h1>💳 Billing & Usage</h1>
            </header>
            
            <div class="billing-overview">
              <div class="billing-card">
                <h3>Current Period</h3>
                <div class="billing-stats">
                  <div class="stat">
                    <span class="value">$23.50</span>
                    <span class="label">Used this month</span>
                  </div>
                  <div class="stat">
                    <span class="value">$50.00</span>
                    <span class="label">Monthly limit</span>
                  </div>
                </div>
              </div>
              
              <div class="billing-card">
                <h3>Usage Breakdown</h3>
                <div class="usage-list">
                  <div class="usage-item">
                    <span>Research Requests</span>
                    <span>$18.30</span>
                  </div>
                  <div class="usage-item">
                    <span>Report Generation</span>
                    <span>$4.20</span>
                  </div>
                  <div class="usage-item">
                    <span>Content Analysis</span>
                    <span>$1.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `,
        mount: () => Promise.resolve()
      };
    }
  
    async loadAccessDeniedPage() {
      return {
        render: () => `
          <div class="access-denied-page">
            <div class="error-content">
              <div class="error-icon">🚫</div>
              <h1>Access Denied</h1>
              <p>You don't have permission to access this page.</p>
              <div class="error-actions">
                <button class="btn-primary" onclick="kamRouter.navigate('/dashboard')">
                  🏠 Return to Dashboard
                </button>
                <button class="btn-secondary" onclick="kamRouter.navigate('/upgrade')">
                  ⬆️ Upgrade Plan
                </button>
              </div>
            </div>
          </div>
        `,
        mount: () => Promise.resolve()
      };
    }
  
    async loadUpgradePage() {
      return {
        render: () => `
          <div class="upgrade-page">
            <header class="page-header">
              <h1>⬆️ Upgrade Your Plan</h1>
              <p>Unlock more powerful features and higher usage limits</p>
            </header>
            
            <div class="pricing-tiers">
              <div class="tier-card">
                <h3>Standard</h3>
                <div class="price">$99/month</div>
                <ul class="features">
                  <li>✅ Topic Research</li>
                  <li>✅ Content Classification</li>
                  <li>✅ Basic Reports</li>
                  <li>✅ 1,000 requests/month</li>
                </ul>
                <button class="btn-primary">Choose Standard</button>
              </div>
              
              <div class="tier-card featured">
                <h3>Premium</h3>
                <div class="price">$199/month</div>
                <ul class="features">
                  <li>✅ Everything in Standard</li>
                  <li>✅ Advanced Reports</li>
                  <li>✅ API Access</li>
                  <li>✅ 5,000 requests/month</li>
                  <li>✅ Priority Support</li>
                </ul>
                <button class="btn-primary">Choose Premium</button>
              </div>
              
              <div class="tier-card">
                <h3>Enterprise</h3>
                <div class="price">Contact Us</div>
                <ul class="features">
                  <li>✅ Everything in Premium</li>
                  <li>✅ Custom Integration</li>
                  <li>✅ Unlimited Requests</li>
                  <li>✅ Dedicated Support</li>
                  <li>✅ Custom Reports</li>
                </ul>
                <button class="btn-primary">Contact Sales</button>
              </div>
            </div>
          </div>
        `,
        mount: () => Promise.resolve()
      };
    }
  
    // Utility methods
    showLoading() {
      const container = document.getElementById('app-container') || 
                      document.getElementById('main-content') || 
                      document.body;
      
      container.innerHTML = `
        <div class="loading-screen">
          <div class="loading-spinner">🔄</div>
          <div class="loading-text">Loading...</div>
        </div>
      `;
    }
  
    showError(message) {
      const container = document.getElementById('app-container') || 
                      document.getElementById('main-content') || 
                      document.body;
      
      container.innerHTML = `
        <div class="error-screen">
          <div class="error-icon">❌</div>
          <div class="error-message">${message}</div>
          <button class="btn-primary" onclick="kamRouter.navigate('/dashboard')">
            Return to Dashboard
          </button>
        </div>
      `;
    }
  
    getCurrentRoute() {
      return this.currentRoute;
    }
  
    getAvailableRoutes() {
      const available = [];
      
      for (const [path, route] of this.routes.entries()) {
        if (this.checkRouteAccess({ ...route, path })) {
          available.push({ path, title: route.title });
        }
      }
      
      return available;
    }
  }
  
  // Global instance
  window.kamRouter = new KAMRouter();
  
  // Auto-initialize when KAM context is ready
  document.addEventListener('DOMContentLoaded', async () => {
    // Wait for KAM context to be available
    const waitForKAM = () => {
      return new Promise((resolve) => {
        if (window.kamContext) {
          resolve(window.kamContext);
        } else {
          setTimeout(() => waitForKAM().then(resolve), 100);
        }
      });
    };
  
    const kamContext = await waitForKAM();
    await window.kamRouter.initialize(kamContext);
  });
  
  console.log('✅ KAM Router loaded successfully');