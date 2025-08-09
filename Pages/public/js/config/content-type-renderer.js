/**
 * Content Type Renderer Configuration
 * Maps backend templates to frontend rendering
 */

class ContentTypeRenderer {
    constructor() {
        // Default templates - will be enhanced by backend config
        this.templates = {
            novel: {
                displayName: 'Novel',
                icon: '📖',
                color: 'purple',
                stages: {
                    1: {
                        title: '📖 Story Vision',
                        sections: {
                            'CORE_CONCEPT': { label: 'Core Concept', icon: '💡' },
                            'THEMATIC_FRAMEWORK': { label: 'Themes', icon: '🎨' },
                            'NARRATIVE_ARC': { label: 'Story Arc', icon: '📈' },
                            'WORLD_VISION': { label: 'World & Setting', icon: '🌍' },
                            'CORE_CONFLICTS': { label: 'Conflicts', icon: '⚔️' }
                        }
                    },
                    2: {
                        title: '🎭 Characters & World',
                        objectTypes: {
                            'character': { label: 'Characters', icon: '🎭', color: 'blue' },
                            'location': { label: 'Locations', icon: '📍', color: 'green' },
                            'concept': { label: 'Concepts', icon: '💭', color: 'purple' }
                        },
                        timelineLabel: 'Story Timeline'
                    },
                    3: {
                        title: '📚 Story Structure',
                        levels: {
                            1: { label: 'Act', pluralLabel: 'Acts', icon: '📚' },
                            2: { label: 'Chapter', pluralLabel: 'Chapters', icon: '📖' },
                            3: { label: 'Scene', pluralLabel: 'Scenes', icon: '🎬' }
                        }
                    },
                    4: {
                        title: '🎬 Scenes',
                        unitLabel: 'Scene',
                        unitPluralLabel: 'Scenes'
                    }
                }
            },
            course: {
                displayName: 'Course',
                icon: '🎓',
                color: 'blue',
                stages: {
                    1: {
                        title: '🎓 Course Vision',
                        sections: {
                            'LEARNING_OBJECTIVES': { label: 'Learning Objectives', icon: '🎯' },
                            'PREREQUISITES': { label: 'Prerequisites', icon: '📋' },
                            'PEDAGOGICAL_APPROACH': { label: 'Teaching Approach', icon: '👨‍🏫' },
                            'CONTENT_SCOPE': { label: 'Content Scope', icon: '📊' },
                            'ASSESSMENT_METHODS': { label: 'Assessment Strategy', icon: '✅' }
                        }
                    },
                    2: {
                        title: '💡 Concepts & Resources',
                        objectTypes: {
                            'concept': { label: 'Concepts', icon: '💡', color: 'yellow' },
                            'resource': { label: 'Resources', icon: '📚', color: 'blue' },
                            'tool': { label: 'Tools', icon: '🔧', color: 'gray' },
                            'character': { label: 'Instructors', icon: '👨‍🏫', color: 'purple' }
                        },
                        timelineLabel: 'Learning Path'
                    },
                    3: {
                        title: '📦 Course Structure',
                        levels: {
                            1: { label: 'Module', pluralLabel: 'Modules', icon: '📦' },
                            2: { label: 'Lesson', pluralLabel: 'Lessons', icon: '📝' },
                            3: { label: 'Topic', pluralLabel: 'Topics', icon: '📌' }
                        }
                    },
                    4: {
                        title: '🎯 Learning Activities',
                        unitLabel: 'Activity',
                        unitPluralLabel: 'Activities'
                    }
                }
            },
            documentary: {
                displayName: 'Documentary',
                icon: '🎥',
                color: 'red',
                stages: {
                    1: {
                        title: '🎥 Documentary Vision',
                        sections: {
                            'THESIS': { label: 'Central Thesis', icon: '📝' },
                            'ARGUMENTS': { label: 'Key Arguments', icon: '💭' },
                            'NARRATIVE_APPROACH': { label: 'Narrative Strategy', icon: '📖' },
                            'VISUAL_STRATEGY': { label: 'Visual Approach', icon: '🎨' },
                            'TARGET_AUDIENCE': { label: 'Target Audience', icon: '👥' }
                        }
                    },
                    2: {
                        title: '🎬 Subjects & Evidence',
                        objectTypes: {
                            'character': { label: 'Interview Subjects', icon: '👤', color: 'orange' },
                            'evidence': { label: 'Evidence', icon: '📊', color: 'green' },
                            'location': { label: 'Filming Locations', icon: '📍', color: 'blue' },
                            'concept': { label: 'Themes', icon: '💭', color: 'purple' }
                        },
                        timelineLabel: 'Chronology'
                    },
                    3: {
                        title: '📺 Episode Structure',
                        levels: {
                            1: { label: 'Episode', pluralLabel: 'Episodes', icon: '📺' },
                            2: { label: 'Segment', pluralLabel: 'Segments', icon: '🎞️' },
                            3: { label: 'Scene', pluralLabel: 'Scenes', icon: '🎬' }
                        }
                    },
                    4: {
                        title: '🎞️ Scenes & Interviews',
                        unitLabel: 'Scene',
                        unitPluralLabel: 'Scenes'
                    }
                }
            },
            podcast: {
                displayName: 'Podcast',
                icon: '🎙️',
                color: 'green',
                stages: {
                    1: {
                        title: '🎙️ Podcast Vision',
                        sections: {
                            'SHOW_CONCEPT': { label: 'Show Concept', icon: '💡' },
                            'FORMAT': { label: 'Format & Style', icon: '🎨' },
                            'TARGET_AUDIENCE': { label: 'Target Audience', icon: '👥' },
                            'DISTRIBUTION': { label: 'Distribution Strategy', icon: '📡' }
                        }
                    },
                    2: {
                        title: '🎧 Hosts & Topics',
                        objectTypes: {
                            'character': { label: 'Hosts & Guests', icon: '🎤', color: 'purple' },
                            'concept': { label: 'Topics', icon: '💭', color: 'yellow' },
                            'resource': { label: 'References', icon: '📚', color: 'blue' }
                        },
                        timelineLabel: 'Season Arc'
                    },
                    3: {
                        title: '📻 Season Structure',
                        levels: {
                            1: { label: 'Season', pluralLabel: 'Seasons', icon: '📅' },
                            2: { label: 'Episode', pluralLabel: 'Episodes', icon: '🎧' },
                            3: { label: 'Segment', pluralLabel: 'Segments', icon: '⏱️' }
                        }
                    },
                    4: {
                        title: '🎙️ Episode Segments',
                        unitLabel: 'Segment',
                        unitPluralLabel: 'Segments'
                    }
                }
            }
        };
    }

