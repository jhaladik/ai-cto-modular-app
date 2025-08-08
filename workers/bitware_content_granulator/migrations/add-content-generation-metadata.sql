-- Migration: Enhance templates with content generation metadata
-- Date: 2025-08-07
-- Purpose: Add word counts, content generation specs, and quality metrics for better content creation

-- Add new columns for content generation specifications
ALTER TABLE granulation_templates ADD COLUMN content_generation_specs TEXT;
ALTER TABLE granulation_templates ADD COLUMN word_count_targets TEXT;
ALTER TABLE granulation_templates ADD COLUMN content_tone_guidelines TEXT;
ALTER TABLE granulation_templates ADD COLUMN output_format_specs TEXT;
ALTER TABLE granulation_templates ADD COLUMN quality_metrics TEXT;

-- Add fields to track actual usage in generated content
ALTER TABLE granulation_jobs ADD COLUMN estimated_total_words INTEGER;
ALTER TABLE granulation_jobs ADD COLUMN content_generation_metadata TEXT;
ALTER TABLE granulation_jobs ADD COLUMN deliverable_specs TEXT;

-- Add fields to structure elements for content generation
ALTER TABLE structure_elements ADD COLUMN target_word_count INTEGER;
ALTER TABLE structure_elements ADD COLUMN content_type VARCHAR(50);
ALTER TABLE structure_elements ADD COLUMN generation_priority INTEGER DEFAULT 1;
ALTER TABLE structure_elements ADD COLUMN content_tone VARCHAR(50);
ALTER TABLE structure_elements ADD COLUMN key_points TEXT;

-- Update existing templates with content generation specifications
UPDATE granulation_templates 
SET content_generation_specs = '{
  "content_types": {
    "course": {
      "module_introduction": {"min_words": 300, "max_words": 500, "tone": "engaging_educational"},
      "lesson_content": {"min_words": 800, "max_words": 1500, "tone": "informative_clear"},
      "lesson_examples": {"min_words": 200, "max_words": 400, "tone": "practical"},
      "exercises": {"min_words": 150, "max_words": 300, "tone": "instructional"},
      "assessment_questions": {"min_words": 50, "max_words": 100, "tone": "precise"},
      "module_summary": {"min_words": 200, "max_words": 350, "tone": "concise_review"}
    }
  },
  "quality_requirements": {
    "readability_score": 8.5,
    "technical_accuracy": 0.95,
    "engagement_level": "high",
    "example_density": "1_per_concept"
  }
}',
word_count_targets = '{
  "total_course": {"min": 15000, "max": 30000},
  "per_module": {"min": 2500, "max": 5000},
  "per_lesson": {"min": 1000, "max": 2000},
  "per_exercise": {"min": 150, "max": 300}
}',
content_tone_guidelines = '{
  "primary_tone": "professional_educational",
  "secondary_tones": ["encouraging", "practical", "clear"],
  "avoid": ["overly_technical", "condescending", "informal_slang"],
  "reading_level": "undergraduate"
}',
output_format_specs = '{
  "formats": ["markdown", "html", "structured_json"],
  "include_metadata": true,
  "section_numbering": true,
  "cross_references": true,
  "media_placeholders": true
}',
quality_metrics = '{
  "completeness_weight": 0.3,
  "accuracy_weight": 0.3,
  "clarity_weight": 0.2,
  "engagement_weight": 0.2,
  "min_quality_score": 85
}'
WHERE template_name = 'educational_course_basic';

UPDATE granulation_templates 
SET content_generation_specs = '{
  "content_types": {
    "quiz": {
      "question_stem": {"min_words": 20, "max_words": 50, "tone": "clear_precise"},
      "multiple_choice_options": {"min_words": 5, "max_words": 15, "tone": "concise"},
      "explanation": {"min_words": 50, "max_words": 150, "tone": "educational"},
      "hint": {"min_words": 15, "max_words": 40, "tone": "helpful"}
    }
  },
  "quality_requirements": {
    "clarity_score": 9.0,
    "distractor_quality": "high",
    "cognitive_level_distribution": "blooms_taxonomy",
    "no_ambiguity": true
  }
}',
word_count_targets = '{
  "total_quiz": {"min": 2000, "max": 5000},
  "per_question": {"min": 100, "max": 250},
  "per_explanation": {"min": 50, "max": 150}
}',
content_tone_guidelines = '{
  "primary_tone": "assessment_formal",
  "secondary_tones": ["precise", "unambiguous"],
  "avoid": ["trick_questions", "double_negatives", "cultural_bias"],
  "cognitive_levels": ["remember", "understand", "apply", "analyze"]
}',
output_format_specs = '{
  "formats": ["qti_xml", "gift", "json", "markdown"],
  "include_answer_key": true,
  "include_explanations": true,
  "randomization_support": true
}',
quality_metrics = '{
  "validity_weight": 0.4,
  "reliability_weight": 0.3,
  "difficulty_balance_weight": 0.2,
  "discrimination_weight": 0.1,
  "min_quality_score": 90
}'
WHERE template_name = 'quiz_assessment_standard';

