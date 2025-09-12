/**
 * Single Trip Test - Fast completion with all data captured
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { generatePersonalizedItinerary } from '../src/ai/flows/generate-personalized-itinerary';
import { searchGooglePlaces } from '../src/lib/api/google-places';
import { getWeatherForecast } from '../src/lib/api/weather';
import { estimateFlightCost, estimateHotelCost } from '../src/ai/utils/openai-travel-costs';

interface TestResult {
  testId: string;
  testName: string;
  timestamp: string;
  prompt: string;
  tripDetails: {
    origin: string;
    destination: string;
    duration: string;
  };
  
  // API Data Collection
  flights: {
    outbound: any;
    return: any;
  };
  
  hotels: {
    priceRange: any;
    areas: string[];
  };
  
  places: {
    restaurants: any[];
    attractions: any[];
    museums: any[];
  };
  
  weather: any[];
  
  photos: Array<{
    name: string;
    url: string;
    location: string;
  }>;
  
  transportation: {
    localTransport: {
      types: string[];
      dayPass: number;
      taxiPerKm: number;
    };
  };
  
  // Generated Itinerary Summary
  itinerary?: {
    title: string;
    totalDays: number;
    totalActivities: number;
    generatedAt: string;
  };
  
  // API Call Tracking
  apiCalls: Array<{
    api: string;
    timestamp: string;
    duration: number;
    success: boolean;
  }>;
}

async function runSingleTripTest() {
  const testName = 'Tokyo_3_Day_Trip';
  const prompt = '3 days in Tokyo from Los Angeles';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  console.log('═'.repeat(80));
  console.log('🧪 SINGLE TRIP TEST - COMPREHENSIVE DATA CAPTURE');
  console.log('═'.repeat(80));
  console.log(`📝 Prompt: "${prompt}"`);
  console.log(`📅 Test Started: ${new Date().toISOString()}\n`);
  
  const result: TestResult = {
    testId: `test_${Date.now()}`,
    testName,
    timestamp: new Date().toISOString(),
    prompt,
    tripDetails: {
      origin: 'Los Angeles',
      destination: 'Tokyo',
      duration: '3 days'
    },
    flights: { outbound: null, return: null },
    hotels: { priceRange: null, areas: [] },
    places: { restaurants: [], attractions: [], museums: [] },
    weather: [],
    photos: [],
    transportation: {
      localTransport: {
        types: ['metro', 'bus', 'taxi', 'uber'],
        dayPass: 10,
        taxiPerKm: 3
      }
    },
    apiCalls: []
  };
  
  const trackAPI = (api: string) => {
    const start = Date.now();
    return {
      end: (success: boolean) => {
        result.apiCalls.push({
          api,
          timestamp: new Date().toISOString(),
          duration: Date.now() - start,
          success
        });
      }
    };
  };
  
  try {
    // 1. FLIGHT DATA
    console.log('✈️ Fetching Flight Data...');
    const flightTracker = trackAPI('OpenAI-Flights');
    try {
      const outbound = await estimateFlightCost('Los Angeles', 'Tokyo', 'next month');
      const returnFlight = await estimateFlightCost('Tokyo', 'Los Angeles', 'next month');
      
      result.flights.outbound = {
        route: 'LAX → NRT',
        price: outbound.price,
        duration: outbound.duration,
        airlines: outbound.airlines
      };
      
      result.flights.return = {
        route: 'NRT → LAX',
        price: returnFlight.price,
        duration: returnFlight.duration,
        airlines: returnFlight.airlines
      };
      
      console.log(`  ✅ Outbound: $${outbound.price.economy}`);
      console.log(`  ✅ Return: $${returnFlight.price.economy}`);
      flightTracker.end(true);
    } catch (e) {
      flightTracker.end(false);
      console.log('  ❌ Flight data failed');
    }
    
    // 2. HOTEL DATA
    console.log('\n🏨 Fetching Hotel Data...');
    const hotelTracker = trackAPI('OpenAI-Hotels');
    try {
      const hotels = await estimateHotelCost('Tokyo', 3);
      result.hotels.priceRange = hotels.pricePerNight;
      result.hotels.areas = hotels.recommendedAreas;
      console.log(`  ✅ Price Range: $${hotels.pricePerNight.budget}-${hotels.pricePerNight.luxury}/night`);
      console.log(`  ✅ Areas: ${hotels.recommendedAreas.join(', ')}`);
      hotelTracker.end(true);
    } catch (e) {
      hotelTracker.end(false);
      console.log('  ❌ Hotel data failed');
    }
    
    // 3. PLACES DATA
    console.log('\n📍 Fetching Places Data...');
    
    // Restaurants
    const restTracker = trackAPI('GooglePlaces-Restaurants');
    try {
      const restaurants = await searchGooglePlaces('restaurant', 'Tokyo', 'restaurant');
      result.places.restaurants = restaurants.slice(0, 5).map((r: any) => ({
        name: r.name,
        address: r.formatted_address || r.vicinity,
        rating: r.rating,
        priceLevel: r.price_level,
        coordinates: r.geometry?.location,
        placeId: r.place_id
      }));
      console.log(`  ✅ Restaurants: ${restaurants.length} found`);
      restTracker.end(true);
      
      // Extract photos
      restaurants.slice(0, 3).forEach((place: any) => {
        if (place.photos?.[0]) {
          result.photos.push({
            name: place.name,
            url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photoreference=${place.photos[0].photo_reference}&key=${process.env.GOOGLE_PLACES_API_KEY}`,
            location: 'Tokyo'
          });
        }
      });
    } catch (e) {
      restTracker.end(false);
    }
    
    // Attractions
    const attrTracker = trackAPI('GooglePlaces-Attractions');
    try {
      const attractions = await searchGooglePlaces('tourist_attraction', 'Tokyo', 'tourist_attraction');
      result.places.attractions = attractions.slice(0, 5).map((a: any) => ({
        name: a.name,
        address: a.formatted_address || a.vicinity,
        rating: a.rating,
        coordinates: a.geometry?.location,
        placeId: a.place_id
      }));
      console.log(`  ✅ Attractions: ${attractions.length} found`);
      attrTracker.end(true);
      
      // Extract photos
      attractions.slice(0, 3).forEach((place: any) => {
        if (place.photos?.[0]) {
          result.photos.push({
            name: place.name,
            url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photoreference=${place.photos[0].photo_reference}&key=${process.env.GOOGLE_PLACES_API_KEY}`,
            location: 'Tokyo'
          });
        }
      });
    } catch (e) {
      attrTracker.end(false);
    }
    
    // Museums
    const museumTracker = trackAPI('GooglePlaces-Museums');
    try {
      const museums = await searchGooglePlaces('museum', 'Tokyo', 'museum');
      result.places.museums = museums.slice(0, 5).map((m: any) => ({
        name: m.name,
        address: m.formatted_address || m.vicinity,
        rating: m.rating,
        coordinates: m.geometry?.location,
        placeId: m.place_id
      }));
      console.log(`  ✅ Museums: ${museums.length} found`);
      museumTracker.end(true);
    } catch (e) {
      museumTracker.end(false);
    }
    
    // 4. WEATHER DATA
    console.log('\n🌤️ Fetching Weather Data...');
    const weatherTracker = trackAPI('OpenWeatherMap');
    try {
      const weather = await getWeatherForecast('Tokyo');
      result.weather = weather.slice(0, 3).map((w: any) => ({
        date: w.date,
        temp: w.temp,
        conditions: w.conditions,
        icon: w.icon
      }));
      console.log(`  ✅ Weather: ${weather.length} day forecast`);
      weatherTracker.end(true);
    } catch (e) {
      weatherTracker.end(false);
      console.log('  ❌ Weather data failed');
    }
    
    // 5. GENERATE ITINERARY
    console.log('\n🤖 Generating Itinerary...');
    const genTracker = trackAPI('Gemini/OpenAI-Generation');
    try {
      const itinerary = await generatePersonalizedItinerary({
        prompt,
        conversationHistory: '',
        fileContent: null
      });
      
      if (itinerary.success && itinerary.data) {
        result.itinerary = {
          title: itinerary.data.title,
          totalDays: itinerary.data.days.length,
          totalActivities: itinerary.data.days.reduce((sum, day) => sum + day.activities.length, 0),
          generatedAt: new Date().toISOString()
        };
        console.log(`  ✅ Generated: ${itinerary.data.title}`);
        console.log(`  ✅ Days: ${itinerary.data.days.length}`);
        console.log(`  ✅ Activities: ${result.itinerary.totalActivities}`);
      }
      genTracker.end(true);
    } catch (e) {
      genTracker.end(false);
      console.log('  ❌ Itinerary generation failed');
    }
    
  } catch (error: any) {
    console.log(`\n❌ Test Error: ${error.message}`);
  }
  
  // Save results
  const filename = path.join('.searches', `${timestamp}_${testName}.json`);
  fs.writeFileSync(filename, JSON.stringify(result, null, 2));
  
  console.log('\n' + '═'.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(80));
  console.log(`📍 Places Found: ${result.places.restaurants.length + result.places.attractions.length + result.places.museums.length}`);
  console.log(`📸 Photos Collected: ${result.photos.length}`);
  console.log(`🌤️ Weather Days: ${result.weather.length}`);
  console.log(`📡 API Calls: ${result.apiCalls.length}`);
  console.log(`✅ Successful APIs: ${result.apiCalls.filter(c => c.success).length}`);
  console.log(`❌ Failed APIs: ${result.apiCalls.filter(c => !c.success).length}`);
  console.log(`\n💾 Results saved to: ${filename}`);
  console.log('═'.repeat(80));
}

// Run test
runSingleTripTest().catch(console.error);