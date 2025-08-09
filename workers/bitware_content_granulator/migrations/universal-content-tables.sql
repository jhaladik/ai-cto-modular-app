-- Universal Multi-Stage Content Generation System
-- Creates only the new universal tables (columns already added)

-- 1. Universal content generation projects
CREATE TABLE IF NOT EXISTS content_generation_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_name TEXT NOT NULL,
  content_type TEXT NOT NULL, -- novel, course, documentary, game, podcast, research_paper, etc.
  topic TEXT NOT NULL,
  target_audience TEXT,
  genre TEXT,
  current_stage INTEGER DEFAULT 1,
  total_stages INTEGER DEFAULT 4,
  status TEXT DEFAULT 'in_progress', -- in_progress, completed, paused
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  metadata TEXT -- JSON for content-type specific details
);

-- 2. Track individual stages (universal)
CREATE TABLE IF NOT EXISTS content_generation_stages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  stage_number INTEGER NOT NULL,
  stage_name TEXT NOT NULL, -- big_picture, objects_relations, structure, granular_units
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, failed
  prompt_used TEXT,
  input_data TEXT, -- JSON of previous stage output
  output_data TEXT, -- JSON of this stage output
  ai_model TEXT,
  tokens_used INTEGER,
  cost_usd REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  FOREIGN KEY (project_id) REFERENCES content_generation_projects(id)
);

-- 3. Universal object library (Stage 2)
CREATE TABLE IF NOT EXISTS content_objects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  stage_id INTEGER,
  object_type TEXT NOT NULL, -- character, speaker, instructor, location, concept, tool, dataset, theorem, etc.
  object_code TEXT NOT NULL, -- unique identifier
  name TEXT NOT NULL,
  description TEXT, -- 200-word description
  extended_info TEXT, -- backstory, history, proof, methodology, etc.
  relationships TEXT, -- JSON of relationships to other objects
  metadata TEXT, -- JSON with type-specific details
  usage_count INTEGER DEFAULT 0,
  appears_in_units TEXT, -- JSON array of unit IDs where this appears
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES content_generation_projects(id),
  FOREIGN KEY (stage_id) REFERENCES content_generation_stages(id),
  UNIQUE(project_id, object_code)
);

-- 4. Universal timeline/sequence (Stage 2)
CREATE TABLE IF NOT EXISTS content_timeline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  stage_id INTEGER,
  sequence_order INTEGER NOT NULL, -- Sequential order
  time_marker TEXT, -- Can be timestamp, chapter number, lesson number, episode, etc.
  event_description TEXT,
  event_type TEXT, -- prerequisite, main_content, parallel_track, future_reference
  involved_objects TEXT, -- JSON array of object_codes
  impact_level TEXT, -- critical, important, supporting, optional
  dependencies TEXT, -- JSON array of previous event IDs
  outcomes TEXT, -- JSON array of subsequent event IDs
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES content_generation_projects(id),
  FOREIGN KEY (stage_id) REFERENCES content_generation_stages(id)
);

-- 5. Universal structural units from Stage 3
CREATE TABLE IF NOT EXISTS content_structural_units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  stage_id INTEGER,
  parent_unit_id INTEGER, -- For hierarchical structure
  unit_level INTEGER NOT NULL, -- 1=top level, 2=mid, etc.
  unit_type TEXT NOT NULL, -- act, chapter, module, lesson, episode, section, theorem, etc.
  unit_code TEXT NOT NULL, -- Like "1.3" for Unit 1, Sub-unit 3
  title TEXT NOT NULL,
  description TEXT NOT NULL, -- 200-word description
  primary_perspective TEXT, -- POV character, narrator, instructor, etc.
  primary_setting TEXT, -- location, context, environment
  timeline_position TEXT,
  featured_objects TEXT, -- JSON array of object_codes
  target_size INTEGER, -- word count, duration, pages, etc.
  size_unit TEXT, -- words, minutes, pages, slides
  tone_style TEXT, -- emotional tone, academic style, etc.
  functional_role TEXT, -- setup, development, climax, introduction, practice, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES content_generation_projects(id),
  FOREIGN KEY (stage_id) REFERENCES content_generation_stages(id),
  FOREIGN KEY (parent_unit_id) REFERENCES content_structural_units(id),
  UNIQUE(project_id, unit_code)
);

-- 6. Granular units from Stage 4
CREATE TABLE IF NOT EXISTS content_granular_units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  structural_unit_id INTEGER NOT NULL, -- Parent structural unit
  stage_id INTEGER,
  unit_number INTEGER NOT NULL,
  unit_type TEXT NOT NULL, -- scene, activity, exercise, segment, proof_step, etc.
  unit_code TEXT NOT NULL, -- Like "1.3.2"
  title TEXT NOT NULL,
  description TEXT NOT NULL, -- 200-word description
  estimated_size INTEGER, -- words, minutes, problems, etc.
  size_unit TEXT, -- words, minutes, questions
  execution_style TEXT, -- narrative, interactive, visual, mathematical, etc.
  research_needed TEXT, -- JSON array of research topics
  featured_objects TEXT, -- JSON array of object_codes
  progression_arc TEXT, -- emotional arc, difficulty curve, concept flow
  key_elements TEXT, -- JSON array of important dialogue/formulas/concepts
  creator_notes TEXT, -- author notes, instructor guidelines, etc.
  content_generated BOOLEAN DEFAULT false,
  content_id INTEGER, -- Link to generated content
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES content_generation_projects(id),
  FOREIGN KEY (structural_unit_id) REFERENCES content_structural_units(id),
  FOREIGN KEY (stage_id) REFERENCES content_generation_stages(id),
  UNIQUE(project_id, unit_code)
);

-- 7. Create indexes
CREATE INDEX IF NOT EXISTS idx_content_stages_project ON content_generation_stages(project_id);
CREATE INDEX IF NOT EXISTS idx_content_objects_project ON content_objects(project_id);
CREATE INDEX IF NOT EXISTS idx_content_objects_type ON content_objects(object_type);
CREATE INDEX IF NOT EXISTS idx_content_timeline_project ON content_timeline(project_id);
CREATE INDEX IF NOT EXISTS idx_content_timeline_order ON content_timeline(sequence_order);
CREATE INDEX IF NOT EXISTS idx_structural_units_project ON content_structural_units(project_id);
CREATE INDEX IF NOT EXISTS idx_structural_units_parent ON content_structural_units(parent_unit_id);
CREATE INDEX IF NOT EXISTS idx_granular_units_project ON content_granular_units(project_id);
CREATE INDEX IF NOT EXISTS idx_granular_units_structural ON content_granular_units(structural_unit_id);

-- 8. Create view for project overview
CREATE VIEW IF NOT EXISTS content_project_overview AS
SELECT 
  p.id,
  p.project_name,
  p.content_type,
  p.topic,
  p.current_stage,
  p.status,
  COUNT(DISTINCT o.id) as total_objects,
  COUNT(DISTINCT su.id) as total_structural_units,
  COUNT(DISTINCT gu.id) as total_granular_units,
  SUM(CASE WHEN gu.content_generated = true THEN 1 ELSE 0 END) as units_completed
FROM content_generation_projects p
LEFT JOIN content_objects o ON p.id = o.project_id
LEFT JOIN content_structural_units su ON p.id = su.project_id
LEFT JOIN content_granular_units gu ON p.id = gu.project_id
GROUP BY p.id;