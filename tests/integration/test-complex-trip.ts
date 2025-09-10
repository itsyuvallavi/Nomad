import 'dotenv/config';
import { generatePersonalizedItinerary } from './src/ai/flows/generate-personalized-itinerary';

async function testComplexTrip() {
  const prompt = "plan a trip to Zimbabwe from Melbourne on January next year, after Zimbabwe i want to visit Nicaragua for a week, then spend a week in Madagascar, then a week in Ethiopia and finally before going back home to LA, i want to visit Denmark for 3 days.";
  
  console.log('Testing complex trip...');
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
    console.log('\nFirst day:', result.itinerary[0]);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testComplexTrip();