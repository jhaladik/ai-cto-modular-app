/**
 * Phase 2: Integration Guide & Implementation Plan
 * How to integrate all Phase 2 components with existing system
 */

// =============================================================================
// PHASE 2 COMPONENT REGISTRY EXTENSION
// =============================================================================

/**
 * Extends Phase 1 Component Registry with Phase 2 shared components
 */
class Phase2ComponentRegistry {
    constructor(phase1Registry) {
        this.phase1Registry = phase1Registry;
        this.sharedComponents = new Map();
        this.workerComponents = new Map();
        
        this.registerSharedComponents();
        this.registerWorkerComponents();
    }

    /**
     * Register all shared widgets from Phase 2
     */
    registerSharedComponents() {
        // Register base classes
        this.sharedComponents.set('WorkerCardBase', {
            class: WorkerCardBase,
            type: 'base-class',
            dependencies: ['kamContext', 'permissionResolver', 'apiClient']
        });

        this.sharedComponents.set('WorkerInterfaceBase', {
            class: WorkerInterfaceBase,
            type: 'base-class',
            dependencies: ['kamContext', 'permissionResolver', 'apiClient']
        });

        // Register shared widgets
        this.sharedComponents.set('TopicInputWidget', {
            class: TopicInputWidget,
            type: 'widget',
            dependencies: ['kamContext'],
            category: 'input'
        });

        this.sharedComponents.set('ProgressTrackerWidget', {
            class: ProgressTrackerWidget,
            type: 'widget',
            dependencies: ['kamContext'],
            category: 'monitoring'
        });

        this.sharedComponents.set('ResultsTableWidget', {
            class: ResultsTableWidget,
            type: 'widget',
            dependencies: ['kamContext'],
            category: 'display'
        });

        this.sharedComponents.set('ExportManagerWidget', {
            class: ExportManagerWidget,
            type: 'widget',
            dependencies: ['kamContext'],
            category: 'export'
        });
    }

    /**
     * Register worker-specific components
     */
    registerWorkerComponents() {
        this.workerComponents.set('TemplateGalleryWidget', {
            class: TemplateGalleryWidget,
            type: 'worker-component',
            dependencies: ['kamContext', 'workerId'],
            category: 'configuration'
        });

        this.workerComponents.set('ParameterBuilderWidget', {
            class: ParameterBuilderWidget,
            type: 'worker-component',
            dependencies: ['kamContext'],
            category: 'configuration'
        });

        this.workerComponents.set('CostEstimatorWidget', {
            class: CostEstimatorWidget,
            type: 'worker-component',
            dependencies: ['kamContext', 'workerId'],
            category: 'estimation'
        });
    }

    /**
     * Create a shared component instance
     */
    createSharedComponent(componentName, config = {}) {
        const componentDef = this.sharedComponents.get(componentName);
        if (!componentDef) {
            throw new Error(`Shared component not found: ${componentName}`);
        }

        // Inject dependencies
        const finalConfig = this.injectDependencies(config, componentDef.dependencies);
        
        return new componentDef.class(finalConfig);
    }

    /**
     * Create a worker-specific component instance
     */
    createWorkerComponent(componentName, config = {}) {
        const componentDef = this.workerComponents.get(componentName);
        if (!componentDef) {
            throw new Error(`Worker component not found: ${componentName}`);
        }

        // Inject dependencies
        const finalConfig = this.injectDependencies(config, componentDef.dependencies);
        
        return new componentDef.class(finalConfig);
    }

    /**
     * Inject required dependencies into component config
     */
    injectDependencies(config, dependencies) {
        const finalConfig = { ...config };

        for (const dep of dependencies) {
            if (!finalConfig[dep]) {
                switch (dep) {
                    case 'kamContext':
                        finalConfig.kamContext = window.kamContext;
                        break;
                    case 'permissionResolver':
                        finalConfig.permissionResolver = window.permissionResolver;
                        break;
                    case 'apiClient':
                        finalConfig.apiClient = window.apiClient;
                        break;
                }
            }
        }

        return finalConfig;
    }

