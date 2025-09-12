#!/usr/bin/env npx tsx

/**
 * Test script to verify error popup displays correctly for complex/invalid searches
 */

import { generatePersonalizedItinerary } from '../src/ai/flows/generate-personalized-itinerary';
import { logger } from '../src/lib/logger';

console.log('🧪 Testing Error Popup Scenarios\n');
console.log('=' .repeat(60));

const testCases = [
  {
    name: 'Missing Origin',
    prompt: '3 days in Tokyo',
    expectedError: 'departure city'
  },
  {
    name: 'Too Complex - Multiple Continents',
    prompt: 'Visit Paris, Tokyo, New York, Sydney, and Dubai in 2 weeks from London',
    expectedError: 'too complex'
  },
  {
    name: 'Too Long Duration',
    prompt: '3 months traveling around Asia from Los Angeles',
    expectedError: 'too complex'
  },
  {
    name: 'Unclear Destinations',
    prompt: 'I want to go somewhere warm next month',
    expectedError: 'departure city'
  },
  {
    name: 'Working Simple Case',
    prompt: '3 days in Paris from New York',
    expectedError: null // Should work
  }
];

async function runTest(testCase: typeof testCases[0]) {
  console.log(`\n📝 Test: ${testCase.name}`);
  console.log(`   Prompt: "${testCase.prompt}"`);
  console.log(`   Expected: ${testCase.expectedError ? `Error with "${testCase.expectedError}"` : 'Success'}`);
  
  try {
    const startTime = Date.now();
    const result = await generatePersonalizedItinerary({
      prompt: testCase.prompt,
      attachedFile: undefined,
      conversationHistory: undefined
    });
    
    const duration = Date.now() - startTime;
    
    if (testCase.expectedError) {
      console.log(`   ❌ FAILED: Expected error but got success`);
      console.log(`      Result: ${result.title || result.destination}`);
      return false;
    } else {
      console.log(`   ✅ SUCCESS: Generated itinerary in ${(duration/1000).toFixed(1)}s`);
      console.log(`      Title: ${result.title}`);
      console.log(`      Days: ${result.itinerary?.length || 0}`);
      return true;
    }
  } catch (error: any) {
    if (testCase.expectedError) {
      const errorMessage = error.message.toLowerCase();
      const expectedError = testCase.expectedError.toLowerCase();
      
      if (errorMessage.includes(expectedError)) {
        console.log(`   ✅ SUCCESS: Got expected error`);
        console.log(`      Error: "${error.message}"`);
        return true;
      } else {
        console.log(`   ⚠️  PARTIAL: Got error but different message`);
        console.log(`      Expected: "${testCase.expectedError}"`);
        console.log(`      Got: "${error.message}"`);
        return false;
      }
    } else {
      console.log(`   ❌ FAILED: Unexpected error`);
      console.log(`      Error: ${error.message}`);
      return false;
    }
  }
}

async function runAllTests() {
  console.log('\n🚀 Starting Error Popup Tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    const success = await runTest(testCase);
    if (success) passed++;
    else failed++;
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${passed}/${testCases.length}`);
  console.log(`   ❌ Failed: ${failed}/${testCases.length}`);
  console.log(`   Success Rate: ${((passed/testCases.length)*100).toFixed(0)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All error handling tests passed!');
    console.log('The error popup should display correctly for complex searches.');
  } else {
    console.log('\n⚠️  Some tests failed. Review the error handling logic.');
  }
}

// Run tests
runAllTests().catch(console.error);