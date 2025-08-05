// Users Management Page Component
// Path: /js/components/users-page.js

class UsersPage {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.currentPage = 1;
        this.pageSize = 10;
        this.searchTerm = '';
        this.filterRole = 'all';
        this.filterStatus = 'all';
        this.sortBy = 'created_at';
        this.sortOrder = 'desc';
        this.users = [];
        this.selectedUsers = new Set();
        this.expandedRows = new Set();
        this.isLoading = false;
        this.clientsMap = new Map(); // Store client_id -> company_name mapping
    }

    render() {
        return `
            <div class="admin-page users-page">
                <div class="page-header">
                    <h1 class="page-title">👥 User Management</h1>
                    <div class="page-actions">
                        <button class="btn btn-secondary" onclick="window.usersPage.exportUsers()">
                            📤 Export
                        </button>
                        <button class="btn btn-secondary" onclick="window.usersPage.importUsers()">
                            📥 Import
                        </button>
                        <button class="btn btn-primary" onclick="window.usersPage.showAddUser()">
                            ➕ Add User
                        </button>
                    </div>
                </div>

                <!-- Statistics -->
                <div class="metrics-grid" id="user-stats">
                    <div class="metric-card">
                        <div class="metric-value">-</div>
                        <div class="metric-label">Total Users</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">-</div>
                        <div class="metric-label">Active Users</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">-</div>
                        <div class="metric-label">Admin Users</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">-</div>
                        <div class="metric-label">Client Users</div>
                    </div>
                </div>

                <!-- Controls Section -->
                <div class="users-controls">
                    <div class="filter-controls">
                        <div class="search-control">
                            <input 
                                type="text" 
                                placeholder="🔍 Search users by name or email..." 
                                class="form-input"
                                id="user-search"
                                onkeyup="window.usersPage.handleSearch(event)"
                            >
                        </div>
                        <select class="form-select" id="role-filter" onchange="window.usersPage.handleFilterChange()">
                            <option value="all">All Roles</option>
                            <option value="admin">Administrators</option>
                            <option value="client">Client Users</option>
                            <option value="support">Support Staff</option>
                        </select>
                        <select class="form-select" id="status-filter" onchange="window.usersPage.handleFilterChange()">
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="pending">Pending</option>
                        </select>
                        <button class="btn btn-small" onclick="window.usersPage.resetFilters()">
                            Reset
                        </button>
                    </div>
                    
                    <div class="view-controls">
                        <span class="results-count" id="results-count">
                            Showing ${this.users.length} users
                        </span>
                    </div>
                </div>

                <!-- Bulk Actions -->
                <div class="bulk-actions" id="bulk-actions" style="display: none; margin-top: 1rem;">
                    <div class="content-section">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <span id="selected-count">0 users selected</span>
                            <button class="btn btn-small" onclick="window.usersPage.bulkActivate()">Activate</button>
                            <button class="btn btn-small" onclick="window.usersPage.bulkSuspend()">Suspend</button>
                            <button class="btn btn-small btn-danger" onclick="window.usersPage.bulkDelete()">Delete</button>
                            <button class="btn btn-small btn-secondary" onclick="window.usersPage.clearSelection()">Clear</button>
                        </div>
                    </div>
                </div>

                <!-- Users Table -->
                <div id="users-loading" style="text-align: center; padding: 2rem; display: none;">
                    <div class="spinner"></div>
                    <p>Loading users...</p>
                </div>
                <div id="users-error" style="text-align: center; padding: 2rem; display: none;">
                    <p style="color: var(--danger);">Failed to load users</p>
                    <button class="btn btn-small" onclick="window.usersPage.loadUsers()">Retry</button>
                </div>
                <div class="users-content">
                    <div id="users-table-container">
                            <table class="data-table" id="users-table">
                                <thead>
                                    <tr>
                                        <th>
                                            <input type="checkbox" id="select-all" onchange="window.usersPage.toggleSelectAll()">
                                        </th>
                                        <th onclick="window.usersPage.toggleSort('username')" style="cursor: pointer;">
                                            User <span class="sort-indicator">↕</span>
                                        </th>
                                        <th onclick="window.usersPage.toggleSort('role')" style="cursor: pointer;">
                                            Role <span class="sort-indicator">↕</span>
                                        </th>
                                        <th>Client</th>
                                        <th onclick="window.usersPage.toggleSort('status')" style="cursor: pointer;">
                                            Status <span class="sort-indicator">↕</span>
                                        </th>
                                        <th onclick="window.usersPage.toggleSort('created_at')" style="cursor: pointer;">
                                            Created <span class="sort-indicator">↕</span>
                                        </th>
                                        <th>Actions</th>
                                        <th style="width: 40px;"></th>
                                    </tr>
                                </thead>
                                <tbody id="users-tbody">
                                    <!-- Users will be populated here -->
                                </tbody>
                            </table>
                            <div id="no-users" style="text-align: center; padding: 2rem; display: none;">
                                <p>No users found</p>
                            </div>
                    </div>
                </div>
                
                <!-- Pagination -->
                <div class="pagination" id="pagination-container" style="margin-top: 1rem;">
                    <!-- Pagination will be rendered here -->
                </div>
            </div>
        `;
    }

    async mount() {
        console.log('📋 Mounting users page...');
        console.log('🔑 API Client session token:', this.apiClient.sessionToken ? 'Present' : 'Missing');
        console.log('🔑 Session token length:', this.apiClient.sessionToken?.length || 0);
        await this.loadUsers();
    }

    async loadUsers() {
        this.isLoading = true;
        this.showLoading();

        try {
            // Get users from API
            const response = await this.apiClient.kamRequest('/users', 'GET');
            
            if (response.success) {
                this.users = response.users || [];
                this.updateStats(response.stats);
                
                // Load client information for users with client_id
                await this.loadClientInfo();
                
                this.renderUsers();
            } else {
                this.showError();
            }
        } catch (error) {
            console.error('Failed to load users:', error);
            this.showError();
        } finally {
            this.isLoading = false;
        }
    }

    async loadClientInfo() {
        try {
            // Check if user is admin first
            const currentUser = this.apiClient.getCurrentUser();
            console.log('🔍 Current user:', currentUser);
            
            // Only load clients if we're an admin (admins can see all clients)
            if (!currentUser || (currentUser.role !== 'admin' && currentUser.userType !== 'admin')) {
                console.log('⚠️ Not an admin, skipping client info load');
                return;
            }
            
            // Get unique client IDs
            const clientIds = [...new Set(this.users.filter(u => u.client_id).map(u => u.client_id))];
            
            if (clientIds.length === 0) {
                console.log('ℹ️ No client IDs to load');
                return;
            }
            
            console.log('📋 Loading client info for IDs:', clientIds);
            
            // Fetch all clients
            const clientsResponse = await this.apiClient.getClients();
            
            if (clientsResponse.success && clientsResponse.clients) {
                // Build map of client_id -> company_name
                clientsResponse.clients.forEach(client => {
                    this.clientsMap.set(client.client_id, client.company_name);
                });
                console.log('✅ Loaded client info for', this.clientsMap.size, 'clients');
            }
        } catch (error) {
            // Check if it's a 404 error (expected for non-admin users)
            if (error.message && error.message.includes('404')) {
                console.log('ℹ️ Client endpoint not accessible (expected for non-admin users)');
            } else {
                console.error('Failed to load client info:', error);
            }
            // Don't fail the whole page if client info fails
        }
    }

    updateStats(stats) {
        if (!stats) return;
        
        const statsContainer = document.getElementById('user-stats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="metric-card">
                    <div class="metric-value">${stats.total_users || 0}</div>
                    <div class="metric-label">Total Users</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${stats.active_users || 0}</div>
                    <div class="metric-label">Active Users</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${stats.admin_users || 0}</div>
                    <div class="metric-label">Admin Users</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${stats.client_users || 0}</div>
                    <div class="metric-label">Client Users</div>
                </div>
            `;
        }
    }

    renderUsers() {
        // Hide loading state
        document.getElementById('users-loading').style.display = 'none';
        document.getElementById('users-error').style.display = 'none';
        
        const tbody = document.getElementById('users-tbody');
        if (!tbody) return;

        // Apply filters
        let filteredUsers = this.filterUsers();
        
        // Apply sorting
        filteredUsers = this.sortUsers(filteredUsers);
        
        // Update results count
        const resultsCount = document.getElementById('results-count');
        if (resultsCount) {
            resultsCount.textContent = `Showing ${filteredUsers.length} of ${this.users.length} users`;
        }
        
        // Apply pagination
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

        if (paginatedUsers.length === 0) {
            document.getElementById('users-table-container').style.display = 'none';
            document.getElementById('no-users').style.display = 'block';
            return;
        }

        document.getElementById('users-table-container').style.display = 'block';
        document.getElementById('no-users').style.display = 'none';

        tbody.innerHTML = paginatedUsers.map(user => {
            const isExpanded = this.expandedRows && this.expandedRows.has(user.id);
            return `
                <tr class="user-row ${isExpanded ? 'expanded' : ''}" data-user-id="${user.id}" style="cursor: pointer;" onclick="window.usersPage.toggleRow('${user.id}')">
                    <td onclick="event.stopPropagation();">
                        <input type="checkbox" 
                               value="${user.id}" 
                               onchange="window.usersPage.toggleUserSelection('${user.id}')"
                               ${this.selectedUsers.has(user.id) ? 'checked' : ''}>
                    </td>
                    <td>
                        <div class="user-info">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <strong>${this.escapeHtml(user.full_name || user.username)}</strong>
                                ${this.hasNotes(user.id) ? '<span style="color: var(--warning);" title="Has notes">📌</span>' : ''}
                                <span style="color: var(--text-secondary); font-size: 0.875rem;">• ${this.escapeHtml(user.email)}</span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="role-badge role-${user.role}">${this.formatRole(user.role)}</span>
                    </td>
                    <td>
                        ${user.client_id ? `<a href="#/clients/${user.client_id}" class="link" onclick="event.stopPropagation();">${this.getClientName(user.client_id)}</a>` : '-'}
                    </td>
                    <td>
                        <span class="status-badge status-${user.account_status || 'active'}">${this.formatStatus(user.account_status)}</span>
                    </td>
                    <td>
                        <div style="font-size: 0.75rem;">
                            ${this.formatDate(user.created_at)}
                        </div>
                    </td>
                    <td>
                        <div class="action-buttons" style="display: flex; gap: 0.25rem;" onclick="event.stopPropagation();">
                            <button class="btn btn-icon" onclick="window.usersPage.deleteUser('${user.id}')" title="Delete">
                                🗑️
                            </button>
                        </div>
                    </td>
                    <td style="text-align: center; width: 40px;">
                        <div class="expand-icon" style="transition: transform 0.2s;">
                            ${isExpanded ? '▼' : '▶'}
                        </div>
                    </td>
                </tr>
                ${isExpanded ? this.renderExpandedRow(user) : ''}
            `;
        }).join('');

        // Update pagination
        this.renderPagination(filteredUsers.length);
        
        // Update selection UI
        this.updateSelectionUI();
    }

    filterUsers() {
        return this.users.filter(user => {
            // Search filter
            if (this.searchTerm) {
                const search = this.searchTerm.toLowerCase();
                const matchesSearch = 
                    user.username.toLowerCase().includes(search) ||
                    user.email.toLowerCase().includes(search) ||
                    (user.full_name && user.full_name.toLowerCase().includes(search));
                
                if (!matchesSearch) return false;
            }

            // Role filter
            if (this.filterRole !== 'all' && user.role !== this.filterRole) {
                return false;
            }

            // Status filter
            if (this.filterStatus !== 'all' && user.account_status !== this.filterStatus) {
                return false;
            }

            return true;
        });
    }

    sortUsers(users) {
        return [...users].sort((a, b) => {
            let aVal = a[this.sortBy];
            let bVal = b[this.sortBy];

            // Handle null/undefined values
            if (aVal == null) aVal = '';
            if (bVal == null) bVal = '';

            // Convert to lowercase for string comparison
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();

            if (this.sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
    }

    renderPagination(totalItems) {
        const totalPages = Math.ceil(totalItems / this.pageSize);
        const container = document.getElementById('pagination-container');
        
        if (!container || totalPages <= 1) {
            if (container) container.innerHTML = '';
            return;
        }

        let html = '<div style="display: flex; align-items: center; justify-content: space-between;">';
        
        // Page info
        html += `<span>Showing ${((this.currentPage - 1) * this.pageSize) + 1}-${Math.min(this.currentPage * this.pageSize, totalItems)} of ${totalItems} users</span>`;
        
        // Page buttons
        html += '<div style="display: flex; gap: 0.5rem;">';
        
        // Previous button
        html += `<button class="btn btn-small" onclick="window.usersPage.goToPage(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''}>Previous</button>`;
        
        // Page numbers
        for (let i = 1; i <= Math.min(totalPages, 5); i++) {
            html += `<button class="btn btn-small ${i === this.currentPage ? 'btn-primary' : ''}" onclick="window.usersPage.goToPage(${i})">${i}</button>`;
        }
        
        if (totalPages > 5) {
            html += '<span>...</span>';
            html += `<button class="btn btn-small ${totalPages === this.currentPage ? 'btn-primary' : ''}" onclick="window.usersPage.goToPage(${totalPages})">${totalPages}</button>`;
        }
        
        // Next button
        html += `<button class="btn btn-small" onclick="window.usersPage.goToPage(${this.currentPage + 1})" ${this.currentPage === totalPages ? 'disabled' : ''}>Next</button>`;
        
        html += '</div></div>';
        
        container.innerHTML = html;
    }

    // User Actions
    async showAddUser() {
        if (!window.SimpleModal) {
            alert('Modal component not loaded');
            return;
        }

        // Check permissions first for non-admin users
        const currentUser = this.apiClient.getCurrentUser();
        if (currentUser && currentUser.role !== 'admin') {
            try {
                const permissionCheck = await this.apiClient.checkPermission('add_users');
                if (!permissionCheck.allowed) {
                    alert(permissionCheck.reason || 'You do not have permission to add users');
                    return;
                }
            } catch (error) {
                console.error('Failed to check permissions:', error);
            }
        }

        window.SimpleModal.show({
            title: '➕ Add New User',
            size: 'medium',
            content: `
                <form id="add-user-form">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <!-- Left Column -->
                        <div>
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Username *</label>
                                <input type="text" name="username" required placeholder="johndoe" class="form-input" style="width: 100%;">
                            </div>
                            
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Email *</label>
                                <input type="email" name="email" required placeholder="john@example.com" class="form-input" style="width: 100%;">
                            </div>
                            
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Full Name *</label>
                                <input type="text" name="full_name" required placeholder="John Doe" class="form-input" style="width: 100%;">
                            </div>
                            
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Password *</label>
                                <input type="password" name="password" required placeholder="Min. 8 characters" class="form-input" style="width: 100%;">
                                <small style="color: var(--text-secondary); font-size: 0.75rem;">Must be at least 8 characters</small>
                            </div>
                        </div>
                        
                        <!-- Right Column -->
                        <div>
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Role *</label>
                                <select name="role" required class="form-select" style="width: 100%;">
                                    <option value="">Select Role</option>
                                    <option value="admin">Administrator</option>
                                    <option value="client">Client User</option>
                                    <option value="support">Support Staff</option>
                                </select>
                            </div>
                            
                            <div class="form-group" id="client-select-group" style="display: none; margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Client</label>
                                <select name="client_id" class="form-select" style="width: 100%;">
                                    <option value="">Select Client</option>
                                    <!-- Will be populated dynamically -->
                                </select>
                            </div>
                            
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Department</label>
                                <input type="text" name="department" placeholder="Engineering, Sales, etc." class="form-input" style="width: 100%;">
                            </div>
                            
                            <div class="form-group" style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.25rem; font-weight: 500;">Status</label>
                                <select name="status" class="form-select" style="width: 100%;">
                                    <option value="active">Active</option>
                                    <option value="pending">Pending Activation</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius); font-size: 0.875rem;">
                        <strong>Note:</strong> User will receive an email with login instructions after creation.
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
                    text: 'Save User',
                    class: 'btn-primary',
                    onclick: "window.usersPage.handleAddUser()"
                }
            ],
        });

        // Add role change handler
        document.querySelector('select[name="role"]').addEventListener('change', (e) => {
            const clientGroup = document.getElementById('client-select-group');
            if (e.target.value === 'client') {
                clientGroup.style.display = 'block';
                this.loadClientOptions();
            } else {
                clientGroup.style.display = 'none';
            }
        });
    }

    async handleAddUser() {
        const form = document.getElementById('add-user-form');
        const formData = new FormData(form);
        
        const userData = {
            username: formData.get('username'),
            email: formData.get('email'),
            full_name: formData.get('full_name'),
            password: formData.get('password'),
            role: formData.get('role'),
            user_type: formData.get('role'), // Add user_type for backend compatibility
            client_id: formData.get('client_id') || null,
            department: formData.get('department') || null,
            status: formData.get('status') || 'active'
        };

        // Validate
        if (!userData.username || !userData.email || !userData.password || !userData.role) {
            alert('Please fill in all required fields');
            return;
        }

        if (userData.password.length < 8) {
            alert('Password must be at least 8 characters');
            return;
        }

        // If client role is selected but no client is chosen
        if (userData.role === 'client' && !userData.client_id) {
            alert('Please select a client for client users');
            return;
        }

        try {
            // Show loading state
            const saveBtn = document.querySelector('.btn-primary');
            const originalText = saveBtn.textContent;
            saveBtn.textContent = 'Creating...';
            saveBtn.disabled = true;
            
            const response = await this.apiClient.kamRequest('/users', 'POST', userData);
            
            if (response.success) {
                // Close all modals
                document.querySelectorAll('.modal-overlay').forEach(modal => modal.remove());
                document.body.style.overflow = ''; // Restore body scroll
                
                this.showSuccessMessage('User created successfully');
                await this.loadUsers();
            } else {
                // Restore button state
                saveBtn.textContent = originalText;
                saveBtn.disabled = false;
                alert('Failed to create user: ' + (response.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error creating user:', error);
            // Restore button state
            const saveBtn = document.querySelector('.btn-primary');
            if (saveBtn) {
                saveBtn.textContent = 'Save User';
                saveBtn.disabled = false;
            }
            alert('Failed to create user: ' + error.message);
        } finally {
            // Ensure button is restored in all cases
            const saveBtn = document.querySelector('.btn-primary');
            if (saveBtn && saveBtn.textContent === 'Creating...') {
                saveBtn.textContent = 'Save User';
                saveBtn.disabled = false;
            }
        }
    }

    editUser(userId) {
        // Just toggle the row expansion for inline editing
        this.toggleRow(userId);
    }

    async deleteUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        if (!confirm(`Are you sure you want to delete user "${user.username}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await this.apiClient.kamRequest(`/users/${userId}`, 'DELETE');
            
            if (response.success) {
                this.showSuccess('User deleted successfully');
                await this.loadUsers();
            } else {
                alert('Failed to delete user: ' + (response.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user');
        }
    }

    async resetPassword(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        if (!window.SimpleModal) {
            alert('Modal component not loaded');
            return;
        }

        window.SimpleModal.show({
            title: '🔑 Reset Password',
            size: 'small',
            content: `
                <form id="reset-password-form" style="display: grid; gap: 1rem;">
                    <div class="card" style="background: var(--bg-secondary); padding: 1rem;">
                        <p style="margin: 0; font-size: 0.875rem;">
                            Reset password for <strong>${this.escapeHtml(user.username)}</strong>
                            <br>
                            <span style="color: var(--text-secondary);">${this.escapeHtml(user.email)}</span>
                        </p>
                    </div>
                    <div class="form-group">
                        <label>New Password *</label>
                        <input type="password" name="new_password" required placeholder="Enter new password" class="form-input">
                        <small style="color: var(--text-secondary);">Minimum 8 characters</small>
                    </div>
                    <div class="form-group">
                        <label>Confirm Password *</label>
                        <input type="password" name="confirm_password" required placeholder="Confirm new password" class="form-input">
                    </div>
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" name="notify_user" checked>
                            Send password reset notification to user
                        </label>
                    </div>
                </form>
            `,
            primaryButton: {
                text: 'Reset Password',
                onClick: () => this.handleResetPassword(userId)
            }
        });
    }

    async handleResetPassword(userId) {
        const form = document.getElementById('reset-password-form');
        const formData = new FormData(form);
        
        const newPassword = formData.get('new_password');
        const confirmPassword = formData.get('confirm_password');
        const notifyUser = formData.get('notify_user');

        // Validate
        if (!newPassword || !confirmPassword) {
            alert('Please enter both password fields');
            return;
        }

        if (newPassword.length < 8) {
            alert('Password must be at least 8 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        try {
            // Note: In production, this should be a specific password reset endpoint
            // For now, we'll show a message that this needs backend implementation
            alert('Password reset functionality needs backend implementation.\n\nIn production, this would:\n1. Hash the new password\n2. Update the user record\n3. Invalidate existing sessions\n4. Send email notification if requested');
            
            window.SimpleModal.close();
            
            // TODO: Implement backend endpoint for password reset
            // const response = await this.apiClient.kamRequest(`/users/${userId}/reset-password`, 'POST', {
            //     new_password: newPassword,
            //     notify_user: notifyUser
            // });
            
        } catch (error) {
            console.error('Error resetting password:', error);
            alert('Failed to reset password');
        }
    }


    renderNotesHistory(userId) {
        const historyKey = `user-notes-history-${userId}`;
        const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
        
        if (history.length === 0) {
            return '<p style="color: var(--text-secondary);">No notes history</p>';
        }
        
        return history.map(entry => `
            <div style="margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                    <strong>${this.escapeHtml(entry.author)}</strong>
                    <span style="color: var(--text-secondary); font-size: 0.75rem;">
                        ${this.formatDate(entry.date)}
                    </span>
                </div>
                <div style="color: var(--text-secondary);">
                    ${this.escapeHtml(entry.notes)}
                </div>
            </div>
        `).join('');
    }

    hasNotes(userId) {
        const notesKey = `user-notes-${userId}`;
        return localStorage.getItem(notesKey) !== null;
    }

    toggleRow(userId) {
        if (this.expandedRows.has(userId)) {
            this.expandedRows.delete(userId);
        } else {
            this.expandedRows.add(userId);
        }
        this.renderUsers();
    }

    renderExpandedRow(user) {
        const notes = localStorage.getItem(`user-notes-${user.id}`) || '';
        
        return `
            <tr class="expanded-content">
                <td colspan="8">
                    <div class="expanded-details" style="
                        padding: 1.5rem;
                        background: var(--bg-secondary);
                        border-radius: var(--radius);
                        margin: 0.5rem 0;
                    ">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                            <!-- Left Column - User Details & Edit -->
                            <div>
                                <h4 style="margin-bottom: 1rem;">User Details</h4>
                                <form id="edit-user-form-${user.id}" style="display: grid; gap: 0.75rem;">
                                    <div class="form-group">
                                        <label>Username</label>
                                        <input type="text" name="username" value="${this.escapeHtml(user.username)}" class="form-input">
                                    </div>
                                    <div class="form-group">
                                        <label>Email</label>
                                        <input type="email" name="email" value="${this.escapeHtml(user.email)}" class="form-input">
                                    </div>
                                    <div class="form-group">
                                        <label>Full Name</label>
                                        <input type="text" name="full_name" value="${this.escapeHtml(user.full_name || '')}" class="form-input">
                                    </div>
                                    <div class="form-group">
                                        <label>Role</label>
                                        <select name="role" class="form-select" ${user.role === 'admin' ? 'disabled' : ''}>
                                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrator</option>
                                            <option value="client" ${user.role === 'client' ? 'selected' : ''}>Client User</option>
                                            <option value="support" ${user.role === 'support' ? 'selected' : ''}>Support Staff</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Status</label>
                                        <select name="status" class="form-select">
                                            <option value="active" ${user.account_status === 'active' ? 'selected' : ''}>Active</option>
                                            <option value="suspended" ${user.account_status === 'suspended' ? 'selected' : ''}>Suspended</option>
                                            <option value="pending" ${user.account_status === 'pending' ? 'selected' : ''}>Pending</option>
                                        </select>
                                    </div>
                                    ${user.role === 'client' ? `
                                        <div class="form-group">
                                            <label>Client</label>
                                            <select name="client_id" class="form-select">
                                                <option value="">-- No Client --</option>
                                                ${this.renderClientOptions(user.client_id)}
                                            </select>
                                        </div>
                                    ` : ''}
                                    <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                                        <button type="button" class="btn btn-primary" onclick="window.usersPage.saveUserChanges('${user.id}')">
                                            💾 Save Changes
                                        </button>
                                        <button type="button" class="btn btn-secondary" onclick="window.usersPage.resetUserPassword('${user.id}')">
                                            🔑 Reset Password
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <!-- Right Column - Notes & Activity -->
                            <div>
                                <h4 style="margin-bottom: 1rem;">Notes & Activity</h4>
                                <div class="form-group">
                                    <label>Notes</label>
                                    <textarea 
                                        id="user-notes-${user.id}" 
                                        class="form-input" 
                                        rows="5" 
                                        placeholder="Add notes about this user..."
                                        style="resize: vertical;"
                                    >${this.escapeHtml(notes)}</textarea>
                                    <button type="button" class="btn btn-small" style="margin-top: 0.5rem;" onclick="window.usersPage.saveNotes('${user.id}')">
                                        📝 Save Notes
                                    </button>
                                </div>
                                
                                <div style="margin-top: 1.5rem;">
                                    <h5>Account Information</h5>
                                    <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.5rem;">
                                        <div>Created: ${this.formatDate(user.created_at)}</div>
                                        <div>Last Login: ${user.last_login ? this.formatDate(user.last_login) : 'Never'}</div>
                                        <div>Login Count: ${user.login_count || 0}</div>
                                        ${user.department ? `<div>Department: ${this.escapeHtml(user.department)}</div>` : ''}
                                    </div>
                                </div>

                                <div style="margin-top: 1.5rem;">
                                    <h5>Notes History</h5>
                                    <div style="
                                        margin-top: 0.5rem;
                                        padding: 0.75rem;
                                        background: var(--background);
                                        border-radius: var(--radius);
                                        max-height: 150px;
                                        overflow-y: auto;
                                        font-size: 0.813rem;
                                    ">
                                        ${this.renderNotesHistory(user.id)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }

    renderClientOptions(selectedClientId) {
        const clients = Array.from(this.clientsMap.entries());
        return clients.map(([clientId, clientName]) => `
            <option value="${clientId}" ${clientId === selectedClientId ? 'selected' : ''}>
                ${this.escapeHtml(clientName)}
            </option>
        `).join('');
    }

    async saveUserChanges(userId) {
        const form = document.getElementById(`edit-user-form-${userId}`);
        if (!form) return;

        const formData = new FormData(form);
        const updates = {};
        
        // Get the changes
        ['username', 'email', 'full_name', 'role', 'status', 'client_id'].forEach(field => {
            const value = formData.get(field);
            if (value !== null) {
                updates[field] = value;
            }
        });

        // Map status to account_status
        if (updates.status) {
            updates.account_status = updates.status;
            delete updates.status;
        }

        try {
            const response = await this.apiClient.kamRequest(`/users/${userId}`, 'PUT', updates);
            if (response.success) {
                // Update local data
                const userIndex = this.users.findIndex(u => u.id === userId);
                if (userIndex !== -1) {
                    Object.assign(this.users[userIndex], updates);
                }
                
                // Re-render
                this.renderUsers();
                
                // Show success
                this.showSuccessMessage('User updated successfully');
            } else {
                alert('Failed to update user: ' + (response.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error updating user:', error);
            
            // Check for session expiration
            if (error.message && error.message.includes('401')) {
                alert('Your session has expired. Please log in again.');
                // Redirect to login
                window.location.href = '/login.html';
            } else {
                alert('Failed to update user: ' + error.message);
            }
        }
    }

    async saveNotes(userId) {
        const textarea = document.getElementById(`user-notes-${userId}`);
        if (!textarea) return;

        const notes = textarea.value.trim();
        const notesKey = `user-notes-${userId}`;
        
        if (notes) {
            localStorage.setItem(notesKey, notes);
            
            // Add to history
            const historyKey = `user-notes-history-${userId}`;
            const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
            history.unshift({
                date: new Date().toISOString(),
                notes: notes,
                author: this.apiClient.getCurrentUser()?.username || 'Unknown'
            });
            
            if (history.length > 10) {
                history.length = 10;
            }
            
            localStorage.setItem(historyKey, JSON.stringify(history));
        } else {
            localStorage.removeItem(notesKey);
        }

        // Re-render to update history
        this.renderUsers();
        this.showSuccessMessage('Notes saved successfully');
    }

    async resetUserPassword(userId) {
        if (!confirm('Are you sure you want to reset this user\'s password?')) {
            return;
        }

        // For now, just show a message
        alert('Password reset functionality will be implemented when the backend endpoint is ready.');
        
        // TODO: When backend is ready:
        // const response = await this.apiClient.kamRequest(`/users/${userId}/reset-password`, 'POST');
    }

    showLoadingMessage(message) {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'import-loading';
        loadingDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--surface);
            border: 1px solid var(--border);
            padding: 2rem;
            border-radius: var(--radius);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            text-align: center;
        `;
        loadingDiv.innerHTML = `
            <div style="font-size: 2rem; margin-bottom: 1rem;">⏳</div>
            <div>${message}</div>
        `;
        document.body.appendChild(loadingDiv);
        
        // Remove after import completes
        setTimeout(() => {
            const element = document.getElementById('import-loading');
            if (element) element.remove();
        }, 30000); // Safety timeout
    }
    
    showSuccessMessage(message) {
        // Remove any existing loading message
        const loadingElement = document.getElementById('import-loading');
        if (loadingElement) loadingElement.remove();
        
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--success);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--radius);
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        successDiv.textContent = message;
        document.body.appendChild(successDiv);
        
        setTimeout(() => successDiv.remove(), 3000);
    }

    // Bulk Actions
    async bulkActivate() {
        const count = this.selectedUsers.size;
        if (count === 0) return;
        
        if (!confirm(`Are you sure you want to activate ${count} user${count > 1 ? 's' : ''}?`)) {
            return;
        }
        
        await this.performBulkAction('activate');
    }
    
    async bulkSuspend() {
        const count = this.selectedUsers.size;
        if (count === 0) return;
        
        if (!confirm(`Are you sure you want to suspend ${count} user${count > 1 ? 's' : ''}?`)) {
            return;
        }
        
        await this.performBulkAction('suspend');
    }
    
    async bulkDelete() {
        const count = this.selectedUsers.size;
        if (count === 0) return;
        
        if (!confirm(`Are you sure you want to delete ${count} user${count > 1 ? 's' : ''}? This action cannot be undone.`)) {
            return;
        }
        
        await this.performBulkAction('delete');
    }
    
    async performBulkAction(action) {
        const userIds = Array.from(this.selectedUsers);
        let successCount = 0;
        let failCount = 0;
        
        this.showLoading();
        
        for (const userId of userIds) {
            try {
                let response;
                
                if (action === 'delete') {
                    response = await this.apiClient.kamRequest(`/users/${userId}`, 'DELETE');
                } else {
                    // For activate/suspend, update the status
                    const status = action === 'activate' ? 'active' : 'suspended';
                    response = await this.apiClient.kamRequest(`/users/${userId}`, 'PUT', { status });
                }
                
                if (response.success) {
                    successCount++;
                } else {
                    failCount++;
                    console.error(`Failed to ${action} user ${userId}:`, response.error);
                }
            } catch (error) {
                failCount++;
                console.error(`Error during ${action} for user ${userId}:`, error);
            }
        }
        
        // Clear selection
        this.clearSelection();
        
        // Show result
        if (failCount === 0) {
            this.showSuccess(`Successfully ${action}d ${successCount} user${successCount > 1 ? 's' : ''}`);
        } else {
            alert(`Operation completed with errors:\n✓ Success: ${successCount}\n✗ Failed: ${failCount}`);
        }
        
        // Reload users
        await this.loadUsers();
    }
    
    toggleSelectAll() {
        const selectAll = document.getElementById('select-all');
        const checkboxes = document.querySelectorAll('#users-tbody input[type="checkbox"]');
        
        if (selectAll.checked) {
            checkboxes.forEach(cb => {
                cb.checked = true;
                this.selectedUsers.add(cb.value);
            });
        } else {
            checkboxes.forEach(cb => {
                cb.checked = false;
                this.selectedUsers.delete(cb.value);
            });
        }
        
        this.updateSelectionUI();
    }

    toggleUserSelection(userId) {
        if (this.selectedUsers.has(userId)) {
            this.selectedUsers.delete(userId);
        } else {
            this.selectedUsers.add(userId);
        }
        
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        const bulkActions = document.getElementById('bulk-actions');
        const selectedCount = document.getElementById('selected-count');
        
        if (this.selectedUsers.size > 0) {
            bulkActions.style.display = 'block';
            selectedCount.textContent = `${this.selectedUsers.size} user${this.selectedUsers.size === 1 ? '' : 's'} selected`;
        } else {
            bulkActions.style.display = 'none';
        }
    }

    clearSelection() {
        this.selectedUsers.clear();
        document.querySelectorAll('#users-tbody input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        document.getElementById('select-all').checked = false;
        this.updateSelectionUI();
    }

    // Filters and Search
    handleSearch(event) {
        if (event.key === 'Enter' || event.type === 'keyup') {
            this.searchTerm = event.target.value;
            this.currentPage = 1;
            this.renderUsers();
        }
    }

    handleFilterChange() {
        this.filterRole = document.getElementById('role-filter').value;
        this.filterStatus = document.getElementById('status-filter').value;
        this.currentPage = 1;
        this.renderUsers();
    }

    resetFilters() {
        this.searchTerm = '';
        this.filterRole = 'all';
        this.filterStatus = 'all';
        this.currentPage = 1;
        
        document.getElementById('user-search').value = '';
        document.getElementById('role-filter').value = 'all';
        document.getElementById('status-filter').value = 'all';
        
        this.renderUsers();
    }

    // Sorting
    toggleSort(field) {
        if (this.sortBy === field) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortBy = field;
            this.sortOrder = 'asc';
        }
        
        this.renderUsers();
    }

    // Pagination
    goToPage(page) {
        const totalPages = Math.ceil(this.filterUsers().length / this.pageSize);
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.renderUsers();
    }

    // Import/Export
    async exportUsers() {
        try {
            const filteredUsers = this.filterUsers();
            const csv = this.convertToCSV(filteredUsers);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            
            this.showSuccess(`Exported ${filteredUsers.length} users`);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export users');
        }
    }

    importUsers() {
        const modal = new SimpleModal({
            title: '📥 Import Users from CSV',
            content: `
                <div style="padding: 1rem;">
                    <p style="margin-bottom: 1rem;">Upload a CSV file with the following columns:</p>
                    <ul style="margin-bottom: 1rem; padding-left: 1.5rem;">
                        <li>username (required)</li>
                        <li>email (required)</li>
                        <li>full_name</li>
                        <li>role (admin/client/support)</li>
                        <li>client_id (for client users)</li>
                        <li>password (required)</li>
                    </ul>
                    <div style="margin-bottom: 1rem;">
                        <a href="#" onclick="window.usersPage.downloadCSVTemplate(event)" style="color: var(--primary); text-decoration: underline;">
                            📄 Download CSV Template
                        </a>
                    </div>
                    <input type="file" id="csv-file" accept=".csv" style="margin-bottom: 1rem;">
                    <div id="import-preview" style="margin-top: 1rem;"></div>
                </div>
            `,
            actions: [
                {
                    text: 'Cancel',
                    class: 'btn-secondary',
                    onclick: "document.getElementById('modal-import').close()"
                },
                {
                    text: 'Import',
                    class: 'btn-primary',
                    onclick: "window.usersPage.processCSVImport()"
                }
            ],
            id: 'modal-import'
        });
        modal.show();
        
        // Add file change listener
        document.getElementById('csv-file').addEventListener('change', (e) => {
            this.previewCSV(e.target.files[0]);
        });
    }
    
    async previewCSV(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const lines = text.split('\n').filter(line => line.trim());
            const headers = lines[0].split(',').map(h => h.trim());
            
            const preview = document.getElementById('import-preview');
            if (lines.length > 1) {
                preview.innerHTML = `
                    <div style="background: var(--bg-secondary); padding: 1rem; border-radius: var(--radius);">
                        <p><strong>Preview:</strong> ${lines.length - 1} users found</p>
                        <p style="font-size: 0.875rem; color: var(--text-secondary);">First user: ${lines[1]}</p>
                    </div>
                `;
            } else {
                preview.innerHTML = '<p style="color: var(--error);">No data found in CSV</p>';
            }
        };
        reader.readAsText(file);
    }
    
    async processCSVImport() {
        const fileInput = document.getElementById('csv-file');
        if (!fileInput.files[0]) {
            alert('Please select a CSV file');
            return;
        }
        
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                const lines = text.split('\n').filter(line => line.trim());
                
                if (lines.length < 2) {
                    alert('CSV file is empty or has no data rows');
                    return;
                }
                
                const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                const requiredFields = ['username', 'email', 'password'];
                
                // Validate headers
                for (const field of requiredFields) {
                    if (!headers.includes(field)) {
                        alert(`Missing required column: ${field}`);
                        return;
                    }
                }
                
                // Parse users
                const users = [];
                const errors = [];
                
                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(',').map(v => v.trim());
                    if (values.length !== headers.length) continue;
                    
                    const user = {};
                    headers.forEach((header, index) => {
                        user[header] = values[index];
                    });
                    
                    // Validate user data
                    if (!user.username || !user.email || !user.password) {
                        errors.push(`Row ${i + 1}: Missing required fields`);
                        continue;
                    }
                    
                    // Set defaults
                    user.role = user.role || 'client';
                    if (!['admin', 'client', 'support'].includes(user.role)) {
                        errors.push(`Row ${i + 1}: Invalid role '${user.role}'`);
                        continue;
                    }
                    
                    users.push(user);
                }
                
                if (errors.length > 0) {
                    alert('Validation errors:\n' + errors.slice(0, 5).join('\n') + 
                          (errors.length > 5 ? `\n... and ${errors.length - 5} more` : ''));
                    return;
                }
                
                if (users.length === 0) {
                    alert('No valid users found in CSV');
                    return;
                }
                
                // Close modal and show progress
                document.getElementById('modal-import').close();
                this.showLoadingMessage(`Importing ${users.length} users...`);
                
                // Import users one by one
                let successCount = 0;
                const importErrors = [];
                
                for (const user of users) {
                    try {
                        const response = await this.apiClient.kamRequest('/users', 'POST', {
                            username: user.username,
                            email: user.email,
                            password: user.password,
                            full_name: user.full_name || user.username,
                            role: user.role,
                            user_type: user.role,
                            client_id: user.client_id || null
                        });
                        
                        if (response.success) {
                            successCount++;
                        } else {
                            importErrors.push(`${user.email}: ${response.error || 'Failed'}`);
                        }
                    } catch (error) {
                        importErrors.push(`${user.email}: ${error.message}`);
                    }
                }
                
                // Show results
                if (successCount === users.length) {
                    this.showSuccessMessage(`Successfully imported ${successCount} users`);
                } else {
                    alert(`Import completed:\n✅ Success: ${successCount}\n❌ Failed: ${importErrors.length}\n\n` +
                          'Errors:\n' + importErrors.slice(0, 5).join('\n') +
                          (importErrors.length > 5 ? `\n... and ${importErrors.length - 5} more` : ''));
                }
                
                // Reload users
                await this.loadUsers();
                
            } catch (error) {
                console.error('CSV import error:', error);
                alert('Failed to import CSV: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    }
    
    downloadCSVTemplate(event) {
        event.preventDefault();
        
        const template = `username,email,full_name,role,client_id,password
johndoe,john.doe@example.com,John Doe,client,client_001,SecurePass123!
janesmith,jane.smith@example.com,Jane Smith,admin,,AdminPass456!
bobwilson,bob.wilson@example.com,Bob Wilson,support,,SupportPass789!
alicejones,alice.jones@example.com,Alice Jones,client,client_002,ClientPass321!`;
        
        const blob = new Blob([template], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'users_import_template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    }

    // Helper Methods
    showLoading() {
        document.getElementById('users-loading').style.display = 'block';
        document.getElementById('users-error').style.display = 'none';
        document.getElementById('users-table-container').style.display = 'none';
        document.getElementById('no-users').style.display = 'none';
    }

    showError() {
        document.getElementById('users-loading').style.display = 'none';
        document.getElementById('users-error').style.display = 'block';
        document.getElementById('users-table-container').style.display = 'none';
        document.getElementById('no-users').style.display = 'none';
    }

    showSuccess(message) {
        // TODO: Implement toast notifications
        console.log('✅', message);
    }

    async loadClientOptions() {
        try {
            const response = await this.apiClient.getClients();
            const select = document.querySelector('select[name="client_id"]');
            
            if (response.success && response.clients) {
                select.innerHTML = '<option value="">Select Client</option>' + 
                    response.clients.map(client => 
                        `<option value="${client.client_id}">${this.escapeHtml(client.company_name)}</option>`
                    ).join('');
            }
        } catch (error) {
            console.error('Failed to load clients:', error);
        }
    }

    getInitials(name) {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length > 1) {
            return parts[0][0] + parts[parts.length - 1][0];
        }
        return name.substring(0, 2).toUpperCase();
    }

    getClientName(clientId) {
        return this.clientsMap.get(clientId) || clientId;
    }

    formatRole(role) {
        const roles = {
            admin: 'Administrator',
            client: 'Client User',
            support: 'Support Staff'
        };
        return roles[role] || role;
    }

    formatStatus(status) {
        return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Active';
    }

    formatDate(dateString) {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    convertToCSV(users) {
        const headers = ['Username', 'Email', 'Full Name', 'Role', 'Status', 'Client ID', 'Department', 'Last Login', 'Created'];
        const rows = users.map(user => [
            user.username,
            user.email,
            user.full_name || '',
            user.role,
            user.account_status || 'active',
            user.client_id || '',
            user.department || '',
            user.last_login || '',
            user.created_at
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        return csvContent;
    }
}

// Export for use
window.UsersPage = UsersPage;