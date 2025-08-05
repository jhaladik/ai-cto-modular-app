/**
 * Clients Page Component - Clean Version
 * Simple client list with sorting - NO SEARCH FUNCTIONALITY
 */
class ClientsPage {
    constructor(apiClient) {
        this.apiClient = apiClient || window.apiClient;
        this.clients = [];
        this.filteredClients = [];
        this.currentSort = 'company_name';
        this.sortDirection = 'asc';
        this.isLoading = false;
        this.expandedRows = new Set();
        this.currentPage = 1;
        this.itemsPerPage = 15;
        
        // Bind methods for event handlers
        this.handleSort = this.handleSort.bind(this);
        this.toggleRowExpansion = this.toggleRowExpansion.bind(this);
        this.goToPage = this.goToPage.bind(this);
        this.refresh = this.refresh.bind(this);
    }

    /**
     * Render the clients page - NO SEARCH COMPONENTS
     */
    render() {
        return `
            <div class="admin-page clients-page">
                <!-- Page Header -->
                <div class="page-header">
                    <h1 class="page-title">👥 Client Management</h1>
                    <div class="page-actions">
                        <button class="btn btn-secondary" onclick="clientsPage.refresh()">
                            🔄 Refresh
                        </button>
                        <button class="btn btn-secondary" onclick="clientsPage.exportClients()">
                            📊 Export
                        </button>
                        <button class="btn btn-primary" onclick="clientsPage.showAddClient()">
                            ➕ Add Client
                        </button>
                    </div>
                </div>

                <!-- Summary Cards -->
                <div class="clients-summary" id="clients-summary">
                    <!-- Summary cards will be rendered here -->
                </div>

                <!-- Simple Controls - NO SEARCH -->
                <div class="clients-controls">
                    <div class="sort-controls">
                        <label for="sort-select">Sort by:</label>
                        <select id="sort-select" onchange="clientsPage.handleSort(event)">
                            <option value="company_name">Company Name</option>
                            <option value="created_at">Date Added</option>
                            <option value="subscription_tier">Subscription Tier</option>
                            <option value="account_status">Account Status</option>
                            <option value="monthly_budget_usd">Monthly Budget</option>
                        </select>
                        <button class="btn btn-small" onclick="clientsPage.toggleSortDirection()">
                            ${this.sortDirection === 'asc' ? '⬆️' : '⬇️'}
                        </button>
                    </div>
                    
                    <div class="view-controls">
                        <span class="results-count" id="results-count">
                            Showing ${this.filteredClients.length} clients
                        </span>
                    </div>
                </div>

                <!-- Clients Content -->
                <div id="clients-content" class="clients-content">
                    <!-- Clients will be rendered here -->
                </div>

                <!-- Pagination -->
                <div class="pagination-container">
                    <!-- Pagination will be rendered here -->
                </div>
            </div>
        `;
    }

    /**
     * Mount the component and load data
     */
    async mount() {
        console.log('📋 Mounting Clients Page...');
        
        // Render summary
        this.renderClientsSummary();
        
        // Load clients data
        await this.loadClients();
        
        console.log('✅ Clients Page mounted');
    }

    /**
     * Load clients from API
     */
    async loadClients() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        console.log('📡 Loading clients...');
        
