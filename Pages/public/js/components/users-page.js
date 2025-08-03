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
        this.isLoading = false;
    }

    render() {
        return `
            <div class="users-page">
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

                <!-- Filters and Search -->
                <div class="card" style="margin-top: 2rem;">
                    <div class="card-body">
                        <div class="filters-section" style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                            <div style="flex: 1; min-width: 250px;">
                                <input 
                                    type="text" 
                                    placeholder="🔍 Search users by name or email..." 
                                    class="form-input"
                                    id="user-search"
                                    onkeyup="window.usersPage.handleSearch(event)"
                                    style="width: 100%;"
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
                            <button class="btn btn-secondary" onclick="window.usersPage.resetFilters()">
                                Reset
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Bulk Actions -->
                <div class="bulk-actions" id="bulk-actions" style="display: none; margin-top: 1rem;">
                    <div class="card">
                        <div class="card-body" style="display: flex; align-items: center; gap: 1rem;">
                            <span id="selected-count">0 users selected</span>
                            <button class="btn btn-small" onclick="window.usersPage.bulkActivate()">Activate</button>
                            <button class="btn btn-small" onclick="window.usersPage.bulkSuspend()">Suspend</button>
                            <button class="btn btn-small btn-danger" onclick="window.usersPage.bulkDelete()">Delete</button>
                            <button class="btn btn-small btn-secondary" onclick="window.usersPage.clearSelection()">Clear</button>
                        </div>
                    </div>
                </div>

                <!-- Users Table -->
                <div class="card" style="margin-top: 1rem;">
                    <div class="card-body">
                        <div id="users-loading" style="text-align: center; padding: 2rem; display: none;">
                            <div class="spinner"></div>
                            <p>Loading users...</p>
                        </div>
                        <div id="users-error" style="text-align: center; padding: 2rem; display: none;">
                            <p style="color: var(--danger);">Failed to load users</p>
                            <button class="btn btn-small" onclick="window.usersPage.loadUsers()">Retry</button>
                        </div>
                        <div id="users-table-container">
                            <table class="data-table" id="users-table">
                                <thead>
                                    <tr>
                                        <th style="width: 40px;">
                                            <input type="checkbox" id="select-all" onchange="window.usersPage.toggleSelectAll()">
                                        </th>
                                        <th onclick="window.usersPage.toggleSort('username')" style="cursor: pointer;">
                                            User <span class="sort-indicator">↕</span>
                                        </th>
                                        <th onclick="window.usersPage.toggleSort('email')" style="cursor: pointer;">
                                            Email <span class="sort-indicator">↕</span>
                                        </th>
                                        <th onclick="window.usersPage.toggleSort('role')" style="cursor: pointer;">
                                            Role <span class="sort-indicator">↕</span>
                                        </th>
                                        <th>Client</th>
                                        <th onclick="window.usersPage.toggleSort('status')" style="cursor: pointer;">
                                            Status <span class="sort-indicator">↕</span>
                                        </th>
                                        <th onclick="window.usersPage.toggleSort('last_login')" style="cursor: pointer;">
                                            Last Login <span class="sort-indicator">↕</span>
                                        </th>
                                        <th onclick="window.usersPage.toggleSort('created_at')" style="cursor: pointer;">
                                            Created <span class="sort-indicator">↕</span>
                                        </th>
                                        <th style="width: 100px;">Actions</th>
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
                        
                        <!-- Pagination -->
                        <div class="pagination" id="pagination-container" style="margin-top: 1rem;">
                            <!-- Pagination will be rendered here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async mount() {
        console.log('📋 Mounting users page...');
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
        const tbody = document.getElementById('users-tbody');
        if (!tbody) return;

        // Apply filters
        let filteredUsers = this.filterUsers();
        
        // Apply sorting
        filteredUsers = this.sortUsers(filteredUsers);
        
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

        tbody.innerHTML = paginatedUsers.map(user => `
            <tr>
                <td>
                    <input type="checkbox" 
                           value="${user.id}" 
                           onchange="window.usersPage.toggleUserSelection('${user.id}')"
                           ${this.selectedUsers.has(user.id) ? 'checked' : ''}>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div class="user-avatar" style="width: 32px; height: 32px; background: var(--primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.875rem;">
                            ${this.getInitials(user.full_name || user.username)}
                        </div>
                        <div>
                            <div style="font-weight: 500;">${this.escapeHtml(user.full_name || user.username)}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">@${this.escapeHtml(user.username)}</div>
                        </div>
                    </div>
                </td>
                <td>${this.escapeHtml(user.email)}</td>
                <td>
                    <span class="role-badge role-${user.role}">${this.formatRole(user.role)}</span>
                </td>
                <td>
                    ${user.client_id ? `<a href="#/clients/${user.client_id}" class="link">${user.client_id}</a>` : '-'}
                </td>
                <td>
                    <span class="status-badge status-${user.account_status || 'active'}">${this.formatStatus(user.account_status)}</span>
                </td>
                <td>${this.formatDate(user.last_login) || 'Never'}</td>
                <td>${this.formatDate(user.created_at)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-small" onclick="window.usersPage.editUser('${user.id}')" title="Edit">
                            ✏️
                        </button>
                        <button class="btn btn-small btn-danger" onclick="window.usersPage.deleteUser('${user.id}')" title="Delete">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

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

        window.SimpleModal.show({
            title: '➕ Add New User',
            size: 'medium',
            content: `
                <form id="add-user-form" style="display: grid; gap: 1rem;">
                    <div class="form-group">
                        <label>Username *</label>
                        <input type="text" name="username" required placeholder="johndoe" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" name="email" required placeholder="john@example.com" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>Full Name *</label>
                        <input type="text" name="full_name" required placeholder="John Doe" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>Password *</label>
                        <input type="password" name="password" required placeholder="********" class="form-input">
                        <small style="color: var(--text-secondary);">Minimum 8 characters</small>
                    </div>
                    <div class="form-group">
                        <label>Role *</label>
                        <select name="role" required class="form-select">
                            <option value="">Select Role</option>
                            <option value="admin">Administrator</option>
                            <option value="client">Client User</option>
                            <option value="support">Support Staff</option>
                        </select>
                    </div>
                    <div class="form-group" id="client-select-group" style="display: none;">
                        <label>Client</label>
                        <select name="client_id" class="form-select">
                            <option value="">Select Client</option>
                            <!-- Will be populated dynamically -->
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Department</label>
                        <input type="text" name="department" placeholder="Engineering, Sales, etc." class="form-input">
                    </div>
                </form>
            `,
            primaryButton: {
                text: 'Add User',
                onClick: () => this.handleAddUser()
            }
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
            client_id: formData.get('client_id') || null,
            department: formData.get('department') || null
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

        try {
            const response = await this.apiClient.kamRequest('/users', 'POST', userData);
            
            if (response.success) {
                window.SimpleModal.close();
                this.showSuccess('User created successfully');
                await this.loadUsers();
            } else {
                alert('Failed to create user: ' + (response.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error creating user:', error);
            alert('Failed to create user');
        }
    }

    async editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        // TODO: Implement edit user modal
        alert('Edit user functionality coming soon!');
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

    // Bulk Actions
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
        // TODO: Implement import functionality
        alert('Import functionality coming soon!');
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