    /**
     * Get all available shared components
     */
    getAvailableSharedComponents() {
        return Array.from(this.sharedComponents.keys());
    }

    /**
     * Get all available worker components
     */
    getAvailableWorkerComponents() {
        return Array.from(this.workerComponents.keys());
    }
}

// =============================================================================
// WORKER REFACTORING EXAMPLE - UNIVERSAL RESEARCHER
// =============================================================================

/**
 * Example of how to refactor existing worker using Phase 2 components
 * This replaces the existing universal-researcher.js
 */
class UniversalResearcherCard extends WorkerCardBase {
    constructor(config) {
        super({
            workerId: 'universal-researcher',
            title: '🔬 Universal Researcher',
            icon: '🔬',
            description: 'AI-powered research and analysis',
            requiresPermission: 'basic_worker_access',
            ...config
        });

        // Initialize child components
        this.topicInput = null;
        this.templateGallery = null;
        this.parameterBuilder = null;
        this.costEstimator = null;
        
        this.selectedTemplate = 'search_rss';
        this.parameters = {};
    }

    async renderContent() {
        // Create components if not already created
        await this.initializeComponents();

        return `
            <div class="researcher-content">
                <div class="input-section">
                    ${await this.topicInput.render()}
                </div>
                
                <div class="template-section">
                    ${await this.templateGallery.render()}
                </div>
                
                <div class="parameters-section" id="${this.workerId}-params">
                    ${this.parameterBuilder.render()}
                </div>
                
                <div class="cost-section">
                    ${await this.costEstimator.render()}
                </div>
            </div>
        `;
    }

    async initializeComponents() {
        if (!this.topicInput) {
            this.topicInput = window.phase2Registry.createSharedComponent('TopicInputWidget', {
                id: `${this.workerId}-topic`,
                placeholder: 'Enter research topic...',
                suggestions: true,
                onChange: (topic) => this.onTopicChange(topic)
            });
        }

        if (!this.templateGallery) {
            this.templateGallery = window.phase2Registry.createWorkerComponent('TemplateGalleryWidget', {
                id: `${this.workerId}-templates`,
                workerId: this.workerId,
                onSelectionChange: (templateId) => this.onTemplateChange(templateId)
            });
        }

        if (!this.parameterBuilder) {
            this.parameterBuilder = window.phase2Registry.createWorkerComponent('ParameterBuilderWidget', {
                id: `${this.workerId}-params`,
                parameters: this.getTemplateParameters(),
                onParameterChange: (name, value, allParams) => this.onParameterChange(name, value, allParams)
            });
        }

        if (!this.costEstimator) {
            this.costEstimator = window.phase2Registry.createWorkerComponent('CostEstimatorWidget', {
                id: `${this.workerId}-cost`,
                workerId: this.workerId,
                templateId: this.selectedTemplate,
                parameters: this.parameters
            });
        }
    }

    // Event handlers
    onTopicChange(topic) {
        // Update cost estimate based on topic complexity
        this.costEstimator.updateParameters({ ...this.parameters, topic });
    }

    onTemplateChange(templateId) {
        this.selectedTemplate = templateId;
        
        // Update parameter builder with new template parameters
        const templateParams = this.getTemplateParameters();
        this.parameterBuilder.setParameters(templateParams);
        
        // Update cost estimator
        this.costEstimator.updateTemplate(templateId);
    }

    onParameterChange(name, value, allParams) {
        this.parameters = allParams;
        
        // Update cost estimate
        this.costEstimator.updateParameters(this.parameters);
    }

