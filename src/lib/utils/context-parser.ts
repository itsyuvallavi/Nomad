/**
 * Context-Aware Parser
 * Enhances parsing by using conversation history and user context
 */

import { ParsedTravelRequest } from './master-parser';
import { TravelEntities, TripType } from './nlp-parser';
import { enhancedLogger } from './enhanced-logger';

export interface TravelContext {
  // Conversation context
  previousDestinations: string[];
  mentionedDates: Date[];
  discussedBudget?: { amount: number; currency: string };
  travelerCount?: number;
  origin?: string;
  
  // User preferences (learned over time)
  preferredTripTypes: TripType[];
  typicalDuration: number;
  budgetRange: { min: number; max: number };
  favoriteActivities: string[];
  
  // Session context
  sessionId: string;
  conversationLength: number;
  lastQuery: string;
  timestamp: Date;
}

export interface EnhancedInput {
  original: string;
  enriched: string;
  extractedContext: Partial<TravelContext>;
  confidence: 'high' | 'medium' | 'low';
}

export interface UserProfile {
  userId?: string;
  searchHistory: string[];
  confirmedTrips: ParsedTravelRequest[];
  preferences: {
    defaultDuration: number;
    defaultBudget: number;
    preferredActivities: string[];
    favoriteDestinations: string[];
  };
}

export class ContextAwareParser {
  /**
   * Extract context from conversation history
   */
  static extractContext(history: string | undefined): TravelContext {
    const context: TravelContext = {
      previousDestinations: [],
      mentionedDates: [],
      preferredTripTypes: [],
      typicalDuration: 7,
      budgetRange: { min: 100, max: 500 },
      favoriteActivities: [],
      sessionId: `session_${Date.now()}`,
      conversationLength: 0,
      lastQuery: '',
      timestamp: new Date()
    };

    if (!history) {
      return context;
    }

    try {
      const lines = history.split('\n');
      context.conversationLength = lines.length;

      // Extract destinations mentioned
      const destinationPatterns = [
        /(?:visit|go to|travel to|trip to|fly to)\s+([A-Z][a-zA-Z\s]+?)(?:\.|,|\s+and|\s+or|$)/gi,
        /(?:in|at|to)\s+([A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]+)*)/g,
      ];

      destinationPatterns.forEach(pattern => {
        const matches = history.matchAll(pattern);
        for (const match of matches) {
          const dest = match[1].trim();
          if (dest.length > 2 && dest.length < 50) {
            context.previousDestinations.push(dest);
          }
        }
      });

      // Extract dates mentioned
      const datePatterns = [
        /(\d{1,2}\/\d{1,2}\/\d{2,4})/g,
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}/gi,
        /next\s+(week|month|year)/gi,
        /(spring|summer|fall|autumn|winter)\s+\d{4}/gi,
      ];

