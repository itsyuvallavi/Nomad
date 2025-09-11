/**
 * Modification Flow Test Scenario - Phase 5.2
 * Tests itinerary modification capabilities and conversation continuity
 */

import { describe, it, expect } from '@jest/globals';
import { handleChatMessage, clearConversationState } from '@/ai/flows/chat-conversation';
import { handleModification } from '@/ai/flows/handle-modification';

describe('Modification Flow Scenarios', () => {
  const createTestSession = () => `modification-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  describe('Basic Modifications', () => {
    it('should add destinations to existing itinerary', async () => {
      const sessionId = createTestSession();

      // Create base itinerary
      const initial = await handleChatMessage({
        message: "3 days in London from Boston",
        sessionId
      });

      expect(initial.success).toBe(true);
      expect(initial.itinerary?.destinations).toHaveLength(1);
      expect(initial.itinerary?.totalDays).toBe(3);

      // Add destination
      const modified = await handleChatMessage({
        message: "add 2 days in Paris",
        sessionId
      });

      expect(modified.success).toBe(true);
      expect(modified.itinerary?.destinations).toHaveLength(2);
      expect(modified.itinerary?.totalDays).toBe(5);

      const cities = modified.itinerary?.destinations.map(d => d.city) || [];
      expect(cities).toContain('London');
      expect(cities).toContain('Paris');

      clearConversationState(sessionId);
    });

    it('should remove destinations from itinerary', async () => {
      const sessionId = createTestSession();

      // Create multi-destination itinerary
      await handleChatMessage({
        message: "5 days in London and 3 days in Paris from NYC",
        sessionId
      });

      // Remove destination
      const modified = await handleChatMessage({
        message: "remove Paris from the trip",
        sessionId
      });

      expect(modified.success).toBe(true);
      expect(modified.itinerary?.destinations).toHaveLength(1);
      expect(modified.itinerary?.totalDays).toBe(5);
      expect(modified.itinerary?.destinations[0].city).toBe('London');

      clearConversationState(sessionId);
    });

    it('should change duration of existing destinations', async () => {
      const sessionId = createTestSession();

      // Create base itinerary
      await handleChatMessage({
        message: "3 days in Barcelona",
        sessionId
      });

      // Change duration
      const modified = await handleChatMessage({
        message: "make it 7 days instead",
        sessionId
      });

      expect(modified.success).toBe(true);
      expect(modified.itinerary?.totalDays).toBe(7);
      expect(modified.itinerary?.destinations[0].days).toBe(7);
      expect(modified.itinerary?.destinations[0].city).toBe('Barcelona');

      clearConversationState(sessionId);
    });

    it('should replace destinations', async () => {
      const sessionId = createTestSession();

      // Create base itinerary
      await handleChatMessage({
        message: "5 days in Rome",
        sessionId
      });

      // Replace destination
      const modified = await handleChatMessage({
        message: "change Rome to Florence",
        sessionId
      });

      expect(modified.success).toBe(true);
      expect(modified.itinerary?.destinations[0].city).toBe('Florence');
      expect(modified.itinerary?.destinations[0].days).toBe(5);
      expect(modified.itinerary?.totalDays).toBe(5);

      clearConversationState(sessionId);
    });
  });

  describe('Complex Modifications', () => {
    it('should handle multiple simultaneous modifications', async () => {
      const sessionId = createTestSession();

      // Create base itinerary
      await handleChatMessage({
        message: "1 week in London and 3 days in Paris",
        sessionId
      });

      // Multiple changes at once
      const modified = await handleChatMessage({
        message: "change London to 5 days, add 4 days in Amsterdam, and remove Paris",
        sessionId
      });

      expect(modified.success).toBe(true);
      expect(modified.itinerary?.destinations).toHaveLength(2);
      expect(modified.itinerary?.totalDays).toBe(9);

      const cities = modified.itinerary?.destinations.map(d => d.city) || [];
      expect(cities).toContain('London');
      expect(cities).toContain('Amsterdam');
      expect(cities).not.toContain('Paris');

      const londonDays = modified.itinerary?.destinations.find(d => d.city === 'London')?.days;
      const amsterdamDays = modified.itinerary?.destinations.find(d => d.city === 'Amsterdam')?.days;
      
      expect(londonDays).toBe(5);
      expect(amsterdamDays).toBe(4);

      clearConversationState(sessionId);
    });

    it('should handle proportional duration adjustments', async () => {
      const sessionId = createTestSession();

      // Create multi-destination itinerary
      await handleChatMessage({
        message: "10 days total: 6 days London, 4 days Paris",
        sessionId
      });

      // Extend total duration proportionally
      const modified = await handleChatMessage({
        message: "extend the whole trip to 2 weeks",
        sessionId
      });

      expect(modified.success).toBe(true);
      expect(modified.itinerary?.totalDays).toBe(14);

      // Should maintain proportions or ask for clarification
      const londonDays = modified.itinerary?.destinations.find(d => d.city === 'London')?.days;
      const parisDays = modified.itinerary?.destinations.find(d => d.city === 'Paris')?.days;

      expect(londonDays).toBeGreaterThan(4);
      expect(parisDays).toBeGreaterThan(2);
      expect((londonDays || 0) + (parisDays || 0)).toBe(14);

      clearConversationState(sessionId);
    });

    it('should handle origin changes', async () => {
      const sessionId = createTestSession();

      // Create itinerary with origin
      await handleChatMessage({
        message: "5 days in Tokyo from NYC",
        sessionId
      });

      // Change origin
      const modified = await handleChatMessage({
        message: "actually, I'll be departing from Los Angeles",
        sessionId
      });

      expect(modified.success).toBe(true);
      expect(modified.conversationState.context.origin).toBe('Los Angeles');
      expect(modified.itinerary?.origin).toBe('Los Angeles');

      clearConversationState(sessionId);
    });
  });

  describe('Preference Modifications', () => {
    it('should handle preference updates', async () => {
      const sessionId = createTestSession();

      // Create base itinerary
      await handleChatMessage({
        message: "5 days in Paris",
        sessionId
      });

      // Add preferences
      const modified = await handleChatMessage({
        message: "make it more romantic and include fine dining",
        sessionId
      });

      expect(modified.success).toBe(true);
      expect(modified.conversationState.context.preferences.has('romantic')).toBe(true);
      expect(modified.conversationState.context.preferences.has('fine-dining')).toBe(true);

      clearConversationState(sessionId);
    });

    it('should handle budget constraint modifications', async () => {
      const sessionId = createTestSession();

      // Create itinerary
      await handleChatMessage({
        message: "1 week in London",
        sessionId
      });

      // Add budget constraint
      const modified = await handleChatMessage({
        message: "keep it under $2000 total",
        sessionId
      });

      expect(modified.success).toBe(true);
      expect(modified.conversationState.context.constraints.some(
        c => c.type === 'budget' && c.value === 2000
      )).toBe(true);

      clearConversationState(sessionId);
    });

    it('should handle activity preference changes', async () => {
      const sessionId = createTestSession();

      // Create itinerary with preferences
      await handleChatMessage({
        message: "beach vacation in Greece for 1 week",
        sessionId
      });

      // Change activity focus
      const modified = await handleChatMessage({
        message: "actually, make it more about history and ancient sites",
        sessionId
      });

      expect(modified.success).toBe(true);
      expect(modified.conversationState.context.preferences.has('history')).toBe(true);
      expect(modified.conversationState.context.preferences.has('ancient-sites')).toBe(true);

      clearConversationState(sessionId);
    });
  });

  describe('Natural Language Modifications', () => {
    it('should understand conversational modification requests', async () => {
      const sessionId = createTestSession();

      // Create base itinerary
      await handleChatMessage({
        message: "5 days in Rome",
        sessionId
      });

      const conversationalModifications = [
        { input: "make it longer", expectedType: 'change_duration' },
        { input: "add another city nearby", expectedType: 'add_destination' },
        { input: "make it more cultural", expectedType: 'update_preferences' },
        { input: "I changed my mind about the duration", expectedType: 'change_duration' }
      ];

      for (const { input, expectedType } of conversationalModifications) {
        const response = await handleChatMessage({
          message: input,
          sessionId
        });

        expect(response.success).toBe(true);
        expect(response.metadata.classification?.type).toBe('modification');
        
        // Check if the modification was properly identified
        if (response.response.type === 'confirmation') {
          expect(response.response.content.toLowerCase()).toContain(expectedType.split('_')[1]);
        }
      }

      clearConversationState(sessionId);
    });

    it('should handle relative references in modifications', async () => {
      const sessionId = createTestSession();

      // Create multi-destination itinerary
      await handleChatMessage({
        message: "5 days in London and 3 days in Paris",
        sessionId
      });

      // Use relative references
      const modifications = [
        "add 2 more days to the first city",
        "make the Paris part longer",
        "add another day to the shorter stay"
      ];

      for (const modification of modifications) {
        const response = await handleChatMessage({
          message: modification,
          sessionId
        });

        expect(response.success).toBe(true);
        expect(response.metadata.classification?.type).toBe('modification');
      }

      clearConversationState(sessionId);
    });
  });

  describe('Modification Validation and Confirmation', () => {
    it('should request confirmation for significant changes', async () => {
      const sessionId = createTestSession();

      // Create expensive base itinerary
      await handleChatMessage({
        message: "luxury 2 weeks in Tokyo",
        sessionId
      });

      // Make significant change
      const response = await handleChatMessage({
        message: "change it to budget backpacking for 1 month",
        sessionId
      });

      expect(response.success).toBe(true);
      if (response.response.type === 'confirmation') {
        expect(response.response.content.toLowerCase()).toMatch(/confirm|sure|change/);
      }

      clearConversationState(sessionId);
    });

    it('should show modification previews', async () => {
      const sessionId = createTestSession();

      // Create base itinerary
      await handleChatMessage({
        message: "1 week in Barcelona",
        sessionId
      });

      // Request modification
      const response = await handleChatMessage({
        message: "add 3 days in Madrid",
        sessionId
      });

      expect(response.success).toBe(true);
      
      if (response.response.type === 'confirmation') {
        expect(response.response.content).toContain('Barcelona');
        expect(response.response.content).toContain('Madrid');
        expect(response.response.content).toContain('10'); // Total days
      }

      clearConversationState(sessionId);
    });

    it('should handle modification rejections', async () => {
      const sessionId = createTestSession();

      // Create itinerary
      await handleChatMessage({
        message: "5 days in London",
        sessionId
      });

      // Request impossible modification
      const response = await handleChatMessage({
        message: "add 50 days in every city in Europe",
        sessionId
      });

      expect(response.success).toBe(false);
      expect(response.response.type).toBe('error');
      expect(response.response.content.toLowerCase()).toMatch(/realistic|specific|clarify/);

      clearConversationState(sessionId);
    });
  });

  describe('Modification History and Undo', () => {
    it('should track modification history', async () => {
      const sessionId = createTestSession();

      // Create base itinerary
      await handleChatMessage({
        message: "3 days in Rome",
        sessionId
      });

      // Make modifications
      await handleChatMessage({
        message: "add 2 days in Florence",
        sessionId
      });

      await handleChatMessage({
        message: "change Rome to 5 days",
        sessionId
      });

      const finalState = await handleChatMessage({
        message: "what changes have I made?",
        sessionId
      });

      expect(finalState.success).toBe(true);
      expect(finalState.conversationState.metadata.messageCount).toBeGreaterThan(6);

      clearConversationState(sessionId);
    });

    it('should handle undo requests', async () => {
      const sessionId = createTestSession();

      // Create and modify itinerary
      await handleChatMessage({
        message: "5 days in Paris",
        sessionId
      });

      const modified = await handleChatMessage({
        message: "add 3 days in London", 
        sessionId
      });

      // Request undo
      const undone = await handleChatMessage({
        message: "undo that last change",
        sessionId
      });

      expect(undone.success).toBe(true);
      
      if (undone.itinerary) {
        expect(undone.itinerary.destinations).toHaveLength(1);
        expect(undone.itinerary.destinations[0].city).toBe('Paris');
      }

      clearConversationState(sessionId);
    });
  });

  describe('Error Recovery in Modifications', () => {
    it('should handle invalid destination modifications', async () => {
      const sessionId = createTestSession();

      // Create base itinerary
      await handleChatMessage({
        message: "5 days in London",
        sessionId
      });

      // Try to modify non-existent destination
      const response = await handleChatMessage({
        message: "remove Tokyo from the trip",
        sessionId
      });

      expect(response.success).toBe(false);
      expect(response.response.content.toLowerCase()).toContain('tokyo');
      expect(response.response.content.toLowerCase()).toMatch(/not|current|itinerary/);

      clearConversationState(sessionId);
    });

    it('should handle conflicting modifications', async () => {
      const sessionId = createTestSession();

      // Create itinerary
      await handleChatMessage({
        message: "5 days in Barcelona",
        sessionId
      });

      // Make conflicting request
      const response = await handleChatMessage({
        message: "make it 10 days but also reduce it to 3 days",
        sessionId
      });

      expect(response.success).toBe(false);
      expect(response.response.type).toBe('clarification');
      expect(response.response.content.toLowerCase()).toMatch(/clarify|specific|conflict/);

      clearConversationState(sessionId);
    });

    it('should validate modification feasibility', async () => {
      const sessionId = createTestSession();

      // Create itinerary
      await handleChatMessage({
        message: "2 days in Paris",
        sessionId
      });

      // Request unrealistic modification
      const response = await handleChatMessage({
        message: "add 100 destinations for 1 day each",
        sessionId
      });

      expect(response.success).toBe(false);
      expect(response.response.content.toLowerCase()).toMatch(/realistic|manage|specific/);

      clearConversationState(sessionId);
    });
  });

  describe('Performance in Modification Flows', () => {
    it('should handle rapid successive modifications efficiently', async () => {
      const sessionId = createTestSession();

      // Create base itinerary
      await handleChatMessage({
        message: "1 week in London",
        sessionId
      });

      const modifications = [
        "add Paris",
        "make Paris 3 days",
        "change London to 5 days", 
        "add Rome for 2 days",
        "make the whole trip more cultural"
      ];

      let totalTime = 0;

      for (const modification of modifications) {
        const start = Date.now();
        const response = await handleChatMessage({
          message: modification,
          sessionId
        });
        const duration = Date.now() - start;

        totalTime += duration;

        expect(response.success).toBe(true);
        expect(duration).toBeLessThan(3000);
      }

      const averageTime = totalTime / modifications.length;
      expect(averageTime).toBeLessThan(2000);

      clearConversationState(sessionId);
    });
  });
});