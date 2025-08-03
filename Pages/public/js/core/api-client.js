// AI Factory Unified API Client
// File: /js/core/api-client.js

/**
 * Unified API Client for AI Factory
 * Handles KAM, Workers, and future services with consistent interface
 */
class AIFactoryAPIClient {
    constructor() {
        this.sessionToken = localStorage.getItem('bitware-session-token');
        this.baseHeaders = {
            'Content-Type': 'application/json',
            'x-bitware-session-token': this.sessionToken  // Use lowercase header consistently
        };
    }

    /**
     * Update session token if it changes
     */
    updateSessionToken(newToken) {
        this.sessionToken = newToken;
        this.baseHeaders['x-bitware-session-token'] = newToken;
    }

    /**
     * Generic request handler with consistent error handling
     */
    async request(endpoint, options = {}) {
        try {
            const response = await fetch(endpoint, {
                method: options.method || 'GET',
                headers: {
                    ...this.baseHeaders,
                    ...options.headers
                },
                body: options.body ? JSON.stringify(options.body) : undefined
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API Request failed: ${endpoint}`, error);
            throw error;
        }
    }

    /**
     * KAM API wrapper - handles proxy format
     */
    async kamRequest(endpoint, method = 'GET', data = {}) {
        return this.request('/api/key-account-manager', {
            method: 'POST',
            body: {
                endpoint,
                method,
                data
            }
        });
    }

    /**
     * Worker API wrapper - handles proxy format
     */
    async workerRequest(workerName, endpoint, method = 'GET', data = {}) {
        return this.request(`/api/${workerName}`, {
            method: 'POST',
            body: {
                endpoint,
                method,
                data
            }
        });
    }

    // =============================================================================
    // KAM (Key Account Manager) Operations
    // =============================================================================

    /**
     * Get admin statistics
     */
    async getAdminStats() {
        return this.kamRequest('/admin/stats');
    }

    /**
     * Get client list
     */
    async getClients() {
        return this.kamRequest('/admin/clients');
    }

    /**
     * Get client by ID - primary method used by client-detail-page.js
     */
    async getClient(clientId) {
        // Use the RESTful endpoint we'll add to backend
        return this.kamRequest(`/client/${clientId}`, 'GET');
    }

    // REMOVED: getClientDetail - use getClient() instead
    // TODO: Implement these methods when endpoints are ready:
    // - getClientAnalytics(clientId, timeRange)
    // - getClientCommunications(clientId, limit, offset)
    // - getClientRequests(clientId, limit, offset, status)
    // - getClientDeliverables(clientId, limit, offset)
        /**
     * Update client information
     */
    async updateClient(clientId, updates) {
        console.log(`✏️ Updating client: ${clientId}`, updates);
        
        return this.kamRequest('/client', 'PUT', {
            client_id: clientId,
            ...updates
        });
    }

    /**
     * Get client's budget and usage information
     */
    async getClientBudgetInfo(clientId) {
        console.log(`💰 Fetching budget info for client: ${clientId}`);
        
        return this.kamRequest('/client-budget', 'GET', {
            client_id: clientId
        });
    }

    /**
     * Send message to client (through communication processing)
     */
    async sendClientMessage(clientId, message, channel = 'dashboard') {
        console.log(`📨 Sending message to client: ${clientId}`);
        
        return this.kamRequest('/client-message', 'POST', {
            client_id: clientId,
            message,
            channel,
            from_admin: true
        });
    }

    /**
     * Get client transparency data for a specific request
     */
    async getClientRequestTransparency(clientId, requestId) {
        console.log(`🔍 Fetching transparency for client: ${clientId}, request: ${requestId}`);
        
        return this.kamRequest(`/request/${requestId}/transparency`, 'GET', {
            client_id: clientId
        });
    }

    async getClientDetailDashboard(clientId) {
        console.log(`📊 Loading dashboard for client: ${clientId}`);
        
        // Use the new dashboard endpoint
        return this.kamRequest(`/client/${clientId}/dashboard`, 'GET');
    }
    
    async getRecentActivity() {
        return this.kamRequest('/admin/recent-activity');
    }

    // REMOVED: getClientDetails - use getClient() instead
    // REMOVED: Duplicate updateClient method that was using wrong endpoint

    // =============================================================================
    // Universal Researcher Operations
    // =============================================================================

    /**
     * Execute research
     */
    async executeResearch(topic, depth = 2, options = {}) {
        const endpoint = `/?topic=${encodeURIComponent(topic)}&depth=${depth}`;
        return this.workerRequest('universal-researcher', endpoint);
    }

    /**
     * Get research session status
     */
    async getResearchStatus(sessionId) {
        return this.workerRequest('universal-researcher', `/session/${sessionId}/status`);
    }

    /**
     * Get research session results
     */
    async getResearchResults(sessionId) {
        return this.workerRequest('universal-researcher', `/session/${sessionId}/results`);
    }

    /**
     * Get researcher health
     */
    async getResearcherHealth() {
        return this.workerRequest('universal-researcher', '/health');
    }

    /**
     * Get researcher capabilities
     */
    async getResearcherCapabilities() {
        return this.workerRequest('universal-researcher', '/capabilities');
    }

    /**
     * Get researcher stats
     */
    async getResearcherStats() {
        return this.workerRequest('universal-researcher', '/admin/stats');
    }

    // =============================================================================
    // Generic Worker Operations (for future workers)
    // =============================================================================

    /**
     * Get worker health
     */
    async getWorkerHealth(workerName) {
        return this.workerRequest(workerName, '/health');
    }

    /**
     * Get worker capabilities
     */
    async getWorkerCapabilities(workerName) {
        return this.workerRequest(workerName, '/capabilities');
    }

    /**
     * Get worker stats
     */
    async getWorkerStats(workerName) {
        return this.workerRequest(workerName, '/admin/stats');
    }

    /**
     * Execute worker template
     */
    async executeWorkerTemplate(workerName, templateName, parameters = {}) {
        return this.workerRequest(workerName, '/execute', 'POST', {
            template: templateName,
            parameters
        });
    }

    // =============================================================================
    // Client-Specific Operations (for client dashboard)
    // =============================================================================

    /**
     * Get client-specific statistics and usage data
     */
    async getClientStats() {
        // TODO: Replace with dedicated KAM endpoint when implemented
        // For now, use admin stats and let client dashboard filter them
        return this.kamRequest('/admin/stats');
    }

    /**
     * Get client's own requests and their status
     */
    async getMyRequests(limit = 10, offset = 0) {
        return this.kamRequest('/my-requests', 'GET', { limit, offset });
    }

    /**
     * Get client's deliverables (reports, content, etc.)
     */
    async getMyDeliverables(projectId = null) {
        const params = projectId ? { project_id: projectId } : {};
        return this.kamRequest('/my-deliverables', 'GET', params);
    }

    /**
     * Get client's usage analytics
     */
    async getMyUsageAnalytics(timeRange = '30d') {
        return this.kamRequest('/my-analytics', 'GET', { time_range: timeRange });
    }

    /**
     * Get templates available to current client's tier
     */
    async getMyAvailableTemplates() {
        return this.kamRequest('/my-templates');
    }

    /**
     * Submit a client request with natural language processing
     */
    async submitClientRequest(requestData) {
        return this.kamRequest('/request/submit', 'POST', requestData);
    }

    /**
     * Get client's subscription and billing info
     */
    async getMySubscription() {
        return this.kamRequest('/my-subscription');
    }

    /**
     * Update client preferences
     */
    async updateMyPreferences(preferences) {
        return this.kamRequest('/my-preferences', 'PUT', preferences);
    }

    /**
     * Get user projects
     */
    async getProjects() {
        return this.kamRequest('/projects');
    }

    /**
     * Create new project
     */
    async createProject(projectData) {
        return this.kamRequest('/projects', 'POST', projectData);
    }

    /**
     * Get project details
     */
    async getProject(projectId) {
        return this.kamRequest(`/projects/${projectId}`);
    }

    /**
     * Update project
     */
    async updateProject(projectId, updates) {
        return this.kamRequest(`/projects/${projectId}`, 'PUT', updates);
    }

    /**
     * Get project requests
     */
    async getProjectRequests(projectId) {
        return this.kamRequest(`/projects/${projectId}/requests`);
    }

    // =============================================================================
    // Template Operations (future)
    // =============================================================================

    /**
     * Get available templates for user
     */
    async getAvailableTemplates(workerName = null) {
        const endpoint = workerName ? `/templates?worker=${workerName}` : '/templates';
        return this.kamRequest(endpoint);
    }

    /**
     * Get template details
     */
    async getTemplate(templateId) {
        return this.kamRequest(`/templates/${templateId}`);
    }

    // =============================================================================
    // Batch Operations
    // =============================================================================

    /**
     * Get dashboard data (multiple API calls in parallel)
     */
    async getDashboardData() {
        try {
            const [stats, researcherHealth] = await Promise.allSettled([
                this.getAdminStats(),
                this.getResearcherHealth()
            ]);

            return {
                stats: stats.status === 'fulfilled' ? stats.value : null,
                statsError: stats.status === 'rejected' ? stats.reason : null,
                researcherHealth: researcherHealth.status === 'fulfilled' ? researcherHealth.value : null,
                researcherError: researcherHealth.status === 'rejected' ? researcherHealth.reason : null
            };
        } catch (error) {
            console.error('Dashboard data fetch failed:', error);
            throw error;
        }
    }

    /**
     * Get all worker health statuses
     */
    async getAllWorkerHealth() {
        const workers = ['universal-researcher']; // Add more workers as they're implemented
        
        const healthChecks = workers.map(async (worker) => {
            try {
                const health = await this.getWorkerHealth(worker);
                return { worker, health, error: null };
            } catch (error) {
                return { worker, health: null, error: error.message };
            }
        });

        return Promise.all(healthChecks);
    }

    // =============================================================================
    // Utility Methods
    // =============================================================================

    /**
     * Check if client is authenticated
     */
    isAuthenticated() {
        return !!this.sessionToken;
    }

    /**
     * Get current user info
     */
    getCurrentUser() {
        try {
            const userInfo = localStorage.getItem('bitware-user-info');
            return userInfo ? JSON.parse(userInfo) : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Check if current user is admin
     */
    isAdmin() {
        const user = this.getCurrentUser();
        return user && (user.role === 'admin' || user.userType === 'admin' || user.userType === 'internal');
    }

    /**
     * Get user's subscription tier
     */
    getUserTier() {
        const user = this.getCurrentUser();
        return user?.subscription_tier || 'basic';
    }
}

// Export for use in other modules
window.AIFactoryAPIClient = AIFactoryAPIClient;

// Create global instance
window.apiClient = new AIFactoryAPIClient();