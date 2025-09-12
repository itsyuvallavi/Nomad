/**
 * Lisbon/Granada Test Scenario - Phase 5.2
 * Tests the original problem case that motivated the enhanced dialog architecture
 */

import { describe, it, expect } from '@jest/globals';
import { parseDestinations } from '@/ai/utils/destination-parser';
import { handleChatMessage, clearConversationState } from '@/ai/flows/chat-conversation';

describe('Lisbon/Granada Problem Case', () => {
  const testSessionId = 'lisbon-granada-test';

  afterEach(() => {
    clearConversationState(testSessionId);
  });

  describe('Original Problem Input', () => {
    it('should correctly parse "2 weeks in Lisbon and Granada, 10 days lisbon, 4 granada"', async () => {
      const input = "2 weeks in Lisbon and Granada, 10 days lisbon, 4 granada";
      
      // Test traditional parser directly
      const parseResult = parseDestinations(input);
      
      expect(parseResult.destinations).toHaveLength(2);
      expect(parseResult.totalDays).toBe(14);
      
      const lisbon = parseResult.destinations.find(d => 
        d.city.toLowerCase().includes('lisbon')
      );
      const granada = parseResult.destinations.find(d => 
        d.city.toLowerCase().includes('granada')
      );
      
      expect(lisbon).toBeDefined();
      expect(lisbon?.days).toBe(10);
      expect(granada).toBeDefined();
      expect(granada?.days).toBe(4);
      
      // Test through complete dialog system
      const response = await handleChatMessage({
        message: input,
        sessionId: testSessionId
      });
      
      expect(response.success).toBe(true);
      expect(response.itinerary).toBeDefined();
      expect(response.itinerary?.destinations).toHaveLength(2);
      expect(response.itinerary?.totalDays).toBe(14);
    });

    it('should handle variations of the Lisbon/Granada pattern', async () => {
      const variations = [
        "14 days in Lisbon and Granada, 10 in Lisbon, 4 in Granada",
        "2 weeks visiting Lisbon and Granada: 10 days Lisbon, 4 days Granada",
        "Lisbon and Granada for 2 weeks, spending 10 days in Lisbon and 4 in Granada",
        "10 days in Lisbon and 4 days in Granada from NYC"
      ];

      for (const variation of variations) {
        const result = parseDestinations(variation);
        
        expect(result.destinations).toHaveLength(2);
        expect(result.totalDays).toBe(14);
        
        const lisbonDays = result.destinations.find(d => 
          d.city.toLowerCase().includes('lisbon')
        )?.days;
        const granadaDays = result.destinations.find(d => 
          d.city.toLowerCase().includes('granada')  
        )?.days;
        
        expect(lisbonDays).toBe(10);
        expect(granadaDays).toBe(4);
      }
    });
  });

  describe('Multi-destination Edge Cases', () => {
    it('should handle three or more destinations with specific days', () => {
      const input = "3 weeks in Spain: 10 days Madrid, 7 days Barcelona, 4 days Seville";
      const result = parseDestinations(input);
      
      expect(result.destinations).toHaveLength(3);
      expect(result.totalDays).toBe(21);
      
      const madrid = result.destinations.find(d => d.city === 'Madrid');
      const barcelona = result.destinations.find(d => d.city === 'Barcelona');
      const seville = result.destinations.find(d => d.city === 'Seville');
      
      expect(madrid?.days).toBe(10);
      expect(barcelona?.days).toBe(7);
      expect(seville?.days).toBe(4);
    });

    it('should handle uneven day distribution', () => {
      const input = "12 days in Italy: 8 days Rome, 4 days Florence";
      const result = parseDestinations(input);
      
      expect(result.destinations).toHaveLength(2);
      expect(result.totalDays).toBe(12);
    });

    it('should handle mixed duration formats', () => {
      const input = "1 week in London and 3 days in Paris";
      const result = parseDestinations(input);
      
      expect(result.destinations).toHaveLength(2);
      expect(result.totalDays).toBe(10);
      
      const london = result.destinations.find(d => d.city === 'London');
      const paris = result.destinations.find(d => d.city === 'Paris');
      
      expect(london?.days).toBe(7);
      expect(paris?.days).toBe(3);
    });
  });

  describe('Error Recovery', () => {
    it('should handle mismatched total vs individual days', () => {
      const input = "2 weeks in Lisbon and Granada, 12 days lisbon, 4 granada"; // 16 days total, not 14
      const result = parseDestinations(input);
      
      // Should either:
      // 1. Use individual day counts (12 + 4 = 16)
      // 2. Or flag as inconsistent and ask for clarification
      if (result.destinations.length > 0) {
        const totalCalculated = result.destinations.reduce((sum, d) => sum + d.days, 0);
        expect(totalCalculated).toBe(result.totalDays);
      }
    });

    it('should handle missing day specification for one city', () => {
      const input = "2 weeks in Lisbon and Granada, 10 days in Lisbon";
      const result = parseDestinations(input);
      
      if (result.destinations.length === 2) {
        const lisbon = result.destinations.find(d => d.city.toLowerCase().includes('lisbon'));
        const granada = result.destinations.find(d => d.city.toLowerCase().includes('granada'));
        
        expect(lisbon?.days).toBe(10);
        expect(granada?.days).toBe(4); // Should calculate remaining days
      }
    });

    it('should handle typos and variations in city names', () => {
      const variations = [
        "10 days in Lisboa and 4 days in Granada", // Portuguese spelling
        "10 days in Lisbon and 4 days in Grenada", // Common misspelling
        "10 days lisbon 4 days granada" // No prepositions
      ];

      for (const variation of variations) {
        const result = parseDestinations(variation);
        expect(result.destinations).toHaveLength(2);
        expect(result.totalDays).toBe(14);
      }
    });
  });

  describe('Integration with Dialog System', () => {
    it('should handle follow-up questions after Lisbon/Granada parsing', async () => {
      // Initial parse
      const initial = await handleChatMessage({
        message: "10 days in Lisbon and 4 days in Granada",
        sessionId: testSessionId
      });

      expect(initial.success).toBe(true);
      expect(initial.itinerary?.destinations).toHaveLength(2);

      // Follow-up modification
      const followUp = await handleChatMessage({
        message: "add 2 more days to Granada",
        sessionId: testSessionId
      });

      expect(followUp.success).toBe(true);
      const granadaDays = followUp.itinerary?.destinations.find(d => 
        d.city.toLowerCase().includes('granada')
      )?.days;
      expect(granadaDays).toBe(6);
    });

    it('should preserve origin information in complex multi-destination requests', async () => {
      const response = await handleChatMessage({
        message: "2 weeks in Lisbon and Granada from NYC, 10 days lisbon, 4 granada",
        sessionId: testSessionId
      });

      expect(response.success).toBe(true);
      expect(response.conversationState.context.origin).toBe('NYC');
      expect(response.itinerary?.origin).toBe('NYC');
    });

    it('should handle conversational modifications to multi-city trips', async () => {
      // Create multi-city trip
      await handleChatMessage({
        message: "10 days in Lisbon and 4 days in Granada",
        sessionId: testSessionId
      });

      // Add conversational preference
      const response = await handleChatMessage({
        message: "make the Granada part more focused on flamenco and culture",
        sessionId: testSessionId
      });

      expect(response.success).toBe(true);
      expect(response.conversationState.context.preferences.has('flamenco')).toBe(true);
      expect(response.conversationState.context.preferences.has('culture')).toBe(true);
    });
  });

  describe('Performance Requirements', () => {
    it('should parse complex multi-destination requests quickly', async () => {
      const complexInput = "3 weeks in Spain and Portugal: 10 days Madrid, 4 days Barcelona, 5 days Lisbon, 2 days Porto from Boston";
      
      const start = Date.now();
      const result = parseDestinations(complexInput);
      const parseTime = Date.now() - start;
      
      expect(parseTime).toBeLessThan(100); // Should parse within 100ms
      expect(result.destinations).toHaveLength(4);
      expect(result.totalDays).toBe(21);
      expect(result.origin).toBe('Boston');
    });

    it('should handle multiple rapid multi-destination requests', async () => {
      const requests = [
        "5 days London, 3 days Paris",
        "1 week Tokyo, 3 days Kyoto", 
        "10 days Rome, 4 days Florence",
        "6 days Barcelona, 2 days Madrid",
        "8 days Amsterdam, 2 days Brussels"
      ];

      const start = Date.now();
      const results = requests.map(req => parseDestinations(req));
      const totalTime = Date.now() - start;

      expect(totalTime).toBeLessThan(500); // All 5 should parse within 500ms
      expect(results.every(r => r.destinations.length >= 2)).toBe(true);
    });
  });
});