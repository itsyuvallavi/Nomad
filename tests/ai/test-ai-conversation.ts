#!/usr/bin/env tsx

/**
 * Comprehensive AI Conversation Test
 * Tests the full AI-powered conversation flow
 */

import { config } from 'dotenv';
import { generatePersonalizedItineraryV2 } from '@/services/ai/flows/generate-personalized-itinerary-v2';

// Load environment variables
config({ path: '.env.local' });

interface TestCase {
  name: string;
  input: string;
  expectedBehavior: string;
}

const testCases: TestCase[] = [
  {
    name: "Vague Travel Request",
    input: "I want to travel",
    expectedBehavior: "Should ask for destination"
  },
  {
    name: "Plan Trip to City",
    input: "plan a trip to lisbon",
    expectedBehavior: "Should extract 'lisbon' and ask for dates"
  },
  {
    name: "Just City Name",
    input: "Barcelona",
    expectedBehavior: "Should recognize as destination and ask for dates"
  },
  {
    name: "Complete Info",
    input: "5 days in Rome next month",
    expectedBehavior: "Should extract all info and ask for confirmation or generate"
  },
  {
    name: "Business Context",
    input: "I need to visit Tokyo for a conference next week, staying 4 days",
    expectedBehavior: "Should understand business context and duration"
  },
  {
    name: "Multiple Cities",
    input: "I want to visit Paris and London",
    expectedBehavior: "Should handle multiple destinations"
  }
];

async function runTest(testCase: TestCase) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📝 TEST: ${testCase.name}`);
  console.log(`INPUT: "${testCase.input}"`);
  console.log(`EXPECTED: ${testCase.expectedBehavior}`);
  console.log(`${'='.repeat(60)}`);

  try {
    const startTime = Date.now();

    const response = await generatePersonalizedItineraryV2({
      prompt: testCase.input,
      sessionId: `test-${Date.now()}`
    });

    const duration = Date.now() - startTime;

    console.log('\n📊 RESPONSE DETAILS:');
    console.log(`Type: ${response.type}`);
    console.log(`Time: ${duration}ms`);

    if (response.message) {
      console.log(`\n💬 AI MESSAGE:`);
      console.log(response.message);
    }

    if (response.awaitingInput) {
      console.log(`\n⏳ WAITING FOR: ${response.awaitingInput}`);
    }

    if (response.itinerary) {
      console.log('\n✅ ITINERARY GENERATED:');
      console.log(`Destination: ${response.itinerary.destination}`);
      console.log(`Days: ${response.itinerary.itinerary?.length}`);
      console.log(`Has LocationIQ data: ${response.itinerary.itinerary?.[0]?.coordinates ? 'Yes' : 'No'}`);
      console.log(`Has Weather data: ${response.itinerary.itinerary?.[0]?.weather ? 'Yes' : 'No'}`);
    }

    // Test conversation continuation
    if (response.conversationContext && response.awaitingInput) {
      console.log('\n🔄 TESTING CONVERSATION CONTINUATION...');

      let nextInput = '';
      switch (response.awaitingInput) {
        case 'destination':
          nextInput = 'Barcelona';
          break;
        case 'dates':
          nextInput = 'next week';
          break;
        case 'duration':
          nextInput = '4 days';
          break;
        case 'confirmation':
          nextInput = 'yes';
          break;
        default:
          nextInput = 'skip';
      }

      console.log(`Providing: "${nextInput}"`);

      const followUp = await generatePersonalizedItineraryV2({
        prompt: nextInput,
        conversationHistory: response.conversationContext,
        sessionId: `test-${Date.now()}`
      });

      console.log(`\nFollow-up response type: ${followUp.type}`);
      if (followUp.message) {
        console.log(`Follow-up message: ${followUp.message.substring(0, 100)}...`);
      }
    }

    return { success: true, response };
  } catch (error: any) {
    console.error(`\n❌ ERROR: ${error.message}`);
    console.error('Stack:', error.stack);
    return { success: false, error };
  }
}

async function runAllTests() {
  console.log('🚀 STARTING COMPREHENSIVE AI CONVERSATION TESTS');
  console.log(`Testing with OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✅ Present' : '❌ Missing'}`);
  console.log(`LocationIQ API Key: ${process.env.LOCATIONIQ_API_KEY ? '✅ Present' : '❌ Missing'}`);
  console.log(`Weather API Key: ${process.env.OPENWEATHERMAP ? '✅ Present' : '❌ Missing'}`);

  const results = {
    total: testCases.length,
    passed: 0,
    failed: 0
  };

  for (const testCase of testCases) {
    const result = await runTest(testCase);
    if (result.success) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 FINAL RESULTS:');
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log(`${'='.repeat(60)}`);
}

// Run the tests
runAllTests()
  .then(() => {
    console.log('\n✅ Test suite completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });