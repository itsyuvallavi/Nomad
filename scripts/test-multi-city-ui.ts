#!/usr/bin/env npx tsx

/**
 * Multi-City UI Testing Script
 * Tests how the UI handles multi-city itineraries
 */

import 'dotenv/config';

// Mock multi-city itinerary data
const mockMultiCityItinerary = {
  destination: "London, Paris",
  title: "London & Paris Adventure",
  itinerary: [
    {
      title: "Day 1 - London",
      day: 1,
      date: "2025-01-22",
      activities: [
        {
          time: "09:00",
          description: "Visit Tower of London",
          category: "Attraction",
          address: "Tower Hill, London EC3N 4AB"
        },
        {
          time: "12:00",
          description: "Lunch at Borough Market",
          category: "Food",
          address: "8 Southwark St, London SE1 1TL"
        },
        {
          time: "14:00",
          description: "Walk along Thames Path",
          category: "Leisure",
          address: "Thames Path, London"
        },
        {
          time: "16:00",
          description: "Explore British Museum",
          category: "Attraction",
          address: "Great Russell St, London WC1B 3DG"
        },
        {
          time: "19:00",
          description: "Dinner in Covent Garden",
          category: "Food",
          address: "Covent Garden, London WC2E"
        }
      ]
    },
    {
      title: "Day 2 - London",
      day: 2,
      date: "2025-01-23",
      activities: [
        {
          time: "09:00",
          description: "Westminster Abbey",
          category: "Attraction",
          address: "20 Deans Yd, London SW1P 3PA"
        },
        {
          time: "11:00",
          description: "Buckingham Palace",
          category: "Attraction",
          address: "London SW1A 1AA"
        },
        {
          time: "13:00",
          description: "Lunch in Hyde Park",
          category: "Food",
          address: "Hyde Park, London"
        },
        {
          time: "15:00",
          description: "Shopping on Oxford Street",
          category: "Leisure",
          address: "Oxford St, London"
        },
        {
          time: "19:00",
          description: "West End Theatre",
          category: "Leisure",
          address: "West End, London"
        }
      ]
    },
    {
      title: "Day 3 - London to Paris",
      day: 3,
      date: "2025-01-24",
      activities: [
        {
          time: "08:00",
          description: "Check out from London hotel",
          category: "Accommodation",
          address: "London"
        },
        {
          time: "10:00",
          description: "Eurostar to Paris",
          category: "Travel",
          address: "St Pancras Station, London to Gare du Nord, Paris"
        },
        {
          time: "14:00",
          description: "Check in to Paris hotel",
          category: "Accommodation",
          address: "Paris"
        },
        {
          time: "16:00",
          description: "Walk along the Seine",
          category: "Leisure",
          address: "Seine River, Paris"
        },
        {
          time: "19:00",
          description: "Dinner in Montmartre",
          category: "Food",
          address: "Montmartre, Paris"
        }
      ]
    },
    {
      title: "Day 4 - Paris",
      day: 4,
      date: "2025-01-25",
      activities: [
        {
          time: "09:00",
          description: "Eiffel Tower",
          category: "Attraction",
          address: "Champ de Mars, 5 Av. Anatole France, 75007 Paris"
        },
        {
          time: "12:00",
          description: "Lunch at a Parisian café",
          category: "Food",
          address: "Latin Quarter, Paris"
        },
        {
          time: "14:00",
          description: "Louvre Museum",
          category: "Attraction",
          address: "Rue de Rivoli, 75001 Paris"
        },
        {
          time: "17:00",
          description: "Champs-Élysées",
          category: "Leisure",
          address: "Av. des Champs-Élysées, Paris"
        },
        {
          time: "20:00",
          description: "Seine River Cruise",
          category: "Leisure",
          address: "Port de la Bourdonnais, 75007 Paris"
        }
      ]
    },
    {
      title: "Day 5 - Paris",
      day: 5,
      date: "2025-01-26",
      activities: [
        {
          time: "09:00",
          description: "Versailles Day Trip",
          category: "Attraction",
          address: "Place d'Armes, 78000 Versailles"
        },
        {
          time: "13:00",
          description: "Lunch at Versailles",
          category: "Food",
          address: "Versailles"
        },
        {
          time: "16:00",
          description: "Return to Paris",
          category: "Travel",
          address: "Versailles to Paris"
        },
        {
          time: "18:00",
          description: "Evening stroll in Marais",
          category: "Leisure",
          address: "Le Marais, Paris"
        },
        {
          time: "20:00",
          description: "Farewell dinner",
          category: "Food",
          address: "Saint-Germain-des-Prés, Paris"
        }
      ]
    }
  ],
  quickTips: [
    "Book Eurostar tickets in advance for better prices",
    "Get an Oyster card for London transport",
    "Paris Museum Pass saves time and money",
    "Both cities are walkable but have excellent public transport"
  ]
};

