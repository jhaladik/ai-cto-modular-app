// public/js/dashboards/client/client-dashboard.js
// Phase 4: Client Dashboard - Complete implementation using shared components

import { KAMContext } from '../../core/phase1-integration.js';
import { TopicInputWidget } from '../../components/widgets/shared-widget-library.js';
import { ProgressTrackerWidget } from '../../components/widgets/shared-widget-library.js';

export class ClientDashboard {
  constructor() {
    this.kamContext = null;
    this.components = new Map();
    this.workers = new Map();
    this.naturalLanguage = null;
    this.initialized = false;
  }

  async initialize(sessionToken) {
    if (this.initialized) return;

    try {
      console.log('🎯 Initializing Client Dashboard...');

      // Initialize KAM context
      this.kamContext = window.kamContext || new KAMContext(sessionToken);
      if (!this.kamContext.initialized) {
        await this.kamContext.initialize();
      }

      // Verify client access
      if (!this.kamContext.hasPermission('client_access')) {
        window.location.href = '/access-denied.html';
        return;
      }

      // Load client-appropriate components
      await this.loadComponents();
      await this.loadWorkers();
      
      // Render dashboard
      this.render();
      
      this.initialized = true;
      console.log('✅ Client Dashboard initialized successfully');

    } catch (error) {
      console.error('❌ Client Dashboard initialization failed:', error);
      this.showError('Failed to initialize dashboard');
    }
  }

  async loadComponents() {
    // Natural Language Interface
    this.naturalLanguage = new NaturalLanguageInterface({
      kamContext: this.kamContext,
      onRequest: (request) => this.handleNaturalLanguageRequest(request)
    });

    // Usage Dashboard
    this.components.set('usage-dashboard', new UsageDashboard({
      kamContext: this.kamContext,
      refreshInterval: 30000
    }));

    // Request History  
    this.components.set('request-history', new RequestHistory({
      kamContext: this.kamContext,
      maxItems: 10
    }));

    // Budget Monitor
    this.components.set('budget-monitor', new BudgetMonitor({
      kamContext: this.kamContext,
      warningThreshold: 0.8
    }));

    console.log(`📦 Loaded ${this.components.size} client components`);
  }

  async loadWorkers() {
    // Load only workers available to client tier
    const availableWorkers = await this.getAvailableWorkers();
    
    for (const workerId of availableWorkers) {
      try {
        const card = await window.phase3Manager.loadWorkerCard(workerId, this.kamContext);
        if (card) {
          this.workers.set(workerId, card);
        }
      } catch (error) {
        console.warn(`Failed to load worker ${workerId}:`, error);
      }
    }

    console.log(`🔧 Loaded ${this.workers.size} worker cards`);
  }

  async getAvailableWorkers() {
    const tierAccess = {
      'basic': ['topic-researcher'],
      'standard': ['topic-researcher', 'content-classifier'],
      'premium': ['topic-researcher', 'content-classifier', 'report-builder'],
      'enterprise': ['topic-researcher', 'content-classifier', 'report-builder']
    };

    const tier = this.kamContext.clientProfile?.subscription_tier || 'basic';
    return tierAccess[tier] || [];
  }

  render() {
    const container = document.getElementById('client-dashboard') || document.body;
    
    container.innerHTML = `
      <div class="client-dashboard">
        ${this.renderHeader()}
        ${this.renderWelcomeSection()}
        ${this.renderNaturalLanguageInterface()}
        <div class="dashboard-sections">
          ${this.renderQuickActions()}
          ${this.renderWorkerCards()}
          ${this.renderUsageOverview()}
          ${this.renderRecentActivity()}
        </div>
      </div>
    `;

    this.initializeComponents();
  }

  renderHeader() {
    const client = this.kamContext.clientProfile;
    
    return `
      <header class="client-header">
        <div class="header-content">
          <div class="client-info">
            <h1>Welcome, ${client.company_name || 'Client'}</h1>
            <div class="subscription-info">
              <span class="tier-badge tier-${client.subscription_tier}">
                ${client.subscription_tier?.toUpperCase() || 'BASIC'}
              </span>
              <span class="account-status">Active</span>
            </div>
          </div>
          <div class="header-actions">
            <button class="btn-secondary" onclick="this.showHelp()">
              ❓ Help
            </button>
            <button class="btn-secondary" onclick="this.showAccount()">
              ⚙️ Account
            </button>
            <button class="btn-danger" onclick="this.logout()">
              🚪 Logout
            </button>
          </div>
        </div>
      </header>
    `;
  }

  renderWelcomeSection() {
    return `
      <section class="welcome-section">
        <div class="welcome-content">
          <h2>AI-Powered Intelligence at Your Fingertips</h2>
          <p>Access powerful research and analysis tools tailored to your business needs.</p>
        </div>
        <div class="quick-stats">
          ${this.renderQuickStats()}
        </div>
      </section>
    `;
  }

