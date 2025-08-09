-- Universal Multi-Stage Content Generation System
-- Works for ANY content type: books, courses, documentaries, games, podcasts, etc.

-- 1. Add multi-stage support to templates (if not exists)
ALTER TABLE granulation_templates ADD COLUMN is_multi_stage BOOLEAN DEFAULT false;
ALTER TABLE granulation_templates ADD COLUMN total_stages INTEGER DEFAULT 1;
ALTER TABLE granulation_templates ADD COLUMN stage_prompts TEXT; -- JSON array of stage prompts

-- 2. Universal content generation projects
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

-- 3. Track individual stages (universal)
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

-- 4. Universal object library (Stage 2)
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

-- 5. Universal timeline/sequence (Stage 2)
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

-- 6. Universal structural units from Stage 3 (chapters, modules, episodes, sections, etc.)
CREATE TABLE IF NOT EXISTS content_structural_units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  stage_id INTEGER,
  parent_unit_id INTEGER, -- For hierarchical structure (act->chapter, course->module, etc.)
  unit_level INTEGER NOT NULL, -- 1=top level (act/season), 2=mid (chapter/episode), etc.
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

-- 7. Granular units from Stage 4 (scenes, activities, problems, segments, etc.)
CREATE TABLE IF NOT EXISTS content_granular_units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  structural_unit_id INTEGER NOT NULL, -- Parent structural unit
  stage_id INTEGER,
  unit_number INTEGER NOT NULL,
  unit_type TEXT NOT NULL, -- scene, activity, exercise, segment, proof_step, etc.
  unit_code TEXT NOT NULL, -- Like "1.3.2" for Act 1, Chapter 3, Scene 2
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

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_stages_project ON content_generation_stages(project_id);
CREATE INDEX IF NOT EXISTS idx_content_objects_project ON content_objects(project_id);
CREATE INDEX IF NOT EXISTS idx_content_objects_type ON content_objects(object_type);
CREATE INDEX IF NOT EXISTS idx_content_timeline_project ON content_timeline(project_id);
CREATE INDEX IF NOT EXISTS idx_content_timeline_order ON content_timeline(sequence_order);
CREATE INDEX IF NOT EXISTS idx_structural_units_project ON content_structural_units(project_id);
CREATE INDEX IF NOT EXISTS idx_structural_units_parent ON content_structural_units(parent_unit_id);
CREATE INDEX IF NOT EXISTS idx_granular_units_project ON content_granular_units(project_id);
CREATE INDEX IF NOT EXISTS idx_granular_units_structural ON content_granular_units(structural_unit_id);

