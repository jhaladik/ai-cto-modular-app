// public/js/dashboard.js
// @WORKER: DashboardController
// 🧱 Type: BrowserClient
// 📍 Path: public/js/dashboard.js  
// 🎯 Role: Main dashboard logic and UI coordination
// 💾 Storage: { browser: "DOM, localStorage" }

class Dashboard {
    constructor() {
      this.authClient = window.authClient;
      this.apiClient = window.apiClient;
      this.healthCheckInterval = null;
      
      this.init();
    }
  
    async init() {
      // Show loading screen
      window.UI.showLoading(true);
      
      // Small delay for better UX
      await window.UI.delay(1000);
      
      // Check if user is already authenticated
      if (this.authClient.isAuthenticated()) {
        const validation = await this.authClient.validateSession();
        if (validation.valid) {
          this.showDashboard();
        } else {
          this.showLogin();
        }
      } else {
        this.showLogin();
      }
      
      // Hide loading screen
      window.UI.showLoading(false);
      
      // Set up event listeners
      this.setupEventListeners();
    }
  
    setupEventListeners() {
      // Login form
      const authForm = document.getElementById('auth-form');
      if (authForm) {
        authForm.addEventListener('submit', this.handleLogin.bind(this));
      }
  
      // Logout button
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', this.handleLogout.bind(this));
      }
  
      // Worker interface buttons
      document.addEventListener('click', (e) => {
        if (e.target.classList.contains('worker-btn')) {
          const workerName = e.target.getAttribute('data-worker');
          this.openWorkerInterface(workerName);
        }
      });
  
      // Pipeline step clicks
      document.addEventListener('click', (e) => {
        const pipelineStep = e.target.closest('.pipeline-step');
        if (pipelineStep) {
          const workerName = pipelineStep.getAttribute('data-worker');
          this.openWorkerInterface(workerName);
        }
      });
    }
  
    async handleLogin(e) {
      e.preventDefault();
      
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      window.UI.hideError('login-error');
      
      try {
        const result = await this.authClient.login(username, password);
        
        if (result.success) {
          this.showDashboard();
        } else {
          window.UI.showError(result.error, 'login-error');
        }
      } catch (error) {
        window.UI.showError('Login failed. Please try again.', 'login-error');
      }
    }
  
    async handleLogout() {
      await this.authClient.logout();
      this.showLogin();
    }
  
    showLogin() {
      window.UI.hideElement('dashboard');
      window.UI.showElement('login-form');
      
      // Stop health checks
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }
    }
  
    showDashboard() {
      window.UI.hideElement('login-form');
      window.UI.showElement('dashboard');
      
      // Update user info
      const user = this.authClient.getUser();
      const userInfo = document.getElementById('user-info');
      if (userInfo && user) {
        userInfo.textContent = `${user.username} (${user.role})`;
      }
      
      // Start health checks
      this.startHealthChecks();
      
      // Initial system status check
      this.updateSystemStatus();
    }
  
    async startHealthChecks() {
      // Initial check
      await this.checkWorkerHealth();
      
      // Set up periodic checks (every 30 seconds)
      this.healthCheckInterval = setInterval(() => {
        this.checkWorkerHealth();
      }, 30000);
    }
  
    async checkWorkerHealth() {
      try {
        const healthResults = await this.apiClient.checkWorkerHealth();
        
        let onlineCount = 0;
        const totalWorkers = Object.keys(healthResults).length;
        
        // Update individual worker status
        for (const [workerName, health] of Object.entries(healthResults)) {
          const statusId = `status-${workerName}`;
          const status = health.status === 'online' ? 'online' : 'offline';
          window.UI.updateStatusDot(statusId, status);
          
          if (health.status === 'online') {
            onlineCount++;
          }
        }
        
        // Update overall system status
        const activeWorkers = document.getElementById('active-workers');
        if (activeWorkers) {
          activeWorkers.textContent = `${onlineCount}/${totalWorkers}`;
        }
        
        const pipelineHealth = document.getElementById('pipeline-health');
        if (pipelineHealth) {
          if (onlineCount === totalWorkers) {
            pipelineHealth.textContent = 'All Systems Operational';
            pipelineHealth.className = 'status-value status-healthy';
          } else if (onlineCount > 0) {
            pipelineHealth.textContent = 'Partial Service';
            pipelineHealth.className = 'status-value status-warning';
          } else {
            pipelineHealth.textContent = 'System Offline';
            pipelineHealth.className = 'status-value status-error';
          }
        }
        
      } catch (error) {
        console.error('Health check failed:', error);
        
        // Show all workers as offline on error
        const workers = ['orchestrator', 'topic-researcher', 'rss-librarian', 'feed-fetcher', 'content-classifier', 'report-builder'];
        workers.forEach(worker => {
          const statusId = `status-${worker}`;
          window.UI.updateStatusDot(statusId, 'offline');
        });
        
        const pipelineHealth = document.getElementById('pipeline-health');
        if (pipelineHealth) {
          pipelineHealth.textContent = 'Health Check Failed';
          pipelineHealth.className = 'status-value status-error';
        }
      }
    }
  
    updateSystemStatus() {
      const lastUpdated = document.getElementById('last-updated');
      if (lastUpdated) {
        lastUpdated.textContent = window.UI.formatTimestamp(Date.now());
      }
    }
  
    openWorkerInterface(workerName) {
      // For Phase 1, we'll just show an alert
      // In Phase 2, these will navigate to individual worker pages
      const workerDisplayNames = {
        'orchestrator': 'Orchestrator',
        'topic-researcher': 'Topic Researcher',
        'rss-librarian': 'RSS Librarian',
        'feed-fetcher': 'Feed Fetcher',
        'content-classifier': 'Content Classifier',
        'report-builder': 'Report Builder'
      };
      
      const displayName = workerDisplayNames[workerName] || workerName;
      alert(`${displayName} interface will be available in Phase 2.\n\nFor now, you can test the API endpoints directly through the browser console using:\n\napiClient.callWorker('${workerName}', '/endpoint')`);
    }
  }
  
  // Initialize dashboard when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
  });