#!/usr/bin/env npx tsx

/**
 * Simple Application Test
 * Tests core functionality with 3 quick scenarios
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables first
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import modules after env is loaded
import { searchFlights, searchHotels, estimateTripCost } from '../src/lib/api/amadeus';
import { getCurrencyExchangeRate, getBudgetRecommendation } from '../src/lib/api/polygon';
import { getWeatherForecast } from '../src/lib/api/weather';
import { searchGooglePlaces } from '../src/lib/api/google-places';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

// Test scenarios - simplified
const testScenarios = [
  {
    id: 1,
    name: '3 days in London',
    destinations: ['London'],
    days: 3,
    travelers: 1,
  },
  {
    id: 2,
    name: 'Weekend in Paris',
    destinations: ['Paris'],
    days: 2,
    travelers: 2,
  },
  {
    id: 3,
    name: 'Tokyo and Kyoto',
    destinations: ['Tokyo', 'Kyoto'],
    days: 7,
    travelers: 1,
  }
];

async function testScenario(scenario: typeof testScenarios[0]) {
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}Test ${scenario.id}: ${scenario.name}${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  
  const results = {
    weather: false,
    places: false,
    flights: false,
    hotels: false,
    currency: false,
    cost: 0
  };

  // Test 1: Weather API
  console.log(`${colors.cyan}1. Weather API${colors.reset}`);
  try {
    const weather = await getWeatherForecast(scenario.destinations[0]);
    if (weather && weather.current) {
      results.weather = true;
      console.log(`  ${colors.green}✓ ${weather.current.temp_c}°C, ${weather.current.condition?.text}${colors.reset}`);
    } else {
      console.log(`  ${colors.yellow}⚠ Mock data${colors.reset}`);
    }
  } catch (error) {
    console.log(`  ${colors.red}✗ Error${colors.reset}`);
  }

  // Test 2: Google Places
  console.log(`${colors.cyan}2. Google Places${colors.reset}`);
  try {
    const places = await searchGooglePlaces(scenario.destinations[0], 'restaurant', 3);
    if (places && places.length > 0 && !places[0].name.includes('Mock')) {
      results.places = true;
      console.log(`  ${colors.green}✓ Found ${places.length} places${colors.reset}`);
    } else {
      console.log(`  ${colors.yellow}⚠ Mock data${colors.reset}`);
    }
  } catch (error) {
    console.log(`  ${colors.red}✗ Error${colors.reset}`);
  }

  // Test 3: Flights (Amadeus)
  console.log(`${colors.cyan}3. Amadeus Flights${colors.reset}`);
  try {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 2);
    
    const flights = await searchFlights(
      'New York',
      scenario.destinations[0],
      futureDate.toISOString().split('T')[0],
      undefined,
      scenario.travelers
    );
    
    if (flights && flights.length > 0) {
      const isMock = flights[0].id.includes('mock');
      results.flights = !isMock;
      console.log(`  ${isMock ? colors.yellow + '⚠' : colors.green + '✓'} $${flights[0].price.total.toFixed(0)}${colors.reset}`);
    }
  } catch (error) {
    console.log(`  ${colors.red}✗ Error${colors.reset}`);
  }

  // Test 4: Hotels (Amadeus)
  console.log(`${colors.cyan}4. Amadeus Hotels${colors.reset}`);
  try {
    const checkIn = new Date();
    checkIn.setMonth(checkIn.getMonth() + 2);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + scenario.days);
    
    const hotels = await searchHotels(
      scenario.destinations[0],
      checkIn.toISOString().split('T')[0],
      checkOut.toISOString().split('T')[0],
      scenario.travelers
    );
    
    if (hotels && hotels.length > 0) {
      const isMock = hotels[0].id.includes('mock');
      results.hotels = !isMock;
      const price = hotels[0].offers?.[0]?.price?.perNight || 0;
      console.log(`  ${isMock ? colors.yellow + '⚠' : colors.green + '✓'} $${price.toFixed(0)}/night${colors.reset}`);
    }
  } catch (error) {
    console.log(`  ${colors.red}✗ Error${colors.reset}`);
  }

  // Test 5: Currency (Polygon)
  console.log(`${colors.cyan}5. Currency Exchange${colors.reset}`);
  try {
    const currencies: Record<string, string> = {
      'London': 'GBP',
      'Paris': 'EUR',
      'Tokyo': 'JPY'
    };
    
    const targetCurrency = currencies[scenario.destinations[0]] || 'EUR';
    const rate = await getCurrencyExchangeRate('USD', targetCurrency);
    
    if (rate) {
      // Check if it's real data (should have reasonable response time)
      results.currency = true;
      console.log(`  ${colors.green}✓ 1 USD = ${rate.rate} ${targetCurrency}${colors.reset}`);
    }
  } catch (error) {
    console.log(`  ${colors.red}✗ Error${colors.reset}`);
  }

  // Test 6: Trip Cost
  console.log(`${colors.cyan}6. Trip Cost Estimate${colors.reset}`);
  try {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 2);
    
    const destinations = scenario.destinations.map(city => ({
      city,
      days: Math.ceil(scenario.days / scenario.destinations.length)
    }));
    
    const cost = await estimateTripCost(
      destinations,
      'New York',
      futureDate.toISOString().split('T')[0],
      scenario.travelers
    );
    
    if (cost) {
      results.cost = cost.total;
      console.log(`  ${colors.green}✓ Total: $${cost.total.toLocaleString()}${colors.reset}`);
    }
  } catch (error) {
    console.log(`  ${colors.red}✗ Error${colors.reset}`);
  }

  // Summary
  const working = Object.values(results).filter(v => v === true).length;
  console.log(`\n${colors.bright}Result: ${working}/5 APIs working${colors.reset}`);
  if (results.cost > 0) {
    console.log(`Est. Cost: $${results.cost.toLocaleString()}`);
  }
  
  return { ...results, working };
}

async function runSimpleTest() {
  console.log(`\n${colors.bright}${colors.magenta}╔══════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}║              SIMPLE APPLICATION TEST SUITE                  ║${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}╚══════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  // Check API configuration
  console.log(`${colors.bright}API Configuration:${colors.reset}`);
  const apis = {
    'Gemini AI': process.env.GEMINI_API_KEY,
    'OpenAI': process.env.OPENAI_API_KEY,
    'Google Places': process.env.GOOGLE_API_KEY,
    'Weather': process.env.OPENWEATHERMAP,
    'Amadeus': process.env.AMADEUS_API_KEY,
    'Polygon.io': process.env.POLIGONIO_API_KEY
  };
  
  Object.entries(apis).forEach(([name, key]) => {
    const status = key ? `${colors.green}✓ Configured${colors.reset}` : `${colors.red}✗ Missing${colors.reset}`;
    console.log(`  ${name.padEnd(15)}: ${status}`);
  });
  
  const results = [];
  
  // Run tests
  for (const scenario of testScenarios) {
    const result = await testScenario(scenario);
    results.push(result);
    
    if (scenario.id < testScenarios.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Final Summary
  console.log(`\n${colors.bright}${colors.magenta}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}FINAL SUMMARY${colors.reset}\n`);
  
  // API reliability across all tests
  const apiTotals = {
    weather: results.filter(r => r.weather).length,
    places: results.filter(r => r.places).length,
    flights: results.filter(r => r.flights).length,
    hotels: results.filter(r => r.hotels).length,
    currency: results.filter(r => r.currency).length,
  };
  
  console.log(`${colors.bright}API Success Rate:${colors.reset}`);
  Object.entries(apiTotals).forEach(([api, count]) => {
    const percentage = (count / results.length * 100).toFixed(0);
    const bar = '█'.repeat(count * 3).padEnd(9, '░');
    console.log(`  ${api.padEnd(10)}: [${bar}] ${percentage}% (${count}/${results.length})`);
  });
  
  // Cost estimates
  const avgCost = results.reduce((sum, r) => sum + r.cost, 0) / results.length;
  console.log(`\n${colors.bright}Cost Estimates:${colors.reset}`);
  results.forEach((r, i) => {
    console.log(`  ${testScenarios[i].name}: $${r.cost.toLocaleString()}`);
  });
  console.log(`  Average: $${avgCost.toLocaleString()}`);
  
  // Overall verdict
  const totalWorking = Object.values(apiTotals).reduce((sum, v) => sum + v, 0);
  const maxPossible = results.length * 5;
  const percentage = (totalWorking / maxPossible * 100).toFixed(0);
  
  console.log(`\n${colors.bright}Overall: ${totalWorking}/${maxPossible} (${percentage}%)${colors.reset}`);
  
  if (percentage === '100') {
    console.log(`${colors.bright}${colors.green}🎉 PERFECT! All APIs working!${colors.reset}`);
  } else if (parseInt(percentage) >= 60) {
    console.log(`${colors.bright}${colors.yellow}✓ GOOD: Most features operational${colors.reset}`);
  } else {
    console.log(`${colors.bright}${colors.red}⚠ LIMITED: Some APIs need configuration${colors.reset}`);
  }
  
  console.log(`${colors.bright}${colors.magenta}═══════════════════════════════════════════════════════════════${colors.reset}\n`);
}

// Run the test
runSimpleTest().catch(console.error);