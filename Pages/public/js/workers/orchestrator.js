// public/js/workers/orchestrator.js
// @WORKER: OrchestratorInterface
// 🧱 Type: BrowserClient
// 📍 Path: public/js/workers/orchestrator.js
// 🎯 Role: Advanced orchestrator functionality and utilities
// 💾 Storage: { browser: "DOM, sessionStorage" }

class OrchestratorClient {
    constructor() {
        this.apiClient = window.apiClient;
        this.baseEndpoint = 'orchestrator';
        this.activePipelines = new Map();
        this.workerHealthCache = new Map();
        this.lastHealthCheck = 0;
        this.healthCheckInterval = 30000; // 30 seconds
        
        this.strategies = {
            balanced: {
                name: 'Balanced',
                description: 'Optimal balance of speed, cost, and quality',
                icon: '🎯',
                estimatedTime: '2-3 minutes',
                estimatedCost: '$0.15-0.25'
            },
            speed: {
                name: 'Speed Optimized', 
                description: 'Fastest execution with parallel processing',
                icon: '⚡',
                estimatedTime: '1-2 minutes',
                estimatedCost: '$0.20-0.35'
            },
            cost: {
                name: 'Cost Optimized',
                description: 'Lowest cost with aggressive caching',
                icon: '💰',
                estimatedTime: '3-5 minutes', 
                estimatedCost: '$0.10-0.20'
            },
            quality: {
                name: 'Quality Optimized',
                description: 'Highest quality with deep analysis',
                icon: '🎓',
                estimatedTime: '3-4 minutes',
                estimatedCost: '$0.25-0.40'
            }
        };
        
        this.qualityLevels = {
            basic: {
                name: 'Basic',
                description: 'Essential analysis only',
                features: ['Basic topic research', 'Standard RSS sources', 'Simple classification']
            },
            standard: {
                name: 'Standard',
                description: 'Standard depth analysis',
                features: ['Comprehensive research', 'Quality source filtering', 'AI-powered classification', 'Basic insights']
            },
            premium: {
                name: 'Premium',
                description: 'Enhanced analysis with summaries',
                features: ['Deep topic analysis', 'Premium sources', 'Advanced classification', 'Detailed summaries', 'Trend analysis']
            },
            enterprise: {
                name: 'Enterprise',
                description: 'Maximum depth with custom insights',
                features: ['Enterprise-grade analysis', 'All available sources', 'Multi-model classification', 'Executive summaries', 'Custom insights', 'Competitive analysis']
            }
        };
    }

    // Pipeline Execution Methods
    async executePipeline(pipelineConfig) {
        try {
            const response = await this.apiClient.callWorker(this.baseEndpoint, '/orchestrate', pipelineConfig);
            
            if (response.pipeline_id) {
                this.activePipelines.set(response.pipeline_id, {
                    config: pipelineConfig,
                    startTime: Date.now(),
                    status: response.status,
                    lastUpdate: Date.now()
                });
            }
            
            return response;
        } catch (error) {
            console.error('Pipeline execution failed:', error);
            throw new Error(`Pipeline execution failed: ${error.message}`);
        }
    }

    async getPipelineStatus(pipelineId) {
        try {
            const response = await this.apiClient.callWorker(this.baseEndpoint, `/pipeline/${pipelineId}`);
            
            if (this.activePipelines.has(pipelineId)) {
                const pipeline = this.activePipelines.get(pipelineId);
                pipeline.status = response.status;
                pipeline.lastUpdate = Date.now();
                this.activePipelines.set(pipelineId, pipeline);
            }
            
            return response;
        } catch (error) {
            console.error('Failed to get pipeline status:', error);
            return null;
        }
    }

    // Health Monitoring Methods
    async getSystemHealth(useCache = true) {
        const now = Date.now();
        
        if (useCache && (now - this.lastHealthCheck) < this.healthCheckInterval) {
            return Array.from(this.workerHealthCache.values());
        }
        
        try {
            const health = await this.apiClient.callWorker(this.baseEndpoint, '/pipeline-health');
            
            if (health.workers) {
                this.workerHealthCache.clear();
                Object.entries(health.workers).forEach(([name, data]) => {
                    this.workerHealthCache.set(name, {
                        name,
                        status: data.status,
                        responseTime: data.response_time_ms,
                        lastCheck: now,
                        ...data
                    });
                });
                this.lastHealthCheck = now;
            }
            
            return health;
        } catch (error) {
            console.error('Health check failed:', error);
            return { error: error.message, workers: {} };
        }
    }

