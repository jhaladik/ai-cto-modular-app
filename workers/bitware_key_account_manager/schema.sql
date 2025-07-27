-- Key Account Manager Database Schema
-- bitware_key_account_manager worker
-- Database: key_account_management_db

-- ==================== CLIENT MANAGEMENT ====================

-- Client profiles and account information
CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT UNIQUE NOT NULL,
    
    -- Client identification
    company_name TEXT NOT NULL,
    primary_contact_name TEXT,
    primary_contact_email TEXT,
    phone TEXT,
    website TEXT,
    
    -- Account details
    subscription_tier TEXT DEFAULT 'standard' CHECK (subscription_tier IN ('basic', 'standard', 'premium', 'enterprise')),
    account_status TEXT DEFAULT 'active' CHECK (account_status IN ('trial', 'active', 'suspended', 'cancelled')),
    monthly_budget_usd REAL DEFAULT 100.0,
    used_budget_current_month REAL DEFAULT 0.0,
    
    -- Industry and context
    industry TEXT,
    company_size TEXT,
    use_case_description TEXT,
    primary_interests TEXT, -- JSON array of topics
    
    -- AI learning data
    communication_style TEXT DEFAULT 'professional', -- formal, casual, technical, executive
    preferred_report_formats TEXT DEFAULT '["json", "html"]', -- JSON array
    typical_request_patterns TEXT DEFAULT '{}', -- JSON with patterns learned by AI
    success_metrics TEXT DEFAULT '{}', -- JSON with KPIs client cares about
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_interaction DATETIME,
    total_lifetime_value REAL DEFAULT 0.0,
    satisfaction_score REAL DEFAULT 0.0 -- Average satisfaction (1-5)
);

-- ==================== SESSION MANAGEMENT ====================

-- Extended session data (extends existing Pages KV sessions)
CREATE TABLE IF NOT EXISTS session_client_context (
    session_token TEXT PRIMARY KEY, -- Links to Pages KV session
    client_id TEXT NOT NULL,
    
    -- Extended session data
    current_request_context TEXT DEFAULT '{}', -- JSON with ongoing request context
    conversation_history TEXT DEFAULT '[]', -- JSON with recent interactions
    active_pipelines TEXT DEFAULT '[]', -- JSON array of active pipeline_ids
    
    -- Session metadata
    login_method TEXT DEFAULT 'dashboard', -- dashboard, email_magic_link, api_key
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    
    FOREIGN KEY (client_id) REFERENCES clients(client_id)
);

-- ==================== COMMUNICATION TRACKING ====================

-- All client communications (emails, messages, calls)
CREATE TABLE IF NOT EXISTS client_communications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    communication_id TEXT UNIQUE NOT NULL,
    client_id TEXT NOT NULL,
    
    -- Communication details
    type TEXT NOT NULL CHECK (type IN ('email_inbound', 'email_outbound', 'phone', 'meeting', 'chat', 'system_notification')),
    subject TEXT,
    content TEXT,
    sender_email TEXT,
    recipient_emails TEXT, -- JSON array for multiple recipients
    
    -- AI analysis
    intent_detected TEXT, -- request_report, ask_question, provide_feedback, etc
    sentiment_score REAL DEFAULT 0.0, -- -1.0 to 1.0
    urgency_level TEXT DEFAULT 'medium' CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
    confidence_score REAL DEFAULT 0.0, -- AI confidence in analysis
    
    -- Processing status
    processed_by_kam BOOLEAN DEFAULT FALSE,
    requires_human_attention BOOLEAN DEFAULT FALSE,
    response_sent BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    
    FOREIGN KEY (client_id) REFERENCES clients(client_id)
);

-- ==================== REQUEST MANAGEMENT ====================

