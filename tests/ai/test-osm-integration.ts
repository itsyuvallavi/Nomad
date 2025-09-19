/**
 * Test OSM POI Service Integration
 * Verifies that real venue data is being fetched and integrated
 */

import { osmPOIService } from '@/services/ai/services/osm-poi-service';
import { TripGenerator } from '@/services/ai/trip-generator';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

console.log('🗺️  TESTING OSM INTEGRATION\n');
console.log('=' . repeat(50));

async function testOSMService() {
  console.log('\n1️⃣ Testing Direct OSM POI Queries');
  console.log('-'.repeat(40));

  // Test 1: Find restaurants in London
  try {
    console.log('\n📍 Finding restaurants near Westminster, London...');
    const londonZone = {
      name: 'Westminster',
      center: { lat: 51.4994, lng: -0.1248 },
      radiusKm: 1
    };

    const restaurants = await osmPOIService.findPOIsByActivity('dinner', londonZone, 3);

    if (restaurants.length > 0) {
      console.log(`✅ Found ${restaurants.length} restaurants:`);
      restaurants.forEach(r => {
        console.log(`   - ${r.name} (${r.address || 'no address'})`);
        if (r.cuisine) console.log(`     Cuisine: ${r.cuisine}`);
        if (r.website) console.log(`     Website: ${r.website}`);
      });
    } else {
      console.log('⚠️  No restaurants found (might be using fallback)');
    }
  } catch (error) {
    console.error('❌ Failed to query restaurants:', error);
  }

  // Test 2: Find museums in Paris
  try {
    console.log('\n📍 Finding museums near Central Paris...');
    const parisZone = {
      name: 'Central Paris',
      center: { lat: 48.8566, lng: 2.3522 },
      radiusKm: 2
    };

    const museums = await osmPOIService.findPOIsByActivity('museum', parisZone, 3);

    if (museums.length > 0) {
      console.log(`✅ Found ${museums.length} museums:`);
      museums.forEach(m => {
        console.log(`   - ${m.name}`);
        console.log(`     Location: ${m.coordinates.lat.toFixed(4)}, ${m.coordinates.lng.toFixed(4)}`);
      });
    } else {
      console.log('⚠️  No museums found');
    }
  } catch (error) {
    console.error('❌ Failed to query museums:', error);
  }

  // Test 3: Activity matching
  try {
    console.log('\n📍 Testing activity description matching...');
    const tokyoZone = {
      name: 'Shibuya',
      center: { lat: 35.6580, lng: 139.7016 },
      radiusKm: 1
    };

    const activities = [
      'Morning: Enjoy breakfast at a local café',
      'Visit the famous Shibuya crossing',
      'Lunch at a traditional ramen shop',
      'Explore Meiji Shrine and surrounding gardens'
    ];

    for (const activity of activities) {
      const poi = await osmPOIService.matchPOIToActivity(activity, tokyoZone);
      if (poi) {
        console.log(`✅ Matched: "${activity.substring(0, 40)}..."`);
        console.log(`   → ${poi.name} (${poi.category})`);
      } else {
        console.log(`⚠️  No match for: "${activity.substring(0, 40)}..."`);
      }
    }
  } catch (error) {
    console.error('❌ Failed activity matching:', error);
  }
}

async function testTripGeneratorIntegration() {
  console.log('\n2️⃣ Testing Trip Generator with OSM Integration');
  console.log('-'.repeat(40));

  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️  Skipping Trip Generator test - No OpenAI API key');
    return;
  }

  const generator = new TripGenerator();

  try {
    console.log('\n🏙️  Generating London itinerary with OSM enrichment...');

    const params = {
      destination: 'London',
      startDate: '2025-02-01',
      duration: 2,
      preferences: {
        interests: ['museums', 'history', 'food'],
        pace: 'moderate' as const
      }
    };

    const start = Date.now();
    const itinerary = await generator.generateItinerary(params);
    const elapsed = Date.now() - start;

    console.log(`✅ Generated in ${(elapsed/1000).toFixed(1)}s`);
    console.log(`   Title: ${itinerary.title}`);
    console.log(`   Days: ${itinerary.itinerary?.length || 0}`);

    // Check for OSM enrichment
    let osmCount = 0;
    let totalActivities = 0;

    itinerary.itinerary?.forEach((day, i) => {
      console.log(`\n   Day ${i + 1}: ${day.theme}`);
      day.activities?.forEach(activity => {
        totalActivities++;
        // Check for any POI data (osm_id, venue_name, or coordinates)
        const hasPOI = activity.osm_id || activity.venue_name || (activity.coordinates && activity.coordinates.lat);

        if (hasPOI) {
          osmCount++;
          const name = activity.venue_name || activity.description.substring(0, 30);
          console.log(`     ✅ ${name}`);
          if (activity.address) console.log(`        📍 ${activity.address}`);
          if (activity.website) console.log(`        🌐 ${activity.website}`);
        } else {
          console.log(`     ⚠️  ${activity.description.substring(0, 40)}... (no POI)`);
        }
      });
    });

    console.log(`\n📊 OSM Enrichment: ${osmCount}/${totalActivities} activities have real venues`);

    if (osmCount > 0) {
      console.log('✅ OSM integration working!');
    } else {
      console.log('⚠️  No OSM venues found - check if Overpass API is accessible');
    }

  } catch (error) {
    console.error('❌ Failed to generate itinerary:', error);
  }
}

async function testOverpassConnectivity() {
  console.log('\n3️⃣ Testing Overpass API Connectivity');
  console.log('-'.repeat(40));

  try {
    console.log('🌐 Checking Overpass API...');

    // Simple query for a known landmark
    const query = `
      [out:json][timeout:10];
      node["name"="Big Ben"](51.5007,-0.1246,51.5107,-0.1146);
      out body;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`
    });

    if (response.ok) {
      const data = await response.json();
      if (data.elements && data.elements.length > 0) {
        console.log('✅ Overpass API is accessible');
        console.log(`   Found: ${data.elements[0].tags?.name || 'landmark'}`);
      } else {
        console.log('⚠️  Overpass API responded but no data found');
      }
    } else {
      console.log(`❌ Overpass API error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('❌ Failed to connect to Overpass API:', error);
    console.log('   This might be a network issue or the API might be down');
  }
}

// Run all tests
async function runTests() {
  await testOverpassConnectivity();
  await testOSMService();
  await testTripGeneratorIntegration();

  console.log('\n' + '=' . repeat(50));
  console.log('📊 OSM INTEGRATION TEST COMPLETE');
  console.log('\nNext Steps:');
  console.log('1. If Overpass API is not accessible, consider:');
  console.log('   - Using a different Overpass instance');
  console.log('   - Implementing caching for common queries');
  console.log('   - Adding more comprehensive fallback data');
  console.log('2. Test with the UI to see real venues in generated itineraries');
  console.log('3. Monitor performance - OSM queries add latency');
}

runTests().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});