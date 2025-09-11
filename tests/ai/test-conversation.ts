// Test AI parser with conversation history
import { parseWithAI } from './src/ai/utils/ai-destination-parser';

async function testConversationParsing() {
  console.log('🧪 Testing AI Parser with Conversation History\n');
  console.log('=' .repeat(60));

  const testCases = [
    {
      name: "Simple conversation with origin clarification",
      input: `user: I'd like to visit Korea Next month, i want to spend one week in Seoul, then i want to visit Tokyo for a week, then i want to go back home to LA
assistant: I'd love to help you plan that trip! Please tell me where you'll be departing from.
user: Depart from LA`
    },
    {
      name: "Multi-turn conversation building trip",
      input: `user: I want to visit Europe for 2 weeks
assistant: Which cities would you like to visit?
user: Paris, Rome, and Barcelona
assistant: Where will you be departing from?
user: New York`
    },
    {
      name: "Clarifying dates",
      input: `user: 5 days in London then 3 days in Amsterdam
assistant: When would you like to travel?
user: Next month, departing from Boston`
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log('-'.repeat(50));
    
    const result = await parseWithAI(testCase.input);
    
    if (result.error) {
      console.log('❌ Error:', result.error);
    } else {
      console.log('✅ Parsed successfully:');
      console.log(`   Origin: ${result.origin || 'Not specified'}`);
      console.log(`   Destinations: ${result.destinations.map(d => `${d.name} (${d.days}d)`).join(', ')}`);
      console.log(`   Total days: ${result.totalDays}`);
      if (result.startDate) {
        console.log(`   Start date: ${result.startDate}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed\n');
}

testConversationParsing();