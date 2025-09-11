/**
 * Test Setup for Enhanced Dialog System - Phase 5.1
 * Global setup and configuration for all dialog system tests
 */

import { jest } from '@jest/globals';

// Mock OpenAI API for testing
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
};

// Mock successful AI responses
mockOpenAI.chat.completions.create.mockImplementation(async (params: any) => {
  // Simulate AI parsing response based on input
  const message = params.messages?.[params.messages.length - 1]?.content || '';
  
  if (message.includes('Paris')) {
    return {
      choices: [{
        message: {
          content: JSON.stringify({
            destinations: [{ city: 'Paris', days: 5 }],
            origin: message.includes('NYC') ? 'NYC' : null,
            totalDays: 5,
            preferences: message.includes('romantic') ? ['romantic'] : [],
            confidence: 0.9
          })
        }
      }]
    };
  }
  
  if (message.includes('Lisbon') && message.includes('Granada')) {
    return {
      choices: [{
        message: {
          content: JSON.stringify({
            destinations: [
              { city: 'Lisbon', days: 10 },
              { city: 'Granada', days: 4 }
            ],
            origin: null,
            totalDays: 14,
            preferences: [],
            confidence: 0.85
          })
        }
      }]
    };
  }
  
  // Default response for unknown inputs
  return {
    choices: [{
      message: {
        content: JSON.stringify({
          destinations: [],
          origin: null,
          totalDays: 0,
          preferences: [],
          confidence: 0.1,
          error: 'Could not parse input'
        })
      }
    }]
  };
});

// Global test configuration
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.OPENAI_API_KEY = 'test-key';
  
  // Mock external APIs
  global.fetch = jest.fn();
  
  // Mock console methods in tests (reduce noise)
  if (!process.env.VERBOSE_TESTS) {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  }
});

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Clean up any test data
  if (global.gc) {
    global.gc();
  }
});

// Global cleanup
afterAll(async () => {
  // Restore console methods
  jest.restoreAllMocks();
  
  // Clean up any persistent test data
  // This would include clearing conversation states, etc.
});

// Extend expect with custom matchers
expect.extend({
  toHaveValidItinerary(received: any) {
    if (!received || !received.itinerary) {
      return {
        message: () => 'Expected response to have an itinerary',
        pass: false
      };
    }
    
    const itinerary = received.itinerary;
    
    if (!Array.isArray(itinerary.destinations)) {
      return {
        message: () => 'Expected itinerary to have destinations array',
        pass: false
      };
    }
    
    if (typeof itinerary.totalDays !== 'number' || itinerary.totalDays <= 0) {
      return {
        message: () => 'Expected itinerary to have valid totalDays',
        pass: false
      };
    }
    
    const calculatedDays = itinerary.destinations.reduce((sum: number, dest: any) => {
      return sum + (dest.days || 0);
    }, 0);
    
    if (calculatedDays !== itinerary.totalDays) {
      return {
        message: () => `Expected total days (${itinerary.totalDays}) to match sum of destination days (${calculatedDays})`,
        pass: false
      };
    }
    
    return {
      message: () => 'Itinerary is valid',
      pass: true
    };
  },
  
  toHaveValidConversationState(received: any) {
    if (!received || !received.conversationState) {
      return {
        message: () => 'Expected response to have conversationState',
        pass: false
      };
    }
    
    const state = received.conversationState;
    
    const requiredFields = ['sessionId', 'context', 'metadata', 'history'];
    for (const field of requiredFields) {
      if (!(field in state)) {
        return {
          message: () => `Expected conversationState to have ${field}`,
          pass: false
        };
      }
    }
    
    return {
      message: () => 'Conversation state is valid',
      pass: true
    };
  }
});

// Export mock for tests that need it
export { mockOpenAI };

// Test utilities
export const createTestItinerary = (destinations: Array<{city: string, days: number}>, origin?: string) => {
  return {
    destinations,
    totalDays: destinations.reduce((sum, dest) => sum + dest.days, 0),
    origin: origin || null
  };
};

export const createTestConversationState = (sessionId: string, overrides: any = {}) => {
  return {
    sessionId,
    context: {
      destinations: [],
      preferences: new Map(),
      constraints: [],
      origin: null,
      ...overrides.context
    },
    history: [],
    metadata: {
      startTime: new Date(),
      lastActivity: new Date(),
      messageCount: 0,
      ...overrides.metadata
    },
    ...overrides
  };
};

// Performance testing utilities
export const measurePerformance = async (fn: () => Promise<any>) => {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  
  return { result, duration };
};

// Declare global types for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveValidItinerary(): R;
      toHaveValidConversationState(): R;
    }
  }
}