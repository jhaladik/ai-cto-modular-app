/**
 * Mentor Validator Service
 * Provides expert-level validation and correction for generated content
 * Each content type has its own specialized mentor with domain expertise
 */

import { Env } from '../types/env';

export interface MentorReport {
    score: number;  // 0-100
    issues: ValidationIssue[];
    suggestions: string[];
    corrections: Record<string, any>;
    mentorInsight: string;
    continuityCheck: ContinuityCheckResult;
}

export interface ValidationIssue {
    severity: 'critical' | 'major' | 'minor';
    category: string;
    description: string;
    location?: string;
    suggestedFix?: string;
}

export interface ContinuityCheckResult {
    charactersConsistent: boolean;
    locationsConsistent: boolean;
    timelineLogical: boolean;
    plotThreadsContinuous: boolean;
    details: string[];
}

export interface ProjectContext {
    projectId: number;
    contentType: string;
    previousStages: any[];
    characters: Map<string, CharacterProfile>;
    locations: Map<string, LocationDetails>;
    timeline: TimelineEvent[];
    plotThreads: Map<string, PlotThread>;
    styleGuide: StyleGuide;
    metadata: Record<string, any>;
}

export interface CharacterProfile {
    id: string;
    name: string;
    traits: string[];
    backstory: string;
    relationships: Record<string, string>;
    appearances: number[];  // Stage numbers where character appears
    voicePattern?: string;
    developmentArc?: string;
}

export interface LocationDetails {
    id: string;
    name: string;
    description: string;
    features: string[];
    connectedLocations: string[];
    appearances: number[];
}

export interface TimelineEvent {
    stageNumber: number;
    timestamp: string;
    description: string;
    participants: string[];
    location: string;
    impact: 'critical' | 'major' | 'minor';
}

export interface PlotThread {
    id: string;
    description: string;
    introduced: number;  // Stage number
    resolved?: number;
    relatedCharacters: string[];
    status: 'open' | 'developing' | 'resolved';
}

export interface StyleGuide {
    tone: string;
    pov: string;
    tense: string;
    vocabularyLevel: string;
    pacingPreference: string;
    examples: string[];
}

export class MentorValidator {
    constructor(
        private env: Env,
        private contentType: string
    ) {}

    /**
     * Validate content with mentor expertise
     */
    async validate(
        content: any,
        stageNumber: number,
        context: ProjectContext
    ): Promise<MentorReport> {
        const report: MentorReport = {
            score: 100,
            issues: [],
            suggestions: [],
            corrections: {},
            mentorInsight: '',
            continuityCheck: {
                charactersConsistent: true,
                locationsConsistent: true,
                timelineLogical: true,
                plotThreadsContinuous: true,
                details: []
            }
        };

        // Run content-type specific validations
        switch (this.contentType) {
            case 'novel':
                await this.validateNovel(content, stageNumber, context, report);
                break;
            case 'course':
                await this.validateCourse(content, stageNumber, context, report);
                break;
            default:
                await this.validateGeneric(content, stageNumber, context, report);
        }

        // Get mentor's overall insight
        report.mentorInsight = await this.getMentorInsight(content, stageNumber, context);

        return report;
    }

    /**
     * Novel-specific validation with novelist mentor
     */
    private async validateNovel(
        content: any,
        stageNumber: number,
        context: ProjectContext,
        report: MentorReport
    ): Promise<void> {
        // Different validations for different stages
        switch (stageNumber) {
            case 1: // Big Picture
                await this.validateNovelBigPicture(content, context, report);
                break;
            case 2: // Objects & Relations
                await this.validateNovelCharacters(content, context, report);
                await this.validateNovelLocations(content, context, report);
                break;
            case 3: // Structure
                await this.validateNovelStructure(content, context, report);
                break;
            case 4: // Scenes
                await this.validateNovelScenes(content, context, report);
                break;
        }

        // Always check continuity for novels
        if (stageNumber > 1) {
            report.continuityCheck = await this.checkNovelContinuity(content, context);
        }
    }