UPDATE granulation_templates 
SET content_generation_specs = '{
  "content_types": {
    "novel": {
      "chapter_content": {"min_words": 3000, "max_words": 5000, "tone": "narrative"},
      "scene_description": {"min_words": 200, "max_words": 500, "tone": "vivid_descriptive"},
      "dialogue": {"min_words": 50, "max_words": 300, "tone": "character_authentic"},
      "chapter_opening": {"min_words": 150, "max_words": 300, "tone": "hook_engaging"},
      "chapter_ending": {"min_words": 100, "max_words": 250, "tone": "cliffhanger_or_resolution"}
    }
  },
  "quality_requirements": {
    "narrative_flow": 0.9,
    "character_consistency": 0.95,
    "plot_coherence": 0.95,
    "pacing_score": 0.85,
    "show_dont_tell_ratio": 0.7
  }
}',
word_count_targets = '{
  "total_novel": {"min": 70000, "max": 120000},
  "per_chapter": {"min": 3000, "max": 5000},
  "per_scene": {"min": 800, "max": 1500},
  "per_act": {"min": 20000, "max": 40000}
}',
content_tone_guidelines = '{
  "primary_tone": "narrative_engaging",
  "genre_specific": true,
  "pov": "third_person_limited",
  "tense": "past",
  "style_elements": ["show_dont_tell", "sensory_details", "emotional_depth"]
}',
output_format_specs = '{
  "formats": ["manuscript", "epub", "markdown", "docx"],
  "include_chapter_summaries": true,
  "include_character_notes": true,
  "include_timeline": true,
  "scene_break_markers": true
}',
quality_metrics = '{
  "plot_weight": 0.25,
  "character_weight": 0.25,
  "prose_quality_weight": 0.25,
  "pacing_weight": 0.15,
  "originality_weight": 0.1,
  "min_quality_score": 80
}'
WHERE template_name = 'three_act_novel';

UPDATE granulation_templates 
SET content_generation_specs = '{
  "content_types": {
    "workflow": {
      "process_description": {"min_words": 200, "max_words": 400, "tone": "technical_clear"},
      "step_instruction": {"min_words": 50, "max_words": 150, "tone": "actionable"},
      "decision_criteria": {"min_words": 100, "max_words": 200, "tone": "logical_precise"},
      "resource_specification": {"min_words": 30, "max_words": 80, "tone": "detailed"},
      "quality_checkpoint": {"min_words": 75, "max_words": 150, "tone": "measurable"}
    }
  },
  "quality_requirements": {
    "completeness": 0.95,
    "logical_flow": 0.95,
    "actionability": 0.9,
    "measurability": 0.85,
    "compliance_alignment": 1.0
  }
}',
word_count_targets = '{
  "total_workflow": {"min": 3000, "max": 8000},
  "per_phase": {"min": 800, "max": 2000},
  "per_step": {"min": 100, "max": 250},
  "per_decision_point": {"min": 150, "max": 300}
}',
content_tone_guidelines = '{
  "primary_tone": "business_professional",
  "secondary_tones": ["instructional", "precise", "results_oriented"],
  "avoid": ["ambiguity", "passive_voice", "unnecessary_jargon"],
  "audience_level": "practitioner"
}',
output_format_specs = '{
  "formats": ["bpmn", "flowchart", "markdown", "json"],
  "include_swimlanes": true,
  "include_metrics": true,
  "include_risk_points": true,
  "automation_markers": true
}',
quality_metrics = '{
  "clarity_weight": 0.3,
  "completeness_weight": 0.3,
  "efficiency_weight": 0.2,
  "compliance_weight": 0.2,
  "min_quality_score": 88
}'
WHERE template_name = 'business_process_standard';

