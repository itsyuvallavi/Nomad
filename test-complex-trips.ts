// Test 5 complex trips with AI-only parser
import { generatePersonalizedItinerary } from './src/ai/flows/generate-personalized-itinerary';

console.log('🧪 Testing 5 Complex Trips with AI-Only Parser\n');
console.log('=' .repeat(60));

const complexTrips = [
  {
    name: "Multi-city European Adventure with Dates",
    prompt: "I want to explore Europe next summer, starting June 15th. Spend 4 days in Amsterdam, then 5 days in Brussels, followed by a week in Prague, and finish with 3 days in Vienna before flying home to San Francisco."
  },
  {
    name: "Asia Pacific Island Hopping",
    prompt: "Plan a 3-week trip from Sydney starting next month. First week split between Bali and Lombok, then 5 days in the Philippines visiting Manila and Boracay, followed by 4 days in Singapore, and ending with 5 days between Kuala Lumpur and Penang."
  },
  {
    name: "South America Cultural Journey",
    prompt: "Departing from Miami in January for 25 days. Want to spend a week exploring Peru including Machu Picchu and Lima, then 6 days in Bolivia for the salt flats, after that 5 days in Chile focusing on Santiago and Valparaiso, and finish with a week in Argentina split between Buenos Aires and Mendoza wine country."
  },
  {
    name: "Scandinavia and Baltics Combo",
    prompt: "Two and a half weeks starting from London next spring. Begin with 3 days in Copenhagen, ferry to Stockholm for 4 days, then Helsinki for 3 days, followed by Tallinn for 2 days, Riga for 2 days, and end with 4 days in Oslo before returning."
  },
  {
    name: "Middle East and North Africa Mix",
    prompt: "I'm planning a month-long adventure from New York in November. Start with 5 days in Istanbul, then 4 days in Jordan for Petra and Amman, followed by a week in Egypt covering Cairo and Luxor, then 5 days in Morocco between Marrakech and Fez, 4 days in Dubai, and finish with 5 days exploring Oman."
  }
];

async function testComplexTrips() {
  for (let i = 0; i < complexTrips.length; i++) {
    const trip = complexTrips[i];
    console.log(`\n🌍 Test ${i + 1}: ${trip.name}`);
    console.log('-'.repeat(50));
    console.log(`📝 Input: "${trip.prompt}"`);
    
    try {
      const startTime = Date.now();
      const result = await generatePersonalizedItinerary({
        prompt: trip.prompt
      });
      const duration = Date.now() - startTime;
      
      if (result.validationError || result.needsMoreInfo) {
        console.log(`❌ FAILED: ${result.errorMessage || 'Unknown error'}`);
      } else {
        console.log(`✅ SUCCESS in ${(duration/1000).toFixed(1)}s`);
        console.log(`📍 Destination: ${result.destination}`);
        console.log(`📅 Title: ${result.title}`);
        console.log(`🗓️ Days: ${result.itinerary?.length || 0}`);
        console.log(`🎯 Activities: ${result.itinerary?.reduce((sum, day) => sum + (day.activities?.length || 0), 0) || 0}`);
        
        // Show first and last day as sample
        if (result.itinerary && result.itinerary.length > 0) {
          const firstDay = result.itinerary[0];
          const lastDay = result.itinerary[result.itinerary.length - 1];
          console.log(`   Day 1: ${firstDay.title} - ${firstDay.activities?.length || 0} activities`);
          console.log(`   Day ${result.itinerary.length}: ${lastDay.title} - ${lastDay.activities?.length || 0} activities`);
        }
      }
    } catch (error: any) {
      console.log(`❌ EXCEPTION: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All complex trip tests completed\n');
}

testComplexTrips().catch(console.error);