    /**
     * Get template for content type
     */
    getTemplate(contentType) {
        return this.templates[contentType.toLowerCase()] || this.templates.novel;
    }

    /**
     * Get stage configuration
     */
    getStageConfig(contentType, stageNumber) {
        const template = this.getTemplate(contentType);
        return template.stages[stageNumber] || {};
    }

    /**
     * Get object type label
     */
    getObjectTypeLabel(contentType, objectType, plural = false) {
        const stageConfig = this.getStageConfig(contentType, 2);
        const typeConfig = stageConfig.objectTypes?.[objectType];
        
        if (!typeConfig) {
            // Fallback to generic labels
            return plural ? this.pluralize(objectType) : objectType;
        }
        
        return typeConfig.label;
    }

    /**
     * Get structure level label
     */
    getStructureLevelLabel(contentType, level, plural = false) {
        const stageConfig = this.getStageConfig(contentType, 3);
        const levelConfig = stageConfig.levels?.[level];
        
        if (!levelConfig) {
            return `Level ${level}`;
        }
        
        return plural ? levelConfig.pluralLabel : levelConfig.label;
    }

    /**
     * Render stage title with icon
     */
    renderStageTitle(contentType, stageNumber) {
        const stageConfig = this.getStageConfig(contentType, stageNumber);
        return stageConfig.title || `Stage ${stageNumber}`;
    }

