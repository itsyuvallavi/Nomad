#!/usr/bin/env tsx
/**
 * Comprehensive tests for Conversation State Manager
 */

import { ConversationStateManager, ConversationState, ConversationMessage, StateUpdateOptions } from '../../src/ai/services/conversation-state';
import type { GeneratePersonalizedItineraryOutput } from '../../src/ai/schemas';
import { InputClassifier } from '../../src/ai/utils/input-classifier';

// Test utilities
function createTestMessage(content: string, role: 'user' | 'assistant' = 'user'): ConversationMessage {
  const classification = role === 'user' ? InputClassifier.classify(content) : undefined;
  
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    role,
    content,
    classification,
    metadata: {
      processingTime: Math.floor(Math.random() * 1000) + 100
    }
  };
}

function createTestItinerary(destination: string, days: number): GeneratePersonalizedItineraryOutput {
  const itinerary = [];
  
  for (let day = 1; day <= days; day++) {
    itinerary.push({
      day,
      date: new Date(Date.now() + (day - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      title: `Day ${day}: Explore ${destination}`,
      _destination: destination,
      activities: [
        {
          time: "09:00 AM",
          description: `Visit main attraction in ${destination}`,
          category: "Attraction",
          address: destination,
          venue_name: `${destination} Historic Center`,
          rating: 4.5,
          _tips: "Book tickets in advance"
        }
      ]
    });
  }

  return {
    destination,
    title: `${days} Days in ${destination}`,
    itinerary,
    quickTips: ["Book accommodations in advance", "Check visa requirements"],
    _costEstimate: {
      total: days * 200,
      flights: 800,
      accommodation: days * 120,
      dailyExpenses: days * 80,
      currency: "USD",
      breakdown: []
    },
    _hotelOptions: {},
    _flightOptions: {}
  };
}

// Clear all states before tests
ConversationStateManager.shutdown();

console.log('🧪 Testing Conversation State Manager');
console.log('=' .repeat(80));

let testsPassed = 0;
let testsFailed = 0;

function runTest(testName: string, testFn: () => void): void {
  console.log(`\n${testName}`);
  try {
    testFn();
    console.log('✅ PASSED');
    testsPassed++;
  } catch (error) {
    console.log('❌ FAILED:', error instanceof Error ? error.message : String(error));
    testsFailed++;
  }
}

// Test 1: Initialize new state
runTest('Test 1: Initialize new conversation state', () => {
  const sessionId = 'test-session-1';
  const state = ConversationStateManager.initializeState(sessionId, 'test-user');
  
  if (state.sessionId !== sessionId) throw new Error('Session ID should match');
  if (state.userId !== 'test-user') throw new Error('User ID should match');
  if (state.messages.length !== 0) throw new Error('Should start with empty messages');
  if (state.context.phase !== 'initial') throw new Error('Should start in initial phase');
  if (state.context.destinations.length !== 0) throw new Error('Should start with no destinations');
  if (state.currentItinerary !== undefined) throw new Error('Should start with no itinerary');
});

// Test 2: Add messages and update state
runTest('Test 2: Add messages and update state', () => {
  const sessionId = 'test-session-2';
  const state = ConversationStateManager.initializeState(sessionId);
  
  const userMessage = createTestMessage('3 days in London from NYC');
  ConversationStateManager.updateState(sessionId, { message: userMessage });
  
  const updatedState = ConversationStateManager.getState(sessionId)!;
  
  if (updatedState.messages.length !== 1) throw new Error('Should have 1 message');
  if (updatedState.metadata.messageCount !== 1) throw new Error('Message count should be 1');
  if (updatedState.context.phase !== 'planning') throw new Error('Should be in planning phase');
  if (updatedState.context.lastIntent !== 'structured') throw new Error('Should detect structured intent');
});

// Test 3: Update with itinerary
runTest('Test 3: Update state with itinerary', () => {
  const sessionId = 'test-session-3';
  const state = ConversationStateManager.initializeState(sessionId);
  
  const itinerary = createTestItinerary('London', 3);
  ConversationStateManager.updateState(sessionId, { itinerary });
  
  const updatedState = ConversationStateManager.getState(sessionId)!;
  
  if (updatedState.currentItinerary === undefined) throw new Error('Should have current itinerary');
  if (updatedState.context.destinations.length !== 1) throw new Error('Should have 1 destination');
  if (updatedState.context.destinations[0].name !== 'London') throw new Error('Destination should be London');
  if (updatedState.context.destinations[0].days !== 3) throw new Error('Should have 3 days');
  if (updatedState.context.totalDays !== 3) throw new Error('Total days should be 3');
});

// Test 4: Context prompt generation
runTest('Test 4: Generate context prompt', () => {
  const sessionId = 'test-session-4';
  const state = ConversationStateManager.initializeState(sessionId);
  
  // Add some context
  ConversationStateManager.updateState(sessionId, {
    contextUpdates: {
      origin: 'NYC',
      destinations: [
        { name: 'London', days: 3, confirmed: true },
        { name: 'Paris', days: 2, confirmed: false }
      ],
      totalDays: 5,
      phase: 'planning'
    }
  });
  
  // Add some messages
  const messages = [
    createTestMessage('I want to visit London and Paris'),
    createTestMessage('3 days in London and 2 in Paris')
  ];
  
  for (const message of messages) {
    ConversationStateManager.updateState(sessionId, { message });
  }
  
  const updatedState = ConversationStateManager.getState(sessionId)!;
  const contextPrompt = ConversationStateManager.buildContextPrompt(updatedState);
  
  if (!contextPrompt.includes('Departing from: NYC')) throw new Error('Should include origin');
  if (!contextPrompt.includes('London (3 days) ✓')) throw new Error('Should include confirmed destination');
  if (!contextPrompt.includes('Paris (2 days)')) throw new Error('Should include unconfirmed destination');
  if (!contextPrompt.includes('Total duration: 5 days')) throw new Error('Should include total duration');
  if (!contextPrompt.includes('Conversation phase: planning')) throw new Error('Should include phase');
});

// Test 5: Conversation flow simulation
runTest('Test 5: Simulate full conversation flow', () => {
  const sessionId = 'test-session-5';
  ConversationStateManager.initializeState(sessionId);
  
  // Step 1: Initial request
  const msg1 = createTestMessage('I want to plan a trip to Europe');
  ConversationStateManager.updateState(sessionId, { message: msg1 });
  
  let state = ConversationStateManager.getState(sessionId)!;
  if (state.context.phase !== 'planning') throw new Error('Should be in planning phase');
  
  // Step 2: Add more specific request
  const msg2 = createTestMessage('3 days in London from Boston');
  ConversationStateManager.updateState(sessionId, { message: msg2 });
  
  // Step 3: Generate itinerary
  const itinerary = createTestItinerary('London', 3);
  ConversationStateManager.updateState(sessionId, { itinerary });
  
  state = ConversationStateManager.getState(sessionId)!;
  if (state.currentItinerary === undefined) throw new Error('Should have itinerary');
  if (state.context.destinations[0].name !== 'London') throw new Error('Should have London');
  
  // Step 4: Modification request
  const msg3 = createTestMessage('Add 2 more days in Paris');
  ConversationStateManager.updateState(sessionId, { message: msg3 });
  
  state = ConversationStateManager.getState(sessionId)!;
  if (state.context.phase !== 'modifying') throw new Error('Should be in modifying phase');
  if (state.context.lastIntent !== 'modification') throw new Error('Should detect modification');
});

// Test 6: Itinerary history management
runTest('Test 6: Itinerary history management', () => {
  const sessionId = 'test-session-6';
  ConversationStateManager.initializeState(sessionId);
  
  // Add multiple itineraries
  const itinerary1 = createTestItinerary('London', 3);
  const itinerary2 = createTestItinerary('Paris', 5);
  const itinerary3 = createTestItinerary('Rome', 4);
  
  ConversationStateManager.updateState(sessionId, { itinerary: itinerary1 });
  let state = ConversationStateManager.getState(sessionId)!;
  if (state.itineraryHistory.length !== 0) throw new Error('No history for first itinerary');
  
  ConversationStateManager.updateState(sessionId, { itinerary: itinerary2 });
  state = ConversationStateManager.getState(sessionId)!;
  if (state.itineraryHistory.length !== 1) throw new Error('Should have 1 in history');
  if (state.currentItinerary?.destination !== 'Paris') throw new Error('Current should be Paris');
  
  ConversationStateManager.updateState(sessionId, { itinerary: itinerary3 });
  state = ConversationStateManager.getState(sessionId)!;
  if (state.itineraryHistory.length !== 2) throw new Error('Should have 2 in history');
  if (state.currentItinerary?.destination !== 'Rome') throw new Error('Current should be Rome');
});

// Test 7: State retrieval and management
runTest('Test 7: State retrieval and management', () => {
  const sessionId = 'test-session-7';
  ConversationStateManager.initializeState(sessionId);
  
  // Should be able to retrieve immediately
  let state = ConversationStateManager.getState(sessionId);
  if (state === null) throw new Error('Should retrieve valid state');
  
  // Should get same state
  const state2 = ConversationStateManager.getOrCreateState(sessionId);
  if (state2.sessionId !== sessionId) throw new Error('Should get same state');
  
  // Test active sessions
  const activeSessions = ConversationStateManager.getActiveSessions();
  if (!activeSessions.includes(sessionId)) throw new Error('Should include session in active list');
});

// Test 8: Statistics and summary
runTest('Test 8: Statistics and conversation summary', () => {
  const sessionId = 'test-session-8';
  ConversationStateManager.initializeState(sessionId);
  
  // Add some data
  const messages = [
    createTestMessage('Plan a trip to Japan'),
    createTestMessage('5 days in Tokyo'),
    createTestMessage('Add 3 days in Kyoto')
  ];
  
  for (const message of messages) {
    ConversationStateManager.updateState(sessionId, { message });
  }
  
  const itinerary = createTestItinerary('Tokyo', 5);
  ConversationStateManager.updateState(sessionId, { itinerary });
  
  // Test summary
  const state = ConversationStateManager.getState(sessionId)!;
  const summary = ConversationStateManager.getConversationSummary(state);
  
  if (summary.messageCount !== 3) throw new Error('Should count messages correctly');
  if (summary.hasCurrentItinerary !== true) throw new Error('Should detect itinerary');
  if (!summary.destinations.includes('Tokyo')) throw new Error('Should include Tokyo');
  
  // Test stats
  const stats = ConversationStateManager.getStats();
  if (stats.activeStates < 1) throw new Error('Should have at least 1 active state');
  if (stats.totalMessages < 3) throw new Error('Should count total messages');
});

// Results
console.log('\n' + '=' .repeat(80));
console.log(`\n📊 Test Results: ${testsPassed} passed, ${testsFailed} failed out of ${testsPassed + testsFailed} tests`);

if (testsFailed === 0) {
  console.log('🎉 All tests passed! Conversation State Manager is working correctly.');
} else {
  console.log('⚠️  Some tests failed. Review the implementation.');
}

// Demo: Show example usage
console.log('\n' + '=' .repeat(80));
console.log('🔍 Example Usage Demo');

const demoSessionId = 'demo-session';
ConversationStateManager.initializeState(demoSessionId, 'demo-user');

// Simulate conversation
const demoMessages = [
  'I want to visit Europe',
  '3 days in London and 2 days in Paris',
  'Make it more romantic',
  'Add one more day in Paris'
];

console.log('\nSimulating conversation:');
for (const content of demoMessages) {
  const message = createTestMessage(content);
  ConversationStateManager.updateState(demoSessionId, { message });
  
  const state = ConversationStateManager.getState(demoSessionId)!;
  console.log(`User: "${content}"`);
  console.log(`  → Phase: ${state.context.phase}, Intent: ${state.context.lastIntent}`);
}

// Add itinerary
const demoItinerary = createTestItinerary('London', 3);
ConversationStateManager.updateState(demoSessionId, { itinerary: demoItinerary });

const finalState = ConversationStateManager.getState(demoSessionId)!;
const contextPrompt = ConversationStateManager.buildContextPrompt(finalState);

console.log('\nGenerated Context Prompt:');
console.log(contextPrompt);

const summary = ConversationStateManager.getConversationSummary(finalState);
console.log('\nConversation Summary:');
console.log(JSON.stringify(summary, null, 2));

// Cleanup
ConversationStateManager.shutdown();

process.exit(testsFailed === 0 ? 0 : 1);