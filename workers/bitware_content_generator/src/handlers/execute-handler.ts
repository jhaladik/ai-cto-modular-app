import { Env, AuthenticatedRequest } from '../types';
import { 
  ContentGeneratorInput, 
  ContentGeneratorOutput,
  GenerationJob,
  GeneratedContent,
  CourseContent,
  QuizContent,
  WorkflowContent
} from '../types/generation';
import { parseRequestBody, jsonResponse, errorResponse } from '../helpers/http';
import { DatabaseService } from '../services/database';
import { ContentGeneratorService } from '../services/generator';
import { StorageManager } from '../services/storage-manager';

export async function handleExecute(
  env: Env,
  request: AuthenticatedRequest
): Promise<Response> {
  const startTime = Date.now();
  
  try {
    const body = await parseRequestBody(request);
    
    // Validate action
    if (body.action !== 'generate') {
      return errorResponse('Invalid action. Supported actions: generate', 400);
    }

    // Validate and parse input
    const input = validateInput(body.input);
    const config = body.config || {};

    // Initialize services
    const db = new DatabaseService(env);
    const generator = new ContentGeneratorService(env, db);
    const storage = new StorageManager(env);

    // Create job record
    const jobId = await db.createJob({
      granulatorJobId: input.granulatorJobId,
      topic: input.topic,
      structureType: input.structureType,
      totalSections: countSections(input.structure),
      clientId: request.auth?.clientId,
      executionId: body.executionId,
    });

    // Update job status to processing
    await db.updateJobStatus(jobId, 'processing');

    // Store initial job status in KV for real-time tracking
    await env.JOB_STATUS.put(
      `job-${jobId}`,
      JSON.stringify({
        status: 'processing',
        startedAt: new Date().toISOString(),
        message: 'Initializing content generation',
      }),
      { expirationTtl: 86400 } // 24 hours
    );

    try {
      // Retrieve structure if referenced
      let structure = input.structure;
      if (input.structureReference) {
        structure = await storage.retrieveData(
          input.structureReference.type,
          input.structureReference.location
        );
      }

      if (!structure) {
        throw new Error('Structure data not found');
      }

      // Parse structure and create content sections in database
      await generator.createContentSections(jobId, structure, input.structureType);

      // Start generation process
      const generatedContent = await generator.generateContent(
        jobId,
        structure,
        input,
        config,
        async (progress) => {
          // Progress callback - update KV for real-time tracking
          await env.JOB_STATUS.put(
            `job-${jobId}`,
            JSON.stringify({
              status: 'processing',
              progress,
              updatedAt: new Date().toISOString(),
            }),
            { expirationTtl: 86400 }
          );
        }
      );

      // Calculate quality metrics
      const qualityMetrics = await generator.validateContent(generatedContent);

      // Store generated content
      const { storageType, location, size } = await storage.storeContent(
        generatedContent,
        `job-${jobId}`
      );

      // Update job with final metrics
      const processingTime = Date.now() - startTime;
      await db.updateJobStorage(jobId, storageType, location, size);
      await db.updateJobMetrics(jobId, {
        totalWords: generatedContent.metadata.totalWords,
        tokensUsed: generator.getTotalTokensUsed(),
        costUsd: generator.getTotalCost(),
        processingTimeMs: processingTime,
        qualityScore: qualityMetrics.overallScore,
        readabilityScore: qualityMetrics.readability,
        coherenceScore: qualityMetrics.coherence,
        completenessScore: qualityMetrics.completeness,
      });

      // Mark job as completed
      await db.updateJobStatus(jobId, 'completed');

      // Record analytics
      await db.recordAnalytics({
        jobId,
        success: true,
        wordsGenerated: generatedContent.metadata.totalWords,
        sectionsGenerated: countGeneratedSections(generatedContent),
        tokensUsed: generator.getTotalTokensUsed(),
        costUsd: generator.getTotalCost(),
        generationTimeMs: processingTime,
        qualityScore: qualityMetrics.overallScore,
        provider: config.aiProvider || env.DEFAULT_MODEL?.split('/')[0] || 'openai',
        model: config.aiModel || env.DEFAULT_MODEL || 'gpt-4o-mini',
        structureType: input.structureType,
      });

      // Prepare response
      const response: ContentGeneratorOutput = {
        success: true,
        output: {
          jobId,
          granulatorJobId: input.granulatorJobId,
          topic: input.topic,
          structureType: input.structureType,
          content: size < 25000 ? generatedContent : undefined, // Inline if small
          contentReference: size >= 25000 ? {
            type: storageType,
            location,
            size,
          } : undefined,
          summary: {
            totalSections: countGeneratedSections(generatedContent),
            sectionsGenerated: countGeneratedSections(generatedContent),
            totalWords: generatedContent.metadata.totalWords,
            wordsBySection: getWordsBySection(generatedContent),
            generationTime: processingTime,
            tokensUsed: {
              input: generator.getInputTokensUsed(),
              output: generator.getOutputTokensUsed(),
              total: generator.getTotalTokensUsed(),
            },
            costUsd: generator.getTotalCost(),
          },
          qualityMetrics,
          readyForPackaging: qualityMetrics.overallScore >= parseInt(env.QUALITY_THRESHOLD || '75'),
          packagingMetadata: {
            availableFormats: ['html', 'pdf', 'docx', 'markdown', 'audio'],
            recommendedFormat: determineRecommendedFormat(input.structureType),
            estimatedPackagingTime: estimatePackagingTime(generatedContent.metadata.totalWords),
          },
        },
        usage: {
          tokens: {
            input: generator.getInputTokensUsed(),
            output: generator.getOutputTokensUsed(),
          },
        },
        duration: processingTime,
        cost: generator.getTotalCost(),
        metadata: {
          aiProvider: config.aiProvider || env.DEFAULT_MODEL?.split('/')[0] || 'openai',
          models: generator.getModelsUsed(),
          batchesProcessed: generator.getBatchCount(),
          retries: generator.getRetryCount(),
          workerChain: {
            currentWorker: 'bitware-content-generator',
            previousWorker: 'bitware-content-granulator',
            nextWorkers: ['content-packager', 'quality-validator'],
            outputFormat: 'structured_content_json',
            version: env.VERSION || '1.0.0',
          },
        },
      };

      // Clear job status from KV
      await env.JOB_STATUS.delete(`job-${jobId}`);

      return jsonResponse(response);

    } catch (error) {
      // Generation failed - update job status
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      await db.updateJobStatus(jobId, 'failed', errorMessage);
      
      // Record failure analytics
      await db.recordAnalytics({
        jobId,
        success: false,
        wordsGenerated: 0,
        sectionsGenerated: 0,
        tokensUsed: generator?.getTotalTokensUsed() || 0,
        costUsd: generator?.getTotalCost() || 0,
        generationTimeMs: Date.now() - startTime,
        provider: config.aiProvider || 'unknown',
        model: config.aiModel || 'unknown',
        structureType: input.structureType,
      });

      throw error;
    }

  } catch (error) {
    console.error('Execute error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Content generation failed',
      500,
      { details: error instanceof Error ? error.stack : undefined }
    );
  }
}

