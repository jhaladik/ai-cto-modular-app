import { Env } from '../types';
import {
  ContentGeneratorInput,
  GeneratedContent,
  CourseContent,
  QuizContent,
  WorkflowContent,
  QualityMetrics,
  GenerationConfig,
  GenerationContext,
  ModuleContent,
  LessonContent,
} from '../types/generation';
import { DatabaseService } from './database';
import { AIProviderService } from './ai-provider';

export class ContentGeneratorService {
  private aiProvider: AIProviderService;
  private totalTokensInput: number = 0;
  private totalTokensOutput: number = 0;
  private totalCost: number = 0;
  private modelsUsed: Set<string> = new Set();
  private batchCount: number = 0;
  private retryCount: number = 0;

  constructor(
    private env: Env,
    private db: DatabaseService
  ) {
    this.aiProvider = new AIProviderService(env);
  }

  async createContentSections(
    jobId: number,
    structure: any,
    structureType: string
  ): Promise<void> {
    let sequenceNumber = 0;

    if (structureType === 'course') {
      // Create overview section
      await this.db.createContentSection({
        jobId,
        sectionId: 'overview',
        sectionType: 'overview',
        sequenceNumber: sequenceNumber++,
        title: 'Course Overview',
        priority: 'high',
      });

      // Create module and lesson sections
      for (const module of structure.modules || []) {
        const moduleId = module.id || `module_${sequenceNumber}`;
        await this.db.createContentSection({
          jobId,
          sectionId: moduleId,
          sectionType: 'module',
          sequenceNumber: sequenceNumber++,
          title: module.title,
          priority: 'high',
        });

        for (const lesson of module.lessons || []) {
          const lessonId = lesson.id || `lesson_${sequenceNumber}`;
          await this.db.createContentSection({
            jobId,
            sectionId: lessonId,
            sectionType: 'lesson',
            parentSectionId: moduleId,
            sequenceNumber: sequenceNumber++,
            title: lesson.title,
            priority: 'high',
          });

          // Create exercise sections
          for (const exercise of lesson.exercises || []) {
            await this.db.createContentSection({
              jobId,
              sectionId: `exercise_${sequenceNumber}`,
              sectionType: 'exercise',
              parentSectionId: lessonId,
              sequenceNumber: sequenceNumber++,
              title: exercise.title,
              priority: 'medium',
            });
          }
        }

        // Assessment section
        if (module.assessment) {
          await this.db.createContentSection({
            jobId,
            sectionId: `assessment_${moduleId}`,
            sectionType: 'assessment',
            parentSectionId: moduleId,
            sequenceNumber: sequenceNumber++,
            title: 'Module Assessment',
            priority: 'medium',
          });
        }
      }

      // Conclusion section
      await this.db.createContentSection({
        jobId,
        sectionId: 'conclusion',
        sectionType: 'conclusion',
        sequenceNumber: sequenceNumber++,
        title: 'Course Conclusion',
        priority: 'high',
      });
    }
    // Similar logic for quiz and workflow types...
  }

  async generateContent(
    jobId: number,
    structure: any,
    input: ContentGeneratorInput,
    config: GenerationConfig,
    progressCallback?: (progress: any) => Promise<void>
  ): Promise<GeneratedContent> {
    const context: GenerationContext = {
      globalContext: {
        topic: input.topic,
        audience: input.contentMetadata.standardParameters.targetAudience,
        tone: input.contentMetadata.standardParameters.tone,
        style: input.contentMetadata.standardParameters.style,
        previousSections: [],
      },
      localContext: {
        relatedConcepts: [],
        definedTerms: {},
      },
      constraints: {
        maxTokensPerRequest: parseInt(this.env.MAX_TOKENS_PER_REQUEST || '4000'),
        targetWordCount: input.wordCountEstimates.total,
        requiredKeywords: [],
      },
    };

    let generatedContent: GeneratedContent;

    switch (input.structureType) {
      case 'course':
        generatedContent = await this.generateCourseContent(
          jobId,
          structure,
          context,
          config,
          progressCallback
        );
        break;
      case 'quiz':
        generatedContent = await this.generateQuizContent(
          jobId,
          structure,
          context,
          config,
          progressCallback
        );
        break;
      case 'workflow':
        generatedContent = await this.generateWorkflowContent(
          jobId,
          structure,
          context,
          config,
          progressCallback
        );
        break;
      default:
        throw new Error(`Unsupported structure type: ${input.structureType}`);
    }

    // Add metadata
    generatedContent.metadata = {
      totalWords: this.countTotalWords(generatedContent),
      readingTime: this.estimateReadingTime(generatedContent),
      difficulty: this.assessDifficulty(context.globalContext.audience),
      keywords: this.extractKeywords(generatedContent),
      summary: await this.generateSummary(generatedContent, context),
    };

    return generatedContent;
  }

