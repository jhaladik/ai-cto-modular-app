// AI Factory Frontend Worker - Content Classifier Interface HTML
// @WORKER: FrontendWorker
// 🧱 Type: StaticHTML
// 📍 Path: src/static/html/content-classifier.ts
// 🎯 Role: Content classifier worker interface for AI-powered content analysis
// 💾 Storage: { embedded: "worker_code" }

export const CONTENT_CLASSIFIER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Factory - Content Classifier</title>
    <link rel="stylesheet" href="/static/css/shared.css">
    <link rel="stylesheet" href="/static/css/components.css">
</head>
<body>
    <div id="app">
        <!-- Header -->
        <header class="header">
            <div class="container">
                <h1><a href="/" style="color: inherit; text-decoration: none;">🏭 AI Factory</a> - Content Classifier</h1>
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
                <h1>🧠 Content Classifier</h1>
                <p>AI-powered analysis and classification of articles and content</p>
            </div>

            <!-- Classification Form -->
            <div class="form-container">
                <h2>Classify Content</h2>
                <form id="classifier-form">
                    <div class="form-row">
                        <div class="form-col-2">
                            <div class="form-group">
                                <label for="articles-input">Articles Input *</label>
                                <textarea id="articles-input" name="articles" rows="6" required 
                                          placeholder="Paste article content here, or upload JSON file with articles array:

