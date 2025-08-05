-- Seed data for Content Granulator

-- Insert default templates
INSERT INTO granulation_templates (template_name, structure_type, template_schema, complexity_level, target_audience, ai_prompt_template, validation_rules) VALUES
-- Educational Course Template
('educational_course_basic', 'course', '{
  "course": {
    "metadata": ["title", "description", "duration", "prerequisites"],
    "modules": {
      "count_range": [6, 15],
      "structure": {
        "lessons": {
          "count_range": [2, 5],
          "components": ["objectives", "content_outline", "examples", "exercises"]
        },
        "assessment": {
          "type": ["quiz", "assignment", "project"],
          "weight": "module_specific"
        }
      }
    }
  }
}', 3, 'general', 'Create a comprehensive course structure for "{topic}" targeting {audience}. Generate {granularity} modules with logical progression from basic to advanced concepts. Each module should contain 2-4 lessons with clear learning objectives, content outlines, practical examples, and exercises. Include assessments for each module.', '{
  "required_elements": ["modules", "lessons", "objectives", "assessments"],
  "min_modules": 6,
  "max_modules": 15,
  "min_lessons_per_module": 2
}'),

-- Quiz Generation Template
('quiz_assessment_standard', 'quiz', '{
  "quiz": {
    "metadata": ["title", "total_questions", "time_limit", "passing_score"],
    "categories": {
      "count_range": [3, 8],
      "question_distribution": {
        "easy": 0.4,
        "medium": 0.45,
        "hard": 0.15
      },
      "types": ["multiple_choice", "true_false", "code_completion", "essay"]
    }
  }
}', 2, 'students', 'Design a quiz structure for assessing knowledge of "{topic}" for {audience}. Create {granularity} categories with questions of varying difficulty (40% easy, 45% medium, 15% hard). Include multiple question types and ensure comprehensive coverage of the topic.', '{
  "min_questions": 15,
  "max_questions": 50,
  "required_types": ["multiple_choice", "true_false"],
  "difficulty_balance": true
}'),

-- Novel Outline Template
('three_act_novel', 'novel', '{
  "novel": {
    "act_structure": {
      "act1": {"chapters": 6, "purpose": "setup"},
      "act2": {"chapters": 12, "purpose": "confrontation"},
      "act3": {"chapters": 6, "purpose": "resolution"}
    },
    "elements": {
      "character_arcs": "protagonist_journey",
      "plot_points": ["inciting_incident", "plot_twist", "climax", "resolution"],
      "themes": "extracted_from_concept"
    }
  }
}', 4, 'fiction_writers', 'Develop a three-act novel outline for a story about "{topic}" aimed at {audience}. Create a detailed structure with {granularity} levels of depth. Act 1: 6 chapters (setup), Act 2: 12 chapters (confrontation), Act 3: 6 chapters (resolution). Include character arcs, major plot points, and thematic elements.', '{
  "total_chapters": 24,
  "required_plot_points": 4,
  "character_development": true
}'),

-- Business Workflow Template
('business_process_standard', 'workflow', '{
  "workflow": {
    "phases": {
      "initiation": {"steps": [2, 4], "decision_points": 1},
      "execution": {"steps": [5, 12], "decision_points": [2, 4]},
      "completion": {"steps": [2, 3], "decision_points": 1}
    },
    "elements": {
      "dependencies": "auto_detected",
      "resource_requirements": "per_step",
      "quality_gates": "phase_transitions"
    }
  }
}', 3, 'business_users', 'Design a workflow structure for "{topic}" suitable for {audience}. Create {granularity} phases (initiation, execution, completion) with detailed steps. Include decision points, dependencies, resource requirements, and quality gates at phase transitions.', '{
  "min_steps": 10,
  "max_steps": 25,
  "decision_points_required": true,
  "quality_gates": true
}'),

-- Knowledge Map Template
('concept_map_hierarchical', 'knowledge_map', '{
  "map": {
    "structure": "hierarchical",
    "levels": {
      "core_concepts": [3, 5],
      "sub_concepts": [2, 4],
      "details": [1, 3]
    },
    "relationships": ["prerequisite", "related", "advanced", "application"]
  }
}', 3, 'learners', 'Create a hierarchical knowledge map for "{topic}" targeting {audience}. Structure concepts at {granularity} levels of depth. Show relationships between concepts (prerequisites, related topics, advanced concepts, practical applications). Organize from fundamental to advanced.', '{
  "min_concepts": 15,
  "relationship_types": 4,
  "hierarchical": true
}'),

-- Learning Path Template
('skill_development_path', 'learning_path', '{
  "path": {
    "milestones": {
      "count": [5, 10],
      "components": ["skills", "competencies", "assessments", "projects"]
    },
    "progression": {
      "type": "linear_with_branches",
      "prerequisites": "explicit",
      "time_estimates": "per_milestone"
    }
  }
}', 4, 'professionals', 'Design a learning path for mastering "{topic}" for {audience}. Create {granularity} milestones with clear skills, competencies, assessments, and practical projects. Include prerequisites, time estimates, and allow for some branching based on interests.', '{
  "min_milestones": 5,
  "skills_per_milestone": 3,
  "projects_required": true
}');

-- Insert sample template analytics (for demonstration)
INSERT INTO template_analytics (template_id, usage_date, success_rate, avg_quality_score, avg_processing_time, avg_validation_accuracy, validation_failure_rate, user_satisfaction) VALUES
(1, DATE('now', '-7 days'), 0.92, 0.88, 6500, 91.5, 0.08, 4.5),
(1, DATE('now', '-6 days'), 0.94, 0.89, 6200, 92.0, 0.06, 4.6),
(2, DATE('now', '-5 days'), 0.96, 0.91, 3500, 94.5, 0.04, 4.7),
(3, DATE('now', '-4 days'), 0.88, 0.85, 12000, 88.0, 0.12, 4.3),
(4, DATE('now', '-3 days'), 0.93, 0.87, 4800, 90.5, 0.07, 4.4),
(5, DATE('now', '-2 days'), 0.91, 0.86, 5500, 89.5, 0.09, 4.3),
(6, DATE('now', '-1 days'), 0.90, 0.88, 7200, 91.0, 0.10, 4.5);