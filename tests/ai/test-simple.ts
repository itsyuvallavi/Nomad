// Test complex multi-destination trip with AI parser
import { generatePersonalizedItinerary } from './src/ai/flows/generate-personalized-itinerary';

async function testComplex() {
  const complexPrompt = "I'm leaving from San Francisco next month for a 3-week adventure. Start with 5 days exploring Tokyo and Mount Fuji, then take the train to Kyoto for 4 days to see the temples. After that, fly to Seoul for 3 days of K-pop and street food, then 4 days split between Bangkok's markets and Phuket's beaches. End with 5 days in Singapore and Kuala Lumpur before heading home.";
  
  console.log('🧪 Testing complex multi-destination trip');
  console.log('📝 Prompt:', complexPrompt);
  console.log('-'.repeat(60));
  
  const startTime = Date.now();
  
  try {
    const result = await generatePersonalizedItinerary({
      prompt: complexPrompt
    });
    
    const duration = Date.now() - startTime;
    
    if (result.validationError) {
      console.log('❌ Validation error:', result.errorMessage);
    } else {
      console.log(`✅ SUCCESS in ${(duration/1000).toFixed(1)}s`);
      console.log('📍 Destination:', result.destination);
      console.log('📅 Title:', result.title);
      console.log('🗓️ Total Days:', result.itinerary?.length);
      console.log('🎯 Total Activities:', result.itinerary?.reduce((sum, day) => sum + (day.activities?.length || 0), 0));
      
      // Show breakdown by destination
      if (result.itinerary && result.itinerary.length > 0) {
        console.log('\n📊 Itinerary Breakdown:');
        const destinations = new Map<string, number>();
        result.itinerary.forEach(day => {
          const dest = (day as any)._destination || result.destination;
          destinations.set(dest, (destinations.get(dest) || 0) + 1);
        });
        destinations.forEach((days, dest) => {
          console.log(`   - ${dest}: ${days} days`);
        });
        
        // Show sample days
        console.log('\n📋 Sample Days:');
        console.log(`   Day 1: ${result.itinerary[0].title}`);
        if (result.itinerary.length > 10) {
          console.log(`   Day 10: ${result.itinerary[9].title}`);
        }
        console.log(`   Day ${result.itinerary.length}: ${result.itinerary[result.itinerary.length - 1].title}`);
      }
    }
  } catch (error: any) {
    console.log('❌ ERROR:', error.message);
    console.log('Stack:', error.stack);
  }
  
  console.log('\n' + '='.repeat(60));
}

testComplex();