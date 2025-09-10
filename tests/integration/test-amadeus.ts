#!/usr/bin/env npx tsx

/**
 * Test Amadeus API Integration
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { searchFlights, searchHotels, estimateTripCost } from '../src/lib/api/amadeus';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

async function testAmadeusIntegration() {
  console.log(`\n${colors.bright}${colors.cyan}=== AMADEUS API INTEGRATION TEST ===${colors.reset}\n`);
  
  // Test destinations - using future dates
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 2); // 2 months from now
  
  const testTrip = {
    origin: 'New York',
    destinations: [
      { city: 'London', days: 3 },
      { city: 'Paris', days: 3 }
    ],
    startDate: futureDate.toISOString().split('T')[0],
    travelers: 1
  };
  
  console.log(`${colors.bright}Testing trip: ${testTrip.origin} → ${testTrip.destinations.map(d => d.city).join(' → ')}${colors.reset}\n`);
  
  // Test 1: Flight Search
  console.log(`${colors.cyan}1. Testing Flight Search${colors.reset}`);
  try {
    const flights = await searchFlights(
      testTrip.origin,
      testTrip.destinations[0].city,
      testTrip.startDate
    );
    
    if (flights && flights.length > 0) {
      console.log(`${colors.green}✓ Found ${flights.length} flights${colors.reset}`);
      const cheapest = flights[0];
      console.log(`  Cheapest: $${cheapest.price.total} ${cheapest.price.currency} on ${cheapest.airline}`);
    } else {
      console.log(`${colors.yellow}⚠ No flights found (using mock data)${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}✗ Flight search error: ${error}${colors.reset}`);
  }
  
  // Test 2: Hotel Search
  console.log(`\n${colors.cyan}2. Testing Hotel Search${colors.reset}`);
  try {
    const checkOutDate = new Date(testTrip.startDate);
    checkOutDate.setDate(checkOutDate.getDate() + 3);
    
    const hotels = await searchHotels(
      testTrip.destinations[0].city,
      testTrip.startDate,
      checkOutDate.toISOString().split('T')[0]
    );
    
    if (hotels && hotels.length > 0) {
      console.log(`${colors.green}✓ Found ${hotels.length} hotels${colors.reset}`);
      const firstHotel = hotels[0];
      if (firstHotel.offers && firstHotel.offers.length > 0) {
        console.log(`  Example: ${firstHotel.name} - $${firstHotel.offers[0].price.perNight}/night`);
      }
    } else {
      console.log(`${colors.yellow}⚠ No hotels found (using mock data)${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}✗ Hotel search error: ${error}${colors.reset}`);
  }
  
  // Test 3: Trip Cost Estimation
  console.log(`\n${colors.cyan}3. Testing Trip Cost Estimation${colors.reset}`);
  try {
    const costEstimate = await estimateTripCost(
      testTrip.destinations,
      testTrip.origin,
      testTrip.startDate,
      testTrip.travelers
    );
    
    if (costEstimate) {
      console.log(`${colors.green}✓ Cost estimate generated${colors.reset}`);
      console.log(`  Flights: $${costEstimate.flights}`);
      console.log(`  Hotels: $${costEstimate.accommodation}`);
      console.log(`  Daily Expenses: $${costEstimate.dailyExpenses}`);
      console.log(`${colors.bright}  Total: $${costEstimate.total} ${costEstimate.currency}${colors.reset}`);
      
      console.log(`\n  Breakdown:`);
      costEstimate.breakdown.forEach(item => {
        console.log(`    - ${item.description}: $${item.amount}`);
      });
    } else {
      console.log(`${colors.yellow}⚠ No cost estimate generated${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}✗ Cost estimation error: ${error}${colors.reset}`);
  }
  
  console.log(`\n${colors.bright}${colors.cyan}=== TEST COMPLETE ===${colors.reset}\n`);
}

testAmadeusIntegration().catch(console.error);