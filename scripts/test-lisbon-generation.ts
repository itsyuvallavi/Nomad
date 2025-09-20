/**
 * Test actual Lisbon generation
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { AIController } from '../src/services/ai/ai-controller';
import { TripGenerator } from '../src/services/ai/trip-generator';

async function testLisbonGeneration() {
  console.log('🇵🇹 Testing Lisbon Generation');
  console.log('==============================\n');

  // Step 1: Extract intent
  const controller = new AIController();
  const prompt = 'plan a trip to lisbon for 5 days starting monday';

  console.log('Prompt:', prompt);
  const intent = await controller.extractIntent(prompt);
  console.log('\nExtracted intent:', JSON.stringify(intent, null, 2));

  if (!intent.destination || !intent.duration) {
    console.log('❌ Failed to extract required info');
    return;
  }

  // Step 2: Generate itinerary
  const generator = new TripGenerator();
  const params = {
    destination: intent.destination,
    startDate: intent.startDate || '2025-09-22',
    duration: intent.duration,
    travelers: { adults: 1, children: 0 }
  };

  console.log('\nGenerating with params:', JSON.stringify(params, null, 2));
  console.time('Generation time');

  const itinerary = await generator.generateItinerary(params);

  console.timeEnd('Generation time');

  // Analyze results
  console.log('\n📊 Results Analysis:');
  console.log('- Destination:', itinerary.destination);
  console.log('- Days generated:', itinerary.itinerary?.length || 0);
  console.log('- Start date:', itinerary.itinerary?.[0]?.date);

  // Check date
  if (itinerary.itinerary?.[0]?.date) {
    const startDate = new Date(itinerary.itinerary[0].date);
    console.log('- Start day:', startDate.toLocaleDateString('en-US', { weekday: 'long' }));
  }

  // Count activities
  let totalActivities = 0;
  let enrichedActivities = 0;

  console.log('\nDay-by-day breakdown:');
  itinerary.itinerary?.forEach((day, idx) => {
    const activities = day.activities || [];
    const enriched = activities.filter(a => a.venue_name).length;
    totalActivities += activities.length;
    enrichedActivities += enriched;

    console.log(`Day ${idx + 1} (${day.date}): ${day.theme || day.title}`);
    console.log(`  - Activities: ${activities.length}`);

    // Show first 2 activities
    activities.slice(0, 2).forEach(act => {
      console.log(`    • ${act.time}: ${act.description}`);
      if (act.venue_name) {
        console.log(`      📍 ${act.venue_name}`);
      } else {
        console.log(`      ❌ No venue (${act.address || 'No address'})`);
      }
    });
  });

  console.log('\n❌ ISSUES FOUND:');
  if (itinerary.itinerary?.length !== params.duration) {
    console.log(`- Only ${itinerary.itinerary?.length} days instead of ${params.duration}`);
  }
  if (totalActivities < itinerary.itinerary?.length * 5) {
    console.log(`- Only ${totalActivities} total activities (expected ${itinerary.itinerary?.length * 5}+)`);
  }
  if (enrichedActivities < totalActivities * 0.8) {
    console.log(`- Only ${enrichedActivities}/${totalActivities} activities enriched with venues`);
  }
}

testLisbonGeneration().catch(console.error);