// AI Factory Frontend Worker - Feed Fetcher Interface HTML
// @WORKER: FrontendWorker
// 🧱 Type: StaticHTML
// 📍 Path: src/static/html/feed-fetcher.ts
// 🎯 Role: Feed fetcher worker interface for article extraction and processing
// 💾 Storage: { embedded: "worker_code" }

export const FEED_FETCHER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Factory - Feed Fetcher</title>
    <link rel="stylesheet" href="/static/css/shared.css">
    <link rel="stylesheet" href="/static/css/components.css">
</head>
<body>
    <div id="app">
        <!-- Header -->
        <header class="header">
            <div class="container">
                <h1><a href="/" style="color: inherit; text-decoration: none;">🏭 AI Factory</a> - Feed Fetcher</h1>
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
                <h1>📡 Feed Fetcher</h1>
                <p>Extract and process articles from RSS feeds for intelligent analysis</p>
            </div>

            <!-- Feed Fetching Form -->
            <div class="form-container">
                <h2>Fetch Articles</h2>
                <form id="fetcher-form">
                    <div class="form-row">
                        <div class="form-col-2">
                            <div class="form-group">
                                <label for="sources">RSS Sources *</label>
                                <textarea id="sources" name="sources" rows="4" required 
                                          placeholder="Enter RSS feed URLs (one per line) or JSON array of sources:
