/**
 * Conversation State Manager for Enhanced Dialog Architecture
 * Tracks conversation context across multiple exchanges
 */

import { logger } from '@/lib/logger';
import type { GeneratePersonalizedItineraryOutput, Itinerary } from '@/ai/schemas';
import type { InputType, ClassificationResult } from '@/ai/utils/input-classifier';

// Core state interfaces
export interface ConversationMessage {
  id: string;
  timestamp: Date;
  role: 'user' | 'assistant' | 'system';
  content: string;
  classification?: ClassificationResult;
  metadata?: {
    processingTime?: number;
    parserUsed?: string;
    confidence?: number;
    [key: string]: any;
  };
}

export interface TravelConstraint {
  type: 'budget' | 'dates' | 'travelers' | 'accessibility' | 'preferences';
  value: any;
  confidence: 'high' | 'medium' | 'low';
  source: 'explicit' | 'inferred';
  timestamp: Date;
}

export interface DestinationInfo {
  name: string;
  days: number;
  confirmed: boolean;
  preferences?: string[];
  constraints?: TravelConstraint[];
  order?: number;
}

export interface ConversationContext {
  // Travel details
  origin?: string;
  destinations: DestinationInfo[];
  totalDays?: number;
  startDate?: Date;
  endDate?: Date;
  
  // User preferences
  preferences: Map<string, any>;
  constraints: TravelConstraint[];
  
  // Conversation state
  phase: 'initial' | 'planning' | 'confirming' | 'modifying' | 'finalizing';
  lastIntent: InputType | null;
  pendingConfirmations: string[];
  
  // Extracted from conversation
  budget?: {
    total?: number;
    currency?: string;
    perPerson?: boolean;
  };
  travelers?: number;
  travelStyle?: string[];
}

export interface ConversationState {
  sessionId: string;
  userId?: string;
  
  // Current itinerary
  currentItinerary?: GeneratePersonalizedItineraryOutput | Itinerary;
  itineraryHistory: (GeneratePersonalizedItineraryOutput | Itinerary)[];
  
  // Conversation tracking
  messages: ConversationMessage[];
  context: ConversationContext;
  
  // Session metadata
  metadata: {
    startTime: Date;
    lastActivity: Date;
    messageCount: number;
    totalProcessingTime: number;
    errors: string[];
    flags: string[];
  };
}

export interface StateUpdateOptions {
  message?: ConversationMessage;
  itinerary?: GeneratePersonalizedItineraryOutput | Itinerary;
  contextUpdates?: Partial<ConversationContext>;
  metadata?: Partial<ConversationState['metadata']>;
}

export class ConversationStateManager {
  private static states = new Map<string, ConversationState>();
  private static readonly TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private static cleanupInterval: NodeJS.Timeout | null = null;

