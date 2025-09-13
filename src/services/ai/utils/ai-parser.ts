/**
 * AI Parser Module - Natural language understanding for travel requests
 * Handles conversational inputs, modifications, and complex natural language patterns
 */

import { logger } from '@/lib/logger';
import OpenAI from 'openai';
import { ParsedTrip, ParsedDestination } from './destination-parser';
import { ClassificationResult } from './hybrid-parser';

interface ConversationContext {
  sessionId?: string;
  currentItinerary?: ParsedTrip;
  previousMessages?: string[];
  userPreferences?: Record<string, any>;
}

interface AIParseResult {
  success: boolean;
  confidence: number;
  parsedTrip?: ParsedTrip;
  conversationalResponse?: string;
  requiresClarification?: boolean;
  clarificationQuestions?: string[];
  error?: string;
  metadata: {
    processingTime: number;
    tokensUsed: number;
    model: string;
  };
}

// Structured prompt templates for different input types
const PARSING_PROMPTS = {
  travel_extraction: `Extract travel information from the user's natural language input.

Context: {context}
User Input: "{input}"

Extract and return ONLY a valid JSON object with this exact structure:
{
  "origin": "string or null",
  "destinations": [{"city": "string", "days": number}],
  "startDate": "string or null",
  "preferences": ["string array"],
  "modifications": ["string array"],
  "confidence": number,
  "requiresClarification": boolean,
  "clarificationQuestions": ["string array"]
}

Rules:
1. Extract city names and day counts as precisely as possible
2. If origin is mentioned, include it. If not, set to null
3. For vague durations like "a week", use 7 days
4. Set confidence between 0-1 based on how clear the request is
5. Set requiresClarification to true if key information is missing
6. Add clarification questions for missing critical details
7. Preferences include things like "romantic", "budget", "luxury", "adventure", etc.
8. Modifications are for requests to change existing plans

Return ONLY the JSON object, no other text.`,

  conversation_response: `Generate a helpful conversational response for a travel planning assistant.

User Input: "{input}"
Parsing Result: {parseResult}
Context: {context}

Generate a friendly, helpful response that:
1. Acknowledges what you understood from their request
2. Asks for clarification if needed
3. Suggests next steps
4. Maintains a warm, enthusiastic tone

Keep the response concise (2-3 sentences max).`,

  modification_handler: `Handle a modification request for an existing travel itinerary.

Current Itinerary: {currentItinerary}
User Request: "{input}"

Extract the modification and return JSON:
{
  "modificationType": "add_destination" | "remove_destination" | "change_duration" | "update_preferences" | "adjust_dates",
  "changes": {
    "destination": "string or null",
    "days": "number or null",
    "preferences": ["string array"],
    "reason": "string"
  },
  "confidence": number,
  "summary": "string describing the change"
}

Return ONLY the JSON object.`
};

export class AIParser {
  private openai: OpenAI | null = null;
  private model: string = 'gpt-4o-mini';
  private maxTokens: number = 500;
  
  constructor() {
    this.initializeOpenAI();
  }
  
