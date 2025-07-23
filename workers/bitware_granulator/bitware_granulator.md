# Content Granulator Worker - Intelligent Structure Creator

## 🧱 **Worker Specifications**

```typescript
// @WORKER
// 🧱 Type: StructureProcessor
// 📍 Path: workers/bitware_content_granulator/
// 🎯 Role: Granulate topics into structured knowledge components using AI templates
// 🧰 Params: { llm_model: "gpt-4o-mini", template_engine: "advanced", granularity_levels: [1,2,3,4,5] }
// 📦 Requires: [openai_api, template_library, structure_validator]
// 🔄 Outputs: Structured knowledge frameworks (courses, quizzes, outlines, workflows)
// 💾 Storage: { d1: "granulation_db", kv: "template_cache", k2: "structure_params" }
```

## 🎯 **Core Capabilities**

### **Intelligent Topic Granulation**
- **Multi-Level Breakdown**: Decompose complex topics into hierarchical structures
- **Template-Driven**: Use proven templates for courses, quizzes, novels, workflows
- **AI-Powered Analysis**: Understand topic complexity and optimal granulation depth
- **Structure Validation**: Ensure logical flow and completeness of granulated content
- **Adaptive Granularity**: Adjust detail level based on target audience and purpose

### **Supported Structure Types**
- 📚 **Educational Courses** → Modules, lessons, exercises, assessments
- 📝 **Quiz Systems** → Questions, answers, difficulty levels, categories
- 📖 **Novel Outlines** → Chapters, scenes, character arcs, plot points
- 🔄 **Workflows** → Steps, dependencies, decision points, outcomes
- 📊 **Knowledge Maps** → Concepts, relationships, hierarchies
- 🎯 **Learning Paths** → Prerequisites, milestones, competencies

## 📊 **Database Schema**

```sql
-- Granulation templates and patterns
CREATE TABLE granulation_templates (
  id INTEGER PRIMARY KEY,
  template_name TEXT UNIQUE NOT NULL,
  structure_type TEXT NOT NULL, -- 'course', 'quiz', 'novel', 'workflow'
  template_schema TEXT NOT NULL, -- JSON structure definition
  complexity_level INTEGER, -- 1-5 granularity depth
  target_audience TEXT,
  ai_prompt_template TEXT,
  validation_rules TEXT, -- JSON validation criteria
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  usage_count INTEGER DEFAULT 0
);

-- Granulation jobs and results
CREATE TABLE granulation_jobs (
  id INTEGER PRIMARY KEY,
  topic TEXT NOT NULL,
  structure_type TEXT NOT NULL,
  template_id INTEGER,
  granularity_level INTEGER,
  target_elements INTEGER, -- Expected number of granulated pieces
  actual_elements INTEGER,
  quality_score REAL,
  processing_time_ms INTEGER,
  cost_usd REAL,
  status TEXT DEFAULT 'processing', -- 'processing', 'completed', 'failed'
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (template_id) REFERENCES granulation_templates(id)
);

-- Granulated structure elements
CREATE TABLE structure_elements (
  id INTEGER PRIMARY KEY,
  job_id INTEGER NOT NULL,
  element_type TEXT NOT NULL, -- 'module', 'chapter', 'question', 'step'
  parent_id INTEGER, -- For hierarchical structures
  sequence_order INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  content_outline TEXT,
  metadata TEXT, -- JSON with type-specific data
  ai_reasoning TEXT,
  validation_status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES granulation_jobs(id),
  FOREIGN KEY (parent_id) REFERENCES structure_elements(id)
);

-- Template performance analytics
CREATE TABLE template_analytics (
  id INTEGER PRIMARY KEY,
  template_id INTEGER NOT NULL,
  usage_date DATE,
  success_rate REAL,
  avg_quality_score REAL,
  avg_processing_time INTEGER,
  user_satisfaction REAL,
  optimization_suggestions TEXT,
  FOREIGN KEY (template_id) REFERENCES granulation_templates(id)
);
```

## 🔌 **API Endpoints**

### **Public Endpoints**

#### `GET /help`
```json
{
  "worker": "bitware_content_granulator",
  "version": "1.0.0",
  "description": "AI-powered content granulation into structured knowledge components",
  "templates": ["course", "quiz", "novel", "workflow", "knowledge_map", "learning_path"],
  "granularity_levels": [1, 2, 3, 4, 5],
  "max_elements_per_job": 500
}
```

