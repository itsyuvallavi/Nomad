/**
 * Hybrid Parser - Intelligently combines traditional regex parsing with AI-powered parsing
 * Provides the best of both worlds: speed + accuracy of regex with flexibility of AI
 */

import { logger } from '@/lib/logger';
import { parseDestinations, ParsedTrip } from './destination-parser';

export interface ClassificationResult {
  type: 'structured' | 'conversational' | 'modification' | 'question' | 'ambiguous';
  confidence: number;
  complexity: 'simple' | 'medium' | 'complex';
  features: {
    hasExplicitDays?: boolean;
    hasCities?: boolean;
    hasOrigin?: boolean;
    hasMultiDestinations?: boolean;
    hasNaturalLanguage?: boolean;
    isModification?: boolean;
    isQuestion?: boolean;
  };
}

export interface ParseResult {
  success: boolean;
  confidence: number;
  source: 'traditional' | 'ai' | 'hybrid';
  parsedTrip?: ParsedTrip;
  error?: string;
  metadata: {
    processingTime: number;
    fallbackUsed: boolean;
    classification: ClassificationResult;
  };
}

export interface HybridParserConfig {
  traditionalConfidenceThreshold: number;
  aiConfidenceThreshold: number;
  maxProcessingTime: number;
  enableFallback: boolean;
}

const DEFAULT_CONFIG: HybridParserConfig = {
  traditionalConfidenceThreshold: 0.7,
  aiConfidenceThreshold: 0.6,
  maxProcessingTime: 5000, // 5 seconds max
  enableFallback: true
};

/**
 * Classify input to determine parsing strategy
 */
export function classifyInput(input: string): ClassificationResult {
  const startTime = Date.now();
  
  const features = {
    hasExplicitDays: /\d+\s*(?:days?|weeks?|nights?)/.test(input),
    hasCities: /[A-Z][a-zA-Z]{2,}/.test(input),
    hasOrigin: /(?:from|departing|leaving|starting|flying|traveling|based|located)\s+(?:from\s+)?[A-Z]/.test(input),
    hasMultiDestinations: /(?:and|,).*[A-Z][a-zA-Z]{2,}/.test(input),
    hasNaturalLanguage: /(?:i\s+want|would\s+like|looking\s+for|romantic|beautiful|amazing|perfect)/.test(input.toLowerCase()),
    isModification: /(?:add|remove|change|update|modify|make\s+it|extend|shorten|instead)/.test(input.toLowerCase()),
    isQuestion: /(?:\?|what|how|when|where|which|can\s+you|do\s+you)/.test(input.toLowerCase())
  };
  
  let type: ClassificationResult['type'] = 'structured';
  let confidence = 0.5;
  let complexity: ClassificationResult['complexity'] = 'simple';
  
  // Modification detection (highest priority)
  if (features.isModification) {
    type = 'modification';
    confidence = 0.8;
    complexity = 'medium';
  }
  // Question detection (but not travel planning requests)
  else if (features.isQuestion && !(/(?:want|visit|go|travel|trip|plan)/.test(input.toLowerCase()))) {
    type = 'question';
    confidence = 0.9;
    complexity = 'simple';
  }
  // Natural language travel planning (conversational)
  else if (features.hasNaturalLanguage || (/(?:i\s+want|would\s+like|looking\s+for).*(?:visit|go|travel|trip|romantic|beautiful)/.test(input.toLowerCase()))) {
    type = 'conversational';
    confidence = 0.7;
    complexity = 'complex';
  }
  // Structured with clear patterns
  else if (features.hasExplicitDays && features.hasCities) {
    type = 'structured';
    
    // Calculate confidence based on structure clarity
    if (features.hasOrigin) confidence += 0.2;
    if (features.hasExplicitDays) confidence += 0.2;
    if (features.hasCities) confidence += 0.2;
    
    // Complexity based on multiple destinations
    if (features.hasMultiDestinations) {
      complexity = input.split(/,|and/).length > 3 ? 'complex' : 'medium';
    }
    
    confidence = Math.min(0.95, confidence);
  }
  // Ambiguous cases
  else {
    type = 'ambiguous';
    confidence = 0.4;
    complexity = 'complex';
  }
  
  const result: ClassificationResult = {
    type,
    confidence,
    complexity,
    features
  };
  
  logger.info('Hybrid Parser', 'Input classified', {
    type,
    confidence,
    complexity,
    processingTime: Date.now() - startTime,
    features: Object.entries(features).filter(([_, value]) => value).map(([key]) => key)
  });
  
  return result;
}

/**
 * Calculate confidence score for traditional parser result
 */
