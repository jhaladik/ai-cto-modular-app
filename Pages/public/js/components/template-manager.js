/**
 * Template Manager Component
 * Admin interface for managing pipeline templates with parameters
 */
class TemplateManager {
    constructor(apiClient) {
        this.apiClient = apiClient || window.apiClient;
        this.templates = [];
        this.selectedTemplate = null;
        this.workers = [];
        this.isDirty = false;
        this.currentView = 'list'; // list, edit, create, preview
        
        // Bind methods
        this.loadTemplates = this.loadTemplates.bind(this);
        this.selectTemplate = this.selectTemplate.bind(this);
        this.saveTemplate = this.saveTemplate.bind(this);
        this.calculateCost = this.calculateCost.bind(this);
        this.showImportDialog = this.showImportDialog.bind(this);
        this.createNewTemplate = this.createNewTemplate.bind(this);
        this.duplicateTemplate = this.duplicateTemplate.bind(this);
        this.deleteTemplate = this.deleteTemplate.bind(this);
        this.filterTemplates = this.filterTemplates.bind(this);
        this.switchTab = this.switchTab.bind(this);
        this.updateField = this.updateField.bind(this);
        this.updateStage = this.updateStage.bind(this);
        this.updateParameter = this.updateParameter.bind(this);
        this.addPipelineStage = this.addPipelineStage.bind(this);
        this.removeStage = this.removeStage.bind(this);
        this.addParameter = this.addParameter.bind(this);
        this.removeParameter = this.removeParameter.bind(this);
        this.updateParameterTiers = this.updateParameterTiers.bind(this);
        this.addUseCase = this.addUseCase.bind(this);
        this.removeUseCase = this.removeUseCase.bind(this);
    }

    render() {
        return `
            <div class="admin-page template-manager">
                <div class="page-header">
                    <h1 class="page-title">🎯 Template Manager</h1>
                    <div class="page-actions">
                        <button class="btn btn-secondary" onclick="templateManager.showImportDialog()">
                            📥 Import from KAM
                        </button>
                        <button class="btn btn-primary" onclick="templateManager.createNewTemplate()">
                            ➕ Create Template
                        </button>
                    </div>
                </div>

                <div class="template-manager-content">
                    <div class="template-sidebar">
                        <div class="sidebar-header">
                            <h3>Templates</h3>
                            <input type="text" 
                                   placeholder="🔍 Search templates..." 
                                   class="search-input"
                                   onkeyup="templateManager.filterTemplates(event)">
                        </div>
                        <div class="template-list" id="template-list">
                            <!-- Template list will be rendered here -->
                        </div>
                    </div>
                    
                    <div class="template-editor" id="template-editor">
                        <!-- Template editor will be rendered here -->
                    </div>
                </div>
            </div>
        `;
    }

    async mount() {
        console.log('🎯 Mounting Template Manager...');
        await this.loadTemplates();
        await this.loadWorkers();
        this.renderTemplateList();
        this.showWelcomeScreen();
    }

    async loadTemplates() {
        try {
            const response = await this.apiClient.kamRequest('/templates/detailed', 'GET');
            if (response.success) {
                this.templates = response.templates || [];
                console.log(`✅ Loaded ${this.templates.length} templates`);
            }
        } catch (error) {
            console.error('Failed to load templates:', error);
            this.templates = this.getMockTemplates();
        }
    }

    async loadWorkers() {
        // TODO: Load available workers from KAM
        this.workers = [
            { name: 'topic_researcher', display_name: 'Topic Researcher', base_cost: 0.05 },
            { name: 'content_analyzer', display_name: 'Content Analyzer', base_cost: 0.08 },
            { name: 'report_generator', display_name: 'Report Generator', base_cost: 0.10 },
            { name: 'data_validator', display_name: 'Data Validator', base_cost: 0.03 },
            { name: 'pdf_converter', display_name: 'PDF Converter', base_cost: 0.02 },
            { name: 'bitware-content-granulator', display_name: 'Content Granulator', base_cost: 0.05 }
        ];
    }

    renderTemplateList() {
        const listElement = document.getElementById('template-list');
        if (!listElement) return;

        const groupedTemplates = this.groupTemplatesByCategory();
        
        listElement.innerHTML = Object.entries(groupedTemplates).map(([category, templates]) => `
            <div class="template-category">
                <h4 class="category-header">${category}</h4>
                ${templates.map(template => `
                    <div class="template-item ${this.selectedTemplate?.template_name === template.template_name ? 'selected' : ''}"
                         onclick="templateManager.selectTemplate('${template.template_name}')">
                        <div class="template-item-header">
                            <span class="template-name">${template.display_name}</span>
                            ${this.renderComplexityBadge(template.complexity_level)}
                        </div>
                        <div class="template-item-meta">
                            <span>💰 $${template.base_cost_usd || template.estimated_cost_usd || 0}</span>
                            <span>⏱️ ${this.formatDuration(template.estimated_duration_ms)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('');
    }

    showWelcomeScreen() {
        const editorElement = document.getElementById('template-editor');
        if (!editorElement) return;

        editorElement.innerHTML = `
            <div class="welcome-screen">
                <div class="welcome-content">
                    <h2>Welcome to Template Manager</h2>
                    <p>Select a template from the sidebar to view and edit its configuration.</p>
                    
                    <div class="quick-stats">
                        <div class="stat-card">
                            <div class="stat-value">${this.templates.length}</div>
                            <div class="stat-label">Total Templates</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${this.templates.filter(t => t.is_active).length}</div>
                            <div class="stat-label">Active Templates</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${new Set(this.templates.map(t => t.category)).size}</div>
                            <div class="stat-label">Categories</div>
                        </div>
                    </div>
                    
                    <div class="template-tips">
                        <h3>Quick Tips</h3>
                        <ul>
                            <li>🎯 Templates define the pipeline of workers for specific tasks</li>
                            <li>⚙️ Parameters can be restricted by subscription tier</li>
                            <li>💰 Cost estimates update dynamically based on parameters</li>
                            <li>📄 Each template can have example deliverables</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    selectTemplate(templateName) {
        this.selectedTemplate = this.templates.find(t => t.template_name === templateName);
        if (this.selectedTemplate) {
            this.renderTemplateEditor();
            this.renderTemplateList(); // Update selection
        }
    }

    renderTemplateEditor() {
        const editorElement = document.getElementById('template-editor');
        if (!editorElement || !this.selectedTemplate) return;

        editorElement.innerHTML = `
            <div class="template-editor-content">
                <div class="editor-header">
                    <h2>${this.selectedTemplate.display_name}</h2>
                    <div class="editor-actions">
                        <button class="btn btn-small" onclick="templateManager.duplicateTemplate()">
                            📋 Duplicate
                        </button>
                        <button class="btn btn-small btn-danger" onclick="templateManager.deleteTemplate()">
                            🗑️ Delete
                        </button>
                        <button class="btn btn-primary" onclick="templateManager.saveTemplate()">
                            💾 Save Changes
                        </button>
                    </div>
                </div>

                <div class="editor-tabs">
                    <button class="tab-button active" onclick="templateManager.switchTab('basic')">
                        Basic Info
                    </button>
                    <button class="tab-button" onclick="templateManager.switchTab('pipeline')">
                        Pipeline Stages
                    </button>
                    <button class="tab-button" onclick="templateManager.switchTab('parameters')">
                        Parameters
                    </button>
                    <button class="tab-button" onclick="templateManager.switchTab('tiers')">
                        Tier Settings
                    </button>
                    <button class="tab-button" onclick="templateManager.switchTab('cost')">
                        Cost & Estimates
                    </button>
                    <button class="tab-button" onclick="templateManager.switchTab('examples')">
                        Examples
                    </button>
                </div>

                <div class="tab-content" id="editor-tab-content">
                    ${this.renderBasicInfoTab()}
                </div>
            </div>
        `;
    }

    renderBasicInfoTab() {
        return `
            <div class="basic-info-tab">
                <div class="form-grid">
                    <div class="form-group">
                        <label>Template Name (ID)</label>
                        <input type="text" 
                               value="${this.selectedTemplate.template_name}" 
                               class="form-input" 
                               disabled>
                    </div>
                    
                    <div class="form-group">
                        <label>Display Name</label>
                        <input type="text" 
                               value="${this.selectedTemplate.display_name}" 
                               class="form-input"
                               onchange="templateManager.updateField('display_name', this.value)">
                    </div>
                    
                    <div class="form-group">
                        <label>Category</label>
                        <select class="form-select" 
                                onchange="templateManager.updateField('category', this.value)">
                            <option value="research" ${this.selectedTemplate.category === 'research' ? 'selected' : ''}>Research</option>
                            <option value="analysis" ${this.selectedTemplate.category === 'analysis' ? 'selected' : ''}>Analysis</option>
                            <option value="content" ${this.selectedTemplate.category === 'content' ? 'selected' : ''}>Content</option>
                            <option value="content_structuring" ${this.selectedTemplate.category === 'content_structuring' ? 'selected' : ''}>Content Structuring</option>
                            <option value="reporting" ${this.selectedTemplate.category === 'reporting' ? 'selected' : ''}>Reporting</option>
                            <option value="monitoring" ${this.selectedTemplate.category === 'monitoring' ? 'selected' : ''}>Monitoring</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Complexity Level</label>
                        <select class="form-select" 
                                onchange="templateManager.updateField('complexity_level', this.value)">
                            <option value="basic" ${this.selectedTemplate.complexity_level === 'basic' ? 'selected' : ''}>Basic</option>
                            <option value="standard" ${this.selectedTemplate.complexity_level === 'standard' ? 'selected' : ''}>Standard</option>
                            <option value="premium" ${this.selectedTemplate.complexity_level === 'premium' ? 'selected' : ''}>Premium</option>
                            <option value="enterprise" ${this.selectedTemplate.complexity_level === 'enterprise' ? 'selected' : ''}>Enterprise</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Description</label>
                    <textarea class="form-textarea" 
                              rows="4"
                              onchange="templateManager.updateField('description', this.value)">${this.selectedTemplate.description || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label>Typical Use Cases</label>
                    <div class="tag-input">
                        ${(this.selectedTemplate.typical_use_cases || []).map((useCase, index) => `
                            <span class="tag">
                                ${useCase}
                                <button class="tag-remove" onclick="templateManager.removeUseCase(${index})">×</button>
                            </span>
                        `).join('')}
                        <input type="text" 
                               placeholder="Add use case..." 
                               class="tag-input-field"
                               onkeypress="if(event.key === 'Enter') templateManager.addUseCase(this.value, this)">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" 
                               ${this.selectedTemplate.is_active ? 'checked' : ''}
                               onchange="templateManager.updateField('is_active', this.checked)">
                        Template is Active
                    </label>
                </div>
            </div>
        `;
    }

    renderPipelineTab() {
        const stages = this.selectedTemplate.pipeline_stages || 
                      (this.selectedTemplate.worker_flow || []).map((worker, index) => {
                          // Handle both string format (legacy) and object format (new)
                          if (typeof worker === 'string') {
                              return {
                                  stage_index: index,
                                  worker_name: worker,
                                  stage_name: `Stage ${index + 1}`,
                                  action: 'default',
                                  params: {},
                                  on_failure: 'stop'
                              };
                          } else {
                              return {
                                  stage_index: worker.step || index,
                                  worker_name: worker.worker,
                                  stage_name: `Stage ${worker.step || index + 1}`,
                                  action: worker.action || 'default',
                                  params: worker.params || {},
                                  on_failure: 'stop'
                              };
                          }
                      });

        return `
            <div class="pipeline-tab">
                <div class="pipeline-header">
                    <h3>Pipeline Stages</h3>
                    <button class="btn btn-small btn-primary" onclick="templateManager.addPipelineStage()">
                        ➕ Add Stage
                    </button>
                </div>
                
                <div class="pipeline-stages">
                    ${stages.map((stage, index) => `
                        <div class="pipeline-stage" draggable="true" data-index="${index}">
                            <div class="stage-header">
                                <span class="stage-number">${index + 1}</span>
                                <input type="text" 
                                       value="${stage.stage_name}" 
                                       class="stage-name-input"
                                       onchange="templateManager.updateStage(${index}, 'stage_name', this.value)">
                                <button class="btn-icon" onclick="templateManager.removeStage(${index})">🗑️</button>
                            </div>
                            
                            <div class="stage-content">
                                <div class="form-group">
                                    <label>Worker</label>
                                    <select class="form-select" 
                                            onchange="templateManager.updateStage(${index}, 'worker_name', this.value)">
                                        ${this.workers.map(w => `
                                            <option value="${w.name}" ${stage.worker_name === w.name ? 'selected' : ''}>
                                                ${w.display_name} (💰 $${w.base_cost})
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label>Action</label>
                                    <input type="text" 
                                           value="${stage.action || 'default'}" 
                                           class="form-input"
                                           placeholder="e.g., granulate, analyze, generate"
                                           onchange="templateManager.updateStage(${index}, 'action', this.value)">
                                </div>
                                
                                ${stage.worker_name === 'bitware-content-granulator' ? `
                                    <div class="form-group">
                                        <label>Worker Template</label>
                                        <select class="form-select" 
                                                onchange="templateManager.updateStageParam(${index}, 'structureType', this.value)">
                                            <option value="course" ${stage.params?.structureType === 'course' ? 'selected' : ''}>Course Structure</option>
                                            <option value="quiz" ${stage.params?.structureType === 'quiz' ? 'selected' : ''}>Quiz Generator</option>
                                            <option value="novel" ${stage.params?.structureType === 'novel' ? 'selected' : ''}>Novel Planner</option>
                                            <option value="workflow" ${stage.params?.structureType === 'workflow' ? 'selected' : ''}>Workflow Designer</option>
                                            <option value="knowledge_map" ${stage.params?.structureType === 'knowledge_map' ? 'selected' : ''}>Knowledge Map</option>
                                            <option value="learning_path" ${stage.params?.structureType === 'learning_path' ? 'selected' : ''}>Learning Path</option>
                                        </select>
                                    </div>
                                ` : ''}
                                
                                <div class="form-group">
                                    <label>Deliverable Handling</label>
                                    <select class="form-select" 
                                            onchange="templateManager.updateStage(${index}, 'deliverable_action', this.value)">
                                        <option value="store" ${stage.deliverable_action === 'store' ? 'selected' : ''}>Store in Database</option>
                                        <option value="pass" ${stage.deliverable_action === 'pass' ? 'selected' : ''}>Pass to Next Stage</option>
                                        <option value="store_and_pass" ${stage.deliverable_action === 'store_and_pass' ? 'selected' : ''}>Store & Pass Forward</option>
                                        <option value="transform" ${stage.deliverable_action === 'transform' ? 'selected' : ''}>Transform for Next Stage</option>
                                    </select>
                                </div>
                                
                                ${index < stages.length - 1 ? `
                                    <div class="form-group">
                                        <label>Output Mapping</label>
                                        <input type="text" 
                                               value="${stage.output_mapping || ''}" 
                                               class="form-input"
                                               placeholder="e.g., structure → input.content"
                                               onchange="templateManager.updateStage(${index}, 'output_mapping', this.value)">
                                        <small class="form-hint">How this stage's output maps to the next stage's input</small>
                                    </div>
                                ` : ''}
                                
                                <div class="form-group">
                                    <label>On Failure</label>
                                    <select class="form-select" 
                                            onchange="templateManager.updateStage(${index}, 'on_failure', this.value)">
                                        <option value="stop" ${stage.on_failure === 'stop' ? 'selected' : ''}>Stop Pipeline</option>
                                        <option value="continue" ${stage.on_failure === 'continue' ? 'selected' : ''}>Continue</option>
                                        <option value="retry" ${stage.on_failure === 'retry' ? 'selected' : ''}>Retry</option>
                                    </select>
                                </div>
                                
                                ${stage.on_failure === 'retry' ? `
                                    <div class="form-group">
                                        <label>Retry Count</label>
                                        <input type="number" 
                                               value="${stage.retry_count || 3}" 
                                               min="1" 
                                               max="5"
                                               class="form-input"
                                               onchange="templateManager.updateStage(${index}, 'retry_count', this.value)">
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="pipeline-preview">
                    <h4>Pipeline Flow</h4>
                    <div class="pipeline-flow">
                        ${stages.map((stage, index) => `
                            <div class="flow-item">
                                <div class="flow-box">
                                    ${this.workers.find(w => w.name === stage.worker_name)?.display_name || stage.worker_name}
                                </div>
                                ${index < stages.length - 1 ? '<div class="flow-arrow">→</div>' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    switchTab(tabName) {
        // Update active tab
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        // Render tab content
        const contentElement = document.getElementById('editor-tab-content');
        if (!contentElement) return;

        switch (tabName) {
            case 'basic':
                contentElement.innerHTML = this.renderBasicInfoTab();
                break;
            case 'pipeline':
                contentElement.innerHTML = this.renderPipelineTab();
                break;
            case 'parameters':
                contentElement.innerHTML = this.renderParametersTab();
                break;
            case 'tiers':
                contentElement.innerHTML = this.renderTierSettingsTab();
                break;
            case 'cost':
                contentElement.innerHTML = this.renderCostTab();
                break;
            case 'examples':
                contentElement.innerHTML = this.renderExamplesTab();
                break;
        }
    }

    renderParametersTab() {
        const parameters = this.selectedTemplate.parameters || [];
        
        return `
            <div class="parameters-tab">
                <div class="parameters-header">
                    <h3>Template Parameters</h3>
                    <button class="btn btn-small btn-primary" onclick="templateManager.addParameter()">
                        ➕ Add Parameter
                    </button>
                </div>
                
                <div class="parameters-list">
                    ${parameters.length === 0 ? '<p class="empty-state">No parameters defined yet.</p>' : ''}
                    ${parameters.map((param, index) => this.renderParameterEditor(param, index)).join('')}
                </div>
            </div>
        `;
    }

    renderParameterEditor(param, index) {
        return `
            <div class="parameter-editor">
                <div class="parameter-header">
                    <h4>${param.display_name || 'New Parameter'}</h4>
                    <button class="btn-icon" onclick="templateManager.removeParameter(${index})">🗑️</button>
                </div>
                
                <div class="parameter-content">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Parameter Name (ID)</label>
                            <input type="text" 
                                   value="${param.parameter_name || ''}" 
                                   class="form-input"
                                   placeholder="e.g., word_count"
                                   onchange="templateManager.updateParameter(${index}, 'parameter_name', this.value)">
                        </div>
                        
                        <div class="form-group">
                            <label>Display Name</label>
                            <input type="text" 
                                   value="${param.display_name || ''}" 
                                   class="form-input"
                                   placeholder="e.g., Report Length"
                                   onchange="templateManager.updateParameter(${index}, 'display_name', this.value)">
                        </div>
                        
                        <div class="form-group">
                            <label>Type</label>
                            <select class="form-select" 
                                    onchange="templateManager.updateParameter(${index}, 'parameter_type', this.value)">
                                <option value="text" ${param.parameter_type === 'text' ? 'selected' : ''}>Text</option>
                                <option value="number" ${param.parameter_type === 'number' ? 'selected' : ''}>Number</option>
                                <option value="select" ${param.parameter_type === 'select' ? 'selected' : ''}>Select</option>
                                <option value="boolean" ${param.parameter_type === 'boolean' ? 'selected' : ''}>Boolean</option>
                                <option value="array" ${param.parameter_type === 'array' ? 'selected' : ''}>Array</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>UI Component</label>
                            <select class="form-select" 
                                    onchange="templateManager.updateParameter(${index}, 'ui_component', this.value)">
                                <option value="input" ${param.ui_component === 'input' ? 'selected' : ''}>Input</option>
                                <option value="textarea" ${param.ui_component === 'textarea' ? 'selected' : ''}>Textarea</option>
                                <option value="select" ${param.ui_component === 'select' ? 'selected' : ''}>Select</option>
                                <option value="checkbox" ${param.ui_component === 'checkbox' ? 'selected' : ''}>Checkbox</option>
                                <option value="multi-select" ${param.ui_component === 'multi-select' ? 'selected' : ''}>Multi-Select</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" 
                                   ${param.required ? 'checked' : ''}
                                   onchange="templateManager.updateParameter(${index}, 'required', this.checked)">
                            Required Parameter
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" 
                                   ${param.affects_cost ? 'checked' : ''}
                                   onchange="templateManager.updateParameter(${index}, 'affects_cost', this.checked)">
                            Affects Cost
                        </label>
                    </div>
                    
                    ${param.affects_cost ? `
                        <div class="form-group">
                            <label>Cost Impact Formula</label>
                            <input type="text" 
                                   value="${param.cost_impact_formula || ''}" 
                                   class="form-input"
                                   placeholder="e.g., value * 0.0001"
                                   onchange="templateManager.updateParameter(${index}, 'cost_impact_formula', this.value)">
                        </div>
                    ` : ''}
                    
                    <div class="form-group">
                        <label>Available to Tiers</label>
                        <div class="tier-checkboxes">
                            ${['basic', 'standard', 'premium', 'enterprise'].map(tier => `
                                <label>
                                    <input type="checkbox" 
                                           ${(param.available_tiers || []).includes(tier) ? 'checked' : ''}
                                           onchange="templateManager.updateParameterTiers(${index}, 'available_tiers', '${tier}', this.checked)">
                                    ${tier.charAt(0).toUpperCase() + tier.slice(1)}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Editable by Tiers</label>
                        <div class="tier-checkboxes">
                            ${['basic', 'standard', 'premium', 'enterprise'].map(tier => `
                                <label>
                                    <input type="checkbox" 
                                           ${(param.editable_tiers || []).includes(tier) ? 'checked' : ''}
                                           onchange="templateManager.updateParameterTiers(${index}, 'editable_tiers', '${tier}', this.checked)">
                                    ${tier.charAt(0).toUpperCase() + tier.slice(1)}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    updateField(field, value) {
        if (this.selectedTemplate) {
            this.selectedTemplate[field] = value;
            this.isDirty = true;
        }
    }

    updateStage(index, field, value) {
        if (!this.selectedTemplate.pipeline_stages) {
            this.selectedTemplate.pipeline_stages = [];
        }
        this.selectedTemplate.pipeline_stages[index][field] = value;
        this.isDirty = true;
        
        // Update worker_flow when pipeline stages change
        this.syncWorkerFlow();
    }
    
    updateStageParam(index, paramName, value) {
        if (!this.selectedTemplate.pipeline_stages) {
            this.selectedTemplate.pipeline_stages = [];
        }
        if (!this.selectedTemplate.pipeline_stages[index].params) {
            this.selectedTemplate.pipeline_stages[index].params = {};
        }
        this.selectedTemplate.pipeline_stages[index].params[paramName] = value;
        this.isDirty = true;
        
        // Update worker_flow when params change
        this.syncWorkerFlow();
    }
    
    syncWorkerFlow() {
        // Sync pipeline_stages to worker_flow format for backward compatibility
        if (this.selectedTemplate.pipeline_stages) {
            this.selectedTemplate.worker_flow = this.selectedTemplate.pipeline_stages.map((stage, index) => ({
                worker: stage.worker_name,
                step: index + 1,
                action: stage.action || 'default',
                params: stage.params || {},
                deliverable_action: stage.deliverable_action || 'store',
                output_mapping: stage.output_mapping
            }));
        }
    }

    updateParameter(index, field, value) {
        if (!this.selectedTemplate.parameters) {
            this.selectedTemplate.parameters = [];
        }
        this.selectedTemplate.parameters[index][field] = value;
        this.isDirty = true;
    }

    async saveTemplate() {
        if (!this.selectedTemplate || !this.isDirty) return;
        
        try {
            // TODO: Call API to save template
            console.log('Saving template:', this.selectedTemplate);
            
            // Show success message
            this.showMessage('Template saved successfully!', 'success');
            this.isDirty = false;
        } catch (error) {
            console.error('Failed to save template:', error);
            this.showMessage('Failed to save template', 'error');
        }
    }

    calculateCost(parameters = {}) {
        if (!this.selectedTemplate) return 0;
        
        let totalCost = this.selectedTemplate.base_cost_usd || 0;
        
        // Add parameter-based costs
        if (this.selectedTemplate.parameters) {
            this.selectedTemplate.parameters.forEach(param => {
                if (param.affects_cost && parameters[param.parameter_name]) {
                    const value = parameters[param.parameter_name];
                    if (param.cost_impact_formula) {
                        // Simple formula evaluation (in production, use a safe expression parser)
                        try {
                            const formula = param.cost_impact_formula.replace(/value/g, value);
                            const impact = eval(formula); // WARNING: Use safe parser in production
                            totalCost += impact;
                        } catch (e) {
                            console.error('Error evaluating cost formula:', e);
                        }
                    }
                }
            });
        }
        
        return totalCost;
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            border-radius: 0.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(messageDiv);
        setTimeout(() => messageDiv.remove(), 3000);
    }

    // Utility methods
    groupTemplatesByCategory() {
        const grouped = {};
        this.templates.forEach(template => {
            const category = template.category || 'Uncategorized';
            if (!grouped[category]) grouped[category] = [];
            grouped[category].push(template);
        });
        return grouped;
    }

    renderComplexityBadge(level) {
        const colors = {
            basic: '#6b7280',
            standard: '#3b82f6',
            premium: '#8b5cf6',
            enterprise: '#f59e0b'
        };
        return `<span class="complexity-badge" style="background-color: ${colors[level] || '#6b7280'}">${level}</span>`;
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m`;
        return `${seconds}s`;
    }

    // Stub methods for UI actions
    showImportDialog() {
        this.showMessage('Import from KAM coming soon!', 'info');
    }

    createNewTemplate() {
        this.showMessage('Create new template coming soon!', 'info');
    }

    duplicateTemplate() {
        if (!this.selectedTemplate) return;
        this.showMessage('Duplicate template coming soon!', 'info');
    }

    deleteTemplate() {
        if (!this.selectedTemplate) return;
        if (confirm(`Are you sure you want to delete "${this.selectedTemplate.display_name}"?`)) {
            this.showMessage('Delete template coming soon!', 'info');
        }
    }

    addPipelineStage() {
        if (!this.selectedTemplate.pipeline_stages) {
            this.selectedTemplate.pipeline_stages = [];
        }
        
        const newStage = {
            stage_index: this.selectedTemplate.pipeline_stages.length,
            stage_name: `Stage ${this.selectedTemplate.pipeline_stages.length + 1}`,
            worker_name: this.workers[0]?.name || 'topic_researcher',
            action: 'default',
            params: {},
            deliverable_action: 'store',
            on_failure: 'stop'
        };
        
        this.selectedTemplate.pipeline_stages.push(newStage);
        this.isDirty = true;
        this.syncWorkerFlow();
        
        // Re-render the pipeline tab
        document.getElementById('editor-tab-content').innerHTML = this.renderPipelineTab();
    }

    removeStage(index) {
        if (!this.selectedTemplate.pipeline_stages) return;
        
        if (confirm(`Remove ${this.selectedTemplate.pipeline_stages[index].stage_name}?`)) {
            this.selectedTemplate.pipeline_stages.splice(index, 1);
            
            // Re-index stages
            this.selectedTemplate.pipeline_stages.forEach((stage, i) => {
                stage.stage_index = i;
                if (!stage.stage_name || stage.stage_name.startsWith('Stage ')) {
                    stage.stage_name = `Stage ${i + 1}`;
                }
            });
            
            this.isDirty = true;
            this.syncWorkerFlow();
            
            // Re-render the pipeline tab
            document.getElementById('editor-tab-content').innerHTML = this.renderPipelineTab();
        }
    }

    addParameter() {
        this.showMessage('Add parameter coming soon!', 'info');
    }

    removeParameter(index) {
        this.showMessage('Remove parameter coming soon!', 'info');
    }

    updateParameterTiers(index, tierType, tier, checked) {
        if (!this.selectedTemplate.parameters) return;
        const param = this.selectedTemplate.parameters[index];
        if (!param[tierType]) param[tierType] = [];
        
        if (checked) {
            if (!param[tierType].includes(tier)) {
                param[tierType].push(tier);
            }
        } else {
            param[tierType] = param[tierType].filter(t => t !== tier);
        }
        
        this.isDirty = true;
    }

    filterTemplates(event) {
        const searchTerm = event.target.value.toLowerCase();
        // TODO: Implement template filtering
        this.showMessage('Search functionality coming soon!', 'info');
    }

    addUseCase(value, inputElement) {
        if (!value.trim()) return;
        
        if (!this.selectedTemplate.typical_use_cases) {
            this.selectedTemplate.typical_use_cases = [];
        }
        
        this.selectedTemplate.typical_use_cases.push(value.trim());
        this.isDirty = true;
        inputElement.value = '';
        this.renderTemplateEditor();
    }

    removeUseCase(index) {
        if (this.selectedTemplate.typical_use_cases) {
            this.selectedTemplate.typical_use_cases.splice(index, 1);
            this.isDirty = true;
            this.renderTemplateEditor();
        }
    }

    renderTierSettingsTab() {
        return `
            <div class="tier-settings-tab">
                <h3>Tier Settings</h3>
                <p>Configure which subscription tiers can access this template and parameter limits.</p>
                <div class="coming-soon">Coming in Phase 2</div>
            </div>
        `;
    }

    renderCostTab() {
        return `
            <div class="cost-tab">
                <h3>Cost & Estimates</h3>
                <p>Configure cost calculation and estimates for this template.</p>
                <div class="coming-soon">Coming in Phase 2 - Dynamic Cost Estimation</div>
            </div>
        `;
    }

    renderExamplesTab() {
        return `
            <div class="examples-tab">
                <h3>Example Deliverables</h3>
                <p>Add example outputs and deliverables for this template.</p>
                <div class="coming-soon">Coming in Phase 3 - Template Preview System</div>
            </div>
        `;
    }

    // Mock data for development
    getMockTemplates() {
        return [
            {
                template_name: 'market_research_pipeline',
                display_name: 'Market Research Pipeline',
                description: 'Comprehensive market analysis including competitor research',
                category: 'research',
                complexity_level: 'premium',
                base_cost_usd: 0.15,
                estimated_duration_ms: 300000,
                worker_flow: ['topic_researcher', 'content_analyzer', 'report_generator'],
                is_active: true,
                parameters: [
                    {
                        parameter_name: 'topic',
                        parameter_type: 'text',
                        display_name: 'Research Topic',
                        required: true,
                        available_tiers: ['basic', 'standard', 'premium', 'enterprise'],
                        editable_tiers: ['basic', 'standard', 'premium', 'enterprise']
                    },
                    {
                        parameter_name: 'word_count',
                        parameter_type: 'number',
                        display_name: 'Report Length',
                        required: true,
                        affects_cost: true,
                        cost_impact_formula: 'value * 0.00005',
                        available_tiers: ['basic', 'standard', 'premium', 'enterprise'],
                        editable_tiers: ['standard', 'premium', 'enterprise']
                    }
                ]
            }
        ];
    }
}

// Global instance
window.TemplateManager = TemplateManager;