/**
 * Universal Content Type Templates
 * Defines both generation rules (backend) and rendering hints (frontend)
 */

export interface ContentTypeTemplate {
  // Backend: Generation Configuration
  generation: {
    stages: {
      [stageNumber: number]: {
        promptTemplate: string;
        systemPrompt: string;
        expectedStructure: {
          requiredFields: string[];
          optionalFields: string[];
        };
      };
    };
    objectTypes: {
      [objectType: string]: {
        generationName: string;  // What AI should call it
        requiredProperties: string[];
        descriptionLength: number;  // Target word count
      };
    };
    structureLevels: {
      [level: number]: {
        generationType: string;  // What to generate (act, module, etc.)
        minElements: number;
        maxElements: number;
        targetDescriptionWords: number;
      };
    };
  };
  
  // Frontend: Rendering Configuration
  rendering: {
    displayName: string;  // "Novel", "Course", "Documentary"
    icon: string;
    color: string;
    stages: {
      [stageNumber: number]: {
        title: string;
        subtitle: string;
        icon: string;
        sections: Array<{
          key: string;  // Maps to data field
          label: string;
          icon?: string;
          renderType: 'text' | 'list' | 'grid' | 'timeline' | 'tree';
        }>;
      };
    };
    objectTypes: {
      [objectType: string]: {
        displayLabel: string;  // "Characters", "Instructors", etc.
        pluralLabel: string;
        icon: string;
        color: string;
        cardTemplate: {
          showFields: string[];
          primaryField: string;
          secondaryField: string;
          expandable?: boolean;
        };
      };
    };
    structureLevels: {
      [level: number]: {
        displayLabel: string;  // "Chapter", "Lesson", etc.
        pluralLabel: string;
        icon: string;
        parentConnector: string;  // "in", "under", "within"
      };
    };
  };
}

// Novel Template
export const NOVEL_TEMPLATE: ContentTypeTemplate = {
  generation: {
    stages: {
      1: {
        promptTemplate: `Create a comprehensive BIG PICTURE for a novel about: "{topic}"
Target audience: {audience}

Generate:
1. CORE CONCEPT
   - Central premise (1-2 sentences)
   - Genre and sub-genre
   - Unique selling proposition

2. THEMATIC FRAMEWORK
   - Primary theme and message
   - Secondary themes (3-5)
   - Philosophical questions explored
   - Emotional journey for reader`,
        systemPrompt: 'You are a creative visionary and storytelling expert.',
        expectedStructure: {
          requiredFields: ['CORE_CONCEPT', 'THEMATIC_FRAMEWORK', 'NARRATIVE_ARC', 'WORLD_VISION', 'CORE_CONFLICTS'],
          optionalFields: ['STYLE_NOTES', 'AUTHOR_INTENT']
        }
      },
      2: {
        promptTemplate: `Based on the big picture, create detailed OBJECTS AND TIMELINE...`,
        systemPrompt: 'You are a world-builder and character designer.',
        expectedStructure: {
          requiredFields: ['objects', 'timeline'],
          optionalFields: ['relationships', 'world_rules']
        }
      }
    },
    objectTypes: {
      character: {
        generationName: 'character',
        requiredProperties: ['name', 'description', 'backstory', 'relationships'],
        descriptionLength: 200
      },
      location: {
        generationName: 'location',
        requiredProperties: ['name', 'description', 'atmosphere'],
        descriptionLength: 150
      }
    },
    structureLevels: {
      1: {
        generationType: 'act',
        minElements: 3,
        maxElements: 5,
        targetDescriptionWords: 200
      },
      2: {
        generationType: 'chapter',
        minElements: 5,
        maxElements: 10,
        targetDescriptionWords: 200
      },
      3: {
        generationType: 'scene',
        minElements: 3,
        maxElements: 7,
        targetDescriptionWords: 200
      }
    }
  },
  rendering: {
    displayName: 'Novel',
    icon: '📖',
    color: 'purple',
    stages: {
      1: {
        title: '📖 Story Vision',
        subtitle: 'Core concept, themes, and narrative arc',
        icon: '🎭',
        sections: [
          { key: 'CORE_CONCEPT', label: 'Core Concept', icon: '💡', renderType: 'text' },
          { key: 'THEMATIC_FRAMEWORK', label: 'Themes', icon: '🎨', renderType: 'list' },
          { key: 'NARRATIVE_ARC', label: 'Story Arc', icon: '📈', renderType: 'timeline' },
          { key: 'WORLD_VISION', label: 'World & Setting', icon: '🌍', renderType: 'text' },
          { key: 'CORE_CONFLICTS', label: 'Conflicts', icon: '⚔️', renderType: 'text' }
        ]
      },
      2: {
        title: '🎭 Characters & World',
        subtitle: 'Cast, locations, and story timeline',
        icon: '🗺️',
        sections: [
          { key: 'objects', label: 'Story Elements', renderType: 'grid' },
          { key: 'timeline', label: 'Story Timeline', renderType: 'timeline' }
        ]
      },
      3: {
        title: '📚 Story Structure',
        subtitle: 'Acts, chapters, and narrative flow',
        icon: '🏗️',
        sections: [
          { key: 'structure', label: 'Narrative Structure', renderType: 'tree' }
        ]
      },
      4: {
        title: '🎬 Scenes',
        subtitle: 'Detailed scene breakdowns',
        icon: '🎥',
        sections: [
          { key: 'granular_units', label: 'Scene Details', renderType: 'grid' }
        ]
      }
    },
    objectTypes: {
      character: {
        displayLabel: 'Character',
        pluralLabel: 'Characters',
        icon: '🎭',
        color: 'blue',
        cardTemplate: {
          showFields: ['name', 'description', 'backstory'],
          primaryField: 'name',
          secondaryField: 'description',
          expandable: true
        }
      },
      location: {
        displayLabel: 'Location',
        pluralLabel: 'Locations',
        icon: '📍',
        color: 'green',
        cardTemplate: {
          showFields: ['name', 'description', 'atmosphere'],
          primaryField: 'name',
          secondaryField: 'description',
          expandable: false
        }
      }
    },
    structureLevels: {
      1: {
        displayLabel: 'Act',
        pluralLabel: 'Acts',
        icon: '📚',
        parentConnector: 'in'
      },
      2: {
        displayLabel: 'Chapter',
        pluralLabel: 'Chapters',
        icon: '📖',
        parentConnector: 'in'
      },
      3: {
        displayLabel: 'Scene',
        pluralLabel: 'Scenes',
        icon: '🎬',
        parentConnector: 'in'
      }
    }
  }
};

// Course Template
export const COURSE_TEMPLATE: ContentTypeTemplate = {
  generation: {
    stages: {
      1: {
        promptTemplate: `Create a comprehensive BIG PICTURE for a course about: "{topic}"
Target audience: {audience}

Generate:
1. LEARNING OBJECTIVES
   - Primary learning outcomes
   - Skills to be developed
   - Knowledge to be gained

2. PREREQUISITE KNOWLEDGE
   - Required background
   - Recommended preparation

3. PEDAGOGICAL APPROACH
   - Teaching methodology
   - Assessment strategy
   - Learning progression`,
        systemPrompt: 'You are an instructional designer and education expert.',
        expectedStructure: {
          requiredFields: ['LEARNING_OBJECTIVES', 'PREREQUISITES', 'PEDAGOGICAL_APPROACH', 'CONTENT_SCOPE'],
          optionalFields: ['ASSESSMENT_METHODS', 'RESOURCES_NEEDED']
        }
      },
      2: {
        promptTemplate: `Create CONCEPTS, RESOURCES, and LEARNING PATH...`,
        systemPrompt: 'You are a curriculum developer.',
        expectedStructure: {
          requiredFields: ['objects', 'timeline'],
          optionalFields: ['prerequisites_map', 'skill_progression']
        }
      }
    },
    objectTypes: {
      concept: {
        generationName: 'concept',
        requiredProperties: ['name', 'description', 'difficulty', 'prerequisites'],
        descriptionLength: 150
      },
      resource: {
        generationName: 'resource',
        requiredProperties: ['name', 'type', 'description', 'url'],
        descriptionLength: 100
      },
      tool: {
        generationName: 'tool',
        requiredProperties: ['name', 'purpose', 'description'],
        descriptionLength: 100
      }
    },
    structureLevels: {
      1: {
        generationType: 'module',
        minElements: 3,
        maxElements: 8,
        targetDescriptionWords: 200
      },
      2: {
        generationType: 'lesson',
        minElements: 3,
        maxElements: 6,
        targetDescriptionWords: 200
      },
      3: {
        generationType: 'activity',
        minElements: 2,
        maxElements: 5,
        targetDescriptionWords: 200
      }
    }
  },
  rendering: {
    displayName: 'Course',
    icon: '🎓',
    color: 'blue',
    stages: {
      1: {
        title: '🎓 Course Vision',
        subtitle: 'Learning objectives and approach',
        icon: '📚',
        sections: [
          { key: 'LEARNING_OBJECTIVES', label: 'Learning Objectives', icon: '🎯', renderType: 'list' },
          { key: 'PREREQUISITES', label: 'Prerequisites', icon: '📋', renderType: 'list' },
          { key: 'PEDAGOGICAL_APPROACH', label: 'Teaching Approach', icon: '👨‍🏫', renderType: 'text' },
          { key: 'CONTENT_SCOPE', label: 'Content Scope', icon: '📊', renderType: 'text' }
        ]
      },
      2: {
        title: '💡 Concepts & Resources',
        subtitle: 'Topics, tools, and learning sequence',
        icon: '🔧',
        sections: [
          { key: 'objects', label: 'Learning Elements', renderType: 'grid' },
          { key: 'timeline', label: 'Learning Path', renderType: 'timeline' }
        ]
      },
      3: {
        title: '📦 Course Structure',
        subtitle: 'Modules, lessons, and topics',
        icon: '🏗️',
        sections: [
          { key: 'structure', label: 'Curriculum Structure', renderType: 'tree' }
        ]
      },
      4: {
        title: '🎯 Learning Activities',
        subtitle: 'Exercises, assignments, and assessments',
        icon: '✏️',
        sections: [
          { key: 'granular_units', label: 'Activity Details', renderType: 'grid' }
        ]
      }
    },
    objectTypes: {
      concept: {
        displayLabel: 'Concept',
        pluralLabel: 'Concepts',
        icon: '💡',
        color: 'yellow',
        cardTemplate: {
          showFields: ['name', 'description', 'difficulty'],
          primaryField: 'name',
          secondaryField: 'description',
          expandable: true
        }
      },
      resource: {
        displayLabel: 'Resource',
        pluralLabel: 'Resources',
        icon: '📚',
        color: 'blue',
        cardTemplate: {
          showFields: ['name', 'type', 'description'],
          primaryField: 'name',
          secondaryField: 'type',
          expandable: false
        }
      },
      tool: {
        displayLabel: 'Tool',
        pluralLabel: 'Tools',
        icon: '🔧',
        color: 'gray',
        cardTemplate: {
          showFields: ['name', 'purpose', 'description'],
          primaryField: 'name',
          secondaryField: 'purpose',
          expandable: false
        }
      }
    },
    structureLevels: {
      1: {
        displayLabel: 'Module',
        pluralLabel: 'Modules',
        icon: '📦',
        parentConnector: 'in'
      },
      2: {
        displayLabel: 'Lesson',
        pluralLabel: 'Lessons',
        icon: '📝',
        parentConnector: 'within'
      },
      3: {
        displayLabel: 'Activity',
        pluralLabel: 'Activities',
        icon: '🎯',
        parentConnector: 'for'
      }
    }
  }
};

// Documentary Template
export const DOCUMENTARY_TEMPLATE: ContentTypeTemplate = {
  generation: {
    stages: {
      1: {
        promptTemplate: `Create a BIG PICTURE for a documentary about: "{topic}"...`,
        systemPrompt: 'You are a documentary filmmaker and narrative strategist.',
        expectedStructure: {
          requiredFields: ['THESIS', 'ARGUMENTS', 'NARRATIVE_APPROACH', 'VISUAL_STRATEGY'],
          optionalFields: ['TARGET_AUDIENCE', 'CALL_TO_ACTION']
        }
      }
    },
    objectTypes: {
      subject: {
        generationName: 'subject',
        requiredProperties: ['name', 'role', 'perspective', 'story'],
        descriptionLength: 200
      },
      evidence: {
        generationName: 'evidence',
        requiredProperties: ['type', 'source', 'description', 'relevance'],
        descriptionLength: 150
      },
      location: {
        generationName: 'location',
        requiredProperties: ['name', 'significance', 'visual_potential'],
        descriptionLength: 150
      }
    },
    structureLevels: {
      1: {
        generationType: 'episode',
        minElements: 1,
        maxElements: 12,
        targetDescriptionWords: 200
      },
      2: {
        generationType: 'segment',
        minElements: 3,
        maxElements: 8,
        targetDescriptionWords: 200
      },
      3: {
        generationType: 'scene',
        minElements: 3,
        maxElements: 10,
        targetDescriptionWords: 200
      }
    }
  },
  rendering: {
    displayName: 'Documentary',
    icon: '🎥',
    color: 'red',
    stages: {
      1: {
        title: '🎥 Documentary Vision',
        subtitle: 'Thesis, narrative approach, and visual strategy',
        icon: '📹',
        sections: [
          { key: 'THESIS', label: 'Central Thesis', icon: '📝', renderType: 'text' },
          { key: 'ARGUMENTS', label: 'Key Arguments', icon: '💭', renderType: 'list' },
          { key: 'NARRATIVE_APPROACH', label: 'Narrative Strategy', icon: '📖', renderType: 'text' },
          { key: 'VISUAL_STRATEGY', label: 'Visual Approach', icon: '🎨', renderType: 'text' }
        ]
      },
      2: {
        title: '🎬 Subjects & Evidence',
        subtitle: 'Interview subjects, evidence, and chronology',
        icon: '🗂️',
        sections: [
          { key: 'objects', label: 'Documentary Elements', renderType: 'grid' },
          { key: 'timeline', label: 'Chronology', renderType: 'timeline' }
        ]
      },
      3: {
        title: '📺 Episode Structure',
        subtitle: 'Episodes and segments',
        icon: '🏗️',
        sections: [
          { key: 'structure', label: 'Episode Breakdown', renderType: 'tree' }
        ]
      },
      4: {
        title: '🎞️ Scenes & Interviews',
        subtitle: 'Interview segments and B-roll sequences',
        icon: '🎥',
        sections: [
          { key: 'granular_units', label: 'Scene Details', renderType: 'grid' }
        ]
      }
    },
    objectTypes: {
      subject: {
        displayLabel: 'Subject',
        pluralLabel: 'Subjects',
        icon: '👤',
        color: 'orange',
        cardTemplate: {
          showFields: ['name', 'role', 'perspective', 'story'],
          primaryField: 'name',
          secondaryField: 'role',
          expandable: true
        }
      },
      evidence: {
        displayLabel: 'Evidence',
        pluralLabel: 'Evidence',
        icon: '📊',
        color: 'green',
        cardTemplate: {
          showFields: ['type', 'source', 'description'],
          primaryField: 'type',
          secondaryField: 'source',
          expandable: false
        }
      },
      location: {
        displayLabel: 'Location',
        pluralLabel: 'Locations',
        icon: '📍',
        color: 'blue',
        cardTemplate: {
          showFields: ['name', 'significance', 'visual_potential'],
          primaryField: 'name',
          secondaryField: 'significance',
          expandable: false
        }
      }
    },
    structureLevels: {
      1: {
        displayLabel: 'Episode',
        pluralLabel: 'Episodes',
        icon: '📺',
        parentConnector: 'in'
      },
      2: {
        displayLabel: 'Segment',
        pluralLabel: 'Segments',
        icon: '🎞️',
        parentConnector: 'within'
      },
      3: {
        displayLabel: 'Scene',
        pluralLabel: 'Scenes',
        icon: '🎬',
        parentConnector: 'in'
      }
    }
  }
};

// Template Registry
export const CONTENT_TYPE_TEMPLATES: { [key: string]: ContentTypeTemplate } = {
  novel: NOVEL_TEMPLATE,
  course: COURSE_TEMPLATE,
  documentary: DOCUMENTARY_TEMPLATE,
  // Add more as needed: podcast, game, research_paper, etc.
};

// Helper function to get template
export function getContentTypeTemplate(contentType: string): ContentTypeTemplate {
  return CONTENT_TYPE_TEMPLATES[contentType.toLowerCase()] || NOVEL_TEMPLATE;
}

// Helper function to get rendering config for frontend
export function getRenderingConfig(contentType: string) {
  const template = getContentTypeTemplate(contentType);
  return template.rendering;
}

// Helper function to get generation config for backend
export function getGenerationConfig(contentType: string) {
  const template = getContentTypeTemplate(contentType);
  return template.generation;
}