#!/usr/bin/env tsx
/**
 * Comprehensive tests for Input Classifier Module
 */

import { InputClassifier, InputType } from '../../src/ai/utils/input-classifier';

interface TestCase {
  input: string;
  expectedType: InputType;
  expectedParser: 'traditional' | 'ai' | 'hybrid';
  expectedConfidence: 'high' | 'medium' | 'low';
  shouldHaveDestinations?: boolean;
  shouldHaveDates?: boolean;
  shouldRequireContext?: boolean;
  description: string;
}

const testCases: TestCase[] = [
  // Structured inputs
  {
    input: "3 days in London from NYC",
    expectedType: 'structured',
    expectedParser: 'traditional',
    expectedConfidence: 'high',
    shouldHaveDestinations: true,
    shouldHaveDates: true,
    description: "Simple structured trip request"
  },
  {
    input: "Flying from Boston to Paris for 5 days",
    expectedType: 'structured',
    expectedParser: 'traditional',
    expectedConfidence: 'high',
    shouldHaveDestinations: true,
    shouldHaveDates: true,
    description: "Structured with flight context"
  },
  {
    input: "Plan a 2 weeks trip in Lisbon and Granada, i want to be 10 days in lisbon and 4 in granada",
    expectedType: 'structured',
    expectedParser: 'hybrid', // Complex enough for hybrid
    expectedConfidence: 'medium',
    shouldHaveDestinations: true,
    shouldHaveDates: true,
    description: "Complex multi-city structured (our problem case)"
  },
  {
    input: "Weekend in Barcelona",
    expectedType: 'structured',
    expectedParser: 'traditional',
    expectedConfidence: 'high',
    shouldHaveDestinations: true,
    shouldHaveDates: true,
    description: "Simple weekend trip"
  },

  // Questions
  {
    input: "What's the weather like in Tokyo?",
    expectedType: 'question',
    expectedParser: 'ai',
    expectedConfidence: 'high',
    shouldRequireContext: true,
    description: "Information question"
  },
  {
    input: "How much will this trip cost?",
    expectedType: 'question',
    expectedParser: 'ai',
    expectedConfidence: 'high',
    shouldRequireContext: true,
    description: "Context-dependent question"
  },
  {
    input: "Is 3 days enough for Rome?",
    expectedType: 'question',
    expectedParser: 'ai',
    expectedConfidence: 'high',
    shouldHaveDestinations: true,
    shouldHaveDates: true,
    description: "Question with embedded travel info"
  },

  // Modifications
  {
    input: "Add 2 more days",
    expectedType: 'modification',
    expectedParser: 'ai',
    expectedConfidence: 'medium', // Without context
    shouldRequireContext: true,
    description: "Simple modification request"
  },
  {
    input: "Make it more romantic",
    expectedType: 'modification',
    expectedParser: 'ai',
    expectedConfidence: 'medium',
    shouldRequireContext: true,
    description: "Preference modification"
  },
  {
    input: "Change London to Paris",
    expectedType: 'modification',
    expectedParser: 'ai',
    expectedConfidence: 'medium',
    shouldHaveDestinations: true,
    shouldRequireContext: true,
    description: "Destination swap modification"
  },
  {
    input: "Actually, let's go to Rome instead",
    expectedType: 'modification',
    expectedParser: 'ai',
    expectedConfidence: 'medium',
    shouldHaveDestinations: true,
    shouldRequireContext: true,
    description: "Conversational modification"
  },

  // Conversational
  {
    input: "I want to visit somewhere warm",
    expectedType: 'conversational',
    expectedParser: 'ai',
    expectedConfidence: 'low', // No context
    description: "Vague travel desire"
  },
  {
    input: "I'm thinking about a trip to Europe",
    expectedType: 'conversational',
    expectedParser: 'ai',
    expectedConfidence: 'low',
    description: "Conversational planning"
  },
  {
    input: "That sounds perfect!",
    expectedType: 'conversational',
    expectedParser: 'ai',
    expectedConfidence: 'low', // No context
    shouldRequireContext: false,
    description: "Conversational response"
  },
  {
    input: "I prefer something more cultural",
    expectedType: 'conversational',
    expectedParser: 'ai',
    expectedConfidence: 'low',
    description: "Preference expression"
  },

  // Ambiguous
  {
    input: "Something nice",
    expectedType: 'ambiguous',
    expectedParser: 'ai',
    expectedConfidence: 'low',
    shouldRequireContext: true,
    description: "Very vague request"
  },
  {
    input: "Help",
    expectedType: 'ambiguous',
    expectedParser: 'ai',
    expectedConfidence: 'low',
    shouldRequireContext: true,
    description: "Single word request"
  },
  {
    input: "Paris maybe",
    expectedType: 'ambiguous',
    expectedParser: 'hybrid', // Has destination
    expectedConfidence: 'low',
    shouldHaveDestinations: true,
    description: "Uncertain destination"
  },

  // Edge cases
  {
    input: "",
    expectedType: 'ambiguous',
    expectedParser: 'ai',
    expectedConfidence: 'low',
    shouldRequireContext: true,
    description: "Empty input"
  },
  {
    input: "a",
    expectedType: 'ambiguous',
    expectedParser: 'ai',
    expectedConfidence: 'low',
    shouldRequireContext: true,
    description: "Single character"
  },
  {
    input: "From Seattle for 35 days exploring Europe",
    expectedType: 'structured',
    expectedParser: 'hybrid', // Complex
    expectedConfidence: 'medium',
    shouldHaveDestinations: false, // "Europe" is not a specific city
    shouldHaveDates: true,
    description: "Vague region exploration (previously failed case)"
  }
];

