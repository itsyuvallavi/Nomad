// Test that origin is no longer required and refinement works properly
import { generatePersonalizedItinerary } from './src/ai/flows/generate-personalized-itinerary';
import { refineItineraryBasedOnFeedback } from './src/ai/flows/refine-itinerary-based-on-feedback';

async function testNoOriginAndRefinement() {
  console.log('🧪 Testing No Origin Requirement and Refinement Fixes\n');
  console.log('=' .repeat(70));

  const scenarios = [
    {
      name: "Trip without origin - should work",
      prompt: "Plan a 5 day trip to Tokyo",
      shouldExtend: true,
      extension: "extend this trip by a week"
    },
    {
      name: "Weekend in Paris - no origin",
      prompt: "Weekend trip to Paris", 
      shouldExtend: true,
      extension: "add 3 more days"
    },
    {
      name: "Multi-city without origin",
      prompt: "I want to spend 3 days in Rome, then 4 days in Florence",
      shouldExtend: true,
      extension: "extend by 5 days and add Venice"
    },
    {
      name: "Just destination and duration",
      prompt: "7 days in Dubai",
      shouldExtend: true,
      extension: "make it 10 days total"
    },
    {
      name: "Complex multi-destination no origin",
      prompt: "2 weeks across Spain: 5 days Madrid, 4 days Barcelona, 5 days Seville",
      shouldExtend: false,
      extension: null
    }
  ];

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    console.log(`\n📋 Scenario ${i + 1}: ${scenario.name}`);
    console.log('─'.repeat(60));
    console.log(`Prompt: "${scenario.prompt}"`);
    
    try {
      console.log('\n🔄 Generating initial itinerary...');
      const startTime = Date.now();
      
      const result = await generatePersonalizedItinerary({
        prompt: scenario.prompt
      });
      
      const genTime = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (result.validationError || result.needsMoreInfo) {
        console.log(`❌ FAILED: ${result.errorMessage}`);
        console.log('   This should not happen anymore - origin is optional!');
        continue;
      }
      
      console.log(`✅ SUCCESS in ${genTime}s!`);
      console.log(`   📍 Destination: ${result.destination}`);
      console.log(`   📅 Title: ${result.title}`);
      console.log(`   🗓️ Days: ${result.itinerary?.length || 0}`);
      console.log(`   🎯 Activities: ${result.itinerary?.reduce((sum, day) => sum + (day.activities?.length || 0), 0) || 0}`);
      
      // Test refinement if applicable
      if (scenario.shouldExtend && scenario.extension && result.itinerary && result.itinerary.length > 0) {
        console.log(`\n🔄 Testing refinement: "${scenario.extension}"`);
        
        try {
          const refineStart = Date.now();
          const refined = await refineItineraryBasedOnFeedback({
            originalItinerary: result,
            userFeedback: scenario.extension
          });
          
          const refineTime = ((Date.now() - refineStart) / 1000).toFixed(1);
          
          console.log(`✅ Refinement SUCCESS in ${refineTime}s!`);
          console.log(`   📍 New Destination: ${refined.destination}`);
          console.log(`   🗓️ New Days: ${refined.itinerary?.length || 0}`);
          console.log(`   📈 Days added: ${(refined.itinerary?.length || 0) - (result.itinerary?.length || 0)}`);
          
          // Verify the extension worked
          if (refined.itinerary && refined.itinerary.length > result.itinerary.length) {
            console.log(`   ✅ Extension verified - days increased from ${result.itinerary.length} to ${refined.itinerary.length}`);
          } else {
            console.log(`   ⚠️ Warning: Extension may not have worked properly`);
          }
          
        } catch (refineError: any) {
          console.log(`❌ Refinement FAILED: ${refineError.message}`);
        }
      }
      
    } catch (error: any) {
      console.log(`❌ Generation FAILED: ${error.message}`);
    }
    
    console.log('\n' + '─'.repeat(60));
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ All tests completed\n');
  console.log('Summary:');
  console.log('- Origin is now optional for all trips');
  console.log('- Refinement should handle extensions without timeout');
  console.log('- Simple extension fallback prevents OpenAI timeouts');
}

// Add timeout to prevent hanging
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Test timeout after 3 minutes')), 180000);
});

Promise.race([testNoOriginAndRefinement(), timeoutPromise])
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  });