// Content Classifier UI - AI-Powered Content Analysis Interface
// Follows the established pattern from RSS Librarian and Feed Fetcher

class ContentClassifierUI {
    constructor() {
        this.authClient = window.authClient;
        this.apiClient = null;
        this.isAdmin = false;
        this.currentMode = 'single';
        this.currentJob = null;
        this.analysisResults = [];
        this.recentJobs = [];
        this.isProcessing = false;
        this.healthCheckInterval = null;
    }

    async init() {
        try {
            // Check authentication
            if (!this.authClient || !this.authClient.isAuthenticated()) {
                window.location.href = '/login.html';
                return;
            }

            this.apiClient = new APIClient(this.authClient);
            
            // Get user role
            const userInfo = localStorage.getItem('bitware-user-info');
            if (userInfo) {
                const user = JSON.parse(userInfo);
                this.isAdmin = user.role === 'admin';
                document.getElementById('user-display').textContent = `${user.username} (${user.role})`;
            }
            
            // Show/hide admin features
            if (this.isAdmin) {
                document.querySelectorAll('.admin-only').forEach(el => {
                    el.style.display = 'block';
                });
            }

            // Set up event listeners
            this.setupEventListeners();

            // Load initial data
            await this.loadInitialData();

            // Start health monitoring
            this.startHealthCheck();

            // Hide loading screen and show main content
            document.getElementById('loading-screen').style.display = 'none';
            document.getElementById('main-content').style.display = 'block';

            console.log('✅ Content Classifier UI initialized successfully');
            
        } catch (error) {
            console.error('❌ Error initializing Content Classifier UI:', error);
            this.showError('Failed to initialize Content Classifier interface');
        }
    }

