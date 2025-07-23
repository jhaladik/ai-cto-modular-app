// public/js/shared/api.js
// @WORKER: APIClient  
// 🧱 Type: BrowserClient
// 📍 Path: public/js/shared/api.js
// 🎯 Role: API communication with backend workers through Pages Functions
// 💾 Storage: { browser: "sessionToken" }

class APIClient {
    constructor() {
      this.authClient = window.authClient;
    }
  
    async callWorker(workerName, endpoint = '', data = null, method = 'GET') {
      const sessionToken = this.authClient.getSessionToken();
      
      if (!sessionToken) {
        throw new Error('No session token - user not authenticated');
      }
    
      try {
        // Always use the base API URL without query parameters
        const url = `/api/${workerName}`;
        
        // Always POST with JSON body containing endpoint, method, and data
        const options = {
          method: 'POST',  // Always POST to the Pages Function proxy
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Token': sessionToken  // Fixed header name (capital X and S)
          },
          body: JSON.stringify({
            endpoint: endpoint,      // The backend endpoint to call
            method: method,          // The HTTP method for the backend
            data: data              // The data to send to the backend
          })
        };
    
        const response = await fetch(url, options);
        
        if (!response.ok) {
          if (response.status === 401) {
            // Session expired, redirect to login
            this.authClient.logout();
            window.location.reload();
            return;
          }
          
          // Try to get more detailed error information
          let errorMessage = `${workerName} request failed: ${response.status}`;
          try {
            const errorData = await response.json();
            if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (parseError) {
            // If we can't parse the error response, use the default message
            console.warn('Could not parse error response:', parseError);
          }
          
          throw new Error(errorMessage);
        }
    
        return await response.json();
        
      } catch (error) {
        console.error(`API call to ${workerName} failed:`, error);
        throw error;
      }
    }
  
    // Orchestrator methods
    async getOrchestrationStatus() {
      return this.callWorker('orchestrator', '/status');
    }
  
    async startPipeline(config) {
      return this.callWorker('orchestrator', '/start', config, 'POST');
    }
  
    // Topic Researcher methods
    async researchTopic(topic, depth = 'standard') {
      return this.callWorker('topic-researcher', `/research?topic=${encodeURIComponent(topic)}&depth=${depth}`);
    }
  
    async getResearchTopics() {
      return this.callWorker('topic-researcher', '/topics');
    }
  
    // RSS Librarian methods  
    async getRSSSources(topic = null) {
      const endpoint = topic ? `/sources?topic=${encodeURIComponent(topic)}` : '/sources';
      return this.callWorker('rss-librarian', endpoint);
    }
  
    async addRSSSource(sourceData) {
      return this.callWorker('rss-librarian', '/sources', sourceData, 'POST');
    }
  
    async getTopics() {
      return this.callWorker('rss-librarian', '/topics');
    }
  
    // Feed Fetcher methods
    async fetchFeeds(sources) {
      return this.callWorker('feed-fetcher', '/fetch', { sources }, 'POST');
    }
  
    async getFeedStatus() {
      return this.callWorker('feed-fetcher', '/status');
    }
  
    // Content Classifier methods
    async classifyContent(articles) {
      return this.callWorker('content-classifier', '/classify', { articles }, 'POST');
    }
  
    async getClassificationResults(jobId) {
      return this.callWorker('content-classifier', `/results/${jobId}`);
    }
  
    // Report Builder methods
    async generateReport(config) {
      return this.callWorker('report-builder', '/generate', config, 'POST');
    }
  
    async getReports() {
      return this.callWorker('report-builder', '/reports');
    }
  
    // Health check for all workers
    async checkWorkerHealth() {
      const workers = [
        'orchestrator',
        'topic-researcher', 
        'rss-librarian',
        'feed-fetcher',
        'content-classifier',
        'report-builder'
      ];
  
      const healthResults = {};
      
      for (const worker of workers) {
        try {
          await this.callWorker(worker, '/health');
          healthResults[worker] = { status: 'healthy', error: null };
        } catch (error) {
          healthResults[worker] = { status: 'offline', error: error.message };
        }
      }
  
      return healthResults;
    }
  }
  
  // Global API instance
  window.apiClient = new APIClient();