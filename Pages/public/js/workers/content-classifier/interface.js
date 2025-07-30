// public/js/workers/content-classifier/interface.js
// Content Classifier Full Interface - Lazily loaded complete functionality
// Follows Phase 2 patterns using WorkerInterfaceBase and shared components

import { WorkerInterfaceBase } from '../../components/base/worker-base-classes.js';
import { TopicInput } from '../../components/widgets/shared-widget-library.js';
import { ProgressTracker } from '../../components/widgets/shared-widget-library.js';
import { ResultsTable } from '../../components/widgets/shared-widget-library.js';
import { ExportManager } from '../../components/widgets/shared-widget-library.js';
import { ParameterBuilder } from '../../components/worker-specific/worker-specific-components.js';
import { CostEstimator } from '../../components/worker-specific/worker-specific-components.js';

export class ContentClassifierInterface extends WorkerInterfaceBase {
  constructor(kamContext) {
    super({
      workerId: 'content-classifier',
      title: '🧠 Content Classifier - AI Analysis Engine',
      kamContext,
      tabs: ['Analyze', 'Jobs', 'Results', 'Settings', 'Analytics']
    });

    // Initialize components
    this.topicInput = new TopicInput({
      id: `topic-interface-${this.workerId}`,
      placeholder: 'Enter target topic for content analysis...',
      suggestions: true,
      validation: true,
      kamContext: this.kamContext
    });

    this.parameterBuilder = new ParameterBuilder({
      workerId: this.workerId,
      parameters: this.getParameterDefinitions(),
      kamContext: this.kamContext
    });

    this.costEstimator = new CostEstimator({
      workerId: this.workerId,
      costModel: this.getCostModel(),
      kamContext: this.kamContext
    });

    this.progressTracker = new ProgressTracker({
      stages: [
        'Initializing Analysis',
        'Processing Content',
        'Extracting Topics',
        'Scoring Relevance',
        'Analyzing Sentiment',
        'Generating Insights',
        'Finalizing Results'
      ],
      showCost: true,
      showProgress: true,
      kamContext: this.kamContext
    });

    this.resultsTable = new ResultsTable({
      id: `results-interface-${this.workerId}`,
      columns: [
        { key: 'article_url', label: 'Source', type: 'link', sortable: true },
        { key: 'title', label: 'Title', sortable: true, searchable: true },
        { key: 'relevance_score', label: 'Relevance', type: 'score', sortable: true },
        { key: 'confidence_score', label: 'Confidence', type: 'score', sortable: true },
        { key: 'sentiment_score', label: 'Sentiment', type: 'sentiment', sortable: true },
        { key: 'quality_score', label: 'Quality', type: 'score', sortable: true },
        { key: 'detected_topics', label: 'Topics', type: 'tags' },
        { key: 'key_entities', label: 'Entities', type: 'tags' },
        { key: 'analyzed_at', label: 'Analyzed', type: 'datetime', sortable: true }
      ],
      actionButtons: [
        { label: 'View Summary', action: 'viewSummary', icon: '📄' },
        { label: 'View Reasoning', action: 'viewReasoning', icon: '🧠' },
        { label: 'Export', action: 'exportArticle', icon: '📤' },
        { label: 'Re-analyze', action: 'reanalyze', icon: '🔄' }
      ],
      features: {
        pagination: true,
        search: true,
        filter: true,
        sort: true,
        groupBy: true
      },
      kamContext: this.kamContext
    });

    this.exportManager = new ExportManager({
      id: `export-interface-${this.workerId}`,
      formats: ['json', 'csv', 'xlsx', 'pdf'],
      templates: ['analysis-report', 'summary-report', 'detailed-insights'],
      kamContext: this.kamContext
    });

    // State management
    this.currentAnalysisJob = null;
    this.analysisResults = [];
    this.recentJobs = [];
    this.jobHistory = [];
    this.currentFilters = {};
    this.selectedResults = new Set();
  }

