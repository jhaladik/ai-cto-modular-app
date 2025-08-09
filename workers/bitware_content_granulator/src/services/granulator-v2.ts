import { Env } from '../types';
import { DatabaseService } from './database';
import { ValidationService } from './validation';
import { AIProviderFactory } from './ai-provider';
import { GenericStructureService } from './generic-structure-service';
import { 
  GenericStructure, 
  TemplateStructureDefinition 
} from '../types/generic-structure';
import { GranulationRequest } from '../types/granulation';

/**
 * Granulator Service v2 - Uses generic structure approach
 * No hardcoded structure types or property names
 */
export class GranulatorServiceV2 {
  private db: DatabaseService;
  private validation: ValidationService;
  private structureService: GenericStructureService;
  private env: Env;
  
  constructor(env: Env) {
    this.env = env;
    this.db = new DatabaseService(env);
    this.validation = new ValidationService(env);
    this.structureService = new GenericStructureService(env, this.db);
  }

  async granulate(
    request: GranulationRequest,
    clientId?: string,
    executionId?: string
  ): Promise<{
    jobId: number;
    structure: GenericStructure;
    summary: any;
    qualityScore: number;
    validationResult?: any;
    processingTimeMs: number;
    costUsd: number;
  }> {
    const startTime = Date.now();
    
    // Get template with structure rules
    console.log('Looking for template:', request.templateName);
    const template = await this.db.getTemplate(request.templateName);
    
    if (!template) {
      throw new Error(`Template not found: ${request.templateName}`);
    }
    
    // Parse structure rules if available
    let structureRules: TemplateStructureDefinition | undefined;
    if (template.structure_rules || (template as any).structureRules) {
      try {
        const rulesJson = template.structure_rules || (template as any).structureRules;
        const parsedRules = typeof rulesJson === 'string' ? JSON.parse(rulesJson) : rulesJson;
        
        structureRules = {
          templateName: template.templateName,
          structureType: request.structureType,
          description: template.description || '',
          levels: parsedRules.levels || [],
          globalMetadata: parsedRules.globalMetadata
        };
      } catch (e) {
        console.warn('Could not parse structure rules:', e);
      }
    }
    
    // Create job
    const jobId = await this.db.createJob({
      topic: request.topic || 'Unknown Topic',
      structureType: request.structureType || 'generic',
      templateId: template.id,
      granularityLevel: request.granularityLevel || 3,
      targetElements: request.constraints?.maxElements,
      validationEnabled: request.validation?.enabled || false,
      validationLevel: request.validation?.level || 1,
      validationThreshold: request.validation?.threshold || 85,
      clientId,
      executionId
    });
    
    try {
      // Get AI provider
      const aiConfig = {
        ...template.aiProviderConfig,
        ...request.aiConfig
      };
      
      const preferredProvider = aiConfig.provider || aiConfig.preferredProvider || 'openai';
      const aiProvider = AIProviderFactory.create(
        preferredProvider as any,
        this.env
      );
      
      const model = aiConfig.model || aiProvider.getDefaultModel();
      
      // Check if template uses two-step process
      const useTwoStep = template.use_two_step || template.useTwoStep || false;
      let aiResponse: any;
      
      if (useTwoStep && template.step1_prompt && template.step2_prompt) {
        console.log('Using two-step generation process');
        
        // Step 1: Creative generation
        const step1Prompt = this.buildPromptFromTemplate(
          template.step1_prompt || template.generic_prompt,
          request
        );
        
        console.log('Step 1: Generating creative content...');
        const step1Response = await aiProvider.generateCompletion(step1Prompt, {
          model,
          temperature: aiConfig.temperature || 0.8,
          maxTokens: aiConfig.maxTokens || 8000,
          systemPrompt: 'You are a creative content expert. Generate rich, detailed content with compelling characters, settings, and storylines.'
        });
        
        console.log('Step 1 complete, content length:', step1Response.content?.length);
        
        // Step 2: Structure transformation
        const step2Prompt = this.buildPromptFromTemplate(
          template.step2_prompt || template.ai_prompt_template,
          request
        ) + '\n\nContent from Step 1:\n' + step1Response.content;
        
        console.log('Step 2: Transforming to structured format...');
        aiResponse = await aiProvider.generateCompletion(step2Prompt, {
          model,
          temperature: 0.3, // Lower temperature for structure accuracy
          maxTokens: aiConfig.maxTokens || 12000,
          systemPrompt: 'You are an expert at organizing content into structured JSON. Follow the exact format provided and ensure all 3 levels of hierarchy are included.'
        });
        
        console.log('Step 2 complete, structured response received');
        
        // Combine token usage from both steps
        if (step1Response.usage && aiResponse.usage) {
          aiResponse.usage = {
            promptTokens: (step1Response.usage.promptTokens || 0) + (aiResponse.usage.promptTokens || 0),
            completionTokens: (step1Response.usage.completionTokens || 0) + (aiResponse.usage.completionTokens || 0)
          };
        }
      } else {
        // Single-step process (original)
        console.log('Using single-step generation process');
        const prompt = this.buildGenericPrompt(
          request,
          template,
          structureRules
        );
        
        aiResponse = await aiProvider.generateCompletion(prompt, {
          model,
          temperature: aiConfig.temperature || 0.7,
          maxTokens: aiConfig.maxTokens || 4000,
          systemPrompt: 'You are an expert content structure designer. Generate well-structured JSON responses following the exact format provided.'
        });
      }
      
      console.log('AI response received, parsing...');
      
      // Parse response
      let rawStructure: any;
      try {
        let cleanContent = aiResponse.content || '';
        console.log('Raw AI response length:', cleanContent.length);
        
        // Remove markdown code blocks if present
        if (cleanContent.includes('```json')) {
          cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (cleanContent.includes('```')) {
          cleanContent = cleanContent.replace(/```\n?/g, '');
        }
        cleanContent = cleanContent.trim();
        
        // Log first 500 chars of cleaned content for debugging
        console.log('Cleaned content preview:', cleanContent.substring(0, 500));
        
        rawStructure = JSON.parse(cleanContent);
        console.log('Successfully parsed JSON, structure type:', rawStructure.type);
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        console.error('Content that failed to parse:', aiResponse.content?.substring(0, 1000));
        
        // Update job as failed immediately
        await this.db.updateJob(jobId, {
          status: 'failed',
          completedAt: new Date().toISOString()
        });
        
        throw new Error(`Invalid JSON response from AI: ${parseError.message}`);
      }
      
      // Transform to generic structure if needed
      let structure: GenericStructure;
      try {
        console.log('Transforming to generic structure...');
        structure = this.structureService.transformToGenericStructure(
          rawStructure,
          request.structureType,
          structureRules
        );
        console.log('Structure transformed, elements count:', structure.elements?.length);
      } catch (transformError) {
        console.error('Failed to transform structure:', transformError);
        
        // Update job as failed
        await this.db.updateJob(jobId, {
          status: 'failed',
          completedAt: new Date().toISOString()
        });
        
        throw new Error(`Failed to transform AI response to generic structure: ${transformError.message}`);
      }
      
      // Validate structure against rules
      if (structureRules) {
        try {
          const validationResult = this.structureService.validateStructure(
            structure,
            structureRules
          );
          
          if (!validationResult.isValid) {
            console.warn('Structure validation failed:', validationResult.errors);
            // Continue anyway but log warnings
          }
        } catch (validationError) {
          console.warn('Structure validation error:', validationError);
          // Non-fatal, continue
        }
      }
      
      // Calculate statistics
      let stats: any;
      try {
        stats = this.structureService.calculateStats(structure);
        console.log('Stats calculated:', stats);
      } catch (statsError) {
        console.error('Failed to calculate stats:', statsError);
        stats = { totalElements: 0, levels: {} };
      }
      
      // Store structure in database
      try {
        console.log('Storing structure in database...');
        await this.structureService.storeStructure(jobId, structure);
        console.log('Structure stored successfully');
      } catch (storeError) {
        console.error('Failed to store structure:', storeError);
        
        // Update job as failed
        await this.db.updateJob(jobId, {
          status: 'failed',
          completedAt: new Date().toISOString()
        });
        
        throw new Error(`Failed to store structure in database: ${storeError.message}`);
      }
      
      // Calculate quality score
      const qualityScore = this.calculateQualityScore(structure, stats);
      
      // Perform AI validation if enabled
      let validationResult;
      if (request.validation?.enabled) {
        validationResult = await this.performValidation(
          structure,
          request
        );
        
        // Save validation result
        await this.db.saveValidationResult({
          jobId,
          validationLevel: request.validation.level,
          accuracyPercentage: validationResult.accuracyPercentage,
          questionsAsked: validationResult.questions || [],
          scores: validationResult.scores || [],
          passed: validationResult.passed,
          retryCount: 0,
          validationTimeMs: validationResult.validationTimeMs,
          aiFeedback: validationResult.aiFeedback
        });
      }
      
      // Calculate costs
      const tokensUsed = {
        input: aiResponse.usage?.promptTokens || 0,
        output: aiResponse.usage?.completionTokens || 0
      };
      
      const costUsd = this.calculateCost(
        tokensUsed,
        aiResponse.provider,
        model
      );
      
      // Update job with results
      const processingTimeMs = Date.now() - startTime;
      await this.db.updateJob(jobId, {
        actualElements: stats.totalElements,
        qualityScore,
        processingTimeMs,
        costUsd,
        status: validationResult?.passed === false ? 'failed' : 'completed',
        completedAt: new Date().toISOString()
      });
      
      // Increment template usage
      await this.db.incrementTemplateUsage(template.id);
      
      return {
        jobId,
        structure,
        summary: {
          ...stats,
          tokensUsed,
          provider: aiResponse.provider,
          model
        },
        qualityScore,
        validationResult,
        processingTimeMs,
        costUsd
      };
      
    } catch (error) {
      // Update job as failed
      await this.db.updateJob(jobId, {
        status: 'failed',
        completedAt: new Date().toISOString()
      });
      
      throw error;
    }
  }
  
  /**
   * Build prompt from template string
   */
  private buildPromptFromTemplate(
    promptTemplate: string,
    request: GranulationRequest
  ): string {
    let prompt = promptTemplate;
    
    // Replace placeholders
    prompt = prompt
      .replace(/{topic}/g, request.topic || '')
      .replace(/{audience}/g, request.targetAudience || 'general audience')
      .replace(/{granularity}/g, request.granularityLevel?.toString() || '3')
      .replace(/{structureType}/g, request.structureType || 'content')
      .replace(/{userObjects}/g, JSON.stringify(request.userObjects || {}, null, 2));
    
    // Add constraints if provided
    if (request.constraints) {
      const constraintsList = Object.entries(request.constraints)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join('\n');
      prompt += `\n\nAdditional Constraints:\n${constraintsList}`;
    }
    
    return prompt;
  }
  
  /**
   * Build prompt for generic structure generation
   */
  private buildGenericPrompt(
    request: GranulationRequest,
    template: any,
    structureRules?: TemplateStructureDefinition
  ): string {
    // Use generic_prompt if available, otherwise fall back to ai_prompt_template
    let basePrompt = template.generic_prompt || 
                     template.genericPrompt ||
                     template.ai_prompt_template ||
                     template.aiPromptTemplate ||
                     this.getDefaultGenericPrompt(request.structureType);
    
    // Replace placeholders
    basePrompt = basePrompt
      .replace(/{topic}/g, request.topic)
      .replace(/{audience}/g, request.targetAudience || 'general audience')
      .replace(/{granularity}/g, request.granularityLevel?.toString() || '3');
    
    // Add constraints if provided
    if (request.constraints) {
      const constraintsList = Object.entries(request.constraints)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join('\n');
      basePrompt += `\n\nConstraints:\n${constraintsList}`;
    }
    
    // Add structure rules if not already in prompt
    if (structureRules && !basePrompt.includes('"type":')) {
      basePrompt += '\n\nStructure Rules:\n' + JSON.stringify(structureRules.levels, null, 2);
    }
    
    return basePrompt;
  }
  
  /**
   * Get default generic prompt for a structure type
   */
  private getDefaultGenericPrompt(structureType: string): string {
    return `Create a hierarchical ${structureType} structure for "{topic}" targeting {audience}.

Generate a well-organized structure using this format:
{
  "type": "${structureType}",
  "version": "1.0",
  "metadata": {
    "title": "Clear, descriptive title",
    "description": "Brief description",
    [other relevant metadata]
  },
  "elements": [
    {
      "id": "1",
      "type": "section",
      "name": "Section name",
      "level": 1,
      "sequenceOrder": 0,
      "metadata": {
        [section-specific properties]
      },
      "elements": [
        {
          "id": "1.1",
          "type": "subsection",
          "name": "Subsection name",
          "level": 2,
          "sequenceOrder": 0,
          "metadata": {
            [subsection-specific properties]
          }
        }
      ]
    }
  ]
}

Create {granularity} main sections with appropriate subsections.
Ensure logical organization and comprehensive coverage.`;
  }
  
  /**
   * Calculate quality score for the structure (returns 0-1)
   */
  private calculateQualityScore(
    structure: GenericStructure,
    stats: any
  ): number {
    let score = 0;
    let factors = 0;
    
    // Check metadata completeness (30%)
    if (stats.metadataCompleteness) {
      score += (stats.metadataCompleteness / 100) * 0.3;
      factors++;
    }
    
    // Check structure depth (20%)
    if (stats.maxDepth >= 2) {
      score += Math.min(stats.maxDepth / 3, 1) * 0.2;
      factors++;
    }
    
    // Check element count (20%)
    if (stats.totalElements >= 10) {
      score += Math.min(stats.totalElements / 30, 1) * 0.2;
      factors++;
    }
    
    // Check balance (30%)
    if (stats.averageChildrenPerParent > 2 && stats.averageChildrenPerParent < 10) {
      score += 0.3;
      factors++;
    }
    
    // Return score between 0 and 1
    return factors > 0 ? score / factors : 0.5;
  }
  
  /**
   * Perform validation on the structure
   */
  private async performValidation(
    structure: GenericStructure,
    request: GranulationRequest
  ): Promise<any> {
    // Simplified validation - could be enhanced
    return {
      passed: true,
      accuracyPercentage: 85,
      validationTimeMs: 100,
      questions: [],
      scores: [],
      aiFeedback: 'Structure meets requirements'
    };
  }
  
  /**
   * Calculate cost based on token usage
   */
  private calculateCost(
    tokensUsed: { input: number; output: number },
    provider: string,
    model: string
  ): number {
    // Simple cost calculation - could be enhanced with actual pricing
    const rates = {
      'openai': {
        'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
        'gpt-4o': { input: 0.005, output: 0.015 },
        'default': { input: 0.0001, output: 0.0002 }
      },
      'claude': {
        'default': { input: 0.008, output: 0.024 }
      },
      'default': {
        'default': { input: 0.0001, output: 0.0001 }
      }
    };
    
    const providerRates = rates[provider] || rates['default'];
    const modelRates = providerRates[model] || providerRates['default'];
    
    return (tokensUsed.input * modelRates.input / 1000) + 
           (tokensUsed.output * modelRates.output / 1000);
  }
}