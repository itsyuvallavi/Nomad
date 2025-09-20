/**
 * AI Controller - Unified conversation and state management
 * Handles all conversational flow, question generation, and intent analysis
 * NO DEFAULTS - Always asks for missing information
 */

import OpenAI from 'openai';
import { logger } from '@/lib/monitoring/logger';
import { z } from 'zod';

// Initialize OpenAI client
function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Conversation state tracking
export enum ConversationState {
  INITIAL = 'initial',
  COLLECTING_DESTINATION = 'collecting_destination',
  COLLECTING_DATES = 'collecting_dates',
  COLLECTING_DURATION = 'collecting_duration',
  COLLECTING_TRAVELERS = 'collecting_travelers',
  COLLECTING_PREFERENCES = 'collecting_preferences',
  READY_TO_GENERATE = 'ready_to_generate',
  GENERATING = 'generating',
  SHOWING_ITINERARY = 'showing_itinerary',
  AWAITING_FEEDBACK = 'awaiting_feedback',
}

// Parsed user intent
export interface ParsedIntent {
  destination?: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
  travelers?: {
    adults?: number;
    children?: number;
  };
  preferences?: {
    budget?: 'budget' | 'mid' | 'luxury';
    interests?: string[];
    pace?: 'relaxed' | 'moderate' | 'packed';
    mustSee?: string[];
    avoid?: string[];
  };
  modificationRequest?: string;
}

// Conversation context
export interface ConversationContext {
  sessionId: string;
  state: ConversationState;
  intent: ParsedIntent;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  lastUpdated: Date;
}

// Response types
export interface AIControllerResponse {
  type: 'question' | 'ready' | 'generating' | 'error';
  message: string;
  intent?: ParsedIntent;
  missingFields?: string[];
  canGenerate: boolean;
  context?: string; // Serialized context for next call
}

// Simple in-memory cache for intent extraction
interface CacheEntry {
  input: string;
  output: Partial<ParsedIntent>;
  timestamp: number;
}

export class AIController {
  private openai: OpenAI;
  private today: Date;
  private currentYear: number;
  private nextYear: number;
  private intentCache: Map<string, CacheEntry>;
  private readonly CACHE_TTL = 3600000; // 1 hour
  private readonly MAX_CACHE_SIZE = 100;

  constructor() {
    this.openai = getOpenAIClient();
    this.today = new Date();
    this.currentYear = this.today.getFullYear();
    this.nextYear = this.currentYear + 1;
    this.intentCache = new Map();
  }

  /**
   * Public method for testing intent extraction
   */
  async extractIntent(message: string): Promise<Partial<ParsedIntent>> {
    return this.analyzeUserInput(message);
  }

  /**
   * Main entry point - processes user message and returns appropriate response
   * NEVER generates without required information
   */
  async processMessage(
    message: string,
    serializedContext?: string
  ): Promise<AIControllerResponse> {
    logger.info('AI', 'Processing message', { message: message.slice(0, 100) });

    // Restore or create context
    const context = serializedContext
      ? this.deserializeContext(serializedContext)
      : this.createNewContext();

    // Add user message to history
    context.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Analyze user input and update intent
    const updatedIntent = await this.analyzeUserInput(message, context.intent);
    context.intent = { ...context.intent, ...updatedIntent };

    // Check what information is missing
    const missingFields = this.getMissingRequiredFields(context.intent);

    if (missingFields.length > 0) {
      // Generate appropriate question for next missing field
      const question = await this.generateQuestion(
        missingFields[0],
        context.intent
      );

      // Update state based on what we're collecting
      context.state = this.getStateForField(missingFields[0]);

      // Add assistant message to history
      context.messages.push({
        role: 'assistant',
        content: question,
        timestamp: new Date()
      });

      return {
        type: 'question',
        message: question,
        intent: context.intent,
        missingFields,
        canGenerate: false,
        context: this.serializeContext(context)
      };
    }

    // All required information collected
    context.state = ConversationState.READY_TO_GENERATE;

    return {
      type: 'ready',
      message: 'I have all the information needed to create your itinerary.',
      intent: context.intent,
      canGenerate: true,
      context: this.serializeContext(context)
    };
  }

