import 'dotenv/config';
import { generatePersonalizedItinerary } from './src/ai/flows/generate-personalized-itinerary';

async function testComplexTripV2() {
  const complexPrompt = "plan a trip to Zimbabwe from Melbourne on January next year, after Zimbabwe i want to visit Nicaragua for a week, then spend a week in Madagascar, then a week in Ethiopia and finally before going back home to LA, i want to visit Denmark for 3 days.";
  
  console.log('Testing Complex Multi-Destination Trip with V2\n');
  console.log('Prompt:', complexPrompt);
  console.log('\n' + '='.repeat(80) + '\n');
  
  const startTime = Date.now();
  
  try {
    const result = await generatePersonalizedItinerary({
      prompt: complexPrompt,
      attachedFile: undefined,
      conversationHistory: undefined
    });
    
    const duration = Date.now() - startTime;
    
    console.log('✅ SUCCESS! Generated in', (duration / 1000).toFixed(1), 'seconds\n');
    console.log('Trip Details:');
    console.log('- Title:', result.title);
    console.log('- Origin:', (result as any).origin || 'Not specified');
    console.log('- Destinations:', result.destination);
    console.log('- Duration:', (result as any).tripDuration || `${result.itinerary.length} days`);
    console.log('- Total Days:', result.itinerary.length);
    console.log('- Start Date:', (result as any).startDate || 'Not specified');
    console.log('- End Date:', (result as any).endDate || 'Not specified');
    
    console.log('\nItinerary Breakdown:');
    const cityCounts = new Map<string, number>();
    result.itinerary.forEach((day: any) => {
      const city = (day as any).destination_city || result.destination;
      cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
    });
    
    Array.from(cityCounts.entries()).forEach(([city, days]) => {
      console.log(`- ${city}: ${days} days`);
    });
    
    console.log('\nFirst Day Sample:');
    const firstDay = result.itinerary[0];
    console.log(`Day 1 in ${(firstDay as any).destination_city || 'First destination'}:`);
    console.log(`Title: ${firstDay.title}`);
    console.log(`Activities: ${firstDay.activities.length}`);
    firstDay.activities.slice(0, 2).forEach((activity: any) => {
      console.log(`  - ${activity.time}: ${activity.description}`);
    });
    
    console.log('\nPerformance Metrics:');
    console.log(`- Total time: ${(duration / 1000).toFixed(1)} seconds`);
    console.log(`- Per destination: ${(duration / 5000).toFixed(1)} seconds`);
    
  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
  }
}

testComplexTripV2();