      datePatterns.forEach(pattern => {
        const matches = history.matchAll(pattern);
        for (const match of matches) {
          try {
            // Simple date parsing - in production would use date-fns
            const dateStr = match[0];
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              context.mentionedDates.push(date);
            }
          } catch (e) {
            // Ignore invalid dates
          }
        }
      });

      // Extract budget
      const budgetMatch = history.match(/\$\s?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
      if (budgetMatch) {
        const amount = parseFloat(budgetMatch[1].replace(/,/g, ''));
        context.discussedBudget = { amount, currency: 'USD' };
      }

      // Extract traveler count
      const travelerPatterns = [
        /(\d+)\s*(?:people|persons|travelers|adults)/i,
        /family\s+of\s+(\d+)/i,
        /group\s+of\s+(\d+)/i,
        /(solo|alone)/i,
        /(couple|honeymoon|two of us)/i,
      ];

      for (const pattern of travelerPatterns) {
        const match = history.match(pattern);
        if (match) {
          if (match[1] === 'solo' || match[1] === 'alone') {
            context.travelerCount = 1;
          } else if (match[1] === 'couple' || match[1] === 'honeymoon' || match[1] === 'two of us') {
            context.travelerCount = 2;
          } else if (match[1]) {
            context.travelerCount = parseInt(match[1]);
          }
          break;
        }
      }

      // Extract origin
      const originPatterns = [
        /(?:from|leaving from|departing from)\s+([A-Z][a-zA-Z\s]+?)(?:\.|,|\s+to)/i,
        /(?:I'm|we're|I am|we are)\s+(?:in|from|based in)\s+([A-Z][a-zA-Z\s]+?)(?:\.|,|$)/i,
      ];

      for (const pattern of originPatterns) {
        const match = history.match(pattern);
        if (match) {
          context.origin = match[1].trim();
          break;
        }
      }

      // Extract last user query
      const userLines = lines.filter(line => line.startsWith('user:'));
      if (userLines.length > 0) {
        context.lastQuery = userLines[userLines.length - 1].replace('user:', '').trim();
      }

      enhancedLogger.info('CONTEXT', 'Extracted context from history', {
        destinations: context.previousDestinations.length,
        dates: context.mentionedDates.length,
        hasBudget: !!context.discussedBudget,
        hasOrigin: !!context.origin
      });

    } catch (error: any) {
      enhancedLogger.error('CONTEXT', 'Failed to extract context', error);
    }

    return context;
  }

  /**
   * Merge current input with extracted context
   */
  static mergeWithContext(input: string, context: TravelContext): EnhancedInput {
    let enriched = input;
    const extractedContext: Partial<TravelContext> = {};
    let confidence: 'high' | 'medium' | 'low' = 'low';

    try {
      // Check if input is missing origin but context has it
      if (!input.toLowerCase().includes('from') && context.origin) {
        enriched += ` from ${context.origin}`;
        extractedContext.origin = context.origin;
        confidence = 'medium';
        
        enhancedLogger.info('CONTEXT', 'Added origin from context', { origin: context.origin });
      }

      // Check if input is missing traveler count but context has it
      if (context.travelerCount && !this.hasTravelerInfo(input)) {
        const travelerText = context.travelerCount === 1 ? 'solo' : 
                           context.travelerCount === 2 ? 'for two' : 
                           `for ${context.travelerCount} people`;
        enriched += ` ${travelerText}`;
        extractedContext.travelerCount = context.travelerCount;
        
        enhancedLogger.info('CONTEXT', 'Added traveler count from context', { 
          count: context.travelerCount 
        });
      }

      // Check if input is missing budget but context has it
      if (context.discussedBudget && !input.includes('$') && !input.toLowerCase().includes('budget')) {
        enriched += ` with budget $${context.discussedBudget.amount}`;
        extractedContext.discussedBudget = context.discussedBudget;
        
        enhancedLogger.info('CONTEXT', 'Added budget from context', { 
          budget: context.discussedBudget 
        });
      }

      // Check for incomplete destination references
      if (this.hasIncompleteReference(input)) {
        // Try to resolve "there" or "that place" references
        if (context.previousDestinations.length > 0) {
          const lastDestination = context.previousDestinations[context.previousDestinations.length - 1];
          enriched = enriched.replace(/\b(there|that place|that city)\b/gi, lastDestination);
          extractedContext.previousDestinations = [lastDestination];
          confidence = 'high';
          
          enhancedLogger.info('CONTEXT', 'Resolved destination reference', { 
            destination: lastDestination 
          });
        }
      }

      // Add dates from context if missing
      if (!this.hasDateInfo(input) && context.mentionedDates.length > 0) {
        const lastDate = context.mentionedDates[context.mentionedDates.length - 1];
        const dateStr = lastDate.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric' 
        });
        enriched += ` starting ${dateStr}`;
        extractedContext.mentionedDates = [lastDate];
        
        enhancedLogger.info('CONTEXT', 'Added date from context', { date: dateStr });
      }

      // Set confidence based on how much context was used
      const contextUsed = Object.keys(extractedContext).length;
      if (contextUsed === 0) {
        confidence = 'low';
      } else if (contextUsed === 1) {
        confidence = 'medium';
      } else {
        confidence = 'high';
      }

    } catch (error: any) {
      enhancedLogger.error('CONTEXT', 'Failed to merge with context', error);
    }

    return {
      original: input,
      enriched,
      extractedContext,
      confidence
    };
  }

  /**
   * Apply smart defaults based on user profile
   */
  static applySmartDefaults(
    result: ParsedTravelRequest,
    userProfile: UserProfile | null
  ): ParsedTravelRequest {
    if (!userProfile) {
      return result;
    }

    const enhanced = { ...result };

    try {
      // Apply default duration if not specified
      if (!enhanced.duration || enhanced.duration === 7) {
        enhanced.duration = userProfile.preferences.defaultDuration;
        enhancedLogger.info('CONTEXT', 'Applied default duration', { 
          duration: enhanced.duration 
        });
      }

      // Apply default budget if not specified
      if (!enhanced.budget) {
        enhanced.budget = {
          amount: userProfile.preferences.defaultBudget,
          currency: 'USD',
          perPerson: false
        };
        enhancedLogger.info('CONTEXT', 'Applied default budget', { 
          budget: enhanced.budget 
        });
      }

      // Add favorite activities if no activities specified
      if (enhanced.activities.length === 0 && userProfile.preferences.preferredActivities.length > 0) {
        enhanced.activities = userProfile.preferences.preferredActivities.slice(0, 3);
        enhancedLogger.info('CONTEXT', 'Added preferred activities', { 
          activities: enhanced.activities 
        });
      }

      // Boost confidence if destination is a favorite
      if (userProfile.preferences.favoriteDestinations.some(fav => 
        enhanced.destinations.some(dest => 
          dest.city.toLowerCase().includes(fav.toLowerCase())
        )
      )) {
        enhanced.confidence = 'high';
        enhancedLogger.info('CONTEXT', 'Boosted confidence for favorite destination');
      }

      // Add personalized suggestions
      const suggestions = [];
      
      // Suggest favorite destinations not in current list
      const missingFavorites = userProfile.preferences.favoriteDestinations.filter(fav =>
        !enhanced.destinations.some(dest => 
          dest.city.toLowerCase().includes(fav.toLowerCase())
        )
      );
      
      if (missingFavorites.length > 0) {
        suggestions.push(`You might also enjoy ${missingFavorites[0]} based on your preferences`);
      }

      if (suggestions.length > 0) {
        enhanced.suggestions = [...(enhanced.suggestions || []), ...suggestions];
      }

    } catch (error: any) {
      enhancedLogger.error('CONTEXT', 'Failed to apply smart defaults', error);
    }

    return enhanced;
  }

  /**
   * Check if input has traveler information
   */
  private static hasTravelerInfo(input: string): boolean {
    const patterns = [
      /\b(solo|alone|myself)\b/i,
      /\b(couple|honeymoon|two of us)\b/i,
      /\b(family|group)\b/i,
      /\b\d+\s*(people|persons|travelers|adults)\b/i,
    ];
    
    return patterns.some(pattern => pattern.test(input));
  }

  /**
   * Check if input has date information
   */
  private static hasDateInfo(input: string): boolean {
    const patterns = [
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
      /\b(next|this|coming)\s+(week|month|year)\b/i,
      /\b(spring|summer|fall|autumn|winter)\b/i,
      /\b\d{1,2}\/\d{1,2}\b/,
      /\b(tomorrow|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    ];
    
    return patterns.some(pattern => pattern.test(input));
  }

  /**
   * Check if input has incomplete references
   */
  private static hasIncompleteReference(input: string): boolean {
    const patterns = [
      /\b(there|that place|that city|that country)\b/i,
      /\bthe same\b/i,
      /\bit\b(?!\s+is|\s+was|\s+will)/i, // "it" not followed by verb
    ];
    
    return patterns.some(pattern => pattern.test(input));
  }

  /**
   * Build user profile from search history
   */
  static buildUserProfile(searchHistory: string[]): UserProfile {
    const profile: UserProfile = {
      searchHistory,
      confirmedTrips: [],
      preferences: {
        defaultDuration: 7,
        defaultBudget: 2000,
        preferredActivities: [],
        favoriteDestinations: []
      }
    };

    // Analyze search history for patterns
    if (searchHistory.length > 0) {
      // Extract common durations
      const durations: number[] = [];
      searchHistory.forEach(search => {
        const match = search.match(/(\d+)\s*days?/i);
        if (match) {
          durations.push(parseInt(match[1]));
        }
      });
      
      if (durations.length > 0) {
        profile.preferences.defaultDuration = Math.round(
          durations.reduce((a, b) => a + b, 0) / durations.length
        );
      }

      // Extract common destinations
      const destinations = new Map<string, number>();
      const cities = [
        'Paris', 'London', 'Tokyo', 'New York', 'Bali', 'Thailand',
        'Rome', 'Barcelona', 'Amsterdam', 'Dubai', 'Singapore'
      ];
      
      searchHistory.forEach(search => {
        cities.forEach(city => {
          if (search.toLowerCase().includes(city.toLowerCase())) {
            destinations.set(city, (destinations.get(city) || 0) + 1);
          }
        });
      });

      // Set favorite destinations (mentioned 2+ times)
      destinations.forEach((count, city) => {
        if (count >= 2) {
          profile.preferences.favoriteDestinations.push(city);
        }
      });
    }

    return profile;
  }
}