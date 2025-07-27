// public/workers/orchestrator.js
// Enhanced Orchestrator Worker Client - Handles result decomposition and UI updates

class OrchestratorWorkerClient {
    constructor() {
        this.apiClient = window.apiClient;
        this.currentPipeline = null;
        this.executionPollingInterval = null;
        this.healthPollingInterval = null;
        
        // UI element cache
        this.uiElements = {};
        this.cacheUIElements();
    }

    // Cache frequently used UI elements
    cacheUIElements() {
        this.uiElements = {
            // System health elements
            activePipelines: document.getElementById('active-pipelines'),
            workersOnline: document.getElementById('workers-online'),
            avgResponseTime: document.getElementById('avg-response-time'),
            cacheHitRate: document.getElementById('cache-hit-rate'),
            dailyCost: document.getElementById('daily-cost'),
            successRate: document.getElementById('success-rate'),
            
            // Pipeline execution elements
            executionStatus: document.getElementById('execution-status'),
            executionDetails: document.getElementById('execution-details'),
            pipelineHistory: document.getElementById('pipeline-history'),
            
            // Message containers
            errorContainer: document.getElementById('error-container'),
            successContainer: document.getElementById('success-container'),
            
            // Performance elements
            performanceInsights: document.getElementById('performance-insights'),
            costAnalysis: document.getElementById('cost-analysis')
        };
    }

    // ====================
    // PIPELINE EXECUTION HANDLING
    // ====================

    async executePipeline(pipelineConfig) {
        try {
            console.log('Executing pipeline with config:', pipelineConfig);
            
            // Show loading state
            this.showExecutionLoading();
            
            // Execute pipeline
            const response = await this.apiClient.executePipeline(pipelineConfig);
            console.log('Pipeline response:', response);
            
            // Store current pipeline
            this.currentPipeline = response;
            
            // Decompose and display results
            this.decomposeAndDisplayResults(response);
            
            // Start polling for updates if pipeline is still running
            if (response.status === 'running') {
                this.startExecutionPolling(response.pipeline_id);
            }
            
            return response;
            
        } catch (error) {
            console.error('Pipeline execution failed:', error);
            this.showExecutionError(error.message);
            throw error;
        }
    }

    // Decompose complex pipeline results and update UI
    decomposeAndDisplayResults(pipelineResult) {
        console.log('Decomposing pipeline results:', pipelineResult);
        
        // Update execution status card
        this.updateExecutionStatusCard(pipelineResult);
     
        // Show success message
        this.showExecutionSuccess(pipelineResult);
    }

    // Update the main execution status card
    updateExecutionStatusCard(pipelineResult) {
        const pipeline = pipelineResult.pipeline || pipelineResult;
        
        if (!this.uiElements.executionStatus || !this.uiElements.executionDetails) {
            console.warn('Execution status elements not found');
            return;
        }

        // Create comprehensive status display
        const statusHtml = `
            <div class="pipeline-result-card">
                <div class="result-header">
                    <h3 style="color: #667eea; margin-bottom: 15px;">
                        🎯 Pipeline Execution Complete
                    </h3>
                    <span class="status-badge status-${pipeline.status}">${pipeline.status}</span>
                </div>
                
                <div class="result-grid">
                    <div class="result-item">
                        <strong>Pipeline ID:</strong>
                        <code>${pipeline.id}</code>
                    </div>
                    <div class="result-item">
                        <strong>Topic:</strong>
                        <span>${pipeline.topic}</span>
                    </div>
                    <div class="result-item">
                        <strong>Template:</strong>
                        <span>${pipeline.template_name || 'Default'}</span>
                    </div>
                    <div class="result-item">
                        <strong>Strategy:</strong>
                        <span>${pipeline.strategy}</span>
                    </div>
                    <div class="result-item">
                        <strong>Execution Time:</strong>
                        <span>${pipeline.total_execution_time_ms}ms</span>
                    </div>
                    <div class="result-item">
                        <strong>Total Cost:</strong>
                        <span>$${(pipeline.total_cost_usd || 0).toFixed(3)}</span>
                    </div>
                    <div class="result-item">
                        <strong>Sources Found:</strong>
                        <span>${pipeline.sources_discovered || 0}</span>
                    </div>
                    <div class="result-item">
                        <strong>Articles Processed:</strong>
                        <span>${pipeline.articles_processed || 0}</span>
                    </div>
                    <div class="result-item">
                        <strong>Quality Score:</strong>
                        <span>${(pipeline.final_quality_score || 0).toFixed(2)}</span>
                    </div>
                </div>
                
                ${this.renderOptimizations(pipeline.optimization_applied)}
                ${this.renderWorkerResultsSummary(pipeline.worker_results)}
                ${this.renderSourcesPreview(pipeline)}
                
                <div class="result-actions">
                    <button class="btn btn-primary" onclick="window.orchestratorWorker.viewFullResults('${pipeline.id}')">
                        📊 View Detailed Results
                    </button>
                    <button class="btn btn-secondary" onclick="window.orchestratorWorker.downloadResults('${pipeline.id}')">
                        💾 Download Results
                    </button>
                </div>
            </div>
        `;

        this.uiElements.executionDetails.innerHTML = statusHtml;
        this.uiElements.executionStatus.style.display = 'block';
        
        // Scroll to results
        this.uiElements.executionStatus.scrollIntoView({ behavior: 'smooth' });
    }

