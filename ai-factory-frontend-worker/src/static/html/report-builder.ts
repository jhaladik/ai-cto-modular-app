// AI Factory Frontend Worker - Report Builder Interface HTML
// @WORKER: FrontendWorker
// 🧱 Type: StaticHTML
// 📍 Path: src/static/html/report-builder.ts
// 🎯 Role: Report builder worker interface for generating intelligence reports
// 💾 Storage: { embedded: "worker_code" }

export const REPORT_BUILDER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Factory - Report Builder</title>
    <link rel="stylesheet" href="/static/css/shared.css">
    <link rel="stylesheet" href="/static/css/components.css">
</head>
<body>
    <div id="app">
        <!-- Header -->
        <header class="header">
            <div class="container">
                <h1><a href="/" style="color: inherit; text-decoration: none;">🏭 AI Factory</a> - Report Builder</h1>
                <div class="header-controls">
                    <span id="user-info"></span>
                    <a href="/" class="btn btn-secondary">Dashboard</a>
                    <button id="logout-btn" class="btn btn-secondary">Logout</button>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="worker-interface">
            <!-- Worker Header -->
            <div class="worker-header">
                <h1>📄 Report Builder</h1>
                <p>Generate comprehensive intelligence reports from analyzed content</p>
            </div>

            <!-- Report Generation Form -->
            <div class="form-container">
                <h2>Generate New Report</h2>
                <form id="report-form">
                    <div class="form-row">
                        <div class="form-col-2">
                            <div class="form-group">
                                <label for="report-title">Report Title *</label>
                                <input type="text" id="report-title" name="title" required 
                                       placeholder="Enter report title (e.g., Weekly AI Industry Analysis)">
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group">
                                <label for="report-type">Report Type</label>
                                <select id="report-type" name="report_type">
                                    <option value="intelligence" selected>Intelligence Report</option>
                                    <option value="summary">Summary Report</option>
                                    <option value="analysis">Deep Analysis</option>
                                    <option value="trend">Trend Analysis</option>
                                    <option value="competitive">Competitive Intelligence</option>
                                    <option value="custom">Custom Report</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-col">
                            <div class="form-group">
                                <label for="data-source">Data Source</label>
                                <select id="data-source" name="data_source">
                                    <option value="pipeline" selected>Latest Pipeline Results</option>
                                    <option value="classification">Classification Results</option>
                                    <option value="fetch">Raw Article Data</option>
                                    <option value="upload">Upload Custom Data</option>
                                    <option value="historical">Historical Data</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group">
                                <label for="report-format">Output Format</label>
                                <select id="report-format" name="format">
                                    <option value="html" selected>HTML Report</option>
                                    <option value="pdf">PDF Document</option>
                                    <option value="markdown">Markdown</option>
                                    <option value="docx">Word Document</option>
                                    <option value="json">JSON Data</option>
                                    <option value="excel">Excel Spreadsheet</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group">
                                <label for="report-template">Template</label>
                                <select id="report-template" name="template">
                                    <option value="standard" selected>Standard</option>
                                    <option value="executive">Executive Summary</option>
                                    <option value="detailed">Detailed Analysis</option>
                                    <option value="briefing">Intelligence Briefing</option>
                                    <option value="dashboard">Dashboard Style</option>
                                    <option value="academic">Academic Format</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-col">
                            <div class="form-group">
                                <label for="time-period">Time Period</label>
                                <select id="time-period" name="time_period">
                                    <option value="24h">Last 24 Hours</option>
                                    <option value="7d" selected>Last 7 Days</option>
                                    <option value="30d">Last 30 Days</option>
                                    <option value="90d">Last 90 Days</option>
                                    <option value="custom">Custom Range</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group">
                                <label for="language">Report Language</label>
                                <select id="language" name="language">
                                    <option value="en" selected>English</option>
                                    <option value="es">Spanish</option>
                                    <option value="fr">French</option>
                                    <option value="de">German</option>
                                    <option value="zh">Chinese</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group">
                                <label for="detail-level">Detail Level</label>
                                <select id="detail-level" name="detail_level">
                                    <option value="summary">Summary</option>
                                    <option value="standard" selected>Standard</option>
                                    <option value="detailed">Detailed</option>
                                    <option value="comprehensive">Comprehensive</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-col">
                            <div class="form-group">
                                <label>Report Sections</label>
                                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                                    <label><input type="checkbox" name="sections" value="executive_summary" checked> Executive Summary</label>
                                    <label><input type="checkbox" name="sections" value="key_findings" checked> Key Findings</label>
                                    <label><input type="checkbox" name="sections" value="sentiment_analysis" checked> Sentiment Analysis</label>
                                    <label><input type="checkbox" name="sections" value="topic_breakdown"> Topic Breakdown</label>
                                    <label><input type="checkbox" name="sections" value="trend_analysis"> Trend Analysis</label>
                                    <label><input type="checkbox" name="sections" value="source_analysis"> Source Analysis</label>
                                    <label><input type="checkbox" name="sections" value="recommendations"> Recommendations</label>
                                    <label><input type="checkbox" name="sections" value="appendices"> Appendices</label>
                                </div>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group">
                                <label>Visual Elements</label>
                                <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
                                    <label><input type="checkbox" name="visuals" value="charts" checked> Include Charts</label>
                                    <label><input type="checkbox" name="visuals" value="tables" checked> Include Tables</label>
                                    <label><input type="checkbox" name="visuals" value="word_clouds"> Word Clouds</label>
                                    <label><input type="checkbox" name="visuals" value="timelines"> Timelines</label>
                                    <label><input type="checkbox" name="visuals" value="network_graphs"> Network Graphs</label>
                                    <label><input type="checkbox" name="visuals" value="heatmaps"> Heat Maps</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-col-2">
                            <div class="form-group">
                                <label for="custom-instructions">Custom Instructions (Optional)</label>
                                <textarea id="custom-instructions" name="custom_instructions" rows="3" 
                                          placeholder="Add any specific requirements or focus areas for this report..."></textarea>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group">
                                <label for="audience">Target Audience</label>
                                <select id="audience" name="audience">
                                    <option value="general" selected>General</option>
                                    <option value="executive">Executive</option>
                                    <option value="technical">Technical</option>
                                    <option value="analyst">Analyst</option>
                                    <option value="academic">Academic</option>
                                    <option value="media">Media</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" id="preview-report-btn" class="btn btn-secondary">👁️ Preview Structure</button>
                        <button type="button" id="load-template-btn" class="btn btn-secondary">📋 Load Template</button>
                        <button type="button" id="clear-form-btn" class="btn btn-secondary">Clear</button>
                        <button type="submit" id="generate-report-btn" class="btn btn-primary">📄 Generate Report</button>
                    </div>
                </form>
            </div>

            <!-- Data Upload Section -->
            <div class="form-container" id="upload-section" style="display: none;">
                <h2>Upload Custom Data</h2>
                <div class="form-row">
                    <div class="form-col-2">
                        <div class="form-group">
                            <label for="data-upload">Upload Data File</label>
                            <input type="file" id="data-upload" accept=".json,.csv,.xlsx" style="width: 100%;">
                            <small>Supported formats: JSON, CSV, Excel</small>
                        </div>
                    </div>
                    <div class="form-col">
                        <div class="form-group">
                            <label>&nbsp;</label>
                            <button type="button" id="process-upload-btn" class="btn btn-primary">Process Upload</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Report Preview -->
            <div class="results-container" id="preview-container" style="display: none;">
                <div class="results-header">
                    <h2>Report Structure Preview</h2>
                </div>
                <div id="report-preview">
                    <!-- Preview will be populated here -->
                </div>
            </div>

            <!-- Generated Report -->
            <div class="results-container" id="report-container" style="display: none;">
                <div class="results-header">
                    <h2>Generated Report</h2>
                    <div style="display: flex; gap: 10px;">
                        <button id="download-report-btn" class="btn btn-primary">💾 Download</button>
                        <button id="share-report-btn" class="btn btn-secondary">🔗 Share</button>
                        <button id="edit-report-btn" class="btn btn-secondary">✏️ Edit</button>
                    </div>
                </div>
                
                <div class="results-stats" id="report-stats">
                    <!-- Report stats will be populated here -->
                </div>

                <div id="report-content">
                    <!-- Generated report will be displayed here -->
                </div>
            </div>

            <!-- Report Templates -->
            <div class="results-container">
                <div class="results-header">
                    <h2>Report Templates</h2>
                    <button id="refresh-templates-btn" class="btn btn-secondary">Refresh</button>
                </div>
                
                <div class="card-grid" id="template-gallery">
                    <!-- Templates will be populated here -->
                </div>
            </div>

            <!-- Recent Reports -->
            <div class="results-container">
                <div class="results-header">
                    <h2>Recent Reports</h2>
                    <button id="refresh-reports-btn" class="btn btn-secondary">Refresh</button>
                </div>
                
                <div id="recent-reports">
                    <!-- Recent reports will be populated here -->
                </div>
            </div>

            <!-- Report Analytics -->
            <div class="results-container">
                <div class="results-header">
                    <h2>Report Analytics</h2>
                </div>
                
                <div class="card-grid">
                    <div class="info-card">
                        <h3>📊 Generation Stats</h3>
                        <div id="generation-stats">
                            <div class="info-list">
                                <li><span class="info-label">Reports Generated:</span> <span class="info-value" id="total-reports">-</span></li>
                                <li><span class="info-label">This Month:</span> <span class="info-value" id="monthly-reports">-</span></li>
                                <li><span class="info-label">Avg Generation Time:</span> <span class="info-value" id="avg-generation-time">-</span></li>
                                <li><span class="info-label">Success Rate:</span> <span class="info-value" id="success-rate">-</span></li>
                            </div>
                        </div>
                    </div>
                    
                    <div class="info-card">
                        <h3>📈 Popular Formats</h3>
                        <div id="format-popularity">
                            <canvas id="format-chart" width="300" height="200"></canvas>
                        </div>
                    </div>
                    
                    <div class="info-card">
                        <h3>🎯 Report Types</h3>
                        <div id="report-type-stats">
                            <div class="tag-container">
                                <span class="tag primary">Intelligence (45%)</span>
                                <span class="tag success">Analysis (30%)</span>
                                <span class="tag warning">Summary (15%)</span>
                                <span class="tag secondary">Custom (10%)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Loading Spinner -->
    <div id="loading-spinner" class="loading-spinner" style="display: none;">
        <div class="spinner"></div>
        <div>Processing...</div>
    </div>

    <!-- Share Modal -->
    <div id="share-modal" class="modal" style="display: none;">
        <div class="modal-content">
            <h2>Share Report</h2>
            <div class="form-group">
                <label for="share-url">Share URL:</label>
                <input type="text" id="share-url" readonly>
                <button id="copy-share-url" class="btn btn-primary">Copy URL</button>
            </div>
            <div class="form-group">
                <label for="share-expiry">Expiry:</label>
                <select id="share-expiry">
                    <option value="1h">1 Hour</option>
                    <option value="24h" selected>24 Hours</option>
                    <option value="7d">7 Days</option>
                    <option value="30d">30 Days</option>
                    <option value="never">Never</option>
                </select>
            </div>
            <div class="form-actions">
                <button id="cancel-share-btn" class="btn btn-secondary">Cancel</button>
                <button id="create-share-btn" class="btn btn-primary">Create Share Link</button>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="/static/js/auth.js"></script>
    <script src="/static/js/api.js"></script>
    <script src="/static/js/ui.js"></script>
    
    <script>
        // Report Builder-specific JavaScript
        class ReportBuilderInterface {
            constructor() {
                this.auth = new AIFactoryAuth();
                this.api = new AIFactoryAPI();
                this.ui = new AIFactoryUI();
                this.currentReport = null;
                this.templates = [];
                this.init();
            }

            async init() {
                // Check authentication
                if (!await this.auth.isAuthenticated()) {
                    window.location.href = '/';
                    return;
                }

                this.setupUI();
                this.setupEventListeners();
                await this.loadInitialData();
            }

            setupUI() {
                const user = this.auth.getCurrentUser();
                document.getElementById('user-info').textContent = user.username + ' (' + user.role + ')';
            }

            setupEventListeners() {
                // Form submission
                document.getElementById('report-form').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.generateReport();
                });

                // Data source change
                document.getElementById('data-source').addEventListener('change', (e) => {
                    const uploadSection = document.getElementById('upload-section');
                    uploadSection.style.display = e.target.value === 'upload' ? 'block' : 'none';
                });

                // Preview report structure
                document.getElementById('preview-report-btn').addEventListener('click', () => {
                    this.previewReportStructure();
                });

                // Load template
                document.getElementById('load-template-btn').addEventListener('click', () => {
                    this.showTemplateSelector();
                });

                // Clear form
                document.getElementById('clear-form-btn').addEventListener('click', () => {
                    this.clearForm();
                });

                // File upload processing
                document.getElementById('process-upload-btn').addEventListener('click', () => {
                    this.processUploadedData();
                });

                // Report actions
                document.getElementById('download-report-btn').addEventListener('click', () => {
                    this.downloadReport();
                });

                document.getElementById('share-report-btn').addEventListener('click', () => {
                    this.showShareModal();
                });

                document.getElementById('edit-report-btn').addEventListener('click', () => {
                    this.editReport();
                });

                // Share modal
                document.getElementById('create-share-btn').addEventListener('click', async () => {
                    await this.createShareLink();
                });

                document.getElementById('copy-share-url').addEventListener('click', () => {
                    const url = document.getElementById('share-url').value;
                    this.ui.copyToClipboard(url);
                });

                document.getElementById('cancel-share-btn').addEventListener('click', () => {
                    this.hideShareModal();
                });

                // Refresh buttons
                document.getElementById('refresh-templates-btn').addEventListener('click', async () => {
                    await this.loadTemplates();
                });

                document.getElementById('refresh-reports-btn').addEventListener('click', async () => {
                    await this.loadRecentReports();
                });

                // Logout
                document.getElementById('logout-btn').addEventListener('click', async () => {
                    await this.auth.logout();
                    window.location.href = '/';
                });
            }

            async loadInitialData() {
                try {
                    await Promise.all([
                        this.loadTemplates(),
                        this.loadRecentReports(),
                        this.loadReportAnalytics()
                    ]);
                } catch (error) {
                    console.error('Failed to load initial data:', error);
                    this.ui.showToast('Failed to load initial data', 'error');
                }
            }

            async generateReport() {
                try {
                    this.ui.showLoading('Generating report...');
                    
                    const formData = new FormData(document.getElementById('report-form'));
                    const request = Object.fromEntries(formData.entries());
                    
                    // Get selected sections and visuals
                    const sections = Array.from(
                        document.querySelectorAll('input[name="sections"]:checked')
                    ).map(cb => cb.value);

                    const visuals = Array.from(
                        document.querySelectorAll('input[name="visuals"]:checked')
                    ).map(cb => cb.value);

                    // Prepare report request
                    const reportRequest = {
                        title: request.title,
                        report_type: request.report_type,
                        data_source: request.data_source,
                        format: request.format,
                        template: request.template,
                        time_period: request.time_period,
                        language: request.language,
                        detail_level: request.detail_level,
                        sections: sections,
                        visuals: visuals,
                        custom_instructions: request.custom_instructions,
                        audience: request.audience,
                        include_charts: visuals.includes('charts'),
                        include_sources: sections.includes('source_analysis')
                    };

                    // Mock data for now - in real implementation, this would come from the data source
                    const mockData = {
                        articles: [],
                        classifications: [],
                        analytics: {}
                    };

                    const response = await this.api.buildReport(mockData, reportRequest);

                    if (response.success) {
                        this.currentReport = response;
                        this.showGeneratedReport(response);
                        this.ui.showToast('Report generated successfully!', 'success');
                    } else {
                        throw new Error(response.error || 'Report generation failed');
                    }

                } catch (error) {
                    console.error('Report generation failed:', error);
                    this.ui.showToast('Report generation failed: ' + error.message, 'error');
                } finally {
                    this.ui.hideLoading();
                }
            }

            previewReportStructure() {
                const container = document.getElementById('preview-container');
                const previewContainer = document.getElementById('report-preview');
                
                container.style.display = 'block';
                
                const sections = Array.from(
                    document.querySelectorAll('input[name="sections"]:checked')
                ).map(cb => cb.value);

                const visuals = Array.from(
                    document.querySelectorAll('input[name="visuals"]:checked')
                ).map(cb => cb.value);

                const title = document.getElementById('report-title').value || 'Report Title';
                const type = document.getElementById('report-type').value;
                const format = document.getElementById('report-format').value;

                previewContainer.innerHTML = `
                    <div class="info-card">
                        <h3>Report Structure Preview</h3>
                        <div class="info-list">
                            <li><span class="info-label">Title:</span> <span class="info-value">\${title}</span></li>
                            <li><span class="info-label">Type:</span> <span class="info-value">\${type}</span></li>
                            <li><span class="info-label">Format:</span> <span class="info-value">\${format.toUpperCase()}</span></li>
                        </div>
                        
                        <h4>Sections (\${sections.length}):</h4>
                        <ul>
                            \${sections.map(section => `<li>$\{this.formatSectionName(section)\}</li>`).join('')}
                        </ul>
                        
                        <h4>Visual Elements (\${visuals.length}):</h4>
                        <ul>
                            \${visuals.map(visual => `<li>$\{this.formatVisualName(visual)\}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }

            formatSectionName(section) {
                return section.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }

            formatVisualName(visual) {
                return visual.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }

            showGeneratedReport(report) {
                const container = document.getElementById('report-container');
                const statsContainer = document.getElementById('report-stats');
                const contentContainer = document.getElementById('report-content');
                
                container.style.display = 'block';
                
                // Show stats
                statsContainer.innerHTML = `
                    <div class="stat-item">
                        <div class="stat-value">\${report.pages || 1}</div>
                        <div class="stat-label">Pages</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">\${report.word_count || 0}</div>
                        <div class="stat-label">Words</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">\${this.ui.formatDuration(report.generation_time_ms)}</div>
                        <div class="stat-label">Generation Time</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">\${this.ui.formatCurrency(report.cost_usd)}</div>
                        <div class="stat-label">Cost</div>
                    </div>
                `;

                // Display report content
                if (report.format === 'html') {
                    contentContainer.innerHTML = report.content || this.generateMockHTMLReport();
                } else {
                    contentContainer.innerHTML = `
                        <div class="info-card">
                            <h3>Report Generated</h3>
                            <p>Your \${report.format.toUpperCase()} report has been generated successfully.</p>
                            <p><strong>Format:</strong> \${report.format.toUpperCase()}</p>
                            <p><strong>Size:</strong> \${this.ui.formatBytes(report.file_size || 0)}</p>
                            <div style="margin-top: 20px;">
                                <button class="btn btn-primary" onclick="this.downloadReport()">💾 Download Report</button>
                            </div>
                        </div>
                    `;
                }
            }

            generateMockHTMLReport() {
                const title = document.getElementById('report-title').value || 'Intelligence Report';
                return `
                    <div style="max-width: 800px; margin: 0 auto; padding: 20px; background: white; border: 1px solid #ddd; border-radius: 8px;">
                        <header style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #2c3e50; margin-bottom: 10px;">\${title}</h1>
                            <p style="color: #7f8c8d;">Generated on \${new Date().toLocaleDateString()}</p>
                        </header>
                        
                        <section style="margin-bottom: 30px;">
                            <h2 style="color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 5px;">Executive Summary</h2>
                            <p>This intelligence report provides a comprehensive analysis of the monitored topics and sources. Based on the collected data from RSS feeds and AI-powered classification, we present key findings and insights.</p>
                        </section>
                        
                        <section style="margin-bottom: 30px;">
                            <h2 style="color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 5px;">Key Findings</h2>
                            <ul>
                                <li><strong>Sentiment Analysis:</strong> Overall sentiment is 65% positive, 25% neutral, and 10% negative</li>
                                <li><strong>Topic Distribution:</strong> Technology topics dominate at 45%, followed by Business at 30%</li>
                                <li><strong>Source Quality:</strong> Average source quality score is 87%, indicating high reliability</li>
                                <li><strong>Article Volume:</strong> 234 articles processed from 18 different sources</li>
                            </ul>
                        </section>
                        
                        <section style="margin-bottom: 30px;">
                            <h2 style="color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 5px;">Sentiment Analysis</h2>
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 6px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                    <span>Positive</span>
                                    <span>65%</span>
                                </div>
                                <div style="background: #e9ecef; height: 8px; border-radius: 4px; margin-bottom: 15px;">
                                    <div style="background: #28a745; height: 100%; width: 65%; border-radius: 4px;"></div>
                                </div>
                                
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                    <span>Neutral</span>
                                    <span>25%</span>
                                </div>
                                <div style="background: #e9ecef; height: 8px; border-radius: 4px; margin-bottom: 15px;">
                                    <div style="background: #6c757d; height: 100%; width: 25%; border-radius: 4px;"></div>
                                </div>
                                
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                    <span>Negative</span>
                                    <span>10%</span>
                                </div>
                                <div style="background: #e9ecef; height: 8px; border-radius: 4px;">
                                    <div style="background: #dc3545; height: 100%; width: 10%; border-radius: 4px;"></div>
                                </div>
                            </div>
                        </section>
                        
                        <section style="margin-bottom: 30px;">
                            <h2 style="color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 5px;">Recommendations</h2>
                            <ol>
                                <li>Continue monitoring current sources as they provide high-quality content</li>
                                <li>Consider expanding coverage in emerging technology areas</li>
                                <li>Focus on sources with positive sentiment for strategic communications</li>
                                <li>Investigate the 10% negative sentiment for potential risk factors</li>
                            </ol>
                        </section>
                        
                        <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6; text-align: center; color: #6c757d;">
                            <p>Generated by AI Factory Report Builder | \${new Date().toLocaleDateString()}</p>
                        </footer>
                    </div>
                `;
            }

            showTemplateSelector() {
                if (this.templates.length === 0) {
                    this.ui.showToast('Loading templates...', 'info');
                    this.loadTemplates();
                    return;
                }

                // Show template selection dialog
                const templateOptions = this.templates.map(template => 
                    `<option value="\${template.id}">\${template.name} - $\{template.description\}</option>`
                ).join('');

                const selectedTemplate = prompt(`Select a template:\\n\\n$\{this.templates.map((t, i) => `\${i+1\}. \${t.name} - \${t.description}`).join('\\n')}`);

                if (selectedTemplate) {
                    this.loadTemplate(selectedTemplate);
                }
            }

            loadTemplate(templateId) {
                const template = this.templates.find(t => t.id === templateId || t.name === templateId);
                if (template) {
                    // Apply template settings to form
                    document.getElementById('report-type').value = template.type || 'intelligence';
                    document.getElementById('report-template').value = template.template || 'standard';
                    
                    // Set sections
                    document.querySelectorAll('input[name="sections"]').forEach(cb => {
                        cb.checked = template.sections?.includes(cb.value) || false;
                    });
                    
                    // Set visuals
                    document.querySelectorAll('input[name="visuals"]').forEach(cb => {
                        cb.checked = template.visuals?.includes(cb.value) || false;
                    });
                    
                    this.ui.showToast(`Template "$\{template.name\}" loaded`, 'success');
                }
            }

            processUploadedData() {
                const fileInput = document.getElementById('data-upload');
                const file = fileInput.files[0];
                
                if (!file) {
                    this.ui.showToast('Please select a file to upload', 'warning');
                    return;
                }

                this.ui.showLoading('Processing uploaded data...');
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        let data;
                        if (file.name.endsWith('.json')) {
                            data = JSON.parse(e.target.result);
                        } else if (file.name.endsWith('.csv')) {
                            // Basic CSV processing - would need proper parser
                            data = this.parseCSV(e.target.result);
                        }
                        
                        this.ui.hideLoading();
                        this.ui.showToast(`Processed \${file.name} - $\{data?.length || 0\} records found`, 'success');
                        
                    } catch (error) {
                        this.ui.hideLoading();
                        this.ui.showToast('Failed to process uploaded file', 'error');
                    }
                };
                reader.readAsText(file);
            }

            parseCSV(csvText) {
                const lines = csvText.split('\\n');
                const headers = lines[0].split(',');
                return lines.slice(1).map(line => {
                    const values = line.split(',');
                    const record = {};
                    headers.forEach((header, i) => {
                        record[header.trim()] = values[i]?.trim();
                    });
                    return record;
                });
            }

            downloadReport() {
                if (!this.currentReport) {
                    this.ui.showToast('No report to download', 'warning');
                    return;
                }

                const filename = `report-\${new Date().toISOString().split('T')[0]}.$\{this.currentReport.format\}`;
                
                if (this.currentReport.format === 'html') {
                    this.ui.downloadAsFile(this.currentReport.content, filename, 'text/html');
                } else {
                    // For other formats, would need to handle binary data
                    this.ui.showToast('Download functionality not yet implemented for ' + this.currentReport.format.toUpperCase(), 'info');
                }
            }

            showShareModal() {
                if (!this.currentReport) {
                    this.ui.showToast('No report to share', 'warning');
                    return;
                }
                document.getElementById('share-modal').style.display = 'flex';
            }

            hideShareModal() {
                document.getElementById('share-modal').style.display = 'none';
                document.getElementById('share-url').value = '';
            }

            async createShareLink() {
                try {
                    this.ui.showLoading('Creating share link...');
                    
                    // Mock share link creation
                    const shareId = Math.random().toString(36).substring(2, 15);
                    const shareUrl = `\${window.location.origin}/shared/$\{shareId\}`;
                    
                    document.getElementById('share-url').value = shareUrl;
                    
                    this.ui.hideLoading();
                    this.ui.showToast('Share link created successfully', 'success');
                    
                } catch (error) {
                    this.ui.hideLoading();
                    this.ui.showToast('Failed to create share link', 'error');
                }
            }

            editReport() {
                if (!this.currentReport) {
                    this.ui.showToast('No report to edit', 'warning');
                    return;
                }
                
                // This would open a report editor
                this.ui.showToast('Report editor - Feature coming soon!', 'info');
            }

            async loadTemplates() {
                try {
                    const response = await this.api.getReportTemplates();
                    this.templates = response.templates || [];
                    
                    // Mock templates if API doesn't return any
                    if (this.templates.length === 0) {
                        this.templates = [
                            { id: 'intelligence', name: 'Intelligence Report', description: 'Comprehensive intelligence analysis', type: 'intelligence', sections: ['executive_summary', 'key_findings', 'sentiment_analysis'], visuals: ['charts', 'tables'] },
                            { id: 'executive', name: 'Executive Summary', description: 'High-level overview for executives', type: 'summary', sections: ['executive_summary', 'recommendations'], visuals: ['charts'] },
                            { id: 'technical', name: 'Technical Analysis', description: 'Detailed technical deep-dive', type: 'analysis', sections: ['key_findings', 'topic_breakdown', 'appendices'], visuals: ['charts', 'tables', 'network_graphs'] }
                        ];
                    }
                    
                    this.renderTemplateGallery();
                } catch (error) {
                    console.error('Failed to load templates:', error);
                }
            }

            renderTemplateGallery() {
                const container = document.getElementById('template-gallery');
                
                container.innerHTML = this.templates.map(template => `
                    <div class="info-card">
                        <h3>\${template.name}</h3>
                        <p>\${template.description}</p>
                        <div class="tag-container">
                            <span class="tag">\${template.type}</span>
                            <span class="tag secondary">\${template.sections?.length || 0} sections</span>
                        </div>
                        <div style="margin-top: 15px;">
                            <button class="btn btn-primary" onclick="this.loadTemplate('\${template.id}')">Use Template</button>
                        </div>
                    </div>
                `).join('');
            }

            async loadRecentReports() {
                // Mock recent reports
                const reportsContainer = document.getElementById('recent-reports');
                reportsContainer.innerHTML = `
                    <div class="timeline">
                        <div class="timeline-item">
                            <div class="timeline-content">
                                <div class="timeline-time">2 hours ago</div>
                                <div><strong>Weekly Tech Analysis</strong> - HTML Report (12 pages)</div>
                                <div style="margin-top: 10px;">
                                    <button class="btn btn-primary">📄 View</button>
                                    <button class="btn btn-secondary">💾 Download</button>
                                </div>
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-content">
                                <div class="timeline-time">1 day ago</div>
                                <div><strong>Market Intelligence Brief</strong> - PDF Report (8 pages)</div>
                                <div style="margin-top: 10px;">
                                    <button class="btn btn-primary">📄 View</button>
                                    <button class="btn btn-secondary">💾 Download</button>
                                </div>
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-content">
                                <div class="timeline-time">3 days ago</div>
                                <div><strong>Competitor Analysis</strong> - Excel Report (25 pages)</div>
                                <div style="margin-top: 10px;">
                                    <button class="btn btn-primary">📄 View</button>
                                    <button class="btn btn-secondary">💾 Download</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }

            async loadReportAnalytics() {
                // Mock analytics data
                document.getElementById('total-reports').textContent = '127';
                document.getElementById('monthly-reports').textContent = '23';
                document.getElementById('avg-generation-time').textContent = '45s';
                document.getElementById('success-rate').textContent = '98.5%';
                
                // Mock chart
                this.renderFormatChart();
            }

            renderFormatChart() {
                const canvas = document.getElementById('format-chart');
                const ctx = canvas.getContext('2d');
                
                // Simple pie chart representation
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                const radius = 80;
                
                // HTML - 50%
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI);
                ctx.fillStyle = '#3498db';
                ctx.fill();
                
                // PDF - 30%
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, Math.PI, Math.PI * 1.6);
                ctx.fillStyle = '#e74c3c';
                ctx.fill();
                
                // Other - 20%
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, Math.PI * 1.6, 0);
                ctx.fillStyle = '#95a5a6';
                ctx.fill();
                
                // Labels
                ctx.fillStyle = '#333';
                ctx.font = '12px Arial';
                ctx.fillText('HTML 50%', 10, 20);
                ctx.fillText('PDF 30%', 10, 35);
                ctx.fillText('Other 20%', 10, 50);
            }

            clearForm() {
                document.getElementById('report-form').reset();
                
                // Reset checkboxes to default
                document.querySelector('input[value="executive_summary"]').checked = true;
                document.querySelector('input[value="key_findings"]').checked = true;
                document.querySelector('input[value="sentiment_analysis"]').checked = true;
                document.querySelector('input[value="charts"]').checked = true;
                document.querySelector('input[value="tables"]').checked = true;
                
                document.getElementById('upload-section').style.display = 'none';
                document.getElementById('preview-container').style.display = 'none';
                document.getElementById('report-container').style.display = 'none';
            }
        }

        // Initialize report builder interface when page loads
        document.addEventListener('DOMContentLoaded', () => {
            new ReportBuilderInterface();
        });
    </script>

    <style>
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        
        .modal-content {
            background: white;
            padding: 30px;
            border-radius: 8px;
            max-width: 500px;
            width: 90%;
        }
    </style>
</body>
</html>`;