#!/usr/bin/env npx tsx

/**
 * Debug Paris generation issue
 */

import { ProgressiveGenerator } from '../src/services/ai/progressive-generator';
import { logger } from '../src/lib/monitoring/logger';

async function testDirectGeneration() {
  console.log('🧪 Testing direct progressive generation...\n');

  const generator = new ProgressiveGenerator();

  const params = {
    destinations: ['London', 'Paris'],
    duration: 14,
    startDate: '2024-10-02',
    preferences: {},
    onProgress: (update: any) => {
      console.log(`📡 Progress: ${update.type}`, {
        city: update.city,
        progress: update.progress
      });
    }
  };

  try {
    console.log('Starting generation...');
    const result = await generator.generateProgressive(params);

    console.log('\n✅ Generation complete!');
    console.log('Total cities generated:', result.updates.filter(u => u.type === 'city_complete').length);
    console.log('Cities:', result.updates.filter(u => u.type === 'city_complete').map(u => u.city));
    console.log('Total days in itinerary:', result.itinerary.itinerary.length);

    // Check each city
    const londonDays = result.itinerary.itinerary.filter(d => d.title.includes('London')).length;
    const parisDays = result.itinerary.itinerary.filter(d => d.title.includes('Paris')).length;

    console.log('\nBreakdown:');
    console.log(`  London: ${londonDays} days`);
    console.log(`  Paris: ${parisDays} days`);

  } catch (error) {
    console.error('❌ Generation failed:', error);
  }
}

testDirectGeneration().catch(console.error);