-- 9. Create universal multi-stage templates
INSERT OR IGNORE INTO granulation_templates (
  template_name,
  structure_type,
  is_multi_stage,
  total_stages,
  stage_prompts,
  use_two_step,
  ai_provider_config,
  created_at
) VALUES 
-- Novel Template
(
  'multi_stage_novel',
  'novel',
  true,
  4,
  '[
    {
      "stage": 1,
      "name": "big_picture",
      "prompt": "Create BIG PICTURE for novel: \"{topic}\"..."
    },
    {
      "stage": 2,
      "name": "objects_relations",
      "prompt": "Create OBJECTS (characters, locations) and TIMELINE..."
    },
    {
      "stage": 3,  
      "name": "structure",
      "prompt": "Create CHAPTERS with 200-word descriptions..."
    },
    {
      "stage": 4,
      "name": "granular_units",
      "prompt": "Create SCENES with 200-word descriptions..."
    }
  ]',
  false,
  '{"preferredProvider": "openai", "model": "gpt-4o", "temperature": 0.8, "maxTokens": 16000}',
  CURRENT_TIMESTAMP
),
-- Course Template
(
  'multi_stage_course',
  'course',
  true,
  4,
  '[
    {
      "stage": 1,
      "name": "big_picture",
      "prompt": "Create BIG PICTURE for course: \"{topic}\"\\n\\n1. LEARNING OBJECTIVES\\n2. PREREQUISITE KNOWLEDGE\\n3. COURSE STRUCTURE\\n4. ASSESSMENT STRATEGY\\n5. PEDAGOGICAL APPROACH"
    },
    {
      "stage": 2,
      "name": "objects_relations",
      "prompt": "Create OBJECTS (concepts, tools, datasets, case studies) and LEARNING PATHS..."
    },
    {
      "stage": 3,
      "name": "structure",
      "prompt": "Create MODULES and LESSONS with 200-word descriptions..."
    },
    {
      "stage": 4,
      "name": "granular_units",
      "prompt": "Create ACTIVITIES and EXERCISES with 200-word descriptions..."
    }
  ]',
  false,
  '{"preferredProvider": "openai", "model": "gpt-4o", "temperature": 0.7, "maxTokens": 16000}',
  CURRENT_TIMESTAMP
),
-- Documentary Template
(
  'multi_stage_documentary',
  'documentary',
  true,
  4,
  '[
    {
      "stage": 1,
      "name": "big_picture",
      "prompt": "Create BIG PICTURE for documentary: \"{topic}\"\\n\\n1. CENTRAL THESIS\\n2. KEY ARGUMENTS\\n3. NARRATIVE STRUCTURE\\n4. VISUAL APPROACH\\n5. INTERVIEW SUBJECTS"
    },
    {
      "stage": 2,
      "name": "objects_relations",
      "prompt": "Create OBJECTS (subjects, locations, evidence, archival materials) and CHRONOLOGY..."
    },
    {
      "stage": 3,
      "name": "structure",
      "prompt": "Create EPISODES/SEGMENTS with 200-word descriptions..."
    },
    {
      "stage": 4,
      "name": "granular_units",
      "prompt": "Create SCENES and INTERVIEWS with 200-word descriptions..."
    }
  ]',
  false,
  '{"preferredProvider": "openai", "model": "gpt-4o", "temperature": 0.7, "maxTokens": 16000}',
  CURRENT_TIMESTAMP
),
-- Podcast Series Template
(
  'multi_stage_podcast',
  'podcast',
  true,
  4,
  '[
    {
      "stage": 1,
      "name": "big_picture",
      "prompt": "Create BIG PICTURE for podcast series: \"{topic}\"\\n\\n1. SHOW CONCEPT\\n2. TARGET AUDIENCE\\n3. FORMAT & STYLE\\n4. HOST PERSONALITY\\n5. SEASON ARC"
    },
    {
      "stage": 2,
      "name": "objects_relations",
      "prompt": "Create OBJECTS (guests, topics, recurring segments) and EPISODE FLOW..."
    },
    {
      "stage": 3,
      "name": "structure",
      "prompt": "Create EPISODES with 200-word descriptions..."
    },
    {
      "stage": 4,
      "name": "granular_units",
      "prompt": "Create SEGMENTS and TALKING POINTS with 200-word descriptions..."
    }
  ]',
  false,
  '{"preferredProvider": "openai", "model": "gpt-4o", "temperature": 0.8, "maxTokens": 16000}',
  CURRENT_TIMESTAMP
),
-- Research Paper Template
(
  'multi_stage_research',
  'research_paper',
  true,
  4,
  '[
    {
      "stage": 1,
      "name": "big_picture",
      "prompt": "Create BIG PICTURE for research paper: \"{topic}\"\\n\\n1. RESEARCH QUESTION\\n2. HYPOTHESIS\\n3. METHODOLOGY\\n4. EXPECTED CONTRIBUTION\\n5. LITERATURE CONTEXT"
    },
    {
      "stage": 2,
      "name": "objects_relations",
      "prompt": "Create OBJECTS (theories, datasets, methods, prior work) and ARGUMENT FLOW..."
    },
    {
      "stage": 3,
      "name": "structure",
      "prompt": "Create SECTIONS with 200-word descriptions..."
    },
    {
      "stage": 4,
      "name": "granular_units",
      "prompt": "Create SUBSECTIONS and ARGUMENTS with 200-word descriptions..."
    }
  ]',
  false,
  '{"preferredProvider": "openai", "model": "gpt-4o", "temperature": 0.6, "maxTokens": 16000}',
  CURRENT_TIMESTAMP
);

-- 10. Create view for project overview
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