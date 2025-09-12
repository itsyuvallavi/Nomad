/**
 * Conversational Flow Test Scenario - Phase 5.2
 * Tests natural language conversation building up to complete itineraries
 */

import { describe, it, expect } from '@jest/globals';
import { handleChatMessage, clearConversationState } from '@/ai/flows/chat-conversation';

describe('Conversational Flow Scenarios', () => {
  const createTestSession = () => `conversational-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  describe('Progressive Information Gathering', () => {
    it('should build complete itinerary through natural conversation', async () => {
      const sessionId = createTestSession();

      // Step 1: Vague initial request
      const step1 = await handleChatMessage({
        message: "I want to visit Paris",
        sessionId
      });

      expect(step1.success).toBe(true);
      expect(step1.conversationState.context.destinations).toContain('Paris');
      expect(step1.response.type).toBe('clarification');
      expect(step1.response.content.toLowerCase()).toContain('long');

      // Step 2: Provide duration
      const step2 = await handleChatMessage({
        message: "5 days",
        sessionId
      });

      expect(step2.success).toBe(true);
      expect(step2.conversationState.context.destinations).toContain('Paris');
      expect(step2.response.type).toBe('clarification');
      expect(step2.response.content.toLowerCase()).toMatch(/depart|from|where/);

      // Step 3: Provide origin
      const step3 = await handleChatMessage({
        message: "from NYC",
        sessionId
      });

      expect(step3.success).toBe(true);
      expect(step3.conversationState.context.origin).toBe('NYC');
      
      if (step3.response.type === 'itinerary') {
        expect(step3.itinerary).toBeDefined();
        expect(step3.itinerary?.totalDays).toBe(5);
        expect(step3.itinerary?.origin).toBe('NYC');
      }

      // Clean up
      clearConversationState(sessionId);
    });

    it('should handle out-of-order information provision', async () => {
      const sessionId = createTestSession();

      // Start with duration
      const step1 = await handleChatMessage({
        message: "I need a 1 week vacation",
        sessionId
      });

      expect(step1.success).toBe(true);
      expect(step1.response.type).toBe('clarification');

      // Then provide origin
      const step2 = await handleChatMessage({
        message: "departing from Boston",
        sessionId
      });

      expect(step2.success).toBe(true);
      expect(step2.conversationState.context.origin).toBe('Boston');

      // Finally destination
      const step3 = await handleChatMessage({
        message: "to London",
        sessionId
      });

      expect(step3.success).toBe(true);
      expect(step3.conversationState.context.destinations).toContain('London');

      clearConversationState(sessionId);
    });

    it('should handle preference-driven conversations', async () => {
      const sessionId = createTestSession();

      // Start with preferences
      const step1 = await handleChatMessage({
        message: "I'm looking for a romantic honeymoon destination",
        sessionId
      });

      expect(step1.success).toBe(true);
      expect(step1.conversationState.context.preferences.has('romantic')).toBe(true);
      expect(step1.conversationState.context.preferences.has('honeymoon')).toBe(true);
      expect(step1.response.context?.suggestions).toBeDefined();

      // Choose from suggestions
      const step2 = await handleChatMessage({
        message: "Venice sounds perfect",
        sessionId
      });

      expect(step2.success).toBe(true);
      expect(step2.conversationState.context.destinations).toContain('Venice');

      // Add duration and origin
      const step3 = await handleChatMessage({
        message: "5 days from San Francisco",
        sessionId
      });

      expect(step3.success).toBe(true);
      if (step3.response.type === 'itinerary') {
        expect(step3.itinerary?.totalDays).toBe(5);
        expect(step3.itinerary?.origin).toBe('San Francisco');
      }

      clearConversationState(sessionId);
    });
  });

  describe('Natural Language Understanding', () => {
    it('should understand implicit travel requests', async () => {
      const sessionId = createTestSession();

      const response = await handleChatMessage({
        message: "I need to get away from work stress, somewhere peaceful with nature",
        sessionId
      });

      expect(response.success).toBe(true);
      expect(response.conversationState.context.preferences.has('peaceful')).toBe(true);
      expect(response.conversationState.context.preferences.has('nature')).toBe(true);
      expect(response.response.type).toBe('clarification');
      expect(response.response.context?.suggestions).toBeDefined();

      clearConversationState(sessionId);
    });

    it('should understand temporal references', async () => {
      const sessionId = createTestSession();

      const testCases = [
        { input: "next month for a week", expectedDays: 7 },
        { input: "long weekend somewhere", expectedDays: 3 },
        { input: "quick getaway, just a few days", expectedDays: 3 },
        { input: "extended vacation, maybe two weeks", expectedDays: 14 }
      ];

      for (const { input, expectedDays } of testCases) {
        const sessionId = createTestSession();
        const response = await handleChatMessage({
          message: input,
          sessionId
        });

        expect(response.success).toBe(true);
        // Duration should be captured or suggested
        if (response.conversationState.context.constraints.some(c => c.type === 'duration')) {
          const durationConstraint = response.conversationState.context.constraints.find(c => c.type === 'duration');
          expect(durationConstraint?.value).toBe(expectedDays);
        }

        clearConversationState(sessionId);
      }
    });

    it('should understand budget and constraint language', async () => {
      const sessionId = createTestSession();

      const response = await handleChatMessage({
        message: "I want a budget-friendly beach vacation, nothing too fancy",
        sessionId
      });

      expect(response.success).toBe(true);
      expect(response.conversationState.context.preferences.has('budget-friendly')).toBe(true);
      expect(response.conversationState.context.preferences.has('beach')).toBe(true);
      expect(response.conversationState.context.constraints.some(c => c.type === 'budget')).toBe(true);

      clearConversationState(sessionId);
    });
  });

  describe('Contextual Follow-ups', () => {
    it('should handle pronoun references correctly', async () => {
      const sessionId = createTestSession();

      // Establish context
      await handleChatMessage({
        message: "5 days in Tokyo from NYC",
        sessionId
      });

      // Use pronoun reference
      const response = await handleChatMessage({
        message: "make it more cultural, I want to see traditional temples there",
        sessionId
      });

      expect(response.success).toBe(true);
      expect(response.conversationState.context.preferences.has('cultural')).toBe(true);
      expect(response.conversationState.context.preferences.has('temples')).toBe(true);
      expect(response.conversationState.context.destinations).toContain('Tokyo');

      clearConversationState(sessionId);
    });

    it('should understand relative modifications', async () => {
      const sessionId = createTestSession();

      // Base itinerary
      await handleChatMessage({
        message: "1 week in Barcelona",
        sessionId
      });

      const modifications = [
        { input: "add a couple more days", expectedChange: 2 },
        { input: "extend it by one day", expectedChange: 1 },
        { input: "make it shorter, maybe 5 days", expectedTotal: 5 }
      ];

      for (const { input, expectedChange, expectedTotal } of modifications) {
        const response = await handleChatMessage({
          message: input,
          sessionId
        });

        expect(response.success).toBe(true);
        if (expectedTotal) {
          expect(response.itinerary?.totalDays).toBe(expectedTotal);
        }
      }

      clearConversationState(sessionId);
    });

    it('should maintain context through interruptions', async () => {
      const sessionId = createTestSession();

      // Start conversation
      await handleChatMessage({
        message: "Planning my anniversary trip, thinking Europe",
        sessionId
      });

      // Ask unrelated question
      await handleChatMessage({
        message: "What's the weather like in Paris in May?",
        sessionId
      });

      // Return to trip planning
      const response = await handleChatMessage({
        message: "That sounds good, let's do Paris for the anniversary",
        sessionId
      });

      expect(response.success).toBe(true);
      expect(response.conversationState.context.preferences.has('romantic')).toBe(true);
      expect(response.conversationState.context.destinations).toContain('Paris');

      clearConversationState(sessionId);
    });
  });

  describe('Suggestion and Confirmation Flows', () => {
    it('should provide contextual suggestions', async () => {
      const sessionId = createTestSession();

      const response = await handleChatMessage({
        message: "I want somewhere romantic in Europe for our 10th anniversary",
        sessionId
      });

      expect(response.success).toBe(true);
      expect(response.response.context?.suggestions).toBeDefined();
      expect(response.response.context?.suggestions?.length).toBeGreaterThan(0);
      
      const suggestions = response.response.context?.suggestions || [];
      expect(suggestions.some(s => 
        s.toLowerCase().includes('paris') || 
        s.toLowerCase().includes('venice') ||
        s.toLowerCase().includes('santorini')
      )).toBe(true);

      clearConversationState(sessionId);
    });

    it('should handle suggestion selection', async () => {
      const sessionId = createTestSession();

      // Get suggestions
      const step1 = await handleChatMessage({
        message: "I want a beach vacation in Europe",
        sessionId
      });

      expect(step1.response.context?.suggestions).toBeDefined();

      // Select suggestion
      const step2 = await handleChatMessage({
        message: "Greek islands sound great",
        sessionId
      });

      expect(step2.success).toBe(true);
      expect(step2.conversationState.context.destinations.some(d => 
        d.toLowerCase().includes('greece') || 
        d.toLowerCase().includes('santorini') ||
        d.toLowerCase().includes('mykonos')
      )).toBe(true);

      clearConversationState(sessionId);
    });

    it('should handle confirmation dialogs', async () => {
      const sessionId = createTestSession();

      // Create itinerary that might need confirmation
      const step1 = await handleChatMessage({
        message: "2 weeks in Japan, visiting multiple cities",
        sessionId
      });

      if (step1.response.type === 'confirmation') {
        // Confirm the itinerary
        const step2 = await handleChatMessage({
          message: "yes, that looks perfect",
          sessionId
        });

        expect(step2.success).toBe(true);
        expect(step2.response.type).toBe('itinerary');
      }

      clearConversationState(sessionId);
    });
  });

  describe('Error Recovery in Conversations', () => {
    it('should handle unclear responses gracefully', async () => {
      const sessionId = createTestSession();

      // Start conversation
      await handleChatMessage({
        message: "I want to travel somewhere",
        sessionId
      });

      // Give unclear response
      const response = await handleChatMessage({
        message: "maybe",
        sessionId
      });

      expect(response.success).toBe(true);
      expect(response.response.type).toBe('clarification');
      expect(response.response.content.toLowerCase()).toMatch(/help|specific|where/);

      clearConversationState(sessionId);
    });

    it('should recover from misunderstandings', async () => {
      const sessionId = createTestSession();

      // System misunderstands
      await handleChatMessage({
        message: "I said Paris, not Rome",
        sessionId
      });

      // Clarify
      const response = await handleChatMessage({
        message: "Let me clarify: 5 days in Paris, France from New York",
        sessionId
      });

      expect(response.success).toBe(true);
      expect(response.conversationState.context.destinations).toContain('Paris');
      expect(response.conversationState.context.destinations).not.toContain('Rome');

      clearConversationState(sessionId);
    });

    it('should handle conversation resets gracefully', async () => {
      const sessionId = createTestSession();

      // Start one conversation
      await handleChatMessage({
        message: "5 days in London",
        sessionId
      });

      // Completely change direction
      const response = await handleChatMessage({
        message: "Actually, forget London. I want to plan a completely different trip to Tokyo",
        sessionId
      });

      expect(response.success).toBe(true);
      expect(response.conversationState.context.destinations).toContain('Tokyo');
      expect(response.conversationState.context.destinations).not.toContain('London');

      clearConversationState(sessionId);
    });
  });

  describe('Performance in Conversational Flows', () => {
    it('should maintain responsive performance in long conversations', async () => {
      const sessionId = createTestSession();

      const messages = [
        "I'm thinking about a European vacation",
        "somewhere romantic",
        "maybe Italy or France", 
        "I'm leaning towards Italy",
        "Florence or Rome?",
        "Rome sounds better",
        "5 days should be good",
        "flying from Chicago"
      ];

      let totalTime = 0;

      for (const message of messages) {
        const start = Date.now();
        const response = await handleChatMessage({ message, sessionId });
        const duration = Date.now() - start;
        
        totalTime += duration;
        
        expect(response.success).toBe(true);
        expect(duration).toBeLessThan(3000); // Each response under 3 seconds
      }

      const averageTime = totalTime / messages.length;
      expect(averageTime).toBeLessThan(2000); // Average under 2 seconds

      clearConversationState(sessionId);
    });
  });
});