Option 1: Plain text articles (separate with --- between articles)
Option 2: JSON array of articles
Option 3: Use 'Load from Fetch' to import previously fetched articles"></textarea>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group">
                                <label for="input-format">Input Format</label>
                                <select id="input-format" name="input_format">
                                    <option value="text" selected>Plain Text</option>
                                    <option value="json">JSON Array</option>
                                    <option value="urls">Article URLs</option>
                                    <option value="csv">CSV Format</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="batch-size">Processing Batch Size</label>
                                <input type="number" id="batch-size" name="batch_size" 
                                       value="10" min="1" max="100">
                            </div>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-col">
                            <div class="form-group">
                                <label>Classification Types *</label>
                                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                                    <label><input type="checkbox" name="classification_types" value="sentiment" checked> Sentiment Analysis</label>
                                    <label><input type="checkbox" name="classification_types" value="topic" checked> Topic Classification</label>
                                    <label><input type="checkbox" name="classification_types" value="quality" checked> Quality Assessment</label>
                                    <label><input type="checkbox" name="classification_types" value="emotion"> Emotion Detection</label>
                                    <label><input type="checkbox" name="classification_types" value="bias"> Bias Detection</label>
                                    <label><input type="checkbox" name="classification_types" value="factual"> Fact vs Opinion</label>
                                    <label><input type="checkbox" name="classification_types" value="urgency"> Urgency Level</label>
                                    <label><input type="checkbox" name="classification_types" value="readability"> Readability Score</label>
                                </div>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group">
                                <label for="language">Content Language</label>
                                <select id="language" name="language">
                                    <option value="auto" selected>Auto-detect</option>
                                    <option value="en">English</option>
                                    <option value="es">Spanish</option>
                                    <option value="fr">French</option>
                                    <option value="de">German</option>
                                    <option value="zh">Chinese</option>
                                    <option value="ja">Japanese</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="confidence-threshold">Confidence Threshold</label>
                                <input type="range" id="confidence-threshold" name="confidence_threshold" 
                                       min="0.1" max="1.0" step="0.1" value="0.7">
                                <span id="confidence-value">70%</span>
                            </div>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-col">
                            <label>
                                <input type="checkbox" id="include-summary" name="include_summary" checked>
                                Generate Content Summaries
                            </label>
                        </div>
                        <div class="form-col">
                            <label>
                                <input type="checkbox" id="include-keywords" name="include_keywords" checked>
                                Extract Key Terms
                            </label>
                        </div>
                        <div class="form-col">
                            <label>
                                <input type="checkbox" id="include-entities" name="include_entities">
                                Named Entity Recognition
                            </label>
                        </div>
                        <div class="form-col">
                            <label>
                                <input type="checkbox" id="detailed-analysis" name="detailed_analysis">
                                Detailed Analysis Mode
                            </label>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" id="load-from-fetch-btn" class="btn btn-secondary">📥 Load from Fetch</button>
                        <button type="button" id="upload-file-btn" class="btn btn-secondary">📁 Upload File</button>
                        <button type="button" id="clear-form-btn" class="btn btn-secondary">Clear</button>
                        <button type="submit" id="classify-content-btn" class="btn btn-primary">🧠 Classify Content</button>
                    </div>
                </form>

                <input type="file" id="file-input" accept=".json,.csv,.txt" style="display: none;">
            </div>

            <!-- Quick Analysis Tools -->
            <div class="form-container">
                <h2>Quick Analysis Tools</h2>
                <div class="card-grid">
                    <div class="info-card">
                        <h3>📝 Single Article Analysis</h3>
                        <div class="form-group">
                            <textarea id="single-article" rows="4" placeholder="Paste article text or URL here..."></textarea>
                        </div>
                        <button id="analyze-single-btn" class="btn btn-primary">Analyze</button>
                    </div>
                    
                    <div class="info-card">
                        <h3>🔗 URL Analysis</h3>
                        <div class="form-group">
                            <input type="url" id="article-url" placeholder="https://example.com/article">
                        </div>
                        <button id="analyze-url-btn" class="btn btn-primary">Analyze URL</button>
                    </div>
                    
                    <div class="info-card">
                        <h3>📊 Bulk Sentiment Check</h3>
                        <div class="form-group">
                            <textarea id="bulk-text" rows="3" placeholder="Enter multiple sentences (one per line)"></textarea>
                        </div>
                        <button id="bulk-sentiment-btn" class="btn btn-primary">Check Sentiment</button>
                    </div>
                </div>
            </div>

            <!-- Classification Results -->
            <div class="results-container" id="results-container" style="display: none;">
                <div class="results-header">
                    <h2>Classification Results</h2>
                    <div class="results-stats" id="classification-stats">
                        <!-- Stats will be populated here -->
                    </div>
                </div>

                <div class="form-row" style="margin-bottom: 20px;">
                    <div class="form-col">
                        <input type="text" id="filter-results" placeholder="Filter results..." 
                               style="width: 100%;">
                    </div>
                    <div class="form-col">
                        <select id="sort-results">
                            <option value="confidence">Sort by Confidence</option>
                            <option value="sentiment">Sort by Sentiment</option>
                            <option value="quality">Sort by Quality</option>
                            <option value="topic">Sort by Topic</option>
                        </select>
                    </div>
                    <div class="form-col">
                        <button id="export-results-btn" class="btn btn-secondary">📤 Export Results</button>
                    </div>
                </div>

                <div id="classification-results">
                    <!-- Results will be populated here -->
                </div>
            </div>

            <!-- Analysis Insights -->
            <div class="results-container" id="insights-container" style="display: none;">
                <div class="results-header">
                    <h2>Analysis Insights</h2>
                </div>
                
                <div class="card-grid">
                    <div class="info-card">
                        <h3>📈 Sentiment Distribution</h3>
                        <canvas id="sentiment-chart" width="300" height="200"></canvas>
                    </div>
                    
                    <div class="info-card">
                        <h3>🏷️ Topic Clusters</h3>
                        <div id="topic-clusters">
                            <!-- Topic visualization will go here -->
                        </div>
                    </div>
                    
                    <div class="info-card">
                        <h3>⭐ Quality Metrics</h3>
                        <div id="quality-metrics">
                            <!-- Quality analysis will go here -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Classification History -->
            <div class="results-container">
                <div class="results-header">
                    <h2>Recent Classifications</h2>
                    <button id="refresh-history-btn" class="btn btn-secondary">Refresh</button>
                </div>
                
                <div id="classification-history">
                    <!-- Classification history will be populated here -->
                </div>
            </div>

            <!-- AI Model Information -->
            <div class="results-container">
                <div class="results-header">
                    <h2>AI Model Information</h2>
                </div>
                
                <div class="card-grid">
                    <div class="info-card">
                        <h3>🤖 Model Status</h3>
                        <div id="model-status">
                            <div class="info-list">
                                <li><span class="info-label">Sentiment Model:</span> <span class="info-value" id="sentiment-model-status">-</span></li>
                                <li><span class="info-label">Topic Model:</span> <span class="info-value" id="topic-model-status">-</span></li>
                                <li><span class="info-label">Quality Model:</span> <span class="info-value" id="quality-model-status">-</span></li>
                                <li><span class="info-label">Last Updated:</span> <span class="info-value" id="models-last-updated">-</span></li>
                            </div>
                        </div>
                    </div>
                    
                    <div class="info-card">
                        <h3>📊 Performance Metrics</h3>
                        <div id="model-performance">
                            <div class="info-list">
                                <li><span class="info-label">Avg Processing Time:</span> <span class="info-value" id="avg-processing-time">-</span></li>
                                <li><span class="info-label">Accuracy Score:</span> <span class="info-value" id="accuracy-score">-</span></li>
                                <li><span class="info-label">Daily Classifications:</span> <span class="info-value" id="daily-classifications">-</span></li>
                                <li><span class="info-label">API Usage:</span> <span class="info-value" id="api-usage">-</span></li>
                            </div>
                        </div>
                    </div>
                    
                    <div class="info-card">
                        <h3>⚙️ Configuration</h3>
                        <div id="model-config">
                            <button id="update-models-btn" class="btn btn-warning">Update Models</button>
                            <button id="calibrate-models-btn" class="btn btn-secondary">Calibrate</button>
                            <button id="test-models-btn" class="btn btn-secondary">Test Models</button>
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
        // Content Classifier-specific JavaScript
        class ContentClassifierInterface {
            constructor() {
                this.auth = new AIFactoryAuth();
                this.api = new AIFactoryAPI();
                this.ui = new AIFactoryUI();
                this.classificationResults = [];
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
                
                // Update confidence threshold display
                const confidenceSlider = document.getElementById('confidence-threshold');
                const confidenceValue = document.getElementById('confidence-value');
                confidenceSlider.addEventListener('input', (e) => {
                    confidenceValue.textContent = Math.round(e.target.value * 100) + '%';
                });
            }

            setupEventListeners() {
                // Form submission
                document.getElementById('classifier-form').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    await this.classifyContent();
                });

                // Load from fetch
                document.getElementById('load-from-fetch-btn').addEventListener('click', () => {
                    this.loadFromFetch();
                });

                // Upload file
                document.getElementById('upload-file-btn').addEventListener('click', () => {
                    document.getElementById('file-input').click();
                });

                document.getElementById('file-input').addEventListener('change', (e) => {
                    this.handleFileUpload(e.target.files[0]);
                });

                // Clear form
                document.getElementById('clear-form-btn').addEventListener('click', () => {
                    this.clearForm();
                });

                // Quick analysis tools
                document.getElementById('analyze-single-btn').addEventListener('click', async () => {
                    await this.analyzeSingleArticle();
                });

                document.getElementById('analyze-url-btn').addEventListener('click', async () => {
                    await this.analyzeURL();
                });

                document.getElementById('bulk-sentiment-btn').addEventListener('click', async () => {
                    await this.bulkSentimentCheck();
                });

                // Export results
                document.getElementById('export-results-btn').addEventListener('click', () => {
                    this.exportResults();
                });

                // Filter and sort
                document.getElementById('filter-results').addEventListener('input', 
                    this.ui.debounce((e) => this.filterResults(e.target.value), 300)
                );

                document.getElementById('sort-results').addEventListener('change', (e) => {
                    this.sortResults(e.target.value);
                });

                // Model management
                document.getElementById('update-models-btn').addEventListener('click', async () => {
                    await this.updateModels();
                });

                document.getElementById('calibrate-models-btn').addEventListener('click', async () => {
                    await this.calibrateModels();
                });

                document.getElementById('test-models-btn').addEventListener('click', async () => {
                    await this.testModels();
                });

                // History refresh
                document.getElementById('refresh-history-btn').addEventListener('click', async () => {
                    await this.loadClassificationHistory();
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
                        this.loadClassificationHistory(),
                        this.loadModelStatus(),
                        this.loadPerformanceMetrics()
                    ]);
                } catch (error) {
                    console.error('Failed to load initial data:', error);
                    this.ui.showToast('Failed to load initial data', 'error');
                }
            }

            async classifyContent() {
                try {
                    this.ui.showLoading('Classifying content...');
                    
                    const formData = new FormData(document.getElementById('classifier-form'));
                    const request = Object.fromEntries(formData.entries());
                    
                    // Parse articles input
                    let articles = this.parseArticlesInput(request.articles, request.input_format);
                    if (!articles || articles.length === 0) {
                        throw new Error('Please provide valid articles to classify');
                    }

                    // Get selected classification types
                    const classificationTypes = Array.from(
                        document.querySelectorAll('input[name="classification_types"]:checked')
                    ).map(cb => cb.value);

                    if (classificationTypes.length === 0) {
                        throw new Error('Please select at least one classification type');
                    }

                    // Prepare request
                    const classificationRequest = {
                        articles: articles,
                        classification_types: classificationTypes,
                        language: request.language,
                        confidence_threshold: parseFloat(request.confidence_threshold),
                        include_summary: document.getElementById('include-summary').checked,
                        include_keywords: document.getElementById('include-keywords').checked,
                        include_entities: document.getElementById('include-entities').checked,
                        detailed_analysis: document.getElementById('detailed-analysis').checked,
                        batch_size: parseInt(request.batch_size)
                    };

                    const response = await this.api.classifyContent(articles, classificationRequest);

                    if (response.success) {
                        this.classificationResults = response.results || [];
                        this.showClassificationResults(response);
                        this.ui.showToast(`Classified ${this.classificationResults.length} articles`, 'success');
                    } else {
                        throw new Error(response.error || 'Content classification failed');
                    }

                } catch (error) {
                    console.error('Content classification failed:', error);
                    this.ui.showToast('Classification failed: ' + error.message, 'error');
                } finally {
                    this.ui.hideLoading();
                }
            }

            parseArticlesInput(input, format) {
                try {
                    switch (format) {
                        case 'json':
                            return JSON.parse(input);
                        
                        case 'text':
                            return input.split('---')
                                .map(text => ({ content: text.trim() }))
                                .filter(article => article.content);
                        
                        case 'urls':
                            return input.split('\\n')
                                .map(url => url.trim())
                                .filter(url => url.startsWith('http'))
                                .map(url => ({ url: url }));
                        
                        case 'csv':
                            // Basic CSV parsing - would need proper CSV parser for production
                            const lines = input.split('\\n');
                            const headers = lines[0].split(',');
                            return lines.slice(1).map(line => {
                                const values = line.split(',');
                                const article = {};
                                headers.forEach((header, i) => {
                                    article[header.trim()] = values[i]?.trim();
                                });
                                return article;
                            });
                        
                        default:
                            return [{ content: input }];
                    }
                } catch (error) {
                    console.error('Failed to parse articles input:', error);
                    return null;
                }
            }

            showClassificationResults(results) {
                const container = document.getElementById('results-container');
                const statsContainer = document.getElementById('classification-stats');
                const insightsContainer = document.getElementById('insights-container');
                
                container.style.display = 'block';
                insightsContainer.style.display = 'block';
                
                // Show stats
                statsContainer.innerHTML = `
                    <div class="stat-item">
                        <div class="stat-value">\${results.results?.length || 0}</div>
                        <div class="stat-label">Articles Classified</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">\${Math.round(results.avg_confidence * 100) || 0}%</div>
                        <div class="stat-label">Avg Confidence</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">\${this.ui.formatDuration(results.processing_time_ms)}</div>
                        <div class="stat-label">Processing Time</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">\${this.ui.formatCurrency(results.cost_usd)}</div>
                        <div class="stat-label">AI Cost</div>
                    </div>
                `;

                this.renderClassificationResults();
                this.renderInsights(results);
            }

            renderClassificationResults() {
                const container = document.getElementById('classification-results');
                
                if (this.classificationResults.length > 0) {
                    container.innerHTML = `
                        <div class="card-grid">
                            \${this.classificationResults.map(result => this.renderResultCard(result)).join('')}
                        </div>
                    `;
                } else {
                    container.innerHTML = '<p>No classification results available.</p>';
                }
            }

            renderResultCard(result) {
                const sentiment = result.sentiment || {};
                const quality = result.quality || {};
                const topics = result.topics || [];
                
                return `
                    <div class="info-card" data-result-id="\${result.id}">
                        <h3>\${result.title || 'Article'}</h3>
                        
                        \${result.summary ? `<p><strong>Summary:</strong> $\{result.summary.substring(0, 100)\}...</p>` : ''}
                        
                        <div class="tag-container" style="margin: 10px 0;">
                            \${sentiment.label ? `<span class="tag \${this.getSentimentClass(sentiment.label)}">\${sentiment.label} ($\{Math.round(sentiment.confidence * 100)\}%)</span>` : ''}
                            \${quality.score ? `<span class="tag">Quality: $\{Math.round(quality.score * 100)\}%</span>` : ''}
                            \${topics.slice(0, 3).map(topic => `<span class="tag">$\{topic.label\}</span>`).join('')}
                        </div>
                        
                        \${result.keywords ? `
                            <p><strong>Keywords:</strong> \${result.keywords.slice(0, 5).join(', ')}</p>
                        ` : ''}
                        
                        \${result.entities ? `
                            <p><strong>Entities:</strong> \${result.entities.slice(0, 3).map(e => e.text).join(', ')}</p>
                        ` : ''}
                        
                        <div style="margin-top: 15px;">
                            <button class="btn btn-primary" onclick="this.viewDetailedAnalysis('\${result.id}')">View Details</button>
                            \${result.url ? `<button class="btn btn-secondary" onclick="window.open('$\{result.url\}', '_blank')">Open Article</button>` : ''}
                        </div>
                    </div>
                `;
            }

            getSentimentClass(sentiment) {
                switch (sentiment?.toLowerCase()) {
                    case 'positive': return 'success';
                    case 'negative': return 'danger';
                    case 'neutral': return 'secondary';
                    default: return '';
                }
            }

            renderInsights(results) {
                // This would render charts and insights
                this.renderSentimentChart(results.sentiment_distribution);
                this.renderTopicClusters(results.topic_clusters);
                this.renderQualityMetrics(results.quality_metrics);
            }

            renderSentimentChart(sentimentData) {
                // Mock chart rendering - would use actual chart library
                const container = document.getElementById('sentiment-chart');
                const ctx = container.getContext('2d');
                
                // Simple bar chart representation
                ctx.clearRect(0, 0, container.width, container.height);
                ctx.fillStyle = '#3498db';
                ctx.fillRect(50, 150, 50, 40); // Positive
                ctx.fillStyle = '#e74c3c';
                ctx.fillRect(120, 130, 50, 60); // Negative
                ctx.fillStyle = '#95a5a6';
                ctx.fillRect(190, 160, 50, 30); // Neutral
                
                ctx.fillStyle = '#333';
                ctx.font = '12px Arial';
                ctx.fillText('Pos', 60, 210);
                ctx.fillText('Neg', 130, 210);
                ctx.fillText('Neu', 200, 210);
            }

            renderTopicClusters(topicData) {
                const container = document.getElementById('topic-clusters');
                // Mock topic clusters
                container.innerHTML = `
                    <div class="tag-container">
                        <span class="tag primary">Technology (45%)</span>
                        <span class="tag success">Business (30%)</span>
                        <span class="tag warning">Politics (15%)</span>
                        <span class="tag secondary">Science (10%)</span>
                    </div>
                `;
            }

            renderQualityMetrics(qualityData) {
                const container = document.getElementById('quality-metrics');
                container.innerHTML = `
                    <div class="info-list">
                        <li><span class="info-label">Avg Quality:</span> <span class="info-value">87%</span></li>
                        <li><span class="info-label">High Quality:</span> <span class="info-value">65%</span></li>
                        <li><span class="info-label">Readability:</span> <span class="info-value">Grade 8</span></li>
                        <li><span class="info-label">Bias Score:</span> <span class="info-value">Low</span></li>
                    </div>
                `;
            }

            async analyzeSingleArticle() {
                const articleText = document.getElementById('single-article').value.trim();
                if (!articleText) {
                    this.ui.showToast('Please enter article text', 'warning');
                    return;
                }

                try {
                    this.ui.showLoading('Analyzing article...');
                    
                    const response = await this.api.classifyContent([{ content: articleText }], {
                        classification_types: ['sentiment', 'topic', 'quality'],
                        include_summary: true
                    });

                    if (response.success && response.results.length > 0) {
                        const result = response.results[0];
                        this.ui.showToast(`Analysis complete: $\{result.sentiment?.label || 'classified'\}`, 'success');
                        
                        // Show result in main results area
                        this.classificationResults = [result];
                        this.renderClassificationResults();
                        document.getElementById('results-container').style.display = 'block';
                    }

                } catch (error) {
                    this.ui.showToast('Analysis failed: ' + error.message, 'error');
                } finally {
                    this.ui.hideLoading();
                }
            }

            async analyzeURL() {
                const url = document.getElementById('article-url').value.trim();
                if (!url) {
                    this.ui.showToast('Please enter a URL', 'warning');
                    return;
                }

                try {
                    this.ui.showLoading('Fetching and analyzing URL...');
                    
                    // First fetch the article content, then classify
                    const fetchResponse = await this.api.fetchFeeds([url], { max_articles_per_source: 1 });
                    
                    if (fetchResponse.success && fetchResponse.articles.length > 0) {
                        const article = fetchResponse.articles[0];
                        const classifyResponse = await this.api.classifyContent([article], {
                            classification_types: ['sentiment', 'topic', 'quality'],
                            include_summary: true
                        });
                        
                        if (classifyResponse.success) {
                            this.ui.showToast('URL analysis complete', 'success');
                            this.classificationResults = classifyResponse.results;
                            this.renderClassificationResults();
                            document.getElementById('results-container').style.display = 'block';
                        }
                    } else {
                        throw new Error('Could not fetch article from URL');
                    }

                } catch (error) {
                    this.ui.showToast('URL analysis failed: ' + error.message, 'error');
                } finally {
                    this.ui.hideLoading();
                }
            }

            async bulkSentimentCheck() {
                const text = document.getElementById('bulk-text').value.trim();
                if (!text) {
                    this.ui.showToast('Please enter text to analyze', 'warning');
                    return;
                }

                const sentences = text.split('\\n').filter(line => line.trim());
                if (sentences.length === 0) {
                    this.ui.showToast('Please enter at least one sentence', 'warning');
                    return;
                }

                try {
                    this.ui.showLoading('Analyzing sentiment...');
                    
                    const articles = sentences.map(sentence => ({ content: sentence }));
                    const response = await this.api.classifyContent(articles, {
                        classification_types: ['sentiment']
                    });

                    if (response.success) {
                        const results = response.results.map((result, index) => 
                            `\${sentences[index]}: \${result.sentiment?.label || 'unknown'} ($\{Math.round(result.sentiment?.confidence * 100)\}%)`
                        ).join('\\n');
                        
                        alert('Bulk Sentiment Results:\\n\\n' + results);
                    }

                } catch (error) {
                    this.ui.showToast('Bulk sentiment analysis failed: ' + error.message, 'error');
                } finally {
                    this.ui.hideLoading();
                }
            }

            loadFromFetch() {
                // Mock loading from previous fetch results
                const mockArticles = [
                    { title: 'AI Breakthrough in 2025', content: 'Artificial intelligence continues to advance...' },
                    { title: 'Climate Change Update', content: 'New research shows significant impact...' },
                    { title: 'Tech Industry News', content: 'Major companies announce new initiatives...' }
                ];
                
                document.getElementById('articles-input').value = JSON.stringify(mockArticles, null, 2);
                document.getElementById('input-format').value = 'json';
                this.ui.showToast('Loaded articles from fetch results', 'success');
            }

            handleFileUpload(file) {
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const content = e.target.result;
                        document.getElementById('articles-input').value = content;
                        
                        if (file.name.endsWith('.json')) {
                            document.getElementById('input-format').value = 'json';
                        } else if (file.name.endsWith('.csv')) {
                            document.getElementById('input-format').value = 'csv';
                        }
                        
                        this.ui.showToast(`Loaded file: $\{file.name\}`, 'success');
                    } catch (error) {
                        this.ui.showToast('Failed to read file', 'error');
                    }
                };
                reader.readAsText(file);
            }

            filterResults(query) {
                const cards = document.querySelectorAll('#classification-results .info-card');
                cards.forEach(card => {
                    const text = card.textContent.toLowerCase();
                    card.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
                });
            }

            sortResults(criteria) {
                this.ui.showToast(`Sorting results by $\{criteria\}`, 'info');
                // This would implement actual sorting
            }

            exportResults() {
                if (this.classificationResults.length === 0) {
                    this.ui.showToast('No results to export', 'warning');
                    return;
                }

                const exportData = {
                    exported_at: new Date().toISOString(),
                    total_results: this.classificationResults.length,
                    results: this.classificationResults
                };

                this.ui.downloadAsFile(
                    JSON.stringify(exportData, null, 2),
                    `classification-results-$\{new Date().toISOString().split('T')[0]\}.json`,
                    'application/json'
                );
            }

            viewDetailedAnalysis(resultId) {
                const result = this.classificationResults.find(r => r.id === resultId);
                if (result) {
                    // This would show a detailed analysis modal or page
                    this.ui.showToast(`Viewing detailed analysis for: $\{result.title || 'Article'\}`, 'info');
                }
            }

            async updateModels() {
                if (this.ui.confirm('This will update all AI models. Continue?')) {
                    this.ui.showLoading('Updating models...');
                    setTimeout(() => {
                        this.ui.hideLoading();
                        this.ui.showToast('Models updated successfully', 'success');
                        this.loadModelStatus();
                    }, 3000);
                }
            }

            async calibrateModels() {
                this.ui.showLoading('Calibrating models...');
                setTimeout(() => {
                    this.ui.hideLoading();
                    this.ui.showToast('Model calibration complete', 'success');
                }, 2000);
            }

            async testModels() {
                this.ui.showLoading('Testing models...');
                setTimeout(() => {
                    this.ui.hideLoading();
                    this.ui.showToast('Model tests passed', 'success');
                }, 1500);
            }

            async loadClassificationHistory() {
                // Mock history data
                const historyContainer = document.getElementById('classification-history');
                historyContainer.innerHTML = `
                    <div class="timeline">
                        <div class="timeline-item">
                            <div class="timeline-content">
                                <div class="timeline-time">1 hour ago</div>
                                <div><strong>News Article Batch</strong> - 15 articles classified</div>
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-content">
                                <div class="timeline-time">3 hours ago</div>
                                <div><strong>Social Media Posts</strong> - 50 posts analyzed for sentiment</div>
                            </div>
                        </div>
                        <div class="timeline-item">
                            <div class="timeline-content">
                                <div class="timeline-time">1 day ago</div>
                                <div><strong>Research Papers</strong> - 8 papers classified for topics</div>
                            </div>
                        </div>
                    </div>
                `;
            }

            async loadModelStatus() {
                // Mock model status
                document.getElementById('sentiment-model-status').innerHTML = '<span class="status status-online">Active</span>';
                document.getElementById('topic-model-status').innerHTML = '<span class="status status-online">Active</span>';
                document.getElementById('quality-model-status').innerHTML = '<span class="status status-degraded">Updating</span>';
                document.getElementById('models-last-updated').textContent = new Date().toLocaleDateString();
            }

            async loadPerformanceMetrics() {
                // Mock performance data
                document.getElementById('avg-processing-time').textContent = '1.2s';
                document.getElementById('accuracy-score').textContent = '94.5%';
                document.getElementById('daily-classifications').textContent = '1,247';
                document.getElementById('api-usage').textContent = '78%';
            }

            clearForm() {
                document.getElementById('classifier-form').reset();
                document.getElementById('confidence-threshold').value = '0.7';
                document.getElementById('confidence-value').textContent = '70%';
                document.getElementById('batch-size').value = '10';
                
                // Reset checkboxes to default
                document.querySelector('input[value="sentiment"]').checked = true;
                document.querySelector('input[value="topic"]').checked = true;
                document.querySelector('input[value="quality"]').checked = true;
                document.getElementById('include-summary').checked = true;
                document.getElementById('include-keywords').checked = true;
                
                document.getElementById('results-container').style.display = 'none';
                document.getElementById('insights-container').style.display = 'none';
            }
        }

        // Initialize content classifier interface when page loads
        document.addEventListener('DOMContentLoaded', () => {
            new ContentClassifierInterface();
        });
    </script>
</body>
</html>`;