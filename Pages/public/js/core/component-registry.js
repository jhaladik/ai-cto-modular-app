/**
 * Component Registry - Lazy Loading System
 * Manages worker components and dashboard widgets with permission-based loading
 */

class ComponentRegistry {
    constructor(kamContext, permissionResolver) {
        this.kamContext = kamContext;
        this.permissionResolver = permissionResolver;
        this.components = new Map();
        this.componentCache = new Map();
        this.loadingPromises = new Map();
        this.baseClasses = new Map();
        
        // Initialize base component classes
        this.initializeBaseClasses();
        
        // Register existing components
        this.registerExistingComponents();
    }

    /**
     * Initialize base component classes extracted from existing patterns
     */
    initializeBaseClasses() {
        // Base Dashboard Component (extracted from admin-dashboard-components.js pattern)
        this.baseClasses.set('DashboardComponent', class DashboardComponent {
            constructor(dashboard, containerId) {
                this.dashboard = dashboard;
                this.containerId = containerId;
                this.loading = false;
                this.error = null;
                this.data = null;
            }

            async load() {
                if (this.loading) return;
                
                this.loading = true;
                this.showLoading();
                
                try {
                    this.data = await this.fetchData();
                    this.render();
                } catch (error) {
                    this.error = error;
                    this.showError(error);
                } finally {
                    this.loading = false;
                }
            }

            async fetchData() {
                // Override in subclasses
                return {};
            }

            render() {
                // Override in subclasses
                const container = document.getElementById(this.containerId);
                if (container) {
                    container.innerHTML = this.getHTML();
                }
            }

            getHTML() {
                return '<div>Base component</div>';
            }

            showLoading() {
                const container = document.getElementById(this.containerId);
                if (container) {
                    container.innerHTML = `
                        <div class="loading-spinner" style="
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            padding: 40px;
                        ">
                            <div class="spinner" style="
                                width: 24px;
                                height: 24px;
                                border: 2px solid #e5e7eb;
                                border-top: 2px solid #3b82f6;
                                border-radius: 50%;
                                animation: spin 1s linear infinite;
                            "></div>
                            <span style="margin-left: 12px;">Loading...</span>
                        </div>
                    `;
                }
            }

            showError(error) {
                const container = document.getElementById(this.containerId);
                if (container) {
                    container.innerHTML = `
                        <div class="error-message" style="
                            padding: 20px;
                            background: #fef2f2;
                            border: 1px solid #fecaca;
                            border-radius: 8px;
                            color: #991b1b;
                        ">
                            <h4>⚠️ Error Loading Component</h4>
                            <p>${error.message}</p>
                            <button onclick="this.closest('.error-message').parentElement.innerHTML=''; this.load();" 
                                    style="
                                        margin-top: 12px;
                                        padding: 8px 16px;
                                        background: #dc2626;
                                        color: white;
                                        border: none;
                                        border-radius: 4px;
                                        cursor: pointer;
                                    ">
                                Retry
                            </button>
                        </div>
                    `;
                }
            }
        });

        // Base Worker Card Component (extracted from existing worker patterns)
        this.baseClasses.set('WorkerCardComponent', class WorkerCardComponent extends this.baseClasses.get('DashboardComponent') {
            constructor(dashboard, workerId, cardConfig) {
                super(dashboard, `${workerId}-card`);
                this.workerId = workerId;
                this.cardConfig = cardConfig;
            }

            async fetchData() {
                // Check permissions first
                const canAccess = await this.dashboard.permissionResolver.canAccessWorker(this.workerId);
                if (!canAccess) {
                    throw new Error(`Access denied to ${this.workerId}`);
                }

                // Fetch worker status and basic info
                return await this.dashboard.apiClient.callWorker(this.workerId, '/status');
            }

            getHTML() {
                if (!this.data) return '';

                return `
                    <div class="worker-card" style="
                        background: white;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        padding: 20px;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    ">
                        <div class="worker-header" style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-bottom: 16px;
                        ">
                            <h3>${this.cardConfig.title}</h3>
                            <span class="status-indicator ${this.data.status === 'healthy' ? 'status-online' : 'status-offline'}">
                                ${this.data.status === 'healthy' ? '🟢' : '🔴'}
                            </span>
                        </div>
                        <div class="worker-stats">
                            <p>Last Activity: ${this.formatDate(this.data.last_activity)}</p>
                            <p>Requests Today: ${this.data.requests_today || 0}</p>
                        </div>
                        <div class="worker-actions" style="margin-top: 16px;">
                            <button onclick="componentRegistry.loadWorkerInterface('${this.workerId}')" 
                                    class="btn-primary" style="
                                        padding: 8px 16px;
                                        background: #3b82f6;
                                        color: white;
                                        border: none;
                                        border-radius: 4px;
                                        cursor: pointer;
                                    ">
                                Open Interface
                            </button>
                        </div>
                    </div>
                `;
            }

            formatDate(dateString) {
                if (!dateString) return 'Never';
                return new Date(dateString).toLocaleString();
            }
        });

        // Base Worker Interface Component (for full interfaces)
        this.baseClasses.set('WorkerInterfaceComponent', class WorkerInterfaceComponent {
            constructor(workerId, interfaceConfig) {
                this.workerId = workerId;
                this.interfaceConfig = interfaceConfig;
                this.loaded = false;
            }

            async load() {
                if (this.loaded) return;

                // Permission check
                const canAccess = await window.permissionResolver.canAccessWorker(this.workerId);
                if (!canAccess) {
                    throw new Error(`Access denied to ${this.workerId} interface`);
                }

                // Lazy load the full interface
                await this.loadInterface();
                this.loaded = true;
            }

            async loadInterface() {
                // This would dynamically load the full worker interface
                // For now, return a placeholder
                console.log(`📥 Loading interface for ${this.workerId}`);
            }
        });
    }

