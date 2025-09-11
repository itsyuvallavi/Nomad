/**
 * Ambiguous Input Test Scenario - Phase 5.2
 * Tests handling of unclear, incomplete, or ambiguous user inputs
 */

import { describe, it, expect } from '@jest/globals';
import { handleChatMessage, clearConversationState } from '@/ai/flows/chat-conversation';
import { HybridParser } from '@/ai/utils/hybrid-parser';

describe('Ambiguous Input Scenarios', () => {
  const createTestSession = () => `ambiguous-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  describe('Vague Travel Requests', () => {
    it('should handle "somewhere romantic in Europe"', async () => {
      const sessionId = createTestSession();

      const response = await handleChatMessage({
        message: "Something romantic in Europe",
        sessionId
      });

      expect(response.success).toBe(true);
      expect(response.response.type).toBe('clarification');
      expect(response.conversationState.context.preferences.has('romantic')).toBe(true);
      expect(response.response.context?.suggestions).toBeDefined();
      expect(response.response.context?.suggestions?.length).toBeGreaterThan(0);

      // Suggestions should include romantic European destinations
      const suggestions = response.response.context?.suggestions || [];
      expect(suggestions.some(s => 
        s.toLowerCase().includes('paris') || 
        s.toLowerCase().includes('venice') ||
        s.toLowerCase().includes('prague') ||
        s.toLowerCase().includes('santorini')
      )).toBe(true);

      clearConversationState(sessionId);
    });

    it('should handle single word destinations', async () => {
      const singleWords = ['Europe', 'Asia', 'America', 'beach', 'mountains', 'culture'];

      for (const word of singleWords) {
        const sessionId = createTestSession();
        const response = await handleChatMessage({
          message: word,
          sessionId
        });

        expect(response.success).toBe(true);
        expect(response.response.type).toBe('clarification');
        expect(response.response.context?.suggestions).toBeDefined();

        clearConversationState(sessionId);
      }
    });

    it('should handle incomplete requests', async () => {
      const incompleteRequests = [
        "I want to travel",
        "Planning a vacation",
        "Need to get away",
        "Thinking about a trip",
        "Want to go somewhere"
      ];

      for (const request of incompleteRequests) {
        const sessionId = createTestSession();
        const response = await handleChatMessage({
          message: request,
          sessionId
        });

        expect(response.success).toBe(true);
        expect(response.response.type).toBe('clarification');
        expect(response.response.content.toLowerCase()).toMatch(/where|when|long|help/);

        clearConversationState(sessionId);
      }
    });
  });

  describe('Ambiguous Durations', () => {
    it('should handle vague time references', async () => {
      const vagueTimeReferences = [
        { input: "soon", expectedClarification: true },
        { input: "for a while", expectedClarification: true },
        { input: "not too long", expectedClarification: true },
        { input: "quick trip", expectedDays: 3 },
        { input: "extended vacation", expectedClarification: true }
      ];

      for (const { input, expectedClarification, expectedDays } of vagueTimeReferences) {
        const sessionId = createTestSession();
        const response = await handleChatMessage({
          message: `I want to visit Paris ${input}`,
          sessionId
        });

        expect(response.success).toBe(true);
        
        if (expectedClarification) {
          expect(response.response.type).toBe('clarification');
          expect(response.response.content.toLowerCase()).toMatch(/long|duration|days/);
        }

        if (expectedDays) {
          // Should either extract the duration or ask for clarification
          const hasExpectedDuration = response.conversationState.context.constraints.some(
            c => c.type === 'duration' && c.value === expectedDays
          );
          const askingForClarification = response.response.type === 'clarification';
          
          expect(hasExpectedDuration || askingForClarification).toBe(true);
        }

        clearConversationState(sessionId);
      }
    });

    it('should handle conflicting duration signals', async () => {
      const sessionId = createTestSession();

      const response = await handleChatMessage({
        message: "quick weekend trip to Paris for 2 weeks",
        sessionId
      });

      expect(response.success).toBe(true);
      expect(response.response.type).toBe('clarification');
      expect(response.response.content.toLowerCase()).toMatch(/weekend|weeks|clarify/);

      clearConversationState(sessionId);
    });
  });

  describe('Performance with Ambiguous Inputs', () => {
    it('should handle classification of ambiguous inputs efficiently', async () => {
      const hybridParser = new HybridParser();
      const ambiguousInputs = [
        "Europe",
        "somewhere nice", 
        "I don't know",
        "travel",
        "vacation"
      ];

      for (const input of ambiguousInputs) {
        const start = Date.now();
        const result = await hybridParser.parse(input);
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(1000); // Should classify quickly
        expect(result.classification?.type).toBe('ambiguous');
        expect(result.classification?.confidence).toBeLessThan(0.6);
      }
    });
  });
});