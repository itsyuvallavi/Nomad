#!/usr/bin/env node

/**
 * Test script for specific venue generation with LocationIQ
 */

const dotenv = require('dotenv');
dotenv.config();

// Test prompt that should generate specific venue names
const testPrompt = "Plan a 2-day trip to Paris for a food lover";

console.log('🧪 Testing Specific Venue Generation');
console.log('=====================================');
console.log('Prompt:', testPrompt);
console.log('');

// Simulate what the AI should generate with our new prompt
const expectedItinerary = {
  destination: "Paris",
  title: "2-Day Culinary Journey in Paris",
  itinerary: [
    {
      day: 1,
      date: "2025-01-15",
      title: "Left Bank Foodie Experience",
      activities: [
        {
          time: "9:00 AM",
          venue_name: "Café de Flore",
          description: "Historic café for breakfast",
          category: "Food",
          venue_search: "Café de Flore Paris",
          neighborhood: "Saint-Germain-des-Prés"
        },
        {
          time: "11:00 AM",
          venue_name: "Marché des Enfants Rouges",
          description: "Oldest covered market in Paris",
          category: "Attraction",
          venue_search: "Marché des Enfants Rouges Paris",
          neighborhood: "3rd arrondissement"
        },
        {
          time: "1:00 PM",
          venue_name: "L'As du Fallafel",
          description: "Famous falafel in the Marais",
          category: "Food",
          venue_search: "L'As du Fallafel Paris",
          neighborhood: "Marais"
        },
        {
          time: "3:00 PM",
          venue_name: "Pierre Hermé",
          description: "World-famous macarons",
          category: "Food",
          venue_search: "Pierre Hermé Paris",
          neighborhood: "Saint-Germain"
        },
        {
          time: "7:00 PM",
          venue_name: "Le Comptoir du Relais",
          description: "Classic bistro dinner",
          category: "Food",
          venue_search: "Le Comptoir du Relais Paris",
          neighborhood: "Saint-Germain"
        }
      ]
    },
    {
      day: 2,
      date: "2025-01-16",
      title: "Montmartre & Classic Parisian Cuisine",
      activities: [
        {
          time: "9:00 AM",
          venue_name: "Du Pain et des Idées",
          description: "Award-winning bakery",
          category: "Food",
          venue_search: "Du Pain et des Idées Paris",
          neighborhood: "10th arrondissement"
        },
        {
          time: "11:00 AM",
          venue_name: "Rue Montorgueil",
          description: "Food market street",
          category: "Attraction",
          venue_search: "Rue Montorgueil Paris",
          neighborhood: "2nd arrondissement"
        },
        {
          time: "1:00 PM",
          venue_name: "L'Ami Jean",
          description: "Basque-influenced bistro",
          category: "Food",
          venue_search: "L'Ami Jean Paris",
          neighborhood: "7th arrondissement"
        },
        {
          time: "3:30 PM",
          venue_name: "Ladurée Champs-Élysées",
          description: "Iconic macaron house",
          category: "Food",
          venue_search: "Ladurée Champs-Élysées",
          neighborhood: "8th arrondissement"
        },
        {
          time: "7:30 PM",
          venue_name: "Le Jules Verne",
          description: "Michelin-starred dining at Eiffel Tower",
          category: "Food",
          venue_search: "Le Jules Verne Eiffel Tower",
          neighborhood: "7th arrondissement"
        }
      ]
    }
  ]
};

console.log('✅ Expected Output Structure:');
console.log(JSON.stringify(expectedItinerary, null, 2));
console.log('');

// Now test with LocationIQ
async function testLocationIQ() {
  // Use dynamic import for node-fetch v3 ESM module
  const fetch = globalThis.fetch || (await import('node-fetch')).default;
  const apiKey = process.env.LOCATIONIQ_API_KEY;

  if (!apiKey) {
    console.error('❌ LOCATIONIQ_API_KEY not found in environment');
    return;
  }

  console.log('🔍 Testing LocationIQ Search for Specific Venues:');
  console.log('');

  // Test a few specific venues
  const testVenues = [
    "Café de Flore Paris",
    "L'As du Fallafel Paris",
    "Pierre Hermé Paris",
    "Le Comptoir du Relais Paris",
    "Du Pain et des Idées Paris"
  ];

  for (const venue of testVenues) {
    try {
      const url = `https://us1.locationiq.com/v1/search?key=${apiKey}&q=${encodeURIComponent(venue)}&format=json&limit=1`;
      const response = await fetch(url);
      const data = await response.json();

      if (data && data.length > 0) {
        console.log(`✅ "${venue}"`);
        console.log(`   Found: ${data[0].display_name}`);
        console.log(`   Type: ${data[0].type}`);
        console.log(`   Coords: ${data[0].lat}, ${data[0].lon}`);
      } else {
        console.log(`❌ "${venue}" - No results`);
      }
    } catch (error) {
      console.log(`❌ "${venue}" - Error: ${error.message}`);
    }

    // Small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('');
  console.log('📝 Summary:');
  console.log('- AI should now generate SPECIFIC venue names');
  console.log('- Each venue should have venue_name and venue_search fields');
  console.log('- LocationIQ can find these specific venues');
  console.log('- This will provide real addresses and coordinates');
}

// Run the test
testLocationIQ().catch(console.error);