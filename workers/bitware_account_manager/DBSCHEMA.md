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
    communication_style TEXT, -- formal, casual, technical, executive
    preferred_report_formats TEXT, -- JSON array: json, html, email, etc
    typical_request_patterns TEXT, -- JSON with patterns learned by AI
    success_metrics TEXT, -- JSON with KPIs client cares about
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_interaction DATETIME,
    total_lifetime_value REAL DEFAULT 0.0
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
    recipient_email TEXT,
    
    -- AI analysis
    intent_detected TEXT, -- request_report, ask_question, provide_feedback, etc
    sentiment_score REAL, -- -1.0 to 1.0
    urgency_level TEXT CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
    topics_mentioned TEXT, -- JSON array of detected topics
    action_items_extracted TEXT, -- JSON array of action items
    
    -- Processing status
    processed_by_ai BOOLEAN DEFAULT FALSE,
    requires_human_attention BOOLEAN DEFAULT FALSE,
    auto_response_sent BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    
    FOREIGN KEY (client_id) REFERENCES clients(client_id)
);

-- ==================== REQUEST TRACKING ====================

-- Client requests and their fulfillment
CREATE TABLE IF NOT EXISTS client_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT UNIQUE NOT NULL,
    client_id TEXT NOT NULL,
    communication_id TEXT, -- Link to original communication
    
    -- Request details
    request_type TEXT NOT NULL CHECK (request_type IN (
        'intelligence_report', 'topic_research', 'competitive_analysis', 
        'trend_monitoring', 'custom_pipeline', 'data_export', 'account_support'
    )),
    request_description TEXT,
    parameters TEXT, -- JSON with specific parameters
    
    -- Fulfillment
    pipeline_id TEXT, -- Link to orchestrator pipeline execution
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    result_data TEXT, -- JSON with final result
    delivery_method TEXT, -- email, dashboard, api, etc
    
    -- Performance tracking
    estimated_cost_usd REAL,
    actual_cost_usd REAL,
    estimated_completion_time INTEGER, -- minutes
    actual_completion_time INTEGER,
    client_satisfaction_score REAL, -- 1-5 rating if provided
    
    -- Timestamps
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    delivered_at DATETIME,
    
    FOREIGN KEY (client_id) REFERENCES clients(client_id)
);

-- ==================== NEEDS ANALYSIS & PREDICTIONS ====================

-- AI-powered analysis of client needs and patterns
CREATE TABLE IF NOT EXISTS client_needs_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id TEXT UNIQUE NOT NULL,
    client_id TEXT NOT NULL,
    
    -- Analysis metadata
    analysis_type TEXT NOT NULL CHECK (analysis_type IN (
        'communication_pattern', 'topic_interest', 'usage_behavior', 
        'satisfaction_trend', 'churn_risk', 'upsell_opportunity'
    )),
    analysis_period_start DATETIME,
    analysis_period_end DATETIME,
    
    -- AI insights
    insights TEXT, -- JSON with detailed insights
    confidence_score REAL, -- 0.0 to 1.0
    recommended_actions TEXT, -- JSON array of recommended actions
    predicted_needs TEXT, -- JSON array of predicted future needs
    
    -- Proactive opportunities
    suggested_reports TEXT, -- JSON array of reports to proactively suggest
    optimal_contact_timing TEXT, -- JSON with best times to contact
    personalization_data TEXT, -- JSON with client-specific preferences
    
    -- Metadata
    analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    valid_until DATETIME, -- When this analysis should be refreshed
    
    FOREIGN KEY (client_id) REFERENCES clients(client_id)
);

-- ==================== PROACTIVE ACTIONS ====================

-- Automated actions taken by the Key Account Manager
CREATE TABLE IF NOT EXISTS proactive_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_id TEXT UNIQUE NOT NULL,
    client_id TEXT NOT NULL,
    
    -- Action details
    action_type TEXT NOT NULL CHECK (action_type IN (
        'send_report_suggestion', 'send_trend_alert', 'schedule_check_in',
        'send_usage_summary', 'suggest_upgrade', 'send_industry_insight'
    )),
    action_description TEXT,
    trigger_reason TEXT, -- What caused this action to be triggered
    
    -- Execution
    scheduled_for DATETIME,
    executed_at DATETIME,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'executed', 'failed', 'cancelled')),
    
    -- Results
    client_response TEXT, -- How client responded
    client_engagement_score REAL, -- 0.0 to 1.0
    led_to_request BOOLEAN DEFAULT FALSE,
    generated_revenue REAL DEFAULT 0.0,
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (client_id) REFERENCES clients(client_id)
);

