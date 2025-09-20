/**
 * Test why only 1 day is generated instead of 7
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { TripGenerator } from '../src/services/ai/trip-generator';

async function testDaysGeneration() {
  console.log('🔍 Testing Days Generation Issue');
  console.log('=================================\n');

  const generator = new TripGenerator();

  const params = {
    destination: 'Madrid',
    startDate: '2025-09-22',
    duration: 7,
    travelers: { adults: 1, children: 0 }
  };

  console.log('Input params:', JSON.stringify(params, null, 2));
  console.log('\nGenerating 7-day itinerary...');

  const itinerary = await generator.generateItinerary(params);

  console.log('\nResults:');
  console.log('- Days requested:', params.duration);
  console.log('- Days generated:', itinerary.itinerary?.length || 0);
  console.log('- Destination:', itinerary.destination);

  if (itinerary.itinerary) {
    console.log('\nDay titles:');
    itinerary.itinerary.forEach((day, idx) => {
      const activities = day.activities?.length || 0;
      console.log(`  Day ${idx + 1}: ${day.theme || day.title || 'Untitled'} (${activities} activities)`);
    });
  }

  if (itinerary.itinerary?.length !== params.duration) {
    console.log('\n❌ ERROR: Generated days mismatch!');
    console.log('This is likely a GPT-3.5-turbo issue with following the prompt format.');
  } else {
    console.log('\n✅ Correct number of days generated');
  }
}

testDaysGeneration().catch(console.error);