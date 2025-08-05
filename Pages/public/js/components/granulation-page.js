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
        
        // Bind methods
        this.handleSort = this.handleSort.bind(this);
        this.toggleRowExpansion = this.toggleRowExpansion.bind(this);
        this.filterJobs = this.filterJobs.bind(this);
        this.refresh = this.refresh.bind(this);
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
                        <button class="btn btn-primary" onclick="granulationPage.showCreateGranulation()">
                            ➕ New Granulation
                        </button>
                    </div>
                </div>

                <!-- Summary Cards -->
                <div class="granulation-summary" id="granulation-summary">
                    <!-- Summary cards will be rendered here -->
                </div>

                <!-- Filter Tabs -->
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

                <!-- Jobs Content -->
                <div class="granulation-content" id="granulation-content">
                    <!-- Jobs will be rendered here -->
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
        
        console.log('✅ Granulation Page mounted');
    }

    async loadJobs() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        console.log('📡 Loading granulation jobs...');
        
        try {
            // Show loading state
            const contentElement = document.getElementById('granulation-content');
            if (contentElement) {
                contentElement.innerHTML = this.renderLoadingState();
            }
            
            // For now, we'll simulate loading jobs
            // In production, this would call the granulator API
            this.jobs = [];
            
            // Render jobs
            if (contentElement) {
                contentElement.innerHTML = this.renderJobs();
            }
        } catch (error) {
            console.error('❌ Error loading jobs:', error);
            window.uiUtils.showToast('Failed to load granulation jobs', 'error');
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
        await this.loadStats();
        this.renderSummary();
    }

    unmount() {
        console.log('🧱 Unmounting Granulation Page');
        this.expandedRows.clear();
    }
}

/**
 * Granulation Modal for creating new jobs
 */
class GranulationModal {
    constructor(templates) {
        this.templates = templates || [];
    }

    async show() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = this.render();
            
            document.body.appendChild(modal);
            
            // Set up event handlers
            modal.querySelector('.modal-close').onclick = () => {
                document.body.removeChild(modal);
                resolve(null);
            };
            
            modal.querySelector('.cancel-btn').onclick = () => {
                document.body.removeChild(modal);
                resolve(null);
            };
            
            modal.querySelector('#granulation-form').onsubmit = async (e) => {
                e.preventDefault();
                const formData = this.getFormData();
                document.body.removeChild(modal);
                resolve(formData);
            };
            
            // Update template info on selection
            modal.querySelector('#structure-type').onchange = (e) => {
                this.updateTemplateOptions(e.target.value);
            };
        });
    }

    render() {
        return `
            <div class="modal">
                <div class="modal-header">
                    <h2>Create New Granulation</h2>
                    <button class="modal-close">✕</button>
                </div>
                
                <form id="granulation-form" class="modal-form">
                    <div class="form-group">
                        <label for="topic">Topic *</label>
                        <input type="text" id="topic" name="topic" required 
                               placeholder="e.g., Introduction to Machine Learning">
                    </div>
                    
                    <div class="form-group">
                        <label for="structure-type">Structure Type *</label>
                        <select id="structure-type" name="structureType" required>
                            <option value="">Select a structure type...</option>
                            <option value="course">📚 Course</option>
                            <option value="quiz">📝 Quiz</option>
                            <option value="novel">📖 Novel</option>
                            <option value="workflow">🔄 Workflow</option>
                            <option value="knowledge_map">🗺️ Knowledge Map</option>
                            <option value="learning_path">🎯 Learning Path</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="template-name">Template *</label>
                        <select id="template-name" name="templateName" required>
                            <option value="">Select structure type first...</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="granularity-level">Granularity Level</label>
                        <select id="granularity-level" name="granularityLevel">
                            <option value="1">1 - Basic</option>
                            <option value="2">2 - Standard</option>
                            <option value="3" selected>3 - Detailed</option>
                            <option value="4">4 - Comprehensive</option>
                            <option value="5">5 - Exhaustive</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="target-audience">Target Audience</label>
                        <input type="text" id="target-audience" name="targetAudience" 
                               placeholder="e.g., beginners, professionals">
                    </div>
                    
                    <div class="form-section">
                        <h3>Validation Settings</h3>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="validation-enabled" name="validationEnabled" checked>
                                Enable AI Validation
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label for="validation-level">Validation Level</label>
                            <select id="validation-level" name="validationLevel">
                                <option value="1">Level 1 - Quick</option>
                                <option value="2" selected>Level 2 - Balanced</option>
                                <option value="3">Level 3 - Thorough</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="validation-threshold">Accuracy Threshold (%)</label>
                            <input type="number" id="validation-threshold" name="validationThreshold" 
                                   min="0" max="100" value="85">
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary cancel-btn">Cancel</button>
                        <button type="submit" class="btn btn-primary">Create Granulation</button>
                    </div>
                </form>
            </div>
        `;
    }

    updateTemplateOptions(structureType) {
        const templateSelect = document.getElementById('template-name');
        const filteredTemplates = this.templates.filter(t => t.structureType === structureType);
        
        templateSelect.innerHTML = filteredTemplates.length > 0
            ? filteredTemplates.map(t => `<option value="${t.name}">${t.name} - ${t.description}</option>`).join('')
            : '<option value="">No templates available for this type</option>';
    }

    getFormData() {
        const form = document.getElementById('granulation-form');
        const formData = new FormData(form);
        
        return {
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
    }
}

// Register the page
window.granulationPage = new GranulationPage();