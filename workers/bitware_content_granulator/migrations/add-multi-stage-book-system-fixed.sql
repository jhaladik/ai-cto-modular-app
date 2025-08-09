-- Multi-Stage Book Generation System
-- Fixed version - checks existing columns

-- 1. Add multi-stage support to templates (if columns don't exist)
ALTER TABLE granulation_templates ADD COLUMN is_multi_stage BOOLEAN DEFAULT false;
ALTER TABLE granulation_templates ADD COLUMN total_stages INTEGER DEFAULT 1;
ALTER TABLE granulation_templates ADD COLUMN stage_prompts TEXT;

-- 2. Create book generation tracking table
CREATE TABLE IF NOT EXISTS book_generation_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_name TEXT NOT NULL,
  topic TEXT NOT NULL,
  target_audience TEXT,
  genre TEXT,
  current_stage INTEGER DEFAULT 1,
  total_stages INTEGER DEFAULT 4,
  status TEXT DEFAULT 'in_progress',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  metadata TEXT
);

-- 3. Track individual stages
CREATE TABLE IF NOT EXISTS book_generation_stages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  stage_number INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  prompt_used TEXT,
  input_data TEXT,
  output_data TEXT,
  ai_model TEXT,
  tokens_used INTEGER,
  cost_usd REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  FOREIGN KEY (project_id) REFERENCES book_generation_projects(id)
);

-- 4. Object library for Stage 2
CREATE TABLE IF NOT EXISTS book_objects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  stage_id INTEGER,
  object_type TEXT NOT NULL,
  object_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  backstory TEXT,
  relationships TEXT,
  metadata TEXT,
  usage_count INTEGER DEFAULT 0,
  appears_in_chapters TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES book_generation_projects(id),
  FOREIGN KEY (stage_id) REFERENCES book_generation_stages(id),
  UNIQUE(project_id, object_code)
);

-- 5. Timeline events for Stage 2
CREATE TABLE IF NOT EXISTS book_timeline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  stage_id INTEGER,
  event_order INTEGER NOT NULL,
  event_time TEXT,
  event_description TEXT,
  event_type TEXT,
  involved_objects TEXT,
  impact_level TEXT,
  causes TEXT,
  effects TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES book_generation_projects(id),
  FOREIGN KEY (stage_id) REFERENCES book_generation_stages(id)
);

-- 6. Chapter structures from Stage 3
CREATE TABLE IF NOT EXISTS book_chapters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  stage_id INTEGER,
  act_number INTEGER NOT NULL,
  chapter_number INTEGER NOT NULL,
  chapter_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  pov_character TEXT,
  primary_location TEXT,
  timeline_position TEXT,
  featured_objects TEXT,
  target_word_count INTEGER,
  emotional_tone TEXT,
  plot_function TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES book_generation_projects(id),
  FOREIGN KEY (stage_id) REFERENCES book_generation_stages(id),
  UNIQUE(project_id, chapter_code)
);

-- 7. Scene structures from Stage 4
CREATE TABLE IF NOT EXISTS book_scenes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  chapter_id INTEGER NOT NULL,
  stage_id INTEGER,
  scene_number INTEGER NOT NULL,
  scene_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  estimated_word_count INTEGER,
  writing_style TEXT,
  research_needed TEXT,
  featured_objects TEXT,
  emotional_arc TEXT,
  key_lines TEXT,
  author_notes TEXT,
  content_generated BOOLEAN DEFAULT false,
  content_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES book_generation_projects(id),
  FOREIGN KEY (chapter_id) REFERENCES book_chapters(id),
  FOREIGN KEY (stage_id) REFERENCES book_generation_stages(id),
  UNIQUE(project_id, scene_code)
);

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_book_stages_project ON book_generation_stages(project_id);
CREATE INDEX IF NOT EXISTS idx_book_objects_project ON book_objects(project_id);
CREATE INDEX IF NOT EXISTS idx_book_objects_type ON book_objects(object_type);
CREATE INDEX IF NOT EXISTS idx_book_timeline_project ON book_timeline(project_id);
CREATE INDEX IF NOT EXISTS idx_book_timeline_order ON book_timeline(event_order);
CREATE INDEX IF NOT EXISTS idx_book_chapters_project ON book_chapters(project_id);
CREATE INDEX IF NOT EXISTS idx_book_scenes_project ON book_scenes(project_id);
CREATE INDEX IF NOT EXISTS idx_book_scenes_chapter ON book_scenes(chapter_id);