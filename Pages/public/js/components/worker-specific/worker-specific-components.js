/**
 * Phase 2: Worker-Specific Shared Components
 * Specialized components used across multiple workers
 */

// =============================================================================
// TEMPLATE GALLERY COMPONENT
// =============================================================================

/**
 * Template selection gallery with tier-based filtering
 * Used by workers that support multiple processing templates
 */
class TemplateGalleryWidget {
    constructor(config = {}) {
        this.id = config.id || `template-gallery-${Date.now()}`;
        this.workerId = config.workerId;
        this.kamContext = config.kamContext;
        this.templates = config.templates || [];
        this.selectedTemplate = config.defaultTemplate || null;
        this.onSelectionChange = config.onSelectionChange || (() => {});
        
        this.layout = config.layout || 'grid'; // 'grid' or 'list'
        this.showDescription = config.showDescription !== false;
        this.showCost = config.showCost !== false;
    }

    async render() {
        // Load templates if not provided
        if (this.templates.length === 0) {
            await this.loadTemplates();
        }

        return `
            <div class="template-gallery" id="${this.id}">
                <div class="gallery-header">
                    <h4>📋 Select Template</h4>
                    <div class="gallery-controls">
                        <button class="layout-toggle" onclick="this.toggleLayout()">
                            ${this.layout === 'grid' ? '📋' : '⊞'}
                        </button>
                    </div>
                </div>
                
                <div class="template-container ${this.layout}">
                    ${this.renderTemplates()}
                </div>
                
                ${this.selectedTemplate ? this.renderTemplateDetails() : ''}
            </div>
        `;
    }

    renderTemplates() {
        const availableTemplates = this.filterTemplatesByTier();
        
        if (availableTemplates.length === 0) {
            return this.renderEmptyState();
        }

        return availableTemplates.map(template => this.renderTemplate(template)).join('');
    }

