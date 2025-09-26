/**
 * Date Parser Module
 * Handles all date-related parsing from natural language input
 * Includes relative dates, absolute dates, and date ranges
 */

export interface DateRange {
  startDate?: string;
  endDate?: string;
  duration?: number;
}

export class DateParser {
  private today: Date;
  private currentYear: number;
  private nextYear: number;

  constructor() {
    this.today = new Date();
    this.currentYear = this.today.getFullYear();
    this.nextYear = this.currentYear + 1;
  }

  /**
   * Extract date range from text
   */
  extractDateRange(text: string): DateRange {
    const result: DateRange = {};

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
      const startDate = this.extractStartDate(text);
      if (startDate) {
        result.startDate = startDate;
      }
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
  extractDuration(text: string): number | null {
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
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Validate date string
   */
  validateDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && date >= this.today;
  }
}