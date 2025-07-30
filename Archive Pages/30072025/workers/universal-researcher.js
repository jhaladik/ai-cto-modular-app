// ==========================================
// Universal Researcher 2.0 - Complete JavaScript Implementation
// AI Factory v2.0 Compatible
// ==========================================

// ==========================================
// 1. Dashboard Component (for admin-dashboard.html integration)
// ==========================================

class UniversalResearcherComponent {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.isExecuting = false;
        this.currentResults = null;
    }

    async init() {
        this.setupEventListeners();
        await this.loadWorkerStatus();
    }

    setupEventListeners() {
        // Real-time parameter updates
        document.addEventListener('change', (e) => {
            if (e.target.closest('.universal-researcher')) {
                this.updateParameters();
            }
        });

        // Advanced parameters toggle
        const advancedToggle = document.querySelector('.universal-researcher .toggle-advanced');
        if (advancedToggle) {
            advancedToggle.addEventListener('click', () => {
                this.toggleAdvancedParams();
            });
        }
    }

    async loadWorkerStatus() {
        try {
            const response = await this.dashboard.apiClient.get('universal-researcher', '/health');
            this.updateWorkerStatus(response);
        } catch (error) {
            console.error('Failed to load worker status:', error);
            this.updateWorkerStatus({ status: 'error', message: error.message });
        }
    }

    updateWorkerStatus(status) {
        const statusElement = document.querySelector('.universal-researcher .worker-status');
        if (statusElement) {
            const indicator = statusElement.querySelector('.status-indicator');
            const text = statusElement.querySelector('.status-text');
            
            if (status.status === 'ok') {
                indicator.textContent = '🟢';
                text.textContent = 'Operational';
                statusElement.className = 'worker-status status-healthy';
            } else {
                indicator.textContent = '🔴';
                text.textContent = 'Error';
                statusElement.className = 'worker-status status-error';
            }
        }
    }

    buildTemplate() {
        const template = document.getElementById('researcher-template')?.value || 'search_rss';
        const depth = document.getElementById('depth')?.value || 3;
        const qualityThreshold = document.getElementById('quality-threshold')?.value || 0.7;
        
        return {
            capability: template,
            parameters: {
                depth: parseInt(depth),
                quality_threshold: parseFloat(qualityThreshold),
                max_sources: 20,
                cache_ttl: 3600
            },
            output_format: 'standard'
        };
    }

    buildClientContext(clientId) {
        return {
            client_id: clientId,
            request_id: `req_${Date.now()}`,
            pipeline_id: `pipe_dashboard_${Date.now()}`,
            billing_tier: document.getElementById('billing-tier')?.value || 'demo'
        };
    }

    showExecutionStatus(message) {
        const statusElement = document.getElementById('researcher-execution-status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.style.display = 'block';
        }
    }

    showError(message) {
        const errorElement = document.getElementById('researcher-error');
        if (errorElement) {
            errorElement.textContent = `Error: ${message}`;
            errorElement.style.display = 'block';
        }
    }

    displayResults(response) {
        this.currentResults = response;
        
        // Update summary stats
        const totalSources = response.data?.sources?.length || 0;
        const avgQuality = response.data?.avg_quality_score || 0;
        const executionTime = response.data?.execution_time_ms || 0;
        
        const summaryElement = document.getElementById('researcher-summary');
        if (summaryElement) {
            summaryElement.innerHTML = `
                <div class="summary-stat">
                    <span class="stat-label">Sources:</span>
                    <span class="stat-value">${totalSources}</span>
                </div>
                <div class="summary-stat">
                    <span class="stat-label">Quality:</span>
                    <span class="stat-value">${avgQuality.toFixed(2)}</span>
                </div>
                <div class="summary-stat">
                    <span class="stat-label">Time:</span>
                    <span class="stat-value">${executionTime}ms</span>
                </div>
            `;
        }

        // Display platform breakdown
        this.displayPlatformBreakdown(response.data?.platform_breakdown || {});
        
        // Display source preview
        this.displaySourcePreview(response.data?.sources || []);
    }

    displayPlatformBreakdown(breakdown) {
        const breakdownElement = document.getElementById('researcher-platform-breakdown');
        if (breakdownElement && breakdown) {
            const platforms = Object.keys(breakdown);
            breakdownElement.innerHTML = platforms.map(platform => `
                <div class="platform-stat">
                    <span class="platform-name">${platform.toUpperCase()}:</span>
                    <span class="platform-count">${breakdown[platform]}</span>
                </div>
            `).join('');
        }
    }

    displaySourcePreview(sources) {
        const previewElement = document.getElementById('researcher-source-preview');
        if (previewElement) {
            const preview = sources.slice(0, 3).map(source => `
                <div class="source-preview-item">
                    <div class="source-title">${source.title || source.url}</div>
                    <div class="source-platform">${source.platform}</div>
                    <div class="source-quality">Quality: ${(source.quality_score || 0).toFixed(2)}</div>
                </div>
            `).join('');
            
            previewElement.innerHTML = preview || '<div class="no-sources">No sources found</div>';
        }
    }

    toggleAdvancedParams() {
        const advancedParams = document.getElementById('researcher-advanced-params');
        if (advancedParams) {
            const isHidden = advancedParams.style.display === 'none';
            advancedParams.style.display = isHidden ? 'block' : 'none';
            
            const toggleBtn = document.querySelector('.universal-researcher .toggle-advanced');
            if (toggleBtn) {
                toggleBtn.textContent = isHidden ? '⚙️ Hide Advanced' : '⚙️ Advanced Options';
            }
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
            const response = await this.dashboard.apiClient.post('universal-researcher', '/execute', {
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

    viewSessionDetails() {
        if (this.currentResults) {
            // Open modal or navigate to detailed view
            console.log('Session details:', this.currentResults);
        }
    }

    viewFullWorkerInterface() {
        window.location.href = '/universal-researcher.html';
    }

    exportSources() {
        if (this.currentResults?.data?.sources) {
            const sources = this.currentResults.data.sources;
            const csv = this.convertToCSV(sources);
            this.downloadCSV(csv, 'universal-research-sources.csv');
        }
    }

    convertToCSV(sources) {
        const headers = ['Title', 'URL', 'Platform', 'Quality Score', 'Description'];
        const rows = sources.map(source => [
            source.title || '',
            source.url || '',
            source.platform || '',
            source.quality_score || '',
            source.description || ''
        ]);
        
        return [headers, ...rows].map(row => 
            row.map(field => `"${field}"`).join(',')
        ).join('\n');
    }

    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    updateParameters() {
        // Real-time parameter validation and updates
        const template = document.getElementById('researcher-template')?.value;
        if (template) {
            this.showTemplateSpecificOptions(template);
        }
    }

    showTemplateSpecificOptions(template) {
        // Show/hide template-specific configuration options
        const allParams = document.querySelectorAll('.template-specific-params');
        allParams.forEach(param => param.style.display = 'none');
        
        const currentParams = document.getElementById(`${template}-params`);
        if (currentParams) {
            currentParams.style.display = 'block';
        }
    }
}

// ==========================================
// 2. Full Worker Interface (for universal-researcher.html)
// ==========================================

class UniversalResearcherFullInterface {
    constructor() {
        this.apiClient = window.apiClient; // Use global instance
        this.authClient = window.authClient; // Use global instance
        this.currentTemplate = 'search_rss';
        this.isExecuting = false;
        this.executionMonitor = null;
        this.sessionHistory = [];
        this.currentResults = null;
        
        this.init();
    }

    async init() {
        // Wait for auth client to be ready
        if (!this.authClient) {
            setTimeout(() => this.init(), 100);
            return;
        }

        // Verify authentication
        const sessionCheck = await this.authClient.validateSession();
        if (!sessionCheck.valid) {
            window.location.href = '/login.html';
            return;
        }

        this.setupEventListeners();
        await this.loadWorkerStatus();
        await this.loadSessionHistory();
        this.setupTemplateCards();
        this.setupQualitySlider();
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

        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchView(btn.dataset.view);
            });
        });

        // Quality slider
        const qualitySlider = document.getElementById('rss-quality');
        if (qualitySlider) {
            qualitySlider.addEventListener('input', (e) => {
                this.updateQualityDisplay(e.target.value);
            });
        }
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

    setupQualitySlider() {
        const qualitySlider = document.getElementById('rss-quality');
        if (qualitySlider) {
            this.updateQualityDisplay(qualitySlider.value);
        }
    }

    updateQualityDisplay(value) {
        const display = document.querySelector('.quality-display');
        if (display) {
            const qualityLabels = {
                '0.1': '0.1 (Very Low)',
                '0.2': '0.2 (Low)',
                '0.3': '0.3 (Low)',
                '0.4': '0.4 (Below Average)',
                '0.5': '0.5 (Average)',
                '0.6': '0.6 (Above Average)',
                '0.7': '0.7 (Balanced)',
                '0.8': '0.8 (High)',
                '0.9': '0.9 (Very High)',
                '1.0': '1.0 (Highest)'
            };
            display.textContent = qualityLabels[value] || `${value} (Custom)`;
        }
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

    async loadWorkerStatus() {
        try {
            const response = await this.apiClient.get('universal-researcher', '/health');
            this.updateWorkerStatus(response);
        } catch (error) {
            console.error('Failed to load worker status:', error);
            this.updateWorkerStatus({ status: 'error', message: error.message });
        }
    }

    updateWorkerStatus(status) {
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        
        if (status.status === 'ok') {
            statusIndicator.textContent = '🟢';
            statusText.textContent = 'Operational';
        } else {
            statusIndicator.textContent = '🔴';
            statusText.textContent = 'Error';
        }
    }

    async loadSessionHistory() {
        try {
            // Load from localStorage or API
            const storedHistory = localStorage.getItem('universal_researcher_history');
            if (storedHistory) {
                this.sessionHistory = JSON.parse(storedHistory);
                this.displaySessionHistory();
            }
        } catch (error) {
            console.error('Failed to load session history:', error);
        }
    }

    displaySessionHistory() {
        const timeline = document.getElementById('history-timeline');
        if (!timeline) return;

        if (this.sessionHistory.length === 0) {
            timeline.innerHTML = `
                <div class="history-placeholder">
                    <div class="placeholder-icon">📋</div>
                    <div class="placeholder-text">No research sessions yet. Execute your first research to see history here.</div>
                </div>
            `;
            return;
        }

        timeline.innerHTML = this.sessionHistory.map(session => `
            <div class="history-item">
                <div class="history-time">${new Date(session.timestamp).toLocaleString()}</div>
                <div class="history-topic">${session.topic}</div>
                <div class="history-template">${session.template}</div>
                <div class="history-stats">
                    ${session.total_sources} sources • ${session.avg_quality_score?.toFixed(2)} quality
                </div>
            </div>
        `).join('');
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
            const response = await this.apiClient.post('universal-researcher', '/execute', {
                context: context,
                template: template,
                data: { topic: topic }
            });

            if (response.status === 'ok') {
                this.displayFullResults(response);
                this.addToSessionHistory(response, topic, template);
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
            client_id: document.getElementById('client-id')?.value || 'demo_client',
            request_id: `req_${Date.now()}`,
            pipeline_id: `pipe_full_${Date.now()}`,
            billing_tier: document.getElementById('billing-tier')?.value || 'pro'
        };
    }

    buildFullTemplate() {
        const baseTemplate = {
            capability: this.currentTemplate,
            output_format: 'standard'
        };

        // Add template-specific parameters
        switch (this.currentTemplate) {
            case 'search_rss':
                baseTemplate.parameters = {
                    depth: parseInt(document.getElementById('rss-depth')?.value || 3),
                    quality_threshold: parseFloat(document.getElementById('rss-quality')?.value || 0.7),
                    cache_strategy: document.getElementById('cache-strategy')?.value || 'standard',
                    ai_model: document.getElementById('ai-model')?.value || 'gpt-4o-mini'
                };
                break;
            case 'search_youtube':
                baseTemplate.parameters = {
                    max_channels: parseInt(document.getElementById('youtube-max-channels')?.value || 20),
                    min_subscribers: parseInt(document.getElementById('youtube-min-subscribers')?.value || 1000),
                    quality_threshold: 0.7,
                    ai_model: document.getElementById('ai-model')?.value || 'gpt-4o-mini'
                };
                break;
            case 'search_all':
                baseTemplate.parameters = {
                    platform_priority: document.getElementById('all-platforms')?.value || 'balanced',
                    max_total_sources: parseInt(document.getElementById('all-max-sources')?.value || 50),
                    quality_threshold: 0.7,
                    ai_model: document.getElementById('ai-model')?.value || 'gpt-4o-mini'
                };
                break;
            default:
                baseTemplate.parameters = {
                    quality_threshold: 0.7,
                    ai_model: 'gpt-4o-mini'
                };
        }

        return baseTemplate;
    }

    showExecutionMonitor() {
        const monitor = document.getElementById('execution-monitor');
        if (monitor) {
            monitor.style.display = 'block';
            monitor.scrollIntoView({ behavior: 'smooth' });
        }
    }

    startExecutionMonitor() {
        const steps = [
            { key: 'initialize', duration: 500 },
            { key: 'generate-queries', duration: 1000 },
            { key: 'search-sources', duration: 3000 },
            { key: 'validate-sources', duration: 2000 },
            { key: 'store-results', duration: 500 }
        ];

        let currentStep = 0;
        let totalTime = 0;
        
        const updateProgress = () => {
            if (currentStep < steps.length) {
                const step = steps[currentStep];
                const stepElement = document.querySelector(`[data-step="${step.key}"]`);
                
                if (stepElement) {
                    stepElement.querySelector('.step-status').textContent = 'running';
                    stepElement.classList.add('running');
                }

                totalTime += step.duration;
                const progress = ((currentStep + 1) / steps.length) * 100;
                
                document.getElementById('progress-fill').style.width = `${progress}%`;
                document.getElementById('full-execution-time').textContent = `${totalTime}ms`;
                
                setTimeout(() => {
                    if (stepElement) {
                        stepElement.querySelector('.step-status').textContent = 'completed';
                        stepElement.classList.remove('running');
                        stepElement.classList.add('completed');
                    }
                    
                    currentStep++;
                    if (currentStep < steps.length) {
                        updateProgress();
                    }
                }, step.duration);
            }
        };

        updateProgress();
    }

    completeExecutionMonitor(status, errorMessage = null) {
        const statusElement = document.getElementById('full-execution-status');
        if (statusElement) {
            if (status === 'success') {
                statusElement.textContent = '✅ Research completed successfully';
                statusElement.className = 'execution-status success';
            } else {
                statusElement.textContent = `❌ Research failed: ${errorMessage}`;
                statusElement.className = 'execution-status error';
            }
        }

        // Auto-hide monitor after delay
        setTimeout(() => {
            const monitor = document.getElementById('execution-monitor');
            if (monitor && status === 'success') {
                monitor.style.display = 'none';
            }
        }, 3000);
    }

    displayFullResults(response) {
        this.currentResults = response;
        
        // Show results section
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
            resultsSection.style.display = 'block';
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        }

        // Update summary stats
        this.updateSummaryStats(response.data);
        
        // Display platform breakdown
        this.displayPlatformBreakdown(response.data?.platform_breakdown || {});
        
        // Display sources
        this.displaySourceResults(response.data?.sources || []);
    }

    updateSummaryStats(data) {
        document.getElementById('total-sources').textContent = data?.sources?.length || 0;
        document.getElementById('avg-quality').textContent = (data?.avg_quality_score || 0).toFixed(2);
        document.getElementById('execution-time').textContent = `${data?.execution_time_ms || 0}ms`;
        
        const platforms = Object.keys(data?.platform_breakdown || {});
        document.getElementById('platforms-covered').textContent = platforms.length;
    }

    displayPlatformBreakdown(breakdown) {
        const breakdownElement = document.getElementById('platform-breakdown');
        if (!breakdownElement) return;

        const platforms = Object.keys(breakdown);
        if (platforms.length === 0) {
            breakdownElement.innerHTML = '<div class="no-platforms">No platforms found</div>';
            return;
        }

        breakdownElement.innerHTML = platforms.map(platform => `
            <div class="platform-card">
                <div class="platform-icon">${this.getPlatformIcon(platform)}</div>
                <div class="platform-name">${platform.toUpperCase()}</div>
                <div class="platform-count">${breakdown[platform]} sources</div>
            </div>
        `).join('');
    }

    getPlatformIcon(platform) {
        const icons = {
            rss: '📡',
            youtube: '🎥',
            podcast: '🎙️',
            academic: '🎓',
            social: '💬'
        };
        return icons[platform] || '🔗';
    }

    displaySourceResults(sources) {
        this.displaySourcesGrid(sources);
        this.displaySourcesList(sources);
        this.displaySourcesAnalytics(sources);
    }

    displaySourcesGrid(sources) {
        const grid = document.getElementById('results-grid');
        if (!grid) return;

        if (sources.length === 0) {
            grid.innerHTML = '<div class="no-sources">No sources found for this research topic.</div>';
            return;
        }

        grid.innerHTML = sources.map(source => `
            <div class="source-card" data-platform="${source.platform}" data-quality="${source.quality_score}">
                <div class="source-header">
                    <div class="source-platform">${this.getPlatformIcon(source.platform)} ${source.platform}</div>
                    <div class="source-quality">${(source.quality_score || 0).toFixed(2)}</div>
                </div>
                <div class="source-title">${source.title || 'Untitled'}</div>
                <div class="source-description">${source.description || 'No description available'}</div>
                <div class="source-footer">
                    <a href="${source.identifier}" target="_blank" class="source-link">Visit Source</a>
                    <div class="source-meta">
                        ${source.author ? `By ${source.author}` : ''}
                        ${source.published_date ? ` • ${new Date(source.published_date).toLocaleDateString()}` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    displaySourcesList(sources) {
        const list = document.getElementById('results-list');
        if (!list) return;

        list.innerHTML = sources.map(source => `
            <div class="source-list-item" data-platform="${source.platform}" data-quality="${source.quality_score}">
                <div class="source-list-content">
                    <div class="source-list-title">
                        <a href="${source.identifier}" target="_blank">${source.title || 'Untitled'}</a>
                    </div>
                    <div class="source-list-meta">
                        ${this.getPlatformIcon(source.platform)} ${source.platform} • 
                        Quality: ${(source.quality_score || 0).toFixed(2)} •
                        ${source.author ? `${source.author} • ` : ''}
                        ${source.published_date ? new Date(source.published_date).toLocaleDateString() : 'No date'}
                    </div>
                    <div class="source-list-description">${source.description || 'No description available'}</div>
                </div>
            </div>
        `).join('');
    }

    displaySourcesAnalytics(sources) {
        const analytics = document.getElementById('results-analytics');
        if (!analytics) return;

        // Calculate analytics
        const platformStats = {};
        const qualityDistribution = { high: 0, medium: 0, low: 0 };
        let totalQuality = 0;

        sources.forEach(source => {
            // Platform stats
            platformStats[source.platform] = (platformStats[source.platform] || 0) + 1;
            
            // Quality distribution
            const quality = source.quality_score || 0;
            totalQuality += quality;
            
            if (quality >= 0.8) qualityDistribution.high++;
            else if (quality >= 0.6) qualityDistribution.medium++;
            else qualityDistribution.low++;
        });

        const avgQuality = sources.length > 0 ? totalQuality / sources.length : 0;

        analytics.innerHTML = `
            <div class="analytics-grid">
                <div class="analytics-card">
                    <h3>Platform Distribution</h3>
                    <div class="platform-stats">
                        ${Object.keys(platformStats).map(platform => `
                            <div class="platform-stat">
                                <span class="platform-name">${platform}</span>
                                <span class="platform-percentage">${((platformStats[platform] / sources.length) * 100).toFixed(1)}%</span>
                                <span class="platform-count">(${platformStats[platform]} sources)</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="analytics-card">
                    <h3>Quality Distribution</h3>
                    <div class="quality-stats">
                        <div class="quality-stat">
                            <span class="quality-label">High (0.8+)</span>
                            <span class="quality-count">${qualityDistribution.high}</span>
                        </div>
                        <div class="quality-stat">
                            <span class="quality-label">Medium (0.6-0.8)</span>
                            <span class="quality-count">${qualityDistribution.medium}</span>
                        </div>
                        <div class="quality-stat">
                            <span class="quality-label">Low (0.4-0.6)</span>
                            <span class="quality-count">${qualityDistribution.low}</span>
                        </div>
                    </div>
                    <div class="quality-average">Average Quality: ${avgQuality.toFixed(2)}</div>
                </div>
                
                <div class="analytics-card">
                    <h3>Research Insights</h3>
                    <div class="insights">
                        <div class="insight">
                            <strong>Best Platform:</strong> 
                            ${Object.keys(platformStats).sort((a, b) => platformStats[b] - platformStats[a])[0] || 'None'}
                        </div>
                        <div class="insight">
                            <strong>Quality Score:</strong> 
                            ${avgQuality >= 0.8 ? 'Excellent' : avgQuality >= 0.6 ? 'Good' : 'Needs improvement'}
                        </div>
                        <div class="insight">
                            <strong>Coverage:</strong> 
                            ${sources.length >= 20 ? 'Comprehensive' : sources.length >= 10 ? 'Good' : 'Limited'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    switchView(view) {
        // Update view buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === view) {
                btn.classList.add('active');
            }
        });

        // Show/hide view content
        document.getElementById('results-grid').style.display = view === 'grid' ? 'block' : 'none';
        document.getElementById('results-list').style.display = view === 'list' ? 'block' : 'none';
        document.getElementById('results-analytics').style.display = view === 'analytics' ? 'block' : 'none';
    }

    filterSources() {
        const platformFilter = document.getElementById('platform-filter')?.value || 'all';
        const qualityFilter = document.getElementById('quality-filter')?.value || 'all';

        const sourceCards = document.querySelectorAll('.source-card, .source-list-item');
        
        sourceCards.forEach(card => {
            let show = true;

            // Platform filter
            if (platformFilter !== 'all') {
                const cardPlatform = card.dataset.platform;
                if (cardPlatform !== platformFilter) {
                    show = false;
                }
            }

            // Quality filter
            if (qualityFilter !== 'all' && show) {
                const cardQuality = parseFloat(card.dataset.quality || 0);
                switch (qualityFilter) {
                    case 'high':
                        if (cardQuality < 0.8) show = false;
                        break;
                    case 'medium':
                        if (cardQuality < 0.6 || cardQuality >= 0.8) show = false;
                        break;
                    case 'low':
                        if (cardQuality >= 0.6) show = false;
                        break;
                }
            }

            card.style.display = show ? 'block' : 'none';
        });
    }

    addToSessionHistory(response, topic, template) {
        const historyItem = {
            timestamp: new Date().toISOString(),
            topic: topic,
            template: template.capability,
            total_sources: response.data?.sources?.length || 0,
            avg_quality_score: response.data?.avg_quality_score || 0,
            execution_time_ms: response.data?.execution_time_ms || 0,
            platform_breakdown: response.data?.platform_breakdown || {}
        };

        this.sessionHistory.unshift(historyItem);
        
        // Keep only last 20 sessions
        if (this.sessionHistory.length > 20) {
            this.sessionHistory = this.sessionHistory.slice(0, 20);
        }

        // Save to localStorage
        localStorage.setItem('universal_researcher_history', JSON.stringify(this.sessionHistory));
        
        // Update display
        this.displaySessionHistory();
    }

    exportSources() {
        if (!this.currentResults?.data?.sources) {
            alert('No sources to export');
            return;
        }

        const sources = this.currentResults.data.sources;
        const csv = this.convertToCSV(sources);
        this.downloadCSV(csv, `universal-research-${Date.now()}.csv`);
    }

    convertToCSV(sources) {
        const headers = ['Title', 'URL', 'Platform', 'Quality Score', 'Description', 'Author', 'Published Date'];
        const rows = sources.map(source => [
            source.title || '',
            source.identifier || '',
            source.platform || '',
            source.quality_score || '',
            source.description || '',
            source.author || '',
            source.published_date || ''
        ]);
        
        return [headers, ...rows].map(row => 
            row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
    }

    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    refreshHistory() {
        this.loadSessionHistory();
    }

    updateParameters() {
        // Real-time parameter validation and preview
        console.log('Parameters updated for template:', this.currentTemplate);
    }
}

// ==========================================
// 3. Global Functions for Dashboard Integration
// ==========================================

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
    } else if (window.universalResearcherFull) {
        const advancedParams = document.getElementById('advanced-params');
        if (advancedParams) {
            const isHidden = advancedParams.style.display === 'none';
            advancedParams.style.display = isHidden ? 'block' : 'none';
            
            const toggleBtn = document.querySelector('.toggle-advanced');
            if (toggleBtn) {
                toggleBtn.textContent = isHidden ? '⚙️ Hide Advanced' : '⚙️ Advanced Options';
            }
        }
    }
}

function executeFullResearch() {
    if (window.universalResearcherFull) {
        window.universalResearcherFull.executeFullResearch();
    }
}

function saveTemplate() {
    if (window.universalResearcherFull) {
        // Get current template configuration
        const template = window.universalResearcherFull.buildFullTemplate();
        const templateName = prompt('Enter template name:');
        
        if (templateName) {
            const savedTemplates = JSON.parse(localStorage.getItem('universal_researcher_templates') || '[]');
            savedTemplates.push({
                name: templateName,
                template: template,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('universal_researcher_templates', JSON.stringify(savedTemplates));
            alert('Template saved successfully!');
        }
    }
}

function loadTemplate() {
    if (window.universalResearcherFull) {
        const savedTemplates = JSON.parse(localStorage.getItem('universal_researcher_templates') || '[]');
        
        if (savedTemplates.length === 0) {
            alert('No saved templates found');
            return;
        }
        
        const templateNames = savedTemplates.map(t => t.name);
        const selectedName = prompt(`Select template:\n${templateNames.join('\n')}`);
        
        const selectedTemplate = savedTemplates.find(t => t.name === selectedName);
        if (selectedTemplate) {
            // Load template configuration into UI
            console.log('Loading template:', selectedTemplate.template);
            alert('Template loading not fully implemented yet');
        }
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

function refreshHistory() {
    if (window.universalResearcherFull) {
        window.universalResearcherFull.refreshHistory();
    }
}

// ==========================================
// 4. Initialize Components
// ==========================================

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