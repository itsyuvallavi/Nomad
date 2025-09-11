// Test AI-powered destination parser
import { parseWithAI } from './src/ai/utils/ai-destination-parser';

console.log('Testing AI-powered destination parser...\n');

const testCases = [
  // Sequential destinations
  "I'd like to visit Korea Next month, i want to spend one week in Seoul, then i want to visit Tokyo for a week",
  "5 days in Paris, then 3 days in Rome",
  "One week in London, after that spend 4 days in Amsterdam",
  
  // Complex multi-destination
  "3 days in Barcelona, then visit Madrid for 2 days, followed by Lisbon for 3 days",
  "Starting from NYC for 2 weeks in Tokyo, then Kyoto for 5 days",
  
  // Edge cases that failed before
  "4 days in days from New York", // Should recognize this as invalid
  "21 days in Peru starting from Chicago",
  "plan a trip from LA to Egypt In January for 2 weeks",
  
  // Date parsing
  "Weekend trip from Los Angeles to Paris next month",
  "Visit Japan next year in April for 10 days",
  
  // Ambiguous cases
  "I want to explore Europe for 3 weeks",
  "2 weeks across London, Paris, Rome, and Barcelona",
];

async function runTests() {
  for (let i = 0; i < testCases.length; i++) {
    const input = testCases[i];
    console.log(`\nTest ${i + 1}: "${input}"`);
    
    try {
      const result = await parseWithAI(input);
      
      if (result.error) {
        console.log('❌ ERROR:', result.error);
      } else {
        console.log('✅ Parsed successfully:');
        console.log(`  Origin: ${result.origin || 'Not specified'}`);
        console.log(`  Destinations: ${result.destinations.length}`);
        result.destinations.forEach(dest => {
          console.log(`    - ${dest.name}: ${dest.days} days`);
        });
        console.log(`  Total days: ${result.totalDays}`);
        if (result.startDate) {
          console.log(`  Start date: ${result.startDate}`);
        }
      }
    } catch (error: any) {
      console.log('❌ EXCEPTION:', error.message);
    }
  }
}

runTests().then(() => {
  console.log('\n✅ All tests completed');
}).catch(console.error);