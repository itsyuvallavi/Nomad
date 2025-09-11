/**
 * Conversation Tests - Phase 5.1
 * Tests for multi-turn dialogs, context preservation, and modification flows
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { 
  handleChatMessage, 
  continueConversation,
  getConversationState,
  clearConversationState,
  type ChatRequest,
  type ChatResponse 
} from '@/ai/flows/chat-conversation';
import { ConversationState } from '@/ai/flows/generate-dialog-response';

describe('Conversation Flow Tests', () => {
  const testSessionId = 'test-session-conversation';

  beforeEach(() => {
    // Clear any existing test session
    clearConversationState(testSessionId);
  });

  describe('Single-turn Conversations', () => {
    it('should handle complete travel request in single message', async () => {
      const request: ChatRequest = {
        message: "5 days in London from NYC",
        sessionId: testSessionId,
        userId: 'test-user'
      };

      const response: ChatResponse = await handleChatMessage(request);

      expect(response.success).toBe(true);
      expect(response.response.type).toBe('itinerary');
      expect(response.itinerary).toBeDefined();
      expect(response.conversationState).toBeDefined();
      expect(response.conversationState.context.destinations).toContain('London');
      expect(response.conversationState.context.origin).toBe('NYC');
    });

    it('should handle ambiguous input with clarification request', async () => {
      const request: ChatRequest = {
        message: "I want to travel to Europe",
        sessionId: testSessionId
      };

      const response: ChatResponse = await handleChatMessage(request);

      expect(response.success).toBe(true);
      expect(response.response.type).toBe('clarification');
      expect(response.response.content).toContain('specific');
      expect(response.response.context?.suggestions).toBeDefined();
      expect(response.response.context?.suggestions?.length).toBeGreaterThan(0);
    });

    it('should handle question-type inputs', async () => {
      const request: ChatRequest = {
        message: "What's the weather like in Paris in March?",
        sessionId: testSessionId
      };

      const response: ChatResponse = await handleChatMessage(request);

      expect(response.success).toBe(true);
      expect(response.response.type).toBe('information');
      expect(response.response.content).toContain('weather');
    });
  });

  describe('Multi-turn Conversations', () => {
    it('should build complete itinerary through conversation', async () => {
      // Turn 1: Initial vague request
      const turn1: ChatRequest = {
        message: "I want to visit Paris",
        sessionId: testSessionId
      };
      const response1 = await handleChatMessage(turn1);
      
      expect(response1.success).toBe(true);
      expect(response1.response.type).toBe('clarification');
      expect(response1.conversationState.context.destinations).toContain('Paris');

      // Turn 2: Provide duration
      const turn2: ChatRequest = {
        message: "5 days",
        sessionId: testSessionId
      };
      const response2 = await handleChatMessage(turn2);
      
      expect(response2.success).toBe(true);
      expect(response2.conversationState.context.destinations).toContain('Paris');

      // Turn 3: Provide origin
      const turn3: ChatRequest = {
        message: "from NYC",
        sessionId: testSessionId
      };
      const response3 = await handleChatMessage(turn3);
      
      expect(response3.success).toBe(true);
      if (response3.response.type === 'itinerary') {
        expect(response3.itinerary).toBeDefined();
        expect(response3.conversationState.context.origin).toBe('NYC');
      }
    });

    it('should preserve context across multiple turns', async () => {
      // Turn 1: Initial request
      const turn1: ChatRequest = {
        message: "I'm planning a honeymoon",
        sessionId: testSessionId
      };
      const response1 = await handleChatMessage(turn1);
      
      expect(response1.conversationState.context.preferences.has('romantic')).toBe(true);

      // Turn 2: Add destination preference  
      const turn2: ChatRequest = {
        message: "somewhere warm with beaches",
        sessionId: testSessionId
      };
      const response2 = await handleChatMessage(turn2);
      
      expect(response2.conversationState.context.preferences.has('romantic')).toBe(true);
      expect(response2.conversationState.context.preferences.has('beach')).toBe(true);
      expect(response2.conversationState.context.preferences.has('warm')).toBe(true);

      // Turn 3: Specify duration
      const turn3: ChatRequest = {
        message: "for a week",
        sessionId: testSessionId
      };
      const response3 = await handleChatMessage(turn3);
      
      // All previous context should be preserved
      expect(response3.conversationState.context.preferences.has('romantic')).toBe(true);
      expect(response3.conversationState.context.preferences.has('beach')).toBe(true);
    });

    it('should handle conversation interruptions and changes', async () => {
      // Start one conversation thread
      await handleChatMessage({
        message: "5 days in London",
        sessionId: testSessionId
      });

      // Interrupt with completely different request
      const response = await handleChatMessage({
        message: "Actually, I changed my mind. 3 days in Paris from Boston",
        sessionId: testSessionId
      });

      expect(response.success).toBe(true);
      expect(response.conversationState.context.destinations).toContain('Paris');
      expect(response.conversationState.context.destinations).not.toContain('London');
      expect(response.conversationState.context.origin).toBe('Boston');
    });
  });

  describe('Context Preservation', () => {
    it('should maintain conversation state across sessions', async () => {
      // Initial conversation
      await handleChatMessage({
        message: "5 days in Tokyo from San Francisco",
        sessionId: testSessionId
      });

      // Retrieve state
      const state = getConversationState(testSessionId);
      expect(state).toBeDefined();
      expect(state?.context.destinations).toContain('Tokyo');
      expect(state?.context.origin).toBe('San Francisco');

      // Continue conversation
      const response = await handleChatMessage({
        message: "add 3 days in Kyoto",
        sessionId: testSessionId
      });

      expect(response.success).toBe(true);
      expect(response.conversationState.context.destinations).toContain('Tokyo');
      expect(response.conversationState.context.destinations).toContain('Kyoto');
    });

    it('should track conversation metadata correctly', async () => {
      const response1 = await handleChatMessage({
        message: "3 days in Barcelona",
        sessionId: testSessionId
      });

      expect(response1.conversationState.metadata.messageCount).toBe(2); // User + Assistant
      expect(response1.conversationState.metadata.startTime).toBeDefined();

      const response2 = await handleChatMessage({
        message: "make it 5 days instead",
        sessionId: testSessionId
      });

      expect(response2.conversationState.metadata.messageCount).toBe(4);
      expect(response2.conversationState.metadata.lastActivity).toBeInstanceOf(Date);
    });

    it('should handle preferences and constraints persistence', async () => {
      // Set initial preferences
      await handleChatMessage({
        message: "I need a budget-friendly beach vacation",
        sessionId: testSessionId
      });

      // Add constraints
      const response = await handleChatMessage({
        message: "maximum 5 days, under $1000",
        sessionId: testSessionId
      });

      expect(response.conversationState.context.preferences.has('budget-friendly')).toBe(true);
      expect(response.conversationState.context.preferences.has('beach')).toBe(true);
      expect(response.conversationState.context.constraints).toContainEqual(
        expect.objectContaining({
          type: 'duration',
          value: 5,
          priority: 'high'
        })
      );
    });
  });

  describe('Modification Flows', () => {
    it('should handle destination additions', async () => {
      // Create initial itinerary
      const initial = await handleChatMessage({
        message: "5 days in London from NYC",
        sessionId: testSessionId
      });

      expect(initial.itinerary?.destinations).toHaveLength(1);

      // Add destination
      const modified = await handleChatMessage({
        message: "add 3 days in Paris",
        sessionId: testSessionId
      });

      expect(modified.success).toBe(true);
      expect(modified.itinerary?.destinations).toHaveLength(2);
      expect(modified.itinerary?.totalDays).toBe(8);
      expect(modified.conversationState.context.destinations).toContain('London');
      expect(modified.conversationState.context.destinations).toContain('Paris');
    });

    it('should handle destination removals', async () => {
      // Create multi-destination itinerary
      await handleChatMessage({
        message: "5 days in London and 3 days in Paris from NYC",
        sessionId: testSessionId
      });

      // Remove destination
      const modified = await handleChatMessage({
        message: "remove Paris from the trip",
        sessionId: testSessionId
      });

      expect(modified.success).toBe(true);
      expect(modified.conversationState.context.destinations).toContain('London');
      expect(modified.conversationState.context.destinations).not.toContain('Paris');
      expect(modified.itinerary?.totalDays).toBe(5);
    });

    it('should handle duration changes', async () => {
      // Create initial itinerary
      await handleChatMessage({
        message: "3 days in Barcelona",
        sessionId: testSessionId
      });

      // Change duration
      const modified = await handleChatMessage({
        message: "make it 7 days instead",
        sessionId: testSessionId
      });

      expect(modified.success).toBe(true);
      expect(modified.itinerary?.totalDays).toBe(7);
      expect(modified.itinerary?.destinations[0].days).toBe(7);
    });

    it('should handle preference updates', async () => {
      // Create initial itinerary
      await handleChatMessage({
        message: "5 days in Rome",
        sessionId: testSessionId
      });

      // Update preferences
      const modified = await handleChatMessage({
        message: "make it more romantic and include fine dining",
        sessionId: testSessionId
      });

      expect(modified.success).toBe(true);
      expect(modified.conversationState.context.preferences.has('romantic')).toBe(true);
      expect(modified.conversationState.context.preferences.has('fine-dining')).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('should handle parsing failures gracefully', async () => {
      const response = await handleChatMessage({
        message: "///invalid input$$$",
        sessionId: testSessionId
      });

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.response.type).toBe('error');
      expect(response.response.content).toContain('understand');
    });

    it('should handle API timeouts', async () => {
      // This would require mocking API timeouts
      // Implementation depends on how APIs are structured
    });

    it('should provide helpful error messages', async () => {
      const response = await handleChatMessage({
        message: "0 days in nowhere",
        sessionId: testSessionId
      });

      expect(response.success).toBe(false);
      expect(response.response.content).toContain('valid');
      expect(response.response.context?.suggestions).toBeDefined();
    });

    it('should recover from malformed modifications', async () => {
      // Create base itinerary
      await handleChatMessage({
        message: "3 days in London",
        sessionId: testSessionId
      });

      // Attempt invalid modification
      const response = await handleChatMessage({
        message: "remove Tokyo", // Tokyo not in itinerary
        sessionId: testSessionId
      });

      expect(response.success).toBe(false);
      expect(response.response.content).toContain('Tokyo');
      expect(response.response.content).toContain('current');
    });
  });

  describe('Session Management', () => {
    it('should create unique session states', async () => {
      const session1 = 'session-1';
      const session2 = 'session-2';

      await handleChatMessage({
        message: "3 days in London",
        sessionId: session1
      });

      await handleChatMessage({
        message: "5 days in Paris",
        sessionId: session2
      });

      const state1 = getConversationState(session1);
      const state2 = getConversationState(session2);

      expect(state1?.context.destinations).toContain('London');
      expect(state1?.context.destinations).not.toContain('Paris');
      expect(state2?.context.destinations).toContain('Paris');
      expect(state2?.context.destinations).not.toContain('London');
    });

    it('should handle session cleanup', () => {
      const sessionId = 'cleanup-test-session';
      
      // Create session
      handleChatMessage({
        message: "3 days in Tokyo",
        sessionId
      });

      // Verify exists
      expect(getConversationState(sessionId)).toBeDefined();

      // Clear session
      clearConversationState(sessionId);

      // Verify cleared
      expect(getConversationState(sessionId)).toBeNull();
    });

    it('should handle concurrent sessions', async () => {
      const promises = [
        handleChatMessage({ message: "3 days in London", sessionId: 'concurrent-1' }),
        handleChatMessage({ message: "5 days in Paris", sessionId: 'concurrent-2' }),
        handleChatMessage({ message: "1 week in Tokyo", sessionId: 'concurrent-3' })
      ];

      const responses = await Promise.all(promises);

      expect(responses.every(r => r.success)).toBe(true);
      expect(responses.map(r => r.conversationState.sessionId)).toEqual([
        'concurrent-1',
        'concurrent-2', 
        'concurrent-3'
      ]);
    });
  });

  describe('Response Quality', () => {
    it('should provide appropriate response types', async () => {
      const testCases = [
        { input: "5 days in London from NYC", expectedType: 'itinerary' },
        { input: "I want to travel somewhere", expectedType: 'clarification' },
        { input: "What's included?", expectedType: 'information' },
        { input: "make it more romantic", expectedType: 'confirmation' }
      ];

      for (const { input, expectedType } of testCases) {
        const response = await handleChatMessage({
          message: input,
          sessionId: `test-${expectedType}`
        });

        if (response.success) {
          expect(response.response.type).toBe(expectedType);
        }
      }
    });

    it('should provide contextual suggestions', async () => {
      const response = await handleChatMessage({
        message: "I want to go somewhere romantic",
        sessionId: testSessionId
      });

      expect(response.success).toBe(true);
      expect(response.response.context?.suggestions).toBeDefined();
      expect(response.response.context?.suggestions?.length).toBeGreaterThan(0);
      expect(response.response.context?.suggestions?.some(s => 
        s.toLowerCase().includes('paris') || 
        s.toLowerCase().includes('venice') || 
        s.toLowerCase().includes('santorini')
      )).toBe(true);
    });

    it('should maintain conversation flow coherence', async () => {
      // Start conversation
      const response1 = await handleChatMessage({
        message: "I'm planning my anniversary trip",
        sessionId: testSessionId
      });

      // Continue with context
      const response2 = await handleChatMessage({
        message: "somewhere in Europe",
        sessionId: testSessionId
      });

      // Final details
      const response3 = await handleChatMessage({
        message: "5 days would be perfect",
        sessionId: testSessionId
      });

      expect(response1.success).toBe(true);
      expect(response2.success).toBe(true);
      expect(response3.success).toBe(true);

      // Check that romantic context is preserved throughout
      expect(response3.conversationState.context.preferences.has('romantic')).toBe(true);
    });
  });
});