#### `GET /templates`
```json
{
  "available_templates": [
    {
      "name": "educational_course",
      "structure_type": "course",
      "complexity_levels": [1, 2, 3, 4, 5],
      "typical_elements": "10-50 modules",
      "best_for": "Educational content, training materials"
    },
    {
      "name": "novel_outline",
      "structure_type": "novel",
      "complexity_levels": [2, 3, 4, 5],
      "typical_elements": "15-30 chapters",
      "best_for": "Fiction writing, story development"
    }
  ]
}
```

### **Main Endpoints (Client Auth Required)**

#### `POST /granulate` - Primary Granulation Endpoint
```json
{
  "topic": "Artificial Intelligence for Beginners",
  "structure_type": "course",
  "granularity_level": 3,
  "template_name": "educational_course",
  "target_audience": "beginners",
  "constraints": {
    "max_modules": 12,
    "estimated_hours": 20,
    "difficulty_progression": "linear"
  },
  "options": {
    "include_assessments": true,
    "include_practical_exercises": true,
    "generate_prerequisites": true
  }
}
```

**Response:**
```json
{
  "status": "completed",
  "job_id": 42,
  "topic": "Artificial Intelligence for Beginners",
  "structure_type": "course",
  "granulation_summary": {
    "total_elements": 15,
    "modules": 8,
    "lessons": 24,
    "assessments": 8,
    "exercises": 12
  },
  "quality_score": 0.89,
  "structure": {
    "course_overview": {
      "title": "AI for Beginners: Complete Learning Path",
      "duration": "20 hours",
      "prerequisites": ["Basic computer literacy", "High school mathematics"],
      "learning_outcomes": [...]
    },
    "modules": [
      {
        "id": 1,
        "title": "Introduction to AI",
        "sequence_order": 1,
        "estimated_duration": "2 hours",
        "lessons": [
          {
            "title": "What is Artificial Intelligence?",
            "learning_objectives": [...],
            "content_outline": "Historical context, definitions, types of AI",
            "assessment_points": [...]
          }
        ]
      }
    ]
  },
  "processing_time_ms": 8500,
  "ready_for_content_generation": true
}
```

#### `POST /granulate/quiz` - Specialized Quiz Generation
```json
{
  "topic": "Python Programming Basics",
  "quiz_type": "progressive_assessment",
  "question_count": 25,
  "difficulty_distribution": {
    "easy": 40,
    "medium": 45,
    "hard": 15
  },
  "question_types": ["multiple_choice", "code_completion", "true_false"],
  "learning_objectives": [...]
}
```

#### `POST /granulate/novel` - Novel Structure Generation
```json
{
  "novel_concept": "Time-traveling detective solving historical mysteries",
  "genre": "science_fiction_mystery",
  "target_length": "80000_words",
  "structure_preferences": {
    "chapter_count": 24,
    "pov_style": "third_person_limited",
    "timeline_complexity": "moderate"
  },
  "character_requirements": {
    "protagonist_count": 1,
    "major_characters": 4,
    "minor_characters": 8
  }
}
```

#### `GET /job/{job_id}` - Retrieve Granulation Results
Returns complete granulated structure with all elements.

#### `POST /validate` - Structure Validation
```json
{
  "job_id": 42,
  "validation_criteria": ["logical_flow", "completeness", "difficulty_progression"],
  "auto_fix": true
}
```

### **Admin Endpoints (Worker Auth Required)**

#### `GET /admin/stats`
```json
{
  "total_granulations": 156,
  "template_usage": {
    "educational_course": 45,
    "quiz": 38,
    "novel": 22,
    "workflow": 51
  },
  "avg_quality_score": 0.87,
  "performance_metrics": {
    "avg_processing_time": 6500,
    "success_rate": 0.94,
    "user_satisfaction": 0.91
  }
}
```

#### `POST /admin/templates` - Template Management
Add, update, or optimize granulation templates.

## 🎨 **Template Examples**

### **Educational Course Template**
```json
{
  "template_name": "educational_course",
  "structure_schema": {
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
  },
  "ai_prompt_template": "Create a comprehensive course structure for '{topic}' targeting {audience}. Generate {module_count} modules with logical progression from basic to advanced concepts. Each module should contain 2-4 lessons with clear learning objectives..."
}
```

### **Novel Outline Template**
```json
{
  "template_name": "three_act_novel",
  "structure_schema": {
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
  }
}
```