    getTemplateParameters() {
        // Return parameters based on selected template
        const templateParams = {
            'search_rss': [
                {
                    name: 'depth',
                    type: 'select',
                    label: 'Search Depth',
                    options: [
                        { value: 'basic', label: 'Basic Search' },
                        { value: 'comprehensive', label: 'Comprehensive Search' }
                    ],
                    default: 'basic',
                    required: true
                },
                {
                    name: 'sources',
                    type: 'number',
                    label: 'Number of Sources',
                    min: 1,
                    max: 50,
                    default: 10,
                    description: 'Maximum number of sources to analyze'
                }
            ],
            'deep_research': [
                {
                    name: 'analysis_depth',
                    type: 'select',
                    label: 'Analysis Depth',
                    options: [
                        { value: 'summary', label: 'Summary Only' },
                        { value: 'detailed', label: 'Detailed Analysis' },
                        { value: 'comprehensive', label: 'Comprehensive Report' }
                    ],
                    default: 'detailed',
                    required: true
                },
                {
                    name: 'include_charts',
                    type: 'boolean',
                    label: 'Include Charts',
                    checkboxLabel: 'Generate visual charts and graphs',
                    default: false
                },
                {
                    name: 'time_range',
                    type: 'select',
                    label: 'Time Range',
                    options: [
                        { value: '24h', label: 'Last 24 hours' },
                        { value: '7d', label: 'Last 7 days' },
                        { value: '30d', label: 'Last 30 days' },
                        { value: '90d', label: 'Last 90 days' }
                    ],
                    default: '7d'
                }
            ]
        };

        return templateParams[this.selectedTemplate] || [];
    }

    renderCustomActions() {
        return `
            <button class="btn btn-secondary" onclick="this.showHistory()">
                📋 History
            </button>
        `;
    }

    async executeWorker() {
        // Check if we can afford this operation
        const costEstimate = this.costEstimator.getEstimate();
        if (!costEstimate.can_afford) {
            alert('Insufficient budget for this operation. Please upgrade or adjust parameters.');
            return;
        }

        // Get all input data
        const inputData = {
            topic: this.topicInput.getValue(),
            template: this.selectedTemplate,
            parameters: this.parameterBuilder.getValues()
        };

        // Validate input
        if (!inputData.topic) {
            alert('Please enter a research topic');
            return;
        }

        if (!this.parameterBuilder.validateAll()) {
            alert('Please fix parameter validation errors');
            return;
        }

        // Show progress
        const progressTracker = window.phase2Registry.createSharedComponent('ProgressTrackerWidget', {
            id: `${this.workerId}-progress`,
            stages: ['Initializing', 'Searching Sources', 'Analyzing Content', 'Generating Report'],
            showCost: true
        });

        // Execute via parent class
        await super.executeWorker(inputData, progressTracker);
    }

    showHistory() {
        // Show research history using results table
        const historyTable = window.phase2Registry.createSharedComponent('ResultsTableWidget', {
            columns: [
                { key: 'topic', label: 'Topic' },
                { key: 'template', label: 'Template' },
                { key: 'created_at', label: 'Date', format: 'datetime' },
                { key: 'cost', label: 'Cost', format: 'currency' }
            ],
            data: this.getHistoryData(),
            exportEnabled: true,
            sortEnabled: true,
            filterEnabled: true
        });

        // Show in modal (simplified)
        alert('History table would be shown in modal');
    }

    getHistoryData() {
        // Mock history data - in real implementation, get from API
        return [
            {
                topic: 'AI Market Trends',
                template: 'deep_research',
                created_at: '2025-07-29T10:30:00Z',
                cost: 0.25
            },
            {
                topic: 'Competitor Analysis',
                template: 'search_rss',
                created_at: '2025-07-28T15:45:00Z',
                cost: 0.05
            }
        ];
    }
}

// =============================================================================
// PHASE 2 IMPLEMENTATION SCRIPT
// =============================================================================

/**
 * Complete Phase 2 initialization and integration
 */
