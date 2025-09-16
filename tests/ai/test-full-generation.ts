#!/usr/bin/env tsx

/**
 * Test Full Itinerary Generation
 * Tests if the system can generate a complete itinerary with all features
 */

import { config } from 'dotenv';
import { generatePersonalizedItineraryV2 } from '@/services/ai/flows/generate-personalized-itinerary-v2';

// Load environment variables
config({ path: '.env.local' });

async function testFullGeneration() {
  console.log('🚀 Testing Full Itinerary Generation\n');

  let conversationContext: string | undefined;
  const sessionId = `test-full-${Date.now()}`;

  // Step 1: Start with complete info
  console.log('STEP 1: Providing complete travel information');
  console.log('User: "I want to plan a 3 day trip to Barcelona next week for 2 people"\n');

  const response1 = await generatePersonalizedItineraryV2({
    prompt: "I want to plan a 3 day trip to Barcelona next week for 2 people",
    sessionId
  });

  console.log(`Response Type: ${response1.type}`);
  console.log(`Message: ${response1.message?.substring(0, 200)}...`);

  if (response1.itinerary) {
    console.log('\n✅ ITINERARY GENERATED IMMEDIATELY!');
    console.log(`Destination: ${response1.itinerary.destination}`);
    console.log(`Title: ${response1.itinerary.title}`);
    console.log(`Days: ${response1.itinerary.itinerary?.length}`);

    // Check for enrichments
    const firstDay = response1.itinerary.itinerary?.[0];
    console.log('\n📍 Data Enrichments:');
    console.log(`Has Coordinates: ${firstDay?.coordinates ? 'Yes' : 'No'}`);
    console.log(`Has Weather: ${firstDay?.weather ? 'Yes' : 'No'}`);

    if (firstDay?.activities?.length > 0) {
      console.log(`\nFirst Activity: ${firstDay.activities[0].description}`);
      console.log(`Address: ${firstDay.activities[0].address}`);
    }

    return;
  }

  // If not generated, continue conversation
  conversationContext = response1.conversationContext;

  if (response1.type === 'confirmation') {
    console.log('\nSTEP 2: AI asking for confirmation');
    console.log('User: "yes, generate it"\n');

    const response2 = await generatePersonalizedItineraryV2({
      prompt: "yes, generate it",
      conversationHistory: conversationContext,
      sessionId
    });

    console.log(`Response Type: ${response2.type}`);

    if (response2.itinerary) {
      console.log('\n✅ ITINERARY GENERATED AFTER CONFIRMATION!');
      console.log(`Destination: ${response2.itinerary.destination}`);
      console.log(`Title: ${response2.itinerary.title}`);
      console.log(`Days: ${response2.itinerary.itinerary?.length}`);

      const firstDay = response2.itinerary.itinerary?.[0];
      console.log('\n📍 Data Enrichments:');
      console.log(`Has Coordinates: ${firstDay?.coordinates ? 'Yes' : 'No'}`);
      console.log(`Has Weather: ${firstDay?.weather ? 'Yes' : 'No'}`);

      if (firstDay?.activities?.length > 0) {
        console.log(`\nSample Activities for Day 1:`);
        firstDay.activities.slice(0, 3).forEach((act, idx) => {
          console.log(`${idx + 1}. ${act.time || 'N/A'}: ${act.description}`);
          console.log(`   📍 ${act.address}`);
        });
      }
    } else {
      console.log('⚠️ No itinerary generated after confirmation');
    }
  } else {
    console.log(`\n⚠️ Unexpected response type: ${response1.type}`);
    console.log('The AI might need more information.');
  }
}

// Run the test
testFullGeneration()
  .then(() => {
    console.log('\n✅ Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });