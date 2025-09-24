#!/usr/bin/env npx tsx

/**
 * Test day count fix
 */

import 'dotenv/config';
import { ProgressiveGenerator } from '../src/services/ai/progressive-generator';

async function testDayCount() {
  console.log('🧪 Testing Day Count Fix\n');

  const gen = new ProgressiveGenerator();

  // Test Brussels generation with explicit 7 days
  console.log('📍 Testing Brussels with 7 days...');

  const result = await gen.generateCityItinerary({
    city: 'Brussels',
    days: 7,
    startDate: '2025-10-01',
    startDayNumber: 8,
    preferences: {}
  });

  console.log('✅ Result:');
  console.log(`   City: ${result.city}`);
  console.log(`   Days generated: ${result.days.length}`);
  console.log(`   Expected: 7 days`);
  console.log(`   Start day: ${result.startDay}`);
  console.log(`   End day: ${result.endDay}`);

  if (result.days.length === 7) {
    console.log('\n✅ SUCCESS: Brussels has exactly 7 days!');

    // Show day numbers
    console.log('\n📅 Day breakdown:');
    result.days.forEach(day => {
      console.log(`   Day ${day.day}: ${day.date} - ${day.activities.length} activities`);
    });
  } else {
    console.log(`\n❌ ISSUE: Brussels has ${result.days.length} days instead of 7`);
  }
}

testDayCount().catch(console.error);