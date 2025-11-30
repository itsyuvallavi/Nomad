#!/usr/bin/env node

/**
 * Test City Generator Refactor
 * Simple test to validate the refactored city generator works
 */

import { CityGenerator } from '../src/services/ai/progressive/city-generator';

async function testCityGenerator() {
  console.log('🧪 Testing refactored City Generator...\n');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY environment variable not set');
    process.exit(1);
  }

  try {
    const generator = new CityGenerator(apiKey);

    const params = {
      city: 'London',
      days: 3,
      startDate: '2024-02-01',
      startDayNumber: 1,
      interests: ['history', 'museums'],
      budget: 'medium'
    };

    console.log('📤 Generating 3-day London itinerary...');
    const startTime = Date.now();

    const result = await generator.generateCityItinerary(params);

    const elapsed = Date.now() - startTime;

    console.log('✅ Generation successful!');
    console.log(`   Time: ${elapsed}ms`);
    console.log(`   City: ${result.city}`);
    console.log(`   Days generated: ${result.days.length}`);
    console.log(`   Start day: ${result.startDay}`);
    console.log(`   End day: ${result.endDay}`);

    // Validate structure
    if (result.days.length !== 3) {
      throw new Error(`Expected 3 days, got ${result.days.length}`);
    }

    for (const day of result.days) {
      if (!day.activities || day.activities.length === 0) {
        throw new Error(`Day ${day.day} has no activities`);
      }
      console.log(`   Day ${day.day}: ${day.activities.length} activities`);
    }

    console.log('\n✅ All validations passed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testCityGenerator();