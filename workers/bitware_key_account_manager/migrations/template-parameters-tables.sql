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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_template_parameters_template ON template_parameters(template_name);
CREATE INDEX IF NOT EXISTS idx_template_parameters_tier ON template_parameters(available_tiers);
CREATE INDEX IF NOT EXISTS idx_template_presets_template ON template_parameter_presets(template_name);