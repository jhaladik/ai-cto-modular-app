/**
 * Context Manager Service
 * Manages project context across all stages for continuity and consistency
 */

import { D1Database } from '@cloudflare/workers-types';
import { KVNamespace } from '@cloudflare/workers-types';
import { Env } from '../types/env';
import { 
    ProjectContext, 
    CharacterProfile, 
    LocationDetails, 
    TimelineEvent, 
    PlotThread,
    StyleGuide 
} from './mentor-validator';

export class ContextManager {
    constructor(
        private db: D1Database,
        private kv: KVNamespace,
        private env: Env
    ) {}

    /**
     * Load complete project context
     */
    async loadProjectContext(projectId: number): Promise<ProjectContext> {
        // Try to load from KV cache first
        const cacheKey = `context:${projectId}`;
        const cached = await this.kv.get(cacheKey, 'json');
        
        if (cached && this.isCacheValid(cached)) {
            return this.deserializeContext(cached);
        }

        // Load from database
        const context = await this.buildContextFromDatabase(projectId);
        
        // Cache for 1 hour - serialize Maps to arrays for JSON storage
        const cacheableContext = {
            ...context,
            characters: Array.from(context.characters.entries()),
            locations: Array.from(context.locations.entries()),
            plotThreads: Array.from(context.plotThreads.entries())
        };
        
        await this.kv.put(cacheKey, JSON.stringify(cacheableContext), {
            expirationTtl: 3600
        });

        return context;
    }

    /**
     * Build context from database
     */
    private async buildContextFromDatabase(projectId: number): Promise<ProjectContext> {
        // Load project metadata
        const project = await this.db.prepare(`
            SELECT * FROM content_generation_projects WHERE id = ?
        `).bind(projectId).first();

        if (!project) {
            throw new Error(`Project ${projectId} not found`);
        }

        // Load all stages
        const stages = await this.db.prepare(`
            SELECT * FROM content_generation_stages 
            WHERE project_id = ? 
            ORDER BY stage_number
        `).bind(projectId).all();

        // Initialize context
        const context: ProjectContext = {
            projectId,
            contentType: project.content_type as string,
            previousStages: [],
            characters: new Map(),
            locations: new Map(),
            timeline: [],
            plotThreads: new Map(),
            styleGuide: {
                tone: project.metadata?.tone || 'neutral',
                pov: project.metadata?.pov || 'third-person',
                tense: project.metadata?.tense || 'past',
                vocabularyLevel: project.metadata?.vocabularyLevel || 'standard',
                pacingPreference: project.metadata?.pacing || 'moderate',
                examples: []
            },
            metadata: project.metadata as any || {}
        };

        // Process each stage to extract context
        const stageResults = stages.results || [];
        for (const stage of stageResults) {
            if (stage.output_data || stage.output) {
                try {
                    const outputField = stage.output_data || stage.output;
                    const stageData = typeof outputField === 'string' 
                        ? JSON.parse(outputField) 
                        : outputField;
                    
                    await this.extractContextFromStage(
                        stageData, 
                        stage.stage_number as number, 
                        context
                    );
                    context.previousStages.push(stageData);
                } catch (e) {
                    console.error(`Failed to parse stage ${stage.stage_number} output:`, e);
                }
            }
        }

        // Load additional context from dedicated tables
        await this.loadContextElements(projectId, context);

        return context;
    }

