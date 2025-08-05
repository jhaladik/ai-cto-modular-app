/**
 * Granulation Page Component
 * Manages content granulation jobs and structure generation
 */
class GranulationPage {
    constructor(apiClient) {
        this.apiClient = apiClient || window.apiClient;
        this.jobs = [];
        this.templates = [];
        this.currentFilter = 'all';
        this.currentSort = 'created_at';
        this.sortDirection = 'desc';
        this.expandedRows = new Set();
        this.isLoading = false;
        this.activeTab = 'jobs'; // jobs, templates, deliverables
        this.selectedJob = null;
        
        // Bind methods
        this.handleSort = this.handleSort.bind(this);
        this.toggleRowExpansion = this.toggleRowExpansion.bind(this);
        this.filterJobs = this.filterJobs.bind(this);
        this.refresh = this.refresh.bind(this);
        this.switchTab = this.switchTab.bind(this);
        this.showTemplateDetails = this.showTemplateDetails.bind(this);
        this.testTemplate = this.testTemplate.bind(this);
    }

    render() {
        return `
            <div class="admin-page granulation-page">
                <!-- Page Header -->
                <div class="page-header">
                    <h1 class="page-title">🧱 Content Granulation</h1>
                    <div class="page-actions">
                        <button class="btn btn-secondary" onclick="granulationPage.refresh()">
                            🔄 Refresh
                        </button>
                        ${this.activeTab === 'jobs' ? `
                            <button class="btn btn-primary" onclick="granulationPage.showCreateGranulation()">
                                ➕ New Granulation
                            </button>
                        ` : ''}
                        ${this.activeTab === 'templates' ? `
                            <button class="btn btn-primary" onclick="granulationPage.showTemplateTest()">
                                🧪 Test Template
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Summary Cards -->
                <div class="granulation-summary" id="granulation-summary">
                    <!-- Summary cards will be rendered here -->
                </div>

                <!-- Main Tabs -->
                <div class="granulation-tabs">
                    <button class="main-tab ${this.activeTab === 'jobs' ? 'active' : ''}" 
                            onclick="granulationPage.switchTab('jobs')">
                        🔨 Jobs
                    </button>
                    <button class="main-tab ${this.activeTab === 'templates' ? 'active' : ''}" 
                            onclick="granulationPage.switchTab('templates')">
                        📋 Templates
                    </button>
                    <button class="main-tab ${this.activeTab === 'deliverables' ? 'active' : ''}" 
                            onclick="granulationPage.switchTab('deliverables')">
                        📦 Deliverables
                    </button>
                </div>

                ${this.activeTab === 'jobs' ? `
                    <!-- Filter Tabs for Jobs -->
                    <div class="granulation-filters">
                        <button class="filter-tab ${this.currentFilter === 'all' ? 'active' : ''}" 
                                onclick="granulationPage.filterJobs('all')">
                            All Jobs
                        </button>
                        <button class="filter-tab ${this.currentFilter === 'processing' ? 'active' : ''}" 
                                onclick="granulationPage.filterJobs('processing')">
                            Processing
                        </button>
                        <button class="filter-tab ${this.currentFilter === 'validating' ? 'active' : ''}" 
                                onclick="granulationPage.filterJobs('validating')">
                            Validating
                        </button>
                        <button class="filter-tab ${this.currentFilter === 'completed' ? 'active' : ''}" 
                                onclick="granulationPage.filterJobs('completed')">
                            Completed
                        </button>
                        <button class="filter-tab ${this.currentFilter === 'failed' ? 'active' : ''}" 
                                onclick="granulationPage.filterJobs('failed')">
                            Failed
                        </button>
                    </div>
                ` : ''}

                <!-- Content Area -->
                <div class="granulation-content" id="granulation-content">
                    <!-- Content will be rendered here based on active tab -->
                </div>
            </div>
        `;
    }

    async mount() {
        console.log('🧱 Mounting Granulation Page...');
        
        // Load initial data
        await Promise.all([
            this.loadJobs(),
            this.loadTemplates(),
            this.loadStats()
        ]);
        
        // Render summary
        this.renderSummary();
        
        // Render initial content
        this.renderContent();
        
        console.log('✅ Granulation Page mounted');
    }

    async loadJobs() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        console.log('📡 Loading granulation jobs...');
        
        try {
            const response = await this.apiClient.getGranulationJobs();
            this.jobs = response.jobs || [];
            console.log(`✅ Loaded ${this.jobs.length} jobs`);
        } catch (error) {
            console.error('❌ Error loading jobs:', error);
            this.jobs = [];
            // Don't show error toast during initial load
        } finally {
            this.isLoading = false;
        }
    }

    async loadTemplates() {
        try {
            const response = await this.apiClient.getGranulatorTemplates();
            if (response.templates) {
                this.templates = response.templates;
            }
        } catch (error) {
            console.error('❌ Error loading templates:', error);
        }
    }

    async loadStats() {
        try {
            this.stats = await this.apiClient.getGranulatorStats();
        } catch (error) {
            console.error('❌ Error loading stats:', error);
            this.stats = null;
        }
    }

    renderSummary() {
        const summaryElement = document.getElementById('granulation-summary');
        if (!summaryElement) return;

        const stats = this.stats || {
            totalGranulations: 0,
            avgQualityScore: 0,
            performanceMetrics: { avgProcessingTime: 0, successRate: 0 },
            validationMetrics: { avgAccuracy: 0 }
        };

        summaryElement.innerHTML = `
            <div class="summary-cards">
                <div class="summary-card">
                    <div class="summary-icon">📊</div>
                    <div class="summary-content">
                        <div class="summary-value">${stats.totalGranulations || 0}</div>
                        <div class="summary-label">Total Granulations</div>
                    </div>
                </div>
                <div class="summary-card">
                    <div class="summary-icon">⭐</div>
                    <div class="summary-content">
                        <div class="summary-value">${((stats.avgQualityScore || 0) * 100).toFixed(0)}%</div>
                        <div class="summary-label">Avg Quality Score</div>
                    </div>
                </div>
                <div class="summary-card">
                    <div class="summary-icon">⚡</div>
                    <div class="summary-content">
                        <div class="summary-value">${(stats.performanceMetrics?.avgProcessingTime / 1000 || 0).toFixed(1)}s</div>
                        <div class="summary-label">Avg Processing Time</div>
                    </div>
                </div>
                <div class="summary-card">
                    <div class="summary-icon">✅</div>
                    <div class="summary-content">
                        <div class="summary-value">${(stats.validationMetrics?.avgAccuracy || 0).toFixed(0)}%</div>
                        <div class="summary-label">Validation Accuracy</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderJobs() {
        const filteredJobs = this.getFilteredJobs();
        
        if (filteredJobs.length === 0) {
            return this.renderEmptyState();
        }

        return `
            <div class="data-table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th class="sortable" onclick="granulationPage.handleSort('id')">
                                ID ${this.getSortIcon('id')}
                            </th>
                            <th class="sortable" onclick="granulationPage.handleSort('topic')">
                                Topic ${this.getSortIcon('topic')}
                            </th>
                            <th class="sortable" onclick="granulationPage.handleSort('structure_type')">
                                Type ${this.getSortIcon('structure_type')}
                            </th>
                            <th class="sortable" onclick="granulationPage.handleSort('status')">
                                Status ${this.getSortIcon('status')}
                            </th>
                            <th class="sortable" onclick="granulationPage.handleSort('quality_score')">
                                Quality ${this.getSortIcon('quality_score')}
                            </th>
                            <th class="sortable" onclick="granulationPage.handleSort('created_at')">
                                Created ${this.getSortIcon('created_at')}
                            </th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredJobs.map(job => this.renderJobRow(job)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderJobRow(job) {
        const isExpanded = this.expandedRows.has(job.id);
        const statusClass = this.getStatusClass(job.status);
        const qualityClass = this.getQualityClass(job.quality_score);

        return `
            <tr class="data-row ${isExpanded ? 'expanded' : ''}" onclick="granulationPage.toggleRowExpansion(${job.id})">
                <td class="job-id">#${job.id}</td>
                <td class="job-topic">
                    <div class="topic-info">
                        <span class="topic-name">${this.escapeHtml(job.topic)}</span>
                        ${job.granularity_level ? `<span class="badge badge-info">Level ${job.granularity_level}</span>` : ''}
                    </div>
                </td>
                <td class="job-type">
                    <span class="structure-type-badge ${job.structure_type}">
                        ${this.getStructureTypeIcon(job.structure_type)} ${job.structure_type}
                    </span>
                </td>
                <td class="job-status">
                    <span class="status-badge ${statusClass}">${job.status}</span>
                </td>
                <td class="job-quality">
                    <span class="quality-badge ${qualityClass}">
                        ${job.quality_score ? `${(job.quality_score * 100).toFixed(0)}%` : '-'}
                    </span>
                </td>
                <td class="job-created">${this.formatDate(job.created_at)}</td>
                <td class="job-actions">
                    <button class="btn btn-sm" onclick="event.stopPropagation(); granulationPage.viewJobDetails(${job.id})" title="View Details">
                        👁️
                    </button>
                    ${job.status === 'completed' ? `
                        <button class="btn btn-sm" onclick="event.stopPropagation(); granulationPage.downloadStructure(${job.id})" title="Download Structure">
                            📥
                        </button>
                    ` : ''}
                    ${job.status === 'validating' || job.status === 'failed' ? `
                        <button class="btn btn-sm" onclick="event.stopPropagation(); granulationPage.retryJob(${job.id})" title="Retry">
                            🔄
                        </button>
                    ` : ''}
                </td>
            </tr>
            ${isExpanded ? this.renderJobDetails(job) : ''}
        `;
    }

    renderJobDetails(job) {
        return `
            <tr class="expanded-content">
                <td colspan="7">
                    <div class="job-details">
                        <div class="detail-section">
                            <h4>Job Information</h4>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <span class="detail-label">Template:</span>
                                    <span class="detail-value">${job.template_name || 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Target Audience:</span>
                                    <span class="detail-value">${job.target_audience || 'General'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Processing Time:</span>
                                    <span class="detail-value">${job.processing_time_ms ? `${(job.processing_time_ms / 1000).toFixed(1)}s` : 'N/A'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Cost:</span>
                                    <span class="detail-value">${job.cost_usd ? `$${job.cost_usd.toFixed(4)}` : 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                        
                        ${job.validation_result ? `
                            <div class="detail-section">
                                <h4>Validation Results</h4>
                                <div class="validation-info">
                                    <div class="validation-score">
                                        <span class="score-label">Accuracy:</span>
                                        <span class="score-value ${job.validation_result.passed ? 'passed' : 'failed'}">
                                            ${job.validation_result.accuracy_percentage.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div class="validation-details">
                                        <span>Level ${job.validation_result.level_used} validation</span>
                                        <span>•</span>
                                        <span>Threshold: ${job.validation_result.threshold}%</span>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }

    renderLoadingState() {
        return `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Loading granulation jobs...</p>
            </div>
        `;
    }

    renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">🧱</div>
                <h3>No Granulation Jobs Found</h3>
                <p>Start by creating a new granulation job to transform topics into structured content.</p>
                <button class="btn btn-primary" onclick="granulationPage.showCreateGranulation()">
                    Create First Granulation
                </button>
            </div>
        `;
    }

    async showCreateGranulation() {
        const modal = new GranulationModal(this.templates);
        const result = await modal.show();
        
        if (result) {
            await this.createGranulation(result);
        }
    }

    async createGranulation(data) {
        try {
            console.log('🧱 Creating granulation:', data);
            const response = await this.apiClient.createGranulation(data);
            
            if (response.jobId) {
                window.uiUtils.showToast('Granulation job created successfully!', 'success');
                await this.refresh();
            }
        } catch (error) {
            console.error('❌ Error creating granulation:', error);
            window.uiUtils.showToast(error.message || 'Failed to create granulation', 'error');
        }
    }

    async viewJobDetails(jobId) {
        // TODO: Show detailed view modal
        console.log('View job details:', jobId);
    }

    async downloadStructure(jobId) {
        try {
            const job = await this.apiClient.getGranulationJob(jobId);
            if (job && job.structure) {
                const blob = new Blob([JSON.stringify(job.structure, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `granulation-${jobId}-${job.structure_type}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('❌ Error downloading structure:', error);
            window.uiUtils.showToast('Failed to download structure', 'error');
        }
    }

    async retryJob(jobId) {
        try {
            const response = await this.apiClient.retryGranulation(jobId);
            if (response.success) {
                window.uiUtils.showToast('Granulation retry initiated', 'success');
                await this.refresh();
            }
        } catch (error) {
            console.error('❌ Error retrying job:', error);
            window.uiUtils.showToast('Failed to retry granulation', 'error');
        }
    }

    filterJobs(filter) {
        this.currentFilter = filter;
        
        // Update filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Re-render jobs
        const contentElement = document.getElementById('granulation-content');
        if (contentElement) {
            contentElement.innerHTML = this.renderJobs();
        }
    }

    getFilteredJobs() {
        if (this.currentFilter === 'all') {
            return this.jobs;
        }
        
        return this.jobs.filter(job => job.status === this.currentFilter);
    }

    handleSort(field) {
        if (this.currentSort === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort = field;
            this.sortDirection = 'desc';
        }
        
        this.jobs.sort((a, b) => {
            let aVal = a[field];
            let bVal = b[field];
            
            if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
        
        // Re-render
        const contentElement = document.getElementById('granulation-content');
        if (contentElement) {
            contentElement.innerHTML = this.renderJobs();
        }
    }

    getSortIcon(field) {
        if (this.currentSort !== field) return '↕️';
        return this.sortDirection === 'asc' ? '↑' : '↓';
    }

    toggleRowExpansion(jobId) {
        if (this.expandedRows.has(jobId)) {
            this.expandedRows.delete(jobId);
        } else {
            this.expandedRows.add(jobId);
        }
        
        // Re-render
        const contentElement = document.getElementById('granulation-content');
        if (contentElement) {
            contentElement.innerHTML = this.renderJobs();
        }
    }

    getStatusClass(status) {
        const statusClasses = {
            'processing': 'status-info',
            'validating': 'status-warning',
            'completed': 'status-success',
            'failed': 'status-error',
            'retry': 'status-warning'
        };
        return statusClasses[status] || 'status-default';
    }

    getQualityClass(score) {
        if (!score) return 'quality-unknown';
        if (score >= 0.9) return 'quality-excellent';
        if (score >= 0.8) return 'quality-good';
        if (score >= 0.7) return 'quality-fair';
        return 'quality-poor';
    }

    getStructureTypeIcon(type) {
        const icons = {
            'course': '📚',
            'quiz': '📝',
            'novel': '📖',
            'workflow': '🔄',
            'knowledge_map': '🗺️',
            'learning_path': '🎯'
        };
        return icons[type] || '📄';
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async refresh() {
        await this.loadJobs();
        await this.loadTemplates();
        await this.loadStats();
        this.renderSummary();
        this.renderContent();
    }

    /**
     * Switch between main tabs
     */
    switchTab(tab) {
        this.activeTab = tab;
        // Re-render the entire page to update tab buttons
        const container = document.querySelector('.granulation-page').parentElement;
        container.innerHTML = this.render();
        this.renderSummary();
        this.renderContent();
    }

    /**
     * Render content based on active tab
     */
    renderContent() {
        const contentElement = document.getElementById('granulation-content');
        if (!contentElement) return;

        switch (this.activeTab) {
            case 'jobs':
                contentElement.innerHTML = this.renderJobs();
                break;
            case 'templates':
                contentElement.innerHTML = this.renderTemplates();
                break;
            case 'deliverables':
                contentElement.innerHTML = this.renderDeliverables();
                break;
            case 'template-details':
                contentElement.innerHTML = this.renderTemplateDetails();
                break;
            case 'template-test':
                contentElement.innerHTML = this.renderTemplateTest();
                break;
            case 'template-edit':
                contentElement.innerHTML = this.renderTemplateEdit();
                break;
            case 'structure-view':
                contentElement.innerHTML = this.renderStructureView();
                break;
            case 'create-job':
                contentElement.innerHTML = this.renderCreateJob();
                break;
        }
    }

    /**
     * Render templates tab content
     */
    renderTemplates() {
        if (this.templates.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <h3>No Templates Found</h3>
                    <p>Templates define the structure and format for content granulation.</p>
                </div>
            `;
        }

        return `
            <div class="templates-grid">
                ${this.templates.map(template => this.renderTemplateCard(template)).join('')}
            </div>
        `;
    }

    /**
     * Render single template card
     */
    renderTemplateCard(template) {
        const typeIcon = this.getStructureTypeIcon(template.structureType);
        const complexityStars = '⭐'.repeat(template.complexityLevel || 1);

        return `
            <div class="template-card" data-template="${template.templateName}">
                <div class="template-header">
                    <div class="template-icon">${typeIcon}</div>
                    <div class="template-title">
                        <h3>${this.escapeHtml(template.templateName)}</h3>
                        <span class="template-type">${template.structureType}</span>
                    </div>
                </div>
                <div class="template-body">
                    <p class="template-description">${template.description || 'No description available'}</p>
                    <div class="template-meta">
                        <div class="meta-item">
                            <span class="meta-label">Complexity:</span>
                            <span class="meta-value">${complexityStars}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Usage:</span>
                            <span class="meta-value">${template.usageCount || 0} times</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Audience:</span>
                            <span class="meta-value">${template.targetAudience || 'General'}</span>
                        </div>
                    </div>
                </div>
                <div class="template-actions">
                    <button class="btn btn-sm" onclick="granulationPage.showTemplateDetails('${template.templateName}')" title="View Details">
                        👁️ Details
                    </button>
                    <button class="btn btn-sm" onclick="granulationPage.testTemplate('${template.templateName}')" title="Test Template">
                        🧪 Test
                    </button>
                    ${this.apiClient.isAdmin() ? `
                        <button class="btn btn-sm" onclick="granulationPage.editTemplate('${template.templateName}')" title="Edit Template">
                            ✏️ Edit
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Render deliverables tab content
     */
    renderDeliverables() {
        const completedJobs = this.jobs.filter(job => job.status === 'completed');

        if (completedJobs.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">📦</div>
                    <h3>No Deliverables Yet</h3>
                    <p>Completed granulation jobs will appear here with their generated structures.</p>
                </div>
            `;
        }

        return `
            <div class="deliverables-list">
                ${completedJobs.map(job => this.renderDeliverableCard(job)).join('')}
            </div>
        `;
    }

    /**
     * Render single deliverable card
     */
    renderDeliverableCard(job) {
        const typeIcon = this.getStructureTypeIcon(job.structure_type);
        const qualityClass = this.getQualityClass(job.quality_score);

        return `
            <div class="deliverable-card" data-job-id="${job.id}">
                <div class="deliverable-header">
                    <div class="deliverable-icon">${typeIcon}</div>
                    <div class="deliverable-info">
                        <h3>${this.escapeHtml(job.topic)}</h3>
                        <div class="deliverable-meta">
                            <span class="badge badge-${job.structure_type}">${job.structure_type}</span>
                            <span class="quality-badge ${qualityClass}">Quality: ${(job.quality_score * 100).toFixed(0)}%</span>
                            <span class="date-badge">Created: ${this.formatDate(job.completed_at)}</span>
                        </div>
                    </div>
                </div>
                <div class="deliverable-stats">
                    <div class="stat-item">
                        <span class="stat-label">Elements:</span>
                        <span class="stat-value">${job.actual_elements || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Processing:</span>
                        <span class="stat-value">${(job.processing_time_ms / 1000).toFixed(1)}s</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Cost:</span>
                        <span class="stat-value">$${job.cost_usd.toFixed(4)}</span>
                    </div>
                </div>
                <div class="deliverable-actions">
                    <button class="btn btn-sm btn-primary" onclick="granulationPage.viewStructure(${job.id})">
                        📄 View Structure
                    </button>
                    <button class="btn btn-sm" onclick="granulationPage.downloadStructure(${job.id})">
                        📥 Download
                    </button>
                    <button class="btn btn-sm" onclick="granulationPage.useAsTemplate(${job.id})">
                        🔄 Use as Template
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Show template details inline
     */
    async showTemplateDetails(templateName) {
        try {
            const template = await this.apiClient.getGranulationTemplate(templateName);
            this.selectedTemplate = template;
            this.activeTab = 'template-details';
            this.renderContent();
        } catch (error) {
            console.error('❌ Error loading template details:', error);
            window.uiUtils.showToast('Failed to load template details', 'error');
        }
    }

    /**
     * Test template with sample data
     */
    async testTemplate(templateName) {
        this.selectedTemplate = { templateName };
        this.activeTab = 'template-test';
        this.renderContent();
    }

    /**
     * Edit template (admin only)
     */
    async editTemplate(templateName) {
        try {
            const template = await this.apiClient.getGranulationTemplate(templateName);
            this.selectedTemplate = template;
            this.activeTab = 'template-edit';
            this.renderContent();
        } catch (error) {
            console.error('❌ Error editing template:', error);
            window.uiUtils.showToast('Failed to load template for editing', 'error');
        }
    }

    /**
     * View structure details
     */
    async viewStructure(jobId) {
        try {
            const job = this.jobs.find(j => j.id === jobId);
            const structure = await this.apiClient.getGranulationStructure(jobId);
            this.selectedJob = { ...job, structure };
            this.activeTab = 'structure-view';
            this.renderContent();
        } catch (error) {
            console.error('❌ Error loading structure:', error);
            window.uiUtils.showToast('Failed to load structure', 'error');
        }
    }

    /**
     * Use completed job as template
     */
    async useAsTemplate(jobId) {
        const job = this.jobs.find(j => j.id === jobId);
        if (!job) return;
        
        this.prefillData = {
            structureType: job.structure_type,
            templateName: job.template_name,
            granularityLevel: job.granularity_level,
            targetAudience: job.target_audience
        };
        this.activeTab = 'create-job';
        this.renderContent();
    }

    /**
     * Show create granulation form
     */
    async showCreateGranulation() {
        this.activeTab = 'create-job';
        this.prefillData = null;
        this.renderContent();
    }

    /**
     * Render template details view
     */
    renderTemplateDetails() {
        if (!this.selectedTemplate) {
            return this.renderEmptyState();
        }

        const template = this.selectedTemplate;
        const typeIcon = this.getStructureTypeIcon(template.structureType);

        return `
            <div class="detail-view">
                <div class="detail-header">
                    <button class="btn btn-sm" onclick="granulationPage.switchTab('templates')">
                        ← Back to Templates
                    </button>
                    <h2>${typeIcon} ${this.escapeHtml(template.templateName)}</h2>
                </div>

                <div class="detail-sections">
                    <div class="detail-section">
                        <h3>Template Information</h3>
                        <table class="detail-table">
                            <tr>
                                <td class="label">Template Name:</td>
                                <td>${template.templateName}</td>
                            </tr>
                            <tr>
                                <td class="label">Structure Type:</td>
                                <td><span class="badge badge-${template.structureType}">${template.structureType}</span></td>
                            </tr>
                            <tr>
                                <td class="label">Complexity Level:</td>
                                <td>${'⭐'.repeat(template.complexityLevel || 1)} (Level ${template.complexityLevel})</td>
                            </tr>
                            <tr>
                                <td class="label">Target Audience:</td>
                                <td>${template.targetAudience || 'General'}</td>
                            </tr>
                            <tr>
                                <td class="label">Usage Count:</td>
                                <td>${template.usageCount || 0} times</td>
                            </tr>
                            <tr>
                                <td class="label">Created:</td>
                                <td>${this.formatDate(template.createdAt)}</td>
                            </tr>
                        </table>
                    </div>

                    <div class="detail-section">
                        <h3>AI Prompt Template</h3>
                        <div class="code-block">
                            <pre>${this.escapeHtml(template.aiPromptTemplate || 'No prompt template defined')}</pre>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h3>Template Schema</h3>
                        <div class="code-block">
                            <pre>${JSON.stringify(template.templateSchema, null, 2)}</pre>
                        </div>
                    </div>

                    ${template.validationRules ? `
                        <div class="detail-section">
                            <h3>Validation Rules</h3>
                            <div class="code-block">
                                <pre>${JSON.stringify(template.validationRules, null, 2)}</pre>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Render template test view
     */
    renderTemplateTest() {
        return `
            <div class="detail-view">
                <div class="detail-header">
                    <button class="btn btn-sm" onclick="granulationPage.switchTab('templates')">
                        ← Back to Templates
                    </button>
                    <h2>🧪 Test Template${this.selectedTemplate ? ': ' + this.selectedTemplate.templateName : ''}</h2>
                </div>

                <div class="test-container">
                    <form id="template-test-form" onsubmit="event.preventDefault(); granulationPage.runTemplateTest();">
                        <div class="form-section">
                            <h3>Select Template</h3>
                            <div class="form-group">
                                <label for="test-template">Template *</label>
                                <select id="test-template" name="templateName" required onchange="granulationPage.updateTestForm(this.value)">
                                    <option value="">Select a template...</option>
                                    ${this.templates.map(t => `
                                        <option value="${t.templateName}" ${this.selectedTemplate?.templateName === t.templateName ? 'selected' : ''}>
                                            ${this.getStructureTypeIcon(t.structureType)} ${t.templateName}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>

                        <div class="form-section">
                            <h3>Test Parameters</h3>
                            <div class="form-group">
                                <label for="test-topic">Topic *</label>
                                <input type="text" id="test-topic" name="topic" required 
                                       placeholder="e.g., Introduction to Machine Learning">
                            </div>
                            
                            <div class="form-group">
                                <label for="test-granularity">Granularity Level</label>
                                <select id="test-granularity" name="granularityLevel">
                                    <option value="1">1 - Basic</option>
                                    <option value="2">2 - Standard</option>
                                    <option value="3" selected>3 - Detailed</option>
                                    <option value="4">4 - Comprehensive</option>
                                    <option value="5">5 - Exhaustive</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="test-audience">Target Audience</label>
                                <input type="text" id="test-audience" name="targetAudience" 
                                       placeholder="e.g., beginners, professionals">
                            </div>
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                🚀 Run Test
                            </button>
                        </div>
                    </form>

                    <div id="test-results" class="test-results" style="display: none;">
                        <!-- Test results will be displayed here -->
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render template edit view (admin only)
     */
    renderTemplateEdit() {
        if (!this.selectedTemplate) {
            return this.renderEmptyState();
        }

        const template = this.selectedTemplate;

        return `
            <div class="detail-view">
                <div class="detail-header">
                    <button class="btn btn-sm" onclick="granulationPage.switchTab('templates')">
                        ← Back to Templates
                    </button>
                    <h2>✏️ Edit Template: ${this.escapeHtml(template.templateName)}</h2>
                </div>

                <form id="template-edit-form" onsubmit="event.preventDefault(); granulationPage.saveTemplateChanges();">
                    <div class="form-section">
                        <h3>Basic Information</h3>
                        <div class="form-group">
                            <label for="edit-complexity">Complexity Level</label>
                            <select id="edit-complexity" name="complexityLevel">
                                ${[1,2,3,4,5].map(level => `
                                    <option value="${level}" ${template.complexityLevel === level ? 'selected' : ''}>
                                        ${level} - ${'⭐'.repeat(level)}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-audience">Target Audience</label>
                            <input type="text" id="edit-audience" name="targetAudience" 
                                   value="${template.targetAudience || ''}"
                                   placeholder="e.g., beginners, professionals">
                        </div>
                    </div>

                    <div class="form-section">
                        <h3>AI Prompt Template</h3>
                        <div class="form-group">
                            <label for="edit-prompt">Prompt Template</label>
                            <textarea id="edit-prompt" name="aiPromptTemplate" rows="10" class="code-textarea">${template.aiPromptTemplate || ''}</textarea>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3>Validation Rules (JSON)</h3>
                        <div class="form-group">
                            <label for="edit-validation">Validation Rules</label>
                            <textarea id="edit-validation" name="validationRules" rows="6" class="code-textarea">${JSON.stringify(template.validationRules || {}, null, 2)}</textarea>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="granulationPage.switchTab('templates')">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary">
                            💾 Save Changes
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    /**
     * Render structure view
     */
    renderStructureView() {
        if (!this.selectedJob || !this.selectedJob.structure) {
            return this.renderEmptyState();
        }

        const job = this.selectedJob;
        const structure = job.structure;
        const typeIcon = this.getStructureTypeIcon(job.structure_type);

        return `
            <div class="detail-view">
                <div class="detail-header">
                    <button class="btn btn-sm" onclick="granulationPage.switchTab('deliverables')">
                        ← Back to Deliverables
                    </button>
                    <h2>${typeIcon} ${this.escapeHtml(job.topic)}</h2>
                </div>

                <div class="structure-info">
                    <div class="info-cards">
                        <div class="info-card">
                            <span class="info-label">Job ID:</span>
                            <span class="info-value">#${job.id}</span>
                        </div>
                        <div class="info-card">
                            <span class="info-label">Quality Score:</span>
                            <span class="info-value">${(job.quality_score * 100).toFixed(0)}%</span>
                        </div>
                        <div class="info-card">
                            <span class="info-label">Elements:</span>
                            <span class="info-value">${job.actual_elements}</span>
                        </div>
                        <div class="info-card">
                            <span class="info-label">Processing Time:</span>
                            <span class="info-value">${(job.processing_time_ms / 1000).toFixed(1)}s</span>
                        </div>
                    </div>
                </div>

                <div class="structure-content">
                    <h3>Generated Structure</h3>
                    <div class="structure-tree">
                        ${this.renderStructureTree(structure, job.structure_type)}
                    </div>
                    
                    <h3>Raw JSON</h3>
                    <div class="code-block">
                        <pre>${JSON.stringify(structure, null, 2)}</pre>
                    </div>
                </div>

                <div class="structure-actions">
                    <button class="btn btn-primary" onclick="granulationPage.downloadStructure(${job.id})">
                        📥 Download JSON
                    </button>
                    <button class="btn btn-secondary" onclick="granulationPage.useAsTemplate(${job.id})">
                        🔄 Use as Template
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render structure tree based on type
     */
    renderStructureTree(structure, type) {
        switch (type) {
            case 'course':
                return this.renderCourseStructure(structure);
            case 'quiz':
                return this.renderQuizStructure(structure);
            default:
                return `<div class="tree-node">Structure visualization not available for type: ${type}</div>`;
        }
    }

    /**
     * Render course structure tree
     */
    renderCourseStructure(structure) {
        return `
            <div class="tree-node">
                <div class="node-header">📚 ${structure.courseOverview?.title || 'Course'}</div>
                <div class="node-content">
                    <p>${structure.courseOverview?.description || ''}</p>
                    <div class="node-meta">
                        <span>Duration: ${structure.courseOverview?.duration || 'N/A'}</span>
                        <span>Target: ${structure.courseOverview?.targetAudience || 'General'}</span>
                    </div>
                </div>
                <div class="tree-children">
                    ${(structure.modules || []).map((module, idx) => `
                        <div class="tree-node">
                            <div class="node-header">📖 Module ${idx + 1}: ${module.title}</div>
                            <div class="node-content">
                                <p>Duration: ${module.estimatedDuration || 'N/A'}</p>
                                <div class="tree-children">
                                    ${(module.lessons || []).map((lesson, lidx) => `
                                        <div class="tree-node leaf">
                                            <div class="node-header">📄 Lesson ${lidx + 1}: ${lesson.title}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render quiz structure tree
     */
    renderQuizStructure(structure) {
        return `
            <div class="tree-node">
                <div class="node-header">📝 ${structure.quizOverview?.title || 'Quiz'}</div>
                <div class="node-content">
                    <p>${structure.quizOverview?.description || ''}</p>
                    <div class="node-meta">
                        <span>Questions: ${structure.quizOverview?.totalQuestions || 0}</span>
                        <span>Time: ${structure.quizOverview?.estimatedTime || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render create job form
     */
    renderCreateJob() {
        const prefill = this.prefillData || {};

        return `
            <div class="detail-view">
                <div class="detail-header">
                    <button class="btn btn-sm" onclick="granulationPage.switchTab('jobs')">
                        ← Back to Jobs
                    </button>
                    <h2>➕ Create New Granulation Job</h2>
                </div>

                <form id="create-job-form" onsubmit="event.preventDefault(); granulationPage.submitJob();">
                    <div class="form-section">
                        <h3>Basic Information</h3>
                        <div class="form-group">
                            <label for="job-topic">Topic *</label>
                            <input type="text" id="job-topic" name="topic" required 
                                   placeholder="e.g., Introduction to Machine Learning">
                        </div>
                        
                        <div class="form-group">
                            <label for="job-structure-type">Structure Type *</label>
                            <select id="job-structure-type" name="structureType" required onchange="granulationPage.updateTemplateOptions(this.value)">
                                <option value="">Select a structure type...</option>
                                ${['course', 'quiz', 'novel', 'workflow', 'knowledge_map', 'learning_path'].map(type => `
                                    <option value="${type}" ${prefill.structureType === type ? 'selected' : ''}>
                                        ${this.getStructureTypeIcon(type)} ${type}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="job-template">Template *</label>
                            <select id="job-template" name="templateName" required>
                                <option value="">Select structure type first...</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3>Configuration</h3>
                        <div class="form-group">
                            <label for="job-granularity">Granularity Level</label>
                            <select id="job-granularity" name="granularityLevel">
                                ${[1,2,3,4,5].map(level => `
                                    <option value="${level}" ${prefill.granularityLevel === level ? 'selected' : level === 3 ? 'selected' : ''}>
                                        ${level} - ${'🔸'.repeat(level)}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="job-audience">Target Audience</label>
                            <input type="text" id="job-audience" name="targetAudience" 
                                   value="${prefill.targetAudience || ''}"
                                   placeholder="e.g., beginners, professionals">
                        </div>
                    </div>

                    <div class="form-section">
                        <h3>Validation Settings</h3>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="job-validation" name="validationEnabled" checked>
                                Enable AI Validation
                            </label>
                        </div>
                        
                        <div class="validation-options" id="validation-options">
                            <div class="form-group">
                                <label for="job-validation-level">Validation Level</label>
                                <select id="job-validation-level" name="validationLevel">
                                    <option value="1">Level 1 - Quick</option>
                                    <option value="2" selected>Level 2 - Balanced</option>
                                    <option value="3">Level 3 - Thorough</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="job-validation-threshold">Accuracy Threshold (%)</label>
                                <input type="number" id="job-validation-threshold" name="validationThreshold" 
                                       min="0" max="100" value="85">
                            </div>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="granulationPage.switchTab('jobs')">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary">
                            🚀 Create Granulation Job
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    /**
     * Update template options based on structure type
     */
    updateTemplateOptions(structureType) {
        const templateSelect = document.getElementById('job-template');
        const filteredTemplates = this.templates.filter(t => t.structureType === structureType);
        
        templateSelect.innerHTML = filteredTemplates.length > 0
            ? `<option value="">Select a template...</option>` + 
              filteredTemplates.map(t => `<option value="${t.templateName}">${t.templateName}</option>`).join('')
            : '<option value="">No templates available for this type</option>';

        // Select prefilled template if available
        if (this.prefillData && this.prefillData.templateName) {
            templateSelect.value = this.prefillData.templateName;
        }
    }

    /**
     * Submit new granulation job
     */
    async submitJob() {
        const form = document.getElementById('create-job-form');
        const formData = new FormData(form);
        
        const data = {
            topic: formData.get('topic'),
            structureType: formData.get('structureType'),
            templateName: formData.get('templateName'),
            granularityLevel: parseInt(formData.get('granularityLevel')),
            targetAudience: formData.get('targetAudience') || 'general audience',
            validation: {
                enabled: formData.get('validationEnabled') === 'on',
                level: parseInt(formData.get('validationLevel')),
                threshold: parseFloat(formData.get('validationThreshold'))
            }
        };

        try {
            const response = await this.apiClient.createGranulation(data);
            if (response.jobId) {
                window.uiUtils.showToast('Granulation job created successfully!', 'success');
                this.switchTab('jobs');
                await this.refresh();
            }
        } catch (error) {
            console.error('❌ Error creating job:', error);
            window.uiUtils.showToast(error.message || 'Failed to create granulation job', 'error');
        }
    }

    /**
     * Run template test
     */
    async runTemplateTest() {
        const form = document.getElementById('template-test-form');
        const formData = new FormData(form);
        
        const testData = {
            topic: formData.get('topic'),
            granularityLevel: parseInt(formData.get('granularityLevel')),
            targetAudience: formData.get('targetAudience') || 'general audience'
        };

        const resultsDiv = document.getElementById('test-results');
        resultsDiv.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Running template test...</p></div>';
        resultsDiv.style.display = 'block';

        try {
            const response = await this.apiClient.testGranulationTemplate(formData.get('templateName'), testData);
            resultsDiv.innerHTML = `
                <h3>Test Results</h3>
                <div class="test-result-info">
                    <div class="result-card ${response.success ? 'success' : 'error'}">
                        <span class="result-label">Status:</span>
                        <span class="result-value">${response.success ? '✅ Success' : '❌ Failed'}</span>
                    </div>
                    ${response.processingTimeMs ? `
                        <div class="result-card">
                            <span class="result-label">Processing Time:</span>
                            <span class="result-value">${(response.processingTimeMs / 1000).toFixed(2)}s</span>
                        </div>
                    ` : ''}
                    ${response.tokensUsed ? `
                        <div class="result-card">
                            <span class="result-label">Tokens Used:</span>
                            <span class="result-value">${response.tokensUsed}</span>
                        </div>
                    ` : ''}
                </div>
                ${response.structure ? `
                    <h4>Generated Structure Preview</h4>
                    <div class="code-block">
                        <pre>${JSON.stringify(response.structure, null, 2)}</pre>
                    </div>
                ` : ''}
                ${response.error ? `
                    <div class="error-message">
                        <h4>Error Details</h4>
                        <p>${response.error}</p>
                    </div>
                ` : ''}
            `;
        } catch (error) {
            console.error('❌ Error running test:', error);
            resultsDiv.innerHTML = `
                <div class="error-message">
                    <h3>Test Failed</h3>
                    <p>${error.message || 'Failed to run template test'}</p>
                </div>
            `;
        }
    }

    /**
     * Save template changes
     */
    async saveTemplateChanges() {
        const form = document.getElementById('template-edit-form');
        const formData = new FormData(form);
        
        const updates = {
            complexityLevel: parseInt(formData.get('complexityLevel')),
            targetAudience: formData.get('targetAudience'),
            aiPromptTemplate: formData.get('aiPromptTemplate')
        };

        // Parse validation rules if provided
        const validationRulesStr = formData.get('validationRules');
        if (validationRulesStr) {
            try {
                updates.validationRules = JSON.parse(validationRulesStr);
            } catch (error) {
                window.uiUtils.showToast('Invalid JSON in validation rules', 'error');
                return;
            }
        }

        try {
            const response = await this.apiClient.updateGranulationTemplate(this.selectedTemplate.templateName, updates);
            if (response.success) {
                window.uiUtils.showToast('Template updated successfully!', 'success');
                this.switchTab('templates');
                await this.refresh();
            }
        } catch (error) {
            console.error('❌ Error saving template:', error);
            window.uiUtils.showToast(error.message || 'Failed to save template changes', 'error');
        }
    }

    unmount() {
        console.log('🧱 Unmounting Granulation Page');
        this.expandedRows.clear();
        this.selectedTemplate = null;
        this.selectedJob = null;
        this.prefillData = null;
    }
}

// Register the page
window.granulationPage = new GranulationPage();