function calculateTraditionalConfidence(parsedTrip: ParsedTrip, classification: ClassificationResult): number {
  let confidence = 0.5; // base confidence
  
  // Boost confidence based on successful extractions
  if (parsedTrip.origin && parsedTrip.origin.length > 0) {
    confidence += 0.2;
  }
  
  if (parsedTrip.destinations.length > 0) {
    confidence += 0.3;
    
    // More confidence for multiple destinations parsed correctly
    if (parsedTrip.destinations.length > 1 && classification.features.hasMultiDestinations) {
      confidence += 0.2;
    }
    
    // Check if all destinations have reasonable day counts
    const validDays = parsedTrip.destinations.every(dest => dest.duration > 0 && dest.duration <= 30);
    if (validDays) {
      confidence += 0.1;
    }
  }
  
  // Reduce confidence for complex natural language
  if (classification.features.hasNaturalLanguage && classification.type === 'conversational') {
    confidence -= 0.3;
  }
  
  // Reduce confidence if we expected more destinations but got fewer
  if (classification.features.hasMultiDestinations && parsedTrip.destinations.length === 1) {
    confidence -= 0.2;
  }
  
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Parse input using traditional parser with confidence calculation
 */
async function parseWithTraditional(input: string, classification: ClassificationResult): Promise<ParseResult> {
  const startTime = Date.now();
  
  try {
    const parsedTrip = parseDestinations(input);
    const confidence = calculateTraditionalConfidence(parsedTrip, classification);
    
    const result: ParseResult = {
      success: parsedTrip.destinations.length > 0,
      confidence,
      source: 'traditional',
      parsedTrip,
      metadata: {
        processingTime: Date.now() - startTime,
        fallbackUsed: false,
        classification
      }
    };
    
    logger.info('Hybrid Parser', 'Traditional parsing complete', {
      success: result.success,
      confidence: result.confidence,
      destinations: parsedTrip.destinations.length,
      processingTime: result.metadata.processingTime
    });
    
    return result;
  } catch (error) {
    logger.error('Hybrid Parser', 'Traditional parsing failed', { error });
    
    return {
      success: false,
      confidence: 0,
      source: 'traditional',
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        processingTime: Date.now() - startTime,
        fallbackUsed: false,
        classification
      }
    };
  }
}

/**
 * Parse input using AI parser
 */
async function parseWithAI(input: string, classification: ClassificationResult, context?: any): Promise<ParseResult> {
  const startTime = Date.now();
  
  try {
    // Import AI parser dynamically to avoid circular dependencies
    const { aiParser } = await import('./ai-parser');
    
    if (!aiParser.isAvailable()) {
      logger.warn('Hybrid Parser', 'AI parser not available (missing OpenAI API key)');
      
      return {
        success: false,
        confidence: 0,
        source: 'ai',
        error: 'AI parser not available - missing OpenAI API key',
        metadata: {
          processingTime: Date.now() - startTime,
          fallbackUsed: false,
          classification
        }
      };
    }
    
    logger.info('Hybrid Parser', 'Using AI parser for natural language understanding');
    
    const aiResult = await aiParser.parseNaturalLanguage(input, classification, context);
    
    const result: ParseResult = {
      success: aiResult.success,
      confidence: aiResult.confidence,
      source: 'ai',
      parsedTrip: aiResult.parsedTrip,
      error: aiResult.error,
      metadata: {
        processingTime: Date.now() - startTime,
        fallbackUsed: false,
        classification
      }
    };
    
    logger.info('Hybrid Parser', 'AI parsing complete', {
      success: result.success,
      confidence: result.confidence,
      destinations: aiResult.parsedTrip?.destinations.length || 0,
      processingTime: result.metadata.processingTime,
      tokensUsed: aiResult.metadata.tokensUsed
    });
    
    return result;
    
  } catch (error) {
    logger.error('Hybrid Parser', 'AI parsing failed', { error });
    
    return {
      success: false,
      confidence: 0,
      source: 'ai',
      error: error instanceof Error ? error.message : 'Unknown AI parsing error',
      metadata: {
        processingTime: Date.now() - startTime,
        fallbackUsed: false,
        classification
      }
    };
  }
}

/**
 * Merge results from traditional and AI parsers intelligently
 */
function mergeResults(
  traditionalResult: ParseResult,
  aiResult: ParseResult,
  classification: ClassificationResult
): ParseResult {
  const startTime = Date.now();
  
  // If only one succeeded, use that one
  if (traditionalResult.success && !aiResult.success) {
    logger.info('Hybrid Parser', 'Using traditional result (AI failed)');
    return { ...traditionalResult, source: 'hybrid' };
  }
  
  if (!traditionalResult.success && aiResult.success) {
    logger.info('Hybrid Parser', 'Using AI result (traditional failed)');
    return { ...aiResult, source: 'hybrid' };
  }
  
  // If both failed, return the better error
  if (!traditionalResult.success && !aiResult.success) {
    logger.warn('Hybrid Parser', 'Both parsers failed');
    return traditionalResult.confidence >= aiResult.confidence ? traditionalResult : aiResult;
  }
  
  // If both succeeded, choose based on confidence and context
  if (traditionalResult.success && aiResult.success) {
    logger.info('Hybrid Parser', 'Both parsers succeeded, merging intelligently', {
      traditionalConfidence: traditionalResult.confidence,
      aiConfidence: aiResult.confidence
    });
    
    // For structured inputs, prefer traditional parser if confidence is close
    if (classification.type === 'structured' && traditionalResult.confidence > 0.6) {
      return { ...traditionalResult, source: 'hybrid' };
    }
    
    // For conversational inputs, prefer AI parser
    if (classification.type === 'conversational' && aiResult.confidence > 0.5) {
      return { ...aiResult, source: 'hybrid' };
    }
    
    // Otherwise, use the higher confidence result
    const bestResult = traditionalResult.confidence >= aiResult.confidence ? traditionalResult : aiResult;
    return { ...bestResult, source: 'hybrid' };
  }
  
  // Fallback (shouldn't reach here)
  return traditionalResult;
}

