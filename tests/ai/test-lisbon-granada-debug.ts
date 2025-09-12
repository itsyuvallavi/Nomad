#!/usr/bin/env tsx
/**
 * Debug the Lisbon and Granada parsing issue
 */

import { EnhancedDestinationParser } from '../../src/ai/utils/enhanced-destination-parser';

const testPrompt = "Plan a 2 weeks trip in Lisbon and Granada, i want to be 10 days in lisbon and 4 in granada.";

console.log('Testing:', testPrompt);
console.log('=' .repeat(60));

const result = EnhancedDestinationParser.parse(testPrompt);

console.log('\nParsed Result:');
console.log(JSON.stringify(result, null, 2));

console.log('\n' + '=' .repeat(60));
console.log('Summary:');
console.log('Found destinations:', result.destinations.length);
result.destinations.forEach((dest, i) => {
  console.log(`  ${i+1}. ${dest.city}: ${dest.days} days`);
});
console.log('Total days:', result.totalDays);
console.log('Expected: Lisbon (10 days) + Granada (4 days) = 14 days total');

if (result.totalDays !== 14) {
  console.log('\n❌ ERROR: Total days should be 14, not', result.totalDays);
}

const hasLisbon = result.destinations.some(d => d.city === 'Lisbon' && d.days === 10);
const hasGranada = result.destinations.some(d => d.city === 'Granada' && d.days === 4);

if (!hasLisbon) {
  console.log('❌ ERROR: Missing Lisbon with 10 days');
}
if (!hasGranada) {
  console.log('❌ ERROR: Missing Granada with 4 days');
}

if (hasLisbon && hasGranada && result.totalDays === 14) {
  console.log('\n✅ SUCCESS: Parser correctly extracted both cities with proper day allocation');
}