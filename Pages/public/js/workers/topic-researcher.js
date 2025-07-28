/**
 * Topic Researcher Admin Component
 * Handles all functionality for the Topic Researcher worker admin interface
 */

class TopicResearcherAdmin {
    constructor() {
        this.apiClient = new APIClient();
        this.workerData = null;
        this.refreshInterval = null;
        this.isResearching = false;
    }

    async initialize() {
        try {
            console.log('🎯 Initializing Topic Researcher Admin...');
            
            // Load initial data
            await this.loadWorkerData();
            await this.loadAnalytics();
            await this.loadTopTopics();
            await this.loadSessions();
            
            // Start auto-refresh
            this.startAutoRefresh();
            
            console.log('✅ Topic Researcher Admin initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Topic Researcher Admin:', error);
            this.showError('Failed to initialize admin interface: ' + error.message);
        }
    }

    async loadWorkerData() {
        try {
            console.log('📊 Loading worker health data...');
            
            const response = await this.apiClient.callWorker('topic-researcher', '/health', 'GET');
            
            if (response.success) {
                this.workerData = response.data;
                this.updateWorkerStatus();
            } else {
                throw new Error(response.error || 'Failed to load worker data');
            }
        } catch (error) {
            console.error('Error loading worker data:', error);
            this.showWorkerOffline();
        }
    }

    updateWorkerStatus() {
        const data = this.workerData;
        
        // Update status bar
        const statusIcon = document.getElementById('worker-status');
        const statusText = document.getElementById('worker-status-text');
        
        if (data.status === 'healthy') {
            statusIcon.textContent = '🟢';
            statusText.textContent = 'Healthy';
            statusText.className = 'status-value status-healthy';
        } else {
            statusIcon.textContent = '🔴';
            statusText.textContent = 'Error';
            statusText.className = 'status-value status-error';
        }
        
        // Update metrics
        document.getElementById('total-sessions').textContent = data.total_sessions || 0;
        document.getElementById('openai-status').textContent = data.openai_configured ? '✅ Configured' : '❌ Not Configured';
        document.getElementById('cache-status').textContent = data.cache_available ? '✅ Available' : '❌ Unavailable';
    }