        try {
            // Show loading state
            const contentElement = document.getElementById('clients-content');
            if (contentElement) {
                contentElement.innerHTML = this.renderLoadingState();
            }
            
            // Use real API data
            const result = await this.apiClient.kamRequest('/clients', 'GET');
            const clients = result.success ? result.clients : [];
            
            this.clients = clients;
            this.applySorting();
            this.updateContent();
            
            console.log(`✅ Loaded ${clients.length} clients`);
            
        } catch (error) {
            console.error('❌ Failed to load clients:', error);
            this.showError('Failed to load clients. Please try again.');
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Handle sort selection - NO SEARCH FILTERING
     */
    handleSort(event) {
        this.currentSort = event.target.value;
        this.applySorting();
        this.updateContent();
        console.log(`📊 Sorted by: ${this.currentSort} (${this.sortDirection})`);
    }

    /**
     * Toggle sort direction
     */
    toggleSortDirection() {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        this.applySorting();
        this.updateContent();
        
        // Update button icon
        const button = document.querySelector('.sort-controls button');
        if (button) {
            button.innerHTML = this.sortDirection === 'asc' ? '⬆️' : '⬇️';
        }
    }

    /**
     * Apply sorting only - no search filtering
     */
    applySorting() {
        let sorted = [...this.clients];

        // Apply sorting
        sorted.sort((a, b) => {
            const aVal = a[this.currentSort] || '';
            const bVal = b[this.currentSort] || '';
            
            let comparison;
            if (typeof aVal === 'string') {
                comparison = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
            } else {
                comparison = (aVal || 0) - (bVal || 0);
            }
            
            return this.sortDirection === 'asc' ? comparison : -comparison;
        });

        this.filteredClients = sorted;
        this.currentPage = 1; // Reset to first page when sorting
    }

    /**
     * Toggle row expansion for client details
     */
    toggleRowExpansion(clientId) {
        if (this.expandedRows.has(clientId)) {
            this.expandedRows.delete(clientId);
        } else {
            this.expandedRows.add(clientId);
        }
        this.updateContent();
    }

    /**
     * Navigate to client detail page
     */
    goToClientDetail(clientId) {
        if (window.router) {
            window.router.navigate(`/clients/${clientId}`);
        } else {
            console.warn('Router not available');
        }
    }

    /**
     * Pagination methods
     */
    goToPage(page) {
        const totalPages = Math.ceil(this.filteredClients.length / this.itemsPerPage);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.expandedRows.clear(); // Close expanded rows when changing pages
            this.updateContent();
        }
    }

    getPaginatedClients() {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return this.filteredClients.slice(start, end);
    }

    /**
     * Update content areas
     */
    updateContent() {
        // Update clients table
        const contentElement = document.getElementById('clients-content');
        if (contentElement) {
            contentElement.innerHTML = this.renderClientsTable();
        }

        // Update pagination
        const paginationElement = document.querySelector('.pagination-container');
        if (paginationElement) {
            paginationElement.innerHTML = this.renderPagination();
        }

        // Update results count
        const resultsCount = document.getElementById('results-count');
        if (resultsCount) {
            resultsCount.textContent = `Showing ${this.filteredClients.length} clients`;
        }

        // Update summary
        this.renderClientsSummary();
    }

    /**
     * Render clients table with expandable rows
     */
    renderClientsTable() {
        const clients = this.getPaginatedClients();
        
        if (clients.length === 0) {
            return `
                <div class="empty-state">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                    <h3>No Clients Found</h3>
                    <p>There are no clients to display.</p>
                    <button class="btn btn-primary" onclick="clientsPage.showAddClient()">
                        ➕ Add First Client
                    </button>
                </div>
            `;
        }

        return `
            <div class="expandable-table">
                ${clients.map(client => this.renderClientRow(client)).join('')}
            </div>
        `;
    }

