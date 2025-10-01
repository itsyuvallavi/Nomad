/**
 * Preference Parser Module
 * Handles extraction of user preferences, interests, and budget
 * Includes traveler count, pace, and special requirements
 */

export interface TravelersInfo {
  adults: number;
  children: number;
}

export interface UserPreferences {
  budget?: 'budget' | 'mid' | 'luxury';
  interests?: string[];
  pace?: 'relaxed' | 'moderate' | 'packed';
  mustSee?: string[];
  avoid?: string[];
}

export type BudgetLevel = 'budget' | 'medium' | 'luxury';

export class PreferenceParser {
  // Interest keywords to detect
  private readonly interestKeywords = [
    'culture', 'history', 'food', 'adventure', 'relaxation', 'nightlife',
    'shopping', 'nature', 'architecture', 'museums', 'beaches', 'hiking',
    'photography', 'local cuisine', 'wine', 'art', 'music', 'festivals',
    'sports', 'wellness', 'spa', 'luxury', 'family', 'romantic', 'backpacking',
    'outdoor', 'urban', 'rural', 'coastal', 'mountain', 'desert', 'wildlife'
  ];

  // Budget-related keywords
  private readonly budgetKeywords = {
    budget: ['budget', 'cheap', 'affordable', 'economical', 'low-cost', 'hostel', 'backpack'],
    medium: ['mid-range', 'moderate', 'standard', 'comfortable'],
    luxury: ['luxury', 'luxurious', 'premium', 'high-end', 'first-class', 'exclusive', 'upscale']
  };

  // Pace-related keywords
  private readonly paceKeywords = {
    relaxed: ['relaxed', 'slow', 'easy', 'leisurely', 'chill', 'laid-back'],
    moderate: ['moderate', 'balanced', 'normal', 'regular'],
    packed: ['packed', 'busy', 'full', 'intensive', 'fast-paced', 'action-packed']
  };

  /**
   * Extract traveler information from text
   */
  extractTravelers(text: string): TravelersInfo | null {
    const adultMatch = text.match(/(\d+)\s*(?:adults?|people|persons?|pax|travelers?)/i);
    const childMatch = text.match(/(\d+)\s*(?:children|kids?|child)/i);
    const coupleMatch = text.match(/\b(?:couple|two of us|me and my (?:wife|husband|partner))\b/i);
    const familyMatch = text.match(/\bfamily of (\d+)\b/i);
    const soloMatch = text.match(/\b(?:solo|alone|myself|just me)\b/i);

    // Handle specific cases
    if (soloMatch) {
      return { adults: 1, children: 0 };
    }

    if (coupleMatch) {
      return { adults: 2, children: 0 };
    }

    if (familyMatch) {
      const totalCount = parseInt(familyMatch[1]);
      // Assume family is adults + children, default to 2 adults
      return { adults: 2, children: Math.max(0, totalCount - 2) };
    }

    if (adultMatch || childMatch) {
      return {
        adults: adultMatch ? parseInt(adultMatch[1]) : 1,
        children: childMatch ? parseInt(childMatch[1]) : 0
      };
    }

    return null;
  }

  /**
   * Extract budget level from text
   */
  extractBudget(text: string): BudgetLevel | null {
    const lowerText = text.toLowerCase();

    // Check for explicit budget mentions
    for (const [level, keywords] of Object.entries(this.budgetKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          return level as BudgetLevel;
        }
      }
    }

    // Check for price-related indicators
    if (lowerText.match(/\$+/)) {
      const dollarSigns = (text.match(/\$+/g) || [])[0].length;
      if (dollarSigns === 1) return 'budget';
      if (dollarSigns === 2) return 'medium';
      if (dollarSigns >= 3) return 'luxury';
    }

