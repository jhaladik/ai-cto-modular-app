// public/js/dashboard.js
// @WORKER: MainDashboardController
// 🧱 Type: BrowserClient
// 📍 Path: public/js/dashboard.js  
// 🎯 Role: Main dashboard logic and orchestrator integration
// 💾 Storage: { browser: "DOM, localStorage, sessionStorage" }

class MainDashboard {
  constructor() {
      this.authClient = window.authClient;
      this.apiClient = window.apiClient;
      this.refreshInterval = null;
      this.activityLog = [];
      this.workerHealthCache = new Map();
      this.lastHealthCheck = 0;
      this.healthCheckInterval = 30000; // 30 seconds
      
      // Worker configuration
      this.workers = [
          { name: 'orchestrator', icon: '🎯', title: 'Orchestrator', description: 'Pipeline Coordination' },
          { name: 'topic-researcher', icon: '🔍', title: 'Topic Researcher', description: 'RSS Source Discovery' },
          { name: 'rss-librarian', icon: '📚', title: 'RSS Librarian', description: 'Source Management' },
          { name: 'feed-fetcher', icon: '📡', title: 'Feed Fetcher', description: 'Article Extraction' },
          { name: 'content-classifier', icon: '🧠', title: 'Content Classifier', description: 'AI Analysis' },
          { name: 'report-builder', icon: '📊', title: 'Report Builder', description: 'Intelligence Reports' }
      ];
      
      this.init();
  }

  async init() {
      // Show loading screen initially
      this.showLoading(true);
      
      // Check authentication status
      if (this.authClient.isAuthenticated()) {
          const validation = await this.authClient.validateSession();
          if (validation.valid) {
              await this.showDashboard();
          } else {
              this.showLogin();
          }
      } else {
          this.showLogin();
      }
      
      this.showLoading(false);
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
      
      // Quick action buttons
      const quickPipelineBtn = document.getElementById('quick-pipeline-btn');
      if (quickPipelineBtn) {
          quickPipelineBtn.addEventListener('click', this.showQuickPipelineDialog.bind(this));
      }
      
      const viewHistoryBtn = document.getElementById('view-history-btn');
      if (viewHistoryBtn) {
          viewHistoryBtn.addEventListener('click', () => window.location.href = './orchestrator/#history');
      }
      
      const refreshWorkersBtn = document.getElementById('refresh-workers-btn');
      if (refreshWorkersBtn) {
          refreshWorkersBtn.addEventListener('click', this.refreshWorkerStatus.bind(this));
      }
      
      const clearActivityBtn = document.getElementById('clear-activity-btn');
      if (clearActivityBtn) {
          clearActivityBtn.addEventListener('click', this.clearActivity.bind(this));
      }

      // Pipeline steps click handlers
      document.addEventListener('click', (e) => {
          const pipelineStep = e.target.closest('.pipeline-step');
          if (pipelineStep) {
              const workerName = pipelineStep.getAttribute('data-worker');
              this.openWorkerInterface(workerName);
          }
      });

      // Worker card click handlers
      document.addEventListener('click', (e) => {
          const workerCard = e.target.closest('.worker-card');
          if (workerCard && !e.target.closest('button')) {
              const workerName = workerCard.getAttribute('data-worker');
              this.openWorkerInterface(workerName);
          }
      });
  }