class Phase2Implementation {
    constructor() {
        this.initialized = false;
        this.registry = null;
    }

    async initialize() {
        try {
            console.log('🎨 Phase 2 Implementation starting...');

            // Wait for Phase 1 to be ready
            await this.waitForPhase1();

            // Create Phase 2 registry
            this.registry = new Phase2ComponentRegistry(window.componentRegistry);
            window.phase2Registry = this.registry;

            // Register refactored worker cards
            this.registerRefactoredWorkers();

            // Update existing dashboard with Phase 2 components
            await this.enhanceDashboard();

            // Setup CSS for Phase 2 components
            this.injectPhase2Styles();

            this.initialized = true;
            console.log('✅ Phase 2 Implementation complete!');

            return true;

        } catch (error) {
            console.error('❌ Phase 2 Implementation failed:', error);
            return false;
        }
    }

    async waitForPhase1() {
        const maxWait = 10000;
        const checkInterval = 100;
        let waited = 0;

        return new Promise((resolve, reject) => {
            const check = () => {
                if (window.phase1Integration && window.componentRegistry) {
                    resolve();
                    return;
                }

                waited += checkInterval;
                if (waited >= maxWait) {
                    reject(new Error('Phase 1 not ready after 10 seconds'));
                    return;
                }

                setTimeout(check, checkInterval);
            };

            check();
        });
    }

    registerRefactoredWorkers() {
        // Register refactored worker cards
        window.componentRegistry.registerComponent('universal-researcher-card-v2', {
            type: 'worker-card',
            baseClass: 'UniversalResearcherCard',
            workerId: 'universal-researcher',
            permissions: ['basic_worker_access'],
            config: {
                title: '🔬 Universal Researcher (v2)',
                description: 'Enhanced AI research with shared components'
            }
        });

        // Register the class globally
        window.UniversalResearcherCard = UniversalResearcherCard;
    }

    async enhanceDashboard() {
        // Add Phase 2 components to existing dashboard
        if (window.adminDashboard) {
            window.adminDashboard.phase2Registry = this.registry;
            console.log('✅ Dashboard enhanced with Phase 2 registry');
        }
    }

