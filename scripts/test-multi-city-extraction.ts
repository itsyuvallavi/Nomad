#!/usr/bin/env npx tsx

import { extractMultiCityIntent } from '../src/services/ai/multi-city-fix';

const testMessages = [
  'make a 2-weeks trip, one week in london, second week in paris. starting october 2nd',
  '2 weeks trip to London and Paris, one week in each city',
  '14 days: 7 days in London, 7 days in Paris'
];

console.log('Testing Multi-City Extraction:\n');

for (const msg of testMessages) {
  console.log(`Input: "${msg}"`);
  const result = extractMultiCityIntent(msg);
  console.log(`  Destinations: ${result.destinations.join(', ')}`);
  console.log(`  Days per city: ${JSON.stringify(result.daysPerCity)}`);
  console.log(`  Total duration: ${result.totalDuration} days`);
  console.log('');
}