    setupEventListeners() {
        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.authClient.logout();
        });

        // Analysis depth change handler for cost estimation
        ['analysis-depth', 'batch-depth'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', this.updateCostEstimate);
            }
        });

        // Auto-resize textareas
        const textareas = document.querySelectorAll('textarea');
        textareas.forEach(textarea => {
            textarea.addEventListener('input', this.autoResizeTextarea);
        });
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadCapabilities(),
                this.loadRecentJobs(),
                this.loadCostAnalytics(),
                this.checkHealth()
            ]);

            // Load admin stats if admin
            if (this.isAdmin) {
                await this.loadAdminStats();
            }
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load Content Classifier data');
        }
    }

    async loadCapabilities() {
        try {
            const response = await this.apiClient.callWorker('content-classifier', '/capabilities', 'GET');
            if (response.success && response.data) {
                console.log('Content Classifier capabilities:', response.data);
                // Update UI with capabilities info if needed
            }
        } catch (error) {
            console.error('Error loading capabilities:', error);
        }
    }

    async checkHealth() {
        try {
            const response = await this.apiClient.callWorker('content-classifier', '/health', 'GET');
            
            if (response.success && response.data) {
                const health = response.data;
                const isHealthy = health.status === 'healthy';
                
                const statusElement = document.getElementById('worker-status');
                statusElement.textContent = isHealthy ? 'Healthy' : 'Unhealthy';
                statusElement.className = `status-value ${isHealthy ? 'status-healthy' : 'status-error'}`;
                
                // Update additional metrics from health check
                if (health.total_jobs !== undefined) {
                    document.getElementById('jobs-today').textContent = health.total_jobs;
                }
            }
        } catch (error) {
            console.error('Error checking health:', error);
            const statusElement = document.getElementById('worker-status');
            statusElement.textContent = 'Error';
            statusElement.className = 'status-value status-error';
        }
    }

    async loadRecentJobs() {
        try {
            const response = await this.apiClient.callWorker('content-classifier', '/admin/jobs', 'GET');
            if (response.success && response.data) {
                this.recentJobs = response.data.jobs || [];
                this.updateJobsList();
            }
        } catch (error) {
            console.error('Error loading recent jobs:', error);
            // Show placeholder for non-admin users
            document.getElementById('jobs-list').innerHTML = 
                '<p class="text-muted">Recent jobs will appear here after analysis</p>';
        }
    }

    updateJobsList() {
        const jobsList = document.getElementById('jobs-list');
        
        if (this.recentJobs.length === 0) {
            jobsList.innerHTML = '<p class="text-muted">No recent analysis jobs</p>';
            return;
        }

        const jobsHtml = this.recentJobs.slice(0, 10).map(job => {
            const statusClass = job.status === 'completed' ? 'completed' : 
                              job.status === 'processing' ? 'processing' : 'failed';
            
            const costDisplay = job.processing_cost_usd ? 
                `$${parseFloat(job.processing_cost_usd).toFixed(4)}` : '-';
            
            const relevanceDisplay = job.avg_relevance_score ? 
                `${(job.avg_relevance_score * 100).toFixed(1)}%` : '-';
            
            return `
                <div class="job-item">
                    <div class="job-header">
                        <span class="job-status ${statusClass}">
                            ${job.status === 'completed' ? '✅' : job.status === 'processing' ? '🔄' : '❌'}
                            ${job.status}
                        </span>
                        <span class="job-time">${new Date(job.started_at).toLocaleTimeString()}</span>
                    </div>
                    <div class="job-details">
                        <strong>Topic:</strong> ${job.target_topic} | 
                        <strong>Articles:</strong> ${job.articles_processed}/${job.articles_submitted} | 
                        <strong>Relevance:</strong> ${relevanceDisplay} | 
                        <strong>Cost:</strong> ${costDisplay}
                    </div>
                    ${job.status === 'failed' && job.error_message ? 
                        `<div class="job-error">${job.error_message}</div>` : ''}
                </div>
            `;
        }).join('');
        
        jobsList.innerHTML = jobsHtml;
    }

    async loadCostAnalytics() {
        try {
            const response = await this.apiClient.callWorker('content-classifier', '/admin/costs', 'GET');
            if (response.success && response.data) {
                const costs = response.data;
                
                // Update cost metrics
                if (costs.totals) {
                    document.getElementById('total-cost').textContent = 
                        costs.totals.total_cost ? `$${parseFloat(costs.totals.total_cost).toFixed(4)}` : '$0.00';
                    
                    document.getElementById('avg-cost-per-article').textContent = 
                        costs.totals.avg_cost_per_article ? `$${parseFloat(costs.totals.avg_cost_per_article).toFixed(4)}` : '$0.00';
                    
                    document.getElementById('total-tokens').textContent = 
                        costs.totals.total_articles || '0';
                }

                // Calculate today's costs
                if (costs.daily_breakdown && costs.daily_breakdown.length > 0) {
                    const today = costs.daily_breakdown[0];
                    document.getElementById('cost-today').textContent = 
                        today.daily_cost ? `$${parseFloat(today.daily_cost).toFixed(4)}` : '$0.00';
                    
                    document.getElementById('articles-processed').textContent = 
                        today.articles_processed || '0';
                }
            }
        } catch (error) {
            console.error('Error loading cost analytics:', error);
        }
    }

    // Analysis Console Methods
    switchMode(mode) {
        this.currentMode = mode;
        
        // Update tab states
        document.getElementById('single-tab').classList.toggle('active', mode === 'single');
        document.getElementById('batch-tab').classList.toggle('active', mode === 'batch');
        document.getElementById('topic-tab').classList.toggle('active', mode === 'topic');
        
        // Update content visibility
        document.getElementById('single-mode').classList.toggle('active', mode === 'single');
        document.getElementById('batch-mode').classList.toggle('active', mode === 'batch');
        document.getElementById('topic-mode').classList.toggle('active', mode === 'topic');
    }

    async analyzeSingle() {
        if (this.isProcessing) return;
        
        const articleUrl = document.getElementById('article-url').value.trim();
        const articleContent = document.getElementById('article-content').value.trim();
        const targetTopic = document.getElementById('target-topic').value.trim();
        const analysisDepth = document.getElementById('analysis-depth').value;
        const minConfidence = parseFloat(document.getElementById('min-confidence').value);
        
        if (!targetTopic) {
            this.showError('Please enter a target topic');
            return;
        }

        if (!articleUrl && !articleContent) {
            this.showError('Please provide either an article URL or content');
            return;
        }

        // Validate URL if provided
        if (articleUrl) {
            try {
                new URL(articleUrl);
            } catch (e) {
                this.showError('Please enter a valid URL');
                return;
            }
        }
        
        this.isProcessing = true;
        const analyzeBtn = document.getElementById('single-analyze-btn');
        const originalText = analyzeBtn.innerHTML;
        analyzeBtn.innerHTML = '🔄 Analyzing...';
        analyzeBtn.disabled = true;
        
        const startTime = performance.now();
        
        try {
            console.log(`🧠 Analyzing single article: ${targetTopic}`);
            
            // Create article object
            const article = {
                article_url: articleUrl || 'manual-input',
                title: 'Manual Input Article',
                content: articleContent || '',
                author: '',
                pub_date: new Date().toISOString(),
                source_feed: 'manual',
                word_count: (articleContent || '').split(' ').length
            };
            
            const response = await this.apiClient.callWorker('content-classifier', '/analyze/single', 'POST', {
                article: article,  // Single article object (not array)
                target_topic: targetTopic,
                analysis_depth: analysisDepth,
                include_summary: true
            });
            
            const endTime = performance.now();
            const duration = Math.round(endTime - startTime);
            
            if (response.success && response.data) {
                const result = response.data;
                this.showSuccess(`Analysis completed in ${duration}ms - Cost: ${result.estimated_cost_usd?.toFixed(4) || '0.00'}`);
                
                // Update current results - handle single result format
                if (result.analysis_result) {
                    this.analysisResults = [result.analysis_result]; // Convert single result to array
                    // Create a mock analysis data object for display
                    const mockAnalysisData = {
                        articles_processed: 1,
                        articles_submitted: 1,
                        avg_relevance_score: result.analysis_result.relevance_score || 0,
                        estimated_cost_usd: result.estimated_cost_usd || 0,
                        analysis_results: [result.analysis_result]
                    };
                    this.displayResults(mockAnalysisData);
                } else if (result.analysis_results) {
                    // Handle array format (fallback)
                    this.analysisResults = result.analysis_results || [];
                    this.displayResults(result);
                }
                
                // Refresh jobs and metrics
                await this.loadRecentJobs();
                await this.loadCostAnalytics();
                
            } else {
                throw new Error(response.error || 'Analysis failed');
            }
            
        } catch (error) {
            console.error('❌ Single analysis failed:', error);
            this.showError(`Analysis failed: ${error.message}`);
        } finally {
            this.isProcessing = false;
            analyzeBtn.innerHTML = originalText;
            analyzeBtn.disabled = false;
        }
    }

    async analyzeBatch() {
        if (this.isProcessing) return;
        
        const batchText = document.getElementById('batch-articles').value.trim();
        const targetTopic = document.getElementById('batch-topic').value.trim();
        const analysisDepth = document.getElementById('batch-depth').value;
        
        if (!batchText || !targetTopic) {
            this.showError('Please enter both article URLs and target topic');
            return;
        }

        // Parse URLs from text
        const urls = batchText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        if (urls.length === 0) {
            this.showError('Please enter at least one article URL');
            return;
        }

        if (urls.length > 20) {
            this.showError('Maximum 20 articles allowed per batch');
            return;
        }

        // Validate URLs
        const invalidUrls = [];
        urls.forEach(url => {
            try {
                new URL(url);
            } catch (e) {
                invalidUrls.push(url);
            }
        });

        if (invalidUrls.length > 0) {
            this.showError(`Invalid URLs found: ${invalidUrls.slice(0, 3).join(', ')}`);
            return;
        }
        
        this.isProcessing = true;
        const analyzeBtn = document.getElementById('batch-analyze-btn');
        const originalText = analyzeBtn.innerHTML;
        analyzeBtn.innerHTML = '🔄 Processing...';
        analyzeBtn.disabled = true;
        
        // Show progress bar
        const progressContainer = document.getElementById('batch-progress');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        progressContainer.style.display = 'block';
        progressFill.style.width = '0%';
        progressText.textContent = `Processing ${urls.length} articles...`;
        
        const startTime = performance.now();
        
        try {
            console.log(`🧠 Analyzing batch: ${urls.length} articles for topic "${targetTopic}"`);
            
            // Create article objects from URLs
            const articles = urls.map((url, index) => ({
                article_url: url,
                title: `Article ${index + 1}`,
                content: '',
                author: '',
                pub_date: new Date().toISOString(),
                source_feed: 'batch-input',
                word_count: 0
            }));
            
            // Simulate progress updates (in real implementation, this could be WebSocket updates)
            const progressInterval = setInterval(() => {
                const currentWidth = parseInt(progressFill.style.width) || 0;
                if (currentWidth < 90) {
                    progressFill.style.width = `${currentWidth + 10}%`;
                }
            }, 1000);
            
            const response = await this.apiClient.callWorker('content-classifier', '/analyze/batch', 'POST', {
                articles: articles,
                target_topic: targetTopic,
                analysis_depth: analysisDepth,
                include_summary: true,
                batch_process: true,
                min_confidence: 0.5
            });
            
            clearInterval(progressInterval);
            progressFill.style.width = '100%';
            
            const endTime = performance.now();
            const duration = Math.round(endTime - startTime);
            
            if (response.success && response.data) {
                const result = response.data;
                this.showSuccess(`Batch analysis completed in ${duration}ms - Processed: ${result.articles_processed}/${result.articles_submitted} - Cost: $${result.estimated_cost_usd?.toFixed(4) || '0.00'}`);
                
                // Update current results
                this.analysisResults = result.analysis_results || [];
                this.displayResults(result);
                
                // Refresh jobs and metrics
                await this.loadRecentJobs();
                await this.loadCostAnalytics();
                
            } else {
                throw new Error(response.error || 'Batch analysis failed');
            }
            
        } catch (error) {
            console.error('❌ Batch analysis failed:', error);
            this.showError(`Batch analysis failed: ${error.message}`);
        } finally {
            this.isProcessing = false;
            analyzeBtn.innerHTML = originalText;
            analyzeBtn.disabled = false;
            progressContainer.style.display = 'none';
        }
    }

    async analyzeTopics() {
        if (this.isProcessing) return;
        
        const topicText = document.getElementById('topic-articles').value.trim();
        const topicCount = parseInt(document.getElementById('topic-count').value);
        
        if (!topicText) {
            this.showError('Please enter articles for topic analysis');
            return;
        }
        
        this.showError('Topic analysis feature coming soon!');
        // TODO: Implement topic discovery analysis
    }

    displayResults(analysisData) {
        const container = document.getElementById('results-container');
        
        if (!analysisData.analysis_results || analysisData.analysis_results.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No results met the confidence threshold.</p>
                    <p>Try lowering the minimum confidence or adjusting your topic.</p>
                </div>
            `;
            return;
        }

        const results = analysisData.analysis_results;
        
        // Create results summary
        const summaryHtml = `
            <div class="results-summary">
                <div class="summary-stats">
                    <span class="stat">
                        <strong>Articles:</strong> ${analysisData.articles_processed}/${analysisData.articles_submitted}
                    </span>
                    <span class="stat">
                        <strong>Avg Relevance:</strong> ${(analysisData.avg_relevance_score * 100).toFixed(1)}%
                    </span>
                    <span class="stat">
                        <strong>Cost:</strong> $${analysisData.estimated_cost_usd?.toFixed(4) || '0.00'}
                    </span>
                </div>
            </div>
        `;

        // Create results table
        const tableHtml = `
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Article</th>
                        <th>Relevance</th>
                        <th>Confidence</th>
                        <th>Sentiment</th>
                        <th>Topics</th>
                        <th>Summary</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map(result => this.createResultRow(result)).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = summaryHtml + tableHtml;
    }

    createResultRow(result) {
        const relevanceScore = result.relevance_score;
        const confidenceScore = result.confidence_score;
        const sentimentScore = result.sentiment_score;
        
        // Relevance score display
        const relevanceClass = relevanceScore >= 0.8 ? 'score-high' : 
                              relevanceScore >= 0.6 ? 'score-medium' : 'score-low';
        const relevancePercent = (relevanceScore * 100).toFixed(1);
        
        // Confidence score display
        const confidencePercent = (confidenceScore * 100).toFixed(1);
        
        // Sentiment display
        const sentimentClass = sentimentScore > 0.1 ? 'sentiment-positive' : 
                              sentimentScore < -0.1 ? 'sentiment-negative' : 'sentiment-neutral';
        const sentimentText = sentimentScore > 0.1 ? 'Positive' : 
                             sentimentScore < -0.1 ? 'Negative' : 'Neutral';
        
        // Topics display
        const topicsHtml = (result.detected_topics || []).slice(0, 3).map(topic => 
            `<span class="topic-tag">${topic}</span>`
        ).join('');
        
        // Article title/URL
        const articleTitle = result.article_url === 'manual-input' ? 'Manual Input' : 
                            new URL(result.article_url).hostname;
        
        return `
            <tr>
                <td>
                    <div class="article-info">
                        <div class="article-title">${articleTitle}</div>
                        ${result.article_url !== 'manual-input' ? 
                            `<div class="article-url"><a href="${result.article_url}" target="_blank">View</a></div>` : ''}
                    </div>
                </td>
                <td>
                    <div class="relevance-score">
                        <span>${relevancePercent}%</span>
                        <div class="score-bar">
                            <div class="score-fill ${relevanceClass}" style="width: ${relevancePercent}%"></div>
                        </div>
                    </div>
                </td>
                <td>${confidencePercent}%</td>
                <td>
                    <span class="sentiment-indicator ${sentimentClass}"></span>
                    ${sentimentText}
                </td>
                <td>
                    <div class="topics-list">
                        ${topicsHtml}
                    </div>
                </td>
                <td>
                    <div class="summary-text" title="${result.summary || ''}">${
                        (result.summary || '').substring(0, 100) + 
                        (result.summary && result.summary.length > 100 ? '...' : '')
                    }</div>
                </td>
            </tr>
        `;
    }

    // Utility Methods
    showError(message) {
        console.error('Error:', message);
        // Create a simple toast notification
        const toast = document.createElement('div');
        toast.className = 'toast toast-error';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            z-index: 9999;
            max-width: 400px;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 5000);
    }

    showSuccess(message) {
        console.log('Success:', message);
        // Create a simple toast notification
        const toast = document.createElement('div');
        toast.className = 'toast toast-success';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            z-index: 9999;
            max-width: 400px;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 3000);
    }

    updateCostEstimate() {
        // TODO: Implement real-time cost estimation based on depth and article count
    }

    autoResizeTextarea(event) {
        const textarea = event.target;
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    clearAnalysis() {
        // Clear all form inputs
        document.getElementById('article-url').value = '';
        document.getElementById('article-content').value = '';
        document.getElementById('target-topic').value = '';
        document.getElementById('batch-articles').value = '';
        document.getElementById('batch-topic').value = '';
        document.getElementById('topic-articles').value = '';
        
        // Clear results
        this.clearResults();
    }

    clearResults() {
        this.analysisResults = [];
        document.getElementById('results-container').innerHTML = `
            <div class="empty-state">
                <p>🎯 Run an analysis to see results here</p>
            </div>
        `;
    }

    exportResults() {
        if (this.analysisResults.length === 0) {
            this.showError('No results to export');
            return;
        }

        const dataStr = JSON.stringify(this.analysisResults, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `content_analysis_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showSuccess('Results exported successfully');
    }

    async refreshJobs() {
        await this.loadRecentJobs();
        this.showSuccess('Jobs refreshed');
    }

    async refreshCosts() {
        await this.loadCostAnalytics();
        this.showSuccess('Cost analytics refreshed');
    }

    // Admin Methods
    async loadAdminStats() {
        try {
            const response = await this.apiClient.callWorker('content-classifier', '/admin/stats', 'GET');
            if (response.success && response.data) {
                console.log('Admin stats loaded:', response.data);
                // TODO: Display admin-specific metrics
            }
        } catch (error) {
            console.error('Error loading admin stats:', error);
        }
    }

    async viewAdminStats() {
        // TODO: Show admin stats modal
        this.showError('Admin stats modal coming soon!');
    }

    async cancelAllJobs() {
        // TODO: Implement job cancellation
        this.showError('Job cancellation feature coming soon!');
    }

    async viewCostBreakdown() {
        // TODO: Show detailed cost breakdown modal
        this.showError('Cost breakdown modal coming soon!');
    }

    async exportCostReport() {
        // TODO: Export cost report
        this.showError('Cost report export coming soon!');
    }

    // Health monitoring
    startHealthCheck() {
        // Check health every 30 seconds
        this.healthCheckInterval = setInterval(() => {
            this.checkHealth();
        }, 30000);
    }

    stopHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }

    // Cleanup
    destroy() {
        this.stopHealthCheck();
    }
}

// Export for use in HTML
window.ContentClassifierUI = ContentClassifierUI;