    /**
     * Validate novel's big picture
     */
    private async validateNovelBigPicture(
        content: any,
        context: ProjectContext,
        report: MentorReport
    ): Promise<void> {
        const prompt = `
You are a bestselling novelist and story editor. Review this novel concept:

Core Concept: ${JSON.stringify(content.CORE_CONCEPT || content.core_concept || {})}
Themes: ${JSON.stringify(content.THEMATIC_FRAMEWORK || content.themes || {})}
Narrative Arc: ${JSON.stringify(content.NARRATIVE_ARC || content.narrative_arc || {})}

Evaluate as an expert:
1. Is the premise compelling and original?
2. Are themes well-integrated with the plot?
3. Does the narrative arc follow proven story structures?
4. What are the potential weaknesses?
5. What would make this story stronger?

Respond in JSON format:
{
    "score": 0-100,
    "issues": ["issue1", "issue2"],
    "suggestions": ["suggestion1", "suggestion2"],
    "strengths": ["strength1", "strength2"]
}`;

        try {
            const response = await this.callCloudflareAI(prompt);
            const evaluation = this.safeJsonParse(response, { score: 85, issues: [], suggestions: [] });
            
            // Update report based on AI evaluation
            if (evaluation.score < 80) {
                report.score = evaluation.score;
                evaluation.issues.forEach((issue: string) => {
                    report.issues.push({
                        severity: evaluation.score < 60 ? 'major' : 'minor',
                        category: 'concept',
                        description: issue
                    });
                });
            }
            
            report.suggestions.push(...evaluation.suggestions);
        } catch (error) {
            console.error('Failed to validate big picture:', error);
        }
    }

    /**
     * Validate character consistency and development
     */
    private async validateNovelCharacters(
        content: any,
        context: ProjectContext,
        report: MentorReport
    ): Promise<void> {
        const characters = content.objects?.filter((o: any) => o.type === 'character') || [];
        
        for (const character of characters) {
            // Check if character was previously defined
            const existing = context.characters.get(character.code);
            if (existing) {
                // Validate consistency
                const prompt = `
Compare these two character descriptions for consistency:

Previous: ${JSON.stringify(existing)}
Current: ${JSON.stringify(character)}

Are there any contradictions or inconsistencies? List them.
Respond in JSON: {"consistent": boolean, "issues": []}`;

                const check = await this.callCloudflareAI(prompt);
                const result = this.safeJsonParse(check, { consistent: true, issues: [] });
                
                if (!result.consistent) {
                    report.issues.push({
                        severity: 'major',
                        category: 'character_consistency',
                        description: `Character ${character.name} has inconsistencies`,
                        location: `character.${character.code}`,
                        suggestedFix: result.issues.join('; ')
                    });
                    report.score -= 15;
                }
            }
            
            // Validate character depth
            if (!character.backstory || character.backstory.length < 50) {
                report.issues.push({
                    severity: 'minor',
                    category: 'character_depth',
                    description: `Character ${character.name} lacks sufficient backstory`,
                    suggestedFix: 'Add more detailed backstory and motivation'
                });
                report.score -= 5;
            }
        }
    }

    /**
     * Validate location consistency
     */
    private async validateNovelLocations(
        content: any,
        context: ProjectContext,
        report: MentorReport
    ): Promise<void> {
        const locations = content.objects?.filter((o: any) => o.type === 'location') || [];
        
        for (const location of locations) {
            const existing = context.locations.get(location.code);
            if (existing) {
                // Check for contradictions
                if (existing.description && location.description) {
                    const prompt = `
Do these location descriptions contradict each other?

Previous: "${existing.description}"
Current: "${location.description}"

Respond in JSON: {"contradicts": boolean, "details": "explanation"}`;

                    const check = await this.callCloudflareAI(prompt);
                    const result = this.safeJsonParse(check, { consistent: true, issues: [] });
                    
                    if (result.contradicts) {
                        report.issues.push({
                            severity: 'major',
                            category: 'location_consistency',
                            description: `Location ${location.name} description contradicts previous`,
                            location: `location.${location.code}`,
                            suggestedFix: result.details
                        });
                        report.score -= 10;
                    }
                }
            }
        }
    }