    // Render optimization badges
    renderOptimizations(optimizations) {
        if (!optimizations || optimizations.length === 0) return '';
        
        return `
            <div class="optimizations-section">
                <strong>Optimizations Applied:</strong>
                <div class="optimization-badges">
                    ${optimizations.map(opt => 
                        `<span class="optimization-badge">${this.formatOptimization(opt)}</span>`
                    ).join('')}
                </div>
            </div>
        `;
    }

    // Format optimization names for display
    formatOptimization(optimization) {
        const formatMap = {
            'cache_optimization_1_workers': '⚡ Cache Optimization',
            'fast_execution': '🚀 Fast Execution',
            'parallel_processing': '🔄 Parallel Processing',
            'cost_optimization': '💰 Cost Optimization',
            'quality_enhancement': '🎯 Quality Enhancement'
        };
        return formatMap[optimization] || optimization.replace(/_/g, ' ');
    }

    // Render worker results summary
    renderWorkerResultsSummary(workerResults) {
        if (!workerResults || workerResults.length === 0) return '';
        
        return `
            <div class="worker-results-section">
                <strong>Worker Execution Summary:</strong>
                <div class="worker-results-grid">
                    ${workerResults.map(result => `
                        <div class="worker-result-item ${result.success ? 'success' : 'failed'}">
                            <div class="worker-name">${this.formatWorkerName(result.worker_name)}</div>
                            <div class="worker-stats">
                                <span class="execution-time">${result.execution_time_ms}ms</span>
                                <span class="cost">$${(result.cost_usd || 0).toFixed(3)}</span>
                                ${result.cache_hit ? '<span class="cache-hit">💾 Cached</span>' : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Render sources preview
    renderSourcesPreview(pipeline) {
        // Extract sources from worker results
        const topicResearcherResult = pipeline.worker_results?.find(r => r.worker_name === 'topic_researcher');
        const sources = topicResearcherResult?.data?.sources || [];
        
        if (sources.length === 0) return '';
        
        const previewSources = sources.slice(0, 3); // Show first 3 sources
        
        return `
            <div class="sources-preview-section">
                <strong>Sources Discovered (${sources.length} total):</strong>
                <div class="sources-preview">
                    ${previewSources.map(source => `
                        <div class="source-preview-item">
                            <div class="source-title">${source.title}</div>
                            <div class="source-domain">${source.domain}</div>
                            <div class="source-quality">Quality: ${(source.quality_score || 0).toFixed(2)}</div>
                        </div>
                    `).join('')}
                    ${sources.length > 3 ? `<div class="sources-more">+${sources.length - 3} more sources</div>` : ''}
                </div>
            </div>
        `;
    }

    // Format worker names for display
    formatWorkerName(workerName) {
        const nameMap = {
            'topic_researcher': '🔍 Topic Researcher',
            'rss_librarian': '📚 RSS Librarian', 
            'feed_fetcher': '📡 Feed Fetcher',
            'content_classifier': '🧠 Content Classifier',
            'report_builder': '📊 Report Builder'
        };
        return nameMap[workerName] || workerName.replace(/_/g, ' ');
    }

    // ====================
    // SYSTEM HEALTH MONITORING
    // ====================

    async updateSystemHealth() {
        try {
            const healthData = await this.apiClient.getPipelineHealth();
            this.displaySystemHealth(healthData);
        } catch (error) {
            console.error('Failed to update system health:', error);
            this.displaySystemHealthError();
        }
    }

    displaySystemHealth(healthData) {
        const updates = {
            activePipelines: healthData.active_pipelines || 0,
            workersOnline: healthData.workers_online || 0,
            avgResponseTime: healthData.avg_response_time_ms || '-',
            cacheHitRate: healthData.cache_hit_rate ? `${Math.round(healthData.cache_hit_rate * 100)}%` : '0%',
            dailyCost: healthData.daily_cost_usd ? healthData.daily_cost_usd.toFixed(2) : '0.00',
            successRate: healthData.success_rate ? `${Math.round(healthData.success_rate * 100)}%` : '0%'
        };

        // Update UI elements
        Object.entries(updates).forEach(([key, value]) => {
            const element = this.uiElements[key];
            if (element) {
                element.textContent = value;
                element.style.color = this.getHealthColor(key, value);
            }
        });
    }

    getHealthColor(metric, value) {
        switch (metric) {
            case 'workersOnline':
                return parseInt(value) >= 5 ? '#28a745' : '#dc3545';
            case 'successRate':
                const rate = parseInt(value);
                return rate >= 90 ? '#28a745' : rate >= 70 ? '#ffc107' : '#dc3545';
            case 'avgResponseTime':
                const time = parseInt(value);
                return time <= 1000 ? '#28a745' : time <= 3000 ? '#ffc107' : '#dc3545';
            default:
                return '#667eea';
        }
    }

    displaySystemHealthError() {
        Object.keys(this.uiElements).forEach(key => {
            if (key.includes('active') || key.includes('workers') || key.includes('avg') || 
                key.includes('cache') || key.includes('daily') || key.includes('success')) {
                const element = this.uiElements[key];
                if (element) {
                    element.textContent = 'Error';
                    element.style.color = '#dc3545';
                }
            }
        });
    }

    // ====================
    // PIPELINE HISTORY
    // ====================

    async loadPipelineHistory() {
        try {
            const response = await this.apiClient.getAdminStats();
            if (response.recent_pipelines) {
                this.displayPipelineHistory(response.recent_pipelines);
            }
        } catch (error) {
            console.error('Failed to load pipeline history:', error);
            this.displayPipelineHistoryError(error.message);
        }
    }

    displayPipelineHistory(pipelines) {
        if (!this.uiElements.pipelineHistory) return;
        
        if (pipelines.length === 0) {
            this.uiElements.pipelineHistory.innerHTML = `
                <div class="empty-state">
                    <p>No recent pipeline executions found.</p>
                </div>
            `;
            return;
        }
        
        const historyHtml = pipelines.map(pipeline => `
            <div class="pipeline-history-item" onclick="window.orchestratorWorker.viewPipelineDetails('${pipeline.id}')">
                <div class="pipeline-info">
                    <h4>${pipeline.topic}</h4>
                    <div class="pipeline-meta">
                        ${pipeline.template_name || 'Default'} • 
                        ${new Date(pipeline.started_at).toLocaleString()} • 
                        $${(pipeline.total_cost_usd || 0).toFixed(3)} • 
                        ${pipeline.total_execution_time_ms}ms
                    </div>
                </div>
                <span class="status-badge status-${pipeline.status}">${pipeline.status}</span>
            </div>
        `).join('');
        
        this.uiElements.pipelineHistory.innerHTML = historyHtml;
    }

    displayPipelineHistoryError(errorMessage) {
        if (!this.uiElements.pipelineHistory) return;
        
        this.uiElements.pipelineHistory.innerHTML = `
            <div class="error-state">
                <p>Failed to load pipeline history.</p>
                <p class="error-details">${errorMessage}</p>
            </div>
        `;
    }

    // ====================
    // DETAILED RESULTS HANDLING
    // ====================

    async viewPipelineDetails(pipelineId) {
        try {
            const response = await this.apiClient.getPipelineStatus(pipelineId);
            this.showDetailedResultsModal(response.pipeline);
        } catch (error) {
            console.error('Failed to load pipeline details:', error);
            this.showError('Failed to load pipeline details: ' + error.message);
        }
    }

    async viewFullResults(pipelineId) {
        await this.viewPipelineDetails(pipelineId);
    }

    showDetailedResultsModal(pipeline) {
        // Create detailed results modal/page
        const modalHtml = `
            <div class="results-modal-overlay" onclick="this.remove()">
                <div class="results-modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h2>📊 Pipeline Results: ${pipeline.topic}</h2>
                        <button class="close-btn" onclick="this.closest('.results-modal-overlay').remove()">×</button>
                    </div>
                    
                    <div class="modal-content">
                        ${this.renderDetailedResults(pipeline)}
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    renderDetailedResults(pipeline) {
        const workerResults = pipeline.worker_results || [];
        const topicResearcherResult = workerResults.find(r => r.worker_name === 'topic_researcher');
        const sources = topicResearcherResult?.data?.sources || [];
        
        return `
            <div class="detailed-results">
                <div class="results-section">
                    <h3>Pipeline Overview</h3>
                    <div class="results-grid">
                        <div>ID: <code>${pipeline.id}</code></div>
                        <div>Template: ${pipeline.template_name}</div>
                        <div>Strategy: ${pipeline.strategy}</div>
                        <div>Status: <span class="status-badge status-${pipeline.status}">${pipeline.status}</span></div>
                        <div>Execution Time: ${pipeline.total_execution_time_ms}ms</div>
                        <div>Total Cost: $${(pipeline.total_cost_usd || 0).toFixed(3)}</div>
                        <div>Sources Found: ${pipeline.sources_discovered}</div>
                        <div>Quality Score: ${(pipeline.final_quality_score || 0).toFixed(2)}</div>
                    </div>
                </div>
                
                <div class="results-section">
                    <h3>Worker Execution Details</h3>
                    <div class="worker-details">
                        ${workerResults.map(result => `
                            <div class="worker-detail-card">
                                <h4>${this.formatWorkerName(result.worker_name)}</h4>
                                <div class="worker-stats-grid">
                                    <div>Status: <span class="${result.success ? 'success' : 'error'}">${result.success ? 'Success' : 'Failed'}</span></div>
                                    <div>Time: ${result.execution_time_ms}ms</div>
                                    <div>Cost: $${(result.cost_usd || 0).toFixed(3)}</div>
                                    <div>Cache: ${result.cache_hit ? '✅ Hit' : '❌ Miss'}</div>
                                    <div>Method: ${result.communication_method}</div>
                                </div>
                                ${result.error ? `<div class="error-message">Error: ${result.error}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                ${sources.length > 0 ? `
                    <div class="results-section">
                        <h3>Sources Discovered (${sources.length})</h3>
                        <div class="sources-list">
                            ${sources.map(source => `
                                <div class="source-detail-card">
                                    <h4>${source.title}</h4>
                                    <div class="source-url"><a href="${source.url}" target="_blank">${source.url}</a></div>
                                    <div class="source-description">${source.description}</div>
                                    <div class="source-meta">
                                        <span>Quality: ${(source.quality_score || 0).toFixed(2)}</span>
                                        <span>Domain: ${source.domain}</span>
                                        <span>Method: ${source.discovery_method}</span>
                                        <span>Status: ${source.validation_status}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // ====================
    // UTILITY METHODS
    // ====================

    async downloadResults(pipelineId) {
        try {
            const response = await this.apiClient.getPipelineStatus(pipelineId);
            const dataStr = JSON.stringify(response.pipeline, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `pipeline-${pipelineId}-results.json`;
            link.click();
            
        } catch (error) {
            console.error('Failed to download results:', error);
            this.showError('Failed to download results: ' + error.message);
        }
    }

    showExecutionLoading() {
        if (this.uiElements.executionDetails) {
            this.uiElements.executionDetails.innerHTML = `
                <div class="loading-state">
                    <div class="loading"></div>
                    <p>Executing pipeline...</p>
                </div>
            `;
            this.uiElements.executionStatus.style.display = 'block';
        }
    }

    showExecutionSuccess(result) {
        this.showMessage('success', `Pipeline executed successfully! ID: ${result.pipeline?.id || result.pipeline_id}`);
    }

    showExecutionError(errorMessage) {
        this.showMessage('error', `Pipeline execution failed: ${errorMessage}`);
        
        if (this.uiElements.executionDetails) {
            this.uiElements.executionDetails.innerHTML = `
                <div class="error-state">
                    <h3 style="color: #dc3545;">❌ Pipeline Execution Failed</h3>
                    <p>${errorMessage}</p>
                    <button class="btn btn-secondary" onclick="location.reload()">🔄 Retry</button>
                </div>
            `;
            this.uiElements.executionStatus.style.display = 'block';
        }
    }

    showMessage(type, message) {
        const container = type === 'error' ? this.uiElements.errorContainer : this.uiElements.successContainer;
        if (container) {
            container.innerHTML = `<div class="${type}-message">${message}</div>`;
            setTimeout(() => container.innerHTML = '', 5000);
        }
    }

    showError(message) {
        this.showMessage('error', message);
    }

    showSuccess(message) {
        this.showMessage('success', message);
    }

    // ====================
    // POLLING AND UPDATES
    // ====================

    startExecutionPolling(pipelineId) {
        if (this.executionPollingInterval) {
            clearInterval(this.executionPollingInterval);
        }
        
        this.executionPollingInterval = setInterval(async () => {
            try {
                const response = await this.apiClient.getPipelineStatus(pipelineId);
                const pipeline = response.pipeline;
                
                if (response.pipeline?.status === 'completed' || response.pipeline?.status === 'running') {
                    this.showSuccess(`Pipeline launched successfully! ID: ${response.pipeline.id}`);
                    this.showExecutionStatus(response);
                }
            } catch (error) {
                console.error('Polling error:', error);
                clearInterval(this.executionPollingInterval);
            }
        }, 2000); // Poll every 2 seconds
    }

    startHealthPolling() {
        if (this.healthPollingInterval) {
            clearInterval(this.healthPollingInterval);
        }
        
        this.healthPollingInterval = setInterval(() => {
            this.updateSystemHealth();
        }, 30000); // Update every 30 seconds
    }

    stopPolling() {
        if (this.executionPollingInterval) {
            clearInterval(this.executionPollingInterval);
            this.executionPollingInterval = null;
        }
        
        if (this.healthPollingInterval) {
            clearInterval(this.healthPollingInterval);
            this.healthPollingInterval = null;
        }
    }

    // Initialize the worker client
    init() {
        console.log('Orchestrator worker client initialized');
        this.startHealthPolling();
        return this;
    }
}

// Create global instance
window.orchestratorWorker = new OrchestratorWorkerClient().init();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OrchestratorWorkerClient;
}

// Add CSS styles for the result display
const styles = `
<style>
.pipeline-result-card {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05));
    border: 2px solid #667eea;
    border-radius: 15px;
    padding: 25px;
    margin: 20px 0;
}

.result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.result-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin-bottom: 20px;
}

.result-item {
    padding: 10px;
    background: white;
    border-radius: 8px;
    border-left: 4px solid #667eea;
}

.result-item strong {
    color: #555;
    display: block;
    margin-bottom: 5px;
}

.optimizations-section, .worker-results-section, .sources-preview-section {
    margin: 20px 0;
    padding: 15px;
    background: rgba(255, 255, 255, 0.7);
    border-radius: 10px;
}

.optimization-badges {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 10px;
}

.optimization-badge {
    background: #28a745;
    color: white;
    padding: 4px 10px;
    border-radius: 15px;
    font-size: 0.9rem;
}

.worker-results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
    margin-top: 10px;
}

.worker-result-item {
    padding: 10px;
    border-radius: 8px;
    border-left: 4px solid #28a745;
}

.worker-result-item.failed {
    border-left-color: #dc3545;
}

.worker-name {
    font-weight: 600;
    margin-bottom: 5px;
}

.worker-stats {
    display: flex;
    gap: 10px;
    font-size: 0.9rem;
}

.cache-hit {
    color: #28a745;
}

.sources-preview {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 10px;
    margin-top: 10px;
}

.source-preview-item {
    padding: 10px;
    background: white;
    border-radius: 8px;
    border-left: 4px solid #17a2b8;
}

.source-title {
    font-weight: 600;
    margin-bottom: 5px;
}

.source-domain {
    color: #666;
    font-size: 0.9rem;
}

.source-quality {
    color: #28a745;
    font-size: 0.9rem;
    margin-top: 5px;
}

.result-actions {
    display: flex;
    gap: 15px;
    margin-top: 20px;
}

.results-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
}

.results-modal {
    background: white;
    border-radius: 20px;
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
}

.modal-header {
    padding: 20px;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
}

.modal-content {
    padding: 20px;
}

.results-section {
    margin-bottom: 30px;
}

.results-section h3 {
    color: #667eea;
    margin-bottom: 15px;
}

.worker-details {
    display: grid;
    gap: 15px;
}

.worker-detail-card {
    padding: 15px;
    border: 2px solid #e1e5e9;
    border-radius: 10px;
}

.worker-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
    margin-top: 10px;
}

.sources-list {
    display: grid;
    gap: 15px;
}

.source-detail-card {
    padding: 15px;
    border: 2px solid #e1e5e9;
    border-radius: 10px;
}

.source-url a {
    color: #667eea;
    text-decoration: none;
}

.source-meta {
    display: flex;
    gap: 15px;
    margin-top: 10px;
    font-size: 0.9rem;
    color: #666;
}

.loading-state, .error-state, .empty-state {
    text-align: center;
    padding: 40px;
    color: #666;
}

.success {
    color: #28a745;
}

.error {
    color: #dc3545;
}
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', styles);