  renderTabContent(activeTab) {
    switch (activeTab) {
      case 'Analyze':
        return this.renderAnalyzeTab();
      case 'Jobs':
        return this.renderJobsTab();
      case 'Results':
        return this.renderResultsTab();
      case 'Settings':
        return this.renderSettingsTab();
      case 'Analytics':
        return this.renderAnalyticsTab();
      default:
        return this.renderAnalyzeTab();
    }
  }

  renderAnalyzeTab() {
    return `
      <div class="analyze-tab">
        <div class="analysis-setup">
          <div class="setup-section">
            <h3>Content Analysis Setup</h3>
            
            ${this.topicInput.render()}
            
            <div class="content-input-section">
              <h4>Content Source</h4>
              <div class="input-method-selector">
                <label class="radio-option">
                  <input type="radio" name="input-method" value="urls" checked>
                  <span>Article URLs</span>
                </label>
                <label class="radio-option">
                  <input type="radio" name="input-method" value="text">
                  <span>Raw Text</span>
                </label>
                <label class="radio-option">
                  <input type="radio" name="input-method" value="rss">
                  <span>RSS Feeds</span>
                </label>
                <label class="radio-option">
                  <input type="radio" name="input-method" value="upload">
                  <span>File Upload</span>
                </label>
              </div>

              <div class="content-input" id="content-input-container">
                <textarea 
                  id="content-input" 
                  placeholder="Enter article URLs, one per line..."
                  rows="8"
                ></textarea>
                <div class="input-help">
                  <small>Supports URLs, plain text, or structured data. Maximum 100 items per batch.</small>
                </div>
              </div>

              <div class="file-upload-area" id="file-upload-area" style="display: none;">
                <div class="upload-dropzone">
                  <input type="file" id="file-input" accept=".txt,.csv,.xlsx,.json" multiple>
                  <div class="upload-text">
                    <strong>Drop files here</strong> or <button type="button" onclick="document.getElementById('file-input').click()">browse</button>
                    <br><small>Supports TXT, CSV, XLSX, JSON formats</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="parameters-section">
            ${this.parameterBuilder.render()}
          </div>

          <div class="cost-section">
            ${this.costEstimator.render()}
          </div>

          <div class="action-section">
            <div class="analysis-actions">
              <button 
                class="btn btn-primary btn-large" 
                onclick="this.startAnalysis()"
                id="start-analysis-btn"
              >
                <span class="btn-icon">🧠</span>
                Start Analysis
              </button>
              
              <button 
                class="btn btn-secondary" 
                onclick="this.saveAsTemplate()"
              >
                💾 Save as Template
              </button>
              
              <button 
                class="btn btn-outline" 
                onclick="this.previewAnalysis()"
              >
                👁️ Preview Setup
              </button>
            </div>
          </div>
        </div>

        <div class="progress-section" id="progress-section" style="display: none;">
          ${this.progressTracker.render()}
        </div>

        <div class="quick-results" id="quick-results" style="display: none;">
          <h3>Analysis Results</h3>
          <div id="results-preview"></div>
        </div>
      </div>
    `;
  }

  renderJobsTab() {
    return `
      <div class="jobs-tab">
        <div class="jobs-header">
          <h3>Analysis Jobs</h3>
          <div class="jobs-controls">
            <button class="btn btn-secondary" onclick="this.refreshJobs()">
              🔄 Refresh
            </button>
            <button class="btn btn-outline" onclick="this.exportJobHistory()">
              📤 Export History
            </button>
          </div>
        </div>

        <div class="jobs-filters">
          <div class="filter-group">
            <label for="job-status-filter">Status:</label>
            <select id="job-status-filter" onchange="this.filterJobs()">
              <option value="all">All Status</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div class="filter-group">
            <label for="job-date-filter">Date Range:</label>
            <select id="job-date-filter" onchange="this.filterJobs()">
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div class="filter-group">
            <input 
              type="text" 
              id="job-search" 
              placeholder="Search jobs..."
              onkeyup="this.searchJobs()"
            >
          </div>
        </div>

        <div class="jobs-list" id="jobs-list">
          ${this.renderJobsList()}
        </div>
      </div>
    `;
  }

