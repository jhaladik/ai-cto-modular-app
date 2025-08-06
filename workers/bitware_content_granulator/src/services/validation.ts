import { Env, ValidationLevel, ValidationResult, StructureType } from '../types';
import { OpenAIService } from './openai';
import { generateValidationPrompt } from '../helpers/prompts';

export class ValidationService {
  private openai: OpenAIService;
  
  constructor(env: Env) {
    this.openai = new OpenAIService(env);
  }

  async validate(
    structure: any,
    topic: string,
    structureType: StructureType,
    level: ValidationLevel,
    targetAudience: string
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    
    // Generate validation questions based on level
    const questions = generateValidationPrompt(
      structure,
      topic,
      structureType,
      level,
      targetAudience
    );
    
    // Get scores for each question
    const scores: number[] = [];
    for (const question of questions) {
      const score = await this.openai.validateStructure(question);
      scores.push(score);
    }
    
    // Calculate weighted average based on level
    const weightedAverage = this.calculateWeightedAverage(scores, level);
    
    // Determine if validation passed
    const threshold = this.getThresholdForStructureType(structureType);
    const passed = weightedAverage >= threshold;
    
    const validationTimeMs = Date.now() - startTime;
    
    return {
      accuracyPercentage: weightedAverage,
      levelUsed: level,
      threshold,
      passed,
      details: {
        questionScores: scores,
        weightedAverage,
        aiConfidence: this.calculateConfidence(scores)
      },
      retryCount: 0,
      validationTimeMs,
      aiFeedback: this.generateFeedback(scores, level, passed)
    };
  }

  private calculateWeightedAverage(scores: number[], level: ValidationLevel): number {
    if (scores.length === 0) return 0;
    
    if (level === 1) {
      // Single question, full weight
      return scores[0];
    } else if (level === 2) {
      // Two questions, equal weight
      return (scores[0] + scores[1]) / 2;
    } else {
      // Three questions with weights: 40%, 35%, 25%
      const weights = [0.4, 0.35, 0.25];
      return scores.reduce((acc, score, index) => acc + score * weights[index], 0);
    }
  }

  private getThresholdForStructureType(structureType: StructureType): number {
    const thresholds: Record<StructureType, number> = {
      course: 70,      // Lowered from 90
      quiz: 75,        // Lowered from 95
      novel: 65,       // Lowered from 80
      workflow: 70,    // Lowered from 85
      knowledge_map: 70,  // Lowered from 85
      learning_path: 72   // Lowered from 88
    };
    
    return thresholds[structureType] || 70;
  }

  private calculateConfidence(scores: number[]): number {
    if (scores.length === 0) return 0;
    
    // Calculate standard deviation
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower standard deviation = higher confidence
    // Normalize to 0-1 range
    const confidence = Math.max(0, 1 - (stdDev / 50));
    
    return Number(confidence.toFixed(2));
  }

  private generateFeedback(scores: number[], level: ValidationLevel, passed: boolean): string {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    if (passed) {
      if (avg >= 95) {
        return 'Excellent structure! All validation criteria exceeded expectations.';
      } else if (avg >= 90) {
        return 'Very good structure with minor areas for improvement.';
      } else {
        return 'Structure passed validation but has some areas that could be enhanced.';
      }
    } else {
      const weakAreas: string[] = [];
      
      if (level >= 1 && scores[0] < 80) {
        weakAreas.push('completeness and topic coverage');
      }
      if (level >= 2 && scores[1] < 80) {
        weakAreas.push('logical flow and progression');
      }
      if (level >= 3 && scores[2] < 80) {
        weakAreas.push('audience appropriateness and complexity');
      }
      
      return `Structure needs improvement in: ${weakAreas.join(', ')}. Consider adding more detail or reorganizing content.`;
    }
  }

  async retryWithEnhancements(
    structure: any,
    feedback: string,
    originalRequest: any
  ): Promise<any> {
    // This method would be called if validation fails and retry is requested
    // It would enhance the original prompt with the validation feedback
    // and attempt to generate a better structure
    
    const enhancedPrompt = `
      Previous attempt received feedback: ${feedback}
      
      Please regenerate the structure addressing these concerns.
      
      Original request: ${JSON.stringify(originalRequest)}
      Current structure: ${JSON.stringify(structure)}
    `;
    
    const response = await this.openai.generateStructure(enhancedPrompt);
    return JSON.parse(response.content);
  }
}