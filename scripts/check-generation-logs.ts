#!/usr/bin/env npx tsx

import { ProgressiveGenerator } from '../src/services/ai/progressive-generator';

async function test() {
  const gen = new ProgressiveGenerator();

  console.log('Starting generation with logging...\n');

  const result = await gen.generateProgressive({
    destinations: ['London', 'Brussels'],
    duration: 14,
    startDate: '2025-01-30',
    onProgress: async (update: any) => {
      console.log(`PROGRESS: ${update.type}`, {
        progress: update.progress,
        city: update.city
      });
      // Simulate delay
      await new Promise(r => setTimeout(r, 100));
    }
  });

  console.log('\nComplete! Days:', result.itinerary.itinerary?.length);
}

test().catch(err => {
  console.error('Error:', err);
});