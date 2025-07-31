// public/js/core/kam-router.js
// Phase 4: KAM-Based Router - Permission-aware routing with lazy loading
// FIXED: Removed export syntax for browser compatibility

class KAMRouter {
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

    // In registerRoutes() method, add:
    this.routes.set('/workers/universal-researcher', {
      component: () => this.loadWorkerInterface('universal-researcher'),
      permissions: ['worker_access'],
      tiers: ['basic', 'standard', 'premium', 'enterprise'],
      title: 'Universal Researcher'
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
      // Skip tier check for admin users
      if (this.kamContext.userType === 'admin' || this.kamContext.userType === 'internal') {
        return true;
      }
      
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
    // For now, return the same as admin dashboard but filtered
    return this.loadAdminDashboard();
  }

  async loadAdminDashboard() {
    // Use existing admin dashboard but ensure it's enhanced with Phase 3
    if (window.adminDashboard) {
      return {
        render: () => {
          // Return current admin dashboard HTML
          const dashboardElement = document.querySelector('.admin-dashboard-content');
          return dashboardElement ? dashboardElement.outerHTML : this.getDefaultAdminDashboard();
        },
        mount: () => Promise.resolve()
      };
    }

    return {
      render: () => this.getDefaultAdminDashboard(),
      mount: async () => {
        // Initialize existing admin dashboard
        if (window.AdminDashboard && !window.adminDashboard) {
          window.adminDashboard = new window.AdminDashboard();
          await window.adminDashboard.initialize();
        }
      }
    };
  }

  getDefaultAdminDashboard() {
    return `
      <div class="admin-dashboard">
        <header class="dashboard-header">
          <h1>🎛️ Admin Dashboard</h1>
          <div class="header-actions">
            <button class="btn-secondary" onclick="window.adminDashboard?.refresh()">🔄 Refresh</button>
            <button class="btn-secondary" onclick="logout()">🚪 Logout</button>
          </div>
        </header>
        
        <div id="admin-dashboard-content" class="admin-dashboard-content">
          <div class="loading-state">
            <div class="loading-spinner">🔄</div>
            <p>Loading dashboard components...</p>
          </div>
        </div>
      </div>
    `;
  }

  async loadWorkerInterface(workerId) {
    try {
      console.log(`🔧 Loading worker interface: ${workerId}`);
      
      // Check if worker exists in current system
      if (window.phase3Manager) {
        const interfaceComponent = await window.phase3Manager.loadWorkerInterface(workerId, this.kamContext);
        if (interfaceComponent) {
          return interfaceComponent;
        }
      }

      // Fallback: Check if worker is available globally
      const workerClasses = {
        'topic-researcher': window.TopicResearcher,
        'content-classifier': window.ContentClassifier,
        'report-builder': window.ReportBuilder
      };

      const WorkerClass = workerClasses[workerId];
      if (WorkerClass) {
        const workerInstance = new WorkerClass();
        return {
          render: () => workerInstance.renderInterface ? workerInstance.renderInterface() : this.getWorkerFallback(workerId),
          mount: () => workerInstance.mount ? workerInstance.mount() : Promise.resolve()
        };
      }

      // Final fallback
      return this.getWorkerFallback(workerId);

    } catch (error) {
      console.error(`Failed to load worker interface: ${workerId}`, error);
      return this.getWorkerFallback(workerId);
    }
  }

  getWorkerFallback(workerId) {
    return {
      render: () => `
        <div class="worker-interface-fallback">
          <header class="worker-header">
            <button class="btn-back" onclick="kamRouter.navigate('/dashboard')">← Back to Dashboard</button>
            <h1>🔧 ${workerId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</h1>
          </header>
          
          <div class="worker-content">
            <div class="loading-state">
              <div class="loading-icon">🔄</div>
              <h3>Loading Interface...</h3>
              <p>Please wait while we load the ${workerId} interface.</p>
            </div>
            
            <div class="worker-actions">
              <button class="btn-primary" onclick="window.location.reload()">🔄 Reload Page</button>
              <button class="btn-secondary" onclick="kamRouter.navigate('/dashboard')">🏠 Return to Dashboard</button>
            </div>
          </div>
        </div>
      `,
      mount: () => Promise.resolve()
    };
  }

  async loadReportsPage() {
    return {
      render: () => `
        <div class="reports-page">
          <header class="page-header">
            <button class="btn-back" onclick="kamRouter.navigate('/dashboard')">← Back to Dashboard</button>
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
            <button class="btn-back" onclick="kamRouter.navigate('/dashboard')">← Back to Dashboard</button>
            <h1>⚙️ Account Settings</h1>
          </header>
          
          <div class="account-sections">
            <section class="account-section">
              <h2>Company Information</h2>
              <div class="form-group">
                <label>Company Name</label>
                <input type="text" value="${client?.company_name || 'Not provided'}" readonly>
              </div>
              <div class="form-group">
                <label>Subscription Tier</label>
                <input type="text" value="${client?.subscription_tier?.toUpperCase() || 'BASIC'}" readonly>
              </div>
              <div class="form-group">
                <label>Monthly Budget</label>
                <input type="text" value="$${client?.monthly_budget_usd || '0'}" readonly>
              </div>
            </section>
            
            <section class="account-section">
              <h2>Usage & Billing</h2>
              <div class="usage-stats">
                <div class="stat">
                  <span class="label">Used This Month</span>
                  <span class="value">$${client?.used_budget_current_month || '0'}</span>
                </div>
                <div class="stat">
                  <span class="label">Remaining Budget</span>
                  <span class="value">$${(client?.monthly_budget_usd || 0) - (client?.used_budget_current_month || 0)}</span>
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
    const client = this.kamContext.clientProfile;
    
    return {
      render: () => `
        <div class="billing-page">
          <header class="page-header">
            <button class="btn-back" onclick="kamRouter.navigate('/dashboard')">← Back to Dashboard</button>
            <h1>💳 Billing & Usage</h1>
          </header>
          
          <div class="billing-overview">
            <div class="billing-card">
              <h3>Current Period</h3>
              <div class="billing-stats">
                <div class="stat">
                  <span class="value">$${client?.used_budget_current_month || '0'}</span>
                  <span class="label">Used this month</span>
                </div>
                <div class="stat">
                  <span class="value">$${client?.monthly_budget_usd || '0'}</span>
                  <span class="label">Monthly limit</span>
                </div>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${((client?.used_budget_current_month || 0) / (client?.monthly_budget_usd || 1)) * 100}%"></div>
              </div>
            </div>
            
            <div class="billing-card">
              <h3>Usage Breakdown</h3>
              <div class="usage-list">
                <div class="usage-item">
                  <span>Research Requests</span>
                  <span>$${((client?.used_budget_current_month || 0) * 0.7).toFixed(2)}</span>
                </div>
                <div class="usage-item">
                  <span>Report Generation</span>
                  <span>$${((client?.used_budget_current_month || 0) * 0.2).toFixed(2)}</span>
                </div>
                <div class="usage-item">
                  <span>Content Analysis</span>
                  <span>$${((client?.used_budget_current_month || 0) * 0.1).toFixed(2)}</span>
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
            <p class="error-details">Your current subscription tier: <strong>${this.kamContext.clientProfile?.subscription_tier?.toUpperCase() || 'BASIC'}</strong></p>
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
    const currentTier = this.kamContext.clientProfile?.subscription_tier || 'none';
    
    return {
      render: () => `
        <div class="upgrade-page">
          <header class="page-header">
            <button class="btn-back" onclick="kamRouter.navigate('/dashboard')">← Back to Dashboard</button>
            <h1>⬆️ Upgrade Your Plan</h1>
            <p>Unlock more powerful features and higher usage limits</p>
            <p class="current-plan">Current Plan: <strong>${currentTier.toUpperCase()}</strong></p>
          </header>
          
          <div class="pricing-tiers">
            <div class="tier-card ${currentTier === 'standard' ? 'current' : ''}">
              <h3>Standard</h3>
              <div class="price">$99/month</div>
              <ul class="features">
                <li>✅ Topic Research</li>
                <li>✅ Content Classification</li>
                <li>✅ Basic Reports</li>
                <li>✅ 1,000 requests/month</li>
              </ul>
              <button class="btn-primary" ${currentTier === 'standard' ? 'disabled' : ''}>
                ${currentTier === 'standard' ? 'Current Plan' : 'Choose Standard'}
              </button>
            </div>
            
            <div class="tier-card featured ${currentTier === 'premium' ? 'current' : ''}">
              <div class="popular-badge">Most Popular</div>
              <h3>Premium</h3>
              <div class="price">$199/month</div>
              <ul class="features">
                <li>✅ Everything in Standard</li>
                <li>✅ Advanced Reports</li>
                <li>✅ API Access</li>
                <li>✅ 5,000 requests/month</li>
                <li>✅ Priority Support</li>
              </ul>
              <button class="btn-primary" ${currentTier === 'premium' ? 'disabled' : ''}>
                ${currentTier === 'premium' ? 'Current Plan' : 'Choose Premium'}
              </button>
            </div>
            
            <div class="tier-card ${currentTier === 'enterprise' ? 'current' : ''}">
              <h3>Enterprise</h3>
              <div class="price">Contact Us</div>
              <ul class="features">
                <li>✅ Everything in Premium</li>
                <li>✅ Custom Integration</li>
                <li>✅ Unlimited Requests</li>
                <li>✅ Dedicated Support</li>
                <li>✅ Custom Reports</li>
              </ul>
              <button class="btn-primary" ${currentTier === 'enterprise' ? 'disabled' : ''}>
                ${currentTier === 'enterprise' ? 'Current Plan' : 'Contact Sales'}
              </button>
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

// Global instance - NO EXPORT SYNTAX
window.KAMRouter = KAMRouter;
window.kamRouter = new KAMRouter();

// Auto-initialize when KAM context is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎯 KAM Router: Waiting for KAM context...');
  
  // Wait for KAM context to be available
  const waitForKAM = () => {
    return new Promise((resolve) => {
      if (window.kamContext?.initialized) {
        resolve(window.kamContext);
      } else {
        setTimeout(() => waitForKAM().then(resolve), 100);
      }
    });
  };

  try {
    const kamContext = await waitForKAM();
    await window.kamRouter.initialize(kamContext);
    console.log('✅ KAM Router initialized successfully');
  } catch (error) {
    console.error('❌ KAM Router initialization failed:', error);
  }
});

console.log('✅ KAM Router script loaded successfully');