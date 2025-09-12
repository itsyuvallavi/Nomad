/**
 * Classification Tests - Phase 5.1
 * Tests for input classification system and routing logic
 */

import { describe, it, expect } from '@jest/globals';
import { HybridParser } from '@/ai/utils/hybrid-parser';
import { ConversationState } from '@/ai/flows/generate-dialog-response';

describe('Input Classification Tests', () => {
  let hybridParser: HybridParser;

  beforeEach(() => {
    hybridParser = new HybridParser();
  });

  describe('Structured Input Classification', () => {
    const structuredInputs = [
      "3 days in London from NYC",
      "5 days in Paris and 3 days in Rome",
      "weekend in Barcelona",
      "2 weeks in Tokyo from San Francisco",
      "10 days in Lisbon and Granada, 6 days lisbon, 4 granada",
      "a week in Amsterdam flying from Boston"
    ];

    structuredInputs.forEach(input => {
      it(`should classify "${input}" as structured`, async () => {
        const result = await hybridParser.parse(input);
        expect(result.classification?.type).toBe('structured');
        expect(result.classification?.confidence).toBeGreaterThan(0.7);
      });
    });

    it('should provide high confidence for clear structured inputs', async () => {
      const input = "5 days in London from NYC";
      const result = await hybridParser.parse(input);
      
      expect(result.classification?.confidence).toBeGreaterThan(0.9);
      expect(result.classification?.features).toContain('duration_specified');
      expect(result.classification?.features).toContain('destination_specified');
      expect(result.classification?.features).toContain('origin_specified');
    });
  });

  describe('Conversational Input Classification', () => {
    const conversationalInputs = [
      "I'd love to visit somewhere warm",
      "Looking for a romantic getaway",
      "Need a relaxing beach vacation",
      "Want to explore European culture",
      "Something adventurous and exciting",
      "I need a budget-friendly trip",
      "Show me something exotic"
    ];

    conversationalInputs.forEach(input => {
      it(`should classify "${input}" as conversational`, async () => {
        const result = await hybridParser.parse(input);
        expect(result.classification?.type).toBe('conversational');
        expect(result.classification?.confidence).toBeGreaterThan(0.6);
      });
    });

    it('should identify conversational features', async () => {
      const input = "I'd love somewhere warm and romantic for my honeymoon";
      const result = await hybridParser.parse(input);
      
      expect(result.classification?.type).toBe('conversational');
      expect(result.classification?.features).toContain('preference_mentioned');
      expect(result.classification?.features).toContain('personal_context');
    });
  });

  describe('Modification Input Classification', () => {
    const baseItinerary = {
      destinations: [{ city: 'Paris', days: 5 }],
      totalDays: 5,
      origin: 'NYC'
    };

    const context: ConversationState = {
      sessionId: 'test',
      currentItinerary: baseItinerary,
      history: [],
      context: {
        destinations: ['Paris'],
        preferences: new Map(),
        constraints: []
      },
      metadata: {
        startTime: new Date(),
        lastActivity: new Date(),
        messageCount: 1
      }
    };

    const modificationInputs = [
      "add 2 more days",
      "remove London from the trip",
      "change Paris to 7 days",
      "add Rome to the itinerary",
      "make it more romantic",
      "extend the trip by a week",
      "cancel the Barcelona part"
    ];

    modificationInputs.forEach(input => {
      it(`should classify "${input}" as modification with context`, async () => {
        const result = await hybridParser.parse(input, context);
        expect(result.classification?.type).toBe('modification');
      });
    });

    it('should not classify modification without context', async () => {
      const input = "add 2 more days";
      const result = await hybridParser.parse(input); // No context
      
      // Without context, should be ambiguous
      expect(result.classification?.type).toBe('ambiguous');
    });

    it('should identify modification types', async () => {
      const testCases = [
        { input: "add Rome to the trip", expectedFeature: 'add_destination' },
        { input: "remove Paris", expectedFeature: 'remove_destination' },
        { input: "change to 7 days", expectedFeature: 'change_duration' },
        { input: "make it more romantic", expectedFeature: 'update_preferences' }
      ];

      for (const { input, expectedFeature } of testCases) {
        const result = await hybridParser.parse(input, context);
        expect(result.classification?.features).toContain(expectedFeature);
      }
    });
  });

  describe('Question Classification', () => {
    const questionInputs = [
      "What's included in the package?",
      "How much does it cost?",
      "What's the weather like in Paris?",
      "Can I change my dates later?",
      "Are flights included?",
      "What activities are available?",
      "How do I get from the airport?"
    ];

    questionInputs.forEach(input => {
      it(`should classify "${input}" as question`, async () => {
        const result = await hybridParser.parse(input);
        expect(result.classification?.type).toBe('question');
      });
    });

    it('should distinguish travel planning from pure questions', async () => {
      const travelRequest = "I want to visit Paris for 5 days";
      const question = "What should I pack for Paris?";
      
      const travelResult = await hybridParser.parse(travelRequest);
      const questionResult = await hybridParser.parse(question);
      
      expect(travelResult.classification?.type).toBe('conversational');
      expect(questionResult.classification?.type).toBe('question');
    });
  });

  describe('Ambiguous Input Classification', () => {
    const ambiguousInputs = [
      "Europe",
      "travel",
      "vacation",
      "help",
      "hmm",
      "maybe",
      "not sure",
      ""
    ];

    ambiguousInputs.forEach(input => {
      it(`should classify "${input}" as ambiguous`, async () => {
        const result = await hybridParser.parse(input);
        expect(result.classification?.type).toBe('ambiguous');
        expect(result.classification?.confidence).toBeLessThan(0.6);
      });
    });

    it('should provide clarification suggestions for ambiguous input', async () => {
      const input = "Europe";
      const result = await hybridParser.parse(input);
      
      expect(result.classification?.type).toBe('ambiguous');
      expect(result.classification?.suggestions).toBeDefined();
      expect(result.classification?.suggestions?.length).toBeGreaterThan(0);
    });
  });

  describe('Confidence Scoring', () => {
    it('should provide consistent confidence scoring', async () => {
      const testCases = [
        { input: "5 days in London from NYC", expectedMin: 0.9 },
        { input: "I want to visit Paris", expectedMin: 0.7 },
        { input: "somewhere nice", expectedMax: 0.5 },
        { input: "Europe", expectedMax: 0.4 }
      ];

      for (const { input, expectedMin, expectedMax } of testCases) {
        const result = await hybridParser.parse(input);
        const confidence = result.classification?.confidence || 0;
        
        if (expectedMin) {
          expect(confidence).toBeGreaterThanOrEqual(expectedMin);
        }
        if (expectedMax) {
          expect(confidence).toBeLessThanOrEqual(expectedMax);
        }
      }
    });

    it('should score higher confidence for specific inputs', async () => {
      const specific = "5 days in London from NYC departing March 15th";
      const vague = "somewhere nice for vacation";
      
      const specificResult = await hybridParser.parse(specific);
      const vagueResult = await hybridParser.parse(vague);
      
      expect(specificResult.classification?.confidence || 0)
        .toBeGreaterThan(vagueResult.classification?.confidence || 0);
    });
  });

  describe('Feature Extraction', () => {
    it('should extract relevant features from structured input', async () => {
      const input = "7 days in Tokyo from San Francisco with budget under $2000";
      const result = await hybridParser.parse(input);
      
      const features = result.classification?.features || [];
      expect(features).toContain('duration_specified');
      expect(features).toContain('destination_specified');
      expect(features).toContain('origin_specified');
      expect(features).toContain('budget_constraint');
    });

    it('should extract features from conversational input', async () => {
      const input = "I'm looking for a romantic honeymoon destination, somewhere warm with beaches";
      const result = await hybridParser.parse(input);
      
      const features = result.classification?.features || [];
      expect(features).toContain('preference_mentioned');
      expect(features).toContain('personal_context');
      expect(features).toContain('climate_preference');
      expect(features).toContain('activity_preference');
    });
  });

  describe('Router Decision Logic', () => {
    it('should route high-confidence structured inputs to traditional parser', async () => {
      const input = "5 days in Barcelona from Madrid";
      const result = await hybridParser.parse(input);
      
      expect(result.classification?.type).toBe('structured');
      expect(result.classification?.recommendedParser).toBe('traditional');
    });

    it('should route conversational inputs to AI parser', async () => {
      const input = "I want somewhere romantic and warm";
      const result = await hybridParser.parse(input);
      
      expect(result.classification?.type).toBe('conversational');
      expect(result.classification?.recommendedParser).toBe('ai');
    });

    it('should route medium complexity inputs to hybrid approach', async () => {
      const input = "3 days in London, but make it budget-friendly";
      const result = await hybridParser.parse(input);
      
      expect(result.classification?.recommendedParser).toBe('hybrid');
    });

    it('should handle parser routing failures gracefully', async () => {
      // This test would require mocking parser failures
      const input = "5 days in London";
      const result = await hybridParser.parse(input);
      
      // Should always provide some result, even if fallback
      expect(result).toBeDefined();
      expect(result.classification).toBeDefined();
    });
  });

  describe('Context Awareness', () => {
    it('should consider conversation history in classification', async () => {
      const context: ConversationState = {
        sessionId: 'test',
        history: [
          { role: 'user', content: '5 days in Paris', timestamp: new Date() },
          { role: 'assistant', content: 'Great choice! I can help plan that.', timestamp: new Date() }
        ],
        context: {
          destinations: ['Paris'],
          preferences: new Map(),
          constraints: []
        },
        metadata: {
          startTime: new Date(),
          lastActivity: new Date(),
          messageCount: 2
        }
      };

      const input = "add Rome to the trip";
      const result = await hybridParser.parse(input, context);
      
      expect(result.classification?.type).toBe('modification');
      expect(result.classification?.contextAware).toBe(true);
    });

    it('should adjust confidence based on context', async () => {
      const context: ConversationState = {
        sessionId: 'test',
        currentItinerary: {
          destinations: [{ city: 'London', days: 5 }],
          totalDays: 5,
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

      const withoutContext = await hybridParser.parse("add 2 days");
      const withContext = await hybridParser.parse("add 2 days", context);
      
      expect(withContext.classification?.confidence || 0)
        .toBeGreaterThan(withoutContext.classification?.confidence || 0);
    });
  });
});