    /**
     * Register existing components from the current system
     */
    registerExistingComponents() {
        // Register existing dashboard components (from admin-dashboard-components.js)
        this.registerComponent('executive-summary', {
            type: 'dashboard',
            baseClass: 'DashboardComponent',
            permissions: ['dashboard_access'],
            config: {
                title: 'Executive Summary',
                refreshInterval: 30000
            }
        });

        this.registerComponent('worker-performance-grid', {
            type: 'dashboard',
            baseClass: 'DashboardComponent',
            permissions: ['dashboard_access', 'usage_analytics'],
            config: {
                title: 'Worker Performance',
                refreshInterval: 60000
            }
        });

        this.registerComponent('client-management', {
            type: 'dashboard',
            baseClass: 'DashboardComponent',
            permissions: ['admin', 'client_management'],
            config: {
                title: 'Client Management',
                refreshInterval: 120000
            }
        });

        // Register worker cards
        this.registerWorkerCard('universal-researcher', {
            title: 'Universal Researcher',
            description: 'AI-powered research and analysis',
            permissions: ['basic_worker_access']
        });

        this.registerWorkerCard('topic-researcher', {
            title: 'Topic Researcher',
            description: 'Deep topic exploration and source discovery',
            permissions: ['basic_worker_access']
        });

        this.registerWorkerCard('content-classifier', {
            title: 'Content Classifier',
            description: 'Intelligent content analysis and categorization',
            permissions: ['advanced_worker_access']
        });

        this.registerWorkerCard('report-builder', {
            title: 'Report Builder',
            description: 'Professional report generation',
            permissions: ['advanced_worker_access']
        });
    }

    /**
     * Register a component in the registry
     */
    registerComponent(componentId, config) {
        this.components.set(componentId, {
            id: componentId,
            ...config,
            registered: new Date()
        });
        
        console.log(`📝 Registered component: ${componentId}`);
    }

    /**
     * Register a worker card component
     */
    registerWorkerCard(workerId, config) {
        this.registerComponent(`${workerId}-card`, {
            type: 'worker-card',
            baseClass: 'WorkerCardComponent',
            workerId: workerId,
            permissions: config.permissions || ['basic_worker_access'],
            config: config
        });
    }

