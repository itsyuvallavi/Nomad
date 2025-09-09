import { parseDestinations } from '../src/ai/utils/destination-parser';

const testPrompt = "Plan 3 weeks in Japan from Los Angeles. Visit Tokyo, Kyoto, and Osaka. I want to experience culture, food, and technology.";

console.log('Testing parser with:', testPrompt);
const result = parseDestinations(testPrompt);
console.log('\nParser result:');
console.log('Origin:', result.origin);
console.log('Destinations:', result.destinations.map(d => `${d.name} (${d.days} days)`));
console.log('Total days:', result.totalDays);
