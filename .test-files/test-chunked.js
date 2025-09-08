// Test chunked OpenAI generation
require('dotenv').config();

// Mock the necessary modules
const { parseDestinations } = require('../src/ai/utils/destination-parser.ts');

async function testChunkedGeneration() {
  console.log('🧪 Testing Chunked OpenAI Generation\n');
  
  const testPrompt = `I want to travel from Melbourne for 31 days in the following order:
  - Zimbabwe (7 days)
  - Nicaragua (7 days)  
  - Madagascar (7 days)
  - Ethiopia (7 days)
  - Denmark (Copenhagen) (3 days)
  Then returning to LA`;
  
  // Parse destinations
  const parsedTrip = parseDestinations(testPrompt);
  
  console.log('📋 Parsed Trip:', {
    destinations: parsedTrip.destinations.map(d => `${d.name} (${d.days} days)`),
    totalDays: parsedTrip.totalDays,
    origin: parsedTrip.origin,
    returnTo: parsedTrip.returnTo
  });
  
  // Import the chunked generator
  const { generateChunkedItinerary } = await import('../src/ai/openai-chunked.ts');
  
  try {
    console.log('\n🚀 Starting chunked generation...\n');
    const startTime = Date.now();
    
    const itinerary = await generateChunkedItinerary(testPrompt);
    
    const duration = Date.now() - startTime;
    console.log(`\n✅ Generation completed in ${duration}ms (${(duration/1000).toFixed(1)}s)`);
    
    // Verify results
    console.log('\n📊 Results:');
    console.log('- Destination:', itinerary.destination);
    console.log('- Title:', itinerary.title);
    console.log('- Total Days:', itinerary.itinerary.length);
    console.log('- Quick Tips:', itinerary.quickTips.length);
    
    // Check day distribution
    const daysByCountry = {};
    itinerary.itinerary.forEach(day => {
      // Try to identify which country this day belongs to
      let country = 'Unknown';
      const dayActivities = day.activities.map(a => a.description.toLowerCase()).join(' ');
      
      if (dayActivities.includes('zimbabwe') || dayActivities.includes('harare') || dayActivities.includes('victoria falls')) {
        country = 'Zimbabwe';
      } else if (dayActivities.includes('nicaragua') || dayActivities.includes('managua') || dayActivities.includes('granada')) {
        country = 'Nicaragua';
      } else if (dayActivities.includes('madagascar') || dayActivities.includes('antananarivo')) {
        country = 'Madagascar';
      } else if (dayActivities.includes('ethiopia') || dayActivities.includes('addis ababa')) {
        country = 'Ethiopia';
      } else if (dayActivities.includes('denmark') || dayActivities.includes('copenhagen')) {
        country = 'Denmark';
      }
      
      if (!daysByCountry[country]) {
        daysByCountry[country] = [];
      }
      daysByCountry[country].push(day.day);
    });
    
    console.log('\n📍 Days by Country:');
    Object.entries(daysByCountry).forEach(([country, days]) => {
      console.log(`  ${country}: Days ${days.join(', ')} (${days.length} days)`);
    });
    
    // Save to file
    const fs = require('fs');
    fs.writeFileSync('test-chunked-output.json', JSON.stringify(itinerary, null, 2));
    console.log('\n💾 Full itinerary saved to test-chunked-output.json');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

testChunkedGeneration();