### **Workflow Template**
```json
{
  "template_name": "business_process",
  "structure_schema": {
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
  }
}
```

## 🚀 **Integration with AI Factory**

### **Orchestrator Integration**
```typescript
// In orchestrator pipeline
const granulationResult = await executeWorkerViaBinding(
  env.CONTENT_GRANULATOR,
  'content_granulator',
  '/granulate',
  {
    topic: orchestrationRequest.topic,
    structure_type: orchestrationRequest.output_format || 'course',
    granularity_level: orchestrationRequest.detail_level || 3,
    target_audience: orchestrationRequest.audience || 'general'
  },
  env,
  'POST'
);

// Pass structured output to Content Generator
if (granulationResult.success) {
  const contentGenResult = await executeWorkerViaBinding(
    env.CONTENT_GENERATOR,
    'content_generator',
    '/generate',
    {
      structure: granulationResult.data.structure,
      detail_level: 'full',
      validate_output: true
    },
    env,
    'POST'
  );
}
```

### **Service Binding Configuration**
```toml
# In orchestrator wrangler.toml
[[services]]
binding = "CONTENT_GRANULATOR"
service = "bitware-content-granulator"
```

## ⚡ **Performance Optimization**

### **AI Efficiency**
- **Template Caching**: Store successful granulation patterns
- **Batch Processing**: Granulate related topics together
- **Smart Prompting**: Optimize AI prompts for consistent results
- **Quality Feedback**: Learn from user validation to improve templates

### **Expected Performance**
- **Simple Course (8 modules)**: 5-8 seconds
- **Complex Novel (24 chapters)**: 12-18 seconds  
- **Quiz Generation (25 questions)**: 3-5 seconds
- **Workflow (15 steps)**: 4-7 seconds

### **Cost Management**
- **Token Optimization**: Efficient prompt engineering
- **Template Reuse**: Minimize AI calls for similar structures
- **Validation Efficiency**: Smart structure checking

## 🎯 **Use Cases & Applications**

### **Educational Content**
- **Online Courses**: MOOCs, training programs, certification paths
- **Curriculum Development**: K-12, university, corporate training
- **Assessment Creation**: Quizzes, exams, competency evaluations

### **Creative Writing**
- **Novel Planning**: Fiction, non-fiction, technical writing
- **Screenplay Structure**: Films, TV shows, documentaries
- **Content Series**: Blog series, podcast episodes, video content

### **Business Processes**
- **Workflow Design**: Operations, projects, compliance procedures
- **Knowledge Management**: Documentation structures, wikis
- **Training Materials**: Onboarding, skills development, procedures

### **Research & Analysis**
- **Study Frameworks**: Research methodologies, analysis structures
- **Report Templates**: Technical reports, market analysis, audits
- **Knowledge Mapping**: Domain expertise, concept relationships

## 🧪 **Testing Strategy**

### **Template Validation**
```bash
# Test course generation
curl -X POST /granulate \
  -H "X-API-Key: key" \
  -d '{"topic": "Machine Learning", "structure_type": "course", "granularity_level": 3}'

# Test novel outline
curl -X POST /granulate/novel \
  -H "X-API-Key: key" \
  -d '{"novel_concept": "Space exploration adventure", "target_length": "60000_words"}'

# Validate structure quality
curl -X POST /validate \
  -H "X-API-Key: key" \
  -d '{"job_id": 42, "validation_criteria": ["logical_flow", "completeness"]}'
```

### **Quality Metrics**
- **Structure Completeness**: All required elements present
- **Logical Flow**: Sensible progression and dependencies
- **Audience Appropriateness**: Content matches target audience
- **Template Compliance**: Follows selected template structure
- **AI Reasoning Quality**: Clear explanations for granulation choices

## 🎯 **Success Metrics**

### **Technical Performance**
- **Granulation Accuracy**: 90%+ structure quality scores
- **Processing Speed**: <10 seconds for typical requests
- **Template Success Rate**: 95%+ successful granulations
- **User Satisfaction**: 4.5+ stars on structure quality

### **Business Impact**
- **Content Creation Speed**: 10x faster than manual structuring
- **Structure Consistency**: Standardized quality across all outputs
- **Creative Enhancement**: AI-powered insights improve human creativity
- **Scalability**: Handle unlimited topics and structure types

**The Content Granulator transforms any topic into a structured, AI-ready framework for intelligent content generation** 🧱🚀