  private async generateCourseContent(
    jobId: number,
    structure: any,
    context: GenerationContext,
    config: GenerationConfig,
    progressCallback?: (progress: any) => Promise<void>
  ): Promise<GeneratedContent> {
    const courseContent: CourseContent = {
      overview: {
        title: '',
        description: '',
        introduction: '',
        prerequisites: [],
        learningOutcomes: [],
      },
      modules: [],
      conclusion: '',
    };

    let sectionsCompleted = 0;
    const totalSections = this.countTotalSections(structure);

    // Generate overview
    const overviewPrompt = await this.getPromptTemplate('course_overview');
    const overviewResult = await this.aiProvider.generateCompletion(
      this.fillPromptTemplate(overviewPrompt, {
        topic: context.globalContext.topic,
        audience: context.globalContext.audience,
        tone: context.globalContext.tone,
        style: context.globalContext.style,
      }),
      config
    );

    courseContent.overview = this.parseOverviewContent(overviewResult.content);
    this.updateMetrics(overviewResult);
    sectionsCompleted++;

    if (progressCallback) {
      await progressCallback({
        percentage: (sectionsCompleted / totalSections) * 100,
        currentSection: 'overview',
        sectionsCompleted,
        totalSections,
      });
    }

    // Generate modules
    for (const module of structure.modules || []) {
      const moduleContent = await this.generateModuleContent(
        module,
        context,
        config
      );
      courseContent.modules.push(moduleContent);
      sectionsCompleted++;

      // Update context with module summary
      context.globalContext.previousSections.push(
        `Module ${module.title}: ${moduleContent.introduction.substring(0, 200)}...`
      );

      if (progressCallback) {
        await progressCallback({
          percentage: (sectionsCompleted / totalSections) * 100,
          currentSection: `module: ${module.title}`,
          sectionsCompleted,
          totalSections,
        });
      }

      // Update job progress in database
      await this.db.updateJobProgress(jobId, sectionsCompleted, module.title);
    }

    // Generate conclusion
    const conclusionPrompt = await this.getPromptTemplate('course_conclusion');
    const conclusionResult = await this.aiProvider.generateCompletion(
      this.fillPromptTemplate(conclusionPrompt, {
        topic: context.globalContext.topic,
        modules: courseContent.modules.map(m => m.title).join(', '),
        keyLearnings: context.globalContext.previousSections.join('\n'),
      }),
      config
    );

    courseContent.conclusion = conclusionResult.content;
    this.updateMetrics(conclusionResult);
    sectionsCompleted++;

    if (progressCallback) {
      await progressCallback({
        percentage: 100,
        currentSection: 'conclusion',
        sectionsCompleted,
        totalSections,
      });
    }

    return { courseContent } as GeneratedContent;
  }

