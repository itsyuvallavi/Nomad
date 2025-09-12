import { parseDestinations } from './src/ai/utils/destination-parser';

const input = 'Plan one week in London from LA for one person in mid next month';
console.log('Testing parser fix...');
console.log('Input:', input);

const result = parseDestinations(input);
console.log('\nParsed correctly?');
console.log('- Origin:', result.origin);
console.log('- Destinations:', result.destinations.map(d => `${d.name} (${d.duration} days)`));
console.log('- Total days:', result.totalDays);
console.log('- Expected: London (7 days), total 7 days');

if (result.totalDays === 7 && result.destinations.length === 1 && result.destinations[0].name === 'London') {
  console.log('\n✅ Parser fixed!');
} else {
  console.log('\n❌ Parser still broken');
}