  renderResultsTab() {
    return `
      <div class="results-tab">
        <div class="results-header">
          <h3>Analysis Results</h3>
          <div class="results-summary" id="results-summary">
            ${this.renderResultsSummary()}
          </div>
        </div>

        <div class="results-toolbar">
          <div class="results-actions">
            <button class="btn btn-primary" onclick="this.bulkExport()">
              📤 Export Selected
            </button>
            <button class="btn btn-secondary" onclick="this.compareResults()">
              📊 Compare
            </button>
            <button class="btn btn-outline" onclick="this.generateReport()">
              📄 Generate Report
            </button>
          </div>

          <div class="view-controls">
            <button class="btn btn-sm" onclick="this.setViewMode('table')" data-active>
              📋 Table
            </button>
            <button class="btn btn-sm" onclick="this.setViewMode('cards')">
              🗃️ Cards
            </button>
            <button class="btn btn-sm" onclick="this.setViewMode('chart')">
              📊 Charts
            </button>
          </div>
        </div>

        <div class="results-filters">
          <div class="filter-chips" id="filter-chips">
            <!-- Dynamic filter chips -->
          </div>
          <button class="btn btn-link" onclick="this.showAdvancedFilters()">
            🔍 Advanced Filters
          </button>
        </div>

        <div class="results-content" id="results-content">
          ${this.resultsTable.render(this.analysisResults)}
        </div>

        <div class="results-pagination" id="results-pagination">
          <!-- Pagination controls -->
        </div>
      </div>
    `;
  }

  renderSettingsTab() {
    return `
      <div class="settings-tab">
        <div class="settings-sections">
          <div class="settings-section">
            <h3>Analysis Defaults</h3>
            <div class="setting-group">
              <label>Default Analysis Depth:</label>
              <select id="default-depth">
                <option value="quick">Quick</option>
                <option value="standard" selected>Standard</option>
                <option value="deep">Deep</option>
              </select>
            </div>

            <div class="setting-group">
              <label>Default Confidence Threshold:</label>
              <input type="range" id="default-confidence" min="0.1" max="1.0" step="0.1" value="0.8">
              <span id="confidence-value">0.8</span>
            </div>

            <div class="setting-group">
              <label>
                <input type="checkbox" id="auto-summary" checked>
                Always include AI summaries
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
              <label>
                <input type="checkbox" id="parallel-processing" checked>
                Enable parallel processing
              </label>
            </div>

            <div class="setting-group">
              <label>Batch Size:</label>
              <select id="batch-size">
                <option value="5">5 articles</option>
                <option value="10" selected>10 articles</option>
                <option value="25">25 articles</option>
                <option value="50">50 articles</option>
              </select>
            </div>
          </div>

          <div class="settings-section">
            <h3>Export & Notifications</h3>
            <div class="setting-group">
              <label>Default Export Format:</label>
              <select id="default-export">
                <option value="json">JSON</option>
                <option value="csv" selected>CSV</option>
                <option value="xlsx">Excel</option>
              </select>
            </div>

            <div class="setting-group">
              <label>
                <input type="checkbox" id="email-notifications">
                Email notifications for completed jobs
              </label>
            </div>
          </div>
        </div>

        <div class="settings-actions">
          <button class="btn btn-primary" onclick="this.saveSettings()">
            💾 Save Settings
          </button>
          <button class="btn btn-outline" onclick="this.resetSettings()">
            🔄 Reset to Defaults
          </button>
        </div>
      </div>
    `;
  }

