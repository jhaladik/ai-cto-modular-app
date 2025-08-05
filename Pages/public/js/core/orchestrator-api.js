/**
 * Orchestrator 2.0 API Client
 * Handles all communication with the Orchestrator 2.0 worker through the Pages proxy
 */
class OrchestratorAPI {
    constructor() {
        this.proxyUrl = '/api/orchestrator';
        this.refreshSessionToken();
    }

    /**
     * Refresh session token from localStorage
     */
    refreshSessionToken() {
        this.sessionToken = localStorage.getItem('bitware-session-token');
    }

    /**
     * Make authenticated request to orchestrator through the proxy (KAM pattern)
     */
    async request(endpoint, options = {}) {
        // Refresh token before each request
        this.refreshSessionToken();
        
        const headers = {
            'Content-Type': 'application/json',
            'x-bitware-session-token': this.sessionToken
        };

        try {
            console.log(`[Orchestrator API] Request: ${options.method || 'GET'} ${endpoint}`);
            
            // Use KAM pattern - POST to proxy with endpoint/method/data
            const response = await fetch(this.proxyUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    endpoint: endpoint,
                    method: options.method || 'GET',
                    data: options.body ? JSON.parse(options.body) : {}
                })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Request failed' }));
                console.error(`[Orchestrator API] Error response:`, error);
                throw new Error(error.error || error.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log(`[Orchestrator API] Success:`, data);
            return data;
        } catch (error) {
            console.error(`[Orchestrator API] Request failed: ${endpoint}`, error);
            throw error;
        }
    }

    // ============= PIPELINE OPERATIONS =============

    /**
     * Execute a pipeline with given template and parameters
     */
    async executePipeline(templateName, parameters, clientId) {
        return this.request('/execute', {
            method: 'POST',
            body: JSON.stringify({
                template_name: templateName,
                parameters,
                client_id: clientId,
                priority: parameters.priority || 'normal'
            })
        });
    }

    /**
     * Get execution status
     */
    async getExecutionStatus(executionId) {
        return this.request(`/execution/${executionId}`);
    }

    /**
     * Get execution progress (real-time updates)
     */
    async getExecutionProgress(executionId) {
        return this.request(`/progress/${executionId}`);
    }

    /**
     * Cancel a running execution
     */
    async cancelExecution(executionId) {
        return this.request(`/execution/${executionId}/cancel`, {
            method: 'POST'
        });
    }

    /**
     * Retry a failed execution
     */
    async retryExecution(executionId) {
        return this.request(`/execution/${executionId}/retry`, {
            method: 'POST'
        });
    }

    /**
     * Get execution queue
     */
    async getQueue(filters = {}) {
        const params = new URLSearchParams(filters);
        return this.request(`/queue?${params}`);
    }

    /**
     * Get execution history
     */
    async getExecutionHistory(filters = {}) {
        const params = new URLSearchParams(filters);
        return this.request(`/queue?${params}`); // Using queue endpoint for now
    }

    // ============= TEMPLATE MANAGEMENT =============

    /**
     * Get all templates
     */
    async getTemplates() {
        return this.request('/templates');
    }

    /**
     * Get template details
     */
    async getTemplateDetails(templateName) {
        return this.request(`/templates/${templateName}`);
    }

    /**
     * Sync templates with KAM
     */
    async syncTemplates() {
        return this.request('/templates/sync', {
            method: 'POST'
        });
    }

    /**
     * Estimate execution cost and time
     */
    async estimateExecution(templateName, parameters) {
        return this.request('/estimate', {
            method: 'POST',
            body: JSON.stringify({
                template_name: templateName,
                parameters
            })
        });
    }

    // ============= RESOURCE MANAGEMENT =============

    /**
     * Get current resource status
     */
    async getResourceStatus() {
        return this.request('/resources/status');
    }

    /**
     * Get resource availability
     */
    async getResourceAvailability() {
        return this.request('/resources/availability');
    }

    /**
     * Check specific resource availability
     */
    async checkResourceAvailability(resources) {
        return this.request('/resources/check', {
            method: 'POST',
            body: JSON.stringify({ resources })
        });
    }

