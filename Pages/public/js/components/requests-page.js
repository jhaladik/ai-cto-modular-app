/**
 * Requests Page Component
 * Manages client requests, communications, and template executions
 */
class RequestsPage {
    constructor(apiClient) {
        this.apiClient = apiClient || window.apiClient;
        this.requests = [];
        this.templates = [];
        this.currentFilter = 'all';
        this.currentSort = 'created_at';
        this.sortDirection = 'desc';
        this.expandedRows = new Set();
        this.isLoading = false;
        
        // Bind methods
        this.handleSort = this.handleSort.bind(this);
        this.toggleRowExpansion = this.toggleRowExpansion.bind(this);
        this.filterRequests = this.filterRequests.bind(this);
        this.refresh = this.refresh.bind(this);
    }

    render() {
        return `
            <div class="admin-page requests-page">
                <!-- Page Header -->
                <div class="page-header">
                    <h1 class="page-title">📋 Request Management</h1>
                    <div class="page-actions">
                        <button class="btn btn-secondary" onclick="requestsPage.refresh()">
                            🔄 Refresh
                        </button>
                        <button class="btn btn-primary" onclick="requestsPage.showCreateRequest()">
                            ➕ New Request
                        </button>
                    </div>
                </div>

                <!-- Summary Cards -->
                <div class="requests-summary" id="requests-summary">
                    <!-- Summary cards will be rendered here -->
                </div>

                <!-- Filter Tabs -->
                <div class="request-filters">
                    <button class="filter-tab ${this.currentFilter === 'all' ? 'active' : ''}" 
                            onclick="requestsPage.filterRequests('all')">
                        All Requests
                    </button>
                    <button class="filter-tab ${this.currentFilter === 'pending' ? 'active' : ''}" 
                            onclick="requestsPage.filterRequests('pending')">
                        Pending
                    </button>
                    <button class="filter-tab ${this.currentFilter === 'processing' ? 'active' : ''}" 
                            onclick="requestsPage.filterRequests('processing')">
                        Processing
                    </button>
                    <button class="filter-tab ${this.currentFilter === 'completed' ? 'active' : ''}" 
                            onclick="requestsPage.filterRequests('completed')">
                        Completed
                    </button>
                    <button class="filter-tab ${this.currentFilter === 'failed' ? 'active' : ''}" 
                            onclick="requestsPage.filterRequests('failed')">
                        Failed
                    </button>
                </div>

                <!-- Requests Content -->
                <div class="requests-content" id="requests-content">
                    <!-- Requests will be rendered here -->
                </div>
            </div>
        `;
    }

    async mount() {
        console.log('📋 Mounting Requests Page...');
        
        // Load initial data
        await Promise.all([
            this.loadRequests(),
            this.loadTemplates()
        ]);
        
        // Render summary
        this.renderSummary();
        
        console.log('✅ Requests Page mounted');
    }

    async loadRequests() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        console.log('📡 Loading requests...');
        
