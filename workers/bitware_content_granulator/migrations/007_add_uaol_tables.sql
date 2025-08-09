-- Universal AI Object Language (UAOL) Tables
-- Stores compressed notations and their mappings

-- UAOL Notations table
CREATE TABLE IF NOT EXISTS uaol_notations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    stage_number INTEGER NOT NULL,
    notation TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- char, loc, rel, scene, concept, struct
    rich_data TEXT, -- JSON of the original rich object
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES content_generation_projects(id)
);

CREATE INDEX IF NOT EXISTS idx_uaol_project ON uaol_notations(project_id);
CREATE INDEX IF NOT EXISTS idx_uaol_stage ON uaol_notations(project_id, stage_number);
CREATE INDEX IF NOT EXISTS idx_uaol_entity ON uaol_notations(entity_type);
CREATE INDEX IF NOT EXISTS idx_uaol_notation ON uaol_notations(notation);

-- UAOL Evolutions table (tracks how objects change)
CREATE TABLE IF NOT EXISTS uaol_evolutions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    from_notation TEXT NOT NULL,
    to_notation TEXT NOT NULL,
    trigger TEXT NOT NULL, -- event that caused the evolution
    stage_number INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES content_generation_projects(id)
);

CREATE INDEX IF NOT EXISTS idx_evolution_project ON uaol_evolutions(project_id);
CREATE INDEX IF NOT EXISTS idx_evolution_from ON uaol_evolutions(from_notation);
CREATE INDEX IF NOT EXISTS idx_evolution_to ON uaol_evolutions(to_notation);

-- UAOL Relationships table (tracks connections between notations)
CREATE TABLE IF NOT EXISTS uaol_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    notation1 TEXT NOT NULL,
    notation2 TEXT NOT NULL,
    relationship_type TEXT NOT NULL, -- contains, references, evolves_to, etc.
    metadata TEXT, -- JSON for additional relationship data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES content_generation_projects(id)
);

CREATE INDEX IF NOT EXISTS idx_rel_project ON uaol_relationships(project_id);
CREATE INDEX IF NOT EXISTS idx_rel_notation1 ON uaol_relationships(notation1);
CREATE INDEX IF NOT EXISTS idx_rel_notation2 ON uaol_relationships(notation2);

-- UAOL Templates table (stores reusable UAOL patterns)
CREATE TABLE IF NOT EXISTS uaol_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    content_type TEXT NOT NULL, -- novel, course, documentary, etc.
    stage_number INTEGER NOT NULL,
    pattern TEXT NOT NULL, -- UAOL pattern template
    description TEXT,
    example TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_template_type ON uaol_templates(content_type);
CREATE INDEX IF NOT EXISTS idx_template_stage ON uaol_templates(stage_number);

-- Insert default UAOL templates
INSERT OR IGNORE INTO uaol_templates (name, content_type, stage_number, pattern, description, example) VALUES
-- Novel templates
('novel_concept', 'novel', 1, 'concept.{theme}.{genre}.{mood}.{approach}.exploring', 'Novel concept notation', 'concept.consciousness.scifi.philosophical.introspective.exploring'),
('novel_character', 'novel', 2, 'char.{name}.{role}.{age}.{traits}.{location}.{state}', 'Character notation', 'char.emilie.researcher.35.brilliant_empathetic.prague.searching'),
('novel_location', 'novel', 2, 'loc.{name}.{type}.{subtype}.{atmosphere}.{city}.{timeframe}', 'Location notation', 'loc.quantum_lab.research.basement.sterile.prague.2045'),
('novel_structure', 'novel', 3, 'struct.act{n}.act.{chapters}.{purpose}.{arc}.{theme}', 'Story structure notation', 'struct.act1.act.5_chapters.setup.rising.discovery'),
('novel_scene', 'novel', 4, 'scene.{id}.{location}.{characters}.{action}.{mood}.{time}', 'Scene notation', 'scene.1_1_1.lab.emilie_nexus.first_contact.tense.night'),

-- Course templates
('course_concept', 'course', 1, 'concept.{subject}.{level}.{approach}.{goal}.designing', 'Course concept notation', 'concept.programming.beginner.practical.mastery.designing'),
('course_module', 'course', 2, 'module.{name}.{topic}.{duration}.{difficulty}.{prereqs}.planned', 'Module notation', 'module.intro.basics.2weeks.easy.none.planned'),
('course_structure', 'course', 3, 'struct.module{n}.module.{lessons}.{objective}.{progression}.{assessment}', 'Course structure notation', 'struct.module1.module.5_lessons.fundamentals.linear.quiz'),
('course_lesson', 'course', 4, 'lesson.{id}.{topic}.{activities}.{duration}.{format}.{time}', 'Lesson notation', 'lesson.1_1.variables.lecture_exercise.60min.interactive.morning');

-- Add column to track UAOL usage in stages
ALTER TABLE content_generation_stages ADD COLUMN uaol_notations TEXT; -- JSON array of UAOL notations used
ALTER TABLE content_generation_stages ADD COLUMN uaol_context TEXT; -- UAOL context used for generation