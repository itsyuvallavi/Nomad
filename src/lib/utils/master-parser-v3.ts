/**
 * Master Travel Parser v3
 * Enhanced with Phase 3 ML & Predictive features
 * Combines all Phase 1, 2, and 3 text processing tools
 */

import { TravelDateParser } from './date-parser';
import { TravelInputValidator } from './input-validator';
import { AdvancedTravelParser, TravelEntities, TripType, TravelPreferences } from './nlp-parser';
import { enhancedLogger } from './enhanced-logger';
import { ParseLearningSystem } from './parse-history';
import { ContextAwareParser, TravelContext, UserProfile } from './context-parser';
import { PredictiveParser, Suggestion } from './predictive-parser';

// Import original parser for fallback
import { MasterTravelParser as MasterTravelParserV2, ParsedTravelRequest } from './master-parser';

// Export the same interface for compatibility
export { ParsedTravelRequest } from './master-parser';

// Extended interface with Phase 3 features
export interface ParsedTravelRequestV3 extends ParsedTravelRequest {
  // Phase 3 additions
  contextUsed?: Partial<TravelContext>;
  predictions?: {
    destinations?: string[];
    duration?: number;
    budget?: number;
    activities?: string[];
  };
  smartSuggestions?: Suggestion[];
  completions?: string[];
  learnedPatterns?: string[];
  contextConfidence?: 'high' | 'medium' | 'low';
}

export class MasterTravelParserV3 {
  private static initialized = false;
  private static userProfile: UserProfile | null = null;

