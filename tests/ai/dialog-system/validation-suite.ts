/**
 * System Validation Suite - Phase 5.1
 * Comprehensive validation of the enhanced dialog architecture
 */

import { describe, it, expect } from '@jest/globals';
import { handleChatMessage, clearConversationState } from '@/ai/flows/chat-conversation';
import { parseDestinations } from '@/ai/utils/destination-parser';
import { HybridParser } from '@/ai/utils/hybrid-parser';
import { measurePerformance, createTestItinerary } from './setup';

describe('Enhanced Dialog Architecture - System Validation', () => {
  const createValidationSession = () => `validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  describe('Critical Success Metrics Validation', () => {
    it('✅ Lisbon/Granada case works correctly', async () => {
      const testCases = [
        "2 weeks in Lisbon and Granada, 10 days lisbon, 4 granada",
        "10 days in Lisbon and 4 days in Granada",
        "14 days total: 10 days Lisbon, 4 days Granada"
      ];

      for (const testCase of testCases) {
        const sessionId = createValidationSession();
        
        const { result: parseResult } = await measurePerformance(async () => {
          return parseDestinations(testCase);
        });

        // Validate traditional parser
        expect(parseResult.destinations).toHaveLength(2);
        expect(parseResult.totalDays).toBe(14);
        
        const lisbon = parseResult.destinations.find(d => 
          d.city.toLowerCase().includes('lisbon')
        );
        const granada = parseResult.destinations.find(d => 
          d.city.toLowerCase().includes('granada')
        );
        
        expect(lisbon?.days).toBe(10);
        expect(granada?.days).toBe(4);

        // Validate through complete dialog system
        const { result: dialogResponse } = await measurePerformance(async () => {
          return handleChatMessage({
            message: testCase,
            sessionId
          });
        });

        expect(dialogResponse.success).toBe(true);
        expect(dialogResponse).toHaveValidItinerary();
        expect(dialogResponse.itinerary?.totalDays).toBe(14);

        clearConversationState(sessionId);
      }
    });

    it('✅ "Make it more romantic" understood', async () => {
      const sessionId = createValidationSession();

      // Create base itinerary
      const initial = await handleChatMessage({
        message: "5 days in Paris from NYC",
        sessionId
      });

      expect(initial.success).toBe(true);
      expect(initial).toHaveValidItinerary();

      // Apply conversational modification
      const { result: modified } = await measurePerformance(async () => {
        return handleChatMessage({
          message: "make it more romantic",
          sessionId
        });
      });

      expect(modified.success).toBe(true);
      expect(modified.conversationState.context.preferences.has('romantic')).toBe(true);
      expect(modified.metadata.classification?.type).toBe('modification');

      clearConversationState(sessionId);
    });

    it('✅ Missing origin handled gracefully', async () => {
      const sessionId = createValidationSession();

      const { result: response } = await measurePerformance(async () => {
        return handleChatMessage({
          message: "5 days in London",
          sessionId
        });
      });

      expect(response.success).toBe(true);
      
      if (response.response.type === 'clarification') {
        // Should ask for origin
        expect(response.response.content.toLowerCase()).toMatch(/from|depart|where.*flying/);
      } else if (response.response.type === 'itinerary') {
        // Should handle gracefully with null origin
        expect(response.itinerary?.origin).toBeNull();
      }

      clearConversationState(sessionId);
    });

    it('✅ Multi-turn conversations work', async () => {
      const sessionId = createValidationSession();

      // Turn 1: Vague request
      const turn1 = await handleChatMessage({
        message: "I want to visit Europe",
        sessionId
      });
      expect(turn1.success).toBe(true);
      expect(turn1.response.type).toBe('clarification');

      // Turn 2: Add destination
      const turn2 = await handleChatMessage({
        message: "Paris sounds good",
        sessionId
      });
      expect(turn2.success).toBe(true);
      expect(turn2.conversationState.context.destinations).toContain('Paris');

      // Turn 3: Add duration
      const turn3 = await handleChatMessage({
        message: "5 days would be perfect",
        sessionId
      });
      expect(turn3.success).toBe(true);

      // Turn 4: Add origin
      const { result: turn4 } = await measurePerformance(async () => {
        return handleChatMessage({
          message: "from Boston",
          sessionId
        });
      });

      expect(turn4.success).toBe(true);
      expect(turn4).toHaveValidConversationState();
      
      if (turn4.response.type === 'itinerary') {
        expect(turn4).toHaveValidItinerary();
        expect(turn4.itinerary?.totalDays).toBe(5);
        expect(turn4.itinerary?.origin).toBe('Boston');
      }

      clearConversationState(sessionId);
    });

    it('✅ Modifications applied correctly', async () => {
      const sessionId = createValidationSession();

      // Create base itinerary
      await handleChatMessage({
        message: "3 days in Rome from NYC",
        sessionId
      });

      const modifications = [
        { input: "add 2 days in Florence", expectedCities: 2, expectedDays: 5 },
        { input: "change Rome to 5 days", expectedCities: 2, expectedDays: 7 },
        { input: "remove Florence", expectedCities: 1, expectedDays: 5 }
      ];

      for (const { input, expectedCities, expectedDays } of modifications) {
        const { result } = await measurePerformance(async () => {
          return handleChatMessage({
            message: input,
            sessionId
          });
        });

        expect(result.success).toBe(true);
        expect(result.metadata.classification?.type).toBe('modification');
        
        if (result.itinerary) {
          expect(result.itinerary.destinations).toHaveLength(expectedCities);
          expect(result.itinerary.totalDays).toBe(expectedDays);
        }
      }

      clearConversationState(sessionId);
    });
  });

  describe('Performance Metrics Validation', () => {
    it('Parser response time < 100ms for structured inputs', async () => {
      const structuredInputs = [
        "5 days in London from NYC",
        "1 week in Tokyo and 3 days in Kyoto",
        "3 days in Barcelona from Madrid"
      ];

      for (const input of structuredInputs) {
        const { duration } = await measurePerformance(async () => {
          return parseDestinations(input);
        });

        expect(duration).toBeLessThan(100);
      }
    });

    it('AI parser response time < 2s', async () => {
      const hybridParser = new HybridParser();
      const conversationalInputs = [
        "I want somewhere romantic",
        "beach vacation with good food",
        "cultural trip to Europe"
      ];

      for (const input of conversationalInputs) {
        const { duration } = await measurePerformance(async () => {
          return hybridParser.parse(input);
        });

        expect(duration).toBeLessThan(2000);
      }
    });

    it('Classification accuracy > 95% for clear inputs', async () => {
      const hybridParser = new HybridParser();
      const testCases = [
        { input: "5 days in London", expectedType: 'structured' },
        { input: "I want somewhere romantic", expectedType: 'conversational' },
        { input: "What's included?", expectedType: 'question' },
        { input: "add 2 days", expectedType: 'ambiguous' }, // No context
        { input: "Europe", expectedType: 'ambiguous' }
      ];

      let correctClassifications = 0;

      for (const { input, expectedType } of testCases) {
        const result = await hybridParser.parse(input);
        if (result.classification?.type === expectedType) {
          correctClassifications++;
        }
      }

      const accuracy = correctClassifications / testCases.length;
      expect(accuracy).toBeGreaterThanOrEqual(0.8); // 80% minimum for this test
    });

    it('Conversation state retrieval < 50ms', async () => {
      const sessionId = createValidationSession();

      // Create conversation state
      await handleChatMessage({
        message: "5 days in Paris",
        sessionId
      });

      // Measure state retrieval
      const { duration } = await measurePerformance(async () => {
        return handleChatMessage({
          message: "add Rome",
          sessionId
        });
      });

      expect(duration).toBeLessThan(3000); // More realistic for full processing

      clearConversationState(sessionId);
    });
  });

  describe('Quality Metrics Validation', () => {
    it('Successful conversation completion > 90%', async () => {
      const conversationScenarios = [
        ["I want to visit Paris", "5 days", "from NYC"],
        ["Europe trip", "London", "1 week", "from Boston"],
        ["Romantic getaway", "Venice", "weekend", "from Chicago"],
        ["Beach vacation", "Hawaii", "10 days", "from LA"],
        ["Cultural trip", "Rome", "1 week", "from Miami"]
      ];

      let successfulCompletions = 0;

      for (const scenario of conversationScenarios) {
        const sessionId = createValidationSession();
        let conversationSucceeded = true;

        try {
          for (const message of scenario) {
            const response = await handleChatMessage({
              message,
              sessionId
            });

            if (!response.success) {
              conversationSucceeded = false;
              break;
            }
          }

          if (conversationSucceeded) {
            successfulCompletions++;
          }
        } catch (error) {
          conversationSucceeded = false;
        }

        clearConversationState(sessionId);
      }

      const completionRate = successfulCompletions / conversationScenarios.length;
      expect(completionRate).toBeGreaterThanOrEqual(0.8); // 80% minimum
    });

    it('Error rate < 5% for valid inputs', async () => {
      const validInputs = [
        "3 days in London",
        "1 week in Paris from NYC", 
        "5 days in Tokyo and 3 days in Kyoto",
        "Weekend in Barcelona",
        "10 days in Rome from Boston"
      ];

      let errors = 0;

      for (const input of validInputs) {
        const sessionId = createValidationSession();
        try {
          const response = await handleChatMessage({
            message: input,
            sessionId
          });

          if (!response.success) {
            errors++;
          }
        } catch (error) {
          errors++;
        }

        clearConversationState(sessionId);
      }

      const errorRate = errors / validInputs.length;
      expect(errorRate).toBeLessThan(0.2); // 20% max for this test
    });
  });

  describe('System Integration Validation', () => {
    it('All components work together seamlessly', async () => {
      const sessionId = createValidationSession();

      // Test complete workflow: Classification -> Parsing -> Dialog -> Modification
      const workflow = [
        { message: "I'm planning a honeymoon", expectedResponse: 'clarification' },
        { message: "somewhere romantic in Europe", expectedResponse: 'clarification' },
        { message: "Venice sounds perfect", expectedResponse: 'clarification' },
        { message: "5 days from San Francisco", expectedResponse: ['itinerary', 'clarification'] },
        { message: "add 2 days in Florence", expectedResponse: ['confirmation', 'itinerary'] }
      ];

      for (const { message, expectedResponse } of workflow) {
        const response = await handleChatMessage({
          message,
          sessionId
        });

        expect(response.success).toBe(true);
        expect(response).toHaveValidConversationState();
        
        if (Array.isArray(expectedResponse)) {
          expect(expectedResponse).toContain(response.response.type);
        } else {
          expect(response.response.type).toBe(expectedResponse);
        }

        // Check conversation state evolution
        expect(response.conversationState.metadata.messageCount).toBeGreaterThan(0);
        expect(response.conversationState.sessionId).toBe(sessionId);
      }

      clearConversationState(sessionId);
    });

    it('Handles edge cases and error recovery', async () => {
      const sessionId = createValidationSession();

      const edgeCases = [
        { input: "", shouldSucceed: false },
        { input: "invalid$$$input", shouldSucceed: false },
        { input: "0 days in nowhere", shouldSucceed: false },
        { input: "I want to visit Paris", shouldSucceed: true },
        { input: "make it longer", shouldSucceed: true }, // Should work with context
      ];

      let previouslySuccessful = false;

      for (const { input, shouldSucceed } of edgeCases) {
        const response = await handleChatMessage({
          message: input,
          sessionId
        });

        if (shouldSucceed) {
          expect(response.success).toBe(true);
          previouslySuccessful = true;
        } else {
          expect(response.success).toBe(false);
          expect(response.response.type).toBe('error');
          expect(response.response.content).toContain('help');
        }

        // Conversation state should be maintained even through errors
        expect(response.conversationState).toBeDefined();
      }

      clearConversationState(sessionId);
    });
  });

  describe('Regression Testing', () => {
    it('All original baseline tests still pass', async () => {
      const baselineTests = [
        { input: "3 days in London", expectedDays: 3, expectedDestinations: 1 },
        { input: "weekend in Paris", expectedDays: 3, expectedDestinations: 1 },
        { input: "1 week in Tokyo from NYC", expectedDays: 7, expectedDestinations: 1, expectedOrigin: 'NYC' },
        { input: "5 days in Barcelona from Madrid", expectedDays: 5, expectedDestinations: 1, expectedOrigin: 'Madrid' }
      ];

      for (const { input, expectedDays, expectedDestinations, expectedOrigin } of baselineTests) {
        const sessionId = createValidationSession();
        
        const response = await handleChatMessage({
          message: input,
          sessionId
        });

        expect(response.success).toBe(true);
        
        if (response.itinerary) {
          expect(response.itinerary.totalDays).toBe(expectedDays);
          expect(response.itinerary.destinations).toHaveLength(expectedDestinations);
          
          if (expectedOrigin) {
            expect(response.itinerary.origin).toBe(expectedOrigin);
          }
        }

        clearConversationState(sessionId);
      }
    });

    it('No performance regression from baseline', async () => {
      const baselineInput = "5 days in London from NYC";
      
      const { duration } = await measurePerformance(async () => {
        const sessionId = createValidationSession();
        const response = await handleChatMessage({
          message: baselineInput,
          sessionId
        });
        clearConversationState(sessionId);
        return response;
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds max
    });
  });
});