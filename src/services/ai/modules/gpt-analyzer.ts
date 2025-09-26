/**
 * GPT Analyzer Module
 * Handles GPT-based intent extraction with token tracking
 */

import OpenAI from 'openai';
import { logger } from '@/lib/monitoring/logger';
import { getTokenConfig, tokenTracker, calculateTokenCost } from '../config/token-limits';
import { IntentParser } from './intent-parser';
import { ParsedIntent } from '../types/core.types';

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
      const completion = await this.openai.chat.completions.create({
        model: tokenConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: tokenConfig.temperature || 0.1,
        max_tokens: tokenConfig.maxTokens,
        response_format: { type: 'json_object' }
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error(`No response from ${tokenConfig.model}`);
      }

      // Track token usage
      this.trackTokenUsage(tokenConfig.model, completion.usage);

      const parsed = JSON.parse(content);
      return this.intentParser.validateExtractedIntent(parsed);

    } catch (error) {
      logger.error('GPT', 'Analysis failed', { error });
      throw error;
    }
  }

  /**
   * Build the system prompt for intent extraction
   */
  private buildSystemPrompt(): string {
    return `You are a travel intent extraction AI. Extract ONLY explicitly mentioned information from the user's message.
    Return a JSON object with these fields (only include fields that are explicitly mentioned):
    - destination: string (city or region name)
    - destinations: array of strings (for multi-city trips)
    - startDate: string (ISO format YYYY-MM-DD)
    - endDate: string (ISO format YYYY-MM-DD)
    - duration: number (days)
    - travelers: { adults: number, children: number }
    - budget: "budget" | "medium" | "luxury"
    - interests: array of strings

    DO NOT make assumptions or add default values. Only extract what is explicitly stated.`;
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