    async loadAnalytics() {
        try {
            console.log('📈 Loading analytics data...');
            
            const response = await this.apiClient.callWorker('topic-researcher', '/admin/stats', 'GET');
            
            if (response.success) {
                this.updateAnalytics(response.data);
            } else {
                throw new Error(response.error || 'Failed to load analytics');
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.showError('Failed to load analytics data');
        }
    }

    updateAnalytics(data) {
        // Update average sources in status bar
        document.getElementById('avg-sources').textContent = data.avg_sources_found?.toFixed(2) || '0';
        
        // Update performance metrics
        const totalSessions = data.total_sessions || 0;
        const completedSessions = data.completed_sessions || 0;
        const successRate = totalSessions > 0 ? ((completedSessions / totalSessions) * 100).toFixed(1) : 0;
        
        document.getElementById('completion-rate').textContent = successRate + '%';
        document.getElementById('avg-quality').textContent = data.avg_quality_sources?.toFixed(2) || '0';
        document.getElementById('active-sessions').textContent = data.active_sessions || 0;
        document.getElementById('failed-sessions').textContent = data.failed_sessions || 0;
    }

    async loadTopTopics() {
        try {
            console.log('🔥 Loading top topics...');
            
            const response = await this.apiClient.callWorker('topic-researcher', '/admin/stats', 'GET');
            
            if (response.success && response.data.top_topics) {
                this.updateTopTopics(response.data.top_topics);
            } else {
                throw new Error('No topics data available');
            }
        } catch (error) {
            console.error('Error loading top topics:', error);
            document.getElementById('topics-list').innerHTML = '<div class="error-message">Failed to load topics</div>';
        }
    }

    updateTopTopics(topics) {
        const topicsList = document.getElementById('topics-list');
        
        if (!topics || topics.length === 0) {
            topicsList.innerHTML = '<div class="empty-state">No research topics yet</div>';
            return;
        }
        
        const topicsHtml = topics.slice(0, 10).map((topic, index) => `
            <div class="topic-item">
                <div class="topic-rank">#${index + 1}</div>
                <div class="topic-content">
                    <div class="topic-name">${topic.topic}</div>
                    <div class="topic-count">${topic.research_count} research${topic.research_count !== 1 ? 'es' : ''}</div>
                </div>
                <div class="topic-actions">
                    <button class="btn-small btn-secondary" onclick="topicResearcherAdmin.researchTopic('${topic.topic}')">
                        🔍 Research
                    </button>
                </div>
            </div>
        `).join('');
        
        topicsList.innerHTML = topicsHtml;
    }

    async loadSessions() {
        try {
            console.log('⏱️ Loading recent sessions...');
            
            const response = await this.apiClient.callWorker('topic-researcher', '/admin/sessions', 'GET');
            
            if (response.success) {
                this.updateSessionsList(response.data.sessions || []);
            } else {
                throw new Error(response.error || 'Failed to load sessions');
            }
        } catch (error) {
            console.error('Error loading sessions:', error);
            document.getElementById('sessions-list').innerHTML = '<div class="error-message">Failed to load sessions</div>';
        }
    }

    updateSessionsList(sessions) {
        const sessionsList = document.getElementById('sessions-list');
        
        if (!sessions || sessions.length === 0) {
            sessionsList.innerHTML = '<div class="empty-state">No recent sessions</div>';
            return;
        }
        
        const sessionsHtml = sessions.slice(0, 10).map(session => `
            <div class="session-item" onclick="topicResearcherAdmin.viewSessionResults('${session.session_id || session.id}', '${session.topic}')" style="cursor: pointer;" title="Click to view results">
                <div class="session-info">
                    <div class="session-topic">${session.topic || 'Unknown Topic'}</div>
                    <div class="session-meta">
                        <span class="session-time">${this.formatTimestamp(session.timestamp || session.research_date)}</span>
                        <span class="session-sources">${session.sources_found || 0} sources</span>
                        <span class="session-duration">${session.duration_ms || session.research_time_ms || 0}ms</span>
                    </div>
                </div>
                <div class="session-status ${session.status === 'completed' ? 'status-success' : 'status-error'}">
                    ${session.status === 'completed' ? '✅' : '❌'}
                </div>
            </div>
        `).join('');
        
        sessionsList.innerHTML = sessionsHtml;
    }

    async executeResearch() {
        if (this.isResearching) return;
        
        const topic = document.getElementById('research-topic').value.trim();
        const depth = parseInt(document.getElementById('research-depth').value);
        const maxSources = parseInt(document.getElementById('max-sources').value);
        
        if (!topic) {
            this.showError('Please enter a research topic');
            return;
        }
        
        this.isResearching = true;
        const researchBtn = document.getElementById('research-btn');
        const originalText = researchBtn.innerHTML;
        researchBtn.innerHTML = '🔄 Researching...';
        researchBtn.disabled = true;
        
        const startTime = performance.now();
        
        try {
            console.log(`🔍 Starting research for: "${topic}"`);
            
            const response = await this.apiClient.callWorker('topic-researcher', '/research', 'POST', {
                topic,
                depth,
                maxSources
            });
            
            const endTime = performance.now();
            const duration = Math.round(endTime - startTime);
            
            // Handle both wrapped and direct responses
            let data;
            if (response.success && response.data) {
                // Wrapped response (admin endpoints)
                data = response.data;
            } else if (response.status === 'ok' || response.sources) {
                // Direct worker response (research endpoint)
                data = response;
            } else {
                throw new Error('Invalid response format');
            }
            
            if (data.status === 'ok' || data.sources) {
                // Reset header for live research
                const resultsHeader = document.querySelector('.results-header h4');
                if (resultsHeader) {
                    resultsHeader.textContent = 'Research Results';
                }
                
                this.displayResearchResults(data, duration);
                
                // Refresh analytics after successful research
                setTimeout(() => {
                    this.loadAnalytics();
                    this.loadTopTopics();
                    this.loadSessions();
                }, 1000);
            } else {
                throw new Error(data.error || 'Research failed');
            }
            
        } catch (error) {
            console.error('Research error:', error);
            this.showError('Research failed: ' + error.message);
        } finally {
            this.isResearching = false;
            researchBtn.innerHTML = originalText;
            researchBtn.disabled = false;
        }
    }

    displayResearchResults(data, duration) {
        console.log('📊 Displaying research results:', data);
        
        document.getElementById('research-duration').textContent = duration;
        document.getElementById('sources-found').textContent = data.sources?.length || 0;
        
        const avgQuality = data.sources?.length > 0 
            ? (data.sources.reduce((sum, source) => sum + (source.quality_score || 0), 0) / data.sources.length).toFixed(2)
            : '0';
        document.getElementById('quality-score').textContent = avgQuality;
        
        const resultsContent = document.getElementById('research-results-content');
        
        if (!data.sources || data.sources.length === 0) {
            resultsContent.innerHTML = '<div class="empty-state">No sources found for this topic</div>';
        } else {
            console.log(`📋 Rendering ${data.sources.length} sources`);
            const sourcesHtml = data.sources.map((source, index) => {
                console.log(`📄 Source ${index + 1}:`, source);
                return `
                <div class="source-item">
                    <div class="source-header">
                        <div class="source-title">${source.title || source.domain || 'Untitled Source'}</div>
                        <div class="source-quality ${this.getQualityClass(source.quality_score)}">
                            Quality: ${source.quality_score?.toFixed(2) || '0'}
                        </div>
                    </div>
                    <div class="source-url">
                        <a href="${source.url}" target="_blank" rel="noopener">${source.url}</a>
                    </div>
                    <div class="source-description">
                        ${source.description || 'No description available'}
                    </div>
                    ${source.reasoning ? `<div class="source-reasoning" style="font-size: 12px; color: #666; margin-top: 8px; font-style: italic;">${source.reasoning}</div>` : ''}
                </div>
            `;
            }).join('');
            
            resultsContent.innerHTML = sourcesHtml;
        }
        
        // Show the results section
        const resultsSection = document.getElementById('research-results');
        resultsSection.style.display = 'block';
        
        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth' });
        
        console.log('✅ Research results displayed successfully');
    }

    getQualityClass(score) {
        if (score >= 0.8) return 'quality-high';
        if (score >= 0.6) return 'quality-medium';
        return 'quality-low';
    }

    async researchTopic(topic) {
        document.getElementById('research-topic').value = topic;
        await this.executeResearch();
    }

    async viewSessionResults(sessionId, topic) {
        try {
            console.log(`📋 Loading session results for: ${sessionId} (${topic})`);
            
            const response = await this.apiClient.callWorker('topic-researcher', `/admin/sources?session_id=${sessionId}`, 'GET');
            
            if (response.success && response.data) {
                const sessionData = response.data;
                
                // Update the topic field to show what was searched
                document.getElementById('research-topic').value = topic;
                
                // Create mock data structure similar to live research results
                const resultsData = {
                    sources: sessionData.sources || [],
                    session_id: sessionId,
                    topic: topic
                };
                
                // Display results using existing method
                this.displayResearchResults(resultsData, 0);
                
                // Update the results header to indicate these are historical results
                const resultsHeader = document.querySelector('.results-header h4');
                if (resultsHeader) {
                    resultsHeader.textContent = `Historical Results: ${topic}`;
                }
                
                // Update performance metrics to show session info
                document.getElementById('research-duration').textContent = 'Historical';
                document.getElementById('sources-found').textContent = sessionData.sources?.length || 0;
                
                const avgQuality = sessionData.sources?.length > 0 
                    ? (sessionData.sources.reduce((sum, source) => sum + (source.quality_score || 0), 0) / sessionData.sources.length).toFixed(2)
                    : '0';
                document.getElementById('quality-score').textContent = avgQuality;
                
                this.showSuccess(`Loaded ${sessionData.sources?.length || 0} sources from session: ${topic}`);
                
            } else {
                throw new Error(response.error || 'Failed to load session results');
            }
            
        } catch (error) {
            console.error('Error loading session results:', error);
            this.showError('Failed to load session results: ' + error.message);
        }
    }

    clearResults() {
        document.getElementById('research-results').style.display = 'none';
        document.getElementById('research-topic').value = '';
        
        // Reset the results header to default
        const resultsHeader = document.querySelector('.results-header h4');
        if (resultsHeader) {
            resultsHeader.textContent = 'Research Results';
        }
        
        // Reset performance metrics
        document.getElementById('research-duration').textContent = '-';
        document.getElementById('sources-found').textContent = '-';
        document.getElementById('quality-score').textContent = '-';
    }

    async refreshAnalytics() {
        await this.loadAnalytics();
        await this.loadTopTopics();
    }

    async clearCache() {
        try {
            const response = await this.apiClient.callWorker('topic-researcher', '/admin/clear-cache', 'POST');
            if (response.success) {
                this.showSuccess('Cache cleared successfully');
            } else {
                throw new Error(response.error || 'Failed to clear cache');
            }
        } catch (error) {
            console.error('Error clearing cache:', error);
            this.showError('Failed to clear cache: ' + error.message);
        }
    }

    async healthCheck() {
        await this.loadWorkerData();
        this.showSuccess('Health check completed');
    }

    async restartWorker() {
        if (confirm('Are you sure you want to restart the Topic Researcher worker?')) {
            this.showSuccess('Worker restart requested (feature coming soon)');
        }
    }

    async exportData() {
        try {
            const response = await this.apiClient.callWorker('topic-researcher', '/admin/sessions', 'GET');
            if (response.success) {
                const data = JSON.stringify(response.data, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `topic-researcher-sessions-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            this.showError('Failed to export data: ' + error.message);
        }
    }

    async viewCapabilities() {
        try {
            const response = await this.apiClient.callWorker('topic-researcher', '/capabilities', 'GET');
            if (response.success) {
                alert(JSON.stringify(response.data, null, 2));
            }
        } catch (error) {
            this.showError('Failed to load capabilities: ' + error.message);
        }
    }

    startAutoRefresh() {
        // Refresh data every 30 seconds
        this.refreshInterval = setInterval(() => {
            if (!this.isResearching) {
                this.loadWorkerData();
                this.loadAnalytics();
            }
        }, 30000);
    }

    goToDashboard() {
        window.location.href = '/admin-dashboard.html';
    }

    showWorkerOffline() {
        const statusIcon = document.getElementById('worker-status');
        const statusText = document.getElementById('worker-status-text');
        statusIcon.textContent = '🔴';
        statusText.textContent = 'Offline';
        statusText.className = 'status-value status-error';
    }

    showError(message) {
        // Create error notification
        const notification = document.createElement('div');
        notification.className = 'notification notification-error';
        notification.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <div style="font-weight: 500;">❌ Error</div>
                    <div style="font-size: 13px; margin-top: 4px;">${message}</div>
                </div>
                <button onclick="this.closest('div.notification').remove()" style="
                    background: none; 
                    border: none; 
                    font-size: 18px; 
                    cursor: pointer; 
                    opacity: 0.7;
                ">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    showSuccess(message) {
        // Create success notification
        const notification = document.createElement('div');
        notification.className = 'notification notification-success';
        notification.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <div style="font-weight: 500;">✅ Success</div>
                    <div style="font-size: 13px; margin-top: 4px;">${message}</div>
                </div>
                <button onclick="this.closest('div.notification').remove()" style="
                    background: none; 
                    border: none; 
                    font-size: 18px; 
                    cursor: pointer; 
                    opacity: 0.7;
                ">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    formatTimestamp(timestamp) {
        if (!timestamp) return 'Unknown';
        const date = new Date(timestamp);
        return date.toLocaleString();
    }

    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}