    /**
     * Extract context elements from a stage
     */
    private async extractContextFromStage(
        stageData: any,
        stageNumber: number,
        context: ProjectContext
    ): Promise<void> {
        // Use AI to intelligently extract context
        const prompt = `
Extract context elements from this ${context.contentType} stage ${stageNumber} data.

Data: ${JSON.stringify(stageData).substring(0, 3000)}

Extract and return in JSON format:
{
    "characters": [
        {
            "id": "unique_id",
            "name": "character name",
            "traits": ["trait1", "trait2"],
            "backstory": "brief backstory",
            "relationships": {"other_character_id": "relationship_type"}
        }
    ],
    "locations": [
        {
            "id": "unique_id",
            "name": "location name",
            "description": "physical description",
            "features": ["feature1", "feature2"],
            "connectedLocations": ["location_id1"]
        }
    ],
    "events": [
        {
            "timestamp": "when it happens",
            "description": "what happens",
            "participants": ["character_id1"],
            "location": "location_id",
            "impact": "critical|major|minor"
        }
    ],
    "plotThreads": [
        {
            "id": "unique_id",
            "description": "what the thread is about",
            "status": "open|developing|resolved",
            "relatedCharacters": ["character_id1"]
        }
    ],
    "styleExamples": ["example prose that shows the writing style"]
}

Focus on extracting concrete, trackable elements.`;

        try {
            // @ts-ignore - Cloudflare AI binding
            const extraction = await this.env.AI.run('@cf/meta/llama-2-7b-chat-fp16', {
                messages: [
                    {
                        role: 'system',
                        content: 'You are a context extraction specialist. Extract only factual, concrete elements.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 2000
            });

            const extracted = JSON.parse(extraction.response || '{}');
            
            // Merge extracted context into main context
            this.mergeExtractedContext(extracted, stageNumber, context);
        } catch (error) {
            console.error(`Failed to extract context from stage ${stageNumber}:`, error);
            // Fallback to manual extraction
            this.manualContextExtraction(stageData, stageNumber, context);
        }
    }

    /**
     * Merge extracted context elements
     */
    private mergeExtractedContext(
        extracted: any,
        stageNumber: number,
        context: ProjectContext
    ): void {
        // Merge characters
        if (extracted.characters && Array.isArray(extracted.characters)) {
            for (const char of extracted.characters) {
                const existing = context.characters.get(char.id);
                if (existing) {
                    // Update existing character
                    existing.appearances.push(stageNumber);
                    if (char.traits) {
                        existing.traits = [...new Set([...(existing.traits || []), ...char.traits])];
                    }
                    if (char.relationships) {
                        Object.assign(existing.relationships, char.relationships);
                    }
                } else {
                    // Add new character
                    context.characters.set(char.id, {
                        ...char,
                        appearances: [stageNumber]
                    });
                }
            }
        }

        // Merge locations
        if (extracted.locations && Array.isArray(extracted.locations)) {
            for (const loc of extracted.locations) {
                const existing = context.locations.get(loc.id);
                if (existing) {
                    existing.appearances.push(stageNumber);
                    if (loc.features) {
                        existing.features = [...new Set([...(existing.features || []), ...loc.features])];
                    }
                } else {
                    context.locations.set(loc.id, {
                        ...loc,
                        appearances: [stageNumber]
                    });
                }
            }
        }

        // Add timeline events
        if (extracted.events && Array.isArray(extracted.events)) {
            for (const event of extracted.events) {
                context.timeline.push({
                    ...event,
                    stageNumber
                });
            }
        }

        // Merge plot threads
        if (extracted.plotThreads && Array.isArray(extracted.plotThreads)) {
            for (const thread of extracted.plotThreads) {
                const existing = context.plotThreads.get(thread.id);
                if (existing) {
                    existing.status = thread.status;
                    if (thread.status === 'resolved') {
                        existing.resolved = stageNumber;
                    }
                } else {
                    context.plotThreads.set(thread.id, {
                        ...thread,
                        introduced: stageNumber
                    });
                }
            }
        }

        // Add style examples
        if (extracted.styleExamples && Array.isArray(extracted.styleExamples)) {
            context.styleGuide.examples.push(...extracted.styleExamples);
        }
    }

    /**
     * Manual fallback context extraction
     */
    private manualContextExtraction(
        stageData: any,
        stageNumber: number,
        context: ProjectContext
    ): void {
        // Stage 2: Objects and Relations
        if (stageData.objects && Array.isArray(stageData.objects)) {
            for (const obj of stageData.objects) {
                if (obj.type === 'character') {
                    context.characters.set(obj.code || obj.id, {
                        id: obj.code || obj.id,
                        name: obj.name,
                        traits: obj.traits || [],
                        backstory: obj.backstory || obj.description || '',
                        relationships: obj.relationships || {},
                        appearances: [stageNumber],
                        voicePattern: obj.voice_pattern,
                        developmentArc: obj.development_arc
                    });
                } else if (obj.type === 'location') {
                    context.locations.set(obj.code || obj.id, {
                        id: obj.code || obj.id,
                        name: obj.name,
                        description: obj.description || '',
                        features: obj.features || [],
                        connectedLocations: obj.connections || [],
                        appearances: [stageNumber]
                    });
                }
            }
        }

        // Stage 2: Timeline
        if (stageData.timeline && Array.isArray(stageData.timeline)) {
            for (const event of stageData.timeline) {
                context.timeline.push({
                    stageNumber,
                    timestamp: event.time || event.timestamp || '',
                    description: event.description || '',
                    participants: event.participants || event.objects || [],
                    location: event.location || '',
                    impact: event.impact || 'minor'
                });
            }
        }

        // Look for plot threads in various places
        if (stageData.plot_threads || stageData.plotThreads) {
            const threads = stageData.plot_threads || stageData.plotThreads;
            for (const thread of threads) {
                context.plotThreads.set(thread.id || thread.name, {
                    id: thread.id || thread.name,
                    description: thread.description || '',
                    introduced: stageNumber,
                    relatedCharacters: thread.characters || [],
                    status: thread.status || 'open'
                });
            }
        }
    }

    /**
     * Load additional context from dedicated tables
     */
    private async loadContextElements(
        projectId: number,
        context: ProjectContext
    ): Promise<void> {
        // Load from project_context table if it exists
        try {
            const contextElements = await this.db.prepare(`
                SELECT * FROM project_context 
                WHERE project_id = ?
            `).bind(projectId).all();

            const results = contextElements.results || [];
            for (const element of results) {
                const data = JSON.parse(element.context_data as string);
                
                switch (element.context_type) {
                    case 'character':
                        context.characters.set(element.context_id as string, data);
                        break;
                    case 'location':
                        context.locations.set(element.context_id as string, data);
                        break;
                    case 'timeline':
                        context.timeline.push(data);
                        break;
                    case 'plot_thread':
                        context.plotThreads.set(element.context_id as string, data);
                        break;
                }
            }
        } catch (error) {
            console.log('Project context table not available:', error);
        }
    }

    /**
     * Save context updates back to database
     */
    async saveContextUpdate(
        projectId: number,
        stageNumber: number,
        context: ProjectContext
    ): Promise<void> {
        const batch: any[] = [];

        // Save characters
        for (const [id, character] of context.characters) {
            batch.push(
                this.db.prepare(`
                    INSERT OR REPLACE INTO project_context 
                    (project_id, context_type, context_id, context_data, first_appearance, last_updated)
                    VALUES (?, 'character', ?, ?, ?, CURRENT_TIMESTAMP)
                `).bind(
                    projectId,
                    id,
                    JSON.stringify(character),
                    Math.min(...character.appearances)
                )
            );
        }

        // Save locations
        for (const [id, location] of context.locations) {
            batch.push(
                this.db.prepare(`
                    INSERT OR REPLACE INTO project_context 
                    (project_id, context_type, context_id, context_data, first_appearance, last_updated)
                    VALUES (?, 'location', ?, ?, ?, CURRENT_TIMESTAMP)
                `).bind(
                    projectId,
                    id,
                    JSON.stringify(location),
                    Math.min(...location.appearances)
                )
            );
        }

        // Save plot threads
        for (const [id, thread] of context.plotThreads) {
            batch.push(
                this.db.prepare(`
                    INSERT OR REPLACE INTO project_context 
                    (project_id, context_type, context_id, context_data, first_appearance, last_updated)
                    VALUES (?, 'plot_thread', ?, ?, ?, CURRENT_TIMESTAMP)
                `).bind(
                    projectId,
                    id,
                    JSON.stringify(thread),
                    thread.introduced
                )
            );
        }

        // Execute batch
        if (batch.length > 0) {
            await this.db.batch(batch);
        }

        // Invalidate cache
        await this.kv.delete(`context:${projectId}`);
    }

    /**
     * Build contextual prompt for generation
     */
    async buildContextualPrompt(
        projectId: number,
        stageNumber: number,
        basePrompt: string
    ): Promise<string> {
        const context = await this.loadProjectContext(projectId);
        
        let contextualPrompt = `
=== PROJECT CONTEXT ===
Content Type: ${context.contentType}
Style Guide: ${context.styleGuide.tone} tone, ${context.styleGuide.pov} POV, ${context.styleGuide.tense} tense

`;

        // Add relevant context based on stage
        switch (stageNumber) {
            case 2: // Objects & Relations
                contextualPrompt += `
Previous Stage Summary:
${this.summarizePreviousStages(context.previousStages)}

Key Elements to Develop:
- Build on the established themes and concepts
- Create characters that embody the thematic elements
- Design locations that support the narrative tone
`;
                break;

            case 3: // Structure
                contextualPrompt += `
Established Characters (${context.characters.size}):
${Array.from(context.characters.values()).map(c => 
    `- ${c.name}: ${c.traits.join(', ')} | ${c.backstory}`
).join('\n')}

Established Locations (${context.locations.size}):
${Array.from(context.locations.values()).map(l => 
    `- ${l.name}: ${l.description}`
).join('\n')}

Timeline Events:
${context.timeline.map(e => `- ${e.timestamp}: ${e.description}`).join('\n')}

Structure Requirements:
- Use ALL established characters appropriately
- Set scenes in established locations
- Follow the timeline logic
- Develop open plot threads
`;
                break;

            case 4: // Granular Units
                contextualPrompt += `
Full Story Context:
- Characters: ${Array.from(context.characters.keys()).join(', ') || 'None defined'}
- Locations: ${Array.from(context.locations.keys()).join(', ') || 'None defined'}
- Plot Threads: ${Array.from(context.plotThreads.values()).map(p => p.description || '').filter(d => d).join('; ') || 'None defined'}

Previous Structure:
${this.summarizeStructure(context.previousStages && context.previousStages.length > 2 ? context.previousStages[2] : null)}

Scene Requirements:
- Each scene must feature established characters
- Use established locations (don't create new ones)
- Continue plot threads appropriately
- Maintain consistent character voices
- Follow the established timeline

Style Examples from Previous Stages:
${context.styleGuide.examples.slice(0, 3).join('\n---\n')}
`;
                break;
        }

        contextualPrompt += `

=== CONTINUITY RULES ===
1. Characters must behave consistently with established traits
2. Locations must match previous descriptions
3. Timeline must be sequential and logical
4. All plot threads must be tracked
5. Writing style must remain consistent

=== YOUR TASK ===
${basePrompt}

Remember: You are building on existing context. Everything must connect and be consistent.
`;

        return contextualPrompt;
    }

    /**
     * Summarize previous stages
     */
    private summarizePreviousStages(stages: any[]): string {
        if (stages.length === 0) return 'No previous stages';
        
        const summaries: string[] = [];
        for (let i = 0; i < stages.length; i++) {
            const stage = stages[i];
            if (stage) {
                summaries.push(`Stage ${i + 1}: ${this.extractStageSummary(stage)}`);
            }
        }
        
        return summaries.join('\n');
    }

    /**
     * Extract summary from stage data
     */
    private extractStageSummary(stage: any): string {
        // Try to extract key points
        if (stage.CORE_CONCEPT) {
            return `Core concept: ${stage.CORE_CONCEPT.central_premise || 'defined'}`;
        }
        if (stage.objects) {
            return `${stage.objects.length} objects defined`;
        }
        if (stage.structure) {
            return `${stage.structure.length} structural elements`;
        }
        if (stage.granular_units || stage.scenes) {
            const units = stage.granular_units || stage.scenes;
            return `${units.length} granular units`;
        }
        
        return 'Content generated';
    }

    /**
     * Summarize structure for context
     */
    private summarizeStructure(structureStage: any): string {
        if (!structureStage || !structureStage.structure) {
            return 'No structure defined';
        }
        
        const structure = structureStage.structure;
        const summary: string[] = [];
        
        for (const act of structure) {
            summary.push(`${act.title}: ${act.children?.length || 0} chapters`);
        }
        
        return summary.join(' | ');
    }

    /**
     * Check if cache is valid
     */
    private isCacheValid(cached: any): boolean {
        // Add cache validation logic if needed
        return true;
    }

    /**
     * Deserialize context from cache
     */
    private deserializeContext(cached: any): ProjectContext {
        const context: ProjectContext = {
            ...cached,
            previousStages: cached.previousStages || [],
            characters: new Map(cached.characters || []),
            locations: new Map(cached.locations || []),
            plotThreads: new Map(cached.plotThreads || []),
            timeline: cached.timeline || [],
            styleGuide: cached.styleGuide || {
                tone: 'neutral',
                pov: 'third-person',
                tense: 'past',
                vocabularyLevel: 'standard',
                pacingPreference: 'moderate',
                examples: []
            },
            metadata: cached.metadata || {}
        };
        
        return context;
    }
}