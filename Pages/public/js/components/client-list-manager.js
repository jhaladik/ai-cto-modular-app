// Enhanced Client List Manager - Phase 1 (CORRECTED)
// File: public/js/components/client-list-manager.js
// Replaces the basic client modal with rich client management interface

/**
 * ClientListManager - Main orchestrator for client management
 * Integrates with existing AdminDashboard architecture
 */
class ClientListManager {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.clients = [];
        this.filteredClients = [];
        this.currentFilter = '';
        this.currentSort = 'company_name';
        this.isLoading = false;
        this.modalElement = null;
        this.selectedClientForEdit = null;
        this.selectedClients = new Set();
        this.bulkMode = false;
        this.useEnhancedFeatures = true;
    }

    /**
     * Show the enhanced client list modal
     * Replaces the basic showClients() functionality
     */
    async show() {
        try {
            this.isLoading = true;
            this.createModal();
            this.showLoadingState();
            
            // Load clients from API
            const response = await this.apiClient.getClients();
            this.clients = response.clients || [];
            this.filteredClients = [...this.clients];
            
            this.render();
            this.isLoading = false;
            
        } catch (error) {
            console.error('Failed to load clients:', error);
            this.showErrorState(error.message);
            this.isLoading = false;
        }
    }

    /**
     * Create the modal container
     */
    createModal() {
        if (this.modalElement) {
            this.modalElement.remove();
        }

        this.modalElement = document.createElement('div');
        this.modalElement.className = 'client-list-modal';
        this.modalElement.innerHTML = `
            <div class="modal-backdrop" onclick="window.clientListManager?.hide()"></div>
            <div class="modal-container">
                <div class="modal-header">
                    <h2>👥 Client Management</h2>
                    <button class="btn-close" onclick="window.clientListManager?.hide()">✕</button>
                </div>
                <div class="modal-content">
                    <div id="client-list-content">
                        <!-- Content will be rendered here -->
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modalElement);
        
        // Set global reference for onclick handlers
        window.clientListManager = this;
    }

    /**
     * Render the client list interface
     */
    render() {
        const contentElement = document.getElementById('client-list-content');
        if (!contentElement) return;

        contentElement.innerHTML = `
            <!-- Search and Filter Bar -->
            <div class="client-controls">
                <div class="search-container">
                    <input type="text" 
                           class="search-input" 
                           placeholder="🔍 Search clients..." 
                           value="${this.currentFilter}"
                           onkeyup="window.clientListManager?.handleSearch(event)">
                </div>
                <div class="filter-container">
                    <select class="filter-select" onchange="window.clientListManager?.handleSort(event)">
                        <option value="company_name" ${this.currentSort === 'company_name' ? 'selected' : ''}>Sort by Company</option>
                        <option value="subscription_tier" ${this.currentSort === 'subscription_tier' ? 'selected' : ''}>Sort by Tier</option>
                        <option value="created_at" ${this.currentSort === 'created_at' ? 'selected' : ''}>Sort by Date</option>
                        <option value="monthly_budget_usd" ${this.currentSort === 'monthly_budget_usd' ? 'selected' : ''}>Sort by Budget</option>
                    </select>
                </div>
                <div class="action-container">
                    <button class="btn btn-primary btn-small" onclick="window.clientListManager?.showAddClient()">
                        ➕ Add Client
                    </button>
                </div>
            </div>

            <!-- Client Summary Stats -->
            <div class="client-summary">
                <div class="summary-card">
                    <span class="summary-label">Total Clients</span>
                    <span class="summary-value">${this.clients.length}</span>
                </div>
                <div class="summary-card">
                    <span class="summary-label">Active</span>
                    <span class="summary-value">${this.clients.filter(c => c.account_status === 'active').length}</span>
                </div>
                <div class="summary-card">
                    <span class="summary-label">Total Budget</span>
                    <span class="summary-value">$${this.getTotalBudget().toLocaleString()}</span>
                </div>
                <div class="summary-card">
                    <span class="summary-label">Usage</span>
                    <span class="summary-value">$${this.getTotalUsage().toLocaleString()}</span>
                </div>
            </div>

            <!-- Client Cards Grid -->
            <div class="client-grid">
                ${this.renderClientCards()}
            </div>

            <!-- Pagination (if needed) -->
            ${this.filteredClients.length > 20 ? this.renderPagination() : ''}
        `;
    }

    /**
     * Render individual client cards
     */
    renderClientCards() {
        if (this.filteredClients.length === 0) {
            return `<div class="no-clients">...</div>`;
        }
        return this.filteredClients.map(client => this.renderClientCardEnhanced(client)).join('');
    }

    /**
     * Render individual client card
     */
    renderClientCard(client) {
        const budgetUsage = client.monthly_budget_usd > 0 ? 
            (client.used_budget_current_month / client.monthly_budget_usd) * 100 : 0;
        
        const statusClass = this.getStatusClass(client.account_status);
        const tierClass = this.getTierClass(client.subscription_tier);

        return `
            <div class="client-card" data-client-id="${client.client_id}">
                <div class="client-card-header">
                    <div class="client-info">
                        <h4 class="client-name">${client.company_name}</h4>
                        <p class="client-email">${client.primary_contact_email || 'No email'}</p>
                    </div>
                    <div class="client-actions">
                        <button class="btn btn-secondary btn-small" 
                                onclick="window.clientListManager?.editClient('${client.client_id}')">
                            ✏️ Edit
                        </button>
                        <button class="btn btn-secondary btn-small" 
                                onclick="window.clientListManager?.viewClientDetails('${client.client_id}')">
                            👁️ View
                        </button>
                    </div>
                </div>
                
                <div class="client-card-body">
                    <div class="client-badges">
                        <span class="badge ${tierClass}">${this.formatTier(client.subscription_tier)}</span>
                        <span class="badge ${statusClass}">${this.formatStatus(client.account_status)}</span>
                    </div>
                    
                    <div class="client-stats">
                        <div class="stat">
                            <span class="stat-label">Budget</span>
                            <span class="stat-value">$${client.monthly_budget_usd.toLocaleString()}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Used</span>
                            <span class="stat-value">$${client.used_budget_current_month.toLocaleString()}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Usage</span>
                            <span class="stat-value">${budgetUsage.toFixed(1)}%</span>
                        </div>
                    </div>
                    
                    <div class="budget-bar">
                        <div class="budget-bar-fill" style="width: ${Math.min(budgetUsage, 100)}%"></div>
                    </div>
                    
                    ${client.industry ? `<div class="client-meta">📋 ${client.industry}</div>` : ''}
                    ${client.last_interaction ? `<div class="client-meta">🕒 ${this.formatDate(client.last_interaction)}</div>` : ''}
                </div>
            </div>
        `;
    }
// Phase 2: Advanced Client Management Features
// Add these methods to the existing ClientListManager class

/**
 * Phase 2A: Inline Editing & Bulk Operations
 * Add these methods to your existing ClientListManager class
 */

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * Initialize bulk selection mode
 */
initBulkOperations() {
    this.selectedClients = new Set();
    this.bulkMode = false;
}

/**
 * Toggle bulk selection mode
 */
toggleBulkMode() {
    this.bulkMode = !this.bulkMode;
    this.selectedClients.clear();
    this.render();
}

/**
 * Handle client selection
 */
toggleClientSelection(clientId) {
    if (this.selectedClients.has(clientId)) {
        this.selectedClients.delete(clientId);
    } else {
        this.selectedClients.add(clientId);
    }
    
    this.updateBulkUI();
}

/**
 * Select all visible clients
 */
selectAllClients() {
    this.filteredClients.forEach(client => {
        this.selectedClients.add(client.client_id);
    });
    this.updateBulkUI();
}

/**
 * Clear all selections
 */
clearSelection() {
    this.selectedClients.clear();
    this.updateBulkUI();
}

/**
 * Update bulk operation UI
 */
updateBulkUI() {
    // Update checkboxes
    this.filteredClients.forEach(client => {
        const checkbox = document.querySelector(`input[data-client-id="${client.client_id}"]`);
        if (checkbox) {
            checkbox.checked = this.selectedClients.has(client.client_id);
        }
    });
    
    // Update bulk actions bar
    const bulkBar = document.getElementById('bulk-actions-bar');
    if (bulkBar) {
        if (this.selectedClients.size > 0) {
            bulkBar.style.display = 'flex';
            bulkBar.querySelector('.selected-count').textContent = `${this.selectedClients.size} selected`;
        } else {
            bulkBar.style.display = 'none';
        }
    }
}

/**
 * Execute bulk action
 */
async executeBulkAction(action) {
    const selectedIds = Array.from(this.selectedClients);
    if (selectedIds.length === 0) return;

    const confirmMessage = `Are you sure you want to ${action} ${selectedIds.length} client(s)?`;
    if (!confirm(confirmMessage)) return;

    try {
        let results = [];
        
        switch (action) {
            case 'suspend':
                results = await this.bulkUpdateStatus(selectedIds, 'suspended');
                break;
            case 'activate':
                results = await this.bulkUpdateStatus(selectedIds, 'active');
                break;
            case 'upgrade':
                const newTier = prompt('Enter new tier (basic, standard, premium, enterprise):');
                if (newTier) {
                    results = await this.bulkUpdateTier(selectedIds, newTier);
                }
                break;
            case 'export':
                this.exportSelectedClients(selectedIds);
                return;
            case 'delete':
                if (confirm('⚠️ This will permanently delete the selected clients. Are you sure?')) {
                    results = await this.bulkDeleteClients(selectedIds);
                }
                break;
        }

        // Show results and refresh
        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;
        
        this.showSuccessMessage(`✅ ${successCount} clients updated successfully${failCount > 0 ? `, ${failCount} failed` : ''}`);
        
        // Refresh client list
        await this.show();
        
    } catch (error) {
        console.error('Bulk operation failed:', error);
        this.showErrorMessage(`Bulk ${action} failed: ${error.message}`);
    }
}

/**
 * Bulk update status
 */
async bulkUpdateStatus(clientIds, status) {
    const promises = clientIds.map(clientId => 
        this.updateClient(clientId, { account_status: status })
    );
    return await Promise.allSettled(promises);
}

/**
 * Bulk update tier
 */
async bulkUpdateTier(clientIds, tier) {
    const promises = clientIds.map(clientId => 
        this.updateClient(clientId, { subscription_tier: tier })
    );
    return await Promise.allSettled(promises);
}

/**
 * Export selected clients
 */
exportSelectedClients(clientIds) {
    const selectedData = this.clients.filter(c => clientIds.includes(c.client_id));
    const csvContent = this.convertToCSV(selectedData);
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

/**
 * Convert clients to CSV
 */
convertToCSV(clients) {
    const headers = ['Company Name', 'Email', 'Tier', 'Status', 'Budget', 'Used', 'Industry', 'Created'];
    const rows = clients.map(client => [
        client.company_name,
        client.primary_contact_email || '',
        client.subscription_tier,
        client.account_status,
        client.monthly_budget_usd,
        client.used_budget_current_month,
        client.industry || '',
        client.created_at
    ]);
    
    return [headers, ...rows].map(row => 
        row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
}

// =============================================================================
// INLINE EDITING
// =============================================================================

/**
 * Enable inline editing for a client card
 */
enableInlineEdit(clientId) {
    const client = this.clients.find(c => c.client_id === clientId);
    if (!client) return;

    const card = document.querySelector(`[data-client-id="${clientId}"]`);
    if (!card) return;

    // Store original content
    const originalContent = card.innerHTML;
    
    // Replace card content with editable form
    card.innerHTML = this.renderInlineEditForm(client);
    
    // Store original content for cancel functionality
    card.dataset.originalContent = originalContent;
    
    // Focus on first input
    const firstInput = card.querySelector('input, select');
    if (firstInput) firstInput.focus();
}

/**
 * Render inline edit form
 */
renderInlineEditForm(client) {
    return `
        <div class="inline-edit-form">
            <div class="inline-edit-header">
                <h4>✏️ Editing: ${client.company_name}</h4>
                <div class="inline-edit-actions">
                    <button class="btn btn-small btn-primary" onclick="window.clientListManager?.saveInlineEdit('${client.client_id}')">💾 Save</button>
                    <button class="btn btn-small btn-secondary" onclick="window.clientListManager?.cancelInlineEdit('${client.client_id}')">❌ Cancel</button>
                </div>
            </div>
            
            <div class="inline-edit-grid">
                <div class="edit-field">
                    <label>Company</label>
                    <input type="text" name="company_name" value="${client.company_name}" class="inline-input">
                </div>
                
                <div class="edit-field">
                    <label>Contact</label>
                    <input type="text" name="primary_contact_name" value="${client.primary_contact_name || ''}" class="inline-input">
                </div>
                
                <div class="edit-field">
                    <label>Email</label>
                    <input type="email" name="primary_contact_email" value="${client.primary_contact_email || ''}" class="inline-input">
                </div>
                
                <div class="edit-field">
                    <label>Phone</label>
                    <input type="text" name="phone" value="${client.phone || ''}" class="inline-input">
                </div>
                
                <div class="edit-field">
                    <label>Tier</label>
                    <select name="subscription_tier" class="inline-input">
                        <option value="basic" ${client.subscription_tier === 'basic' ? 'selected' : ''}>Basic</option>
                        <option value="standard" ${client.subscription_tier === 'standard' ? 'selected' : ''}>Standard</option>
                        <option value="premium" ${client.subscription_tier === 'premium' ? 'selected' : ''}>Premium</option>
                        <option value="enterprise" ${client.subscription_tier === 'enterprise' ? 'selected' : ''}>Enterprise</option>
                    </select>
                </div>
                
                <div class="edit-field">
                    <label>Budget ($)</label>
                    <input type="number" name="monthly_budget_usd" value="${client.monthly_budget_usd}" min="0" step="0.01" class="inline-input">
                </div>
                
                <div class="edit-field">
                    <label>Industry</label>
                    <input type="text" name="industry" value="${client.industry || ''}" class="inline-input">
                </div>
                
                <div class="edit-field">
                    <label>Style</label>
                    <select name="communication_style" class="inline-input">
                        <option value="professional" ${client.communication_style === 'professional' ? 'selected' : ''}>Professional</option>
                        <option value="casual" ${client.communication_style === 'casual' ? 'selected' : ''}>Casual</option>
                        <option value="technical" ${client.communication_style === 'technical' ? 'selected' : ''}>Technical</option>
                        <option value="executive" ${client.communication_style === 'executive' ? 'selected' : ''}>Executive</option>
                    </select>
                </div>
            </div>
        </div>
    `;
}

/**
 * Save inline edit
 */
async saveInlineEdit(clientId) {
    const card = document.querySelector(`[data-client-id="${clientId}"]`);
    if (!card) return;

    const formData = new FormData();
    const inputs = card.querySelectorAll('input, select');
    
    inputs.forEach(input => {
        if (input.value.trim()) {
            formData.append(input.name, input.value.trim());
        }
    });

    const updateData = {};
    for (const [key, value] of formData.entries()) {
        updateData[key] = key === 'monthly_budget_usd' ? parseFloat(value) : value;
    }

    try {
        // Show saving state
        const saveBtn = card.querySelector('.btn-primary');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '🔄 Saving...';
        saveBtn.disabled = true;

        const response = await this.updateClient(clientId, updateData);
        
        if (response.success) {
            // Update local client data
            const clientIndex = this.clients.findIndex(c => c.client_id === clientId);
            if (clientIndex !== -1) {
                this.clients[clientIndex] = { ...this.clients[clientIndex], ...response.client };
            }
            
            // Re-render the card with updated data
            this.applyFilters();
            this.showSuccessMessage('Client updated successfully!');
            
        } else {
            throw new Error(response.error || 'Update failed');
        }
        
    } catch (error) {
        console.error('Inline edit save failed:', error);
        this.showErrorMessage(`Failed to save: ${error.message}`);
        
        // Restore save button
        const saveBtn = card.querySelector('.btn-primary');
        if (saveBtn) {
            saveBtn.innerHTML = '💾 Save';
            saveBtn.disabled = false;
        }
    }
}

/**
 * Cancel inline edit
 */
cancelInlineEdit(clientId) {
    const card = document.querySelector(`[data-client-id="${clientId}"]`);
    if (!card || !card.dataset.originalContent) return;

    // Restore original content
    card.innerHTML = card.dataset.originalContent;
    delete card.dataset.originalContent;
}

// =============================================================================
// CLIENT CREATION
// =============================================================================

/**
 * Show add client modal
 */
showAddClient() {
    const addModal = document.createElement('div');
    addModal.className = 'add-client-modal';
    addModal.innerHTML = `
        <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
        <div class="modal-container add-modal-container">
            <div class="modal-header">
                <h3>➕ Add New Client</h3>
                <button class="btn-close" onclick="this.closest('.add-client-modal').remove()">✕</button>
            </div>
            <div class="modal-content">
                <form id="add-client-form" onsubmit="window.clientListManager?.handleAddSubmit(event)">
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Company Name *</label>
                            <input type="text" class="form-input" name="company_name" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Contact Email *</label>
                            <input type="email" class="form-input" name="primary_contact_email" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Contact Name</label>
                            <input type="text" class="form-input" name="primary_contact_name">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Phone</label>
                            <input type="text" class="form-input" name="phone">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Industry</label>
                            <input type="text" class="form-input" name="industry" placeholder="e.g. Technology, Healthcare">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Subscription Tier</label>
                            <select class="form-input" name="subscription_tier">
                                <option value="basic">Basic</option>
                                <option value="standard" selected>Standard</option>
                                <option value="premium">Premium</option>
                                <option value="enterprise">Enterprise</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Monthly Budget ($)</label>
                            <input type="number" class="form-input" name="monthly_budget_usd" value="100" min="0" step="0.01">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Communication Style</label>
                            <select class="form-input" name="communication_style">
                                <option value="professional" selected>Professional</option>
                                <option value="casual">Casual</option>
                                <option value="technical">Technical</option>
                                <option value="executive">Executive</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.add-client-modal').remove()">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary">
                            ➕ Create Client
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(addModal);
}
/**
 * Handle add client form submission
 */
async handleAddSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const clientData = {};
    
    for (const [key, value] of formData.entries()) {
        const stringValue = String(value).trim();
        if (stringValue) {
            clientData[key] = key === 'monthly_budget_usd' ? parseFloat(stringValue) : stringValue;
        }
    }
    
    try {
        // Show loading state
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '🔄 Creating...';
        submitBtn.disabled = true;
        
        // Create client via API
        const response = await this.createClient(clientData);
        
        if (response.success) {
            // Add to local clients array
            this.clients.unshift(response.client);
            
            // Refresh the display
            this.applyFilters();
            
            // Close modal
            document.querySelector('.add-client-modal').remove();
            
            // Show success message
            this.showSuccessMessage(`✅ Client "${response.client.company_name}" created successfully!`);
            
        } else {
            throw new Error(response.error || 'Creation failed');
        }
        
    } catch (error) {
        console.error('Failed to create client:', error);
        this.showErrorMessage(`Failed to create client: ${error.message}`);
        
        // Reset button
        const submitBtn = event.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '➕ Create Client';
            submitBtn.disabled = false;
        }
    }
}

/**
 * Create client via API
 */
async createClient(clientData) {
    return await this.apiClient.request(`/api/key-account-manager`, {
        method: 'POST',
        body: {
            endpoint: '/client',
            method: 'POST',
            data: clientData
        }
    });
}

    // =============================================================================
    // UPDATED RENDER METHODS WITH PHASE 2 FEATURES
    // =============================================================================

    /**
     * Enhanced render with bulk operations
     */
    renderEnhanced() {
        const contentElement = document.getElementById('client-list-content');
        if (!contentElement) return;

        contentElement.innerHTML = `
            <!-- Enhanced Controls with Bulk Operations -->
            <div class="client-controls enhanced">
                <div class="search-container">
                    <input type="text" 
                        class="search-input" 
                        placeholder="🔍 Search clients..." 
                        value="${this.currentFilter}"
                        onkeyup="window.clientListManager?.handleSearch(event)">
                </div>
                
                <div class="filter-container">
                    <select class="filter-select" onchange="window.clientListManager?.handleSort(event)">
                        <option value="company_name" ${this.currentSort === 'company_name' ? 'selected' : ''}>Sort by Company</option>
                        <option value="subscription_tier" ${this.currentSort === 'subscription_tier' ? 'selected' : ''}>Sort by Tier</option>
                        <option value="created_at" ${this.currentSort === 'created_at' ? 'selected' : ''}>Sort by Date</option>
                        <option value="monthly_budget_usd" ${this.currentSort === 'monthly_budget_usd' ? 'selected' : ''}>Sort by Budget</option>
                    </select>
                </div>
                
                <div class="action-container">
                    <button class="btn btn-secondary btn-small" onclick="window.clientListManager?.toggleBulkMode()">
                        ${this.bulkMode ? '❌ Exit Bulk' : '☑️ Bulk Select'}
                    </button>
                    <button class="btn btn-primary btn-small" onclick="window.clientListManager?.showAddClient()">
                        ➕ Add Client
                    </button>
                </div>
            </div>

            <!-- Bulk Actions Bar -->
            <div id="bulk-actions-bar" class="bulk-actions-bar" style="display: none;">
                <div class="bulk-info">
                    <span class="selected-count">0 selected</span>
                    <button class="btn-link" onclick="window.clientListManager?.selectAllClients()">Select All</button>
                    <button class="btn-link" onclick="window.clientListManager?.clearSelection()">Clear</button>
                </div>
                <div class="bulk-actions">
                    <button class="btn btn-small btn-secondary" onclick="window.clientListManager?.executeBulkAction('activate')">✅ Activate</button>
                    <button class="btn btn-small btn-warning" onclick="window.clientListManager?.executeBulkAction('suspend')">⏸️ Suspend</button>
                    <button class="btn btn-small btn-info" onclick="window.clientListManager?.executeBulkAction('upgrade')">⬆️ Upgrade</button>
                    <button class="btn btn-small btn-secondary" onclick="window.clientListManager?.executeBulkAction('export')">📤 Export</button>
                </div>
            </div>

            <!-- Client Summary Stats -->
            <div class="client-summary">
                <div class="summary-card">
                    <span class="summary-label">Total Clients</span>
                    <span class="summary-value">${this.clients.length}</span>
                </div>
                <div class="summary-card">
                    <span class="summary-label">Active</span>
                    <span class="summary-value">${this.clients.filter(c => c.account_status === 'active').length}</span>
                </div>
                <div class="summary-card">
                    <span class="summary-label">Total Budget</span>
                    <span class="summary-value">$${this.getTotalBudget().toLocaleString()}</span>
                </div>
                <div class="summary-card">
                    <span class="summary-label">Usage</span>
                    <span class="summary-value">$${this.getTotalUsage().toLocaleString()}</span>
                </div>
            </div>

            <!-- Client Cards Grid -->
            <div class="client-grid ${this.bulkMode ? 'bulk-mode' : ''}">
                ${this.renderClientCardsEnhanced()}
            </div>
        `;
    }

    /**
     * Enhanced client card with bulk selection and inline edit
     */
    renderClientCardEnhanced(client) {
        const budgetUsage = client.monthly_budget_usd > 0 ? 
            (client.used_budget_current_month / client.monthly_budget_usd) * 100 : 0;
        
        const statusClass = this.getStatusClass(client.account_status);
        const tierClass = this.getTierClass(client.subscription_tier);

        return `
            <div class="client-card enhanced" data-client-id="${client.client_id}">
                ${this.bulkMode ? `
                    <div class="client-card-checkbox">
                        <input type="checkbox" 
                            data-client-id="${client.client_id}" 
                            onchange="window.clientListManager?.toggleClientSelection('${client.client_id}')">
                    </div>
                ` : ''}
                
                <div class="client-card-header">
                    <div class="client-info">
                        <h4 class="client-name">${client.company_name}</h4>
                        <p class="client-email">${client.primary_contact_email || 'No email'}</p>
                    </div>
                    <div class="client-actions">
                        <button class="btn btn-secondary btn-small" 
                                onclick="window.clientListManager?.enableInlineEdit('${client.client_id}')">
                            ✏️ Quick Edit
                        </button>
                        <button class="btn btn-secondary btn-small" 
                                onclick="window.clientListManager?.editClient('${client.client_id}')">
                            📝 Full Edit
                        </button>
                        <button class="btn btn-secondary btn-small" 
                                onclick="window.clientListManager?.viewClientDetails('${client.client_id}')">
                            👁️ Details
                        </button>
                    </div>
                </div>
                
                <div class="client-card-body">
                    <div class="client-badges">
                        <span class="badge ${tierClass}">${this.formatTier(client.subscription_tier)}</span>
                        <span class="badge ${statusClass}">${this.formatStatus(client.account_status)}</span>
                    </div>
                    
                    <div class="client-stats">
                        <div class="stat">
                            <span class="stat-label">Budget</span>
                            <span class="stat-value">$${client.monthly_budget_usd.toLocaleString()}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Used</span>
                            <span class="stat-value">$${client.used_budget_current_month.toLocaleString()}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Usage</span>
                            <span class="stat-value">${budgetUsage.toFixed(1)}%</span>
                        </div>
                    </div>
                    
                    <div class="budget-bar">
                        <div class="budget-bar-fill" style="width: ${Math.min(budgetUsage, 100)}%"></div>
                    </div>
                    
                    ${client.industry ? `<div class="client-meta">📋 ${client.industry}</div>` : ''}
                    ${client.last_interaction ? `<div class="client-meta">🕒 ${this.formatDate(client.last_interaction)}</div>` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Enhanced client cards rendering
     */
    renderClientCardsEnhanced() {
        if (this.filteredClients.length === 0) {
            return `
                <div class="no-clients">
                    <div class="no-clients-icon">👥</div>
                    <h3>No clients found</h3>
                    <p>Try adjusting your search or add a new client.</p>
                    <button class="btn btn-primary" onclick="window.clientListManager?.showAddClient()">
                        ➕ Add First Client
                    </button>
                </div>
            `;
        }

        return this.filteredClients.map(client => this.renderClientCardEnhanced(client)).join('');
}
    // =============================================================================
    // EVENT HANDLERS
    // =============================================================================

    /**
     * Handle search input
     */
    handleSearch(event) {
        this.currentFilter = event.target.value.toLowerCase();
        this.applyFilters();
    }

    /**
     * Handle sort selection
     */
    handleSort(event) {
        this.currentSort = event.target.value;
        this.applySort();
    }

    /**
     * Apply filters and re-render
     */
    applyFilters() {
        this.filteredClients = this.clients.filter(client => {
            const searchTerm = this.currentFilter;
            return (
                client.company_name.toLowerCase().includes(searchTerm) ||
                (client.primary_contact_email && client.primary_contact_email.toLowerCase().includes(searchTerm)) ||
                (client.industry && client.industry.toLowerCase().includes(searchTerm)) ||
                client.subscription_tier.toLowerCase().includes(searchTerm)
            );
        });
        
        this.applySort();
    }

    /**
     * Apply sorting
     */
    applySort() {
        this.filteredClients.sort((a, b) => {
            const field = this.currentSort;
            
            if (field === 'company_name') {
                return a.company_name.localeCompare(b.company_name);
            } else if (field === 'created_at') {
                return new Date(b.created_at) - new Date(a.created_at);
            } else if (field === 'monthly_budget_usd') {
                return b.monthly_budget_usd - a.monthly_budget_usd;
            } else if (field === 'subscription_tier') {
                const tierOrder = { 'enterprise': 4, 'premium': 3, 'standard': 2, 'basic': 1 };
                return (tierOrder[b.subscription_tier] || 0) - (tierOrder[a.subscription_tier] || 0);
            }
            
            return 0;
        });
        
        this.render();
    }

    /**
     * Edit client - opens inline editing
     */
    async editClient(clientId) {
        const client = this.clients.find(c => c.client_id === clientId);
        if (!client) return;

        this.selectedClientForEdit = client;
        
        // For Phase 1, open a simple edit modal
        // In Phase 2, we'll add inline editing
        this.showEditModal(client);
    }

    /**
     * Show edit modal for client
     */
    showEditModal(client) {
        const editModal = document.createElement('div');
        editModal.className = 'edit-client-modal';
        editModal.innerHTML = `
            <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
            <div class="modal-container edit-modal-container">
                <div class="modal-header">
                    <h3>✏️ Edit Client: ${client.company_name}</h3>
                    <button class="btn-close" onclick="this.closest('.edit-client-modal').remove()">✕</button>
                </div>
                <div class="modal-content">
                    <form id="edit-client-form" onsubmit="window.clientListManager?.handleEditSubmit(event, '${client.client_id}')">
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">Company Name</label>
                                <input type="text" class="form-input" name="company_name" value="${client.company_name}" required>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Contact Name</label>
                                <input type="text" class="form-input" name="primary_contact_name" value="${client.primary_contact_name || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Email</label>
                                <input type="email" class="form-input" name="primary_contact_email" value="${client.primary_contact_email || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Phone</label>
                                <input type="text" class="form-input" name="phone" value="${client.phone || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Website</label>
                                <input type="url" class="form-input" name="website" value="${client.website || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Industry</label>
                                <input type="text" class="form-input" name="industry" value="${client.industry || ''}">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Subscription Tier</label>
                                <select class="form-input" name="subscription_tier">
                                    <option value="basic" ${client.subscription_tier === 'basic' ? 'selected' : ''}>Basic</option>
                                    <option value="standard" ${client.subscription_tier === 'standard' ? 'selected' : ''}>Standard</option>
                                    <option value="premium" ${client.subscription_tier === 'premium' ? 'selected' : ''}>Premium</option>
                                    <option value="enterprise" ${client.subscription_tier === 'enterprise' ? 'selected' : ''}>Enterprise</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Monthly Budget ($)</label>
                                <input type="number" class="form-input" name="monthly_budget_usd" value="${client.monthly_budget_usd}" min="0" step="0.01">
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Communication Style</label>
                                <select class="form-input" name="communication_style">
                                    <option value="professional" ${client.communication_style === 'professional' ? 'selected' : ''}>Professional</option>
                                    <option value="casual" ${client.communication_style === 'casual' ? 'selected' : ''}>Casual</option>
                                    <option value="technical" ${client.communication_style === 'technical' ? 'selected' : ''}>Technical</option>
                                    <option value="executive" ${client.communication_style === 'executive' ? 'selected' : ''}>Executive</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.edit-client-modal').remove()">
                                Cancel
                            </button>
                            <button type="submit" class="btn btn-primary">
                                💾 Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(editModal);
    }

    /**
     * Handle edit form submission
     */
    async handleEditSubmit(event, clientId) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const updateData = {};
        
        for (const [key, value] of formData.entries()) {
            const stringValue = String(value).trim();
            
            if (stringValue) {
                // Handle different field types
                if (key === 'monthly_budget_usd') {
                    const numValue = parseFloat(stringValue);
                    if (!isNaN(numValue) && numValue >= 0) {
                        updateData[key] = numValue;
                    }
                } else {
                    updateData[key] = stringValue;
                }
            }
        }
        
        try {
            // Validate that we have some data to update
            if (Object.keys(updateData).length === 0) {
                this.showErrorMessage('No valid data provided for update');
                return;
            }

            // Show loading state
            const submitBtn = event.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '🔄 Saving...';
            submitBtn.disabled = true;
            
            // Make API call to update client
            const response = await this.updateClient(clientId, updateData);
            
            if (response.success) {
                // Update local client data
                const clientIndex = this.clients.findIndex(c => c.client_id === clientId);
                if (clientIndex !== -1) {
                    this.clients[clientIndex] = { ...this.clients[clientIndex], ...response.client };
                }
                
                // Refresh the display
                this.applyFilters();
                
                // Close edit modal
                const editModal = document.querySelector('.edit-client-modal');
                if (editModal) {
                    editModal.remove();
                }
                
                // Show success message
                this.showSuccessMessage('Client updated successfully!');
                
            } else {
                throw new Error(response.error || 'Update failed');
            }
            
        } catch (error) {
            console.error('Failed to update client:', error);
            this.showErrorMessage(`Failed to update client: ${error.message}`);
            
            // Reset button
            const submitBtn = event.target.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = originalText || '💾 Save Changes';
                submitBtn.disabled = false;
            }
        }
    }

    /**
     * Update client via API
     */
    async updateClient(clientId, updateData) {
        // Use the existing API client with the new PUT endpoint
        return await this.apiClient.request(`/api/key-account-manager`, {
            method: 'POST',
            body: {
                endpoint: `/client/${clientId}`,
                method: 'PUT',
                data: updateData
            }
        });
    }

    // =============================================================================
    // UTILITY METHODS
    // =============================================================================

    /**
     * Get CSS class for status
     */
    getStatusClass(status) {
        const statusClasses = {
            'active': 'badge-success',
            'trial': 'badge-info',
            'suspended': 'badge-warning',
            'cancelled': 'badge-error'
        };
        return statusClasses[status] || 'badge-secondary';
    }

    /**
     * Get CSS class for subscription tier
     */
    getTierClass(tier) {
        const tierClasses = {
            'basic': 'badge-secondary',
            'standard': 'badge-info',
            'premium': 'badge-warning',
            'enterprise': 'badge-success'
        };
        return tierClasses[tier] || 'badge-secondary';
    }

    /**
     * Format tier display name
     */
    formatTier(tier) {
        return tier.charAt(0).toUpperCase() + tier.slice(1);
    }

    /**
     * Format status display name
     */
    formatStatus(status) {
        return status.charAt(0).toUpperCase() + status.slice(1);
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    /**
     * Calculate total budget
     */
    getTotalBudget() {
        return this.clients.reduce((sum, client) => sum + (client.monthly_budget_usd || 0), 0);
    }

    /**
     * Calculate total usage
     */
    getTotalUsage() {
        return this.clients.reduce((sum, client) => sum + (client.used_budget_current_month || 0), 0);
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        const contentElement = document.getElementById('client-list-content');
        if (contentElement) {
            contentElement.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner">🔄</div>
                    <p>Loading clients...</p>
                </div>
            `;
        }
    }

    /**
     * Show error state
     */
    showErrorState(errorMessage) {
        const contentElement = document.getElementById('client-list-content');
        if (contentElement) {
            contentElement.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h3>Failed to load clients</h3>
                    <p>${errorMessage}</p>
                    <button class="btn btn-primary" onclick="window.clientListManager?.show()">
                        🔄 Retry
                    </button>
                </div>
            `;
        }
    }

    /**
     * Show success message
     */
    showSuccessMessage(message) {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = 'toast toast-success';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    /**
     * Show error message
     */
    showErrorMessage(message) {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = 'toast toast-error';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    /**
     * Hide the modal
     */
    hide() {
        if (this.modalElement) {
            this.modalElement.remove();
            this.modalElement = null;
        }
        
        // Clean up global reference
        window.clientListManager = null;
    }

    /**
     * View client details (placeholder for future implementation)
     */
    viewClientDetails(clientId) {
        const client = this.clients.find(c => c.client_id === clientId);
        if (!client) return;
        
        // For now, just show an alert with client info
        alert(`Client Details:\n\nCompany: ${client.company_name}\nTier: ${client.subscription_tier}\nBudget: $${client.monthly_budget_usd}\nUsed: $${client.used_budget_current_month}`);
    }

    /**
     * Show add client modal (placeholder for future implementation)
     */
    showAddClient() {
        alert('Add Client functionality coming in Phase 2!');
    }

    /**
     * Render pagination (placeholder)
     */
    renderPagination() {
        return `
            <div class="pagination">
                <button class="btn btn-secondary btn-small">Previous</button>
                <span class="pagination-info">Page 1 of 1</span>
                <button class="btn btn-secondary btn-small">Next</button>
            </div>
        `;
    }
}

// Export for global use
window.ClientListManager = ClientListManager;