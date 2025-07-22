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
        const url = `/api/${workerName}${endpoint ? `?endpoint=${encodeURIComponent(endpoint)}` : ''}`;
        
        const options = {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            'x-bitware-session-token': sessionToken
          }
        };
  
        if (data && method !== 'GET') {
          options.body = JSON.stringify(data);
        }
  
        const response = await fetch(url, options);
        
        if (!response.ok) {
          if (response.status === 401) {
            // Session expired, redirect to login
            this.authClient.logout();
            window.location.reload();
            return;
          }
          throw new Error(`${workerName} request failed: ${response.status}`);
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