// public/js/workers/rss-librarian.js
// RSS Librarian Frontend - Database-driven RSS source management

class RSSLibrarianUI {
    constructor() {
        this.authClient = window.authClient; // Use global auth client
        this.apiClient = null;
        this.currentSources = [];
        this.allTopics = [];
        this.isAdmin = false;
    }

    async init() {
        // Check authentication
        if (!this.authClient || !this.authClient.isAuthenticated()) {
            window.location.href = '/login.html';
            return;
        }

        this.apiClient = new APIClient(this.authClient);
        
        // Get user role from localStorage
        const userInfo = localStorage.getItem('bitware-user-info');
        if (userInfo) {
            const user = JSON.parse(userInfo);
            this.isAdmin = user.role === 'admin';
        } else {
            this.isAdmin = false;
        }
        
        // Show/hide admin features
        if (this.isAdmin) {
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'block';
            });
        }

        this.initializeForms();
        this.loadInitialData();
        this.startHealthCheck();
        
        // Setup logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.authClient.logout();
        });
        
        // Load initial data
        this.loadTopics();
        this.loadAnalytics();
        if (this.isAdmin) {
            this.loadAdminStats();
        }
    }

    initializeForms() {
        // Search form
        const searchForm = document.getElementById('searchForm');
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.searchSources();
        });

        // Add source form (admin only)
        if (this.isAdmin) {
            const addSourceForm = document.getElementById('addSourceForm');
            addSourceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addNewSource();
            });

            // Quality slider
            const qualitySlider = document.getElementById('new-quality');
            const qualityDisplay = document.getElementById('quality-display');
            qualitySlider.addEventListener('input', (e) => {
                qualityDisplay.textContent = parseFloat(e.target.value).toFixed(2);
            });
        }
    }

    async loadInitialData() {
        try {
            // Load capabilities
            const capsResponse = await this.apiClient.callWorker('rss-librarian', '/capabilities', 'GET');
            if (capsResponse.success && capsResponse.data) {
                const caps = capsResponse.data.capabilities || capsResponse.data;
                document.getElementById('total-sources').textContent = caps.total_sources || '0';
                document.getElementById('available-topics').textContent = caps.supported_topics || '0';
            }

            // Load health status
            await this.checkHealth();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load librarian data');
        }
    }

    async checkHealth() {
        try {
            const response = await this.apiClient.callWorker('rss-librarian', '/health', 'GET');
            
            if (response.success) {
                const health = response.data;
                const isHealthy = health.status === 'healthy';
                
                document.getElementById('worker-status').textContent = isHealthy ? 'Healthy' : 'Unhealthy';
                document.getElementById('cache-status').textContent = health.cache_available ? 'Active' : 'Inactive';
                
                // Update total sources if available
                if (health.total_sources !== undefined) {
                    document.getElementById('total-sources').textContent = health.total_sources;
                }
            }
        } catch (error) {
            console.error('Health check failed:', error);
            document.getElementById('worker-status').textContent = 'Error';
        }
    }

    startHealthCheck() {
        // Initial check
        this.checkHealth();
        
        // Check every 30 seconds
        setInterval(() => this.checkHealth(), 30000);
    }

    async searchSources() {
        const topic = document.getElementById('search-topic').value.trim();
        const minQuality = parseFloat(document.getElementById('search-quality').value);

        if (!topic) {
            this.showError('Please enter a topic to search');
            return;
        }

        const resultsContainer = document.getElementById('search-results');
        resultsContainer.innerHTML = '<div class="loading">🔍 Searching RSS sources...</div>';

        try {
            const response = await this.apiClient.callWorker('rss-librarian', '/search', 'GET', {
                topic,
                maxFeeds: 20,
                minQuality
            });

            if (response.success && response.data) {
                const data = response.data;
                this.currentSources = data.feeds || [];
                this.displaySearchResults(this.currentSources, topic);
            } else {
                throw new Error(response.error || 'Search failed');
            }
        } catch (error) {
            console.error('Search error:', error);
            resultsContainer.innerHTML = `
                <div class="error-message">
                    <span class="error-icon">❌</span>
                    Failed to search sources: ${error.message}
                </div>
            `;
        }
    }

    displaySearchResults(sources, topic) {
        const resultsContainer = document.getElementById('search-results');
        
        if (!sources || sources.length === 0) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <p>No RSS sources found for topic "${topic}"</p>
                    <p class="text-muted">Try a different topic or adjust the quality filter</p>
                </div>
            `;
            return;
        }

        const resultsHtml = `
            <div class="results-header">
                <h3>Found ${sources.length} sources for "${topic}"</h3>
            </div>
            <div class="sources-list">
                ${sources.map(source => this.renderSourceCard(source)).join('')}
            </div>
        `;

        resultsContainer.innerHTML = resultsHtml;
    }

    renderSourceCard(source) {
        const qualityClass = source.quality_score >= 0.9 ? 'quality-high' : 
                           source.quality_score >= 0.7 ? 'quality-medium' : 'quality-low';
        
        return `
            <div class="source-card">
                <div class="source-title">
                    <span>${source.title}</span>
                    <span class="quality-score ${qualityClass}">
                        ⭐ ${source.quality_score.toFixed(2)}
                    </span>
                </div>
                <div class="source-url">
                    <a href="${source.url}" target="_blank" rel="noopener noreferrer">
                        ${source.url}
                    </a>
                </div>
                <div class="source-description">${source.description || 'No description available'}</div>
                <div class="source-meta">
                    <span class="topic-tag">${source.topic}</span>
                    ${source.subtopic ? `<span class="topic-tag">${source.subtopic}</span>` : ''}
                    <span class="text-muted">Language: ${source.language || 'en'}</span>
                </div>
            </div>
        `;
    }

    async loadTopics() {
        const topicsGrid = document.getElementById('topics-grid');
        topicsGrid.innerHTML = '<div class="loading">📚 Loading topics...</div>';

        try {
            const response = await this.apiClient.callWorker('rss-librarian', '/topics', 'GET');
            
            if (response.success && response.data) {
                const topics = response.data.topics || [];
                this.allTopics = topics;
                this.displayTopics(topics);
            } else {
                throw new Error('Failed to load topics');
            }
        } catch (error) {
            console.error('Error loading topics:', error);
            topicsGrid.innerHTML = `
                <div class="error-message">
                    <span class="error-icon">❌</span>
                    Failed to load topics
                </div>
            `;
        }
    }

    displayTopics(topics) {
        const topicsGrid = document.getElementById('topics-grid');
        
        if (!topics || topics.length === 0) {
            topicsGrid.innerHTML = '<div class="empty-state">No topics available</div>';
            return;
        }

        const topicsHtml = topics.map(topic => `
            <div class="topic-card" onclick="rssLibrarianUI.loadTopicSources('${topic.topic}')">
                <div class="topic-name">${this.formatTopicName(topic.topic)}</div>
                <div class="topic-count">${topic.source_count} sources</div>
                <div class="topic-quality">Avg Quality: ${parseFloat(topic.avg_quality).toFixed(2)}</div>
            </div>
        `).join('');

        topicsGrid.innerHTML = topicsHtml;
    }

    formatTopicName(topic) {
        const nameMap = {
            'ai': 'AI / Machine Learning',
            'climate': 'Climate / Environment',
            'crypto': 'Cryptocurrency',
            'science': 'Science / Research',
            'space': 'Space / Astronomy',
            'health': 'Health / Medicine',
            'gaming': 'Gaming',
            'business': 'Business / Finance',
            'tech': 'Technology'
        };
        return nameMap[topic] || topic.charAt(0).toUpperCase() + topic.slice(1);
    }

    async loadTopicSources(topic) {
        const sourcesContainer = document.getElementById('topic-sources');
        sourcesContainer.style.display = 'block';
        sourcesContainer.innerHTML = '<div class="loading">🔍 Loading sources...</div>';

        // Scroll to sources
        sourcesContainer.scrollIntoView({ behavior: 'smooth' });

        try {
            const response = await this.apiClient.callWorker('rss-librarian', '/search', 'GET', {
                topic,
                maxFeeds: 50,
                minQuality: 0
            });

            if (response.success && response.data) {
                const sources = response.data.feeds || [];
                
                const sourcesHtml = `
                    <div class="results-header">
                        <h3>${this.formatTopicName(topic)} - ${sources.length} Sources</h3>
                        <button onclick="document.getElementById('topic-sources').style.display='none'" class="btn btn-secondary">
                            Close
                        </button>
                    </div>
                    <div class="sources-list">
                        ${sources.map(source => this.renderSourceCard(source)).join('')}
                    </div>
                `;
                
                sourcesContainer.innerHTML = sourcesHtml;
            }
        } catch (error) {
            console.error('Error loading topic sources:', error);
            sourcesContainer.innerHTML = `
                <div class="error-message">
                    <span class="error-icon">❌</span>
                    Failed to load sources for ${topic}
                </div>
            `;
        }
    }

    async loadAnalytics() {
        try {
            const response = await this.apiClient.callWorker('rss-librarian', '/admin/stats', 'GET');
            
            if (response.success && response.data) {
                const stats = response.data.stats || response.data;
                this.displayAnalytics(stats);
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.showError('Failed to load analytics data');
        }
    }

    displayAnalytics(stats) {
        // Update stat cards
        document.getElementById('stat-total-sources').textContent = stats.total_sources || '0';
        document.getElementById('stat-topics').textContent = (stats.by_topic || []).length;
        
        // Calculate high quality count
        const qualityStats = stats.by_quality || [];
        const highQuality = qualityStats.find(q => q.quality_tier === 'high');
        document.getElementById('stat-high-quality').textContent = highQuality ? highQuality.count : '0';
        
        // Calculate average quality (simplified)
        const totalSources = stats.total_sources || 0;
        const qualitySum = qualityStats.reduce((sum, q) => {
            const avgScore = q.quality_tier === 'high' ? 0.95 : 
                           q.quality_tier === 'medium' ? 0.8 : 0.6;
            return sum + (q.count * avgScore);
        }, 0);
        const avgQuality = totalSources > 0 ? (qualitySum / totalSources).toFixed(2) : '0.00';
        document.getElementById('stat-avg-quality').textContent = avgQuality;
        
        // Display quality distribution
        this.displayQualityDistribution(stats.by_quality || []);
        
        // Display topic distribution
        this.displayTopicDistribution(stats.by_topic || []);
    }

    displayQualityDistribution(qualityData) {
        const container = document.getElementById('quality-distribution');
        
        const total = qualityData.reduce((sum, q) => sum + q.count, 0);
        
        const distributionHtml = qualityData.map(q => {
            const percentage = total > 0 ? ((q.count / total) * 100).toFixed(1) : 0;
            const label = q.quality_tier.charAt(0).toUpperCase() + q.quality_tier.slice(1);
            const fillColor = q.quality_tier === 'high' ? 'var(--success-color)' : 
                             q.quality_tier === 'medium' ? 'var(--warning-color)' : 'var(--error-color)';
            
            return `
                <div class="distribution-item">
                    <div class="distribution-label">${label} Quality</div>
                    <div class="distribution-bar">
                        <div class="distribution-fill" style="width: ${percentage}%; background: ${fillColor};"></div>
                    </div>
                    <div class="distribution-value">${q.count} (${percentage}%)</div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = distributionHtml || '<div class="empty-state">No quality data available</div>';
    }

    displayTopicDistribution(topicData) {
        const container = document.getElementById('topic-distribution');
        
        const sortedTopics = topicData.sort((a, b) => b.count - a.count).slice(0, 10);
        
        const distributionHtml = sortedTopics.map(t => {
            const maxCount = sortedTopics[0].count;
            const percentage = maxCount > 0 ? ((t.count / maxCount) * 100).toFixed(0) : 0;
            
            return `
                <div class="distribution-item">
                    <div class="distribution-label">${this.formatTopicName(t.topic)}</div>
                    <div class="distribution-bar">
                        <div class="distribution-fill" style="width: ${percentage}%;"></div>
                    </div>
                    <div class="distribution-value">${t.count}</div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = distributionHtml || '<div class="empty-state">No topic data available</div>';
    }

    async addNewSource() {
        const formData = {
            url: document.getElementById('new-url').value.trim(),
            title: document.getElementById('new-title').value.trim(),
            description: document.getElementById('new-description').value.trim(),
            topic: document.getElementById('new-topic').value,
            subtopic: document.getElementById('new-subtopic').value.trim() || null,
            language: document.getElementById('new-language').value,
            quality_score: parseFloat(document.getElementById('new-quality').value)
        };

        // Validate
        if (!formData.url || !formData.title || !formData.description || !formData.topic) {
            this.showError('Please fill in all required fields');
            return;
        }

        try {
            const response = await this.apiClient.callWorker('rss-librarian', '/admin/add-source', 'POST', formData);
            
            if (response.success) {
                this.showSuccess('RSS source added successfully!');
                
                // Reset form
                document.getElementById('addSourceForm').reset();
                document.getElementById('quality-display').textContent = '0.70';
                
                // Reload stats
                this.loadAdminStats();
                this.loadInitialData();
            } else {
                throw new Error(response.error || 'Failed to add source');
            }
        } catch (error) {
            console.error('Error adding source:', error);
            this.showError(`Failed to add source: ${error.message}`);
        }
    }

    async loadAdminStats() {
        try {
            const response = await this.apiClient.callWorker('rss-librarian', '/admin/stats', 'GET');
            
            if (response.success && response.data) {
                const stats = response.data.stats || response.data;
                
                const statsHtml = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-s);">
                        <div class="stat-card">
                            <div class="stat-value">${stats.total_sources || 0}</div>
                            <div class="stat-label">Total Sources</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${(stats.by_topic || []).length}</div>
                            <div class="stat-label">Active Topics</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" style="font-size: var(--font-h3);">${new Date(stats.timestamp).toLocaleDateString()}</div>
                            <div class="stat-label">Last Updated</div>
                        </div>
                    </div>
                `;
                
                document.getElementById('admin-stats').innerHTML = statsHtml;
            }
        } catch (error) {
            console.error('Error loading admin stats:', error);
        }
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showMessage(message, type = 'info') {
        const container = document.getElementById('message-container');
        const messageId = `msg-${Date.now()}`;
        
        const messageHtml = `
            <div id="${messageId}" class="toast toast-${type === 'error' ? 'error' : 'success'}">
                <div class="toast-content">
                    <span class="toast-icon">${type === 'error' ? '❌' : '✅'}</span>
                    <span class="toast-message">${message}</span>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', messageHtml);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            const messageEl = document.getElementById(messageId);
            if (messageEl) {
                messageEl.classList.add('toast-fade-out');
                setTimeout(() => messageEl.remove(), 300);
            }
        }, 5000);
    }
}

// Initialize when DOM is ready
const rssLibrarianUI = new RSSLibrarianUI();
document.addEventListener('DOMContentLoaded', () => {
    rssLibrarianUI.init();
});