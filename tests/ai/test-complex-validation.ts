#!/usr/bin/env tsx
/**
 * Test script to validate complex trip handling
 * Tests the Miami 6-city and Seattle vague destination cases
 */

import { validateTripComplexity } from '../../src/ai/utils/enhanced-generator';

const testCases = [
  {
    name: "Miami 6-city Europe tour",
    prompt: "From Miami for 3 weeks in London, Paris, Rome, Barcelona, Amsterdam, and Berlin",
    shouldPass: false,
    expectedError: "6 destinations"
  },
  {
    name: "Seattle vague Europe exploration",
    prompt: "From Seattle for 35 days exploring Europe",
    shouldPass: false,
    expectedError: "up to 30 days"  // The parser auto-expands "Europe" but 35 days exceeds limit
  },
  {
    name: "Chicago 5-city valid",
    prompt: "Leaving from Chicago for 30 days visiting London, Paris, Rome, Barcelona, and Amsterdam",
    shouldPass: true
  },
  {
    name: "Complex score valid (125 < 150)",
    prompt: "From Boston for 25 days across London, Paris, Rome, Barcelona, and Madrid",
    shouldPass: true  // 5 cities * 25 days = 125, which is under 150 threshold
  },
  {
    name: "Simple London trip",
    prompt: "Flying from New York to London for 3 days",
    shouldPass: true
  },
  {
    name: "Missing origin",
    prompt: "Visit Paris for 5 days",
    shouldPass: false,
    expectedError: "departing from"
  },
  {
    name: "Too many days",
    prompt: "From LA for 45 days in Tokyo",
    shouldPass: false,
    expectedError: "up to 30 days"
  }
];

console.log('🧪 Testing Complex Trip Validation\n');
console.log('=' .repeat(60));

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  console.log(`\nTest ${index + 1}: ${test.name}`);
  console.log(`Prompt: "${test.prompt}"`);
  
  const result = validateTripComplexity(test.prompt);
  
  if (test.shouldPass) {
    if (result.valid) {
      console.log('✅ PASSED - Trip is valid');
      passed++;
    } else {
      console.log(`❌ FAILED - Expected valid but got error: ${result.error}`);
      failed++;
    }
  } else {
    if (!result.valid) {
      if (test.expectedError && result.error?.includes(test.expectedError)) {
        console.log(`✅ PASSED - Correctly rejected with: "${result.error}"`);
        passed++;
      } else if (!test.expectedError) {
        console.log(`✅ PASSED - Correctly rejected with: "${result.error}"`);
        passed++;
      } else {
        console.log(`⚠️  PARTIAL - Rejected but different error:`);
        console.log(`   Expected: "${test.expectedError}"`);
        console.log(`   Got: "${result.error}"`);
        failed++;
      }
    } else {
      console.log(`❌ FAILED - Expected rejection but trip was marked valid`);
      failed++;
    }
  }
});

console.log('\n' + '=' .repeat(60));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

if (failed === 0) {
  console.log('🎉 All tests passed! Validation is working correctly.');
} else {
  console.log('⚠️  Some tests failed. Review the validation logic.');
  process.exit(1);
}