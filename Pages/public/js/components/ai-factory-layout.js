/**
 * AI Factory Layout Component - Clean Version
 * Main layout following UX Standards Manual - NO SEARCH, CLEAN STRUCTURE
 */
class AIFactoryLayout {
    constructor(config = {}) {
        this.config = {
            userType: 'admin',
            user: null,
            onNavigate: null,
            ...config
        };
        
        this.sidebarOpen = false;
        this.currentPath = '/dashboard';
        this.userMenuOpen = false;
        
        // Bind methods for event handlers
        this.toggleSidebar = this.toggleSidebar.bind(this);
        this.toggleUserMenu = this.toggleUserMenu.bind(this);
        this.navigate = this.navigate.bind(this);
        this.handleResize = this.handleResize.bind(this);
        
        // Add resize listener for responsive behavior
        window.addEventListener('resize', this.handleResize);
    }

    /**
     * Render the complete layout structure per UX Manual
     */
    render() {
        return `
            <div class="ai-factory-layout">
                ${this.renderSidebar()}
                <div class="ai-factory-main">
                    ${this.renderTopHeader()}
                    ${this.renderMainContent()}
                </div>
            </div>
        `;
    }

    /**
     * Render sidebar with navigation sections per UX Manual
     */
    renderSidebar() {
        const navigationSections = this.getNavigationSections();
        
        return `
            <div class="ai-factory-sidebar ${this.sidebarOpen ? 'mobile-open' : ''}" id="ai-factory-sidebar">
                <!-- Brand Section -->
                <div class="sidebar-brand">
                    <div class="sidebar-logo">🏭</div>
                    <h1 class="sidebar-title">AI Factory</h1>
                </div>

                <!-- Navigation per UX Manual Structure -->
                <nav class="sidebar-nav">
                    ${navigationSections.map(section => `
                        <div class="nav-section">
                            <div class="nav-section-title">${section.title}</div>
                            <ul class="nav-items">
                                ${section.items.map(item => `
                                    <li class="nav-item">
                                        <a href="#" 
                                           class="nav-link ${item.path === this.currentPath ? 'active' : ''}"
                                           data-route="${item.path}"
                                           ${item.disabled ? 'disabled' : ''}
                                           onclick="aiFactoryLayout.navigate('${item.path}'); return false;">
                                            <span class="nav-icon">${item.icon}</span>
                                            ${item.label}
                                            ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
                                        </a>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </nav>

                <!-- User Section -->
                <div class="sidebar-user">
                    <div class="user-info">
                        <div class="user-name">${this.getUserDisplayName()}</div>
                        <div class="user-role">${this.config.userType}</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render top header bar per UX Manual
     */
    renderTopHeader() {
        return `
            <div class="ai-factory-header">
                <!-- Mobile menu button -->
                <button class="mobile-menu-btn" onclick="aiFactoryLayout.toggleSidebar()">
                    ☰
                </button>
                
                <!-- Header title -->
                <div class="header-title">
                    <span class="header-page-name" id="header-page-name">Dashboard</span>
                </div>
                
                <!-- Header actions -->
                <div class="header-actions">
                    <!-- Notifications (placeholder) -->
                    <button class="header-btn" onclick="aiFactoryLayout.showNotifications()" title="Notifications">
                        🔔
                    </button>
                    
                    <!-- User menu -->
                    <div class="user-menu">
                        <button class="user-menu-trigger" onclick="aiFactoryLayout.toggleUserMenu()">
                            <div class="user-avatar">${this.getUserDisplayName().charAt(0)}</div>
                            <div class="user-info">
                                <div class="user-name">${this.getUserDisplayName()}</div>
                                <div class="user-role">${this.getUserRoleDisplay()}</div>
                            </div>
                            <span class="user-chevron">▼</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render main content area
     */
    renderMainContent() {
        return `
            <div class="ai-factory-content" id="main-content">
                <!-- Content will be loaded here by router -->
                <div class="route-content" id="route-content">
                    <!-- Router content loads here -->
                </div>
            </div>
        `;
    }

    /**
     * Get navigation sections per UX Manual - DIFFERENT FOR ADMIN VS CLIENT
     */
    getNavigationSections() {
        if (this.config.userType === 'admin') {
            // ADMIN NAVIGATION - Full access
            return [
                {
                    title: 'Main Section',
                    items: [
                        { path: '/dashboard', icon: '📊', label: 'Dashboard' },
                        { path: '/clients', icon: '👥', label: 'Client Management' },
                        { path: '/requests', icon: '📋', label: 'Request Management' },
                        { path: '/templates', icon: '🎯', label: 'Template Manager' },
                        { path: '/reports', icon: '📄', label: 'Reports', disabled: true }
                    ]
                },
                {
                    title: 'AI Workers',
                    items: [
                        { path: '/granulation', icon: '🧱', label: 'Content Granulator' }
                    ]
                },
                {
                    title: 'Management',
                    items: [
                        { path: '/users', icon: '👤', label: 'User Management' },
                        { path: '/billing', icon: '💳', label: 'Billing', disabled: true },
                        { path: '/analytics', icon: '📈', label: 'Analytics', disabled: true },
                        { path: '/settings', icon: '⚙️', label: 'Settings', disabled: true }
                    ]
                }
            ];
        } else {
            // CLIENT NAVIGATION - Limited access, personal focus
            return [
                {
                    title: 'My Account',
                    items: [
                        { path: '/my-account', icon: '👤', label: 'Account Overview' },
                        { path: '/my-reports', icon: '📋', label: 'My Reports', disabled: true },
                        { path: '/billing', icon: '💳', label: 'Billing & Usage', disabled: true }
                    ]
                },
                {
                    title: 'AI Services',
                    items: [
                        { path: '/workers/universal-researcher', icon: '🔍', label: 'Research Tools', disabled: true },
                        { path: '/workers/content-classifier', icon: '🏷️', label: 'Content Tools', disabled: true },
                        { path: '/workers/report-builder', icon: '📑', label: 'Report Tools', disabled: true }
                    ]
                },
                {
                    title: 'Support',
                    items: [
                        { path: '/help', icon: '❓', label: 'Help & Docs', disabled: true },
                        { path: '/contact', icon: '📧', label: 'Contact Support', disabled: true }
                    ]
                }
            ];
        }
    }

    /**
     * Load user management page - ADMIN ONLY
     */
    async loadUserManagement(contentArea) {
        console.log('👥 Loading User Management...');
        
        if (window.UsersPage) {
            // Use the new users management component
            window.usersPage = new UsersPage(window.apiClient);
            contentArea.innerHTML = window.usersPage.render();
            await window.usersPage.mount();
            return;
        }
        
        // Fallback to simple placeholder
        contentArea.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">👥 User Management</h1>
                <div class="page-actions">
                    <button class="btn btn-secondary" onclick="aiFactoryLayout.refreshUserManagement()">
                        🔄 Refresh
                    </button>
                    <button class="btn btn-primary" onclick="aiFactoryLayout.showAddUser()">
                        ➕ Add User
                    </button>
                </div>
            </div>

            <!-- User Management Stats -->
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">12</div>
                    <div class="metric-label">Total Users</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">8</div>
                    <div class="metric-label">Active Users</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">3</div>
                    <div class="metric-label">Administrators</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">2</div>
                    <div class="metric-label">New This Month</div>
                </div>
            </div>

            <!-- User Management Interface -->
            <div class="info-grid" style="margin-top: 2rem;">
                <div class="info-section">
                    <h3>👤 Recent Users</h3>
                    <div class="info-content">
                        <div class="user-list">
                            <div class="user-item" style="display: flex; align-items: center; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; margin-bottom: 0.5rem;">
                                <div class="user-avatar" style="width: 32px; height: 32px; background: var(--primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.875rem; margin-right: 0.75rem;">A</div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 500;">Administrator</div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary);">admin@company.com</div>
                                </div>
                                <span class="status-badge status-active">Admin</span>
                            </div>
                            
                            <div class="user-item" style="display: flex; align-items: center; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; margin-bottom: 0.5rem;">
                                <div class="user-avatar" style="width: 32px; height: 32px; background: var(--success); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.875rem; margin-right: 0.75rem;">J</div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 500;">John Smith</div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary);">john@techcorp.com</div>
                                </div>
                                <span class="status-badge status-active">Client</span>
                            </div>
                            
                            <div class="user-item" style="display: flex; align-items: center; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; margin-bottom: 0.5rem;">
                                <div class="user-avatar" style="width: 32px; height: 32px; background: var(--warning); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.875rem; margin-right: 0.75rem;">S</div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 500;">Sarah Johnson</div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary);">sarah@global.com</div>
                                </div>
                                <span class="status-badge status-active">Client</span>
                            </div>
                        </div>
                        <div style="margin-top: 1rem;">
                            <button class="btn btn-secondary btn-small">View All Users</button>
                        </div>
                    </div>
                </div>

                <div class="info-section">
                    <h3>🔐 User Roles</h3>
                    <div class="info-content">
                        <div class="info-item">
                            <label>System Administrator</label>
                            <span>Full system access & user management</span>
                        </div>
                        <div class="info-item">
                            <label>Client User</label>
                            <span>Personal account access only</span>
                        </div>
                        <div class="info-item">
                            <label>Support User</label>
                            <span>Limited admin access for support</span>
                        </div>
                        <div style="margin-top: 1rem;">
                            <button class="btn btn-secondary btn-small">Manage Roles</button>
                        </div>
                    </div>
                </div>

                <div class="info-section">
                    <h3>📊 User Activity</h3>
                    <div class="info-content">
                        <div class="info-item">
                            <label>Active Sessions</label>
                            <span>8 users online now</span>
                        </div>
                        <div class="info-item">
                            <label>Last 24 Hours</label>
                            <span>24 logins</span>
                        </div>
                        <div class="info-item">
                            <label>Failed Logins</label>
                            <span>2 attempts</span>
                        </div>
                        <div style="margin-top: 1rem;">
                            <button class="btn btn-secondary btn-small">View Activity Log</button>
                        </div>
                    </div>
                </div>

                <div class="info-section">
                    <h3>⚙️ User Settings</h3>
                    <div class="info-content">
                        <div class="info-item">
                            <label>Password Policy</label>
                            <span>
                                <button class="btn btn-secondary btn-small">Configure</button>
                            </span>
                        </div>
                        <div class="info-item">
                            <label>Session Timeout</label>
                            <span>
                                <select style="padding: 0.25rem; border: 1px solid var(--border); border-radius: 4px;">
                                    <option>30 minutes</option>
                                    <option>1 hour</option>
                                    <option>4 hours</option>
                                    <option>8 hours</option>
                                </select>
                            </span>
                        </div>
                        <div class="info-item">
                            <label>Two-Factor Auth</label>
                            <span>
                                <input type="checkbox" style="margin-right: 0.5rem;">
                                Required for admins
                            </span>
                        </div>
                        <div style="margin-top: 1rem;">
                            <button class="btn btn-primary btn-small">Save Settings</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get user display name - IMPROVED FORMATTING
     */
    getUserDisplayName() {
        const user = this.config.user;
        const kamContext = window.sessionManager?.sessionData?.kamContext;
        
        // Method 1: Use full name if available
        if (user?.fullName || user?.full_name) {
            return user.fullName || user.full_name;
        }
        
        // Method 2: Construct from first/last name
        if (user?.firstName && user?.lastName) {
            return `${user.firstName} ${user.lastName}`;
        }
        
        // Method 3: Use company name for business accounts
        if (kamContext?.company_name && kamContext.company_name !== 'AI Factory Admin') {
            return kamContext.company_name;
        }
        
        // Method 4: Clean up email display
        if (user?.email) {
            const email = user.email;
            // Extract name part before @ and clean it up
            const localPart = email.split('@')[0];
            // Convert admin/info/support emails to proper names
            if (localPart === 'admin') return 'Administrator';
            if (localPart === 'info') return 'Information';
            if (localPart === 'support') return 'Support';
            // Capitalize and clean up other emails
            return localPart.split('.').map(part => 
                part.charAt(0).toUpperCase() + part.slice(1)
            ).join(' ');
        }
        
        // Method 5: Use username with cleanup
        if (user?.username) {
            const username = user.username;
            if (username === 'admin') return 'Administrator';
            return username.charAt(0).toUpperCase() + username.slice(1);
        }
        
        // Fallback
        return 'User';
    }

    /**
     * Get user role display
     */
    getUserRoleDisplay() {
        const user = this.config.user;
        const kamContext = window.sessionManager?.sessionData?.kamContext;
        
        // Check for admin role
        if (this.config.userType === 'admin' || kamContext?.is_admin) {
            return 'Administrator';
        }
        
        // Check subscription tier for clients
        if (kamContext?.subscription_tier) {
            const tier = kamContext.subscription_tier;
            const tierNames = {
                'basic': 'Basic Plan',
                'standard': 'Standard Plan', 
                'premium': 'Premium Plan',
                'enterprise': 'Enterprise Plan'
            };
            return tierNames[tier] || 'Client';
        }
        
        // Check explicit role
        if (user?.role) {
            return user.role.charAt(0).toUpperCase() + user.role.slice(1);
        }
        
        return 'Client';
    }

    /**
     * Mount the layout and set up event listeners
     */
    async mount() {
        console.log('🏗️ Mounting AI Factory Layout...');
        
        // Set up mobile menu overlay
        this.setupMobileOverlay();
        
        // Set up user menu
        this.setupUserMenu();
        
        // Initialize with dashboard
        await this.navigate('/dashboard');
        
        console.log('✅ AI Factory Layout mounted');
    }

    /**
     * Setup mobile overlay for sidebar
     */
    setupMobileOverlay() {
        // Add overlay for mobile
        if (!document.getElementById('mobile-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'mobile-overlay';
            overlay.className = 'mobile-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 999;
                display: none;
            `;
            overlay.onclick = () => this.toggleSidebar();
            document.body.appendChild(overlay);
        }
    }

    /**
     * Setup user menu functionality - IMPROVED PROFESSIONAL MENU
     */
    setupUserMenu() {
        // Create user menu dropdown if it doesn't exist
        if (!document.getElementById('user-menu-dropdown')) {
            const userMenu = document.createElement('div');
            userMenu.id = 'user-menu-dropdown';
            userMenu.className = 'user-menu-dropdown';
            userMenu.style.cssText = `
                position: fixed;
                top: 70px;
                right: 20px;
                background: white;
                border: 1px solid var(--border);
                border-radius: var(--radius-lg);
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                min-width: 220px;
                z-index: 1000;
                display: none;
                overflow: hidden;
            `;
            
            const userName = this.getUserDisplayName();
            const userRole = this.getUserRoleDisplay();
            const userEmail = this.config.user?.email || 'user@company.com';
            
            userMenu.innerHTML = `
                <!-- User Info Header -->
                <div class="user-menu-header" style="padding: 1rem; background: linear-gradient(135deg, var(--primary) 0%, #1d4ed8 100%); color: white;">
                    <div class="user-menu-avatar" style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 1.125rem; margin-bottom: 0.5rem;">
                        ${userName.charAt(0)}
                    </div>
                    <div class="user-menu-name" style="font-weight: 600; font-size: 0.875rem; margin-bottom: 0.25rem;">
                        ${userName}
                    </div>
                    <div class="user-menu-role" style="font-size: 0.75rem; opacity: 0.9;">
                        ${userRole}
                    </div>
                    <div class="user-menu-email" style="font-size: 0.75rem; opacity: 0.8; margin-top: 0.25rem;">
                        ${userEmail}
                    </div>
                </div>
                
                <!-- Menu Items -->
                <div class="user-menu-body" style="padding: 0.5rem 0;">
                    <div class="user-menu-section">
                        <div class="user-menu-item" onclick="aiFactoryLayout.showProfile()" style="display: flex; align-items: center; padding: 0.75rem 1rem; cursor: pointer; transition: background 0.2s ease; font-size: 0.875rem;">
                            <span style="margin-right: 0.75rem; font-size: 1rem;">👤</span>
                            <div>
                                <div style="font-weight: 500;">View Profile</div>
                                <div style="font-size: 0.75rem; color: var(--text-secondary);">Personal information & preferences</div>
                            </div>
                        </div>
                        
                        <div class="user-menu-item" onclick="aiFactoryLayout.showAccountSettings()" style="display: flex; align-items: center; padding: 0.75rem 1rem; cursor: pointer; transition: background 0.2s ease; font-size: 0.875rem;">
                            <span style="margin-right: 0.75rem; font-size: 1rem;">⚙️</span>
                            <div>
                                <div style="font-weight: 500;">Account Settings</div>
                                <div style="font-size: 0.75rem; color: var(--text-secondary);">Security & notification settings</div>
                            </div>
                        </div>
                        
                        ${this.config.userType === 'admin' ? `
                        <div class="user-menu-item" onclick="aiFactoryLayout.navigate('/users')" style="display: flex; align-items: center; padding: 0.75rem 1rem; cursor: pointer; transition: background 0.2s ease; font-size: 0.875rem;">
                            <span style="margin-right: 0.75rem; font-size: 1rem;">👥</span>
                            <div>
                                <div style="font-weight: 500;">User Management</div>
                                <div style="font-size: 0.75rem; color: var(--text-secondary);">Manage system users</div>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="user-menu-divider" style="height: 1px; background: var(--border); margin: 0.5rem 0;"></div>
                    
                    <div class="user-menu-section">
                        <div class="user-menu-item" onclick="aiFactoryLayout.showHelp()" style="display: flex; align-items: center; padding: 0.75rem 1rem; cursor: pointer; transition: background 0.2s ease; font-size: 0.875rem;">
                            <span style="margin-right: 0.75rem; font-size: 1rem;">❓</span>
                            <div>
                                <div style="font-weight: 500;">Help & Support</div>
                                <div style="font-size: 0.75rem; color: var(--text-secondary);">Documentation & contact support</div>
                            </div>
                        </div>
                        
                        <div class="user-menu-item" onclick="aiFactoryLayout.logout()" style="display: flex; align-items: center; padding: 0.75rem 1rem; cursor: pointer; transition: background 0.2s ease; font-size: 0.875rem; color: var(--error);">
                            <span style="margin-right: 0.75rem; font-size: 1rem;">🚪</span>
                            <div>
                                <div style="font-weight: 500;">Sign Out</div>
                                <div style="font-size: 0.75rem; opacity: 0.8;">End current session</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Add hover effects
            userMenu.addEventListener('mouseover', (e) => {
                if (e.target.closest('.user-menu-item') && !e.target.closest('.user-menu-item').onclick.toString().includes('logout')) {
                    e.target.closest('.user-menu-item').style.background = 'var(--background)';
                }
            });
            
            userMenu.addEventListener('mouseout', (e) => {
                if (e.target.closest('.user-menu-item')) {
                    e.target.closest('.user-menu-item').style.background = 'transparent';
                }
            });
            
            document.body.appendChild(userMenu);
        }
    }

    /**
     * Navigate to a route
     */
    async navigate(path) {
        console.log(`🧭 Navigating to: ${path}`);
        
        this.currentPath = path;
        this.updateActiveNavigation();
        this.updateHeaderTitle(path);
        
        // Get content area
        const contentArea = document.getElementById('route-content');
        if (!contentArea) {
            console.error('Route content area not found');
            return;
        }

        // Show loading
        contentArea.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner">🔄</div>
                <div class="loading-text">Loading...</div>
            </div>
        `;

        try {
            switch (path) {
                case '/dashboard':
                    await this.loadDashboard(contentArea);
                    break;
                case '/clients':
                    // ADMIN ONLY - redirect clients to their account
                    if (this.config.userType !== 'admin') {
                        await this.navigate('/my-account');
                        return;
                    }
                    await this.loadClientsPage(contentArea);
                    break;
                case '/my-account':
                    // CLIENT ROUTE - show their own account
                    await this.loadMyAccount(contentArea);
                    break;
                case '/users':
                    // ADMIN ONLY - user management
                    if (this.config.userType !== 'admin') {
                        await this.navigate('/my-account');
                        return;
                    }
                    await this.loadUserManagement(contentArea);
                    break;
                case '/requests':
                    // ADMIN ONLY - request management
                    if (this.config.userType !== 'admin') {
                        await this.navigate('/my-account');
                        return;
                    }
                    await this.loadRequestsPage(contentArea);
                    break;
                case '/templates':
                    // ADMIN ONLY - template management
                    if (this.config.userType !== 'admin') {
                        await this.navigate('/my-account');
                        return;
                    }
                    await this.loadTemplateManager(contentArea);
                    break;
                case '/granulation':
                    // ADMIN ONLY - content granulator
                    if (this.config.userType !== 'admin') {
                        await this.navigate('/my-account');
                        return;
                    }
                    await this.loadGranulation(contentArea);
                    break;
                default:
                    // Check if it's a client detail route with dynamic ID
                    if (path.startsWith('/clients/') && path.split('/').length === 3) {
                        // ADMIN can view any client, CLIENT redirected to own account
                        if (this.config.userType !== 'admin') {
                            await this.navigate('/my-account');
                            return;
                        }
                        const clientId = this.extractClientId(path);
                        console.log(`📋 Loading client detail for: ${clientId}`);
                        await this.loadClientDetail(contentArea, clientId);
                    } 
                    // Check if it's a worker route
                    else if (path.startsWith('/workers/')) {
                        const workerName = path.split('/')[2];
                        await this.loadWorkerPage(contentArea, workerName);
                    } 
                    else {
                        this.loadPlaceholderContent(contentArea, path);
                    }
            }
        } catch (error) {
            console.error('Navigation error:', error);
            this.showNavigationError(contentArea, path, error);
        }
    }

    /**
     * Load dashboard content
     */
    async loadDashboard(contentArea) {
        if (window.DashboardPage) {
            // Use the new dashboard component
            window.dashboardPage = new DashboardPage(window.apiClient);
            contentArea.innerHTML = window.dashboardPage.render();
            await window.dashboardPage.mount();
            return;
        }
        
        // Fallback: render the old dashboard structure with loading placeholders
        contentArea.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">📊 Dashboard</h1>
                <div class="page-actions">
                    <button class="btn btn-secondary" onclick="aiFactoryLayout.refreshDashboard()">
                        🔄 Refresh
                    </button>
                </div>
            </div>
    
            <!-- Dashboard Stats -->
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value" id="total-clients">⏳</div>
                    <div class="metric-label">Total Clients</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value" id="monthly-revenue">⏳</div>
                    <div class="metric-label">Monthly Revenue</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value" id="requests-today">⏳</div>
                    <div class="metric-label">Requests Today</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value" id="system-uptime">⏳</div>
                    <div class="metric-label">System Uptime</div>
                </div>
            </div>
    
            <!-- Quick Actions -->
            <div class="info-grid" style="margin-top: 2rem;">
                <div class="info-section">
                    <h3>👥 Client Management</h3>
                    <div class="info-content">
                        <p>Manage client accounts and view detailed information.</p>
                        <button class="btn btn-primary" onclick="aiFactoryLayout.navigate('/clients')">
                            View All Clients
                        </button>
                    </div>
                </div>
                
                <div class="info-section">
                    <h3>📊 System Status</h3>
                    <div class="info-content">
                        <p>All AI workers are operational and ready to process requests.</p>
                        <div class="service-list">
                            <span class="service-tag">✅ Session Manager</span>
                            <span class="service-tag">✅ Context Manager</span>
                            <span class="service-tag">✅ Router</span>
                        </div>
                    </div>
                </div>
                
                <div class="info-section">
                    <h3>🚀 Quick Start</h3>
                    <div class="info-content">
                        <p>Get started with the AI Factory platform.</p>
                        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                            <button class="btn btn-secondary btn-small" onclick="alert('Coming soon!')">
                                📋 View Documentation
                            </button>
                            <button class="btn btn-secondary btn-small" onclick="alert('Coming soon!')">
                                🎯 Run Tutorial
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    
        // Now load real data from API
        try {
            console.log('📊 Loading dashboard stats...');
            
            const result = await window.apiClient.kamRequest('/dashboard/stats', 'GET');
            
            if (result.success && result.stats) {
                // Update with real data
                document.getElementById('total-clients').textContent = result.stats.clients.total;
                document.getElementById('monthly-revenue').textContent = '$' + result.stats.revenue.monthly_total.toLocaleString();
                document.getElementById('requests-today').textContent = result.stats.usage.requests_today;
                document.getElementById('system-uptime').textContent = result.stats.system.uptime_percentage + '%';
                
                console.log('✅ Dashboard loaded with real data');
            } else {
                throw new Error('Invalid API response');
            }
            
        } catch (error) {
            console.error('❌ Failed to load dashboard stats:', error);
            
            // Show error state
            document.getElementById('total-clients').textContent = '❌';
            document.getElementById('monthly-revenue').textContent = '❌';
            document.getElementById('requests-today').textContent = '❌';
            document.getElementById('system-uptime').textContent = '❌';
            
            // Optionally show error message
            const metricsGrid = document.querySelector('.metrics-grid');
            if (metricsGrid) {
                const errorDiv = document.createElement('div');
                errorDiv.style.gridColumn = '1 / -1';
                errorDiv.style.textAlign = 'center';
                errorDiv.style.color = '#e74c3c';
                errorDiv.style.marginTop = '1rem';
                errorDiv.innerHTML = '⚠️ Failed to load dashboard data. <button onclick="aiFactoryLayout.refreshDashboard()" style="margin-left: 1rem;">Retry</button>';
                metricsGrid.appendChild(errorDiv);
            }
        }
    }
    /**
     * Load clients page - ADMIN ONLY
     */
    async loadClientsPage(contentArea) {
        if (window.ClientsPage) {
            // Create and mount clients page
            window.clientsPage = new ClientsPage(window.apiClient);
            contentArea.innerHTML = window.clientsPage.render();
            await window.clientsPage.mount();
        } else {
            contentArea.innerHTML = `
                <div class="error-state">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <h3>Component Not Loaded</h3>
                    <p>ClientsPage component is not available.</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">
                        🔄 Reload Page
                    </button>
                </div>
            `;
        }
    }

    /**
     * Load my account page - CLIENT VIEW
     */
    async loadMyAccount(contentArea) {
        console.log('📋 Loading My Account...');
        
        // Get client ID from session context
        let clientId = null;
        if (window.sessionManager?.sessionData?.kamContext?.client_id) {
            clientId = window.sessionManager.sessionData.kamContext.client_id;
            console.log(`👤 Found client ID: ${clientId}`);
        } else {
            console.warn('⚠️ No client ID found in session context');
            // Try to get from fallback or use default
            clientId = 'client_1'; // Fallback for testing
        }

        if (window.ClientDetailPage) {
            try {
                // Create and mount client detail page for their own account
                window.clientDetailPage = new ClientDetailPage(window.apiClient, clientId);
                contentArea.innerHTML = window.clientDetailPage.render();
                await window.clientDetailPage.mount();
                console.log('✅ My Account loaded successfully');
            } catch (error) {
                console.error('❌ Failed to load My Account:', error);
                this.showMyAccountError(contentArea, error);
            }
        } else {
            console.error('❌ ClientDetailPage component not loaded');
            contentArea.innerHTML = `
                <div class="error-state">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <h3>Component Not Loaded</h3>
                    <p>Account details component is not available.</p>
                    <div class="error-actions">
                        <button class="btn btn-primary" onclick="window.location.reload()">
                            🔄 Reload Page
                        </button>
                        <button class="btn btn-secondary" onclick="window.contactSupport()">
                            📧 Contact Support
                        </button>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Load client detail page - ADMIN ONLY
     */
    async loadClientDetail(contentArea, clientId) {
        console.log(`📋 Loading client detail for: ${clientId}`);
        
        if (window.ClientDetailPage) {
            try {
                // Create and mount client detail page
                window.clientDetailPage = new ClientDetailPage(window.apiClient, clientId);
                contentArea.innerHTML = window.clientDetailPage.render();
                await window.clientDetailPage.mount();
                console.log('✅ Client detail loaded successfully');
            } catch (error) {
                console.error('❌ Failed to load client detail:', error);
                this.showClientDetailError(contentArea, clientId, error);
            }
        } else {
            console.error('❌ ClientDetailPage component not loaded');
            contentArea.innerHTML = `
                <div class="error-state">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <h3>Component Not Loaded</h3>
                    <p>ClientDetailPage component is not available.</p>
                    <div class="error-actions">
                        <button class="btn btn-primary" onclick="aiFactoryLayout.navigate('/clients')">
                            ← Back to Clients
                        </button>
                        <button class="btn btn-secondary" onclick="window.location.reload()">
                            🔄 Reload Page
                        </button>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Load template manager - ADMIN ONLY
     */
    async loadTemplateManager(contentArea) {
        console.log('🎯 Loading Template Manager...');
        
        if (window.TemplateManager) {
            try {
                // Create and mount template manager
                if (!window.templateManager) {
                    window.templateManager = new TemplateManager(window.apiClient);
                }
                contentArea.innerHTML = window.templateManager.render();
                await window.templateManager.mount();
                console.log('✅ Template Manager loaded successfully');
            } catch (error) {
                console.error('❌ Failed to load Template Manager:', error);
                contentArea.innerHTML = `
                    <div class="error-state">
                        <h3>Failed to load Template Manager</h3>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        } else {
            console.error('❌ TemplateManager component not loaded');
            contentArea.innerHTML = `
                <div class="error-state">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <h3>Component Not Loaded</h3>
                    <p>TemplateManager component is not available.</p>
                    <div class="error-actions">
                        <button class="btn btn-primary" onclick="window.location.reload()">
                            🔄 Reload Page
                        </button>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Load orchestrator page - ADMIN ONLY
     */

    /**
     * Load worker page - ADMIN ONLY
     */
    async loadWorkerPage(contentArea, workerName) {
        console.log(`🤖 Loading worker page for: ${workerName}`);
        
        // For now, we'll show a placeholder for worker pages
        // Later, we can create specific components for each worker
        contentArea.innerHTML = `
            <div class="worker-page">
                <div class="page-header">
                    <h1 class="page-title">
                        <span class="page-icon">${this.getWorkerIcon(workerName)}</span>
                        ${this.formatWorkerName(workerName)}
                    </h1>
                    <p class="page-subtitle">Worker configuration and monitoring</p>
                </div>
                <div class="coming-soon">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🚧</div>
                    <h3>Worker Interface Coming Soon</h3>
                    <p>The dedicated interface for ${this.formatWorkerName(workerName)} is under development.</p>
                    <div style="margin-top: 2rem;">
                        <button class="btn btn-primary" onclick="aiFactoryLayout.navigate('/granulation')">
                            🧱 View in Content Granulator
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get worker icon
     */
    getWorkerIcon(workerName) {
        const icons = {
            'topic-researcher': '🔎',
            'universal-researcher': '🔍',
            'content-classifier': '🏷️',
            'report-builder': '📑',
            'rss-source-finder': '📡',
            'feed-fetcher': '📰'
        };
        return icons[workerName] || '🤖';
    }

    /**
     * Format worker name for display
     */
    formatWorkerName(workerName) {
        return workerName.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    /**
     * Load requests page - ADMIN ONLY
     */
    async loadRequestsPage(contentArea) {
        console.log('📋 Loading Requests Management...');
        
        if (window.RequestsPage) {
            try {
                // Create and mount requests page
                if (!window.requestsPage) {
                    window.requestsPage = new RequestsPage(window.apiClient);
                }
                contentArea.innerHTML = window.requestsPage.render();
                await window.requestsPage.mount();
                console.log('✅ Requests page loaded successfully');
            } catch (error) {
                console.error('❌ Failed to load requests page:', error);
                this.showRequestsError(contentArea, error);
            }
        } else {
            console.error('❌ RequestsPage component not loaded');
            contentArea.innerHTML = `
                <div class="error-state">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <h3>Component Not Loaded</h3>
                    <p>RequestsPage component is not available.</p>
                    <div class="error-actions">
                        <button class="btn btn-primary" onclick="window.location.reload()">
                            🔄 Reload Page
                        </button>
                        <button class="btn btn-secondary" onclick="aiFactoryLayout.navigate('/dashboard')">
                            ← Back to Dashboard
                        </button>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Load placeholder content for disabled routes
     */
    loadPlaceholderContent(contentArea, path) {
        const routeNames = {
            '/reports': 'Reports',
            '/workers/universal-researcher': 'Universal Researcher',
            '/workers/content-classifier': 'Content Classifier',
            '/workers/report-builder': 'Report Builder',
            '/billing': 'Billing',
            '/analytics': 'Analytics',
            '/settings': 'Settings'
        };

        const routeName = routeNames[path] || 'Page';

        contentArea.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🚧</div>
                <div class="empty-state-content">
                    <h3>${routeName} Coming Soon</h3>
                    <p>This feature is currently under development and will be available in a future update.</p>
                    <button class="btn btn-primary" onclick="aiFactoryLayout.navigate('/dashboard')">
                        ← Back to Dashboard
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Show navigation error
     */
    showNavigationError(contentArea, path, error) {
        contentArea.innerHTML = `
            <div class="error-state">
                <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
                <h3>Navigation Error</h3>
                <p>Failed to load ${path}: ${error.message}</p>
                <div class="error-actions">
                    <button class="btn btn-primary" onclick="aiFactoryLayout.navigate('/dashboard')">
                        ← Back to Dashboard
                    </button>
                    <button class="btn btn-secondary" onclick="window.location.reload()">
                        🔄 Reload Page
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Extract client ID from path
     */
    extractClientId(path) {
        const matches = path.match(/\/clients\/(.+)/);
        return matches ? matches[1] : 'client_1';
    }

    /**
     * Update active navigation
     */
    updateActiveNavigation() {
        // Update nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            const route = link.getAttribute('data-route');
            if (route === this.currentPath || 
                (this.currentPath.startsWith('/clients/') && route === '/clients')) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    /**
     * Update header title based on current path
     */
    updateHeaderTitle(path) {
        const headerPageName = document.getElementById('header-page-name');
        if (!headerPageName) return;

        const titleMap = {
            '/dashboard': 'Dashboard',
            '/clients': 'Client Management',
            '/my-account': 'My Account',
            '/my-reports': 'My Reports',
            '/users': 'User Management',
            '/reports': 'Reports',
            '/billing': 'Billing & Usage',
            '/analytics': 'Analytics',
            '/settings': 'Settings',
            '/help': 'Help & Documentation',
            '/contact': 'Contact Support'
        };

        // Check if it's a client detail page
        if (path.startsWith('/clients/client_')) {
            headerPageName.textContent = this.config.userType === 'admin' ? 'Client Details' : 'My Account';
        } else {
            headerPageName.textContent = titleMap[path] || 'AI Factory';
        }
    }

    /**
     * Toggle sidebar for mobile
     */
    toggleSidebar() {
        this.sidebarOpen = !this.sidebarOpen;
        
        const sidebar = document.getElementById('ai-factory-sidebar');
        const overlay = document.getElementById('mobile-overlay');
        
        if (sidebar) {
            sidebar.classList.toggle('mobile-open', this.sidebarOpen);
        }
        
        if (overlay) {
            overlay.style.display = this.sidebarOpen ? 'block' : 'none';
        }
    }

    /**
     * Toggle user menu
     */
    toggleUserMenu() {
        this.userMenuOpen = !this.userMenuOpen;
        
        const userMenu = document.getElementById('user-menu-dropdown');
        if (userMenu) {
            userMenu.style.display = this.userMenuOpen ? 'block' : 'none';
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Close sidebar on larger screens
        if (window.innerWidth > 1024 && this.sidebarOpen) {
            this.toggleSidebar();
        }
    }

    /**
     * Action methods - ENHANCED USER MENU ACTIONS
     */
    refreshDashboard() {
        console.log('🔄 Refreshing dashboard...');
        this.navigate('/dashboard');
    }

    showProfile() {
        this.toggleUserMenu();
        const userName = this.getUserDisplayName();
        const userRole = this.getUserRoleDisplay(); 
        const userEmail = this.config.user?.email || 'user@company.com';
        
        if (window.SimpleModal) {
            window.SimpleModal.show({
                title: '👤 User Profile',
                size: 'medium',
                content: `
                    <div style="text-align: center; margin-bottom: 1.5rem;">
                        <div style="width: 80px; height: 80px; background: var(--primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 2rem; margin: 0 auto 1rem;">
                            ${userName.charAt(0)}
                        </div>
                        <h3 style="margin: 0 0 0.5rem 0;">${userName}</h3>
                        <p style="color: var(--text-secondary); margin: 0;">${userRole}</p>
                        <p style="color: var(--text-secondary); font-size: 0.875rem; margin: 0.25rem 0 0 0;">${userEmail}</p>
                    </div>
                    
                    <div style="display: grid; gap: 1rem;">
                        <div style="padding: 1rem; background: var(--background); border-radius: 6px;">
                            <h4 style="margin: 0 0 0.5rem 0;">Account Information</h4>
                            <p style="margin: 0; font-size: 0.875rem; color: var(--text-secondary);">
                                Account Type: ${userRole}<br>
                                Member Since: ${new Date().toLocaleDateString()}<br>
                                Last Login: ${new Date().toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                `,
                actions: [
                    { text: 'Edit Profile', class: 'btn-primary', onclick: 'alert("Profile editing coming soon!")' },
                    { text: 'Close', class: 'btn-secondary', onclick: 'this.parentElement.parentElement.parentElement.close()' }
                ]
            });
        } else {
            alert(`Profile: ${userName}\nRole: ${userRole}\nEmail: ${userEmail}`);
        }
    }

    showAccountSettings() {
        this.toggleUserMenu();
        if (window.SimpleModal) {
            window.SimpleModal.show({
                title: '⚙️ Account Settings',
                size: 'large',
                content: `
                    <div style="display: grid; gap: 1.5rem;">
                        <div>
                            <h4>🔐 Security Settings</h4>
                            <div style="display: grid; gap: 0.75rem; margin-top: 0.75rem;">
                                <label style="display: flex; align-items: center; gap: 0.5rem;">
                                    <input type="checkbox"> Enable two-factor authentication
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.5rem;">
                                    <input type="checkbox" checked> Email notifications for login attempts
                                </label>
                                <div style="margin-top: 0.5rem;">
                                    <button class="btn btn-secondary btn-small">Change Password</button>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <h4>🔔 Notification Preferences</h4>
                            <div style="display: grid; gap: 0.75rem; margin-top: 0.75rem;">
                                <label style="display: flex; align-items: center; gap: 0.5rem;">
                                    <input type="checkbox" checked> Email reports
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.5rem;">
                                    <input type="checkbox" checked> Budget alerts
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.5rem;">
                                    <input type="checkbox"> System updates
                                </label>
                            </div>
                        </div>
                        
                        <div>
                            <h4>🎨 Interface Preferences</h4>
                            <div style="display: grid; gap: 0.75rem; margin-top: 0.75rem;">
                                <label style="display: flex; align-items: center; gap: 0.5rem;">
                                    Theme: 
                                    <select style="margin-left: 0.5rem; padding: 0.25rem; border: 1px solid var(--border); border-radius: 4px;">
                                        <option>Light</option>
                                        <option>Dark</option>
                                        <option>Auto</option>
                                    </select>
                                </label>
                                <label style="display: flex; align-items: center; gap: 0.5rem;">
                                    Language: 
                                    <select style="margin-left: 0.5rem; padding: 0.25rem; border: 1px solid var(--border); border-radius: 4px;">
                                        <option>English</option>
                                        <option>Spanish</option>
                                        <option>French</option>
                                    </select>
                                </label>
                            </div>
                        </div>
                    </div>
                `,
                actions: [
                    { text: 'Save Settings', class: 'btn-primary', onclick: 'alert("Settings saved!"); this.parentElement.parentElement.parentElement.close();' },
                    { text: 'Cancel', class: 'btn-secondary', onclick: 'this.parentElement.parentElement.parentElement.close()' }
                ]
            });
        } else {
            alert('Account settings functionality coming soon!');
        }
    }

    showHelp() {
        this.toggleUserMenu();
        if (window.SimpleModal) {
            window.SimpleModal.show({
                title: '❓ Help & Support',
                size: 'medium',
                content: `
                    <div style="display: grid; gap: 1.5rem;">
                        <div style="text-align: center;">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">📚</div>
                            <h3>How can we help you?</h3>
                        </div>
                        
                        <div style="display: grid; gap: 1rem;">
                            <div style="padding: 1rem; border: 1px solid var(--border); border-radius: 6px; cursor: pointer;" onclick="alert('Documentation coming soon!')">
                                <h4 style="margin: 0 0 0.5rem 0;">📖 Documentation</h4>
                                <p style="margin: 0; font-size: 0.875rem; color: var(--text-secondary);">Browse our comprehensive guides and tutorials</p>
                            </div>
                            
                            <div style="padding: 1rem; border: 1px solid var(--border); border-radius: 6px; cursor: pointer;" onclick="window.contactSupport && window.contactSupport()">
                                <h4 style="margin: 0 0 0.5rem 0;">📧 Contact Support</h4>
                                <p style="margin: 0; font-size: 0.875rem; color: var(--text-secondary);">Get help from our support team</p>
                            </div>
                            
                            <div style="padding: 1rem; border: 1px solid var(--border); border-radius: 6px; cursor: pointer;" onclick="alert('Video tutorials coming soon!')">
                                <h4 style="margin: 0 0 0.5rem 0;">🎥 Video Tutorials</h4>
                                <p style="margin: 0; font-size: 0.875rem; color: var(--text-secondary);">Watch step-by-step video guides</p>
                            </div>
                        </div>
                        
                        <div style="text-align: center; padding-top: 1rem; border-top: 1px solid var(--border);">
                            <p style="margin: 0; font-size: 0.875rem; color: var(--text-secondary);">
                                Need immediate assistance? Email us at 
                                <a href="mailto:support@aifactory.com" style="color: var(--primary);">support@aifactory.com</a>
                            </p>
                        </div>
                    </div>
                `,
                actions: [
                    { text: 'Close', class: 'btn-primary', onclick: 'this.parentElement.parentElement.parentElement.close()' }
                ]
            });
        } else {
            alert('Help documentation coming soon!\n\nFor immediate assistance, contact support@aifactory.com');
        }
    }

    // User Management Actions
    refreshUserManagement() {
        console.log('🔄 Refreshing user management...');
        if (window.usersPage && window.usersPage.loadUsers) {
            window.usersPage.loadUsers();
        } else {
            this.navigate('/users');
        }
    }

    showAddUser() {
        if (window.SimpleModal) {
            window.SimpleModal.show({
                title: '➕ Add New User',
                size: 'medium',
                content: `
                    <form style="display: grid; gap: 1rem;">
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Full Name *</label>
                            <input type="text" placeholder="Enter full name" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px;">
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Email Address *</label>
                            <input type="email" placeholder="user@company.com" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px;">
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">User Role *</label>
                            <select style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px;">
                                <option value="client">Client User</option>
                                <option value="admin">Administrator</option>
                                <option value="support">Support User</option>
                            </select>
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Initial Password</label>
                            <input type="password" placeholder="Temporary password" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px;">
                            <small style="color: var(--text-secondary);">User will be prompted to change on first login</small>
                        </div>
                        
                        <div style="margin-top: 0.5rem;">
                            <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;">
                                <input type="checkbox" checked>
                                Send welcome email with login instructions
                            </label>
                        </div>
                    </form>
                `,
                actions: [
                    { text: 'Create User', class: 'btn-primary', onclick: 'alert("User creation functionality coming soon!"); this.parentElement.parentElement.parentElement.close();' },
                    { text: 'Cancel', class: 'btn-secondary', onclick: 'this.parentElement.parentElement.parentElement.close()' }
                ]
            });
        } else {
            alert('Add user functionality coming soon!');
        }
    }

    /**
     * Load granulation page - ADMIN ONLY
     */
    async loadGranulation(contentArea) {
        console.log('🧱 Loading Content Granulator...');
        
        if (window.GranulationPage) {
            try {
                // Create and mount granulation page
                if (!window.granulationPage) {
                    window.granulationPage = new GranulationPage(window.apiClient);
                }
                contentArea.innerHTML = window.granulationPage.render();
                await window.granulationPage.mount();
                console.log('✅ Content Granulator loaded successfully');
            } catch (error) {
                console.error('❌ Failed to load Content Granulator:', error);
                contentArea.innerHTML = `
                    <div class="error-state">
                        <h3>Failed to load Content Granulator</h3>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        } else {
            contentArea.innerHTML = `
                <div class="info-section" style="text-align: center; padding: 3rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🧱</div>
                    <h3>Content Granulator</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 2rem;">
                        AI-powered content structure generation
                    </p>
                    <div class="feature-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 2rem; text-align: left;">
                        <div class="feature-card">
                            <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">📚</div>
                            <h4>Course Creation</h4>
                            <p style="font-size: 0.875rem; color: var(--text-secondary);">Generate structured educational content</p>
                        </div>
                        <div class="feature-card">
                            <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">📝</div>
                            <h4>Quiz Generation</h4>
                            <p style="font-size: 0.875rem; color: var(--text-secondary);">Create assessments and evaluations</p>
                        </div>
                        <div class="feature-card">
                            <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">✅</div>
                            <h4>AI Validation</h4>
                            <p style="font-size: 0.875rem; color: var(--text-secondary);">Ensure quality with intelligent validation</p>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    showNotifications() {
        alert('Notifications functionality coming soon!\n\nYou will receive notifications about:\n• System updates\n• Client activity\n• Report completion');
    }

    logout() {
        this.toggleUserMenu();
        if (window.sessionManager) {
            window.sessionManager.logout();
        } else {
            window.location.href = '/login.html';
        }
    }

    /**
     * Show my account specific error
     */
    showMyAccountError(contentArea, error) {
        contentArea.innerHTML = `
            <div class="error-state">
                <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
                <h3>Account Loading Error</h3>
                <p>Failed to load your account information.</p>
                <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.5rem;">
                    Error: ${error.message}
                </p>
                <div class="error-actions" style="margin-top: 1.5rem;">
                    <button class="btn btn-primary" onclick="aiFactoryLayout.navigate('/my-account')">
                        🔄 Try Again
                    </button>
                    <button class="btn btn-secondary" onclick="window.contactSupport()">
                        📧 Contact Support
                    </button>
                    <button class="btn btn-secondary" onclick="window.sessionManager?.logout()">
                        🚪 Re-login
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Show client detail specific error
     */
    showClientDetailError(contentArea, clientId, error) {
        contentArea.innerHTML = `
            <div class="error-state">
                <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
                <h3>Client Loading Error</h3>
                <p>Failed to load details for client: <code>${clientId}</code></p>
                <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.5rem;">
                    Error: ${error.message}
                </p>
                <div class="error-actions" style="margin-top: 1.5rem;">
                    <button class="btn btn-primary" onclick="aiFactoryLayout.navigate('/clients/${clientId}')">
                        🔄 Try Again
                    </button>
                    <button class="btn btn-secondary" onclick="aiFactoryLayout.navigate('/clients')">
                        ← Back to Clients
                    </button>
                    <button class="btn btn-secondary" onclick="window.location.reload()">
                        🔄 Reload Page
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Show requests page specific error
     */
    showRequestsError(contentArea, error) {
        contentArea.innerHTML = `
            <div class="error-state">
                <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
                <h3>Requests Loading Error</h3>
                <p>Failed to load requests management page.</p>
                <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.5rem;">
                    Error: ${error.message}
                </p>
                <div class="error-actions" style="margin-top: 1.5rem;">
                    <button class="btn btn-primary" onclick="aiFactoryLayout.navigate('/requests')">
                        🔄 Try Again
                    </button>
                    <button class="btn btn-secondary" onclick="aiFactoryLayout.navigate('/dashboard')">
                        ← Back to Dashboard
                    </button>
                    <button class="btn btn-secondary" onclick="window.location.reload()">
                        🔄 Reload Page
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Cleanup method
     */
    destroy() {
        window.removeEventListener('resize', this.handleResize);
        
        // Remove mobile overlay
        const overlay = document.getElementById('mobile-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        // Remove user menu
        const userMenu = document.getElementById('user-menu-dropdown');
        if (userMenu) {
            userMenu.remove();
        }
        
        console.log('🗑️ AIFactoryLayout destroyed');
    }
}

// Global instance for event handlers
window.AIFactoryLayout = AIFactoryLayout;