-- ==================== EMAIL INTEGRATION ====================

-- Email processing and integration
CREATE TABLE IF NOT EXISTS email_processing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email_id TEXT UNIQUE NOT NULL,
    client_id TEXT,
    
    -- Email metadata
    from_email TEXT NOT NULL,
    to_email TEXT NOT NULL,
    cc_emails TEXT, -- JSON array
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    attachments TEXT, -- JSON array of attachment info
    
    -- Processing results
    client_identified BOOLEAN DEFAULT FALSE,
    intent_classification TEXT,
    extracted_requirements TEXT, -- JSON with structured requirements
    auto_response_needed BOOLEAN DEFAULT FALSE,
    auto_response_sent TEXT, -- Content of auto-response if sent
    
    -- AI analysis
    sentiment_analysis TEXT, -- JSON with detailed sentiment
    entities_extracted TEXT, -- JSON with people, companies, topics
    action_items TEXT, -- JSON array of action items
    urgency_assessment TEXT,
    
    -- Status
    processing_status TEXT DEFAULT 'received' CHECK (processing_status IN (
        'received', 'processing', 'processed', 'responded', 'escalated'
    )),
    
    -- Timestamps
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    
    FOREIGN KEY (client_id) REFERENCES clients(client_id)
);

-- ==================== PERFORMANCE METRICS ====================

-- Key account manager performance tracking
CREATE TABLE IF NOT EXISTS kam_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL,
    
    -- Performance period
    period_start DATETIME NOT NULL,
    period_end DATETIME NOT NULL,
    
    -- Metrics
    total_requests_handled INTEGER DEFAULT 0,
    avg_response_time_minutes REAL DEFAULT 0.0,
    client_satisfaction_avg REAL DEFAULT 0.0,
    proactive_actions_taken INTEGER DEFAULT 0,
    revenue_generated REAL DEFAULT 0.0,
    cost_savings_achieved REAL DEFAULT 0.0,
    
    -- AI learning metrics
    prediction_accuracy REAL DEFAULT 0.0, -- How often AI predictions were correct
    automation_rate REAL DEFAULT 0.0, -- Percentage of requests handled automatically
    client_engagement_improvement REAL DEFAULT 0.0,
    
    -- Business impact
    client_retention_score REAL DEFAULT 0.0,
    upsell_success_rate REAL DEFAULT 0.0,
    referral_generation INTEGER DEFAULT 0,
    
    -- Metadata
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (client_id) REFERENCES clients(client_id)
);

-- ==================== INDEXES FOR PERFORMANCE ====================

-- Client lookup indexes
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(primary_contact_email);
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_name);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(account_status);
CREATE INDEX IF NOT EXISTS idx_clients_tier ON clients(subscription_tier);

-- Communication indexes
CREATE INDEX IF NOT EXISTS idx_communications_client ON client_communications(client_id);
CREATE INDEX IF NOT EXISTS idx_communications_date ON client_communications(received_at);
CREATE INDEX IF NOT EXISTS idx_communications_type ON client_communications(type);
CREATE INDEX IF NOT EXISTS idx_communications_processed ON client_communications(processed_by_ai);

-- Request tracking indexes
CREATE INDEX IF NOT EXISTS idx_requests_client ON client_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON client_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_type ON client_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_requests_pipeline ON client_requests(pipeline_id);

-- Analysis indexes
CREATE INDEX IF NOT EXISTS idx_needs_client ON client_needs_analysis(client_id);
CREATE INDEX IF NOT EXISTS idx_needs_type ON client_needs_analysis(analysis_type);
CREATE INDEX IF NOT EXISTS idx_needs_date ON client_needs_analysis(analyzed_at);

-- Email processing indexes
CREATE INDEX IF NOT EXISTS idx_email_client ON email_processing(client_id);
CREATE INDEX IF NOT EXISTS idx_email_from ON email_processing(from_email);
CREATE INDEX IF NOT EXISTS idx_email_status ON email_processing(processing_status);
CREATE INDEX IF NOT EXISTS idx_email_date ON email_processing(received_at);

-- Proactive actions indexes
CREATE INDEX IF NOT EXISTS idx_actions_client ON proactive_actions(client_id);
CREATE INDEX IF NOT EXISTS idx_actions_scheduled ON proactive_actions(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_actions_status ON proactive_actions(status);