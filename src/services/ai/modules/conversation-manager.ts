/**
 * Conversation Manager Module
 * Manages conversation state, context, and message history
 * Handles state transitions and context serialization
 */

import { ParsedIntent } from './intent-parser';
import { logger } from '@/lib/monitoring/logger';

// Conversation state enum
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

// Message type
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Conversation context
export interface ConversationContext {
  sessionId: string;
  state: ConversationState;
  intent: ParsedIntent;
  messages: ConversationMessage[];
  lastUpdated: Date;
  messageCount: number;
  currentIntent?: Partial<ParsedIntent>;
  generationId?: string;
}

export class ConversationManager {
  private contexts: Map<string, ConversationContext>;
  private readonly maxMessages: number = 50;
  private readonly contextTTL: number = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.contexts = new Map();
  }

  /**
   * Create a new conversation context
   */
  createContext(sessionId?: string): ConversationContext {
    const id = sessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const context: ConversationContext = {
      sessionId: id,
      state: ConversationState.INITIAL,
      intent: {},
      messages: [],
      lastUpdated: new Date(),
      messageCount: 0,
      currentIntent: {}
    };

    this.contexts.set(id, context);
    logger.debug('AI', 'Created new conversation context', { sessionId: id });

    return context;
  }

  /**
   * Get or create context for session
   */
  getOrCreateContext(sessionId: string): ConversationContext {
    let context = this.contexts.get(sessionId);

    if (!context) {
      context = this.createContext(sessionId);
    } else {
      // Check if context is expired
      if (Date.now() - context.lastUpdated.getTime() > this.contextTTL) {
        logger.debug('AI', 'Context expired, creating new one', { sessionId });
        context = this.createContext(sessionId);
      }
    }

    return context;
  }

  /**
   * Update conversation context
   */
  updateContext(
    sessionId: string,
    updates: Partial<ConversationContext>
  ): ConversationContext {
    const context = this.getOrCreateContext(sessionId);

    // Merge updates
    Object.assign(context, updates, {
      lastUpdated: new Date(),
      messageCount: context.messageCount + (updates.messages ? updates.messages.length : 0)
    });

    // Manage message history size
    if (context.messages.length > this.maxMessages) {
      context.messages = context.messages.slice(-this.maxMessages);
    }

    this.contexts.set(sessionId, context);
    logger.debug('AI', 'Updated conversation context', {
      sessionId,
      state: context.state,
      messageCount: context.messageCount
    });

    return context;
  }

  /**
   * Add message to conversation
   */
  addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string
  ): ConversationContext {
    const context = this.getOrCreateContext(sessionId);

    const message: ConversationMessage = {
      role,
      content,
      timestamp: new Date()
    };

    context.messages.push(message);
    context.messageCount++;
    context.lastUpdated = new Date();

    // Trim old messages if needed
    if (context.messages.length > this.maxMessages) {
      context.messages = context.messages.slice(-this.maxMessages);
    }

    this.contexts.set(sessionId, context);

    return context;
  }

  /**
   * Update conversation state
   */
  updateState(sessionId: string, newState: ConversationState): ConversationContext {
    const context = this.getOrCreateContext(sessionId);

    const oldState = context.state;
    context.state = newState;
    context.lastUpdated = new Date();

    this.contexts.set(sessionId, context);

    logger.debug('AI', 'State transition', {
      sessionId,
      from: oldState,
      to: newState
    });

    return context;
  }

  /**
   * Update intent in context
   */
  updateIntent(sessionId: string, intent: Partial<ParsedIntent>): ConversationContext {
    const context = this.getOrCreateContext(sessionId);

    // Merge with existing intent
    context.currentIntent = {
      ...context.currentIntent,
      ...intent
    };

    context.intent = context.currentIntent as ParsedIntent;
    context.lastUpdated = new Date();

    this.contexts.set(sessionId, context);

    logger.debug('AI', 'Updated intent', {
      sessionId,
      intent: context.currentIntent
    });

    return context;
  }

  /**
   * Get state for missing field
   */
  getStateForField(field: string): ConversationState {
    const fieldStateMap: Record<string, ConversationState> = {
      destination: ConversationState.COLLECTING_DESTINATION,
      destinations: ConversationState.COLLECTING_DESTINATION,
      startDate: ConversationState.COLLECTING_DATES,
      endDate: ConversationState.COLLECTING_DATES,
      duration: ConversationState.COLLECTING_DURATION,
      travelers: ConversationState.COLLECTING_TRAVELERS,
      preferences: ConversationState.COLLECTING_PREFERENCES,
      budget: ConversationState.COLLECTING_PREFERENCES,
      interests: ConversationState.COLLECTING_PREFERENCES
    };

    return fieldStateMap[field] || ConversationState.INITIAL;
  }

  /**
   * Check if context has required fields for generation
   */
  hasRequiredFields(sessionId: string): boolean {
    const context = this.getOrCreateContext(sessionId);
    const intent = context.currentIntent || {};

    // Required fields for trip generation
    const hasDestination = !!(intent.destination || intent.destinations);
    const hasDuration = !!(intent.duration || (intent.startDate && intent.endDate));
    const hasStartDate = !!intent.startDate;

    return hasDestination && hasDuration && hasStartDate;
  }

  /**
   * Get missing required fields
   */
  getMissingFields(sessionId: string): string[] {
    const context = this.getOrCreateContext(sessionId);
    const intent = context.currentIntent || {};
    const missing: string[] = [];

    // Check destination
    if (!intent.destination && !intent.destinations) {
      missing.push('destination');
    }

    // Check duration
    if (!intent.duration && !(intent.startDate && intent.endDate)) {
      missing.push('duration');
    }

    // Check start date
    if (!intent.startDate) {
      missing.push('startDate');
    }

    return missing;
  }

  /**
   * Serialize context for storage/transmission
   */
  serializeContext(context: ConversationContext): string {
    try {
      return JSON.stringify({
        sessionId: context.sessionId,
        state: context.state,
        intent: context.intent,
        currentIntent: context.currentIntent,
        messages: context.messages.slice(-10), // Only keep last 10 messages
        lastUpdated: context.lastUpdated,
        messageCount: context.messageCount,
        generationId: context.generationId
      });
    } catch (error) {
      logger.error('AI', 'Failed to serialize context', { error });
      return '{}';
    }
  }

  /**
   * Deserialize context from string
   */
  deserializeContext(serialized: string): ConversationContext | null {
    try {
      const data = JSON.parse(serialized);

      // Validate required fields
      if (!data.sessionId) {
        return null;
      }

      // Reconstruct context
      const context: ConversationContext = {
        sessionId: data.sessionId,
        state: data.state || ConversationState.INITIAL,
        intent: data.intent || {},
        currentIntent: data.currentIntent || data.intent || {},
        messages: (data.messages || []).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })),
        lastUpdated: new Date(data.lastUpdated || Date.now()),
        messageCount: data.messageCount || 0,
        generationId: data.generationId
      };

      // Store in memory
      this.contexts.set(context.sessionId, context);

      return context;
    } catch (error) {
      logger.error('AI', 'Failed to deserialize context', { error });
      return null;
    }
  }

  /**
   * Clear expired contexts from memory
   */
  cleanupExpiredContexts(): number {
    const now = Date.now();
    let removed = 0;

    for (const [sessionId, context] of this.contexts.entries()) {
      if (now - context.lastUpdated.getTime() > this.contextTTL) {
        this.contexts.delete(sessionId);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug('AI', 'Cleaned up expired contexts', { removed });
    }

    return removed;
  }

  /**
   * Get conversation summary for logging
   */
  getConversationSummary(sessionId: string): {
    sessionId: string;
    state: ConversationState;
    messageCount: number;
    hasIntent: boolean;
    missingFields: string[];
    age: number;
  } {
    const context = this.contexts.get(sessionId);

    if (!context) {
      return {
        sessionId,
        state: ConversationState.INITIAL,
        messageCount: 0,
        hasIntent: false,
        missingFields: ['destination', 'duration', 'startDate'],
        age: 0
      };
    }

    return {
      sessionId: context.sessionId,
      state: context.state,
      messageCount: context.messageCount,
      hasIntent: !!context.currentIntent && Object.keys(context.currentIntent).length > 0,
      missingFields: this.getMissingFields(sessionId),
      age: Date.now() - context.lastUpdated.getTime()
    };
  }

  /**
   * Reset conversation context
   */
  resetContext(sessionId: string): ConversationContext {
    logger.debug('AI', 'Resetting conversation context', { sessionId });
    return this.createContext(sessionId);
  }

  /**
   * Get all active contexts (for monitoring)
   */
  getActiveContexts(): ConversationContext[] {
    return Array.from(this.contexts.values());
  }

  /**
   * Get context stats
   */
  getStats(): {
    totalContexts: number;
    activeContexts: number;
    expiredContexts: number;
    averageMessageCount: number;
  } {
    const now = Date.now();
    let expired = 0;
    let totalMessages = 0;

    for (const context of this.contexts.values()) {
      if (now - context.lastUpdated.getTime() > this.contextTTL) {
        expired++;
      }
      totalMessages += context.messageCount;
    }

    return {
      totalContexts: this.contexts.size,
      activeContexts: this.contexts.size - expired,
      expiredContexts: expired,
      averageMessageCount: this.contexts.size > 0
        ? totalMessages / this.contexts.size
        : 0
    };
  }
}