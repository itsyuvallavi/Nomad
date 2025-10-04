#!/usr/bin/env tsx

/**
 * Quick test for itinerary generation
 */

import { AIController } from '../../src/services/ai/ai-controller';
import { TripGenerator } from '../../src/services/ai/trip-generator';

async function quickTest() {
  console.log('\n🧪 Quick Itinerary Generation Test\n');

  const apiKey = process.env.OPENAI_API_KEY;
  console.log(`🔑 API Key: ${apiKey ? 'Present' : 'Missing'} (${apiKey?.substring(0, 10)}...)`);

  if (!apiKey) {
    console.error('❌ No API key found');
    process.exit(1);
  }

  try {
    // Initialize
    const aiController = new AIController(apiKey);
    const tripGenerator = new TripGenerator(apiKey);

    // Test message
    const message = "3 days in London starting tomorrow";
    console.log(`📝 Testing: "${message}"\n`);

    // Step 1: Process message
    console.log('1️⃣ Processing message...');
    const response = await aiController.processMessage(message, undefined);

    console.log(`   Type: ${response.type}`);
    console.log(`   Can Generate: ${response.canGenerate}`);
    console.log(`   Has Intent: ${!!response.intent}`);

    if (response.intent) {
      console.log(`   Destination: ${response.intent.destination}`);
      console.log(`   Duration: ${response.intent.duration} days`);
    }

    if (response.missingFields && response.missingFields.length > 0) {
      console.log(`   Missing: ${response.missingFields.join(', ')}`);
    }

    // Step 2: Generate if ready
    if (response.canGenerate && response.intent) {
      console.log('\n2️⃣ Generating itinerary...');

      const params = aiController.getTripParameters(response.intent);
      const result = await tripGenerator.generateProgressive({
        destinations: [params.destination],
        duration: params.duration,
        startDate: params.startDate,
        preferences: params.preferences
      });

      const itinerary = result.itinerary;

      console.log(`   ✅ Generated!`);
      console.log(`   Days: ${itinerary.dailyItineraries?.length || 0}`);

      if (itinerary.dailyItineraries && itinerary.dailyItineraries.length > 0) {
        const totalActivities = itinerary.dailyItineraries.reduce(
          (sum, day) => sum + (day.activities?.length || 0),
          0
        );
        console.log(`   Activities: ${totalActivities}`);

        console.log('\n✅ TEST PASSED!');
        process.exit(0);
      } else {
        console.log('\n❌ TEST FAILED: No days generated');
        process.exit(1);
      }
    } else {
      console.log(`\n⚠️ Cannot generate: ${response.message}`);
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

quickTest();