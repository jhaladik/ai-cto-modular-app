/**
 * Granulation Page Component v4.0
 * Universal Multi-Stage Content Generation System
 * Supports both legacy single-stage and new 4-stage progressive refinement
 */
class GranulationPage {
    constructor(apiClient) {
        this.apiClient = apiClient || window.apiClient;
        
        // Multi-stage project management
        this.projects = [];
        this.currentProject = null;
        this.currentProjectId = null;
        
        // Legacy job management
        this.jobs = [];
        this.templates = [];
        
        // UI state
        this.activeTab = 'projects'; // projects, legacy, templates
        this.currentView = 'list'; // list, detail
        this.currentStage = 1;
        this.isLoading = false;
        this.expandedRows = new Set();
        this.selectedContentType = 'novel';
        
        // Filters and sorting
        this.currentFilter = 'all';
        this.currentSort = 'created_at';
        this.sortDirection = 'desc';
        
        // Stage configurations
        this.contentTypes = {
            novel: { label: '📚 Novel', stages: ['Big Picture', 'Objects & Timeline', 'Chapter Structure', 'Scenes'] },
            course: { label: '🎓 Course', stages: ['Learning Objectives', 'Concepts & Resources', 'Modules & Lessons', 'Activities'] },
            documentary: { label: '🎬 Documentary', stages: ['Thesis & Vision', 'Subjects & Evidence', 'Episode Structure', 'Scenes & Interviews'] },
            podcast: { label: '🎙️ Podcast', stages: ['Show Concept', 'Topics & Guests', 'Episode Structure', 'Segments'] },
            research_paper: { label: '📄 Research', stages: ['Research Question', 'Literature & Methods', 'Section Structure', 'Arguments'] },
            game: { label: '🎮 Game', stages: ['Core Mechanics', 'Characters & World', 'Level Structure', 'Encounters'] }
        };
        
        // Bind methods
        this.refresh = this.refresh.bind(this);
        this.switchTab = this.switchTab.bind(this);
        this.showProjectDetail = this.showProjectDetail.bind(this);
        this.createProject = this.createProject.bind(this);
        this.executeStage = this.executeStage.bind(this);
        this.exportProject = this.exportProject.bind(this);
        this.showObjectType = this.showObjectType.bind(this);
        this.toggleAct = this.toggleAct.bind(this);
        this.showStage = this.showStage.bind(this);
    }

