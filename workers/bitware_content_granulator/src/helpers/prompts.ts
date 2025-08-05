import { StructureType, GranularityLevel, ValidationLevel } from '../types';

export function generateGranulationPrompt(
  topic: string,
  structureType: StructureType,
  templatePrompt: string,
  granularityLevel: GranularityLevel,
  targetAudience: string,
  constraints?: any,
  options?: any
): string {
  const basePrompt = templatePrompt
    .replace('{topic}', topic)
    .replace('{audience}', targetAudience)
    .replace('{granularity}', granularityLevel.toString());

  let enhancedPrompt = basePrompt;

  // Add constraints
  if (constraints) {
    const constraintsList = Object.entries(constraints)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n');
    enhancedPrompt += `\n\nConstraints:\n${constraintsList}`;
  }

  // Add options
  if (options) {
    const optionsList = Object.entries(options)
      .filter(([_, value]) => value === true)
      .map(([key, _]) => `- ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`)
      .join('\n');
    if (optionsList) {
      enhancedPrompt += `\n\nAdditional Requirements:\n${optionsList}`;
    }
  }

  // Add output format instruction
  enhancedPrompt += `\n\nIMPORTANT: Return the structure as valid JSON that can be parsed. Include clear titles, descriptions, and logical organization. Ensure all elements follow a hierarchical structure where applicable.`;

  return enhancedPrompt;
}

export function generateValidationPrompt(
  structure: any,
  topic: string,
  structureType: StructureType,
  level: ValidationLevel,
  targetAudience: string
): string[] {
  const questions: string[] = [];

  if (level >= 1) {
    questions.push(
      `Analyze this ${structureType} structure for "${topic}" targeting ${targetAudience}. ` +
      `Does the structure comprehensively cover all essential aspects of the topic? ` +
      `Consider completeness, relevance, and appropriateness for the target audience. ` +
      `Rate from 0-100 where 100 means perfect coverage.\n\n` +
      `Structure: ${JSON.stringify(structure, null, 2)}`
    );
  }

  if (level >= 2) {
    questions.push(
      `Evaluate the logical flow and progression in this ${structureType} structure. ` +
      `Is there a clear, sensible progression from basic to advanced concepts? ` +
      `Are prerequisites properly ordered? Does each element build on previous ones? ` +
      `Rate from 0-100 where 100 means perfect logical flow.\n\n` +
      `Structure: ${JSON.stringify(structure, null, 2)}`
    );
  }

  if (level >= 3) {
    questions.push(
      `Assess whether the complexity and depth of this ${structureType} structure ` +
      `appropriately matches the "${targetAudience}" audience and stated learning objectives. ` +
      `Is it too simple or too complex? Are the elements at the right level of detail? ` +
      `Rate from 0-100 where 100 means perfect audience alignment.\n\n` +
      `Structure: ${JSON.stringify(structure, null, 2)}`
    );
  }

  return questions;
}

export function getStructurePromptTemplate(structureType: StructureType): string {
  const templates: Record<StructureType, string> = {
    course: `Create a comprehensive course structure for "{topic}" targeting {audience}. 
Generate a detailed curriculum with {granularity} levels of depth. 
Include modules, lessons, learning objectives, and assessments. 
Each module should have 2-5 lessons with clear learning outcomes.
Structure the content with logical progression from foundational to advanced concepts.`,

    quiz: `Design a quiz structure for assessing knowledge of "{topic}" for {audience}.
Create categories of questions with varying difficulty levels.
Include different question types (multiple choice, true/false, practical).
Ensure questions test understanding at {granularity} levels of depth.
Balance theoretical knowledge with practical application.`,

    novel: `Develop a novel outline for a story about "{topic}" aimed at {audience}.
Create a {granularity}-level detailed structure with acts, chapters, and scenes.
Include character arcs, plot points, themes, and narrative progression.
Ensure proper pacing and dramatic structure throughout.`,

    workflow: `Design a workflow structure for "{topic}" suitable for {audience}.
Create phases with detailed steps at {granularity} levels of detail.
Include dependencies, decision points, resources, and quality gates.
Ensure the workflow is practical and achievable.`,

    knowledge_map: `Create a knowledge map for "{topic}" targeting {audience}.
Structure concepts hierarchically with {granularity} levels of depth.
Show relationships, dependencies, and connections between concepts.
Organize from fundamental to advanced topics.`,

    learning_path: `Design a learning path for mastering "{topic}" for {audience}.
Create milestones with {granularity} levels of detail.
Include prerequisites, competencies, and progression markers.
Structure for optimal learning and skill development.`
  };

  return templates[structureType] || templates.course;
}