https://example.com/rss.xml
https://another.com/feed.xml"></textarea>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group">
                                <label for="max-articles">Max Articles per Source</label>
                                <input type="number" id="max-articles" name="max_articles_per_source" 
                                       value="10" min="1" max="50">
                            </div>
                            <div class="form-group">
                                <label for="time-range">Time Range</label>
                                <select id="time-range" name="time_range">
                                    <option value="1h">Last Hour</option>
                                    <option value="6h">Last 6 Hours</option>
                                    <option value="1d">Last 24 Hours</option>
                                    <option value="3d">Last 3 Days</option>
                                    <option value="7d" selected>Last Week</option>
                                    <option value="30d">Last 30 Days</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-col">
                            <div class="form-group">
                                <label for="content-type">Content Processing</label>
                                <select id="content-type" name="content_processing">
                                    <option value="summary" selected>Summary Only</option>
                                    <option value="full">Full Content</option>
                                    <option value="title">Title Only</option>
                                    <option value="smart">Smart Processing</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group">
                                <label for="language-filter">Language Filter</label>
                                <select id="language-filter" name="language_filter">
                                    <option value="any" selected>Any Language</option>
                                    <option value="en">English Only</option>
                                    <option value="es">Spanish Only</option>
                                    <option value="fr">French Only</option>
                                    <option value="auto">Auto-detect</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group">
                                <label for="duplicate-handling">Duplicate Handling</label>
                                <select id="duplicate-handling" name="duplicate_handling">
                                    <option value="skip" selected>Skip Duplicates</option>
                                    <option value="update">Update Existing</option>
                                    <option value="keep">Keep All</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-col">
                            <label>
                                <input type="checkbox" id="include-content" name="include_content" checked>
                                Extract Full Content
                            </label>
                        </div>
                        <div class="form-col">
                            <label>
                                <input type="checkbox" id="include-images" name="include_images">
                                Include Images
                            </label>
                        </div>
                        <div class="form-col">
                            <label>
                                <input type="checkbox" id="include-metadata" name="include_metadata" checked>
                                Include Metadata
                            </label>
                        </div>
                        <div class="form-col">
                            <label>
                                <input type="checkbox" id="validate-urls" name="validate_urls" checked>
                                Validate Article URLs
                            </label>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" id="preview-sources-btn" class="btn btn-secondary">👁️ Preview Sources</button>
                        <button type="button" id="clear-form-btn" class="btn btn-secondary">Clear</button>
                        <button type="submit" id="fetch-articles-btn" class="btn btn-primary">📡 Fetch Articles</button>
                    </div>
                </form>

                <!-- Quick Actions -->
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                    <h3>Quick Actions</h3>
                    <div class="quick-actions">
                        <button id="load-library-btn" class="btn btn-secondary">📚 Load from Library</button>
                        <button id="test-feed-btn" class="btn btn-secondary">🧪 Test Single Feed</button>
                        <button id="batch-fetch-btn" class="btn btn-secondary">📊 Batch Fetch</button>
                    </div>
                </div>
            </div>

            <!-- Source Preview -->
            <div class="results-container" id="preview-container" style="display: none;">
                <div class="results-header">
                    <h2>Source Preview</h2>
                </div>
                <div id="source-preview">
                    <!-- Preview will be populated here -->
                </div>
            </div>

            <!-- Fetch Results -->
            <div class="results-container" id="results-container" style="display: none;">
                <div class="results-header">
                    <h2>Fetch Results</h2>
                    <div class="results-stats" id="fetch-stats">
                        <!-- Stats will be populated here -->
                    </div>
                </div>

                <div class="form-row" style="margin-bottom: 20px;">
                    <div class="form-col">
                        <input type="text" id="filter-articles" placeholder="Filter articles..." 
                               style="width: 100%;">
                    </div>
                    <div class="form-col">
                        <select id="sort-articles">
                            <option value="date">Sort by Date</option>
                            <option value="source">Sort by Source</option>
                            <option value="title">Sort by Title</option>
                            <option value="relevance">Sort by Relevance</option>
                        </select>
                    </div>
                    <div class="form-col">
                        <button id="export-articles-btn" class="btn btn-secondary">📤 Export</button>
                    </div>
                </div>

                <div id="articles-results">
                    <!-- Results will be populated here -->
                </div>
            </div>

            <!-- Fetch History -->
            <div class="results-container">
                <div class="results-header">
                    <h2>Recent Fetches</h2>
                    <button id="refresh-history-btn" class="btn btn-secondary">Refresh</button>
                </div>
                
                <div id="fetch-history">
                    <!-- Fetch history will be populated here -->
                </div>
            </div>

            <!-- Feed Monitoring -->
            <div class="results-container">
                <div class="results-header">
                    <h2>Feed Monitoring</h2>
                </div>
                
                <div class="card-grid">
                    <div class="info-card">
                        <h3>📊 Performance Metrics</h3>
                        <div id="performance-metrics">
                            <div class="info-list">
                                <li><span class="info-label">Avg Fetch Time:</span> <span class="info-value" id="avg-fetch-time">-</span></li>
                                <li><span class="info-label">Success Rate:</span> <span class="info-value" id="success-rate">-</span></li>
                                <li><span class="info-label">Articles/Min:</span> <span class="info-value" id="articles-per-min">-</span></li>
                                <li><span class="info-label">Error Rate:</span> <span class="info-value" id="error-rate">-</span></li>
                            </div>
                        </div>
                    </div>
                    
                    <div class="info-card">
                        <h3>🚨 Feed Health</h3>
                        <div id="feed-health">
                            <div class="info-list">
                                <li><span class="info-label">Active Feeds:</span> <span class="info-value" id="active-feeds">-</span></li>
                                <li><span class="info-label">Stale Feeds:</span> <span class="info-value" id="stale-feeds">-</span></li>
                                <li><span class="info-label">Error Feeds:</span> <span class="info-value" id="error-feeds">-</span></li>
                                <li><span class="info-label">Last Check:</span> <span class="info-value" id="last-health-check">-</span></li>
                            </div>
                        </div>
                        <button id="health-check-btn" class="btn btn-primary" style="margin-top: 10px;">🔍 Health Check</button>
                    </div>
                    
                    <div class="info-card">
                        <h3>🎯 Content Insights</h3>
                        <div id="content-insights">
                            <canvas id="content-chart" width="300" height="200"></canvas>
                        </div>
                        <button id="analyze-content-btn" class="btn btn-primary" style="margin-top: 10px;">📈 Analyze Content</button>
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

    <!-- Test Feed Modal -->
    <div id="test-feed-modal" class="modal" style="display: none;">
        <div class="modal-content">
            <h2>Test Single Feed</h2>
            <div class="form-group">
                <label for="test-feed-url">Feed URL:</label>
                <input type="url" id="test-feed-url" placeholder="https://example.com/rss.xml">
            </div>
            <div class="form-actions">
                <button id="cancel-test-btn" class="btn btn-secondary">Cancel</button>
                <button id="run-test-btn" class="btn btn-primary">Test Feed</button>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="/static/js/auth.js"></script>
    <script src="/static/js/api.js"></script>
    <script src="/static/js/ui.js"></script>
    
    <script>
        // Feed Fetcher-specific JavaScript
        class FeedFetcherInterface {
            constructor() {
                this.auth = new AIFactoryAuth();
                this.api = new AIFactoryAPI();
                this.ui = new AIFactoryUI();
                this.fetchedArticles = [];
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
                document.getElementById('fetcher-form').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.fetchArticles();
                });

                // Preview sources
                document.getElementById('preview-sources-btn').addEventListener('click', () => {
                    this.previewSources();
                });

                // Clear form
                document.getElementById('clear-form-btn').addEventListener('click', () => {
                    this.clearForm();
                });

                // Quick actions
                document.getElementById('load-library-btn').addEventListener('click', () => {
                    this.loadFromLibrary();
                });

                document.getElementById('test-feed-btn').addEventListener('click', () => {
                    this.showTestFeedModal();
                });

                document.getElementById('batch-fetch-btn').addEventListener('click', () => {
                    this.setupBatchFetch();
                });

                // Test feed modal
                document.getElementById('run-test-btn').addEventListener('click', async () => {
                    await this.testSingleFeed();
                });

                document.getElementById('cancel-test-btn').addEventListener('click', () => {
                    this.hideTestFeedModal();
                });

                // Export
                document.getElementById('export-articles-btn').addEventListener('click', () => {
                    this.exportArticles();
                });

                // Filter and sort
                document.getElementById('filter-articles').addEventListener('input', 
                    this.ui.debounce((e) => this.filterArticles(e.target.value), 300)
                );

                document.getElementById('sort-articles').addEventListener('change', (e) => {
                    this.sortArticles(e.target.value);
                });

                // Monitoring
                document.getElementById('health-check-btn').addEventListener('click', async () => {
                    await this.runHealthCheck();
                });

                document.getElementById('analyze-content-btn').addEventListener('click', async () => {
                    await this.analyzeContent();
                });

                // History refresh
                document.getElementById('refresh-history-btn').addEventListener('click', async () => {
                    await this.loadFetchHistory();
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
                        this.loadFetchHistory(),
                        this.loadPerformanceMetrics(),
                        this.loadFeedHealth()
                    ]);
                } catch (error) {
                    console.error('Failed to load initial data:', error);
                    this.ui.showToast('Failed to load initial data', 'error');
                }
            }

            async fetchArticles() {
                try {
                    this.ui.showLoading('Fetching articles...');
                    
                    const formData = new FormData(document.getElementById('fetcher-form'));
                    const request = Object.fromEntries(formData.entries());
                    
                    // Parse sources
                    let sources;
                    try {
                        // Try to parse as JSON first
                        sources = JSON.parse(request.sources);
                    } catch {
                        // If not JSON, split by lines and clean up
                        sources = request.sources.split('\\n')
                            .map(line => line.trim())
                            .filter(line => line && line.startsWith('http'));
                    }

                    if (!sources || sources.length === 0) {
                        throw new Error('Please provide valid RSS feed URLs');
                    }
                    
                    // Convert form values
                    request.sources = sources;
                    request.max_articles_per_source = parseInt(request.max_articles_per_source);
                    request.include_content = document.getElementById('include-content').checked;
                    request.include_images = document.getElementById('include-images').checked;
                    request.include_metadata = document.getElementById('include-metadata').checked;
                    request.validate_urls = document.getElementById('validate-urls').checked;

                    const response = await this.api.fetchFeeds(sources, request);

                    if (response.success) {
                        this.fetchedArticles = response.articles || [];
                        this.showFetchResults(response);
                        this.ui.showToast(`Fetched $\{this.fetchedArticles.length\} articles`, 'success');
                    } else {
                        throw new Error(response.error || 'Article fetching failed');
                    }

                } catch (error) {
                    console.error('Article fetching failed:', error);
                    this.ui.showToast('Article fetching failed: ' + error.message, 'error');
                } finally {
                    this.ui.hideLoading();
                }
            }

            previewSources() {
                const sourcesText = document.getElementById('sources').value.trim();
                if (!sourcesText) {
                    this.ui.showToast('Please enter some RSS sources first', 'warning');
                    return;
                }

                let sources;
                try {
                    sources = JSON.parse(sourcesText);
                } catch {
                    sources = sourcesText.split('\\n')
                        .map(line => line.trim())
                        .filter(line => line && line.startsWith('http'));
                }

                const container = document.getElementById('preview-container');
                const previewContainer = document.getElementById('source-preview');
                
                container.style.display = 'block';
                previewContainer.innerHTML = `
                    <h3>Sources to fetch (\${sources.length}):</h3>
                    <ul>
                        \${sources.map(source => `
                            <li>
                                <strong>\${typeof source === 'string' ? source : source.url}</strong>
                                \${typeof source === 'object' && source.title ? `- $\{source.title\}` : ''}
                            </li>
                        `).join('')}
                    </ul>
                `;
            }

            showFetchResults(results) {
                const container = document.getElementById('results-container');
                const statsContainer = document.getElementById('fetch-stats');
                
                container.style.display = 'block';
                
                // Show stats
                statsContainer.innerHTML = `
                    <div class="stat-item">
                        <div class="stat-value">\${results.articles?.length || 0}</div>
                        <div class="stat-label">Articles Fetched</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">\${results.sources_processed || 0}</div>
                        <div class="stat-label">Sources Processed</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">\${results.success_rate ? Math.round(results.success_rate * 100) : 0}%</div>
                        <div class="stat-label">Success Rate</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">\${this.ui.formatDuration(results.execution_time_ms)}</div>
                        <div class="stat-label">Fetch Time</div>
                    </div>
                `;

                this.renderArticleResults();
            }

            renderArticleResults() {
                const container = document.getElementById('articles-results');
                
                if (this.fetchedArticles.length > 0) {
                    container.innerHTML = `
                        <div class="card-grid">
                            \${this.fetchedArticles.map(article => this.renderArticleCard(article)).join('')}
                        </div>
                    `;
                } else {
                    container.innerHTML = '<p>No articles were fetched.</p>';
                }
            }

            renderArticleCard(article) {
                return `
                    <div class="info-card" data-article-id="\${article.id}">
                        <h3><a href="\${article.url}" target="_blank">\${article.title}</a></h3>
                        <p><strong>Source:</strong> \${article.source || 'Unknown'}</p>
                        <p><strong>Published:</strong> \${article.published_date ? this.ui.formatTimestamp(article.published_date) : 'Unknown'}</p>
                        \${article.summary ? `<p><strong>Summary:</strong> $\{article.summary.substring(0, 150)\}...</p>` : ''}
                        \${article.author ? `<p><strong>Author:</strong> $\{article.author\}</p>` : ''}
                        <div class="tag-container">
                            \${article.categories ? article.categories.map(cat => `<span class="tag">$\{cat\}</span>`).join('') : ''}
                        </div>
                        <div style="margin-top: 15px;">
                            <button class="btn btn-primary" onclick="window.open('\${article.url}', '_blank')">Read Article</button>
                            <button class="btn btn-secondary" onclick="this.viewArticleDetails('\${article.id}')">View Details</button>
                        </div>
                    </div>
                `;
            }

            showTestFeedModal() {
                document.getElementById('test-feed-modal').style.display = 'flex';
            }

            hideTestFeedModal() {
                document.getElementById('test-feed-modal').style.display = 'none';
                document.getElementById('test-feed-url').value = '';
            }

            async testSingleFeed() {
                const feedUrl = document.getElementById('test-feed-url').value.trim();
                if (!feedUrl) {
                    this.ui.showToast('Please enter a feed URL', 'warning');
                    return;
                }

                try {
                    this.ui.showLoading('Testing feed...');
                    
                    const response = await this.api.fetchFeeds([feedUrl], {
                        max_articles_per_source: 5,
                        include_content: false
                    });

                    if (response.success) {
                        this.hideTestFeedModal();
                        this.ui.showToast(`Feed test successful! Found $\{response.articles.length\} articles`, 'success');
                        
                        // Optionally show test results
                        this.fetchedArticles = response.articles;
                        this.renderArticleResults();
                        document.getElementById('results-container').style.display = 'block';
                    } else {
                        throw new Error(response.error || 'Feed test failed');
                    }

                } catch (error) {
                    this.ui.showToast('Feed test failed: ' + error.message, 'error');
                } finally {
                    this.ui.hideLoading();
                }
            }

            loadFromLibrary() {
                // Mock loading from library
                const librarySources = [
                    'https://techcrunch.com/rss/',
                    'https://www.wired.com/feed/rss',
                    'https://feeds.feedburner.com/oreilly/radar/atom'
                ];
                
                document.getElementById('sources').value = librarySources.join('\\n');
                this.ui.showToast('Loaded sources from library', 'success');
            }

            setupBatchFetch() {
                // This would set up a batch fetch operation
                this.ui.showToast('Batch fetch setup - Feature coming soon!', 'info');
            }

            filterArticles(query) {
                const cards = document.querySelectorAll('#articles-results .info-card');
                cards.forEach(card => {
                    const text = card.textContent.toLowerCase();
                    card.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
                });
            }

            sortArticles(criteria) {
                this.ui.showToast(`Sorting articles by $\{criteria\}`, 'info');
                // This would implement actual sorting
            }

            exportArticles() {
                if (this.fetchedArticles.length === 0) {
                    this.ui.showToast('No articles to export', 'warning');
                    return;
                }

                const exportData = {
                    exported_at: new Date().toISOString(),
                    total_articles: this.fetchedArticles.length,
                    articles: this.fetchedArticles
                };

                this.ui.downloadAsFile(
                    JSON.stringify(exportData, null, 2),
                    `articles-$\{new Date().toISOString().split('T')[0]\}.json`,
                    'application/json'
                );
            }

            async runHealthCheck() {
                try {
                    this.ui.showLoading('Running feed health check...');
                    
                    // Mock health check
                    setTimeout(() => {
                        this.ui.hideLoading();
                        this.loadFeedHealth();
                        this.ui.showToast('Health check complete', 'success');
                    }, 2000);
                } catch (error) {
                    this.ui.showToast('Health check failed', 'error');
                    this.ui.hideLoading();
                }
            }

            async analyzeContent() {
                this.ui.showLoading('Analyzing content...');
                
                setTimeout(() => {
                    this.ui.hideLoading();
                    this.ui.showToast('Content analysis complete', 'success');
                    // This would update the content chart
                }, 3000);
            }

            async loadFetchHistory() {
                // Mock history data
                const historyContainer = document.getElementById('fetch-history');
                historyContainer.innerHTML = `
                    <div class="timeline">
                        <div class="timeline-item">
                            <div class="timeline-content">
                                <div class="timeline-time">30 minutes ago</div>
                                <div><strong>Tech News Fetch</strong> - 25 articles from 5 sources</div>
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-content">
                                <div class="timeline-time">2 hours ago</div>
                                <div><strong>Science Updates</strong> - 12 articles from 3 sources</div>
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-content">
                                <div class="timeline-time">1 day ago</div>
                                <div><strong>Business News</strong> - 45 articles from 8 sources</div>
                            </div>
                        </div>
                    </div>
                `;
            }

            async loadPerformanceMetrics() {
                // Mock performance data
                document.getElementById('avg-fetch-time').textContent = '2.3s';
                document.getElementById('success-rate').textContent = '94%';
                document.getElementById('articles-per-min').textContent = '12.5';
                document.getElementById('error-rate').textContent = '6%';
            }

            async loadFeedHealth() {
                // Mock health data
                document.getElementById('active-feeds').textContent = '23';
                document.getElementById('stale-feeds').textContent = '2';
                document.getElementById('error-feeds').textContent = '1';
                document.getElementById('last-health-check').textContent = new Date().toLocaleTimeString();
            }

            viewArticleDetails(articleId) {
                const article = this.fetchedArticles.find(a => a.id === articleId);
                if (article) {
                    // This would show a detailed view of the article
                    this.ui.showToast(`Viewing details for: $\{article.title\}`, 'info');
                }
            }

            clearForm() {
                document.getElementById('fetcher-form').reset();
                document.getElementById('max-articles').value = '10';
                document.getElementById('include-content').checked = true;
                document.getElementById('include-metadata').checked = true;
                document.getElementById('validate-urls').checked = true;
                document.getElementById('preview-container').style.display = 'none';
                document.getElementById('results-container').style.display = 'none';
            }
        }

        // Initialize feed fetcher interface when page loads
        document.addEventListener('DOMContentLoaded', () => {
            new FeedFetcherInterface();
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
        
        .quick-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
    </style>
</body>
</html>`;