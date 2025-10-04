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
    const systemPrompt = this.buildSystemPrompt();

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
   * ENHANCED: Now includes explicit rules for temporal word exclusion
   */
  private buildSystemPrompt(): string {
    return `You are an expert travel intent extraction AI. Analyze natural language travel requests and extract structured information.

CRITICAL RULES FOR DESTINATION EXTRACTION:
1. Extract ONLY the city/region name - IGNORE temporal words
   ❌ WRONG: "Lisbon For" (captured temporal word)
   ✅ CORRECT: "Lisbon"

   Examples:
   - "Lisbon for tomorrow" → destination: "Lisbon"
   - "Paris starting Monday" → destination: "Paris"
   - "3 days in London for next week" → destination: "London"

2. Multi-word city names are OK:
   - "New York" → destination: "New York"
   - "San Francisco" → destination: "San Francisco"

TEMPORAL WORDS TO EXCLUDE (never part of destination):
- Prepositions: for, starting, beginning, ending, from
- Time references: tomorrow, today, yesterday, next, this, week, month, year
- Days: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
- Months: January, February, March, April, May, June, July, August, September, October, November, December

EXTRACTION SCHEMA:
{
  "destination": "string",           // Single city (clean, no temporal words)
  "destinations": ["string"],        // Multi-city trips
  "startDate": "YYYY-MM-DD",        // ISO format
  "endDate": "YYYY-MM-DD",          // ISO format
  "duration": number,               // Days
  "travelers": {
    "adults": number,
    "children": number
  },
  "budget": "budget" | "medium" | "luxury",
  "interests": ["string"]           // culture, food, adventure, etc.
}

IMPORTANT:
- Only include fields explicitly mentioned in the request
- Destination must be clean (no temporal words)
- Return valid JSON matching schema
- If uncertain about destination, prefer shorter clean name

Examples:
Input: "plan a 3 days trip to Lisbon for tomorrow"
Output: {"destination": "Lisbon", "duration": 3, "startDate": "2025-10-02"}

Input: "I want to visit Paris and London next week"
Output: {"destinations": ["Paris", "London"], "startDate": "2025-10-06"}

Input: "Tokyo for 5 days starting Monday"
Output: {"destination": "Tokyo", "duration": 5, "startDate": "2025-10-06"}`;
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
   * Clean destination name by removing temporal words
   * Safety net in case AI includes temporal words
   */
  private cleanDestinationName(destination: string): string {
    // Remove temporal words and everything after them
    const cleaned = destination
      .replace(/\s+(for|starting|beginning|ending|from|tomorrow|today|yesterday|next|this|week|month|year)\b.*/gi, '')
      .replace(/\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b.*/gi, '')
      .replace(/\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b.*/gi, '')
      .trim();

    // Log if cleaning was needed
    if (cleaned !== destination) {
      logger.warn('GPT', 'Cleaned destination name', {
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