UPDATE granulation_templates 
SET content_generation_specs = '{
  "content_types": {
    "knowledge_map": {
      "concept_definition": {"min_words": 100, "max_words": 200, "tone": "academic_precise"},
      "relationship_description": {"min_words": 30, "max_words": 80, "tone": "connecting"},
      "example": {"min_words": 50, "max_words": 150, "tone": "illustrative"},
      "application": {"min_words": 100, "max_words": 250, "tone": "practical"}
    }
  },
  "quality_requirements": {
    "conceptual_accuracy": 0.95,
    "relationship_validity": 0.9,
    "hierarchy_consistency": 0.95,
    "coverage_completeness": 0.85
  }
}',
word_count_targets = '{
  "total_map": {"min": 5000, "max": 12000},
  "per_core_concept": {"min": 500, "max": 1000},
  "per_sub_concept": {"min": 200, "max": 400},
  "per_detail": {"min": 50, "max": 150}
}',
content_tone_guidelines = '{
  "primary_tone": "educational_reference",
  "secondary_tones": ["systematic", "interconnected", "foundational"],
  "complexity_progression": "simple_to_complex",
  "abstraction_level": "concrete_with_abstract_connections"
}',
output_format_specs = '{
  "formats": ["graphml", "json_ld", "markdown", "interactive_html"],
  "include_visualizations": true,
  "include_learning_paths": true,
  "include_prerequisites": true,
  "searchable_index": true
}',
quality_metrics = '{
  "accuracy_weight": 0.35,
  "completeness_weight": 0.25,
  "organization_weight": 0.2,
  "usability_weight": 0.2,
  "min_quality_score": 85
}'
WHERE template_name = 'concept_map_hierarchical';

UPDATE granulation_templates 
SET content_generation_specs = '{
  "content_types": {
    "learning_path": {
      "milestone_description": {"min_words": 200, "max_words": 400, "tone": "motivational_clear"},
      "skill_explanation": {"min_words": 100, "max_words": 200, "tone": "competency_focused"},
      "practice_instruction": {"min_words": 150, "max_words": 300, "tone": "hands_on"},
      "assessment_rubric": {"min_words": 100, "max_words": 250, "tone": "measurable"},
      "project_brief": {"min_words": 300, "max_words": 600, "tone": "challenging_achievable"}
    }
  },
  "quality_requirements": {
    "progression_logic": 0.95,
    "skill_coverage": 0.9,
    "practical_applicability": 0.9,
    "assessment_validity": 0.85,
    "engagement_factor": 0.8
  }
}',
word_count_targets = '{
  "total_path": {"min": 10000, "max": 25000},
  "per_milestone": {"min": 1500, "max": 3000},
  "per_skill_module": {"min": 500, "max": 1000},
  "per_project": {"min": 800, "max": 1500}
}',
content_tone_guidelines = '{
  "primary_tone": "professional_development",
  "secondary_tones": ["encouraging", "practical", "achievement_oriented"],
  "skill_focus": "competency_based",
  "motivation_style": "intrinsic_with_recognition"
}',
output_format_specs = '{
  "formats": ["scorm", "xapi", "json", "markdown"],
  "include_skill_matrix": true,
  "include_time_estimates": true,
  "include_resource_links": true,
  "progress_tracking": true
}',
quality_metrics = '{
  "relevance_weight": 0.3,
  "practicality_weight": 0.25,
  "progression_weight": 0.25,
  "assessment_weight": 0.2,
  "min_quality_score": 87
}'
WHERE template_name = 'skill_development_path';

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_jobs_estimated_words ON granulation_jobs(estimated_total_words);
CREATE INDEX IF NOT EXISTS idx_elements_word_count ON structure_elements(target_word_count);
CREATE INDEX IF NOT EXISTS idx_elements_priority ON structure_elements(generation_priority);

-- Add a new table for tracking content generation requirements per job
CREATE TABLE IF NOT EXISTS content_generation_requirements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  total_target_words INTEGER NOT NULL,
  content_sections JSON NOT NULL,
  tone_requirements JSON,
  format_requirements JSON,
  quality_thresholds JSON,
  priority_order JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES granulation_jobs(id)
);

-- Add table for content generation estimates
CREATE TABLE IF NOT EXISTS content_estimates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  element_id INTEGER NOT NULL,
  estimated_words INTEGER NOT NULL,
  estimated_generation_time_ms INTEGER,
  estimated_cost_usd REAL,
  complexity_score REAL,
  dependencies JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES granulation_jobs(id),
  FOREIGN KEY (element_id) REFERENCES structure_elements(id)
);