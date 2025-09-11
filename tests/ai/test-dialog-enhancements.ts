/**
 * Comprehensive tests for Phase 3 Dialog Enhancements
 * Tests dialog response generation, modification handling, and chat conversation flow
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { 
  handleChatMessage, 
  getConversationState, 
  clearConversationState,
  type ChatRequest 
} from '../../../src/ai/flows/chat-conversation';
import { 
  generateDialogResponse,
  createConversationState,
  updateConversationState 
} from '../../../src/ai/flows/generate-dialog-response';
import { handleModification } from '../../../src/ai/flows/handle-modification';
import { classifyInput } from '../../../src/ai/utils/hybrid-parser';

describe('Phase 3 Dialog Enhancements', () => {
  beforeEach(() => {
    // Clear any existing conversation states
    clearConversationState('test-session-1');
    clearConversationState('test-session-2');
  });

  describe('Input Classification', () => {
    it('should correctly classify structured travel requests', async () => {
      const classification = classifyInput('3 days in Paris from New York');
      
      expect(classification.type).toBe('structured');
      expect(classification.confidence).toBeGreaterThan(0.8);
      expect(classification.complexity).toBe('simple');
      expect(classification.features.hasDestination).toBe(true);
      expect(classification.features.hasDuration).toBe(true);
      expect(classification.features.hasOrigin).toBe(true);
    });

    it('should correctly classify conversational requests', async () => {
      const classification = classifyInput('I want to visit somewhere romantic in Europe');
      
      expect(classification.type).toBe('conversational');
      expect(classification.complexity).toBe('medium');
      expect(classification.features.hasDestination).toBe(true);
      expect(classification.features.hasPreferences).toBe(true);
    });

    it('should correctly classify modification requests', async () => {
      const classification = classifyInput('add 2 more days in Rome');
      
      expect(classification.type).toBe('modification');
      expect(classification.features.isModification).toBe(true);
      expect(classification.features.hasDestination).toBe(true);
      expect(classification.features.hasDuration).toBe(true);
    });

    it('should correctly classify pure questions', async () => {
      const classification = classifyInput('what is included in the itinerary?');
      
      expect(classification.type).toBe('question');
      expect(classification.features.isQuestion).toBe(true);
    });
  });

  describe('Dialog Response Generation', () => {
    it('should generate clarification response for incomplete request', async () => {
      const classification = classifyInput('I want to visit Paris');
      const parseResult = {
        success: true,
        confidence: 0.7,
        source: 'traditional' as const,
        parsedTrip: {
          origin: '',
          destinations: [{ name: 'Paris', duration: 0 }],
          totalDays: 0,
          startDate: null,
          preferences: [],
          travelStyle: 'balanced'
        },
        metadata: {
          processingTime: 50,
          fallbackUsed: false,
          classification
        }
      };
      
      const context = createConversationState('test-session', 'test-user');
      const response = await generateDialogResponse('I want to visit Paris', classification, parseResult, context);
      
      expect(response.type).toBe('clarification');
      expect(response.content).toContain('duration');
      expect(response.metadata.requiresFollowUp).toBe(true);
    });

    it('should generate confirmation response for complete request', async () => {
      const classification = classifyInput('5 days in Paris from New York');
      const parseResult = {
        success: true,
        confidence: 0.9,
        source: 'traditional' as const,
        parsedTrip: {
          origin: 'New York',
          destinations: [{ name: 'Paris', duration: 5 }],
          totalDays: 5,
          startDate: null,
          preferences: [],
          travelStyle: 'balanced'
        },
        metadata: {
          processingTime: 30,
          fallbackUsed: false,
          classification
        }
      };
      
      const context = createConversationState('test-session', 'test-user');
      const response = await generateDialogResponse('5 days in Paris from New York', classification, parseResult, context);
      
      expect(response.type).toBe('confirmation');
      expect(response.content).toContain('5-day');
      expect(response.content).toContain('Paris');
      expect(response.content).toContain('New York');
    });

    it('should handle parsing errors gracefully', async () => {
      const classification = classifyInput('take me somewhere nice');
      const parseResult = {
        success: false,
        confidence: 0.2,
        source: 'hybrid' as const,
        metadata: {
          processingTime: 100,
          fallbackUsed: true,
          classification
        }
      };
      
      const context = createConversationState('test-session', 'test-user');
      const response = await generateDialogResponse('take me somewhere nice', classification, parseResult, context);
      
      expect(response.type).toBe('clarification');
      expect(response.content).toContain('destination');
      expect(response.context?.suggestions).toBeDefined();
    });
  });

  describe('Modification Handling', () => {
    it('should handle adding destinations to existing itinerary', async () => {
      const currentItinerary = {
        origin: 'New York',
        destinations: [{ name: 'Paris', duration: 5 }],
        totalDays: 5,
        startDate: null,
        preferences: [],
        travelStyle: 'balanced' as const
      };
      
      const context = createConversationState('test-session', 'test-user');
      context.currentItinerary = currentItinerary;
      
      const result = await handleModification('add 3 days in Rome', currentItinerary, context);
      
      expect(result.success).toBe(true);
      expect(result.changes.after.destinations).toHaveLength(2);
      expect(result.changes.after.destinations[1].name).toBe('Rome');
      expect(result.changes.after.destinations[1].duration).toBe(3);
      expect(result.changes.after.totalDays).toBe(8);
    });

    it('should handle duration modifications', async () => {
      const currentItinerary = {
        origin: 'London',
        destinations: [{ name: 'Barcelona', duration: 4 }],
        totalDays: 4,
        startDate: null,
        preferences: [],
        travelStyle: 'balanced' as const
      };
      
      const context = createConversationState('test-session', 'test-user');
      context.currentItinerary = currentItinerary;
      
      const result = await handleModification('extend Barcelona to 7 days', currentItinerary, context);
      
      expect(result.success).toBe(true);
      expect(result.changes.after.destinations[0].duration).toBe(7);
      expect(result.changes.after.totalDays).toBe(7);
    });

    it('should handle removing destinations', async () => {
      const currentItinerary = {
        origin: 'Berlin',
        destinations: [
          { name: 'Prague', duration: 3 },
          { name: 'Vienna', duration: 4 }
        ],
        totalDays: 7,
        startDate: null,
        preferences: [],
        travelStyle: 'balanced' as const
      };
      
      const context = createConversationState('test-session', 'test-user');
      context.currentItinerary = currentItinerary;
      
      const result = await handleModification('remove Vienna from the trip', currentItinerary, context);
      
      expect(result.success).toBe(true);
      expect(result.changes.after.destinations).toHaveLength(1);
      expect(result.changes.after.destinations[0].name).toBe('Prague');
      expect(result.changes.after.totalDays).toBe(3);
    });
  });

  describe('Complete Chat Conversation Flow', () => {
    it('should handle new travel planning conversation', async () => {
      const request: ChatRequest = {
        message: '5 days in Tokyo from San Francisco',
        sessionId: 'test-session-1',
        userId: 'test-user-1'
      };
      
      const response = await handleChatMessage(request);
      
      expect(response.success).toBe(true);
      expect(response.sessionId).toBe('test-session-1');
      expect(response.response.type).toBe('confirmation');
      expect(response.conversationState.currentItinerary?.destinations[0].name).toBe('Tokyo');
      expect(response.conversationState.currentItinerary?.origin).toBe('San Francisco');
      expect(response.metadata.classification.type).toBe('structured');
      expect(response.metadata.parseResult.success).toBe(true);
    });

    it('should handle conversational travel requests', async () => {
      const request: ChatRequest = {
        message: 'I want to visit somewhere warm for a week',
        sessionId: 'test-session-2',
        userId: 'test-user-2'
      };
      
      const response = await handleChatMessage(request);
      
      expect(response.success).toBe(true);
      expect(response.response.type).toBe('clarification');
      expect(response.response.content).toContain('destination');
      expect(response.metadata.classification.type).toBe('conversational');
    });

    it('should handle multi-turn conversation flow', async () => {
      // First message - incomplete request
      const request1: ChatRequest = {
        message: 'I want to go to Italy',
        sessionId: 'multi-turn-test',
        userId: 'test-user-3'
      };
      
      const response1 = await handleChatMessage(request1);
      
      expect(response1.success).toBe(true);
      expect(response1.response.type).toBe('clarification');
      expect(response1.conversationState.context.destinations).toContain('Italy');
      
      // Second message - provide duration
      const request2: ChatRequest = {
        message: '10 days please',
        sessionId: 'multi-turn-test',
        userId: 'test-user-3'
      };
      
      const response2 = await handleChatMessage(request2);
      
      expect(response2.success).toBe(true);
      expect(response2.conversationState.history).toHaveLength(4); // 2 user + 2 assistant messages
      
      // Verify conversation state persisted
      const conversationState = getConversationState('multi-turn-test');
      expect(conversationState?.context.destinations).toContain('Italy');
      expect(conversationState?.metadata.messageCount).toBe(4);
    });

    it('should handle modification to existing itinerary', async () => {
      // First, create an itinerary
      const request1: ChatRequest = {
        message: '1 week in London from Boston',
        sessionId: 'modification-test',
        userId: 'test-user-4'
      };
      
      const response1 = await handleChatMessage(request1);
      expect(response1.success).toBe(true);
      expect(response1.conversationState.currentItinerary?.destinations[0].name).toBe('London');
      
      // Then modify it
      const request2: ChatRequest = {
        message: 'add 3 days in Edinburgh',
        sessionId: 'modification-test',
        userId: 'test-user-4'
      };
      
      const response2 = await handleChatMessage(request2);
      
      expect(response2.success).toBe(true);
      expect(response2.modification?.success).toBe(true);
      expect(response2.conversationState.currentItinerary?.destinations).toHaveLength(2);
      expect(response2.conversationState.currentItinerary?.destinations[1].name).toBe('Edinburgh');
      expect(response2.conversationState.currentItinerary?.totalDays).toBe(10);
    });

    it('should handle pure questions appropriately', async () => {
      const request: ChatRequest = {
        message: 'What is travel insurance?',
        sessionId: 'question-test',
        userId: 'test-user-5'
      };
      
      const response = await handleChatMessage(request);
      
      expect(response.success).toBe(true);
      expect(response.response.type).toBe('information');
      expect(response.metadata.classification.type).toBe('question');
    });

    it('should handle error scenarios gracefully', async () => {
      const request: ChatRequest = {
        message: '', // Empty message
        sessionId: 'error-test',
        userId: 'test-user-6'
      };
      
      const response = await handleChatMessage(request);
      
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.response.type).toBe('error');
    });
  });

  describe('Conversation State Management', () => {
    it('should create and manage conversation state correctly', () => {
      const state = createConversationState('state-test', 'user-123');
      
      expect(state.sessionId).toBe('state-test');
      expect(state.userId).toBe('user-123');
      expect(state.history).toHaveLength(0);
      expect(state.context.destinations).toHaveLength(0);
      expect(state.metadata.messageCount).toBe(0);
    });

    it('should update conversation state with new messages', () => {
      let state = createConversationState('update-test', 'user-456');
      
      const message = {
        id: 'msg-1',
        role: 'user' as const,
        content: '3 days in Madrid',
        timestamp: new Date()
      };
      
      const parseResult = {
        success: true,
        confidence: 0.9,
        source: 'traditional' as const,
        parsedTrip: {
          origin: '',
          destinations: [{ name: 'Madrid', duration: 3 }],
          totalDays: 3,
          startDate: null,
          preferences: [],
          travelStyle: 'balanced' as const
        },
        metadata: {
          processingTime: 40,
          fallbackUsed: false,
          classification: { type: 'structured', confidence: 0.9, complexity: 'simple', features: {} }
        }
      };
      
      state = updateConversationState(state, message, parseResult);
      
      expect(state.history).toHaveLength(1);
      expect(state.metadata.messageCount).toBe(1);
      expect(state.context.destinations).toContain('Madrid');
      expect(state.currentItinerary?.destinations[0].name).toBe('Madrid');
    });
  });

  describe('Integration with Existing Systems', () => {
    it('should maintain compatibility with existing baseline test', async () => {
      const request: ChatRequest = {
        message: '3 days in London',
        sessionId: 'baseline-compatibility',
        userId: 'baseline-user'
      };
      
      const response = await handleChatMessage(request);
      
      // This should work exactly like before
      expect(response.success).toBe(true);
      expect(response.conversationState.currentItinerary?.destinations[0].name).toBe('London');
      expect(response.conversationState.currentItinerary?.totalDays).toBe(3);
      expect(response.metadata.parseResult.success).toBe(true);
    });
  });
});