    /**
     * Validate novel structure and pacing
     */
    private async validateNovelStructure(
        content: any,
        context: ProjectContext,
        report: MentorReport
    ): Promise<void> {
        const structure = content.structure || [];
        
        // Check three-act structure
        if (structure.length < 3) {
            report.issues.push({
                severity: 'major',
                category: 'structure',
                description: 'Novel should have at least 3 acts',
                suggestedFix: 'Consider expanding to a three-act structure'
            });
            report.score -= 20;
        }
        
        // Validate pacing
        // Handle structure as either array or object
        let structureArray = structure;
        if (!Array.isArray(structure)) {
            // Try to extract array from object properties
            structureArray = structure.acts || structure.chapters || structure.structure || [];
            if (!Array.isArray(structureArray)) {
                // If still not array, convert object to array
                structureArray = Object.values(structure).filter(v => typeof v === 'object');
            }
        }
        
        // Create a simplified structure summary to avoid timeout
        const structureSummary = {
            actCount: structureArray.length,
            totalChapters: structureArray.reduce((sum: number, act: any) => 
                sum + (act.children?.length || act.chapters?.length || 0), 0),
            act1Chapters: structureArray[0] ? (structureArray[0].children?.length || structureArray[0].chapters?.length || 0) : 0,
            act2Chapters: structureArray[1] ? (structureArray[1].children?.length || structureArray[1].chapters?.length || 0) : 0,
            act3Chapters: structureArray[2] ? (structureArray[2].children?.length || structureArray[2].chapters?.length || 0) : 0,
            hasRisingAction: structureArray[0]?.description?.toLowerCase().includes('introduc') || 
                           structureArray[0]?.summary?.toLowerCase().includes('introduc') || false,
            hasClimax: structureArray[structureArray.length - 1]?.description?.toLowerCase().includes('climax') || 
                      structureArray[structureArray.length - 1]?.summary?.toLowerCase().includes('resolution') || false
        };
        
        // Much smaller, focused prompt
        const prompt = `
Evaluate this novel structure:
- Acts: ${structureSummary.actCount}
- Total Chapters: ${structureSummary.totalChapters}
- Distribution: Act1(${structureSummary.act1Chapters}), Act2(${structureSummary.act2Chapters}), Act3(${structureSummary.act3Chapters})
- Has Rising Action: ${structureSummary.hasRisingAction}
- Has Climax/Resolution: ${structureSummary.hasClimax}

Score the pacing (0-100) and list any issues.
Respond in JSON: {"pacingScore": 0-100, "issues": [], "suggestions": []}`;

        console.log('[Mentor] Simplified structure validation prompt length:', prompt.length);
        
        let pacing: any = { pacingScore: 75, issues: [], suggestions: [] };
        try {
            const pacingCheck = await this.callCloudflareAI(prompt);
            pacing = this.safeJsonParse(pacingCheck, { pacingScore: 75, issues: [], suggestions: [] });
        } catch (error) {
            console.error('[Mentor] Structure validation failed, using defaults:', error);
            // pacing already set to defaults
        }
        
        if (pacing.pacingScore < 70) {
            report.issues.push({
                severity: 'major',
                category: 'pacing',
                description: 'Story pacing needs improvement',
                suggestedFix: pacing.suggestions.join('; ')
            });
            report.score = Math.min(report.score, pacing.pacingScore);
        }
    }

    /**
     * Validate individual scenes
     */
    private async validateNovelScenes(
        content: any,
        context: ProjectContext,
        report: MentorReport
    ): Promise<void> {
        const scenes = content.granular_units || content.scenes || [];
        
        for (const scene of scenes) {
            // Check scene has conflict
            if (!scene.conflict && !scene.tension) {
                report.issues.push({
                    severity: 'minor',
                    category: 'scene_structure',
                    description: `Scene ${scene.title} lacks clear conflict`,
                    location: `scene.${scene.code}`,
                    suggestedFix: 'Every scene should have conflict or tension to drive the narrative'
                });
                report.score -= 3;
            }
            
            // Check scene connects to plot
            const prompt = `
Does this scene advance the plot?
Scene: ${scene.title} - ${scene.description}
Main plot threads: ${Array.from(context.plotThreads.values()).map(p => p.description).join(', ')}

Respond in JSON: {"advancesPlot": boolean, "relevance": "high|medium|low", "suggestion": ""}`;

            const relevanceCheck = await this.callCloudflareAI(prompt);
            const relevance = this.safeJsonParse(relevanceCheck, { aligned: true, issues: [] });
            
            if (relevance.relevance === 'low') {
                report.issues.push({
                    severity: 'minor',
                    category: 'plot_relevance',
                    description: `Scene ${scene.title} doesn't clearly advance the plot`,
                    suggestedFix: relevance.suggestion
                });
                report.score -= 5;
            }
        }
    }

    /**
     * Check continuity across the novel
     */
    private async checkNovelContinuity(
        content: any,
        context: ProjectContext
    ): Promise<ContinuityCheckResult> {
        const result: ContinuityCheckResult = {
            charactersConsistent: true,
            locationsConsistent: true,
            timelineLogical: true,
            plotThreadsContinuous: true,
            details: []
        };

        // Build a comprehensive continuity prompt
        const prompt = `
Check continuity for this novel content:

New Content: ${JSON.stringify(content).substring(0, 2000)}

Context:
- Characters established: ${Array.from(context.characters.keys()).join(', ')}
- Locations established: ${Array.from(context.locations.keys()).join(', ')}
- Timeline so far: ${context.timeline.map(e => e.description).join(' -> ')}
- Open plot threads: ${Array.from(context.plotThreads.values()).filter(p => p.status === 'open').map(p => p.description).join(', ')}

Check for:
1. Character behavior consistency
2. Location description consistency
3. Timeline logic (no time paradoxes)
4. Plot thread continuity

Respond in JSON format with any issues found.`;

        try {
            const continuityCheck = await this.callCloudflareAI(prompt);
            const issues = this.safeJsonParse(continuityCheck, { characterIssues: [], locationIssues: [], timelineIssues: [], plotIssues: [] });
            
            if (issues.characterIssues?.length > 0) {
                result.charactersConsistent = false;
                result.details.push(...issues.characterIssues);
            }
            
            if (issues.locationIssues?.length > 0) {
                result.locationsConsistent = false;
                result.details.push(...issues.locationIssues);
            }
            
            if (issues.timelineIssues?.length > 0) {
                result.timelineLogical = false;
                result.details.push(...issues.timelineIssues);
            }
            
            if (issues.plotIssues?.length > 0) {
                result.plotThreadsContinuous = false;
                result.details.push(...issues.plotIssues);
            }
        } catch (error) {
            console.error('Continuity check failed:', error);
        }

        return result;
    }

