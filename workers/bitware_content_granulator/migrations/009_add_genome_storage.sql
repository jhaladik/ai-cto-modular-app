-- Storage for Adaptive UAOL project genomes
CREATE TABLE IF NOT EXISTS project_genomes (
    project_id INTEGER PRIMARY KEY,
    content_type TEXT,
    core_themes TEXT, -- JSON array
    established_patterns TEXT, -- JSON object
    semantic_rules TEXT, -- JSON array
    notation_style TEXT,
    constraints TEXT, -- JSON array
    vocabulary TEXT, -- JSON array
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES content_generation_projects(id)
);