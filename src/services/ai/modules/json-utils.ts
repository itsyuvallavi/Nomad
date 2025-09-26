/**
 * JSON Utilities Module
 * Handles JSON repair and validation for AI responses
 */

import { logger } from '@/lib/monitoring/logger';

export class JSONUtils {
  /**
   * Repair malformed JSON strings from AI responses
   */
  static repairJSON(text: string): string | null {
    try {
      // Remove any markdown code blocks
      text = text.replace(/```json\n?/gi, '').replace(/```\n?/gi, '');

      // Fix common JSON issues
      text = text
        .replace(/,\s*}/g, '}')  // Remove trailing commas
        .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
        .replace(/'/g, '"')      // Replace single quotes with double quotes
        .replace(/(\w+):/g, '"$1":')  // Add quotes to unquoted keys
        .replace(/:\s*'([^']*)'/g, ': "$1"')  // Fix single-quoted values
        .replace(/:\s*([^",\[\{\s][^,\]\}]*)/g, (match, value) => {
          // Add quotes to unquoted string values
          if (value === 'true' || value === 'false' || value === 'null' || !isNaN(Number(value))) {
            return match;
          }
          return `: "${value}"`;
        });

      // Try to parse it
      JSON.parse(text);
      return text;
    } catch (error) {
      logger.error('JSONUtils', 'Failed to repair JSON', {
        error,
        text: text.slice(0, 200)
      });
      return null;
    }
  }

  /**
   * Safely parse JSON with error handling
   */
  static safeParse<T>(text: string, fallback: T): T {
    try {
      return JSON.parse(text);
    } catch {
      // Try to repair and parse again
      const repaired = this.repairJSON(text);
      if (repaired) {
        try {
          return JSON.parse(repaired);
        } catch {
          return fallback;
        }
      }
      return fallback;
    }
  }

  /**
   * Validate if a string is valid JSON
   */
  static isValidJSON(text: string): boolean {
    try {
      JSON.parse(text);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract JSON from mixed text (e.g., from AI responses with explanations)
   */
  static extractJSON(text: string): string | null {
    // Try to find JSON object or array
    const objectMatch = text.match(/\{[\s\S]*\}/);
    const arrayMatch = text.match(/\[[\s\S]*\]/);

    const match = objectMatch || arrayMatch;
    if (match) {
      return this.repairJSON(match[0]);
    }

    return null;
  }
}