/**
 * Simplified Itinerary Generator
 * A clean, maintainable approach to generating travel itineraries
 */

import { logger } from '@/lib/monitoring/logger';
import type { GeneratePersonalizedItineraryOutput } from '../flows/generate-personalized-itinerary';
import { generateConversationalItinerary } from './conversational-generator';

/**
 * Simple validation to prevent overly complex trips
 */
export function validateTripComplexity(prompt: string): { valid: boolean; error?: string } {
  const lowerPrompt = prompt.toLowerCase();

  // Check for excessive duration
  const durationMatch = lowerPrompt.match(/(\d+)\s*(days?|weeks?|months?)/g);
  if (durationMatch) {
    let totalDays = 0;
    durationMatch.forEach(match => {
      const num = parseInt(match);
      if (match.includes('week')) totalDays += num * 7;
      else if (match.includes('month')) totalDays += num * 30;
      else totalDays += num;
    });

    if (totalDays > 30) {
      return { valid: false, error: `Trip is too long (${totalDays} days). Maximum 30 days supported.` };
    }
  }

  // Check for too many destinations (simple heuristic)
  const cityPattern = /(?:to|visit|explore|see|in)\s+([A-Z][a-zA-Z\s]+)(?:,|and|then)/gi;
  const matches = [...prompt.matchAll(cityPattern)];
  if (matches.length > 5) {
    return { valid: false, error: 'Too many destinations. Maximum 5 cities supported.' };
  }

  return { valid: true };
}

/**
 * New conversational approach that never fails
 * This is the primary generator going forward
 */
export async function generateConversationalItineraryWrapper(
  prompt: string,
  attachedFile?: string,
  conversationHistory?: string
): Promise<GeneratePersonalizedItineraryOutput> {
  // Always use the conversational approach
  logger.info('AI', '🤖 Using conversational approach');
  return generateConversationalItinerary(prompt, conversationHistory);
}

// Legacy exports for backward compatibility
export const generateUltraFastItinerary = generateConversationalItineraryWrapper;
export const generateSimpleItinerary = generateConversationalItineraryWrapper;