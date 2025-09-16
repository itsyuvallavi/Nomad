/**
 * Response Analyzer
 * Analyzes user responses to extract information
 * NEVER makes assumptions - asks for clarification when needed
 */

import { CollectedData, TravelerInfo, TripPreferences } from './conversation-state-manager';

export interface AnalysisResult {
  field: string;
  value: any;
  confidence: 'high' | 'medium' | 'low';
  needsClarification: boolean;
  clarificationReason?: string;
}

export class ResponseAnalyzer {
  /**
   * Analyze user response based on what information we're collecting
   */
  async analyzeResponse(
    userMessage: string,
    expectedField: string,
    context?: CollectedData
  ): Promise<AnalysisResult> {
    const lowerMessage = userMessage.toLowerCase().trim();

    switch (expectedField) {
      case 'destination':
        return this.analyzeDestination(userMessage);
      case 'dates':
        return this.analyzeDates(userMessage, context);
      case 'duration':
        return this.analyzeDuration(userMessage, context);
      case 'travelers':
        return this.analyzeTravelers(userMessage);
      case 'preferences':
        return this.analyzePreferences(userMessage);
      case 'confirmation':
        return this.analyzeConfirmation(userMessage);
      default:
        return this.analyzeGeneral(userMessage);
    }
  }

  /**
   * Analyze destination from user input
   * CRITICAL: Never assume a destination - ask for clarification if unclear
   */
  private analyzeDestination(message: string): AnalysisResult {
    const trimmed = message.trim();
    const lower = message.toLowerCase();

    // Check if this is a greeting or general statement
    if (this.isGreeting(message) || this.isAskingForHelp(message)) {
      return {
        field: 'destination',
        value: null,
        confidence: 'low',
        needsClarification: true,
        clarificationReason: 'no_destination_provided'
      };
    }

    // Check for help/travel requests WITHOUT a specific destination
    const travelPhrases = [
      'i want to travel',
      'help me plan',
      'plan a trip',
      'need a vacation',
      'looking for a trip',
      'want to go somewhere',
      'planning to travel',
      'thinking about traveling',
      'book a trip',
      'organize a trip'
    ];

    // Check if it's just a travel request without destination
    if (travelPhrases.some(phrase => lower.includes(phrase))) {
      // Look for actual destinations after the travel phrase
      const destinationPattern = /to\s+([A-Z][a-zA-Z\s]+)|in\s+([A-Z][a-zA-Z\s]+)/;
      const match = message.match(destinationPattern);

      if (!match) {
        // No destination found - they're just expressing desire to travel
        return {
          field: 'destination',
          value: null,
          confidence: 'low',
          needsClarification: true,
          clarificationReason: 'no_destination_provided'
        };
      }
      // If there's a match, continue to process the destination
      const destination = match[1] || match[2];
      return this.analyzeDestination(destination.trim());
    }

    // Check for uncertainty
    if (this.isUncertain(message)) {
      return {
        field: 'destination',
        value: null,
        confidence: 'low',
        needsClarification: true,
        clarificationReason: 'uncertain'
      };
    }

    // Check if message is just a general statement without a destination
    const nonDestinationPhrases = [
      'yes', 'no', 'okay', 'sure', 'help', 'please',
      'i need', 'i want', 'can you', 'could you', 'will you',
      'hello', 'hi', 'hey', 'good morning', 'good afternoon'
    ];

    // Check if it's a short non-destination phrase
    if (nonDestinationPhrases.some(phrase => lower.startsWith(phrase))) {
      // If it's just the phrase itself or very short, not a destination
      if (trimmed.split(' ').length <= 3) {
        return {
          field: 'destination',
          value: null,
          confidence: 'low',
          needsClarification: true,
          clarificationReason: 'no_destination_provided'
        };
      }
      // For longer phrases starting with these, check if there's a destination after
      const remainingText = lower.replace(/^(yes|no|okay|sure|help|please|i need|i want|can you|could you|will you|hello|hi|hey|good morning|good afternoon)\s*/i, '').trim();
      if (remainingText) {
        // Process the remaining text as potential destination
        return this.analyzeDestination(remainingText);
      }
      return {
        field: 'destination',
        value: null,
        confidence: 'low',
        needsClarification: true,
        clarificationReason: 'no_destination_provided'
      };
    }

    // Check for vague regions
    const vagueRegions = ['europe', 'asia', 'africa', 'america', 'somewhere'];
    if (vagueRegions.some(region => trimmed.toLowerCase() === region)) {
      return {
        field: 'destination',
        value: trimmed,
        confidence: 'low',
        needsClarification: true,
        clarificationReason: 'too_vague'
      };
    }

    // Check for multiple destinations
    const multiCityIndicators = [' and ', ', ', ' then ', ' followed by '];
    const hasMultiple = multiCityIndicators.some(indicator => message.includes(indicator));

    if (hasMultiple) {
      // Split and clean destinations
      const destinations = message
        .split(/\s+and\s+|,\s*|\s+then\s+|\s+followed by\s+/)
        .map(d => d.trim())
        .filter(d => d.length > 0);

      if (destinations.length > 5) {
        return {
          field: 'destination',
          value: destinations.slice(0, 5).join(' and '),
          confidence: 'medium',
          needsClarification: true,
          clarificationReason: 'too_many_destinations'
        };
      }

      return {
        field: 'destination',
        value: destinations.join(' and '),
        confidence: 'high',
        needsClarification: false
      };
    }

    // Single destination - validate it's reasonable
    if (trimmed.length < 2) {
      return {
        field: 'destination',
        value: null,
        confidence: 'low',
        needsClarification: true,
        clarificationReason: 'too_short'
      };
    }

    // Check if it looks like an actual place name
    // Place names usually start with capital letter or are well-known cities
    const looksLikePlace = /^[A-Z]/.test(trimmed) || this.isKnownDestination(lower);

    // Additional checks for non-destinations
    const sentenceLike = trimmed.includes(' ') && trimmed.split(' ').length > 4;
    const hasVerb = /\b(is|are|was|were|go|went|want|need|have|has|had|do|does|did)\b/i.test(lower);

    if (!looksLikePlace && (sentenceLike || hasVerb)) {
      // Probably a phrase or sentence, not a destination
      return {
        field: 'destination',
        value: null,
        confidence: 'low',
        needsClarification: true,
        clarificationReason: 'not_a_destination'
      };
    }

    return {
      field: 'destination',
      value: trimmed,
      confidence: 'high',
      needsClarification: false
    };
  }

