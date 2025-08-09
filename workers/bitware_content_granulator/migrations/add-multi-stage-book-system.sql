-- Multi-Stage Book Generation System
-- Implements a 4-stage progressive refinement approach

-- 1. Add multi-stage support to templates
ALTER TABLE granulation_templates ADD COLUMN is_multi_stage BOOLEAN DEFAULT false;
ALTER TABLE granulation_templates ADD COLUMN total_stages INTEGER DEFAULT 1;
ALTER TABLE granulation_templates ADD COLUMN stage_prompts TEXT; -- JSON array of stage prompts

-- 2. Create book generation tracking table
CREATE TABLE IF NOT EXISTS book_generation_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_name TEXT NOT NULL,
  topic TEXT NOT NULL,
  target_audience TEXT,
  genre TEXT,
  current_stage INTEGER DEFAULT 1,
  total_stages INTEGER DEFAULT 4,
  status TEXT DEFAULT 'in_progress', -- in_progress, completed, paused
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  metadata TEXT -- JSON for additional project details
);

-- 3. Track individual stages
CREATE TABLE IF NOT EXISTS book_generation_stages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  stage_number INTEGER NOT NULL,
  stage_name TEXT NOT NULL, -- big_picture, objects_timelines, structure, sub_chapters
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
  FOREIGN KEY (project_id) REFERENCES book_generation_projects(id)
);

-- 4. Object library for Stage 2
CREATE TABLE IF NOT EXISTS book_objects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  stage_id INTEGER,
  object_type TEXT NOT NULL, -- character, location, concept, item, theme
  object_code TEXT NOT NULL, -- unique identifier like 'char_protagonist'
  name TEXT NOT NULL,
  description TEXT, -- 200-word description
  backstory TEXT, -- For characters
  relationships TEXT, -- JSON of relationships to other objects
  metadata TEXT, -- JSON with type-specific details
  usage_count INTEGER DEFAULT 0,
  appears_in_chapters TEXT, -- JSON array of chapter IDs
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
  event_order INTEGER NOT NULL, -- Sequential order
  event_time TEXT, -- Relative time like "10 years before story" or "Chapter 3"
  event_description TEXT,
  event_type TEXT, -- backstory, main_plot, parallel_plot, future
  involved_objects TEXT, -- JSON array of object_codes
  impact_level TEXT, -- major, minor, background
  causes TEXT, -- JSON array of previous event IDs
  effects TEXT, -- JSON array of subsequent event IDs
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
  chapter_code TEXT NOT NULL, -- Like "1.3" for Act 1, Chapter 3
  title TEXT NOT NULL,
  description TEXT NOT NULL, -- 200-word description
  pov_character TEXT, -- object_code of POV character
  primary_location TEXT, -- object_code of location
  timeline_position TEXT,
  featured_objects TEXT, -- JSON array of object_codes
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
  scene_code TEXT NOT NULL, -- Like "1.3.2" for Act 1, Chapter 3, Scene 2
  title TEXT NOT NULL,
  description TEXT NOT NULL, -- 200-word description
  estimated_word_count INTEGER,
  writing_style TEXT, -- descriptive, dialogue-heavy, action, introspective
  research_needed TEXT, -- JSON array of research topics
  featured_objects TEXT, -- JSON array of object_codes
  emotional_arc TEXT, -- "suspicion → revelation → shock"
  key_lines TEXT, -- JSON array of important dialogue/descriptions
  author_notes TEXT,
  content_generated BOOLEAN DEFAULT false,
  content_id INTEGER, -- Link to generated content
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES book_generation_projects(id),
  FOREIGN KEY (chapter_id) REFERENCES book_chapters(id),
  FOREIGN KEY (stage_id) REFERENCES book_generation_stages(id),
  UNIQUE(project_id, scene_code)
);

-- 8. Create indexes for performance
CREATE INDEX idx_book_stages_project ON book_generation_stages(project_id);
CREATE INDEX idx_book_objects_project ON book_objects(project_id);
CREATE INDEX idx_book_objects_type ON book_objects(object_type);
CREATE INDEX idx_book_timeline_project ON book_timeline(project_id);
CREATE INDEX idx_book_timeline_order ON book_timeline(event_order);
CREATE INDEX idx_book_chapters_project ON book_chapters(project_id);
CREATE INDEX idx_book_scenes_project ON book_scenes(project_id);
CREATE INDEX idx_book_scenes_chapter ON book_scenes(chapter_id);

