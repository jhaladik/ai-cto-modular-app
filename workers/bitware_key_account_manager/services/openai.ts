// services/openai.ts
// OpenAI integration service for KAM worker

export interface CommunicationAnalysis {
    intent: string;
    sentiment: number;
    urgency: string;
    entities: string[];
    action_items: string[];
    confidence: number;
  }
  
  export interface TemplateRecommendation {
    template_name: string;
    confidence: number;
    reasoning: string;
    estimated_cost: number;
    parameters: Record<string, any>;
  }
  
  export class OpenAIService {
    private apiKey: string;
    private baseUrl = 'https://api.openai.com/v1';
  
    constructor(apiKey: string) {
      this.apiKey = apiKey;
    }
  
    // ==================== COMMUNICATION ANALYSIS ====================
    async analyzeCommunication(content: string, clientContext?: any): Promise<CommunicationAnalysis> {
      try {
        const prompt = this.buildAnalysisPrompt(content, clientContext);
        
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: 'You are an AI assistant specialized in analyzing business communications for intent, sentiment, and extracting actionable insights. Respond only with valid JSON.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.3,
            max_tokens: 500
          })
        });
  
        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }
  
        const data = await response.json();
        const analysisText = data.choices[0].message.content;
        
        // Parse the JSON response
        return JSON.parse(analysisText);
        
      } catch (error) {
        console.error('OpenAI analysis error:', error);
        // Return fallback analysis
        return this.getFallbackAnalysis(content);
      }
    }
  
    // ==================== TEMPLATE RECOMMENDATION ====================
    async recommendTemplate(analysis: CommunicationAnalysis, availableTemplates: any[]): Promise<TemplateRecommendation> {
      try {
        const prompt = this.buildRecommendationPrompt(analysis, availableTemplates);
        
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: 'You are an AI assistant that recommends the best pipeline template based on communication analysis. Respond only with valid JSON.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.2,
            max_tokens: 300
          })
        });
  
        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }
  
        const data = await response.json();
        const recommendationText = data.choices[0].message.content;
        
        return JSON.parse(recommendationText);
        
      } catch (error) {
        console.error('OpenAI recommendation error:', error);
        return this.getFallbackRecommendation(availableTemplates);
      }
    }
  
    // ==================== INTENT CLASSIFICATION ====================
    async classifyIntent(content: string): Promise<string> {
      try {
        const intents = [
          'intelligence_report',
          'source_discovery', 
          'competitive_analysis',
          'trend_monitoring',
          'status_inquiry',
          'support_request',
          'feedback_submission'
        ];
  
        const prompt = `
          Classify the intent of this business communication into one of these categories: ${intents.join(', ')}.
          
          Communication: "${content}"
          
          Respond with only the intent category, nothing else.
        `;
  
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 20
          })
        });
  
        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }
  
        const data = await response.json();
        const intent = data.choices[0].message.content.trim();
        
        return intents.includes(intent) ? intent : 'intelligence_report';
        
      } catch (error) {
        console.error('Intent classification error:', error);
        return 'intelligence_report';
      }
    }
  
    // ==================== HELPER METHODS ====================
    private buildAnalysisPrompt(content: string, clientContext?: any): string {
      return `
        Analyze this business communication and respond with a JSON object containing:
        
        {
          "intent": "one of: intelligence_report, source_discovery, competitive_analysis, trend_monitoring, status_inquiry, support_request, feedback_submission",
          "sentiment": "number between -1.0 (negative) and 1.0 (positive)",
          "urgency": "one of: low, medium, high, critical",
          "entities": ["array of important entities mentioned (companies, people, topics)"],
          "action_items": ["array of specific actions requested"],
          "confidence": "number between 0.0 and 1.0 indicating analysis confidence"
        }
        
        Communication to analyze: "${content}"
        
        ${clientContext ? `Client context: ${JSON.stringify(clientContext)}` : ''}
      `;
    }
  
    private buildRecommendationPrompt(analysis: CommunicationAnalysis, templates: any[]): string {
      return `
        Based on this communication analysis, recommend the best pipeline template:
        
        Analysis: ${JSON.stringify(analysis)}
        
        Available templates: ${JSON.stringify(templates)}
        
        Respond with JSON:
        {
          "template_name": "exact name from available templates",
          "confidence": "number 0.0-1.0",
          "reasoning": "brief explanation why this template fits",
          "estimated_cost": "number in USD",
          "parameters": {"any_suggested_parameters": "values"}
        }
      `;
    }
  
    private getFallbackAnalysis(content: string): CommunicationAnalysis {
      // Simple keyword-based analysis as fallback
      const urgentKeywords = ['urgent', 'asap', 'immediately', 'critical', 'emergency'];
      const negativeKeywords = ['problem', 'issue', 'error', 'fail', 'wrong'];
      const positiveKeywords = ['great', 'excellent', 'good', 'thanks', 'perfect'];
      
      const isUrgent = urgentKeywords.some(word => 
        content.toLowerCase().includes(word)
      );
      
      const hasNegative = negativeKeywords.some(word => 
        content.toLowerCase().includes(word)
      );
      
      const hasPositive = positiveKeywords.some(word => 
        content.toLowerCase().includes(word)
      );
  
      return {
        intent: 'intelligence_report',
        sentiment: hasNegative ? -0.3 : hasPositive ? 0.7 : 0.0,
        urgency: isUrgent ? 'high' : 'medium',
        entities: [],
        action_items: ['Process request'],
        confidence: 0.6
      };
    }
  
    private getFallbackRecommendation(templates: any[]): TemplateRecommendation {
      const defaultTemplate = templates.find(t => t.name === 'complete_intelligence_pipeline') || templates[0];
      
      return {
        template_name: defaultTemplate?.name || 'basic_research_pipeline',
        confidence: 0.7,
        reasoning: 'Default recommendation due to AI service unavailability',
        estimated_cost: defaultTemplate?.estimated_cost || 0.15,
        parameters: {}
      };
    }
  }