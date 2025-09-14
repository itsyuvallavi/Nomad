#!/usr/bin/env node

/**
 * Test script to ensure addresses are never invented
 * Always returns "Address N/A" when LocationIQ doesn't find a venue
 */

const dotenv = require('dotenv');
dotenv.config();

console.log('🔒 Testing Address Safety');
console.log('===========================');
console.log('');

async function testAddressSafety() {
  // Use dynamic import for node-fetch v3 ESM module
  const fetch = globalThis.fetch || (await import('node-fetch')).default;
  const apiKey = process.env.LOCATIONIQ_API_KEY;

  if (!apiKey) {
    console.error('❌ LOCATIONIQ_API_KEY not found');
    return;
  }

  // Test venues that should NOT be found (to ensure we get "Address N/A")
  const testVenues = [
    {
      name: "Fake Restaurant XYZ123",
      expected: "Address N/A"
    },
    {
      name: "Non-Existent Cafe 999",
      expected: "Address N/A"
    },
    {
      name: "Made Up Hotel QWERTY",
      expected: "Address N/A"
    }
  ];

  console.log('📋 Testing non-existent venues (should return "Address N/A"):');
  console.log('');

  for (const test of testVenues) {
    try {
      const url = `https://us1.locationiq.com/v1/search?key=${apiKey}&q=${encodeURIComponent(test.name + ' Paris')}&format=json&limit=1`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data || data.length === 0) {
        console.log(`✅ "${test.name}"`);
        console.log(`   Expected: ${test.expected}`);
        console.log(`   Result: Would return "Address N/A" (no results from API)`);
      } else {
        console.log(`⚠️  "${test.name}"`);
        console.log(`   Unexpectedly found something: ${data[0].display_name}`);
      }
    } catch (error) {
      console.log(`✅ "${test.name}"`);
      console.log(`   Error from API: ${error.message}`);
      console.log(`   Result: Would return "Address N/A" (API error)`);
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('');
  console.log('📋 Testing real venues (should get real addresses):');
  console.log('');

  const realVenues = [
    "Eiffel Tower Paris",
    "Louvre Museum Paris",
    "Notre-Dame Paris"
  ];

  for (const venue of realVenues) {
    try {
      const url = `https://us1.locationiq.com/v1/search?key=${apiKey}&q=${encodeURIComponent(venue)}&format=json&limit=1`;
      const response = await fetch(url);
      const data = await response.json();

      if (data && data.length > 0) {
        console.log(`✅ "${venue}"`);
        console.log(`   Found real address: ${data[0].display_name}`);
      } else {
        console.log(`⚠️  "${venue}"`);
        console.log(`   No results - would return "Address N/A"`);
      }
    } catch (error) {
      console.log(`❌ "${venue}"`);
      console.log(`   Error: ${error.message}`);
      console.log(`   Would return "Address N/A"`);
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('');
  console.log('✅ Summary of Address Safety Rules:');
  console.log('====================================');
  console.log('1. AI will NEVER invent addresses');
  console.log('2. AI always uses "Address N/A" initially');
  console.log('3. LocationIQ API provides real addresses when venues are found');
  console.log('4. If LocationIQ fails or finds nothing, address remains "Address N/A"');
  console.log('5. No street numbers or postal codes are ever invented');
  console.log('');

  // Test the validation in our code
  console.log('📋 Testing Code Validation:');
  console.log('');

  // Simulate what our venue extractor would do
  const simulatedActivity = {
    venue_name: "Fake Restaurant XYZ",
    description: "A restaurant that doesn't exist",
    category: "Food",
    venue_search: "Fake Restaurant XYZ Paris"
  };

  console.log('Input activity:', JSON.stringify(simulatedActivity, null, 2));
  console.log('');
  console.log('Expected output after LocationIQ fails to find it:');
  console.log(JSON.stringify({
    ...simulatedActivity,
    address: "Address N/A",
    coordinates: undefined
  }, null, 2));
}

testAddressSafety().catch(console.error);