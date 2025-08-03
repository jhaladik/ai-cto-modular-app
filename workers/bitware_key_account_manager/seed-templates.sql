-- Seed templates for pipeline_template_cache
-- Run this after creating the schema to populate with initial templates

INSERT INTO pipeline_template_cache (
    template_name, display_name, description, category, complexity_level,
    worker_flow, typical_use_cases, keyword_triggers,
    estimated_duration_ms, estimated_cost_usd, min_cost_usd, max_cost_usd,
    is_active, requires_premium, sync_source, created_at, updated_at
) VALUES 
(
    'market_research_pipeline',
    'Market Research Pipeline',
    'Comprehensive market analysis including competitor research, trend analysis, and forecasting',
    'Research',
    'Advanced',
    '[{"worker": "topic_researcher", "step": 1}, {"worker": "content_analyzer", "step": 2}, {"worker": "report_generator", "step": 3}]',
    '["Market analysis", "Industry reports", "Competitor research", "Trend analysis"]',
    '["market", "analysis", "competitor", "industry", "research", "trend"]',
    300000, 0.15, 0.10, 0.25,
    1, 0, 'manual_seed', datetime('now'), datetime('now')
),
(
    'content_generation_basic',
    'Basic Content Generator',
    'Simple content generation for blog posts, articles, and social media',
    'Content',
    'Basic',
    '[{"worker": "content_generator", "step": 1}]',
    '["Blog posts", "Social media content", "Marketing copy", "Product descriptions"]',
    '["write", "content", "blog", "article", "post", "create"]',
    120000, 0.05, 0.02, 0.08,
    1, 0, 'manual_seed', datetime('now'), datetime('now')
),
(
    'data_analysis_advanced',
    'Advanced Data Analysis',
    'Deep data analysis with visualization and insights generation',
    'Analytics',
    'Advanced',
    '[{"worker": "data_processor", "step": 1}, {"worker": "data_analyzer", "step": 2}, {"worker": "visualization_generator", "step": 3}]',
    '["Financial analysis", "Performance metrics", "Trend analysis", "Data visualization"]',
    '["analyze", "data", "metrics", "performance", "financial", "visualization"]',
    420000, 0.25, 0.15, 0.40,
    1, 1, 'manual_seed', datetime('now'), datetime('now')
),
(
    'sustainability_report',
    'Sustainability Report Generator',
    'Generate comprehensive sustainability and ESG reports',
    'Reporting',
    'Intermediate',
    '[{"worker": "data_collector", "step": 1}, {"worker": "sustainability_analyzer", "step": 2}, {"worker": "report_generator", "step": 3}]',
    '["ESG reporting", "Sustainability metrics", "Compliance reports", "Environmental impact"]',
    '["sustainability", "esg", "environment", "compliance", "report"]',
    240000, 0.12, 0.08, 0.18,
    1, 0, 'manual_seed', datetime('now'), datetime('now')
),
(
    'quick_answer',
    'Quick Answer Service',
    'Fast responses to simple questions and information requests',
    'Support',
    'Basic',
    '[{"worker": "question_answerer", "step": 1}]',
    '["FAQ responses", "Quick lookups", "Simple queries", "Information requests"]',
    '["question", "what", "how", "why", "when", "explain"]',
    30000, 0.02, 0.01, 0.03,
    1, 0, 'manual_seed', datetime('now'), datetime('now')
),
(
    'document_summarizer',
    'Document Summarizer',
    'Summarize long documents, reports, and articles',
    'Processing',
    'Intermediate',
    '[{"worker": "document_processor", "step": 1}, {"worker": "summarizer", "step": 2}]',
    '["Document summaries", "Report digests", "Article abstracts", "Executive summaries"]',
    '["summarize", "summary", "digest", "abstract", "tldr"]',
    180000, 0.08, 0.05, 0.12,
    1, 0, 'manual_seed', datetime('now'), datetime('now')
),
(
    'customer_sentiment_analysis',
    'Customer Sentiment Analysis',
    'Analyze customer feedback, reviews, and communications for sentiment and insights',
    'Analytics',
    'Intermediate',
    '[{"worker": "text_processor", "step": 1}, {"worker": "sentiment_analyzer", "step": 2}, {"worker": "insights_generator", "step": 3}]',
    '["Customer feedback analysis", "Review sentiment", "Communication tone", "Satisfaction metrics"]',
    '["sentiment", "feedback", "review", "customer", "satisfaction"]',
    150000, 0.10, 0.06, 0.15,
    1, 0, 'manual_seed', datetime('now'), datetime('now')
),
(
    'technical_documentation',
    'Technical Documentation Generator',
    'Create technical documentation, API docs, and user guides',
    'Documentation',
    'Advanced',
    '[{"worker": "code_analyzer", "step": 1}, {"worker": "doc_generator", "step": 2}, {"worker": "formatter", "step": 3}]',
    '["API documentation", "User guides", "Technical specs", "Code documentation"]',
    '["documentation", "api", "technical", "guide", "manual"]',
    360000, 0.20, 0.12, 0.30,
    1, 1, 'manual_seed', datetime('now'), datetime('now')
);