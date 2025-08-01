// AI Factory Layout Component - Safe Integration Version
// File: Pages/public/js/components/ai-factory-layout.js

/**
 * AIFactoryLayout - Main layout component following UX Standards Manual
 * Safe version that works with existing authentication and dashboard
 */
class AIFactoryLayout {
    constructor(config = {}) {
        this.config = {
            userType: 'admin',
            user: null,
            onNavigate: null,
            showSearch: true,
            ...config
        };
        
        this.sidebarOpen = false;
        this.currentPath = '/dashboard';
        this.userMenuOpen = false;
        
        // Bind methods for event handlers
        this.toggleSidebar = this.toggleSidebar.bind(this);
        this.toggleUserMenu = this.toggleUserMenu.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
    }

    /**
     * Render the complete layout structure
     */
    render() {
        return `
            <div class="ai-factory-layout">
                ${this.renderSidebar()}
                ${this.renderMain()}
            </div>
        `;
    }

    /**
     * Render sidebar with navigation sections per UX Manual
     */
    renderSidebar() {
        const navigationSections = this.getNavigationSections();
        
        return `
            <div class="ai-factory-sidebar ${this.sidebarOpen ? 'open' : ''}" id="ai-factory-sidebar">
                <!-- Brand Section -->
                <div class="sidebar-brand">
                    <div class="sidebar-logo">🏭</div>
                    <h1 class="sidebar-title">AI Factory</h1>
                </div>

                <!-- Navigation -->
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

                <!-- User Info Footer -->
                <div class="sidebar-footer">
                    <div class="user-avatar">${this.getUserInitials()}</div>
                    <div class="user-info">
                        <div class="user-name">${this.getUserName()}</div>
                        <div class="user-role">${this.getUserRole()}</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render main content area with topbar
     */
    renderMain() {
        return `
            <div class="ai-factory-main">
                ${this.renderTopbar()}
                <div class="ai-factory-content" id="main-content">
                    <!-- Content will be rendered here -->
                    <div class="loading-state">
                        <div class="loading-spinner">🔄</div>
                        <p>Loading enhanced interface...</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render topbar with breadcrumb and actions
     */
    renderTopbar() {
        return `
            <div class="ai-factory-topbar">
                <!-- Mobile sidebar toggle -->
                <button class="sidebar-toggle" onclick="aiFactoryLayout.toggleSidebar()">
                    ☰
                </button>

                <!-- Breadcrumb Navigation -->
                <div class="topbar-breadcrumb">
                    ${this.renderBreadcrumb()}
                </div>

                <!-- Topbar Actions -->
                <div class="topbar-actions">
                    ${this.config.showSearch ? this.renderGlobalSearch() : ''}
                    ${this.renderUserMenu()}
                </div>
            </div>
        `;
    }

    /**
     * Render breadcrumb navigation
     */
    renderBreadcrumb() {
        const pathParts = this.currentPath.split('/').filter(part => part);
        let breadcrumbs = [{ label: 'Home', path: '/dashboard' }];
        
        if (pathParts.length > 0 && pathParts[0] !== 'dashboard') {
            breadcrumbs.push({
                label: this.formatBreadcrumbLabel(pathParts[0]),
                path: '/' + pathParts[0]
            });
        }

        return breadcrumbs.map((crumb, index) => `
            ${index > 0 ? '<span class="breadcrumb-separator">›</span>' : ''}
            <a href="#" 
               class="breadcrumb-item ${index === breadcrumbs.length - 1 ? 'active' : ''}"
               onclick="aiFactoryLayout.navigate('${crumb.path}'); return false;">
                ${crumb.label}
            </a>
        `).join('');
    }

    /**
     * Render global search
     */
    renderGlobalSearch() {
        return `
            <div class="global-search">
                <span class="search-icon">🔍</span>
                <input type="text" 
                       class="search-input" 
                       placeholder="Search..."
                       onkeydown="aiFactoryLayout.handleSearch(event)">
            </div>
        `;
    }

    /**
     * Render user menu dropdown
     */
    renderUserMenu() {
        return `
            <div class="user-menu">
                <button class="user-menu-trigger" onclick="aiFactoryLayout.toggleUserMenu()">
                    <div class="user-avatar">${this.getUserInitials()}</div>
                    <span>▼</span>
                </button>
                <div class="user-menu-dropdown" id="user-menu-dropdown" style="display: none;">
                    <a href="#" onclick="aiFactoryLayout.navigate('/account'); return false;">⚙️ Settings</a>
                    <a href="#" onclick="logout(); return false;">🚪 Logout</a>
                </div>
            </div>
        `;
    }

    /**
     * Get navigation sections based on user type
     */
    getNavigationSections() {
        if (this.config.userType === 'admin') {
            return [
                {
                    title: 'Main',
                    items: [
                        { label: 'Dashboard', icon: '📊', path: '/dashboard' },
                        { label: 'Clients', icon: '👥', path: '/clients' },
                        { label: 'Reports', icon: '📋', path: '/reports' }
                    ]
                },
                {
                    title: 'AI Workers',
                    items: [
                        { label: 'Universal Researcher', icon: '🔍', path: '/workers/universal-researcher' },
                        { label: 'Content Classifier', icon: '🧠', path: '/workers/content-classifier' },
                        { label: 'Report Builder', icon: '📊', path: '/workers/report-builder' }
                    ]
                },
                {
                    title: 'Management',
                    items: [
                        { label: 'Billing', icon: '💳', path: '/billing' },
                        { label: 'Analytics', icon: '📈', path: '/analytics' },
                        { label: 'Settings', icon: '⚙️', path: '/settings' }
                    ]
                }
            ];
        } else {
            // Client navigation
            return [
                {
                    title: 'Main',
                    items: [
                        { label: 'My Dashboard', icon: '📊', path: '/dashboard' },
                        { label: 'My Reports', icon: '📋', path: '/reports' },
                        { label: 'My Account', icon: '👤', path: '/account' }
                    ]
                },
                {
                    title: 'AI Workers',
                    items: [
                        { label: 'Universal Researcher', icon: '🔍', path: '/workers/universal-researcher' },
                        { label: 'Content Classifier', icon: '🧠', path: '/workers/content-classifier', disabled: this.isFeatureLocked('content-classifier') },
                        { label: 'Report Builder', icon: '📊', path: '/workers/report-builder', disabled: this.isFeatureLocked('report-builder') }
                    ]
                },
                {
                    title: 'Management',
                    items: [
                        { label: 'Billing & Usage', icon: '💳', path: '/billing' },
                        { label: 'Settings', icon: '⚙️', path: '/settings' }
                    ]
                }
            ];
        }
    }

    /**
     * Mount the layout and set up event listeners
     */
    mount() {
        // Set up responsive behavior
        this.setupResponsive();
        
        // Set up click outside to close user menu
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-menu') && this.userMenuOpen) {
                this.toggleUserMenu();
            }
        });
        
        // Set global reference
        window.aiFactoryLayout = this;
        
        console.log('✅ AI Factory Layout mounted');
    }

    /**
     * Navigate to a route
     */
    navigate(path) {
        console.log('🧭 Layout navigation to:', path);
        
        // Update current path and active states
        this.currentPath = path;
        this.updateActiveStates();
        
        // Close mobile sidebar
        if (this.sidebarOpen) {
            this.toggleSidebar();
        }
        
        // Handle different navigation scenarios
        if (this.config.onNavigate) {
            // Use provided navigation handler (e.g., router)
            this.config.onNavigate(path);
        } else {
            // Fallback to functional navigation
            this.handleFallbackNavigation(path);
        }
    }

    /**
     * Handle navigation when no router is available
     */
    handleFallbackNavigation(path) {
        const contentArea = document.getElementById('main-content');
        if (!contentArea) return;

        switch (path) {
            case '/dashboard':
                this.loadDashboardContent();
                break;
            case '/clients':
                this.loadClientsContent();
                break;
            case '/reports':
                this.loadReportsContent();
                break;
            case '/workers/universal-researcher':
                this.loadWorkerContent('universal-researcher');
                break;
            default:
                this.loadPlaceholderContent(path);
        }
    }

    /**
     * Load dashboard content in main area
     */
    loadDashboardContent() {
        const contentArea = document.getElementById('main-content');
        if (!contentArea) return;

        contentArea.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">📊 Admin Dashboard</h1>
                <div class="page-actions">
                    <button class="btn btn-secondary" onclick="window.location.reload()">
                        🔄 Refresh
                    </button>
                </div>
            </div>
            
            <div id="dashboard-content-wrapper">
                <div class="loading-state">
                    <div class="loading-spinner">🔄</div>
                    <p>Loading dashboard components...</p>
                </div>
            </div>
        `;

        // Try to load existing dashboard content
        setTimeout(async () => {
            try {
                if (window.adminDashboard && typeof window.adminDashboard.render === 'function') {
                    const dashboardContent = await window.adminDashboard.render();
                    const wrapper = document.getElementById('dashboard-content-wrapper');
                    if (wrapper) {
                        wrapper.innerHTML = dashboardContent;
                        
                        // Mount dashboard if needed
                        if (typeof window.adminDashboard.mount === 'function') {
                            await window.adminDashboard.mount();
                        }
                    }
                }
            } catch (error) {
                console.warn('Failed to load dashboard content:', error);
                this.showPlaceholderDashboard();
            }
        }, 100);
    }

    /**
     * Load clients content
     */
    loadClientsContent() {
        const contentArea = document.getElementById('main-content');
        if (!contentArea) return;

        if (window.ClientsPage) {
            // Use enhanced clients page if available
            try {
                const clientsPage = new window.ClientsPage(window.apiClient);
                contentArea.innerHTML = clientsPage.render();
                clientsPage.mount();
            } catch (error) {
                console.warn('Failed to load ClientsPage:', error);
                this.showFallbackClients();
            }
        } else {
            // Fallback to modal approach
            this.showFallbackClients();
        }
    }

    /**
     * Fallback clients interface
     */
    showFallbackClients() {
        const contentArea = document.getElementById('main-content');
        if (!contentArea) return;

        contentArea.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">👥 Client Management</h1>
            </div>
            
            <div class="fallback-content">
                <div style="text-align: center; padding: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">👥</div>
                    <h2>Client Management</h2>
                    <p>Opening client management interface...</p>
                    <button class="btn btn-primary" onclick="showClients()">
                        Open Client List
                    </button>
                </div>
            </div>
        `;

        // Auto-trigger existing client modal
        setTimeout(() => {
            if (window.showClients) {
                window.showClients();
            }
        }, 500);
    }

    /**
     * Load placeholder content for other routes
     */
    loadPlaceholderContent(path) {
        const contentArea = document.getElementById('main-content');
        if (!contentArea) return;

        const title = this.formatBreadcrumbLabel(path.split('/').pop());
        
        contentArea.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">${title}</h1>
            </div>
            
            <div class="placeholder-content" style="text-align: center; padding: 2rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🚧</div>
                <h2>Coming Soon</h2>
                <p>${title} functionality will be available in a future update.</p>
                <button class="btn btn-primary" onclick="aiFactoryLayout.navigate('/dashboard')">
                    Return to Dashboard
                </button>
            </div>
        `;
    }

    /**
     * Update active navigation states
     */
    updateActiveStates() {
        // Update sidebar active states
        document.querySelectorAll('.nav-link').forEach(link => {
            const isActive = link.dataset.route === this.currentPath;
            link.classList.toggle('active', isActive);
        });

        // Update breadcrumb
        const breadcrumbContainer = document.querySelector('.topbar-breadcrumb');
        if (breadcrumbContainer) {
            breadcrumbContainer.innerHTML = this.renderBreadcrumb();
        }
    }

    /**
     * Toggle sidebar on mobile
     */
    toggleSidebar() {
        this.sidebarOpen = !this.sidebarOpen;
        const sidebar = document.getElementById('ai-factory-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('open', this.sidebarOpen);
        }
    }

    /**
     * Toggle user menu dropdown
     */
    toggleUserMenu() {
        this.userMenuOpen = !this.userMenuOpen;
        const dropdown = document.getElementById('user-menu-dropdown');
        if (dropdown) {
            dropdown.style.display = this.userMenuOpen ? 'block' : 'none';
        }
    }

    /**
     * Handle global search
     */
    handleSearch(event) {
        if (event.key === 'Enter') {
            const query = event.target.value.trim();
            console.log('🔍 Search query:', query);
            alert(`Search functionality coming soon!\n\nQuery: "${query}"`);
        }
    }

    /**
     * Set up responsive behavior
     */
    setupResponsive() {
        const mediaQuery = window.matchMedia('(max-width: 1024px)');
        
        const handleResize = (e) => {
            if (e.matches) {
                // Mobile/tablet view
                this.sidebarOpen = false;
                const sidebar = document.getElementById('ai-factory-sidebar');
                if (sidebar) {
                    sidebar.classList.remove('open');
                }
            }
        };

        mediaQuery.addListener(handleResize);
        handleResize(mediaQuery);
    }

    /**
     * Utility methods
     */
    getUserName() {
        if (this.config.user) {
            return this.config.user.name || 
                   this.config.user.company_name || 
                   this.config.user.email || 
                   this.config.user.username || 
                   'User';
        }
        
        // Try to get from localStorage
        try {
            const userInfo = JSON.parse(localStorage.getItem('bitware-user-info') || '{}');
            return userInfo.name || 
                   userInfo.company_name || 
                   userInfo.email || 
                   userInfo.username || 
                   'User';
        } catch (error) {
            return 'User';
        }
    }

    getUserRole() {
        if (this.config.userType === 'admin') {
            return 'Administrator';
        }
        
        if (this.config.user?.subscription_tier) {
            return this.config.user.subscription_tier.toUpperCase();
        }
        
        return 'CLIENT';
    }

    getUserInitials() {
        const name = this.getUserName();
        if (name === 'User') return 'U';
        
        return name.split(' ')
                  .map(part => part[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);
    }

    formatBreadcrumbLabel(part) {
        return part.split('-')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
    }

    isFeatureLocked(feature) {
        if (this.config.userType === 'admin') return false;
        
        const tier = this.config.user?.subscription_tier;
        const featureTiers = {
            'content-classifier': ['standard', 'premium', 'enterprise'],
            'report-builder': ['premium', 'enterprise']
        };
        
        return !featureTiers[feature]?.includes(tier);
    }

    /**
     * Update layout with new data
     */
    update(config) {
        this.config = { ...this.config, ...config };
        
        // Re-render sidebar navigation
        const sidebar = document.getElementById('ai-factory-sidebar');
        if (sidebar) {
            const newSidebar = document.createElement('div');
            newSidebar.innerHTML = this.renderSidebar();
            sidebar.parentNode.replaceChild(newSidebar.firstElementChild, sidebar);
        }
        
        // Update topbar
        const topbar = document.querySelector('.ai-factory-topbar');
        if (topbar) {
            const newTopbar = document.createElement('div');
            newTopbar.innerHTML = this.renderTopbar();
            topbar.parentNode.replaceChild(newTopbar.firstElementChild, topbar);
        }
        
        this.mount();
    }
}

// Export for global use
window.AIFactoryLayout = AIFactoryLayout;