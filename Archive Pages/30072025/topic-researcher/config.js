// public/js/workers/topic-researcher/config.js
// Topic Researcher Worker Configuration
// Defines integration points, permissions, and metadata for Universal Researcher 2.0

export const TopicResearcherConfig = {
  // Worker identity
  workerId: 'topic-researcher',
  name: 'Universal Researcher',
  description: 'Multi-platform research with AI-powered discovery and ranking',
  version: '2.0.0',
  icon: '🔬',
  
  // UI Components
  components: {
    card: {
      module: './card.js',
      class: 'TopicResearcherCard',
      lazy: false // Load immediately for dashboard
    },
    fullInterface: {
      module: './interface.js', 
      class: 'TopicResearcherInterface',
      lazy: true // Load on demand
    }
  },

  // API Configuration
  api: {
    baseUrl: 'https://bitware-universal-researcher.jhaladik.workers.dev',
    proxyEndpoint: '/api/topic-researcher',
    authMethod: 'session',
    endpoints: {
      research: { method: 'POST', path: '/research' },
      sessionStatus: { method: 'GET', path: '/session/{id}/status' },
      sessionResults: { method: 'GET', path: '/session/{id}/results' },
      recentSessions: { method: 'GET', path: '/sessions/recent' },
      templates: { method: 'GET', path: '/templates' },
      saveTemplate: { method: 'POST', path: '/templates' },
      health: { method: 'GET', path: '/health' },
      capabilities: { method: 'GET', path: '/capabilities' },
      stats: { method: 'GET', path: '/admin/stats' }
    }
  },

  // Permission Requirements
  permissions: {
    view: {
      roles: ['admin', 'client'],
      tiers: ['basic', 'standard', 'premium', 'enterprise']
    },
    execute: {
      roles: ['admin', 'client'],
      tiers: ['standard', 'premium', 'enterprise'],
      limits: {
        basic: { max_sessions_per_day: 3, max_sources_per_session: 25 },
        standard: { max_sessions_per_day: 20, max_sources_per_session: 50 },
        premium: { max_sessions_per_day: 100, max_sources_per_session: 200 },
        enterprise: { max_sessions_per_day: -1, max_sources_per_session: -1 }
      }
    },
    admin: {
      roles: ['admin'],
      tiers: ['enterprise']
    }
  },

  // Features available by tier
  features: {
    basic: [
      'rss_discovery',
      'basic_export',
      'search_engines',
      'quality_filtering'
    ],
    standard: [
      'rss_discovery',
      'youtube_research',
      'ai_ranking',
      'batch_processing',
      'csv_export',
      'json_export',
      'duplicate_removal',
      'quality_filtering',
      'save_to_library'
    ],
    premium: [
      'rss_discovery',
      'youtube_research',
      'podcast_discovery',
      'academic_research',
      'ai_ranking',
      'comprehensive_search',
      'batch_processing',
      'parallel_processing',
      'all_export_formats',
      'custom_templates',
      'advanced_filtering',
      'api_access',
      'priority_processing'
    ],
    enterprise: [
      'all_features',
      'admin_access',
      'advanced_analytics',
      'custom_models',
      'dedicated_support',
      'white_label',
      'unlimited_usage',
      'custom_integrations'
    ]
  },

  // Cost structure (based on Universal Researcher 2.0)
  pricing: {
    rss_discovery: {
      base_cost: 0.50,
      per_source: 0.02,
      depth_multiplier: { 1: 1, 2: 2, 3: 4, 4: 8 },
      description: 'RSS feed discovery via search engines and directories'
    },
    youtube_research: {
      base_cost: 1.00,
      per_channel: 0.10,
      per_video: 0.02,
      description: 'YouTube channel and video discovery'
    },
    podcast_discovery: {
      base_cost: 0.75,
      per_podcast: 0.08,
      per_episode: 0.01,
      description: 'Podcast discovery across multiple platforms'
    },
    academic_research: {
      base_cost: 2.00,
      per_paper: 0.15,
      description: 'Academic paper and journal discovery'
    },
    comprehensive: {
      base_cost: 3.00,
      platform_multiplier: 1.5,
      description: 'Multi-platform comprehensive research'
    },
    features: {
      ai_ranking: 0.02, // per source
      quality_filtering: 0.01, // per source
      duplicate_removal: 0.005, // per source
      parallel_processing: 0.5 // flat fee
    }
  },

  // Dashboard integration
  dashboard: {
    cardSize: 'large', // Takes more space due to template gallery
    cardOrder: 10, // High priority position
    showInQuickActions: true,
    defaultExpanded: true,
    
    quickStats: [
      {
        key: 'recent_sessions',
        label: 'Sessions',
        format: 'number'
      },
      {
        key: 'sources_found',
        label: 'Sources Found',
        format: 'number'
      },
      {
        key: 'success_rate',
        label: 'Success Rate',
        format: 'percentage'
      },
      {
        key: 'avg_quality',
        label: 'Avg Quality',
        format: 'score'
      }
    ]
  },

  // Orchestrator integration
  orchestrator: {
    participatesInPipelines: true,
    pipelineRole: 'discovery',
    dependencies: [],
    outputs: ['source-feeds', 'discovery-metadata', 'quality-scores'],
    
    triggers: {
      onNewTopic: true,
      onSchedule: true,
      onDemand: true
    }
  },

  // Natural language interface
  naturalLanguage: {
    enabled: true,
    keywords: [
      'research', 'find', 'discover', 'sources', 'feeds', 'rss',
      'youtube', 'podcasts', 'academic', 'papers', 'channels'
    ],
    patterns: [
      {
        pattern: /research.*(?:topic|about|on)\s+(.+)/i,
        handler: 'researchTopic',
        confidence: 0.9
      },
      {
        pattern: /find.*(?:rss|feeds).*(?:about|for)\s+(.+)/i,
        handler: 'findRSSFeeds',
        confidence: 0.85
      },
      {
        pattern: /discover.*(?:youtube|channels).*(.+)/i,
        handler: 'discoverYouTube',
        confidence: 0.8
      },
      {
        pattern: /search.*(?:podcasts|podcast).*(.+)/i,
        handler: 'searchPodcasts',
        confidence: 0.8
      },
      {
        pattern: /academic.*research.*(.+)/i,
        handler: 'academicResearch',
        confidence: 0.85
      }
    ]
  },

  // Research templates
  templates: {
    'search_rss': {
      name: 'RSS Discovery',
      description: 'Discover RSS feeds using search engines and directories',
      icon: '🔍',
      platforms: ['rss_directories', 'search_engines'],
      parameters: {
        discovery_depth: { type: 'select', options: [1, 2, 3, 4], default: 2 },
        max_sources: { type: 'number', min: 10, max: 200, default: 50 },
        enable_ai_ranking: { type: 'boolean', default: true },
        quality_filtering: { type: 'boolean', default: true },
        remove_duplicates: { type: 'boolean', default: true }
      },
      estimatedTime: '2-4 min',
      estimatedCost: '$2-5'
    },
    'youtube_research': {
      name: 'YouTube Research',
      description: 'Find relevant YouTube channels and videos',
      icon: '📺',
      platforms: ['youtube'],
      parameters: {
        max_channels: { type: 'number', min: 5, max: 100, default: 25 },
        include_videos: { type: 'boolean', default: true },
        subscriber_threshold: { type: 'number', min: 0, max: 1000000, default: 1000 },
        language: { type: 'select', options: ['any', 'en', 'es', 'fr', 'de'], default: 'any' }
      },
      estimatedTime: '3-6 min',
      estimatedCost: '$3-8'
    },
    'podcast_discovery': {
      name: 'Podcast Discovery',
      description: 'Discover podcasts on Apple, Spotify, and other platforms',
      icon: '🎙️',
      platforms: ['apple_podcasts', 'spotify', 'google_podcasts'],
      parameters: {
        max_podcasts: { type: 'number', min: 5, max: 100, default: 30 },
        include_episodes: { type: 'boolean', default: false },
        language: { type: 'select', options: ['any', 'en', 'es', 'fr', 'de'], default: 'any' },
        category_filter: { type: 'text', default: '' }
      },
      estimatedTime: '2-5 min',
      estimatedCost: '$2-6'
    },
    'comprehensive': {
      name: 'Comprehensive Search',
      description: 'Multi-platform discovery across all available sources',
      icon: '🌐',
      platforms: ['rss', 'youtube', 'podcasts', 'news', 'academic'],
      parameters: {
        discovery_depth: { type: 'select', options: [2, 3, 4], default: 3 },
        max_sources: { type: 'number', min: 50, max: 500, default: 100 },
        enable_all_platforms: { type: 'boolean', default: true },
        priority_platform: { type: 'select', options: ['none', 'rss', 'youtube', 'podcasts'], default: 'none' }
      },
      estimatedTime: '5-10 min',
      estimatedCost: '$8-15'
    },
    'academic_research': {
      name: 'Academic Research',
      description: 'Focus on academic papers, journals, and research sources',
      icon: '🎓',
      platforms: ['arxiv', 'pubmed', 'google_scholar', 'ieee'],
      parameters: {
        academic_only: { type: 'boolean', default: true },
        peer_reviewed: { type: 'boolean', default: true },
        max_papers: { type: 'number', min: 10, max: 100, default: 50 },
        publication_year: { type: 'select', options: ['any', '2024', '2023', '2022', 'last_5_years'], default: 'last_5_years' }
      },
      estimatedTime: '4-8 min',
      estimatedCost: '$5-12'
    },
    'news_monitoring': {
      name: 'News Monitoring',
      description: 'Set up ongoing news monitoring for a topic',
      icon: '📰',
      platforms: ['news_apis', 'rss_news', 'social_media'],
      parameters: {
        monitoring_frequency: { type: 'select', options: ['hourly', 'daily', 'weekly'], default: 'daily' },
        max_sources: { type: 'number', min: 10, max: 100, default: 30 },
        alert_threshold: { type: 'select', options: ['any', 'high_relevance', 'breaking'], default: 'high_relevance' },
        include_social: { type: 'boolean', default: false }
      },
      estimatedTime: '3-5 min',
      estimatedCost: '$4-8'
    }
  },

  // Export configurations
  exports: {
    formats: {
      json: {
        name: 'JSON',
        description: 'Machine-readable source data',
        mimeType: 'application/json',
        extension: 'json',
        tiers: ['basic', 'standard', 'premium', 'enterprise']
      },
      csv: {
        name: 'CSV',
        description: 'Spreadsheet-compatible source list',
        mimeType: 'text/csv',
        extension: 'csv',
        tiers: ['standard', 'premium', 'enterprise']
      },
      xlsx: {
        name: 'Excel',
        description: 'Excel workbook with analysis',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: 'xlsx',
        tiers: ['premium', 'enterprise']
      },
      opml: {
        name: 'OPML',
        description: 'RSS reader import format',
        mimeType: 'text/x-opml',
        extension: 'opml',
        tiers: ['standard', 'premium', 'enterprise']
      },
      rss: {
        name: 'RSS Bundle',
        description: 'Combined RSS feed of all sources',
        mimeType: 'application/rss+xml',
        extension: 'xml',
        tiers: ['premium', 'enterprise']
      }
    },
    templates: {
      'source-list': {
        name: 'Source List',
        description: 'Simple list of discovered sources',
        formats: ['csv', 'xlsx', 'json']
      },
      'research-report': {
        name: 'Research Report',
        description: 'Comprehensive research findings with analysis',
        formats: ['xlsx', 'json']
      },
      'rss-bundle': {
        name: 'RSS Bundle',
        description: 'Ready-to-import RSS feeds',
        formats: ['opml', 'rss']
      }
    }
  },

  // Performance and caching
  performance: {
    cacheable: true,
    cacheStrategy: 'topic-hash',
    cacheTTL: 7200, // 2 hours (research data changes slowly)
    
    // Session limits
    sessionLimits: {
      basic: { concurrent: 1, queue: 3 },
      standard: { concurrent: 2, queue: 10 },
      premium: { concurrent: 5, queue: 25 },
      enterprise: { concurrent: 10, queue: 100 }
    },
    
    // Timeout settings
    timeouts: {
      quick: 120000, // 2 minutes
      standard: 300000, // 5 minutes
      comprehensive: 600000 // 10 minutes
    }
  },

  // Monitoring and analytics
  monitoring: {
    trackUsage: true,
    trackCosts: true,
    trackPerformance: true,
    trackErrors: true,
    trackQuality: true,
    
    alerts: {
      highUsage: { threshold: 80, unit: 'percentage' },
      slowResponse: { threshold: 300000, unit: 'milliseconds' },
      errorRate: { threshold: 5, unit: 'percentage' },
      lowQuality: { threshold: 0.6, unit: 'score' }
    }
  },

  // Integration with other workers
  integrations: {
    'rss-librarian': {
      enabled: true,
      autoSave: true,
      description: 'Automatically save discovered feeds to RSS Library'
    },
    'content-classifier': {
      enabled: true,
      autoAnalyze: false,
      description: 'Analyze discovered content for relevance'
    },
    'feed-fetcher': {
      enabled: true,
      autoFetch: false,
      description: 'Fetch content from discovered feeds'
    }
  },

  // Help and documentation
  help: {
    quickStart: {
      title: 'Getting Started with Universal Researcher',
      steps: [
        'Enter your research topic in the topic field',
        'Choose a research template or customize parameters',
        'Select discovery depth and maximum sources',
        'Enable AI ranking for better quality results',
        'Click "Start Research" and monitor progress',
        'Review discovered sources and export results'
      ]
    },
    
    tips: [
      'Use specific topics for more relevant results',
      'Higher discovery depth finds more sources but costs more',
      'AI ranking significantly improves source quality',
      'Save useful sources to RSS Library for future use',
      'Use templates for common research scenarios'
    ],
    
    troubleshooting: {
      'No sources found': 'Try broader topics or lower quality thresholds',
      'Too many irrelevant sources': 'Use more specific topics or enable AI ranking',
      'Research taking too long': 'Reduce discovery depth or max sources',
      'High costs': 'Use lower discovery depth or disable AI features'
    }
  },

  // Webhooks and notifications
  webhooks: {
    enabled: true,
    events: [
      'session.completed',
      'session.failed', 
      'sources.discovered',
      'quality.threshold_met'
    ],
    retryPolicy: {
      maxRetries: 3,
      backoffMultiplier: 2
    }
  },

  // Client SDK configuration
  sdk: {
    enabled: true,
    methods: [
      'startResearch',
      'getSessionStatus',
      'getResults',
      'listSessions',
      'getTemplates',
      'saveTemplate'
    ],
    rateLimit: {
      requests: 50,
      window: 3600 // per hour
    }
  },

  // Advanced features
  advanced: {
    customModels: {
      enabled: false, // Enterprise only
      description: 'Train custom relevance models'
    },
    batchProcessing: {
      enabled: true,
      maxBatchSize: 10,
      description: 'Process multiple topics simultaneously'
    },
    scheduling: {
      enabled: true, // Premium+
      description: 'Schedule recurring research sessions'
    },
    alerts: {
      enabled: true, // Standard+
      description: 'Get notified of new relevant sources'
    }
  }
};

// Register configuration with the system
if (window.phase2Registry) {
  window.phase2Registry.registerWorkerConfig('topic-researcher', TopicResearcherConfig);
}

export default TopicResearcherConfig;