    async getPerformanceInsights(timeRange = '24h') {
        try {
            return await this.apiClient.callWorker(this.baseEndpoint, `/performance-insights?time_range=${timeRange}`);
        } catch (error) {
            console.error('Failed to get performance insights:', error);
            return null;
        }
    }

    async getAdminStats() {
        try {
            return await this.apiClient.callWorker(this.baseEndpoint, '/admin/stats');
        } catch (error) {
            console.error('Failed to get admin stats:', error);
            return null;
        }
    }

    // Pipeline Management Methods
    getActivePipelines() {
        return Array.from(this.activePipelines.entries()).map(([id, data]) => ({
            id,
            ...data
        }));
    }

    clearCompletedPipelines() {
        const completed = [];
        for (const [id, pipeline] of this.activePipelines.entries()) {
            if (['completed', 'failed', 'partial'].includes(pipeline.status)) {
                completed.push(id);
            }
        }
        
        completed.forEach(id => this.activePipelines.delete(id));
        return completed.length;
    }

    // Utility Methods
    validatePipelineConfig(config) {
        const errors = [];
        
        if (!config.topic || config.topic.trim().length === 0) {
            errors.push('Topic is required');
        }
        
        if (config.topic && config.topic.length > 200) {
            errors.push('Topic must be less than 200 characters');
        }
        
        if (config.budget_limit && (config.budget_limit < 0.10 || config.budget_limit > 10.00)) {
            errors.push('Budget limit must be between $0.10 and $10.00');
        }
        
        const validStrategies = ['balanced', 'speed', 'cost', 'quality'];
        if (config.optimize_for && !validStrategies.includes(config.optimize_for)) {
            errors.push('Invalid execution strategy');
        }
        
        const validUrgencies = ['low', 'medium', 'high', 'critical'];
        if (config.urgency && !validUrgencies.includes(config.urgency)) {
            errors.push('Invalid urgency level');
        }
        
        const validQualities = ['basic', 'standard', 'premium', 'enterprise'];
        if (config.quality_level && !validQualities.includes(config.quality_level)) {
            errors.push('Invalid quality level');
        }
        
        return errors;
    }

    estimatePipelineCost(config) {
        const baseMultipliers = {
            basic: 0.7,
            standard: 1.0,
            premium: 1.4,
            enterprise: 2.0
        };
        
        const strategyMultipliers = {
            cost: 0.8,
            balanced: 1.0,
            speed: 1.3,
            quality: 1.2
        };
        
        const urgencyMultipliers = {
            low: 0.9,
            medium: 1.0,
            high: 1.2,
            critical: 1.5
        };
        
        const baseCost = 0.20; // Base pipeline cost
        
        const qualityMultiplier = baseMultipliers[config.quality_level] || 1.0;
        const strategyMultiplier = strategyMultipliers[config.optimize_for] || 1.0;
        const urgencyMultiplier = urgencyMultipliers[config.urgency] || 1.0;
        const parallelMultiplier = config.enable_parallel_processing ? 1.1 : 1.0;
        
        const estimatedCost = baseCost * qualityMultiplier * strategyMultiplier * urgencyMultiplier * parallelMultiplier;
        
        return {
            estimated: Math.round(estimatedCost * 100) / 100,
            min: Math.round(estimatedCost * 0.8 * 100) / 100,
            max: Math.round(estimatedCost * 1.3 * 100) / 100,
            breakdown: {
                base: baseCost,
                quality: qualityMultiplier,
                strategy: strategyMultiplier, 
                urgency: urgencyMultiplier,
                parallel: parallelMultiplier
            }
        };
    }

    estimateExecutionTime(config) {
        const baseTimes = {
            basic: 90,     // 1.5 minutes
            standard: 150, // 2.5 minutes
            premium: 210,  // 3.5 minutes
            enterprise: 300 // 5 minutes
        };
        
        const strategyMultipliers = {
            speed: 0.6,
            balanced: 1.0,
            cost: 1.4,
            quality: 1.1
        };
        
        const urgencyMultipliers = {
            low: 1.2,
            medium: 1.0,
            high: 0.8,
            critical: 0.6
        };
        
        const baseTime = baseTimes[config.quality_level] || 150;
        const strategyMultiplier = strategyMultipliers[config.optimize_for] || 1.0;
        const urgencyMultiplier = urgencyMultipliers[config.urgency] || 1.0;
        const parallelMultiplier = config.enable_parallel_processing ? 0.8 : 1.0;
        
        const estimatedTime = baseTime * strategyMultiplier * urgencyMultiplier * parallelMultiplier;
        
        return {
            estimated: Math.round(estimatedTime),
            min: Math.round(estimatedTime * 0.7),
            max: Math.round(estimatedTime * 1.4),
            breakdown: {
                base: baseTime,
                strategy: strategyMultiplier,
                urgency: urgencyMultiplier,
                parallel: parallelMultiplier
            }
        };
    }