  /**
   * Analyzes user input to extract travel information
   * Uses pattern matching first, then GPT-5 for complex cases
   */
  private async analyzeUserInput(
    message: string,
    currentIntent: ParsedIntent | undefined = undefined
  ): Promise<Partial<ParsedIntent>> {
    // Check cache first
    const cacheKey = this.getCacheKey(message);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      logger.info('AI', 'Cache hit for intent extraction', { cacheKey });
      return cached;
    }

    // ALWAYS try pattern-based extraction first (FAST)
    console.log('\n   🔍 PATTERN EXTRACTION:');
    const patternResult = this.extractWithPatterns(message);
    console.log(`      Destination: ${patternResult.destination || 'not found'}`);
    console.log(`      Duration: ${patternResult.duration || 'not found'}`);
    console.log(`      Start Date: ${patternResult.startDate || 'not found'}`);
    console.log(`      End Date: ${patternResult.endDate || 'not found'}`);

    // If patterns got everything we need, return immediately
    if (patternResult.destination && patternResult.duration &&
        (patternResult.startDate || patternResult.endDate)) {
      console.log('      ✅ Complete extraction via patterns (skipping GPT-5)');
      this.addToCache(cacheKey, patternResult);
      return patternResult;
    }
    console.log('      ⚠️  Missing fields, using GPT-5 for completion');

    // For missing fields or complex cases, use GPT-5 and merge results
    const today = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;

    const prompt = `Extract travel information from the user message and return ONLY valid JSON.

Current date: ${today}
Current year: ${currentYear}
User message: "${message}"

Extract these fields (omit if not mentioned):
- destination: string (city/country name)
- duration: number (days, "weekend"=2, "week"=7)
- startDate: string (YYYY-MM-DD format)
- endDate: string (YYYY-MM-DD format)
- travelers: {adults: number, children: number}
- preferences: {budget: "budget"|"mid"|"luxury", interests: string[], pace: "relaxed"|"moderate"|"packed"}

Date parsing rules:
- "next month" = first day of next month
- "in 2 weeks" = ${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
- "october 15" = ${currentYear}-10-15 if future, else ${nextYear}-10-15
- "december 20 to december 27" = extract both dates

Examples:
Input: "3 day trip to london"
Output: {"destination":"london","duration":3}

Input: "paris for 5 days starting october 15"
Output: {"destination":"paris","duration":5,"startDate":"${currentYear}-10-15"}

Input: "weekend in tokyo"
Output: {"destination":"tokyo","duration":2}

RETURN ONLY THE JSON OBJECT, NO OTHER TEXT:`;

