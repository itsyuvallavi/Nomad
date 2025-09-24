#!/usr/bin/env npx tsx

/**
 * Test the /api/ai endpoint with multi-city requests
 */

async function testAPIEndpoint() {
  const testCases = [
    {
      name: 'Basic 2-city trip',
      message: '3 days in London then 2 days in Paris starting tomorrow'
    },
    {
      name: 'Weekend in 2 cities',
      message: 'Weekend trip to Rome and Florence next week'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 Testing: ${testCase.name}`);
    console.log(`   Prompt: "${testCase.message}"`);

    try {
      const startTime = Date.now();

      const response = await fetch('http://localhost:9002/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: testCase.message,
          intent: 'initial'
        })
      });

      const elapsed = Date.now() - startTime;
      const data = await response.json();

      if (!response.ok) {
        console.log(`   ❌ Error: ${data.error || response.status}`);
        continue;
      }

      console.log(`   ✅ Response in ${elapsed}ms`);
      console.log(`   📦 Response type: ${data.type || 'unknown'}`);
      console.log(`   💬 Message: ${data.message?.substring(0, 100) || 'none'}`);

      if (data.intent) {
        console.log(`   📍 Destinations: ${data.intent.destination || 'not found'}`);
        console.log(`   ⏱️ Duration: ${data.intent.duration || 'not found'} days`);
      }

      if (data.itinerary) {
        const destinations = data.itinerary.destination?.split(',').map((d: string) => d.trim()) || [];
        const days = data.itinerary.itinerary?.length || 0;

        console.log(`   🗺️ Generated for: ${destinations.join(' → ')}`);
        console.log(`   📅 Total days: ${days}`);

        // Check city distribution
        if (data.itinerary.itinerary) {
          const cityCounts = new Map<string, number>();
          for (const day of data.itinerary.itinerary) {
            const titleMatch = day.title?.match(/Day \d+ - (.+?)(?:\s|$)/);
            if (titleMatch) {
              const city = titleMatch[1].trim();
              cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
            }
          }

          console.log('   📊 Days per city:');
          for (const [city, count] of cityCounts) {
            console.log(`      - ${city}: ${count} days`);
          }
        }
      }

    } catch (error) {
      console.log(`   ❌ Failed: ${error}`);
    }
  }
}

console.log('🧪 Testing Multi-City API Endpoint');
console.log('   URL: http://localhost:9002/api/ai\n');

testAPIEndpoint().catch(console.error);