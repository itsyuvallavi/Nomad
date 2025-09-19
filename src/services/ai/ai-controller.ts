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

export class AIController {
  private openai: OpenAI;

  constructor() {
    this.openai = getOpenAIClient();
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
   * Uses GPT to understand natural language
   */
  private async analyzeUserInput(
    message: string,
    currentIntent: ParsedIntent
  ): Promise<Partial<ParsedIntent>> {
    const prompt = `
      Analyze this travel-related message and extract any travel information.
      Current context: ${JSON.stringify(currentIntent)}

      User message: "${message}"

      Extract and return ONLY the new information mentioned:
      - destination: city/country if mentioned
      - startDate: in YYYY-MM-DD format if a date is mentioned
      - duration: number of days if mentioned
      - travelers: number of adults/children if mentioned
      - preferences: budget level, interests, pace if mentioned

      If the message contains relative dates like "next month" or "in 2 weeks",
      calculate from today (${new Date().toISOString().split('T')[0]}).

      Return ONLY a JSON object with the fields that were explicitly mentioned.
      Do not infer or assume information not directly stated.
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a travel information extractor. Only extract explicitly mentioned information.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 500
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return {};

      const extracted = JSON.parse(content);
      logger.info('AI', 'Extracted intent', extracted);
      return extracted;
    } catch (error) {
      logger.error('AI', 'Failed to analyze input', error);
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
      travelers: intent.travelers || { adults: 1, children: 0 },
      preferences: intent.preferences || {}
    };
  }
}