  renderAnalyticsTab() {
    return `
      <div class="analytics-tab">
        <div class="analytics-overview">
          <h3>Content Analysis Analytics</h3>
          <div class="analytics-cards">
            <div class="analytics-card">
              <div class="card-value">${this.analysisResults.length}</div>
              <div class="card-label">Total Articles Analyzed</div>
            </div>
            <div class="analytics-card">
              <div class="card-value">${this.calculateAverageRelevance()}%</div>
              <div class="card-label">Average Relevance Score</div>
            </div>
            <div class="analytics-card">
              <div class="card-value">${this.getTopTopics(1)[0] || 'N/A'}</div>
              <div class="card-label">Top Detected Topic</div>
            </div>
            <div class="analytics-card">
              <div class="card-value">$${this.calculateTotalCost()}</div>
              <div class="card-label">Total Analysis Cost</div>
            </div>
          </div>
        </div>

        <div class="analytics-charts">
          <div class="chart-section">
            <h4>Relevance Score Distribution</h4>
            <div id="relevance-chart" class="chart-container"></div>
          </div>

          <div class="chart-section">
            <h4>Topic Frequency</h4>
            <div id="topics-chart" class="chart-container"></div>
          </div>

          <div class="chart-section">
            <h4>Analysis Timeline</h4>
            <div id="timeline-chart" class="chart-container"></div>
          </div>

          <div class="chart-section">
            <h4>Sentiment Analysis</h4>
            <div id="sentiment-chart" class="chart-container"></div>
          </div>
        </div>

        <div class="insights-section">
          <h4>AI Insights</h4>
          <div id="ai-insights" class="insights-container">
            <!-- AI-generated insights about analysis patterns -->
          </div>
        </div>
      </div>
    `;
  }

  // Main analysis execution
  async startAnalysis() {
    const topic = this.topicInput.getValue();
    const content = document.getElementById('content-input').value;
    const inputMethod = document.querySelector('input[name="input-method"]:checked').value;
    
    if (!topic || !content) {
      this.showError('Please enter both a target topic and content to analyze');
      return;
    }

    const parameters = this.parameterBuilder.getParameters();
    const analysisRequest = {
      target_topic: topic,
      analysis_depth: parameters.analysis_depth,
      confidence_threshold: parameters.confidence_threshold,
      include_summary: parameters.include_summary,
      extract_entities: parameters.extract_entities,
      sentiment_analysis: parameters.sentiment_analysis,
      batch_process: true,
      source_type: inputMethod,
      content: this.parseContentInput(content, inputMethod)
    };

    try {
      this.showProgressSection();
      this.setExecuting(true);

      // Start analysis
      const result = await this.apiClient.post('/analyze', analysisRequest);
      
      if (result.success) {
        if (result.data.job_id) {
          // Batch job started
          this.currentAnalysisJob = result.data.job_id;
          this.startJobMonitoring();
        } else {
          // Immediate results
          this.handleAnalysisResults(result.data);
        }
      } else {
        this.showError(result.error || 'Analysis failed to start');
        this.setExecuting(false);
      }

    } catch (error) {
      console.error('Analysis error:', error);
      this.showError('Analysis failed. Please check your input and try again.');
      this.setExecuting(false);
    }
  }

  parseContentInput(content, inputMethod) {
    switch (inputMethod) {
      case 'urls':
        return content.split('\n')
          .filter(line => line.trim())
          .map(url => ({ article_url: url.trim() }));
      
      case 'text':
        return content.split('\n\n')
          .filter(text => text.trim())
          .map((text, index) => ({
            content: text.trim(),
            article_url: `text-${Date.now()}-${index}`
          }));
      
      case 'rss':
        return content.split('\n')
          .filter(line => line.trim())
          .map(url => ({ rss_feed: url.trim() }));
      
      default:
        return [];
    }
  }

  async startJobMonitoring() {
    if (!this.currentAnalysisJob) return;

    const monitorJob = async () => {
      try {
        const status = await this.apiClient.get(`/job/${this.currentAnalysisJob}/status`);
        
        if (status.success) {
          const jobData = status.data;
          
          // Update progress
          this.updateJobProgress(jobData);
          
          if (jobData.status === 'completed') {
            await this.handleJobCompletion(jobData);
            return;
          } else if (jobData.status === 'failed') {
            this.handleJobFailure(jobData);
            return;
          }

          // Continue monitoring
          setTimeout(monitorJob, 3000);
        }
      } catch (error) {
        console.error('Job monitoring error:', error);
        setTimeout(monitorJob, 5000);
      }
    };

    setTimeout(monitorJob, 2000);
  }

