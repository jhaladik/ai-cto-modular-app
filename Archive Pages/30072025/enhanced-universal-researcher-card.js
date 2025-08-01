// Enhanced Universal Researcher Card with KAM Context Integration
// File: Pages/public/js/components/enhanced-universal-researcher-card.js

class EnhancedUniversalResearcherCard extends WorkerCard {
    constructor(config) {
        super({
            workerId: 'universal-researcher',
            name: 'Universal Researcher',
            icon: '🔬',
            ...config
        });
        
        this.kamContext = null;
        this.availableTemplates = [];
        this.selectedTemplate = 'search_rss'; // Default template
        this.isClient = config.userContext?.isAdmin === false;
        this.tier = config.userContext?.tier || 'basic';
        this.limitations = config.userContext?.limitations || {};
    }

    async mount() {
        console.log('🔄 Mounting Enhanced Universal Researcher Card...');
        
        try {
            // Initialize KAM context first
            await this.initializeKAMContext();
            
            // Load available templates
            await this.loadAvailableTemplates();
            
            // Call parent mount to render interface
            await super.mount();
            
            // Set up event listeners for KAM context updates
            this.setupKAMContextListeners();
            
            console.log('✅ Enhanced Universal Researcher Card mounted successfully');
            
        } catch (error) {
            console.error('❌ Failed to mount Universal Researcher Card:', error);
            this.showError(error);
        }
    }

    setupKAMContextListeners() {
        // Listen for KAM context updates
        window.addEventListener('kamContextReady', (event) => {
            console.log('🔄 KAM context became ready, refreshing Universal Researcher...');
            this.refreshKAMContext(event.detail);
        });
        
        window.addEventListener('kamContextUpdated', (event) => {
            console.log('🔄 KAM context updated, refreshing Universal Researcher...');
            this.refreshKAMContext(event.detail);
        });
    }

    async refreshKAMContext(newContext) {
        if (newContext && !newContext.fallback) {
            console.log('✅ Updating Universal Researcher with new KAM context:', newContext);
            this.kamContext = {
                ...newContext,
                subscription_tier: newContext.subscription_tier || this.tier || 'basic'
            };
            
            // Reload templates with new context
            await this.loadAvailableTemplates();
            
            // Re-render interface
            await this.loadInterface();
        }
    }

