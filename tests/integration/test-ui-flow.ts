import 'dotenv/config';
import { generatePersonalizedItinerary } from './src/ai/flows/generate-personalized-itinerary';

async function testUIFlow() {
  console.log('Testing UI flow with same parameters the UI would send...\n');
  
  const testPrompt = "Plan one week in London from LA for one person in mid next month";
  
  console.log('Prompt:', testPrompt);
  console.log('Starting generation...\n');
  
  try {
    const result = await generatePersonalizedItinerary({
      prompt: testPrompt,
      attachedFile: undefined,
      conversationHistory: undefined
    });
    
    console.log('✅ Generation successful!');
    console.log('Destination:', result.destination);
    console.log('Title:', result.title);
    console.log('Days:', result.itinerary.length);
    console.log('Activities on Day 1:', result.itinerary[0]?.activities?.length || 0);
    
  } catch (error: any) {
    console.error('❌ Generation failed with error:');
    console.error('Error message:', error.message);
    console.error('Stack:', error.stack);
  }
}

testUIFlow();