    try {
      // Use low reasoning effort for simple extraction
      const response = await this.openai.responses.create({
        model: 'gpt-5',
        reasoning: { effort: 'low' },
        input: prompt
      });

      const content = response.output_text;
      if (!content) {
        logger.warn('AI', 'No response from GPT-5');
        return {};
      }

      // Try multiple JSON extraction methods
      let extracted: any = null;

      // Method 1: Direct parse if response is pure JSON
      try {
        extracted = JSON.parse(content.trim());
      } catch {
        // Method 2: Extract JSON using regex (find last complete JSON object)
        const jsonMatches = content.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
        if (jsonMatches && jsonMatches.length > 0) {
          // Try parsing each match, use the last valid one
          for (let i = jsonMatches.length - 1; i >= 0; i--) {
            try {
              extracted = JSON.parse(jsonMatches[i]);
              break;
            } catch {
              continue;
            }
          }
        }

        // Method 3: Try to repair common JSON issues
        if (!extracted) {
          const repaired = this.repairJSON(content);
          if (repaired) {
            try {
              extracted = JSON.parse(repaired);
            } catch {
              // Repair failed
            }
          }
        }
      }

      if (!extracted) {
        logger.warn('AI', 'Failed to extract JSON from response', {
          content: content.substring(0, 200)
        });

        // Retry with simpler prompt
        return await this.analyzeWithSimplePrompt(message);
      }

      // Validate and clean extracted data
      const cleaned = this.validateExtractedIntent(extracted);

      // MERGE pattern results with GPT-5 results
      // IMPORTANT: Only override if GPT-5 actually has a value (not undefined)
      const merged: Partial<ParsedIntent> = { ...patternResult };

      // Only copy GPT-5 fields that are actually present
      if (cleaned.destination !== undefined) merged.destination = cleaned.destination;
      if (cleaned.duration !== undefined) merged.duration = cleaned.duration;
      if (cleaned.startDate !== undefined) merged.startDate = cleaned.startDate;
      if (cleaned.endDate !== undefined) merged.endDate = cleaned.endDate;
      if (cleaned.travelers !== undefined) merged.travelers = cleaned.travelers;
      if (cleaned.preferences !== undefined) merged.preferences = cleaned.preferences;

      logger.info('AI', 'Merged pattern and GPT-5 results');

      // Cache the merged result
      this.addToCache(cacheKey, merged);

      return merged;

    } catch (error) {
      logger.error('AI', 'Failed to analyze input', error);

      // Return pattern results as fallback (already extracted above)
      if (Object.keys(patternResult).length > 0) {
        logger.info('AI', 'Using pattern results as fallback', patternResult);
        this.addToCache(cacheKey, patternResult);
        return patternResult;
      }

      return {};
    }
  }

  /**
   * Determines what required fields are missing
   * NEVER allows generation without these fields
   */
  private getMissingRequiredFields(intent: ParsedIntent): string[] {
    const missing: string[] = [];

    if (!intent.destination) {
      missing.push('destination');
    }

    if (!intent.startDate && !intent.endDate) {
      missing.push('dates');
    }

    if (!intent.duration) {
      // Try to calculate from dates if available
      if (intent.startDate && intent.endDate) {
        const start = new Date(intent.startDate);
        const end = new Date(intent.endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        intent.duration = days;
      } else {
        missing.push('duration');
      }
    }

    return missing;
  }

  /**
   * Generates contextual questions for missing information
   * Makes the conversation feel natural
   */
  private async generateQuestion(
    missingField: string,
    intent: ParsedIntent
  ): Promise<string> {
    const questions: Record<string, string[]> = {
      destination: [
        "Where would you like to travel?",
        "What destination do you have in mind?",
        "Which city or country would you like to visit?"
      ],
      dates: intent.destination ? [
        `When would you like to visit ${intent.destination}?`,
        `What dates are you planning to travel to ${intent.destination}?`,
        `When are you thinking of going to ${intent.destination}?`
      ] : [
        "When would you like to travel?",
        "What are your travel dates?",
        "When are you planning this trip?"
      ],
      duration: intent.destination ? [
        `How many days would you like to spend in ${intent.destination}?`,
        `How long will your ${intent.destination} trip be?`,
        `What's the duration of your stay in ${intent.destination}?`
      ] : [
        "How many days are you planning to travel?",
        "How long would you like your trip to be?",
        "What's the duration of your trip?"
      ]
    };

    const fieldQuestions = questions[missingField] || [`Please provide your ${missingField}`];

    // Pick a random question for variety
    const question = fieldQuestions[Math.floor(Math.random() * fieldQuestions.length)];

    // Add helpful context if we have partial information
    if (missingField === 'dates' && intent.duration) {
      return `${question} (${intent.duration} days)`;
    }

    return question;
  }

  /**
   * Maps missing fields to conversation states
   */
  private getStateForField(field: string): ConversationState {
    const stateMap: Record<string, ConversationState> = {
      destination: ConversationState.COLLECTING_DESTINATION,
      dates: ConversationState.COLLECTING_DATES,
      duration: ConversationState.COLLECTING_DURATION,
      travelers: ConversationState.COLLECTING_TRAVELERS,
      preferences: ConversationState.COLLECTING_PREFERENCES,
    };

    return stateMap[field] || ConversationState.INITIAL;
  }

  /**
   * Creates a new conversation context
   */
  private createNewContext(): ConversationContext {
    return {
      sessionId: `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      state: ConversationState.INITIAL,
      intent: {},
      messages: [],
      lastUpdated: new Date()
    };
  }

  /**
   * Serializes context for passing between calls
   */
  private serializeContext(context: ConversationContext): string {
    return JSON.stringify(context);
  }

  /**
   * Deserializes context from string
   */
  private deserializeContext(serialized: string): ConversationContext {
    try {
      const context = JSON.parse(serialized);
      // Restore Date objects
      context.lastUpdated = new Date(context.lastUpdated);
      context.messages = context.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
      return context;
    } catch (error) {
      logger.error('AI', 'Failed to deserialize context', error);
      return this.createNewContext();
    }
  }

  /**
   * Repairs common JSON formatting issues
   */
  private repairJSON(text: string): string | null {
    try {
      // Remove everything before first { and after last }
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start === -1 || end === -1 || start >= end) return null;

      let json = text.substring(start, end + 1);

      // Multiple passes to fix different issues
      // Pass 1: Basic structure fixes
      json = json
        .replace(/[\n\r\t]/g, ' ')  // Remove line breaks
        .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')  // Quote keys
        .replace(/'([^']*)'/g, '"$1"');  // Single to double quotes

      // Pass 2: Fix missing commas (common GPT-5 issue)
      json = json
        .replace(/("[^"]*")\s+("[^"]*":)/g, '$1, $2')  // Between strings
        .replace(/(\d)\s+("[^"]*":)/g, '$1, $2')  // After numbers
        .replace(/([}\]])\s+("[^"]*":)/g, '$1, $2')  // After brackets
        .replace(/(true|false|null)\s+("[^"]*":)/g, '$1, $2');  // After keywords

      // Pass 3: Cleanup
      json = json
        .replace(/,\s*([}\]])/g, '$1')  // Remove trailing commas
        .replace(/,\s*,/g, ',')  // Remove duplicate commas
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .trim();

      // Validate by parsing
      JSON.parse(json);
      return json;
    } catch {
      // If repair fails, try manual extraction as last resort
      try {
        const pairs: Record<string, any> = {};

        // Extract destination
        const destMatch = text.match(/destination["']?\s*:\s*["']?([^"',}]+)/i);
        if (destMatch) pairs.destination = destMatch[1].trim();

        // Extract duration
        const durMatch = text.match(/duration["']?\s*:\s*["']?(\d+)/i);
        if (durMatch) pairs.duration = parseInt(durMatch[1]);

        // Extract dates
        const startMatch = text.match(/startDate["']?\s*:\s*["']?([\d\-\/]+)/i);
        if (startMatch) pairs.startDate = startMatch[1];

        const endMatch = text.match(/endDate["']?\s*:\s*["']?([\d\-\/]+)/i);
        if (endMatch) pairs.endDate = endMatch[1];

        // Extract travelers if present
        const adultsMatch = text.match(/adults["']?\s*:\s*["']?(\d+)/i);
        const childrenMatch = text.match(/children["']?\s*:\s*["']?(\d+)/i);
        if (adultsMatch || childrenMatch) {
          pairs.travelers = {
            adults: adultsMatch ? parseInt(adultsMatch[1]) : 1,
            children: childrenMatch ? parseInt(childrenMatch[1]) : 0
          };
        }

        return Object.keys(pairs).length > 0 ? JSON.stringify(pairs) : null;
      } catch {
        return null;
      }
    }
  }

  /**
   * Fallback to simple prompt for retry
   */
  private async analyzeWithSimplePrompt(message: string): Promise<Partial<ParsedIntent>> {
    // Super simple prompt with examples
    const simplePrompt = `Extract travel details. Reply with JSON only.

Examples:
"3 day trip to london" → {"destination":"london","duration":3}
"paris october 15" → {"destination":"paris","startDate":"2025-10-15"}

Now extract from: "${message}"

JSON:`;

    try {
      const response = await this.openai.responses.create({
        model: 'gpt-5',
        reasoning: { effort: 'low' }, // Minimal reasoning for retry
        input: simplePrompt
      });

      const content = response.output_text?.trim();
      if (!content) return {};

      // Try direct parse
      try {
        const parsed = JSON.parse(content);
        return this.validateExtractedIntent(parsed);
      } catch {
        // Try repair
        const repaired = this.repairJSON(content);
        if (repaired) {
          const parsed = JSON.parse(repaired);
          return this.validateExtractedIntent(parsed);
        }
      }
    } catch (error) {
      logger.warn('AI', 'Simple prompt also failed', error);
    }

    return {};
  }

  /**
   * Extract date range (e.g., "December 20 to December 27")
   */
  private extractDateRange(text: string): { startDate?: string; endDate?: string; duration?: number } {
    const months = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];

    // Pattern: Month Day to Month Day
    const rangePattern = new RegExp(
      `(${months.join('|')})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:to|until|-|through)\\s+(${months.join('|')})\\s+(\\d{1,2})(?:st|nd|rd|th)?`,
      'i'
    );

    const match = text.match(rangePattern);
    if (match) {
      const startMonth = months.indexOf(match[1].toLowerCase()) + 1;
      const startDay = parseInt(match[2]);
      const endMonth = months.indexOf(match[3].toLowerCase()) + 1;
      const endDay = parseInt(match[4]);

      const year = this.determineYear(startMonth, startDay);

      const startDate = `${year}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
      const endDate = `${year}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

      // Calculate duration
      const start = new Date(startDate);
      const end = new Date(endDate);
      const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      return { startDate, endDate, duration };
    }

    return {};
  }

  /**
   * Extract specific start date
   */
  private extractStartDate(text: string): string | null {
    const months = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];

    // Pattern: "starting October 15" or "on October 15"
    const startPattern = new RegExp(
      `(?:starting|from|on|beginning)\\s+(${months.join('|')})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+(\\d{4}))?`,
      'i'
    );

    const match = text.match(startPattern);
    if (match) {
      const month = months.indexOf(match[1].toLowerCase()) + 1;
      const day = parseInt(match[2]);
      const year = match[3] ? parseInt(match[3]) : this.determineYear(month, day);
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    return null;
  }

  /**
   * Extract relative dates (next month, in 2 weeks, etc.)
   */
  private extractRelativeDate(text: string): string | null {
    const lower = text.toLowerCase();

    // "monday next week", "tuesday next week", etc.
    const weekdayNextWeekMatch = lower.match(/(?:on\s+)?(\w+day)\s+next\s+week/);
    if (weekdayNextWeekMatch) {
      const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = weekdays.findIndex(d => weekdayNextWeekMatch[1].includes(d));
      if (targetDay !== -1) {
        const today = new Date(this.today);
        const daysUntilTarget = (targetDay - today.getDay() + 7) % 7;
        const nextWeekDay = new Date(this.today);
        nextWeekDay.setDate(nextWeekDay.getDate() + daysUntilTarget + 7);
        return this.formatDate(nextWeekDay);
      }
    }

    // "next week" (defaults to next Monday)
    if (lower.includes('next week')) {
      const today = new Date(this.today);
      const daysUntilMonday = (1 - today.getDay() + 7) % 7 || 7;
      const nextMonday = new Date(this.today);
      nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
      return this.formatDate(nextMonday);
    }

    // Next month
    if (lower.includes('next month')) {
      const nextMonth = new Date(this.today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      return this.formatDate(nextMonth);
    }

    // In X weeks
    const weeksMatch = text.match(/in\s+(\d+)\s+weeks?/i);
    if (weeksMatch) {
      const weeks = parseInt(weeksMatch[1]);
      const futureDate = new Date(this.today);
      futureDate.setDate(futureDate.getDate() + (weeks * 7));
      return this.formatDate(futureDate);
    }

    // In X days
    const daysMatch = text.match(/in\s+(\d+)\s+days?/i);
    if (daysMatch) {
      const days = parseInt(daysMatch[1]);
      const futureDate = new Date(this.today);
      futureDate.setDate(futureDate.getDate() + days);
      return this.formatDate(futureDate);
    }

    // Tomorrow
    if (lower.includes('tomorrow')) {
      const tomorrow = new Date(this.today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return this.formatDate(tomorrow);
    }

    // This weekend
    if (lower.includes('this weekend')) {
      const today = new Date(this.today);
      const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7;
      const saturday = new Date(this.today);
      saturday.setDate(saturday.getDate() + daysUntilSaturday);
      return this.formatDate(saturday);
    }

    return null;
  }

  /**
   * Extract month-based dates ("in March", "during April")
   */
  private extractMonthDate(text: string): string | null {
    const months = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];

    // Pattern: "in March" or "during April"
    const monthPattern = new RegExp(
      `(?:in|during|for)\\s+(${months.join('|')})(?:\\s+(\\d{4}))?`,
      'i'
    );

    const match = text.match(monthPattern);
    if (match) {
      const month = months.indexOf(match[1].toLowerCase()) + 1;
      const year = match[2] ? parseInt(match[2]) : this.determineYearForMonth(month);
      return `${year}-${String(month).padStart(2, '0')}-01`;
    }

    return null;
  }

  /**
   * Extract duration from text
   */
  private extractDuration(text: string): number | null {
    const lower = text.toLowerCase();

    // Explicit days
    const daysMatch = text.match(/(\d+)\s*(?:days?|dias?|d)/i);
    if (daysMatch) {
      return parseInt(daysMatch[1]);
    }

    // Week(s)
    const weeksMatch = text.match(/(\d+)\s*weeks?/i);
    if (weeksMatch) {
      return parseInt(weeksMatch[1]) * 7;
    }
    if (lower.includes('week') && !lower.includes('weekend')) {
      return 7;
    }

    // Weekend
    if (lower.includes('weekend')) {
      return 2;
    }

    // Long weekend
    if (lower.includes('long weekend')) {
      return 3;
    }

    return null;
  }

  /**
   * Determine appropriate year for a given month/day
   */
  private determineYear(month: number, day: number): number {
    const currentMonth = this.today.getMonth() + 1;
    const currentDay = this.today.getDate();

    // If the date has passed this year, use next year
    if (month < currentMonth || (month === currentMonth && day < currentDay)) {
      return this.nextYear;
    }

    return this.currentYear;
  }

  /**
   * Determine year for month-only dates
   */
  private determineYearForMonth(month: number): number {
    const currentMonth = this.today.getMonth() + 1;
    return month < currentMonth ? this.nextYear : this.currentYear;
  }

  /**
   * Format date to YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Pattern-based extraction as last resort
   */
  private extractWithPatterns(message: string): Partial<ParsedIntent> {
    const result: Partial<ParsedIntent> = {};
    const lower = message.toLowerCase();

    // Extract destination (common cities)
    const cities = ['london', 'paris', 'tokyo', 'rome', 'barcelona', 'dubai', 'singapore', 'bali', 'amsterdam', 'lisbon', 'mexico', 'méxico'];
    for (const city of cities) {
      if (lower.includes(city)) {
        result.destination = city.charAt(0).toUpperCase() + city.slice(1);
        break;
      }
    }

    // Advanced date extraction
    // Try date range first
    const rangeResult = this.extractDateRange(message);
    if (rangeResult.startDate && rangeResult.endDate) {
      result.startDate = rangeResult.startDate;
      result.endDate = rangeResult.endDate;
      result.duration = rangeResult.duration;
    } else {
      // Try specific start date
      const startDate = this.extractStartDate(message);
      if (startDate) {
        result.startDate = startDate;
      } else {
        // Try relative dates
        const relativeDate = this.extractRelativeDate(message);
        if (relativeDate) {
          result.startDate = relativeDate;
        } else {
          // Try month-based dates
          const monthDate = this.extractMonthDate(message);
          if (monthDate) {
            result.startDate = monthDate;
          }
        }
      }

      // Extract duration if not already set
      if (!result.duration) {
        const duration = this.extractDuration(message);
        if (duration) {
          result.duration = duration;
        }
      }
    }

    // Calculate end date if we have start and duration
    if (result.startDate && result.duration && !result.endDate) {
      const start = new Date(result.startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + result.duration - 1);
      result.endDate = this.formatDate(end);
    }

    // Extract traveler information
    const travelerMatch = message.match(/(\d+)\s*(?:adults?|people|persons?)(?:\s+(?:and|&)\s*(\d+)\s*(?:kids?|children))?/i);
    if (travelerMatch) {
      result.travelers = {
        adults: parseInt(travelerMatch[1]),
        children: parseInt(travelerMatch[2] || '0')
      };
    }

    return result;
  }

  /**
   * Validates and cleans extracted intent data
   */
  private validateExtractedIntent(data: any): Partial<ParsedIntent> {
    const result: Partial<ParsedIntent> = {};

    // Validate destination
    if (typeof data.destination === 'string' && data.destination.length > 0) {
      result.destination = data.destination;
    }

    // Validate duration
    if (typeof data.duration === 'number' && data.duration > 0 && data.duration <= 365) {
      result.duration = data.duration;
    } else if (typeof data.duration === 'string') {
      const parsed = parseInt(data.duration);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 365) {
        result.duration = parsed;
      }
    }

    // Validate dates
    if (typeof data.startDate === 'string' && /\d{4}-\d{2}-\d{2}/.test(data.startDate)) {
      result.startDate = data.startDate;
    }
    if (typeof data.endDate === 'string' && /\d{4}-\d{2}-\d{2}/.test(data.endDate)) {
      result.endDate = data.endDate;
    }

    // Validate travelers
    if (data.travelers && typeof data.travelers === 'object') {
      result.travelers = {
        adults: parseInt(data.travelers.adults) || 0,
        children: parseInt(data.travelers.children) || 0
      };
    }

    // Validate preferences
    if (data.preferences && typeof data.preferences === 'object') {
      result.preferences = data.preferences;
    }

    return result;
  }

  /**
   * Cache management methods
   */
  private getCacheKey(message: string): string {
    // Normalize the message for better cache hits
    return message.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  private getFromCache(key: string): Partial<ParsedIntent> | null {
    const entry = this.intentCache.get(key);
    if (!entry) return null;

    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.intentCache.delete(key);
      return null;
    }

    return entry.output;
  }

  private addToCache(key: string, value: Partial<ParsedIntent>): void {
    // Limit cache size
    if (this.intentCache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entry
      const firstKey = this.intentCache.keys().next().value;
      if (firstKey) {
        this.intentCache.delete(firstKey);
      }
    }

    this.intentCache.set(key, {
      input: key,
      output: value,
      timestamp: Date.now()
    });
  }

  /**
   * Checks if we have enough information to generate an itinerary
   */
  canGenerate(intent: ParsedIntent): boolean {
    return !!(
      intent.destination &&
      (intent.startDate || intent.endDate) &&
      intent.duration
    );
  }

  /**
   * Extracts trip parameters for generation
   * Called when ready to generate
   */
  getTripParameters(intent: ParsedIntent): {
    destination: string;
    startDate: string;
    duration: number;
    travelers: { adults: number; children: number };
    preferences: any;
  } {
    // Calculate start date if not provided
    let startDate = intent.startDate;
    if (!startDate && intent.endDate && intent.duration) {
      const end = new Date(intent.endDate);
      const start = new Date(end);
      start.setDate(start.getDate() - (intent.duration - 1));
      startDate = start.toISOString().split('T')[0];
    }

    // Default to tomorrow if no date provided (should not happen with proper flow)
    if (!startDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      startDate = tomorrow.toISOString().split('T')[0];
    }

    return {
      destination: intent.destination!,
      startDate: startDate,
      duration: intent.duration!,
      travelers: {
        adults: intent.travelers?.adults || 1,
        children: intent.travelers?.children || 0
      },
      preferences: intent.preferences || {}
    };
  }
}