    /**
     * Load a component with lazy loading and permission checks
     */
    async loadComponent(componentId, container = null) {
        try {
            // Check if already loading
            if (this.loadingPromises.has(componentId)) {
                return await this.loadingPromises.get(componentId);
            }

            // Check cache first
            if (this.componentCache.has(componentId)) {
                const cached = this.componentCache.get(componentId);
                if (container) {
                    await this.renderComponent(cached, container);
                }
                return cached;
            }

            // Start loading
            const loadingPromise = this.performLoad(componentId);
            this.loadingPromises.set(componentId, loadingPromise);

            const component = await loadingPromise;
            
            // Cache the component
            this.componentCache.set(componentId, component);
            this.loadingPromises.delete(componentId);

            // Render if container provided
            if (container) {
                await this.renderComponent(component, container);
            }

            return component;

        } catch (error) {
            this.loadingPromises.delete(componentId);
            console.error(`❌ Failed to load component ${componentId}:`, error);
            throw error;
        }
    }

    /**
     * Perform the actual component loading
     */
    async performLoad(componentId) {
        const config = this.components.get(componentId);
        if (!config) {
            throw new Error(`Component not found: ${componentId}`);
        }

        // Check permissions
        if (config.permissions && config.permissions.length > 0) {
            const hasPermission = await this.permissionResolver.hasAnyPermission(config.permissions);
            if (!hasPermission) {
                throw new Error(`Permission denied for component: ${componentId}`);
            }
        }

        // Get base class
        const BaseClass = this.baseClasses.get(config.baseClass);
        if (!BaseClass) {
            throw new Error(`Base class not found: ${config.baseClass}`);
        }

        // Create component instance
        let component;
        if (config.type === 'worker-card') {
            component = new BaseClass(
                window.adminDashboard, // Global dashboard instance
                config.workerId,
                config.config
            );
        } else {
            component = new BaseClass(
                window.adminDashboard,
                componentId
            );
        }

        // Initialize component
        if (component.load) {
            await component.load();
        }

        return component;
    }

    /**
     * Render component to container
     */
    async renderComponent(component, container) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }

        if (!container) {
            console.warn('⚠️ Container not found for component rendering');
            return;
        }

        if (component.render) {
            component.render();
        } else if (component.getHTML) {
            container.innerHTML = component.getHTML();
        }
    }

    /**
     * Load worker interface (full interface, not just card)
     */
    async loadWorkerInterface(workerId) {
        try {
            console.log(`🔄 Loading interface for ${workerId}`);
            
            // Permission check
            const canAccess = await this.permissionResolver.canAccessWorker(workerId);
            if (!canAccess) {
                alert(`Access denied to ${workerId}. Please upgrade your subscription.`);
                return;
            }

            // For now, open in new tab/window or navigate
            // In future phases, this will load the full interface component
            const workerUrls = {
                'universal-researcher': '/workers/universal-researcher.html',
                'topic-researcher': '/workers/topic-researcher.html',
                'content-classifier': '/workers/content-classifier.html',
                'report-builder': '/workers/report-builder.html'
            };

            const url = workerUrls[workerId];
            if (url) {
                window.open(url, '_blank');
            } else {
                console.warn(`⚠️ No interface URL configured for ${workerId}`);
                alert(`Interface for ${workerId} is not yet available.`);
            }

        } catch (error) {
            console.error(`❌ Failed to load worker interface ${workerId}:`, error);
            alert(`Failed to load ${workerId}: ${error.message}`);
        }
    }

    /**
     * Get all components that user has access to
     */
    async getAccessibleComponents() {
        const accessible = [];
        
        for (const [componentId, config] of this.components) {
            if (!config.permissions || config.permissions.length === 0) {
                accessible.push(componentId);
                continue;
            }

            const hasPermission = await this.permissionResolver.hasAnyPermission(config.permissions);
            if (hasPermission) {
                accessible.push(componentId);
            }
        }

        return accessible;
    }

    /**
     * Get component configuration
     */
    getComponentConfig(componentId) {
        return this.components.get(componentId);
    }

    /**
     * Clear component cache
     */
    clearCache() {
        this.componentCache.clear();
        console.log('🧹 Component cache cleared');
    }

    /**
     * Get registry statistics
     */
    getStats() {
        return {
            total_components: this.components.size,
            cached_components: this.componentCache.size,
            loading_components: this.loadingPromises.size,
            base_classes: this.baseClasses.size
        };
    }
}

// Export for global use
window.ComponentRegistry = ComponentRegistry;