  private async generateModuleContent(
    module: any,
    context: GenerationContext,
    config: GenerationConfig
  ): Promise<ModuleContent> {
    const moduleContent: ModuleContent = {
      id: module.id,
      title: module.title,
      introduction: '',
      lessons: [],
      summary: '',
      assessment: {
        instructions: '',
        questions: [],
      },
    };

    // Generate module introduction
    const introPrompt = await this.getPromptTemplate('module_introduction');
    const introResult = await this.aiProvider.generateCompletion(
      this.fillPromptTemplate(introPrompt, {
        moduleTitle: module.title,
        topic: context.globalContext.topic,
        audience: context.globalContext.audience,
        tone: context.globalContext.tone,
        context: context.globalContext.previousSections.slice(-2).join('\n'),
        objectives: module.learningObjectives?.join('\n') || '',
      }),
      config
    );

    moduleContent.introduction = introResult.content;
    this.updateMetrics(introResult);

    // Generate lessons
    for (const lesson of module.lessons || []) {
      const lessonContent = await this.generateLessonContent(
        lesson,
        module.title,
        context,
        config
      );
      moduleContent.lessons.push(lessonContent);
    }

    // Generate module summary
    const summaryPrompt = `Summarize the key takeaways from the module "${module.title}" in 200-300 words.`;
    const summaryResult = await this.aiProvider.generateCompletion(summaryPrompt, config);
    moduleContent.summary = summaryResult.content;
    this.updateMetrics(summaryResult);

    // Generate assessment if present
    if (module.assessment) {
      const assessmentPrompt = await this.getPromptTemplate('assessment_questions');
      const assessmentResult = await this.aiProvider.generateCompletion(
        this.fillPromptTemplate(assessmentPrompt, {
          moduleTitle: module.title,
          topic: context.globalContext.topic,
          numQuestions: module.assessment.questions?.length || 5,
          difficulty: 'medium',
          moduleSummary: moduleContent.summary,
        }),
        config
      );

      moduleContent.assessment = this.parseAssessmentContent(assessmentResult.content);
      this.updateMetrics(assessmentResult);
    }

    return moduleContent;
  }

  private async generateLessonContent(
    lesson: any,
    moduleTitle: string,
    context: GenerationContext,
    config: GenerationConfig
  ): Promise<LessonContent> {
    const lessonContent: LessonContent = {
      id: lesson.id,
      title: lesson.title,
      content: '',
      keyPoints: [],
      examples: [],
      exercises: [],
    };

    // Generate main lesson content
    const lessonPrompt = await this.getPromptTemplate('lesson_content');
    const lessonResult = await this.aiProvider.generateCompletion(
      this.fillPromptTemplate(lessonPrompt, {
        lessonTitle: lesson.title,
        moduleTitle,
        topic: context.globalContext.topic,
        audience: context.globalContext.audience,
        tone: context.globalContext.tone,
        style: context.globalContext.style,
        wordCount: '800-1500',
        context: context.globalContext.previousSections.slice(-1).join('\n'),
        objectives: lesson.learningObjectives?.join('\n') || '',
      }),
      config
    );

    lessonContent.content = lessonResult.content;
    this.updateMetrics(lessonResult);

    // Extract key points
    lessonContent.keyPoints = this.extractKeyPoints(lessonContent.content);

    // Generate examples if needed
    if (lesson.examples && lesson.examples.length > 0) {
      for (const example of lesson.examples) {
        const exampleResult = await this.aiProvider.generateCompletion(
          `Create a practical example for "${lesson.title}" that demonstrates "${example.concept}". Include a clear title and 200-400 word description.`,
          config
        );
        lessonContent.examples.push({
          title: example.title || `Example: ${example.concept}`,
          description: exampleResult.content,
        });
        this.updateMetrics(exampleResult);
      }
    }

    // Generate exercises if needed
    if (lesson.exercises && lesson.exercises.length > 0) {
      for (const exercise of lesson.exercises) {
        const exerciseResult = await this.aiProvider.generateCompletion(
          `Create an exercise for "${lesson.title}": ${exercise.description}. Include clear instructions (150-300 words) and a solution (200-400 words).`,
          config
        );
        const parsed = this.parseExerciseContent(exerciseResult.content);
        lessonContent.exercises.push(parsed);
        this.updateMetrics(exerciseResult);
      }
    }

    return lessonContent;
  }

  private async generateQuizContent(
    jobId: number,
    structure: any,
    context: GenerationContext,
    config: GenerationConfig,
    progressCallback?: (progress: any) => Promise<void>
  ): Promise<GeneratedContent> {
    // Simplified implementation - would follow similar pattern to course
    const quizContent: QuizContent = {
      instructions: '',
      categories: [],
    };

    // Generate instructions
    const instructionsPrompt = await this.getPromptTemplate('quiz_instructions');
    const instructionsResult = await this.aiProvider.generateCompletion(
      this.fillPromptTemplate(instructionsPrompt, {
        topic: context.globalContext.topic,
        quizType: 'knowledge assessment',
        audience: context.globalContext.audience,
        totalQuestions: structure.totalQuestions || 20,
        timeLimit: structure.timeLimit || '30 minutes',
        passingScore: structure.passingScore || 70,
      }),
      config
    );

    quizContent.instructions = instructionsResult.content;
    this.updateMetrics(instructionsResult);

    // Generate categories and questions
    for (const category of structure.categories || []) {
      const questions = [];
      for (const question of category.questions || []) {
        const questionResult = await this.aiProvider.generateCompletion(
          `Generate a quiz question about "${question.topic}" with 4 options, correct answer, and explanation.`,
          config
        );
        questions.push(this.parseQuestionContent(questionResult.content));
        this.updateMetrics(questionResult);
      }

      quizContent.categories.push({
        name: category.name,
        description: category.description || '',
        questions,
      });
    }

    return { quizContent } as GeneratedContent;
  }