  showLoading(show) {
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
          loadingScreen.style.display = show ? 'flex' : 'none';
      }
  }

  showLogin() {
      const loginScreen = document.getElementById('login-screen');
      const dashboard = document.getElementById('dashboard');
      
      if (loginScreen) loginScreen.style.display = 'flex';
      if (dashboard) dashboard.style.display = 'none';
  }

  async showDashboard() {
      const loginScreen = document.getElementById('login-screen');
      const dashboard = document.getElementById('dashboard');
      
      if (loginScreen) loginScreen.style.display = 'none';
      if (dashboard) dashboard.style.display = 'block';
      
      // Update user info
      const userInfo = JSON.parse(localStorage.getItem('bitware-user-info') || '{}');
      const userInfoElement = document.getElementById('user-info');
      if (userInfoElement) {
          userInfoElement.textContent = `Welcome, ${userInfo.username || 'User'}`;
      }
      
      // Load dashboard data
      await this.loadDashboardData();
      
      // Start refresh interval
      this.startRefreshInterval();
      
      this.addActivity('success', 'Dashboard Loaded', 'Main dashboard initialized successfully');
  }

  async handleLogin(e) {
      e.preventDefault();
      
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      this.hideError();
      
      try {
          const result = await this.authClient.login(username, password);
          
          if (result.success) {
              await this.showDashboard();
          } else {
              this.showError(result.error || 'Login failed');
          }
      } catch (error) {
          console.error('Login error:', error);
          this.showError('Login failed. Please try again.');
      }
  }

  async handleLogout() {
      this.stopRefreshInterval();
      await this.authClient.logout();
      this.showLogin();
  }

  showError(message) {
      const errorDiv = document.getElementById('login-error');
      if (errorDiv) {
          errorDiv.textContent = message;
          errorDiv.style.display = 'block';
      }
  }

  hideError() {
      const errorDiv = document.getElementById('login-error');
      if (errorDiv) {
          errorDiv.style.display = 'none';
      }
  }

  async loadDashboardData() {
      try {
          await Promise.all([
              this.updateSystemHealth(),
              this.updateMetrics(),
              this.updateWorkerStatus()
          ]);
      } catch (error) {
          console.error('Failed to load dashboard data:', error);
          this.addActivity('error', 'Dashboard Load Error', 'Failed to load some dashboard data');
      }
  }

  async updateSystemHealth() {
      try {
          const health = await this.apiClient.callWorker('orchestrator', '/pipeline-health');
          
          let onlineWorkers = 0;
          let totalWorkers = 0;
          
          if (health && health.workers) {
              totalWorkers = Object.keys(health.workers).length;
              onlineWorkers = Object.values(health.workers).filter(w => w.status === 'online').length;
              
              // Cache worker health data
              this.workerHealthCache.clear();
              Object.entries(health.workers).forEach(([name, data]) => {
                  this.workerHealthCache.set(name, data);
              });
              this.lastHealthCheck = Date.now();
          }
          
          // Update system indicator
          const statusDot = document.getElementById('system-status-dot');
          const statusText = document.getElementById('system-status-text');
          
          if (statusDot && statusText) {
              if (onlineWorkers === totalWorkers && totalWorkers > 0) {
                  statusDot.className = 'status-dot status-online';
                  statusText.textContent = 'All Systems Online';
              } else if (onlineWorkers > 0) {
                  statusDot.className = 'status-dot status-warning';
                  statusText.textContent = 'Partial Systems';
              } else {
                  statusDot.className = 'status-dot status-offline';
                  statusText.textContent = 'Systems Offline';
              }
          }
          
          // Update active workers metric
          const activeWorkersElement = document.getElementById('active-workers');
          if (activeWorkersElement) {
              activeWorkersElement.textContent = `${onlineWorkers}/${totalWorkers}`;
          }
          
          const workerChange = document.getElementById('worker-change');
          if (workerChange) {
              if (onlineWorkers === totalWorkers) {
                  workerChange.textContent = 'All Online';
                  workerChange.className = 'metric-change metric-up';
              } else if (onlineWorkers > 0) {
                  workerChange.textContent = `${totalWorkers - onlineWorkers} Offline`;
                  workerChange.className = 'metric-change metric-down';
              } else {
                  workerChange.textContent = 'All Offline';
                  workerChange.className = 'metric-change metric-down';
              }
          }
          
      } catch (error) {
          console.error('Failed to update system health:', error);
          
          const statusDot = document.getElementById('system-status-dot');
          const statusText = document.getElementById('system-status-text');
          
          if (statusDot) statusDot.className = 'status-dot status-offline';
          if (statusText) statusText.textContent = 'Status Unknown';
      }
  }

  async updateMetrics() {
      try {
          const insights = await this.apiClient.callWorker('orchestrator', '/performance-insights?time_range=24h');
          
          if (insights && insights.metrics) {
              const pipelinesToday = document.getElementById('pipelines-today');
              if (pipelinesToday) {
                  pipelinesToday.textContent = insights.metrics.total_pipelines || '0';
              }
              
              const avgTime = document.getElementById('avg-time');
              if (avgTime) {
                  const timeMs = insights.metrics.avg_execution_time_ms;
                  avgTime.textContent = timeMs ? `${Math.round(timeMs / 1000)}s` : '0s';
              }
              
              const costToday = document.getElementById('cost-today');
              if (costToday) {
                  const cost = insights.metrics.total_cost_usd;
                  costToday.textContent = cost ? `$${cost.toFixed(2)}` : '$0.00';
              }
              
              // Update change indicators with mock positive data
              const pipelineChange = document.getElementById('pipeline-change');
              if (pipelineChange) {
                  pipelineChange.textContent = '+2 from yesterday';
                  pipelineChange.className = 'metric-change metric-up';
              }
              
              const timeChange = document.getElementById('time-change');
              if (timeChange) {
                  timeChange.textContent = '15% faster';
                  timeChange.className = 'metric-change metric-up';
              }
              
              const costChange = document.getElementById('cost-change');
              if (costChange) {
                  costChange.textContent = '8% lower';
                  costChange.className = 'metric-change metric-up';
              }
          }
      } catch (error) {
          console.error('Failed to update metrics:', error);
          // Set default values on error
          this.setDefaultMetrics();
      }
  }

  setDefaultMetrics() {
      const elements = [
          { id: 'pipelines-today', value: '0' },
          { id: 'avg-time', value: '-' },
          { id: 'cost-today', value: '$0.00' },
          { id: 'pipeline-change', value: 'No data', className: 'metric-change metric-neutral' },
          { id: 'time-change', value: 'No data', className: 'metric-change metric-neutral' },
          { id: 'cost-change', value: 'No data', className: 'metric-change metric-neutral' }
      ];
      
      elements.forEach(({ id, value, className }) => {
          const element = document.getElementById(id);
          if (element) {
              element.textContent = value;
              if (className) element.className = className;
          }
      });
  }

  async updateWorkerStatus() {
      try {
          // Use cached health data if recent
          let healthData = null;
          const now = Date.now();
          
          if (now - this.lastHealthCheck < this.healthCheckInterval && this.workerHealthCache.size > 0) {
              healthData = { workers: Object.fromEntries(this.workerHealthCache) };
          } else {
              healthData = await this.apiClient.callWorker('orchestrator', '/pipeline-health');
          }
          
          if (healthData && healthData.workers) {
              // Update pipeline step statuses
              Object.entries(healthData.workers).forEach(([workerName, data]) => {
                  const statusDot = document.getElementById(`status-${workerName}`);
                  const statusText = document.getElementById(`status-text-${workerName}`);
                  
                  if (statusDot && statusText) {
                      statusDot.className = `status-dot status-${data.status === 'online' ? 'online' : 'offline'}`;
                      statusText.textContent = data.status === 'online' ? 'Online' : 'Offline';
                  }
              });
          }
          
          // Update worker statistics (using mock data for demonstration)
          this.updateWorkerStats();
          
      } catch (error) {
          console.error('Failed to update worker status:', error);
          
          // Set all workers to unknown status on error
          this.workers.forEach(worker => {
              const statusDot = document.getElementById(`status-${worker.name}`);
              const statusText = document.getElementById(`status-text-${worker.name}`);
              
              if (statusDot) statusDot.className = 'status-dot status-offline';
              if (statusText) statusText.textContent = 'Unknown';
          });
      }
  }

  updateWorkerStats() {
      // Update orchestrator stats
      const orchestratorStats = [
          { id: 'orchestrator-pipelines', value: '12' },
          { id: 'orchestrator-time', value: '2.3s' },
          { id: 'orchestrator-cost', value: '$0.18' }
      ];
      
      orchestratorStats.forEach(({ id, value }) => {
          const element = document.getElementById(id);
          if (element) element.textContent = value;
      });
      
      // Update other worker stats (mock data for demonstration)
      const workerStats = {
          'topic-researcher': { sources: '247', accuracy: '94%', topics: '15' },
          'rss-librarian': { sources: '1,340', quality: '4.7/5', categories: '28' },
          'feed-fetcher': { articles: '4,592', feeds: '89', success: '98%' },
          'content-classifier': { processed: '3,847', accuracy: '96%', models: '3' },
          'report-builder': { reports: '156', insights: '892', formats: '4' }
      };
      
      Object.entries(workerStats).forEach(([worker, stats]) => {
          Object.entries(stats).forEach(([stat, value]) => {
              const element = document.getElementById(`${worker}-${stat}`);
              if (element) element.textContent = value;
          });
      });
  }

  openWorkerInterface(workerName) {
      if (workerName === 'orchestrator') {
          // Navigate to full orchestrator dashboard
          window.location.href = './orchestrator/';
          return;
      }
      
      // For other workers, show Phase 2 message
      const workerDisplayNames = {
          'topic-researcher': 'Topic Researcher',
          'rss-librarian': 'RSS Librarian', 
          'feed-fetcher': 'Feed Fetcher',
          'content-classifier': 'Content Classifier',
          'report-builder': 'Report Builder'
      };
      
      const displayName = workerDisplayNames[workerName] || workerName;
      
      alert(`${displayName} interface coming in Phase 2! 🚧\n\nFor now, you can:\n• Use the Orchestrator to run full pipelines\n• Test the ${displayName} API endpoints directly\n• Monitor worker health from this dashboard\n\nThe Orchestrator already coordinates with all workers automatically.`);
      
      this.addActivity('info', `${displayName} Interface Requested`, 'Interface will be available in Phase 2');
  }

  // In Dashboard.js - modify testWorker method
  async testWorker(workerName) {
    try {
        // Use arrow function to preserve context
        const result = await (() => this.apiClient.callWorker(workerName, '/health'))();
        alert(`✅ ${workerName} API Test Successful!\n\n${JSON.stringify(result, null, 2)}`);
        this.addActivity('success', `${workerName} API Test`, 'API endpoint responding correctly');
    } catch (error) {
        alert(`❌ ${workerName} API Test Failed!\n\n${error.message}`);
        this.addActivity('error', `${workerName} API Test Failed`, error.message);
    }
  }

  showQuickPipelineDialog() {
      const topic = prompt('🔍 Enter a topic to research:', 'artificial intelligence');
      if (topic && topic.trim()) {
          this.executeQuickPipeline(topic.trim());
      }
  }

  async executeQuickPipeline(topic) {
      try {
          this.addActivity('info', 'Quick Pipeline Started', `Researching: ${topic}`);
          
          // Show a brief loading message
          const originalButton = document.getElementById('quick-pipeline-btn');
          const originalText = originalButton ? originalButton.innerHTML : '';
          
          if (originalButton) {
              originalButton.innerHTML = '⏳ Running Pipeline...';
              originalButton.disabled = true;
          }
          
          const pipelineConfig = {
              topic: topic,
              optimize_for: 'balanced',
              urgency: 'medium',
              quality_level: 'standard',
              budget_limit: 1.00,
              enable_parallel_processing: true
          };
          
          const result = await this.apiClient.callWorker('orchestrator', '/orchestrate', pipelineConfig);
          
          if (result.status === 'completed') {
              const successMessage = `✅ Pipeline completed successfully!\n\n📊 ${result.articles_processed || 0} articles processed\n⏱️ ${Math.round((result.total_execution_time_ms || 0) / 1000)}s execution time\n💰 $${(result.total_cost_usd || 0).toFixed(3)} cost\n\n🎯 Pipeline ID: ${result.pipeline_id}\n\nView full results in the Orchestrator dashboard.`;
              
              alert(successMessage);
              this.addActivity('success', 'Pipeline Completed', `${result.articles_processed || 0} articles processed in ${Math.round((result.total_execution_time_ms || 0) / 1000)}s`);
              
              // Refresh metrics after successful pipeline
              await this.updateMetrics();
              
          } else {
              const warningMessage = `⚠️ Pipeline completed with issues!\n\nStatus: ${result.status}\nPipeline ID: ${result.pipeline_id}\n\nCheck the Orchestrator dashboard for details.`;
              
              alert(warningMessage);
              this.addActivity('warning', 'Pipeline Completed with Issues', result.status);
          }
          
      } catch (error) {
          console.error('Quick pipeline execution failed:', error);
          const errorMessage = `❌ Pipeline execution failed!\n\nError: ${error.message}\n\nPlease check the worker status and try again.`;
          
          alert(errorMessage);
          this.addActivity('error', 'Pipeline Failed', error.message);
          
      } finally {
          // Restore button state
          const button = document.getElementById('quick-pipeline-btn');
          if (button) {
              button.innerHTML = '⚡ Quick Start Pipeline';
              button.disabled = false;
          }
      }
  }

  async refreshWorkerStatus() {
      try {
          // Force refresh by clearing cache
          this.workerHealthCache.clear();
          this.lastHealthCheck = 0;
          
          await this.updateWorkerStatus();
          this.addActivity('info', 'Worker Status Refreshed', 'All worker statuses updated');
          
          // Brief visual feedback
          const button = document.getElementById('refresh-workers-btn');
          if (button) {
              const originalText = button.innerHTML;
              button.innerHTML = '✅ Refreshed';
              
              setTimeout(() => {
                  button.innerHTML = originalText;
              }, 1500);
          }
          
      } catch (error) {
          console.error('Failed to refresh worker status:', error);
          this.addActivity('error', 'Refresh Failed', 'Could not update worker statuses');
      }
  }

  addActivity(type, title, description) {
      const activity = {
          type,
          title,
          description,
          timestamp: new Date(),
          id: Date.now() + Math.random()
      };
      
      this.activityLog.unshift(activity);
      
      // Keep only the last 10 activities
      if (this.activityLog.length > 10) {
          this.activityLog = this.activityLog.slice(0, 10);
      }
      
      this.renderActivity();
      
      // Store in session storage for persistence
      try {
          sessionStorage.setItem('ai_factory_activity_log', JSON.stringify(this.activityLog));
      } catch (error) {
          console.warn('Could not store activity log:', error);
      }
  }

  loadActivityFromStorage() {
      try {
          const stored = sessionStorage.getItem('ai_factory_activity_log');
          if (stored) {
              this.activityLog = JSON.parse(stored).map(activity => ({
                  ...activity,
                  timestamp: new Date(activity.timestamp)
              }));
              this.renderActivity();
          }
      } catch (error) {
          console.warn('Could not load activity log:', error);
          this.activityLog = [];
      }
  }

  renderActivity() {
      const activityList = document.getElementById('activity-list');
      if (!activityList) return;
      
      if (this.activityLog.length === 0) {
          activityList.innerHTML = `
              <div class="activity-item">
                  <div class="activity-icon">🏭</div>
                  <div class="activity-content">
                      <div class="activity-title">AI Factory System Ready</div>
                      <div class="activity-description">All workers are ready for pipeline execution</div>
                      <div class="activity-time">System start</div>
                  </div>
              </div>
          `;
          return;
      }
      
      activityList.innerHTML = this.activityLog.map(activity => `
          <div class="activity-item ${activity.type}">
              <div class="activity-icon">
                  ${activity.type === 'success' ? '✅' : 
                    activity.type === 'warning' ? '⚠️' : 
                    activity.type === 'error' ? '❌' : 'ℹ️'}
              </div>
              <div class="activity-content">
                  <div class="activity-title">${this.escapeHtml(activity.title)}</div>
                  <div class="activity-description">${this.escapeHtml(activity.description)}</div>
                  <div class="activity-time">${this.formatTime(activity.timestamp)}</div>
              </div>
          </div>
      `).join('');
  }

  clearActivity() {
      this.activityLog = [];
      this.renderActivity();
      
      try {
          sessionStorage.removeItem('ai_factory_activity_log');
      } catch (error) {
          console.warn('Could not clear activity log from storage:', error);
      }
      
      this.addActivity('info', 'Activity Log Cleared', 'All previous activities removed');
  }

  formatTime(timestamp) {
      const now = new Date();
      const diff = now - timestamp;
      
      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      return timestamp.toLocaleDateString();
  }

  escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
  }

  startRefreshInterval() {
      // Clear any existing interval
      this.stopRefreshInterval();
      
      // Refresh system health and worker status every 30 seconds
      this.refreshInterval = setInterval(async () => {
          try {
              await this.updateSystemHealth();
              await this.updateWorkerStatus();
          } catch (error) {
              console.error('Background refresh failed:', error);
          }
      }, this.healthCheckInterval);
      
      console.log('Dashboard auto-refresh started (30s interval)');
  }

  stopRefreshInterval() {
      if (this.refreshInterval) {
          clearInterval(this.refreshInterval);
          this.refreshInterval = null;
          console.log('Dashboard auto-refresh stopped');
      }
  }

  // Public methods for debugging and testing
  getDebugInfo() {
      return {
          isAuthenticated: this.authClient.isAuthenticated(),
          workerHealthCacheSize: this.workerHealthCache.size,
          lastHealthCheck: new Date(this.lastHealthCheck).toISOString(),
          activityLogLength: this.activityLog.length,
          refreshIntervalActive: !!this.refreshInterval
      };
  }

  async forceHealthCheck() {
      this.workerHealthCache.clear();
      this.lastHealthCheck = 0;
      await this.updateSystemHealth();
      console.log('Forced health check completed');
  }
}

// Global functions for button clicks (needed for inline event handlers)
window.openWorkerInterface = function(workerName) {
  if (window.mainDashboard) {
      window.mainDashboard.openWorkerInterface(workerName);
  }
};

window.testWorker = function(workerName) {
  if (window.mainDashboard) {
      window.mainDashboard.testWorker(workerName);
  }
};

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing AI Factory Main Dashboard...');
  window.mainDashboard = new MainDashboard();
  
  // Load activity from storage after initialization
  setTimeout(() => {
      if (window.mainDashboard) {
          window.mainDashboard.loadActivityFromStorage();
      }
  }, 1000);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.mainDashboard) {
      window.mainDashboard.stopRefreshInterval();
  }
});

// Handle visibility change to pause/resume refreshing when tab is not visible
document.addEventListener('visibilitychange', () => {
  if (window.mainDashboard) {
      if (document.hidden) {
          console.log('Dashboard paused (tab hidden)');
          window.mainDashboard.stopRefreshInterval();
      } else {
          console.log('Dashboard resumed (tab visible)');
          window.mainDashboard.startRefreshInterval();
          // Immediate refresh when returning to tab
          window.mainDashboard.forceHealthCheck();
      }
  }
});

// Export for use in other modules or debugging
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MainDashboard;
}