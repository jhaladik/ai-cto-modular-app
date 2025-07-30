// public/js/workers/topic-researcher/interface.js
// Topic Researcher Full Interface - Complete Universal Researcher 2.0 functionality
// Follows Phase 2 patterns using WorkerInterfaceBase and shared components

import { WorkerInterfaceBase } from '../../components/base/worker-base-classes.js';
import { TopicInput } from '../../components/widgets/shared-widget-library.js';
import { ProgressTracker } from '../../components/widgets/shared-widget-library.js';
import { ResultsTable } from '../../components/widgets/shared-widget-library.js';
import { ExportManager } from '../../components/widgets/shared-widget-library.js';
import { TemplateGallery } from '../../components/worker-specific/worker-specific-components.js';
import { ParameterBuilder } from '../../components/worker-specific/worker-specific-components.js';
import { CostEstimator } from '../../components/worker-specific/worker-specific-components.js';

export class TopicResearcherInterface extends WorkerInterfaceBase {
  constructor(kamContext) {
    super({
      workerId: 'topic-researcher',
      title: '🔬 Universal Researcher - Research Command Center',
      kamContext,
      tabs: ['Research', 'Templates', 'Sessions', 'Results', 'Analytics', 'Settings']
    });

    // Initialize components
    this.topicInput = new TopicInput({
      id: `topic-interface-${this.workerId}`,
      placeholder: 'Enter research topic (e.g., "artificial intelligence in healthcare")...',
      suggestions: true,
      validation: true,
      multiTopic: true, // Allow multiple topics for batch research
      kamContext: this.kamContext
    });

    this.templateGallery = new TemplateGallery({
      workerId: this.workerId,
      templates: this.getResearchTemplates(),
      features: {
        customization: true,
        saving: true,
        sharing: true
      },
      kamContext: this.kamContext
    });

    this.parameterBuilder = new ParameterBuilder({
      workerId: this.workerId,
      parameters: this.getParameterDefinitions(),
      presets: this.getParameterPresets(),
      kamContext: this.kamContext
    });

    this.costEstimator = new CostEstimator({
      workerId: this.workerId,
      costModel: this.getCostModel(),
      realTime: true,
      budgetTracking: true,
      kamContext: this.kamContext
    });

    this.progressTracker = new ProgressTracker({
      stages: [
        'Initializing Research',
        'Discovering Sources',
        'Validating Feeds',
        'Fetching Samples',
        'AI Quality Analysis',
        'Ranking Sources',
        'Finalizing Results'
      ],
      showCost: true,
      showProgress: true,
      showETA: true,
      realTimeUpdates: true,
      kamContext: this.kamContext
    });

    this.resultsTable = new ResultsTable({
      id: `results-interface-${this.workerId}`,
      columns: [
        { key: 'title', label: 'Source', sortable: true, searchable: true, width: '25%' },
        { key: 'url', label: 'URL', type: 'link', width: '20%' },
        { key: 'feed_url', label: 'Feed URL', type: 'link', width: '15%' },
        { key: 'relevance_score', label: 'Relevance', type: 'score', sortable: true, width: '10%' },
        { key: 'quality_score', label: 'Quality', type: 'score', sortable: true, width: '10%' },
        { key: 'platform', label: 'Platform', type: 'badge', filterable: true, width: '8%' },
        { key: 'language', label: 'Language', type: 'badge', filterable: true, width: '7%' },
        { key: 'discovered_at', label: 'Discovered', type: 'datetime', sortable: true, width: '10%' }
      ],
      actionButtons: [
        { label: 'Preview', action: 'previewSource', icon: '👁️' },
        { label: 'Add to Library', action: 'addToLibrary', icon: '📚' },
        { label: 'Analyze Content', action: 'analyzeContent', icon: '🧠' },
        { label: 'Export', action: 'exportSource', icon: '📤' }
      ],
      features: {
        pagination: true,
        search: true,
        filter: true,
        sort: true,
        groupBy: true,
        bulkActions: true,
        realTimeUpdates: true
      },
      kamContext: this.kamContext
    });

    this.exportManager = new ExportManager({
      id: `export-interface-${this.workerId}`,
      formats: ['json', 'csv', 'xlsx', 'opml', 'rss'],
      templates: ['source-list', 'research-report', 'rss-bundle', 'analysis-summary'],
      batchExport: true,
      scheduledExport: true,
      kamContext: this.kamContext
    });

    // State management
    this.currentSession = null;
    this.activeSessions = new Map();
    this.researchResults = [];
    this.sessionHistory = [];
    this.savedTemplates = [];
    this.currentFilters = {};
    this.selectedSources = new Set();
    this.batchQueue = [];
  }

