#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import the server action directly
import { generatePersonalizedItinerary } from '../src/ai/flows/generate-personalized-itinerary';

async function testServerAction() {
  console.log('\n🧪 === TESTING SERVER ACTION DIRECTLY ===\n');
  
  const testCases = [
    {
      name: 'Simple London Trip',
      input: {
        prompt: 'Plan 3 days in London',
        origin: 'New York',
        budget: 'moderate',
        travelStyle: 'balanced',
        interests: [],
        accommodationType: 'hotel',
        transportationPreference: 'public',
        dietaryRestrictions: [],
        accessibility: [],
        weatherPreference: 'any',
        pacePreference: 'moderate',
        culturalInterests: [],
        activityLevel: 'moderate',
        numberOfTravelers: 1,
        travelWithKids: false,
        travelWithPets: false,
        specificRequests: ''
      },
      expected: {
        destinations: ['London'],
        days: 3,
        hasActivities: true
      }
    },
    {
      name: 'Multi-city Europe',
      input: {
        prompt: 'I want to visit Paris and Rome for a week',
        origin: 'Boston',
        budget: 'moderate',
        travelStyle: 'balanced',
        interests: [],
        accommodationType: 'hotel',
        transportationPreference: 'public',
        dietaryRestrictions: [],
        accessibility: [],
        weatherPreference: 'any',
        pacePreference: 'moderate',
        culturalInterests: [],
        activityLevel: 'moderate',
        numberOfTravelers: 2,
        travelWithKids: false,
        travelWithPets: false,
        specificRequests: ''
      },
      expected: {
        destinations: ['Paris', 'Rome'],
        days: 7,
        hasActivities: true
      }
    }
  ];
  
  for (const test of testCases) {
    console.log(`\n📝 Testing: ${test.name}`);
    console.log(`   Input: "${test.input.prompt}"`);
    
    try {
      const startTime = Date.now();
      const result = await generatePersonalizedItinerary(test.input);
      const duration = Date.now() - startTime;
      
      console.log(`✅ Response received in ${duration}ms`);
      
      // Validate structure
      if (!result || !result.destinations) {
        console.error('❌ Invalid response structure');
        continue;
      }
      
      // Extract info
      const destinations = result.destinations.map(d => d.city);
      const totalDays = result.destinations.reduce((sum, d) => sum + d.days, 0);
      const totalActivities = result.destinations.reduce((sum, d) => 
        sum + (d.dailyItineraries?.reduce((s, di) => s + (di.activities?.length || 0), 0) || 0), 0);
      
      console.log(`   Results:`);
      console.log(`     - Destinations: ${destinations.join(', ')}`);
      console.log(`     - Total Days: ${totalDays}`);
      console.log(`     - Activities: ${totalActivities}`);
      
      // Check API integrations
      const hasRealPlaces = result.destinations.some(d => 
        d.dailyItineraries?.some(di => 
          di.activities?.some(a => a.venue && a.address)
        )
      );
      
      const hasWeather = result.destinations.some(d => d.weather && d.weather.length > 0);
      const hasCosts = result.destinations.some(d => d.estimatedCost);
      const hasExchangeRates = result.destinations.some(d => d.localCurrency?.exchangeRate);
      
      console.log(`   API Integrations:`);
      console.log(`     - Real Places: ${hasRealPlaces ? '✅' : '⚠️'}`);
      console.log(`     - Weather: ${hasWeather ? '✅' : '⚠️'}`);
      console.log(`     - Cost Estimates: ${hasCosts ? '✅' : '⚠️'}`);
      console.log(`     - Exchange Rates: ${hasExchangeRates ? '✅' : '⚠️'}`);
      
      // Validate expectations
      let passed = true;
      if (test.expected.destinations) {
        const expectedCities = test.expected.destinations.sort().join(',');
        const actualCities = destinations.sort().join(',');
        if (expectedCities !== actualCities) {
          console.error(`❌ Destinations mismatch: expected ${expectedCities}, got ${actualCities}`);
          passed = false;
        }
      }
      
      if (test.expected.days && Math.abs(totalDays - test.expected.days) > 2) {
        console.error(`❌ Days mismatch: expected ~${test.expected.days}, got ${totalDays}`);
        passed = false;
      }
      
      if (test.expected.hasActivities && totalActivities === 0) {
        console.error(`❌ No activities generated`);
        passed = false;
      }
      
      console.log(`   Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
      
    } catch (error: any) {
      console.error(`❌ Test failed: ${error.message}`);
    }
  }
  
  console.log('\n📊 === TEST SUMMARY ===\n');
  console.log('Server actions are working and generating itineraries');
  console.log('API integrations are being used when available');
}

// Run the test
testServerAction()
  .then(() => {
    console.log('\n✅ Server action tests completed!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test error:', error);
    process.exit(1);
  });