        try {
            // Show loading state
            const contentElement = document.getElementById('requests-content');
            if (contentElement) {
                contentElement.innerHTML = this.renderLoadingState();
            }
            
            // Use real API
            const result = await this.apiClient.kamRequest('/requests', 'GET');
            
            if (result.success) {
                this.requests = result.requests || [];
                
                // Ensure all requests have required fields
                this.requests = this.requests.map(req => ({
                    ...req,
                    title: req.title || this.extractTitle(req.original_message || req.processed_request || ''),
                    urgency_level: req.urgency_override || req.urgency_level || 'medium',
                    communication_type: req.communication_type || 'manual'
                }));
            } else {
                console.error('❌ API returned error:', result);
                this.requests = [];
            }
            
            this.updateContent();
            console.log(`✅ Loaded ${this.requests.length} requests`);
            
        } catch (error) {
            console.error('❌ Failed to load requests:', error);
            this.showError('Failed to load requests. Please try again.');
        } finally {
            this.isLoading = false;
        }
    }

    extractTitle(message) {
        // Extract a title from the message (first line or first 50 chars)
        const firstLine = message.split('\n')[0];
        if (firstLine.length <= 50) return firstLine;
        return firstLine.substring(0, 47) + '...';
    }

    async loadTemplates() {
        try {
            // Use real API
            const result = await this.apiClient.kamRequest('/templates', 'GET');
            
            if (result.success) {
                this.templates = result.templates || [];
            } else {
                console.error('❌ Failed to load templates:', result);
                // Fallback to mock templates if API fails
                this.templates = this.getMockTemplates();
            }
            
            console.log(`✅ Loaded ${this.templates.length} templates`);
        } catch (error) {
            console.error('❌ Failed to load templates:', error);
            // Fallback to mock templates if error
            this.templates = this.getMockTemplates();
        }
    }

    filterRequests(filter) {
        this.currentFilter = filter;
        
        // Update active tab
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        event.target.classList.add('active');
        
        this.updateContent();
    }

    handleSort(field) {
        if (this.currentSort === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort = field;
            this.sortDirection = 'desc';
        }
        this.updateContent();
    }

    toggleRowExpansion(requestId) {
        if (this.expandedRows.has(requestId)) {
            this.expandedRows.delete(requestId);
        } else {
            this.expandedRows.add(requestId);
        }
        this.updateContent();
    }

    getFilteredRequests() {
        let filtered = [...this.requests];
        
        // Apply filter
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(r => r.request_status === this.currentFilter);
        }
        
        // Apply sorting
        filtered.sort((a, b) => {
            const aVal = a[this.currentSort];
            const bVal = b[this.currentSort];
            
            let comparison;
            if (typeof aVal === 'string') {
                comparison = aVal.localeCompare(bVal);
            } else if (aVal instanceof Date || !isNaN(Date.parse(aVal))) {
                comparison = new Date(aVal).getTime() - new Date(bVal).getTime();
            } else {
                comparison = aVal - bVal;
            }
            
            return this.sortDirection === 'asc' ? comparison : -comparison;
        });
        
        return filtered;
    }

    updateContent() {
        const contentElement = document.getElementById('requests-content');
        if (contentElement) {
            contentElement.innerHTML = this.renderRequestsTable();
        }
        this.renderSummary();
    }

    renderRequestsTable() {
        const requests = this.getFilteredRequests();
        
        if (requests.length === 0) {
            return `
                <div class="empty-state">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                    <h3>No Requests Found</h3>
                    <p>There are no requests matching your filter.</p>
                    <button class="btn btn-primary" onclick="requestsPage.showCreateRequest()">
                        ➕ Create First Request
                    </button>
                </div>
            `;
        }

        return `
            <div class="requests-table">
                ${requests.map(request => this.renderRequestRow(request)).join('')}
            </div>
        `;
    }

    renderRequestRow(request) {
        const isExpanded = this.expandedRows.has(request.request_id);
        const statusIcon = this.getStatusIcon(request.request_status);
        const typeIcon = this.getTypeIcon(request.request_type);
        
        return `
            <div class="request-row ${isExpanded ? 'expanded' : ''}">
                <div class="request-row-header" onclick="requestsPage.toggleRowExpansion('${request.request_id}')">
                    <div class="request-info">
                        <div class="request-main">
                            <span class="request-id">#${request.request_id.split('_')[1]}</span>
                            <h4 class="request-title">${request.title || 'Untitled Request'}</h4>
                            <span class="request-client">${request.client_name}</span>
                        </div>
                        <div class="request-meta">
                            <span class="type-badge">
                                ${typeIcon} ${this.formatType(request.request_type)}
                            </span>
                            <span class="status-badge status-${request.request_status}">
                                ${statusIcon} ${request.request_status}
                            </span>
                            ${request.urgency_level !== 'medium' ? `
                                <span class="urgency-badge urgency-${request.urgency_level}">
                                    ${request.urgency_level === 'critical' ? '🚨' : request.urgency_level === 'high' ? '⚡' : '🕐'} 
                                    ${request.urgency_level}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    <div class="request-template">
                        ${request.selected_template ? `
                            <div class="template-info">
                                <span class="template-name">${request.template_display_name || request.selected_template}</span>
                                <span class="template-confidence">${Math.round(request.template_confidence_score * 100)}% match</span>
                            </div>
                        ` : `
                            <button class="btn btn-small btn-primary" onclick="event.stopPropagation(); requestsPage.selectTemplate('${request.request_id}')">
                                Select Template
                            </button>
                        `}
                    </div>
                    <div class="request-timing">
                        <div class="timing-info">
                            <span class="created-at">${this.formatRelativeTime(request.created_at)}</span>
                            ${request.estimated_duration_ms ? `
                                <span class="duration">~${this.formatDuration(request.estimated_duration_ms)}</span>
                            ` : ''}
                        </div>
                    </div>
                    <span class="expand-icon">${isExpanded ? '▼' : '▶'}</span>
                </div>
                
                ${isExpanded ? this.renderExpandedContent(request) : ''}
            </div>
        `;
    }

    renderExpandedContent(request) {
        return `
            <div class="request-expanded-content">
                <div class="expanded-tabs">
                    <button class="tab-button active" onclick="requestsPage.switchTab('${request.request_id}', 'communication')">
                        💬 Communication
                    </button>
                    <button class="tab-button" onclick="requestsPage.switchTab('${request.request_id}', 'execution')">
                        ⚙️ Execution
                    </button>
                    <button class="tab-button" onclick="requestsPage.switchTab('${request.request_id}', 'deliverables')">
                        📦 Deliverables
                    </button>
                </div>
                
                <div class="tab-content" id="tab-content-${request.request_id}">
                    ${this.renderCommunicationTab(request)}
                </div>
            </div>
        `;
    }

    renderCommunicationTab(request) {
        return `
            <div class="communication-section">
                <div class="original-message">
                    <h5>Original Message</h5>
                    <div class="message-content">
                        <div class="message-header">
                            <span class="message-from">From: ${request.sender_email || 'Unknown'}</span>
                            <span class="message-type">${request.communication_type || 'email'}</span>
                            <span class="message-time">${this.formatDateTime(request.created_at)}</span>
                        </div>
                        <div class="message-body">
                            ${request.original_message || 'No message content available'}
                        </div>
                        ${request.sentiment_score !== undefined ? `
                            <div class="message-analysis">
                                <span>Sentiment: ${this.getSentimentEmoji(request.sentiment_score)} ${(request.sentiment_score * 100).toFixed(0)}%</span>
                                <span>Intent: ${request.intent_detected || 'unknown'}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                ${request.processed_request ? `
                    <div class="processed-request">
                        <h5>Processed Request</h5>
                        <div class="processed-content">
                            ${request.processed_request}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderExecutionTab(request) {
        return `
            <div class="execution-section">
                ${request.selected_template ? `
                    <div class="template-execution">
                        <h5>Template: ${request.template_display_name || request.selected_template}</h5>
                        <div class="execution-status">
                            <div class="status-line">
                                <span>Status:</span>
                                <span class="status-value status-${request.request_status}">${request.request_status}</span>
                            </div>
                            ${request.execution_id ? `
                                <div class="status-line">
                                    <span>Execution ID:</span>
                                    <span class="pipeline-id">${request.execution_id}</span>
                                </div>
                            ` : ''}
                            ${request.started_processing_at ? `
                                <div class="status-line">
                                    <span>Started:</span>
                                    <span>${this.formatDateTime(request.started_processing_at)}</span>
                                </div>
                            ` : ''}
                            ${request.completed_at ? `
                                <div class="status-line">
                                    <span>Completed:</span>
                                    <span>${this.formatDateTime(request.completed_at)}</span>
                                </div>
                            ` : ''}
                        </div>
                        
                        ${request.request_status === 'pending' ? `
                            <button class="btn btn-primary" onclick="requestsPage.executeTemplate('${request.request_id}')">
                                ▶️ Execute Template
                            </button>
                        ` : ''}
                        
                        ${request.worker_sessions && request.worker_sessions.length > 0 ? `
                            <div class="worker-sessions">
                                <h6>Worker Sessions</h6>
                                ${request.worker_sessions.map(session => `
                                    <div class="worker-session">
                                        <span class="worker-name">${session.worker_name}</span>
                                        <span class="worker-status ${session.worker_success ? 'success' : 'failed'}">
                                            ${session.worker_success ? '✅' : '❌'}
                                        </span>
                                        <span class="worker-time">${this.formatDuration(session.execution_time_ms)}</span>
                                        <span class="worker-cost">$${session.worker_cost_usd.toFixed(3)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                ` : `
                    <div class="no-template">
                        <p>No template selected for this request.</p>
                        <button class="btn btn-primary" onclick="requestsPage.selectTemplate('${request.request_id}')">
                            Select Template
                        </button>
                    </div>
                `}
            </div>
        `;
    }

    renderDeliverablesTab(request) {
        return `
            <div class="deliverables-section">
                ${request.deliverables && request.deliverables.length > 0 ? `
                    <div class="deliverables-list">
                        ${request.deliverables.map(deliverable => `
                            <div class="deliverable-item">
                                <div class="deliverable-header">
                                    <span class="deliverable-type">${this.getDeliverableIcon(deliverable.type)} ${deliverable.type}</span>
                                    <span class="deliverable-size">${this.formatFileSize(deliverable.size)}</span>
                                </div>
                                <div class="deliverable-name">${deliverable.name}</div>
                                <div class="deliverable-actions">
                                    <button class="btn btn-small" onclick="requestsPage.viewDeliverable('${deliverable.id}')">
                                        👁️ View
                                    </button>
                                    <button class="btn btn-small" onclick="requestsPage.downloadDeliverable('${deliverable.id}')">
                                        📥 Download
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="no-deliverables">
                        <p>No deliverables available yet.</p>
                        ${request.request_status === 'completed' ? `
                            <p>The request completed but produced no deliverables.</p>
                        ` : ''}
                    </div>
                `}
            </div>
        `;
    }

    switchTab(requestId, tab) {
        const request = this.requests.find(r => r.request_id === requestId);
        if (!request) return;
        
        // Update tab buttons
        const tabButtons = document.querySelectorAll(`#tab-content-${requestId}`).closest('.request-expanded-content').querySelectorAll('.tab-button');
        tabButtons.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        // Update content
        const contentElement = document.getElementById(`tab-content-${requestId}`);
        if (contentElement) {
            switch (tab) {
                case 'communication':
                    contentElement.innerHTML = this.renderCommunicationTab(request);
                    break;
                case 'execution':
                    contentElement.innerHTML = this.renderExecutionTab(request);
                    break;
                case 'deliverables':
                    contentElement.innerHTML = this.renderDeliverablesTab(request);
                    break;
            }
        }
    }

    renderSummary() {
        const summaryElement = document.getElementById('requests-summary');
        if (!summaryElement) return;
        
        const total = this.requests.length;
        const pending = this.requests.filter(r => r.request_status === 'pending').length;
        const processing = this.requests.filter(r => r.request_status === 'processing').length;
        const completed = this.requests.filter(r => r.request_status === 'completed').length;
        const failed = this.requests.filter(r => r.request_status === 'failed').length;
        const critical = this.requests.filter(r => r.urgency_level === 'critical').length;
        
        summaryElement.innerHTML = `
            <div class="summary-grid">
                <div class="summary-card">
                    <div class="summary-value">${total}</div>
                    <div class="summary-label">Total Requests</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value">${pending}</div>
                    <div class="summary-label">Pending</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value">${processing}</div>
                    <div class="summary-label">Processing</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value">${completed}</div>
                    <div class="summary-label">Completed</div>
                </div>
                ${critical > 0 ? `
                    <div class="summary-card critical">
                        <div class="summary-value">🚨 ${critical}</div>
                        <div class="summary-label">Critical</div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    async selectTemplate(requestId) {
        const request = this.requests.find(r => r.request_id === requestId);
        if (!request) return;
        
        window.SimpleModal.show({
            title: '🎯 Select Template',
            size: 'large',
            content: `
                <div class="template-selection">
                    <div class="request-context">
                        <h5>Request Summary</h5>
                        <p>${request.processed_request || request.original_message || 'No message available'}</p>
                    </div>
                    
                    <div class="template-list">
                        <h5>Available Templates</h5>
                        ${this.templates.map(template => `
                            <div class="template-option" onclick="requestsPage.previewTemplate('${template.template_name}')">
                                <div class="template-header">
                                    <h6>${template.display_name}</h6>
                                    <span class="template-category">${template.category}</span>
                                    ${template.allowed_tiers ? this.renderTierBadges(template.allowed_tiers) : ''}
                                </div>
                                <p class="template-description">${template.description}</p>
                                <div class="template-meta">
                                    <span>⏱️ ~${this.formatDuration(template.estimated_duration_ms)}</span>
                                    <span>💰 ~$${template.estimated_cost_usd.toFixed(2)}</span>
                                    <span>📊 ${template.complexity_level}</span>
                                </div>
                                <button class="btn btn-primary btn-small" 
                                        onclick="event.stopPropagation(); requestsPage.assignTemplate('${request.request_id}', '${template.template_name}')">
                                    Select This Template
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `,
            actions: [
                {
                    text: 'Cancel',
                    class: 'btn-secondary',
                    onclick: "document.querySelector('.modal-overlay').close()"
                }
            ]
        });
    }

    async assignTemplate(requestId, templateName) {
        console.log(`Assigning template ${templateName} to request ${requestId}`);
        
        // Close modal
        document.querySelector('.modal-overlay').close();
        
        try {
            // Call API to update request
            const result = await this.apiClient.kamRequest(`/requests/${requestId}`, 'PUT', {
                selected_template: templateName,
                template_confidence_score: 0.85 // Mock confidence for now
            });
            
            if (result.success) {
                // Update local request data
                const request = this.requests.find(r => r.request_id === requestId);
                const template = this.templates.find(t => t.template_name === templateName);
                
                if (request && template) {
                    request.selected_template = templateName;
                    request.template_display_name = template.display_name;
                    request.template_confidence_score = 0.85;
                    request.estimated_duration_ms = template.estimated_duration_ms;
                }
                
                // Update UI
                this.updateContent();
                
                // Show success message
                this.showSuccess('Template assigned successfully!');
            } else {
                console.error('Failed to assign template:', result);
                this.showError('Failed to assign template. Please try again.');
            }
        } catch (error) {
            console.error('Error assigning template:', error);
            this.showError('Failed to assign template. Please try again.');
        }
    }

    async executeTemplate(requestId) {
        const request = this.requests.find(r => r.request_id === requestId);
        if (!request || !request.selected_template) return;
        
        console.log(`Executing template ${request.selected_template} for request ${requestId}`);
        
        try {
            // Call API to execute template
            const result = await this.apiClient.kamRequest(`/requests/${requestId}/execute`, 'POST');
            
            if (result.success) {
                // Update local status to processing
                request.request_status = 'processing';
                request.started_processing_at = new Date().toISOString();
                request.execution_id = result.execution_id || 'exec_' + Date.now();
                
                this.updateContent();
                this.showSuccess('Template execution started!');
                
                // Poll for updates or refresh after a delay
                setTimeout(async () => {
                    await this.loadRequests();
                    this.showSuccess('Request processing completed!');
                }, 5000);
            } else {
                console.error('Failed to execute template:', result);
                this.showError('Failed to execute template. Please try again.');
            }
        } catch (error) {
            console.error('Error executing template:', error);
            this.showError('Failed to execute template. Please try again.');
        }
    }

    async showCreateRequest() {
        // Load clients first
        let clientOptions = '<option value="">Select Client</option>';
        
        try {
            const clientsResult = await this.apiClient.kamRequest('/clients', 'GET');
            if (clientsResult.success && clientsResult.clients) {
                clientOptions += clientsResult.clients.map(client => 
                    `<option value="${client.client_id}">${client.company_name}</option>`
                ).join('');
            }
        } catch (error) {
            console.error('Failed to load clients:', error);
        }
        
        window.SimpleModal.show({
            title: '➕ Create New Request',
            size: 'large',
            content: `
                <form id="create-request-form">
                    <div class="form-group">
                        <label>Client *</label>
                        <select name="client_id" required class="form-select">
                            ${clientOptions}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Request Type *</label>
                        <select name="request_type" required class="form-select">
                            <option value="pipeline_execution">Pipeline Execution</option>
                            <option value="information_request">Information Request</option>
                            <option value="support_request">Support Request</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Message *</label>
                        <textarea name="message" required rows="5" class="form-textarea" 
                                  placeholder="Enter the request details..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>Urgency Level</label>
                        <select name="urgency_level" class="form-select">
                            <option value="low">Low</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>
                    </div>
                </form>
            `,
            actions: [
                {
                    text: 'Cancel',
                    class: 'btn-secondary',
                    onclick: "document.querySelector('.modal-overlay').close()"
                },
                {
                    text: 'Create Request',
                    class: 'btn-primary',
                    onclick: "requestsPage.handleCreateRequest()"
                }
            ]
        });
    }

    async handleCreateRequest() {
        const form = document.getElementById('create-request-form');
        const formData = new FormData(form);
        
        const requestData = {
            client_id: formData.get('client_id'),
            request_type: formData.get('request_type'),
            message: formData.get('message'),
            urgency_level: formData.get('urgency_level')
        };
        
        try {
            // Call API to create request
            const result = await this.apiClient.kamRequest('/requests', 'POST', requestData);
            
            if (result.success) {
                document.querySelector('.modal-overlay').close();
                this.showSuccess('Request created successfully!');
                
                // Reload requests to show the new one
                await this.loadRequests();
            } else {
                console.error('Failed to create request:', result);
                alert('Failed to create request: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error creating request:', error);
            alert('Failed to create request: ' + error.message);
        }
    }

    async refresh() {
        console.log('🔄 Refreshing requests...');
        await this.loadRequests();
    }

    renderLoadingState() {
        return `
            <div class="loading-state">
                <div class="loading-spinner">🔄</div>
                <div class="loading-text">Loading requests...</div>
            </div>
        `;
    }

    showError(message) {
        const contentElement = document.getElementById('requests-content');
        if (contentElement) {
            contentElement.innerHTML = `
                <div class="error-state">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
                    <h3>Error Loading Requests</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="requestsPage.refresh()">
                        🔄 Try Again
                    </button>
                </div>
            `;
        }
    }

    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--success);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--radius);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        successDiv.textContent = message;
        document.body.appendChild(successDiv);
        
        setTimeout(() => successDiv.remove(), 3000);
    }

    // Utility methods
    getStatusIcon(status) {
        const icons = {
            'pending': '⏳',
            'processing': '⚙️',
            'completed': '✅',
            'failed': '❌',
            'cancelled': '🚫'
        };
        return icons[status] || '❓';
    }

    getTypeIcon(type) {
        const icons = {
            'pipeline_execution': '🔄',
            'information_request': '❓',
            'support_request': '🛟',
            'email_inbound': '📧',
            'chat': '💬'
        };
        return icons[type] || '📋';
    }

    getDeliverableIcon(type) {
        const icons = {
            'report': '📄',
            'data': '📊',
            'image': '🖼️',
            'video': '🎬',
            'archive': '📦'
        };
        return icons[type] || '📎';
    }

    getSentimentEmoji(score) {
        if (score > 0.5) return '😊';
        if (score < -0.5) return '😟';
        return '😐';
    }

    formatType(type) {
        return type.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    formatRelativeTime(date) {
        const now = new Date();
        const then = new Date(date);
        const diff = now - then;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        
        return then.toLocaleDateString();
    }

    formatDateTime(date) {
        return new Date(date).toLocaleString();
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m`;
        return `${seconds}s`;
    }

    formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    renderTierBadges(allowedTiers) {
        const tierColors = {
            basic: '#6b7280',      // gray
            standard: '#3b82f6',   // blue
            premium: '#8b5cf6',    // purple
            enterprise: '#f59e0b'  // amber
        };
        
        const tierLabels = {
            basic: 'Basic',
            standard: 'Standard',
            premium: 'Premium',
            enterprise: 'Enterprise'
        };
        
        // If all tiers are allowed, don't show badges
        if (allowedTiers.length === 4) {
            return '';
        }
        
        // Show minimum required tier
        const minTier = ['basic', 'standard', 'premium', 'enterprise'].find(tier => allowedTiers.includes(tier));
        if (!minTier) return '';
        
        return `<span class="tier-badge" style="background-color: ${tierColors[minTier]}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; margin-left: 8px;">${tierLabels[minTier]}+</span>`;
    }

    // Mock data methods
    getMockRequests() {
        return [
            {
                request_id: 'req_001',
                client_id: 'client_123',
                client_name: 'TechCorp Inc.',
                title: 'Market Analysis Report',
                request_type: 'pipeline_execution',
                original_message: 'We need a comprehensive market analysis for the AI industry in Q4 2024.',
                processed_request: 'Generate comprehensive market analysis report for AI industry Q4 2024',
                selected_template: 'market_research_pipeline',
                template_display_name: 'Market Research Pipeline',
                template_confidence_score: 0.92,
                request_status: 'completed',
                urgency_level: 'high',
                created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
                started_processing_at: new Date(Date.now() - 1.5 * 3600000).toISOString(),
                completed_at: new Date(Date.now() - 0.5 * 3600000).toISOString(),
                sender_email: 'john@techcorp.com',
                communication_type: 'email_inbound',
                sentiment_score: 0.8,
                intent_detected: 'request_report',
                execution_id: 'exec_12345',
                estimated_duration_ms: 300000,
                worker_sessions: [
                    {
                        worker_name: 'topic_researcher',
                        worker_success: true,
                        execution_time_ms: 120000,
                        worker_cost_usd: 0.05
                    },
                    {
                        worker_name: 'content_analyzer',
                        worker_success: true,
                        execution_time_ms: 180000,
                        worker_cost_usd: 0.08
                    }
                ],
                deliverables: [
                    {
                        id: 'del_001',
                        type: 'report',
                        name: 'AI_Market_Analysis_Q4_2024.pdf',
                        size: 2457600
                    },
                    {
                        id: 'del_002',
                        type: 'data',
                        name: 'market_data.xlsx',
                        size: 512000
                    }
                ]
            },
            {
                request_id: 'req_002',
                client_id: 'client_456',
                client_name: 'Green Energy Solutions',
                title: 'Sustainability Report Generation',
                request_type: 'pipeline_execution',
                original_message: 'Please generate our monthly sustainability metrics report.',
                processed_request: 'Generate monthly sustainability metrics report',
                selected_template: 'sustainability_report',
                template_display_name: 'Sustainability Report Generator',
                template_confidence_score: 0.88,
                request_status: 'processing',
                urgency_level: 'medium',
                created_at: new Date(Date.now() - 0.5 * 3600000).toISOString(),
                started_processing_at: new Date(Date.now() - 0.25 * 3600000).toISOString(),
                sender_email: 'sarah@greenenergy.com',
                communication_type: 'email_inbound',
                sentiment_score: 0.6,
                intent_detected: 'request_report',
                execution_id: 'exec_12346',
                estimated_duration_ms: 240000
            },
            {
                request_id: 'req_003',
                client_id: 'client_789',
                client_name: 'Finance First Ltd.',
                title: 'Urgent Data Analysis',
                request_type: 'information_request',
                original_message: 'URGENT: Need analysis of Q3 financial data anomalies by EOD.',
                processed_request: 'Analyze Q3 financial data anomalies - urgent',
                request_status: 'pending',
                urgency_level: 'critical',
                created_at: new Date(Date.now() - 0.1 * 3600000).toISOString(),
                sender_email: 'michael@financefirst.com',
                communication_type: 'email_inbound',
                sentiment_score: -0.3,
                intent_detected: 'urgent_request'
            },
            {
                request_id: 'req_004',
                client_id: 'client_123',
                client_name: 'TechCorp Inc.',
                title: 'API Integration Support',
                request_type: 'support_request',
                original_message: 'Having issues with API authentication. Getting 401 errors.',
                processed_request: 'Technical support for API authentication issues',
                request_status: 'failed',
                urgency_level: 'high',
                created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
                sender_email: 'dev@techcorp.com',
                communication_type: 'chat',
                sentiment_score: -0.5,
                intent_detected: 'technical_support'
            }
        ];
    }

    getMockTemplates() {
        return [
            {
                template_name: 'market_research_pipeline',
                display_name: 'Market Research Pipeline',
                description: 'Comprehensive market analysis including competitor research, trend analysis, and forecasting',
                category: 'Research',
                complexity_level: 'Advanced',
                estimated_duration_ms: 300000,
                estimated_cost_usd: 0.15,
                worker_flow: ['topic_researcher', 'content_analyzer', 'report_generator'],
                typical_use_cases: ['Market analysis', 'Industry reports', 'Competitor research']
            },
            {
                template_name: 'content_generation_basic',
                display_name: 'Basic Content Generator',
                description: 'Simple content generation for blog posts, articles, and social media',
                category: 'Content',
                complexity_level: 'Basic',
                estimated_duration_ms: 120000,
                estimated_cost_usd: 0.05,
                worker_flow: ['content_generator'],
                typical_use_cases: ['Blog posts', 'Social media', 'Marketing content']
            },
            {
                template_name: 'data_analysis_advanced',
                display_name: 'Advanced Data Analysis',
                description: 'Deep data analysis with visualization and insights generation',
                category: 'Analytics',
                complexity_level: 'Advanced',
                estimated_duration_ms: 420000,
                estimated_cost_usd: 0.25,
                worker_flow: ['data_processor', 'data_analyzer', 'visualization_generator'],
                typical_use_cases: ['Financial analysis', 'Performance metrics', 'Trend analysis']
            },
            {
                template_name: 'sustainability_report',
                display_name: 'Sustainability Report Generator',
                description: 'Generate comprehensive sustainability and ESG reports',
                category: 'Reporting',
                complexity_level: 'Intermediate',
                estimated_duration_ms: 240000,
                estimated_cost_usd: 0.12,
                worker_flow: ['data_collector', 'sustainability_analyzer', 'report_generator'],
                typical_use_cases: ['ESG reporting', 'Sustainability metrics', 'Compliance reports']
            },
            {
                template_name: 'quick_answer',
                display_name: 'Quick Answer Service',
                description: 'Fast responses to simple questions and information requests',
                category: 'Support',
                complexity_level: 'Basic',
                estimated_duration_ms: 30000,
                estimated_cost_usd: 0.02,
                worker_flow: ['question_answerer'],
                typical_use_cases: ['FAQ responses', 'Quick lookups', 'Simple queries']
            }
        ];
    }
}

// Global instance
window.RequestsPage = RequestsPage;