    formatExecutionTime(seconds) {
        if (seconds < 60) {
            return `${seconds}s`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        }
    }

    formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 3,
            maximumFractionDigits: 3
        }).format(amount);
    }

    // Pipeline Configuration Presets
    getPresetConfigurations() {
        return {
            quickNews: {
                name: 'Quick News Scan',
                description: 'Fast overview of current topics',
                config: {
                    optimize_for: 'speed',
                    urgency: 'medium',
                    quality_level: 'basic',
                    budget_limit: 0.50,
                    enable_parallel_processing: true
                }
            },
            deepAnalysis: {
                name: 'Deep Analysis',
                description: 'Comprehensive research with detailed insights',
                config: {
                    optimize_for: 'quality',
                    urgency: 'low',
                    quality_level: 'premium',
                    budget_limit: 2.00,
                    enable_parallel_processing: false
                }
            },
            budgetFriendly: {
                name: 'Budget Friendly',
                description: 'Cost-optimized pipeline for regular monitoring',
                config: {
                    optimize_for: 'cost',
                    urgency: 'low',
                    quality_level: 'standard',
                    budget_limit: 0.75,
                    enable_parallel_processing: false
                }
            },
            emergency: {
                name: 'Emergency Response',
                description: 'Critical priority for urgent intelligence',
                config: {
                    optimize_for: 'speed',
                    urgency: 'critical',
                    quality_level: 'standard',
                    budget_limit: 1.50,
                    enable_parallel_processing: true
                }
            }
        };
    }

    // Local Storage Management
    savePipelineConfig(name, config) {
        try {
            const saved = this.getSavedConfigurations();
            saved[name] = {
                config,
                saved_at: new Date().toISOString(),
                version: '1.0'
            };
            
            sessionStorage.setItem('orchestrator_saved_configs', JSON.stringify(saved));
            return true;
        } catch (error) {
            console.error('Failed to save pipeline configuration:', error);
            return false;
        }
    }

    getSavedConfigurations() {
        try {
            const saved = sessionStorage.getItem('orchestrator_saved_configs');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Failed to load saved configurations:', error);
            return {};
        }
    }

    deleteSavedConfiguration(name) {
        try {
            const saved = this.getSavedConfigurations();
            delete saved[name];
            sessionStorage.setItem('orchestrator_saved_configs', JSON.stringify(saved));
            return true;
        } catch (error) {
            console.error('Failed to delete saved configuration:', error);
            return false;
        }
    }

    // Export/Import Methods
    exportPipelineResults(pipelineId, format = 'json') {
        // This would export pipeline results in various formats
        // Implementation depends on the specific requirements
        console.log(`Exporting pipeline ${pipelineId} in ${format} format`);
        throw new Error('Export functionality not yet implemented');
    }

    // Real-time Updates
    subscribeToUpdates(callback) {
        // This would set up real-time updates for pipeline status
        // Could use WebSockets, Server-Sent Events, or polling
        this.updateCallback = callback;
        
        // For now, implement polling
        this.updateInterval = setInterval(async () => {
            if (this.activePipelines.size > 0 && this.updateCallback) {
                const updates = await this.checkActivePipelines();
                if (updates.length > 0) {
                    this.updateCallback(updates);
                }
            }
        }, 10000); // Check every 10 seconds
    }

    unsubscribeFromUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.updateCallback = null;
    }

    async checkActivePipelines() {
        const updates = [];
        
        for (const [id, pipeline] of this.activePipelines.entries()) {
            if (['running', 'pending'].includes(pipeline.status)) {
                const status = await this.getPipelineStatus(id);
                if (status && status.status !== pipeline.status) {
                    updates.push({
                        pipelineId: id,
                        oldStatus: pipeline.status,
                        newStatus: status.status,
                        data: status
                    });
                }
            }
        }
        
        return updates;
    }

    // Debugging and Development
    getDebugInfo() {
        return {
            activePipelines: this.activePipelines.size,
            workerHealthCache: this.workerHealthCache.size,
            lastHealthCheck: new Date(this.lastHealthCheck).toISOString(),
            hasUpdateCallback: !!this.updateCallback,
            strategies: Object.keys(this.strategies),
            qualityLevels: Object.keys(this.qualityLevels)
        };
    }
}

// Initialize the orchestrator client when this script loads
window.orchestratorClient = new OrchestratorClient();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OrchestratorClient;
}