    /**
     * Render individual client row
     */
    renderClientRow(client) {
        const isExpanded = this.expandedRows.has(client.client_id);
        const budgetPercentage = (client.used_budget_current_month / client.monthly_budget_usd) * 100;
        
        return `
            <div class="client-row ${isExpanded ? 'expanded' : ''}">
                <div class="client-row-header" onclick="clientsPage.toggleRowExpansion('${client.client_id}')">
                    <div class="client-info">
                        <div class="client-name">
                            <h4>${client.company_name}</h4>
                            <span class="client-email">${client.contact_email}</span>
                        </div>
                        <div class="client-meta">
                            <span class="tier-badge tier-${client.subscription_tier}">
                                ${this.formatTierName(client.subscription_tier)}
                            </span>
                            <span class="status-badge status-${client.account_status}">
                                ${client.account_status}
                            </span>
                        </div>
                    </div>
                    <div class="client-stats">
                        <div class="budget-info">
                            <div class="budget-text">
                                $${client.used_budget_current_month} / $${client.monthly_budget_usd}
                            </div>
                            <div class="budget-bar">
                                <div class="budget-progress" style="width: ${Math.min(budgetPercentage, 100)}%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="client-actions">
                        <button class="btn btn-small" onclick="event.stopPropagation(); clientsPage.goToClientDetail('${client.client_id}')">
                            View Details
                        </button>
                        <span class="expand-icon">${isExpanded ? '▼' : '▶'}</span>
                    </div>
                </div>
                
                ${isExpanded ? `
                    <div class="client-row-details">
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Industry</label>
                                <span>${client.industry}</span>
                            </div>
                            <div class="detail-item">
                                <label>Created</label>
                                <span>${new Date(client.created_at).toLocaleDateString()}</span>
                            </div>
                            <div class="detail-item">
                                <label>Last Activity</label>
                                <span>${new Date(client.last_activity).toLocaleDateString()}</span>
                            </div>
                            <div class="detail-item">
                                <label>Budget Usage</label>
                                <span>${budgetPercentage.toFixed(1)}%</span>
                            </div>
                        </div>
                        <div class="detail-actions">
                            <button class="btn btn-secondary btn-small" onclick="clientsPage.editClient('${client.client_id}')">
                                ✏️ Edit
                            </button>
                            <button class="btn btn-secondary btn-small" onclick="clientsPage.viewReports('${client.client_id}')">
                                📊 Reports
                            </button>
                            <button class="btn btn-secondary btn-small" onclick="clientsPage.viewBilling('${client.client_id}')">
                                💳 Billing
                            </button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render pagination controls
     */
    renderPagination() {
        const totalPages = Math.ceil(this.filteredClients.length / this.itemsPerPage);
        
        if (totalPages <= 1) return '';

        let pages = [];
        for (let i = 1; i <= totalPages; i++) {
            pages.push(`
                <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                        onclick="clientsPage.goToPage(${i})">
                    ${i}
                </button>
            `);
        }

        return `
            <div class="pagination">
                <button class="page-btn" 
                        onclick="clientsPage.goToPage(${this.currentPage - 1})"
                        ${this.currentPage === 1 ? 'disabled' : ''}>
                    ‹ Previous
                </button>
                ${pages.join('')}
                <button class="page-btn" 
                        onclick="clientsPage.goToPage(${this.currentPage + 1})"
                        ${this.currentPage === totalPages ? 'disabled' : ''}>
                    Next ›
                </button>
            </div>
        `;
    }

    /**
     * Render clients summary cards
     */
    renderClientsSummary() {
        const summaryElement = document.getElementById('clients-summary');
        if (!summaryElement) return;

        const totalClients = this.clients.length;
        const activeClients = this.clients.filter(c => c.account_status === 'active').length;
        const totalRevenue = this.clients.reduce((sum, c) => sum + (c.monthly_budget_usd || 0), 0);
        const totalUsage = this.clients.reduce((sum, c) => sum + (c.used_budget_current_month || 0), 0);

        summaryElement.innerHTML = `
            <div class="summary-grid">
                <div class="summary-card">
                    <div class="summary-value">${totalClients}</div>
                    <div class="summary-label">Total Clients</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value">${activeClients}</div>
                    <div class="summary-label">Active Clients</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value">$${totalRevenue.toLocaleString()}</div>
                    <div class="summary-label">Monthly Budget</div>
                </div>
                <div class="summary-card">
                    <div class="summary-value">$${totalUsage.toLocaleString()}</div>
                    <div class="summary-label">Usage This Month</div>
                </div>
            </div>
        `;
    }

    /**
     * Render loading state
     */
    renderLoadingState() {
        return `
            <div class="loading-state">
                <div class="loading-spinner">🔄</div>
                <div class="loading-text">Loading clients...</div>
            </div>
        `;
    }

    /**
     * Show error message
     */
    showError(message) {
        const contentElement = document.getElementById('clients-content');
        if (contentElement) {
            contentElement.innerHTML = `
                <div class="error-state">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
                    <h3>Error Loading Clients</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="clientsPage.refresh()">
                        🔄 Try Again
                    </button>
                </div>
            `;
        }
    }

    /**
     * Format tier name with icons
     */
    formatTierName(tier) {
        const tierNames = {
            'basic': '🥉 Basic',
            'standard': '🥈 Standard',
            'premium': '🥇 Premium',
            'enterprise': '💎 Enterprise'
        };
        return tierNames[tier] || '🔧 Unknown';
    }

    /**
     * Action methods (placeholder implementations)
     */
    async refresh() {
        console.log('🔄 Refreshing clients...');
        await this.loadClients();
    }

    showAddClient() {
        if (!window.SimpleModal) {
            alert('Modal component not loaded');
            return;
        }

        window.SimpleModal.show({
            title: '➕ Add New Client',
            size: 'large',
            content: `
                <form id="add-client-form">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                        <!-- Left Column - Basic Information -->
                        <div>
                            <h4 style="margin-bottom: 1rem; color: var(--text-primary);">Company Information</h4>
                            
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Company Name *</label>
                                <input type="text" name="company_name" required placeholder="Acme Corporation" class="form-input" style="width: 100%;">
                            </div>
                            
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Contact Name *</label>
                                <input type="text" name="contact_name" required placeholder="John Smith" class="form-input" style="width: 100%;">
                            </div>
                            
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Contact Email *</label>
                                <input type="email" name="contact_email" required placeholder="contact@company.com" class="form-input" style="width: 100%;">
                            </div>
                            
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Phone</label>
                                <input type="tel" name="phone" placeholder="+1 (555) 123-4567" class="form-input" style="width: 100%;">
                            </div>
                            
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Industry</label>
                                <select name="industry" class="form-select" style="width: 100%;">
                                    <option value="">Select Industry</option>
                                    <option value="Technology">Technology</option>
                                    <option value="Healthcare">Healthcare</option>
                                    <option value="Finance">Finance</option>
                                    <option value="Retail">Retail</option>
                                    <option value="Manufacturing">Manufacturing</option>
                                    <option value="Education">Education</option>
                                    <option value="Real Estate">Real Estate</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Company Size</label>
                                <select name="company_size" class="form-select" style="width: 100%;">
                                    <option value="">Select Size</option>
                                    <option value="1-10">1-10 employees</option>
                                    <option value="11-50">11-50 employees</option>
                                    <option value="51-200">51-200 employees</option>
                                    <option value="201-500">201-500 employees</option>
                                    <option value="500+">500+ employees</option>
                                </select>
                            </div>
                        </div>
                        
                        <!-- Right Column - Subscription & Address -->
                        <div>
                            <h4 style="margin-bottom: 1rem; color: var(--text-primary);">Subscription Details</h4>
                            
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Subscription Tier *</label>
                                <select name="subscription_tier" required class="form-select" style="width: 100%;">
                                    <option value="">Select Tier</option>
                                    <option value="basic">🥉 Basic - $99/mo</option>
                                    <option value="standard">🥈 Standard - $299/mo</option>
                                    <option value="premium">🥇 Premium - $599/mo</option>
                                    <option value="enterprise">💎 Enterprise - Custom</option>
                                </select>
                            </div>
                            
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Monthly Budget (USD) *</label>
                                <input type="number" name="monthly_budget_usd" required placeholder="1000" min="0" step="100" class="form-input" style="width: 100%;">
                                <small style="color: var(--text-secondary); font-size: 0.75rem;">Maximum monthly spend limit</small>
                            </div>
                            
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Account Status</label>
                                <select name="account_status" class="form-select" style="width: 100%;">
                                    <option value="trial">Trial (30 days)</option>
                                    <option value="active" selected>Active</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                            </div>
                            
                            <h4 style="margin-top: 1.5rem; margin-bottom: 1rem; color: var(--text-primary);">Address (Optional)</h4>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                                <div class="form-group" style="margin-bottom: 1rem;">
                                    <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Street</label>
                                    <input type="text" name="street" placeholder="123 Main St" class="form-input" style="width: 100%;">
                                </div>
                                
                                <div class="form-group" style="margin-bottom: 1rem;">
                                    <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">City</label>
                                    <input type="text" name="city" placeholder="San Francisco" class="form-input" style="width: 100%;">
                                </div>
                                
                                <div class="form-group" style="margin-bottom: 1rem;">
                                    <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">State</label>
                                    <input type="text" name="state" placeholder="CA" class="form-input" style="width: 100%;">
                                </div>
                                
                                <div class="form-group" style="margin-bottom: 1rem;">
                                    <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">ZIP</label>
                                    <input type="text" name="zip" placeholder="94105" class="form-input" style="width: 100%;">
                                </div>
                            </div>
                            
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Country</label>
                                <input type="text" name="country" placeholder="United States" value="United States" class="form-input" style="width: 100%;">
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 1.5rem; padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius); font-size: 0.875rem;">
                        <strong>Note:</strong> The client will receive welcome emails with onboarding instructions and API credentials after creation.
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
                    text: 'Create Client',
                    class: 'btn-primary',
                    onclick: "clientsPage.handleAddClient()"
                }
            ]
        });
    }

    async handleAddClient() {
        const form = document.getElementById('add-client-form');
        const formData = new FormData(form);
        
        // Build client data
        const clientData = {
            company_name: formData.get('company_name'),
            contact_name: formData.get('contact_name'),
            contact_email: formData.get('contact_email'),
            phone: formData.get('phone') || null,
            industry: formData.get('industry') || null,
            company_size: formData.get('company_size') || null,
            subscription_tier: formData.get('subscription_tier'),
            monthly_budget_usd: parseFloat(formData.get('monthly_budget_usd')),
            account_status: formData.get('account_status') || 'active'
        };

        // Build address if provided
        const street = formData.get('street');
        const city = formData.get('city');
        const state = formData.get('state');
        const zip = formData.get('zip');
        const country = formData.get('country');
        
        if (street || city || state || zip) {
            clientData.address = {
                street: street || '',
                city: city || '',
                state: state || '',
                zip: zip || '',
                country: country || 'United States'
            };
        }

        // Validate required fields
        if (!clientData.company_name || !clientData.contact_name || !clientData.contact_email || 
            !clientData.subscription_tier || !clientData.monthly_budget_usd) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            // Show loading state
            const createBtn = document.querySelector('.btn-primary');
            const originalText = createBtn.textContent;
            createBtn.textContent = 'Creating...';
            createBtn.disabled = true;
            
            const response = await this.apiClient.kamRequest('/clients', 'POST', clientData);
            
            if (response.success) {
                // Close all modals
                document.querySelectorAll('.modal-overlay').forEach(modal => modal.remove());
                document.body.style.overflow = ''; // Restore body scroll
                
                // Show success message
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
                successDiv.textContent = 'Client created successfully!';
                document.body.appendChild(successDiv);
                
                setTimeout(() => successDiv.remove(), 3000);
                
                // Reload clients
                await this.loadClients();
            } else {
                // Restore button state
                createBtn.textContent = originalText;
                createBtn.disabled = false;
                alert('Failed to create client: ' + (response.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error creating client:', error);
            // Restore button state
            const createBtn = document.querySelector('.btn-primary');
            if (createBtn) {
                createBtn.textContent = 'Create Client';
                createBtn.disabled = false;
            }
            alert('Failed to create client: ' + error.message);
        }
    }

    exportClients() {
        console.log('📊 Exporting clients...');
        alert('Export functionality coming soon!\n\nThis will download a CSV of all clients.');
    }

    editClient(clientId) {
        console.log(`✏️ Editing client: ${clientId}`);
        alert(`Edit client functionality coming soon!\n\nClient ID: ${clientId}`);
    }

    viewReports(clientId) {
        console.log(`📊 Viewing reports for client: ${clientId}`);
        if (window.router) {
            window.router.navigate(`/clients/${clientId}/reports`);
        }
    }

    viewBilling(clientId) {
        console.log(`💳 Viewing billing for client: ${clientId}`);
        if (window.router) {
            window.router.navigate(`/clients/${clientId}/billing`);
        }
    }
}

// Global instance for event handlers
window.ClientsPage = ClientsPage;