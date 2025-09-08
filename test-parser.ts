#!/usr/bin/env tsx

import { parseDestinations } from './src/ai/utils/destination-parser';

const testCases = [
  "Starting from Boston for 2 weeks across London, Paris, Rome, and Barcelona",
  "Leaving from Chicago for 30 days visiting London, Paris, Rome, Barcelona, and Amsterdam",
  "From Miami for 3 weeks in London, Paris, Rome, Barcelona, Amsterdam, and Berlin",
  "From Seattle for 35 days exploring Europe",
];

console.log('\n🧪 Testing Enhanced Parser\n');

testCases.forEach((input, index) => {
  console.log(`Test ${index + 1}: "${input}"`);
  const result = parseDestinations(input);
  console.log('Origin:', result.origin || 'NOT FOUND');
  console.log('Destinations:', result.destinations.length);
  result.destinations.forEach(dest => {
    console.log(`  - ${dest.name}: ${dest.days} days`);
  });
  console.log('Total Days:', result.totalDays);
  console.log('---\n');
});