-- Client requests and pipeline tracking
CREATE TABLE IF NOT EXISTS client_requests (
    request_id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    communication_id TEXT, -- Original communication that triggered request
    
    -- Request details
    request_type TEXT NOT NULL, -- pipeline_execution, information_request, support_request
    original_message TEXT,
    processed_request TEXT, -- Cleaned/parsed version for AI processing
    
    -- Template and pipeline
    selected_template TEXT, -- Pipeline template name
    template_selection_method TEXT, -- ai_recommended, client_selected, default
    template_confidence_score REAL DEFAULT 0.0,
    
    -- Execution tracking
    orchestrator_pipeline_id TEXT, -- Links to orchestrator execution
    request_status TEXT DEFAULT 'pending' CHECK (request_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    
    -- Client context
    urgency_override TEXT, -- If client specified urgency
    budget_override REAL, -- If client specified budget
    custom_parameters TEXT DEFAULT '{}', -- JSON with custom request parameters
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_processing_at DATETIME,
    completed_at DATETIME,
    
    FOREIGN KEY (client_id) REFERENCES clients(client_id),
    FOREIGN KEY (communication_id) REFERENCES client_communications(communication_id)
);

-- ==================== PIPELINE TRANSPARENCY ====================

-- Worker session tracking for client transparency
CREATE TABLE IF NOT EXISTS pipeline_worker_sessions (
    session_id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    orchestrator_pipeline_id TEXT,
    
    -- Worker details
    worker_name TEXT NOT NULL,
    worker_session_id TEXT, -- Internal worker session ID
    step_order INTEGER,
    
    -- Performance metrics
    execution_time_ms INTEGER,
    worker_cost_usd REAL,
    cache_hit BOOLEAN DEFAULT FALSE,
    quality_score REAL,
    
    -- Results
    worker_success BOOLEAN,
    worker_error TEXT,
    deliverables_summary TEXT, -- Human-readable summary of what worker produced
    
    -- Timestamps
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    
    FOREIGN KEY (request_id) REFERENCES client_requests(request_id),
    FOREIGN KEY (client_id) REFERENCES clients(client_id)
);

-- ==================== TEMPLATE INTELLIGENCE ====================

-- Cached pipeline templates from orchestrator
CREATE TABLE IF NOT EXISTS pipeline_template_cache (
    template_name TEXT PRIMARY KEY,
    display_name TEXT,
    description TEXT,
    category TEXT,
    complexity_level TEXT,
    
    -- Template capabilities
    worker_flow TEXT DEFAULT '[]', -- JSON: [{"worker": "topic_researcher", "step": 1}, ...]
    typical_use_cases TEXT DEFAULT '[]', -- JSON array
    keyword_triggers TEXT DEFAULT '[]', -- JSON array of keywords that suggest this template
    
    -- Performance characteristics
    estimated_duration_ms INTEGER DEFAULT 120000,
    estimated_cost_usd REAL DEFAULT 0.10,
    min_cost_usd REAL DEFAULT 0.01,
    max_cost_usd REAL DEFAULT 1.00,
    
    -- Template metadata
    is_active BOOLEAN DEFAULT TRUE,
    requires_premium BOOLEAN DEFAULT FALSE,
    
    -- Cache management
    last_synced_from_orchestrator DATETIME,
    sync_source TEXT DEFAULT 'orchestrator_api',
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Template usage analytics
CREATE TABLE IF NOT EXISTS template_usage_analytics (
    usage_id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    template_name TEXT NOT NULL,
    
    -- Usage context
    request_context TEXT, -- What client asked for
    selection_method TEXT, -- ai_recommended, client_selected, default_fallback
    confidence_score REAL DEFAULT 0.0,
    
    -- Outcome tracking
    request_successful BOOLEAN,
    client_satisfaction REAL, -- 1-5 if provided
    cost_vs_estimate_ratio REAL, -- actual_cost / estimated_cost
    time_vs_estimate_ratio REAL, -- actual_time / estimated_time
    
    used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (client_id) REFERENCES clients(client_id),
    FOREIGN KEY (template_name) REFERENCES pipeline_template_cache(template_name)
);

-- ==================== CLIENT ANALYTICS ====================

-- Client needs analysis and prediction
CREATE TABLE IF NOT EXISTS client_needs_analysis (
    analysis_id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    
    -- Analysis period
    analysis_period_start DATE,
    analysis_period_end DATE,
    
    -- Usage patterns
    total_requests INTEGER DEFAULT 0,
    avg_requests_per_week REAL DEFAULT 0.0,
    most_common_topics TEXT DEFAULT '[]', -- JSON array
    preferred_templates TEXT DEFAULT '[]', -- JSON array
    
    -- Cost patterns
    total_spend_usd REAL DEFAULT 0.0,
    avg_cost_per_request REAL DEFAULT 0.0,
    budget_utilization_rate REAL DEFAULT 0.0, -- Percentage of budget used
    
    -- Quality patterns
    avg_satisfaction_score REAL DEFAULT 0.0,
    completion_rate REAL DEFAULT 0.0, -- Percentage of successful requests
    
    -- Predictions
    predicted_next_request_topic TEXT,
    predicted_monthly_spend REAL,
    churn_risk_score REAL DEFAULT 0.0, -- 0.0 to 1.0
    upsell_opportunity_score REAL DEFAULT 0.0, -- 0.0 to 1.0
    
    -- Analysis metadata
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    generated_by TEXT DEFAULT 'auto_analysis',
    
    FOREIGN KEY (client_id) REFERENCES clients(client_id)
);

-- ==================== INDEXES FOR PERFORMANCE ====================

-- Client lookup indexes
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(primary_contact_email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(account_status);
CREATE INDEX IF NOT EXISTS idx_clients_tier ON clients(subscription_tier);

-- Communication indexes
CREATE INDEX IF NOT EXISTS idx_communications_client ON client_communications(client_id);
CREATE INDEX IF NOT EXISTS idx_communications_type ON client_communications(type);
CREATE INDEX IF NOT EXISTS idx_communications_date ON client_communications(sent_at);
CREATE INDEX IF NOT EXISTS idx_communications_processed ON client_communications(processed_by_kam);

-- Request tracking indexes
CREATE INDEX IF NOT EXISTS idx_requests_client ON client_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON client_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_requests_template ON client_requests(selected_template);
CREATE INDEX IF NOT EXISTS idx_requests_date ON client_requests(created_at);

-- Worker session indexes
CREATE INDEX IF NOT EXISTS idx_worker_sessions_request ON pipeline_worker_sessions(request_id);
CREATE INDEX IF NOT EXISTS idx_worker_sessions_client ON pipeline_worker_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_worker_sessions_worker ON pipeline_worker_sessions(worker_name);

-- Template analytics indexes
CREATE INDEX IF NOT EXISTS idx_template_usage_client ON template_usage_analytics(client_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_template ON template_usage_analytics(template_name);
CREATE INDEX IF NOT EXISTS idx_template_usage_date ON template_usage_analytics(used_at);

-- Session context indexes
CREATE INDEX IF NOT EXISTS idx_session_context_client ON session_client_context(client_id);
CREATE INDEX IF NOT EXISTS idx_session_context_activity ON session_client_context(last_activity);