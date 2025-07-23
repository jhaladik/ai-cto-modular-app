// AI Factory Frontend Worker - API Client
// @WORKER: FrontendWorker
// 🧱 Type: StaticJS
// 📍 Path: src/static/js/api.ts
// 🎯 Role: Handle API communication with backend workers via service bindings
// 💾 Storage: { embedded: "worker_code" }

export const API_JS = `
/**
 * AI Factory API Client
 * Handles communication with backend workers through frontend worker service bindings
 */
class AIFactoryAPI {
    constructor() {
        this.sessionToken = localStorage.getItem('session-token') || 
                           localStorage.getItem('bitware-session-token');
        this.baseUrl = window.location.origin;
    }

    /**
     * Set session token for authenticated requests
     */
    setSessionToken(token) {
        this.sessionToken = token;
        if (token) {
            localStorage.setItem('session-token', token);
            localStorage.setItem('bitware-session-token', token); // Backward compatibility
        } else {
            localStorage.removeItem('session-token');
            localStorage.removeItem('bitware-session-token');
        }
    }

    /**
     * Get current session token
     */
    getSessionToken() {
        return this.sessionToken;
    }

    /**
     * Make authenticated request to worker via service binding
     */
    async callWorker(workerName, endpoint, data, options = {}) {
        const method = options.method || (data ? 'POST' : 'GET');
        const url = this.baseUrl + '/api/' + workerName + endpoint;
        
        const headers = {
            'Content-Type': 'application/json',
            'x-session-token': this.sessionToken
        };

        // Add any additional headers
        if (options.headers) {
            Object.assign(headers, options.headers);
        }

        const requestOptions = {
            method: method,
            headers: headers
        };

        // Add body for POST/PUT requests
        if (data && (method === 'POST' || method === 'PUT')) {
            requestOptions.body = JSON.stringify(data);
        }

        try {
            console.log(`🌐 API Call: \${method} \${url}`);
            
            const response = await fetch(url, requestOptions);
            
            if (!response.ok) {
                let errorMessage = `HTTP \${response.status}: $\{response.statusText\}`;
                
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorData.error || errorMessage;
                } catch (e) {
                    // Response is not JSON, use status text
                }
                
                throw new Error(errorMessage);
            }

            const result = await response.json();
            console.log(`✅ API Success: \${method} $\{url\}`, result);
            return result;

        } catch (error) {
            console.error(`❌ API Error: \${method} $\{url\}`, error);
            
            // Handle specific error cases
            if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                this.setSessionToken(null); // Clear invalid token
                throw new Error('Session expired. Please login again.');
            }
            
            throw error;
        }
    }

    /**
     * Orchestrator API calls
     */
    async orchestrate(topic, options = {}) {
        const request = {
            topic: topic,
            urgency: options.urgency || 'medium',
            quality_level: options.quality_level || 'standard',
            optimize_for: options.optimize_for || 'balanced',
            enable_parallel_processing: options.enable_parallel_processing !== false,
            budget_limit: options.budget_limit || 2.0,
            source_discovery_depth: options.source_discovery_depth || 5,
            max_articles: options.max_articles || 20,
            time_range: options.time_range || '30d'
        };

        return await this.callWorker('orchestrator', '/orchestrate', request);
    }

    async getOrchestratorStatus() {
        return await this.callWorker('orchestrator', '/status', null, { method: 'GET' });
    }

    async getOrchestratorAnalytics() {
        return await this.callWorker('orchestrator', '/analytics', null, { method: 'GET' });
    }

    async getRecentActivity() {
        return await this.callWorker('orchestrator', '/recent-activity', null, { method: 'GET' });
    }

    async clearCache() {
        return await this.callWorker('orchestrator', '/clear-cache', {});
    }

    /**
     * Topic Researcher API calls
     */
    async researchTopic(topic, options = {}) {
        const request = {
            topic: topic,
            depth: options.depth || 'standard',
            max_sources: options.max_sources || 10,
            include_social_media: options.include_social_media || false,
            language: options.language || 'en'
        };

        return await this.callWorker('topic-researcher', '/research', request);
    }

    async getTopicResearcherStatus() {
        return await this.callWorker('topic-researcher', '/status', null, { method: 'GET' });
    }

    async getTopicSuggestions(partial) {
        return await this.callWorker('topic-researcher', '/suggest', { partial: partial });
    }

    /**
     * RSS Librarian API calls
     */
    async findRSSSources(topic, options = {}) {
        const request = {
            topic: topic,
            max_sources: options.max_sources || 20,
            quality_threshold: options.quality_threshold || 0.7,
            include_niche_sources: options.include_niche_sources || true
        };

        return await this.callWorker('rss-librarian', '/find-sources', request);
    }

    async getRSSLibrarianStatus() {
        return await this.callWorker('rss-librarian', '/status', null, { method: 'GET' });
    }

    async validateRSSFeed(url) {
        return await this.callWorker('rss-librarian', '/validate', { url: url });
    }

    /**
     * Feed Fetcher API calls
     */
    async fetchFeeds(sources, options = {}) {
        const request = {
            sources: sources,
            max_articles_per_source: options.max_articles_per_source || 10,
            time_range: options.time_range || '7d',
            include_content: options.include_content !== false
        };

        return await this.callWorker('feed-fetcher', '/fetch', request);
    }

    async getFeedFetcherStatus() {
        return await this.callWorker('feed-fetcher', '/status', null, { method: 'GET' });
    }

    /**
     * Content Classifier API calls
     */
    async classifyContent(articles, options = {}) {
        const request = {
            articles: articles,
            classification_types: options.classification_types || ['sentiment', 'topic', 'quality'],
            include_summary: options.include_summary !== false,
            language: options.language || 'en'
        };

        return await this.callWorker('content-classifier', '/classify', request);
    }

    async getContentClassifierStatus() {
        return await this.callWorker('content-classifier', '/status', null, { method: 'GET' });
    }

    /**
     * Report Builder API calls
     */
    async buildReport(data, options = {}) {
        const request = {
            data: data,
            format: options.format || 'html',
            template: options.template || 'standard',
            include_charts: options.include_charts !== false,
            include_sources: options.include_sources !== false
        };

        return await this.callWorker('report-builder', '/build', request);
    }

    async getReportBuilderStatus() {
        return await this.callWorker('report-builder', '/status', null, { method: 'GET' });
    }

    async getReportTemplates() {
        return await this.callWorker('report-builder', '/templates', null, { method: 'GET' });
    }

    /**
     * Utility methods
     */
    async healthCheck() {
        try {
            const results = await Promise.allSettled([
                this.getOrchestratorStatus(),
                this.getTopicResearcherStatus(),
                this.getRSSLibrarianStatus(),
                this.getFeedFetcherStatus(),
                this.getContentClassifierStatus(),
                this.getReportBuilderStatus()
            ]);

            return {
                orchestrator: this.extractResult(results[0]),
                topicResearcher: this.extractResult(results[1]),
                rssLibrarian: this.extractResult(results[2]),
                feedFetcher: this.extractResult(results[3]),
                contentClassifier: this.extractResult(results[4]),
                reportBuilder: this.extractResult(results[5])
            };
        } catch (error) {
            console.error('Health check failed:', error);
            throw error;
        }
    }

    extractResult(settledResult) {
        if (settledResult.status === 'fulfilled') {
            return { status: 'healthy', data: settledResult.value };
        } else {
            return { status: 'unhealthy', error: settledResult.reason.message };
        }
    }

    /**
     * Pipeline helper methods
     */
    async runFullPipeline(topic, options = {}) {
        try {
            console.log(`🚀 Starting full pipeline for topic: \${topic}`);
            
            // Step 1: Start orchestration
            const orchestrationResult = await this.orchestrate(topic, options);
            
            if (!orchestrationResult.success) {
                throw new Error(`Orchestration failed: $\{orchestrationResult.error\}`);
            }

            console.log(`✅ Pipeline completed: $\{orchestrationResult.pipeline_id\}`);
            return orchestrationResult;

        } catch (error) {
            console.error('Full pipeline failed:', error);
            throw error;
        }
    }

    /**
     * Error handling helpers
     */
    isAuthenticationError(error) {
        return error.message.includes('401') || 
               error.message.includes('Unauthorized') ||
               error.message.includes('Session expired');
    }

    isNetworkError(error) {
        return error.message.includes('fetch') || 
               error.message.includes('NetworkError') ||
               error.message.includes('Failed to fetch');
    }

    /**
     * Request timeout helper
     */
    async callWorkerWithTimeout(workerName, endpoint, data, timeout = 30000) {
        return Promise.race([
            this.callWorker(workerName, endpoint, data),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), timeout)
            )
        ]);
    }
}

// Make API client available globally
window.AIFactoryAPI = AIFactoryAPI;
`;