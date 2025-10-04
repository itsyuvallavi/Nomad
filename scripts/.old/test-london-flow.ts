#!/usr/bin/env tsx

/**
 * Test script for "3 days in London" flow
 * Tests the core functionality of the Nomad Navigator app
 */

import { AIController } from '../../src/services/ai/ai-controller';
import { TripGenerator } from '../../src/services/ai/trip-generator';
import { logger } from '../../src/lib/monitoring/logger';

async function testLondonFlow() {
  console.log('\n🏙️ Testing "3 days in London" Flow\n');
  console.log('=' .repeat(60));

  try {
    // Initialize services
    const aiController = new AIController();
    const tripGenerator = new TripGenerator();

    // Test input
    const testPrompt = "3 days in London";
    console.log(`\n📝 Input: "${testPrompt}"`);

    // Step 1: Parse intent
    console.log('\n1️⃣ Parsing user intent...');
    const startTime = Date.now();

    const context = {
      sessionId: 'test-london-' + Date.now(),
      intent: undefined,
      currentStep: 'initial'
    };

    const parsedIntent = await aiController.parseUserIntent(testPrompt, context);
    console.log('   ✅ Intent parsed successfully');
    console.log(`   📍 Destination: ${parsedIntent.intent?.destination || 'Unknown'}`);
    console.log(`   ⏱️ Duration: ${parsedIntent.intent?.duration || 'Unknown'} days`);
    console.log(`   🎯 Intent Type: ${parsedIntent.intent?.type || 'Unknown'}`);

    // Step 2: Check if we have enough info
    console.log('\n2️⃣ Checking for missing information...');
    const missingInfo = [];

    if (!parsedIntent.intent?.destination) missingInfo.push('destination');
    if (!parsedIntent.intent?.duration) missingInfo.push('duration');
    if (!parsedIntent.intent?.startDate) {
      console.log('   ℹ️ Start date not provided (will use default)');
    }

    if (missingInfo.length > 0) {
      console.log(`   ⚠️ Missing information: ${missingInfo.join(', ')}`);
      console.log('\n❌ Test Failed: Could not parse basic trip parameters');
      process.exit(1);
    }

    console.log('   ✅ All required information available');

    // Step 3: Generate itinerary
    console.log('\n3️⃣ Generating itinerary...');
    console.log('   ⏳ This may take 10-30 seconds...');

    const generationParams = {
      destination: parsedIntent.intent?.destination || 'London',
      duration: parsedIntent.intent?.duration || 3,
      startDate: parsedIntent.intent?.startDate || new Date().toISOString().split('T')[0],
      preferences: parsedIntent.intent?.preferences || {}
    };

    const itinerary = await tripGenerator.generateItinerary(generationParams);

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   ✅ Itinerary generated in ${elapsedTime}s`);

    // Step 4: Validate results
    console.log('\n4️⃣ Validating generated itinerary...');

    const validationErrors = [];

    if (!itinerary) {
      validationErrors.push('No itinerary returned');
    } else {
      if (!itinerary.destination) validationErrors.push('Missing destination');
      if (!itinerary.duration) validationErrors.push('Missing duration');
      if (!itinerary.dailyItineraries || itinerary.dailyItineraries.length === 0) {
        validationErrors.push('No daily itineraries');
      } else {
        console.log(`   📅 Days generated: ${itinerary.dailyItineraries.length}`);

        // Check each day
        itinerary.dailyItineraries.forEach((day: any, index: number) => {
          const activities = day.activities?.length || 0;
          console.log(`   📍 Day ${index + 1}: ${activities} activities`);

          if (activities === 0) {
            validationErrors.push(`Day ${index + 1} has no activities`);
          }
        });
      }
    }

    if (validationErrors.length > 0) {
      console.log('\n⚠️ Validation issues found:');
      validationErrors.forEach(error => console.log(`   - ${error}`));
    } else {
      console.log('   ✅ All validation checks passed');
    }

    // Step 5: Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));

    if (validationErrors.length === 0) {
      console.log('\n✅ SUCCESS: "3 days in London" flow completed successfully!');
      console.log(`\n📈 Performance Metrics:`);
      console.log(`   - Total Time: ${elapsedTime}s`);
      console.log(`   - Days Generated: ${itinerary.dailyItineraries?.length || 0}`);
      console.log(`   - Total Activities: ${
        itinerary.dailyItineraries?.reduce((sum: number, day: any) =>
          sum + (day.activities?.length || 0), 0) || 0
      }`);

      // Show sample activities
      if (itinerary.dailyItineraries?.[0]?.activities?.[0]) {
        console.log(`\n📍 Sample Activity (Day 1):`);
        const activity = itinerary.dailyItineraries[0].activities[0];
        console.log(`   - Time: ${activity.time || 'N/A'}`);
        console.log(`   - Description: ${activity.description || 'N/A'}`);
        console.log(`   - Venue: ${activity.venue_name || 'N/A'}`);
      }

      process.exit(0);
    } else {
      console.log('\n❌ FAILED: Issues found during generation');
      process.exit(1);
    }

  } catch (error: any) {
    console.log('\n❌ ERROR: Test failed with exception');
    console.log(`   Message: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
    process.exit(1);
  }
}

// Run the test
testLondonFlow().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});