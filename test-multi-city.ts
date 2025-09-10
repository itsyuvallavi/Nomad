import { generatePersonalizedItinerary } from './src/ai/flows/generate-personalized-itinerary';

async function testMultiCity() {
  const prompt = "please create a trip to NYC from LA for 5 days, then london for 7 days, then brussels for 5 days. then fly back to LA";
  
  console.log('Testing multi-city prompt:');
  console.log(prompt);
  console.log('\nExpected: NYC (5 days), London (7 days), Brussels (5 days) - Total 17 days');
  console.log('Origin: LA\n');
  
  const result = await generatePersonalizedItinerary({ prompt });
  
  console.log('Result:');
  console.log('- Destination:', result.destination);
  console.log('- Total days:', result.itinerary?.length || 0);
  console.log('- Title:', result.title);
  
  if (result.itinerary && result.itinerary.length > 0) {
    // Check which cities are in the itinerary
    const cities = new Set();
    result.itinerary.forEach(day => {
      if (day._destination) {
        cities.add(day._destination);
      }
    });
    console.log('- Cities covered:', Array.from(cities).join(', '));
  }
}

testMultiCity().catch(console.error);