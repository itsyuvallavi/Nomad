/**
 * Test Madrid generation with all fixes locally
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { AIController } from '../src/services/ai/ai-controller';
import { TripGenerator } from '../src/services/ai/trip-generator';

async function testMadridFix() {
  console.log('🇪🇸 Testing Madrid Generation with Fixes');
  console.log('=========================================\n');

  // Step 1: Extract intent
  const controller = new AIController();
  const prompt = 'plan a trip to Madrid for 7 days starting September 25th';

  console.log('Prompt:', prompt);
  const intent = await controller.extractIntent(prompt);
  console.log('Extracted:', JSON.stringify(intent, null, 2));

  if (!intent.destination || !intent.duration || !intent.startDate) {
    console.log('❌ Failed to extract');
    return;
  }

  // Verify date
  const extractedDate = new Date(intent.startDate);
  console.log('\n✅ Start date extracted:', extractedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }));

  // Step 2: Generate
  const generator = new TripGenerator();
  const params = {
    destination: intent.destination,
    startDate: intent.startDate,
    duration: intent.duration,
    travelers: { adults: 1, children: 0 }
  };

  console.log('\nGenerating itinerary...');
  const itinerary = await generator.generateItinerary(params);

  // Check results
  console.log('\n📊 RESULTS:');
  console.log('- Days generated:', itinerary.itinerary?.length);

  const firstDay = itinerary.itinerary?.[0];
  if (firstDay) {
    const firstDate = new Date(firstDay.date);
    console.log('- First day date:', firstDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    }));

    console.log('- Activities on Day 1:', firstDay.activities?.length);

    // Check venues
    const activities = firstDay.activities || [];
    const madridVenues = activities.filter(a =>
      a.address?.toLowerCase().includes('madrid') ||
      a.address?.toLowerCase().includes('españa')
    ).length;

    console.log(`- Madrid venues: ${madridVenues}/${activities.length}`);

    // Show first 3 activities
    console.log('\nFirst 3 activities:');
    activities.slice(0, 3).forEach(act => {
      console.log(`  ${act.time}: ${act.description}`);
      console.log(`    📍 ${act.venue_name || 'No venue'}`);
      console.log(`    📮 ${act.address || 'No address'}`);

      // Flag if wrong country
      if (act.address?.includes('Colombia') ||
          act.address?.includes('België') ||
          act.address?.includes('Србија')) {
        console.log(`    ❌ WRONG COUNTRY!`);
      }
    });
  }

  // Summary
  console.log('\n✅ CHECKS:');
  console.log('- Correct start date (Sept 25)?', firstDay?.date === '2025-09-25' ? '✅' : '❌');
  console.log('- Full 7 days?', itinerary.itinerary?.length === 7 ? '✅' : '❌');

  const totalActivities = itinerary.itinerary?.reduce((sum, day) =>
    sum + (day.activities?.length || 0), 0) || 0;
  console.log('- Enough activities?', totalActivities >= 35 ? '✅' : `❌ (only ${totalActivities})`);
}

testMadridFix().catch(console.error);