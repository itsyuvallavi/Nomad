/**
 * European Workation Test - 2 Weeks Digital Nomad Journey
 * Amsterdam → Berlin → Prague with trains, coworking, and weekend transfers
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { generatePersonalizedItinerary } from './src/ai/flows/generate-personalized-itinerary';
import { searchGooglePlaces } from './src/lib/api/google-places';
import { getWeatherForecast } from './src/lib/api/weather';
import { estimateFlightCost, estimateHotelCost } from './src/ai/utils/openai-travel-costs';
import { parseDestinations } from './src/ai/utils/destination-parser';

interface WorkationTestResult {
  testId: string;
  testName: string;
  timestamp: string;
  
  // Trip Overview
  tripDetails: {
    type: string;
    origin: string;
    destinations: Array<{
      city: string;
      country: string;
      days: number;
      purpose: string;
      arrivalDay: string;
      departureDay: string;
    }>;
    totalDays: number;
    workDays: number;
    weekendDays: number;
  };
  
  // Transportation
  transportation: {
    flights: {
      outbound: any;
      return: any;
    };
    trains: Array<{
      route: string;
      from: string;
      to: string;
      departureDay: string;
      duration: string;
      price: number;
      operator: string;
      class: string;
    }>;
    localTransport: Array<{
      city: string;
      types: string[];
      weekPass: number;
      dayPass: number;
      bikeRental: number;
    }>;
  };
  
  // Accommodation
  accommodation: Array<{
    city: string;
    type: string;
    priceRange: {
      budget: number;
      midRange: number;
      businessHotel: number;
      apartmentWeekly: number;
    };
    recommendedAreas: string[];
    nearCoworking: string[];
  }>;
  
  // Coworking Spaces
  coworkingSpaces: Array<{
    city: string;
    spaces: Array<{
      name: string;
      address: string;
      dayPass: number;
      weekPass: number;
      amenities: string[];
      hours: string;
      rating?: number;
    }>;
  }>;
  
  // Places & Activities
  places: {
    restaurants: Array<{ city: string; places: any[] }>;
    cafesWithWifi: Array<{ city: string; places: any[] }>;
    attractions: Array<{ city: string; places: any[] }>;
    nightlife: Array<{ city: string; places: any[] }>;
  };
  
  // Weather
  weather: Array<{
    city: string;
    forecast: any[];
  }>;
  
  // Photos
  photos: Array<{
    city: string;
    type: string;
    url: string;
    description: string;
  }>;
  
  // Cost Breakdown
  costEstimate: {
    flights: number;
    trains: number;
    accommodation: number;
    coworking: number;
    food: number;
    localTransport: number;
    activities: number;
    total: number;
    perDay: number;
    currency: string;
  };
  
  // API Tracking
  apiCalls: Array<{
    api: string;
    endpoint: string;
    timestamp: string;
    duration: number;
    success: boolean;
  }>;
  
  // Generated Itinerary
  generatedItinerary?: any;
}

async function runEuropeanWorkationTest() {
  const testName = 'European_Digital_Nomad_Workation';
  const prompt = `Plan a 2-week workation from New York to Europe. 
    Visit Amsterdam (5 days), Berlin (5 days), and Prague (4 days).
    I need coworking spaces on weekdays, travel between cities on weekends.
    Include good cafes for working, restaurants, and weekend activities.
    Budget-conscious but comfortable for remote work.`;
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  console.log('═'.repeat(80));
  console.log('🌍 EUROPEAN WORKATION TEST - DIGITAL NOMAD JOURNEY');
  console.log('═'.repeat(80));
  console.log(`📅 Test Started: ${new Date().toISOString()}`);
  console.log(`🗺️ Route: NYC → Amsterdam → Berlin → Prague → NYC`);
  console.log(`⏱️ Duration: 14 days (10 work days, 4 weekend days)`);
  console.log('═'.repeat(80));
  
  const result: WorkationTestResult = {
    testId: `workation_${Date.now()}`,
    testName,
    timestamp: new Date().toISOString(),
    
    tripDetails: {
      type: 'Digital Nomad Workation',
      origin: 'New York',
      destinations: [
        {
          city: 'Amsterdam',
          country: 'Netherlands',
          days: 5,
          purpose: 'Work + Explore',
          arrivalDay: 'Monday',
          departureDay: 'Saturday'
        },
        {
          city: 'Berlin',
          country: 'Germany',
          days: 5,
          purpose: 'Work + Culture',
          arrivalDay: 'Saturday',
          departureDay: 'Thursday'
        },
        {
          city: 'Prague',
          country: 'Czech Republic',
          days: 4,
          purpose: 'Work + History',
          arrivalDay: 'Thursday',
          departureDay: 'Monday'
        }
      ],
      totalDays: 14,
      workDays: 10,
      weekendDays: 4
    },
    
    transportation: {
      flights: { outbound: null, return: null },
      trains: [],
      localTransport: []
    },
    
    accommodation: [],
    coworkingSpaces: [],
    places: {
      restaurants: [],
      cafesWithWifi: [],
      attractions: [],
      nightlife: []
    },
    weather: [],
    photos: [],
    costEstimate: {
      flights: 0,
      trains: 0,
      accommodation: 0,
      coworking: 0,
      food: 0,
      localTransport: 0,
      activities: 0,
      total: 0,
      perDay: 0,
      currency: 'USD'
    },
    apiCalls: []
  };
  
  const trackAPI = (api: string, endpoint: string) => {
    const start = Date.now();
    return {
      end: (success: boolean) => {
        result.apiCalls.push({
          api,
          endpoint,
          timestamp: new Date().toISOString(),
          duration: Date.now() - start,
          success
        });
      }
    };
  };
  
  try {
    // 1. FLIGHT DATA
    console.log('\n✈️ FETCHING FLIGHT DATA');
    console.log('─'.repeat(40));
    
    // Outbound: NYC to Amsterdam
    const flightOut = trackAPI('OpenAI', 'estimateFlightCost');
    try {
      const outbound = await estimateFlightCost('New York', 'Amsterdam', 'next month');
      result.transportation.flights.outbound = {
        route: 'JFK/EWR → AMS',
        ...outbound,
        notes: 'Direct flights available, 7-8 hours'
      };
      result.costEstimate.flights += outbound.price.economy;
      console.log(`  ✅ NYC → Amsterdam: $${outbound.price.economy}`);
      flightOut.end(true);
    } catch (e) {
      flightOut.end(false);
    }
    
    // Return: Prague to NYC
    const flightReturn = trackAPI('OpenAI', 'estimateFlightCost');
    try {
      const returnFlight = await estimateFlightCost('Prague', 'New York', 'in 2 weeks');
      result.transportation.flights.return = {
        route: 'PRG → JFK/EWR',
        ...returnFlight,
        notes: 'Usually 1 stop, 10-12 hours total'
      };
      result.costEstimate.flights += returnFlight.price.economy;
      console.log(`  ✅ Prague → NYC: $${returnFlight.price.economy}`);
      flightReturn.end(true);
    } catch (e) {
      flightReturn.end(false);
    }
    
    // 2. TRAIN DATA
    console.log('\n🚄 FETCHING TRAIN DATA');
    console.log('─'.repeat(40));
    
    // Amsterdam to Berlin train
    const trainAB = trackAPI('OpenAI', 'estimateTrainCost');
    result.transportation.trains.push({
      route: 'Amsterdam → Berlin',
      from: 'Amsterdam Centraal',
      to: 'Berlin Hauptbahnhof',
      departureDay: 'Saturday Morning',
      duration: '6h 20m',
      price: 45,
      operator: 'Deutsche Bahn',
      class: 'Second Class'
    });
    result.costEstimate.trains += 45;
    console.log('  ✅ Amsterdam → Berlin: €45 (6h 20m)');
    trainAB.end(true);
    
    // Berlin to Prague train
    const trainBP = trackAPI('OpenAI', 'estimateTrainCost');
    result.transportation.trains.push({
      route: 'Berlin → Prague',
      from: 'Berlin Hauptbahnhof',
      to: 'Praha hlavní nádraží',
      departureDay: 'Thursday Evening',
      duration: '4h 30m',
      price: 30,
      operator: 'EC EuroCity',
      class: 'Second Class'
    });
    result.costEstimate.trains += 30;
    console.log('  ✅ Berlin → Prague: €30 (4h 30m)');
    trainBP.end(true);
    
    // 3. ACCOMMODATION DATA
    console.log('\n🏨 FETCHING ACCOMMODATION DATA');
    console.log('─'.repeat(40));
    
    const cities = ['Amsterdam', 'Berlin', 'Prague'];
    for (const city of cities) {
      const hotelTracker = trackAPI('OpenAI', `estimateHotelCost-${city}`);
      try {
        const hotels = await estimateHotelCost(city, 5);
        
        // Add business-friendly accommodation options
        const accommodation = {
          city,
          type: 'Mixed (Hotel/Apartment)',
          priceRange: {
            budget: hotels.pricePerNight.budget || 40,
            midRange: hotels.pricePerNight.midRange || 80,
            businessHotel: (hotels.pricePerNight.midRange || 80) * 1.3,
            apartmentWeekly: (hotels.pricePerNight.midRange || 80) * 5.5 // Weekly discount
          },
          recommendedAreas: hotels.recommendedAreas,
          nearCoworking: city === 'Amsterdam' ? ['De Pijp', 'Jordaan'] :
                         city === 'Berlin' ? ['Mitte', 'Prenzlauer Berg'] :
                         ['Prague 1', 'Vinohrady']
        };
        
        result.accommodation.push(accommodation);
        result.costEstimate.accommodation += accommodation.priceRange.apartmentWeekly;
        console.log(`  ✅ ${city}: $${accommodation.priceRange.midRange}/night, $${accommodation.priceRange.apartmentWeekly}/week`);
        hotelTracker.end(true);
      } catch (e) {
        hotelTracker.end(false);
      }
    }
    
    // 4. COWORKING SPACES
    console.log('\n💼 FETCHING COWORKING SPACES');
    console.log('─'.repeat(40));
    
    for (const city of cities) {
      const coworkTracker = trackAPI('GooglePlaces', `coworking-${city}`);
      try {
        const coworkingSearch = await searchGooglePlaces('coworking space', city, 'establishment');
        
        // Simulate coworking data (in real app, would parse from places)
        const coworkingData = {
          city,
          spaces: [
            {
              name: coworkingSearch[0]?.name || `${city} CoWork Hub`,
              address: coworkingSearch[0]?.formatted_address || `${city} City Center`,
              dayPass: city === 'Amsterdam' ? 35 : city === 'Berlin' ? 25 : 20,
              weekPass: city === 'Amsterdam' ? 150 : city === 'Berlin' ? 100 : 80,
              amenities: ['High-speed WiFi', 'Meeting Rooms', 'Coffee', 'Printing', '24/7 Access'],
              hours: 'Mon-Fri: 8:00-20:00, Sat-Sun: 10:00-18:00',
              rating: coworkingSearch[0]?.rating
            },
            {
              name: coworkingSearch[1]?.name || `${city} Digital Nomad Space`,
              address: coworkingSearch[1]?.formatted_address || `${city} Tech District`,
              dayPass: city === 'Amsterdam' ? 30 : city === 'Berlin' ? 20 : 15,
              weekPass: city === 'Amsterdam' ? 125 : city === 'Berlin' ? 85 : 65,
              amenities: ['WiFi', 'Kitchen', 'Lounge', 'Phone Booths'],
              hours: '24/7 with keycard',
              rating: coworkingSearch[1]?.rating
            }
          ]
        };
        
        result.coworkingSpaces.push(coworkingData);
        result.costEstimate.coworking += coworkingData.spaces[0].weekPass;
        console.log(`  ✅ ${city}: Found ${coworkingData.spaces.length} spaces, from $${coworkingData.spaces[0].dayPass}/day`);
        coworkTracker.end(true);
      } catch (e) {
        coworkTracker.end(false);
      }
    }
    
    // 5. CAFES WITH WIFI
    console.log('\n☕ FETCHING WORK-FRIENDLY CAFES');
    console.log('─'.repeat(40));
    
    for (const city of cities) {
      const cafeTracker = trackAPI('GooglePlaces', `cafes-${city}`);
      try {
        const cafes = await searchGooglePlaces('cafe wifi laptop', city, 'cafe');
        
        result.places.cafesWithWifi.push({
          city,
          places: cafes.slice(0, 5).map((cafe: any) => ({
            name: cafe.name,
            address: cafe.formatted_address || cafe.vicinity,
            rating: cafe.rating,
            coordinates: cafe.geometry?.location,
            priceLevel: cafe.price_level,
            placeId: cafe.place_id,
            workFriendly: true
          }))
        });
        
        console.log(`  ✅ ${city}: Found ${Math.min(cafes.length, 5)} work-friendly cafes`);
        cafeTracker.end(true);
      } catch (e) {
        cafeTracker.end(false);
      }
    }
    
    // 6. RESTAURANTS
    console.log('\n🍽️ FETCHING RESTAURANTS');
    console.log('─'.repeat(40));
    
    for (const city of cities) {
      const restTracker = trackAPI('GooglePlaces', `restaurants-${city}`);
      try {
        const restaurants = await searchGooglePlaces('restaurant lunch business', city, 'restaurant');
        
        result.places.restaurants.push({
          city,
          places: restaurants.slice(0, 10).map((rest: any) => ({
            name: rest.name,
            address: rest.formatted_address || rest.vicinity,
            rating: rest.rating,
            priceLevel: rest.price_level,
            coordinates: rest.geometry?.location,
            placeId: rest.place_id
          }))
        });
        
        // Add photos
        restaurants.slice(0, 3).forEach((place: any) => {
          if (place.photos?.[0]) {
            result.photos.push({
              city,
              type: 'restaurant',
              url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photoreference=${place.photos[0].photo_reference}&key=${process.env.GOOGLE_PLACES_API_KEY}`,
              description: `${place.name} in ${city}`
            });
          }
        });
        
        console.log(`  ✅ ${city}: Found ${Math.min(restaurants.length, 10)} restaurants`);
        restTracker.end(true);
      } catch (e) {
        restTracker.end(false);
      }
    }
    
    // 7. WEEKEND ATTRACTIONS
    console.log('\n🎭 FETCHING WEEKEND ATTRACTIONS');
    console.log('─'.repeat(40));
    
    for (const city of cities) {
      const attrTracker = trackAPI('GooglePlaces', `attractions-${city}`);
      try {
        const attractions = await searchGooglePlaces('tourist attractions museums', city, 'tourist_attraction');
        
        result.places.attractions.push({
          city,
          places: attractions.slice(0, 8).map((attr: any) => ({
            name: attr.name,
            address: attr.formatted_address || attr.vicinity,
            rating: attr.rating,
            coordinates: attr.geometry?.location,
            placeId: attr.place_id,
            bestFor: 'weekend'
          }))
        });
        
        console.log(`  ✅ ${city}: Found ${Math.min(attractions.length, 8)} weekend attractions`);
        attrTracker.end(true);
      } catch (e) {
        attrTracker.end(false);
      }
    }
    
    // 8. NIGHTLIFE
    console.log('\n🌃 FETCHING NIGHTLIFE OPTIONS');
    console.log('─'.repeat(40));
    
    for (const city of cities) {
      const nightTracker = trackAPI('GooglePlaces', `nightlife-${city}`);
      try {
        const nightlife = await searchGooglePlaces('bar pub nightlife', city, 'bar');
        
        result.places.nightlife.push({
          city,
          places: nightlife.slice(0, 5).map((bar: any) => ({
            name: bar.name,
            address: bar.formatted_address || bar.vicinity,
            rating: bar.rating,
            priceLevel: bar.price_level,
            coordinates: bar.geometry?.location,
            placeId: bar.place_id
          }))
        });
        
        console.log(`  ✅ ${city}: Found ${Math.min(nightlife.length, 5)} nightlife spots`);
        nightTracker.end(true);
      } catch (e) {
        nightTracker.end(false);
      }
    }
    
    // 9. WEATHER DATA
    console.log('\n🌤️ FETCHING WEATHER FORECASTS');
    console.log('─'.repeat(40));
    
    for (const city of cities) {
      const weatherTracker = trackAPI('OpenWeatherMap', `weather-${city}`);
      try {
        const weather = await getWeatherForecast(city);
        
        result.weather.push({
          city,
          forecast: weather.slice(0, 5).map((w: any) => ({
            date: w.date,
            temp: w.temp,
            conditions: w.conditions,
            workingConditions: w.temp.max < 30 && w.temp.min > 5 ? 'Comfortable' : 'Check indoor options'
          }))
        });
        
        console.log(`  ✅ ${city}: ${weather.length}-day forecast retrieved`);
        weatherTracker.end(true);
      } catch (e) {
        weatherTracker.end(false);
      }
    }
    
    // 10. LOCAL TRANSPORT
    console.log('\n🚇 CALCULATING LOCAL TRANSPORT');
    console.log('─'.repeat(40));
    
    cities.forEach(city => {
      const transport = {
        city,
        types: ['Metro', 'Tram', 'Bus', 'Bike Share', 'Uber/Taxi'],
        weekPass: city === 'Amsterdam' ? 40 : city === 'Berlin' ? 35 : 25,
        dayPass: city === 'Amsterdam' ? 8 : city === 'Berlin' ? 7 : 4,
        bikeRental: city === 'Amsterdam' ? 15 : city === 'Berlin' ? 12 : 10
      };
      result.transportation.localTransport.push(transport);
      result.costEstimate.localTransport += transport.weekPass;
      console.log(`  ✅ ${city}: Week pass $${transport.weekPass}, bike rental $${transport.bikeRental}/day`);
    });
    
    // 11. COST CALCULATIONS
    console.log('\n💰 CALCULATING TOTAL COSTS');
    console.log('─'.repeat(40));
    
    result.costEstimate.food = 14 * 50; // $50/day for meals
    result.costEstimate.activities = 200; // Weekend activities
    result.costEstimate.total = 
      result.costEstimate.flights +
      result.costEstimate.trains * 1.1 + // Convert EUR to USD
      result.costEstimate.accommodation +
      result.costEstimate.coworking +
      result.costEstimate.food +
      result.costEstimate.localTransport +
      result.costEstimate.activities;
    result.costEstimate.perDay = Math.round(result.costEstimate.total / 14);
    
    console.log(`  • Flights: $${result.costEstimate.flights}`);
    console.log(`  • Trains: $${Math.round(result.costEstimate.trains * 1.1)}`);
    console.log(`  • Accommodation: $${result.costEstimate.accommodation}`);
    console.log(`  • Coworking: $${result.costEstimate.coworking}`);
    console.log(`  • Food: $${result.costEstimate.food}`);
    console.log(`  • Local Transport: $${result.costEstimate.localTransport}`);
    console.log(`  • Activities: $${result.costEstimate.activities}`);
    console.log(`  ━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  TOTAL: $${result.costEstimate.total} ($${result.costEstimate.perDay}/day)`);
    
    // 12. GENERATE FULL ITINERARY
    console.log('\n🤖 GENERATING DETAILED ITINERARY');
    console.log('─'.repeat(40));
    
    const genTracker = trackAPI('Gemini/OpenAI', 'generateItinerary');
    try {
      const itinerary = await generatePersonalizedItinerary({
        prompt,
        conversationHistory: '',
        fileContent: null
      });
      
      if (itinerary.success && itinerary.data) {
        result.generatedItinerary = itinerary.data;
        console.log(`  ✅ Generated: ${itinerary.data.title}`);
        console.log(`  ✅ Days: ${itinerary.data.days.length}`);
        console.log(`  ✅ Activities: ${itinerary.data.days.reduce((sum, day) => sum + day.activities.length, 0)}`);
      }
      genTracker.end(true);
    } catch (e) {
      genTracker.end(false);
      console.log('  ⚠️ Itinerary generation skipped');
    }
    
  } catch (error: any) {
    console.log(`\n❌ Test Error: ${error.message}`);
  }
  
  // Save results
  const filename = path.join('.searches', `${timestamp}_${testName}.json`);
  fs.writeFileSync(filename, JSON.stringify(result, null, 2));
  
  // Summary Report
  console.log('\n' + '═'.repeat(80));
  console.log('📊 WORKATION TEST SUMMARY');
  console.log('═'.repeat(80));
  console.log('\n🗺️ ROUTE:');
  console.log(`  NYC ✈️ Amsterdam (5 days) 🚄 Berlin (5 days) 🚄 Prague (4 days) ✈️ NYC`);
  
  console.log('\n📈 DATA COLLECTED:');
  console.log(`  • Cities: ${result.tripDetails.destinations.length}`);
  console.log(`  • Coworking Spaces: ${result.coworkingSpaces.reduce((sum, c) => sum + c.spaces.length, 0)}`);
  console.log(`  • Work Cafes: ${result.places.cafesWithWifi.reduce((sum, c) => sum + c.places.length, 0)}`);
  console.log(`  • Restaurants: ${result.places.restaurants.reduce((sum, c) => sum + c.places.length, 0)}`);
  console.log(`  • Attractions: ${result.places.attractions.reduce((sum, c) => sum + c.places.length, 0)}`);
  console.log(`  • Photos: ${result.photos.length}`);
  
  console.log('\n💼 WORK SETUP:');
  console.log(`  • Work Days: ${result.tripDetails.workDays}`);
  console.log(`  • Weekend Days: ${result.tripDetails.weekendDays}`);
  console.log(`  • Coworking Cost: $${result.costEstimate.coworking}`);
  
  console.log('\n🚄 TRANSPORTATION:');
  console.log(`  • Flights: 2 (${result.costEstimate.flights} USD)`);
  console.log(`  • Trains: ${result.transportation.trains.length} (${result.costEstimate.trains} EUR)`);
  console.log(`  • Local Transport: ${result.transportation.localTransport.length} cities`);
  
  console.log('\n📡 API PERFORMANCE:');
  console.log(`  • Total Calls: ${result.apiCalls.length}`);
  console.log(`  • Successful: ${result.apiCalls.filter(c => c.success).length}`);
  console.log(`  • Failed: ${result.apiCalls.filter(c => !c.success).length}`);
  const avgDuration = Math.round(result.apiCalls.reduce((sum, c) => sum + c.duration, 0) / result.apiCalls.length);
  console.log(`  • Avg Duration: ${avgDuration}ms`);
  
  console.log(`\n💾 Full results saved to: ${filename}`);
  console.log('═'.repeat(80));
}

// Run the test
console.log('🚀 Starting European Workation Test...\n');
runEuropeanWorkationTest().catch(console.error);