  /**
   * Analyze dates from user input
   */
  private analyzeDates(message: string, _context?: CollectedData): AnalysisResult {
    const lower = message.toLowerCase();

    if (this.isUncertain(message)) {
      return {
        field: 'dates',
        value: null,
        confidence: 'low',
        needsClarification: true,
        clarificationReason: 'uncertain'
      };
    }

    // Common date patterns
    const patterns = {
      nextWeek: /next week/i,
      nextMonth: /next month/i,
      inMonth: /in (january|february|march|april|may|june|july|august|september|october|november|december)/i,
      specificDate: /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.]?(\d{2,4})?/,
      monthDay: /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i,
      dayMonth: /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i,
      season: /(spring|summer|fall|autumn|winter)/i,
      relative: /(tomorrow|day after tomorrow|this weekend|next weekend)/i
    };

    // Check each pattern
    for (const [type, pattern] of Object.entries(patterns)) {
      const match = message.match(pattern);
      if (match) {
        return {
          field: 'dates',
          value: message.trim(), // Keep original format for now
          confidence: type === 'season' ? 'medium' : 'high',
          needsClarification: type === 'season',
          clarificationReason: type === 'season' ? 'season_too_vague' : undefined
        };
      }
    }

    // Too vague
    return {
      field: 'dates',
      value: message,
      confidence: 'low',
      needsClarification: true,
      clarificationReason: 'unclear_date'
    };
  }

  /**
   * Analyze duration from user input
   */
  private analyzeDuration(message: string, _context?: CollectedData): AnalysisResult {
    const lower = message.toLowerCase();

    if (this.isUncertain(message)) {
      return {
        field: 'duration',
        value: null,
        confidence: 'low',
        needsClarification: true,
        clarificationReason: 'uncertain'
      };
    }

    // Extract numbers
    const numberMatch = message.match(/(\d+)/);
    if (numberMatch) {
      const days = parseInt(numberMatch[1]);

      // Validate reasonable duration
      if (days < 1) {
        return {
          field: 'duration',
          value: days,
          confidence: 'low',
          needsClarification: true,
          clarificationReason: 'too_short'
        };
      }

      if (days > 30) {
        return {
          field: 'duration',
          value: days,
          confidence: 'medium',
          needsClarification: true,
          clarificationReason: 'too_long'
        };
      }

      return {
        field: 'duration',
        value: days,
        confidence: 'high',
        needsClarification: false
      };
    }

    // Check for word numbers
    const wordNumbers: { [key: string]: number } = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'weekend': 2, 'week': 7, 'fortnight': 14, 'month': 30
    };

    for (const [word, value] of Object.entries(wordNumbers)) {
      if (lower.includes(word)) {
        // Handle "a week" or "one week"
        if (word === 'week' && (lower.includes('a week') || lower.includes('one week'))) {
          return {
            field: 'duration',
            value: 7,
            confidence: 'high',
            needsClarification: false
          };
        }

        return {
          field: 'duration',
          value: value,
          confidence: 'high',
          needsClarification: false
        };
      }
    }

    // Check for ranges
    if (lower.includes('about') || lower.includes('around') || lower.includes('approximately')) {
      return {
        field: 'duration',
        value: message,
        confidence: 'medium',
        needsClarification: true,
        clarificationReason: 'approximate_duration'
      };
    }

    return {
      field: 'duration',
      value: null,
      confidence: 'low',
      needsClarification: true,
      clarificationReason: 'unclear_duration'
    };
  }

  /**
   * Analyze traveler information
   */
  private analyzeTravelers(message: string): AnalysisResult {
    const lower = message.toLowerCase();

    if (this.isUncertain(message)) {
      // It's okay to not know travelers - this is optional
      return {
        field: 'travelers',
        value: null,
        confidence: 'low',
        needsClarification: false // Don't push for this
      };
    }

    // Solo patterns
    if (lower.includes('solo') || lower.includes('alone') || lower.includes('myself') ||
        lower.includes('just me') || lower === 'me') {
      const travelerInfo: TravelerInfo = {
        count: 1,
        type: 'solo'
      };
      return {
        field: 'travelers',
        value: travelerInfo,
        confidence: 'high',
        needsClarification: false
      };
    }

    // Couple patterns
    if (lower.includes('wife') || lower.includes('husband') || lower.includes('partner') ||
        lower.includes('girlfriend') || lower.includes('boyfriend') || lower.includes('spouse') ||
        lower.includes('significant other') || lower.includes('couple')) {
      const travelerInfo: TravelerInfo = {
        count: 2,
        type: 'couple'
      };
      return {
        field: 'travelers',
        value: travelerInfo,
        confidence: 'high',
        needsClarification: false
      };
    }

    // Family patterns
    if (lower.includes('family') || lower.includes('kids') || lower.includes('children')) {
      const numberMatch = message.match(/(\d+)/);
      const count = numberMatch ? parseInt(numberMatch[1]) : 4; // Default family size
      const travelerInfo: TravelerInfo = {
        count: count,
        type: 'family',
        description: message
      };
      return {
        field: 'travelers',
        value: travelerInfo,
        confidence: 'medium',
        needsClarification: false
      };
    }

    // Group/friends patterns
    if (lower.includes('friends') || lower.includes('group')) {
      const numberMatch = message.match(/(\d+)/);
      const count = numberMatch ? parseInt(numberMatch[1]) : 3; // Default group size
      const travelerInfo: TravelerInfo = {
        count: count,
        type: 'group',
        description: message
      };
      return {
        field: 'travelers',
        value: travelerInfo,
        confidence: 'medium',
        needsClarification: false
      };
    }

    // Try to extract number
    const numberMatch = message.match(/(\d+)/);
    if (numberMatch) {
      const count = parseInt(numberMatch[1]);
      const travelerInfo: TravelerInfo = {
        count: count,
        type: count === 1 ? 'solo' : count === 2 ? 'couple' : 'group'
      };
      return {
        field: 'travelers',
        value: travelerInfo,
        confidence: 'high',
        needsClarification: false
      };
    }

    return {
      field: 'travelers',
      value: message,
      confidence: 'low',
      needsClarification: true,
      clarificationReason: 'unclear_travelers'
    };
  }

  /**
   * Analyze preferences
   */
  private analyzePreferences(message: string): AnalysisResult {
    const lower = message.toLowerCase();
    const preferences: TripPreferences = {};

    // Check for work/coworking needs
    if (lower.includes('work') || lower.includes('coworking') || lower.includes('remote') ||
        lower.includes('digital nomad') || lower.includes('laptop')) {
      preferences.needsCoworking = true;
      preferences.tripType = 'workation';
    }

    // Check for business trip
    if (lower.includes('business') || lower.includes('meeting') || lower.includes('conference')) {
      preferences.tripType = 'business';
    }

    // Extract activities
    const activities: string[] = [];
    const activityKeywords = [
      'museum', 'art', 'history', 'culture', 'food', 'restaurant', 'cuisine',
      'shopping', 'market', 'beach', 'hiking', 'nature', 'outdoor', 'adventure',
      'nightlife', 'bars', 'clubs', 'music', 'concert', 'theater', 'show',
      'spa', 'relax', 'wellness', 'yoga', 'photography', 'architecture'
    ];

    activityKeywords.forEach(keyword => {
      if (lower.includes(keyword)) {
        activities.push(keyword);
      }
    });

    if (activities.length > 0) {
      preferences.activities = activities;
    }

    // Check for budget mentions
    if (lower.includes('budget') || lower.includes('cheap') || lower.includes('affordable')) {
      preferences.budget = 'budget';
    } else if (lower.includes('luxury') || lower.includes('premium') || lower.includes('high-end')) {
      preferences.budget = 'luxury';
    }

    // Dietary restrictions
    const dietary: string[] = [];
    const dietaryKeywords = ['vegetarian', 'vegan', 'halal', 'kosher', 'gluten-free', 'allergy'];
    dietaryKeywords.forEach(keyword => {
      if (lower.includes(keyword)) {
        dietary.push(keyword);
      }
    });

    if (dietary.length > 0) {
      preferences.dietary = dietary;
    }

    // If nothing specific mentioned
    if (Object.keys(preferences).length === 0) {
      if (lower.includes('no') || lower.includes('nothing') || lower.includes('skip')) {
        // User doesn't want to add preferences
        return {
          field: 'preferences',
          value: {},
          confidence: 'high',
          needsClarification: false
        };
      }
    }

    return {
      field: 'preferences',
      value: preferences,
      confidence: 'high',
      needsClarification: false
    };
  }

  /**
   * Analyze confirmation response
   */
  private analyzeConfirmation(message: string): AnalysisResult {
    const lower = message.toLowerCase();

    // Positive confirmation
    const positiveWords = ['yes', 'yeah', 'yep', 'sure', 'correct', 'right', 'perfect',
                          'good', 'great', 'ok', 'okay', 'proceed', 'go ahead', 'confirm'];
    if (positiveWords.some(word => lower.includes(word))) {
      return {
        field: 'confirmation',
        value: true,
        confidence: 'high',
        needsClarification: false
      };
    }

    // Negative or wants changes
    const negativeWords = ['no', 'nope', 'wrong', 'change', 'different', 'modify',
                          'update', 'edit', 'actually', 'wait'];
    if (negativeWords.some(word => lower.includes(word))) {
      return {
        field: 'confirmation',
        value: false,
        confidence: 'high',
        needsClarification: true,
        clarificationReason: 'wants_changes'
      };
    }

    // Unclear
    return {
      field: 'confirmation',
      value: null,
      confidence: 'low',
      needsClarification: true,
      clarificationReason: 'unclear_confirmation'
    };
  }

  /**
   * General analysis for any message
   */
  private analyzeGeneral(message: string): AnalysisResult {
    // Try to detect what the user is talking about
    const lower = message.toLowerCase();

    // Check if it's a greeting
    if (this.isGreeting(message)) {
      return {
        field: 'greeting',
        value: true,
        confidence: 'high',
        needsClarification: false
      };
    }

    // Check if asking for help
    if (this.isAskingForHelp(message)) {
      return {
        field: 'help',
        value: true,
        confidence: 'high',
        needsClarification: false
      };
    }

    // Check for modification requests
    if (this.isModificationRequest(message)) {
      return {
        field: 'modification',
        value: message,
        confidence: 'high',
        needsClarification: false
      };
    }

    return {
      field: 'general',
      value: message,
      confidence: 'low',
      needsClarification: true,
      clarificationReason: 'unclear_intent'
    };
  }

  /**
   * Check if user is uncertain
   */
  private isUncertain(message: string): boolean {
    const uncertainPhrases = [
      "i don't know", "i'm not sure", "not sure", "maybe", "possibly",
      "i guess", "whatever", "doesn't matter", "no idea", "dunno",
      "help me decide", "you choose", "you pick", "suggest something"
    ];
    const lower = message.toLowerCase();
    return uncertainPhrases.some(phrase => lower.includes(phrase));
  }

  /**
   * Check if message is a greeting
   */
  private isGreeting(message: string): boolean {
    const greetings = ['hello', 'hi', 'hey', 'greetings', 'good morning',
                      'good afternoon', 'good evening', 'howdy'];
    const lower = message.toLowerCase();
    return greetings.some(greeting => lower.startsWith(greeting));
  }

  /**
   * Check if asking for help
   */
  private isAskingForHelp(message: string): boolean {
    const helpPhrases = ['help', 'assist', 'plan', 'create', 'make', 'build',
                        'can you', 'could you', 'would you', 'will you'];
    const lower = message.toLowerCase();
    return helpPhrases.some(phrase => lower.includes(phrase));
  }

  /**
   * Check if requesting modifications
   */
  private isModificationRequest(message: string): boolean {
    const modificationWords = ['change', 'modify', 'update', 'add', 'remove',
                              'replace', 'switch', 'different', 'instead'];
    const lower = message.toLowerCase();
    return modificationWords.some(word => lower.includes(word));
  }

  /**
   * Check if it's a known destination
   */
  private isKnownDestination(lower: string): boolean {
    const knownPlaces = [
      'paris', 'london', 'tokyo', 'new york', 'barcelona', 'rome', 'amsterdam',
      'berlin', 'madrid', 'lisbon', 'prague', 'vienna', 'budapest', 'athens',
      'dublin', 'edinburgh', 'stockholm', 'copenhagen', 'oslo', 'helsinki',
      'warsaw', 'krakow', 'moscow', 'istanbul', 'dubai', 'singapore', 'bangkok',
      'hong kong', 'seoul', 'beijing', 'shanghai', 'sydney', 'melbourne',
      'toronto', 'vancouver', 'montreal', 'mexico city', 'buenos aires',
      'rio de janeiro', 'sao paulo', 'lima', 'bogota', 'santiago', 'cairo',
      'marrakech', 'cape town', 'mumbai', 'delhi', 'bangalore', 'kyoto',
      'osaka', 'san francisco', 'los angeles', 'chicago', 'boston', 'miami',
      'seattle', 'portland', 'austin', 'denver', 'nashville', 'las vegas'
    ];
    return knownPlaces.some(place => lower.includes(place));
  }
}