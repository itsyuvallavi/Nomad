/**
 * Input Classifier for Enhanced Dialog Architecture
 * Determines optimal parsing strategy based on input characteristics
 */

import { logger } from '@/lib/logger';

export type InputType = 
  | 'structured'      // "3 days in London from NYC"
  | 'conversational'  // "make it more romantic"
  | 'modification'    // "add 2 more days"
  | 'question'        // "what's the weather like?"
  | 'ambiguous';      // needs AI to determine intent

export interface ClassificationResult {
  type: InputType;
  confidence: 'high' | 'medium' | 'low';
  hasDestinations: boolean;
  hasDates: boolean;
  hasModificationIntent: boolean;
  isQuestion: boolean;
  requiresContext: boolean;
  suggestedParser: 'traditional' | 'ai' | 'hybrid';
  metadata: {
    keyPhrases: string[];
    detectedEntities: string[];
    complexity: number;
  };
}

export class InputClassifier {
  // Structured input patterns
  private static readonly STRUCTURED_PATTERNS = [
    /^\d+\s+days?\s+in\s+\w+/i,
    /^from\s+\w+\s+to\s+\w+/i,
    /^(weekend|week)\s+in\s+\w+/i,
    /^\w+\s+to\s+\w+\s+for\s+\d+\s+days?/i,
    /^plan\s+a?\s*\d+\s+(days?|weeks?)\s+trip/i,
    /^(flying|fly|flight)\s+from\s+\w+\s+to\s+\w+/i,
    /^\d+\s+weeks?\s+in\s+[\w\s,]+/i,
    /^visiting\s+[\w\s,]+\s+for\s+\d+\s+days?/i,
    /^from\s+\w+\s+for\s+\d+\s+(days?|weeks?)/i,
    // Complex patterns that should still be considered structured
    /plan.*\d+.*days?.*in.*\w+/i,
    /\d+\s+days?\s+in\s+\w+.*and.*\d+.*in\s+\w+/i,
  ];

