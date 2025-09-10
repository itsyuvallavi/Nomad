import { parseDestinations } from './src/ai/utils/destination-parser';

const prompt = "plan a trip to Zimbabwe from Melbourne on January next year, after Zimbabwe i want to visit Nicaragua for a week, then spend a week in Madagascar, then a week in Ethiopia and finally before going back home to LA, i want to visit Denmark for 3 days.";

console.log('Testing parser with complex trip...\n');
console.log('Input:', prompt);
console.log('\n---RESULT---\n');

const result = parseDestinations(prompt);
console.log(JSON.stringify(result, null, 2));

console.log('\n---EXPECTED---');
console.log('Origin: Melbourne');
console.log('Destinations: Zimbabwe, Nicaragua (7 days), Madagascar (7 days), Ethiopia (7 days), Denmark (3 days)');
console.log('Return to: LA');
console.log('Total days: Should be around 31 days');