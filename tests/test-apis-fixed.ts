#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import APIs after env vars are loaded
import { getWeatherForecast } from '../src/lib/api/weather';
import { searchGooglePlaces } from '../src/lib/api/google-places';
import { searchFlights, searchHotels } from '../src/lib/api/amadeus';
import { getCurrencyExchangeRate } from '../src/lib/api/polygon';

async function testAllAPIs() {
  console.log('\n🔧 === TESTING ALL APIS WITH FIXES ===\n');
  
  const results: Record<string, { status: string; data?: any; error?: any }> = {};
  
  // Test 1: OpenWeatherMap API
  console.log('1. Testing OpenWeatherMap...');
  try {
    const weather = await getWeatherForecast('London', 3);
    results.weather = {
      status: weather && weather.length > 0 ? '✅ Working' : '⚠️ No data',
      data: weather?.[0]
    };
    console.log('   Result:', results.weather.status);
    if (weather?.[0]) {
      console.log('   Sample:', {
        date: weather[0].date,
        temp: weather[0].temp,
        weather: weather[0].weather.main
      });
    }
  } catch (error: any) {
    results.weather = {
      status: '❌ Failed',
      error: error.message
    };
    console.log('   Result:', results.weather.status, '-', error.message);
  }
  
  // Test 2: Google Places API
  console.log('\n2. Testing Google Places...');
  try {
    // Correct parameter order: query, location, type
    const places = await searchGooglePlaces('restaurants', 'London', 'restaurant');
    results.googlePlaces = {
      status: places && places.length > 0 ? '✅ Working' : '⚠️ No data',
      data: places?.slice(0, 2)
    };
    console.log('   Result:', results.googlePlaces.status);
    if (places && places.length > 0) {
      console.log('   Found:', places.length, 'places');
      console.log('   Sample:', places[0].name);
    }
  } catch (error: any) {
    results.googlePlaces = {
      status: '❌ Failed',
      error: error.message
    };
    console.log('   Result:', results.googlePlaces.status, '-', error.message);
  }
  
  // Test 3: Amadeus API (Flights)
  console.log('\n3. Testing Amadeus Flights...');
  try {
    const flights = await searchFlights('New York', 'London', '2025-02-01');
    const isRealData = flights?.[0]?.id && !flights[0].id.startsWith('mock');
    results.amadeusFlights = {
      status: isRealData ? '✅ Working' : '⚠️ Using mock data',
      data: flights?.[0]
    };
    console.log('   Result:', results.amadeusFlights.status);
    if (flights?.[0]) {
      console.log('   Sample flight:', {
        price: `$${flights[0].price.total}`,
        airline: flights[0].airline
      });
    }
  } catch (error: any) {
    results.amadeusFlights = {
      status: '❌ Failed',
      error: error.message
    };
    console.log('   Result:', results.amadeusFlights.status, '-', error.message);
  }
  
  // Test 4: Amadeus API (Hotels)
  console.log('\n4. Testing Amadeus Hotels...');
  try {
    const hotels = await searchHotels('Paris', '2025-02-01', '2025-02-03');
    const isRealData = hotels?.[0]?.id && !hotels[0].id.startsWith('mock');
    results.amadeusHotels = {
      status: isRealData ? '✅ Working' : '⚠️ Using mock data',
      data: hotels?.[0]
    };
    console.log('   Result:', results.amadeusHotels.status);
    if (hotels?.[0]) {
      console.log('   Sample hotel:', {
        name: hotels[0].name,
        pricePerNight: hotels[0].offers?.[0]?.price?.perNight
      });
    }
  } catch (error: any) {
    results.amadeusHotels = {
      status: '❌ Failed',
      error: error.message
    };
    console.log('   Result:', results.amadeusHotels.status, '-', error.message);
  }
  
  // Test 5: Polygon.io API
  console.log('\n5. Testing Polygon.io Currency Exchange...');
  try {
    const conversion = await getCurrencyExchangeRate('USD', 'EUR');
    results.polygon = {
      status: conversion && conversion.rate > 0 ? '✅ Working' : '⚠️ No data',
      data: conversion
    };
    console.log('   Result:', results.polygon.status);
    if (conversion) {
      console.log('   USD to EUR rate:', conversion.rate);
    }
  } catch (error: any) {
    results.polygon = {
      status: '❌ Failed',
      error: error.message
    };
    console.log('   Result:', results.polygon.status, '-', error.message);
  }
  
  // Summary
  console.log('\n📊 === SUMMARY ===\n');
  const working = Object.values(results).filter(r => r.status.includes('✅')).length;
  const mockData = Object.values(results).filter(r => r.status.includes('⚠️')).length;
  const failed = Object.values(results).filter(r => r.status.includes('❌')).length;
  
  console.log(`APIs Working: ${working}/5`);
  console.log(`Using Mock Data: ${mockData}/5`);
  console.log(`Failed: ${failed}/5`);
  
  console.log('\nDetailed Status:');
  Object.entries(results).forEach(([api, result]) => {
    console.log(`  ${api}: ${result.status}`);
  });
  
  // Check environment variables
  console.log('\n🔑 === API KEYS STATUS ===\n');
  console.log('OpenWeatherMap:', process.env.OPENWEATHERMAP ? '✅ Configured' : '❌ Missing');
  console.log('Google API:', process.env.GOOGLE_API_KEY ? '✅ Configured' : '❌ Missing');
  console.log('Amadeus API Key:', process.env.AMADEUS_API_KEY ? '✅ Configured' : '❌ Missing');
  console.log('Amadeus Secret:', process.env.AMADEUS_API_SECRET ? '✅ Configured' : '❌ Missing');
  console.log('Polygon API:', process.env.POLYGON_API_KEY ? '✅ Configured' : '❌ Missing');
  
  return results;
}

// Run the tests
testAllAPIs()
  .then(() => {
    console.log('\n✅ All tests completed!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });