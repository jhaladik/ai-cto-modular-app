// public/js/workers/content-classifier/config.js
// Content Classifier Worker Configuration
// Defines integration points, permissions, and metadata for the Phase 3 architecture

export const ContentClassifierConfig = {
  // Worker identity
  workerId: 'content-classifier',
  name: 'Content Classifier',
  description: 'AI-powered content analysis and topic classification',
  version: '2.0.0',
  icon: '🧠',
  
  // UI Components
  components: {
    card: {
      module: './card.js',
      class: 'ContentClassifierCard',
      lazy: false // Load immediately for dashboard
    },
    fullInterface: {
      module: './interface.js', 
      class: 'ContentClassifierInterface',
      lazy: true // Load on demand
    }
  },

  // API Configuration
  api: {
    baseUrl: 'https://bitware-content-classifier.jhaladik.workers.dev',
    proxyEndpoint: '/api/content-classifier',
    authMethod: 'session', // Uses session-based auth
    endpoints: {
      analyze: { method: 'POST', path: '/analyze' },
      batchAnalyze: { method: 'POST', path: '/batch-analyze' },
      jobStatus: { method: 'GET', path: '/job/{id}/status' },
      jobResults: { method: 'GET', path: '/job/{id}/results' },
      recentJobs: { method: 'GET', path: '/jobs/recent' },
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
        basic: { max_articles_per_day: 10, max_batch_size: 5 },
        standard: { max_articles_per_day: 100, max_batch_size: 25 },
        premium: { max_articles_per_day: 500, max_batch_size: 100 },
        enterprise: { max_articles_per_day: -1, max_batch_size: -1 }
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
      'quick_analysis',
      'basic_export',
      'standard_confidence'
    ],
    standard: [
      'quick_analysis',
      'standard_analysis', 
      'batch_processing',
      'csv_export',
      'json_export',
      'sentiment_analysis'
    ],
    premium: [
      'quick_analysis',
      'standard_analysis',
      'deep_analysis',
      'batch_processing',
      'parallel_processing',
      'all_export_formats',
      'sentiment_analysis',
      'entity_extraction',
      'custom_templates',
      'api_access'
    ],
    enterprise: [
      'all_features',
      'admin_access',
      'advanced_analytics',
      'custom_models',
      'priority_processing',
      'dedicated_support'
    ]
  },

  // Cost structure
  pricing: {
    quick: {
      base_cost: 0.01,
      per_article: 0.02,
      description: 'Basic topic classification and relevance scoring'
    },
    standard: {
      base_cost: 0.02,
      per_article: 0.08,
      description: 'Comprehensive analysis with summaries and insights'
    },
    deep: {
      base_cost: 0.05,
      per_article: 0.20,
      description: 'Advanced analysis with entities, sentiment, and reasoning'
    },
    features: {
      summary: 0.02,
      entities: 0.01,
      sentiment: 0.015,
      parallel: 0.005 // per article multiplier
    }
  },

  // Dashboard integration
  dashboard: {
    cardSize: 'medium', // small, medium, large
    cardOrder: 30, // Position in dashboard
    showInQuickActions: true,
    defaultExpanded: false,
    
    // Quick stats shown on card
    quickStats: [
      {
        key: 'recent_jobs',
        label: 'Recent Jobs',
        format: 'number'
      },
      {
        key: 'analyzed_articles',
        label: 'Articles Analyzed',
        format: 'number'
      },
      {
        key: 'success_rate',
        label: 'Success Rate',
        format: 'percentage'
      },
      {
        key: 'avg_relevance',
        label: 'Avg Relevance',
        format: 'score'
      }
    ]
  },

  // Orchestrator integration
  orchestrator: {
    participatesInPipelines: true,
    pipelineRole: 'analyzer',
    dependencies: ['feed-fetcher', 'rss-librarian'],
    outputs: ['analyzed-content', 'relevance-scores', 'topic-classifications'],
    
    // Auto-execution triggers
    triggers: {
      onNewContent: true,
      onSchedule: false,
      onDemand: true
    }
  },

  // Natural language interface
  naturalLanguage: {
    enabled: true,
    keywords: [
      'analyze', 'classify', 'content', 'articles', 'relevance',
      'sentiment', 'topics', 'quality', 'score', 'insights'
    ],
    patterns: [
      {
        pattern: /analyze.*content.*for.*topic/i,
        handler: 'analyzeContentForTopic',
        confidence: 0.9
      },
      {
        pattern: /classify.*articles.*about/i,
        handler: 'classifyArticlesAbout',
        confidence: 0.85
      },
      {
        pattern: /find.*relevant.*content/i,
        handler: 'findRelevantContent',
        confidence: 0.8
      },
      {
        pattern: /sentiment.*analysis/i,
        handler: 'performSentimentAnalysis',
        confidence: 0.85
      }
    ]
  },

  // Templates and presets
  templates: {
    'news-analysis': {
      name: 'News Article Analysis',
      description: 'Optimized for news articles and current events',
      parameters: {
        analysis_depth: 'standard',
        confidence_threshold: 0.7,
        include_summary: true,
        extract_entities: true,
        sentiment_analysis: true
      }
    },
    'research-papers': {
      name: 'Academic Research Analysis',
      description: 'Deep analysis for academic and research content',
      parameters: {
        analysis_depth: 'deep',
        confidence_threshold: 0.85,
        include_summary: true,
        extract_entities: true,
        sentiment_analysis: false
      }
    },
    'social-media': {
      name: 'Social Media Content',
      description: 'Quick analysis for social media posts and comments',
      parameters: {
        analysis_depth: 'quick',
        confidence_threshold: 0.6,
        include_summary: false,
        extract_entities: false,
        sentiment_analysis: true
      }
    },
    'marketing-content': {
      name: 'Marketing Analysis',
      description: 'Analysis focused on marketing and promotional content',
      parameters: {
        analysis_depth: 'standard',
        confidence_threshold: 0.75,
        include_summary: true,
        extract_entities: true,
        sentiment_analysis: true
      }
    }
  },

  // Export configurations
  exports: {
    formats: {
      json: {
        name: 'JSON',
        description: 'Machine-readable format',
        mimeType: 'application/json',
        extension: 'json',
        tiers: ['basic', 'standard', 'premium', 'enterprise']
      },
      csv: {
        name: 'CSV',
        description: 'Spreadsheet-compatible format',
        mimeType: 'text/csv',
        extension: 'csv',
        tiers: ['standard', 'premium', 'enterprise']
      },
      xlsx: {
        name: 'Excel',
        description: 'Excel workbook with multiple sheets',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: 'xlsx',
        tiers: ['premium', 'enterprise']
      },
      pdf: {
        name: 'PDF Report',
        description: 'Formatted analysis report',
        mimeType: 'application/pdf',
        extension: 'pdf',
        tiers: ['premium', 'enterprise']
      }
    },
    templates: {
      'analysis-report': {
        name: 'Analysis Report',
        description: 'Comprehensive analysis with charts and insights',
        formats: ['pdf', 'xlsx']
      },
      'summary-report': {
        name: 'Executive Summary',
        description: 'High-level overview and key findings',
        formats: ['pdf', 'csv']
      },
      'detailed-insights': {
        name: 'Detailed Insights',
        description: 'Full data export with all analysis details',
        formats: ['json', 'xlsx']
      }
    }
  },

  // Performance and caching
  performance: {
    cacheable: true,
    cacheStrategy: 'content-hash',
    cacheTTL: 3600, // 1 hour
    
    // Batch processing limits
    batchLimits: {
      basic: 5,
      standard: 25,
      premium: 100,
      enterprise: 500
    },
    
    // Timeout settings
    timeouts: {
      quick: 30000, // 30 seconds
      standard: 120000, // 2 minutes  
      deep: 300000 // 5 minutes
    }
  },

  // Monitoring and analytics
  monitoring: {
    trackUsage: true,
    trackCosts: true,
    trackPerformance: true,
    trackErrors: true,
    
    alerts: {
      highUsage: { threshold: 80, unit: 'percentage' },
      slowResponse: { threshold: 60000, unit: 'milliseconds' },
      errorRate: { threshold: 5, unit: 'percentage' }
    }
  },

  // Help and documentation
  help: {
    quickStart: {
      title: 'Getting Started with Content Classifier',
      steps: [
        'Enter a target topic you want to analyze content for',
        'Add article URLs, RSS feeds, or paste content directly',
        'Choose your analysis depth based on your needs',
        'Click "Start Analysis" and monitor progress',
        'Review results and export in your preferred format'
      ]
    },
    
    tips: [
      'Use specific topics for better relevance scoring',
      'Standard analysis offers the best balance of speed and accuracy',
      'Batch processing is more cost-effective for multiple articles',
      'Enable caching to avoid re-analyzing the same content'
    ],
    
    troubleshooting: {
      'Low relevance scores': 'Try more specific topics or check content quality',
      'Analysis taking too long': 'Consider using quick analysis or smaller batches',
      'High costs': 'Use quick analysis for preliminary screening'
    }
  },

  // Integration hooks
  hooks: {
    beforeExecute: 'validateAnalysisRequest',
    afterExecute: 'updateAnalyticsAndCache',
    onError: 'logErrorAndNotify',
    onSuccess: 'updateSuccessMetrics'
  },

  // Client SDK configuration
  sdk: {
    enabled: true,
    methods: [
      'analyzeContent',
      'batchAnalyze', 
      'getJobStatus',
      'getResults',
      'listJobs'
    ],
    rateLimit: {
      requests: 100,
      window: 3600 // per hour
    }
  }
};

// Register configuration with the system
if (window.phase2Registry) {
  window.phase2Registry.registerWorkerConfig('content-classifier', ContentClassifierConfig);
}

export default ContentClassifierConfig;