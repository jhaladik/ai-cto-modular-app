// Report Builder UI - Intelligence Report Generation Interface
// Follows the established pattern from RSS Librarian, Feed Fetcher, and Content Classifier

class ReportBuilderUI {
    constructor() {
        this.authClient = window.authClient;
        this.apiClient = null;
        this.isAdmin = false;
        this.selectedReportType = null;
        this.selectedOutputFormat = 'json';
        this.currentReports = [];
        this.isGenerating = false;
        this.healthCheckInterval = null;
        this.generationInterval = null;
    }

    async init() {
        try {
            // Check authentication
            if (!this.authClient || !this.authClient.isAuthenticated()) {
                window.location.href = '/login.html';
                return;
            }

            this.apiClient = new APIClient(this.authClient);
            
            // Get user role
            const userInfo = localStorage.getItem('bitware-user-info');
            if (userInfo) {
                const user = JSON.parse(userInfo);
                this.isAdmin = user.role === 'admin';
                document.getElementById('user-display').textContent = `${user.username} (${user.role})`;
            }
            
            // Show/hide admin features
            if (this.isAdmin) {
                document.querySelectorAll('.admin-only').forEach(el => {
                    el.style.display = 'block';
                });
            }

            // Set up event listeners
            this.setupEventListeners();

            // Load initial data
            await this.loadInitialData();

            // Start health monitoring
            this.startHealthCheck();

            // Hide loading screen and show main content
            document.getElementById('loading-screen').style.display = 'none';
            document.getElementById('main-content').style.display = 'block';

            console.log('✅ Report Builder UI initialized successfully');
            
        } catch (error) {
            console.error('❌ Error initializing Report Builder UI:', error);
            this.showError('Failed to initialize Report Builder interface');
        }
    }

