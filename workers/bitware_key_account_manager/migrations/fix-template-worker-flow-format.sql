-- Fix worker_flow format for imported templates
-- Update old format: [{"worker": "name", "step": 1}]
-- To new format: [{"worker": "name", "step": 1, "action": "default", "params": {}, "deliverable_action": "store"}]

-- Fix market_research_pipeline
UPDATE pipeline_template_cache
SET worker_flow = '[
    {
        "worker": "topic_researcher",
        "step": 1,
        "action": "research",
        "params": {
            "depth": "comprehensive"
        },
        "deliverable_action": "pass",
        "output_mapping": "research_results -> content"
    },
    {
        "worker": "content_analyzer",
        "step": 2,
        "action": "analyze",
        "params": {
            "analysis_type": "market_insights"
        },
        "deliverable_action": "pass",
        "output_mapping": "analysis -> insights"
    },
    {
        "worker": "report_generator",
        "step": 3,
        "action": "generate",
        "params": {
            "report_type": "market_research",
            "format": "pdf"
        },
        "deliverable_action": "store"
    }
]'
WHERE template_name = 'market_research_pipeline';

-- Fix content_generation_basic
UPDATE pipeline_template_cache
SET worker_flow = '[
    {
        "worker": "content_generator",
        "step": 1,
        "action": "generate",
        "params": {
            "content_type": "article",
            "tone": "professional"
        },
        "deliverable_action": "store"
    }
]'
WHERE template_name = 'content_generation_basic';

-- Fix data_analysis_advanced
UPDATE pipeline_template_cache
SET worker_flow = '[
    {
        "worker": "data_processor",
        "step": 1,
        "action": "process",
        "params": {
            "processing_type": "clean_and_normalize"
        },
        "deliverable_action": "pass",
        "output_mapping": "processed_data -> data"
    },
    {
        "worker": "data_analyzer",
        "step": 2,
        "action": "analyze",
        "params": {
            "analysis_depth": "advanced"
        },
        "deliverable_action": "pass",
        "output_mapping": "analysis_results -> insights"
    },
    {
        "worker": "visualization_generator",
        "step": 3,
        "action": "visualize",
        "params": {
            "chart_types": ["bar", "line", "pie"],
            "format": "interactive"
        },
        "deliverable_action": "store"
    }
]'
WHERE template_name = 'data_analysis_advanced';

-- Fix sustainability_report
UPDATE pipeline_template_cache
SET worker_flow = '[
    {
        "worker": "data_collector",
        "step": 1,
        "action": "collect",
        "params": {
            "data_sources": ["internal", "external"],
            "metrics": "esg"
        },
        "deliverable_action": "pass",
        "output_mapping": "collected_data -> raw_data"
    },
    {
        "worker": "sustainability_analyzer",
        "step": 2,
        "action": "analyze",
        "params": {
            "framework": "gri_standards"
        },
        "deliverable_action": "pass",
        "output_mapping": "analysis -> sustainability_metrics"
    },
    {
        "worker": "report_generator",
        "step": 3,
        "action": "generate",
        "params": {
            "report_type": "sustainability",
            "format": "pdf",
            "include_visualizations": true
        },
        "deliverable_action": "store"
    }
]'
WHERE template_name = 'sustainability_report';

-- Fix quick_answer
UPDATE pipeline_template_cache
SET worker_flow = '[
    {
        "worker": "question_answerer",
        "step": 1,
        "action": "answer",
        "params": {
            "response_style": "concise",
            "include_sources": true
        },
        "deliverable_action": "store"
    }
]'
WHERE template_name = 'quick_answer';

-- Fix document_summarizer
UPDATE pipeline_template_cache
SET worker_flow = '[
    {
        "worker": "document_processor",
        "step": 1,
        "action": "process",
        "params": {
            "extract_text": true,
            "preserve_formatting": false
        },
        "deliverable_action": "pass",
        "output_mapping": "processed_text -> document_content"
    },
    {
        "worker": "summarizer",
        "step": 2,
        "action": "summarize",
        "params": {
            "summary_length": "medium",
            "preserve_key_points": true
        },
        "deliverable_action": "store"
    }
]'
WHERE template_name = 'document_summarizer';

-- Fix customer_sentiment_analysis
UPDATE pipeline_template_cache
SET worker_flow = '[
    {
        "worker": "text_processor",
        "step": 1,
        "action": "process",
        "params": {
            "clean_text": true,
            "remove_stopwords": true
        },
        "deliverable_action": "pass",
        "output_mapping": "processed_text -> cleaned_text"
    },
    {
        "worker": "sentiment_analyzer",
        "step": 2,
        "action": "analyze",
        "params": {
            "granularity": "aspect_based"
        },
        "deliverable_action": "pass",
        "output_mapping": "sentiment_scores -> sentiment_data"
    },
    {
        "worker": "insights_generator",
        "step": 3,
        "action": "generate",
        "params": {
            "insight_depth": "detailed"
        },
        "deliverable_action": "store"
    }
]'
WHERE template_name = 'customer_sentiment_analysis';

