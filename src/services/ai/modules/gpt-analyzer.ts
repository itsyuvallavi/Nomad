/**
 * GPT Analyzer Module
 * Handles GPT-based intent extraction with token tracking
 */

import OpenAI from 'openai';
import { logger } from '@/lib/monitoring/logger';
import { getTokenConfig, tokenTracker, calculateTokenCost } from '../config/token-limits';
import { IntentParser } from './intent-parser';
import { ParsedIntent } from '../types/core.types';
import { openAIBackoff } from '@/lib/middleware/rate-limiter';

export class GPTAnalyzer {
  private openai: OpenAI;
  private intentParser: IntentParser;

  constructor(openai: OpenAI) {
    this.openai = openai;
    this.intentParser = new IntentParser();
  }

  /**
   * Analyze message with GPT-4o-mini for intent extraction
   */
  async analyzeWithGPT(
    message: string,
    existingIntent: Partial<ParsedIntent>
  ): Promise<Partial<ParsedIntent>> {
    const systemPrompt = this.buildSystemPrompt(existingIntent);

    try {
      const tokenConfig = getTokenConfig('INTENT_EXTRACTION');

      // Use exponential backoff for OpenAI API calls
      const completion = await openAIBackoff.execute(
        () => this.openai.chat.completions.create({
          model: tokenConfig.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: tokenConfig.temperature || 0.1,
          max_tokens: tokenConfig.maxTokens,
          response_format: { type: 'json_object' }
        }),
        (attempt, delay, error) => {
          logger.warn('GPT', `Retrying OpenAI call (attempt ${attempt})`, {
            delay,
            error: error.message
          });
        }
      );

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error(`No response from ${tokenConfig.model}`);
      }

      // Track token usage
      this.trackTokenUsage(tokenConfig.model, completion.usage);

      const parsed = JSON.parse(content);
      const cleaned = this.validateAndCleanResult(parsed);
      return cleaned;

    } catch (error) {
      logger.error('GPT', 'Analysis failed', { error });
      throw error;
    }
  }

  /**
   * Build the system prompt for intent extraction
   * Includes existing intent so GPT knows what's already been collected
   */
  private buildSystemPrompt(existingIntent?: Partial<ParsedIntent>): string {
    let contextSection = '';

    // If we have existing intent, tell GPT what we already know
    if (existingIntent && Object.keys(existingIntent).length > 0) {
      contextSection = `\nIMPORTANT - Information already collected from previous messages:
${JSON.stringify(existingIntent, null, 2)}

Your task: Extract NEW information from the current message and UPDATE the existing data. Keep all previously collected information unless the user explicitly changes it.\n\n`;
    }

    return `You are a travel intent extraction AI. Extract structured information from natural language travel requests.

Your job: Identify the city/destination name, travel dates, duration, and preferences from the user's message.
${contextSection}
CRITICAL RULE: Extract ONLY the city name. NEVER include temporal words (starting, for, tomorrow, next, on, from, etc.) in the destination field.

Examples - PAY ATTENTION to what should NOT be included:
- "plan a 7 day trip to Lisbon staring next monday" → destination: "Lisbon" (NOT "Lisbon Staring")
- "3 days in London for tomorrow" → destination: "London" (NOT "London For")
- "Paris starting Monday" → destination: "Paris" (NOT "Paris Starting")
- "London starting tomorrow" → destination: "London" (NOT "London Starting")
- "Lisbon starting next week" → destination: "Lisbon" (NOT "Lisbon Starting")
- "New York for 5 days" → destination: "New York" (NOT "New York For")
- "I want to visit Tokyo and Seoul" → destinations: ["Tokyo", "Seoul"]

Conversation examples:
- User: "plan a trip to Lisbon" → {destination: "Lisbon"}
- User: "on November 15th" → {destination: "Lisbon", startDate: "2025-11-15"} (KEEP Lisbon!)

Return JSON with these fields (only include fields mentioned in the request):
{
  "destination": "string",           // ONLY the city name (e.g., "Lisbon", "New York", "London")
  "destinations": ["string"],        // For multi-city trips - ONLY city names
  "startDate": "YYYY-MM-DD",        // ISO format date
  "endDate": "YYYY-MM-DD",          // ISO format date
  "duration": number,               // Number of days
  "travelers": {
    "adults": number,
    "children": number
  },
  "budget": "budget" | "medium" | "luxury",
  "interests": ["string"]           // e.g., ["culture", "food", "nightlife"]
}

Key rules:
- Extract ONLY the city name - NEVER include "starting", "for", "tomorrow", "next", "from", "on" in destination
- Temporal words go in startDate field, NOT in destination field
- PRESERVE previously collected information - only add/update what's in the current message
- Return valid JSON with ALL fields (existing + new)
- Only include fields that are mentioned or clearly implied`;
  }

  /**
   * Validate and clean AI extraction result
   * Ensures destination names don't contain temporal words
   */
  private validateAndCleanResult(result: any): Partial<ParsedIntent> {
    // Clean single destination
    if (result.destination && typeof result.destination === 'string') {
      result.destination = this.cleanDestinationName(result.destination);
    }

    // Clean multi-city destinations
    if (result.destinations && Array.isArray(result.destinations)) {
      result.destinations = result.destinations.map((d: string) =>
        this.cleanDestinationName(d)
      );
    }

    // Validate dates are proper ISO format
    if (result.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(result.startDate)) {
      logger.warn('GPT', 'Invalid startDate format, removing', { startDate: result.startDate });
      delete result.startDate;
    }

    if (result.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(result.endDate)) {
      logger.warn('GPT', 'Invalid endDate format, removing', { endDate: result.endDate });
      delete result.endDate;
    }

    return result;
  }

  /**
   * Clean destination name - minimal safety net
   * The AI should handle this correctly, but just in case
   */
  private cleanDestinationName(destination: string): string {
    // Simple cleanup: remove common temporal words that might slip through
    // Updated regex to handle temporal words at end of string (e.g., "London Starting")
    const cleaned = destination
      .replace(/\s+(for|starting|staring|beginning|ending|from|on|tomorrow|today|next)(\s+.*)?$/gi, '')
      .trim();

    // Log if cleaning was needed (this should be rare)
    if (cleaned !== destination) {
      logger.warn('GPT', 'Had to clean destination name - AI should handle this', {
        original: destination,
        cleaned
      });
    }

    return cleaned;
  }

  /**
   * Track token usage for cost monitoring
   */
  private trackTokenUsage(
    model: string,
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    }
  ): void {
    if (!usage) return;

    const cost = calculateTokenCost(
      model,
      usage.prompt_tokens,
      usage.completion_tokens
    );

    tokenTracker.track('INTENT_EXTRACTION', {
      prompt: usage.prompt_tokens,
      completion: usage.completion_tokens,
      total: usage.total_tokens,
      estimatedCost: cost
    });

    logger.debug('GPT', 'Token usage tracked', {
      operation: 'INTENT_EXTRACTION',
      model,
      tokens: usage.total_tokens,
      cost: cost.toFixed(4)
    });
  }
}