    setupEventListeners() {
        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.authClient.logout();
        });

        // Report type selection
        document.querySelectorAll('.report-type-option').forEach(option => {
            option.addEventListener('click', (e) => {
                document.querySelectorAll('.report-type-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                option.classList.add('selected');
                this.selectedReportType = option.dataset.type;
                this.updateCostEstimate();
            });
        });

        // Output format selection
        document.querySelectorAll('.format-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.format-tab').forEach(t => {
                    t.classList.remove('active');
                });
                tab.classList.add('active');
                this.selectedOutputFormat = tab.dataset.format;
                this.updateCostEstimate();
            });
        });

        // Generate report button
        document.getElementById('generate-report-btn').addEventListener('click', () => {
            this.generateReport();
        });

        // Form inputs that affect cost
        ['topic-filters', 'time-range', 'min-relevance', 'entity-focus', 'include-charts', 'include-sources'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.updateCostEstimate());
                element.addEventListener('input', () => this.updateCostEstimate());
            }
        });

        // Relevance slider display
        const relevanceSlider = document.getElementById('min-relevance');
        const relevanceDisplay = document.getElementById('relevance-display');
        relevanceSlider.addEventListener('input', (e) => {
            relevanceDisplay.textContent = e.target.value;
        });

        // Custom time range handling
        document.getElementById('time-range').addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                // Could add custom date picker UI here
                console.log('Custom time range selected');
            }
        });
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadCapabilities(),
                this.loadDashboardData(),
                this.loadReports(),
                this.checkHealth()
            ]);

            // Load admin data for metrics (even for non-admin users)
            await this.loadAdminStats();
            
            // Load additional admin data if admin
            if (this.isAdmin) {
                // Additional admin-only features if needed
            }
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load Report Builder data');
        }
    }

    async loadCapabilities() {
        try {
            const response = await this.apiClient.callWorker('report-builder', '/capabilities', 'GET');
            if (response.success && response.data) {
                console.log('Report Builder capabilities:', response.data);
                // Update UI with capabilities info if needed
            }
        } catch (error) {
            console.error('Error loading capabilities:', error);
        }
    }

    async loadDashboardData() {
        try {
            const response = await this.apiClient.callWorker('report-builder', '/dashboard-data', 'GET');
            if (response.success && response.data) {
                const data = response.data;
                
                // Update status bar metrics
                document.getElementById('reports-today').textContent = data.reports_today || '0';
                document.getElementById('avg-generation-time').textContent = data.avg_generation_time || '-';
                document.getElementById('cost-today').textContent = data.cost_today ? `${data.cost_today.toFixed(2)}` : '$0.00';
                document.getElementById('success-rate').textContent = data.success_rate ? `${(data.success_rate * 100).toFixed(1)}%` : '-';
                document.getElementById('cache-hit-rate').textContent = data.cache_hit_rate ? `${(data.cache_hit_rate * 100).toFixed(1)}%` : '-';
                
                // Update analytics metrics
                document.getElementById('total-reports').textContent = data.total_reports || '0';
                document.getElementById('success-rate-metric').textContent = data.success_rate ? `${(data.success_rate * 100).toFixed(1)}%` : '-';
                document.getElementById('avg-cost').textContent = data.avg_cost ? `${data.avg_cost.toFixed(3)}` : '$0.000';
                document.getElementById('total-cost').textContent = data.total_cost ? `${data.total_cost.toFixed(2)}` : '$0.00';
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    async checkHealth() {
        try {
            const response = await this.apiClient.callWorker('report-builder', '/health', 'GET');
            
            if (response.success && response.data) {
                const health = response.data;
                const isHealthy = health.status === 'healthy';
                
                const statusElement = document.getElementById('worker-status');
                statusElement.textContent = isHealthy ? 'Healthy' : 'Unhealthy';
                statusElement.className = `status-value ${isHealthy ? 'status-healthy' : 'status-error'}`;
            }
        } catch (error) {
            console.error('Error checking health:', error);
            const statusElement = document.getElementById('worker-status');
            statusElement.textContent = 'Error';
            statusElement.className = 'status-value status-error';
        }
    }

    async generateReport() {
        if (this.isGenerating) {
            this.showWarning('Report generation already in progress');
            return;
        }

        if (!this.selectedReportType) {
            this.showError('Please select a report type');
            return;
        }

        const topicFilters = document.getElementById('topic-filters').value
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);

        const entityFocus = document.getElementById('entity-focus').value
            .split(',')
            .map(e => e.trim())
            .filter(e => e.length > 0);

        const reportRequest = {
            report_type: this.selectedReportType,
            topic_filters: topicFilters.length > 0 ? topicFilters : undefined,
            time_range: document.getElementById('time-range').value,
            output_format: this.selectedOutputFormat,
            include_charts: document.getElementById('include-charts').checked,
            include_sources: document.getElementById('include-sources').checked,
            min_relevance_score: parseFloat(document.getElementById('min-relevance').value),
            entity_focus: entityFocus.length > 0 ? entityFocus : undefined
        };

        this.isGenerating = true;
        this.showGenerationProgress();

        try {
            console.log('Generating report:', reportRequest);

            const response = await this.apiClient.post('report-builder', '/generate', reportRequest);

            if (response && response.status === 'ok') {
                this.hideGenerationProgress();
                this.showSuccess(`Report generated successfully! Report ID: ${response.report_id}`);
                
                // Refresh reports list and analytics
                await Promise.all([
                    this.loadReports(),
                    this.loadDashboardData()
                ]);

                // Clear form
                this.clearForm();
            } else {
                throw new Error(response?.error || 'Report generation failed');
            }
        } catch (error) {
            console.error('Error generating report:', error);
            this.hideGenerationProgress();
            this.showError(`Report generation failed: ${error.message}`);
        } finally {
            this.isGenerating = false;
        }
    }

    showGenerationProgress() {
        const progressDiv = document.getElementById('generation-progress');
        const generateBtn = document.getElementById('generate-report-btn');
        
        progressDiv.style.display = 'block';
        generateBtn.textContent = 'Generating...';
        generateBtn.disabled = true;

        // Simulate progress for user feedback
        let progress = 0;
        const progressFill = document.getElementById('progress-fill');
        const progressStatus = document.getElementById('progress-status');

        const stages = [
            'Initializing report generation...',
            'Querying analyzed articles...',
            'Processing content with AI...',
            'Generating insights and analysis...',
            'Formatting report output...',
            'Finalizing report...'
        ];

        this.generationInterval = setInterval(() => {
            progress += Math.random() * 15 + 5;
            if (progress > 95) progress = 95;
            
            progressFill.style.width = `${progress}%`;
            
            const stageIndex = Math.floor((progress / 100) * stages.length);
            if (stageIndex < stages.length) {
                progressStatus.textContent = stages[stageIndex];
            }
        }, 1000);
    }

    hideGenerationProgress() {
        const progressDiv = document.getElementById('generation-progress');
        const generateBtn = document.getElementById('generate-report-btn');
        
        progressDiv.style.display = 'none';
        generateBtn.textContent = '📊 Generate Intelligence Report';
        generateBtn.disabled = false;

        if (this.generationInterval) {
            clearInterval(this.generationInterval);
            this.generationInterval = null;
        }
    }

    async loadReports() {
        try {
            const response = await this.apiClient.get('report-builder', '/reports');
            
            if (response.success && response.data && response.data.reports) {
                this.currentReports = response.data.reports;
                this.displayReports();
            }
        } catch (error) {
            console.error('Error loading reports:', error);
        }
    }

    displayReports() {
        const reportsList = document.getElementById('reports-list');
        
        if (this.currentReports.length === 0) {
            reportsList.innerHTML = `
                <div class="empty-state">
                    <h4>No reports generated yet</h4>
                    <p>Create your first intelligence report using the console</p>
                </div>
            `;
            return;
        }

        const reportsHtml = this.currentReports.map(report => {
            const createdDate = new Date(report.created_at).toLocaleDateString();
            const reportTypeDisplay = this.formatReportType(report.report_type);
            
            return `
                <div class="report-item">
                    <div class="report-title">${report.title || reportTypeDisplay}</div>
                    <div class="report-meta">
                        <span>Type: ${reportTypeDisplay}</span>
                        <span>Created: ${createdDate}</span>
                        <span>Format: ${report.output_format?.toUpperCase() || 'JSON'}</span>
                    </div>
                    <div class="report-actions">
                        <button class="btn btn-primary" onclick="reportBuilderUI.viewReport(${report.id})">
                            👁️ View
                        </button>
                        <button class="btn btn-secondary" onclick="reportBuilderUI.downloadReport(${report.id})">
                            📥 Download
                        </button>
                        ${this.isAdmin ? `
                            <button class="btn btn-warning" onclick="reportBuilderUI.deleteReport(${report.id})">
                                🗑️ Delete
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        reportsList.innerHTML = reportsHtml;
    }

    formatReportType(type) {
        const typeMap = {
            'executive_summary': 'Executive Summary',
            'trend_analysis': 'Trend Analysis',
            'technical_deep_dive': 'Technical Deep Dive',
            'competitive_intelligence': 'Competitive Intelligence',
            'daily_briefing': 'Daily Briefing'
        };
        return typeMap[type] || type;
    }

    updateCostEstimate() {
        // Simple cost estimation logic based on report type and options
        let baseCost = 0.15; // Base cost for report generation
        
        // Adjust cost based on report type
        const costMultipliers = {
            'executive_summary': 1.0,
            'trend_analysis': 1.5,
            'technical_deep_dive': 2.0,
            'competitive_intelligence': 1.8,
            'daily_briefing': 0.8
        };

        if (this.selectedReportType) {
            baseCost *= costMultipliers[this.selectedReportType] || 1.0;
        }

        // Adjust for options
        if (document.getElementById('include-charts')?.checked) {
            baseCost *= 1.3;
        }

        if (document.getElementById('include-sources')?.checked) {
            baseCost *= 1.1;
        }

        // Adjust for output format
        const formatMultipliers = {
            'json': 1.0,
            'html': 1.2,
            'markdown': 1.1,
            'email': 1.15
        };
        baseCost *= formatMultipliers[this.selectedOutputFormat] || 1.0;

        // Estimate generation time
        let estimatedTime = 30; // Base 30 seconds
        if (this.selectedReportType === 'technical_deep_dive') {
            estimatedTime = 60;
        } else if (this.selectedReportType === 'daily_briefing') {
            estimatedTime = 20;
        }

        document.getElementById('cost-estimate').textContent = 
            `Estimated Cost: $${baseCost.toFixed(3)} | Generation Time: ~${estimatedTime}s`;
    }

    async viewReport(reportId) {
        try {
            window.open(`/api/report-builder/reports/${reportId}/view`, '_blank');
        } catch (error) {
            console.error('Error viewing report:', error);
            this.showError('Failed to view report');
        }
    }

    async downloadReport(reportId) {
        try {
            const report = this.currentReports.find(r => r.id === reportId);
            const format = report?.output_format || 'json';
            window.open(`/api/report-builder/reports/${reportId}/download?format=${format}`, '_blank');
        } catch (error) {
            console.error('Error downloading report:', error);
            this.showError('Failed to download report');
        }
    }

    async deleteReport(reportId) {
        if (!confirm('Are you sure you want to delete this report?')) {
            return;
        }

        try {
            const response = await this.apiClient.callWorker('report-builder', `/admin/reports/${reportId}`, 'DELETE');
            
            if (response.success) {
                this.showSuccess('Report deleted successfully');
                await this.loadReports();
            } else {
                throw new Error(response.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Error deleting report:', error);
            this.showError('Failed to delete report');
        }
    }

    clearForm() {
        // Clear report type selection
        document.querySelectorAll('.report-type-option').forEach(option => {
            option.classList.remove('selected');
        });
        this.selectedReportType = null;

        // Reset form fields
        document.getElementById('topic-filters').value = '';
        document.getElementById('time-range').value = '7d';
        document.getElementById('min-relevance').value = '0.7';
        document.getElementById('relevance-display').textContent = '0.7';
        document.getElementById('entity-focus').value = '';
        document.getElementById('include-charts').checked = true;
        document.getElementById('include-sources').checked = true;

        // Reset output format to JSON
        document.querySelectorAll('.format-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector('.format-tab[data-format="json"]').classList.add('active');
        this.selectedOutputFormat = 'json';

        this.updateCostEstimate();
    }

    async refreshReports() {
        await this.loadReports();
        this.showSuccess('Reports refreshed');
    }

    async refreshAnalytics() {
        await this.loadDashboardData();
        this.showSuccess('Analytics refreshed');
    }

    // Admin Functions
    async loadAdminStats() {
        try {
            const response = await this.apiClient.callWorker('report-builder', '/admin/stats', 'GET');
            if (response.success && response.data) {
                console.log('Admin stats loaded:', response.data);
            }
        } catch (error) {
            console.error('Error loading admin stats:', error);
        }
    }

    async viewAdminStats() {
        try {
            const response = await this.apiClient.callWorker('report-builder', '/admin/stats', 'GET');
            if (response.success) {
                alert(`System Statistics:\n\nTotal Jobs: ${response.data.total_jobs}\nCompleted: ${response.data.completed_jobs}\nFailed: ${response.data.failed_jobs}\nSuccess Rate: ${(response.data.success_rate * 100).toFixed(2)}%\nTotal Cost: ${response.data.total_cost.toFixed(2)}`);
            }
        } catch (error) {
            console.error('Error viewing admin stats:', error);
            this.showError('Failed to load admin statistics');
        }
    }

    async viewJobHistory() {
        try {
            const response = await this.apiClient.callWorker('report-builder', '/admin/jobs', 'GET');
            if (response.success) {
                console.log('Job history:', response.data);
                this.showSuccess('Job history loaded (check console)');
            }
        } catch (error) {
            console.error('Error viewing job history:', error);
            this.showError('Failed to load job history');
        }
    }

    async viewCostAnalysis() {
        try {
            const response = await this.apiClient.callWorker('report-builder', '/admin/costs', 'GET');
            if (response.success) {
                console.log('Cost analysis:', response.data);
                this.showSuccess('Cost analysis loaded (check console)');
            }
        } catch (error) {
            console.error('Error viewing cost analysis:', error);
            this.showError('Failed to load cost analysis');
        }
    }

    async clearCache() {
        if (!confirm('Are you sure you want to clear the report cache?')) {
            return;
        }

        try {
            const response = await this.apiClient.callWorker('report-builder', '/admin/clear-cache', 'POST');
            if (response.success) {
                this.showSuccess('Cache cleared successfully');
            } else {
                throw new Error(response.error || 'Cache clear failed');
            }
        } catch (error) {
            console.error('Error clearing cache:', error);
            this.showError('Failed to clear cache');
        }
    }

    // Health Check Management
    startHealthCheck() {
        // Check health every 30 seconds
        this.healthCheckInterval = setInterval(() => {
            this.checkHealth();
        }, 30000);
    }

    stopHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }

    // UI Notification Methods
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showWarning(message) {
        this.showNotification(message, 'warning');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Cleanup method
    destroy() {
        this.stopHealthCheck();
        if (this.generationInterval) {
            clearInterval(this.generationInterval);
        }
    }
}

// Auto-cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.reportBuilderUI) {
        window.reportBuilderUI.destroy();
    }
});