  renderTabContent(activeTab) {
    switch (activeTab) {
      case 'Research':
        return this.renderResearchTab();
      case 'Templates':
        return this.renderTemplatesTab();
      case 'Sessions':
        return this.renderSessionsTab();
      case 'Results':
        return this.renderResultsTab();
      case 'Analytics':
        return this.renderAnalyticsTab();
      case 'Settings':
        return this.renderSettingsTab();
      default:
        return this.renderResearchTab();
    }
  }

  renderResearchTab() {
    return `
      <div class="research-tab">
        <div class="research-setup">
          <div class="topic-section">
            <h3>Research Topic</h3>
            ${this.topicInput.render()}
            
            <div class="topic-options">
              <label>
                <input type="checkbox" id="multi-topic-mode">
                Multi-topic batch research
              </label>
              <label>
                <input type="checkbox" id="related-topics">
                Include related topics
              </label>
              <label>
                <input type="checkbox" id="auto-expand">
                Auto-expand with subtopics
              </label>
            </div>
          </div>

          <div class="template-section">
            <h3>Research Template</h3>
            ${this.templateGallery.render()}
          </div>

          <div class="parameters-section">
            <h3>Research Parameters</h3>
            ${this.parameterBuilder.render()}
          </div>

          <div class="advanced-options">
            <details>
              <summary>Advanced Options</summary>
              <div class="advanced-content">
                <div class="option-group">
                  <h4>Platform Priority</h4>
                  <div class="platform-priorities">
                    <label>RSS Feeds <input type="range" min="0" max="10" value="8" id="priority-rss"></label>
                    <label>YouTube <input type="range" min="0" max="10" value="6" id="priority-youtube"></label>
                    <label>Podcasts <input type="range" min="0" max="10" value="5" id="priority-podcasts"></label>
                    <label>Academic <input type="range" min="0" max="10" value="7" id="priority-academic"></label>
                    <label>News <input type="range" min="0" max="10" value="6" id="priority-news"></label>
                  </div>
                </div>

                <div class="option-group">
                  <h4>Quality Filters</h4>
                  <label>Minimum subscriber count: <input type="number" id="min-subscribers" value="1000"></label>
                  <label>Minimum posts per month: <input type="number" id="min-activity" value="2"></label>
                  <label>Language filter: 
                    <select id="language-filter">
                      <option value="any">Any Language</option>
                      <option value="en" selected>English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="it">Italian</option>
                    </select>
                  </label>
                </div>

                <div class="option-group">
                  <h4>Performance Options</h4>
                  <label>
                    <input type="checkbox" id="parallel-processing" checked>
                    Enable parallel processing
                  </label>
                  <label>
                    <input type="checkbox" id="cache-results" checked>
                    Cache intermediate results
                  </label>
                  <label>
                    <input type="checkbox" id="real-time-updates" checked>
                    Real-time progress updates
                  </label>
                </div>
              </div>
            </details>
          </div>

          <div class="cost-budget-section">
            ${this.costEstimator.render()}
            
            <div class="budget-controls">
              <label>
                Research Budget: $<input type="number" id="research-budget" value="10.00" step="0.50" min="1.00">
              </label>
              <label>
                <input type="checkbox" id="auto-stop">
                Auto-stop when budget reached
              </label>
            </div>
          </div>

          <div class="action-section">
            <div class="primary-actions">
              <button 
                class="btn btn-primary btn-large" 
                onclick="this.startResearch()"
                id="start-research-btn"
              >
                <span class="btn-icon">🔬</span>
                Start Research
              </button>
              
              <button 
                class="btn btn-secondary" 
                onclick="this.scheduleResearch()"
                id="schedule-research-btn"
              >
                📅 Schedule Research
              </button>
            </div>

            <div class="secondary-actions">
              <button class="btn btn-outline" onclick="this.previewResearch()">
                👁️ Preview Setup
              </button>
              <button class="btn btn-outline" onclick="this.saveAsTemplate()">
                💾 Save Template
              </button>
              <button class="btn btn-outline" onclick="this.addToBatch()">
                📋 Add to Batch
              </button>
            </div>
          </div>
        </div>

        <div class="batch-queue" id="batch-queue" style="display: none;">
          <h3>Batch Research Queue</h3>
          <div id="batch-items"></div>
          <div class="batch-actions">
            <button class="btn btn-primary" onclick="this.executeBatch()">
              🚀 Execute Batch
            </button>
            <button class="btn btn-secondary" onclick="this.clearBatch()">
              🗑️ Clear Queue
            </button>
          </div>
        </div>

        <div class="progress-section" id="progress-section" style="display: none;">
          ${this.progressTracker.render()}
          
          <div class="live-updates" id="live-updates">
            <div class="update-feed"></div>
          </div>
        </div>

        <div class="quick-results" id="quick-results" style="display: none;">
          <h3>Research Results Preview</h3>
          <div id="results-preview"></div>
          <button class="btn btn-link" onclick="this.switchToResultsTab()">
            View All Results →
          </button>
        </div>
      </div>
    `;
  }