  static {
    // Start cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Initialize a new conversation state
   */
  static initializeState(sessionId: string, userId?: string): ConversationState {
    const now = new Date();
    
    const state: ConversationState = {
      sessionId,
      userId,
      currentItinerary: undefined,
      itineraryHistory: [],
      messages: [],
      context: {
        destinations: [],
        preferences: new Map(),
        constraints: [],
        phase: 'initial',
        lastIntent: null,
        pendingConfirmations: []
      },
      metadata: {
        startTime: now,
        lastActivity: now,
        messageCount: 0,
        totalProcessingTime: 0,
        errors: [],
        flags: []
      }
    };

    this.states.set(sessionId, state);
    
    logger.info('ConversationState', 'Initialized new conversation', {
      sessionId,
      userId: userId || 'anonymous'
    });

    return state;
  }

  /**
   * Get conversation state by session ID
   */
  static getState(sessionId: string): ConversationState | null {
    const state = this.states.get(sessionId);
    
    if (state) {
      // Check if expired
      const now = Date.now();
      const lastActivity = state.metadata.lastActivity.getTime();
      if (now - lastActivity > this.TTL_MS) {
        this.states.delete(sessionId);
        logger.info('ConversationState', 'Expired conversation state', { sessionId });
        return null;
      }
    }
    
    return state || null;
  }

  /**
   * Get or create conversation state
   */
  static getOrCreateState(sessionId: string, userId?: string): ConversationState {
    let state = this.getState(sessionId);
    if (!state) {
      state = this.initializeState(sessionId, userId);
    }
    return state;
  }

  /**
   * Update conversation state
   */
  static updateState(sessionId: string, updates: StateUpdateOptions): ConversationState {
    const state = this.getOrCreateState(sessionId);
    const now = new Date();

    // Update last activity
    state.metadata.lastActivity = now;

    // Add new message
    if (updates.message) {
      state.messages.push(updates.message);
      state.metadata.messageCount++;
      
      // Update processing time
      if (updates.message.metadata?.processingTime) {
        state.metadata.totalProcessingTime += updates.message.metadata.processingTime;
      }

      // Update conversation phase based on message type
      if (updates.message.classification) {
        this.updateConversationPhase(state, updates.message.classification);
      }
    }

    // Update current itinerary
    if (updates.itinerary) {
      // Save previous to history if exists
      if (state.currentItinerary) {
        state.itineraryHistory.push(state.currentItinerary);
        
        // Keep only last 5 versions
        if (state.itineraryHistory.length > 5) {
          state.itineraryHistory = state.itineraryHistory.slice(-5);
        }
      }
      
      state.currentItinerary = updates.itinerary;
      
      // Extract context from itinerary
      this.extractContextFromItinerary(state, updates.itinerary);
    }

    // Apply context updates
    if (updates.contextUpdates) {
      this.mergeContext(state.context, updates.contextUpdates);
    }

    // Apply metadata updates
    if (updates.metadata) {
      Object.assign(state.metadata, updates.metadata);
    }

    this.states.set(sessionId, state);
    
    return state;
  }

  /**
   * Extract relevant context for AI prompts
   */
  static buildContextPrompt(state: ConversationState): string {
    const context: string[] = [];
    
    // Add current travel details
    if (state.context.origin) {
      context.push(`Departing from: ${state.context.origin}`);
    }
    
    if (state.context.destinations.length > 0) {
      const destStr = state.context.destinations
        .map(d => `${d.name} (${d.days} days)${d.confirmed ? ' ✓' : ''}`)
        .join(', ');
      context.push(`Destinations: ${destStr}`);
    }
    
    if (state.context.totalDays) {
      context.push(`Total duration: ${state.context.totalDays} days`);
    }

    // Add preferences
    if (state.context.preferences.size > 0) {
      const prefs = Array.from(state.context.preferences.entries())
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      context.push(`Preferences: ${prefs}`);
    }

    // Add constraints
    if (state.context.constraints.length > 0) {
      const constraints = state.context.constraints
        .map(c => `${c.type}: ${c.value}`)
        .join(', ');
      context.push(`Constraints: ${constraints}`);
    }

    // Add conversation phase
    context.push(`Conversation phase: ${state.context.phase}`);
    
    // Add recent message context (last 3 user messages)
    const recentUserMessages = state.messages
      .filter(m => m.role === 'user')
      .slice(-3)
      .map(m => m.content);
    
    if (recentUserMessages.length > 0) {
      context.push(`Recent requests: ${recentUserMessages.join(' → ')}`);
    }

    return context.join('\n');
  }

  /**
   * Get conversation summary for UI display
   */
  static getConversationSummary(state: ConversationState): {
    phase: string;
    destinations: string[];
    totalDays: number;
    messageCount: number;
    hasCurrentItinerary: boolean;
    lastActivity: Date;
  } {
    return {
      phase: state.context.phase,
      destinations: state.context.destinations.map(d => d.name),
      totalDays: state.context.totalDays || 0,
      messageCount: state.metadata.messageCount,
      hasCurrentItinerary: !!state.currentItinerary,
      lastActivity: state.metadata.lastActivity
    };
  }

  /**
   * Clear conversation state (for testing or reset)
   */
  static clearState(sessionId: string): boolean {
    const existed = this.states.has(sessionId);
    this.states.delete(sessionId);
    
    if (existed) {
      logger.info('ConversationState', 'Cleared conversation state', { sessionId });
    }
    
    return existed;
  }

  /**
   * Get all active session IDs (for debugging)
   */
  static getActiveSessions(): string[] {
    return Array.from(this.states.keys());
  }

  /**
   * Get statistics about current state
   */
  static getStats(): {
    activeStates: number;
    totalMessages: number;
    averageSessionLength: number;
    oldestSession: Date | null;
  } {
    const states = Array.from(this.states.values());
    const totalMessages = states.reduce((sum, state) => sum + state.metadata.messageCount, 0);
    const averageSessionLength = states.length > 0 ? totalMessages / states.length : 0;
    const oldestSession = states.length > 0 
      ? new Date(Math.min(...states.map(s => s.metadata.startTime.getTime())))
      : null;

    return {
      activeStates: states.length,
      totalMessages,
      averageSessionLength,
      oldestSession
    };
  }

  // Private helper methods

  private static updateConversationPhase(state: ConversationState, classification: ClassificationResult): void {
    const { type } = classification;
    
    // Update last intent
    state.context.lastIntent = type;
    
    // Update phase based on intent and current state
    switch (type) {
      case 'structured':
        if (state.context.phase === 'initial') {
          state.context.phase = 'planning';
        }
        break;
        
      case 'modification':
        if (state.currentItinerary) {
          state.context.phase = 'modifying';
        }
        break;
        
      case 'question':
        // Keep current phase for questions
        break;
        
      case 'conversational':
        if (state.context.phase === 'initial') {
          state.context.phase = 'planning';
        }
        break;
        
      case 'ambiguous':
        // Keep current phase for ambiguous inputs
        break;
    }
  }

  private static extractContextFromItinerary(state: ConversationState, itinerary: GeneratePersonalizedItineraryOutput | Itinerary): void {
    // Extract destinations from itinerary
    const destinations: DestinationInfo[] = [];
    
    // Group days by destination
    const destMap = new Map<string, number>();
    
    for (const day of itinerary.itinerary) {
      const dest = ('_destination' in day ? day._destination : undefined) || 
                   day.title.split(':')[1]?.trim() || 
                   itinerary.destination;
      if (dest) {
        destMap.set(dest, (destMap.get(dest) || 0) + 1);
      }
    }
    
    // Convert to destination info
    for (const [name, days] of destMap.entries()) {
      destinations.push({
        name,
        days,
        confirmed: true
      });
    }
    
    // Update context
    state.context.destinations = destinations;
    state.context.totalDays = itinerary.itinerary.length;
    
    // Extract other info if available
    if ('_costEstimate' in itinerary && itinerary._costEstimate) {
      state.context.budget = {
        total: itinerary._costEstimate.total,
        currency: itinerary._costEstimate.currency,
        perPerson: true
      };
    }
  }

  private static mergeContext(current: ConversationContext, updates: Partial<ConversationContext>): void {
    // Merge simple properties
    Object.assign(current, {
      origin: updates.origin ?? current.origin,
      totalDays: updates.totalDays ?? current.totalDays,
      startDate: updates.startDate ?? current.startDate,
      endDate: updates.endDate ?? current.endDate,
      phase: updates.phase ?? current.phase,
      lastIntent: updates.lastIntent ?? current.lastIntent,
      budget: updates.budget ?? current.budget,
      travelers: updates.travelers ?? current.travelers
    });

    // Merge arrays
    if (updates.destinations) {
      current.destinations = updates.destinations;
    }
    
    if (updates.constraints) {
      current.constraints = [...current.constraints, ...updates.constraints];
    }
    
    if (updates.pendingConfirmations) {
      current.pendingConfirmations = updates.pendingConfirmations;
    }
    
    if (updates.travelStyle) {
      current.travelStyle = updates.travelStyle;
    }

    // Merge preferences map
    if (updates.preferences) {
      for (const [key, value] of updates.preferences.entries()) {
        current.preferences.set(key, value);
      }
    }
  }

  private static startCleanupTimer(): void {
    // Clean up expired states every hour
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      
      for (const [sessionId, state] of this.states.entries()) {
        const lastActivity = state.metadata.lastActivity.getTime();
        if (now - lastActivity > this.TTL_MS) {
          this.states.delete(sessionId);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        logger.info('ConversationState', 'Cleaned up expired states', { cleaned });
      }
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Shutdown cleanup (for testing)
   */
  static shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.states.clear();
  }
}