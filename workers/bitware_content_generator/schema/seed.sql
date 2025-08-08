-- Seed data for Content Generator

-- Insert default prompt templates
INSERT INTO prompt_templates (name, content_type, structure_type, template, variables, recommended_model, temperature, max_tokens, system_prompt) VALUES
-- Course generation prompts
('course_overview', 'overview', 'course', 'Generate a comprehensive course overview for "{topic}".

Target Audience: {audience}
Tone: {tone}
Style: {style}

Include:
1. Course title (engaging and descriptive)
2. Course description (200-300 words)
3. Introduction (500-800 words) that sets the context and motivates learners
4. Prerequisites (list of 3-5 items, each 50-100 words)
5. Learning outcomes (list of 5-7 specific, measurable outcomes, each 50-100 words)

Make the content engaging, clear, and aligned with the target audience.', 
'["topic", "audience", "tone", "style"]', 'gpt-4o-mini', 0.7, 3000, 
'You are an expert educational content creator specializing in creating engaging and effective learning materials.'),

('module_introduction', 'module', 'course', 'Generate an introduction for the following module:

Module Title: {moduleTitle}
Course Topic: {topic}
Target Audience: {audience}
Tone: {tone}
Previous Context: {context}

Create a module introduction (300-500 words) that:
1. Explains what this module covers
2. Shows how it connects to previous learning
3. Motivates learners to engage with the content
4. Provides a brief overview of lessons in this module

Learning Objectives for this module:
{objectives}',
'["moduleTitle", "topic", "audience", "tone", "context", "objectives"]', 'gpt-4o-mini', 0.7, 2000,
'You are an expert educational content creator specializing in creating engaging and effective learning materials.'),

('lesson_content', 'lesson', 'course', 'Generate educational content for the following lesson:

Lesson Title: {lessonTitle}
Module: {moduleTitle}
Course Topic: {topic}
Target Audience: {audience}
Tone: {tone}
Style: {style}
Word Count Target: {wordCount}

Context from Previous Sections:
{context}

Learning Objectives:
{objectives}

Requirements:
- Main content should be {wordCount} words
- Include practical examples
- Use clear, engaging language
- Break content into logical sections with subheadings
- Include transitions between concepts

Generate the complete lesson content:', 
'["lessonTitle", "moduleTitle", "topic", "audience", "tone", "style", "wordCount", "context", "objectives"]', 
'gpt-4o-mini', 0.7, 4000,
'You are an expert educational content creator specializing in creating engaging and effective learning materials.'),

('lesson_examples', 'example', 'course', 'Create {numExamples} practical examples for the following lesson:

Lesson: {lessonTitle}
Topic: {topic}
Audience: {audience}

Lesson Summary:
{lessonSummary}

For each example:
1. Provide a clear title
2. Write a description (200-400 words)
3. Include step-by-step walkthrough if applicable
4. Explain why this example is relevant
5. {includeCode}

Make examples progressively more complex and ensure they reinforce the lesson objectives.',
'["numExamples", "lessonTitle", "topic", "audience", "lessonSummary", "includeCode"]', 
'gpt-4o-mini', 0.8, 3000,
'You are an expert at creating practical, real-world examples that help learners understand and apply concepts.'),

('lesson_exercises', 'exercise', 'course', 'Create {numExercises} exercises for the following lesson:

Lesson: {lessonTitle}
Topic: {topic}
Difficulty: {difficulty}
Audience: {audience}

Lesson Summary:
{lessonSummary}

For each exercise:
1. Provide a clear title
2. Write detailed instructions (150-300 words)
3. Include hints or guidance
4. Provide a complete solution with explanation (200-400 words)
5. Explain what concepts this exercise reinforces

Vary the difficulty and type of exercises to engage different learning styles.',
'["numExercises", "lessonTitle", "topic", "difficulty", "audience", "lessonSummary"]',
'gpt-4o-mini', 0.7, 3000,
'You are an expert at creating educational exercises that challenge learners appropriately and reinforce learning objectives.'),

('assessment_questions', 'assessment', 'course', 'Create assessment questions for the following module:

Module: {moduleTitle}
Topic: {topic}
Number of Questions: {numQuestions}
Difficulty: {difficulty}

Module Content Summary:
{moduleSummary}

Create {numQuestions} assessment questions:
- Mix of question types (multiple choice, true/false, short answer)
- Each question should test understanding, not just recall
- Provide:
  * The question (50-150 words for context if needed)
  * Answer options (for multiple choice)
  * Correct answer
  * Detailed explanation (100-200 words)

Ensure questions cover all key concepts from the module.',
'["moduleTitle", "topic", "numQuestions", "difficulty", "moduleSummary"]',
'gpt-4o-mini', 0.6, 3000,
'You are an expert at creating fair, comprehensive assessments that accurately measure learning outcomes.'),

