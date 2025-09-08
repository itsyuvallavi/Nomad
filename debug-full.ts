import { parseDestinations } from './src/ai/utils/destination-parser';

// Monkey-patch console.log to see all logs
const input = "3 days in London";
console.log("\n=== Testing: ", input, " ===\n");

const result = parseDestinations(input);

console.log("\n=== Final Result ===");
console.log("Destinations:", result.destinations);
result.destinations.forEach(d => {
  console.log(`  - Name: "${d.name}"`);
  console.log(`    Duration: ${d.duration} days`);
  console.log(`    DurationText: "${d.durationText}"`);
});
