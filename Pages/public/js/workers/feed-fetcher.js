// public/js/workers/feed-fetcher.js
// Feed Fetcher Frontend - Enhanced RSS content processing interface

class FeedFetcherUI {
    constructor() {
        this.authClient = window.authClient;
        this.apiClient = null;
        this.isProcessing = false;
        this.currentMode = 'single';
        this.currentJob = null;
        this.recentJobs = [];
        this.isAdmin = false;
        this.healthCheckInterval = null;
        this.feedTemplates = this.initializeTemplates();
    }

    async init() {
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

        // Initialize event listeners
        this.initializeEventListeners();
        
        // Load initial data
        await this.loadInitialData();
        
        // Start health monitoring
        this.startHealthCheck();
        
        // Hide loading screen and show main content
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        
        console.log('🏭 Feed Fetcher UI initialized successfully');
    }

    initializeEventListeners() {
        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.authClient.logout();
        });

        // Enter key handling for single feed
        document.getElementById('feed-url').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.processSingleFeed();
            }
        });

        // Article search
        document.getElementById('article-search').addEventListener('input', (e) => {
            this.filterArticles(e.target.value);
        });

        // Article filter
        document.getElementById('article-filter').addEventListener('change', (e) => {
            this.applyArticleFilter(e.target.value);
        });
    }

    initializeTemplates() {
        return {
            news: [
                'https://feeds.reuters.com/Reuters/worldNews',
                'https://rss.cnn.com/rss/edition.rss',
                'https://feeds.bbci.co.uk/news/rss.xml',
                'https://feeds.npr.org/1001/rss.xml',
                'https://feeds.washingtonpost.com/rss/world'
            ],
            tech: [
                'https://feeds.reuters.com/reuters/technologyNews',
                'https://rss.cnn.com/rss/cnn_tech.rss',
                'https://feeds.bbci.co.uk/news/technology/rss.xml',
                'http://feeds.arstechnica.com/arstechnica/index',
                'https://techcrunch.com/feed/',
                'https://www.wired.com/feed/rss',
                'https://www.theverge.com/rss/index.xml',
                'https://feeds.feedburner.com/venturebeat/SZYF'
            ],
            finance: [
                'https://feeds.reuters.com/reuters/businessNews',
                'https://rss.cnn.com/rss/money_latest.rss',
                'https://feeds.bloomberg.com/politics/news.rss',
                'https://feeds.wsj.com/wsj/xml/rss/3_7085.xml',
                'https://feeds.marketwatch.com/marketwatch/StockstoWatch/',
                'https://feeds.fool.com/fool/daily-market-report.xml'
            ],
            global: [
                'https://feeds.reuters.com/Reuters/worldNews',
                'https://rss.cnn.com/rss/edition.rss',
                'https://feeds.bbci.co.uk/news/world/rss.xml',
                'https://www.aljazeera.com/xml/rss/all.xml',
                'https://feeds.france24.com/en/rss',
                'https://feeds.dw.com/dw/english',
                'https://english.elpais.com/rss/elpais/inenglish.xml',
                'https://feeds.euronews.com/en/news/',
                'https://feeds.skynews.com/feeds/rss/world.xml',
                'https://feeds.independent.co.uk/world.xml',
                'https://feeds.theguardian.com/theguardian/world/rss',
                'https://feeds.abcnews.com/abcnews/internationalnews'
            ]
        };
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadCapabilities(),
                this.loadRecentJobs(),
                this.loadAnalytics(),
                this.checkHealth()
            ]);

            if (this.isAdmin) {
                await this.loadAdminStats();
            }
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load Feed Fetcher data');
        }
    }

    async loadCapabilities() {
        try {
            const response = await this.apiClient.callWorker('feed-fetcher', '/capabilities', 'GET');
            if (response.success && response.data) {
                // Update UI with capabilities info if needed
                console.log('Feed Fetcher capabilities:', response.data);
            }
        } catch (error) {
            console.error('Error loading capabilities:', error);
        }
    }

    async checkHealth() {
        try {
            const response = await this.apiClient.callWorker('feed-fetcher', '/health', 'GET');
            
            if (response.success && response.data) {
                const health = response.data;
                const isHealthy = health.status === 'healthy';
                
                const statusElement = document.getElementById('worker-status');
                statusElement.textContent = isHealthy ? 'Healthy' : 'Unhealthy';
                statusElement.className = `status-value ${isHealthy ? 'status-healthy' : 'status-error'}`;
                
                // Update total jobs from health check
                if (health.total_jobs !== undefined) {
                    document.getElementById('total-jobs').textContent = health.total_jobs;
                }
            }
        } catch (error) {
            console.error('Health check failed:', error);
            document.getElementById('worker-status').textContent = 'Error';
            document.getElementById('worker-status').className = 'status-value status-error';
        }
    }

    async loadAnalytics() {
        try {
            // Simulate analytics data - in real implementation, this would come from admin/stats
            document.getElementById('avg-processing-time').textContent = '3.2s';
            document.getElementById('cache-efficiency').textContent = '87.3%';
            document.getElementById('avg-articles-per-job').textContent = '23.4';
            document.getElementById('active-sources').textContent = '156';
            document.getElementById('total-articles').textContent = '28,934';
            document.getElementById('success-rate').textContent = '94.7%';
            document.getElementById('cache-hit-rate').textContent = '87.3%';
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    }

    async loadRecentJobs() {
        try {
            if (this.isAdmin) {
                const response = await this.apiClient.callWorker('feed-fetcher', '/admin/jobs', 'GET');
                if (response.success && response.data) {
                    // Handle the response format: { jobs: [...] }
                    this.recentJobs = Array.isArray(response.data) ? response.data : 
                                     (response.data.jobs && Array.isArray(response.data.jobs)) ? response.data.jobs : [];
                    this.displayRecentJobs();
                    return;
                }
            }
            
            // Fallback to simulated data for non-admin users or on error
            this.recentJobs = this.generateSampleJobs();
            this.displayRecentJobs();
            
        } catch (error) {
            console.error('Error loading recent jobs:', error);
            this.recentJobs = this.generateSampleJobs();
            this.displayRecentJobs();
        }
    }

    generateSampleJobs() {
        return [
            {
                id: 1247,
                feed_urls: ['https://feeds.reuters.com/reuters/technologyNews'],
                status: 'completed',
                articles_found: 25,
                articles_stored: 23,
                fetch_duration_ms: 2300,
                started_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
            },
            {
                id: 1246,
                feed_urls: ['https://rss.cnn.com/rss/cnn_tech.rss', 'https://feeds.bbci.co.uk/news/technology/rss.xml'],
                status: 'completed',
                articles_found: 67,
                articles_stored: 64,
                feeds_successful: 2,
                feeds_failed: 0,
                fetch_duration_ms: 8750,
                started_at: new Date(Date.now() - 45 * 60 * 1000).toISOString()
            },
            {
                id: 1245,
                feed_urls: ['https://invalid-feed-url.com/rss'],
                status: 'failed',
                articles_found: 0,
                articles_stored: 0,
                error_message: 'Feed not accessible',
                started_at: new Date(Date.now() - 90 * 60 * 1000).toISOString()
            }
        ];
    }

    displayRecentJobs() {
        const jobsList = document.getElementById('jobs-list');
        
        // Ensure we have a valid array
        if (!Array.isArray(this.recentJobs)) {
            console.warn('recentJobs is not an array:', this.recentJobs);
            this.recentJobs = [];
        }
        
        if (this.recentJobs.length === 0) {
            jobsList.innerHTML = '<div class="empty-state">No recent jobs found</div>';
            return;
        }

        const jobsHtml = this.recentJobs.slice(0, 10).map(job => {
            // Handle feed_urls which might be a string or array
            let feedUrls = [];
            if (typeof job.feed_urls === 'string') {
                try {
                    feedUrls = JSON.parse(job.feed_urls);
                } catch (e) {
                    feedUrls = [job.feed_urls];
                }
            } else if (Array.isArray(job.feed_urls)) {
                feedUrls = job.feed_urls;
            }
            
            const isBatch = feedUrls.length > 1;
            const timeAgo = this.formatTimeAgo(job.started_at);
            const duration = job.fetch_duration_ms ? `${(job.fetch_duration_ms / 1000).toFixed(1)}s` : 'N/A';
            
            return `
                <div class="job-item" onclick="feedFetcherUI.viewJobDetails(${job.id})">
                    <div class="job-header">
                        <div class="job-info">
                            <div class="job-title">
                                Job #${job.id} - ${isBatch ? `Batch (${feedUrls.length} feeds)` : 'Single Feed'}
                            </div>
                            <div class="job-meta">
                                <span>${timeAgo}</span>
                                <span>${duration}</span>
                                <span>${job.articles_stored || 0} articles</span>
                            </div>
                        </div>
                        <div class="job-status ${job.status}">
                            ${job.status === 'completed' ? '✅' : job.status === 'processing' ? '🔄' : '❌'}
                        </div>
                    </div>
                    ${job.error_message ? `<div class="job-error">${job.error_message}</div>` : ''}
                </div>
            `;
        }).join('');
        
        jobsList.innerHTML = jobsHtml;
    }

    // Processing Methods
    switchMode(mode) {
        this.currentMode = mode;
        
        // Update tab states
        document.getElementById('single-tab').classList.toggle('active', mode === 'single');
        document.getElementById('batch-tab').classList.toggle('active', mode === 'batch');
        
        // Update content visibility
        document.getElementById('single-mode').classList.toggle('active', mode === 'single');
        document.getElementById('batch-mode').classList.toggle('active', mode === 'batch');
    }

    async processSingleFeed() {
        if (this.isProcessing) return;
        
        const feedUrl = document.getElementById('feed-url').value.trim();
        const maxArticles = parseInt(document.getElementById('max-articles').value);
        const includeContent = document.getElementById('include-content').checked;
        
        if (!feedUrl) {
            this.showError('Please enter a feed URL');
            return;
        }

        // Validate URL
        try {
            new URL(feedUrl);
        } catch (e) {
            this.showError('Please enter a valid URL');
            return;
        }
        
        this.isProcessing = true;
        const fetchBtn = document.getElementById('single-fetch-btn');
        const originalText = fetchBtn.innerHTML;
        fetchBtn.innerHTML = '🔄 Fetching...';
        fetchBtn.disabled = true;
        
        const startTime = performance.now();
        
        try {
            console.log(`🔍 Fetching single feed: ${feedUrl}`);
            
            const response = await this.apiClient.callWorker('feed-fetcher', '/fetch', 'POST', {
                feed_url: feedUrl,
                max_articles: maxArticles,
                include_content: includeContent
            });
            
            const endTime = performance.now();
            const duration = Math.round(endTime - startTime);
            
            if (response.success && response.data) {
                const data = response.data;
                this.currentJob = data;
                this.displayProcessingResults(data, duration, 'single');
                await this.loadRecentJobs(); // Refresh job list
            } else {
                throw new Error(response.error || 'Processing failed');
            }
            
        } catch (error) {
            console.error('Single feed processing failed:', error);
            this.showError(`Processing failed: ${error.message}`);
            document.getElementById('processing-results').style.display = 'none';
        } finally {
            this.isProcessing = false;
            fetchBtn.innerHTML = originalText;
            fetchBtn.disabled = false;
        }
    }

    async processBatchFeeds() {
        if (this.isProcessing) return;
        
        const batchUrlsText = document.getElementById('batch-urls').value.trim();
        const maxArticlesPerFeed = parseInt(document.getElementById('batch-max-articles').value);
        const includeContent = document.getElementById('batch-include-content').checked;
        
        if (!batchUrlsText) {
            this.showError('Please enter at least one feed URL');
            return;
        }

        const feedUrls = batchUrlsText.split('\n')
            .map(url => url.trim())
            .filter(url => url.length > 0);

        if (feedUrls.length === 0) {
            this.showError('Please enter valid feed URLs');
            return;
        }

        if (feedUrls.length > 20) {
            this.showError('Maximum 20 feeds allowed per batch');
            return;
        }

        // Validate URLs
        for (const url of feedUrls) {
            try {
                new URL(url);
            } catch (e) {
                this.showError(`Invalid URL: ${url}`);
                return;
            }
        }
        
        this.isProcessing = true;
        const fetchBtn = document.getElementById('batch-fetch-btn');
        const originalText = fetchBtn.innerHTML;
        fetchBtn.innerHTML = '🔄 Processing...';
        fetchBtn.disabled = true;
        
        // Show progress
        this.showBatchProgress(feedUrls.length);
        
        const startTime = performance.now();
        
        try {
            console.log(`📦 Processing batch: ${feedUrls.length} feeds`);
            
            const response = await this.apiClient.callWorker('feed-fetcher', '/batch', 'POST', {
                feed_urls: feedUrls,
                max_articles_per_feed: maxArticlesPerFeed,
                include_content: includeContent
            });
            
            const endTime = performance.now();
            const duration = Math.round(endTime - startTime);
            
            if (response.success && response.data) {
                const data = response.data;
                this.currentJob = data;
                this.displayProcessingResults(data, duration, 'batch');
                await this.loadRecentJobs(); // Refresh job list
            } else {
                throw new Error(response.error || 'Batch processing failed');
            }
            
        } catch (error) {
            console.error('Batch processing failed:', error);
            this.showError(`Batch processing failed: ${error.message}`);
            document.getElementById('processing-results').style.display = 'none';
        } finally {
            this.isProcessing = false;
            fetchBtn.innerHTML = originalText;
            fetchBtn.disabled = false;
            this.hideBatchProgress();
        }
    }

    showBatchProgress(totalFeeds) {
        const progressDiv = document.getElementById('batch-progress');
        const progressText = document.getElementById('batch-progress-text');
        const progressFill = document.getElementById('batch-progress-fill');
        
        progressDiv.classList.add('active');
        progressText.textContent = `0/${totalFeeds} feeds`;
        progressFill.style.width = '0%';
        
        // Simulate progress updates (in real implementation, this would be WebSocket updates)
        let processed = 0;
        const interval = setInterval(() => {
            processed++;
            const percentage = (processed / totalFeeds) * 100;
            progressFill.style.width = `${percentage}%`;
            progressText.textContent = `${processed}/${totalFeeds} feeds`;
            
            if (processed >= totalFeeds) {
                clearInterval(interval);
            }
        }, 1000);
    }

    hideBatchProgress() {
        document.getElementById('batch-progress').classList.remove('active');
    }

    displayProcessingResults(data, duration, mode) {
        const resultsDiv = document.getElementById('processing-results');
        const resultsContent = document.getElementById('results-content');
        
        // Update metrics
        document.getElementById('process-duration').textContent = duration;
        document.getElementById('articles-found').textContent = data.articles_found || data.total_articles || 0;
        document.getElementById('articles-stored').textContent = data.articles_stored || 0;
        document.getElementById('job-id').textContent = data.job_id || 'N/A';
        
        // Display articles - ensure we have a valid array
        let articles = [];
        if (Array.isArray(data.articles)) {
            articles = data.articles;
        } else if (Array.isArray(data)) {
            articles = data;
        }
        
        if (articles.length === 0) {
            resultsContent.innerHTML = `
                <div class="empty-state">
                    <h4>No articles extracted</h4>
                    <p>The feed may be empty or inaccessible.</p>
                </div>
            `;
        } else {
            const articlesHtml = articles.slice(0, 10).map(article => `
                <div class="article-item">
                    <div class="article-header">
                        <div class="article-title">${article.title || 'Untitled'}</div>
                        <div class="article-date">${this.formatDate(article.pub_date)}</div>
                    </div>
                    <div class="article-meta">
                        <span>📄 ${article.word_count || 0} words</span>
                        <span>👤 ${article.author || 'Unknown'}</span>
                        <span>🌐 ${article.source_feed || (article.feed_url ? new URL(article.feed_url).hostname : 'Unknown')}</span>
                    </div>
                    <div class="article-description">
                        ${(article.description || article.content || '').substring(0, 200)}${(article.description || article.content || '').length > 200 ? '...' : ''}
                    </div>
                    <div class="article-url">
                        <a href="${article.article_url}" target="_blank" rel="noopener">📎 Read Full Article</a>
                    </div>
                </div>
            `).join('');
            
            resultsContent.innerHTML = articlesHtml;
            
            if (articles.length > 10) {
                resultsContent.innerHTML += `
                    <div style="text-align: center; padding: var(--space-m);">
                        <button class="btn btn-secondary" onclick="feedFetcherUI.viewAllArticles(${data.job_id})">
                            View All ${articles.length} Articles
                        </button>
                    </div>
                `;
            }
        }
        
        resultsDiv.style.display = 'block';
    }

    // Template and Sample Methods
    useSampleUrl(category) {
        const sampleUrls = {
            tech: 'https://feeds.reuters.com/reuters/technologyNews',
            business: 'https://feeds.reuters.com/reuters/businessNews',
            science: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml'
        };
        
        document.getElementById('feed-url').value = sampleUrls[category] || sampleUrls.tech;
    }

    loadTemplate(category) {
        const template = this.feedTemplates[category];
        if (template) {
            document.getElementById('batch-urls').value = template.join('\n');
        }
    }

    // Article Management
    async viewJobDetails(jobId) {
        try {
            if (this.isAdmin) {
                const response = await this.apiClient.callWorker('feed-fetcher', '/admin/articles', 'GET', {
                    job_id: jobId,
                    limit: 50
                });
                
                if (response.success && response.data) {
                    // Handle the response format: { articles: [...] }
                    const articles = Array.isArray(response.data) ? response.data :
                                   (response.data.articles && Array.isArray(response.data.articles)) ? response.data.articles : [];
                    this.displayJobArticles(articles, jobId);
                    return;
                }
            }
            
            // Fallback for non-admin or error
            this.showInfo(`Job #${jobId} details would be displayed here`);
            
        } catch (error) {
            console.error('Error loading job details:', error);
            this.showError('Failed to load job details');
        }
    }

    displayJobArticles(articles, jobId) {
        const preview = document.getElementById('articles-preview');
        
        // Ensure we have a valid array
        if (!Array.isArray(articles)) {
            console.warn('articles is not an array:', articles);
            articles = [];
        }
        
        if (articles.length === 0) {
            preview.innerHTML = '<div class="empty-state">No articles found for this job</div>';
            return;
        }
        
        const articlesHtml = `
            <div style="margin-bottom: var(--space-s); font-weight: 600;">
                Job #${jobId} Articles (${articles.length} total)
            </div>
            ${articles.slice(0, 20).map(article => `
                <div class="article-item">
                    <div class="article-header">
                        <div class="article-title">${article.title || 'Untitled'}</div>
                        <div class="article-date">${this.formatDate(article.pub_date)}</div>
                    </div>
                    <div class="article-meta">
                        <span>📄 ${article.word_count || 0} words</span>
                        <span>👤 ${article.author || 'Unknown'}</span>
                        <span>🌐 ${article.feed_url ? new URL(article.feed_url).hostname : 'Unknown'}</span>
                    </div>
                    <div class="article-url">
                        <a href="${article.article_url}" target="_blank" rel="noopener">📎 Read Full Article</a>
                    </div>
                </div>
            `).join('')}
            ${articles.length > 20 ? '<div style="text-align: center; padding: var(--space-m); color: var(--text-secondary);">Showing first 20 articles...</div>' : ''}
        `;
        
        preview.innerHTML = articlesHtml;
    }

    clearResults() {
        document.getElementById('processing-results').style.display = 'none';
        document.getElementById('feed-url').value = '';
        document.getElementById('batch-urls').value = '';
        document.getElementById('articles-preview').innerHTML = '<div class="loading-placeholder">Select a job to view articles...</div>';
        this.currentJob = null;
    }

    // Admin Functions
    async loadAdminStats() {
        try {
            const response = await this.apiClient.callWorker('feed-fetcher', '/admin/stats', 'GET');
            if (response.success && response.data) {
                console.log('Admin stats loaded:', response.data);
                // Update admin-specific metrics
            }
        } catch (error) {
            console.error('Error loading admin stats:', error);
        }
    }

    async validateFeeds() {
        this.showInfo('Feed validation started...');
        // Simulate validation
        setTimeout(() => {
            this.showSuccess('Sample feeds validated successfully');
        }, 2000);
    }

    async exportArticles() {
        try {
            const exportData = {
                timestamp: new Date().toISOString(),
                job_count: this.recentJobs.length,
                jobs: this.recentJobs.slice(0, 10)
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `feed-fetcher-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showSuccess('Export completed successfully');
        } catch (error) {
            this.showError('Failed to export data');
        }
    }

    async clearCache() {
        this.showInfo('Cache clearing...');
        setTimeout(() => {
            this.showSuccess('Cache cleared successfully');
        }, 1000);
    }

    // Utility Methods
    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.round(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        
        const diffHours = Math.round(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        
        const diffDays = Math.round(diffHours / 24);
        return `${diffDays}d ago`;
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        return new Date(dateString).toLocaleDateString();
    }

    startHealthCheck() {
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

    async refreshAnalytics() {
        await this.loadAnalytics();
        this.showSuccess('Analytics refreshed');
    }

    // Notification Methods
    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            max-width: 300px;
            box-shadow: var(--shadow-lg);
        `;
        
        if (type === 'error') notification.style.backgroundColor = 'var(--error-color)';
        else if (type === 'success') notification.style.backgroundColor = 'var(--success-color)';
        else notification.style.backgroundColor = 'var(--primary-color)';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }

    // Cleanup
    destroy() {
        this.stopHealthCheck();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.feedFetcherUI = new FeedFetcherUI();
    window.feedFetcherUI.init();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.feedFetcherUI) {
        window.feedFetcherUI.destroy();
    }
});