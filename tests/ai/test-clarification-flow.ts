// Test AI clarification flow with complex scenarios
import { generatePersonalizedItinerary } from './src/ai/flows/generate-personalized-itinerary';

async function testClarificationFlow() {
  console.log('🧪 Testing AI Clarification Flow with Complex Scenarios\n');
  console.log('=' .repeat(70));

  const scenarios = [
    {
      name: "Missing Origin - Multi-destination Europe Trip",
      initialPrompt: "I want to spend 2 weeks exploring Europe. Start with 4 days in Paris, then 3 days in Amsterdam, followed by 4 days in Rome, and finish with 3 days in Barcelona.",
      expectedQuestion: "origin",
      clarification: "I'll be flying from Chicago"
    },
    {
      name: "Missing Dates - Asia Adventure",
      initialPrompt: "Planning a trip from San Francisco. Want to visit Tokyo for 5 days, Kyoto for 3 days, then Seoul for 4 days.",
      expectedQuestion: "dates",
      clarification: "I want to travel in April next year"
    },
    {
      name: "Vague Destination - Need Specifics",
      initialPrompt: "I want to explore Asia for 3 weeks from New York",
      expectedQuestion: "destinations",
      clarification: "I'd like to visit Thailand, Vietnam, and Singapore, spending about a week in each"
    },
    {
      name: "Missing Duration - City Break",
      initialPrompt: "Weekend trip to London from Boston",
      expectedQuestion: "none", // This should work without clarification
      clarification: null
    },
    {
      name: "Complex Multi-part Missing Info",
      initialPrompt: "I want to visit multiple cities in South America",
      expectedQuestion: "multiple",
      clarification: "Departing from Miami in February for 3 weeks. Want to see Machu Picchu in Peru, the beaches in Rio, and tango in Buenos Aires"
    }
  ];

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    console.log(`\n📋 Scenario ${i + 1}: ${scenario.name}`);
    console.log('─'.repeat(60));
    console.log(`Initial: "${scenario.initialPrompt}"`);
    
    // First attempt with initial prompt
    console.log('\n🔄 First attempt...');
    const firstResult = await generatePersonalizedItinerary({
      prompt: scenario.initialPrompt
    });
    
    if (firstResult.validationError || firstResult.needsMoreInfo) {
      console.log(`❓ AI asked for clarification: "${firstResult.errorMessage}"`);
      
      if (scenario.clarification) {
        // Build conversation history
        const conversationHistory = `user: ${scenario.initialPrompt}\nassistant: ${firstResult.errorMessage}\nuser: ${scenario.clarification}`;
        
        console.log(`\n💬 Providing clarification: "${scenario.clarification}"`);
        console.log('🔄 Second attempt with clarification...\n');
        
        const secondResult = await generatePersonalizedItinerary({
          prompt: scenario.clarification,
          conversationHistory: conversationHistory
        });
        
        if (secondResult.validationError || secondResult.needsMoreInfo) {
          console.log(`❌ Still needs info: "${secondResult.errorMessage}"`);
        } else {
          console.log(`✅ SUCCESS! Generated itinerary:`);
          console.log(`   📍 Destination: ${secondResult.destination}`);
          console.log(`   📅 Title: ${secondResult.title}`);
          console.log(`   🗓️ Days: ${secondResult.itinerary?.length || 0}`);
          console.log(`   🎯 Activities: ${secondResult.itinerary?.reduce((sum, day) => sum + (day.activities?.length || 0), 0) || 0}`);
          
          // Verify the itinerary matches what was requested
          if (secondResult.itinerary && secondResult.itinerary.length > 0) {
            console.log(`\n   📊 Verification:`);
            
            // Check if destinations match
            const destinations = new Set<string>();
            secondResult.itinerary.forEach(day => {
              const dest = (day as any)._destination || day.title?.match(/in (\w+)/)?.[1] || secondResult.destination;
              if (dest) destinations.add(dest);
            });
            
            console.log(`   - Destinations covered: ${Array.from(destinations).join(', ')}`);
            console.log(`   - First day: ${secondResult.itinerary[0].title}`);
            console.log(`   - Last day: ${secondResult.itinerary[secondResult.itinerary.length - 1].title}`);
          }
        }
      } else {
        console.log('ℹ️ No clarification needed for this test');
      }
    } else {
      // Should work without clarification
      console.log(`✅ SUCCESS without clarification!`);
      console.log(`   📍 Destination: ${firstResult.destination}`);
      console.log(`   📅 Title: ${firstResult.title}`);
      console.log(`   🗓️ Days: ${firstResult.itinerary?.length || 0}`);
      console.log(`   🎯 Activities: ${firstResult.itinerary?.reduce((sum, day) => sum + (day.activities?.length || 0), 0) || 0}`);
    }
    
    console.log('\n' + '─'.repeat(60));
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ All clarification flow tests completed\n');
}

// Add timeout to prevent hanging
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Test timeout after 2 minutes')), 120000);
});

Promise.race([testClarificationFlow(), timeoutPromise])
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  });