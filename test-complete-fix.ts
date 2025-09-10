#!/usr/bin/env tsx

import { generatePersonalizedItinerary } from './src/ai/flows/generate-personalized-itinerary';

async function testCompleteFix() {
  const prompt = "please create a trip to NYC from LA for 5 days next Tuesday, then london for 7 days, then brussels for 5 days. then fly back to LA";
  
  console.log('\n🧪 FINAL VERIFICATION TEST\n');
  console.log('Today:', new Date().toISOString().split('T')[0], `(${new Date().toLocaleDateString('en-US', { weekday: 'long' })})`);
  console.log('Next Tuesday:', '2025-09-16');
  console.log('\n📝 Prompt:', prompt);
  console.log('\n✅ Expected:');
  console.log('  - Origin: LA');
  console.log('  - Destinations: NYC (5 days), London (7 days), Brussels (5 days)');
  console.log('  - Total: 17 days');
  console.log('  - Start Date: 2025-09-16 (next Tuesday)');
  console.log('  - End Date: 2025-10-02');
  
  const result = await generatePersonalizedItinerary({ prompt });
  
  console.log('\n📊 Actual Result:');
  console.log('  - Destination:', result.destination);
  console.log('  - Total days:', result.itinerary?.length || 0);
  console.log('  - Title:', result.title);
  
  if (result.itinerary && result.itinerary.length > 0) {
    // Check which cities are in the itinerary
    const cities = new Set();
    result.itinerary.forEach(day => {
      if (day._destination) {
        cities.add(day._destination);
      }
    });
    console.log('  - Cities covered:', Array.from(cities).join(', '));
    console.log('  - First day date:', result.itinerary[0].date);
    console.log('  - Last day date:', result.itinerary[result.itinerary.length - 1].date);
    
    // Verify dates
    const firstDate = result.itinerary[0].date;
    const lastDate = result.itinerary[result.itinerary.length - 1].date;
    
    console.log('\n🎯 Verification:');
    
    // Check start date
    if (firstDate === '2025-09-16') {
      console.log('  ✅ Start date correct (next Tuesday)');
    } else {
      console.log(`  ❌ Start date incorrect: expected 2025-09-16, got ${firstDate}`);
    }
    
    // Check day count
    if (result.itinerary.length === 17) {
      console.log('  ✅ Day count correct (17 days)');
    } else {
      console.log(`  ❌ Day count incorrect: expected 17, got ${result.itinerary.length}`);
    }
    
    // Check cities
    const cityArray = Array.from(cities);
    const hasAllCities = ['NYC', 'London', 'Brussels'].every(city => 
      cityArray.some(c => c.includes(city))
    );
    if (hasAllCities) {
      console.log('  ✅ All cities included');
    } else {
      console.log(`  ❌ Missing cities: got ${cityArray.join(', ')}`);
    }
    
    // Check end date
    if (lastDate === '2025-10-02') {
      console.log('  ✅ End date correct');
    } else {
      console.log(`  ⚠️  End date: expected 2025-10-02, got ${lastDate}`);
    }
  }
}

testCompleteFix().catch(console.error);