    /**
     * Course-specific validation
     */
    private async validateCourse(
        content: any,
        stageNumber: number,
        context: ProjectContext,
        report: MentorReport
    ): Promise<void> {
        // Course validation logic here
        // Similar structure to novel but with educational focus
    }

    /**
     * Generic validation for any content type
     */
    private async validateGeneric(
        content: any,
        stageNumber: number,
        context: ProjectContext,
        report: MentorReport
    ): Promise<void> {
        // Basic structural validation
        if (!content || Object.keys(content).length === 0) {
            report.issues.push({
                severity: 'critical',
                category: 'structure',
                description: 'Content is empty or malformed'
            });
            report.score = 0;
        }
    }

    /**
     * Get high-level mentor insight
     */
    private async getMentorInsight(
        content: any,
        stageNumber: number,
        context: ProjectContext
    ): Promise<string> {
        const mentorRole = this.getMentorRole();
        
        const prompt = `
You are ${mentorRole}.

Review this ${this.contentType} content for stage ${stageNumber}:
${JSON.stringify(content).substring(0, 3000)}

Provide a brief expert assessment (2-3 sentences) focusing on:
1. The strongest aspect
2. The most critical improvement needed
3. Overall potential

Be constructive but honest.`;

        return await this.callCloudflareAI(prompt);
    }

    /**
     * Get mentor role description
     */
    private getMentorRole(): string {
        switch (this.contentType) {
            case 'novel':
                return 'a bestselling novelist with 20 years of experience in genre fiction, known for compelling characters and tight plotting';
            case 'course':
                return 'a certified instructional designer with expertise in adult learning principles and curriculum development';
            case 'documentary':
                return 'an award-winning documentary director with expertise in narrative non-fiction';
            case 'podcast':
                return 'a successful podcast producer with expertise in audio storytelling and audience engagement';
            default:
                return 'an experienced content creator and editor';
        }
    }

    /**
     * Call Cloudflare AI
     */
    private async callCloudflareAI(prompt: string): Promise<string> {
        try {
            // @ts-ignore - Cloudflare AI binding
            const response = await this.env.AI.run('@cf/meta/llama-2-7b-chat-fp16', {
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert validator. Always respond in valid JSON format when requested.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 1000
            });

            return response.response || JSON.stringify(response);
        } catch (error) {
            console.error('Cloudflare AI call failed:', error);
            // Fallback to a simple response
            return JSON.stringify({ error: 'AI validation unavailable' });
        }
    }
    
    /**
     * Safe JSON parse with fallback
     */
    private safeJsonParse(text: string, fallback: any = {}): any {
        try {
            // Try to parse as JSON
            return JSON.parse(text);
        } catch (e) {
            // Try to extract JSON from text if it's embedded
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    return JSON.parse(jsonMatch[0]);
                } catch (e2) {
                    console.warn('Could not extract JSON from text:', text.substring(0, 100));
                }
            }
            
            // Return fallback for non-JSON responses
            return fallback;
        }
    }

    /**
     * Build correction prompt based on issues found
     */
    async buildCorrectionPrompt(
        original: any,
        issues: ValidationIssue[],
        context: ProjectContext
    ): Promise<string> {
        const criticalIssues = issues.filter(i => i.severity === 'critical');
        const majorIssues = issues.filter(i => i.severity === 'major');
        
        return `
The generated content has validation issues that need correction:

CRITICAL ISSUES (must fix):
${criticalIssues.map(i => `- ${i.description}: ${i.suggestedFix || 'Please correct'}`).join('\n')}

MAJOR ISSUES (should fix):
${majorIssues.map(i => `- ${i.description}: ${i.suggestedFix || 'Please improve'}`).join('\n')}

CONTEXT TO MAINTAIN:
- Characters: ${Array.from(context.characters.values()).map(c => `${c.name} (${c.traits.join(', ')})`).join(', ')}
- Locations: ${Array.from(context.locations.values()).map(l => l.name).join(', ')}
- Timeline: Maintain chronological consistency
- Style: ${context.styleGuide.tone} tone, ${context.styleGuide.pov} POV

Please regenerate the content with these corrections while maintaining everything that was good in the original.

Original content for reference:
${JSON.stringify(original)}`;
    }
}