  /**
   * Initialize Phase 3 systems
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await ParseLearningSystem.initialize();
      this.initialized = true;
      enhancedLogger.info('PARSER_V3', 'Phase 3 systems initialized');
    } catch (error: any) {
      enhancedLogger.error('PARSER_V3', 'Failed to initialize', error);
    }
  }

  /**
   * Enhanced parsing with Phase 3 features
   */
  static async parseUserInput(
    input: string,
    conversationHistory?: string,
    userSearchHistory?: string[]
  ): Promise<ParsedTravelRequestV3> {
    const startTime = Date.now();
    const flowId = enhancedLogger.aiFlowStart('masterParserV3', { input });
    
    try {
      // Initialize if needed
      await this.initialize();

      // Step 1: Extract context from conversation history
      const context = conversationHistory 
        ? ContextAwareParser.extractContext(conversationHistory)
        : {} as TravelContext;

      // Step 2: Build user profile if we have search history
      if (userSearchHistory && userSearchHistory.length > 0) {
        this.userProfile = ContextAwareParser.buildUserProfile(userSearchHistory);
      }

      // Step 3: Enhance input with context
      const enhancedInput = conversationHistory
        ? ContextAwareParser.mergeWithContext(input, context)
        : { original: input, enriched: input, extractedContext: {}, confidence: 'low' as const };

      // Step 4: Use Phase 2 parser on enhanced input
      const baseResult = await MasterTravelParserV2.parseUserInput(enhancedInput.enriched);

      // Step 5: Apply learned patterns
      const withPatterns = await ParseLearningSystem.applyLearnedPatterns(
        enhancedInput.enriched,
        baseResult
      );

      // Step 6: Apply smart defaults from user profile
      const withDefaults = this.userProfile
        ? ContextAwareParser.applySmartDefaults(withPatterns, this.userProfile)
        : withPatterns;

      // Step 7: Generate predictions for missing info
      const predictions = await PredictiveParser.predictMissingInfo(withDefaults);

      // Step 8: Generate smart suggestions
      const smartSuggestions = PredictiveParser.generateSuggestions(withDefaults, context);

      // Step 9: Generate completions
      const completions = await PredictiveParser.suggestCompletions(input);

      // Step 10: Find similar successful parses
      const similarParses = await ParseLearningSystem.findSimilarParses(input, 3);
      const learnedPatterns = similarParses.map(p => p.input);

      // Build enhanced result
      const result: ParsedTravelRequestV3 = {
        ...withDefaults,
        contextUsed: enhancedInput.extractedContext,
        predictions: predictions.destinations || predictions.duration || predictions.budget || predictions.activities
          ? {
              destinations: predictions.destinations,
              duration: predictions.duration,
              budget: predictions.budget,
              activities: predictions.activities
            }
          : undefined,
        smartSuggestions: smartSuggestions.length > 0 ? smartSuggestions : undefined,
        completions: completions.map(c => c.text),
        learnedPatterns: learnedPatterns.length > 0 ? learnedPatterns : undefined,
        contextConfidence: enhancedInput.confidence,
        processingTime: Date.now() - startTime,
        originalInput: input // Keep original, not enhanced
      };

      // Adjust overall confidence based on Phase 3 enhancements
      result.confidence = this.calculateEnhancedConfidence(result);

      // Save successful parse for learning (if valid)
      if (result.isValid && result.destinations.length > 0) {
        await ParseLearningSystem.saveSuccessfulParse(
          input,
          result as ParsedTravelRequest,
          false // Will be confirmed later by user action
        );
      }

      // Log enhanced metrics
      enhancedLogger.logParsingMetrics(
        result.processingTime,
        result.isValid,
        result.confidence
      );

      enhancedLogger.aiFlowEnd(flowId, true, {
        phase: 'v3',
        confidence: result.confidence,
        contextUsed: !!result.contextUsed,
        predictionsGenerated: !!result.predictions,
        processingTime: result.processingTime
      });

      enhancedLogger.info('PARSER_V3', 'Enhanced parsing complete', {
        originalConfidence: baseResult.confidence,
        enhancedConfidence: result.confidence,
        contextEnhanced: !!enhancedInput.extractedContext.origin,
        patternsApplied: learnedPatterns.length > 0
      });

      return result;

    } catch (error: any) {
      enhancedLogger.aiFlowEnd(flowId, false, { error: error.message });
      enhancedLogger.error('PARSER_V3', 'Enhanced parsing failed, falling back', error);
      
      // Fallback to Phase 2 parser
      const fallbackResult = await MasterTravelParserV2.parseUserInput(input);
      return {
        ...fallbackResult,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Calculate enhanced confidence with Phase 3 signals
   */
  private static calculateEnhancedConfidence(result: ParsedTravelRequestV3): 'high' | 'medium' | 'low' {
    let score = 0;
    const maxScore = 15;

    // Base confidence from Phase 2
    if (result.confidence === 'high') score += 3;
    else if (result.confidence === 'medium') score += 2;
    else score += 1;

    // Context confidence
    if (result.contextConfidence === 'high') score += 2;
    else if (result.contextConfidence === 'medium') score += 1;

    // Context usage
    if (result.contextUsed && Object.keys(result.contextUsed).length > 0) score += 2;

    // Learned patterns
    if (result.learnedPatterns && result.learnedPatterns.length > 0) score += 2;

    // Predictions made
    if (result.predictions) score += 1;

    // Smart suggestions
    if (result.smartSuggestions && result.smartSuggestions.length > 0) score += 1;

    // Completeness
    if (result.origin) score += 1;
    if (result.destinations.length > 0) score += 1;
    if (result.startDate) score += 1;
    if (result.budget) score += 1;

    const percentage = (score / maxScore) * 100;

    if (percentage >= 70) return 'high';
    if (percentage >= 40) return 'medium';
    return 'low';
  }

  /**
   * Get smart prompts for the current context
   */
  static async getSmartPrompts(conversationHistory?: string): Promise<string[]> {
    try {
      const context = conversationHistory 
        ? ContextAwareParser.extractContext(conversationHistory)
        : {} as TravelContext;

      return PredictiveParser.generateSmartPrompts(context);
    } catch (error: any) {
      enhancedLogger.error('PARSER_V3', 'Failed to generate smart prompts', error);
      return [];
    }
  }

  /**
   * Get parsing statistics
   */
  static async getStatistics(): Promise<{
    phase2Stats: any;
    phase3Stats: any;
  }> {
    const phase2Stats = MasterTravelParserV2.getCacheStats();
    const phase3Stats = await ParseLearningSystem.getStatistics();

    return {
      phase2Stats,
      phase3Stats
    };
  }

  /**
   * Clear all caches
   */
  static clearCache(): void {
    MasterTravelParserV2.clearCache();
    enhancedLogger.info('PARSER_V3', 'Caches cleared');
  }
}