function validateInput(input: any): ContentGeneratorInput {
  if (!input.granulatorJobId) {
    throw new Error('granulatorJobId is required');
  }
  if (!input.topic) {
    throw new Error('topic is required');
  }
  if (!input.structureType) {
    throw new Error('structureType is required');
  }
  if (!input.structure && !input.structureReference) {
    throw new Error('structure or structureReference is required');
  }
  if (!input.wordCountEstimates) {
    throw new Error('wordCountEstimates is required');
  }
  if (!input.contentMetadata) {
    throw new Error('contentMetadata is required');
  }

  return input as ContentGeneratorInput;
}

function countSections(structure: any): number {
  let count = 0;
  
  if (!structure) return 0;

  // Count based on structure type
  if (structure.modules) {
    // Course structure
    count++; // Overview
    for (const module of structure.modules) {
      count++; // Module intro
      if (module.lessons) {
        count += module.lessons.length;
      }
      if (module.assessment) {
        count++;
      }
    }
    count++; // Conclusion
  } else if (structure.categories) {
    // Quiz structure
    count++; // Instructions
    for (const category of structure.categories) {
      count++; // Category
      if (category.questions) {
        count += category.questions.length;
      }
    }
  } else if (structure.steps) {
    // Workflow structure
    count++; // Overview
    count += structure.steps.length;
  }

  return count;
}

function countGeneratedSections(content: GeneratedContent): number {
  let count = 0;

  if (content.courseContent) {
    count++; // Overview
    count += content.courseContent.modules.length;
    for (const module of content.courseContent.modules) {
      count += module.lessons.length;
      if (module.assessment) count++;
    }
    if (content.courseContent.conclusion) count++;
  } else if (content.quizContent) {
    count++; // Instructions
    count += content.quizContent.categories.length;
    for (const category of content.quizContent.categories) {
      count += category.questions.length;
    }
  } else if (content.workflowContent) {
    count++; // Overview
    count += content.workflowContent.steps.length;
  }

  return count;
}

function getWordsBySection(content: GeneratedContent): Record<string, number> {
  const wordCounts: Record<string, number> = {};

  if (content.courseContent) {
    wordCounts.overview = countWords(
      content.courseContent.overview.description +
      content.courseContent.overview.introduction
    );
    wordCounts.modules = content.courseContent.modules.reduce(
      (sum, m) => sum + countWords(m.introduction + m.summary),
      0
    );
    wordCounts.lessons = content.courseContent.modules.reduce(
      (sum, m) => sum + m.lessons.reduce(
        (lessonSum, l) => lessonSum + countWords(l.content),
        0
      ),
      0
    );
    wordCounts.conclusion = countWords(content.courseContent.conclusion);
  }

  return wordCounts;
}

function countWords(text?: string): number {
  if (!text) return 0;
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

function determineRecommendedFormat(structureType: string): string {
  switch (structureType) {
    case 'course':
    case 'learning_path':
      return 'html'; // Interactive format for courses
    case 'quiz':
      return 'html'; // Interactive for quizzes
    case 'novel':
      return 'pdf'; // Reading format
    case 'workflow':
      return 'markdown'; // Technical documentation
    case 'knowledge_map':
      return 'html'; // Visual/interactive
    default:
      return 'markdown';
  }
}

function estimatePackagingTime(totalWords: number): number {
  // Rough estimate: 1 second per 1000 words for packaging
  return Math.ceil(totalWords / 1000) * 1000;
}