  private async generateWorkflowContent(
    jobId: number,
    structure: any,
    context: GenerationContext,
    config: GenerationConfig,
    progressCallback?: (progress: any) => Promise<void>
  ): Promise<GeneratedContent> {
    // Simplified implementation
    const workflowContent: WorkflowContent = {
      overview: {
        name: structure.name,
        description: '',
        purpose: '',
      },
      steps: [],
    };

    // Generate overview
    const overviewPrompt = await this.getPromptTemplate('workflow_overview');
    const overviewResult = await this.aiProvider.generateCompletion(
      this.fillPromptTemplate(overviewPrompt, {
        workflowName: structure.name,
        purpose: structure.purpose || '',
        targetUsers: context.globalContext.audience,
        context: structure.description || '',
      }),
      config
    );

    const parsedOverview = this.parseWorkflowOverview(overviewResult.content);
    workflowContent.overview = parsedOverview;
    this.updateMetrics(overviewResult);

    // Generate steps
    for (const step of structure.steps || []) {
      const stepResult = await this.aiProvider.generateCompletion(
        `Generate detailed instructions for workflow step "${step.name}": ${step.description}`,
        config
      );

      workflowContent.steps.push({
        id: step.id,
        name: step.name,
        description: step.description,
        instructions: stepResult.content,
        inputs: step.inputs || [],
        outputs: step.outputs || [],
      });
      this.updateMetrics(stepResult);
    }

    return { workflowContent } as GeneratedContent;
  }

  async validateContent(content: GeneratedContent): Promise<QualityMetrics> {
    // Simple quality metrics calculation
    const totalWords = this.countTotalWords(content);
    const readability = this.calculateReadability(content);
    const coherence = this.assessCoherence(content);
    const completeness = this.assessCompleteness(content);
    const topicRelevance = this.assessRelevance(content);

    const overallScore = (
      readability * 0.2 +
      coherence * 0.3 +
      completeness * 0.3 +
      topicRelevance * 0.2
    );

    return {
      overallScore,
      readability,
      coherence,
      completeness,
      topicRelevance,
    };
  }

  // Helper methods
  private async getPromptTemplate(name: string): Promise<string> {
    const template = await this.db.getPromptTemplate(name);
    return template?.template || this.getDefaultPrompt(name);
  }

  private getDefaultPrompt(name: string): string {
    // Fallback prompts if not in database
    const defaults: Record<string, string> = {
      course_overview: 'Generate a comprehensive course overview for {topic}...',
      course_conclusion: 'Write a conclusion for the course on {topic} that summarizes key learnings...',
      // Add more defaults as needed
    };
    return defaults[name] || 'Generate content for {topic}';
  }