-- 9. Create the multi-stage novel template
INSERT INTO granulation_templates (
  template_name,
  structure_type,
  description,
  is_multi_stage,
  total_stages,
  stage_prompts,
  use_two_step,
  ai_provider_config,
  created_at
) VALUES (
  'multi_stage_novel',
  'novel',
  'Professional 4-stage novel generation with progressive refinement',
  true,
  4,
  '[
    {
      "stage": 1,
      "name": "big_picture",
      "prompt": "Create a comprehensive BIG PICTURE for: \"{topic}\"\n\nGenerate:\n1. CORE CONCEPT\n   - Central premise (1-2 sentences)\n   - Genre and sub-genre\n   - Target audience: {audience}\n   - Unique selling proposition\n\n2. THEMATIC FRAMEWORK\n   - Primary theme and message\n   - Secondary themes (3-5)\n   - Philosophical questions explored\n   - Emotional journey for reader\n\n3. NARRATIVE ARC\n   - Beginning: Initial state/problem\n   - Middle: Escalation and complications\n   - End: Resolution and transformation\n   - Key turning points (3-5)\n\n4. WORLD VISION\n   - Setting overview\n   - Time period/timeline\n   - Atmosphere and tone\n   - Rules of the world\n\n5. CORE CONFLICTS\n   - External conflict\n   - Internal conflict\n   - Societal/philosophical conflict\n   - Stakes and consequences"
    },
    {
      "stage": 2,
      "name": "objects_timelines",
      "prompt": "Based on the big picture from Stage 1, create detailed OBJECTS AND TIMELINES:\n\n1. CHARACTER OBJECTS (minimum 10)\n   For each character provide:\n   - Name and role\n   - Backstory (200 words)\n   - Motivations and goals\n   - Relationships with others\n   - Character arc/transformation\n   - Key scenes they appear in\n\n2. LOCATION OBJECTS (minimum 8)\n   For each location provide:\n   - Name and type\n   - Physical description (100 words)\n   - Emotional atmosphere\n   - Historical significance\n   - Events that occur there\n   - Symbolic meaning\n\n3. TIMELINE & PATHS\n   - Pre-story events (backstory)\n   - Main story chronology\n   - Character journey paths\n   - Parallel storylines\n   - Cause-effect chains\n\nPrevious stage output:\n{previous_output}"
    },
    {
      "stage": 3,
      "name": "structure",
      "prompt": "Create a detailed STRUCTURE with 200-word descriptions.\n\nUsing the objects and timeline from Stage 2, create:\n\n3 ACTS with 5-7 CHAPTERS each.\n\nFor each CHAPTER provide:\n- Title\n- 200-WORD DESCRIPTION including:\n  * Opening hook and scene setting\n  * Main events and plot progression\n  * Character development moments\n  * Dialogue highlights\n  * Emotional beats and tension\n  * Revelations or discoveries\n  * Action sequences\n  * Internal reflection\n  * Chapter ending\n\n- METADATA:\n  * POV Character\n  * Primary Location\n  * Featured Objects\n  * Word Count Target\n  * Emotional Tone\n  * Plot Function\n\nObjects from Stage 2:\n{previous_output}"
    },
    {
      "stage": 4,
      "name": "sub_chapters",
      "prompt": "For CHAPTER {chapter_id}, create SUB-CHAPTERS (scenes).\n\nBreak into 3-5 SCENES, each with:\n\nSCENE TITLE and 200-WORD DESCRIPTION including:\n- Specific opening line/image\n- Detailed action beats\n- Dialogue snippets (actual lines)\n- Sensory details\n- Character thoughts/emotions\n- Micro-tensions\n- Environmental details\n- Body language\n- Pacing notes\n- Transition to next scene\n\nSCENE METADATA:\n- Estimated Word Count: [1000-3000]\n- Writing Style\n- Research Needed\n- Objects Featured\n- Emotional Arc\n- Key Lines\n- Author Notes\n\nChapter description:\n{chapter_description}\n\nAvailable objects:\n{objects}"
    }
  ]',
  false,
  '{
    "preferredProvider": "openai",
    "model": "gpt-4o",
    "temperature": 0.8,
    "maxTokens": 16000
  }',
  CURRENT_TIMESTAMP
);

-- 10. Add views for easy querying
CREATE VIEW IF NOT EXISTS book_project_overview AS
SELECT 
  p.id,
  p.project_name,
  p.topic,
  p.genre,
  p.current_stage,
  p.status,
  COUNT(DISTINCT o.id) as total_objects,
  COUNT(DISTINCT c.id) as total_chapters,
  COUNT(DISTINCT s.id) as total_scenes,
  SUM(CASE WHEN s.content_generated = true THEN 1 ELSE 0 END) as scenes_written
FROM book_generation_projects p
LEFT JOIN book_objects o ON p.id = o.project_id
LEFT JOIN book_chapters c ON p.id = c.project_id
LEFT JOIN book_scenes s ON p.id = s.project_id
GROUP BY p.id;