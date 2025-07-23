// AI Factory Frontend Worker - Orchestrator Interface HTML
// @WORKER: FrontendWorker
// 🧱 Type: StaticHTML
// 📍 Path: src/static/html/orchestrator.ts
// 🎯 Role: Orchestrator worker interface for pipeline coordination
// 💾 Storage: { embedded: "worker_code" }

export const ORCHESTRATOR_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Factory - Orchestrator</title>
    <link rel="stylesheet" href="/static/css/shared.css">
    <link rel="stylesheet" href="/static/css/components.css">
</head>
<body>
    <div id="app">
        <!-- Header -->
        <header class="header">
            <div class="container">
                <h1><a href="/" style="color: inherit; text-decoration: none;">🏭 AI Factory</a> - Orchestrator</h1>
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
                <h1>🎯 Pipeline Orchestrator</h1>
                <p>Coordinate and manage the full RSS intelligence pipeline</p>
            </div>

            <!-- Pipeline Form -->
            <div class="form-container">
                <h2>Start New Pipeline</h2>
                <form id="orchestrator-form">
                    <div class="form-row">
                        <div class="form-col-2">
                            <div class="form-group">
                                <label for="topic">Research Topic *</label>
                                <input type="text" id="topic" name="topic" required 
                                       placeholder="Enter the topic you want to research...">
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group">
                                <label for="urgency">Urgency Level</label>
                                <select id="urgency" name="urgency">
                                    <option value="low">Low</option>
                                    <option value="medium" selected>Medium</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-col">
                            <div class="form-group">
                                <label for="quality-level">Quality Level</label>
                                <select id="quality-level" name="quality_level">
                                    <option value="basic">Basic</option>
                                    <option value="standard" selected>Standard</option>
                                    <option value="premium">Premium</option>
                                    <option value="enterprise">Enterprise</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group">
                                <label for="optimize-for">Optimize For</label>
                                <select id="optimize-for" name="optimize_for">
                                    <option value="speed">Speed</option>
                                    <option value="cost">Cost</option>
                                    <option value="quality">Quality</option>
                                    <option value="balanced" selected>Balanced</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group">
                                <label for="budget-limit">Budget Limit ($)</label>
                                <input type="number" id="budget-limit" name="budget_limit" 
                                       value="2.00" min="0.10" max="10.00" step="0.10">
                            </div>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-col">
                            <div class="form-group">
                                <label for="source-depth">Source Depth</label>
                                <input type="number" id="source-depth" name="source_discovery_depth" 
                                       value="5" min="1" max="20">
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group">
                                <label for="max-articles">Max Articles</label>
                                <input type="number" id="max-articles" name="max_articles" 
                                       value="20" min="5" max="100">
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group">
                                <label for="time-range">Time Range</label>
                                <select id="time-range" name="time_range">
                                    <option value="1d">Last 24 hours</option>
                                    <option value="3d">Last 3 days</option>
                                    <option value="7d">Last week</option>
                                    <option value="30d" selected>Last 30 days</option>
                                    <option value="90d">Last 90 days</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-col">
                            <label>
                                <input type="checkbox" id="parallel-processing" name="enable_parallel_processing" checked>
                                Enable Parallel Processing
                            </label>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" id="clear-form-btn" class="btn btn-secondary">Clear</button>
                        <button type="submit" id="start-pipeline-btn" class="btn btn-primary">🚀 Start Pipeline</button>
                    </div>
                </form>
            </div>

            <!-- Pipeline Status -->
            <div class="results-container" id="pipeline-status" style="display: none;">
                <div class="results-header">
                    <h2>Pipeline Status</h2>
                    <div class="status" id="pipeline-status-badge">Running</div>
                </div>
                
                <div id="pipeline-info">
                    <!-- Pipeline info will be populated here -->
                </div>

                <div class="progress-container" id="pipeline-progress">
                    <!-- Progress bar will be added here -->
                </div>

                <div id="worker-status">
                    <!-- Worker status will be populated here -->
                </div>
            </div>

            <!-- Recent Pipelines -->
            <div class="results-container">
                <div class="results-header">
                    <h2>Recent Pipelines</h2>
                    <button id="refresh-history-btn" class="btn btn-secondary">Refresh</button>
                </div>
                
                <div id="pipeline-history">
                    <!-- Pipeline history will be populated here -->
                </div>
            </div>

            <!-- System Analytics -->
            <div class="results-container">
                <div class="results-header">
                    <h2>System Analytics</h2>
                    <button id="refresh-analytics-btn" class="btn btn-secondary">Refresh</button>
                </div>
                
                <div class="results-stats" id="system-stats">
                    <!-- Stats will be populated here -->
                </div>

                <div id="analytics-details">
                    <!-- Analytics details will be populated here -->
                </div>
            </div>
        </main>
    </div>

    <!-- Loading Spinner -->
    <div id="loading-spinner" class="loading-spinner" style="display: none;">
        <div class="spinner"></div>
        <div>Processing...</div>
    </div>

    <!-- Scripts -->
    <script src="/static/js/auth.js"></script>
    <script src="/static/js/api.js"></script>
    <script src="/static/js/ui.js"></script>
    
    <script>
        // Orchestrator-specific JavaScript
        class OrchestratorInterface {
            constructor() {
                this.auth = new AIFactoryAuth();
                this.api = new AIFactoryAPI();
                this.ui = new AIFactoryUI();
                this.currentPipeline = null;
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
                document.getElementById('orchestrator-form').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.startPipeline();
                });

                // Clear form
                document.getElementById('clear-form-btn').addEventListener('click', () => {
                    this.clearForm();
                });

                // Refresh buttons
                document.getElementById('refresh-history-btn').addEventListener('click', async () => {
                    await this.loadPipelineHistory();
                });

                document.getElementById('refresh-analytics-btn').addEventListener('click', async () => {
                    await this.loadAnalytics();
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
                        this.loadPipelineHistory(),
                        this.loadAnalytics()
                    ]);
                } catch (error) {
                    console.error('Failed to load initial data:', error);
                    this.ui.showToast('Failed to load initial data', 'error');
                }
            }

            async startPipeline() {
                try {
                    this.ui.showLoading('Starting pipeline...');
                    
                    const formData = new FormData(document.getElementById('orchestrator-form'));
                    const request = Object.fromEntries(formData.entries());
                    
                    // Convert string values to appropriate types
                    request.budget_limit = parseFloat(request.budget_limit);
                    request.source_discovery_depth = parseInt(request.source_discovery_depth);
                    request.max_articles = parseInt(request.max_articles);
                    request.enable_parallel_processing = document.getElementById('parallel-processing').checked;

                    const response = await this.api.orchestrate(request.topic, request);

                    if (response.success) {
                        this.currentPipeline = response;
                        this.showPipelineStatus(response);
                        this.ui.showToast(`Pipeline started: $\{response.pipeline_id\}`, 'success');
                        
                        // Start monitoring
                        this.startPipelineMonitoring(response.pipeline_id);
                    } else {
                        throw new Error(response.error || 'Pipeline failed to start');
                    }

                } catch (error) {
                    console.error('Pipeline start failed:', error);
                    this.ui.showToast('Failed to start pipeline: ' + error.message, 'error');
                } finally {
                    this.ui.hideLoading();
                }
            }

            showPipelineStatus(pipeline) {
                const statusContainer = document.getElementById('pipeline-status');
                const infoContainer = document.getElementById('pipeline-info');
                
                statusContainer.style.display = 'block';
                
                infoContainer.innerHTML = `
                    <div class="info-list">
                        <div class="info-item">
                            <span class="info-label">Pipeline ID:</span>
                            <span class="info-value">\${pipeline.pipeline_id}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Topic:</span>
                            <span class="info-value">\${pipeline.topic}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Strategy:</span>
                            <span class="info-value">\${pipeline.strategy}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Started:</span>
                            <span class="info-value">\${this.ui.formatTimestamp(pipeline.started_at)}</span>
                        </div>
                    </div>
                `;
            }

            startPipelineMonitoring(pipelineId) {
                // This would ideally use WebSocket or Server-Sent Events
                // For now, we'll poll the status
                const monitorInterval = setInterval(async () => {
                    try {
                        const status = await this.api.getOrchestratorStatus();
                        // Update UI with current status
                        this.updatePipelineProgress(status);
                        
                        // If pipeline is complete, stop monitoring
                        if (status.status === 'completed' || status.status === 'failed') {
                            clearInterval(monitorInterval);
                            await this.loadPipelineHistory(); // Refresh history
                        }
                    } catch (error) {
                        console.error('Pipeline monitoring error:', error);
                    }
                }, 5000); // Poll every 5 seconds
            }

            updatePipelineProgress(status) {
                // Update progress bar and worker status
                const progressContainer = document.getElementById('pipeline-progress');
                const workerContainer = document.getElementById('worker-status');
                
                // This would be implemented based on the actual status structure
                // from your orchestrator
            }

            clearForm() {
                document.getElementById('orchestrator-form').reset();
                document.getElementById('budget-limit').value = '2.00';
                document.getElementById('source-depth').value = '5';
                document.getElementById('max-articles').value = '20';
                document.getElementById('parallel-processing').checked = true;
            }

            async loadPipelineHistory() {
                try {
                    const activity = await this.api.getRecentActivity();
                    const historyContainer = document.getElementById('pipeline-history');
                    
                    if (activity.activities && activity.activities.length > 0) {
                        historyContainer.innerHTML = activity.activities.map(item => `
                            <div class="timeline-item">
                                <div class="timeline-content">
                                    <div class="timeline-time">\${this.ui.formatTimestamp(item.timestamp)}</div>
                                    <div>\${item.description}</div>
                                </div>
                            </div>
                        `).join('');
                    } else {
                        historyContainer.innerHTML = '<p>No pipeline history available</p>';
                    }
                } catch (error) {
                    console.error('Failed to load pipeline history:', error);
                    document.getElementById('pipeline-history').innerHTML = '<p>Failed to load history</p>';
                }
            }

            async loadAnalytics() {
                try {
                    const analytics = await this.api.getOrchestratorAnalytics();
                    const statsContainer = document.getElementById('system-stats');
                    
                    statsContainer.innerHTML = `
                        <div class="stat-item">
                            <div class="stat-value">\${analytics.total_pipelines || 0}</div>
                            <div class="stat-label">Total Pipelines</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">\${analytics.successful_pipelines || 0}</div>
                            <div class="stat-label">Successful</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">\${analytics.avg_execution_time ? this.ui.formatDuration(analytics.avg_execution_time) : '-'}</div>
                            <div class="stat-label">Avg Time</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">\${analytics.total_cost ? this.ui.formatCurrency(analytics.total_cost) : '$0.00'}</div>
                            <div class="stat-label">Total Cost</div>
                        </div>
                    `;
                } catch (error) {
                    console.error('Failed to load analytics:', error);
                    document.getElementById('system-stats').innerHTML = '<p>Failed to load analytics</p>';
                }
            }
        }

        // Initialize orchestrator interface when page loads
        document.addEventListener('DOMContentLoaded', () => {
            new OrchestratorInterface();
        });
    </script>
</body>
</html>`;