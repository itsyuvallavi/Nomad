import 'dotenv/config';
import { generatePersonalizedItinerary } from './src/ai/flows/generate-personalized-itinerary';

async function testSimpleTrip() {
  // Let's simplify the trip to test if the system works at all
  const prompt = "I want to travel from Melbourne to London for 5 days in January, then visit Paris for 3 days before returning to Melbourne.";
  
  console.log('Testing simpler multi-city trip...');
  console.log('Prompt:', prompt);
  
  try {
    const result = await generatePersonalizedItinerary({
      prompt,
      attachedFile: undefined,
      conversationHistory: undefined
    });
    
    console.log('\n✅ Success!');
    console.log('Title:', result.title);
    console.log('Duration:', result.tripDuration);
    console.log('Destinations:', result.destination);
    console.log('Days generated:', result.itinerary.length);
    console.log('Origin:', result.origin);
    console.log('\nItinerary summary:');
    result.itinerary.forEach((day: any) => {
      console.log(`Day ${day.day}: ${day.destination_city || result.destination} - ${day.title || day.theme}`);
    });
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('timeout')) {
      console.error('The request timed out. This usually means the AI is taking too long to process.');
    }
  }
}

testSimpleTrip();