    injectPhase2Styles() {
        const styles = `
        <style id="phase2-styles">
        /* Phase 2 Component Styles */
        
        /* Topic Input Widget */
        .topic-input-widget {
            margin-bottom: 20px;
        }
        
        .input-group {
            display: flex;
            border: 1px solid #ddd;
            border-radius: 6px;
            overflow: hidden;
        }
        
        .topic-input {
            flex: 1;
            padding: 12px;
            border: none;
            outline: none;
        }
        
        .input-addon-btn {
            background: #f8f9fa;
            border: none;
            padding: 8px 12px;
            cursor: pointer;
        }
        
        .recent-topics {
            margin-top: 10px;
        }
        
        .topic-chips {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 5px;
        }
        
        .topic-chip {
            background: #e9ecef;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            cursor: pointer;
            transition: background 0.2s;
        }
        
        .topic-chip:hover {
            background: #dee2e6;
        }
        
        /* Progress Tracker Widget */
        .progress-tracker {
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .progress-stages {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
        }
        
        .stage {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1;
            position: relative;
        }
        
        .stage:not(:last-child)::after {
            content: '';
            position: absolute;
            top: 20px;
            right: -50%;
            width: 100%;
            height: 2px;
            background: #e9ecef;
            z-index: 1;
        }
        
        .stage.completed:not(:last-child)::after {
            background: #28a745;
        }
        
        .stage-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #e9ecef;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            z-index: 2;
        }
        
        .stage.active .stage-icon {
            background: #007bff;
            color: white;
        }
        
        .stage.completed .stage-icon {
            background: #28a745;
            color: white;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e9ecef;
            border-radius: 4px;
            overflow: hidden;
            margin: 15px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #007bff, #28a745);
            transition: width 0.3s ease;
        }
        
        /* Template Gallery Widget */
        .template-gallery {
            margin: 20px 0;
        }
        
        .template-container.grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 15px;
        }
        
        .template-container.list .template-card {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .template-card {
            border: 2px solid #e9ecef;
            border-radius: 8px;
            padding: 15px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .template-card:hover {
            border-color: #007bff;
            box-shadow: 0 2px 8px rgba(0,123,255,0.1);
        }
        
        .template-card.selected {
            border-color: #007bff;
            background: #f8f9ff;
        }
        
        .template-card.disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        .template-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
        }
        
        .template-icon {
            font-size: 24px;
        }
        
        .template-lock {
            color: #6c757d;
            margin-left: auto;
        }
        
        .tier-badge {
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .tier-basic { background: #6c757d; color: white; }
        .tier-standard { background: #007bff; color: white; }
        .tier-premium { background: #6f42c1; color: white; }
        .tier-enterprise { background: #fd7e14; color: white; }
        
        /* Results Table Widget */
        .results-table-widget {
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .table-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            background: #f8f9fa;
            border-bottom: 1px solid #ddd;
        }
        
        .results-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .results-table th,
        .results-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        
        .results-table th {
            background: #f8f9fa;
            font-weight: 600;
        }
        
        .results-table th.sortable {
            cursor: pointer;
        }
        
        .results-table th.sortable:hover {
            background: #e9ecef;
        }
        
        /* Cost Estimator Widget */
        .cost-estimator {
            background: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
        }
        
        .cost-breakdown {
            margin: 15px 0;
        }
        
        .cost-line {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
        }
        
        .cost-line.total {
            border-top: 1px solid #ddd;
            margin-top: 10px;
            padding-top: 10px;
        }
        
        .budget-bar {
            width: 100%;
            height: 6px;
            background: #e9ecef;
            border-radius: 3px;
            position: relative;
            margin: 10px 0;
        }
        
        .budget-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745, #ffc107, #dc3545);
            border-radius: 3px;
            transition: width 0.3s ease;
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
            .template-container.grid {
                grid-template-columns: 1fr;
            }
            
            .progress-stages {
                flex-direction: column;
                gap: 15px;
            }
            
            .stage:not(:last-child)::after {
                display: none;
            }
        }
        </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }

    getStatus() {
        return {
            initialized: this.initialized,
            registry_available: !!this.registry,
            shared_components: this.registry ? this.registry.getAvailableSharedComponents().length : 0,
            worker_components: this.registry ? this.registry.getAvailableWorkerComponents().length : 0,
            refactored_workers: ['universal-researcher'],
            phase1_ready: !!(window.phase1Integration && window.componentRegistry)
        };
    }
}

// =============================================================================
// AUTO-INITIALIZATION
// =============================================================================

// Auto-initialize Phase 2 when DOM is ready
window.addEventListener('DOMContentLoaded', async () => {
    // Small delay to allow Phase 1 to complete
    setTimeout(async () => {
        if (!window.phase2Implementation) {
            console.log('🎨 Starting Phase 2 Auto-Initialization...');
            
            window.phase2Implementation = new Phase2Implementation();
            
            const success = await window.phase2Implementation.initialize();
            if (success) {
                console.log('🎉 Phase 2 ready! Shared components available.');
                
                // Create test function
                window.testPhase2 = () => {
                    console.log('🧪 Testing Phase 2 Implementation...');
                    const status = window.phase2Implementation.getStatus();
                    console.table(status);
                    return status;
                };
                
            } else {
                console.warn('⚠️ Phase 2 initialization issues - check console for details');
            }
        }
    }, 2000); // Wait 2 seconds for Phase 1
});

// Export for global use
window.Phase2Implementation = Phase2Implementation;
window.Phase2ComponentRegistry = Phase2ComponentRegistry;
window.UniversalResearcherCard = UniversalResearcherCard;