-- Fix technical_documentation
UPDATE pipeline_template_cache
SET worker_flow = '[
    {
        "worker": "code_analyzer",
        "step": 1,
        "action": "analyze",
        "params": {
            "extract_functions": true,
            "extract_classes": true,
            "extract_dependencies": true
        },
        "deliverable_action": "pass",
        "output_mapping": "code_analysis -> analysis"
    },
    {
        "worker": "doc_generator",
        "step": 2,
        "action": "generate",
        "params": {
            "doc_style": "technical",
            "include_examples": true
        },
        "deliverable_action": "pass",
        "output_mapping": "documentation -> raw_docs"
    },
    {
        "worker": "formatter",
        "step": 3,
        "action": "format",
        "params": {
            "output_format": "markdown",
            "add_toc": true
        },
        "deliverable_action": "store"
    }
]'
WHERE template_name = 'technical_documentation';

-- Fix topic_research_basic
UPDATE pipeline_template_cache
SET worker_flow = '[
    {
        "worker": "topic_researcher",
        "step": 1,
        "action": "research",
        "params": {
            "depth": "basic",
            "sources": ["web", "news"]
        },
        "deliverable_action": "pass",
        "output_mapping": "research -> topic_data"
    },
    {
        "worker": "rss_librarian",
        "step": 2,
        "action": "find_feeds",
        "params": {
            "feed_count": 10,
            "quality_filter": true
        },
        "deliverable_action": "store"
    }
]'
WHERE template_name = 'topic_research_basic';

-- Fix comprehensive_analysis
UPDATE pipeline_template_cache
SET worker_flow = '[
    {
        "worker": "topic_researcher",
        "step": 1,
        "action": "research",
        "params": {
            "depth": "comprehensive"
        },
        "deliverable_action": "pass",
        "output_mapping": "research -> topic_context"
    },
    {
        "worker": "rss_librarian",
        "step": 2,
        "action": "find_feeds",
        "params": {
            "feed_count": 20
        },
        "deliverable_action": "pass",
        "output_mapping": "feed_list -> rss_feeds"
    },
    {
        "worker": "feed_fetcher",
        "step": 3,
        "action": "fetch",
        "params": {
            "max_articles": 100
        },
        "deliverable_action": "pass",
        "output_mapping": "articles -> raw_content"
    },
    {
        "worker": "content_classifier",
        "step": 4,
        "action": "classify",
        "params": {
            "classification_depth": "detailed"
        },
        "deliverable_action": "pass",
        "output_mapping": "classified_content -> organized_content"
    },
    {
        "worker": "report_builder",
        "step": 5,
        "action": "build",
        "params": {
            "report_format": "comprehensive",
            "include_visualizations": true
        },
        "deliverable_action": "store"
    }
]'
WHERE template_name = 'comprehensive_analysis';

-- Fix news_monitoring
UPDATE pipeline_template_cache
SET worker_flow = '[
    {
        "worker": "rss_librarian",
        "step": 1,
        "action": "find_feeds",
        "params": {
            "feed_type": "news",
            "update_frequency": "hourly"
        },
        "deliverable_action": "pass",
        "output_mapping": "feed_list -> news_feeds"
    },
    {
        "worker": "feed_fetcher",
        "step": 2,
        "action": "fetch",
        "params": {
            "fetch_mode": "recent_only",
            "max_age_hours": 24
        },
        "deliverable_action": "pass",
        "output_mapping": "articles -> news_articles"
    },
    {
        "worker": "content_classifier",
        "step": 3,
        "action": "classify",
        "params": {
            "classification_type": "topic_and_sentiment"
        },
        "deliverable_action": "store"
    }
]'
WHERE template_name = 'news_monitoring';

-- Fix competitive_intelligence
UPDATE pipeline_template_cache
SET worker_flow = '[
    {
        "worker": "topic_researcher",
        "step": 1,
        "action": "research",
        "params": {
            "focus": "competitive_landscape"
        },
        "deliverable_action": "pass",
        "output_mapping": "research -> competitive_context"
    },
    {
        "worker": "rss_librarian",
        "step": 2,
        "action": "find_feeds",
        "params": {
            "source_type": "industry_specific"
        },
        "deliverable_action": "pass",
        "output_mapping": "feed_list -> competitor_feeds"
    },
    {
        "worker": "feed_fetcher",
        "step": 3,
        "action": "fetch",
        "params": {
            "priority": "competitor_mentions"
        },
        "deliverable_action": "pass",
        "output_mapping": "articles -> competitor_content"
    },
    {
        "worker": "content_classifier",
        "step": 4,
        "action": "classify",
        "params": {
            "classification_focus": "competitive_insights"
        },
        "deliverable_action": "pass",
        "output_mapping": "classified_content -> competitive_data"
    },
    {
        "worker": "report_builder",
        "step": 5,
        "action": "build",
        "params": {
            "report_type": "competitive_intelligence",
            "include_swot": true
        },
        "deliverable_action": "store"
    }
]'
WHERE template_name = 'competitive_intelligence';

-- Also fix categories to be consistent (lowercase)
UPDATE pipeline_template_cache SET category = LOWER(category) WHERE category != LOWER(category);