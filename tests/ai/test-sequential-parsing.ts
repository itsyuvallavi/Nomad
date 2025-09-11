// Test sequential destination parsing
import { parseDestinations } from './src/ai/utils/destination-parser';

console.log('Testing sequential destination parsing...\n');

const testCases = [
  "I'd like to visit Korea Next month, i want to spend one week in Seoul, then i want to visit Tokyo for a week",
  "5 days in Paris, then 3 days in Rome",
  "One week in London, after that spend 4 days in Amsterdam",
  "3 days in Barcelona, then visit Madrid for 2 days, followed by Lisbon for 3 days",
  "Starting from NYC for 2 weeks in Tokyo, then Kyoto for 5 days",
];

testCases.forEach((input, i) => {
  console.log(`\nTest ${i + 1}: "${input}"`);
  const result = parseDestinations(input);
  console.log('Destinations found:', result.destinations.length);
  result.destinations.forEach(dest => {
    console.log(`  - ${dest.name}: ${dest.days} days`);
  });
  console.log('Total days:', result.totalDays);
  console.log('Origin:', result.origin || 'Not specified');
});