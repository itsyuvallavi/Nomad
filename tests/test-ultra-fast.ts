import 'dotenv/config';
import { generatePersonalizedItinerary } from '../src/ai/flows/generate-personalized-itinerary';

async function testUltraFast() {
  console.log('🚀 Testing ULTRA-FAST Itinerary Generation\n');
  console.log('=' .repeat(60) + '\n');
  
  // Test cases
  const testCases = [
    {
      name: 'Simple Trip',
      prompt: '5 days in Paris from New York'
    },
    {
      name: 'Medium Complexity',
      prompt: 'I want to visit London for 3 days and then Paris for 2 days, flying from NYC'
    },
    {
      name: 'Complex Trip',
      prompt: 'plan a trip to Zimbabwe from Melbourne on January next year, after Zimbabwe i want to visit Nicaragua for a week, then spend a week in Madagascar, then a week in Ethiopia and finally before going back home to LA, i want to visit Denmark for 3 days.'
    }
  ];
  
  for (const test of testCases) {
    console.log(`\nTest: ${test.name}`);
    console.log(`Prompt: "${test.prompt.substring(0, 60)}..."`);
    
    const startTime = Date.now();
    
    try {
      const result = await generatePersonalizedItinerary({
        prompt: test.prompt,
        attachedFile: undefined,
        conversationHistory: undefined
      });
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ SUCCESS in ${(duration / 1000).toFixed(1)}s`);
      console.log(`   - Title: ${result.title}`);
      console.log(`   - Days: ${result.itinerary.length}`);
      console.log(`   - Destinations: ${result.destination}`);
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(`❌ FAILED in ${(duration / 1000).toFixed(1)}s`);
      console.log(`   Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('Testing complete!');
}

testUltraFast();