    renderTemplate(template) {
        const isSelected = this.selectedTemplate === template.id;
        const isAvailable = this.isTemplateAvailable(template);
        
        return `
            <div class="template-card ${isSelected ? 'selected' : ''} ${!isAvailable ? 'disabled' : ''}"
                 onclick="${isAvailable ? `this.selectTemplate('${template.id}')` : `this.showUpgradePrompt('${template.tier}')`}">
                
                <div class="template-header">
                    <div class="template-icon">${template.icon || '📄'}</div>
                    <div class="template-title">${template.name}</div>
                    ${!isAvailable ? '<div class="template-lock">🔒</div>' : ''}
                </div>
                
                ${this.showDescription ? `
                    <div class="template-description">
                        ${template.description || 'No description available'}
                    </div>
                ` : ''}
                
                <div class="template-meta">
                    <div class="template-tier">
                        <span class="tier-badge tier-${template.tier}">${template.tier.toUpperCase()}</span>
                    </div>
                    ${this.showCost ? `
                        <div class="template-cost">
                            <span class="cost-label">~$${template.estimated_cost || '0.00'}</span>
                        </div>
                    ` : ''}
                </div>
                
                ${template.tags ? `
                    <div class="template-tags">
                        ${template.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderTemplateDetails() {
        const template = this.templates.find(t => t.id === this.selectedTemplate);
        if (!template) return '';

        return `
            <div class="template-details">
                <h5>Template Configuration</h5>
                <div class="template-info">
                    <p><strong>Name:</strong> ${template.name}</p>
                    <p><strong>Description:</strong> ${template.description || 'No description'}</p>
                    <p><strong>Estimated Cost:</strong> $${template.estimated_cost || '0.00'}</p>
                    <p><strong>Processing Time:</strong> ${template.estimated_time || 'Unknown'}</p>
                </div>
                
                ${template.parameters ? this.renderTemplateParameters(template) : ''}
            </div>
        `;
    }

    renderTemplateParameters(template) {
        return `
            <div class="template-parameters">
                <h6>Parameters</h6>
                <div class="parameter-list">
                    ${template.parameters.map(param => `
                        <div class="parameter-item">
                            <strong>${param.name}:</strong> 
                            <span class="param-type">(${param.type})</span>
                            <span class="param-description">${param.description || ''}</span>
                            ${param.required ? '<span class="param-required">*</span>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">📄</div>
                <h4>No templates available</h4>
                <p>Templates will appear here when available for your subscription tier.</p>
            </div>
        `;
    }

    async loadTemplates() {
        try {
            // Get templates from worker API or KAM recommendations
            const response = await window.apiClient.callWorker(this.workerId, '/templates');
            this.templates = Array.isArray(response) ? response : response.templates || [];
            
            // Add default templates if none returned
            if (this.templates.length === 0) {
                this.templates = this.getDefaultTemplates();
            }
            
        } catch (error) {
            console.warn(`Could not load templates for ${this.workerId}:`, error);
            this.templates = this.getDefaultTemplates();
        }
    }

    getDefaultTemplates() {
        // Default templates based on worker type
        const defaultsByWorker = {
            'universal-researcher': [
                {
                    id: 'search_rss',
                    name: 'RSS Search',
                    description: 'Search and analyze RSS feeds',
                    tier: 'basic',
                    estimated_cost: 0.05,
                    estimated_time: '2-3 minutes',
                    icon: '📡',
                    tags: ['search', 'rss']
                },
                {
                    id: 'deep_research',
                    name: 'Deep Research',
                    description: 'Comprehensive multi-source research',
                    tier: 'premium',
                    estimated_cost: 0.25,
                    estimated_time: '5-10 minutes',
                    icon: '🔬',
                    tags: ['research', 'comprehensive']
                }
            ],
            'content-classifier': [
                {
                    id: 'basic_classification',
                    name: 'Basic Classification',
                    description: 'Simple content categorization',
                    tier: 'basic',
                    estimated_cost: 0.02,
                    estimated_time: '1-2 minutes',
                    icon: '🏷️',
                    tags: ['classification', 'basic']
                },
                {
                    id: 'advanced_analysis',
                    name: 'Advanced Analysis',
                    description: 'Deep content analysis with sentiment',
                    tier: 'standard',
                    estimated_cost: 0.08,
                    estimated_time: '3-5 minutes',
                    icon: '🧠',
                    tags: ['analysis', 'sentiment']
                }
            ]
        };

        return defaultsByWorker[this.workerId] || [];
    }

    async filterTemplatesByTier() {
        if (!this.kamContext) return this.templates;

        try {
            const tier = await this.kamContext.getSubscriptionTier();
            const tierHierarchy = ['basic', 'standard', 'premium', 'enterprise'];
            const userTierIndex = tierHierarchy.indexOf(tier);
            
            return this.templates.filter(template => {
                const templateTierIndex = tierHierarchy.indexOf(template.tier);
                return templateTierIndex <= userTierIndex;
            });
        } catch (error) {
            console.warn('Could not filter templates by tier:', error);
            return this.templates;
        }
    }

    async isTemplateAvailable(template) {
        if (!this.kamContext) return true;

        try {
            const tier = await this.kamContext.getSubscriptionTier();
            const tierHierarchy = ['basic', 'standard', 'premium', 'enterprise'];
            const userTierIndex = tierHierarchy.indexOf(tier);
            const templateTierIndex = tierHierarchy.indexOf(template.tier);
            
            return templateTierIndex <= userTierIndex;
        } catch (error) {
            return true; // Default to available if check fails
        }
    }

    selectTemplate(templateId) {
        this.selectedTemplate = templateId;
        this.onSelectionChange(templateId);
        this.updateDisplay();
    }

    toggleLayout() {
        this.layout = this.layout === 'grid' ? 'list' : 'grid';
        this.updateDisplay();
    }

    showUpgradePrompt(requiredTier) {
        alert(`This template requires ${requiredTier.toUpperCase()} subscription. Please upgrade to access this feature.`);
    }

    updateDisplay() {
        const container = document.getElementById(this.id);
        if (container) {
            container.outerHTML = this.render();
        }
    }

    getSelectedTemplate() {
        return this.templates.find(t => t.id === this.selectedTemplate);
    }
}

// =============================================================================
// PARAMETER BUILDER COMPONENT
// =============================================================================

/**
 * Dynamic parameter configuration builder
 * Builds forms based on template or worker requirements
 */
class ParameterBuilderWidget {
    constructor(config = {}) {
        this.id = config.id || `params-${Date.now()}`;
        this.parameters = config.parameters || [];
        this.values = config.values || {};
        this.kamContext = config.kamContext;
        this.onParameterChange = config.onParameterChange || (() => {});
        
        this.validation = {};
    }

    render() {
        if (this.parameters.length === 0) {
            return this.renderEmptyState();
        }

        return `
            <div class="parameter-builder" id="${this.id}">
                <div class="params-header">
                    <h4>⚙️ Parameters</h4>
                    <div class="params-actions">
                        <button class="btn btn-sm" onclick="this.resetParameters()">Reset</button>
                        <button class="btn btn-sm" onclick="this.showPresets()">Presets</button>
                    </div>
                </div>
                
                <div class="params-form">
                    ${this.parameters.map(param => this.renderParameter(param)).join('')}
                </div>
                
                <div class="params-validation" id="${this.id}-validation" style="display: none;"></div>
            </div>
        `;
    }

    renderParameter(param) {
        const value = this.values[param.name] || param.default || '';
        const hasError = this.validation[param.name]?.error;

        return `
            <div class="param-group ${hasError ? 'error' : ''}">
                <label class="param-label">
                    ${param.label || param.name}
                    ${param.required ? '<span class="required">*</span>' : ''}
                </label>
                
                ${this.renderParameterInput(param, value)}
                
                ${param.description ? `
                    <div class="param-description">${param.description}</div>
                ` : ''}
                
                ${hasError ? `
                    <div class="param-error">${this.validation[param.name].error}</div>
                ` : ''}
            </div>
        `;
    }

    renderParameterInput(param, value) {
        switch (param.type) {
            case 'text':
            case 'string':
                return `
                    <input 
                        type="text" 
                        id="${this.id}-${param.name}"
                        class="param-input"
                        value="${value}"
                        placeholder="${param.placeholder || ''}"
                        ${param.required ? 'required' : ''}
                        onchange="this.updateParameter('${param.name}', this.value)"
                    >
                `;
                
            case 'textarea':
                return `
                    <textarea 
                        id="${this.id}-${param.name}"
                        class="param-input"
                        placeholder="${param.placeholder || ''}"
                        rows="${param.rows || 3}"
                        ${param.required ? 'required' : ''}
                        onchange="this.updateParameter('${param.name}', this.value)"
                    >${value}</textarea>
                `;
                
            case 'number':
            case 'integer':
                return `
                    <input 
                        type="number" 
                        id="${this.id}-${param.name}"
                        class="param-input"
                        value="${value}"
                        min="${param.min || ''}"
                        max="${param.max || ''}"
                        step="${param.step || param.type === 'integer' ? '1' : 'any'}"
                        ${param.required ? 'required' : ''}
                        onchange="this.updateParameter('${param.name}', this.value)"
                    >
                `;
                
            case 'select':
            case 'enum':
                return `
                    <select 
                        id="${this.id}-${param.name}"
                        class="param-input"
                        ${param.required ? 'required' : ''}
                        onchange="this.updateParameter('${param.name}', this.value)"
                    >
                        ${!param.required ? '<option value="">-- Select Option --</option>' : ''}
                        ${(param.options || []).map(option => `
                            <option value="${option.value}" ${value === option.value ? 'selected' : ''}>
                                ${option.label || option.value}
                            </option>
                        `).join('')}
                    </select>
                `;
                
            case 'boolean':
                return `
                    <label class="param-checkbox">
                        <input 
                            type="checkbox" 
                            id="${this.id}-${param.name}"
                            ${value ? 'checked' : ''}
                            onchange="this.updateParameter('${param.name}', this.checked)"
                        >
                        <span class="checkbox-label">${param.checkboxLabel || 'Enable'}</span>
                    </label>
                `;
                
            case 'range':
                return `
                    <div class="range-input">
                        <input 
                            type="range" 
                            id="${this.id}-${param.name}"
                            class="param-range"
                            value="${value}"
                            min="${param.min || 0}"
                            max="${param.max || 100}"
                            step="${param.step || 1}"
                            onchange="this.updateParameter('${param.name}', this.value)"
                            oninput="this.updateRangeDisplay('${param.name}', this.value)"
                        >
                        <span class="range-value" id="${this.id}-${param.name}-value">${value}</span>
                    </div>
                `;
                
            case 'file':
                return `
                    <input 
                        type="file" 
                        id="${this.id}-${param.name}"
                        class="param-input"
                        accept="${param.accept || ''}"
                        ${param.multiple ? 'multiple' : ''}
                        ${param.required ? 'required' : ''}
                        onchange="this.handleFileUpload('${param.name}', this.files)"
                    >
                `;
                
            case 'json':
                return `
                    <textarea 
                        id="${this.id}-${param.name}"
                        class="param-input json-input"
                        placeholder="${param.placeholder || 'Enter JSON...'}"
                        rows="${param.rows || 5}"
                        ${param.required ? 'required' : ''}
                        onchange="this.updateJSONParameter('${param.name}', this.value)"
                    >${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}</textarea>
                `;
                
            default:
                return `
                    <input 
                        type="text" 
                        id="${this.id}-${param.name}"
                        class="param-input"
                        value="${value}"
                        ${param.required ? 'required' : ''}
                        onchange="this.updateParameter('${param.name}', this.value)"
                    >
                `;
        }
    }

    renderEmptyState() {
        return `
            <div class="parameter-builder empty">
                <div class="empty-state">
                    <div class="empty-icon">⚙️</div>
                    <h4>No parameters required</h4>
                    <p>This template doesn't require additional configuration.</p>
                </div>
            </div>
        `;
    }

    // Parameter update methods
    updateParameter(name, value) {
        this.values[name] = value;
        this.validateParameter(name);
        this.onParameterChange(name, value, this.values);
    }

    updateJSONParameter(name, jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            this.values[name] = parsed;
            this.clearValidationError(name);
        } catch (error) {
            this.setValidationError(name, 'Invalid JSON format');
        }
        this.onParameterChange(name, this.values[name], this.values);
    }

    updateRangeDisplay(name, value) {
        const display = document.getElementById(`${this.id}-${name}-value`);
        if (display) {
            display.textContent = value;
        }
    }

    handleFileUpload(name, files) {
        // For now, just store file references
        // In a real implementation, you might upload to a service
        this.values[name] = Array.from(files).map(f => f.name);
        this.onParameterChange(name, this.values[name], this.values);
    }

    // Validation methods
    validateParameter(name) {
        const param = this.parameters.find(p => p.name === name);
        if (!param) return true;

        const value = this.values[name];

        // Required validation
        if (param.required && (!value || value === '')) {
            this.setValidationError(name, `${param.label || param.name} is required`);
            return false;
        }

        // Type-specific validation
        switch (param.type) {
            case 'number':
            case 'integer':
                if (value !== '' && isNaN(value)) {
                    this.setValidationError(name, 'Must be a valid number');
                    return false;
                }
                if (param.min !== undefined && value < param.min) {
                    this.setValidationError(name, `Must be at least ${param.min}`);
                    return false;
                }
                if (param.max !== undefined && value > param.max) {
                    this.setValidationError(name, `Must be at most ${param.max}`);
                    return false;
                }
                break;

            case 'string':
            case 'text':
                if (param.minLength && value.length < param.minLength) {
                    this.setValidationError(name, `Must be at least ${param.minLength} characters`);
                    return false;
                }
                if (param.maxLength && value.length > param.maxLength) {
                    this.setValidationError(name, `Must be at most ${param.maxLength} characters`);
                    return false;
                }
                break;
        }

        this.clearValidationError(name);
        return true;
    }

    validateAll() {
        let isValid = true;
        
        for (const param of this.parameters) {
            if (!this.validateParameter(param.name)) {
                isValid = false;
            }
        }

        return isValid;
    }

    setValidationError(name, error) {
        this.validation[name] = { error };
        this.updateParameterDisplay(name);
    }

    clearValidationError(name) {
        delete this.validation[name];
        this.updateParameterDisplay(name);
    }

    updateParameterDisplay(name) {
        const paramGroup = document.querySelector(`#${this.id} .param-group`);
        // This would update just the specific parameter's display
        // For simplicity, we'll refresh the whole component
        this.refresh();
    }

    // Preset methods
    showPresets() {
        // This would show a modal with preset configurations
        alert('Preset configurations would be shown here');
    }

    resetParameters() {
        this.values = {};
        this.validation = {};
        this.refresh();
    }

    // Utility methods
    getValues() {
        return { ...this.values };
    }

    setValues(values) {
        this.values = { ...values };
        this.refresh();
    }

    setParameters(parameters) {
        this.parameters = parameters;
        this.values = {};
        this.validation = {};
        this.refresh();
    }

    refresh() {
        const container = document.getElementById(this.id);
        if (container) {
            container.outerHTML = this.render();
        }
    }
}

// =============================================================================
// COST ESTIMATOR COMPONENT
// =============================================================================

/**
 * Real-time cost estimation and budget tracking
 */
class CostEstimatorWidget {
    constructor(config = {}) {
        this.id = config.id || `cost-estimator-${Date.now()}`;
        this.workerId = config.workerId;
        this.kamContext = config.kamContext;
        this.templateId = config.templateId;
        this.parameters = config.parameters || {};
        
        this.baseCost = config.baseCost || 0.01;
        this.estimatedCost = 0;
        this.budgetInfo = null;
    }

    async render() {
        await this.loadBudgetInfo();
        await this.calculateEstimate();

        return `
            <div class="cost-estimator" id="${this.id}">
                <div class="cost-header">
                    <h4>💰 Cost Estimate</h4>
                    <div class="cost-refresh">
                        <button class="btn btn-sm" onclick="this.refreshEstimate()">🔄</button>
                    </div>
                </div>
                
                <div class="cost-breakdown">
                    ${this.renderCostBreakdown()}
                </div>
                
                <div class="budget-status">
                    ${this.renderBudgetStatus()}
                </div>
                
                <div class="cost-warnings" id="${this.id}-warnings">
                    ${this.renderWarnings()}
                </div>
            </div>
        `;
    }

    renderCostBreakdown() {
        return `
            <div class="breakdown-section">
                <div class="cost-line">
                    <span class="cost-label">Base Processing:</span>
                    <span class="cost-value">$${this.baseCost.toFixed(3)}</span>
                </div>
                
                <div class="cost-line">
                    <span class="cost-label">Template Premium:</span>
                    <span class="cost-value">$${this.getTemplatePremium().toFixed(3)}</span>
                </div>
                
                <div class="cost-line">
                    <span class="cost-label">Parameter Adjustments:</span>
                    <span class="cost-value">$${this.getParameterAdjustments().toFixed(3)}</span>
                </div>
                
                <div class="cost-line total">
                    <span class="cost-label"><strong>Estimated Total:</strong></span>
                    <span class="cost-value"><strong>$${this.estimatedCost.toFixed(3)}</strong></span>
                </div>
            </div>
        `;
    }

    renderBudgetStatus() {
        if (!this.budgetInfo) {
            return '<div class="budget-unknown">Budget information not available</div>';
        }

        const { monthly_budget, remaining_budget } = this.budgetInfo;
        const percentage = ((monthly_budget - remaining_budget) / monthly_budget) * 100;
        const willExceed = this.estimatedCost > remaining_budget;

        return `
            <div class="budget-info">
                <div class="budget-label">Monthly Budget Status</div>
                
                <div class="budget-bar">
                    <div class="budget-fill" style="width: ${Math.min(percentage, 100)}%"></div>
                    ${willExceed ? `
                        <div class="budget-estimate-marker" 
                             style="left: ${Math.min((percentage + (this.estimatedCost / monthly_budget) * 100), 100)}%">
                        </div>
                    ` : ''}
                </div>
                
                <div class="budget-details">
                    <div class="budget-used">
                        Used: $${(monthly_budget - remaining_budget).toFixed(2)} / $${monthly_budget.toFixed(2)}
                    </div>
                    <div class="budget-remaining ${willExceed ? 'warning' : ''}">
                        Remaining: $${remaining_budget.toFixed(2)}
                    </div>
                </div>
                
                ${willExceed ? `
                    <div class="budget-exceed-warning">
                        ⚠️ This operation would exceed your remaining budget
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderWarnings() {
        const warnings = [];

        // Budget warnings
        if (this.budgetInfo && this.estimatedCost > this.budgetInfo.remaining_budget) {
            warnings.push({
                type: 'budget',
                message: 'This operation would exceed your remaining monthly budget',
                severity: 'error'
            });
        } else if (this.budgetInfo && this.estimatedCost > this.budgetInfo.remaining_budget * 0.8) {
            warnings.push({
                type: 'budget',
                message: 'This operation will use a significant portion of your remaining budget',
                severity: 'warning'
            });
        }

        // Cost warnings
        if (this.estimatedCost > 1.00) {
            warnings.push({
                type: 'cost',
                message: 'This is a high-cost operation. Please review the parameters.',
                severity: 'warning'
            });
        }

        if (warnings.length === 0) return '';

        return warnings.map(warning => `
            <div class="cost-warning ${warning.severity}">
                <span class="warning-icon">${warning.severity === 'error' ? '❌' : '⚠️'}</span>
                <span class="warning-message">${warning.message}</span>
            </div>
        `).join('');
    }

    async loadBudgetInfo() {
        try {
            if (this.kamContext) {
                this.budgetInfo = await this.kamContext.getBudgetInfo();
            }
        } catch (error) {
            console.warn('Could not load budget info:', error);
            this.budgetInfo = null;
        }
    }

    async calculateEstimate() {
        try {
            // Try to get estimate from worker API
            const apiEstimate = await this.getAPIEstimate();
            if (apiEstimate) {
                this.estimatedCost = apiEstimate;
                return;
            }
        } catch (error) {
            console.warn('Could not get API estimate, using local calculation');
        }

        // Fallback to local calculation
        this.estimatedCost = this.baseCost + this.getTemplatePremium() + this.getParameterAdjustments();
    }

    async getAPIEstimate() {
        // Try to get estimate from worker
        const estimateData = {
            template: this.templateId,
            parameters: this.parameters
        };

        const response = await window.apiClient.callWorker(this.workerId, '/estimate-cost', 'POST', estimateData);
        return response.estimated_cost;
    }

    getTemplatePremium() {
        // Template-based cost adjustments
        const templatePremiums = {
            'deep_research': 0.20,
            'advanced_analysis': 0.10,
            'premium_template': 0.15,
            'enterprise_template': 0.30
        };

        return templatePremiums[this.templateId] || 0;
    }

    getParameterAdjustments() {
        let adjustments = 0;

        // Parameter-based cost adjustments
        if (this.parameters.batch_size && this.parameters.batch_size > 10) {
            adjustments += (this.parameters.batch_size - 10) * 0.005;
        }

        if (this.parameters.depth && this.parameters.depth === 'comprehensive') {
            adjustments += 0.05;
        }

        if (this.parameters.include_analysis === true) {
            adjustments += 0.02;
        }

        return adjustments;
    }

    async refreshEstimate() {
        await this.calculateEstimate();
        this.updateDisplay();
    }

    updateParameters(parameters) {
        this.parameters = { ...parameters };
        this.refreshEstimate();
    }

    updateTemplate(templateId) {
        this.templateId = templateId;
        this.refreshEstimate();
    }

    canAfford() {
        if (!this.budgetInfo) return true; // Can't check, assume yes
        return this.estimatedCost <= this.budgetInfo.remaining_budget;
    }

    getEstimate() {
        return {
            estimated_cost: this.estimatedCost,
            can_afford: this.canAfford(),
            budget_remaining: this.budgetInfo?.remaining_budget || null
        };
    }

    updateDisplay() {
        const container = document.getElementById(this.id);
        if (container) {
            container.outerHTML = this.render();
        }
    }
}

// =============================================================================
// EXPORT ALL COMPONENTS
// =============================================================================

window.TemplateGalleryWidget = TemplateGalleryWidget;
window.ParameterBuilderWidget = ParameterBuilderWidget;
window.CostEstimatorWidget = CostEstimatorWidget;

console.log('✅ Worker-Specific Components loaded!');