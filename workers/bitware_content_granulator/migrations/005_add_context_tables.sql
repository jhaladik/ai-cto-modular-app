-- Context Management Tables for Content Granulator
-- Stores project context for continuity and validation

-- Project context storage
CREATE TABLE IF NOT EXISTS project_context (
    project_id INTEGER NOT NULL,
    context_type TEXT NOT NULL, -- 'character', 'location', 'timeline', 'plot_thread', 'concept'
    context_id TEXT NOT NULL,
    context_data TEXT NOT NULL, -- JSON with full details
    first_appearance INTEGER, -- Stage number where first introduced
    last_modified INTEGER, -- Stage number where last modified
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (project_id, context_type, context_id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Mentor validation reports
CREATE TABLE IF NOT EXISTS mentor_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    stage_number INTEGER NOT NULL,
    validation_score INTEGER, -- 0-100
    issues TEXT, -- JSON array of issues
    suggestions TEXT, -- JSON array of suggestions
    corrections_applied TEXT, -- JSON of corrections made
    mentor_insight TEXT, -- Overall mentor assessment
    continuity_check TEXT, -- JSON of continuity results
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Context cross-references (relationships between elements)
CREATE TABLE IF NOT EXISTS context_references (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    source_type TEXT NOT NULL, -- 'character', 'location', etc.
    source_id TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    relationship TEXT NOT NULL, -- 'located_at', 'knows', 'owns', etc.
    stage_introduced INTEGER,
    metadata TEXT, -- JSON for additional relationship data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Validation rules per template
CREATE TABLE IF NOT EXISTS template_validation_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_type TEXT NOT NULL,
    stage_number INTEGER NOT NULL,
    rule_name TEXT NOT NULL,
    rule_type TEXT NOT NULL, -- 'structure', 'continuity', 'quality', 'completeness'
    severity TEXT NOT NULL, -- 'critical', 'major', 'minor'
    validation_prompt TEXT NOT NULL, -- AI prompt for validation
    correction_prompt TEXT, -- AI prompt for correction
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(content_type, stage_number, rule_name)
);

-- Style guide storage per project
CREATE TABLE IF NOT EXISTS project_style_guides (
    project_id INTEGER PRIMARY KEY,
    tone TEXT,
    pov TEXT, -- 'first-person', 'third-person', etc.
    tense TEXT, -- 'past', 'present'
    vocabulary_level TEXT,
    pacing_preference TEXT,
    example_passages TEXT, -- JSON array of example text
    custom_rules TEXT, -- JSON of project-specific rules
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Correction history
CREATE TABLE IF NOT EXISTS correction_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    stage_number INTEGER NOT NULL,
    original_content TEXT NOT NULL,
    corrected_content TEXT NOT NULL,
    issues_fixed TEXT NOT NULL, -- JSON array
    correction_prompt TEXT,
    iterations INTEGER DEFAULT 1,
    final_score INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_context_project ON project_context(project_id);
CREATE INDEX IF NOT EXISTS idx_project_context_type ON project_context(context_type);
CREATE INDEX IF NOT EXISTS idx_mentor_reports_project ON mentor_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_mentor_reports_stage ON mentor_reports(project_id, stage_number);
CREATE INDEX IF NOT EXISTS idx_context_references_source ON context_references(project_id, source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_context_references_target ON context_references(project_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_template_rules_type ON template_validation_rules(content_type, stage_number);

-- Insert default validation rules for novel template
INSERT OR IGNORE INTO template_validation_rules 
(content_type, stage_number, rule_name, rule_type, severity, validation_prompt) 
VALUES 
-- Stage 1: Big Picture
('novel', 1, 'premise_originality', 'quality', 'major', 
'Is the premise original and compelling? Check for clichés and overused tropes.'),

('novel', 1, 'theme_integration', 'structure', 'major',
'Are the themes well-integrated with the plot concept?'),

('novel', 1, 'arc_structure', 'structure', 'critical',
'Does the narrative arc follow a clear three-act structure?'),

-- Stage 2: Objects & Relations
('novel', 2, 'character_depth', 'completeness', 'major',
'Do all main characters have sufficient backstory and clear motivations?'),

('novel', 2, 'character_diversity', 'quality', 'minor',
'Is there appropriate diversity in character personalities and backgrounds?'),

('novel', 2, 'location_detail', 'completeness', 'minor',
'Are all major locations described with sufficient sensory detail?'),

('novel', 2, 'timeline_logic', 'continuity', 'critical',
'Is the timeline logical and free of paradoxes?'),

-- Stage 3: Structure
('novel', 3, 'pacing_balance', 'structure', 'major',
'Is the pacing balanced across acts with appropriate rising action?'),

('novel', 3, 'chapter_purpose', 'quality', 'major',
'Does each chapter advance the plot or develop characters?'),

('novel', 3, 'cliffhanger_presence', 'quality', 'minor',
'Do chapters end with hooks to maintain reader engagement?'),

-- Stage 4: Scenes
('novel', 4, 'scene_conflict', 'quality', 'major',
'Does each scene contain conflict or tension?'),

('novel', 4, 'character_consistency', 'continuity', 'critical',
'Do characters behave consistently with established traits?'),

('novel', 4, 'location_consistency', 'continuity', 'major',
'Do location descriptions match previous mentions?'),

('novel', 4, 'dialogue_authenticity', 'quality', 'minor',
'Is dialogue natural and character-appropriate?'),

('novel', 4, 'plot_advancement', 'structure', 'major',
'Does each scene advance the plot or reveal character?');

-- Insert default validation rules for course template
INSERT OR IGNORE INTO template_validation_rules 
(content_type, stage_number, rule_name, rule_type, severity, validation_prompt) 
VALUES 
-- Stage 1: Big Picture
('course', 1, 'objective_clarity', 'completeness', 'critical',
'Are learning objectives specific, measurable, and achievable?'),

('course', 1, 'prerequisite_alignment', 'structure', 'major',
'Are prerequisites appropriate for the target audience?'),

-- Stage 2: Objects & Relations
('course', 2, 'concept_progression', 'structure', 'critical',
'Do concepts build logically from simple to complex?'),

('course', 2, 'resource_relevance', 'quality', 'minor',
'Are all resources current and relevant to learning objectives?'),

-- Stage 3: Structure
('course', 3, 'cognitive_load', 'quality', 'major',
'Is cognitive load appropriate for each lesson?'),

('course', 3, 'assessment_alignment', 'structure', 'critical',
'Do assessments align with stated learning objectives?'),

-- Stage 4: Activities
('course', 4, 'activity_engagement', 'quality', 'major',
'Are activities varied and engaging?'),

('course', 4, 'practice_opportunity', 'completeness', 'major',
'Is there sufficient practice opportunity for each concept?');