    return null;
  }

  /**
   * Extract interests from text
   */
  extractInterests(text: string): string[] {
    const lowerText = text.toLowerCase();
    const foundInterests: string[] = [];

    for (const interest of this.interestKeywords) {
      // Check for word boundaries to avoid partial matches
      const regex = new RegExp(`\\b${interest}\\b`, 'i');
      if (regex.test(lowerText)) {
        foundInterests.push(interest);
      }
    }

    // Also check for compound interests
    if (lowerText.includes('food and wine')) {
      if (!foundInterests.includes('food')) foundInterests.push('food');
      if (!foundInterests.includes('wine')) foundInterests.push('wine');
    }

    if (lowerText.includes('art and culture')) {
      if (!foundInterests.includes('art')) foundInterests.push('art');
      if (!foundInterests.includes('culture')) foundInterests.push('culture');
    }

    if (lowerText.includes('sun and beach')) {
      if (!foundInterests.includes('beaches')) foundInterests.push('beaches');
      if (!foundInterests.includes('relaxation')) foundInterests.push('relaxation');
    }

    return [...new Set(foundInterests)]; // Remove duplicates
  }

  /**
   * Extract pace preference from text
   */
  extractPace(text: string): 'relaxed' | 'moderate' | 'packed' | null {
    const lowerText = text.toLowerCase();

    for (const [pace, keywords] of Object.entries(this.paceKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          return pace as 'relaxed' | 'moderate' | 'packed';
        }
      }
    }

    // Check for activity count indicators
    if (lowerText.includes('few activities') || lowerText.includes('plenty of time')) {
      return 'relaxed';
    }

    if (lowerText.includes('see everything') || lowerText.includes('as much as possible')) {
      return 'packed';
    }

    return null;
  }

  /**
   * Extract must-see attractions or places
   */
  extractMustSee(text: string): string[] {
    const mustSee: string[] = [];

    // Patterns for must-see extraction
    const patterns = [
      /must[\s-]?see\s+([^,.]+)/gi,
      /definitely\s+(?:want to\s+)?(?:see|visit|go to)\s+([^,.]+)/gi,
      /don't\s+miss\s+([^,.]+)/gi,
      /especially\s+([^,.]+)/gi,
      /particularly\s+interested\s+in\s+([^,.]+)/gi
    ];

    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          mustSee.push(match[1].trim());
        }
      }
    }

    return mustSee;
  }

  /**
   * Extract things to avoid
   */
  extractAvoid(text: string): string[] {
    const avoid: string[] = [];

    // Patterns for avoidance extraction
    const patterns = [
      /(?:avoid|skip|not interested in|don't like|no)\s+([^,.]+)/gi,
      /(?:without|except)\s+([^,.]+)/gi
    ];

    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          avoid.push(match[1].trim());
        }
      }
    }

    return avoid;
  }

  /**
   * Extract complete preferences from text
   */
  extractPreferences(text: string): UserPreferences {
    return {
      budget: this.extractBudget(text) as 'budget' | 'mid' | 'luxury' | undefined,
      interests: this.extractInterests(text),
      pace: this.extractPace(text) || undefined,
      mustSee: this.extractMustSee(text),
      avoid: this.extractAvoid(text)
    };
  }

  /**
   * Validate and normalize preferences
   */
  validatePreferences(prefs: any): UserPreferences {
    const validated: UserPreferences = {};

    // Validate budget
    if (prefs.budget && ['budget', 'mid', 'luxury'].includes(prefs.budget)) {
      validated.budget = prefs.budget;
    }

    // Validate interests
    if (prefs.interests && Array.isArray(prefs.interests)) {
      validated.interests = prefs.interests
        .filter((i: any) => typeof i === 'string')
        .map((i: string) => i.toLowerCase().trim())
        .slice(0, 10); // Limit to 10 interests
    }

    // Validate pace
    if (prefs.pace && ['relaxed', 'moderate', 'packed'].includes(prefs.pace)) {
      validated.pace = prefs.pace;
    }

    // Validate mustSee
    if (prefs.mustSee && Array.isArray(prefs.mustSee)) {
      validated.mustSee = prefs.mustSee
        .filter((item: any) => typeof item === 'string' && item.length > 0)
        .slice(0, 10); // Limit to 10 items
    }

    // Validate avoid
    if (prefs.avoid && Array.isArray(prefs.avoid)) {
      validated.avoid = prefs.avoid
        .filter((item: any) => typeof item === 'string' && item.length > 0)
        .slice(0, 10); // Limit to 10 items
    }

    return validated;
  }
}