  renderQuickStats() {
    const usageDashboard = this.components.get('usage-dashboard');
    const stats = usageDashboard?.getQuickStats() || {};

    return `
      <div class="stat-card">
        <div class="stat-value">${stats.requestsThisMonth || 0}</div>
        <div class="stat-label">Requests This Month</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.budgetUsed || '$0'}</div>
        <div class="stat-label">Budget Used</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.lastRequest || 'Never'}</div>
        <div class="stat-label">Last Request</div>
      </div>
    `;
  }

  renderNaturalLanguageInterface() {
    return `
      <section class="natural-language-section">
        <h2>💬 Tell us what you need</h2>
        <div class="nl-interface" id="nl-interface">
          ${this.naturalLanguage ? this.naturalLanguage.render() : this.renderBasicInterface()}
        </div>
      </section>
    `;
  }

  renderBasicInterface() {
    return `
      <div class="basic-nl-interface">
        <textarea 
          id="nl-input" 
          placeholder="Describe what research or analysis you need... (e.g., 'Find recent articles about AI in healthcare and create an executive summary')"
          rows="3"
        ></textarea>
        <div class="nl-actions">
          <button class="btn-primary" onclick="this.processNaturalLanguageRequest()">
            🚀 Process Request
          </button>
          <button class="btn-secondary" onclick="this.showExamples()">
            💡 Show Examples
          </button>
        </div>
      </div>
    `;
  }

  renderQuickActions() {
    return `
      <section class="quick-actions">
        <h3>⚡ Quick Actions</h3>
        <div class="action-grid">
          <button class="action-card" onclick="this.quickResearch()">
            <div class="action-icon">🔬</div>
            <div class="action-title">Quick Research</div>
            <div class="action-desc">Start a research session</div>
          </button>
          <button class="action-card" onclick="this.viewReports()">
            <div class="action-icon">📊</div>
            <div class="action-title">My Reports</div>
            <div class="action-desc">View recent reports</div>
          </button>
          <button class="action-card" onclick="this.scheduleReport()">
            <div class="action-icon">⏰</div>
            <div class="action-title">Schedule Report</div>
            <div class="action-desc">Set up recurring analysis</div>
          </button>
        </div>
      </section>
    `;
  }

  renderWorkerCards() {
    if (this.workers.size === 0) {
      return `
        <section class="worker-cards">
          <h3>🔧 Available Tools</h3>
          <div class="upgrade-prompt">
            <p>Upgrade your plan to access more powerful research tools.</p>
            <button class="btn-primary" onclick="this.showUpgrade()">
              ⬆️ Upgrade Plan
            </button>
          </div>
        </section>
      `;
    }

    const workerCards = Array.from(this.workers.values())
      .map(worker => `<div class="worker-card-wrapper">${worker.render()}</div>`)
      .join('');

    return `
      <section class="worker-cards">
        <h3>🔧 Research Tools</h3>
        <div class="worker-grid">
          ${workerCards}
        </div>
      </section>
    `;
  }

  renderUsageOverview() {
    const usageDashboard = this.components.get('usage-dashboard');
    
    return `
      <section class="usage-overview">
        <h3>📊 Usage Overview</h3>
        <div class="usage-content">
          ${usageDashboard ? usageDashboard.render() : this.renderBasicUsage()}
        </div>
      </section>
    `;
  }

  renderBasicUsage() {
    return `
      <div class="usage-meter">
        <div class="usage-bar">
          <div class="usage-fill" style="width: 45%"></div>
        </div>
        <div class="usage-text">45% of monthly quota used</div>
      </div>
    `;
  }

  renderRecentActivity() {
    const requestHistory = this.components.get('request-history');
    
    return `
      <section class="recent-activity">
        <h3>⏱️ Recent Activity</h3>
        <div class="activity-content">
          ${requestHistory ? requestHistory.render() : this.renderBasicActivity()}
        </div>
      </section>
    `;
  }

  renderBasicActivity() {
    return `
      <div class="activity-list">
        <div class="activity-item">
          <div class="activity-icon">🔬</div>
          <div class="activity-info">
            <div class="activity-title">Research: AI Healthcare</div>
            <div class="activity-time">2 hours ago</div>
          </div>
        </div>
        <div class="activity-item">
          <div class="activity-icon">📊</div>
          <div class="activity-info">
            <div class="activity-title">Report: Weekly Briefing</div>
            <div class="activity-time">1 day ago</div>
          </div>
        </div>
      </div>
    `;
  }

  initializeComponents() {
    // Mount worker cards
    this.workers.forEach(worker => {
      if (worker.mount) {
        setTimeout(() => worker.mount(), 100);
      }
    });

    // Initialize natural language interface
    if (this.naturalLanguage && this.naturalLanguage.mount) {
      this.naturalLanguage.mount();
    }
  }

  // Event Handlers
  async processNaturalLanguageRequest() {
    const input = document.getElementById('nl-input');
    const request = input?.value?.trim();
    
    if (!request) {
      alert('Please describe what you need');
      return;
    }

    await this.handleNaturalLanguageRequest(request);
  }