/**
 * Main hybrid parser interface
 */
export class HybridParser {
  private config: HybridParserConfig;
  
  constructor(config: Partial<HybridParserConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  async parse(input: string): Promise<ParseResult> {
    const startTime = Date.now();
    
    logger.info('Hybrid Parser', 'Starting hybrid parsing', { 
      inputLength: input.length,
      config: this.config 
    });
    
    // Step 1: Classify the input
    const classification = classifyInput(input);
    
    // Step 2: Determine parsing strategy based on classification
    const useTraditional = classification.type === 'structured' || classification.complexity === 'simple';
    const useAI = classification.type === 'conversational' || classification.type === 'modification' || 
                  classification.complexity === 'complex';
    
    let traditionalResult: ParseResult | null = null;
    let aiResult: ParseResult | null = null;
    
    try {
      // Step 3: Execute parsing strategy
      if (useTraditional) {
        traditionalResult = await parseWithTraditional(input, classification);
        
        // If traditional parsing succeeded with high confidence, we might not need AI
        if (traditionalResult.success && traditionalResult.confidence >= this.config.traditionalConfidenceThreshold) {
          logger.info('Hybrid Parser', 'Traditional parser succeeded with high confidence, skipping AI');
          
          return {
            ...traditionalResult,
            source: 'hybrid',
            metadata: {
              ...traditionalResult.metadata,
              processingTime: Date.now() - startTime
            }
          };
        }
      }
      
      // Step 4: Use AI if traditional failed or for complex cases
      if (useAI && this.config.enableFallback) {
        aiResult = await parseWithAI(input, classification);
      }
      
      // Step 5: Merge results if we have both
      if (traditionalResult && aiResult) {
        const mergedResult = mergeResults(traditionalResult, aiResult, classification);
        mergedResult.metadata.processingTime = Date.now() - startTime;
        return mergedResult;
      }
      
      // Step 6: Return the single result we have
      const finalResult = traditionalResult || aiResult;
      if (finalResult) {
        finalResult.metadata.processingTime = Date.now() - startTime;
        return finalResult;
      }
      
      // Step 7: Fallback if nothing worked
      throw new Error('All parsing strategies failed');
      
    } catch (error) {
      logger.error('Hybrid Parser', 'Parsing failed completely', { error });
      
      return {
        success: false,
        confidence: 0,
        source: 'hybrid',
        error: error instanceof Error ? error.message : 'Unknown parsing error',
        metadata: {
          processingTime: Date.now() - startTime,
          fallbackUsed: true,
          classification
        }
      };
    }
  }
  
  /**
   * Check if the parser can handle a given input type
   */
  canHandle(classification: ClassificationResult): boolean {
    // We can handle everything except questions (which should go to a different handler)
    return classification.type !== 'question';
  }
  
  /**
   * Get parser confidence for a given input without actually parsing
   */
  getConfidence(input: string): number {
    const classification = classifyInput(input);
    
    // Base confidence on classification
    let confidence = classification.confidence;
    
    // Adjust based on our parser capabilities
    if (classification.type === 'structured') {
      confidence += 0.2; // We're good at structured inputs
    } else if (classification.type === 'conversational') {
      confidence -= 0.1; // Slightly lower for conversational (until AI parser is ready)
    }
    
    return Math.max(0, Math.min(1, confidence));
  }
  
  /**
   * Update parser configuration
   */
  updateConfig(newConfig: Partial<HybridParserConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Hybrid Parser', 'Configuration updated', { config: this.config });
  }
  
  /**
   * Get current parser statistics
   */
  async getStats() {
    let aiParserReady = false;
    
    try {
      const { aiParser } = await import('./ai-parser');
      aiParserReady = aiParser.isAvailable();
    } catch (error) {
      // AI parser module not available
    }
    
    return {
      config: this.config,
      aiParserReady,
      traditionalParserVersion: '2.1-enhanced',
      aiParserVersion: '1.0'
    };
  }
}

// Export a default instance for convenience
export const hybridParser = new HybridParser();

/**
 * Convenience function for one-off parsing
 */
export async function parseWithHybrid(input: string, config?: Partial<HybridParserConfig>): Promise<ParseResult> {
  const parser = config ? new HybridParser(config) : hybridParser;
  return parser.parse(input);
}