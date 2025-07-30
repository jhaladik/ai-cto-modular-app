/**
 * Phase 1 Integration - Complete Setup (Updated)
 * Robust integration with improved dependency detection and fallbacks
 */

class Phase1Integration {
    constructor() {
        this.initialized = false;
        this.components = {};
        this.originalDashboard = null;
    }

    /**
     * Initialize all Phase 1 components with robust dependency detection
     */
    async initialize() {
        try {
            console.log('🚀 Phase 1 Integration starting...');

            // Robust dependency detection
            await this.detectDependencies();

            // Initialize core components
            await this.initializeCore();

            // Enhance existing dashboard
            await this.enhanceExistingDashboard();

            // Setup event listeners
            this.setupEventListeners();

            // Create test function
            this.createTestFunction();

            this.initialized = true;
            console.log('✅ Phase 1 Integration complete!');

            return true;

        } catch (error) {
            console.error('❌ Phase 1 Integration failed:', error);
            return false;
        }
    }

    /**
     * Robust dependency detection with fallbacks
     */
    async detectDependencies() {
        console.log('🔍 Detecting dependencies...');

        // Find APIClient under various possible names
        const apiClientCandidates = [
            window.APIClient,
            window.ApiClient, 
            window.apiClient,
            window.API
        ];

        let foundAPIClient = null;
        for (let i = 0; i < apiClientCandidates.length; i++) {
            if (apiClientCandidates[i]) {
                foundAPIClient = apiClientCandidates[i];
                console.log(`✅ Found API client`);
                break;
            }
        }

        // Create minimal API client if not found
        if (!foundAPIClient) {
            console.log('🔧 Creating minimal API client...');
            window.APIClient = class APIClient {
                constructor() {
                    this.sessionToken = localStorage.getItem('bitware-session-token');
                    this.baseUrl = window.location.origin;
                }
                
                async callWorker(workerName, endpoint, method = 'GET', data = null) {
                    try {
                        this.sessionToken = localStorage.getItem('bitware-session-token');
                        
                        const requestBody = {
                            endpoint: endpoint,
                            method: method.toUpperCase()
                        };
                        
                        if (data !== null && data !== undefined) {
                            requestBody.data = data;
                        }
                        
                        const response = await fetch(`${this.baseUrl}/api/${workerName}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Session-Token': this.sessionToken || '',
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify(requestBody)
                        });
                        
                        if (!response.ok) {
                            throw new Error(`API call failed: ${response.status}`);
                        }
                        
                        return await response.json();
                        
                    } catch (error) {
                        console.error(`API call failed: ${workerName} ${endpoint}`, error);
                        throw error;
                    }
                }
            };
            foundAPIClient = window.APIClient;
        }

        // Ensure API client instance exists
        if (!window.apiClient) {
            console.log('📡 Creating API client instance...');
            window.apiClient = new foundAPIClient();
        }

        // Find dashboard under various names
        const dashboardCandidates = [
            window.AdminDashboard,
            window.adminDashboard,
            window.Dashboard,
            window.dashboard
        ];

        for (const candidate of dashboardCandidates) {
            if (candidate) {
                this.originalDashboard = candidate;
                console.log('✅ Found existing dashboard');
                break;
            }
        }

        if (!this.originalDashboard) {
            console.log('⚠️ No existing dashboard found - Phase 1 will work standalone');
        }
    }

    /**
     * Initialize core Phase 1 components
     */
    async initializeCore() {
        console.log('🔧 Initializing core components...');

        try {
            // Initialize Session Manager
            if (!window.sessionManager && window.SessionManager) {
                console.log('🔐 Creating SessionManager...');
                window.sessionManager = new SessionManager(window.apiClient);
            }

            // Initialize/verify KAM Context Manager
            if (!window.kamContext && window.KAMContextManager) {
                console.log('🏢 Creating KAM Context...');
                window.kamContext = new KAMContextManager(window.apiClient);
            }
            
            if (window.kamContext && !window.kamContext.initialized) {
                console.log('🔄 Initializing KAM Context...');
                await window.kamContext.initialize();
            }

            // Initialize Permission Resolver
            if (!window.permissionResolver && window.PermissionResolver) {
                console.log('🛡️ Creating PermissionResolver...');
                window.permissionResolver = new PermissionResolver(window.kamContext);
            }

            // Initialize Component Registry
            if (!window.componentRegistry && window.ComponentRegistry) {
                console.log('📦 Creating ComponentRegistry...');
                window.componentRegistry = new ComponentRegistry(window.kamContext, window.permissionResolver);
            }

            this.components = {
                sessionManager: window.sessionManager,
                kamContext: window.kamContext,
                permissionResolver: window.permissionResolver,
                componentRegistry: window.componentRegistry
            };

            console.log('✅ Core components initialized');

        } catch (error) {
            console.error('❌ Core component initialization failed:', error);
            throw error;
        }
    }

    /**
     * Enhance existing dashboard with Phase 1 capabilities
     */
    async enhanceExistingDashboard() {
        if (!this.originalDashboard) {
            console.log('ℹ️ No dashboard to enhance - skipping');
            return;
        }

        console.log('🎨 Enhancing existing dashboard...');

        try {
            // Add KAM context to existing dashboard (handle both class and instance)
            if (typeof this.originalDashboard === 'object') {
                // Dashboard instance
                this.originalDashboard.kamContext = window.kamContext;
                this.originalDashboard.permissionResolver = window.permissionResolver;
                this.originalDashboard.componentRegistry = window.componentRegistry;
                this.originalDashboard.sessionManager = window.sessionManager;
                console.log('✅ Dashboard instance enhanced');
            }

            // Also enhance global adminDashboard if it exists
            if (window.adminDashboard && window.adminDashboard !== this.originalDashboard) {
                window.adminDashboard.kamContext = window.kamContext;
                window.adminDashboard.permissionResolver = window.permissionResolver;
                window.adminDashboard.componentRegistry = window.componentRegistry;
                window.adminDashboard.sessionManager = window.sessionManager;
                console.log('✅ Global adminDashboard enhanced');
            }

            // Enhance loadUserInfo if available
            this.enhanceUserInfoLoading();

            // Enhance component loading
            this.enhanceComponentLoading();

        } catch (error) {
            console.warn('⚠️ Dashboard enhancement failed (non-critical):', error);
        }
    }

    /**
     * Enhance user info loading with KAM context
     */
    enhanceUserInfoLoading() {
        const dashboards = [this.originalDashboard, window.adminDashboard].filter(Boolean);
        
        dashboards.forEach(dashboard => {
            if (dashboard && dashboard.loadUserInfo) {
                const originalLoadUserInfo = dashboard.loadUserInfo.bind(dashboard);
                dashboard.loadUserInfo = async function() {
                    try {
                        await originalLoadUserInfo();
                        
                        // Add KAM context enhancement
                        if (this.user && window.kamContext) {
                            const kamContext = await window.kamContext.getContext();
                            if (kamContext) {
                                this.user.kam_context = kamContext;
                                console.log('✅ User enhanced with KAM context');
                            }
                        }
                    } catch (error) {
                        console.error('❌ Enhanced loadUserInfo failed:', error);
                        throw error;
                    }
                };
            }
        });
    }

    /**
     * Enhance component loading with permission checks
     */
    enhanceComponentLoading() {
        const dashboards = [this.originalDashboard, window.adminDashboard].filter(Boolean);
        
        dashboards.forEach(dashboard => {
            if (!dashboard) return;

            const componentMethods = [
                'executiveSummary',
                'workerGrid', 
                'clientGrid',
                'financialDashboard',
                'systemAnalytics'
            ];

            componentMethods.forEach(componentName => {
                const component = dashboard[componentName];
                if (component && component.load) {
                    const originalLoad = component.load.bind(component);
                    
                    component.load = async function() {
                        try {
                            // Check permissions before loading
                            if (window.permissionResolver) {
                                const hasPermission = await window.permissionResolver.hasPermission('dashboard_access');
                                if (!hasPermission) {
                                    console.log(`🔒 Access denied to ${componentName}`);
                                    if (this.showAccessDenied) {
                                        this.showAccessDenied();
                                    }
                                    return;
                                }
                            }

                            // Load with enhanced context
                            await originalLoad();
                            
                        } catch (error) {
                            console.error(`❌ Enhanced component load failed for ${componentName}:`, error);
                            throw error;
                        }
                    };
                }
            });
        });
    }

    /**
     * Setup event listeners for Phase 1 functionality
     */
    setupEventListeners() {
        // Listen for KAM context ready
        window.addEventListener('kamContextReady', (event) => {
            console.log('📢 KAM Context Ready:', event.detail);
            this.onKAMContextReady(event.detail);
        });

        // Listen for KAM context updates
        window.addEventListener('kamContextUpdated', (event) => {
            console.log('📢 KAM Context Updated:', event.detail);
            this.onKAMContextUpdated(event.detail);
        });

        // Listen for session cleared
        window.addEventListener('sessionCleared', () => {
            console.log('📢 Session Cleared');
            this.onSessionCleared();
        });

        console.log('📡 Event listeners setup complete');
    }

    /**
     * Create test function for validation
     */
    createTestFunction() {
        window.testPhase1 = async () => {
            console.log('🧪 Testing Phase 1 Integration...');
            
            if (window.phase1Integration) {
                const status = await window.phase1Integration.getStatus();
                console.table(status);
                return status;
            } else {
                console.error('❌ Phase 1 Integration not found');
                return null;
            }
        };
    }

    /**
     * Handle KAM context ready event
     */
    onKAMContextReady(context) {
        this.updateUIForContext(context);
        this.refreshPermissionComponents();
    }

    /**
     * Handle KAM context updated event
     */
    onKAMContextUpdated(context) {
        this.updateUIForContext(context);
        
        if (window.componentRegistry) {
            window.componentRegistry.clearCache();
        }
    }

    /**
     * Handle session cleared event
     */
    onSessionCleared() {
        if (window.kamContext) {
            window.kamContext.clearContext();
        }
        
        if (window.permissionResolver) {
            window.permissionResolver.clearCache();
        }
        
        if (window.componentRegistry) {
            window.componentRegistry.clearCache();
        }
    }

    /**
     * Update UI elements based on KAM context
     */
    updateUIForContext(context) {
        this.updateHeaderInfo(context);
        this.updateSubscriptionDisplay(context);
        this.updateBudgetDisplay(context);
    }

    /**
     * Update header information
     */
    updateHeaderInfo(context) {
        const companyElement = document.getElementById('client-company');
        const tierElement = document.getElementById('subscription-tier');
        
        if (companyElement && context.company_name) {
            companyElement.textContent = context.company_name;
        }
        
        if (tierElement && context.subscription_tier) {
            tierElement.textContent = context.subscription_tier.toUpperCase();
            tierElement.className = `tier-badge tier-${context.subscription_tier}`;
        }
    }

    /**
     * Update subscription tier display
     */
    updateSubscriptionDisplay(context) {
        const tierDisplay = document.getElementById('tier-display');
        if (tierDisplay) {
            const tierColors = {
                basic: '#6b7280',
                standard: '#3b82f6',
                premium: '#8b5cf6',
                enterprise: '#f59e0b'
            };
            
            tierDisplay.innerHTML = `
                <span style="
                    background: ${tierColors[context.subscription_tier] || tierColors.basic};
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 600;
                ">
                    ${(context.subscription_tier || 'basic').toUpperCase()}
                </span>
            `;
        }
    }

    /**
     * Update budget display
     */
    updateBudgetDisplay(context) {
        const budgetDisplay = document.getElementById('budget-display');
        if (budgetDisplay) {
            const budget = context.monthly_budget_usd || 100;
            const used = context.current_usage_usd || 0;
            const percentage = (used / budget) * 100;
            
            budgetDisplay.innerHTML = `
                <div style="margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px;">
                        <span>Budget Used</span>
                        <span>$${used.toFixed(2)} / $${budget.toFixed(2)}</span>
                    </div>
                    <div style="
                        width: 100%;
                        height: 4px;
                        background: #e5e7eb;
                        border-radius: 2px;
                        overflow: hidden;
                        margin-top: 4px;
                    ">
                        <div style="
                            width: ${Math.min(percentage, 100)}%;
                            height: 100%;
                            background: ${percentage > 90 ? '#ef4444' : percentage > 70 ? '#f59e0b' : '#10b981'};
                            transition: width 0.3s ease;
                        "></div>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Refresh components that depend on permissions
     */
    async refreshPermissionComponents() {
        if (!this.originalDashboard) return;

        try {
            if (window.componentRegistry) {
                const accessibleComponents = await window.componentRegistry.getAccessibleComponents();
                console.log('🔄 Accessible components:', accessibleComponents);
            }
        } catch (error) {
            console.error('❌ Failed to refresh permission components:', error);
        }
    }

    /**
     * Get Phase 1 status for debugging (enhanced)
     */
    async getStatus() {
        const sessionSummary = window.sessionManager ? 
            window.sessionManager.getSessionSummary() : null;
        
        const kamContext = window.kamContext ? 
            await window.kamContext.getContext() : null;
        
        const permissionSummary = window.permissionResolver ? 
            await window.permissionResolver.getPermissionSummary().catch(() => ({})) : {};
            
        const registryStats = window.componentRegistry ? 
            window.componentRegistry.getStats() : null;

        return {
            initialized: this.initialized,
            components: {
                sessionManager: !!window.sessionManager,
                kamContext: !!window.kamContext,
                permissionResolver: !!window.permissionResolver,
                componentRegistry: !!window.componentRegistry
            },
            dashboard_enhanced: !!(this.originalDashboard?.kamContext || window.adminDashboard?.kamContext),
            session_summary: sessionSummary,
            kam_context: kamContext,
            permission_summary: permissionSummary,
            registry_stats: registryStats
        };
    }

    /**
     * Manual refresh of all Phase 1 components
     */
    async refresh() {
        try {
            console.log('🔄 Refreshing Phase 1 components...');

            if (window.kamContext) {
                await window.kamContext.initialize();
            }

            if (window.permissionResolver) {
                window.permissionResolver.clearCache();
            }

            if (window.componentRegistry) {
                window.componentRegistry.clearCache();
            }

            if (this.originalDashboard && this.originalDashboard.loadAllComponents) {
                await this.originalDashboard.loadAllComponents();
            }

            console.log('✅ Phase 1 refresh complete');

        } catch (error) {
            console.error('❌ Phase 1 refresh failed:', error);
        }
    }
}

// Auto-initialize when DOM is ready
window.addEventListener('DOMContentLoaded', async () => {
    if (!window.phase1Integration) {
        console.log('🎯 Starting Phase 1 Auto-Initialization...');
        
        window.phase1Integration = new Phase1Integration();
        
        // Small delay to allow existing scripts to load
        setTimeout(async () => {
            const success = await window.phase1Integration.initialize();
            if (success) {
                console.log('🎉 Phase 1 ready! Enhanced features available.');
            } else {
                console.warn('⚠️ Phase 1 initialization issues - check console for details');
            }
        }, 500);
    }
});

// Export for global use
window.Phase1Integration = Phase1Integration;