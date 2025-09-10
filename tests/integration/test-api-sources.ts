/**
 * Comprehensive API Source Testing with Full Data Capture
 * Captures ALL details including photos, addresses, hotels, transportation, pricing
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { generatePersonalizedItinerary } from '../src/ai/flows/generate-personalized-itinerary';
import { searchGooglePlaces } from '../src/lib/api/google-places';
import { getWeatherForecast } from '../src/lib/api/weather';
import { estimateFlightCost, estimateHotelCost, estimateTripCost } from '../src/ai/utils/openai-travel-costs';
import { logger } from '../src/lib/logger';

interface APICall {
  api: string;
  endpoint?: string;
  timestamp: string;
  duration: number;
  success: boolean;
  error?: string;
  params?: any;
  response?: any;
}

interface TestResult {
  testId: string;
  testName: string;
  prompt: string;
  timestamp: string;
  duration: number;
  success: boolean;
  error?: string;
  
  // Parsed trip details
  parsedTrip: {
    origin: string;
    destinations: Array<{
      name: string;
      days: number;
      order: number;
    }>;
    totalDays: number;
  };
  
  // Generated itinerary
  itinerary?: {
    title: string;
    destination: string;
    duration: string;
    quickTips: string[];
    estimatedCost?: any;
    days: Array<{
      dayNumber: number;
      date: string;
      title: string;
      location: string;
      weather?: {
        temp: number;
        conditions: string;
        icon: string;
      };
      activities: Array<{
        time: string;
        title: string;
        description: string;
        category: string;
        duration: string;
        cost?: string;
        location?: {
          address?: string;
          coordinates?: { lat: number; lng: number };
          website?: string;
          phone?: string;
          rating?: number;
          photos?: string[];
        };
        bookingRequired?: boolean;
        bookingUrl?: string;
      }>;
      meals: Array<{
        type: string;
        venue: string;
        cuisine: string;
        description: string;
        cost?: string;
        location?: {
          address?: string;
          coordinates?: { lat: number; lng: number };
          website?: string;
          phone?: string;
          rating?: number;
          photos?: string[];
        };
      }>;
      accommodation?: {
        name: string;
        type: string;
        checkIn?: string;
        checkOut?: string;
        price?: string;
        address?: string;
        amenities?: string[];
        website?: string;
        phone?: string;
        photos?: string[];
      };
      transportation?: Array<{
        type: string;
        from: string;
        to: string;
        departure?: string;
        arrival?: string;
        duration?: string;
        cost?: string;
        provider?: string;
        bookingUrl?: string;
        notes?: string;
      }>;
    }>;
  };
  
  // External API data
  apiCalls: APICall[];
  
  // Flight data
  flights?: Array<{
    route: string;
    origin: string;
    destination: string;
    price: {
      economy?: number;
      business?: number;
      first?: number;
    };
    duration: string;
    airlines: string[];
    apiSource: string;
    timestamp: string;
  }>;
  
  // Hotel data
  hotels?: Array<{
    city: string;
    name: string;
    pricePerNight: {
      budget?: number;
      midRange?: number;
      luxury?: number;
    };
    recommendedAreas: string[];
    topHotels?: Array<{
      name: string;
      price: number;
      rating: number;
      address: string;
      amenities?: string[];
    }>;
    apiSource: string;
    timestamp: string;
  }>;
  
  // Places data
  places?: Array<{
    city: string;
    type: string;
    results: Array<{
      name: string;
      address: string;
      rating?: number;
      priceLevel?: number;
      types: string[];
      coordinates: { lat: number; lng: number };
      placeId: string;
      photos?: Array<{
        reference: string;
        width: number;
        height: number;
        url?: string;
      }>;
      website?: string;
      phone?: string;
      hours?: string[];
    }>;
    apiSource: string;
    timestamp: string;
  }>;
  
  // Weather data
  weather?: Array<{
    city: string;
    forecast: Array<{
      date: string;
      temp: {
        min: number;
        max: number;
      };
      conditions: string;
      icon: string;
      humidity?: number;
      windSpeed?: number;
    }>;
    apiSource: string;
    timestamp: string;
  }>;
  
  // Photos collected
  photos?: Array<{
    source: string;
    location: string;
    url: string;
    width?: number;
    height?: number;
    photographer?: string;
    description?: string;
  }>;
  
  // Transportation details
  transportation?: {
    flights: Array<{
      from: string;
      to: string;
      carriers: string[];
      duration: string;
      price: { economy: number; business?: number; first?: number };
      schedule?: Array<{ departure: string; arrival: string; flightNumber?: string }>;
    }>;
    trains?: Array<{
      from: string;
      to: string;
      operator: string;
      duration: string;
      price: { standard: number; first?: number };
      schedule?: Array<{ departure: string; arrival: string }>;
    }>;
    localTransport?: Array<{
      city: string;
      types: string[]; // metro, bus, taxi, uber
      dayPass?: number;
      singleTicket?: number;
      taxiPerKm?: number;
    }>;
  };
}

const apiCalls: APICall[] = [];

// Track API calls
function trackAPICall(api: string, endpoint: string, params: any): { end: (success: boolean, response?: any, error?: string) => void } {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  return {
    end: (success: boolean, response?: any, error?: string) => {
      apiCalls.push({
        api,
        endpoint,
        timestamp,
        duration: Date.now() - startTime,
        success,
        params,
        response: response ? JSON.parse(JSON.stringify(response).substring(0, 1000)) : undefined,
        error
      });
    }
  };
}

async function fetchAllDataForTrip(
  destinations: string[],
  origin: string,
  days: number
): Promise<{
  flights: any[],
  hotels: any[],
  places: any[],
  weather: any[],
  photos: any[],
  transportation: any
}> {
  const flights: any[] = [];
  const hotels: any[] = [];
  const places: any[] = [];
  const weather: any[] = [];
  const photos: any[] = [];
  const transportation: any = { flights: [], trains: [], localTransport: [] };
  
  // Fetch flight data with OpenAI
  console.log('✈️ Fetching flight data...');
  for (let i = 0; i < destinations.length; i++) {
    const dest = destinations[i];
    
    // Origin to first destination
    if (i === 0 && origin) {
      const tracker = trackAPICall('OpenAI', 'estimateFlightCost', { origin, destination: dest });
      try {
        const flightData = await estimateFlightCost(origin, dest, 'next month');
        const flightInfo = {
          route: `${origin} → ${dest}`,
          origin,
          destination: dest,
          price: flightData.price,
          duration: flightData.duration,
          airlines: flightData.airlines,
          apiSource: 'OpenAI',
          timestamp: new Date().toISOString()
        };
        flights.push(flightInfo);
        transportation.flights.push({
          from: origin,
          to: dest,
          carriers: flightData.airlines,
          duration: flightData.duration,
          price: flightData.price,
          schedule: [
            { departure: '08:00', arrival: '20:00' },
            { departure: '14:00', arrival: '02:00+1' },
            { departure: '22:00', arrival: '10:00+1' }
          ]
        });
        tracker.end(true, flightData);
        console.log(`  ✅ ${origin} → ${dest}: $${flightData.price.economy}`);
      } catch (error: any) {
        tracker.end(false, null, error.message);
        console.log(`  ❌ Failed: ${error.message}`);
      }
    }
    
    // Between destinations
    if (i > 0) {
      const prevDest = destinations[i - 1];
      const tracker = trackAPICall('OpenAI', 'estimateFlightCost', { origin: prevDest, destination: dest });
      try {
        const flightData = await estimateFlightCost(prevDest, dest, 'next month');
        const flightInfo = {
          route: `${prevDest} → ${dest}`,
          origin: prevDest,
          destination: dest,
          price: flightData.price,
          duration: flightData.duration,
          airlines: flightData.airlines,
          apiSource: 'OpenAI',
          timestamp: new Date().toISOString()
        };
        flights.push(flightInfo);
        transportation.flights.push({
          from: prevDest,
          to: dest,
          carriers: flightData.airlines,
          duration: flightData.duration,
          price: flightData.price
        });
        tracker.end(true, flightData);
        console.log(`  ✅ ${prevDest} → ${dest}: $${flightData.price.economy}`);
      } catch (error: any) {
        tracker.end(false, null, error.message);
        console.log(`  ❌ Failed: ${error.message}`);
      }
    }
  }
  
  // Return flight
  if (origin && destinations.length > 0) {
    const lastDest = destinations[destinations.length - 1];
    const tracker = trackAPICall('OpenAI', 'estimateFlightCost', { origin: lastDest, destination: origin });
    try {
      const flightData = await estimateFlightCost(lastDest, origin, 'next month');
      flights.push({
        route: `${lastDest} → ${origin}`,
        origin: lastDest,
        destination: origin,
        price: flightData.price,
        duration: flightData.duration,
        airlines: flightData.airlines,
        apiSource: 'OpenAI',
        timestamp: new Date().toISOString()
      });
      transportation.flights.push({
        from: lastDest,
        to: origin,
        carriers: flightData.airlines,
        duration: flightData.duration,
        price: flightData.price
      });
      tracker.end(true, flightData);
      console.log(`  ✅ ${lastDest} → ${origin}: $${flightData.price.economy}`);
    } catch (error: any) {
      tracker.end(false, null, error.message);
      console.log(`  ❌ Failed: ${error.message}`);
    }
  }
  
  // Fetch hotel data
  console.log('\n🏨 Fetching hotel data...');
  for (const dest of destinations) {
    const tracker = trackAPICall('OpenAI', 'estimateHotelCost', { city: dest, nights: Math.ceil(days / destinations.length) });
    try {
      const hotelData = await estimateHotelCost(dest, Math.ceil(days / destinations.length));
      hotels.push({
        city: dest,
        name: `Hotels in ${dest}`,
        pricePerNight: hotelData.pricePerNight,
        recommendedAreas: hotelData.recommendedAreas,
        topHotels: hotelData.topHotels,
        apiSource: 'OpenAI',
        timestamp: new Date().toISOString()
      });
      tracker.end(true, hotelData);
      console.log(`  ✅ ${dest}: $${hotelData.pricePerNight.midRange}/night`);
    } catch (error: any) {
      tracker.end(false, null, error.message);
      console.log(`  ❌ Failed: ${error.message}`);
    }
  }
  
  // Fetch places data
  console.log('\n📍 Fetching places data...');
  const placeTypes = ['tourist_attraction', 'restaurant', 'museum', 'park', 'cafe', 'shopping_mall', 'bar'];
  for (const dest of destinations) {
    console.log(`  🔍 Searching ${dest}...`);
    for (const type of placeTypes) {
      const tracker = trackAPICall('GooglePlaces', 'searchPlaces', { query: type, location: dest });
      try {
        const placesData = await searchGooglePlaces(type, dest, type);
        if (placesData && placesData.length > 0) {
          places.push({
            city: dest,
            type,
            results: placesData.slice(0, 10).map((place: any) => ({
              name: place.name,
              address: place.formatted_address || place.vicinity,
              rating: place.rating,
              priceLevel: place.price_level,
              types: place.types,
              coordinates: place.geometry?.location,
              placeId: place.place_id,
              photos: place.photos?.slice(0, 3).map((photo: any) => ({
                reference: photo.photo_reference,
                width: photo.width,
                height: photo.height,
                url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photoreference=${photo.photo_reference}&key=${process.env.GOOGLE_PLACES_API_KEY}`
              })),
              website: place.website,
              phone: place.formatted_phone_number,
              hours: place.opening_hours?.weekday_text
            })),
            apiSource: 'GooglePlaces',
            timestamp: new Date().toISOString()
          });
          
          // Extract photos
          placesData.slice(0, 5).forEach((place: any) => {
            if (place.photos?.[0]) {
              photos.push({
                source: 'GooglePlaces',
                location: dest,
                url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photoreference=${place.photos[0].photo_reference}&key=${process.env.GOOGLE_PLACES_API_KEY}`,
                width: place.photos[0].width,
                height: place.photos[0].height,
                description: `${place.name} in ${dest}`
              });
            }
          });
          console.log(`    ✅ ${type}: ${placesData.length} places`);
        }
        tracker.end(true, { count: placesData?.length || 0 });
      } catch (error: any) {
        tracker.end(false, null, error.message);
      }
    }
  }
  
  // Fetch weather data
  console.log('\n🌤️ Fetching weather data...');
  for (const dest of destinations) {
    const tracker = trackAPICall('OpenWeatherMap', 'getWeatherForecast', { city: dest });
    try {
      const weatherData = await getWeatherForecast(dest);
      if (weatherData) {
        weather.push({
          city: dest,
          forecast: weatherData.slice(0, 7).map((day: any) => ({
            date: day.date,
            temp: day.temp,
            conditions: day.conditions,
            icon: day.icon,
            humidity: day.humidity,
            windSpeed: day.wind_speed
          })),
          apiSource: 'OpenWeatherMap',
          timestamp: new Date().toISOString()
        });
        console.log(`  ✅ ${dest}: ${weatherData.length} day forecast`);
      }
      tracker.end(true, { days: weatherData?.length || 0 });
    } catch (error: any) {
      tracker.end(false, null, error.message);
      console.log(`  ❌ ${dest}: ${error.message}`);
    }
  }
  
  // Add local transport info
  destinations.forEach(dest => {
    transportation.localTransport.push({
      city: dest,
      types: ['metro', 'bus', 'taxi', 'uber'],
      dayPass: dest === 'Tokyo' ? 10 : dest === 'London' ? 15 : dest === 'Paris' ? 8 : 12,
      singleTicket: dest === 'Tokyo' ? 2 : dest === 'London' ? 3 : dest === 'Paris' ? 2 : 2.5,
      taxiPerKm: dest === 'Tokyo' ? 3 : dest === 'London' ? 2.5 : dest === 'Paris' ? 1.8 : 2
    });
  });
  
  return { flights, hotels, places, weather, photos, transportation };
}

async function runComprehensiveTest(
  testName: string,
  prompt: string
): Promise<TestResult> {
  const testId = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const startTime = Date.now();
  
  console.log('\n' + '═'.repeat(80));
  console.log(`🧪 TEST: ${testName}`);
  console.log('═'.repeat(80));
  console.log(`📝 Prompt: "${prompt}"`);
  console.log('\n⏳ Starting comprehensive data collection...\n');
  
  const result: TestResult = {
    testId,
    testName,
    prompt,
    timestamp: new Date().toISOString(),
    duration: 0,
    success: false,
    parsedTrip: {
      origin: '',
      destinations: [],
      totalDays: 0
    },
    apiCalls: []
  };
  
  try {
    // Parse the prompt first
    const { parseDestinations } = await import('../src/ai/utils/destination-parser');
    const parsedTrip = parseDestinations(prompt);
    
    result.parsedTrip = {
      origin: parsedTrip.origin,
      destinations: parsedTrip.destinations.map(d => ({
        name: d.name,
        days: d.days || d.duration,
        order: d.order
      })),
      totalDays: parsedTrip.totalDays
    };
    
    console.log(`📋 Trip Structure:`);
    console.log(`  • Origin: ${parsedTrip.origin || 'Not specified'}`);
    console.log(`  • Destinations: ${parsedTrip.destinations.map(d => `${d.name} (${d.days || d.duration} days)`).join(', ')}`);
    console.log(`  • Total Days: ${parsedTrip.totalDays}\n`);
    
    // Fetch all external data
    const destinations = parsedTrip.destinations.map(d => d.name);
    const externalData = await fetchAllDataForTrip(
      destinations,
      parsedTrip.origin,
      parsedTrip.totalDays
    );
    
    result.flights = externalData.flights;
    result.hotels = externalData.hotels;
    result.places = externalData.places;
    result.weather = externalData.weather;
    result.photos = externalData.photos;
    result.transportation = externalData.transportation;
    
    // Generate the full itinerary
    console.log('\n🤖 Generating AI itinerary...');
    const itineraryTracker = trackAPICall('Gemini/OpenAI', 'generatePersonalizedItinerary', { prompt });
    
    const generatedItinerary = await generatePersonalizedItinerary({
      prompt,
      conversationHistory: '',
      fileContent: null
    });
    
    if (generatedItinerary.success && generatedItinerary.data) {
      result.itinerary = generatedItinerary.data;
      result.success = true;
      itineraryTracker.end(true, { title: generatedItinerary.data.title });
      
      console.log(`\n✅ ITINERARY GENERATED SUCCESSFULLY`);
      console.log(`  • Title: ${generatedItinerary.data.title}`);
      console.log(`  • Destinations: ${generatedItinerary.data.destination}`);
      console.log(`  • Duration: ${generatedItinerary.data.duration}`);
      console.log(`  • Days: ${generatedItinerary.data.days.length}`);
      console.log(`  • Total Activities: ${generatedItinerary.data.days.reduce((sum, day) => sum + day.activities.length, 0)}`);
    } else {
      result.error = generatedItinerary.error || 'Failed to generate itinerary';
      itineraryTracker.end(false, null, result.error);
      console.log(`\n❌ Failed to generate itinerary: ${result.error}`);
    }
    
  } catch (error: any) {
    result.error = error.message;
    console.log(`\n❌ Test failed: ${error.message}`);
  }
  
  result.duration = Date.now() - startTime;
  result.apiCalls = [...apiCalls];
  apiCalls.length = 0; // Clear for next test
  
  // Save to JSON file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join('.searches', `${timestamp}_${testName.replace(/\s+/g, '_')}.json`);
  
  fs.writeFileSync(filename, JSON.stringify(result, null, 2));
  
  console.log('\n📊 Data Collection Summary:');
  console.log(`  • Flights: ${result.flights?.length || 0} routes`);
  console.log(`  • Hotels: ${result.hotels?.length || 0} cities`);
  console.log(`  • Places: ${result.places?.length || 0} searches`);
  console.log(`  • Weather: ${result.weather?.length || 0} forecasts`);
  console.log(`  • Photos: ${result.photos?.length || 0} images`);
  console.log(`  • API Calls: ${result.apiCalls.length} total`);
  console.log(`  • Duration: ${(result.duration / 1000).toFixed(2)}s`);
  console.log(`\n💾 Full results saved to: ${filename}`);
  
  return result;
}

// Main test execution
async function main() {
  console.log('═'.repeat(80));
  console.log('🚀 COMPREHENSIVE API SOURCE TEST WITH FULL DATA CAPTURE');
  console.log('═'.repeat(80));
  console.log(`📅 Test Date: ${new Date().toISOString()}`);
  console.log(`📁 Results will be saved in: .searches/`);
  
  const testCases = [
    {
      name: 'Japan_Multi_City_Adventure',
      prompt: 'Plan 3 weeks in Japan from Los Angeles. Visit Tokyo, Kyoto, and Osaka. I want to experience culture, food, and technology.'
    },
    {
      name: 'European_Grand_Tour',
      prompt: '2 weeks across London, Paris, Rome, and Barcelona from New York. Focus on history and art.'
    },
    {
      name: 'Southeast_Asia_Explorer',
      prompt: 'Plan a 10-day trip from San Francisco to Southeast Asia. Include Bangkok, Singapore, and Bali.'
    }
  ];
  
  const results: TestResult[] = [];
  
  for (const testCase of testCases) {
    const result = await runComprehensiveTest(testCase.name, testCase.prompt);
    results.push(result);
    
    // Add delay between tests to avoid rate limits
    if (testCases.indexOf(testCase) < testCases.length - 1) {
      console.log('\n⏳ Waiting 3 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Generate summary report
  const summaryFile = path.join('.searches', `${new Date().toISOString().replace(/[:.]/g, '-')}_SUMMARY.json`);
  const summary = {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
    totalAPICalls: results.reduce((sum, r) => sum + r.apiCalls.length, 0),
    tests: results.map(r => ({
      name: r.testName,
      success: r.success,
      duration: r.duration,
      apiCalls: r.apiCalls.length,
      destinations: r.parsedTrip.destinations.length,
      totalDays: r.parsedTrip.totalDays,
      flights: r.flights?.length || 0,
      hotels: r.hotels?.length || 0,
      places: r.places?.length || 0,
      weather: r.weather?.length || 0,
      photos: r.photos?.length || 0,
      error: r.error
    })),
    apiBreakdown: {
      OpenAI: results.reduce((sum, r) => sum + r.apiCalls.filter(c => c.api === 'OpenAI').length, 0),
      GooglePlaces: results.reduce((sum, r) => sum + r.apiCalls.filter(c => c.api === 'GooglePlaces').length, 0),
      OpenWeatherMap: results.reduce((sum, r) => sum + r.apiCalls.filter(c => c.api === 'OpenWeatherMap').length, 0),
      Gemini: results.reduce((sum, r) => sum + r.apiCalls.filter(c => c.api.includes('Gemini')).length, 0)
    },
    dataCollected: {
      totalFlights: results.reduce((sum, r) => sum + (r.flights?.length || 0), 0),
      totalHotels: results.reduce((sum, r) => sum + (r.hotels?.length || 0), 0),
      totalPlaces: results.reduce((sum, r) => sum + (r.places?.length || 0), 0),
      totalWeatherForecasts: results.reduce((sum, r) => sum + (r.weather?.length || 0), 0),
      totalPhotos: results.reduce((sum, r) => sum + (r.photos?.length || 0), 0)
    }
  };
  
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  
  console.log('\n' + '═'.repeat(80));
  console.log('📊 FINAL TEST SUMMARY');
  console.log('═'.repeat(80));
  console.log(`✅ Successful: ${summary.successful}/${summary.totalTests}`);
  console.log(`❌ Failed: ${summary.failed}/${summary.totalTests}`);
  console.log(`⏱️ Total Duration: ${(summary.totalDuration / 1000).toFixed(2)}s`);
  console.log(`📡 Total API Calls: ${summary.totalAPICalls}`);
  console.log('\n📊 API Breakdown:');
  Object.entries(summary.apiBreakdown).forEach(([api, count]) => {
    console.log(`  • ${api}: ${count} calls`);
  });
  console.log('\n📦 Data Collected:');
  Object.entries(summary.dataCollected).forEach(([type, count]) => {
    console.log(`  • ${type}: ${count}`);
  });
  console.log(`\n💾 Summary saved to: ${summaryFile}`);
  console.log('🔍 Check .searches/ folder for detailed JSON files with all data');
  console.log('═'.repeat(80));
}

// Run the tests
main().catch(console.error);