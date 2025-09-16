#!/usr/bin/env node

/**
 * Test script for route optimization
 * Ensures itineraries flow logically without zigzagging
 */

const dotenv = require('dotenv');
dotenv.config();

console.log('🗺️  Testing Route Optimization');
console.log('================================');
console.log('');

// Example of BAD itinerary (zigzagging)
const badItinerary = {
  day: 1,
  activities: [
    {
      time: "9:00 AM",
      venue_name: "Eiffel Tower",
      neighborhood: "7th arrondissement",
      coordinates: { lat: 48.8584, lng: 2.2945 }
    },
    {
      time: "11:00 AM",
      venue_name: "Sacré-Cœur",
      neighborhood: "Montmartre (18th)",
      coordinates: { lat: 48.8867, lng: 2.3431 }
    },
    {
      time: "1:00 PM",
      venue_name: "Notre-Dame",
      neighborhood: "4th arrondissement",
      coordinates: { lat: 48.8530, lng: 2.3499 }
    },
    {
      time: "3:00 PM",
      venue_name: "Arc de Triomphe",
      neighborhood: "8th arrondissement",
      coordinates: { lat: 48.8738, lng: 2.2950 }
    },
    {
      time: "5:00 PM",
      venue_name: "Panthéon",
      neighborhood: "5th arrondissement",
      coordinates: { lat: 48.8462, lng: 2.3464 }
    }
  ]
};

// Example of GOOD itinerary (logical flow)
const goodItinerary = {
  day: 1,
  activities: [
    {
      time: "9:00 AM",
      venue_name: "Eiffel Tower",
      neighborhood: "7th arrondissement",
      coordinates: { lat: 48.8584, lng: 2.2945 }
    },
    {
      time: "11:00 AM",
      venue_name: "Arc de Triomphe",
      neighborhood: "8th arrondissement",
      coordinates: { lat: 48.8738, lng: 2.2950 }
    },
    {
      time: "1:00 PM",
      venue_name: "Louvre Museum",
      neighborhood: "1st arrondissement",
      coordinates: { lat: 48.8606, lng: 2.3376 }
    },
    {
      time: "3:00 PM",
      venue_name: "Notre-Dame",
      neighborhood: "4th arrondissement",
      coordinates: { lat: 48.8530, lng: 2.3499 }
    },
    {
      time: "5:00 PM",
      venue_name: "Panthéon",
      neighborhood: "5th arrondissement",
      coordinates: { lat: 48.8462, lng: 2.3464 }
    }
  ]
};

/**
 * Calculate distance between coordinates
 */
function calculateDistance(coord1, coord2) {
  const R = 6371; // km
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Calculate total travel distance for an itinerary
 */
function calculateTotalDistance(activities) {
  let total = 0;
  for (let i = 0; i < activities.length - 1; i++) {
    if (activities[i].coordinates && activities[i + 1].coordinates) {
      total += calculateDistance(activities[i].coordinates, activities[i + 1].coordinates);
    }
  }
  return total;
}

/**
 * Analyze route efficiency
 */
function analyzeRoute(itinerary, label) {
  console.log(`\n📍 ${label}:`);
  console.log('------------------------');

  const activities = itinerary.activities;
  let totalDistance = 0;
  const distances = [];

  // Show the route
  console.log('\nRoute:');
  activities.forEach((activity, index) => {
    console.log(`${index + 1}. ${activity.time} - ${activity.venue_name} (${activity.neighborhood})`);

    if (index > 0 && activities[index - 1].coordinates && activity.coordinates) {
      const distance = calculateDistance(activities[index - 1].coordinates, activity.coordinates);
      distances.push(distance);
      totalDistance += distance;
      console.log(`   ↓ ${distance.toFixed(2)} km`);
    }
  });

  console.log(`\n📊 Statistics:`);
  console.log(`Total distance: ${totalDistance.toFixed(2)} km`);
  console.log(`Average hop: ${(totalDistance / distances.length).toFixed(2)} km`);
  console.log(`Max hop: ${Math.max(...distances).toFixed(2)} km`);

  // Check for zigzagging
  const neighborhoods = activities.map(a => a.neighborhood);
  const uniqueNeighborhoods = [...new Set(neighborhoods)];
  const revisits = neighborhoods.length - uniqueNeighborhoods.length;

  console.log(`Neighborhoods visited: ${uniqueNeighborhoods.length}`);
  console.log(`Neighborhood changes: ${neighborhoods.filter((n, i) => i > 0 && n !== neighborhoods[i - 1]).length}`);

  // Rating
  const rating = totalDistance < 10 ? '✅ Excellent' :
                 totalDistance < 15 ? '⚠️  Acceptable' :
                 '❌ Needs optimization';
  console.log(`\nRating: ${rating}`);

  return {
    totalDistance,
    rating,
    neighborhoods: uniqueNeighborhoods
  };
}

// Run analysis
console.log('🔍 Analyzing itinerary routes...\n');

const badResult = analyzeRoute(badItinerary, 'BAD ITINERARY (Zigzagging)');
const goodResult = analyzeRoute(goodItinerary, 'GOOD ITINERARY (Logical Flow)');

console.log('\n');
console.log('=' .repeat(50));
console.log('📋 SUMMARY');
console.log('=' .repeat(50));
console.log('\n❌ Bad itinerary problems:');
console.log('   - Jumps between distant neighborhoods');
console.log('   - No logical geographical flow');
console.log(`   - Total travel: ${badResult.totalDistance.toFixed(2)} km`);

console.log('\n✅ Good itinerary benefits:');
console.log('   - Activities flow from west to east');
console.log('   - Minimizes backtracking');
console.log(`   - Total travel: ${goodResult.totalDistance.toFixed(2)} km`);
console.log(`   - Saves ${(badResult.totalDistance - goodResult.totalDistance).toFixed(2)} km of travel`);

console.log('\n🎯 Key Principles:');
console.log('1. Group activities by neighborhood/zone');
console.log('2. Flow in one direction (avoid back-and-forth)');
console.log('3. Keep morning activities close together');
console.log('4. Minimize total daily travel to <10km ideally');
console.log('5. Consider logical progression (e.g., west→east, north→south)');
console.log('');