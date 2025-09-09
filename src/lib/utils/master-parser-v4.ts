/**
 * Master Travel Parser v4
 * Neural ML Models & Advanced AI Integration
 * Combines Phase 1-3 with TensorFlow.js models
 */

import { MasterTravelParserV3, ParsedTravelRequestV3 } from './master-parser-v3';
import { NeuralTravelParser, NeuralParseResult } from './neural-parser';
import { EmbeddingService } from './embeddings';
import { ContextSequenceModel, ContextVector } from './sequence-model';
import { enhancedLogger } from './enhanced-logger';

// Export extended interface
export interface ParsedTravelRequestV4 extends ParsedTravelRequestV3 {
  // Phase 4 additions
  neuralPredictions?: NeuralParseResult;
  semanticMatches?: {
    destination: string;
    confidence: number;
    alternatives: string[];
  };
  contextVector?: ContextVector;
  modelConfidence?: {
    neural: number;
    embedding: number;
    sequence: number;
    combined: number;
  };
  processingMode: 'neural' | 'hybrid' | 'fallback';
}

export class MasterTravelParserV4 {
  private static neuralParser: NeuralTravelParser | null = null;
  private static embeddingService: EmbeddingService | null = null;
  private static sequenceModel: ContextSequenceModel | null = null;
  private static initialized = false;
  private static useNeuralModels = true;

