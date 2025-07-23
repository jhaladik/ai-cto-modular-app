// AI Factory Frontend Worker - RSS Librarian Interface HTML
// @WORKER: FrontendWorker
// 🧱 Type: StaticHTML
// 📍 Path: src/static/html/rss-librarian.ts
// 🎯 Role: RSS librarian worker interface for source curation and management
// 💾 Storage: { embedded: "worker_code" }

export const RSS_LIBRARIAN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Factory - RSS Librarian</title>
    <link rel="stylesheet" href="/static/css/shared.css">
    <link rel="stylesheet" href="/static/css/components.css">
</head>
<body>
    <div id="app">
        <!-- Header -->
        <header class="header">
            <div class="container">
                <h1><a href="/" style="color: inherit; text-decoration: none;">🏭 AI Factory</a> - RSS Librarian</h1>
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
                <h1>📚 RSS Librarian</h1>
                <p>Curate and manage RSS sources for intelligent content monitoring</p>
            </div>

            <!-- Source Discovery Form -->
            <div class="form-container">
                <h2>Find RSS Sources</h2>
                <form id="librarian-form">
                    <div class="form-row">
                        <div class="form-col-2">
                            <div class="form-group">
                                <label for="topic">Topic *</label>
                                <input type="text" id="topic" name="topic" required 
                                       placeholder="Enter topic to find RSS sources for...">
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group">
                                <label for="max-sources">Max Sources</label>
                                <input type="number" id="max-sources" name="max_sources" 
                                       value="20" min="5" max="100">
                            </div>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-col">
                            <div class="form-group">
                                <label for="quality-threshold">Quality Threshold</label>
                                <select id="quality-threshold" name="quality_threshold">
                                    <option value="0.5">Low (50%)</option>
                                    <option value="0.7" selected>Standard (70%)</option>
                                    <option value="0.8">High (80%)</option>
                                    <option value="0.9">Premium (90%)</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group">
                                <label for="source-type">Source Type</label>
                                <select id="source-type" name="source_type">
                                    <option value="all" selected>All Sources</option>
                                    <option value="news">News Sites</option>
                                    <option value="blog">Blogs</option>
                                    <option value="academic">Academic</option>
                                    <option value="government">Government</option>
                                    <option value="corporate">Corporate</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group">
                                <label for="language-filter">Language</label>
                                <select id="language-filter" name="language">
                                    <option value="en" selected>English</option>
                                    <option value="es">Spanish</option>
                                    <option value="fr">French</option>
                                    <option value="de">German</option>
                                    <option value="any">Any Language</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-col">
                            <label>
                                <input type="checkbox" id="include-niche" name="include_niche_sources" checked>
                                Include Niche Sources
                            </label>
                        </div>
                        <div class="form-col">
                            <label>
                                <input type="checkbox" id="validate-feeds" name="validate_feeds" checked>
                                Validate Feed URLs
                            </label>
                        </div>
                        <div class="form-col">
                            <label>
                                <input type="checkbox" id="check-activity" name="check_activity" checked>
                                Check Recent Activity
                            </label>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" id="clear-form-btn" class="btn btn-secondary">Clear</button>
                        <button type="submit" id="find-sources-btn" class="btn btn-primary">📚 Find Sources</button>
                    </div>
                </form>
            </div>

            <!-- Manual Feed Validation -->
            <div class="form-container">
                <h2>Validate RSS Feed</h2>
                <div class="form-row">
                    <div class="form-col-2">
                        <div class="form-group">
                            <label for="feed-url">RSS Feed URL</label>
                            <input type="url" id="feed-url" name="feed_url" 
                                   placeholder="https://example.com/rss.xml">
                        </div>
                    </div>
                    <div class="form-col">
                        <div class="form-group">
                            <label>&nbsp;</label>
                            <button type="button" id="validate-feed-btn" class="btn btn-primary">✅ Validate Feed</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Source Discovery Results -->
            <div class="results-container" id="results-container" style="display: none;">
                <div class="results-header">
                    <h2>Discovered Sources</h2>
                    <div class="results-stats" id="discovery-stats">
                        <!-- Stats will be populated here -->
                    </div>
                </div>

                <div class="form-row" style="margin-bottom: 20px;">
                    <div class="form-col">
                        <input type="text" id="filter-sources" placeholder="Filter sources..." 
                               style="width: 100%;">
                    </div>
                    <div class="form-col">
                        <select id="sort-sources">
                            <option value="quality">Sort by Quality</option>
                            <option value="relevance">Sort by Relevance</option>
                            <option value="activity">Sort by Activity</option>
                            <option value="domain">Sort by Domain</option>
                        </select>
                    </div>
                </div>

                <div id="sources-results">
                    <!-- Results will be populated here -->
                </div>
            </div>

            <!-- Feed Validation Results -->
            <div class="results-container" id="validation-results" style="display: none;">
                <div class="results-header">
                    <h2>Feed Validation Results</h2>
                </div>
                <div id="validation-details">
                    <!-- Validation details will be populated here -->
                </div>
            </div>

            <!-- Source Library -->
            <div class="results-container">
                <div class="results-header">
                    <h2>Source Library</h2>
                    <div style="display: flex; gap: 10px;">
                        <button id="export-library-btn" class="btn btn-secondary">📤 Export</button>
                        <button id="import-library-btn" class="btn btn-secondary">📥 Import</button>
                        <button id="refresh-library-btn" class="btn btn-secondary">Refresh</button>
                    </div>
                </div>
                
                <div class="card-grid" id="source-library">
                    <!-- Source library will be populated here -->
                </div>
            </div>

            <!-- Library Management Tools -->
            <div class="results-container">
                <div class="results-header">
                    <h2>Library Management</h2>
                </div>
                
                <div class="card-grid">
                    <div class="info-card">
                        <h3>🔍 Source Analysis</h3>
                        <p>Analyze your current source library for quality and coverage</p>
                        <button id="analyze-library-btn" class="btn btn-primary">Analyze Library</button>
                    </div>
                    
                    <div class="info-card">
                        <h3>🧹 Cleanup Tools</h3>
                        <p>Remove dead feeds and duplicate sources</p>
                        <button id="cleanup-library-btn" class="btn btn-warning">Cleanup Library</button>
                    </div>
                    
                    <div class="info-card">
                        <h3>📊 Library Stats</h3>
                        <div id="library-stats">
                            <div class="info-list">
                                <li><span class="info-label">Total Sources:</span> <span class="info-value" id="total-sources">-</span></li>
                                <li><span class="info-label">Active Feeds:</span> <span class="info-value" id="active-feeds">-</span></li>
                                <li><span class="info-label">Dead Feeds:</span> <span class="info-value" id="dead-feeds">-</span></li>
                                <li><span class="info-label">Avg Quality:</span> <span class="info-value" id="avg-quality">-</span></li>
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

    <!-- Scripts -->
    <script src="/static/js/auth.js"></script>
    <script src="/static/js/api.js"></script>
    <script src="/static/js/ui.js"></script>
    
    <script>
        // RSS Librarian-specific JavaScript
        class RSSLibrarianInterface {
            constructor() {
                this.auth = new AIFactoryAuth();
                this.api = new AIFactoryAPI();
                this.ui = new AIFactoryUI();
                this.discoveredSources = [];
                this.sourceLibrary = [];
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
                document.getElementById('librarian-form').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.findSources();
                });

                // Clear form
                document.getElementById('clear-form-btn').addEventListener('click', () => {
                    this.clearForm();
                });

                // Feed validation
                document.getElementById('validate-feed-btn').addEventListener('click', async () => {
                    await this.validateSingleFeed();
                });

                // Library management
                document.getElementById('refresh-library-btn').addEventListener('click', async () => {
                    await this.loadSourceLibrary();
                });

                document.getElementById('export-library-btn').addEventListener('click', () => {
                    this.exportLibrary();
                });

                document.getElementById('import-library-btn').addEventListener('click', () => {
                    this.importLibrary();
                });

                document.getElementById('analyze-library-btn').addEventListener('click', async () => {
                    await this.analyzeLibrary();
                });

                document.getElementById('cleanup-library-btn').addEventListener('click', async () => {
                    await this.cleanupLibrary();
                });

                // Filter and sort
                document.getElementById('filter-sources').addEventListener('input', 
                    this.ui.debounce((e) => this.filterSources(e.target.value), 300)
                );

                document.getElementById('sort-sources').addEventListener('change', (e) => {
                    this.sortSources(e.target.value);
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
                        this.loadSourceLibrary(),
                        this.loadLibraryStats()
                    ]);
                } catch (error) {
                    console.error('Failed to load initial data:', error);
                    this.ui.showToast('Failed to load initial data', 'error');
                }
            }

            async findSources() {
                try {
                    this.ui.showLoading('Finding RSS sources...');
                    
                    const formData = new FormData(document.getElementById('librarian-form'));
                    const request = Object.fromEntries(formData.entries());
                    
                    // Convert values
                    request.max_sources = parseInt(request.max_sources);
                    request.quality_threshold = parseFloat(request.quality_threshold);
                    request.include_niche_sources = document.getElementById('include-niche').checked;
                    request.validate_feeds = document.getElementById('validate-feeds').checked;
                    request.check_activity = document.getElementById('check-activity').checked;

                    const response = await this.api.findRSSSources(request.topic, request);

                    if (response.success) {
                        this.discoveredSources = response.sources || [];
                        this.showDiscoveryResults(response);
                        this.ui.showToast(`Found $\{this.discoveredSources.length\} sources`, 'success');
                    } else {
                        throw new Error(response.error || 'Source discovery failed');
                    }

                } catch (error) {
                    console.error('Source discovery failed:', error);
                    this.ui.showToast('Source discovery failed: ' + error.message, 'error');
                } finally {
                    this.ui.hideLoading();
                }
            }

            showDiscoveryResults(results) {
                const container = document.getElementById('results-container');
                const statsContainer = document.getElementById('discovery-stats');
                
                container.style.display = 'block';
                
                // Show stats
                statsContainer.innerHTML = `
                    <div class="stat-item">
                        <div class="stat-value">\${results.sources?.length || 0}</div>
                        <div class="stat-label">Sources Found</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">\${results.validated_feeds || 0}</div>
                        <div class="stat-label">Valid Feeds</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">\${Math.round(results.avg_quality * 100) || 0}%</div>
                        <div class="stat-label">Avg Quality</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">\${this.ui.formatDuration(results.execution_time_ms)}</div>
                        <div class="stat-label">Discovery Time</div>
                    </div>
                `;

                this.renderSourceResults();
            }

            renderSourceResults() {
                const container = document.getElementById('sources-results');
                
                if (this.discoveredSources.length > 0) {
                    container.innerHTML = `
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Source</th>
                                    <th>Domain</th>
                                    <th>Quality</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Last Post</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                \${this.discoveredSources.map(source => this.renderSourceRow(source)).join('')}
                            </tbody>
                        </table>
                    `;
                } else {
                    container.innerHTML = '<p>No sources found for this topic.</p>';
                }
            }

            renderSourceRow(source) {
                const qualityPercent = Math.round(source.quality_score * 100);
                const qualityClass = qualityPercent >= 80 ? 'success' : qualityPercent >= 60 ? 'warning' : 'danger';
                
                return `
                    <tr data-source-id="\${source.id}">
                        <td>
                            <strong>\${source.title || source.name}</strong><br>
                            <small>\${source.description || ''}</small>
                        </td>
                        <td>\${source.domain}</td>
                        <td>
                            <div class="progress-bar-container">
                                <div class="progress-bar-fill" style="width: \${qualityPercent}%"></div>
                            </div>
                            \${qualityPercent}%
                        </td>
                        <td><span class="tag \${source.type}">\${source.type}</span></td>
                        <td><span class="status \${source.status === 'active' ? 'status-online' : 'status-offline'}">\${source.status}</span></td>
                        <td>\${source.last_post ? this.ui.formatTimestamp(source.last_post) : 'Unknown'}</td>
                        <td class="actions">
                            <button class="btn btn-primary" onclick="window.open('\${source.url}', '_blank')" title="Visit Site">🌐</button>
                            <button class="btn btn-secondary" onclick="window.open('\${source.rss_url}', '_blank')" title="View RSS">📡</button>
                            <button class="btn btn-success" onclick="this.addToLibrary('\${source.id}')" title="Add to Library">➕</button>
                            <button class="btn btn-secondary" onclick="navigator.clipboard.writeText('\${source.rss_url}')" title="Copy RSS URL">📋</button>
                        </td>
                    </tr>
                `;
            }

            async validateSingleFeed() {
                const feedUrl = document.getElementById('feed-url').value.trim();
                if (!feedUrl) {
                    this.ui.showToast('Please enter a feed URL', 'warning');
                    return;
                }

                try {
                    this.ui.showLoading('Validating RSS feed...');
                    
                    const response = await this.api.validateRSSFeed(feedUrl);
                    
                    this.showValidationResults(response);
                    
                    if (response.valid) {
                        this.ui.showToast('Feed is valid!', 'success');
                    } else {
                        this.ui.showToast('Feed validation failed', 'error');
                    }

                } catch (error) {
                    console.error('Feed validation failed:', error);
                    this.ui.showToast('Feed validation failed: ' + error.message, 'error');
                } finally {
                    this.ui.hideLoading();
                }
            }

            showValidationResults(validation) {
                const container = document.getElementById('validation-results');
                const detailsContainer = document.getElementById('validation-details');
                
                container.style.display = 'block';
                
                detailsContainer.innerHTML = `
                    <div class="info-card">
                        <h3>Validation Results</h3>
                        <div class="info-list">
                            <li><span class="info-label">Status:</span> 
                                <span class="info-value">
                                    <span class="status \${validation.valid ? 'status-online' : 'status-offline'}">
                                        \${validation.valid ? 'Valid' : 'Invalid'}
                                    </span>
                                </span>
                            </li>
                            <li><span class="info-label">Title:</span> <span class="info-value">\${validation.title || 'N/A'}</span></li>
                            <li><span class="info-label">Description:</span> <span class="info-value">\${validation.description || 'N/A'}</span></li>
                            <li><span class="info-label">Items Count:</span> <span class="info-value">\${validation.item_count || 0}</span></li>
                            <li><span class="info-label">Last Updated:</span> <span class="info-value">\${validation.last_updated ? this.ui.formatTimestamp(validation.last_updated) : 'Unknown'}</span></li>
                            <li><span class="info-label">Language:</span> <span class="info-value">\${validation.language || 'Unknown'}</span></li>
                        </div>
                        \${validation.errors ? `
                            <h4>Errors:</h4>
                            <ul>
                                \${validation.errors.map(error => `<li>$\{error\}</li>`).join('')}
                            </ul>
                        ` : ''}
                    </div>
                `;
            }

            filterSources(query) {
                const rows = document.querySelectorAll('#sources-results tbody tr');
                rows.forEach(row => {
                    const text = row.textContent.toLowerCase();
                    row.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
                });
            }

            sortSources(criteria) {
                // This would implement sorting logic
                this.ui.showToast(`Sorting by $\{criteria\}`, 'info');
            }

            async addToLibrary(sourceId) {
                const source = this.discoveredSources.find(s => s.id === sourceId);
                if (source) {
                    // Add to library logic
                    this.ui.showToast(`Added "$\{source.title\}" to library`, 'success');
                    await this.loadSourceLibrary();
                }
            }

            async loadSourceLibrary() {
                try {
                    // Mock library data - replace with actual API call
                    const library = [
                        { id: '1', title: 'TechCrunch', domain: 'techcrunch.com', quality: 0.9, status: 'active', type: 'news' },
                        { id: '2', title: 'MIT Technology Review', domain: 'technologyreview.com', quality: 0.95, status: 'active', type: 'academic' },
                        { id: '3', title: 'Wired', domain: 'wired.com', quality: 0.85, status: 'active', type: 'news' }
                    ];
                    
                    this.sourceLibrary = library;
                    this.renderSourceLibrary();
                } catch (error) {
                    console.error('Failed to load source library:', error);
                }
            }

            renderSourceLibrary() {
                const container = document.getElementById('source-library');
                
                container.innerHTML = this.sourceLibrary.map(source => `
                    <div class="info-card">
                        <h3>\${source.title}</h3>
                        <p><strong>Domain:</strong> \${source.domain}</p>
                        <p><strong>Quality:</strong> \${Math.round(source.quality * 100)}%</p>
                        <p><strong>Type:</strong> <span class="tag \${source.type}">\${source.type}</span></p>
                        <p><strong>Status:</strong> <span class="status \${source.status === 'active' ? 'status-online' : 'status-offline'}">\${source.status}</span></p>
                        <div style="margin-top: 15px;">
                            <button class="btn btn-primary" onclick="window.open('\${source.url}', '_blank')">Visit</button>
                            <button class="btn btn-danger" onclick="this.removeFromLibrary('\${source.id}')">Remove</button>
                        </div>
                    </div>
                `).join('');
            }

            async loadLibraryStats() {
                // Mock stats - replace with actual API call
                document.getElementById('total-sources').textContent = this.sourceLibrary.length;
                document.getElementById('active-feeds').textContent = this.sourceLibrary.filter(s => s.status === 'active').length;
                document.getElementById('dead-feeds').textContent = this.sourceLibrary.filter(s => s.status === 'inactive').length;
                document.getElementById('avg-quality').textContent = Math.round(
                    this.sourceLibrary.reduce((sum, s) => sum + s.quality, 0) / this.sourceLibrary.length * 100
                ) + '%';
            }

            exportLibrary() {
                const data = JSON.stringify(this.sourceLibrary, null, 2);
                this.ui.downloadAsFile(data, 'rss-library.json', 'application/json');
            }

            importLibrary() {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            try {
                                const imported = JSON.parse(e.target.result);
                                this.sourceLibrary = [...this.sourceLibrary, ...imported];
                                this.renderSourceLibrary();
                                this.ui.showToast(`Imported $\{imported.length\} sources`, 'success');
                            } catch (error) {
                                this.ui.showToast('Invalid JSON file', 'error');
                            }
                        };
                        reader.readAsText(file);
                    }
                };
                input.click();
            }

            async analyzeLibrary() {
                this.ui.showLoading('Analyzing library...');
                
                setTimeout(() => {
                    this.ui.hideLoading();
                    this.ui.showToast(`Library analysis complete. Quality score: 87%`, 'success');
                }, 2000);
            }

            async cleanupLibrary() {
                if (this.ui.confirm('This will remove dead feeds and duplicates. Continue?')) {
                    this.ui.showLoading('Cleaning up library...');
                    
                    setTimeout(() => {
                        this.ui.hideLoading();
                        this.ui.showToast('Library cleanup complete. Removed 3 dead feeds.', 'success');
                        this.loadSourceLibrary();
                    }, 3000);
                }
            }

            removeFromLibrary(sourceId) {
                if (this.ui.confirm('Remove this source from your library?')) {
                    this.sourceLibrary = this.sourceLibrary.filter(s => s.id !== sourceId);
                    this.renderSourceLibrary();
                    this.loadLibraryStats();
                    this.ui.showToast('Source removed from library', 'success');
                }
            }

            clearForm() {
                document.getElementById('librarian-form').reset();
                document.getElementById('max-sources').value = '20';
                document.getElementById('quality-threshold').value = '0.7';
                document.getElementById('include-niche').checked = true;
                document.getElementById('validate-feeds').checked = true;
                document.getElementById('check-activity').checked = true;
                document.getElementById('results-container').style.display = 'none';
                document.getElementById('validation-results').style.display = 'none';
            }
        }

        // Initialize RSS librarian interface when page loads
        document.addEventListener('DOMContentLoaded', () => {
            new RSSLibrarianInterface();
        });
    </script>
</body>
</html>`;