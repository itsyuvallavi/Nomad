import 'dotenv/config';
import { generatePersonalizedItinerary } from './src/ai/flows/generate-personalized-itinerary';

async function testFullUIFlow() {
  console.log('Testing FULL UI flow with parser fix...\n');
  
  const testPrompt = "Plan one week in London from LA for one person in mid next month";
  
  console.log('Prompt:', testPrompt);
  console.log('Starting generation...\n');
  
  const startTime = Date.now();
  
  try {
    const result = await generatePersonalizedItinerary({
      prompt: testPrompt,
      attachedFile: undefined,
      conversationHistory: undefined
    });
    
    const elapsed = Date.now() - startTime;
    
    console.log('✅ Generation successful!');
    console.log('Time taken:', (elapsed / 1000).toFixed(1), 'seconds');
    console.log('Destination:', result.destination);
    console.log('Title:', result.title);
    console.log('Days:', result.itinerary.length);
    console.log('Activities on Day 1:', result.itinerary[0]?.activities?.length || 0);
    
    // Check for diversity
    const addresses = new Set();
    result.itinerary.forEach(day => {
      day.activities.forEach(activity => {
        if (activity.address) {
          addresses.add(activity.address);
        }
      });
    });
    console.log('Unique addresses:', addresses.size);
    
    console.log('\n🎉 UI should now work correctly!');
    
  } catch (error: any) {
    console.error('❌ Generation failed:');
    console.error('Error:', error.message);
  }
}

testFullUIFlow();
