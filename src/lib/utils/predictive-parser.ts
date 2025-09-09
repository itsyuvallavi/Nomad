/**
 * Predictive Parser
 * Provides auto-completion, suggestions, and predictive features
 */

import { ParsedTravelRequest } from './master-parser';
import { TravelContext } from './context-parser';
import { enhancedLogger } from './enhanced-logger';

export interface Suggestion {
  type: 'destination' | 'date' | 'duration' | 'activity' | 'budget';
  value: string;
  confidence: number;
  reason: string;
}

export interface Completion {
  text: string;
  category: string;
  popularity: number;
}

export interface PredictedInfo {
  destinations?: string[];
  duration?: number;
  budget?: number;
  activities?: string[];
  confidence: number;
}

// Popular destinations database
const POPULAR_DESTINATIONS = [
  { name: 'Paris', country: 'France', tags: ['romantic', 'culture', 'food'], popularity: 10 },
  { name: 'London', country: 'UK', tags: ['history', 'culture', 'shopping'], popularity: 9 },
  { name: 'Tokyo', country: 'Japan', tags: ['technology', 'culture', 'food'], popularity: 9 },
  { name: 'New York', country: 'USA', tags: ['city', 'culture', 'shopping'], popularity: 10 },
  { name: 'Bali', country: 'Indonesia', tags: ['beach', 'relaxation', 'nature'], popularity: 8 },
  { name: 'Bangkok', country: 'Thailand', tags: ['food', 'temples', 'shopping'], popularity: 8 },
  { name: 'Rome', country: 'Italy', tags: ['history', 'food', 'art'], popularity: 9 },
  { name: 'Barcelona', country: 'Spain', tags: ['beach', 'architecture', 'food'], popularity: 8 },
  { name: 'Dubai', country: 'UAE', tags: ['luxury', 'shopping', 'modern'], popularity: 7 },
  { name: 'Singapore', country: 'Singapore', tags: ['food', 'modern', 'shopping'], popularity: 7 },
  { name: 'Amsterdam', country: 'Netherlands', tags: ['culture', 'canals', 'liberal'], popularity: 7 },
  { name: 'Istanbul', country: 'Turkey', tags: ['history', 'culture', 'food'], popularity: 6 },
  { name: 'Sydney', country: 'Australia', tags: ['beach', 'nature', 'city'], popularity: 7 },
  { name: 'Lisbon', country: 'Portugal', tags: ['affordable', 'food', 'culture'], popularity: 6 },
  { name: 'Prague', country: 'Czech Republic', tags: ['affordable', 'history', 'beer'], popularity: 6 }
];

// Activity suggestions
const ACTIVITY_CATEGORIES = {
  cultural: ['museums', 'art galleries', 'historical sites', 'local markets', 'cultural shows'],
  adventure: ['hiking', 'water sports', 'zip-lining', 'rock climbing', 'skydiving'],
  relaxation: ['spa', 'beach', 'yoga', 'meditation', 'wellness retreat'],
  food: ['food tours', 'cooking classes', 'wine tasting', 'street food', 'fine dining'],
  family: ['theme parks', 'aquariums', 'zoos', 'interactive museums', 'playgrounds'],
  nightlife: ['clubs', 'bars', 'live music', 'rooftop lounges', 'night markets']
};

// Smart prompts templates
const SMART_PROMPTS = [
  "How about a {duration}-day trip to {destination} from {origin}?",
  "Interested in exploring {destination} for {duration} days?",
  "Planning a {tripType} trip to {destination}?",
  "Looking for {activity} experiences in {destination}?",
  "{season} is perfect for visiting {destination}",
  "Budget-friendly {duration}-day itinerary for {destination}?",
  "Family adventure in {destination} for {duration} days?",
  "Romantic getaway to {destination}?"
];

