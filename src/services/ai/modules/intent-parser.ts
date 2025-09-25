/**
 * Intent Parser Module
 * Extracts and parses user intent from natural language input
 * Handles date parsing, duration extraction, and multi-city detection
 */

import { logger } from '@/lib/monitoring/logger';

// Multi-city intent structure
export interface MultiCityIntent {
  destinations: string[];
  totalDuration: number;
  daysPerCity?: number[];
  startDate?: string;
  endDate?: string;
}

// Parsed user intent
export interface ParsedIntent {
  destination?: string;
  destinations?: string[];  // For multi-city trips
  startDate?: string;
  endDate?: string;
  duration?: number;
  travelers?: {
    adults?: number;
    children?: number;
  };
  budget?: 'budget' | 'medium' | 'luxury';
  interests?: string[];
  preferences?: {
    budget?: 'budget' | 'mid' | 'luxury';
    interests?: string[];
    pace?: 'relaxed' | 'moderate' | 'packed';
    mustSee?: string[];
    avoid?: string[];
  };
  modificationRequest?: string;
}

export class IntentParser {
  private today: Date;
  private currentYear: number;
  private nextYear: number;

  constructor() {
    this.today = new Date();
    this.currentYear = this.today.getFullYear();
    this.nextYear = this.currentYear + 1;
  }

  /**
   * Extract multi-city intent from message
   */
  extractMultiCityIntent(message: string): MultiCityIntent {
    const result: MultiCityIntent = {
      destinations: [],
      totalDuration: 0
    };

    // Clean up message for parsing
    const cleanMsg = message.toLowerCase()
      .replace(/[,]/g, ' ')
      .replace(/\band\b/g, ' ')
      .replace(/\s+/g, ' ');

    // Extract destinations (simple pattern matching)
    const locationPattern = /(?:visit|tour|explore|see|go to)\s+([^0-9]+?)(?:\s+for|\s+in|\s+\d+|$)/i;
    const multiCityPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:,|and|then)?\s*/g;

    const matches = message.match(multiCityPattern);
    if (matches && matches.length > 1) {
      result.destinations = matches
        .map(m => m.replace(/,|and|then/gi, '').trim())
        .filter(d => d.length > 2 && /^[A-Z]/.test(d));
    }

    // Extract duration
    const durationMatch = message.match(/(\d+)\s*(?:days?|nights?|weeks?)/i);
    if (durationMatch) {
      let duration = parseInt(durationMatch[1]);
      if (message.includes('week')) {
        duration *= 7;
      }
      result.totalDuration = duration;
    }

    // Extract per-city days if specified
    const perCityMatch = message.match(/(\d+)\s*days?\s*(?:in\s*)?each/i);
    if (perCityMatch && result.destinations.length > 0) {
      const daysEach = parseInt(perCityMatch[1]);
      result.daysPerCity = result.destinations.map(() => daysEach);
      result.totalDuration = daysEach * result.destinations.length;
    }

    // Extract dates
    const startDatePattern = this.extractStartDate(message);
    if (startDatePattern) {
      result.startDate = startDatePattern;
    }

