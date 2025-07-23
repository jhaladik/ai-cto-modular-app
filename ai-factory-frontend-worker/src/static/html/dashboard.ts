// AI Factory Frontend Worker - Main Dashboard HTML
// @WORKER: FrontendWorker
// 🧱 Type: StaticHTML
// 📍 Path: src/static/html/dashboard.ts
// 🎯 Role: Main dashboard interface with pipeline overview
// 💾 Storage: { embedded: "worker_code" }

export const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Factory - Dashboard</title>
    <link rel="stylesheet" href="/static/css/shared.css">
    <link rel="stylesheet" href="/static/css/components.css">
    <style>
        /* Dashboard-specific styles */
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        
        .worker-card {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            transition: all 0.3s ease;
        }
        
        .worker-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .worker-status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .status-healthy {
            background: #d4edda;
            color: #155724;
        }
        
        .status-degraded {
            background: #fff3cd;
            color: #856404;
        }
        
        .status-unhealthy {
            background: #f8d7da;
            color: #721c24;
        }
        
        .pipeline-controls {
            background: #fff;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .quick-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin: 20px 0;
        }
        
        .action-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            background: #007bff;
            color: white;
            cursor: pointer;
            transition: background 0.3s ease;
        }
        
        .action-btn:hover {
            background: #0056b3;
        }
        
        .action-btn.secondary {
            background: #6c757d;
        }
        
        .action-btn.secondary:hover {
            background: #545b62;
        }
        
        .pipeline-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        
        .stat-card {
            text-align: center;
            padding: 15px;
            background: #e9ecef;
            border-radius: 6px;
        }
        
        .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #007bff;
        }
        
        .stat-label {
            font-size: 12px;
            color: #6c757d;
            text-transform: uppercase;
        }
    </style>