export class PredictiveParser {
  /**
   * Suggest completions for partial input
   */
  static async suggestCompletions(partialInput: string): Promise<Completion[]> {
    const completions: Completion[] = [];
    const input = partialInput.toLowerCase().trim();

    try {
      // Check for destination completions
      if (this.isLookingForDestination(input)) {
        const lastWord = input.split(' ').pop() || '';
        
        POPULAR_DESTINATIONS.forEach(dest => {
          if (dest.name.toLowerCase().startsWith(lastWord) && lastWord.length > 0) {
            completions.push({
              text: `${partialInput.slice(0, -lastWord.length)}${dest.name}`,
              category: 'destination',
              popularity: dest.popularity
            });
          }
        });
      }

      // Check for duration completions
      if (input.includes('for') && !input.match(/\d+\s*days?/)) {
        const durations = ['3 days', '5 days', '1 week', '10 days', '2 weeks'];
        durations.forEach((duration, index) => {
          completions.push({
            text: `${partialInput} ${duration}`,
            category: 'duration',
            popularity: 5 - index
          });
        });
      }

      // Check for origin completions
      if (input.includes('from') && input.split('from').pop()!.trim().split(' ').length <= 2) {
        const origins = ['New York', 'Los Angeles', 'Chicago', 'San Francisco', 'Boston'];
        const lastWord = input.split(' ').pop() || '';
        
        origins.forEach((origin, index) => {
          if (origin.toLowerCase().startsWith(lastWord)) {
            completions.push({
              text: `${partialInput.slice(0, -lastWord.length)}${origin}`,
              category: 'origin',
              popularity: 5 - index
            });
          }
        });
      }

      // Sort by popularity
      completions.sort((a, b) => b.popularity - a.popularity);

      enhancedLogger.info('PREDICTIVE', 'Generated completions', {
        input: partialInput,
        completionCount: completions.length
      });

    } catch (error: any) {
      enhancedLogger.error('PREDICTIVE', 'Failed to generate completions', error);
    }

    return completions.slice(0, 5); // Return top 5
  }

  /**
   * Predict missing information based on partial parse
   */
  static async predictMissingInfo(
    parsed: Partial<ParsedTravelRequest>
  ): Promise<PredictedInfo> {
    const predicted: PredictedInfo = {
      confidence: 0.5
    };

    try {
      // Predict duration based on destinations
      if (parsed.destinations && parsed.destinations.length > 0 && !parsed.duration) {
        const destCount = parsed.destinations.length;
        if (destCount === 1) {
          predicted.duration = 5; // Single city: 5 days
        } else if (destCount === 2) {
          predicted.duration = 7; // Two cities: 1 week
        } else {
          predicted.duration = destCount * 4; // Multiple cities: 4 days each
        }
        predicted.confidence = 0.7;
      }

      // Predict budget based on destinations and duration
      if (!parsed.budget && parsed.destinations && parsed.duration) {
        const destinations = parsed.destinations.map(d => d.city.toLowerCase());
        let dailyBudget = 150; // Default

        // Adjust based on destination
        if (destinations.some(d => ['dubai', 'singapore', 'tokyo', 'london', 'paris'].includes(d))) {
          dailyBudget = 250; // Expensive destinations
        } else if (destinations.some(d => ['bangkok', 'lisbon', 'prague', 'budapest'].includes(d))) {
          dailyBudget = 100; // Budget destinations
        }

        predicted.budget = dailyBudget * (parsed.duration || 7);
        predicted.confidence = 0.6;
      }

      // Predict activities based on trip type and destinations
      if (parsed.tripType && (!parsed.activities || parsed.activities.length === 0)) {
        switch (parsed.tripType) {
          case 'honeymoon':
          case 'romantic':
            predicted.activities = ['romantic dinners', 'couples spa', 'sunset viewing'];
            break;
          case 'adventure':
            predicted.activities = ACTIVITY_CATEGORIES.adventure.slice(0, 3);
            break;
          case 'family':
            predicted.activities = ACTIVITY_CATEGORIES.family.slice(0, 3);
            break;
          case 'business':
            predicted.activities = ['networking events', 'conference venues', 'business dinners'];
            break;
          default:
            predicted.activities = ['sightseeing', 'local cuisine', 'cultural experiences'];
        }
        predicted.confidence = 0.8;
      }

      // Predict destinations based on activities
      if (parsed.activities && parsed.activities.length > 0 && 
          (!parsed.destinations || parsed.destinations.length === 0)) {
        const activities = parsed.activities.map(a => a.toLowerCase());
        const matches: string[] = [];

        POPULAR_DESTINATIONS.forEach(dest => {
          const matchScore = dest.tags.filter(tag => 
            activities.some(activity => activity.includes(tag) || tag.includes(activity))
          ).length;
          
          if (matchScore > 0) {
            matches.push(dest.name);
          }
        });

        if (matches.length > 0) {
          predicted.destinations = matches.slice(0, 3);
          predicted.confidence = 0.6;
        }
      }

      enhancedLogger.info('PREDICTIVE', 'Predicted missing info', {
        hasDuration: !!predicted.duration,
        hasBudget: !!predicted.budget,
        hasActivities: !!predicted.activities,
        confidence: predicted.confidence
      });

    } catch (error: any) {
      enhancedLogger.error('PREDICTIVE', 'Failed to predict missing info', error);
    }

    return predicted;
  }

