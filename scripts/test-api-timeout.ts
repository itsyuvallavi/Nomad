#!/usr/bin/env npx tsx

/**
 * Test API timeout and progressive generation
 */

import 'dotenv/config';

async function testAPITimeout() {
  console.log('🧪 Testing API Timeout and Progressive Generation\n');

  const testCases = [
    {
      name: 'Simple 3-day London',
      message: '3 days in London',
      expectedTimeout: false
    },
    {
      name: '2 weeks London and Brussels',
      message: '2 weeks trip to London and Brussels, one week in each city',
      expectedTimeout: false // Should not timeout with progressive
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📍 Test: ${testCase.name}`);
    console.log(`   Message: "${testCase.message}"`);

    const startTime = Date.now();

    try {
      // Call the API directly
      const response = await fetch('http://localhost:9002/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: testCase.message,
          sessionId: `test-${Date.now()}`
        }),
        // Set a client timeout longer than server timeout
        signal: AbortSignal.timeout(320000) // 320 seconds
      });

      const elapsed = Date.now() - startTime;

      if (!response.ok) {
        console.log(`   ❌ HTTP ${response.status}: ${response.statusText}`);
        console.log(`   Time: ${elapsed}ms`);

        if (response.status === 504) {
          console.log(`   TIMEOUT DETECTED after ${elapsed}ms`);
        }

        const error = await response.text();
        console.log(`   Error: ${error.substring(0, 200)}`);
      } else {
        const data = await response.json();
        console.log(`   ✅ Success in ${elapsed}ms`);
        console.log(`   Response type: ${data.data?.type}`);

        if (data.data?.itinerary) {
          const itin = data.data.itinerary;
          console.log(`   Generated ${itin.itinerary?.length || 0} days`);
          console.log(`   Destinations: ${itin.destination}`);
        }
      }

    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      console.log(`   ❌ Client Error after ${elapsed}ms`);
      console.log(`   ${error.message}`);
    }
  }
}

// Run the test
testAPITimeout().catch(console.error);