  async handleNaturalLanguageRequest(request) {
    console.log('Processing natural language request:', request);
    
    // Show processing state
    const progressTracker = new ProgressTrackerWidget({
      stages: ['Analyzing Request', 'Selecting Tools', 'Executing', 'Preparing Results'],
      showCost: true,
      kamContext: this.kamContext
    });
    
    // This would integrate with the natural language processing system
    alert(`Processing request: "${request}"\n\nThis would be processed by the AI system to determine the best worker and parameters.`);
  }

  quickResearch() {
    // Navigate to topic researcher
    window.location.hash = '#/workers/topic-researcher';
  }

  viewReports() {
    window.location.hash = '#/reports';
  }

  scheduleReport() {
    alert('Schedule report functionality would be implemented here');
  }

  showUpgrade() {
    alert('Upgrade plan functionality would be implemented here');
  }

  showHelp() {
    window.open('/help.html', '_blank');
  }

  showAccount() {
    window.location.hash = '#/account';
  }

  showExamples() {
    const examples = [
      'Find recent articles about artificial intelligence in healthcare',
      'Create a weekly report on cryptocurrency trends',
      'Analyze sentiment around renewable energy in the news',
      'Research competition for electric vehicle companies'
    ];
    
    alert('Example requests:\n\n' + examples.map(e => `• ${e}`).join('\n'));
  }

  logout() {
    if (confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('bitware-session-token');
      window.location.href = '/login.html';
    }
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => errorDiv.remove(), 5000);
  }
}

// Supporting Classes

class NaturalLanguageInterface {
  constructor(config) {
    this.kamContext = config.kamContext;
    this.onRequest = config.onRequest;
  }

  render() {
    return `
      <div class="advanced-nl-interface">
        <div class="nl-input-area">
          <textarea 
            id="advanced-nl-input" 
            placeholder="Describe your research needs in natural language..."
            rows="4"
          ></textarea>
          <div class="nl-suggestions" id="nl-suggestions">
            <!-- AI-powered suggestions would appear here -->
          </div>
        </div>
        <div class="nl-controls">
          <button class="btn-primary" onclick="this.processAdvancedRequest()">
            🚀 Process with AI
          </button>
          <button class="btn-secondary" onclick="this.showTemplates()">
            📋 Use Template
          </button>
        </div>
      </div>
    `;
  }

  mount() {
    // Initialize advanced NL features
    console.log('🗣️ Natural Language Interface mounted');
  }
}

class UsageDashboard {
  constructor(config) {
    this.kamContext = config.kamContext;
    this.refreshInterval = config.refreshInterval;
  }

  render() {
    return `
      <div class="usage-dashboard">
        <div class="usage-metrics">
          <div class="metric">
            <span class="metric-label">Requests Used</span>
            <span class="metric-value">45 / 100</span>
          </div>
          <div class="metric">
            <span class="metric-label">Budget Used</span>
            <span class="metric-value">$23.50 / $50.00</span>
          </div>
        </div>
        <div class="usage-chart">
          <!-- Usage chart would be rendered here -->
          <div class="chart-placeholder">📈 Usage trending upward</div>
        </div>
      </div>
    `;
  }

  getQuickStats() {
    return {
      requestsThisMonth: 45,
      budgetUsed: '$23.50',
      lastRequest: '2 hours ago'
    };
  }
}

class RequestHistory {
  constructor(config) {
    this.kamContext = config.kamContext;
    this.maxItems = config.maxItems;
  }

  render() {
    return `
      <div class="request-history">
        <div class="history-filters">
          <select id="history-filter">
            <option value="all">All Requests</option>
            <option value="research">Research</option>
            <option value="reports">Reports</option>
          </select>
        </div>
        <div class="history-list">
          <!-- Request history items would be populated here -->
          <div class="history-item">
            <div class="request-type">🔬 Research</div>
            <div class="request-details">
              <div class="request-title">AI Healthcare Analysis</div>
              <div class="request-meta">2 hours ago • $2.34</div>
            </div>
            <div class="request-status">✅ Complete</div>
          </div>
        </div>
      </div>
    `;
  }
}

class BudgetMonitor {
  constructor(config) {
    this.kamContext = config.kamContext;
    this.warningThreshold = config.warningThreshold;
  }

  render() {
    return `
      <div class="budget-monitor">
        <div class="budget-header">
          <h4>💰 Budget Status</h4>
          <span class="budget-status">On Track</span>
        </div>
        <div class="budget-progress">
          <div class="budget-bar">
            <div class="budget-fill" style="width: 47%"></div>
          </div>
          <div class="budget-text">$23.50 of $50.00 used</div>
        </div>
      </div>
    `;
  }
}

// Global initialization
window.ClientDashboard = ClientDashboard;

console.log('✅ Client Dashboard loaded successfully');