console.log('🧪 Testing Input Classifier Module');
console.log('=' .repeat(80));

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}: ${testCase.description}`);
  console.log(`Input: "${testCase.input}"`);
  
  const result = InputClassifier.classify(testCase.input, false);
  
  let testPassed = true;
  const errors: string[] = [];
  
  // Check type
  if (result.type !== testCase.expectedType) {
    errors.push(`Type: expected ${testCase.expectedType}, got ${result.type}`);
    testPassed = false;
  }
  
  // Check parser
  if (result.suggestedParser !== testCase.expectedParser) {
    errors.push(`Parser: expected ${testCase.expectedParser}, got ${result.suggestedParser}`);
    testPassed = false;
  }
  
  // Check confidence
  if (result.confidence !== testCase.expectedConfidence) {
    errors.push(`Confidence: expected ${testCase.expectedConfidence}, got ${result.confidence}`);
    testPassed = false;
  }
  
  // Check destinations if specified
  if (testCase.shouldHaveDestinations !== undefined) {
    if (result.hasDestinations !== testCase.shouldHaveDestinations) {
      errors.push(`Destinations: expected ${testCase.shouldHaveDestinations}, got ${result.hasDestinations}`);
      testPassed = false;
    }
  }
  
  // Check dates if specified
  if (testCase.shouldHaveDates !== undefined) {
    if (result.hasDates !== testCase.shouldHaveDates) {
      errors.push(`Dates: expected ${testCase.shouldHaveDates}, got ${result.hasDates}`);
      testPassed = false;
    }
  }
  
  // Check context requirement if specified
  if (testCase.shouldRequireContext !== undefined) {
    if (result.requiresContext !== testCase.shouldRequireContext) {
      errors.push(`Context: expected ${testCase.shouldRequireContext}, got ${result.requiresContext}`);
      testPassed = false;
    }
  }
  
  if (testPassed) {
    console.log('✅ PASSED');
    passed++;
  } else {
    console.log('❌ FAILED');
    errors.forEach(error => console.log(`   ${error}`));
    console.log(`   Actual result: ${JSON.stringify(result, null, 2)}`);
    failed++;
  }
});

console.log('\n' + '=' .repeat(80));
console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

if (failed === 0) {
  console.log('🎉 All tests passed! Input Classifier is working correctly.');
} else {
  console.log('⚠️  Some tests failed. Review the classification logic.');
}

// Additional validation with real examples
console.log('\n' + '=' .repeat(80));
console.log('🔍 Additional Validation with Real Examples');

const realExamples = [
  "Plan a 2 weeks trip in Lisbon and Granada, i want to be 10 days in lisbon and 4 in granada.",
  "From Miami for 3 weeks in London, Paris, Rome, Barcelona, Amsterdam, and Berlin",
  "From Seattle for 35 days exploring Europe",
  "make it more romantic",
  "add 2 days in Paris",
  "what's the weather like?",
  "3 days in London from New York"
];

realExamples.forEach((example, index) => {
  console.log(`\nExample ${index + 1}: "${example}"`);
  const result = InputClassifier.classify(example);
  console.log(`Result: ${result.type} → ${result.suggestedParser} (${result.confidence})`);
  
  if (result.hasDestinations || result.hasDates) {
    console.log(`Features: ${result.hasDestinations ? 'destinations' : ''}${result.hasDestinations && result.hasDates ? ', ' : ''}${result.hasDates ? 'dates' : ''}`);
  }
  
  if (result.metadata.detectedEntities.length > 0) {
    console.log(`Entities: ${result.metadata.detectedEntities.slice(0, 5).join(', ')}`);
  }
});

if (failed === 0) {
  process.exit(0);
} else {
  process.exit(1);
}