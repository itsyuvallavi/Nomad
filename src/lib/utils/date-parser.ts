/**
 * Date Parser Utility
 * Handles flexible date parsing for travel planning
 */

import { 
  parse, 
  format, 
  isValid, 
  addDays, 
  addWeeks, 
  addMonths,
  startOfMonth, 
  endOfMonth, 
  setDate, 
  getYear,
  startOfYear,
  differenceInDays
} from 'date-fns';

export interface ParsedDateResult {
  startDate: Date | null;
  endDate?: Date | null;
  confidence: 'high' | 'medium' | 'low';
  interpretation?: string;
}

export class TravelDateParser {
  /**
   * Parse flexible natural language dates
   */
  static parseFlexibleDate(input: string): ParsedDateResult {
    const normalized = input.toLowerCase().trim();
    const now = new Date();
    const currentYear = getYear(now);
    
    // High confidence patterns
    // Relative dates
    if (normalized.includes('tomorrow')) {
      const startDate = addDays(now, 1);
      return {
        startDate,
        confidence: 'high',
        interpretation: 'Tomorrow'
      };
    }
    
    if (normalized.includes('next week')) {
      const startDate = addWeeks(now, 1);
      const endDate = addDays(startDate, 6);
      return {
        startDate,
        endDate,
        confidence: 'high',
        interpretation: 'Next week'
      };
    }
    
    if (normalized.includes('next month')) {
      const startDate = addMonths(now, 1);
      return {
        startDate,
        confidence: 'high',
        interpretation: 'Next month'
      };
    }
    
    // Medium confidence patterns
    // Seasonal references
    if (normalized.includes('summer')) {
      const year = normalized.includes('next') ? currentYear + 1 : currentYear;
      const startDate = new Date(year, 5, 21); // June 21
      return {
        startDate,
        endDate: new Date(year, 8, 22), // September 22
        confidence: 'medium',
        interpretation: `Summer ${year}`
      };
    }
    
    if (normalized.includes('christmas') || normalized.includes('holidays')) {
      const year = normalized.includes('next') ? currentYear + 1 : currentYear;
      const startDate = new Date(year, 11, 20); // December 20
      return {
        startDate,
        endDate: new Date(year, 11, 31), // December 31
        confidence: 'medium',
        interpretation: `Christmas holidays ${year}`
      };
    }
    
    // Month references
    const months = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    
    for (let i = 0; i < months.length; i++) {
      if (normalized.includes(months[i])) {
        let year = currentYear;
        if (normalized.includes('next')) year++;
        
        if (normalized.includes('mid-') || normalized.includes('mid ')) {
          const startDate = new Date(year, i, 15);
          return {
            startDate,
            confidence: 'medium',
            interpretation: `Mid-${months[i]} ${year}`
          };
        } else if (normalized.includes('end of')) {
          const startDate = endOfMonth(new Date(year, i, 1));
          return {
            startDate,
            confidence: 'medium',
            interpretation: `End of ${months[i]} ${year}`
          };
        } else {
          const startDate = startOfMonth(new Date(year, i, 1));
          return {
            startDate,
            endDate: endOfMonth(new Date(year, i, 1)),
            confidence: 'medium',
            interpretation: `${months[i]} ${year}`
          };
        }
      }
    }
    
    // Date range patterns (e.g., "May 15-20")
    const rangeMatch = normalized.match(/(\w+)\s+(\d{1,2})\s*[-–]\s*(\d{1,2})/);
    if (rangeMatch) {
      const monthName = rangeMatch[1];
      const startDay = parseInt(rangeMatch[2]);
      const endDay = parseInt(rangeMatch[3]);
      
      const monthIndex = months.findIndex(m => monthName.toLowerCase().includes(m));
      if (monthIndex !== -1) {
        const startDate = new Date(currentYear, monthIndex, startDay);
        const endDate = new Date(currentYear, monthIndex, endDay);
        
        return {
          startDate,
          endDate,
          confidence: 'high',
          interpretation: `${monthName} ${startDay}-${endDay}`
        };
      }
    }
    
    // Try standard date parsing as fallback
    try {
      const parsedDate = parse(input, 'MMM dd', new Date());
      if (isValid(parsedDate)) {
        return {
          startDate: parsedDate,
          confidence: 'low',
          interpretation: format(parsedDate, 'MMM dd, yyyy')
        };
      }
    } catch {
      // Ignore parsing error
    }
    
    // Could not parse
    return {
      startDate: null,
      confidence: 'low'
    };
  }
  
  /**
   * Format dates for AI consumption
   */
  static formatForAI(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }
  
  /**
   * Extract duration from text
   */
  static extractDuration(text: string): number | null {
    const normalized = text.toLowerCase();
    
    // Look for explicit day counts
    const dayMatch = normalized.match(/(\d+)\s*day/);
    if (dayMatch) {
      return parseInt(dayMatch[1]);
    }
    
    // Look for week counts
    const weekMatch = normalized.match(/(\d+)\s*week/);
    if (weekMatch) {
      return parseInt(weekMatch[1]) * 7;
    }
    
    // Look for "two week" pattern
    if (normalized.includes('two week')) {
      return 14;
    }
    
    // Weekend patterns
    if (normalized.includes('weekend')) {
      if (normalized.includes('long')) {
        return 4; // Long weekend
      }
      return 3; // Regular weekend
    }
    
    // Check for date ranges in the text
    const dates = this.parseFlexibleDate(text);
    if (dates.startDate && dates.endDate) {
      return differenceInDays(dates.endDate, dates.startDate) + 1;
    }
    
    return null;
  }
  
  /**
   * Infer travel dates from natural language
   */
  static inferTravelDates(text: string): {
    startDate?: Date;
    endDate?: Date;
    duration?: number;
    confidence: 'high' | 'medium' | 'low';
  } {
    const parseResult = this.parseFlexibleDate(text);
    const duration = this.extractDuration(text);
    
    // If we have both start and end dates
    if (parseResult.startDate && parseResult.endDate) {
      return {
        startDate: parseResult.startDate,
        endDate: parseResult.endDate,
        duration: differenceInDays(parseResult.endDate, parseResult.startDate) + 1,
        confidence: parseResult.confidence
      };
    }
    
    // If we have start date and duration
    if (parseResult.startDate && duration) {
      return {
        startDate: parseResult.startDate,
        endDate: addDays(parseResult.startDate, duration - 1),
        duration,
        confidence: parseResult.confidence
      };
    }
    
    // If we only have duration
    if (duration) {
      return {
        duration,
        confidence: 'low'
      };
    }
    
    // If we only have a start date
    if (parseResult.startDate) {
      return {
        startDate: parseResult.startDate,
        duration: 7, // Default to one week
        endDate: addDays(parseResult.startDate, 6),
        confidence: 'low'
      };
    }
    
    return {
      confidence: 'low'
    };
  }
}