    /**
     * Get resource usage history
     */
    async getResourceHistory(timeRange = '24h') {
        return this.request(`/resources/history?range=${timeRange}`);
    }

    /**
     * Get client quotas
     */
    async getClientQuotas(clientId) {
        return this.request(`/resources/quotas/${clientId}`);
    }

    // ============= WORKER MANAGEMENT =============

    /**
     * Get all workers status
     */
    async getWorkerStatus() {
        return this.request('/workers');
    }

    /**
     * Get specific worker details
     */
    async getWorkerDetails(workerName) {
        return this.request(`/workers/${workerName}`);
    }

    /**
     * Test worker handshake
     */
    async testHandshake(workerName, testData = {}) {
        return this.request('/handshake/receive', {
            method: 'POST',
            body: JSON.stringify({
                worker_name: workerName,
                test_data: testData
            })
        });
    }

    /**
     * Get worker metrics
     */
    async getWorkerMetrics(workerName, timeRange = '1h') {
        return this.request(`/workers/${workerName}/metrics?range=${timeRange}`);
    }

    // ============= MONITORING & ANALYTICS =============

    /**
     * Get system metrics
     */
    async getSystemMetrics() {
        return this.request('/metrics');
    }

    /**
     * Get system health
     */
    async getHealth() {
        return this.request('/health');
    }

    /**
     * Get performance stats
     */
    async getPerformanceStats(timeRange = '24h') {
        return this.request(`/metrics?range=${timeRange}`);
    }

    /**
     * Get cost analytics
     */
    async getCostAnalytics(timeRange = '7d') {
        return this.request(`/metrics?range=${timeRange}`);
    }

    // ============= REAL-TIME UPDATES =============

    /**
     * Subscribe to execution updates via SSE
     */
    subscribeToExecution(executionId, onUpdate, onError) {
        const eventSource = new EventSource(
            `${this.baseUrl}/api/executions/${executionId}/stream`
        );

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                onUpdate(data);
            } catch (error) {
                console.error('Failed to parse SSE data:', error);
            }
        };

        eventSource.onerror = (error) => {
            console.error('SSE error:', error);
            if (onError) onError(error);
            eventSource.close();
        };

        return eventSource;
    }

    /**
     * Subscribe to resource updates
     */
    subscribeToResources(onUpdate, onError) {
        const eventSource = new EventSource(
            `${this.baseUrl}/api/resources/stream`
        );

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                onUpdate(data);
            } catch (error) {
                console.error('Failed to parse resource data:', error);
            }
        };

        eventSource.onerror = (error) => {
            if (onError) onError(error);
            eventSource.close();
        };

        return eventSource;
    }

    // ============= UTILITY METHODS =============

    /**
     * Format execution time estimate
     */
    formatTimeEstimate(milliseconds) {
        if (milliseconds < 1000) return `${milliseconds}ms`;
        if (milliseconds < 60000) return `${Math.round(milliseconds / 1000)}s`;
        if (milliseconds < 3600000) return `${Math.round(milliseconds / 60000)}m`;
        return `${Math.round(milliseconds / 3600000)}h`;
    }

    /**
     * Format cost estimate
     */
    formatCostEstimate(costUsd) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 4
        }).format(costUsd);
    }

    /**
     * Parse execution status
     */
    parseExecutionStatus(status) {
        const statusConfig = {
            'pending': { color: 'warning', icon: '⏳', label: 'Pending' },
            'queued': { color: 'info', icon: '📋', label: 'Queued' },
            'running': { color: 'primary', icon: '▶️', label: 'Running' },
            'completed': { color: 'success', icon: '✅', label: 'Completed' },
            'failed': { color: 'danger', icon: '❌', label: 'Failed' },
            'cancelled': { color: 'secondary', icon: '⏹️', label: 'Cancelled' }
        };

        return statusConfig[status] || { color: 'secondary', icon: '❓', label: status };
    }
}

// Export for use in other modules
window.OrchestratorAPI = OrchestratorAPI;