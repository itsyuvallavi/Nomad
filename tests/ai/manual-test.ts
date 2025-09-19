/**
 * Manual test for simplified AI system
 * Tests basic conversation flow
 */

import 'dotenv/config';
import { AIController } from '@/services/ai/ai-controller';
import { TripGenerator } from '@/services/ai/trip-generator';

async function manualTest() {
  console.log('🧪 Manual Test - Simplified AI System\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: AI Controller - Empty input
    console.log('\n📝 Test 1: Empty input should ask for destination');
    const aiController = new AIController();
    const response1 = await aiController.processMessage('I want to plan a trip');

    console.log('Response type:', response1.type);
    console.log('Message:', response1.message);
    console.log('Missing fields:', response1.missingFields);
    console.log('✅ Test 1 Complete\n');

    // Test 2: Progressive gathering
    console.log('📝 Test 2: Provide destination, should ask for dates');
    const response2 = await aiController.processMessage('Paris', response1.context);

    console.log('Response type:', response2.type);
    console.log('Message:', response2.message);
    console.log('Intent so far:', response2.intent);
    console.log('✅ Test 2 Complete\n');

    // Test 3: Complete the conversation
    console.log('📝 Test 3: Provide dates and duration');
    const response3 = await aiController.processMessage('Next week for 5 days', response2.context);

    console.log('Response type:', response3.type);
    console.log('Can generate?:', response3.canGenerate);
    console.log('Final intent:', response3.intent);
    console.log('✅ Test 3 Complete\n');

    // Test 4: Generate itinerary
    if (response3.canGenerate && response3.intent) {
      console.log('📝 Test 4: Generate Paris itinerary');
      const tripGenerator = new TripGenerator();
      const tripParams = aiController.getTripParameters(response3.intent);

      console.log('Trip params:', tripParams);

      const itinerary = await tripGenerator.generateItinerary(tripParams);

      console.log('Generated itinerary:');
      console.log('- Title:', itinerary.title);
      console.log('- Destination:', itinerary.destination);
      console.log('- Duration:', itinerary.duration, 'days');
      console.log('- Days planned:', itinerary.itinerary.length);

      // Check zone organization
      console.log('\nDay themes (zone organization):');
      itinerary.itinerary.forEach(day => {
        console.log(`  Day ${day.day}: ${day.theme}`);
        console.log(`    Activities: ${day.activities?.length || 0}`);
      });

      console.log('✅ Test 4 Complete\n');
    }

    console.log('=' .repeat(60));
    console.log('✅ All manual tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
manualTest().catch(console.error);