  /**
   * Generate smart prompts based on context
   */
  static generateSmartPrompts(context: TravelContext): string[] {
    const prompts: string[] = [];

    try {
      // Get season
      const month = new Date().getMonth();
      const season = month >= 2 && month <= 4 ? 'Spring' :
                    month >= 5 && month <= 7 ? 'Summer' :
                    month >= 8 && month <= 10 ? 'Fall' : 'Winter';

      // Generate prompts based on context
      if (context.origin) {
        // Suggest popular routes from origin
        const popularFromOrigin = this.getPopularRoutesFrom(context.origin);
        popularFromOrigin.forEach(dest => {
          prompts.push(`How about a 5-day trip to ${dest} from ${context.origin}?`);
        });
      }

      // Seasonal suggestions
      const seasonalDestinations = this.getSeasonalDestinations(season);
      seasonalDestinations.forEach(dest => {
        prompts.push(`${season} is perfect for visiting ${dest}`);
      });

      // Based on previous destinations
      if (context.previousDestinations.length > 0) {
        const similar = this.getSimilarDestinations(context.previousDestinations[0]);
        similar.forEach(dest => {
          prompts.push(`Since you liked ${context.previousDestinations[0]}, you might enjoy ${dest}`);
        });
      }

      // Trip type suggestions
      const tripTypes = ['weekend getaway', 'adventure trip', 'cultural journey', 'beach vacation'];
      tripTypes.forEach(type => {
        const dest = POPULAR_DESTINATIONS[Math.floor(Math.random() * 5)].name;
        prompts.push(`Planning a ${type} to ${dest}?`);
      });

      // Budget-based suggestions
      if (context.discussedBudget) {
        const budgetFriendly = this.getBudgetDestinations(context.discussedBudget.amount);
        budgetFriendly.forEach(dest => {
          prompts.push(`${dest} is perfect for your $${context.discussedBudget!.amount} budget`);
        });
      }

      enhancedLogger.info('PREDICTIVE', 'Generated smart prompts', {
        promptCount: prompts.length,
        hasOrigin: !!context.origin,
        hasPrevious: context.previousDestinations.length > 0
      });

    } catch (error: any) {
      enhancedLogger.error('PREDICTIVE', 'Failed to generate prompts', error);
    }

    return prompts.slice(0, 5); // Return top 5 prompts
  }

  /**
   * Generate suggestions for improving the query
   */
  static generateSuggestions(
    parsed: ParsedTravelRequest,
    context: TravelContext
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];

    try {
      // Suggest adding origin if missing
      if (!parsed.origin) {
        suggestions.push({
          type: 'destination',
          value: 'Add your departure city for accurate flight information',
          confidence: 0.9,
          reason: 'Origin needed for flight calculations'
        });
      }

      // Suggest duration if missing
      if (!parsed.duration || parsed.duration === 7) {
        suggestions.push({
          type: 'duration',
          value: 'Specify trip length (e.g., "5 days" or "2 weeks")',
          confidence: 0.8,
          reason: 'Custom duration for better planning'
        });
      }

      // Suggest activities based on destination
      if (parsed.destinations.length > 0 && parsed.activities.length === 0) {
        const dest = parsed.destinations[0].city.toLowerCase();
        const destInfo = POPULAR_DESTINATIONS.find(d => 
          d.name.toLowerCase() === dest
        );
        
        if (destInfo) {
          const activities = destInfo.tags.map(tag => {
            const category = Object.entries(ACTIVITY_CATEGORIES).find(([_, acts]) =>
              acts.some(act => act.includes(tag))
            );
            return category ? category[1][0] : tag;
          });

          suggestions.push({
            type: 'activity',
            value: `Popular in ${parsed.destinations[0].city}: ${activities.join(', ')}`,
            confidence: 0.7,
            reason: 'Enhance itinerary with activities'
          });
        }
      }

      // Suggest budget if not specified
      if (!parsed.budget) {
        const estimatedBudget = this.estimateBudget(parsed);
        suggestions.push({
          type: 'budget',
          value: `Typical budget: $${estimatedBudget} for this trip`,
          confidence: 0.6,
          reason: 'Help tailor recommendations to budget'
        });
      }

      // Suggest similar destinations
      if (parsed.destinations.length === 1) {
        const similar = this.getSimilarDestinations(parsed.destinations[0].city);
        if (similar.length > 0) {
          suggestions.push({
            type: 'destination',
            value: `Also consider: ${similar.join(', ')}`,
            confidence: 0.5,
            reason: 'Similar destinations you might enjoy'
          });
        }
      }

    } catch (error: any) {
      enhancedLogger.error('PREDICTIVE', 'Failed to generate suggestions', error);
    }

    return suggestions;
  }

  /**
   * Check if input is looking for a destination
   */
  private static isLookingForDestination(input: string): boolean {
    const patterns = [
      /trip to\s*$/i,
      /visit\s*$/i,
      /travel to\s*$/i,
      /vacation in\s*$/i,
      /holiday in\s*$/i,
      /\bin\s+\w{0,10}$/i
    ];
    
    return patterns.some(pattern => pattern.test(input));
  }

  /**
   * Get popular routes from an origin
   */
  private static getPopularRoutesFrom(origin: string): string[] {
    const routes: { [key: string]: string[] } = {
      'new york': ['London', 'Paris', 'Miami', 'Los Angeles', 'Boston'],
      'los angeles': ['Las Vegas', 'San Francisco', 'Hawaii', 'Tokyo', 'Mexico City'],
      'chicago': ['New York', 'Miami', 'Denver', 'Nashville', 'New Orleans'],
      'san francisco': ['Los Angeles', 'Seattle', 'Portland', 'Las Vegas', 'San Diego'],
      'boston': ['New York', 'Washington DC', 'Montreal', 'London', 'Dublin']
    };

    const key = origin.toLowerCase();
    return routes[key] || POPULAR_DESTINATIONS.slice(0, 3).map(d => d.name);
  }

  /**
   * Get seasonal destinations
   */
  private static getSeasonalDestinations(season: string): string[] {
    const seasonal: { [key: string]: string[] } = {
      'Spring': ['Japan', 'Netherlands', 'Greece', 'Turkey', 'Morocco'],
      'Summer': ['Iceland', 'Norway', 'Alaska', 'Indonesia', 'Croatia'],
      'Fall': ['India', 'Egypt', 'Jordan', 'New England', 'Germany'],
      'Winter': ['Dubai', 'New Zealand', 'Argentina', 'Thailand', 'Mexico']
    };

    return seasonal[season] || [];
  }

  /**
   * Get similar destinations
   */
  private static getSimilarDestinations(destination: string): string[] {
    const dest = destination.toLowerCase();
    const original = POPULAR_DESTINATIONS.find(d => d.name.toLowerCase() === dest);
    
    if (!original) return [];

    // Find destinations with overlapping tags
    const similar = POPULAR_DESTINATIONS
      .filter(d => d.name.toLowerCase() !== dest)
      .map(d => ({
        name: d.name,
        similarity: d.tags.filter(tag => original.tags.includes(tag)).length
      }))
      .filter(d => d.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)
      .map(d => d.name);

    return similar;
  }

  /**
   * Get budget-friendly destinations
   */
  private static getBudgetDestinations(budget: number): string[] {
    const dailyBudget = budget / 7; // Assume 7-day trip
    
    if (dailyBudget < 100) {
      return ['Bangkok', 'Hanoi', 'Budapest', 'Prague', 'Lisbon'];
    } else if (dailyBudget < 200) {
      return ['Barcelona', 'Rome', 'Berlin', 'Amsterdam', 'Athens'];
    } else {
      return ['Paris', 'London', 'Tokyo', 'Singapore', 'Dubai'];
    }
  }

  /**
   * Estimate budget for a trip
   */
  private static estimateBudget(parsed: ParsedTravelRequest): number {
    const duration = parsed.duration || 7;
    const destinations = parsed.destinations.map(d => d.city.toLowerCase());
    
    let dailyBudget = 150; // Default
    
    // Adjust based on destinations
    if (destinations.some(d => ['dubai', 'singapore', 'tokyo', 'zurich'].includes(d))) {
      dailyBudget = 300;
    } else if (destinations.some(d => ['paris', 'london', 'new york', 'sydney'].includes(d))) {
      dailyBudget = 250;
    } else if (destinations.some(d => ['bangkok', 'prague', 'budapest', 'lisbon'].includes(d))) {
      dailyBudget = 100;
    }

    // Adjust based on trip type
    if (parsed.tripType === 'luxury' || parsed.tripType === 'honeymoon') {
      dailyBudget *= 1.5;
    } else if (parsed.tripType === 'backpacking' || parsed.tripType === 'budget') {
      dailyBudget *= 0.6;
    }

    return Math.round(dailyBudget * duration);
  }
}