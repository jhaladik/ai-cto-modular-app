import { Env } from '../types';
import { DatabaseService } from './database';
import { OpenAIService } from './openai';
import { ValidationService } from './validation';
import { generateGranulationPrompt, getStructurePromptTemplate } from '../helpers/prompts';
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
  private openai: OpenAIService;
  private validation: ValidationService;
  
  constructor(env: Env) {
    this.db = new DatabaseService(env);
    this.openai = new OpenAIService(env);
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
    const template = await this.db.getTemplate(request.templateName);
    if (!template) {
      throw new Error(`Template not found: ${request.templateName}`);
    }
    
    // Create job
    const jobId = await this.db.createJob({
      topic: request.topic,
      structureType: request.structureType,
      templateId: template.id,
      granularityLevel: request.granularityLevel,
      targetElements: request.constraints?.maxElements,
      validationEnabled: request.validation?.enabled || false,
      validationLevel: request.validation?.level || 1,
      validationThreshold: request.validation?.threshold || 85,
      clientId,
      executionId
    });
    
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
      
      // Call OpenAI
      const aiResponse = await this.openai.generateStructure(prompt);
      const structure = JSON.parse(aiResponse.content);
      
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
        
        // Update job status based on validation
        if (!validationResult.passed) {
          await this.db.updateJob(jobId, { status: 'validating' });
        }
      }
      
      // Calculate cost
      const costUsd = this.openai.calculateCost(aiResponse.tokensUsed);
      const processingTimeMs = Date.now() - startTime;
      
      // Update job with results
      await this.db.updateJob(jobId, {
        actualElements: this.countElements(structure),
        qualityScore,
        processingTimeMs,
        costUsd,
        status: validationResult?.passed !== false ? 'completed' : 'validating',
        completedAt: new Date().toISOString()
      });
      
      // Generate summary
      const summary = this.generateSummary(structure, request.structureType);
      
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
    // Store course overview as root element
    const courseId = await this.db.createStructureElement({
      jobId,
      elementType: 'course',
      sequenceOrder: 0,
      title: course.courseOverview.title,
      description: `Duration: ${course.courseOverview.duration}`,
      metadata: course.courseOverview
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
          metadata: {
            learningObjectives: lesson.learningObjectives,
            assessmentPoints: lesson.assessmentPoints,
            practicalExercises: lesson.practicalExercises
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
          ) || 0
        };
      
      case 'quiz':
        const quiz = structure as QuizStructure;
        return {
          totalQuestions: quiz.quizOverview?.totalQuestions || 0,
          categories: quiz.categories?.length || 0,
          difficultyDistribution: quiz.quizOverview?.difficultyDistribution
        };
      
      default:
        return {
          totalElements: this.countElements(structure)
        };
    }
  }
}