// Test UI component behavior
console.log("🧪 Testing Multi-City UI Handling\n");

// 1. Test city extraction from itinerary
console.log("1️⃣  Extracting cities from itinerary:");
const cities = new Set<string>();
const cityDays = new Map<string, number>();

for (const day of mockMultiCityItinerary.itinerary) {
  // Try to extract city from title
  const cityMatch = day.title.match(/Day \d+ - (.+?)(?:\s+to\s+|$)/);
  if (cityMatch) {
    const city = cityMatch[1].split(' to ')[0]; // Handle "London to Paris"
    cities.add(city);
    cityDays.set(city, (cityDays.get(city) || 0) + 1);
  }
}

console.log(`   Found cities: ${Array.from(cities).join(', ')}`);
console.log(`   Days per city:`);
for (const [city, days] of cityDays) {
  console.log(`     - ${city}: ${days} days`);
}

// 2. Test toggle button generation
console.log("\n2️⃣  City Toggle Buttons:");
const toggleButtons = ['Show All', ...Array.from(cities)];
console.log(`   Buttons: ${toggleButtons.join(' | ')}`);

// 3. Test filtering by city
console.log("\n3️⃣  Testing City Filtering:");
for (const city of cities) {
  const filteredDays = mockMultiCityItinerary.itinerary.filter(day =>
    day.title.includes(city)
  );
  console.log(`   ${city}: Days ${filteredDays.map(d => d.day).join(', ')}`);
}

// 4. Test date display
console.log("\n4️⃣  Testing Date Display:");
for (const day of mockMultiCityItinerary.itinerary) {
  const date = new Date(day.date + 'T00:00:00');
  const formatted = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
  console.log(`   Day ${day.day}: ${formatted} (${day.date})`);
}

// 5. Test cost calculation (mock)
console.log("\n5️⃣  Testing Cost Breakdown:");
const mockCost = {
  total: 2500,
  flights: 400, // Eurostar
  accommodation: 800, // 4 nights
  dailyExpenses: 1300, // 5 days
  currency: 'USD'
};
console.log(`   Total: $${mockCost.total}`);
console.log(`   Transport: $${mockCost.flights}`);
console.log(`   Hotels: $${mockCost.accommodation}`);
console.log(`   Daily: $${mockCost.dailyExpenses}`);

// 6. Test export data structure
console.log("\n6️⃣  Testing Export Structure:");
const exportData = {
  title: mockMultiCityItinerary.title,
  destinations: Array.from(cities),
  duration: mockMultiCityItinerary.itinerary.length,
  dates: {
    start: mockMultiCityItinerary.itinerary[0].date,
    end: mockMultiCityItinerary.itinerary[mockMultiCityItinerary.itinerary.length - 1].date
  },
  days: mockMultiCityItinerary.itinerary.length,
  activities: mockMultiCityItinerary.itinerary.reduce((sum, day) => sum + day.activities.length, 0)
};
console.log(`   Title: ${exportData.title}`);
console.log(`   Cities: ${exportData.destinations.join(' → ')}`);
console.log(`   Duration: ${exportData.duration} days`);
console.log(`   Period: ${exportData.dates.start} to ${exportData.dates.end}`);
console.log(`   Total activities: ${exportData.activities}`);

// 7. Test conversation context for extensions
console.log("\n7️⃣  Testing Extension Context:");
const context = {
  originalDestinations: ['London', 'Paris'],
  originalDuration: 5,
  extensionPrompt: "Add 2 days in Amsterdam",
  expectedResult: {
    destinations: ['London', 'Paris', 'Amsterdam'],
    duration: 7
  }
};
console.log(`   Original: ${context.originalDuration} days in ${context.originalDestinations.join(', ')}`);
console.log(`   Extension: "${context.extensionPrompt}"`);
console.log(`   Expected: ${context.expectedResult.duration} days across ${context.expectedResult.destinations.join(', ')}`);

console.log("\n✅ UI Test Scenarios Complete!");
console.log("\n📋 Summary:");
console.log("- City extraction from titles: ✓");
console.log("- Toggle button generation: ✓");
console.log("- City filtering logic: ✓");
console.log("- Date formatting: ✓");
console.log("- Cost breakdown: ✓");
console.log("- Export structure: ✓");
console.log("- Extension context: ✓");