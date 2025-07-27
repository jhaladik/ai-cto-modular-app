// public/js/shared/api.js - FIXED FOR ENHANCED ORCHESTRATOR COMPATIBILITY
// Compatible with both existing orchestrator API and enhanced dashboard

class APIClient {
  constructor() {
      this.sessionToken = localStorage.getItem('bitware-session-token');
      this.baseUrl = window.location.origin;
  }

  // Updated to handle method parameter properly
  async callWorker(workerName, endpoint, method = 'GET', data = null) {
      try {
          // Ensure we have a session token for authenticated requests
          this.sessionToken = localStorage.getItem('bitware-session-token');
          
          if (!this.sessionToken) {
              throw new Error('No session token available');
          }

          // Build request body in format expected by Pages Functions
          const requestBody = {
              endpoint: endpoint,
              method: method.toUpperCase()
          };

          // Add data if provided
          if (data !== null && data !== undefined) {
              requestBody.data = data;
          }

          console.log(`API Call: ${workerName} ${method} ${endpoint}`, requestBody);

          // Make request to Pages Function proxy
          const response = await fetch(`${this.baseUrl}/api/${workerName}`, {
              method: 'POST', // Always POST to Pages Function
              headers: {
                  'Content-Type': 'application/json',
                  'X-Session-Token': this.sessionToken, // Use consistent header name
                  'Accept': 'application/json'
              },
              body: JSON.stringify(requestBody)
          });

          console.log(`API Response: ${response.status} ${response.statusText}`);

          // Handle different response statuses
          if (response.status === 401) {
              // Session expired or invalid
              localStorage.removeItem('bitware-session-token');
              localStorage.removeItem('bitware-user-info');
              window.location.href = '/login.html';
              throw new Error('Session expired. Please log in again.');
          }

          if (response.status === 403) {
              throw new Error('Access denied. Admin privileges may be required.');
          }

          if (response.status === 404) {
              throw new Error(`Endpoint not found: ${endpoint}`);
          }

          if (response.status === 500) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || 'Internal server error');
          }

          if (response.status === 503) {
              throw new Error('Service temporarily unavailable. Please try again later.');
          }

          if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || `Request failed with status ${response.status}`);
          }

          // Parse response
          const responseData = await response.json();
          console.log(`API Data:`, responseData);

          return responseData;

      } catch (error) {
          console.error(`API call failed: ${workerName} ${method} ${endpoint}`, error);
          
          // Re-throw with more context
          if (error.message.includes('fetch')) {
              throw new Error(`Network error: Unable to connect to ${workerName} service`);
          }
          
          throw error;
      }
  }

  // Convenience methods for common HTTP verbs
  async get(workerName, endpoint) {
      return this.callWorker(workerName, endpoint, 'GET');
  }

  async post(workerName, endpoint, data) {
      return this.callWorker(workerName, endpoint, 'POST', data);
  }

  async put(workerName, endpoint, data) {
      return this.callWorker(workerName, endpoint, 'PUT', data);
  }

  async delete(workerName, endpoint) {
      return this.callWorker(workerName, endpoint, 'DELETE');
  }

  // Specific orchestrator methods for enhanced dashboard
  async getCapabilities() {
      return this.get('orchestrator', '/capabilities');
  }

  async getPipelineHealth() {
      return this.get('orchestrator', '/pipeline-health');
  }

  async getPerformanceInsights(timeRange = '24h') {
      return this.get('orchestrator', `/performance-insights?time_range=${timeRange}`);
  }

  async executePipeline(pipelineConfig) {
      return this.post('orchestrator', '/orchestrate', pipelineConfig);
  }

  async getPipelineStatus(pipelineId) {
      return this.get('orchestrator', `/pipeline/${pipelineId}`);
  }

  // Admin methods (require admin privileges)
  async getAdminStats() {
      return this.get('orchestrator', '/admin/stats');
  }

  async getAdminPerformance() {
      return this.get('orchestrator', '/admin/performance');
  }

  async getAdminCosts() {
      return this.get('orchestrator', '/admin/costs');
  }

  async getAdminTemplates() {
      return this.get('orchestrator', '/admin/templates');
  }

  // Session management
  updateSessionToken(newToken) {
      this.sessionToken = newToken;
      localStorage.setItem('bitware-session-token', newToken);
  }

  clearSession() {
      this.sessionToken = null;
      localStorage.removeItem('bitware-session-token');
      localStorage.removeItem('bitware-user-info');
  }

  // Health check method
  async healthCheck() {
      try {
          const response = await this.get('orchestrator', '/health');
          return { healthy: true, data: response };
      } catch (error) {
          return { healthy: false, error: error.message };
      }
  }
}

// Global instance
window.apiClient = new APIClient();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APIClient;
}