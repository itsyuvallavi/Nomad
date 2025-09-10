#!/usr/bin/env tsx

import { generatePersonalizedItinerary } from './src/ai/flows/generate-personalized-itinerary';

async function testDateCheck() {
  const prompt = "5 days in NYC from LA next Tuesday";
  
  console.log('\n🧪 Testing Date Generation\n');
  console.log('Today:', new Date().toISOString().split('T')[0]);
  console.log('Next Tuesday should be: 2025-09-16');
  console.log('\nPrompt:', prompt);
  
  const result = await generatePersonalizedItinerary({ prompt });
  
  console.log('\nResult:');
  console.log('- Destination:', result.destination);
  console.log('- Total days:', result.itinerary?.length || 0);
  
  if (result.itinerary && result.itinerary.length > 0) {
    console.log('\nDates Generated:');
    result.itinerary.slice(0, 3).forEach(day => {
      console.log(`  Day ${day.day}: ${day.date}`);
    });
    
    const firstDate = result.itinerary[0].date;
    if (firstDate === '2025-09-16') {
      console.log('\n✅ SUCCESS: Date extraction working correctly!');
    } else {
      console.log(`\n❌ FAIL: Expected 2025-09-16, got ${firstDate}`);
    }
  }
}

testDateCheck().catch(console.error);