    /**
     * Get object tabs for Stage 2
     */
    getObjectTabs(contentType, objects) {
        const stageConfig = this.getStageConfig(contentType, 2);
        const objectTypes = stageConfig.objectTypes || {};
        
        // Count objects by type
        const objectCounts = {};
        objects.forEach(obj => {
            const type = obj.type || 'unknown';
            objectCounts[type] = (objectCounts[type] || 0) + 1;
        });
        
        // Build tabs
        const tabs = [];
        Object.entries(objectTypes).forEach(([type, config]) => {
            const count = objectCounts[type] || 0;
            tabs.push({
                type,
                label: config.label,
                icon: config.icon,
                color: config.color,
                count
            });
        });
        
        // Add timeline tab
        tabs.push({
            type: 'timeline',
            label: stageConfig.timelineLabel || 'Timeline',
            icon: '⏰',
            color: 'gray',
            count: null // Will be set separately
        });
        
        return tabs;
    }

    /**
     * Render object card based on type
     */
    renderObjectCard(object, contentType) {
        const stageConfig = this.getStageConfig(contentType, 2);
        const typeConfig = stageConfig.objectTypes?.[object.type] || {};
        
        const icon = typeConfig.icon || '📄';
        const color = typeConfig.color || 'gray';
        
        return `
            <div class="object-card ${object.type}-card" style="border-color: var(--color-${color})">
                <div class="object-header">
                    <span class="object-icon">${icon}</span>
                    <h4>${object.name}</h4>
                    <span class="object-code">${object.code}</span>
                </div>
                <div class="object-description">
                    ${this.truncate(object.description, 200)}
                </div>
                ${this.renderObjectDetails(object, contentType)}
            </div>
        `;
    }

    /**
     * Render object details based on type
     */
    renderObjectDetails(object, contentType) {
        // Type-specific detail rendering
        switch(object.type) {
            case 'character':
                if (contentType === 'novel' && object.backstory) {
                    return `
                        <details class="object-details">
                            <summary>Backstory</summary>
                            <p>${object.backstory}</p>
                        </details>
                    `;
                } else if (contentType === 'course' && object.expertise) {
                    return `
                        <div class="object-meta">
                            <span>Expertise: ${object.expertise}</span>
                        </div>
                    `;
                }
                break;
            
            case 'concept':
                if (object.difficulty) {
                    return `
                        <div class="object-meta">
                            <span class="difficulty-badge difficulty-${object.difficulty}">
                                ${object.difficulty}
                            </span>
                        </div>
                    `;
                }
                break;
            
            case 'resource':
                if (object.type && object.url) {
                    return `
                        <div class="object-meta">
                            <span>${object.type}</span>
                            <a href="${object.url}" target="_blank">🔗 Link</a>
                        </div>
                    `;
                }
                break;
        }
        
        return '';
    }

    /**
     * Pluralize a word (simple version)
     */
    pluralize(word) {
        if (word.endsWith('y')) {
            return word.slice(0, -1) + 'ies';
        } else if (word.endsWith('s')) {
            return word + 'es';
        } else {
            return word + 's';
        }
    }

    /**
     * Truncate text with ellipsis
     */
    truncate(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Load template configuration from backend
     */
    async loadTemplateFromBackend(contentType) {
        try {
            // This would fetch the template config from the backend
            // For now, we use the local config
            console.log(`Loading template for ${contentType}`);
            return this.templates[contentType];
        } catch (error) {
            console.error('Failed to load template:', error);
            return this.templates.novel; // Fallback
        }
    }

    /**
     * Dynamic section renderer for Stage 1
     */
    renderStage1Section(data, sectionKey, sectionConfig) {
        const value = data[sectionKey];
        if (!value) return '';
        
        const { label, icon } = sectionConfig;
        
        // Handle different data types
        if (Array.isArray(value)) {
            return `
                <div class="content-section">
                    <h4>${icon} ${label}</h4>
                    <ul>
                        ${value.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
            `;
        } else if (typeof value === 'object') {
            return `
                <div class="content-section">
                    <h4>${icon} ${label}</h4>
                    ${Object.entries(value).map(([key, val]) => `
                        <p><strong>${this.formatKey(key)}:</strong> ${val}</p>
                    `).join('')}
                </div>
            `;
        } else {
            return `
                <div class="content-section">
                    <h4>${icon} ${label}</h4>
                    <p>${value}</p>
                </div>
            `;
        }
    }

    /**
     * Format object key for display
     */
    formatKey(key) {
        return key
            .replace(/_/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }
}

// Export as singleton
window.contentTypeRenderer = new ContentTypeRenderer();