  renderTemplatesTab() {
    return `
      <div class="templates-tab">
        <div class="templates-header">
          <h3>Research Templates</h3>
          <div class="templates-controls">
            <button class="btn btn-primary" onclick="this.createNewTemplate()">
              ➕ Create Template
            </button>
            <button class="btn btn-secondary" onclick="this.importTemplate()">
              📥 Import Template
            </button>
            <button class="btn btn-outline" onclick="this.refreshTemplates()">
              🔄 Refresh
            </button>
          </div>
        </div>

        <div class="template-categories">
          <div class="category-tabs">
            <button class="tab-btn active" onclick="this.showTemplateCategory('builtin')">
              Built-in Templates
            </button>
            <button class="tab-btn" onclick="this.showTemplateCategory('custom')">
              Custom Templates
            </button>
            <button class="tab-btn" onclick="this.showTemplateCategory('shared')">
              Shared Templates
            </button>
          </div>
        </div>

        <div class="template-grid" id="template-grid">
          ${this.renderTemplateGrid()}
        </div>

        <div class="template-editor" id="template-editor" style="display: none;">
          <h4>Template Editor</h4>
          <div class="editor-content">
            <div class="template-metadata">
              <input type="text" id="template-name" placeholder="Template name...">
              <textarea id="template-description" placeholder="Template description..."></textarea>
              <input type="text" id="template-tags" placeholder="Tags (comma-separated)...">
            </div>
            
            <div class="template-parameters">
              <h5>Parameters</h5>
              <div id="parameter-editor"></div>
            </div>
            
            <div class="template-actions">
              <button class="btn btn-primary" onclick="this.saveTemplate()">
                💾 Save Template
              </button>
              <button class="btn btn-secondary" onclick="this.testTemplate()">
                🧪 Test Template
              </button>
              <button class="btn btn-outline" onclick="this.cancelTemplateEdit()">
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderSessionsTab() {
    return `
      <div class="sessions-tab">
        <div class="sessions-header">
          <h3>Research Sessions</h3>
          <div class="session-stats">
            <div class="stat-card">
              <div class="stat-value">${this.activeSessions.size}</div>
              <div class="stat-label">Active Sessions</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${this.sessionHistory.length}</div>
              <div class="stat-label">Total Sessions</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${this.calculateSuccessRate()}%</div>
              <div class="stat-label">Success Rate</div>
            </div>
          </div>
        </div>

        <div class="active-sessions">
          <h4>Active Sessions</h4>
          <div id="active-sessions-list">
            ${this.renderActiveSessionsList()}
          </div>
        </div>

        <div class="session-history">
          <h4>Session History</h4>
          <div class="history-filters">
            <select id="history-filter-status">
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            <select id="history-filter-template">
              <option value="all">All Templates</option>
              <option value="search_rss">RSS Discovery</option>
              <option value="youtube_research">YouTube Research</option>
              <option value="comprehensive">Comprehensive</option>
            </select>
            
            <input type="date" id="history-filter-date" placeholder="Filter by date">
            
            <button class="btn btn-secondary" onclick="this.filterHistory()">
              🔍 Filter
            </button>
          </div>
          
          <div id="session-history-list">
            ${this.renderSessionHistoryList()}
          </div>
        </div>

        <div class="session-analytics">
          <h4>Session Analytics</h4>
          <div class="analytics-charts">
            <div id="sessions-timeline-chart" class="chart-container"></div>
            <div id="template-usage-chart" class="chart-container"></div>
            <div id="cost-breakdown-chart" class="chart-container"></div>
          </div>
        </div>
      </div>
    `;
  }

  renderResultsTab() {
    return `
      <div class="results-tab">
        <div class="results-header">
          <h3>Research Results</h3>
          <div class="results-summary" id="results-summary">
            ${this.renderResultsSummary()}
          </div>
        </div>

        <div class="results-toolbar">
          <div class="bulk-actions">
            <button class="btn btn-primary" onclick="this.bulkAddToLibrary()">
              📚 Add Selected to Library
            </button>
            <button class="btn btn-secondary" onclick="this.bulkAnalyze()">
              🧠 Analyze Selected
            </button>
            <button class="btn btn-outline" onclick="this.bulkExport()">
              📤 Export Selected
            </button>
          </div>

          <div class="view-controls">
            <button class="btn btn-sm active" onclick="this.setResultsView('table')" data-view="table">
              📋 Table
            </button>
            <button class="btn btn-sm" onclick="this.setResultsView('cards')" data-view="cards">
              🗃️ Cards
            </button>
            <button class="btn btn-sm" onclick="this.setResultsView('map')" data-view="map">
              🗺️ Discovery Map
            </button>
          </div>
        </div>

        <div class="results-filters">
          <div class="filter-chips" id="filter-chips">
            <!-- Dynamic filter chips -->
          </div>
          
          <div class="filter-controls">
            <button class="btn btn-link" onclick="this.showAdvancedFilters()">
              🔍 Advanced Filters
            </button>
            <button class="btn btn-link" onclick="this.clearAllFilters()">
              🗑️ Clear Filters
            </button>
          </div>
        </div>

        <div class="results-content" id="results-content">
          <div class="results-view-table" id="results-table-view">
            ${this.resultsTable.render(this.researchResults)}
          </div>
          
          <div class="results-view-cards" id="results-cards-view" style="display: none;">
            ${this.renderResultsCards()}
          </div>
          
          <div class="results-view-map" id="results-map-view" style="display: none;">
            ${this.renderDiscoveryMap()}
          </div>
        </div>

        <div class="results-pagination" id="results-pagination">
          <!-- Pagination controls -->
        </div>
      </div>
    `;
  }

  renderAnalyticsTab() {
    return `
      <div class="analytics-tab">
        <div class="analytics-overview">
          <h3>Research Analytics</h3>
          <div class="analytics-period">
            <select id="analytics-period">
              <option value="7d">Last 7 days</option>
              <option value="30d" selected>Last 30 days</option>
              <option value="90d">Last 3 months</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>

        <div class="analytics-cards">
          <div class="analytics-card">
            <div class="card-value">${this.researchResults.length}</div>
            <div class="card-label">Total Sources Discovered</div>
            <div class="card-change">+${this.getRecentGrowth('sources')}% this week</div>
          </div>
          <div class="analytics-card">
            <div class="card-value">${this.calculateAverageQuality()}%</div>
            <div class="card-label">Average Quality Score</div>
            <div class="card-change">+${this.getRecentGrowth('quality')}% improvement</div>
          </div>
          <div class="analytics-card">
            <div class="card-value">$${this.calculateTotalCost()}</div>
            <div class="card-label">Total Research Cost</div>
            <div class="card-change">${this.getCostTrend()}</div>
          </div>
          <div class="analytics-card">
            <div class="card-value">${this.getMostUsedTemplate()}</div>
            <div class="card-label">Most Used Template</div>
            <div class="card-change">${this.getTemplateUsagePercent()}% of sessions</div>
          </div>
        </div>

        <div class="analytics-charts">
          <div class="chart-row">
            <div class="chart-section">
              <h4>Discovery Timeline</h4>
              <div id="discovery-timeline-chart" class="chart-container"></div>
            </div>
            <div class="chart-section">
              <h4>Quality Distribution</h4>
              <div id="quality-distribution-chart" class="chart-container"></div>
            </div>
          </div>

          <div class="chart-row">
            <div class="chart-section">
              <h4>Platform Breakdown</h4>
              <div id="platform-breakdown-chart" class="chart-container"></div>
            </div>
            <div class="chart-section">
              <h4>Cost Analysis</h4>
              <div id="cost-analysis-chart" class="chart-container"></div>
            </div>
          </div>

          <div class="chart-row">
            <div class="chart-section">
              <h4>Template Performance</h4>
              <div id="template-performance-chart" class="chart-container"></div>
            </div>
            <div class="chart-section">
              <h4>Research Efficiency</h4>
              <div id="efficiency-trends-chart" class="chart-container"></div>
            </div>
          </div>
        </div>

        <div class="insights-section">
          <h4>AI-Generated Insights</h4>
          <div id="research-insights" class="insights-container">
            ${this.renderResearchInsights()}
          </div>
        </div>

        <div class="recommendations-section">
          <h4>Optimization Recommendations</h4>
          <div id="optimization-recommendations">
            ${this.renderOptimizationRecommendations()}
          </div>
        </div>
      </div>
    `;
  }

  renderSettingsTab() {
    return `
      <div class="settings-tab">
        <div class="settings-sections">
          <div class="settings-section">
            <h3>Research Defaults</h3>
            <div class="setting-group">
              <label>Default Template:</label>
              <select id="default-template">
                <option value="search_rss" selected>RSS Discovery</option>
                <option value="youtube_research">YouTube Research</option>
                <option value="comprehensive">Comprehensive</option>
              </select>
            </div>

            <div class="setting-group">
              <label>Default Discovery Depth:</label>
              <select id="default-depth">
                <option value="1">Level 1 (Surface)</option>
                <option value="2" selected>Level 2 (Standard)</option>
                <option value="3">Level 3 (Deep)</option>
                <option value="4">Level 4 (Comprehensive)</option>
              </select>
            </div>

            <div class="setting-group">
              <label>Default Max Sources:</label>
              <input type="number" id="default-max-sources" value="50" min="10" max="500">
            </div>

            <div class="setting-group">
              <label>Default Budget:</label>
              $<input type="number" id="default-budget" value="10.00" step="0.50" min="1.00">
            </div>
          </div>

          <div class="settings-section">
            <h3>Quality & Filtering</h3>
            <div class="setting-group">
              <label>Minimum Quality Score:</label>
              <input type="range" id="min-quality-score" min="0" max="1" step="0.1" value="0.7">
              <span id="quality-score-value">0.7</span>
            </div>

            <div class="setting-group">
              <label>
                <input type="checkbox" id="auto-quality-filter" checked>
                Enable automatic quality filtering
              </label>
            </div>

            <div class="setting-group">
              <label>
                <input type="checkbox" id="ai-ranking-default" checked>
                Enable AI ranking by default
              </label>
            </div>

            <div class="setting-group">
              <label>
                <input type="checkbox" id="duplicate-removal-default" checked>
                Remove duplicates by default
              </label>
            </div>
          </div>

          <div class="settings-section">
            <h3>Performance & Caching</h3>
            <div class="setting-group">
              <label>
                <input type="checkbox" id="enable-caching" checked>
                Enable result caching
              </label>
            </div>

            <div class="setting-group">
              <label>Cache Duration:</label>
              <select id="cache-duration">
                <option value="3600">1 hour</option>
                <option value="7200" selected>2 hours</option>
                <option value="21600">6 hours</option>
                <option value="86400">24 hours</option>
              </select>
            </div>

            <div class="setting-group">
              <label>
                <input type="checkbox" id="parallel-processing-default" checked>
                Enable parallel processing by default
              </label>
            </div>

            <div class="setting-group">
              <label>Max Concurrent Sessions:</label>
              <select id="max-concurrent">
                <option value="1">1 session</option>
                <option value="2" selected>2 sessions</option>
                <option value="3">3 sessions</option>
                <option value="5">5 sessions</option>
              </select>
            </div>
          </div>

          <div class="settings-section">
            <h3>Notifications & Alerts</h3>
            <div class="setting-group">
              <label>
                <input type="checkbox" id="email-notifications">
                Email notifications for completed research
              </label>
            </div>

            <div class="setting-group">
              <label>
                <input type="checkbox" id="budget-alerts" checked>
                Budget threshold alerts
              </label>
            </div>

            <div class="setting-group">
              <label>Budget Alert Threshold:</label>
              <input type="number" id="budget-alert-threshold" value="80" min="50" max="95">%
            </div>

            <div class="setting-group">
              <label>
                <input type="checkbox" id="quality-alerts">
                Low quality results alerts
              </label>
            </div>
          </div>

          <div class="settings-section">
            <h3>Export & Integration</h3>
            <div class="setting-group">
              <label>Default Export Format:</label>
              <select id="default-export-format">
                <option value="json">JSON</option>
                <option value="csv" selected>CSV</option>
                <option value="xlsx">Excel</option>
                <option value="opml">OPML</option>
              </select>
            </div>

            <div class="setting-group">
              <label>
                <input type="checkbox" id="auto-library-save" checked>
                Automatically save high-quality sources to RSS Library
              </label>
            </div>

            <div class="setting-group">
              <label>
                <input type="checkbox" id="auto-content-analysis">
                Automatically analyze discovered content
              </label>
            </div>
          </div>
        </div>

        <div class="settings-actions">
          <button class="btn btn-primary" onclick="this.saveSettings()">
            💾 Save Settings
          </button>
          <button class="btn btn-secondary" onclick="this.exportSettings()">
            📤 Export Settings
          </button>
          <button class="btn btn-outline" onclick="this.resetSettings()">
            🔄 Reset to Defaults
          </button>
        </div>
      </div>
    `;
  }

  // Main research execution
  async startResearch() {
    const topic = this.topicInput.getValue();
    const multiTopicMode = document.getElementById('multi-topic-mode').checked;
    const template = this.templateGallery.getSelectedTemplate();
    const parameters = this.parameterBuilder.getParameters();
    const budget = parseFloat(document.getElementById('research-budget').value);

    if (!topic || (Array.isArray(topic) && topic.length === 0)) {
      this.showError('Please enter at least one research topic');
      return;
    }

    // Build research request
    const researchRequest = {
      topic: multiTopicMode ? topic : (Array.isArray(topic) ? topic[0] : topic),
      template: template.id,
      parameters: {
        ...parameters,
        budget_limit: budget,
        auto_stop_on_budget: document.getElementById('auto-stop').checked,
        parallel_processing: document.getElementById('parallel-processing').checked,
        cache_results: document.getElementById('cache-results').checked,
        real_time_updates: document.getElementById('real-time-updates').checked
      }
    };

    try {
      this.showProgressSection();
      this.setExecuting(true);

      const result = await this.apiClient.post('/research', researchRequest);
      
      if (result.success) {
        this.currentSession = result.data.session_id;
        this.activeSessions.set(this.currentSession, {
          id: this.currentSession,
          topic: researchRequest.topic,
          template: template.name,
          startedAt: new Date(),
          status: 'running'
        });
        
        this.startSessionMonitoring();
        this.showInfo(`Research started. Session: ${this.currentSession}`);
        
      } else {
        this.showError(result.error || 'Failed to start research');
        this.setExecuting(false);
      }

    } catch (error) {
      console.error('Research error:', error);
      this.showError('Research failed. Please check your settings and try again.');
      this.setExecuting(false);
    }
  }

  async startSessionMonitoring() {
    if (!this.currentSession) return;

    const monitorSession = async () => {
      try {
        const status = await this.apiClient.get(`/session/${this.currentSession}/status`);
        
        if (status.success) {
          const sessionData = status.data;
          
          // Update progress and live feed
          this.updateResearchProgress(sessionData);
          this.updateLiveFeed(sessionData);
          
          if (sessionData.status === 'completed') {
            await this.handleResearchCompletion(sessionData);
            return;
          } else if (sessionData.status === 'failed') {
            this.handleResearchFailure(sessionData);
            return;
          }

          // Continue monitoring
          setTimeout(monitorSession, 2000); // More frequent updates
        }
      } catch (error) {
        console.error('Session monitoring error:', error);
        setTimeout(monitorSession, 5000);
      }
    };

    setTimeout(monitorSession, 1000);
  }

  async handleResearchCompletion(sessionData) {
    // Get full results
    const results = await this.apiClient.get(`/session/${this.currentSession}/results`);
    
    if (results.success) {
      // Update results
      this.researchResults = [...this.researchResults, ...results.data.sources];
      this.updateResultsDisplay();
      
      // Update session tracking
      const sessionInfo = this.activeSessions.get(this.currentSession);
      if (sessionInfo) {
        sessionInfo.status = 'completed';
        sessionInfo.completedAt = new Date();
        sessionInfo.sourcesFound = results.data.sources.length;
        sessionInfo.costUsd = sessionData.cost_usd;
        
        this.sessionHistory.push(sessionInfo);
        this.activeSessions.delete(this.currentSession);
      }
      
      this.showSuccess(`Research completed! Discovered ${sessionData.sources_found} sources`);
      
      // Auto-actions based on settings
      if (document.getElementById('auto-library-save')?.checked) {
        this.autoSaveHighQualitySources(results.data.sources);
      }
    }

    this.hideProgressSection();
    this.setExecuting(false);
    this.currentSession = null;
  }

  updateLiveFeed(sessionData) {
    const feedContainer = document.querySelector('#live-updates .update-feed');
    if (!feedContainer) return;

    const update = document.createElement('div');
    update.className = 'feed-item';
    update.innerHTML = `
      <span class="timestamp">${new Date().toLocaleTimeString()}</span>
      <span class="message">${sessionData.current_stage}: ${sessionData.progress_message || 'Processing...'}</span>
      ${sessionData.sources_discovered ? `<span class="count">${sessionData.sources_discovered} sources</span>` : ''}
    `;
    
    feedContainer.insertBefore(update, feedContainer.firstChild);
    
    // Keep only last 20 updates
    while (feedContainer.children.length > 20) {
      feedContainer.removeChild(feedContainer.lastChild);
    }
  }

  // Helper methods for analytics
  calculateSuccessRate() {
    if (this.sessionHistory.length === 0) return 0;
    const successful = this.sessionHistory.filter(s => s.status === 'completed').length;
    return Math.round((successful / this.sessionHistory.length) * 100);
  }

  calculateAverageQuality() {
    if (this.researchResults.length === 0) return 0;
    const avgQuality = this.researchResults.reduce((sum, r) => sum + (r.quality_score || 0), 0) / this.researchResults.length;
    return Math.round(avgQuality * 100);
  }

  calculateTotalCost() {
    return this.sessionHistory.reduce((sum, s) => sum + (s.costUsd || 0), 0).toFixed(2);
  }

  getMostUsedTemplate() {
    if (this.sessionHistory.length === 0) return 'N/A';
    const templateCounts = {};
    this.sessionHistory.forEach(s => {
      templateCounts[s.template] = (templateCounts[s.template] || 0) + 1;
    });
    return Object.keys(templateCounts).reduce((a, b) => templateCounts[a] > templateCounts[b] ? a : b);
  }

  // Data helper methods
  getResearchTemplates() {
    return [
      {
        id: 'search_rss',
        name: 'RSS Discovery',
        description: 'Discover RSS feeds using search engines and directories',
        icon: '🔍',
        category: 'discovery'
      },
      {
        id: 'youtube_research',
        name: 'YouTube Research',
        description: 'Find relevant YouTube channels and videos',
        icon: '📺',
        category: 'video'
      },
      {
        id: 'podcast_discovery',
        name: 'Podcast Discovery',
        description: 'Discover podcasts across multiple platforms',
        icon: '🎙️',
        category: 'audio'
      },
      {
        id: 'comprehensive',
        name: 'Comprehensive Search',
        description: 'Multi-platform discovery across all sources',
        icon: '🌐',
        category: 'comprehensive'
      },
      {
        id: 'academic_research',
        name: 'Academic Research',
        description: 'Focus on academic papers and journals',
        icon: '🎓',
        category: 'academic'
      }
    ];
  }

  getParameterDefinitions() {
    return {
      discovery_depth: {
        type: 'select',
        label: 'Discovery Depth',
        options: [
          { value: 1, label: 'Level 1 (Surface)' },
          { value: 2, label: 'Level 2 (Standard)' },
          { value: 3, label: 'Level 3 (Deep)' },
          { value: 4, label: 'Level 4 (Comprehensive)' }
        ],
        default: 2
      },
      max_sources: {
        type: 'number',
        label: 'Maximum Sources',
        min: 10,
        max: 500,
        default: 50
      },
      enable_ai_ranking: {
        type: 'checkbox',
        label: 'AI-Powered Ranking',
        default: true
      },
      quality_filtering: {
        type: 'checkbox',
        label: 'Quality Filtering',
        default: true
      },
      remove_duplicates: {
        type: 'checkbox',
        label: 'Remove Duplicates',
        default: true
      }
    };
  }

  getCostModel() {
    return {
      base_costs: {
        search_rss: 0.50,
        youtube_research: 1.00,
        podcast_discovery: 0.75,
        comprehensive: 3.00,
        academic_research: 2.00
      },
      depth_multipliers: [1, 2, 4, 8],
      feature_costs: {
        ai_ranking: 0.02,
        quality_filtering: 0.01,
        duplicate_removal: 0.005
      }
    };
  }

  // Lifecycle methods
  async onMount() {
    await super.onMount();
    
    // Load data
    await this.loadSessionHistory();
    await this.loadSavedTemplates();
    await this.loadUserSettings();
    
    // Initialize components
    await this.templateGallery.init();
    await this.parameterBuilder.init();
    await this.costEstimator.init();
    
    // Setup real-time updates
    this.setupRealTimeUpdates();
  }

  async loadSessionHistory() {
    try {
      const history = await this.apiClient.get('/sessions/history?limit=100');
      if (history.success) {
        this.sessionHistory = history.data || [];
      }
    } catch (error) {
      console.error('Failed to load session history:', error);
    }
  }

  setupRealTimeUpdates() {
    // Setup WebSocket or polling for real-time updates
    // This would connect to the backend for live session updates
  }
}

// Register with component registry
window.phase2Registry?.registerWorkerComponent('topic-researcher', 'interface', TopicResearcherInterface);