  async handleJobCompletion(jobData) {
    // Get full results
    const results = await this.apiClient.get(`/job/${this.currentAnalysisJob}/results`);
    
    if (results.success) {
      this.analysisResults = [...this.analysisResults, ...results.data.analyses];
      this.updateResultsDisplay();
      this.showSuccess(`Analysis completed! Processed ${jobData.articles_processed} articles`);
    }

    this.hideProgressSection();
    this.setExecuting(false);
    this.currentAnalysisJob = null;
  }

  // Helper methods
  getParameterDefinitions() {
    return {
      analysis_depth: {
        type: 'select',
        label: 'Analysis Depth',
        options: [
          { value: 'quick', label: 'Quick ($0.01-0.05 per article)' },
          { value: 'standard', label: 'Standard ($0.05-0.15 per article)' },
          { value: 'deep', label: 'Deep ($0.15-0.30 per article)' }
        ],
        default: 'standard'
      },
      confidence_threshold: {
        type: 'range',
        label: 'Confidence Threshold',
        min: 0.1,
        max: 1.0,
        step: 0.1,
        default: 0.8
      },
      include_summary: {
        type: 'checkbox',
        label: 'Include AI Summary',
        default: true
      },
      extract_entities: {
        type: 'checkbox',
        label: 'Extract Key Entities',
        default: true
      },
      sentiment_analysis: {
        type: 'checkbox',
        label: 'Sentiment Analysis',
        default: false
      }
    };
  }

  getCostModel() {
    return {
      base_cost: 0.01,
      depth_multipliers: {
        quick: 1.0,
        standard: 3.0,
        deep: 8.0
      },
      feature_costs: {
        summary: 0.02,
        entities: 0.01,
        sentiment: 0.015
      }
    };
  }

  // Lifecycle methods
  async onMount() {
    await super.onMount();
    
    // Load recent data
    await this.loadRecentJobs();
    await this.loadRecentResults();
    
    // Initialize components
    await this.parameterBuilder.init();
    await this.costEstimator.init();
    
    // Set up event listeners
    this.setupAdvancedEventListeners();
  }

  setupAdvancedEventListeners() {
    // Input method change
    document.querySelectorAll('input[name="input-method"]').forEach(radio => {
      radio.addEventListener('change', this.handleInputMethodChange.bind(this));
    });

    // File upload
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
      fileInput.addEventListener('change', this.handleFileUpload.bind(this));
    }
  }

  handleInputMethodChange(event) {
    const method = event.target.value;
    const contentContainer = document.getElementById('content-input-container');
    const fileUploadArea = document.getElementById('file-upload-area');
    
    if (method === 'upload') {
      contentContainer.style.display = 'none';
      fileUploadArea.style.display = 'block';
    } else {
      contentContainer.style.display = 'block';
      fileUploadArea.style.display = 'none';
      
      // Update placeholder
      const textarea = document.getElementById('content-input');
      const placeholders = {
        urls: 'Enter article URLs, one per line...',
        text: 'Enter article text content, separated by double line breaks...',
        rss: 'Enter RSS feed URLs, one per line...'
      };
      textarea.placeholder = placeholders[method] || 'Enter content...';
    }
  }

  async handleFileUpload(event) {
    const files = event.target.files;
    if (!files.length) return;

    // Process uploaded files
    for (const file of files) {
      try {
        const content = await this.readFile(file);
        // Process based on file type
        // Add to content input or process directly
      } catch (error) {
        console.error('File processing error:', error);
        this.showError(`Failed to process file: ${file.name}`);
      }
    }
  }

  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
}

// Register with component registry
window.phase2Registry?.registerWorkerComponent('content-classifier', 'interface', ContentClassifierInterface);