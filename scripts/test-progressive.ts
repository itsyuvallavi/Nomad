#!/usr/bin/env npx tsx

/**
 * Test progressive generation
 */

import 'dotenv/config';
import { ProgressiveGenerator } from '../src/services/ai/progressive-generator';

async function testProgressive() {
  console.log('🧪 Testing Progressive Generation\n');

  const generator = new ProgressiveGenerator();

  // Test case: 2 weeks, 1 week per city
  const params = {
    destinations: ['London', 'Brussels'],
    duration: 14,
    startDate: '2025-09-25',
    onProgress: (update: any) => {
      console.log(`📊 Progress Update:`, {
        type: update.type,
        progress: update.progress,
        city: update.city
      });
    }
  };

  try {
    console.log('📍 Trip Parameters:');
    console.log(`   Destinations: ${params.destinations.join(', ')}`);
    console.log(`   Duration: ${params.duration} days`);
    console.log(`   Start Date: ${params.startDate}\n`);

    console.log('Starting generation...\n');
    const startTime = Date.now();

    const result = await generator.generateProgressive(params);

    const totalTime = Date.now() - startTime;

    console.log('\n✅ Generation Complete!');
    console.log(`   Total Time: ${totalTime}ms`);
    console.log(`   Title: ${result.itinerary.title}`);
    console.log(`   Days Generated: ${result.itinerary.itinerary?.length || 0}`);

    // Check days per city
    const cityDays = new Map<string, number>();
    result.itinerary.itinerary?.forEach(day => {
      const cityMatch = day.title?.match(/Day \d+ - (.+)/);
      if (cityMatch) {
        const city = cityMatch[1];
        cityDays.set(city, (cityDays.get(city) || 0) + 1);
      }
    });

    console.log('\n📊 Days per City:');
    for (const [city, days] of cityDays) {
      console.log(`   ${city}: ${days} days`);
    }

    console.log('\n📝 Quick Tips:');
    result.itinerary.quickTips?.forEach(tip => {
      console.log(`   - ${tip}`);
    });

    if (result.itinerary.cost) {
      console.log(`\n💰 Estimated Cost: $${result.itinerary.cost.total} ${result.itinerary.cost.currency}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testProgressive().catch(console.error);