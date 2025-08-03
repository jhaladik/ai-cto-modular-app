-- Template Parameters Schema
-- This extends the pipeline_template_cache with parameter definitions

-- Add parameter definitions to templates
ALTER TABLE pipeline_template_cache ADD COLUMN parameter_schema TEXT DEFAULT '[]';
ALTER TABLE pipeline_template_cache ADD COLUMN tier_parameter_limits TEXT DEFAULT '{}';
ALTER TABLE pipeline_template_cache ADD COLUMN example_deliverables TEXT DEFAULT '[]';
ALTER TABLE pipeline_template_cache ADD COLUMN base_cost_usd REAL DEFAULT 0.10;
ALTER TABLE pipeline_template_cache ADD COLUMN cost_multipliers TEXT DEFAULT '{}'

-- Create template parameters table for detailed parameter definitions
CREATE TABLE IF NOT EXISTS template_parameters (
    parameter_id TEXT PRIMARY KEY,
    template_name TEXT NOT NULL,
    parameter_name TEXT NOT NULL,
    parameter_type TEXT NOT NULL CHECK (parameter_type IN ('text', 'number', 'select', 'boolean', 'file', 'array')),
    display_name TEXT NOT NULL,
    description TEXT,
    
    -- Validation rules
    required BOOLEAN DEFAULT FALSE,
    default_value TEXT,
    validation_rules TEXT, -- JSON object with min, max, pattern, options, etc.
    
    -- UI hints
    ui_component TEXT DEFAULT 'input', -- input, textarea, select, checkbox, file-upload
    ui_order INTEGER DEFAULT 0,
    ui_group TEXT, -- Group related parameters together
    placeholder TEXT,
    help_text TEXT,
    
    -- Tier restrictions
    available_tiers TEXT DEFAULT '["basic","standard","premium","enterprise"]', -- Which tiers can see this param
    editable_tiers TEXT DEFAULT '["premium","enterprise"]', -- Which tiers can edit this param
    
    -- Cost impact
    affects_cost BOOLEAN DEFAULT FALSE,
    cost_impact_formula TEXT, -- e.g., "word_count * 0.0001"
    
    -- Dependencies
    depends_on TEXT, -- JSON array of other parameter names
    conditional_rules TEXT, -- JSON object defining when to show/hide
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (template_name) REFERENCES pipeline_template_cache(template_name)
);

-- Create template parameter presets for common configurations
CREATE TABLE IF NOT EXISTS template_parameter_presets (
    preset_id TEXT PRIMARY KEY,
    template_name TEXT NOT NULL,
    preset_name TEXT NOT NULL,
    description TEXT,
    tier_restriction TEXT DEFAULT 'basic', -- Minimum tier required
    parameter_values TEXT NOT NULL, -- JSON object with parameter values
    estimated_cost_usd REAL,
    estimated_duration_ms INTEGER,
    is_default BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (template_name) REFERENCES pipeline_template_cache(template_name)
);

-- Sample parameter definitions for a report generation template
INSERT INTO template_parameters (
    parameter_id,
    template_name,
    parameter_name,
    parameter_type,
    display_name,
    description,
    required,
    default_value,
    validation_rules,
    ui_component,
    ui_order,
    ui_group,
    available_tiers,
    editable_tiers,
    affects_cost,
    cost_impact_formula
) VALUES 
-- Basic parameters (available to all tiers)
('param_001', 'market_research_pipeline', 'topic', 'text', 'Research Topic', 'The main topic or subject to research', TRUE, '', '{"minLength": 3, "maxLength": 200}', 'input', 1, 'Basic Settings', '["basic","standard","premium","enterprise"]', '["basic","standard","premium","enterprise"]', FALSE, NULL),
('param_002', 'market_research_pipeline', 'word_count', 'number', 'Report Length', 'Target word count for the final report', TRUE, '2000', '{"min": 500, "max": 50000}', 'input', 2, 'Basic Settings', '["basic","standard","premium","enterprise"]', '["standard","premium","enterprise"]', TRUE, 'value * 0.00005'),

-- Standard tier parameters
('param_003', 'market_research_pipeline', 'depth_level', 'select', 'Research Depth', 'How comprehensive should the research be?', TRUE, 'standard', '{"options": ["basic", "standard", "comprehensive", "exhaustive"]}', 'select', 3, 'Research Settings', '["standard","premium","enterprise"]', '["premium","enterprise"]', TRUE, '{"basic": 1, "standard": 1.5, "comprehensive": 2, "exhaustive": 3}'),
('param_004', 'market_research_pipeline', 'include_competitors', 'boolean', 'Include Competitor Analysis', 'Add competitor analysis section', FALSE, 'false', '{}', 'checkbox', 4, 'Research Settings', '["standard","premium","enterprise"]', '["standard","premium","enterprise"]', TRUE, '0.15'),

-- Premium tier parameters
('param_005', 'market_research_pipeline', 'data_sources', 'array', 'Data Sources', 'Specific data sources to include', FALSE, '[]', '{"maxItems": 10}', 'multi-select', 5, 'Advanced Settings', '["premium","enterprise"]', '["premium","enterprise"]', TRUE, 'length * 0.05'),
('param_006', 'market_research_pipeline', 'output_format', 'select', 'Output Format', 'Deliverable format', TRUE, 'pdf', '{"options": ["pdf", "docx", "html", "markdown"]}', 'select', 6, 'Output Settings', '["premium","enterprise"]', '["premium","enterprise"]', FALSE, NULL),

-- Enterprise only parameters
('param_007', 'market_research_pipeline', 'custom_sections', 'array', 'Custom Report Sections', 'Define custom sections for the report', FALSE, '[]', '{"maxItems": 20}', 'dynamic-form', 7, 'Enterprise Settings', '["enterprise"]', '["enterprise"]', TRUE, 'length * 0.1'),
('param_008', 'market_research_pipeline', 'api_integrations', 'array', 'External API Integrations', 'Connect external data sources', FALSE, '[]', '{}', 'api-config', 8, 'Enterprise Settings', '["enterprise"]', '["enterprise"]', TRUE, 'length * 0.2');

-- Create indexes for performance
CREATE INDEX idx_template_parameters_template ON template_parameters(template_name);
CREATE INDEX idx_template_parameters_tier ON template_parameters(available_tiers);
CREATE INDEX idx_template_presets_template ON template_parameter_presets(template_name);