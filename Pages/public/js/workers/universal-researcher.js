// ===========================================
// Universal Researcher 2.0 - JavaScript Integration
// ===========================================

// 1. UPDATE: admin-dashboard-components.js - Enhanced Worker Grid Component
class UniversalResearcherComponent {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.currentTemplate = 'search_rss';
        this.isExecuting = false;
        this.currentSession = null;
    }

    // Initialize the enhanced researcher component
    init() {
        this.setupEventListeners();
        this.loadSavedSettings();
        this.updateTemplateUI();
    }

    setupEventListeners() {
        // Template selection
        const templateSelect = document.getElementById('researcher-template');
        if (templateSelect) {
            templateSelect.addEventListener('change', (e) => {
                this.currentTemplate = e.target.value;
                this.updateTemplateUI();
            });
        }

        // Advanced parameters toggle
        const toggleBtn = document.querySelector('.toggle-advanced');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.toggleAdvancedParams();
            });
        }

        // Real-time parameter updates
        document.addEventListener('change', (e) => {
            if (e.target.closest('.worker-controls')) {
                this.saveSettings();
            }
        });
    }

    updateTemplateUI() {
        // Show/hide platform-specific options
        const multiPlatformOptions = document.querySelector('.multi-platform-options');
        if (multiPlatformOptions) {
            multiPlatformOptions.style.display = 
                this.currentTemplate === 'search_all' ? 'block' : 'none';
        }

        // Update execute button text
        const executeBtn = document.querySelector('.execute-btn');
        if (executeBtn) {
            const templateNames = {
                'search_rss': '🔍 Search RSS',
                'search_youtube': '🎥 Search YouTube',
                'search_all': '🌐 Multi-Platform Search'
            };
            executeBtn.textContent = templateNames[this.currentTemplate] || '🔍 Execute Research';
        }
    }

    toggleAdvancedParams() {
        const advancedParams = document.getElementById('advanced-params');
        if (advancedParams) {
            const isHidden = advancedParams.style.display === 'none';
            advancedParams.style.display = isHidden ? 'block' : 'none';
            
            const toggleBtn = document.querySelector('.toggle-advanced');
            toggleBtn.textContent = isHidden ? '⚙️ Hide Advanced' : '⚙️ Advanced Options';
        }
    }

    // Execute universal research from dashboard card
    async executeResearch() {
        if (this.isExecuting) return;

        try {
            this.isExecuting = true;
            this.showExecutionStatus('⏳ Initializing...');

            // Gather parameters
            const topic = document.getElementById('topic')?.value;
            if (!topic) {
                throw new Error('Please enter a research topic');
            }

            const clientId = document.getElementById('client-id')?.value || 'demo_client';
            const template = this.buildTemplate();
            const context = this.buildClientContext(clientId);

            // Show results container
            const resultsContainer = document.getElementById('researcher-results');
            if (resultsContainer) {
                resultsContainer.style.display = 'block';
            }

            this.showExecutionStatus('🔍 Executing research...');

            // Execute via API
            const response = await this.dashboard.apiClient.callWorker('universal-researcher', '/execute', 'POST', {
                context: context,
                template: template,
                data: { topic: topic }
            });

            if (response.status === 'ok') {
                this.displayResults(response);
                this.showExecutionStatus('✅ Research completed');
            } else {
                throw new Error(response.error?.message || 'Research failed');
            }

        } catch (error) {
            console.error('Research execution failed:', error);
            this.showExecutionStatus(`❌ Error: ${error.message}`);
            this.showError(error.message);
        } finally {
            this.isExecuting = false;
        }
    }

    buildTemplate() {
        const depth = document.getElementById('depth')?.value || '3';
        const qualityThreshold = document.getElementById('quality-threshold')?.value || '0.7';

        let parameters = {};

        switch (this.currentTemplate) {
            case 'search_rss':
                parameters = {
                    depth: parseInt(depth),
                    quality_threshold: parseFloat(qualityThreshold)
                };
                break;
            case 'search_youtube':
                parameters = {
                    content_type: 'channels',
                    subscriber_threshold: 1000
                };
                break;
            case 'search_all':
                const selectedPlatforms = Array.from(document.querySelectorAll('.platform-checkboxes input:checked'))
                    .map(cb => cb.value);
                parameters = {
                    platforms: selectedPlatforms,
                    max_per_platform: 10,
                    depth: parseInt(depth),
                    quality_threshold: parseFloat(qualityThreshold)
                };
                break;
        }

        return {
            capability: this.currentTemplate,
            parameters: parameters,
            output_format: 'standard'
        };
    }

    buildClientContext(clientId) {
        return {
            client_id: clientId,
            request_id: `req_${Date.now()}`,
            pipeline_id: `pipe_${Date.now()}`,
            billing_tier: 'pro'
        };
    }

    displayResults(response) {
        const data = response.data;
        
        // Update platform breakdown
        this.updatePlatformBreakdown(data.platform_breakdown || {});
        
        // Update quality metrics
        this.updateQualityMetrics(data);
        
        // Display sources
        this.displaySources(data.sources || []);
        
        // Update execution time
        const executionTimeEl = document.getElementById('execution-time');
        if (executionTimeEl) {
            executionTimeEl.textContent = `${data.execution_time_ms}ms`;
        }
        
        // Store current session for export/details
        this.currentSession = data;
    }

    updatePlatformBreakdown(breakdown) {
        Object.entries(breakdown).forEach(([platform, count]) => {
            const countEl = document.getElementById(`${platform}-count`);
            if (countEl) {
                countEl.textContent = count;
            }
        });
    }

    updateQualityMetrics(data) {
        // Average quality
        const avgQualityEl = document.getElementById('avg-quality');
        if (avgQualityEl) {
            avgQualityEl.textContent = (data.avg_quality_score || 0).toFixed(2);
        }

        // Total sources
        const totalSourcesEl = document.getElementById('total-sources');
        if (totalSourcesEl) {
            totalSourcesEl.textContent = data.total_sources || 0;
        }

        // Session ID
        const sessionIdEl = document.getElementById('session-id');
        if (sessionIdEl) {
            sessionIdEl.textContent = data.session_id || '-';
        }
    }

    displaySources(sources) {
        const container = document.getElementById('sources-container');
        if (!container) return;

        if (sources.length === 0) {
            container.innerHTML = '<div class="no-sources">No sources found</div>';
            return;
        }

        container.innerHTML = sources.map(source => this.createSourceCard(source)).join('');
    }

    createSourceCard(source) {
        const platformIcons = {
            'rss': '📡',
            'youtube': '🎥',
            'podcast': '🎧',
            'academic': '📚'
        };

        const qualityClass = source.quality_score >= 0.8 ? 'high' : 
                           source.quality_score >= 0.6 ? 'medium' : 'low';

        return `
            <div class="source-card ${qualityClass}">
                <div class="source-header">
                    <span class="source-platform">${platformIcons[source.platform] || '🔗'}</span>
                    <span class="source-title">${source.title}</span>
                    <span class="source-quality quality-${qualityClass}">${source.quality_score.toFixed(2)}</span>
                </div>
                <div class="source-description">${source.description || 'No description available'}</div>
                <div class="source-meta">
                    <span class="source-identifier">${source.identifier}</span>
                    ${source.verified ? '<span class="verified">✅ Verified</span>' : ''}
                </div>
                <div class="source-actions">
                    <button class="btn btn-small" onclick="window.open('${source.identifier}', '_blank')">
                        🔗 Visit
                    </button>
                    <button class="btn btn-small" onclick="universalResearcher.copySource('${source.id}')">
                        📋 Copy
                    </button>
                </div>
            </div>
        `;
    }

    showExecutionStatus(message) {
        const statusEl = document.querySelector('#execution-status .status-indicator');
        if (statusEl) {
            statusEl.textContent = message;
        }
    }

    showError(message) {
        // Create error notification
        const errorEl = document.createElement('div');
        errorEl.className = 'error-notification';
        errorEl.innerHTML = `
            <div class="error-content">
                <span class="error-icon">❌</span>
                <span class="error-message">${message}</span>
                <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(errorEl);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorEl.parentNode) {
                errorEl.parentNode.removeChild(errorEl);
            }
        }, 5000);
    }

    // Export sources to CSV
    exportSources() {
        if (!this.currentSession || !this.currentSession.sources) {
            this.showError('No sources to export');
            return;
        }

        const csv = this.generateCSV(this.currentSession.sources);
        this.downloadCSV(csv, `sources_${this.currentSession.session_id}.csv`);
    }

    generateCSV(sources) {
        const headers = ['Platform', 'Title', 'URL', 'Quality Score', 'Relevance Score', 'Verified', 'Discovery Method'];
        const rows = sources.map(source => [
            source.platform,
            source.title,
            source.identifier,
            source.quality_score,
            source.relevance_score,
            source.verified ? 'Yes' : 'No',
            source.discovery_method
        ]);

        return [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
    }

    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    copySource(sourceId) {
        const source = this.currentSession?.sources?.find(s => s.id === sourceId);
        if (source) {
            navigator.clipboard.writeText(source.identifier);
            this.showNotification('Source URL copied to clipboard');
        }
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'success-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    saveSettings() {
        const settings = {
            template: this.currentTemplate,
            clientId: document.getElementById('client-id')?.value,
            depth: document.getElementById('depth')?.value,
            qualityThreshold: document.getElementById('quality-threshold')?.value
        };
        
        localStorage.setItem('universalResearcherSettings', JSON.stringify(settings));
    }

    loadSavedSettings() {
        try {
            const saved = localStorage.getItem('universalResearcherSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                
                // Restore template selection
                const templateSelect = document.getElementById('researcher-template');
                if (templateSelect && settings.template) {
                    templateSelect.value = settings.template;
                    this.currentTemplate = settings.template;
                }
                
                // Restore other settings
                if (settings.clientId) {
                    const clientIdInput = document.getElementById('client-id');
                    if (clientIdInput) clientIdInput.value = settings.clientId;
                }
                
                if (settings.depth) {
                    const depthSelect = document.getElementById('depth');
                    if (depthSelect) depthSelect.value = settings.depth;
                }
                
                if (settings.qualityThreshold) {
                    const qualitySelect = document.getElementById('quality-threshold');
                    if (qualitySelect) qualitySelect.value = settings.qualityThreshold;
                }
            }
        } catch (error) {
            console.warn('Failed to load saved settings:', error);
        }
    }

    viewSessionDetails() {
        if (!this.currentSession) {
            this.showError('No session data available');
            return;
        }

        // Create session details modal
        const modal = document.createElement('div');
        modal.className = 'session-details-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📊 Session Details</h3>
                    <button class="modal-close" onclick="this.closest('.session-details-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="session-info">
                        <div class="info-group">
                            <label>Session ID:</label>
                            <span>${this.currentSession.session_id}</span>
                        </div>
                        <div class="info-group">
                            <label>Template Used:</label>
                            <span>${this.currentSession.template_used}</span>
                        </div>
                        <div class="info-group">
                            <label>Client Context:</label>
                            <pre>${JSON.stringify(this.currentSession.client_context, null, 2)}</pre>
                        </div>
                        <div class="info-group">
                            <label>Execution Time:</label>
                            <span>${this.currentSession.execution_time_ms}ms</span>
                        </div>
                        <div class="info-group">
                            <label>Platform Breakdown:</label>
                            <pre>${JSON.stringify(this.currentSession.platform_breakdown, null, 2)}</pre>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    viewFullWorkerInterface() {
        window.open('/universal-researcher.html', '_blank');
    }
}

// 2. NEW: universal-researcher.js - Full Worker Interface
class UniversalResearcherFullInterface {
    constructor() {
        this.apiClient = new APIClient();
        this.authClient = new AuthClient();
        this.currentTemplate = 'search_rss';
        this.isExecuting = false;
        this.executionMonitor = null;
        this.sessionHistory = [];
        
        this.init();
    }

    async init() {
        // Verify authentication
        if (!await this.authClient.isLoggedIn()) {
            window.location.href = '/login.html';
            return;
        }

        this.setupEventListeners();
        this.loadWorkerStatus();
        this.loadSessionHistory();
        this.setupTemplateCards();
    }

    setupEventListeners() {
        // Template card selection
        document.querySelectorAll('.template-card').forEach(card => {
            if (!card.classList.contains('disabled')) {
                card.addEventListener('click', () => {
                    this.selectTemplate(card.dataset.template);
                });
            }
        });

        // Real-time parameter updates
        document.addEventListener('change', (e) => {
            if (e.target.closest('.research-config')) {
                this.updateParameters();
            }
        });

        // Filter changes
        document.getElementById('platform-filter')?.addEventListener('change', () => {
            this.filterSources();
        });

        document.getElementById('quality-filter')?.addEventListener('change', () => {
            this.filterSources();
        });
    }

    setupTemplateCards() {
        // Mark current template as active
        document.querySelectorAll('.template-card').forEach(card => {
            card.classList.remove('active');
            if (card.dataset.template === this.currentTemplate) {
                card.classList.add('active');
            }
        });
    }

    selectTemplate(template) {
        this.currentTemplate = template;
        this.setupTemplateCards();
        this.showTemplateParameters(template);
    }

    showTemplateParameters(template) {
        // Hide all parameter groups
        document.querySelectorAll('.template-params').forEach(group => {
            group.style.display = 'none';
        });

        // Show relevant parameter group
        const paramGroup = document.getElementById(`${template.replace('search_', '')}-params`);
        if (paramGroup) {
            paramGroup.style.display = 'block';
        }
    }

    async executeFullResearch() {
        if (this.isExecuting) return;

        try {
            this.isExecuting = true;
            this.showExecutionMonitor();
            
            const topic = document.getElementById('research-topic')?.value;
            if (!topic) {
                throw new Error('Please enter a research topic');
            }

            const context = this.buildFullClientContext();
            const template = this.buildFullTemplate();

            // Start execution monitoring
            this.startExecutionMonitor();

            // Execute research
            const response = await this.apiClient.callWorker('universal-researcher', '/execute', 'POST', {
                context: context,
                template: template,
                data: { topic: topic }
            });

            if (response.status === 'ok') {
                this.displayFullResults(response);
                this.addToSessionHistory(response);
                this.completeExecutionMonitor('success');
            } else {
                throw new Error(response.error?.message || 'Research execution failed');
            }

        } catch (error) {
            console.error('Full research execution failed:', error);
            this.completeExecutionMonitor('error', error.message);
        } finally {
            this.isExecuting = false;
        }
    }

    buildFullClientContext() {
        return {
            client_id: document.getElementById('client-id-full')?.value || 'demo_client',
            request_id: `req_full_${Date.now()}`,
            pipeline_id: `pipe_full_${Date.now()}`,
            billing_tier: document.getElementById('billing-tier')?.value || 'pro'
        };
    }

    buildFullTemplate() {
        let parameters = {};

        switch (this.currentTemplate) {
            case 'search_rss':
                parameters = {
                    depth: parseInt(document.getElementById('rss-depth')?.value || '3'),
                    quality_threshold: parseFloat(document.getElementById('rss-quality')?.value || '0.7')
                };
                break;
            case 'search_youtube':
                parameters = {
                    content_type: document.getElementById('youtube-type')?.value || 'channels',
                    subscriber_threshold: parseInt(document.getElementById('youtube-subscribers')?.value || '1000')
                };
                break;
            case 'search_all':
                const selectedPlatforms = Array.from(document.querySelectorAll('.platform-checkbox input:checked'))
                    .map(cb => cb.value);
                parameters = {
                    platforms: selectedPlatforms,
                    max_per_platform: parseInt(document.getElementById('max-per-platform')?.value || '10')
                };
                break;
        }

        return {
            capability: this.currentTemplate,
            parameters: parameters,
            output_format: 'standard'
        };
    }

    showExecutionMonitor() {
        const monitor = document.getElementById('execution-monitor');
        if (monitor) {
            monitor.style.display = 'block';
            monitor.scrollIntoView({ behavior: 'smooth' });
        }
    }

    startExecutionMonitor() {
        let progress = 0;
        const steps = ['initialize', 'generate-queries', 'search-sources', 'validate-sources', 'store-results'];
        let currentStep = 0;

        this.executionMonitor = setInterval(() => {
            progress += Math.random() * 15 + 5; // Random progress increment
            
            if (progress >= currentStep * 20 + 20 && currentStep < steps.length) {
                this.updateExecutionStep(steps[currentStep], 'completed');
                currentStep++;
                if (currentStep < steps.length) {
                    this.updateExecutionStep(steps[currentStep], 'active');
                }
            }

            this.updateProgressBar(Math.min(progress, 95));
            
            if (progress >= 95) {
                clearInterval(this.executionMonitor);
            }
        }, 500);
    }

    updateExecutionStep(stepName, status) {
        const stepEl = document.querySelector(`[data-step="${stepName}"]`);
        if (stepEl) {
            stepEl.querySelector('.step-status').textContent = status;
            stepEl.classList.remove('pending', 'active', 'completed');
            stepEl.classList.add(status);
        }
    }

    updateProgressBar(percentage) {
        const progressFill = document.getElementById('progress-fill');
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
    }

    completeExecutionMonitor(status, errorMessage = null) {
        if (this.executionMonitor) {
            clearInterval(this.executionMonitor);
        }

        this.updateProgressBar(100);
        
        const statusEl = document.getElementById('full-execution-status');
        if (statusEl) {
            if (status === 'success') {
                statusEl.textContent = '✅ Research Completed Successfully';
                statusEl.className = 'execution-status success';
            } else {
                statusEl.textContent = `❌ Research Failed: ${errorMessage}`;
                statusEl.className = 'execution-status error';
            }
        }

        // Complete all remaining steps
        document.querySelectorAll('.step').forEach(step => {
            if (!step.classList.contains('completed')) {
                const stepStatus = step.querySelector('.step-status');
                if (status === 'success') {
                    stepStatus.textContent = 'completed';
                    step.classList.add('completed');
                } else {
                    stepStatus.textContent = 'failed';
                    step.classList.add('failed');
                }
            }
        });
    }

    displayFullResults(response) {
        const data = response.data;
        
        // Show results section
        const resultsSection = document.getElementById('results-display');
        if (resultsSection) {
            resultsSection.style.display = 'block';
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        }

        // Update summary cards
        this.updateResultsSummary(data);
        
        // Update platform breakdown chart
        this.updatePlatformChart(data.platform_breakdown || {});
        
        // Populate sources table
        this.populateSourcesTable(data.sources || []);
    }

    updateResultsSummary(data) {
        document.getElementById('total-sources-found').textContent = data.total_sources || 0;
        document.getElementById('avg-quality-score').textContent = (data.avg_quality_score || 0).toFixed(2);
        document.getElementById('platforms-used').textContent = Object.keys(data.platform_breakdown || {}).length;
        document.getElementById('total-execution-time').textContent = `${data.execution_time_ms || 0}ms`;
    }

    updatePlatformChart(breakdown) {
        const container = document.getElementById('breakdown-bars');
        if (!container) return;

        const total = Object.values(breakdown).reduce((sum, count) => sum + count, 0);
        
        container.innerHTML = Object.entries(breakdown).map(([platform, count]) => {
            const percentage = total > 0 ? (count / total) * 100 : 0;
            const platformIcons = { 'rss': '📡', 'youtube': '🎥', 'podcast': '🎧', 'academic': '📚' };
            
            return `
                <div class="breakdown-bar">
                    <div class="bar-label">
                        <span class="platform-icon">${platformIcons[platform] || '🔗'}</span>
                        <span class="platform-name">${platform.toUpperCase()}</span>
                        <span class="platform-count">${count}</span>
                    </div>
                    <div class="bar-container">
                        <div class="bar-fill ${platform}" style="width: ${percentage}%"></div>
                    </div>
                    <div class="bar-percentage">${percentage.toFixed(1)}%</div>
                </div>
            `;
        }).join('');
    }

    populateSourcesTable(sources) {
        const tbody = document.getElementById('sources-table-body');
        if (!tbody) return;

        if (sources.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No sources found</td></tr>';
            return;
        }

        tbody.innerHTML = sources.map(source => {
            const platformIcons = { 'rss': '📡', 'youtube': '🎥', 'podcast': '🎧', 'academic': '📚' };
            const qualityClass = source.quality_score >= 0.8 ? 'high' : source.quality_score >= 0.6 ? 'medium' : 'low';
            
            return `
                <tr class="source-row ${qualityClass}">
                    <td>
                        <span class="platform-icon">${platformIcons[source.platform] || '🔗'}</span>
                        ${source.platform.toUpperCase()}
                    </td>
                    <td class="source-title" title="${source.description}">
                        <a href="${source.identifier}" target="_blank">${source.title}</a>
                    </td>
                    <td class="quality-score quality-${qualityClass}">
                        ${source.quality_score.toFixed(2)}
                    </td>
                    <td class="relevance-score">
                        ${source.relevance_score.toFixed(2)}
                    </td>
                    <td class="verified-status">
                        ${source.verified ? '✅' : '❌'}
                    </td>
                    <td class="source-actions">
                        <button class="btn btn-small" onclick="window.open('${source.identifier}', '_blank')" title="Visit Source">
                            🔗
                        </button>
                        <button class="btn btn-small" onclick="universalResearcherFull.copySourceUrl('${source.identifier}')" title="Copy URL">
                            📋
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Store sources for filtering
        this.currentSources = sources;
    }

    filterSources() {
        if (!this.currentSources) return;

        const platformFilter = document.getElementById('platform-filter')?.value;
        const qualityFilter = document.getElementById('quality-filter')?.value;

        let filteredSources = this.currentSources;

        if (platformFilter) {
            filteredSources = filteredSources.filter(source => source.platform === platformFilter);
        }

        if (qualityFilter) {
            switch (qualityFilter) {
                case 'high':
                    filteredSources = filteredSources.filter(source => source.quality_score >= 0.8);
                    break;
                case 'medium':
                    filteredSources = filteredSources.filter(source => source.quality_score >= 0.6 && source.quality_score < 0.8);
                    break;
                case 'low':
                    filteredSources = filteredSources.filter(source => source.quality_score < 0.6);
                    break;
            }
        }

        this.populateSourcesTable(filteredSources);
    }

    copySourceUrl(url) {
        navigator.clipboard.writeText(url).then(() => {
            this.showNotification('Source URL copied to clipboard');
        });
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 3000);
    }

    async loadWorkerStatus() {
        try {
            const health = await this.apiClient.callWorker('universal-researcher', '/health');
            this.updateWorkerStatus(health);
        } catch (error) {
            console.error('Failed to load worker status:', error);
            this.updateWorkerStatus({ status: 'error', error: error.message });
        }
    }

    updateWorkerStatus(health) {
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');

        if (health.status === 'healthy') {
            statusIndicator.textContent = '🟢';
            statusIndicator.className = 'status-indicator status-healthy';
            statusText.textContent = 'Operational';
        } else {
            statusIndicator.textContent = '🔴';
            statusIndicator.className = 'status-indicator status-error';
            statusText.textContent = 'Error';
        }
    }

    async loadSessionHistory() {
        try {
            const history = await this.apiClient.callWorker('universal-researcher', '/admin/sessions', 'GET', null, {
                'Authorization': 'Bearer internal-worker-auth-token-2024'
            });
            this.displaySessionHistory(history.sessions || []);
        } catch (error) {
            console.error('Failed to load session history:', error);
        }
    }

    displaySessionHistory(sessions) {
        const container = document.getElementById('history-list');
        if (!container) return;

        if (sessions.length === 0) {
            container.innerHTML = '<div class="no-history">No recent sessions</div>';
            return;
        }

        container.innerHTML = sessions.map(session => `
            <div class="history-item">
                <div class="history-header">
                    <span class="history-template">${session.template_capability}</span>
                    <span class="history-date">${new Date(session.created_at).toLocaleString()}</span>
                </div>
                <div class="history-details">
                    <span class="history-client">Client: ${session.client_id}</span>
                    <span class="history-sources">Sources: ${session.sources_found}</span>
                    <span class="history-status ${session.status}">${session.status}</span>
                </div>
            </div>
        `).join('');
    }

    addToSessionHistory(response) {
        const session = {
            session_id: response.data.session_id,
            template_capability: response.data.template_used,
            client_id: response.data.client_context.client_id,
            sources_found: response.data.total_sources,
            status: response.status,
            created_at: response.timestamp
        };

        this.sessionHistory.unshift(session);
        this.displaySessionHistory(this.sessionHistory.slice(0, 20)); // Show last 20
    }

    async refreshHistory() {
        await this.loadSessionHistory();
    }

    exportSources() {
        if (!this.currentSources || this.currentSources.length === 0) {
            alert('No sources to export');
            return;
        }

        const csv = this.generateCSV(this.currentSources);
        this.downloadCSV(csv, `universal_research_sources_${Date.now()}.csv`);
    }

    generateCSV(sources) {
        const headers = ['Platform', 'Title', 'URL', 'Quality Score', 'Relevance Score', 'Verified', 'Discovery Method'];
        const rows = sources.map(source => [
            source.platform,
            source.title,
            source.identifier,
            source.quality_score,
            source.relevance_score,
            source.verified ? 'Yes' : 'No',
            source.discovery_method
        ]);

        return [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');
    }

    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// 3. Global functions for dashboard integration
function executeUniversalResearch() {
    if (window.universalResearcher) {
        window.universalResearcher.executeResearch();
    } else {
        console.error('Universal Researcher component not initialized');
    }
}

function toggleAdvancedParams() {
    if (window.universalResearcher) {
        window.universalResearcher.toggleAdvancedParams();
    }
}

function exportSources() {
    if (window.universalResearcher) {
        window.universalResearcher.exportSources();
    } else if (window.universalResearcherFull) {
        window.universalResearcherFull.exportSources();
    }
}

function viewSessionDetails() {
    if (window.universalResearcher) {
        window.universalResearcher.viewSessionDetails();
    }
}

function viewFullWorkerInterface() {
    if (window.universalResearcher) {
        window.universalResearcher.viewFullWorkerInterface();
    }
}

function executeFullResearch() {
    if (window.universalResearcherFull) {
        window.universalResearcherFull.executeFullResearch();
    }
}

function saveTemplate() {
    if (window.universalResearcherFull) {
        // Implement template saving
        console.log('Template saving not yet implemented');
    }
}

function loadTemplate() {
    if (window.universalResearcherFull) {
        // Implement template loading
        console.log('Template loading not yet implemented');
    }
}

function refreshHistory() {
    if (window.universalResearcherFull) {
        window.universalResearcherFull.refreshHistory();
    }
}

// 4. Initialize components when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard component if on main dashboard
    if (document.getElementById('researcher-template')) {
        window.universalResearcher = new UniversalResearcherComponent(window.adminDashboard);
        window.universalResearcher.init();
    }
    
    // Initialize full interface if on dedicated page
    if (document.querySelector('.worker-page')) {
        window.universalResearcherFull = new UniversalResearcherFullInterface();
    }
});