    async initializeKAMContext() {
        try {
            console.log('🔄 Initializing KAM context for Universal Researcher...');
            
            // Wait for session manager to be ready
            let attempts = 0;
            const maxAttempts = 10;
            
            while (attempts < maxAttempts) {
                if (window.sessionManager && window.sessionManager.sessionData) {
                    break;
                }
                console.log(`⏳ Waiting for session manager... (${attempts + 1}/${maxAttempts})`);
                await new Promise(resolve => setTimeout(resolve, 200));
                attempts++;
            }
            
            if (!window.sessionManager) {
                throw new Error('Session manager not available');
            }
            
            // Get session data
            const sessionData = window.sessionManager.sessionData;
            console.log('📊 Session data available:', !!sessionData);
            console.log('📊 User info:', sessionData?.user);
            console.log('📊 KAM context in session:', sessionData?.kamContext);
            
            // Check if session manager has getSessionToken method, if not add it
            if (!window.sessionManager.getSessionToken) {
                console.log('🔧 Adding missing getSessionToken method...');
                window.sessionManager.getSessionToken = function() {
                    return this.sessionData?.token || localStorage.getItem('bitware-session-token');
                };
            }
            
            const sessionToken = window.sessionManager.getSessionToken();
            console.log('📊 Session Token available:', !!sessionToken);
            
            // Use KAM context from session if available and valid
            if (sessionData?.kamContext && !sessionData.kamContext.fallback) {
                this.kamContext = {
                    ...sessionData.kamContext,
                    subscription_tier: sessionData.kamContext.subscription_tier || this.tier || 'basic'
                };
                console.log('✅ Universal Researcher: Using session KAM context', this.kamContext);
                return;
            }
            
            // Try to fetch client data from KAM worker if we have a session token
            if (sessionToken && sessionData?.user?.email && sessionData?.user?.role === 'client') {
                console.log('🔄 Attempting client lookup for:', sessionData.user.email);
                
                try {
                    const response = await fetch(`/api/key-account-manager/client?email=${encodeURIComponent(sessionData.user.email)}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Session-Token': sessionToken
                        }
                    });
                    
                    if (response.ok) {
                        const clientData = await response.json();
                        if (clientData && clientData.client_id) {
                            this.kamContext = {
                                client_id: clientData.client_id,
                                company_name: clientData.company_name,
                                subscription_tier: clientData.subscription_tier || 'basic',
                                monthly_budget_usd: clientData.monthly_budget_usd || 100,
                                permissions: clientData.permissions || [],
                                preferences: clientData.preferences || {},
                                loaded: new Date(),
                                fallback: false
                            };
                            
                            // Update session manager with this context
                            if (window.sessionManager.sessionData) {
                                window.sessionManager.sessionData.kamContext = this.kamContext;
                                localStorage.setItem('bitware-kam-context', JSON.stringify(this.kamContext));
                            }
                            
                            console.log('✅ Universal Researcher: Client data loaded from KAM worker', this.kamContext);
                            return;
                        }
                    } else {
                        console.log(`⚠️ Client lookup failed with status: ${response.status}`);
                    }
                } catch (error) {
                    console.log('⚠️ Client lookup failed:', error.message);
                }
            }
            
            // Create proper fallback context based on user type
            const user = sessionData?.user;
            const isAdmin = user?.role === 'admin';
            
            this.kamContext = {
                client_id: isAdmin ? 'admin_session' : 'fallback_client',
                company_name: isAdmin ? 'AI Factory Admin' : (user?.email ? `Client (${user.email})` : 'Unknown Client'),
                subscription_tier: isAdmin ? 'enterprise' : (this.tier || 'basic'),
                monthly_budget_usd: isAdmin ? 10000 : 100,
                fallback: true,
                user_role: user?.role || 'unknown',
                reason: sessionToken ? 'client_lookup_failed' : 'no_session_token'
            };
            
            console.log('⚠️ Universal Researcher: Using enhanced fallback KAM context', this.kamContext);
            
        } catch (error) {
            console.error('❌ Failed to initialize KAM context:', error);
            
            // Emergency fallback
            this.kamContext = {
                client_id: 'error_client',
                company_name: 'Error Loading Client',
                subscription_tier: this.tier || 'basic',
                monthly_budget_usd: 100,
                fallback: true,
                error: error.message
            };
        }
    }

    async loadAvailableTemplates() {
        try {
            const response = await this.apiClient.workerRequest('universal-researcher', '/templates');
            if (response && response.templates) {
                this.availableTemplates = this.filterTemplatesByTier(response.templates);
            } else {
                // Fallback templates
                this.availableTemplates = this.getDefaultTemplates();
            }
        } catch (error) {
            console.warn('⚠️ Failed to load templates, using defaults:', error);
            this.availableTemplates = this.getDefaultTemplates();
        }
    }

    filterTemplatesByTier(templates) {
        // Filter templates based on subscription tier
        const tierAccess = {
            'basic': ['search_rss'],
            'standard': ['search_rss', 'search_youtube'],
            'premium': ['search_rss', 'search_youtube', 'search_all'],
            'enterprise': ['search_rss', 'search_youtube', 'search_all', 'search_academic']
        };
        
        const allowedTemplates = tierAccess[this.tier] || tierAccess.basic;
        
        return templates.filter(template => 
            allowedTemplates.includes(template.capability) || 
            this.kamContext?.subscription_tier === 'enterprise'
        );
    }

    getDefaultTemplates() {
        const allTemplates = [
            {
                capability: 'search_rss',
                name: 'RSS Discovery',
                description: 'Discover RSS feeds and news sources',
                icon: '📰',
                status: 'ready',
                tier_required: 'basic'
            },
            {
                capability: 'search_youtube',
                name: 'YouTube Discovery',
                description: 'Find YouTube channels and videos',
                icon: '🎥',
                status: 'ready',
                tier_required: 'standard'
            },
            {
                capability: 'search_all',
                name: 'Multi-Platform',
                description: 'Search across all platforms',
                icon: '🌐',
                status: 'ready',
                tier_required: 'premium'
            },
            {
                capability: 'search_academic',
                name: 'Academic Sources',
                description: 'Scholarly articles and papers',
                icon: '🎓',
                status: 'coming_soon',
                tier_required: 'enterprise'
            }
        ];

        return this.filterTemplatesByTier(allTemplates);
    }

    async loadInterface() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        const templates = this.availableTemplates;
        const hasTemplates = templates.length > 0;
        
        container.innerHTML = `
            <div class="worker-interface">
                <!-- KAM Context Display -->
                <div class="kam-context-info">
                    <div class="context-item">
                        <span class="context-label">Client:</span>
                        <span class="context-value">${this.kamContext?.company_name || 'Loading...'}</span>
                    </div>
                    <div class="context-item">
                        <span class="context-label">Tier:</span>
                        <span class="context-value tier-${this.tier}">${this.formatTierName(this.tier)}</span>
                    </div>
                    <div class="context-item">
                        <span class="context-label">Client ID:</span>
                        <span class="context-value">${this.kamContext?.client_id || 'unknown'}</span>
                    </div>
                    ${this.kamContext?.fallback ? `
                        <div class="context-warning">
                            ⚠️ Using fallback context${this.kamContext?.reason ? ` (${this.kamContext.reason})` : ''}
                            <button class="btn-link btn-small" onclick="window.workerRegistry?.get('${this.workerId}')?.debugKAMContext()">
                                🔍 Debug
                            </button>
                            <button class="btn-link btn-small" onclick="window.workerRegistry?.get('${this.workerId}')?.refreshKAMContext()">
                                🔄 Refresh
                            </button>
                        </div>
                    ` : '<div class="context-success">✅ KAM context loaded successfully</div>'}
                </div>

                <!-- Template Selection -->
                <div class="form-group">
                    <label class="form-label">Research Template</label>
                    <div class="template-grid">
                        ${templates.map(template => this.renderTemplateCard(template)).join('')}
                    </div>
                </div>

                <!-- Research Configuration -->
                <div class="form-group">
                    <label class="form-label">Research Topic</label>
                    <input type="text" class="form-input" id="research-topic-${this.workerId}" 
                           placeholder="Enter research topic..." required>
                    <div class="form-help">Describe what you want to research in detail</div>
                </div>

                <!-- Advanced Options -->
                <div class="form-group advanced-options" style="display: none;">
                    <label class="form-label">Quality Threshold</label>
                    <select class="form-input" id="quality-threshold-${this.workerId}">
                        <option value="0.6">Standard (0.6)</option>
                        <option value="0.7" selected>High (0.7)</option>
                        <option value="0.8">Premium (0.8)</option>
                    </select>
                </div>

                <!-- Tier Limitations -->
                ${this.renderTierLimitations()}

                <!-- Actions -->
                <div class="worker-actions">
                    <button class="btn btn-primary" onclick="window.workerRegistry?.get('${this.workerId}')?.executeResearch()">
                        🔬 Execute Research
                    </button>
                    <button class="btn btn-secondary btn-small" onclick="window.workerRegistry?.get('${this.workerId}')?.toggleAdvanced()">
                        ⚙️ Advanced
                    </button>
                    <button class="btn btn-secondary btn-small" onclick="window.workerRegistry?.get('${this.workerId}')?.showHistory()">
                        📚 History
                    </button>
                </div>

                <!-- Results Container -->
                <div class="results-container" id="results-${this.workerId}" style="display: none;">
                    <!-- Results will be populated here -->
                </div>

                <!-- Loading State -->
                <div class="loading-state" id="loading-${this.workerId}" style="display: none;">
                    <div class="loading-spinner">🔄</div>
                    <div class="loading-text">Executing research...</div>
                    <div class="loading-progress">
                        <div class="progress-bar" id="progress-${this.workerId}"></div>
                    </div>
                </div>
            </div>
        `;

        // Set up template selection handlers
        this.setupTemplateSelection();
    }

    renderTemplateCard(template) {
        const isSelected = template.capability === this.selectedTemplate;
        const isAvailable = template.status === 'ready';
        const isLocked = !this.canAccessTemplate(template);
        
        return `
            <div class="template-card ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}" 
                 data-template="${template.capability}"
                 ${isAvailable && !isLocked ? `onclick="window.workerRegistry?.get('${this.workerId}')?.selectTemplate('${template.capability}')"` : ''}>
                <div class="template-icon">${template.icon}</div>
                <div class="template-name">${template.name}</div>
                <div class="template-description">${template.description}</div>
                ${isLocked ? '<div class="template-lock">🔒 Upgrade Required</div>' : ''}
                ${template.status === 'coming_soon' ? '<div class="template-status">Coming Soon</div>' : ''}
            </div>
        `;
    }

    renderTierLimitations() {
        if (!this.isClient || !this.limitations.max_requests_per_day) {
            return '';
        }

        return `
            <div class="tier-limitations">
                <div class="limitation-header">
                    <span class="tier-badge">${this.formatTierName(this.tier)}</span>
                    Plan Limits
                </div>
                <div class="limitation-grid">
                    <div class="limitation-item">
                        <span class="limitation-label">Daily Requests:</span>
                        <span class="limitation-value">${this.limitations.max_requests_per_day}</span>
                    </div>
                    <div class="limitation-item">
                        <span class="limitation-label">Sources per Request:</span>
                        <span class="limitation-value">${this.limitations.max_sources_per_request || 'Unlimited'}</span>
                    </div>
                </div>
                ${this.tier !== 'enterprise' ? `
                    <div class="upgrade-prompt">
                        <button class="btn btn-upgrade btn-small" onclick="window.kamRouter?.navigate('/upgrade')">
                            ⬆️ Upgrade for More
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    setupTemplateSelection() {
        const templateCards = document.querySelectorAll(`#${this.containerId} .template-card`);
        templateCards.forEach(card => {
            if (!card.classList.contains('locked')) {
                card.addEventListener('click', () => {
                    const template = card.dataset.template;
                    this.selectTemplate(template);
                });
            }
        });
    }

    selectTemplate(templateId) {
        if (!this.canAccessTemplate({ capability: templateId })) {
            this.showUpgradeModal(templateId);
            return;
        }

        this.selectedTemplate = templateId;
        
        // Update UI
        const container = document.getElementById(this.containerId);
        if (container) {
            container.querySelectorAll('.template-card').forEach(card => {
                card.classList.remove('selected');
                if (card.dataset.template === templateId) {
                    card.classList.add('selected');
                }
            });
        }

        console.log(`✅ Template selected: ${templateId}`);
    }

    canAccessTemplate(template) {
        const tierLevels = {
            'basic': 1,
            'standard': 2,
            'premium': 3,
            'enterprise': 4
        };

        const requiredLevel = tierLevels[template.tier_required] || 1;
        const userLevel = tierLevels[this.tier] || 1;

        return userLevel >= requiredLevel || this.kamContext?.subscription_tier === 'enterprise';
    }

    async executeResearch() {
        const topicInput = document.getElementById(`research-topic-${this.workerId}`);
        const qualitySelect = document.getElementById(`quality-threshold-${this.workerId}`);
        
        if (!topicInput?.value?.trim()) {
            this.showError('Please enter a research topic');
            return;
        }

        const topic = topicInput.value.trim();
        const qualityThreshold = qualitySelect?.value || '0.7';

        // Check tier limitations
        if (this.isClient && this.limitations.max_requests_per_day > 0) {
            // TODO: Implement actual usage checking
            console.log(`Checking against ${this.limitations.max_requests_per_day} requests/day limit`);
        }

        // Show loading state
        this.showLoading();

        try {
            // Prepare request with KAM context
            const requestBody = {
                context: {
                    client_id: this.kamContext?.client_id || 'unknown_client',
                    request_id: `req_${Date.now()}`,
                    pipeline_id: `pipe_${Date.now()}`,
                    billing_tier: this.tier,
                    session_token: window.sessionManager?.getSessionToken?.() || 'no_session'
                },
                template: {
                    capability: this.selectedTemplate,
                    parameters: {
                        quality_threshold: parseFloat(qualityThreshold),
                        max_sources: this.limitations.max_sources_per_request || 20
                    },
                    output_format: 'standard'
                },
                data: {
                    topic: topic
                }
            };

            console.log('🔬 Executing research with KAM context:', requestBody);

            // Execute research through the Pages function proxy
            const sessionToken = window.sessionManager?.getSessionToken?.() || localStorage.getItem('bitware-session-token');
            console.log('🔬 Using session token for research:', !!sessionToken);
            
            const response = await fetch('/api/universal-researcher/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Token': sessionToken || ''
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`Research failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.status === 'ok') {
                this.displayResults(result);
            } else {
                throw new Error(result.error || 'Research execution failed');
            }

        } catch (error) {
            console.error('❌ Research execution failed:', error);
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    displayResults(result) {
        const resultsContainer = document.getElementById(`results-${this.workerId}`);
        if (!resultsContainer) return;

        const data = result.data || {};
        const metrics = result.metrics || {};

        resultsContainer.innerHTML = `
            <div class="results-header">
                <h4>🎯 Research Results</h4>
                <div class="results-meta">
                    Template: ${this.selectedTemplate} • 
                    Sources: ${data.sources?.length || 0} • 
                    Quality: ${(metrics.avg_quality_score || 0).toFixed(2)} •
                    Time: ${metrics.execution_time_ms || 0}ms
                </div>
            </div>

            ${data.platform_breakdown ? this.renderPlatformBreakdown(data.platform_breakdown) : ''}

            <div class="sources-grid">
                ${(data.sources || []).map(source => this.renderSourceCard(source)).join('')}
            </div>

            <div class="results-actions">
                <button class="btn btn-secondary btn-small" onclick="window.workerRegistry?.get('${this.workerId}')?.exportResults()">
                    📄 Export Results
                </button>
                <button class="btn btn-secondary btn-small" onclick="window.workerRegistry?.get('${this.workerId}')?.saveToHistory()">
                    💾 Save to History
                </button>
            </div>
        `;

        resultsContainer.style.display = 'block';
    }

    renderPlatformBreakdown(breakdown) {
        return `
            <div class="platform-breakdown">
                <h5>📊 Platform Breakdown</h5>
                <div class="breakdown-grid">
                    ${Object.entries(breakdown).map(([platform, count]) => `
                        <div class="breakdown-item">
                            <span class="platform-name">${platform.toUpperCase()}</span>
                            <span class="platform-count">${count}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderSourceCard(source) {
        return `
            <div class="source-card">
                <div class="source-header">
                    <div class="source-title">${source.title || 'Untitled'}</div>
                    <div class="source-quality">⭐ ${(source.quality_score || 0).toFixed(2)}</div>
                </div>
                <div class="source-url">
                    <a href="${source.url}" target="_blank" rel="noopener">${source.url}</a>
                </div>
                <div class="source-description">${source.description || 'No description available'}</div>
                <div class="source-platform">
                    <span class="platform-badge">${source.platform || 'Unknown'}</span>
                </div>
            </div>
        `;
    }

    toggleAdvanced() {
        const advancedOptions = document.querySelector(`#${this.containerId} .advanced-options`);
        if (advancedOptions) {
            const isVisible = advancedOptions.style.display !== 'none';
            advancedOptions.style.display = isVisible ? 'none' : 'block';
        }
    }

    showHistory() {
        // TODO: Implement history viewing
        console.log('📚 Showing research history...');
    }

    showLoading() {
        const loading = document.getElementById(`loading-${this.workerId}`);
        const results = document.getElementById(`results-${this.workerId}`);
        
        if (loading) loading.style.display = 'block';
        if (results) results.style.display = 'none';

        // Simulate progress
        let progress = 0;
        const progressBar = document.getElementById(`progress-${this.workerId}`);
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 95) {
                clearInterval(interval);
                progress = 95;
            }
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
            }
        }, 200);
    }

    hideLoading() {
        const loading = document.getElementById(`loading-${this.workerId}`);
        if (loading) loading.style.display = 'none';
    }

    showUpgradeModal(templateId) {
        // TODO: Implement upgrade modal
        alert(`This template requires a higher subscription tier. Current: ${this.tier}`);
    }

    formatTierName(tier) {
        const tierNames = {
            'basic': '🥉 Basic',
            'standard': '🥈 Standard', 
            'premium': '🥇 Premium',
            'enterprise': '💎 Enterprise'
        };
        return tierNames[tier] || '🥉 Basic';
    }

    exportResults() {
        // TODO: Implement results export
        console.log('📄 Exporting results...');
    }

    saveToHistory() {
        // TODO: Implement save to history
        console.log('💾 Saving to history...');
    }

    debugKAMContext() {
        console.log('🔍 KAM Context Debug Information:');
        console.log('Current KAM Context:', this.kamContext);
        console.log('Session Manager Available:', !!window.sessionManager);
        console.log('Session Data:', window.sessionManager?.sessionData);
        console.log('Session KAM Context:', window.sessionManager?.sessionData?.kamContext);
        console.log('User Info:', window.sessionManager?.sessionData?.user);
        
        const sessionToken = window.sessionManager?.getSessionToken?.() || localStorage.getItem('bitware-session-token');
        console.log('Session Token Available:', !!sessionToken);
        console.log('Session Token Value:', sessionToken ? `${sessionToken.substring(0, 8)}...` : 'None');
        
        // Test KAM worker connectivity
        if (sessionToken && window.sessionManager?.sessionData?.user?.email) {
            const email = window.sessionManager.sessionData.user.email;
            console.log('Testing KAM worker connectivity...');
            
            fetch(`/api/key-account-manager/client?email=${encodeURIComponent(email)}`, {
                headers: {
                    'X-Session-Token': sessionToken
                }
            }).then(r => {
                console.log('KAM Worker Response Status:', r.status);
                return r.json();
            }).then(data => {
                console.log('KAM Worker Response:', data);
            }).catch(error => {
                console.log('KAM Worker Error:', error);
            });
        }
        
        // Show debug modal
        const fallbackReason = this.kamContext?.reason || 'unknown';
        const debugInfo = `KAM Context Debug Information:

=== Current Context ===
Client: ${this.kamContext?.company_name || 'None'}
Client ID: ${this.kamContext?.client_id || 'None'}
Tier: ${this.kamContext?.subscription_tier || 'None'}
Is Fallback: ${this.kamContext?.fallback ? 'Yes' : 'No'}
Fallback Reason: ${fallbackReason}

=== Session Information ===
Session Manager: ${!!window.sessionManager ? 'Available' : 'Not Available'}
Session Token: ${!!sessionToken ? 'Available' : 'Missing'}
User Role: ${window.sessionManager?.sessionData?.user?.role || 'Unknown'}
User Email: ${window.sessionManager?.sessionData?.user?.email || 'Unknown'}
KAM Context in Session: ${!!window.sessionManager?.sessionData?.kamContext ? 'Available' : 'Missing'}

=== Next Steps ===
${this.getDebugRecommendations(fallbackReason)}

Check browser console for detailed logs and network requests.`;
        
        alert(debugInfo);
    }

    getDebugRecommendations(reason) {
        switch (reason) {
            case 'no_session_token':
                return '1. Check if login completed successfully\n2. Check localStorage for bitware-session-token\n3. Try refreshing the page';
            case 'client_lookup_failed':
                return '1. Check if KAM worker is deployed\n2. Check if client record exists in database\n3. Check API endpoint /api/key-account-manager/client';
            default:
                return '1. Check browser console for errors\n2. Try clicking the Refresh button\n3. Try logging out and back in';
        }
    }

    async refreshKAMContext() {
        console.log('🔄 Manually refreshing KAM context...');
        
        try {
            // Force re-initialize KAM context
            await this.initializeKAMContext();
            
            // Reload templates
            await this.loadAvailableTemplates();
            
            // Re-render interface
            await this.loadInterface();
            
            console.log('✅ KAM context refreshed successfully');
            
        } catch (error) {
            console.error('❌ Failed to refresh KAM context:', error);
            alert('Failed to refresh KAM context. Check console for details.');
        }
    }
}

// Enhanced Client Version
class EnhancedClientUniversalResearcherCard extends EnhancedUniversalResearcherCard {
    constructor(config) {
        super({
            ...config,
            userContext: {
                ...config.userContext,
                isAdmin: false
            }
        });
    }

    async executeResearch() {
        // Add client-specific validation
        if (this.limitations.max_requests_per_day > 0) {
            // TODO: Check actual daily usage
            console.log(`Client validation: ${this.limitations.max_requests_per_day} requests/day limit`);
        }

        // Call parent implementation
        return super.executeResearch();
    }
}

// Export to global scope
window.EnhancedUniversalResearcherCard = EnhancedUniversalResearcherCard;
window.EnhancedClientUniversalResearcherCard = EnhancedClientUniversalResearcherCard;