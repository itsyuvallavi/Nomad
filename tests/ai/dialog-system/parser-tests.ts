/**
 * Parser Tests - Phase 5.1
 * Comprehensive testing for all parsing components: Traditional, AI, and Hybrid
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { parseDestinations } from '@/ai/utils/destination-parser';
import { HybridParser } from '@/ai/utils/hybrid-parser';
import { AIParser } from '@/ai/utils/ai-parser';
import { ConversationState } from '@/ai/flows/generate-dialog-response';

describe('Traditional Parser Tests', () => {
  describe('Multi-destination Parsing', () => {
    it('should parse Lisbon/Granada case correctly', () => {
      const input = "2 weeks in Lisbon and Granada, 10 days lisbon, 4 granada";
      const result = parseDestinations(input);
      
      expect(result.destinations).toHaveLength(2);
      expect(result.destinations).toContainEqual(
        expect.objectContaining({ city: 'Lisbon', days: 10 })
      );
      expect(result.destinations).toContainEqual(
        expect.objectContaining({ city: 'Granada', days: 4 })
      );
      expect(result.totalDays).toBe(14);
    });

    it('should handle "X days in City and Y days in City2" pattern', () => {
      const input = "5 days in Paris and 3 days in Rome";
      const result = parseDestinations(input);
      
      expect(result.destinations).toHaveLength(2);
      expect(result.destinations).toContainEqual(
        expect.objectContaining({ city: 'Paris', days: 5 })
      );
      expect(result.destinations).toContainEqual(
        expect.objectContaining({ city: 'Rome', days: 3 })
      );
      expect(result.totalDays).toBe(8);
    });

    it('should handle comma-separated city lists', () => {
      const input = "visiting London, Paris, and Barcelona for 2 days each";
      const result = parseDestinations(input);
      
      expect(result.destinations).toHaveLength(3);
      expect(result.totalDays).toBe(6);
    });

    it('should handle "one week in Tokyo and 3 days in Kyoto"', () => {
      const input = "one week in Tokyo and 3 days in Kyoto";
      const result = parseDestinations(input);
      
      expect(result.destinations).toHaveLength(2);
      expect(result.destinations).toContainEqual(
        expect.objectContaining({ city: 'Tokyo', days: 7 })
      );
      expect(result.destinations).toContainEqual(
        expect.objectContaining({ city: 'Kyoto', days: 3 })
      );
      expect(result.totalDays).toBe(10);
    });
  });

  describe('Origin Detection', () => {
    it('should detect various origin patterns', () => {
      const testCases = [
        { input: "3 days in London from NYC", expected: "NYC" },
        { input: "flying from Boston to Paris for a week", expected: "Boston" },
        { input: "based in San Francisco, want to visit Tokyo", expected: "San Francisco" },
        { input: "currently in Berlin, planning 5 days in Prague", expected: "Berlin" },
        { input: "departing from Los Angeles", expected: "Los Angeles" }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = parseDestinations(input);
        expect(result.origin).toBe(expected);
      });
    });

    it('should handle missing origin gracefully', () => {
      const input = "3 days in London";
      const result = parseDestinations(input);
      
      expect(result.origin).toBe(null);
      expect(result.destinations).toHaveLength(1);
    });
  });

  describe('Duration Parsing', () => {
    it('should handle various duration formats', () => {
      const testCases = [
        { input: "weekend in Paris", expected: 3 },
        { input: "a week in London", expected: 7 },
        { input: "2 weeks in Barcelona", expected: 14 },
        { input: "10 days in Rome", expected: 10 },
        { input: "a month in Tokyo", expected: 30 }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = parseDestinations(input);
        expect(result.totalDays).toBe(expected);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      const result = parseDestinations("");
      expect(result.destinations).toHaveLength(0);
      expect(result.totalDays).toBe(0);
    });

    it('should handle invalid city names', () => {
      const result = parseDestinations("3 days in XYZ123");
      expect(result.destinations).toHaveLength(0);
    });

    it('should handle zero or negative days', () => {
      const result = parseDestinations("0 days in Paris");
      expect(result.destinations).toHaveLength(0);
    });
  });
});

describe('Hybrid Parser Tests', () => {
  let hybridParser: HybridParser;

  beforeEach(() => {
    hybridParser = new HybridParser();
  });

  describe('Input Classification', () => {
    it('should classify structured travel requests', async () => {
      const input = "3 days in London from NYC";
      const result = await hybridParser.parse(input);
      
      expect(result.classification?.type).toBe('structured');
      expect(result.classification?.confidence).toBeGreaterThan(0.8);
    });

    it('should classify conversational requests', async () => {
      const input = "I'd love to visit somewhere warm and romantic";
      const result = await hybridParser.parse(input);
      
      expect(result.classification?.type).toBe('conversational');
      expect(result.classification?.confidence).toBeGreaterThan(0.6);
    });

    it('should classify modification requests', async () => {
      const input = "add 2 more days to my Paris trip";
      const context: Partial<ConversationState> = {
        currentItinerary: {
          destinations: [{ city: 'Paris', days: 3 }],
          totalDays: 3,
          origin: null
        }
      };
      
      const result = await hybridParser.parse(input, context as ConversationState);
      expect(result.classification?.type).toBe('modification');
    });

    it('should classify questions', async () => {
      const input = "What's included in the Paris package?";
      const result = await hybridParser.parse(input);
      
      expect(result.classification?.type).toBe('question');
    });

    it('should handle ambiguous input', async () => {
      const input = "Europe";
      const result = await hybridParser.parse(input);
      
      expect(result.classification?.type).toBe('ambiguous');
      expect(result.classification?.confidence).toBeLessThan(0.6);
    });
  });

  describe('Parser Routing', () => {
    it('should route structured inputs to traditional parser', async () => {
      const input = "5 days in Barcelona from Madrid";
      const result = await hybridParser.parse(input);
      
      expect(result.parseResult?.destinations).toHaveLength(1);
      expect(result.parseResult?.destinations[0]).toEqual(
        expect.objectContaining({ city: 'Barcelona', days: 5 })
      );
      expect(result.parseResult?.origin).toBe('Madrid');
    });

    it('should enhance with AI when traditional parser has low confidence', async () => {
      const input = "I want to spend some time in the city of love";
      const result = await hybridParser.parse(input);
      
      expect(result.classification?.type).toBe('conversational');
      // AI parser should be used for this type of input
    });
  });

  describe('Performance', () => {
    it('should complete parsing within reasonable time', async () => {
      const start = Date.now();
      await hybridParser.parse("3 days in London");
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(2000); // 2 seconds max
    });
  });
});

describe('AI Parser Tests', () => {
  let aiParser: AIParser;

  beforeEach(() => {
    aiParser = new AIParser();
  });

  describe('Natural Language Understanding', () => {
    it('should understand conversational travel requests', async () => {
      const input = "I'd like to visit somewhere romantic in Europe for a week";
      const result = await aiParser.parse(input);
      
      expect(result.destinations).toHaveLength(1);
      expect(result.totalDays).toBe(7);
      expect(['Paris', 'Venice', 'Prague', 'Barcelona']).toContain(result.destinations[0].city);
    });

    it('should extract preferences from natural language', async () => {
      const input = "I want a relaxing beach vacation for 5 days, somewhere not too expensive";
      const result = await aiParser.parse(input);
      
      expect(result.totalDays).toBe(5);
      expect(result.preferences).toContain('beach');
      expect(result.preferences).toContain('relaxing');
      expect(result.preferences).toContain('budget-friendly');
    });

    it('should handle relative references with context', async () => {
      const context: ConversationState = {
        sessionId: 'test',
        currentItinerary: {
          destinations: [{ city: 'London', days: 3 }],
          totalDays: 3,
          origin: 'NYC'
        },
        history: [],
        context: {
          destinations: ['London'],
          preferences: new Map(),
          constraints: []
        },
        metadata: {
          startTime: new Date(),
          lastActivity: new Date(),
          messageCount: 1
        }
      };

      const input = "add 2 more days there";
      const result = await aiParser.handleModification(input, context.currentItinerary, context);
      
      expect(result.type).toBe('change_duration');
      expect(result.changes.newDuration).toBe(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle API failures gracefully', async () => {
      // Mock API failure
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));

      const input = "3 days in London";
      const result = await aiParser.parse(input);
      
      expect(result.error).toBeDefined();
      expect(result.destinations).toHaveLength(0);

      global.fetch = originalFetch;
    });

    it('should handle malformed AI responses', async () => {
      // This would require mocking OpenAI response
      // Implementation depends on how OpenAI client is structured
    });
  });

  describe('Confidence Scoring', () => {
    it('should provide confidence scores for parsing results', async () => {
      const input = "3 days in London from NYC";
      const result = await aiParser.parse(input);
      
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should have lower confidence for ambiguous requests', async () => {
      const input = "Europe";
      const result = await aiParser.parse(input);
      
      expect(result.confidence).toBeLessThan(0.5);
    });
  });
});

describe('Parser Integration Tests', () => {
  it('should maintain consistency between traditional and hybrid parsers', async () => {
    const input = "5 days in Rome from Florence";
    
    const traditionalResult = parseDestinations(input);
    const hybridParser = new HybridParser();
    const hybridResult = await hybridParser.parse(input);
    
    // Results should be identical for structured inputs
    expect(hybridResult.parseResult?.destinations).toEqual(traditionalResult.destinations);
    expect(hybridResult.parseResult?.origin).toBe(traditionalResult.origin);
    expect(hybridResult.parseResult?.totalDays).toBe(traditionalResult.totalDays);
  });

  it('should handle fallback scenarios correctly', async () => {
    const input = "somewhere nice for vacation";
    const hybridParser = new HybridParser();
    const result = await hybridParser.parse(input);
    
    // Should classify as conversational and route to AI
    expect(result.classification?.type).toBe('conversational');
    // AI parser should provide some result even for vague input
    expect(result.parseResult).toBeDefined();
  });
});