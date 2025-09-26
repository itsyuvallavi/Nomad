/**
 * AI Controller - Refactored version using modular components
 * Unified conversation and state management
 * Handles all conversational flow, question generation, and intent analysis
 * NO DEFAULTS - Always asks for missing information
 */

import OpenAI from 'openai';
import { logger } from '@/lib/monitoring/logger';
import { z } from 'zod';

// Import our new modules
import { IntentParser } from './modules/intent-parser';
import { IntentCache } from './modules/cache-manager';
import {
  ConversationManager,
  ConversationState,
  ConversationContext
} from './modules/conversation-manager';
import { ResponseFormatter, AIResponse } from './modules/response-formatter';
import { GPTAnalyzer } from './modules/gpt-analyzer';
import { JSONUtils } from './modules/json-utils';
import { ParsedIntent } from './types/core.types';
import { getTokenConfig, tokenTracker, calculateTokenCost } from './config/token-limits';

// Re-export types for backward compatibility
export { ConversationState };
export type { ParsedIntent, ConversationContext };

// Legacy response type for backward compatibility
export interface AIControllerResponse {
  type: 'question' | 'ready' | 'generating' | 'error';
  message: string;
  intent?: ParsedIntent;
  missingFields?: string[];
  canGenerate: boolean;
  context?: string;
}

// Initialize OpenAI client
function getOpenAIClient(apiKey?: string): OpenAI {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OpenAI API key not configured');
  }
  return new OpenAI({
    apiKey: key,
  });
}

export class AIController {
  private openai: OpenAI;
  private intentParser: IntentParser;
  private intentCache: IntentCache;
  private conversationManager: ConversationManager;
  private responseFormatter: ResponseFormatter;
  private gptAnalyzer: GPTAnalyzer;

  constructor(apiKey?: string) {
    this.openai = getOpenAIClient(apiKey);
    this.intentParser = new IntentParser();
    this.intentCache = new IntentCache();
    this.conversationManager = new ConversationManager();
    this.responseFormatter = new ResponseFormatter();
    this.gptAnalyzer = new GPTAnalyzer(this.openai);

    logger.debug('AI', 'Controller initialized with modular components');
  }

  /**
   * Public method for testing intent extraction
   */
  async extractIntent(message: string): Promise<Partial<ParsedIntent>> {
    return this.analyzeUserInput(message);
  }

  /**
   * Convert ParsedIntent to TripParams format for the trip generator
   */
  getTripParameters(intent: ParsedIntent): any {
    // Handle both single and multi-city destinations
    const destination = intent.destinations
      ? intent.destinations.join(', ')
      : intent.destination || 'Unknown';

    return {
      destination,
      startDate: intent.startDate || new Date().toISOString().split('T')[0],
      duration: intent.duration || 3,
      travelers: intent.travelers,
      preferences: {
        budget: intent.budget || intent.preferences?.budget,
        interests: intent.interests || intent.preferences?.interests,
        pace: intent.preferences?.pace,
        mustSee: intent.preferences?.mustSee,
        avoid: intent.preferences?.avoid
      },
      budget: intent.budget || intent.preferences?.budget,
      interests: intent.interests || intent.preferences?.interests
    };
  }

  /**
   * Main entry point - processes user message and returns appropriate response
   * NEVER generates without required information
   */
  async processMessage(
    message: string,
    serializedContext?: string
  ): Promise<AIControllerResponse> {
    logger.info('AI', 'Processing message', {
      message: message.slice(0, 100),
      hasContext: !!serializedContext,
      contextSize: serializedContext?.length || 0
    });

    try {
      // Restore or create context using ConversationManager
      let context: ConversationContext;

      if (serializedContext) {
        context = this.conversationManager.deserializeContext(serializedContext)
          || this.conversationManager.createContext();
      } else {
        context = this.conversationManager.createContext();
      }

      // Log context state for debugging
      console.log('🧠 Conversation Context:', {
        sessionId: context.sessionId,
        state: context.state,
        messageCount: context.messageCount,
        currentIntent: context.currentIntent,
        lastUpdated: context.lastUpdated
      });

      // Add user message to history
      context = this.conversationManager.addMessage(
        context.sessionId,
        'user',
        message
      );

      // Analyze user input and update intent
      const updatedIntent = await this.analyzeUserInput(message, context.currentIntent);
      context = this.conversationManager.updateIntent(context.sessionId, updatedIntent);

      // Check what information is missing
      const missingFields = this.getMissingRequiredFields(context.currentIntent || {});

      if (missingFields.length > 0) {
        // Generate appropriate question for next missing field
        const question = await this.generateQuestion(
          missingFields[0],
          context.currentIntent || {}
        );

        // Update state based on what we're collecting
        context = this.conversationManager.updateState(
          context.sessionId,
          this.conversationManager.getStateForField(missingFields[0])
        );

        // Add assistant message to history
        context = this.conversationManager.addMessage(
          context.sessionId,
          'assistant',
          question
        );

        return {
          type: 'question',
          message: question,
          intent: context.currentIntent as ParsedIntent,
          missingFields,
          canGenerate: false,
          context: this.conversationManager.serializeContext(context)
        };
      }

      // All required information collected
      context = this.conversationManager.updateState(
        context.sessionId,
        ConversationState.READY_TO_GENERATE
      );

      // Format ready response using ResponseFormatter
      const response = this.responseFormatter.formatReadyResponse(
        context.currentIntent || {},
        context
      );

      return {
        type: 'ready',
        message: response.message,
        intent: context.currentIntent as ParsedIntent,
        canGenerate: true,
        context: this.conversationManager.serializeContext(context)
      };

    } catch (error) {
      logger.error('AI', 'Error processing message', { error });

      const errorResponse = this.responseFormatter.formatErrorResponse(
        error instanceof Error ? error : new Error(String(error))
      );

      return {
        type: 'error',
        message: errorResponse.message,
        canGenerate: false
      };
    }
  }

