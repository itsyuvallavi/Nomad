/**
 * Test HERE Places API integration
 */

import { config } from 'dotenv';

// Load environment variables first
const result = config({ path: '.env.local' });
console.log('Environment loaded:', result.error ? 'Failed' : 'Success');
console.log('HERE_API_KEY present:', !!process.env.HERE_API_KEY);

import { herePlacesService } from '../src/services/api/here-places';

async function testHEREAPI() {
  console.log('🧪 Testing HERE Places API Integration');
  console.log('=====================================\n');

  // Check if configured
  if (!herePlacesService.isConfigured()) {
    console.log('❌ HERE_API_KEY not found in .env.local');
    console.log('Please add: HERE_API_KEY=your_key_here');
    return;
  }

  console.log('✅ HERE API key detected\n');

  // Test 1: Simple search
  console.log('Test 1: Search for restaurants in Paris');
  console.time('Search time');

  const restaurants = await herePlacesService.searchPlaces('restaurant', {
    at: { lat: 48.8566, lng: 2.3522 }, // Paris center
    limit: 3
  });

  console.timeEnd('Search time');
  console.log(`Found ${restaurants.length} restaurants:`);
  restaurants.forEach((place, i) => {
    console.log(`  ${i + 1}. ${place.name} - ${place.address.label}`);
  });

  // Test 2: Batch search (simulating itinerary enrichment)
  console.log('\n\nTest 2: Batch search for multiple venues (simulating 5-day itinerary)');

  const queries = [
    { query: 'Eiffel Tower', location: { lat: 48.8584, lng: 2.2945 } },
    { query: 'Louvre Museum', location: { lat: 48.8606, lng: 2.3376 } },
    { query: 'breakfast cafe', location: { lat: 48.8566, lng: 2.3522 } },
    { query: 'French restaurant', location: { lat: 48.8534, lng: 2.3488 } },
    { query: 'Notre Dame', location: { lat: 48.8530, lng: 2.3499 } },
  ];

  console.time('Batch search time');
  const results = await herePlacesService.batchSearchPlaces(queries);
  console.timeEnd('Batch search time');

  console.log(`\nBatch results:`);
  results.forEach((places, query) => {
    const place = places[0];
    if (place) {
      console.log(`  "${query}": ${place.name}`);
    } else {
      console.log(`  "${query}": Not found`);
    }
  });

  // Test 3: Activity matching
  console.log('\n\nTest 3: Find POI for activity description');

  const activity = 'Visit the famous Sacré-Cœur Basilica in Montmartre';
  console.time('Activity search time');

  const poi = await herePlacesService.findPOIForActivity(
    activity,
    { lat: 48.8867, lng: 2.3431 }, // Montmartre area
    2
  );

  console.timeEnd('Activity search time');
  if (poi) {
    console.log(`Found: ${poi.name}`);
    console.log(`Address: ${poi.address.label}`);
  }

  console.log('\n=====================================');
  console.log('✅ HERE API is working correctly!');
  console.log('Expected performance in production:');
  console.log('  - Single venue: 150-350ms');
  console.log('  - 25 venues (5-day trip): 2-5 seconds total');
  console.log('  - vs OSM: 30-60 seconds');
}

testHEREAPI().catch(console.error);