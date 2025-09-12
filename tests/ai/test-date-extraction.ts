#!/usr/bin/env tsx

import { generatePersonalizedItinerary } from './src/ai/flows/generate-personalized-itinerary';

async function testDateExtraction() {
  console.log('\n🧪 Testing Date Extraction\n');
  console.log('Current date:', new Date().toISOString().split('T')[0]);
  console.log('Current day:', new Date().toLocaleDateString('en-US', { weekday: 'long' }));
  
  const testCases = [
    "5 days in NYC from LA next Tuesday",
    "Paris for a week tomorrow",
    "Visit London next week",
    "Tokyo trip in 3 days",
    "Rome on January 15th"
  ];
  
  for (const prompt of testCases) {
    console.log(`\n📝 Testing: "${prompt}"`);
    
    try {
      const result = await generatePersonalizedItinerary({ prompt });
      
      if (result.itinerary && result.itinerary.length > 0) {
        const firstDay = result.itinerary[0].date;
        const lastDay = result.itinerary[result.itinerary.length - 1].date;
        console.log(`✅ Generated dates: ${firstDay} to ${lastDay}`);
        console.log(`   Total days: ${result.itinerary.length}`);
      } else {
        console.log('❌ No itinerary generated');
      }
    } catch (error) {
      console.error('❌ Error:', error);
    }
  }
}

testDateExtraction().catch(console.error);