  /**
   * Analyzes user input to extract travel information
   * Uses both pattern matching and GPT-4o-mini
   */
  private async analyzeUserInput(
    message: string,
    currentIntent?: Partial<ParsedIntent>
  ): Promise<Partial<ParsedIntent>> {
    try {
      // Check cache first
      const cached = this.intentCache.getIntent(message);

      if (cached) {
        console.log('🎯 Cache hit for intent extraction');
        return { ...currentIntent, ...cached };
      }

      // Try pattern extraction first using IntentParser
      const patternResult = this.intentParser.extractWithPatterns(message, currentIntent);

      // Check if pattern extraction got all required fields
      const hasDestination = !!(patternResult.destination || patternResult.destinations);
      const hasDuration = !!(patternResult.duration || (patternResult.startDate && patternResult.endDate));
      const hasStartDate = !!patternResult.startDate;

      if (hasDestination && hasDuration && hasStartDate) {
        console.log('      ✅ Complete extraction via patterns (skipping GPT-4o-mini)');
        // Cache the result
        this.intentCache.setIntent(message, patternResult);
        return patternResult;
      }

      // Pattern extraction incomplete, use GPT-4o-mini to fill gaps
      console.log('      ⚠️  Missing fields, using GPT-4o-mini for completion');

      const gptResult = await this.gptAnalyzer.analyzeWithGPT(message, patternResult);

      // Merge results (pattern results take precedence as they're more reliable)
      const merged = {
        ...gptResult,
        ...patternResult,
        // Ensure arrays are properly merged
        destinations: patternResult.destinations || gptResult.destinations,
        interests: [...(patternResult.interests || []), ...(gptResult.interests || [])]
          .filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
      };

      // Validate using IntentParser
      const validated = this.intentParser.validateExtractedIntent(merged);

      // Cache the result
      this.intentCache.setIntent(message, validated);

      console.log('🤖 [AI] Merged pattern and GPT-4o-mini results', validated);
      return validated;

    } catch (error) {
      logger.error('AI', 'Failed to analyze input', { error });
      console.log('🤖 [AI] Failed to analyze input', error);

      // Fallback to pattern extraction only
      const fallback = this.intentParser.extractWithPatterns(message, currentIntent);
      console.log('🤖 [AI] Using pattern results as fallback', fallback);
      return fallback;
    }
  }


  /**
   * Check what required fields are missing
   */
  private getMissingRequiredFields(intent: Partial<ParsedIntent>): string[] {
    const missing: string[] = [];

    // Essential fields that must be provided
    if (!intent.destination && !intent.destinations) {
      missing.push('destination');
    }

    if (!intent.startDate) {
      missing.push('startDate');
    }

    if (!intent.duration && !(intent.startDate && intent.endDate)) {
      missing.push('duration');
    }

    return missing;
  }

  /**
   * Generate a conversational question for missing information
   */
  private async generateQuestion(
    missingField: string,
    currentIntent: Partial<ParsedIntent>
  ): Promise<string> {
    // Use ResponseFormatter to generate consistent questions
    const response = this.responseFormatter.formatQuestion(
      missingField,
      currentIntent
    );

    return response.message;
  }

  /**
   * Repair malformed JSON strings (delegated to JSONUtils)
   */
  private _repairJSON(text: string): string | null {
    return JSONUtils.repairJSON(text);
  }

  /**
   * For backward compatibility with existing code
   * These are preserved in case other parts of the code need them
   */
  private _getStateForField(field: string): ConversationState {
    return this.conversationManager.getStateForField(field);
  }

  private _createNewContext(): ConversationContext {
    return this.conversationManager.createContext();
  }

  private _serializeContext(context: ConversationContext): string {
    return this.conversationManager.serializeContext(context);
  }

  private _deserializeContext(serialized: string): ConversationContext | null {
    return this.conversationManager.deserializeContext(serialized);
  }
}