    return result;
  }

  /**
   * Format multi-city destination for display
   */
  formatMultiCityDestination(intent: MultiCityIntent): string {
    if (intent.destinations.length === 0) return '';
    if (intent.destinations.length === 1) return intent.destinations[0];
    return intent.destinations.join(', ');
  }

  /**
   * Extract dates, duration, and other intent from patterns
   */
  extractWithPatterns(message: string, currentIntent?: ParsedIntent): Partial<ParsedIntent> {
    const extracted: Partial<ParsedIntent> = currentIntent ? { ...currentIntent } : {};

    // Check for multi-city first
    const multiCityIntent = this.extractMultiCityIntent(message);
    if (multiCityIntent.destinations.length > 1) {
      extracted.destinations = multiCityIntent.destinations;
      extracted.destination = this.formatMultiCityDestination(multiCityIntent);
      if (multiCityIntent.totalDuration > 0) {
        extracted.duration = multiCityIntent.totalDuration;
      }
      console.log('🗺️  Multi-city trip detected:', multiCityIntent);
    } else {
      // Single destination extraction
      const destinationPatterns = [
        /(?:trip to|visit|going to|travel to|fly to|head to|explore|tour)\s+([A-Z][a-zA-Z\s]+?)(?:\s+for|\s+from|\s+on|\s+in|\s+next|\s+this|,|$)/i,
        /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:for\s+)?(\d+)\s+(?:days?|nights?)/i,
        /(\d+)\s+(?:days?|nights?)\s+in\s+([A-Z][a-zA-Z\s]+)/i,
        /^([A-Z][a-zA-Z\s]+?)(?:\s+for|\s+\d+|,|$)/i
      ];

      for (const pattern of destinationPatterns) {
        const match = message.match(pattern);
        if (match) {
          const destination = (match[1] || match[2] || '').trim();
          if (destination && destination.length > 2) {
            extracted.destination = destination;
            break;
          }
        }
      }
    }

    // Duration extraction
    const duration = this.extractDuration(message);
    if (duration) {
      extracted.duration = duration;
    }

    // Date extraction
    const dateRange = this.extractDateRange(message);
    if (dateRange.startDate) extracted.startDate = dateRange.startDate;
    if (dateRange.endDate) extracted.endDate = dateRange.endDate;
    if (dateRange.duration && !extracted.duration) {
      extracted.duration = dateRange.duration;
    }

    // Traveler extraction
    const adultMatch = message.match(/(\d+)\s*(?:adults?|people|persons?|pax)/i);
    const childMatch = message.match(/(\d+)\s*(?:children|kids?|child)/i);

    if (adultMatch || childMatch) {
      extracted.travelers = {
        adults: adultMatch ? parseInt(adultMatch[1]) : 1,
        children: childMatch ? parseInt(childMatch[1]) : 0
      };
    }

    // Budget extraction
    const budgetMatch = message.match(/\b(budget|cheap|affordable|mid-range|moderate|luxury|luxurious|premium|high-end)\b/i);
    if (budgetMatch) {
      const budgetWord = budgetMatch[1].toLowerCase();
      if (['budget', 'cheap', 'affordable'].includes(budgetWord)) {
        extracted.budget = 'budget';
      } else if (['mid-range', 'moderate'].includes(budgetWord)) {
        extracted.budget = 'medium';
      } else if (['luxury', 'luxurious', 'premium', 'high-end'].includes(budgetWord)) {
        extracted.budget = 'luxury';
      }
    }

    // Interest extraction
    const interestKeywords = [
      'culture', 'history', 'food', 'adventure', 'relaxation', 'nightlife',
      'shopping', 'nature', 'architecture', 'museums', 'beaches', 'hiking',
      'photography', 'local cuisine', 'wine', 'art', 'music', 'festivals'
    ];

    const foundInterests: string[] = [];
    for (const interest of interestKeywords) {
      if (message.toLowerCase().includes(interest)) {
        foundInterests.push(interest);
      }
    }

    if (foundInterests.length > 0) {
      extracted.interests = foundInterests;
    }

    console.log('   🔍 PATTERN EXTRACTION:');
    console.log(`      Destination: ${extracted.destination || 'not found'}`);
    console.log(`      Duration: ${extracted.duration || 'not found'}`);
    console.log(`      Start Date: ${extracted.startDate || 'not found'}`);
    console.log(`      End Date: ${extracted.endDate || 'not found'}`);

    return extracted;
  }

  /**
   * Extract date range from text
   */
  private extractDateRange(text: string): { startDate?: string; endDate?: string; duration?: number } {
    const result: { startDate?: string; endDate?: string; duration?: number } = {};

    // Check for date range patterns (e.g., "Oct 15-20", "15-20 October")
    const rangePatterns = [
      /(\w+)\s+(\d{1,2})\s*[-–]\s*(\d{1,2})/i,  // Oct 15-20
      /(\d{1,2})\s*[-–]\s*(\d{1,2})\s+(\w+)/i,  // 15-20 Oct
      /(\w+)\s+(\d{1,2})\s+to\s+(\w+)?\s*(\d{1,2})/i,  // Oct 15 to Oct 20
    ];

    for (const pattern of rangePatterns) {
      const match = text.match(pattern);
      if (match) {
        // Parse and format dates based on pattern
        // Simplified for brevity - would include full month parsing
        const startDay = parseInt(match[2]);
        const endDay = parseInt(match[3] || match[4]);
        if (startDay && endDay && endDay > startDay) {
          result.duration = endDay - startDay + 1;
        }
        break;
      }
    }

    // Try to extract individual start date if no range found
    if (!result.startDate) {
      result.startDate = this.extractStartDate(text);
    }

    return result;
  }

  /**
   * Extract start date from text
   */
  extractStartDate(text: string): string | null {
    // Try relative date first
    const relativeDate = this.extractRelativeDate(text);
    if (relativeDate) return relativeDate;

    // Try month-based date
    const monthDate = this.extractMonthDate(text);
    if (monthDate) return monthDate;

    // Try ISO date pattern
    const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return isoMatch[0];
    }

    return null;
  }

  /**
   * Extract relative dates (next week, tomorrow, etc.)
   */
  private extractRelativeDate(text: string): string | null {
    const lower = text.toLowerCase();
    const today = new Date();

    if (lower.includes('today')) {
      return this.formatDate(today);
    }

    if (lower.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return this.formatDate(tomorrow);
    }

    // Next/this week logic
    const weekMatch = lower.match(/(next|this)\s+(\w+day)/);
    if (weekMatch) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = days.findIndex(d => weekMatch[2].includes(d));

      if (targetDay !== -1) {
        const currentDay = today.getDay();
        let daysToAdd = targetDay - currentDay;

        if (weekMatch[1] === 'next' || daysToAdd <= 0) {
          daysToAdd += 7;
        }

        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + daysToAdd);
        return this.formatDate(targetDate);
      }
    }

    // Next month
    if (lower.includes('next month')) {
      const nextMonth = new Date(today);
      nextMonth.setMonth(today.getMonth() + 1);
      nextMonth.setDate(1);
      return this.formatDate(nextMonth);
    }

    // In X days/weeks/months
    const inMatch = lower.match(/in\s+(\d+)\s+(days?|weeks?|months?)/);
    if (inMatch) {
      const amount = parseInt(inMatch[1]);
      const unit = inMatch[2];
      const targetDate = new Date(today);

      if (unit.startsWith('day')) {
        targetDate.setDate(today.getDate() + amount);
      } else if (unit.startsWith('week')) {
        targetDate.setDate(today.getDate() + (amount * 7));
      } else if (unit.startsWith('month')) {
        targetDate.setMonth(today.getMonth() + amount);
      }

      return this.formatDate(targetDate);
    }

    return null;
  }

  /**
   * Extract month-based dates
   */
  private extractMonthDate(text: string): string | null {
    const months = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];

    const monthsShort = [
      'jan', 'feb', 'mar', 'apr', 'may', 'jun',
      'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
    ];

    // Try full month names
    for (let i = 0; i < months.length; i++) {
      const pattern = new RegExp(`\\b${months[i]}\\s+(\\d{1,2})(?:\\w{0,2})?(?:\\s+|,\\s*)(\\d{4})?`, 'i');
      const match = text.match(pattern);

      if (match) {
        const day = parseInt(match[1]);
        const year = match[2] ? parseInt(match[2]) : this.determineYear(i, day);
        return `${year}-${String(i + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    // Try short month names
    for (let i = 0; i < monthsShort.length; i++) {
      const pattern = new RegExp(`\\b${monthsShort[i]}\\w*\\s+(\\d{1,2})(?:\\w{0,2})?(?:\\s+|,\\s*)(\\d{4})?`, 'i');
      const match = text.match(pattern);

      if (match) {
        const day = parseInt(match[1]);
        const year = match[2] ? parseInt(match[2]) : this.determineYear(i, day);
        return `${year}-${String(i + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    return null;
  }

  /**
   * Extract duration from text
   */
  private extractDuration(text: string): number | null {
    // Look for patterns like "3 days", "1 week", "2 weeks", "5 nights"
    const patterns = [
      /(\d+)\s*(?:days?|nights?)/i,
      /(\d+)\s*weeks?/i,
      /a\s+week/i,  // "a week" = 7 days
      /weekend/i,    // "weekend" = 2-3 days
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        if (pattern.source.includes('weekend')) {
          return 3; // Default weekend to 3 days
        }
        if (pattern.source.includes('a\\s+week')) {
          return 7;
        }

        const num = parseInt(match[1]);
        if (pattern.source.includes('week')) {
          return num * 7;
        }
        return num;
      }
    }

    return null;
  }

  /**
   * Determine year for a given month and day
   */
  private determineYear(month: number, day: number): number {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    // If the month is in the past this year, use next year
    if (month < currentMonth || (month === currentMonth && day < currentDay)) {
      return this.nextYear;
    }

    return this.currentYear;
  }

  /**
   * Format date to ISO string
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Validate extracted intent
   */
  validateExtractedIntent(data: any): Partial<ParsedIntent> {
    const validated: Partial<ParsedIntent> = {};

    // Validate destination
    if (data.destination && typeof data.destination === 'string') {
      validated.destination = data.destination.trim();
    }

    // Validate destinations (multi-city)
    if (data.destinations && Array.isArray(data.destinations)) {
      validated.destinations = data.destinations
        .filter((d: any) => typeof d === 'string')
        .map((d: string) => d.trim());
    }

    // Validate dates
    if (data.startDate) {
      const date = new Date(data.startDate);
      if (!isNaN(date.getTime())) {
        validated.startDate = this.formatDate(date);
      }
    }

    if (data.endDate) {
      const date = new Date(data.endDate);
      if (!isNaN(date.getTime())) {
        validated.endDate = this.formatDate(date);
      }
    }

    // Validate duration
    if (data.duration && typeof data.duration === 'number' && data.duration > 0 && data.duration <= 365) {
      validated.duration = data.duration;
    }

    // Validate travelers
    if (data.travelers) {
      validated.travelers = {
        adults: Math.max(1, Math.min(20, data.travelers.adults || 1)),
        children: Math.max(0, Math.min(20, data.travelers.children || 0))
      };
    }

    // Validate budget
    if (data.budget && ['budget', 'medium', 'luxury'].includes(data.budget)) {
      validated.budget = data.budget;
    }

    // Validate interests
    if (data.interests && Array.isArray(data.interests)) {
      validated.interests = data.interests
        .filter((i: any) => typeof i === 'string')
        .map((i: string) => i.toLowerCase().trim())
        .slice(0, 10); // Limit to 10 interests
    }

    return validated;
  }
}