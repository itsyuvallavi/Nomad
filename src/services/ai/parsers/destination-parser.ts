/**
 * Destination Parser Module
 * Handles extraction of destinations and multi-city trip parsing
 * Includes city name validation and formatting
 */

export interface MultiCityIntent {
  destinations: string[];
  totalDuration: number;
  daysPerCity?: number[];
  startDate?: string;
  endDate?: string;
}

export class DestinationParser {
  // Date-related words to exclude from city detection
  private readonly dateWords = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
    'september', 'october', 'november', 'december',
    'tomorrow', 'today', 'yesterday', 'weekend', 'weekday'
  ];

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
        .filter(d => this.isValidDestination(d));
    }

    // Extract duration
    const durationMatch = message.match(/(\d+|a|one)\s*(?:days?|nights?|weeks?)/i);
    if (durationMatch) {
      let duration = 0;
      const numPart = durationMatch[1].toLowerCase();

      // Handle "a" or "one" as 1
      if (numPart === 'a' || numPart === 'one') {
        duration = 1;
      } else {
        duration = parseInt(numPart);
      }

      // Convert weeks to days
      if (message.toLowerCase().includes('week')) {
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

    return result;
  }

  /**
   * Extract single destination from message
   */
  extractSingleDestination(message: string): string | null {
    const destinationPatterns = [
      // "trip to London starting tomorrow" -> extract "London"
      /(?:trip to|visit|going to|travel to|fly to|head to|explore|tour)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?=\s+(?:for|from|starting|beginning|on|in|next|this|tomorrow|today)|[,.]|$)/i,
      // "London for 3 days" -> extract "London"
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:for\s+)?(\d+)\s+(?:days?|nights?)/i,
      // "3 days in London" -> extract "London"
      /(\d+)\s+(?:days?|nights?)\s+(?:in|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?=\s+(?:starting|from|on|tomorrow|today)|$)/i,
      // "London starting tomorrow" at beginning -> extract "London"
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?=\s+(?:for|starting|from|tomorrow|today)|\s+\d+|,|$)/i
    ];

    for (const pattern of destinationPatterns) {
      const match = message.match(pattern);
      if (match) {
        const destination = (match[1] || match[2] || '').trim();
        if (this.isValidDestination(destination)) {
          return destination;
        }
      }
    }

    return null;
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
   * Check if a string is a valid destination
   */
  private isValidDestination(destination: string): boolean {
    const dLower = destination.toLowerCase();
    return destination.length > 2 &&
           /^[A-Z]/.test(destination) &&
           !this.dateWords.includes(dLower) &&
           !dLower.includes('next') &&
           !dLower.includes('this') &&
           !dLower.includes('last') &&
           !dLower.includes('day') &&
           !dLower.includes('week') &&
           !dLower.includes('month') &&
           !dLower.includes('year');
  }

  /**
   * Normalize destination name
   */
  normalizeDestination(destination: string): string {
    // Capitalize first letter of each word
    return destination
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Extract all destinations from text
   */
  extractAllDestinations(text: string): string[] {
    const destinations: string[] = [];

    // Check for multi-city first
    const multiCity = this.extractMultiCityIntent(text);
    if (multiCity.destinations.length > 0) {
      return multiCity.destinations.map(d => this.normalizeDestination(d));
    }

    // Try single destination
    const single = this.extractSingleDestination(text);
    if (single) {
      destinations.push(this.normalizeDestination(single));
    }

    return destinations;
  }
}