  private fillPromptTemplate(template: string, variables: Record<string, string>): string {
    let filled = template;
    for (const [key, value] of Object.entries(variables)) {
      filled = filled.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return filled;
  }

  private updateMetrics(result: any): void {
    this.totalTokensInput += result.tokensInput || 0;
    this.totalTokensOutput += result.tokensOutput || 0;
    this.totalCost += result.cost || 0;
    this.modelsUsed.add(result.model || 'unknown');
    this.batchCount++;
  }

  private countTotalSections(structure: any): number {
    let count = 1; // Overview
    if (structure.modules) {
      for (const module of structure.modules) {
        count++; // Module intro
        count += module.lessons?.length || 0;
        if (module.assessment) count++;
      }
    }
    count++; // Conclusion
    return count;
  }

  private countTotalWords(content: GeneratedContent): number {
    let total = 0;
    const countText = (text?: string) => 
      text ? text.split(/\s+/).filter(w => w.length > 0).length : 0;

    if (content.courseContent) {
      total += countText(content.courseContent.overview.description);
      total += countText(content.courseContent.overview.introduction);
      for (const module of content.courseContent.modules) {
        total += countText(module.introduction);
        total += countText(module.summary);
        for (const lesson of module.lessons) {
          total += countText(lesson.content);
        }
      }
      total += countText(content.courseContent.conclusion);
    }
    // Add similar logic for quiz and workflow content

    return total;
  }

  private estimateReadingTime(content: GeneratedContent): string {
    const words = this.countTotalWords(content);
    const minutes = Math.ceil(words / 200); // Average reading speed
    return `${minutes} minutes`;
  }

  private assessDifficulty(audience: string): string {
    if (!audience) return 'intermediate';
    
    const audienceLevels: Record<string, string> = {
      'beginners': 'beginner',
      'intermediate': 'intermediate',
      'advanced': 'advanced',
      'experts': 'expert',
    };
    return audienceLevels[audience.toLowerCase()] || 'intermediate';
  }

  private extractKeywords(content: GeneratedContent): string[] {
    // Simple keyword extraction - in production, use NLP
    const keywords = new Set<string>();
    // Extract from titles, headings, etc.
    if (content.courseContent) {
      keywords.add(content.courseContent.overview.title);
      content.courseContent.modules.forEach(m => {
        keywords.add(m.title);
        m.lessons.forEach(l => keywords.add(l.title));
      });
    }
    return Array.from(keywords).slice(0, 10);
  }

  private async generateSummary(
    content: GeneratedContent,
    context: GenerationContext
  ): Promise<string> {
    const summaryPrompt = `Summarize this ${context.globalContext.topic} content in 200-300 words, highlighting key concepts and learning outcomes.`;
    const result = await this.aiProvider.generateCompletion(summaryPrompt, {});
    this.updateMetrics(result);
    return result.content;
  }

  private calculateReadability(content: GeneratedContent): number {
    // Simplified readability score - in production, use Flesch-Kincaid
    return 85; // Placeholder
  }

  private assessCoherence(content: GeneratedContent): number {
    // Check for logical flow and consistency
    return 88; // Placeholder
  }

  private assessCompleteness(content: GeneratedContent): number {
    // Check if all required sections are present
    return 92; // Placeholder
  }

  private assessRelevance(content: GeneratedContent): number {
    // Check topic relevance
    return 90; // Placeholder
  }

  private parseOverviewContent(content: string): any {
    // Parse AI response into structured overview
    // In production, use more sophisticated parsing
    return {
      title: 'Generated Title',
      description: content.substring(0, 300),
      introduction: content,
      prerequisites: [],
      learningOutcomes: [],
    };
  }

  private parseAssessmentContent(content: string): any {
    // Parse AI response into assessment structure
    return {
      instructions: 'Complete the following assessment',
      questions: [],
    };
  }

  private parseExerciseContent(content: string): any {
    // Parse AI response into exercise structure
    return {
      title: 'Exercise',
      instructions: content.substring(0, 300),
      solution: content.substring(300),
    };
  }

  private parseQuestionContent(content: string): any {
    // Parse AI response into question structure
    return {
      id: Math.random().toString(36).substring(7),
      question: 'Generated question',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option A',
      explanation: 'Explanation here',
    };
  }

  private parseWorkflowOverview(content: string): any {
    return {
      name: 'Workflow',
      description: content,
      purpose: 'Generated purpose',
    };
  }

  private extractKeyPoints(content: string): string[] {
    // Extract key points from lesson content
    // In production, use NLP to identify key sentences
    return ['Key point 1', 'Key point 2', 'Key point 3'];
  }

  // Public getters for metrics
  getTotalTokensUsed(): number {
    return this.totalTokensInput + this.totalTokensOutput;
  }

  getInputTokensUsed(): number {
    return this.totalTokensInput;
  }

  getOutputTokensUsed(): number {
    return this.totalTokensOutput;
  }

  getTotalCost(): number {
    return this.totalCost;
  }

  getModelsUsed(): string[] {
    return Array.from(this.modelsUsed);
  }

  getBatchCount(): number {
    return this.batchCount;
  }

  getRetryCount(): number {
    return this.retryCount;
  }
}