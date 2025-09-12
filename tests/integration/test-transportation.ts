import 'dotenv/config';
import { generateUltraFastItinerary } from './src/ai/enhanced-generator-ultra-fast';

async function testTransportation() {
  console.log('Testing multi-city trip with transportation...\n');
  
  const prompt = '5 days in Lisbon and 3 days in Porto, Portugal';
  
  console.log('Prompt:', prompt);
  console.log('Starting generation...\n');
  
  try {
    const result = await generateUltraFastItinerary(prompt);
    
    console.log('✅ Generation successful!');
    console.log('Destination:', result.destination);
    console.log('Title:', result.title);
    console.log('Total days (with transport):', result.itinerary.length);
    
    // Check for transportation day
    const transportDay = result.itinerary.find((day: any) => 
      day.title?.includes('Travel Day') || day._destination?.includes('→')
    );
    
    if (transportDay) {
      console.log('\n🚆 Transportation Day Found:');
      console.log('- Title:', transportDay.title);
      console.log('- Activities:', transportDay.activities.length);
      console.log('- Transport type:', transportDay.activities.find((a: any) => 
        a.description?.includes('Train') || a.description?.includes('Flight')
      )?.description);
    } else {
      console.log('\n❌ No transportation day found');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testTransportation();