</head>
<body>
    <div id="app">
        <!-- Header -->
        <header class="header">
            <div class="container">
                <h1>🏭 AI Factory Dashboard</h1>
                <div class="header-controls">
                    <span id="user-info"></span>
                    <button id="logout-btn" class="btn btn-secondary">Logout</button>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="container">
            <!-- Login Form (hidden when authenticated) -->
            <div id="login-form" class="login-container" style="display: none;">
                <div class="login-box">
                    <h2>🔐 AI Factory Login</h2>
                    <form id="auth-form">
                        <div class="form-group">
                            <label for="username">Username:</label>
                            <input type="text" id="username" name="username" required>
                        </div>
                        <div class="form-group">
                            <label for="password">Password:</label>
                            <input type="password" id="password" name="password" required>
                        </div>
                        <button type="submit" class="btn btn-primary">Login</button>
                    </form>
                    <div id="login-error" class="error-message" style="display: none;"></div>
                </div>
            </div>

            <!-- Dashboard Content (hidden when not authenticated) -->
            <div id="dashboard-content" style="display: none;">
                <!-- Pipeline Controls -->
                <div class="pipeline-controls">
                    <h2>🎯 Pipeline Control</h2>
                    <div class="form-group">
                        <label for="topic-input">Research Topic:</label>
                        <input type="text" id="topic-input" placeholder="Enter topic to research..." style="width: 100%; max-width: 400px;">
                    </div>
                    <div class="quick-actions">
                        <button id="start-pipeline-btn" class="action-btn">🚀 Start Pipeline</button>
                        <button id="health-check-btn" class="action-btn secondary">🔍 Health Check</button>
                        <button id="clear-cache-btn" class="action-btn secondary">🗑️ Clear Cache</button>
                    </div>
                </div>

                <!-- Pipeline Stats -->
                <div class="pipeline-stats">
                    <div class="stat-card">
                        <div class="stat-number" id="total-pipelines">-</div>
                        <div class="stat-label">Total Pipelines</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" id="successful-pipelines">-</div>
                        <div class="stat-label">Successful</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" id="avg-execution-time">-</div>
                        <div class="stat-label">Avg Time (s)</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number" id="total-cost">-</div>
                        <div class="stat-label">Total Cost ($)</div>
                    </div>
                </div>

                <!-- Worker Status -->
                <div class="section">
                    <h2>🤖 Worker Status</h2>
                    <div id="worker-status-grid" class="dashboard-grid">
                        <!-- Worker cards will be populated by JavaScript -->
                    </div>
                </div>

                <!-- Individual Worker Interfaces -->
                <div class="section">
                    <h2>🔧 Worker Interfaces</h2>
                    <div class="quick-actions">
                        <a href="/orchestrator" class="action-btn">🎯 Orchestrator</a>
                        <a href="/topic-researcher" class="action-btn">🔍 Topic Researcher</a>
                        <a href="/rss-librarian" class="action-btn">📚 RSS Librarian</a>
                        <a href="/feed-fetcher" class="action-btn">📡 Feed Fetcher</a>
                        <a href="/content-classifier" class="action-btn">🧠 Content Classifier</a>
                        <a href="/report-builder" class="action-btn">📄 Report Builder</a>
                    </div>
                </div>

                <!-- Recent Activity -->
                <div class="section">
                    <h2>📊 Recent Activity</h2>
                    <div id="recent-activity">
                        <!-- Activity log will be populated by JavaScript -->
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

    <!-- Scripts -->
    <script src="/static/js/auth.js"></script>
    <script src="/static/js/api.js"></script>
    <script src="/static/js/ui.js"></script>
    
    <script>
        // Dashboard-specific JavaScript
        class Dashboard {
            constructor() {
                this.auth = new AIFactoryAuth();
                this.api = new AIFactoryAPI();
                this.ui = new AIFactoryUI();
                this.workerStatus = {};
                this.init();
            }

            async init() {
                // Check authentication status
                if (await this.auth.isAuthenticated()) {
                    this.showDashboard();
                    await this.loadDashboardData();
                } else {
                    this.showLogin();
                }

                this.setupEventListeners();
            }

            setupEventListeners() {
                // Authentication events
                document.getElementById('auth-form').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.handleLogin();
                });

                document.getElementById('logout-btn').addEventListener('click', async () => {
                    await this.handleLogout();
                });

                // Pipeline controls
                document.getElementById('start-pipeline-btn').addEventListener('click', async () => {
                    await this.startPipeline();
                });

                document.getElementById('health-check-btn').addEventListener('click', async () => {
                    await this.runHealthCheck();
                });

                document.getElementById('clear-cache-btn').addEventListener('click', async () => {
                    await this.clearCache();
                });

                // Auto-refresh every 30 seconds
                setInterval(() => {
                    if (document.getElementById('dashboard-content').style.display !== 'none') {
                        this.loadDashboardData();
                    }
                }, 30000);
            }

            async handleLogin() {
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;

                try {
                    this.ui.showLoading('Authenticating...');
                    const result = await this.auth.login(username, password);
                    
                    if (result.success) {
                        this.showDashboard();
                        await this.loadDashboardData();
                    } else {
                        this.ui.showError('login-error', result.message);
                    }
                } catch (error) {
                    this.ui.showError('login-error', 'Login failed: ' + error.message);
                } finally {
                    this.ui.hideLoading();
                }
            }

            async handleLogout() {
                await this.auth.logout();
                this.showLogin();
            }

            showLogin() {
                document.getElementById('login-form').style.display = 'block';
                document.getElementById('dashboard-content').style.display = 'none';
                document.getElementById('user-info').textContent = '';
            }

            showDashboard() {
                document.getElementById('login-form').style.display = 'none';
                document.getElementById('dashboard-content').style.display = 'block';
                
                const user = this.auth.getCurrentUser();
                document.getElementById('user-info').textContent = user.username + ' (' + user.role + ')';
            }

            async loadDashboardData() {
                try {
                    // Load worker status
                    await this.loadWorkerStatus();
                    
                    // Load pipeline stats
                    await this.loadPipelineStats();
                    
                    // Load recent activity
                    await this.loadRecentActivity();
                    
                } catch (error) {
                    console.error('Failed to load dashboard data:', error);
                }
            }

            async loadWorkerStatus() {
                try {
                    const response = await this.api.callWorker('orchestrator', '/status', {});
                    
                    const workerGrid = document.getElementById('worker-status-grid');
                    workerGrid.innerHTML = '';

                    if (response.workers) {
                        Object.entries(response.workers).forEach(([name, status]) => {
                            const card = this.createWorkerCard(name, status);
                            workerGrid.appendChild(card);
                        });
                    }
                } catch (error) {
                    console.error('Failed to load worker status:', error);
                }
            }

            createWorkerCard(name, status) {
                const card = document.createElement('div');
                card.className = 'worker-card';
                
                const statusClass = status.status === 'healthy' ? 'status-healthy' : 
                                  status.status === 'degraded' ? 'status-degraded' : 'status-unhealthy';
                
                card.innerHTML = `
                    <h3>\${this.formatWorkerName(name)}</h3>
                    <div class="worker-status \${statusClass}">\${status.status}</div>
                    <p><strong>Response Time:</strong> \${status.response_time_ms || '-'}ms</p>
                    <p><strong>Last Check:</strong> \${status.last_check ? new Date(status.last_check).toLocaleTimeString() : '-'}</p>
                    <p><strong>Requests:</strong> \${status.total_requests || 0}</p>
                `;
                
                return card;
            }

            formatWorkerName(name) {
                return name.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
            }

            async loadPipelineStats() {
                try {
                    const response = await this.api.callWorker('orchestrator', '/analytics', {});
                    
                    document.getElementById('total-pipelines').textContent = response.total_pipelines || 0;
                    document.getElementById('successful-pipelines').textContent = response.successful_pipelines || 0;
                    document.getElementById('avg-execution-time').textContent = 
                        response.avg_execution_time ? Math.round(response.avg_execution_time / 1000) : '-';
                    document.getElementById('total-cost').textContent = 
                        response.total_cost ? response.total_cost.toFixed(2) : '0.00';
                } catch (error) {
                    console.error('Failed to load pipeline stats:', error);
                }
            }

            async loadRecentActivity() {
                try {
                    const response = await this.api.callWorker('orchestrator', '/recent-activity', {});
                    
                    const activityDiv = document.getElementById('recent-activity');
                    
                    if (response.activities && response.activities.length > 0) {
                        activityDiv.innerHTML = response.activities.map(activity => `
                            <div class="activity-item">
                                <strong>\${activity.timestamp}</strong>: \${activity.description}
                                <span class="activity-status \${activity.success ? 'success' : 'error'}">
                                    \${activity.success ? '✅' : '❌'}
                                </span>
                            </div>
                        `).join('');
                    } else {
                        activityDiv.innerHTML = '<p>No recent activity</p>';
                    }
                } catch (error) {
                    console.error('Failed to load recent activity:', error);
                    document.getElementById('recent-activity').innerHTML = '<p>Failed to load activity</p>';
                }
            }

            async startPipeline() {
                const topic = document.getElementById('topic-input').value.trim();
                
                if (!topic) {
                    alert('Please enter a research topic');
                    return;
                }

                try {
                    this.ui.showLoading('Starting pipeline...');
                    
                    const response = await this.api.callWorker('orchestrator', '/orchestrate', {
                        topic: topic,
                        optimize_for: 'balanced'
                    });

                    if (response.success) {
                        alert(`Pipeline started successfully! ID: $\{response.pipeline_id\}`);
                        document.getElementById('topic-input').value = '';
                        await this.loadDashboardData(); // Refresh data
                    } else {
                        alert('Pipeline failed: ' + response.error);
                    }
                } catch (error) {
                    alert('Pipeline failed: ' + error.message);
                } finally {
                    this.ui.hideLoading();
                }
            }

            async runHealthCheck() {
                try {
                    this.ui.showLoading('Running health check...');
                    await this.loadWorkerStatus();
                    alert('Health check completed!');
                } catch (error) {
                    alert('Health check failed: ' + error.message);
                } finally {
                    this.ui.hideLoading();
                }
            }

            async clearCache() {
                try {
                    this.ui.showLoading('Clearing cache...');
                    
                    const response = await this.api.callWorker('orchestrator', '/clear-cache', {});
                    
                    if (response.success) {
                        alert('Cache cleared successfully!');
                    } else {
                        alert('Failed to clear cache: ' + response.error);
                    }
                } catch (error) {
                    alert('Failed to clear cache: ' + error.message);
                } finally {
                    this.ui.hideLoading();
                }
            }
        }

        // Initialize dashboard when page loads
        document.addEventListener('DOMContentLoaded', () => {
            new Dashboard();
        });
    </script>
</body>
</html>`;