  private initializeOpenAI(): void {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      logger.warn('AI Parser', 'No OpenAI API key found - AI parsing will be disabled');
      return;
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey
    });
    
    logger.info('AI Parser', 'OpenAI client initialized');
  }
  
  /**
   * Check if AI parser is available
   */
  isAvailable(): boolean {
    return this.openai !== null;
  }
  
  /**
   * Parse natural language travel input using AI
   */
  async parseNaturalLanguage(
    input: string,
    classification: ClassificationResult,
    context?: ConversationContext
  ): Promise<AIParseResult> {
    const startTime = Date.now();
    
    if (!this.isAvailable()) {
      return {
        success: false,
        confidence: 0,
        error: 'AI parser not available - missing OpenAI API key',
        metadata: {
          processingTime: Date.now() - startTime,
          tokensUsed: 0,
          model: this.model
        }
      };
    }
    
    try {
      logger.info('AI Parser', 'Starting natural language parsing', {
        inputLength: input.length,
        classificationType: classification.type,
        hasContext: !!context
      });
      
      // Build context string
      const contextString = this.buildContextString(context);
      
      // Choose the appropriate prompt template
      const prompt = PARSING_PROMPTS.travel_extraction
        .replace('{context}', contextString)
        .replace('{input}', input);
      
      // Call OpenAI
      const response = await this.openai!.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a travel planning assistant that extracts structured information from natural language travel requests.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
        temperature: 0.1, // Low temperature for consistency
        response_format: { type: "json_object" }
      });
      
      const tokensUsed = response.usage?.total_tokens || 0;
      const aiResponse = response.choices[0]?.message?.content;
      
      if (!aiResponse) {
        throw new Error('No response from OpenAI');
      }
      
      // Parse the AI response
      const parseResult = this.parseAIResponse(aiResponse);
      
      // Convert to our ParsedTrip format
      const parsedTrip = this.convertToParsedTrip(parseResult);
      
      const result: AIParseResult = {
        success: true,
        confidence: parseResult.confidence || 0.7,
        parsedTrip,
        requiresClarification: parseResult.requiresClarification || false,
        clarificationQuestions: parseResult.clarificationQuestions || [],
        metadata: {
          processingTime: Date.now() - startTime,
          tokensUsed,
          model: this.model
        }
      };
      
      logger.info('AI Parser', 'Natural language parsing complete', {
        success: result.success,
        confidence: result.confidence,
        destinations: parsedTrip?.destinations.length || 0,
        processingTime: result.metadata.processingTime,
        tokensUsed
      });
      
      return result;
      
    } catch (error) {
      logger.error('AI Parser', 'Natural language parsing failed', { error });
      
      return {
        success: false,
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown AI parsing error',
        metadata: {
          processingTime: Date.now() - startTime,
          tokensUsed: 0,
          model: this.model
        }
      };
    }
  }
  
  /**
   * Handle modification requests to existing itineraries
   */
  async handleModification(
    input: string,
    currentItinerary: ParsedTrip,
    context?: ConversationContext
  ): Promise<AIParseResult> {
    const startTime = Date.now();
    
    if (!this.isAvailable()) {
      return {
        success: false,
        confidence: 0,
        error: 'AI parser not available',
        metadata: {
          processingTime: Date.now() - startTime,
          tokensUsed: 0,
          model: this.model
        }
      };
    }
    
    try {
      const prompt = PARSING_PROMPTS.modification_handler
        .replace('{currentItinerary}', JSON.stringify(currentItinerary, null, 2))
        .replace('{input}', input);
      
      const response = await this.openai!.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a travel planning assistant that processes modification requests for existing itineraries.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
        temperature: 0.1,
        response_format: { type: "json_object" }
      });
      
      const tokensUsed = response.usage?.total_tokens || 0;
      const aiResponse = response.choices[0]?.message?.content;
      
      if (!aiResponse) {
        throw new Error('No response from OpenAI');
      }
      
      const modificationResult = JSON.parse(aiResponse);
      
      // Apply the modification to the current itinerary
      const modifiedTrip = this.applyModification(currentItinerary, modificationResult);
      
      return {
        success: true,
        confidence: modificationResult.confidence || 0.8,
        parsedTrip: modifiedTrip,
        conversationalResponse: `I'll ${modificationResult.summary}`,
        metadata: {
          processingTime: Date.now() - startTime,
          tokensUsed,
          model: this.model
        }
      };
      
    } catch (error) {
      logger.error('AI Parser', 'Modification handling failed', { error });
      
      return {
        success: false,
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown modification error',
        metadata: {
          processingTime: Date.now() - startTime,
          tokensUsed: 0,
          model: this.model
        }
      };
    }
  }
  
  /**
   * Generate conversational response for user interaction
   */
  async generateResponse(
    input: string,
    parseResult: AIParseResult,
    context?: ConversationContext
  ): Promise<string> {
    if (!this.isAvailable()) {
      return "I'd be happy to help plan your trip! However, I need my AI capabilities to understand your request better.";
    }
    
    try {
      const prompt = PARSING_PROMPTS.conversation_response
        .replace('{input}', input)
        .replace('{parseResult}', JSON.stringify(parseResult, null, 2))
        .replace('{context}', this.buildContextString(context));
      
      const response = await this.openai!.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a friendly travel planning assistant. Generate warm, helpful responses.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      });
      
      return response.choices[0]?.message?.content || 
        "I'd love to help you plan your trip! Could you tell me more about what you have in mind?";
      
    } catch (error) {
      logger.error('AI Parser', 'Response generation failed', { error });
      return "I'd be happy to help you plan your trip! Could you provide more details about your destination and travel dates?";
    }
  }
  
  /**
   * Build context string for AI prompts
   */
  private buildContextString(context?: ConversationContext): string {
    if (!context) {
      return 'No previous context available.';
    }
    
    const parts: string[] = [];
    
    if (context.currentItinerary) {
      parts.push(`Current itinerary: ${context.currentItinerary.destinations.map(d => `${d.name} (${d.duration} days)`).join(', ')}`);
    }
    
    if (context.previousMessages && context.previousMessages.length > 0) {
      parts.push(`Previous messages: ${context.previousMessages.slice(-3).join(' | ')}`);
    }
    
    if (context.userPreferences && Object.keys(context.userPreferences).length > 0) {
      parts.push(`User preferences: ${Object.entries(context.userPreferences).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
    }
    
    return parts.length > 0 ? parts.join('\n') : 'No previous context available.';
  }
  
  /**
   * Parse AI response and validate JSON structure
   */
  private parseAIResponse(response: string): any {
    try {
      const parsed = JSON.parse(response);
      
      // Validate required fields
      if (!parsed.destinations) {
        parsed.destinations = [];
      }
      
      if (typeof parsed.confidence !== 'number') {
        parsed.confidence = 0.7;
      }
      
      if (typeof parsed.requiresClarification !== 'boolean') {
        parsed.requiresClarification = false;
      }
      
      return parsed;
      
    } catch (error) {
      logger.error('AI Parser', 'Failed to parse AI response as JSON', { response, error });
      
      // Return a default structure
      return {
        origin: null,
        destinations: [],
        startDate: null,
        preferences: [],
        modifications: [],
        confidence: 0.3,
        requiresClarification: true,
        clarificationQuestions: ["Could you provide more specific details about your travel plans?"]
      };
    }
  }
  
  /**
   * Convert AI response to ParsedTrip format
   */
  private convertToParsedTrip(aiResult: any): ParsedTrip {
    const destinations: ParsedDestination[] = aiResult.destinations.map((dest: any, index: number) => ({
      name: dest.city || '',
      days: dest.days || 7,
      duration: dest.days || 7,
      durationText: `${dest.days || 7} days`,
      order: index + 1
    }));
    
    const totalDays = destinations.reduce((sum, dest) => sum + dest.duration, 0);
    
    return {
      origin: aiResult.origin || '',
      destinations,
      returnTo: aiResult.origin || '',
      totalDays: totalDays || 7,
      startDate: aiResult.startDate,
      endDate: undefined
    };
  }
  
  /**
   * Apply modifications to existing itinerary
   */
  private applyModification(currentItinerary: ParsedTrip, modification: any): ParsedTrip {
    const modifiedItinerary = { ...currentItinerary };
    
    switch (modification.modificationType) {
      case 'add_destination':
        if (modification.changes.destination) {
          const newDest: ParsedDestination = {
            name: modification.changes.destination,
            days: modification.changes.days || 3,
            duration: modification.changes.days || 3,
            durationText: `${modification.changes.days || 3} days`,
            order: modifiedItinerary.destinations.length + 1
          };
          modifiedItinerary.destinations.push(newDest);
          modifiedItinerary.totalDays += newDest.duration;
        }
        break;
        
      case 'change_duration':
        // Find destination and update duration
        if (modification.changes.destination) {
          const destIndex = modifiedItinerary.destinations.findIndex(
            d => d.name.toLowerCase().includes(modification.changes.destination.toLowerCase())
          );
          if (destIndex >= 0 && modification.changes.days) {
            const oldDays = modifiedItinerary.destinations[destIndex].duration;
            modifiedItinerary.destinations[destIndex].duration = modification.changes.days;
            modifiedItinerary.destinations[destIndex].days = modification.changes.days;
            modifiedItinerary.destinations[destIndex].durationText = `${modification.changes.days} days`;
            modifiedItinerary.totalDays = modifiedItinerary.totalDays - oldDays + modification.changes.days;
          }
        }
        break;
        
      case 'remove_destination':
        if (modification.changes.destination) {
          const destIndex = modifiedItinerary.destinations.findIndex(
            d => d.name.toLowerCase().includes(modification.changes.destination.toLowerCase())
          );
          if (destIndex >= 0) {
            const removedDays = modifiedItinerary.destinations[destIndex].duration;
            modifiedItinerary.destinations.splice(destIndex, 1);
            modifiedItinerary.totalDays -= removedDays;
            
            // Reorder remaining destinations
            modifiedItinerary.destinations.forEach((dest, index) => {
              dest.order = index + 1;
            });
          }
        }
        break;
    }
    
    return modifiedItinerary;
  }
  
  /**
   * Update parser configuration
   */
  updateConfig(config: { model?: string; maxTokens?: number }): void {
    if (config.model) {
      this.model = config.model;
    }
    if (config.maxTokens) {
      this.maxTokens = config.maxTokens;
    }
    
    logger.info('AI Parser', 'Configuration updated', { model: this.model, maxTokens: this.maxTokens });
  }
  
  /**
   * Get parser statistics
   */
  getStats() {
    return {
      available: this.isAvailable(),
      model: this.model,
      maxTokens: this.maxTokens,
      version: '1.0'
    };
  }
}

// Export singleton instance
export const aiParser = new AIParser();

/**
 * Convenience function for one-off parsing
 */
export async function parseWithAI(
  input: string,
  classification: ClassificationResult,
  context?: ConversationContext
): Promise<AIParseResult> {
  return aiParser.parseNaturalLanguage(input, classification, context);
}