-- Quiz generation prompts
('quiz_instructions', 'instructions', 'quiz', 'Create comprehensive instructions for a quiz on "{topic}".

Quiz Type: {quizType}
Target Audience: {audience}
Total Questions: {totalQuestions}
Time Limit: {timeLimit}
Passing Score: {passingScore}%

Write instructions (200-300 words) that:
1. Explain the quiz purpose and what it tests
2. Provide clear guidelines on how to take the quiz
3. Explain scoring and what constitutes success
4. Give tips for best performance
5. Set expectations for difficulty and coverage',
'["topic", "quizType", "audience", "totalQuestions", "timeLimit", "passingScore"]',
'gpt-4o-mini', 0.7, 1500,
'You are an expert at creating clear, helpful quiz instructions that set learners up for success.'),

('quiz_questions', 'question', 'quiz', 'Generate {numQuestions} quiz questions on "{topic}".

Category: {category}
Difficulty: {difficulty}
Target Audience: {audience}
Question Types: {questionTypes}

Context:
{context}

For each question provide:
1. The question text (50-150 words)
2. Additional context if needed (100-200 words)
3. 4-5 answer options (each 20-50 words)
4. The correct answer
5. A detailed explanation (100-200 words)
6. 2-3 hints (each 50-100 words)

Ensure questions are clear, unambiguous, and test understanding rather than memorization.',
'["numQuestions", "topic", "category", "difficulty", "audience", "questionTypes", "context"]',
'gpt-4o-mini', 0.6, 4000,
'You are an expert at creating effective quiz questions that accurately assess knowledge and understanding.'),

-- Workflow generation prompts
('workflow_overview', 'overview', 'workflow', 'Create a comprehensive workflow overview for "{workflowName}".

Purpose: {purpose}
Target Users: {targetUsers}
Context: {context}

Generate:
1. Workflow name (clear and descriptive)
2. Detailed description (300-500 words)
3. Purpose and objectives (200-300 words)
4. List of stakeholders and their roles
5. Expected outcomes and benefits
6. Prerequisites and requirements

Make the content clear, actionable, and focused on practical implementation.',
'["workflowName", "purpose", "targetUsers", "context"]',
'gpt-4o-mini', 0.7, 2500,
'You are an expert at designing clear, efficient workflows that solve real business problems.'),

('workflow_step', 'step', 'workflow', 'Create detailed content for workflow step: "{stepName}"

Step Number: {stepNumber}
Workflow: {workflowName}
Previous Step: {previousStep}
Next Step: {nextStep}

Generate:
1. Step name and description (200-300 words)
2. Detailed instructions (400-600 words)
3. Required inputs (list with descriptions)
4. Expected outputs (list with descriptions)
5. Tools and resources needed
6. Common issues and solutions
7. Success criteria

Ensure the step is clear, actionable, and well-connected to the overall workflow.',
'["stepName", "stepNumber", "workflowName", "previousStep", "nextStep"]',
'gpt-4o-mini', 0.7, 3000,
'You are an expert at creating detailed, actionable workflow documentation.');

-- Update usage statistics for templates
UPDATE prompt_templates SET usage_count = 0, avg_quality_score = 85.0, avg_generation_time_ms = 3500, success_rate = 0.95;

-- Insert sample generation analytics (for testing)
INSERT INTO generation_analytics (
  date, 
  total_jobs, 
  successful_jobs, 
  failed_jobs,
  total_words_generated,
  total_sections_generated,
  avg_words_per_job,
  avg_sections_per_job,
  total_tokens_used,
  total_cost_usd,
  avg_cost_per_1k_words,
  avg_tokens_per_1k_words,
  avg_generation_time_ms,
  avg_words_per_minute,
  avg_quality_score,
  avg_readability_score,
  provider_stats,
  model_stats,
  structure_type_stats
) VALUES (
  date('now'),
  0, 0, 0, 0, 0, 0, 0, 0, 0.0, 0.0, 0, 0, 0, 0.0, 0.0,
  '{"openai": {"jobs": 0, "tokens": 0, "cost": 0}, "claude": {"jobs": 0, "tokens": 0, "cost": 0}, "cloudflare": {"jobs": 0, "tokens": 0, "cost": 0}}',
  '{"gpt-4o-mini": {"jobs": 0, "tokens": 0, "cost": 0, "avg_quality": 0}}',
  '{"course": {"jobs": 0, "words": 0, "sections": 0}, "quiz": {"jobs": 0, "words": 0, "sections": 0}}'
);