  // Modification intent patterns
  private static readonly MODIFICATION_PATTERNS = [
    /^(add|remove|change|modify|update|extend|shorten)/i,
    /^make\s+it\s+(more|less)\s+\w+/i,
    /^(can|could)\s+(you|we)\s+(add|change|remove)/i,
    /instead\s+of/i,
    /^(no|not|don't)\s+\w+/i,
    /^(switch|swap|replace)\s+\w+/i,
    /^actually/i,
    /^(let's|lets)\s+(add|remove|change|go|visit)/i,
  ];

  // Question patterns
  private static readonly QUESTION_PATTERNS = [
    /^(what|when|where|how|why|which|who)/i,
    /\?$/,
    /^(is|are|can|could|should|would|will)/i,
    /^tell\s+me\s+about/i,
    /^(do|does|did)\s+(you|i|we)/i,
  ];

  // Conversational patterns
  private static readonly CONVERSATIONAL_PATTERNS = [
    /^(i|we)\s+(want|need|would like|prefer)/i,
    /^(please|kindly)/i,
    /^(that|this)\s+(sounds|looks|seems)/i,
    /^(perfect|great|awesome|good|okay|fine)/i,
    /^(hmm|well|actually|maybe)/i,
    /^(yes|yeah|yep|sure|ok|okay)/i,
    /^(no|nope|nah)/i,
    /^i('m|am)\s+(thinking|looking|planning)/i,
    /^how\s+about/i,
  ];

  // Known city database for validation
  private static readonly KNOWN_CITIES = new Set([
    'london', 'paris', 'tokyo', 'rome', 'barcelona', 'amsterdam', 'berlin',
    'dubai', 'singapore', 'bangkok', 'lisbon', 'granada', 'madrid', 'milan',
    'vienna', 'prague', 'budapest', 'istanbul', 'cairo', 'sydney', 'melbourne',
    'san francisco', 'los angeles', 'new york', 'chicago', 'miami', 'seattle',
    'boston', 'toronto', 'vancouver', 'mexico city', 'buenos aires', 'rio',
    'rio de janeiro', 'sao paulo', 'lima', 'bogota', 'athens', 'copenhagen',
    'stockholm', 'oslo', 'helsinki', 'reykjavik', 'dublin', 'edinburgh',
    'munich', 'frankfurt', 'zurich', 'geneva', 'brussels', 'luxembourg',
    'monaco', 'venice', 'florence', 'naples', 'porto', 'seville', 'valencia',
    'bilbao', 'krakow', 'warsaw', 'moscow', 'st petersburg', 'kiev', 'minsk',
    'beijing', 'shanghai', 'hong kong', 'taipei', 'seoul', 'osaka', 'kyoto',
    'delhi', 'mumbai', 'bangalore', 'chennai', 'kolkata', 'jakarta', 'manila',
    'kuala lumpur', 'ho chi minh', 'hanoi', 'phnom penh', 'yangon', 'colombo',
    'kathmandu', 'dhaka', 'karachi', 'lahore', 'tehran', 'tel aviv', 'jerusalem',
    'amman', 'beirut', 'damascus', 'riyadh', 'doha', 'abu dhabi', 'muscat',
    'kuwait city', 'manama', 'casablanca', 'marrakech', 'tunis', 'algiers',
    'johannesburg', 'cape town', 'nairobi', 'lagos', 'accra', 'addis ababa'
  ]);

  /**
   * Classify user input to determine parsing strategy
   */
  static classify(input: string, hasConversationHistory: boolean = false): ClassificationResult {
    const normalized = input.trim().toLowerCase();
    const result: ClassificationResult = {
      type: 'ambiguous',
      confidence: 'low',
      hasDestinations: false,
      hasDates: false,
      hasModificationIntent: false,
      isQuestion: false,
      requiresContext: false,
      suggestedParser: 'traditional',
      metadata: {
        keyPhrases: [],
        detectedEntities: [],
        complexity: 0
      }
    };

    // Check for empty or very short input
    if (normalized.length < 3) {
      result.type = 'ambiguous';
      result.suggestedParser = 'ai';
      result.requiresContext = true;
      return result;
    }

    // Extract metadata first
    result.metadata.complexity = this.calculateComplexity(input);
    result.metadata.keyPhrases = this.extractKeyPhrases(input);
    result.metadata.detectedEntities = this.extractEntities(input);
    
    // Check for destinations and dates
    result.hasDestinations = this.hasDestinations(input);
    result.hasDates = this.hasDates(input);

    // Classification priority order (most specific to least specific)
    
    // 1. Check for questions first
    if (this.isQuestion(normalized)) {
      result.type = 'question';
      result.isQuestion = true;
      result.requiresContext = true;
      result.suggestedParser = 'ai';
      result.confidence = 'high';
      return result;
    }

    // 2. Check for modification intents
    if (this.hasModificationIntent(normalized)) {
      result.type = 'modification';
      result.hasModificationIntent = true;
      result.requiresContext = true;
      result.suggestedParser = 'ai';
      result.confidence = hasConversationHistory ? 'high' : 'medium';
      return result;
    }

    // 3. Check for structured patterns
    if (this.isStructured(normalized)) {
      result.type = 'structured';
      result.suggestedParser = 'traditional';
      result.confidence = 'high';
      
      // But use hybrid if it's complex structured input
      if (result.metadata.complexity > 5) {
        result.suggestedParser = 'hybrid';
        result.confidence = 'medium';
      }
      
      return result;
    }

    // 4. Check for conversational patterns
    if (this.isConversational(normalized)) {
      result.type = 'conversational';
      result.requiresContext = hasConversationHistory;
      
      // If it has destinations, try hybrid approach
      if (result.hasDestinations) {
        result.suggestedParser = 'hybrid';
        result.confidence = 'medium';
      } else {
        result.suggestedParser = 'ai';
        result.confidence = hasConversationHistory ? 'medium' : 'low';
      }
      
      return result;
    }

    // 5. Default to ambiguous
    result.type = 'ambiguous';
    
    // If we detected destinations or dates, try hybrid
    if (result.hasDestinations || result.hasDates) {
      result.suggestedParser = 'hybrid';
      result.confidence = 'low';
    } else {
      result.suggestedParser = 'ai';
      result.confidence = 'low';
      result.requiresContext = true;
    }

    logger.info('AI', 'Input classified', {
      type: result.type,
      confidence: result.confidence,
      parser: result.suggestedParser,
      complexity: result.metadata.complexity,
      hasDestinations: result.hasDestinations,
      hasDates: result.hasDates
    });

    return result;
  }

  private static isStructured(input: string): boolean {
    return this.STRUCTURED_PATTERNS.some(pattern => pattern.test(input));
  }

  private static isQuestion(input: string): boolean {
    return this.QUESTION_PATTERNS.some(pattern => pattern.test(input));
  }

  private static hasModificationIntent(input: string): boolean {
    return this.MODIFICATION_PATTERNS.some(pattern => pattern.test(input));
  }

  private static isConversational(input: string): boolean {
    return this.CONVERSATIONAL_PATTERNS.some(pattern => pattern.test(input));
  }

  private static hasDestinations(input: string): boolean {
    const words = input.toLowerCase().split(/\s+/);
    
    // Check for known cities
    for (const word of words) {
      if (this.KNOWN_CITIES.has(word)) {
        return true;
      }
    }
    
    // Check for multi-word cities
    const lowerInput = input.toLowerCase();
    for (const city of this.KNOWN_CITIES) {
      if (city.includes(' ') && lowerInput.includes(city)) {
        return true;
      }
    }
    
    // Don't count vague regions like "Europe" as specific destinations
    const vagueRegions = ['europe', 'asia', 'africa', 'america', 'australia', 'antarctica'];
    if (vagueRegions.some(region => lowerInput.includes(region)) && 
        !this.extractDestinations(input).length) {
      return false;
    }
    
    // Check for capitalized words that might be cities
    const capitalizedWords = input.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
    if (capitalizedWords && capitalizedWords.length > 0) {
      // If we have capitalized words after "in", "to", "from", "visit", etc.
      const locationPrepositions = /(?:in|to|from|visit|visiting|explore|exploring)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
      const matches = input.matchAll(locationPrepositions);
      for (const match of matches) {
        // Only count if it's a known city or at least 2 words (likely a real place)
        const location = match[1].toLowerCase();
        if (this.KNOWN_CITIES.has(location) || location.split(' ').length >= 2) {
          return true;
        }
      }
    }
    
    return false;
  }

  private static hasDates(input: string): boolean {
    const datePatterns = [
      /\b\d+\s*days?\b/i,
      /\b\d+\s*weeks?\b/i,
      /\b\d+\s*months?\b/i,
      /\bweekend\b/i,
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
      /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/,
      /\b\d{1,2}-\d{1,2}(?:-\d{2,4})?\b/,
      /\bnext\s+(week|month|year|weekend)\b/i,
      /\bthis\s+(week|month|year|weekend)\b/i,
      /\b(tomorrow|today|yesterday)\b/i,
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    ];
    
    return datePatterns.some(pattern => pattern.test(input));
  }

  private static calculateComplexity(input: string): number {
    let complexity = 0;
    
    // Length factor
    if (input.length > 50) complexity += 1;
    if (input.length > 100) complexity += 2;
    if (input.length > 200) complexity += 2;
    
    // Multiple sentences
    const sentences = input.split(/[.!?]/).filter(s => s.trim().length > 0);
    if (sentences.length > 1) complexity += sentences.length - 1;
    
    // Multiple clauses
    const clauses = input.split(/[,;]/).filter(c => c.trim().length > 0);
    if (clauses.length > 2) complexity += Math.min(clauses.length - 2, 3);
    
    // Multiple destinations
    const destinations = this.extractDestinations(input);
    if (destinations.length > 1) complexity += destinations.length - 1;
    
    // Special requirements keywords
    const specialKeywords = /\b(budget|luxury|romantic|adventure|family|business|relaxing|cultural|foodie|nightlife|beach|mountain|city|nature|historic|modern|traditional|local|authentic|off-the-beaten-path)\b/gi;
    const matches = input.match(specialKeywords);
    if (matches) complexity += Math.min(matches.length, 3);
    
    // Constraint keywords
    const constraintKeywords = /\b(must|need|require|essential|important|prefer|avoid|don't|no|not|without|except|only|just)\b/gi;
    const constraintMatches = input.match(constraintKeywords);
    if (constraintMatches) complexity += Math.min(constraintMatches.length, 2);
    
    return Math.min(complexity, 10); // Cap at 10
  }

  private static extractKeyPhrases(input: string): string[] {
    const phrases: string[] = [];
    
    // Extract destination phrases
    const destPattern = /\b\d+\s*days?\s+in\s+[\w\s]+\b|\b[\w\s]+\s+for\s+\d+\s*days?\b/gi;
    const destMatches = input.match(destPattern);
    if (destMatches) {
      phrases.push(...destMatches.map(m => m.trim()));
    }
    
    // Extract duration phrases
    const durationPattern = /\b\d+\s*(?:days?|weeks?|months?)\b/gi;
    const durationMatches = input.match(durationPattern);
    if (durationMatches) {
      phrases.push(...durationMatches.map(m => m.trim()));
    }
    
    // Extract preference phrases
    const prefPattern = /\b(?:want|need|prefer|looking for|would like)\s+[\w\s]{3,20}\b/gi;
    const prefMatches = input.match(prefPattern);
    if (prefMatches) {
      phrases.push(...prefMatches.slice(0, 3).map(m => m.trim()));
    }
    
    // Extract location phrases
    const locPattern = /\b(?:from|to|in|at|visit|visiting)\s+([A-Z][\w\s]{2,20})\b/g;
    const locMatches = input.matchAll(locPattern);
    for (const match of locMatches) {
      if (phrases.length < 10) {
        phrases.push(match[0].trim());
      }
    }
    
    return [...new Set(phrases)]; // Remove duplicates
  }

  private static extractEntities(input: string): string[] {
    const entities: string[] = [];
    
    // Extract known cities
    const words = input.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (this.KNOWN_CITIES.has(word)) {
        entities.push(`CITY:${word}`);
      }
    }
    
    // Check for multi-word cities
    const lowerInput = input.toLowerCase();
    for (const city of this.KNOWN_CITIES) {
      if (city.includes(' ') && lowerInput.includes(city)) {
        if (!entities.some(e => e === `CITY:${city}`)) {
          entities.push(`CITY:${city}`);
        }
      }
    }
    
    // Extract numbers
    const numbers = input.match(/\b\d+\b/g);
    if (numbers) {
      entities.push(...numbers.map(n => `NUM:${n}`));
    }
    
    // Extract months
    const months = input.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi);
    if (months) {
      entities.push(...months.map(m => `MONTH:${m.toLowerCase()}`));
    }
    
    // Extract days of week
    const days = input.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi);
    if (days) {
      entities.push(...days.map(d => `DAY:${d.toLowerCase()}`));
    }
    
    // Extract special keywords
    const keywords = input.match(/\b(weekend|summer|winter|spring|fall|autumn|christmas|easter|thanksgiving)\b/gi);
    if (keywords) {
      entities.push(...keywords.map(k => `KEYWORD:${k.toLowerCase()}`));
    }
    
    return [...new Set(entities)]; // Remove duplicates
  }

  private static extractDestinations(input: string): string[] {
    const destinations: string[] = [];
    const lowerInput = input.toLowerCase();
    
    // Check each known city
    for (const city of this.KNOWN_CITIES) {
      if (lowerInput.includes(city)) {
        destinations.push(city);
      }
    }
    
    return destinations;
  }

  /**
   * Determine if input requires AI processing
   */
  static requiresAI(classification: ClassificationResult): boolean {
    return classification.suggestedParser === 'ai' || 
           classification.suggestedParser === 'hybrid' ||
           classification.confidence === 'low' ||
           classification.requiresContext ||
           classification.type === 'modification' ||
           classification.type === 'question';
  }

  /**
   * Get a human-readable description of the classification
   */
  static getDescription(classification: ClassificationResult): string {
    const descriptions: Record<InputType, string> = {
      structured: 'Clear travel request with destinations and dates',
      conversational: 'Natural language request needing interpretation',
      modification: 'Request to modify existing itinerary',
      question: 'Question requiring an answer',
      ambiguous: 'Unclear request needing clarification'
    };
    
    return descriptions[classification.type];
  }

  /**
   * Debug helper to explain classification decision
   */
  static explainClassification(input: string, classification: ClassificationResult): string {
    const explanation: string[] = [];
    
    explanation.push(`Input: "${input}"`);
    explanation.push(`Type: ${classification.type} (${this.getDescription(classification)})`);
    explanation.push(`Confidence: ${classification.confidence}`);
    explanation.push(`Parser: ${classification.suggestedParser}`);
    
    if (classification.hasDestinations) {
      explanation.push('✓ Contains destinations');
    }
    if (classification.hasDates) {
      explanation.push('✓ Contains dates/duration');
    }
    if (classification.hasModificationIntent) {
      explanation.push('✓ Has modification intent');
    }
    if (classification.isQuestion) {
      explanation.push('✓ Is a question');
    }
    if (classification.requiresContext) {
      explanation.push('✓ Requires conversation context');
    }
    
    explanation.push(`Complexity: ${classification.metadata.complexity}/10`);
    
    if (classification.metadata.detectedEntities.length > 0) {
      explanation.push(`Entities: ${classification.metadata.detectedEntities.join(', ')}`);
    }
    
    return explanation.join('\n');
  }
}