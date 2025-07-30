// public/js/workers/report-builder/config.js
// Report Builder Worker Configuration
// Defines integration points, permissions, and metadata for intelligence report generation

export const ReportBuilderConfig = {
  // Worker identity
  workerId: 'report-builder',
  name: 'Report Builder',
  description: 'Transform analyzed content into actionable intelligence reports',
  version: '2.0.0',
  icon: '📊',
  
  // UI Components
  components: {
    card: {
      module: './card.js',
      class: 'ReportBuilderCard',
      lazy: false // Load immediately for dashboard
    },
    fullInterface: {
      module: './interface.js', 
      class: 'ReportBuilderInterface',
      lazy: true // Load on demand
    }
  },

  // API Configuration
  api: {
    baseUrl: 'https://bitware-report-builder.jhaladik.workers.dev',
    proxyEndpoint: '/api/report-builder',
    authMethod: 'session',
    endpoints: {
      generate: { method: 'POST', path: '/generate' },
      jobStatus: { method: 'GET', path: '/job/{id}/status' },
      jobReport: { method: 'GET', path: '/job/{id}/report' },
      reports: { method: 'GET', path: '/reports' },
      reportDetails: { method: 'GET', path: '/reports/{id}' },
      dataSourceStats: { method: 'GET', path: '/data-sources/stats' },
      templates: { method: 'GET', path: '/templates' },
      saveTemplate: { method: 'POST', path: '/templates' },
      scheduleReport: { method: 'POST', path: '/schedule' },
      health: { method: 'GET', path: '/health' },
      capabilities: { method: 'GET', path: '/capabilities' },
      stats: { method: 'GET', path: '/admin/stats' }
    }
  },

  // Permission Requirements
  permissions: {
    view: {
      roles: ['admin', 'client'],
      tiers: ['standard', 'premium', 'enterprise']
    },
    execute: {
      roles: ['admin', 'client'],
      tiers: ['standard', 'premium', 'enterprise'],
      limits: {
        standard: { max_reports_per_day: 5, max_pages_per_report: 10 },
        premium: { max_reports_per_day: 25, max_pages_per_report: 50 },
        enterprise: { max_reports_per_day: -1, max_pages_per_report: -1 }
      }
    },
    schedule: {
      roles: ['admin', 'client'],
      tiers: ['premium', 'enterprise']
    },
    admin: {
      roles: ['admin'],
      tiers: ['enterprise']
    }
  },

  // Features available by tier
  features: {
    standard: [
      'basic_reports',
      'executive_summary',
      'daily_briefing',
      'html_output',
      'json_export',
      'basic_charts'
    ],
    premium: [
      'basic_reports',
      'executive_summary',
      'daily_briefing',
      'trend_analysis',
      'competitive_intelligence',
      'all_output_formats',
      'advanced_charts',
      'custom_templates',
      'scheduled_reports',
      'batch_generation'
    ],
    enterprise: [
      'all_features',
      'technical_deep_dive',
      'custom_branding',
      'api_access',
      'white_label',
      'priority_generation',
      'dedicated_support',
      'advanced_analytics',
      'custom_visualizations'
    ]
  },

  // Cost structure
  pricing: {
    executive_summary: {
      base_cost: 1.50,
      per_page: 0.25,
      description: 'High-level overview with key insights'
    },
    trend_analysis: {
      base_cost: 2.50,
      per_page: 0.40,
      description: 'Detailed trend analysis with forecasting'
    },
    technical_deep_dive: {
      base_cost: 4.00,
      per_page: 0.60,
      description: 'In-depth technical analysis'
    },
    competitive_intelligence: {
      base_cost: 3.50,
      per_page: 0.50,
      description: 'Competitive landscape analysis'
    },
    daily_briefing: {
      base_cost: 1.00,
      per_page: 0.15,
      description: 'Concise daily updates'
    },
    features: {
      charts: 0.30,
      visualizations: 0.50,
      custom_branding: 1.00,
      pdf_generation: 0.20,
      docx_generation: 0.25,
      email_formatting: 0.10
    },
    format_multipliers: {
      html: 1.0,
      pdf: 1.2,
      json: 0.8,
      docx: 1.3,
      email: 1.1
    }
  },

  // Dashboard integration
  dashboard: {
    cardSize: 'large',
    cardOrder: 20,
    showInQuickActions: true,
    defaultExpanded: false,
    
    quickStats: [
      {
        key: 'recent_reports',
        label: 'Reports',
        format: 'number'
      },
      {
        key: 'avg_gen_time',
        label: 'Avg Gen Time',
        format: 'duration'
      },
      {
        key: 'success_rate',
        label: 'Success Rate',
        format: 'percentage'
      },
      {
        key: 'total_cost',
        label: 'Total Cost',
        format: 'currency'
      }
    ]
  },

  // Orchestrator integration
  orchestrator: {
    participatesInPipelines: true,
    pipelineRole: 'intelligence',
    dependencies: ['content-classifier', 'topic-researcher'],
    outputs: ['intelligence-reports', 'insights', 'visualizations'],
    
    triggers: {
      onAnalysisComplete: true,
      onSchedule: true,
      onDemand: true
    }
  },

  // Natural language interface
  naturalLanguage: {
    enabled: true,
    keywords: [
      'report', 'generate', 'analysis', 'summary', 'briefing',
      'insights', 'trends', 'intelligence', 'visualization'
    ],
    patterns: [
      {
        pattern: /generate.*report.*(?:about|on|for)\s+(.+)/i,
        handler: 'generateReport',
        confidence: 0.9
      },
      {
        pattern: /create.*(?:summary|briefing).*(.+)/i,
        handler: 'createSummary',
        confidence: 0.85
      },
      {
        pattern: /analyze.*trends.*(.+)/i,
        handler: 'analyzeTrends',
        confidence: 0.8
      },
      {
        pattern: /competitive.*analysis.*(.+)/i,
        handler: 'competitiveAnalysis',
        confidence: 0.85
      }
    ]
  },

  // Report templates
  templates: {
    'executive_summary': {
      name: 'Executive Summary',
      description: 'High-level overview with key insights and recommendations',
      sections: [
        'Executive Summary',
        'Key Findings',
        'Trend Analysis',
        'Strategic Recommendations',
        'Appendix'
      ],
      defaultParameters: {
        include_charts: true,
        include_sources: true,
        max_pages: 5,
        executive_level: true
      },
      estimatedLength: '3-5 pages',
      estimatedTime: '2-4 min',
      estimatedCost: '$2-4'
    },
    'trend_analysis': {
      name: 'Trend Analysis',
      description: 'Detailed analysis of trends and patterns over time',
      sections: [
        'Trend Overview',
        'Historical Analysis',
        'Current State',
        'Future Projections',
        'Implications',
        'Methodology'
      ],
      defaultParameters: {
        include_charts: true,
        include_forecasting: true,
        time_series_analysis: true,
        max_pages: 8
      },
      estimatedLength: '5-8 pages',
      estimatedTime: '3-6 min',
      estimatedCost: '$3-6'
    },
    'competitive_intelligence': {
      name: 'Competitive Intelligence',
      description: 'Competitive landscape analysis and market positioning',
      sections: [
        'Market Overview',
        'Competitor Analysis',
        'Positioning Matrix',
        'SWOT Analysis',
        'Opportunities',
        'Threats Assessment'
      ],
      defaultParameters: {
        include_swot: true,
        competitor_comparison: true,
        market_sizing: true,
        max_pages: 10
      },
      estimatedLength: '6-10 pages',
      estimatedTime: '4-8 min',
      estimatedCost: '$4-8'
    },
    'technical_deep_dive': {
      name: 'Technical Deep Dive',
      description: 'In-depth technical analysis with detailed methodology',
      sections: [
        'Technical Overview',
        'Methodology',
        'Data Analysis',
        'Statistical Insights',
        'Technical Findings',
        'Recommendations',
        'Appendices'
      ],
      defaultParameters: {
        include_methodology: true,
        statistical_analysis: true,
        technical_details: true,
        max_pages: 15
      },
      estimatedLength: '8-15 pages',
      estimatedTime: '6-12 min',
      estimatedCost: '$6-12'
    },
    'daily_briefing': {
      name: 'Daily Briefing',
      description: 'Concise daily update with latest developments',
      sections: [
        'Daily Highlights',
        'Key Developments',
        'Trending Topics',
        'Action Items',
        'Tomorrow\'s Focus'
      ],
      defaultParameters: {
        concise_format: true,
        bullet_points: true,
        max_pages: 2,
        daily_focus: true
      },
      estimatedLength: '1-2 pages',
      estimatedTime: '1-2 min',
      estimatedCost: '$1-2'
    },
    'weekly_roundup': {
      name: 'Weekly Roundup',
      description: 'Comprehensive weekly summary and analysis',
      sections: [
        'Week in Review',
        'Key Metrics',
        'Significant Events',
        'Trend Analysis',
        'Looking Ahead'
      ],
      defaultParameters: {
        weekly_metrics: true,
        trend_comparison: true,
        max_pages: 6
      },
      estimatedLength: '4-6 pages',
      estimatedTime: '3-5 min',
      estimatedCost: '$3-5'
    }
  },

  // Output formats
  outputFormats: {
    html: {
      name: 'HTML',
      description: 'Interactive web report',
      mimeType: 'text/html',
      extension: 'html',
      features: ['interactive_charts', 'hyperlinks', 'responsive_design'],
      tiers: ['standard', 'premium', 'enterprise']
    },
    pdf: {
      name: 'PDF',
      description: 'Print-ready document',
      mimeType: 'application/pdf',
      extension: 'pdf',
      features: ['print_optimized', 'vector_graphics', 'bookmarks'],
      tiers: ['premium', 'enterprise']
    },
    json: {
      name: 'JSON',
      description: 'Structured data format',
      mimeType: 'application/json',
      extension: 'json',
      features: ['machine_readable', 'api_integration'],
      tiers: ['standard', 'premium', 'enterprise']
    },
    docx: {
      name: 'Word Document',
      description: 'Microsoft Word format',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extension: 'docx',
      features: ['editable', 'comments', 'track_changes'],
      tiers: ['premium', 'enterprise']
    },
    email: {
      name: 'Email Ready',
      description: 'Formatted for email distribution',
      mimeType: 'text/html',
      extension: 'html',
      features: ['email_optimized', 'embedded_images', 'responsive'],
      tiers: ['standard', 'premium', 'enterprise']
    },
    pptx: {
      name: 'PowerPoint',
      description: 'Presentation format',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      extension: 'pptx',
      features: ['slides', 'charts', 'templates'],
      tiers: ['enterprise']
    }
  },

  // Data source integrations
  dataSources: {
    'content-classifier': {
      enabled: true,
      required: false,
      description: 'Analyzed and classified articles',
      queryPath: '/analyzed-content'
    },
    'topic-researcher': {
      enabled: true,
      required: false,
      description: 'Discovered sources and feeds',
      queryPath: '/research-sources'
    },
    'rss-librarian': {
      enabled: true,
      required: false,
      description: 'RSS feed content',
      queryPath: '/rss-content'
    },
    'feed-fetcher': {
      enabled: true,
      required: false,
      description: 'Fetched article content',
      queryPath: '/fetched-content'
    }
  },

  // Visualization options
  visualizations: {
    charts: {
      enabled: true,
      types: ['line', 'bar', 'pie', 'scatter', 'heatmap'],
      libraries: ['chart.js', 'd3'],
      responsive: true
    },
    maps: {
      enabled: true, // Premium+
      types: ['geographic', 'network', 'tree'],
      interactive: true
    },
    infographics: {
      enabled: true, // Enterprise
      custom_design: true,
      branding: true
    }
  },

  // Scheduling and automation
  scheduling: {
    enabled: true, // Premium+
    frequencies: ['hourly', 'daily', 'weekly', 'monthly'],
    maxScheduledReports: {
      premium: 10,
      enterprise: -1
    },
    delivery: {
      email: true,
      webhook: true,
      ftp: true // Enterprise
    }
  },

  // Performance and caching
  performance: {
    cacheable: true,
    cacheStrategy: 'report-hash',
    cacheTTL: 3600, // 1 hour
    
    generationLimits: {
      standard: { concurrent: 1, queue: 3 },
      premium: { concurrent: 3, queue: 10 },
      enterprise: { concurrent: 10, queue: 50 }
    },
    
    timeouts: {
      simple: 120000, // 2 minutes
      complex: 600000 // 10 minutes
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
      slowGeneration: { threshold: 300000, unit: 'milliseconds' },
      errorRate: { threshold: 5, unit: 'percentage' },
      qualityIssues: { threshold: 0.7, unit: 'score' }
    }
  },

  // Quality assurance
  qualityAssurance: {
    enabled: true,
    checks: [
      'completeness',
      'accuracy',
      'readability',
      'formatting',
      'source_verification'
    ],
    minimumQualityScore: 0.8,
    automaticRetry: true,
    humanReview: true // Enterprise
  },

  // Branding and customization
  branding: {
    enabled: true, // Premium+
    options: {
      logo: true,
      colors: true,
      fonts: true,
      header_footer: true,
      watermark: true // Enterprise
    },
    templates: {
      corporate: true,
      academic: true,
      consulting: true,
      custom: true // Enterprise
    }
  },

  // Help and documentation
  help: {
    quickStart: {
      title: 'Getting Started with Report Builder',
      steps: [
        'Select a report type or template',
        'Choose your data sources and time range',
        'Configure output format and options',
        'Review cost estimate and generate report',
        'Download or share your completed report'
      ]
    },
    
    tips: [
      'Use executive summaries for high-level overviews',
      'Include charts for better data visualization',
      'Schedule regular reports for ongoing monitoring',
      'Use templates to maintain consistency',
      'Export to multiple formats for different audiences'
    ],
    
    troubleshooting: {
      'Empty reports': 'Check data source availability and time range',
      'Slow generation': 'Reduce complexity or use simpler templates',
      'High costs': 'Use shorter time ranges or simpler report types',
      'Formatting issues': 'Try different output formats'
    }
  },

  // Client SDK configuration
  sdk: {
    enabled: true,
    methods: [
      'generateReport',
      'getJobStatus',
      'downloadReport',
      'listReports',
      'scheduleReport',
      'getTemplates'
    ],
    rateLimit: {
      requests: 30,
      window: 3600 // per hour
    }
  },

  // Compliance and security
  compliance: {
    dataRetention: {
      reports: '2 years',
      analytics: '1 year',
      temp_files: '7 days'
    },
    privacy: {
      dataAnonymization: true,
      gdprCompliant: true,
      auditTrail: true
    },
    security: {
      accessLogging: true,
      reportEncryption: true,
      secureDeletion: true
    }
  }
};

// Register configuration with the system
if (window.phase2Registry) {
  window.phase2Registry.registerWorkerConfig('report-builder', ReportBuilderConfig);
}

export default ReportBuilderConfig;