  /**
   * Initialize Phase 4 ML models
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize Phase 3 first
      await MasterTravelParserV3.initialize();

      // Initialize neural models
      this.neuralParser = new NeuralTravelParser();
      this.embeddingService = new EmbeddingService();
      this.sequenceModel = new ContextSequenceModel();

      // Load models in parallel
      await Promise.all([
        this.neuralParser.initialize(),
        this.embeddingService.initialize(),
        this.sequenceModel.initialize()
      ]);

      this.initialized = true;
      enhancedLogger.info('PARSER_V4', 'Neural ML models initialized');
    } catch (error: any) {
      enhancedLogger.error('PARSER_V4', 'Failed to initialize ML models', error);
      // Continue without neural models
      this.useNeuralModels = false;
    }
  }

  /**
   * Parse with neural ML enhancement
   */
  static async parseUserInput(
    input: string,
    conversationHistory?: string,
    userSearchHistory?: string[]
  ): Promise<ParsedTravelRequestV4> {
    const startTime = Date.now();
    const flowId = enhancedLogger.aiFlowStart('masterParserV4', { input });

    try {
      // Initialize if needed
      await this.initialize();

      // Step 1: Get Phase 3 parse result
      const phase3Result = await MasterTravelParserV3.parseUserInput(
        input,
        conversationHistory,
        userSearchHistory
      ) as ParsedTravelRequestV3;

      // If neural models aren't available, return Phase 3 result
      if (!this.useNeuralModels) {
        return {
          ...phase3Result,
          processingMode: 'fallback' as const,
          processingTime: Date.now() - startTime
        };
      }

      // Step 2: Neural parsing
      let neuralResult: NeuralParseResult | undefined;
      try {
        neuralResult = await this.neuralParser!.parseWithNN(input);
      } catch (error: any) {
        enhancedLogger.warn('PARSER_V4', 'Neural parsing failed', { error: error.message });
      }

      // Step 3: Semantic matching for destinations
      let semanticMatches: any;
      try {
        if (phase3Result.destinations.length > 0) {
          const query = phase3Result.destinations[0].city;
          semanticMatches = await this.embeddingService!.findBestDestination(query);
        } else if (neuralResult?.destinations.length) {
          semanticMatches = await this.embeddingService!.findBestDestination(
            neuralResult.destinations[0]
          );
        }
      } catch (error: any) {
        enhancedLogger.warn('PARSER_V4', 'Semantic matching failed', { error: error.message });
      }

      // Step 4: Context vector from conversation
      let contextVector: ContextVector | undefined;
      try {
        if (conversationHistory) {
          const messages = conversationHistory.split('\n').filter(m => m.trim());
          contextVector = await this.sequenceModel!.processSequence(messages);
        }
      } catch (error: any) {
        enhancedLogger.warn('PARSER_V4', 'Context processing failed', { error: error.message });
      }

      // Step 5: Merge and enhance results
      const enhanced = await this.mergeResults(
        phase3Result,
        neuralResult,
        semanticMatches,
        contextVector
      );

      // Step 6: Calculate model confidences
      const modelConfidence = {
        neural: neuralResult?.confidence || 0,
        embedding: semanticMatches?.confidence || 0,
        sequence: contextVector?.confidence || 0,
        combined: this.calculateCombinedConfidence(
          phase3Result.confidence,
          neuralResult?.confidence,
          semanticMatches?.confidence,
          contextVector?.confidence
        )
      };

      // Build final result
      const result: ParsedTravelRequestV4 = {
        ...enhanced,
        neuralPredictions: neuralResult,
        semanticMatches,
        contextVector,
        modelConfidence,
        processingMode: neuralResult ? 'neural' as const : 'hybrid' as const,
        processingTime: Date.now() - startTime
      };

      // Log metrics
      enhancedLogger.logParsingMetrics(
        result.processingTime,
        result.isValid,
        result.confidence
      );

      enhancedLogger.aiFlowEnd(flowId, true, {
        phase: 'v4',
        mode: result.processingMode,
        neuralUsed: !!neuralResult,
        embeddingUsed: !!semanticMatches,
        sequenceUsed: !!contextVector,
        confidence: result.confidence,
        processingTime: result.processingTime
      });

      enhancedLogger.info('PARSER_V4', 'Neural ML parsing complete', {
        mode: result.processingMode,
        confidence: modelConfidence.combined,
        processingTime: result.processingTime
      });

      return result;

    } catch (error: any) {
      enhancedLogger.aiFlowEnd(flowId, false, { error: error.message });
      enhancedLogger.error('PARSER_V4', 'Neural parsing failed, falling back', error);
      
      // Fallback to Phase 3
      const fallbackResult = await MasterTravelParserV3.parseUserInput(
        input,
        conversationHistory,
        userSearchHistory
      );
      
      return {
        ...fallbackResult,
        processingMode: 'fallback' as const,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Merge results from different models
   */
  private static async mergeResults(
    phase3: ParsedTravelRequestV3,
    neural?: NeuralParseResult,
    semantic?: any,
    context?: ContextVector
  ): Promise<ParsedTravelRequestV3> {
    const merged = { ...phase3 };

    // Merge destinations
    if (neural?.destinations.length) {
      const neuralDests = neural.destinations.map(d => ({
        city: d,
        days: 7,
        confidence: 'high' as const
      }));

      // Add neural destinations not in Phase 3
      for (const dest of neuralDests) {
        const exists = merged.destinations.some(d => 
          d.city.toLowerCase() === dest.city.toLowerCase()
        );
        if (!exists) {
          merged.destinations.push(dest);
        }
      }
    }

    // Use semantic match to boost confidence
    if (semantic && semantic.confidence > 0.7) {
      const semanticDest = merged.destinations.find(d => 
        d.city.toLowerCase() === semantic.destination.toLowerCase()
      );
      if (semanticDest) {
        semanticDest.confidence = 'high';
      }
    }

    // Use neural predictions for missing fields
    if (neural) {
      if (!merged.origin && neural.origin) {
        merged.origin = neural.origin;
      }
      if (!merged.duration && neural.duration) {
        merged.duration = neural.duration;
      }
      if (!merged.budget && neural.budget) {
        merged.budget = {
          amount: neural.budget,
          currency: 'USD',
          perPerson: false
        };
      }
      if (neural.travelers && neural.travelers !== merged.travelers) {
        merged.travelers = neural.travelers;
      }
      if (neural.tripType && merged.tripType === 'general') {
        merged.tripType = neural.tripType as any;
      }
    }

    // Add suggestions from semantic alternatives
    if (semantic?.alternatives.length) {
      const altSuggestion = `You might also consider: ${semantic.alternatives.join(', ')}`;
      merged.suggestions = [...(merged.suggestions || []), altSuggestion];
    }

    // Boost confidence if context vector is strong
    if (context && context.confidence > 0.8 && merged.confidence !== 'high') {
      merged.confidence = 'high';
    }

    return merged;
  }

  /**
   * Calculate combined confidence from all models
   */
  private static calculateCombinedConfidence(
    phase3: 'high' | 'medium' | 'low',
    neural?: number,
    embedding?: number,
    sequence?: number
  ): number {
    // Convert phase3 to numeric
    const phase3Score = phase3 === 'high' ? 0.9 : phase3 === 'medium' ? 0.6 : 0.3;
    
    // Weighted average
    const weights = {
      phase3: 0.4,
      neural: 0.3,
      embedding: 0.2,
      sequence: 0.1
    };

    let totalScore = phase3Score * weights.phase3;
    let totalWeight = weights.phase3;

    if (neural !== undefined) {
      totalScore += neural * weights.neural;
      totalWeight += weights.neural;
    }

    if (embedding !== undefined) {
      totalScore += embedding * weights.embedding;
      totalWeight += weights.embedding;
    }

    if (sequence !== undefined) {
      totalScore += sequence * weights.sequence;
      totalWeight += weights.sequence;
    }

    return totalScore / totalWeight;
  }

  /**
   * Get semantic similarity between destinations
   */
  static async getDestinationSimilarity(dest1: string, dest2: string): Promise<number> {
    if (!this.embeddingService) {
      await this.initialize();
    }
    
    return this.embeddingService!.getSimilarity(dest1, dest2);
  }

  /**
   * Cluster destinations by theme
   */
  static async clusterDestinations(k: number = 5): Promise<any> {
    if (!this.embeddingService) {
      await this.initialize();
    }
    
    return this.embeddingService!.clusterDestinations(k);
  }

  /**
   * Predict next user query
   */
  static async predictNextQuery(history: string[]): Promise<string[]> {
    if (!this.sequenceModel) {
      await this.initialize();
    }
    
    return this.sequenceModel!.predictNext(history);
  }

  /**
   * Train neural model on successful parses
   */
  static async trainOnSuccessfulParses(examples: any[]): Promise<void> {
    if (!this.neuralParser) {
      await this.initialize();
    }

    try {
      await this.neuralParser!.trainOnline(examples, 5);
      enhancedLogger.info('PARSER_V4', 'Neural model trained', {
        exampleCount: examples.length
      });
    } catch (error: any) {
      enhancedLogger.error('PARSER_V4', 'Training failed', error);
    }
  }

  /**
   * Get model statistics
   */
  static async getStatistics(): Promise<{
    phase3Stats: any;
    neuralStats: any;
    embeddingStats: any;
  }> {
    const phase3Stats = await MasterTravelParserV3.getStatistics();
    
    const neuralStats = this.neuralParser ? {
      initialized: true,
      modelSummary: this.neuralParser.getModelSummary()
    } : { initialized: false };

    const embeddingStats = this.embeddingService ? 
      this.embeddingService.getCacheStats() : 
      { size: 0, destinations: 0, custom: 0 };

    return {
      phase3Stats,
      neuralStats,
      embeddingStats
    };
  }

  /**
   * Clear all caches
   */
  static clearCache(): void {
    MasterTravelParserV3.clearCache();
    if (this.embeddingService) {
      this.embeddingService.clearCache();
    }
    enhancedLogger.info('PARSER_V4', 'All caches cleared');
  }

  /**
   * Toggle neural models on/off
   */
  static setNeuralModelsEnabled(enabled: boolean): void {
    this.useNeuralModels = enabled;
    enhancedLogger.info('PARSER_V4', `Neural models ${enabled ? 'enabled' : 'disabled'}`);
  }
}