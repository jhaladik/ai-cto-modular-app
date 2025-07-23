// AI Factory Frontend Worker - Topic Researcher Interface HTML
// @WORKER: FrontendWorker
// 🧱 Type: StaticHTML
// 📍 Path: src/static/html/topic-researcher.ts
// 🎯 Role: Topic researcher worker interface for RSS source discovery
// 💾 Storage: { embedded: "worker_code" }

export const TOPIC_RESEARCHER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Factory - Topic Researcher</title>
    <link rel="stylesheet" href="/static/css/shared.css">
    <link rel="stylesheet" href="/static/css/components.css">
</head>
<body>
    <div id="app">
        <!-- Header -->
        <header class="header">
            <div class="container">
                <h1><a href="/" style="color: inherit; text-decoration: none;">🏭 AI Factory</a> - Topic Researcher</h1>
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
                <h1>🔍 Topic Researcher</h1>
                <p>Discover relevant RSS sources and topics for intelligence gathering</p>
            </div>

            <!-- Research Form -->
            <div class="form-container">
                <h2>Research New Topic</h2>
                <form id="research-form">
                    <div class="form-row">
                        <div class="form-col-2">
                            <div class="form-group">
                                <label for="topic">Research Topic *</label>
                                <input type="text" id="topic" name="topic" required 
                                       placeholder="Enter topic to research (e.g., artificial intelligence, climate change)">
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group">
                                <label for="depth">Research Depth</label>
                                <select id="depth" name="depth">
                                    <option value="basic">Basic (5 sources)</option>
                                    <option value="standard" selected>Standard (10 sources)</option>
                                    <option value="comprehensive">Comprehensive (20 sources)</option>
                                    <option value="exhaustive">Exhaustive (50+ sources)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-col">
                            <div class="form-group">
                                <label for="max-sources">Max Sources</label>
                                <input type="number" id="max-sources" name="max_sources" 
                                       value="10" min="1" max="100">
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group">
                                <label for="language">Language</label>
                                <select id="language" name="language">
                                    <option value="en" selected>English</option>
                                    <option value="es">Spanish</option>
                                    <option value="fr">French</option>
                                    <option value="de">German</option>
                                    <option value="zh">Chinese</option>
                                    <option value="ja">Japanese</option>
                                    <option value="any">Any Language</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group">
                                <label for="region">Geographic Focus</label>
                                <select id="region" name="region">
                                    <option value="global" selected>Global</option>
                                    <option value="us">United States</option>
                                    <option value="eu">Europe</option>
                                    <option value="asia">Asia</option>
                                    <option value="americas">Americas</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-col">
                            <label>
                                <input type="checkbox" id="include-social" name="include_social_media">
                                Include Social Media Sources
                            </label>
                        </div>
                        <div class="form-col">
                            <label>
                                <input type="checkbox" id="include-academic" name="include_academic" checked>
                                Include Academic Sources
                            </label>
                        </div>
                        <div class="form-col">
                            <label>
                                <input type="checkbox" id="include-news" name="include_news" checked>
                                Include News Sources
                            </label>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" id="get-suggestions-btn" class="btn btn-secondary">💡 Get Suggestions</button>
                        <button type="button" id="clear-form-btn" class="btn btn-secondary">Clear</button>
                        <button type="submit" id="start-research-btn" class="btn btn-primary">🔍 Start Research</button>
                    </div>
                </form>
            </div>

            <!-- Topic Suggestions -->
            <div class="results-container" id="suggestions-container" style="display: none;">
                <div class="results-header">
                    <h2>Topic Suggestions</h2>
                </div>
                <div id="topic-suggestions" class="tag-container">
                    <!-- Suggestions will be populated here -->
                </div>
            </div>

            <!-- Research Results -->
            <div class="results-container" id="results-container" style="display: none;">
                <div class="results-header">
                    <h2>Research Results</h2>
                    <div class="results-stats" id="research-stats">
                        <!-- Stats will be populated here -->
                    </div>
                </div>

                <div id="research-results">
                    <!-- Results will be populated here -->
                </div>
            </div>

            <!-- Recent Research -->
            <div class="results-container">
                <div class="results-header">
                    <h2>Recent Research</h2>
                    <button id="refresh-history-btn" class="btn btn-secondary">Refresh</button>
                </div>
                
                <div id="research-history">
                    <!-- Research history will be populated here -->
                </div>
            </div>

            <!-- Quick Research Tools -->
            <div class="results-container">
                <div class="results-header">
                    <h2>Quick Research Tools</h2>
                </div>
                
                <div class="card-grid">
                    <div class="info-card">
                        <h3>🔥 Trending Topics</h3>
                        <p>Discover what topics are currently trending in the news and social media</p>
                        <button id="get-trending-btn" class="btn btn-primary">Get Trending</button>
                    </div>
                    
                    <div class="info-card">
                        <h3>🎯 Topic Validation</h3>
                        <p>Validate if a topic has sufficient RSS sources for effective monitoring</p>
                        <div class="form-group">
                            <input type="text" id="validate-topic" placeholder="Enter topic to validate">
                            <button id="validate-topic-btn" class="btn btn-primary">Validate</button>
                        </div>
                    </div>
                    
                    <div class="info-card">
                        <h3>📊 Topic Categories</h3>
                        <p>Browse research by category to find related topics</p>
                        <select id="category-browse">
                            <option value="">Select category...</option>
                            <option value="technology">Technology</option>
                            <option value="politics">Politics</option>
                            <option value="business">Business</option>
                            <option value="science">Science</option>
                            <option value="health">Health</option>
                            <option value="environment">Environment</option>
                        </select>
                        <button id="browse-category-btn" class="btn btn-primary">Browse</button>
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
        // Topic Researcher-specific JavaScript
        class TopicResearcherInterface {
            constructor() {
                this.auth = new AIFactoryAuth();
                this.api = new AIFactoryAPI();
                this.ui = new AIFactoryUI();
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
                document.getElementById('research-form').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.startResearch();
                });

                // Get suggestions
                document.getElementById('get-suggestions-btn').addEventListener('click', async () => {
                    await this.getSuggestions();
                });

                // Clear form
                document.getElementById('clear-form-btn').addEventListener('click', () => {
                    this.clearForm();
                });

                // Topic input for live suggestions
                let debounceTimer;
                document.getElementById('topic').addEventListener('input', (e) => {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => {
                        if (e.target.value.length > 2) {
                            this.getLiveSuggestions(e.target.value);
                        }
                    }, 500);
                });

                // Quick tools
                document.getElementById('get-trending-btn').addEventListener('click', async () => {
                    await this.getTrendingTopics();
                });

                document.getElementById('validate-topic-btn').addEventListener('click', async () => {
                    await this.validateTopic();
                });

                document.getElementById('browse-category-btn').addEventListener('click', async () => {
                    await this.browseCategory();
                });

                // Refresh history
                document.getElementById('refresh-history-btn').addEventListener('click', async () => {
                    await this.loadResearchHistory();
                });

                // Logout
                document.getElementById('logout-btn').addEventListener('click', async () => {
                    await this.auth.logout();
                    window.location.href = '/';
                });
            }

            async loadInitialData() {
                try {
                    await this.loadResearchHistory();
                } catch (error) {
                    console.error('Failed to load initial data:', error);
                    this.ui.showToast('Failed to load initial data', 'error');
                }
            }

            async startResearch() {
                try {
                    this.ui.showLoading('Starting research...');
                    
                    const formData = new FormData(document.getElementById('research-form'));
                    const request = Object.fromEntries(formData.entries());
                    
                    // Convert values
                    request.max_sources = parseInt(request.max_sources);
                    request.include_social_media = document.getElementById('include-social').checked;
                    request.include_academic = document.getElementById('include-academic').checked;
                    request.include_news = document.getElementById('include-news').checked;

                    const response = await this.api.researchTopic(request.topic, request);

                    if (response.success) {
                        this.showResearchResults(response);
                        this.ui.showToast('Research completed successfully', 'success');
                    } else {
                        throw new Error(response.error || 'Research failed');
                    }

                } catch (error) {
                    console.error('Research failed:', error);
                    this.ui.showToast('Research failed: ' + error.message, 'error');
                } finally {
                    this.ui.hideLoading();
                }
            }

            showResearchResults(results) {
                const container = document.getElementById('results-container');
                const statsContainer = document.getElementById('research-stats');
                const resultsContainer = document.getElementById('research-results');
                
                container.style.display = 'block';
                
                // Show stats
                statsContainer.innerHTML = `
                    <div class="stat-item">
                        <div class="stat-value">\${results.sources_found || 0}</div>
                        <div class="stat-label">Sources Found</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">\${results.quality_score || 0}%</div>
                        <div class="stat-label">Quality Score</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">\${this.ui.formatDuration(results.execution_time_ms)}</div>
                        <div class="stat-label">Research Time</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">\${this.ui.formatCurrency(results.cost_usd)}</div>
                        <div class="stat-label">Cost</div>
                    </div>
                `;

                // Show results
                if (results.sources && results.sources.length > 0) {
                    resultsContainer.innerHTML = `
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Source</th>
                                    <th>Domain</th>
                                    <th>Quality</th>
                                    <th>Type</th>
                                    <th>Relevance</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                \${results.sources.map(source => `
                                    <tr>
                                        <td>
                                            <strong>\${source.title || source.name}</strong><br>
                                            <small>\${source.description || ''}</small>
                                        </td>
                                        <td>\${source.domain}</td>
                                        <td>
                                            <div class="progress-bar-container">
                                                <div class="progress-bar-fill" style="width: \${source.quality_score * 100}%"></div>
                                            </div>
                                            \${Math.round(source.quality_score * 100)}%
                                        </td>
                                        <td><span class="tag \${source.type}">\${source.type}</span></td>
                                        <td>\${Math.round(source.relevance_score * 100)}%</td>
                                        <td class="actions">
                                            <button class="btn btn-primary" onclick="window.open('\${source.url}', '_blank')">View</button>
                                            <button class="btn btn-secondary" onclick="navigator.clipboard.writeText('\${source.rss_url || source.url}')">Copy RSS</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `;
                } else {
                    resultsContainer.innerHTML = '<p>No sources found for this topic.</p>';
                }
            }

            async getSuggestions() {
                const topic = document.getElementById('topic').value.trim();
                if (!topic) {
                    this.ui.showToast('Please enter a topic first', 'warning');
                    return;
                }

                try {
                    const suggestions = await this.api.getTopicSuggestions(topic);
                    this.showSuggestions(suggestions.suggestions || []);
                } catch (error) {
                    console.error('Failed to get suggestions:', error);
                    this.ui.showToast('Failed to get suggestions', 'error');
                }
            }

            async getLiveSuggestions(partial) {
                try {
                    const suggestions = await this.api.getTopicSuggestions(partial);
                    if (suggestions.suggestions && suggestions.suggestions.length > 0) {
                        this.showSuggestions(suggestions.suggestions.slice(0, 5));
                    }
                } catch (error) {
                    // Silently fail for live suggestions
                    console.warn('Live suggestions failed:', error);
                }
            }

            showSuggestions(suggestions) {
                const container = document.getElementById('suggestions-container');
                const suggestionsContainer = document.getElementById('topic-suggestions');
                
                if (suggestions.length > 0) {
                    container.style.display = 'block';
                    suggestionsContainer.innerHTML = suggestions.map(suggestion => `
                        <button class="tag primary" onclick="document.getElementById('topic').value = '\${suggestion}'; this.parentElement.style.display = 'none';">
                            \${suggestion}
                        </button>
                    `).join('');
                } else {
                    container.style.display = 'none';
                }
            }

            async getTrendingTopics() {
                try {
                    this.ui.showLoading('Getting trending topics...');
                    // This would call a trending topics endpoint
                    const trending = ['artificial intelligence', 'climate change', 'cryptocurrency', 'space exploration', 'renewable energy'];
                    this.showSuggestions(trending);
                    this.ui.showToast('Trending topics loaded', 'success');
                } catch (error) {
                    this.ui.showToast('Failed to get trending topics', 'error');
                } finally {
                    this.ui.hideLoading();
                }
            }

            async validateTopic() {
                const topic = document.getElementById('validate-topic').value.trim();
                if (!topic) {
                    this.ui.showToast('Please enter a topic to validate', 'warning');
                    return;
                }

                try {
                    this.ui.showLoading('Validating topic...');
                    const validation = await this.api.researchTopic(topic, { depth: 'basic', max_sources: 5 });
                    
                    if (validation.sources_found > 0) {
                        this.ui.showToast(`Topic validated! Found $\{validation.sources_found\} sources`, 'success');
                    } else {
                        this.ui.showToast('Topic has insufficient sources for monitoring', 'warning');
                    }
                } catch (error) {
                    this.ui.showToast('Topic validation failed', 'error');
                } finally {
                    this.ui.hideLoading();
                }
            }

            async browseCategory() {
                const category = document.getElementById('category-browse').value;
                if (!category) {
                    this.ui.showToast('Please select a category', 'warning');
                    return;
                }

                // This would show topics in the selected category
                const categoryTopics = {
                    'technology': ['artificial intelligence', 'machine learning', 'blockchain', 'cybersecurity'],
                    'politics': ['elections', 'policy changes', 'international relations', 'governance'],
                    'business': ['market trends', 'startups', 'corporate news', 'economics'],
                    'science': ['research breakthroughs', 'space exploration', 'medical advances', 'physics'],
                    'health': ['medical research', 'public health', 'healthcare policy', 'wellness trends'],
                    'environment': ['climate change', 'renewable energy', 'conservation', 'sustainability']
                };

                this.showSuggestions(categoryTopics[category] || []);
            }

            clearForm() {
                document.getElementById('research-form').reset();
                document.getElementById('max-sources').value = '10';
                document.getElementById('include-academic').checked = true;
                document.getElementById('include-news').checked = true;
                document.getElementById('suggestions-container').style.display = 'none';
                document.getElementById('results-container').style.display = 'none';
            }

            async loadResearchHistory() {
                try {
                    // This would load actual research history from the API
                    const historyContainer = document.getElementById('research-history');
                    historyContainer.innerHTML = `
                        <div class="timeline">
                            <div class="timeline-item">
                                <div class="timeline-content">
                                    <div class="timeline-time">2 hours ago</div>
                                    <div><strong>Artificial Intelligence</strong> - Found 15 sources (Quality: 85%)</div>
                                </div>
                            </div>
                            <div class="timeline-item">
                                <div class="timeline-content">
                                    <div class="timeline-time">1 day ago</div>
                                    <div><strong>Climate Change</strong> - Found 23 sources (Quality: 92%)</div>
                                </div>
                            </div>
                            <div class="timeline-item">
                                <div class="timeline-content">
                                    <div class="timeline-time">3 days ago</div>
                                    <div><strong>Cryptocurrency</strong> - Found 8 sources (Quality: 78%)</div>
                                </div>
                            </div>
                        </div>
                    `;
                } catch (error) {
                    console.error('Failed to load research history:', error);
                    document.getElementById('research-history').innerHTML = '<p>Failed to load history</p>';
                }
            }
        }

        // Initialize topic researcher interface when page loads
        document.addEventListener('DOMContentLoaded', () => {
            new TopicResearcherInterface();
        });
    </script>
</body>
</html>`;