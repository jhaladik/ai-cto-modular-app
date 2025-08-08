import { Env } from '../types';
import { DatabaseService } from './database';
import { OpenAIService } from './openai';
import { ValidationService } from './validation';
import { AIProviderFactory, AIProviderInterface, AIProvider } from './ai-provider';
import { generateGranulationPrompt, getStructurePromptTemplate } from '../helpers/prompts';
import { calculateResourceEfficiency, getCostTier } from '../helpers/economy';
import { 
  GranulationRequest, 
  GranulationJob, 
  CourseStructure, 
  QuizStructure, 
  NovelStructure, 
  WorkflowStructure 
} from '../types/granulation';

export class GranulatorService {
  private db: DatabaseService;
  private openai: OpenAIService; // Keep for backward compatibility
  private validation: ValidationService;
  private env: Env;
  
  constructor(env: Env) {
    this.env = env;
    this.db = new DatabaseService(env);
    this.openai = new OpenAIService(env); // Keep for backward compatibility
    this.validation = new ValidationService(env);
  }

  async granulate(
    request: GranulationRequest,
    clientId?: string,
    executionId?: string
  ): Promise<{
    jobId: number;
    structure: any;
    summary: any;
    qualityScore: number;
    validationResult?: any;
    processingTimeMs: number;
    costUsd: number;
  }> {
    const startTime = Date.now();
    
    // Get template
    console.log('Looking for template:', request.templateName);
    const template = await this.db.getTemplate(request.templateName);
    console.log('Template found:', template);
    if (!template) {
      throw new Error(`Template not found: ${request.templateName}`);
    }
    if (!template.id) {
      console.error('Template missing ID:', template);
      throw new Error(`Template ${request.templateName} is missing ID field`);
    }
    
    // Validate all parameters before creating job
    const jobParams = {
      topic: request.topic || 'Unknown Topic',
      structureType: request.structureType || 'course',
      templateId: template.id,
      granularityLevel: request.granularityLevel || 3,
      targetElements: request.constraints?.maxElements || undefined,
      validationEnabled: request.validation?.enabled || false,
      validationLevel: request.validation?.level || 1,
      validationThreshold: request.validation?.threshold || 85,
      clientId: clientId || undefined,
      executionId: executionId || undefined
    };
    
    console.log('Creating job with params:', jobParams);
    
    // Create job
    const jobId = await this.db.createJob(jobParams);
    
    try {
      // Generate prompt
      const basePrompt = template.aiPromptTemplate || getStructurePromptTemplate(request.structureType);
      const prompt = generateGranulationPrompt(
        request.topic,
        request.structureType,
        basePrompt,
        request.granularityLevel,
        request.targetAudience || 'general audience',
        request.constraints,
        request.options
      );
      
      // Merge template AI config with request AI config (request overrides template)
      const aiConfig = {
        ...template.aiProviderConfig,
        ...request.aiConfig,
        modelPreferences: {
          ...(template.aiProviderConfig as any)?.modelPreferences,
          ...(request.aiConfig as any)?.modelPreferences
        }
      };
      
      // Select AI provider based on merged configuration
      const preferredProvider = aiConfig.provider || aiConfig.preferredProvider;
      const fallbackProviders = aiConfig.fallbackProviders || ['openai', 'claude', 'cloudflare'];
      const aiProvider = await this.getAIProvider(preferredProvider, fallbackProviders);
      console.log(`Using AI provider: ${preferredProvider || 'default'}`);
      
      // Get the model for the selected provider
      const providerName = preferredProvider || 'openai';
      const model = aiConfig.model || 
                   aiConfig.modelPreferences?.[providerName as keyof typeof aiConfig.modelPreferences] ||
                   aiProvider.getDefaultModel();
      
      // Call AI provider with merged configuration
      const aiResponse = await aiProvider.generateCompletion(prompt, {
        model,
        temperature: aiConfig.temperature || 0.7,
        maxTokens: aiConfig.maxTokens || 4000,
        systemPrompt: aiConfig.systemPrompt || 
                     template.aiProviderConfig?.systemPrompt || 
                     'You are an expert educational content structure designer. Generate well-structured JSON responses.'
      });
      console.log(`AI response from ${aiResponse.provider}:`, aiResponse.content ? aiResponse.content.substring(0, 500) : 'NO CONTENT');
      
      let structure;
      try {
        if (!aiResponse.content) {
          throw new Error('AI provider returned empty content');
        }
        
        // Clean the response - remove markdown code blocks if present
        let cleanContent = aiResponse.content;
        if (cleanContent.includes('```json')) {
          cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (cleanContent.includes('```')) {
          cleanContent = cleanContent.replace(/```\n?/g, '');
        }
        cleanContent = cleanContent.trim();
        
        structure = JSON.parse(cleanContent);
        console.log('Parsed structure:', JSON.stringify(structure).substring(0, 200));
      } catch (parseError) {
        console.error(`Failed to parse ${aiResponse.provider} response:`, parseError);
        console.error('Raw content:', aiResponse.content);
        throw new Error(`Invalid JSON response from ${aiResponse.provider}: ${parseError.message}`);
      }
      
      // Transform structure if needed (handle OpenAI response variations)
      console.log('Structure type:', request.structureType);
      console.log('Structure keys:', Object.keys(structure || {}));
      console.log('Has structure.course:', !!structure.course);
      console.log('Has structure.courseOverview:', !!structure.courseOverview);
      
      if (request.structureType === 'course') {
        // Handle various response formats
        if (structure.course && !structure.courseOverview) {
          console.log('Transforming wrapped course structure...');
          // OpenAI returned wrapped structure, transform it
          const courseData = structure.course;
          structure = {
            courseOverview: {
              title: courseData.title || courseData.courseOverview?.title || 'Untitled Course',
              description: courseData.description || courseData.courseOverview?.description || '',
              duration: courseData.duration || courseData.courseOverview?.duration || '8 weeks',
              prerequisites: courseData.prerequisites || courseData.courseOverview?.prerequisites || [],
              learningOutcomes: courseData.learningOutcomes || [],
              targetAudience: courseData.target_audience || courseData.targetAudience || request.targetAudience || 'general audience'
            },
            modules: (courseData.modules || []).map((module: any, index: number) => ({
              id: index + 1,
              title: module.title || module.module_title || `Module ${index + 1}`,
              sequenceOrder: index,
              estimatedDuration: module.estimatedDuration || module.duration || '1 week',
              learningObjectives: module.learningObjectives || [],
              lessons: (module.lessons || []).map((lesson: any) => ({
                title: lesson.title || lesson.lesson_title || 'Untitled Lesson',
                learningObjectives: lesson.learningObjectives || lesson.learning_objectives || [],
                contentOutline: lesson.contentOutline || lesson.content_outline || '',
                assessmentPoints: lesson.assessmentPoints || lesson.assessment_points || [],
                practicalExercises: lesson.practicalExercises || lesson.practical_exercises || []
              })),
              assessment: module.assessment ? {
                type: module.assessment.type || 'quiz',
                questions: module.assessment.questions || 10,
                passingScore: module.assessment.passingScore || module.assessment.passing_score || 70
              } : undefined
            }))
          };
        } else if (!structure.courseOverview && structure.modules) {
          console.log('Adding missing courseOverview to structure...');
          // Structure has modules but no courseOverview
          structure = {
            courseOverview: {
              title: structure.title || `Course on ${request.topic}`,
              description: structure.description || `A comprehensive course on ${request.topic}`,
              duration: structure.duration || '8 weeks',
              prerequisites: structure.prerequisites || [],
              learningOutcomes: structure.learningOutcomes || [],
              targetAudience: request.targetAudience || 'general audience'
            },
            modules: structure.modules
          };
        } else if (!structure.courseOverview) {
          console.log('Creating default course structure...');
          // Fallback: create a minimal valid structure
          structure = {
            courseOverview: {
              title: `Course on ${request.topic}`,
              description: `A comprehensive course on ${request.topic}`,
              duration: '8 weeks',
              prerequisites: [],
              learningOutcomes: [],
              targetAudience: request.targetAudience || 'general audience'
            },
            modules: []
          };
        }
      }
      
      // Calculate quality score
      const qualityScore = this.calculateQualityScore(structure, request);
      
      // Store structure elements in database
      await this.storeStructureElements(jobId, structure, request.structureType);
      
      // Perform validation if enabled
      let validationResult;
      if (request.validation?.enabled) {
        validationResult = await this.validation.validate(
          structure,
          request.topic,
          request.structureType,
          request.validation.level,
          request.targetAudience || 'general audience'
        );
        
        // Save validation result
        await this.db.saveValidationResult({
          jobId,
          validationLevel: request.validation.level,
          accuracyPercentage: validationResult.accuracyPercentage,
          questionsAsked: validationResult.questions || [],
          scores: validationResult.details.questionScores,
          passed: validationResult.passed,
          retryCount: 0,
          validationTimeMs: validationResult.validationTimeMs,
          aiFeedback: validationResult.aiFeedback
        });
        
        // Status will be updated later based on validation result
      }
      
      // Calculate cost using the AI provider with model info
      const costUsd = aiProvider.calculateCost(aiResponse.tokensUsed, aiResponse.model);
      const processingTimeMs = Date.now() - startTime;
      
      // Track resource consumption
      const resourceUsage = {
        provider: aiResponse.provider,
        model: aiResponse.model,
        tokensUsed: aiResponse.tokensUsed,
        processingTimeMs,
        requestCount: 1
      };
      
      const efficiency = calculateResourceEfficiency(resourceUsage);
      const costTier = getCostTier(costUsd);
      
      // Record resource consumption in database
      await this.db.recordResourceConsumption({
        jobId,
        aiProvider: aiResponse.provider,
        aiModel: aiResponse.model,
        tokensPrompt: aiResponse.tokensUsed.prompt,
        tokensCompletion: aiResponse.tokensUsed.completion,
        tokensTotal: aiResponse.tokensUsed.total,
        costPrompt: (aiResponse.tokensUsed.prompt / 1000) * 0.001, // Will be calculated properly
        costCompletion: (aiResponse.tokensUsed.completion / 1000) * 0.002,
        costTotal: costUsd,
        costPer1kTokens: efficiency.tokensPerSecond > 0 ? (costUsd / aiResponse.tokensUsed.total) * 1000 : 0,
        processingTimeMs,
        tokensPerSecond: efficiency.tokensPerSecond,
        efficiencyRating: efficiency.efficiency,
        requestType: 'granulation',
        clientId: clientId || undefined,
        executionId: executionId || undefined
      });
      
      // Generate summary with word counts and metadata
      const summary = this.generateSummary(structure, request.structureType);
      
      // Calculate total estimated words
      const estimatedTotalWords = summary.wordCountEstimates?.total || 0;
      
      // Prepare content generation metadata
      const contentGenerationMetadata = {
        wordCountEstimates: summary.wordCountEstimates,
        contentMetadata: summary.contentMetadata,
        templateSpecs: {
          contentGenerationSpecs: template.contentGenerationSpecs,
          wordCountTargets: template.wordCountTargets,
          contentToneGuidelines: template.contentToneGuidelines,
          outputFormatSpecs: template.outputFormatSpecs,
          qualityMetrics: template.qualityMetrics
        }
      };
      
      // Prepare deliverable specs
      const deliverableSpecs = {
        formats: summary.contentMetadata?.formatOptions || ['markdown'],
        estimatedPages: Math.ceil(estimatedTotalWords / 250), // ~250 words per page
        sections: summary.wordCountEstimates?.bySection || {},
        qualityRequirements: summary.contentMetadata?.qualityTargets || {}
      };
      
      // Update job with results - using existing database columns
      await this.db.updateJob(jobId, {
        actual_elements: this.countElements(structure),
        quality_score: qualityScore,
        processing_time_ms: processingTimeMs,
        cost_usd: costUsd,
        estimated_total_words: estimatedTotalWords,
        content_generation_metadata: JSON.stringify(contentGenerationMetadata),
        deliverable_specs: JSON.stringify(deliverableSpecs),
        status: validationResult ? (validationResult.passed ? 'completed' : 'failed') : 'completed',
        completedAt: new Date().toISOString()
      });
      
      // Update template usage and analytics
      await this.db.incrementTemplateUsage(template.id);
      await this.db.recordAnalytics(template.id, {
        success: true,
        qualityScore,
        processingTime: processingTimeMs,
        validationAccuracy: validationResult?.accuracyPercentage,
        validationFailed: validationResult?.passed === false
      });
      
      return {
        jobId,
        structure,
        summary,
        qualityScore,
        validationResult,
        processingTimeMs,
        costUsd
      };
    } catch (error) {
      // Update job status on failure
      await this.db.updateJob(jobId, {
        status: 'failed',
        completedAt: new Date().toISOString()
      });
      throw error;
    }
  }

  private async storeStructureElements(jobId: number, structure: any, structureType: string): Promise<void> {
    switch (structureType) {
      case 'course':
        await this.storeCourseElements(jobId, structure as CourseStructure);
        break;
      case 'quiz':
        await this.storeQuizElements(jobId, structure as QuizStructure);
        break;
      case 'novel':
        await this.storeNovelElements(jobId, structure as NovelStructure);
        break;
      case 'workflow':
        await this.storeWorkflowElements(jobId, structure as WorkflowStructure);
        break;
      default:
        await this.storeGenericElements(jobId, structure);
    }
  }

  private async storeCourseElements(jobId: number, course: CourseStructure): Promise<void> {
    console.log('Storing course elements, full structure:', JSON.stringify(course));
    
    // Check if courseOverview exists
    if (!course.courseOverview) {
      console.error('Missing courseOverview in course structure. Keys found:', Object.keys(course || {}));
      console.error('Full structure received:', JSON.stringify(course));
      throw new Error('Invalid course structure: missing courseOverview');
    }
    
    // Store course overview as root element
    const courseId = await this.db.createStructureElement({
      jobId,
      elementType: 'course',
      sequenceOrder: 0,
      title: course.courseOverview.title || 'Untitled Course',
      description: course.courseOverview.duration ? `Duration: ${course.courseOverview.duration}` : 'No duration specified',
      metadata: course.courseOverview,
      target_word_count: 500, // Course overview word count
      content_type: 'overview',
      generation_priority: 1,
      content_tone: 'professional_educational'
    });
    
    // Store modules
    for (let i = 0; i < course.modules.length; i++) {
      const module = course.modules[i];
      const moduleId = await this.db.createStructureElement({
        jobId,
        elementType: 'module',
        parentId: courseId,
        sequenceOrder: i,
        title: module.title,
        target_word_count: 400, // Module introduction
        content_type: 'module_introduction',
        generation_priority: 1,
        content_tone: 'engaging_educational',
        description: `Duration: ${module.estimatedDuration}`,
        metadata: {
          learningObjectives: module.learningObjectives,
          assessment: module.assessment
        }
      });
      
      // Store lessons
      for (let j = 0; j < module.lessons.length; j++) {
        const lesson = module.lessons[j];
        await this.db.createStructureElement({
          jobId,
          elementType: 'lesson',
          parentId: moduleId,
          sequenceOrder: j,
          title: lesson.title,
          contentOutline: lesson.contentOutline,
          target_word_count: 1200, // Main lesson content
          content_type: 'lesson_content',
          generation_priority: 1,
          content_tone: 'informative_clear',
          key_points: JSON.stringify(lesson.learningObjectives || []),
          metadata: {
            learningObjectives: lesson.learningObjectives,
            assessmentPoints: lesson.assessmentPoints,
            practicalExercises: lesson.practicalExercises,
            wordDistribution: {
              mainContent: 800,
              examples: 300,
              exercises: 100
            }
          }
        });
      }
    }
  }

  private async storeQuizElements(jobId: number, quiz: QuizStructure): Promise<void> {
    // Store quiz overview
    const quizId = await this.db.createStructureElement({
      jobId,
      elementType: 'quiz',
      sequenceOrder: 0,
      title: quiz.quizOverview.title,
      description: `${quiz.quizOverview.totalQuestions} questions, ${quiz.quizOverview.estimatedTime}`,
      metadata: quiz.quizOverview
    });
    
    // Store categories
    for (let i = 0; i < quiz.categories.length; i++) {
      const category = quiz.categories[i];
      await this.db.createStructureElement({
        jobId,
        elementType: 'category',
        parentId: quizId,
        sequenceOrder: i,
        title: category.name,
        description: `${category.questionCount} questions`,
        metadata: { questions: category.questions }
      });
    }
  }

  private async storeNovelElements(jobId: number, novel: NovelStructure): Promise<void> {
    // Similar implementation for novel structure
    const novelId = await this.db.createStructureElement({
      jobId,
      elementType: 'novel',
      sequenceOrder: 0,
      title: novel.novelOverview.title,
      description: `${novel.novelOverview.genre} - ${novel.novelOverview.targetLength}`,
      metadata: novel.novelOverview
    });
    
    // Store acts and chapters...
  }

  private async storeWorkflowElements(jobId: number, workflow: WorkflowStructure): Promise<void> {
    // Similar implementation for workflow structure
    const workflowId = await this.db.createStructureElement({
      jobId,
      elementType: 'workflow',
      sequenceOrder: 0,
      title: workflow.workflowOverview.name,
      description: workflow.workflowOverview.purpose,
      metadata: workflow.workflowOverview
    });
    
    // Store phases and steps...
  }

  private async storeGenericElements(jobId: number, structure: any): Promise<void> {
    // Generic storage for unknown structure types
    await this.db.createStructureElement({
      jobId,
      elementType: 'root',
      sequenceOrder: 0,
      title: structure.title || 'Generated Structure',
      metadata: structure
    });
  }

  private calculateQualityScore(structure: any, request: GranulationRequest): number {
    let score = 0.5; // Base score
    
    // Check completeness
    const elementCount = this.countElements(structure);
    if (elementCount > 0) score += 0.2;
    
    // Check structure depth
    const depth = this.calculateDepth(structure);
    if (depth >= request.granularityLevel) score += 0.15;
    
    // Check for required components
    if (request.options?.includeAssessments && this.hasAssessments(structure)) score += 0.1;
    if (request.options?.includePracticalExercises && this.hasExercises(structure)) score += 0.05;
    
    return Math.min(score, 1.0);
  }

  private countElements(structure: any, count = 0): number {
    if (Array.isArray(structure)) {
      return structure.reduce((acc, item) => acc + this.countElements(item), count);
    } else if (typeof structure === 'object' && structure !== null) {
      return Object.values(structure).reduce((acc, value) => acc + this.countElements(value), count + 1);
    }
    return count;
  }

  private calculateDepth(structure: any, currentDepth = 0): number {
    if (Array.isArray(structure)) {
      return Math.max(...structure.map(item => this.calculateDepth(item, currentDepth)));
    } else if (typeof structure === 'object' && structure !== null) {
      const depths = Object.values(structure).map(value => this.calculateDepth(value, currentDepth + 1));
      return depths.length > 0 ? Math.max(...depths) : currentDepth;
    }
    return currentDepth;
  }

  private hasAssessments(structure: any): boolean {
    const json = JSON.stringify(structure);
    return json.includes('assessment') || json.includes('quiz') || json.includes('test');
  }

  private hasExercises(structure: any): boolean {
    const json = JSON.stringify(structure);
    return json.includes('exercise') || json.includes('practice') || json.includes('activity');
  }

  private generateSummary(structure: any, structureType: string): any {
    const wordCountEstimates = this.calculateWordCountEstimates(structure, structureType);
    const contentMetadata = this.generateContentMetadata(structure, structureType);
    
    switch (structureType) {
      case 'course':
        const course = structure as CourseStructure;
        return {
          totalElements: this.countElements(structure),
          modules: course.modules?.length || 0,
          lessons: course.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0,
          assessments: course.modules?.filter(m => m.assessment).length || 0,
          exercises: course.modules?.reduce((acc, m) => 
            acc + m.lessons.filter(l => l.practicalExercises?.length > 0).length, 0
          ) || 0,
          wordCountEstimates,
          contentMetadata
        };
      
      case 'quiz':
        const quiz = structure as QuizStructure;
        return {
          totalQuestions: quiz.quizOverview?.totalQuestions || 0,
          categories: quiz.categories?.length || 0,
          difficultyDistribution: quiz.quizOverview?.difficultyDistribution,
          wordCountEstimates,
          contentMetadata
        };
      
      default:
        return {
          totalElements: this.countElements(structure),
          wordCountEstimates,
          contentMetadata
        };
    }
  }
  
  private calculateWordCountEstimates(structure: any, structureType: string): any {
    const estimates: any = {
      total: 0,
      bySection: {},
      byPriority: {
        high: 0,
        medium: 0,
        low: 0
      }
    };
    
    switch (structureType) {
      case 'course':
        const course = structure as CourseStructure;
        let totalWords = 0;
        
        // Module introductions
        estimates.bySection.moduleIntroductions = course.modules?.length * 400 || 0;
        totalWords += estimates.bySection.moduleIntroductions;
        
        // Lesson content
        const totalLessons = course.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0;
        estimates.bySection.lessonContent = totalLessons * 1200;
        totalWords += estimates.bySection.lessonContent;
        
        // Examples
        estimates.bySection.examples = totalLessons * 300;
        totalWords += estimates.bySection.examples;
        
        // Exercises
        const totalExercises = course.modules?.reduce((acc, m) => 
          acc + m.lessons.reduce((lacc, l) => lacc + (l.practicalExercises?.length || 0), 0), 0
        ) || 0;
        estimates.bySection.exercises = totalExercises * 200;
        totalWords += estimates.bySection.exercises;
        
        // Assessments
        estimates.bySection.assessments = course.modules?.filter(m => m.assessment).length * 500 || 0;
        totalWords += estimates.bySection.assessments;
        
        // Module summaries
        estimates.bySection.summaries = course.modules?.length * 250 || 0;
        totalWords += estimates.bySection.summaries;
        
        estimates.total = totalWords;
        
        // Priority distribution (example logic)
        estimates.byPriority.high = Math.round(totalWords * 0.5); // Core content
        estimates.byPriority.medium = Math.round(totalWords * 0.3); // Supporting content
        estimates.byPriority.low = Math.round(totalWords * 0.2); // Optional content
        break;
        
      case 'quiz':
        const quiz = structure as QuizStructure;
        const questionCount = quiz.quizOverview?.totalQuestions || 0;
        
        estimates.bySection.questions = questionCount * 35;
        estimates.bySection.options = questionCount * 4 * 10; // 4 options average
        estimates.bySection.explanations = questionCount * 100;
        estimates.bySection.hints = questionCount * 25;
        
        estimates.total = estimates.bySection.questions + 
                         estimates.bySection.options + 
                         estimates.bySection.explanations + 
                         estimates.bySection.hints;
        
        estimates.byPriority.high = estimates.bySection.questions + estimates.bySection.options;
        estimates.byPriority.medium = estimates.bySection.explanations;
        estimates.byPriority.low = estimates.bySection.hints;
        break;
        
      case 'novel':
        const chapterCount = 24; // Three-act structure default
        estimates.bySection.chapterContent = chapterCount * 4000;
        estimates.bySection.sceneDescriptions = chapterCount * 3 * 350; // 3 scenes per chapter
        estimates.bySection.dialogue = chapterCount * 5 * 150; // 5 dialogue sections per chapter
        
        estimates.total = estimates.bySection.chapterContent + 
                         estimates.bySection.sceneDescriptions + 
                         estimates.bySection.dialogue;
        
        estimates.byPriority.high = estimates.bySection.chapterContent;
        estimates.byPriority.medium = estimates.bySection.dialogue;
        estimates.byPriority.low = estimates.bySection.sceneDescriptions;
        break;
        
      default:
        estimates.total = this.countElements(structure) * 200; // Default estimate
        estimates.byPriority.high = Math.round(estimates.total * 0.6);
        estimates.byPriority.medium = Math.round(estimates.total * 0.25);
        estimates.byPriority.low = Math.round(estimates.total * 0.15);
    }
    
    return estimates;
  }
  
  private generateContentMetadata(structure: any, structureType: string): any {
    // Generate standardized metadata for next workers in the chain
    return {
      // Standard metadata for worker chain
      workerChain: {
        currentWorker: 'bitware-content-granulator',
        nextWorkers: ['content-generator', 'quality-validator'],
        outputFormat: 'structured_json',
        version: '2.0'
      },
      // Standard parameters for content generation
      standardParameters: {
        topic: structure.courseOverview?.title || structure.quizOverview?.title || structure.novelOverview?.title || 'Unknown',
        structureType,
        granularityLevel: this.countElements(structure) > 50 ? 5 : 3,
        targetAudience: structure.courseOverview?.targetAudience || 'general',
        language: 'en',
        tone: this.getPrimaryTone(structureType),
        style: 'educational'
      },
      // Generation strategy
      generationStrategy: {
        approach: 'hierarchical',
        parallelizable: true,
        dependencies: this.identifyDependencies(structure, structureType),
        batchSize: 10,
        maxConcurrent: 5
      },
      // Content specifications
      contentSpecs: {
        contentTypes: this.identifyContentTypes(structure, structureType),
        requiredSections: this.getRequiredSections(structureType),
        optionalSections: this.getOptionalSections(structureType)
      },
      // Quality requirements
      qualityRequirements: {
        minQualityScore: 0.7,
        readabilityTarget: 8.5,
        coherenceTarget: 0.9,
        completenessTarget: 0.95,
        validationRequired: true
      },
      // Output format specifications
      outputSpecs: {
        formats: ['markdown', 'json'],
        encoding: 'utf-8',
        includeMetadata: true,
        structurePreserved: true
      },
      // Resource estimates for next workers
      resourceEstimates: {
        estimatedTokens: this.countElements(structure) * 500,
        estimatedTimeMs: this.estimateGenerationTime(structure, structureType, true),
        estimatedCostUsd: this.countElements(structure) * 0.001,
        storageRequired: this.countElements(structure) > 100 ? 'large' : 'medium'
      },
      // Tone and style guidelines (backward compatibility)
      toneGuidelines: {
        primary: this.getPrimaryTone(structureType),
        variations: this.getToneVariations(structureType)
      },
      qualityTargets: {
        readability: 8.5,
        coherence: 0.9,
        completeness: 0.95,
        engagement: 0.85
      },
      formatOptions: {
        primary: 'markdown',
        alternatives: ['html', 'json', 'docx'],
        includeMetadata: true
      },
      estimatedGenerationTime: {
        sequential: this.estimateGenerationTime(structure, structureType, false),
        parallel: this.estimateGenerationTime(structure, structureType, true)
      }
    };
  }

  private getRequiredSections(structureType: string): string[] {
    const sectionMap: Record<string, string[]> = {
      'course': ['title', 'objectives', 'content', 'summary'],
      'quiz': ['questions', 'answers', 'explanations'],
      'novel': ['chapters', 'scenes', 'characters'],
      'workflow': ['steps', 'decisions', 'outcomes'],
      'knowledge_map': ['concepts', 'relationships', 'hierarchy'],
      'learning_path': ['milestones', 'skills', 'assessments']
    };
    return sectionMap[structureType] || ['content'];
  }

  private getOptionalSections(structureType: string): string[] {
    const sectionMap: Record<string, string[]> = {
      'course': ['exercises', 'resources', 'discussions'],
      'quiz': ['hints', 'feedback', 'scoring'],
      'novel': ['worldbuilding', 'themes', 'symbolism'],
      'workflow': ['exceptions', 'alternatives', 'optimizations'],
      'knowledge_map': ['examples', 'applications', 'prerequisites'],
      'learning_path': ['certifications', 'projects', 'mentorship']
    };
    return sectionMap[structureType] || [];
  }
  
  private identifyDependencies(structure: any, structureType: string): any[] {
    const dependencies = [];
    
    if (structureType === 'course') {
      const course = structure as CourseStructure;
      course.modules?.forEach((module, idx) => {
        if (idx > 0) {
          dependencies.push({
            dependent: `module_${idx + 1}`,
            requires: `module_${idx}`,
            type: 'sequential_learning'
          });
        }
      });
    }
    
    return dependencies;
  }
  
  private identifyContentTypes(structure: any, structureType: string): string[] {
    switch (structureType) {
      case 'course':
        return ['instructional', 'examples', 'exercises', 'assessments', 'summaries'];
      case 'quiz':
        return ['questions', 'options', 'explanations', 'hints'];
      case 'novel':
        return ['narrative', 'dialogue', 'description', 'action'];
      case 'workflow':
        return ['procedures', 'decisions', 'specifications', 'checkpoints'];
      default:
        return ['general'];
    }
  }
  
  private getPrimaryTone(structureType: string): string {
    const toneMap: Record<string, string> = {
      course: 'educational_engaging',
      quiz: 'assessment_formal',
      novel: 'narrative_immersive',
      workflow: 'business_professional',
      knowledge_map: 'academic_informative',
      learning_path: 'motivational_practical'
    };
    return toneMap[structureType] || 'professional';
  }
  
  private getToneVariations(structureType: string): string[] {
    const variationsMap: Record<string, string[]> = {
      course: ['encouraging', 'clear', 'practical'],
      quiz: ['precise', 'unambiguous', 'fair'],
      novel: ['descriptive', 'emotional', 'dynamic'],
      workflow: ['instructional', 'measurable', 'actionable'],
      knowledge_map: ['systematic', 'comprehensive', 'interconnected'],
      learning_path: ['progressive', 'achievement_oriented', 'supportive']
    };
    return variationsMap[structureType] || ['clear', 'concise'];
  }
  
  private estimateGenerationTime(structure: any, structureType: string, parallel: boolean): number {
    const wordEstimates = this.calculateWordCountEstimates(structure, structureType);
    const baseTimePerWord = 0.01; // seconds per word
    const totalTime = wordEstimates.total * baseTimePerWord;
    
    if (parallel) {
      // Assume 4x speedup with parallel processing
      return Math.round(totalTime / 4);
    }
    
    return Math.round(totalTime);
  }
  
  private async getAIProvider(preferredProvider?: AIProvider | string, fallbackProviders?: string[]): Promise<AIProviderInterface> {
    // Convert string to AIProvider type
    const provider = preferredProvider as AIProvider | undefined;
    
    // Try preferred provider first
    if (provider) {
      try {
        const aiProvider = AIProviderFactory.create(provider, this.env);
        if (await aiProvider.isAvailable()) {
          return aiProvider;
        }
      } catch (error) {
        console.warn(`Preferred provider ${provider} not available:`, error);
      }
    }
    
    // Try fallback providers
    if (fallbackProviders && fallbackProviders.length > 0) {
      for (const fallback of fallbackProviders) {
        try {
          const aiProvider = AIProviderFactory.create(fallback as AIProvider, this.env);
          if (await aiProvider.isAvailable()) {
            console.log(`Using fallback provider: ${fallback}`);
            return aiProvider;
          }
        } catch (error) {
          console.warn(`Fallback provider ${fallback} not available:`, error);
        }
      }
    }
    
    // Get best available provider as last resort
    return await AIProviderFactory.getBestAvailableProvider(this.env, provider);
  }
}