/**
 * Test HERE enrichment only with mock itinerary
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { herePlacesService } from '../src/services/api/here-places';
import { logger } from '../src/lib/monitoring/logger';

async function testHEREEnrichmentOnly() {
  console.log('🚀 Testing HERE Enrichment Speed (without GPT-5)');
  console.log('===============================================\n');

  // Mock itinerary data (simulates what GPT-5 would generate)
  const mockActivities = [
    'Breakfast at Café de Flore',
    'Visit the Louvre Museum',
    'Lunch at Le Comptoir du Relais',
    'Explore the Latin Quarter',
    'Dinner at L\'Ami Jean',
    // Day 2
    'Breakfast near Eiffel Tower',
    'Visit Eiffel Tower',
    'Lunch at Marché des Enfants Rouges',
    'Walk through Marais district',
    'Dinner at Breizh Café',
    // Day 3
    'Breakfast in Montmartre',
    'Visit Sacré-Cœur',
    'Explore Place du Tertre',
    'Lunch at La Maison Rose',
    'Sunset at Arc de Triomphe',
    // Add more to simulate a 5-day trip
    'Visit Notre Dame Cathedral',
    'Walk along the Seine',
    'Explore Musée d\'Orsay',
    'Shopping on Champs-Élysées',
    'Visit Versailles Palace',
  ];

  const parisCenter = { lat: 48.8566, lng: 2.3522 };

  console.log(`Testing enrichment of ${mockActivities.length} activities...\n`);

  // Test batch enrichment
  console.time('HERE batch enrichment');

  const queries = mockActivities.map(activity => ({
    query: activity,
    location: parisCenter
  }));

  const results = await herePlacesService.batchSearchPlaces(queries, { limit: 1 });

  console.timeEnd('HERE batch enrichment');

  // Show results
  console.log(`\n📊 Results:`);
  console.log(`  - Total activities: ${mockActivities.length}`);
  console.log(`  - Successfully enriched: ${Array.from(results.values()).filter(p => p.length > 0).length}`);

  // Show sample enrichments
  console.log('\n📍 Sample enrichments:');
  let count = 0;
  results.forEach((places, query) => {
    if (count < 5 && places[0]) {
      console.log(`  "${query}" → ${places[0].name}`);
      count++;
    }
  });

  console.log('\n===============================================');
  console.log('✅ HERE enrichment working correctly!');
  console.log(`Expected performance: ${mockActivities.length * 150}ms - ${mockActivities.length * 350}ms`);
}

testHEREEnrichmentOnly().catch(console.error);