    /**
     * Main render method
     */
    render() {
        return `
            <div class="admin-page granulation-page">
                <!-- Page Header -->
                <div class="page-header">
                    <h1 class="page-title">🧱 Content Granulator v4.0</h1>
                    <div class="page-actions">
                        <button class="btn btn-secondary" onclick="granulationPage.refresh()">
                            🔄 Refresh
                        </button>
                        ${this.activeTab === 'projects' ? `
                            <button class="btn btn-primary" onclick="granulationPage.showCreateProject()">
                                ➕ New Project
                            </button>
                        ` : ''}
                        ${this.activeTab === 'legacy' ? `
                            <button class="btn btn-primary" onclick="granulationPage.showCreateGranulation()">
                                ➕ New Granulation (Legacy)
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Main Tabs -->
                <div class="main-tabs">
                    <button class="main-tab ${this.activeTab === 'projects' ? 'active' : ''}" 
                            onclick="granulationPage.switchTab('projects')">
                        🚀 Multi-Stage Projects
                    </button>
                    <button class="main-tab ${this.activeTab === 'legacy' ? 'active' : ''}" 
                            onclick="granulationPage.switchTab('legacy')">
                        📋 Legacy Jobs
                    </button>
                    <button class="main-tab ${this.activeTab === 'templates' ? 'active' : ''}" 
                            onclick="granulationPage.switchTab('templates')">
                        📝 Templates
                    </button>
                </div>

                <!-- Tab Content -->
                <div class="tab-content">
                    ${this.currentView === 'list' ? this.renderListView() : this.renderDetailView()}
                </div>
            </div>
        `;
    }

    /**
     * Render list view based on active tab
     */
    renderListView() {
        switch(this.activeTab) {
            case 'projects':
                return this.renderProjectsList();
            case 'legacy':
                return this.renderLegacyJobs();
            case 'templates':
                return this.renderTemplates();
            default:
                return '';
        }
    }

    /**
     * Render multi-stage projects list
     */
    renderProjectsList() {
        console.log(`📊 Rendering projects list with ${this.projects.length} projects`);
        return `
            <div class="projects-section">
                <!-- Summary Cards -->
                <div class="summary-cards">
                    <div class="summary-card">
                        <div class="summary-icon">📚</div>
                        <div class="summary-content">
                            <div class="summary-value">${this.projects.filter(p => p.content_type === 'novel').length}</div>
                            <div class="summary-label">Novels</div>
                        </div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-icon">🎓</div>
                        <div class="summary-content">
                            <div class="summary-value">${this.projects.filter(p => p.content_type === 'course').length}</div>
                            <div class="summary-label">Courses</div>
                        </div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-icon">🎬</div>
                        <div class="summary-content">
                            <div class="summary-value">${this.projects.filter(p => p.content_type === 'documentary').length}</div>
                            <div class="summary-label">Documentaries</div>
                        </div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-icon">✅</div>
                        <div class="summary-content">
                            <div class="summary-value">${this.projects.filter(p => p.status === 'completed').length}</div>
                            <div class="summary-label">Completed</div>
                        </div>
                    </div>
                </div>

                <!-- Projects Table -->
                <div class="projects-table-container">
                    <table class="data-table projects-table">
                        <thead>
                            <tr>
                                <th onclick="granulationPage.sortProjects('project_name')">
                                    Project Name ${this.getSortIcon('project_name')}
                                </th>
                                <th onclick="granulationPage.sortProjects('content_type')">
                                    Type ${this.getSortIcon('content_type')}
                                </th>
                                <th>Progress</th>
                                <th onclick="granulationPage.sortProjects('created_at')">
                                    Created ${this.getSortIcon('created_at')}
                                </th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.projects.length === 0 ? `
                                <tr>
                                    <td colspan="6" class="empty-state">
                                        <div class="empty-message">
                                            <div class="empty-icon">📭</div>
                                            <p>No projects yet</p>
                                            <button class="btn btn-primary btn-sm" onclick="granulationPage.showCreateProject()">
                                                Create Your First Project
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ` : this.projects.map(project => this.renderProjectRow(project)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    /**
     * Render a single project row
     */
    renderProjectRow(project) {
        const contentType = this.contentTypes[project.content_type] || { label: project.content_type };
        const progress = (project.current_stage / project.total_stages) * 100;
        
        return `
            <tr class="project-row" onclick="granulationPage.showProjectDetail(${project.id})">
                <td>
                    <div class="project-name">
                        <strong>${project.project_name}</strong>
                        <div class="project-topic">${this.truncate(project.topic, 60)}</div>
                    </div>
                </td>
                <td>
                    <span class="content-type-badge">
                        ${contentType.label}
                    </span>
                </td>
                <td>
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <span class="progress-text">Stage ${project.current_stage}/${project.total_stages}</span>
                    </div>
                </td>
                <td>
                    <div class="date-cell">
                        ${this.formatDate(project.created_at)}
                    </div>
                </td>
                <td>
                    <span class="status-badge status-${project.status}">
                        ${project.status}
                    </span>
                </td>
                <td class="actions-cell" onclick="event.stopPropagation()">
                    <button class="btn btn-sm btn-icon" onclick="granulationPage.showProjectDetail(${project.id})" title="View Details">
                        👁️
                    </button>
                    <button class="btn btn-sm btn-icon" onclick="granulationPage.exportProject(${project.id})" title="Export">
                        📥
                    </button>
                    <button class="btn btn-sm btn-icon btn-danger" onclick="granulationPage.deleteProject(${project.id})" title="Delete">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    }

    /**
     * Render project detail view
     */
    renderDetailView() {
        if (!this.currentProject) {
            return '<div class="loading">Loading project...</div>';
        }

        const project = this.currentProject;
        const contentType = this.contentTypes[project.content_type];
        
        return `
            <div class="project-detail">
                <!-- Breadcrumb -->
                <div class="breadcrumb">
                    <a href="#" onclick="granulationPage.backToList(); return false;">
                        🚀 Projects
                    </a>
                    <span class="breadcrumb-separator">›</span>
                    <span class="breadcrumb-current">${project.project_name}</span>
                </div>

                <!-- Project Header -->
                <div class="project-header">
                    <div class="project-info">
                        <h2>${project.project_name}</h2>
                        <div class="project-meta">
                            <span class="content-type-badge">${contentType.label}</span>
                            <span class="project-id">ID: ${project.id}</span>
                            <span class="project-created">Created: ${this.formatDate(project.created_at)}</span>
                        </div>
                        <div class="project-topic">${project.topic}</div>
                    </div>
                    <div class="project-actions">
                        <button class="btn btn-secondary" onclick="granulationPage.refreshProject()">
                            🔄 Refresh
                        </button>
                        <button class="btn btn-primary" onclick="granulationPage.exportProject(${project.id})">
                            📥 Export
                        </button>
                    </div>
                </div>

                <!-- Stage Progress -->
                <div class="stage-progress">
                    ${this.renderStageProgress(project)}
                </div>

                <!-- Stage Content -->
                <div class="stage-content">
                    ${this.renderStageContent(project)}
                </div>
            </div>
        `;
    }

    /**
     * Render stage progress tracker
     */
    renderStageProgress(project) {
        const contentType = this.contentTypes[project.content_type];
        const stages = contentType.stages;
        
        return `
            <div class="stage-tracker">
                ${stages.map((stage, index) => {
                    const stageNum = index + 1;
                    const isCompleted = stageNum <= project.current_stage;
                    const isCurrent = stageNum === project.current_stage && project.status === 'in_progress';
                    const isPending = stageNum > project.current_stage;
                    
                    return `
                        <div class="stage-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isPending ? 'pending' : ''}"
                             ${isCompleted ? `onclick="granulationPage.showStage(${stageNum})" style="cursor: pointer;"` : ''}>
                            <div class="stage-number">${stageNum}</div>
                            <div class="stage-info">
                                <div class="stage-name">${stage}</div>
                                <div class="stage-status">
                                    ${isCompleted ? '✅ Completed' : isCurrent ? '🔄 In Progress' : '⏳ Pending'}
                                </div>
                            </div>
                            ${!isCompleted && stageNum === project.current_stage + 1 ? `
                                <button class="btn btn-sm btn-primary" onclick="granulationPage.executeStage(${stageNum})">
                                    ▶️ Execute
                                </button>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    /**
     * Render stage content based on current or selected stage
     */
    renderStageContent(project, selectedStage = null) {
        const stageToShow = selectedStage || this.selectedStage || project.current_stage;
        
        // Debug logging
        console.log('Rendering stage:', stageToShow);
        console.log('Project stages:', project.stages);
        console.log('Looking for stage_number:', stageToShow);
        
        const stageData = project.stages?.find(s => s.stage_number === stageToShow);
        const contentType = project.content_type || 'novel';
        
        console.log('Found stage data:', stageData);
        
        if (!stageData || !stageData.output_data) {
            // More detailed error message
            const availableStages = project.stages?.map(s => s.stage_number).join(', ') || 'none';
            return `
                <div class="empty-state">
                    <p>No data available for Stage ${stageToShow}</p>
                    <p style="font-size: 12px; color: var(--text-secondary);">
                        Available stages: ${availableStages}
                    </p>
                    ${stageToShow === project.current_stage + 1 ? `
                        <button class="btn btn-primary" onclick="granulationPage.executeStage(${stageToShow})">
                            Execute Stage ${stageToShow}
                        </button>
                    ` : ''}
                </div>
            `;
        }

        // Parse the output data
        let output;
        try {
            output = typeof stageData.output_data === 'string' 
                ? JSON.parse(stageData.output_data) 
                : stageData.output_data;
        } catch (e) {
            console.error('Failed to parse output data:', e);
            output = stageData.output_data;
        }
        
        // Get stage name
        const stageNames = this.contentTypes[contentType]?.stages || [];
        const stageName = stageNames[stageToShow - 1] || `Stage ${stageToShow}`;
        
        // Show raw data with minimal formatting
        return this.renderRawStageData(stageToShow, stageName, output, stageData);
    }

    /**
     * Render raw stage data without complex parsing
     */
    renderRawStageData(stageNumber, stageName, outputData, stageData) {
        // Format the raw JSON nicely
        let formattedOutput = '';
        try {
            if (typeof outputData === 'string') {
                formattedOutput = outputData;
            } else {
                formattedOutput = JSON.stringify(outputData, null, 2);
            }
        } catch (e) {
            formattedOutput = String(outputData);
        }
        
        // Get UAOL notations if available
        const uaolNotations = stageData.uaol_notations ? 
            (typeof stageData.uaol_notations === 'string' ? 
                JSON.parse(stageData.uaol_notations) : 
                stageData.uaol_notations) : [];
        
        // Get validation info
        const validationScore = stageData.validation_score || 'N/A';
        const processingTime = stageData.processing_time_ms ? 
            `${(stageData.processing_time_ms / 1000).toFixed(1)}s` : 'N/A';
        
        return `
            <div class="stage-raw-content">
                <div class="stage-header">
                    <h3>📊 Stage ${stageNumber}: ${stageName}</h3>
                    <div class="stage-meta">
                        <span class="meta-item">
                            <strong>Status:</strong> 
                            <span class="status-badge ${stageData.status}">${stageData.status}</span>
                        </span>
                        <span class="meta-item">
                            <strong>Validation:</strong> ${validationScore}
                        </span>
                        <span class="meta-item">
                            <strong>Processing:</strong> ${processingTime}
                        </span>
                        <span class="meta-item">
                            <strong>Completed:</strong> ${this.formatDate(stageData.completed_at || stageData.updated_at)}
                        </span>
                    </div>
                </div>
                
                ${uaolNotations.length > 0 ? `
                    <div class="uaol-section">
                        <h4>🔤 UAOL Notations (${uaolNotations.length})</h4>
                        <div class="uaol-list">
                            ${uaolNotations.map(notation => `
                                <div class="uaol-notation">
                                    <code>${notation}</code>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="raw-data-section">
                    <div class="section-header">
                        <h4>📝 Generated Content (Raw Data)</h4>
                        <button class="btn btn-sm" onclick="granulationPage.copyToClipboard('${stageNumber}')">
                            📋 Copy JSON
                        </button>
                    </div>
                    <div class="raw-data-container">
                        <pre class="json-output" id="stage-${stageNumber}-json">${this.escapeHtml(formattedOutput)}</pre>
                    </div>
                </div>
                
                ${stageData.validation_report ? `
                    <div class="validation-section">
                        <h4>✅ Validation Report</h4>
                        <div class="validation-content">
                            <pre>${this.escapeHtml(
                                typeof stageData.validation_report === 'string' ? 
                                    stageData.validation_report : 
                                    JSON.stringify(stageData.validation_report, null, 2)
                            )}</pre>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * Copy stage JSON to clipboard
     */
    copyToClipboard(stageNumber) {
        const element = document.getElementById(`stage-${stageNumber}-json`);
        if (element) {
            const text = element.textContent;
            navigator.clipboard.writeText(text).then(() => {
                this.showToast('JSON copied to clipboard!', 'success');
            }).catch(err => {
                console.error('Failed to copy:', err);
                this.showToast('Failed to copy to clipboard', 'error');
            });
        }
    }

    /**
     * Render Stage 1: Big Picture
     */
    renderBigPicture(data, contentType = 'novel') {
        // Parse nested JSON with markdown code blocks
        let parsedData = this.parseStageData(data);
        
        // Get template configuration
        const renderer = window.contentTypeRenderer || this.getDefaultRenderer();
        const stageTitle = renderer.renderStageTitle(contentType, 1);
        const stageConfig = renderer.getStageConfig(contentType, 1);
        
        // Build sections HTML
        let sectionsHtml = '';
        
        // Check if it's course data (has LearningObjectives or CourseTitle)
        if (contentType === 'course' || parsedData.LearningObjectives || parsedData.CourseTitle) {
            // Render course-specific structure
            sectionsHtml = this.renderCourseStage1(parsedData);
        } else if (parsedData.CORE_CONCEPT || parsedData.BIG_PICTURE) {
            // Render novel structure
            sectionsHtml = this.renderNovelStage1(parsedData);
        } else if (stageConfig.sections) {
            // Use template-defined sections
            Object.entries(stageConfig.sections).forEach(([sectionKey, sectionConfig]) => {
                sectionsHtml += renderer.renderStage1Section(parsedData, sectionKey, sectionConfig);
            });
        } else {
            // Fallback: render all data generically
            sectionsHtml = this.renderGenericData(parsedData);
        }
        
        return `
            <div class="stage-1-content">
                <h3>${stageTitle}</h3>
                ${sectionsHtml}
            </div>
        `;
    }

    /**
     * Parse stage data (handles nested JSON with markdown)
     */
    parseStageData(data) {
        // If data is already an object with the expected structure, return it
        if (data && typeof data === 'object') {
            // Check if it's already parsed (has any common structure fields)
            const knownFields = [
                'structure', 'objects', 'granular_units', 'scenes', 'activities',
                'CORE_CONCEPT', 'LEARNING_OBJECTIVES', 'BIG_PICTURE',
                'LearningObjectives', 'CourseTitle', 'CourseStructure',
                'Modules', 'acts', 'episodes', 'segments', 'Activities'
            ];
            
            for (const field of knownFields) {
                if (data[field]) {
                    console.log(`Data already parsed, has field: ${field}`);
                    return data;
                }
            }
        }
        
        let parsedData = data;
        
        // Handle nested content field with markdown
        if (data && data.content && typeof data.content === 'string') {
            try {
                console.log('Parsing nested content field');
                // Remove markdown code blocks if present
                let jsonStr = data.content;
                if (jsonStr.includes('```json')) {
                    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
                }
                parsedData = JSON.parse(jsonStr);
                
                // Only unwrap single wrapper fields that are clearly wrappers
                const keys = Object.keys(parsedData);
                const wrapperFields = ['BIG_PICTURE', 'STRUCTURE', 'OBJECTS', 'GRANULAR_UNITS'];
                
                if (keys.length === 1 && wrapperFields.includes(keys[0])) {
                    console.log(`Extracting ${keys[0]} wrapper`);
                    parsedData = parsedData[keys[0]];
                }
            } catch (e) {
                console.error('Failed to parse stage content:', e);
                // Try to clean and parse again
                try {
                    let cleanedStr = data.content.replace(/[\n\r]/g, ' ').trim();
                    if (cleanedStr.startsWith('```')) {
                        cleanedStr = cleanedStr.replace(/```[a-z]*\s*/gi, '').replace(/```/g, '');
                    }
                    parsedData = JSON.parse(cleanedStr);
                } catch (e2) {
                    console.error('Second parse attempt failed:', e2);
                    parsedData = data;
                }
            }
        }
        
        return parsedData;
    }
    
    /**
     * Get default renderer if contentTypeRenderer not available
     */
    getDefaultRenderer() {
        return {
            renderStageTitle: (type, stage) => `Stage ${stage}`,
            getStageConfig: () => ({}),
            renderStage1Section: (data, key, config) => {
                const value = data[key];
                if (!value) return '';
                return `<div class="content-section"><h4>${key}</h4><pre>${JSON.stringify(value, null, 2)}</pre></div>`;
            },
            getObjectTabs: () => [],
            renderObjectCard: (obj) => `<div class="object-card"><h4>${obj.name || 'Unknown'}</h4></div>`,
            getStructureLevelLabel: (type, level) => `Level ${level}`
        };
    }
    
    /**
     * Render data generically (fallback)
     */
    renderGenericData(data) {
        let html = '';
        Object.entries(data).forEach(([key, value]) => {
            html += `
                <div class="content-section">
                    <h4>${this.formatKey(key)}</h4>
                    ${this.renderValue(value)}
                </div>
            `;
        });
        return html;
    }
    
    /**
     * Render a value based on its type
     */
    renderValue(value) {
        if (Array.isArray(value)) {
            return `<ul>${value.map(item => `<li>${item}</li>`).join('')}</ul>`;
        } else if (typeof value === 'object' && value !== null) {
            return Object.entries(value).map(([k, v]) => 
                `<p><strong>${this.formatKey(k)}:</strong> ${v}</p>`
            ).join('');
        } else {
            return `<p>${value}</p>`;
        }
    }
    
    /**
     * Format key for display
     */
    formatKey(key) {
        return key
            .replace(/_/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }
    
    /**
     * Render Course Stage 1 specific structure
     */
    renderCourseStage1(data) {
        let html = '';
        
        // Learning Objectives
        if (data.LearningObjectives) {
            html += `
                <div class="content-section">
                    <h4>🎯 Learning Objectives</h4>
                    ${data.LearningObjectives.PrimaryLearningOutcomes ? `
                        <p><strong>Primary Outcomes:</strong></p>
                        <ul>${data.LearningObjectives.PrimaryLearningOutcomes.map(o => `<li>${o}</li>`).join('')}</ul>
                    ` : ''}
                    ${data.LearningObjectives.SkillsToBeDeveloped ? `
                        <p><strong>Skills to Develop:</strong></p>
                        <ul>${data.LearningObjectives.SkillsToBeDeveloped.map(s => `<li>${s}</li>`).join('')}</ul>
                    ` : ''}
                    ${data.LearningObjectives.KnowledgeToBeGained ? `
                        <p><strong>Knowledge to Gain:</strong></p>
                        <ul>${data.LearningObjectives.KnowledgeToBeGained.map(k => `<li>${k}</li>`).join('')}</ul>
                    ` : ''}
                </div>
            `;
        }
        
        // Prerequisites
        if (data.PrerequisiteKnowledge) {
            html += `
                <div class="content-section">
                    <h4>📋 Prerequisites</h4>
                    ${data.PrerequisiteKnowledge.RequiredBackground ? `
                        <p><strong>Required Background:</strong></p>
                        <ul>${data.PrerequisiteKnowledge.RequiredBackground.map(r => `<li>${r}</li>`).join('')}</ul>
                    ` : ''}
                    ${data.PrerequisiteKnowledge.RecommendedPreparation ? `
                        <p><strong>Recommended Preparation:</strong></p>
                        <ul>${data.PrerequisiteKnowledge.RecommendedPreparation.map(r => `<li>${r}</li>`).join('')}</ul>
                    ` : ''}
                </div>
            `;
        }
        
        // Course Structure
        if (data.CourseStructure) {
            html += `
                <div class="content-section">
                    <h4>🏗️ Course Structure</h4>
                    ${data.CourseStructure.PedagogicalApproach ? `
                        <p><strong>Teaching Approach:</strong></p>
                        <ul>${data.CourseStructure.PedagogicalApproach.map(p => `<li>${p}</li>`).join('')}</ul>
                    ` : ''}
                    ${data.CourseStructure.AssessmentStrategy ? `
                        <p><strong>Assessment Strategy:</strong></p>
                        <ul>${data.CourseStructure.AssessmentStrategy.map(a => `<li>${a}</li>`).join('')}</ul>
                    ` : ''}
                    ${data.CourseStructure.LearningProgression ? `
                        <p><strong>Learning Progression:</strong></p>
                        <ul>${data.CourseStructure.LearningProgression.map(l => `<li>${l}</li>`).join('')}</ul>
                    ` : ''}
                </div>
            `;
        }
        
        // Content Scope
        if (data.ContentScope) {
            html += `
                <div class="content-section">
                    <h4>📚 Content Scope</h4>
                    ${data.ContentScope.TopicsCovered ? `
                        <p><strong>Topics Covered:</strong></p>
                        <ul>${data.ContentScope.TopicsCovered.map(t => `<li>${t}</li>`).join('')}</ul>
                    ` : ''}
                </div>
            `;
        }
        
        return html;
    }
    
    /**
     * Render Novel Stage 1 specific structure
     */
    renderNovelStage1(data) {
        let html = '';
        const d = data.BIG_PICTURE || data;
        
        // Core Concept
        if (d.CORE_CONCEPT || d.core_concept) {
            const core = d.CORE_CONCEPT || d.core_concept;
            html += `
                <div class="content-section">
                    <h4>💡 Core Concept</h4>
                    <p><strong>Premise:</strong> ${core.central_premise || core.premise || 'N/A'}</p>
                    <p><strong>Genre:</strong> ${core.genre || 'N/A'}</p>
                    <p><strong>Sub-Genre:</strong> ${core.sub_genre || 'N/A'}</p>
                    <p><strong>Unique Proposition:</strong> ${core.unique_selling_proposition || core.unique_proposition || 'N/A'}</p>
                </div>
            `;
        }
        
        // Thematic Framework
        if (d.THEMATIC_FRAMEWORK || d.thematic_framework) {
            const theme = d.THEMATIC_FRAMEWORK || d.thematic_framework;
            html += `
                <div class="content-section">
                    <h4>🎨 Themes</h4>
                    <p><strong>Primary Theme:</strong> ${theme.primary_theme || 'N/A'}</p>
                    ${theme.secondary_themes ? `
                        <p><strong>Secondary Themes:</strong></p>
                        <ul>${theme.secondary_themes.map(t => `<li>${t}</li>`).join('')}</ul>
                    ` : ''}
                    ${theme.philosophical_questions ? `
                        <p><strong>Philosophical Questions:</strong></p>
                        <ul>${theme.philosophical_questions.map(q => `<li>${q}</li>`).join('')}</ul>
                    ` : ''}
                    ${theme.emotional_journey ? `
                        <p><strong>Emotional Journey:</strong> ${theme.emotional_journey}</p>
                    ` : ''}
                </div>
            `;
        }
        
        // Narrative Arc
        if (d.NARRATIVE_ARC || d.narrative_arc) {
            const arc = d.NARRATIVE_ARC || d.narrative_arc;
            html += `
                <div class="content-section">
                    <h4>📈 Narrative Arc</h4>
                    <div class="arc-timeline">
                        <div class="arc-point">
                            <strong>Beginning:</strong> ${arc.beginning || 'N/A'}
                        </div>
                        <div class="arc-point">
                            <strong>Middle:</strong> ${arc.middle || 'N/A'}
                        </div>
                        <div class="arc-point">
                            <strong>End:</strong> ${arc.end || 'N/A'}
                        </div>
                    </div>
                    ${arc.key_turning_points ? `
                        <p><strong>Key Turning Points:</strong></p>
                        <ul>${arc.key_turning_points.map(p => `<li>${p}</li>`).join('')}</ul>
                    ` : ''}
                </div>
            `;
        }
        
        // World Vision
        if (d.WORLD_VISION || d.world_vision) {
            const world = d.WORLD_VISION || d.world_vision;
            html += `
                <div class="content-section">
                    <h4>🌍 World Vision</h4>
                    <p><strong>Setting:</strong> ${world.setting_overview || world.setting || 'N/A'}</p>
                    <p><strong>Time Period:</strong> ${world.time_period || 'N/A'}</p>
                    <p><strong>Atmosphere:</strong> ${world.atmosphere_and_tone || world.atmosphere || 'N/A'}</p>
                    <p><strong>Rules:</strong> ${world.rules_of_the_world || world.rules || 'N/A'}</p>
                </div>
            `;
        }
        
        // Core Conflicts
        if (d.CORE_CONFLICTS || d.conflicts) {
            const conflicts = d.CORE_CONFLICTS || d.conflicts;
            html += `
                <div class="content-section">
                    <h4>⚔️ Core Conflicts</h4>
                    <p><strong>External:</strong> ${conflicts.external_conflict || conflicts.external || 'N/A'}</p>
                    <p><strong>Internal:</strong> ${conflicts.internal_conflict || conflicts.internal || 'N/A'}</p>
                    <p><strong>Societal/Philosophical:</strong> ${conflicts.societal_philosophical_conflict || conflicts.philosophical || 'N/A'}</p>
                    <p><strong>Stakes:</strong> ${conflicts.stakes_and_consequences || conflicts.stakes || 'N/A'}</p>
                </div>
            `;
        }
        
        return html;
    }
    
    /**
     * Render object grids dynamically based on content type
     */
    renderObjectGrids(objects, contentType, renderer) {
        // Get unique object types
        const objectTypes = [...new Set(objects.map(o => o.type))];
        let html = '';
        
        objectTypes.forEach((type, index) => {
            const typeObjects = objects.filter(o => o.type === type);
            const displayStyle = index === 0 ? '' : 'style="display:none;"';
            
            html += `
                <div class="objects-grid" id="${type}s-grid" ${displayStyle}>
                    ${typeObjects.map(obj => renderer.renderObjectCard ? 
                        renderer.renderObjectCard(obj, contentType) : 
                        this.renderDefaultObjectCard(obj)
                    ).join('')}
                </div>
            `;
        });
        
        return html;
    }
    
    /**
     * Default object card renderer
     */
    renderDefaultObjectCard(obj) {
        return `
            <div class="object-card ${obj.type}-card">
                <div class="object-header">
                    <h4>${obj.name || 'Unnamed'}</h4>
                    <span class="object-code">${obj.code || ''}</span>
                </div>
                <div class="object-description">
                    ${this.truncate(obj.description || '', 200)}
                </div>
            </div>
        `;
    }

    /**
     * Render Stage 2: Objects and Timeline
     */
    renderObjectsAndTimeline(data, contentType = 'novel') {
        // Parse nested JSON with markdown code blocks
        const parsedData = this.parseStageData(data);
        const objects = parsedData.objects || [];
        const timeline = parsedData.timeline || [];
        
        // Get template configuration
        const renderer = window.contentTypeRenderer || this.getDefaultRenderer();
        const stageTitle = renderer.renderStageTitle(contentType, 2);
        const tabs = renderer.getObjectTabs(contentType, objects);
        
        return `
            <div class="stage-2-content">
                <h3>${stageTitle}</h3>
                
                <!-- Objects Tabs -->
                <div class="objects-tabs">
                    ${tabs.map((tab, index) => `
                        <button class="sub-tab ${index === 0 ? 'active' : ''}" 
                                onclick="granulationPage.showObjectType('${tab.type}')">
                            ${tab.icon} ${tab.label} ${tab.count !== null ? `(${tab.count})` : `(${tab.type === 'timeline' ? timeline.length : 0})`}
                        </button>
                    `).join('')}
                </div>
                
                <!-- Dynamic Object Grids -->
                ${this.renderObjectGrids(objects, contentType, renderer)}
                
                <!-- Timeline -->
                <div class="timeline-container" id="timeline-grid" style="display:none;">
                    ${timeline.map(event => `
                        <div class="timeline-event">
                            <div class="timeline-marker">${event.time}</div>
                            <div class="timeline-content">
                                <p>${event.description}</p>
                                <div class="timeline-meta">
                                    <span class="impact-badge impact-${event.impact}">${event.impact}</span>
                                    ${event.objects?.map(obj => `<span class="object-ref">${obj}</span>`).join('') || ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render Stage 3: Structure
     */
    renderStructure(data, contentType = 'novel') {
        console.log('renderStructure - Input data:', data);
        
        // Parse nested JSON with markdown code blocks
        const parsedData = this.parseStageData(data);
        
        console.log('renderStructure - Parsed data:', parsedData);
        
        // Intelligently detect structure field based on content type and data shape
        let structure = [];
        
        // Try multiple field names based on what might be present
        if (parsedData.structure) {
            structure = parsedData.structure;
        } else if (parsedData.CourseStructure) {
            // Course data might have CourseStructure
            structure = parsedData.CourseStructure;
        } else if (parsedData.Modules) {
            // Or directly have Modules array
            structure = parsedData.Modules;
        } else if (parsedData.acts) {
            // Novel might have acts
            structure = parsedData.acts;
        } else if (parsedData.episodes) {
            // Documentary might have episodes
            structure = parsedData.episodes;
        } else {
            // Try to find any array that looks like structure
            for (const [key, value] of Object.entries(parsedData)) {
                if (Array.isArray(value) && value.length > 0 && 
                    value[0].title && (value[0].children || value[0].description)) {
                    console.log(`Found structure-like array in field: ${key}`);
                    structure = value;
                    break;
                }
            }
        }
        
        console.log('renderStructure - Structure array:', structure);
        
        // Get template configuration
        const renderer = window.contentTypeRenderer || this.getDefaultRenderer();
        const stageTitle = renderer.renderStageTitle(contentType, 3);
        const stageConfig = renderer.getStageConfig(contentType, 3);
        
        if (!Array.isArray(structure)) {
            // If structure is an object (like CourseStructure with nested properties), try to extract the array
            if (structure && typeof structure === 'object') {
                // Look for common nested arrays
                if (structure.modules) structure = structure.modules;
                else if (structure.Modules) structure = structure.Modules;
                else if (structure.acts) structure = structure.acts;
                else if (structure.Acts) structure = structure.Acts;
                else if (structure.structure) structure = structure.structure;
            }
        }
        
        // If still not an array, show the raw data
        if (!Array.isArray(structure) || structure.length === 0) {
            return `
                <div class="stage-3-content">
                    <h3>${stageTitle}</h3>
                    <div class="empty-state">
                        <p>Structure data format not recognized. Showing raw data:</p>
                        <pre>${JSON.stringify(parsedData, null, 2).substring(0, 1000)}...</pre>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="stage-3-content">
                <h3>${stageTitle}</h3>
                
                <div class="structure-tree">
                    ${structure.map(act => `
                        <div class="structure-act">
                            <div class="act-header" onclick="granulationPage.toggleAct('${act.code || act.id || act.title}')">
                                <span class="toggle-icon">▼</span>
                                <h4>${act.title || act.name || 'Untitled'}</h4>
                                <span class="act-meta">${act.children?.length || act.lessons?.length || act.chapters?.length || 0} ${renderer.getStructureLevelLabel ? renderer.getStructureLevelLabel(contentType, 2, true) : 'items'}</span>
                            </div>
                            <div class="act-content" id="act-${act.code || act.id || act.title}">
                                <div class="act-description">${act.description || act.overview || ''}</div>
                                
                                <div class="chapters-list">
                                    ${(act.children || act.lessons || act.chapters || act.segments || []).map(chapter => `
                                        <div class="chapter-card">
                                            <div class="chapter-header">
                                                <h5>${chapter.title || chapter.name || 'Untitled'}</h5>
                                                <span class="chapter-code">${chapter.code || chapter.id || ''}</span>
                                            </div>
                                            <div class="chapter-description">
                                                ${chapter.description || chapter.content || chapter.summary || ''}
                                            </div>
                                            <div class="chapter-meta">
                                                ${chapter.word_count ? `<span>📝 ${chapter.word_count} words</span>` : ''}
                                                ${chapter.duration ? `<span>⏱️ ${chapter.duration}</span>` : ''}
                                                ${chapter.difficulty ? `<span>📊 ${chapter.difficulty}</span>` : ''}
                                                ${chapter.metadata?.pov ? `<span>👁️ POV: ${chapter.metadata.pov}</span>` : ''}
                                                ${chapter.objects?.length ? `<span>🎭 ${chapter.objects.length} objects</span>` : ''}
                                                ${chapter.resources?.length ? `<span>📚 ${chapter.resources.length} resources</span>` : ''}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render Stage 4: Granular Units
     */
    renderGranularUnits(data, contentType = 'novel') {
        console.log('renderGranularUnits - Input data:', data);
        
        // Parse nested JSON with markdown code blocks
        const parsedData = this.parseStageData(data);
        
        console.log('renderGranularUnits - Parsed data:', parsedData);
        
        // Intelligently detect granular units field based on content type and data shape
        let granularUnits = [];
        
        // Try multiple field names based on what might be present
        if (parsedData.granular_units) {
            granularUnits = parsedData.granular_units;
        } else if (parsedData.scenes) {
            // Novel might have scenes
            granularUnits = parsedData.scenes;
        } else if (parsedData.Scenes) {
            granularUnits = parsedData.Scenes;
        } else if (parsedData.activities) {
            // Course might have activities
            granularUnits = parsedData.activities;
        } else if (parsedData.Activities) {
            granularUnits = parsedData.Activities;
        } else if (parsedData.LearningActivities) {
            granularUnits = parsedData.LearningActivities;
        } else if (parsedData.segments) {
            // Documentary/podcast might have segments
            granularUnits = parsedData.segments;
        } else if (parsedData.lessons) {
            // Course might have lessons at this level
            granularUnits = parsedData.lessons;
        } else {
            // Try to find any array that looks like granular units
            for (const [key, value] of Object.entries(parsedData)) {
                if (Array.isArray(value) && value.length > 0 && 
                    value[0].title && (value[0].description || value[0].content)) {
                    console.log(`Found granular units-like array in field: ${key}`);
                    granularUnits = value;
                    break;
                }
            }
        }
        
        console.log('renderGranularUnits - Units array:', granularUnits);
        
        // Get template configuration
        const renderer = window.contentTypeRenderer || this.getDefaultRenderer();
        const stageTitle = renderer.renderStageTitle(contentType, 4);
        const stageConfig = renderer.getStageConfig(contentType, 4);
        const unitLabel = stageConfig.unitPluralLabel || 'Units';
        
        // If not an array, try to extract from nested object
        if (!Array.isArray(granularUnits)) {
            if (granularUnits && typeof granularUnits === 'object') {
                // Look for common nested arrays
                if (granularUnits.units) granularUnits = granularUnits.units;
                else if (granularUnits.scenes) granularUnits = granularUnits.scenes;
                else if (granularUnits.activities) granularUnits = granularUnits.activities;
                else if (granularUnits.items) granularUnits = granularUnits.items;
            }
        }
        
        // If still not an array or empty, show raw data
        if (!Array.isArray(granularUnits) || granularUnits.length === 0) {
            return `
                <div class="stage-4-content">
                    <h3>${stageTitle}</h3>
                    <div class="empty-state">
                        <p>Granular units data format not recognized. Showing raw data:</p>
                        <pre>${JSON.stringify(parsedData, null, 2).substring(0, 1000)}...</pre>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="stage-4-content">
                <h3>${stageTitle}</h3>
                
                <div class="units-grid">
                    ${granularUnits.map(unit => `
                        <div class="unit-card">
                            <div class="unit-header">
                                <h5>${unit.title || unit.name || 'Untitled'}</h5>
                                <span class="unit-code">${unit.code || unit.id || ''}</span>
                            </div>
                            <div class="unit-description">
                                ${this.truncate(unit.description || unit.content || unit.summary || '', 200)}
                            </div>
                            <div class="unit-meta">
                                ${unit.word_count ? `<span>📝 ${unit.word_count} words</span>` : ''}
                                ${unit.duration ? `<span>⏱️ ${unit.duration}</span>` : ''}
                                ${unit.style ? `<span>🎨 ${unit.style}</span>` : ''}
                                ${unit.type ? `<span>📌 ${unit.type}</span>` : ''}
                                ${unit.difficulty ? `<span>📊 ${unit.difficulty}</span>` : ''}
                                ${unit.format ? `<span>📄 ${unit.format}</span>` : ''}
                            </div>
                            ${unit.research?.length ? `
                                <div class="research-topics">
                                    <strong>Research needed:</strong>
                                    ${unit.research.map(topic => `<span class="research-tag">${topic}</span>`).join('')}
                                </div>
                            ` : ''}
                            ${unit.objectives?.length ? `
                                <div class="learning-objectives">
                                    <strong>Learning Objectives:</strong>
                                    <ul>
                                        ${unit.objectives.map(obj => `<li>${obj}</li>`).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                            ${unit.key_lines?.length ? `
                                <details class="key-lines">
                                    <summary>Key Lines</summary>
                                    <ul>
                                        ${unit.key_lines.map(line => `<li>"${line}"</li>`).join('')}
                                    </ul>
                                </details>
                            ` : ''}
                            ${unit.resources?.length ? `
                                <details class="resources">
                                    <summary>Resources</summary>
                                    <ul>
                                        ${unit.resources.map(res => `<li>${res.title || res}</li>`).join('')}
                                    </ul>
                                </details>
                            ` : ''}
                            <button class="btn btn-sm btn-primary" onclick="granulationPage.sendToGenerator('${unit.code || unit.id}')">
                                ➡️ Generate Content
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Show create project modal
     */
    showCreateProject() {
        const modal = `
            <div class="modal-overlay" onclick="granulationPage.closeModal(event)">
                <div class="modal modal-large" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h2>Create New Project</h2>
                        <button class="modal-close" onclick="granulationPage.closeModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="create-project-form">
                            <div class="form-group">
                                <label>Project Name *</label>
                                <input type="text" id="project-name" required 
                                       placeholder="e.g., The Quantum Detective">
                            </div>
                            
                            <div class="form-group">
                                <label>Content Type *</label>
                                <div class="content-type-grid">
                                    ${Object.entries(this.contentTypes).map(([key, type]) => `
                                        <label class="content-type-option">
                                            <input type="radio" name="content-type" value="${key}" 
                                                   ${key === 'novel' ? 'checked' : ''}>
                                            <div class="content-type-card">
                                                <span class="type-icon">${type.label.split(' ')[0]}</span>
                                                <span class="type-label">${type.label.split(' ')[1]}</span>
                                            </div>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>Topic/Description *</label>
                                <textarea id="project-topic" rows="3" required
                                          placeholder="Describe what you want to create..."></textarea>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Target Audience</label>
                                    <input type="text" id="target-audience" 
                                           placeholder="e.g., Adult sci-fi readers">
                                </div>
                                
                                <div class="form-group">
                                    <label>Genre/Category</label>
                                    <input type="text" id="genre" 
                                           placeholder="e.g., Cyberpunk Mystery">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>Additional Metadata (Optional)</label>
                                <div id="metadata-fields">
                                    <div class="metadata-row">
                                        <input type="text" placeholder="Key" class="metadata-key">
                                        <input type="text" placeholder="Value" class="metadata-value">
                                        <button type="button" class="btn btn-sm" onclick="granulationPage.addMetadataRow()">
                                            ➕
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary" onclick="granulationPage.closeModal()">
                                    Cancel
                                </button>
                                <button type="submit" class="btn btn-primary">
                                    Create Project
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modal);
        
        // Add form submit handler
        document.getElementById('create-project-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createProject();
        });
    }

    /**
     * Create a new project
     */
    async createProject() {
        const projectData = {
            project_name: document.getElementById('project-name').value,
            content_type: document.querySelector('input[name="content-type"]:checked').value,
            topic: document.getElementById('project-topic').value,
            target_audience: document.getElementById('target-audience').value,
            genre: document.getElementById('genre').value,
            metadata: this.collectMetadata()
        };
        
        try {
            this.showLoading('Creating project...');
            
            const response = await this.apiClient.makeRequest('/granulator', {
                endpoint: '/projects/create',
                method: 'POST',
                data: projectData
            });
            
            if (response.success) {
                this.showToast('Project created successfully!', 'success');
                this.closeModal();
                await this.refresh();
                this.showProjectDetail(response.project.id);
            } else {
                throw new Error(response.error || 'Failed to create project');
            }
        } catch (error) {
            console.error('Error creating project:', error);
            this.showToast('Failed to create project: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }



    /**
     * Legacy jobs rendering (simplified)
     */
    renderLegacyJobs() {
        return `
            <div class="legacy-jobs">
                <div class="info-banner">
                    <p>⚠️ Legacy single-stage generation. For better results, use Multi-Stage Projects.</p>
                </div>
                <div class="jobs-table-container">
                    <!-- Legacy jobs table here -->
                </div>
            </div>
        `;
    }

    /**
     * Templates rendering
     */
    renderTemplates() {
        return `
            <div class="templates-section">
                <div class="templates-grid">
                    ${this.templates.map(template => `
                        <div class="template-card">
                            <h3>${template.templateName}</h3>
                            <p>${template.description || 'No description'}</p>
                            <div class="template-actions">
                                <button class="btn btn-sm" onclick="granulationPage.viewTemplate('${template.templateName}')">
                                    View
                                </button>
                                <button class="btn btn-sm btn-primary" onclick="granulationPage.useTemplate('${template.templateName}')">
                                    Use Template
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // ========== Utility Methods ==========

    /**
     * Mount the component
     */
    async mount() {
        console.log('🧱 Mounting Granulation Page v4.0...');
        try {
            // Load initial data based on active tab
            await this.refresh();
            console.log('✅ Granulation Page mounted successfully');
        } catch (error) {
            console.error('❌ Failed to mount Granulation Page:', error);
            this.showToast('Failed to load data', 'error');
        }
    }

    /**
     * Initialize the page
     */
    async init() {
        await this.refresh();
        // updateView is already called in refresh()
    }

    /**
     * Refresh data
     */
    async refresh() {
        if (this.activeTab === 'projects') {
            await this.loadProjects();
        } else if (this.activeTab === 'legacy') {
            await this.loadJobs();
        } else if (this.activeTab === 'templates') {
            await this.loadTemplates();
        }
        // Update the view after loading data
        this.updateView();
    }

    /**
     * Load projects from API
     */
    async loadProjects() {
        try {
            const result = await this.apiClient.workerRequest('granulator', '/projects', 'GET');
            
            if (result && result.success) {
                this.projects = result.projects || [];
                console.log(`✅ Loaded ${this.projects.length} projects:`, this.projects);
            } else {
                this.projects = [];
                console.log('⚠️ No projects in response:', result);
            }
        } catch (error) {
            console.error('Failed to load projects:', error);
            this.projects = [];
        }
    }

    /**
     * Load legacy jobs from API
     */
    async loadJobs() {
        try {
            // Use the existing getGranulationJobs method from API client
            const result = await this.apiClient.getGranulationJobs();
            
            if (result) {
                this.jobs = result.jobs || [];
            } else {
                this.jobs = [];
            }
        } catch (error) {
            console.error('Failed to load jobs:', error);
            this.jobs = [];
        }
    }

    /**
     * Load templates from API
     */
    async loadTemplates() {
        try {
            // Use the existing getGranulatorTemplates method from API client
            const result = await this.apiClient.getGranulatorTemplates();
            
            if (result) {
                this.templates = result.templates || [];
            } else {
                this.templates = [];
            }
        } catch (error) {
            console.error('Failed to load templates:', error);
            this.templates = [];
        }
    }

    /**
     * Update the view
     */
    updateView() {
        // Find the granulation page container
        const container = document.querySelector('.granulation-page');
        if (container && container.parentElement) {
            container.parentElement.innerHTML = this.render();
        } else {
            // Fallback: try to find the main content area
            const contentArea = document.querySelector('.content-area');
            if (contentArea) {
                contentArea.innerHTML = this.render();
            }
        }
    }

    /**
     * Switch tab
     */
    switchTab(tab) {
        this.activeTab = tab;
        this.currentView = 'list';
        this.refresh();
    }

    /**
     * Back to list
     */
    backToList() {
        this.currentView = 'list';
        this.currentProject = null;
        this.currentProjectId = null;
        this.updateView();
    }

    /**
     * Refresh current project
     */
    async refreshProject() {
        if (this.currentProjectId) {
            await this.showProjectDetail(this.currentProjectId);
        }
    }

    /**
     * Helper: Format date
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    /**
     * Helper: Truncate text
     */
    truncate(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Helper: Get sort icon
     */
    getSortIcon(field) {
        if (this.currentSort === field) {
            return this.sortDirection === 'asc' ? '↑' : '↓';
        }
        return '';
    }

    /**
     * Show loading
     */
    showLoading(message = 'Loading...') {
        const loader = document.createElement('div');
        loader.className = 'loading-overlay';
        loader.id = 'loading-overlay';
        loader.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;
        document.body.appendChild(loader);
    }

    /**
     * Hide loading
     */
    hideLoading() {
        const loader = document.getElementById('loading-overlay');
        if (loader) {
            loader.remove();
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        // Use existing toast system or implement simple one
        console.log(`[${type}] ${message}`);
        // TODO: Implement actual toast UI
    }

    /**
     * Close modal
     */
    closeModal(event) {
        if (!event || event.target.classList.contains('modal-overlay')) {
            const modals = document.querySelectorAll('.modal-overlay');
            modals.forEach(modal => modal.remove());
        }
    }

    /**
     * Collect metadata from form
     */
    collectMetadata() {
        const metadata = {};
        const rows = document.querySelectorAll('#metadata-fields .metadata-row');
        rows.forEach(row => {
            const key = row.querySelector('.metadata-key').value;
            const value = row.querySelector('.metadata-value').value;
            if (key && value) {
                metadata[key] = value;
            }
        });
        return metadata;
    }

    // ========== Project Management Methods ==========

    /**
     * Show create project modal
     */
    showCreateProject() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h2>🚀 Create New Multi-Stage Project</h2>
                    <button class="modal-close" onclick="granulationPage.closeModal(event)">×</button>
                </div>
                <div class="modal-body">
                    <form id="create-project-form">
                        <div class="form-group">
                            <label>Project Name *</label>
                            <input type="text" id="project-name" required placeholder="e.g., The Quantum Detective">
                        </div>
                        
                        <div class="form-group">
                            <label>Content Type *</label>
                            <div class="content-type-grid">
                                ${Object.entries(this.contentTypes).map(([type, config]) => `
                                    <label class="content-type-option">
                                        <input type="radio" name="content-type" value="${type}" ${type === 'novel' ? 'checked' : ''}>
                                        <div class="content-type-card">
                                            <div class="type-icon">${config.label.split(' ')[0]}</div>
                                            <div class="type-label">${config.label.split(' ')[1]}</div>
                                        </div>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Topic/Subject *</label>
                            <textarea id="project-topic" rows="3" required placeholder="Describe your content idea..."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>Target Audience *</label>
                            <input type="text" id="target-audience" required placeholder="e.g., Adult sci-fi readers">
                        </div>
                        
                        <div class="form-group">
                            <label>Genre/Category</label>
                            <input type="text" id="genre" placeholder="e.g., Cyberpunk Mystery">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="granulationPage.closeModal(event)">Cancel</button>
                    <button class="btn btn-primary" onclick="granulationPage.createProject()">Create Project</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    /**
     * Create a new project via API
     */
    async createProject() {
        const projectData = {
            project_name: document.getElementById('project-name').value,
            content_type: document.querySelector('input[name="content-type"]:checked').value,
            topic: document.getElementById('project-topic').value,
            target_audience: document.getElementById('target-audience').value,
            genre: document.getElementById('genre').value || undefined,
            metadata: this.collectMetadata()
        };

        if (!projectData.project_name || !projectData.topic || !projectData.target_audience) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        this.showLoading('Creating project...');
        
        try {
            const result = await this.apiClient.workerRequest('granulator', '/projects/create', 'POST', projectData);

            if (result && result.success) {
                this.hideLoading();
                this.closeModal();
                this.showToast('Project created successfully!', 'success');
                await this.loadProjects();
                this.showProjectDetail(result.project.id);
            } else {
                throw new Error(result.error || 'Failed to create project');
            }
        } catch (error) {
            this.hideLoading();
            console.error('Failed to create project:', error);
            this.showToast('Failed to create project: ' + error.message, 'error');
        }
    }

    /**
     * Show project detail view
     */
    async showProjectDetail(projectId) {
        this.currentView = 'detail';
        this.currentProjectId = projectId;
        
        this.showLoading('Loading project details...');
        
        try {
            const result = await this.apiClient.workerRequest('granulator', `/projects/${projectId}`, 'GET');

            if (result && result.success) {
                this.currentProject = result.project;
                this.hideLoading();
                this.updateView();
            } else {
                throw new Error(result.error || 'Failed to load project');
            }
        } catch (error) {
            this.hideLoading();
            console.error('Failed to load project:', error);
            this.showToast('Failed to load project details', 'error');
            this.backToList();
        }
    }

    /**
     * Execute a stage for the current project
     */
    async executeStage(stageNumber) {
        if (!this.currentProjectId) {
            this.showToast('No project selected', 'error');
            return;
        }

        this.showLoading(`Executing Stage ${stageNumber}...`);
        
        try {
            const result = await this.apiClient.workerRequest('granulator', '/stages/execute', 'POST', {
                project_id: this.currentProjectId,
                stage_number: stageNumber,
                ai_config: {
                    provider: 'openai',
                    model: 'gpt-4o-mini',
                    temperature: 0.8,
                    maxTokens: 16000
                }
            });

            if (result && result.success) {
                this.hideLoading();
                this.showToast(`Stage ${stageNumber} completed successfully!`, 'success');
                await this.refreshProject();
            } else {
                throw new Error(result.error || 'Failed to execute stage');
            }
        } catch (error) {
            this.hideLoading();
            console.error('Failed to execute stage:', error);
            this.showToast('Failed to execute stage: ' + error.message, 'error');
        }
    }

    /**
     * Export project data
     */
    async exportProject(projectId) {
        try {
            const result = await this.apiClient.workerRequest('granulator', `/projects/${projectId}`, 'GET');

            if (result && result.success) {
                const dataStr = JSON.stringify(result.project, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `project-${projectId}-${Date.now()}.json`;
                link.click();
                URL.revokeObjectURL(url);
                this.showToast('Project exported successfully!', 'success');
            }
        } catch (error) {
            console.error('Failed to export project:', error);
            this.showToast('Failed to export project', 'error');
        }
    }

    /**
     * View template details
     */
    async viewTemplate(templateName) {
        // Implementation for viewing template details
        console.log('Viewing template:', templateName);
    }

    /**
     * Use a template for new granulation
     */
    async useTemplate(templateName) {
        // Implementation for using a template
        console.log('Using template:', templateName);
    }
    
    /**
     * Show specific object type in Stage 2
     */
    showObjectType(type) {
        // Hide all object grids
        const grids = document.querySelectorAll('.objects-grid, .timeline-container');
        grids.forEach(grid => {
            grid.style.display = 'none';
        });
        
        // Show selected grid
        const targetGrid = document.getElementById(`${type}${type === 'timeline' ? '' : 's'}-grid`);
        if (targetGrid) {
            targetGrid.style.display = 'grid';
            if (type === 'timeline') {
                targetGrid.style.display = 'block';
            }
        }
        
        // Update tab active state
        const tabs = document.querySelectorAll('.objects-tabs .sub-tab');
        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.textContent.toLowerCase().includes(type)) {
                tab.classList.add('active');
            }
        });
    }
    
    /**
     * Toggle act expansion in Stage 3
     */
    toggleAct(actId) {
        const actContent = document.getElementById(`act-${actId}`);
        if (!actContent) {
            console.warn(`Act content not found for ID: act-${actId}`);
            return;
        }
        
        const actHeader = actContent.previousElementSibling;
        const toggleIcon = actHeader?.querySelector('.toggle-icon');
        
        // Toggle display
        if (!actContent.style.display || actContent.style.display === 'none') {
            actContent.style.display = 'block';
            if (toggleIcon) toggleIcon.textContent = '▼';
            if (actHeader) actHeader.classList.remove('collapsed');
        } else {
            actContent.style.display = 'none';
            if (toggleIcon) toggleIcon.textContent = '▶';
            if (actHeader) actHeader.classList.add('collapsed');
        }
    }
    
    /**
     * Show a specific stage
     */
    showStage(stageNumber) {
        this.selectedStage = stageNumber;
        
        // Use currentProject which has the full stage data, not projects list
        const project = this.currentProject;
        
        if (project) {
            // Update stage content
            const stageContentDiv = document.querySelector('.stage-content');
            if (stageContentDiv) {
                stageContentDiv.innerHTML = this.renderStageContent(project, stageNumber);
            }
            
            // Update stage tracker highlighting
            const stageItems = document.querySelectorAll('.stage-item');
            stageItems.forEach((item, index) => {
                if (index + 1 === stageNumber) {
                    item.classList.add('viewing');
                } else {
                    item.classList.remove('viewing');
                }
            });
        }
    }

    /**
     * Show create granulation modal (legacy)
     */
    showCreateGranulation() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h2>📋 Create Legacy Granulation Job</h2>
                    <button class="modal-close" onclick="granulationPage.closeModal(event)">×</button>
                </div>
                <div class="modal-body">
                    <form id="create-granulation-form">
                        <div class="form-group">
                            <label>Topic *</label>
                            <input type="text" id="granulation-topic" required placeholder="e.g., Python Programming Course">
                        </div>
                        
                        <div class="form-group">
                            <label>Structure Type *</label>
                            <select id="structure-type" required>
                                <option value="course">📚 Course</option>
                                <option value="quiz">❓ Quiz</option>
                                <option value="novel">📖 Novel</option>
                                <option value="workflow">⚙️ Workflow</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Target Audience *</label>
                            <input type="text" id="target-audience-legacy" required placeholder="e.g., Beginners">
                        </div>
                        
                        <div class="form-group">
                            <label>Granularity Level</label>
                            <input type="number" id="granularity-level" min="1" max="5" value="3">
                        </div>
                        
                        <div class="form-group">
                            <label>Max Elements</label>
                            <input type="number" id="max-elements" min="10" max="100" value="30">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="granulationPage.closeModal(event)">Cancel</button>
                    <button class="btn btn-primary" onclick="granulationPage.createLegacyGranulation()">Create Job</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    /**
     * Create legacy granulation job
     */
    async createLegacyGranulation() {
        const data = {
            action: 'granulate',
            input: {
                topic: document.getElementById('granulation-topic').value,
                structureType: document.getElementById('structure-type').value,
                targetAudience: document.getElementById('target-audience-legacy').value,
                granularityLevel: parseInt(document.getElementById('granularity-level').value),
                maxElements: parseInt(document.getElementById('max-elements').value)
            },
            config: {
                aiProvider: 'openai',
                aiModel: 'gpt-4o-mini',
                temperature: 0.7,
                maxTokens: 4000,
                validation: false
            }
        };
        
        if (!data.input.topic || !data.input.targetAudience) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }
        
        this.showLoading('Creating granulation job...');
        
        try {
            const result = await this.apiClient.createGranulation(data);
            
            if (result && result.jobId) {
                this.hideLoading();
                this.closeModal();
                this.showToast('Granulation job created successfully!', 'success');
                await this.loadJobs();
                this.switchTab('legacy');
            } else {
                throw new Error(result.error || 'Failed to create job');
            }
        } catch (error) {
            this.hideLoading();
            console.error('Failed to create granulation:', error);
            this.showToast('Failed to create granulation: ' + error.message, 'error');
        }
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Format date for display
     */
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } catch (e) {
            return dateString;
        }
    }
}

// Make it available globally
window.GranulationPage = GranulationPage;