/**
 * Conversation State Manager
 * Manages the state and context of AI conversations
 * NEVER uses defaults - always asks for missing information
 */

export enum ConversationState {
  GREETING = 'greeting',
  COLLECTING_DESTINATION = 'collecting_destination',
  COLLECTING_DATES = 'collecting_dates',
  COLLECTING_DURATION = 'collecting_duration',
  COLLECTING_TRAVELERS = 'collecting_travelers',
  COLLECTING_PREFERENCES = 'collecting_preferences',
  CONFIRMING_DETAILS = 'confirming_details',
  GENERATING = 'generating',
  SHOWING_ITINERARY = 'showing_itinerary',
  AWAITING_FEEDBACK = 'awaiting_feedback',
  MODIFYING = 'modifying'
}

export interface TravelerInfo {
  count: number;
  type: 'solo' | 'couple' | 'family' | 'group';
  description?: string;
}

export interface TripPreferences {
  tripType?: 'vacation' | 'business' | 'workation';
  activities?: string[];
  budget?: 'budget' | 'moderate' | 'luxury';
  dietary?: string[];
  specialRequests?: string[];
  needsCoworking?: boolean;
}

export interface CollectedData {
  destination?: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
  travelers?: TravelerInfo;
  preferences?: TripPreferences;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  messageType?: 'question' | 'answer' | 'confirmation' | 'itinerary';
}

export interface ConversationContext {
  state: ConversationState;
  collectedData: CollectedData;
  conversationHistory: Message[];
  currentItinerary?: any;
  pendingQuestion?: string;
  lastUpdateTime: Date;
  sessionId: string;
}

export class ConversationStateManager {
  private context: ConversationContext;

  constructor(sessionId?: string) {
    this.context = {
      state: ConversationState.GREETING,
      collectedData: {},
      conversationHistory: [],
      pendingQuestion: undefined,
      lastUpdateTime: new Date(),
      sessionId: sessionId || this.generateSessionId()
    };
  }

  /**
   * Get current conversation state
   */
  getState(): ConversationState {
    return this.context.state;
  }

  /**
   * Get current context
   */
  getContext(): ConversationContext {
    return this.context;
  }

  /**
   * Update conversation state
   */
  setState(state: ConversationState): void {
    this.context.state = state;
    this.context.lastUpdateTime = new Date();
  }

  /**
   * Add message to conversation history
   */
  addMessage(message: Message): void {
    this.context.conversationHistory.push(message);
    this.context.lastUpdateTime = new Date();
  }

  /**
   * Update collected data
   */
  updateCollectedData(data: Partial<CollectedData>): void {
    this.context.collectedData = {
      ...this.context.collectedData,
      ...data
    };
    this.context.lastUpdateTime = new Date();
  }

  /**
   * Check what information is missing
   * CRITICAL: This drives the conversation flow
   */
  getMissingInformation(): string[] {
    const missing: string[] = [];
    const data = this.context.collectedData;

    // Core requirements - MUST have these
    if (!data.destination) {
      missing.push('destination');
    }
    if (!data.startDate && !data.endDate) {
      missing.push('dates');
    }
    if (!data.duration) {
      missing.push('duration');
    }

    // Optional but helpful
    if (!data.travelers) {
      missing.push('travelers');
    }

    return missing;
  }

  /**
   * Check if we have enough information to generate an itinerary
   */
  canGenerateItinerary(): boolean {
    const data = this.context.collectedData;
    return !!(
      data.destination &&
      (data.startDate || data.endDate) &&
      data.duration
    );
  }

  /**
   * Get next state based on missing information
   */
  getNextState(): ConversationState {
    const missing = this.getMissingInformation();

    if (missing.length === 0) {
      return ConversationState.CONFIRMING_DETAILS;
    }

    // Priority order for collecting information
    if (missing.includes('destination')) {
      return ConversationState.COLLECTING_DESTINATION;
    }
    if (missing.includes('dates')) {
      return ConversationState.COLLECTING_DATES;
    }
    if (missing.includes('duration')) {
      return ConversationState.COLLECTING_DURATION;
    }
    if (missing.includes('travelers')) {
      return ConversationState.COLLECTING_TRAVELERS;
    }

    return ConversationState.COLLECTING_PREFERENCES;
  }

  /**
   * Set pending question
   */
  setPendingQuestion(question: string): void {
    this.context.pendingQuestion = question;
  }

  /**
   * Clear pending question
   */
  clearPendingQuestion(): void {
    this.context.pendingQuestion = undefined;
  }

  /**
   * Save current itinerary
   */
  setCurrentItinerary(itinerary: any): void {
    this.context.currentItinerary = itinerary;
    this.setState(ConversationState.SHOWING_ITINERARY);
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Reset conversation to start fresh
   */
  reset(): void {
    this.context = {
      state: ConversationState.GREETING,
      collectedData: {},
      conversationHistory: [],
      pendingQuestion: undefined,
      lastUpdateTime: new Date(),
      sessionId: this.generateSessionId()
    };
  }

  /**
   * Check if conversation has timed out (30 minutes)
   */
  hasTimedOut(): boolean {
    const thirtyMinutes = 30 * 60 * 1000;
    const timeSinceLastUpdate = Date.now() - this.context.lastUpdateTime.getTime();
    return timeSinceLastUpdate > thirtyMinutes;
  }

  /**
   * Format collected data for confirmation
   */
  formatDetailsForConfirmation(): string {
    const data = this.context.collectedData;
    const parts: string[] = [];

    if (data.destination) {
      parts.push(`Destination: ${data.destination}`);
    }
    if (data.startDate) {
      parts.push(`Starting: ${data.startDate}`);
    }
    if (data.duration) {
      parts.push(`Duration: ${data.duration} days`);
    }
    if (data.travelers) {
      const travelerText = data.travelers.count === 1
        ? 'Solo traveler'
        : `${data.travelers.count} ${data.travelers.type}`;
      parts.push(`Travelers: ${travelerText}`);
    }
    if (data.preferences?.needsCoworking) {
      parts.push('Including coworking spaces');
    }

    return parts.join('\n');
  }

  /**
   * Serialize context for storage/API
   */
  serialize(): string {
    return JSON.stringify(this.context);
  }

  /**
   * Deserialize context from storage/API
   */
  static deserialize(data: string): ConversationStateManager {
    const context = JSON.parse(data);
    const manager = new ConversationStateManager(context.sessionId);
    manager.context = {
      ...context,
      lastUpdateTime: new Date(context.lastUpdateTime),
      conversationHistory: context.conversationHistory.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))
    };
    return manager;
  }
}