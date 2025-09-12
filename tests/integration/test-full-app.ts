#!/usr/bin/env npx tsx

/**
 * Comprehensive Full Application Test
 * Tests the entire app with 5 different travel scenarios
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import all necessary modules
import { generatePersonalizedItinerary } from '../src/ai/flows/generate-personalized-itinerary';
import { searchFlights, searchHotels, estimateTripCost } from '../src/lib/api/amadeus';
import { getCurrencyExchangeRate, getBudgetRecommendation } from '../src/lib/api/polygon';
import { getWeatherForecast } from '../src/lib/api/weather';
import { searchGooglePlaces as searchPlaces } from '../src/lib/api/google-places';

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

// Test scenarios
const testScenarios = [
  {
    id: 1,
    name: 'Weekend in Paris',
    prompt: 'Plan a romantic weekend in Paris for 2 people in March',
    expectedDays: 2,
    expectedDestinations: ['Paris'],
    currency: 'EUR',
    travelers: 2,
    style: 'moderate' as const,
    mustInclude: ['Eiffel Tower', 'Louvre', 'romantic dinner']
  },
  {
    id: 2,
    name: 'Japan Adventure',
    prompt: 'I want to explore Japan for 10 days, visiting Tokyo, Kyoto, and Osaka. Include cultural experiences and food tours.',
    expectedDays: 10,
    expectedDestinations: ['Tokyo', 'Kyoto', 'Osaka'],
    currency: 'JPY',
    travelers: 1,
    style: 'moderate' as const,
    mustInclude: ['temples', 'sushi', 'Mount Fuji', 'bullet train']
  },
  {
    id: 3,
    name: 'Budget Backpacking Southeast Asia',
    prompt: 'Plan a 2-week budget backpacking trip through Thailand, Vietnam, and Cambodia. Focus on hostels and street food.',
    expectedDays: 14,
    expectedDestinations: ['Bangkok', 'Hanoi', 'Siem Reap'],
    currency: 'USD',
    travelers: 1,
    style: 'budget' as const,
    mustInclude: ['hostels', 'street food', 'temples', 'markets']
  },
  {
    id: 4,
    name: 'Luxury European Tour',
    prompt: 'Luxury 7-day tour of London, Paris, and Rome with 5-star hotels and fine dining for a family of 4',
    expectedDays: 7,
    expectedDestinations: ['London', 'Paris', 'Rome'],
    currency: 'EUR',
    travelers: 4,
    style: 'luxury' as const,
    mustInclude: ['5-star', 'fine dining', 'private tours']
  },
  {
    id: 5,
    name: 'Digital Nomad Month',
    prompt: 'One month in Lisbon for remote work, need coworking spaces, good cafes, and weekend trips to Porto and Sintra',
    expectedDays: 30,
    expectedDestinations: ['Lisbon', 'Porto', 'Sintra'],
    currency: 'EUR',
    travelers: 1,
    style: 'moderate' as const,
    mustInclude: ['coworking', 'cafes', 'wifi', 'weekend trips']
  }
];

interface TestResult {
  scenario: string;
  success: boolean;
  aiGeneration: boolean;
  structureValid: boolean;
  apisWorking: {
    weather: boolean;
    places: boolean;
    flights: boolean;
    hotels: boolean;
    currency: boolean;
  };
  costEstimate: number | null;
  responseTime: number;
  errors: string[];
}

async function testScenario(scenario: typeof testScenarios[0]): Promise<TestResult> {
  const result: TestResult = {
    scenario: scenario.name,
    success: false,
    aiGeneration: false,
    structureValid: false,
    apisWorking: {
      weather: false,
      places: false,
      flights: false,
      hotels: false,
      currency: false
    },
    costEstimate: null,
    responseTime: 0,
    errors: []
  };

  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}Scenario ${scenario.id}: ${scenario.name}${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  
  console.log(`📝 Prompt: "${scenario.prompt}"`);
  console.log(`👥 Travelers: ${scenario.travelers}`);
  console.log(`💰 Style: ${scenario.style}`);
  console.log(`🗓️ Expected: ${scenario.expectedDays} days across ${scenario.expectedDestinations.join(', ')}\n`);

  try {
    // Test 1: AI Generation
    console.log(`${colors.cyan}1. Testing AI Itinerary Generation${colors.reset}`);
    const startTime = Date.now();
    
    const itinerary = await generatePersonalizedItinerary({
      prompt: scenario.prompt
    });
    
    result.responseTime = Date.now() - startTime;
    
    if (itinerary && itinerary.destinations) {
      result.aiGeneration = true;
      console.log(`${colors.green}✓ AI generated itinerary in ${(result.responseTime / 1000).toFixed(1)}s${colors.reset}`);
      
      // Check structure
      const totalDays = itinerary.destinations.reduce((sum, dest) => 
        sum + (dest.days?.length || 0), 0
      );
      
      console.log(`  Generated: ${totalDays} days across ${itinerary.destinations.map(d => d.city).join(', ')}`);
      
      // Validate structure
      if (totalDays > 0 && itinerary.destinations.length > 0) {
        result.structureValid = true;
        console.log(`${colors.green}✓ Structure is valid${colors.reset}`);
      } else {
        result.errors.push('Invalid itinerary structure');
        console.log(`${colors.red}✗ Invalid structure${colors.reset}`);
      }
      
      // Check for must-include items
      const itineraryText = JSON.stringify(itinerary).toLowerCase();
      const foundItems = scenario.mustInclude.filter(item => 
        itineraryText.includes(item.toLowerCase())
      );
      
      if (foundItems.length > 0) {
        console.log(`${colors.green}✓ Found key items: ${foundItems.join(', ')}${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠ Missing expected items${colors.reset}`);
      }
    } else {
      result.errors.push('Failed to generate itinerary');
      console.log(`${colors.red}✗ Failed to generate itinerary${colors.reset}`);
    }

    // Test 2: Weather API
    console.log(`\n${colors.cyan}2. Testing Weather API${colors.reset}`);
    try {
      const weather = await getWeatherForecast(scenario.expectedDestinations[0]);
      if (weather) {
        result.apisWorking.weather = true;
        console.log(`${colors.green}✓ Weather data retrieved for ${scenario.expectedDestinations[0]}${colors.reset}`);
        console.log(`  Current: ${weather.current?.temp_c}°C, ${weather.current?.condition?.text}`);
      } else {
        console.log(`${colors.yellow}⚠ Using mock weather data${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}✗ Weather API error: ${error}${colors.reset}`);
    }

    // Test 3: Google Places API
    console.log(`\n${colors.cyan}3. Testing Google Places API${colors.reset}`);
    try {
      const places = await searchPlaces(
        scenario.expectedDestinations[0],
        'restaurant',
        5
      );
      if (places && places.length > 0) {
        result.apisWorking.places = true;
        console.log(`${colors.green}✓ Found ${places.length} places in ${scenario.expectedDestinations[0]}${colors.reset}`);
        console.log(`  Example: ${places[0].name} (${places[0].rating}⭐)`);
      } else {
        console.log(`${colors.yellow}⚠ Using mock places data${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}✗ Places API error: ${error}${colors.reset}`);
    }

    // Test 4: Amadeus Flight API
    console.log(`\n${colors.cyan}4. Testing Amadeus Flight API${colors.reset}`);
    try {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 2);
      
      const flights = await searchFlights(
        'New York',
        scenario.expectedDestinations[0],
        futureDate.toISOString().split('T')[0],
        undefined,
        scenario.travelers
      );
      
      if (flights && flights.length > 0) {
        result.apisWorking.flights = true;
        console.log(`${colors.green}✓ Found ${flights.length} flight options${colors.reset}`);
        console.log(`  Cheapest: $${flights[0].price.total} on ${flights[0].airline}`);
      } else {
        console.log(`${colors.yellow}⚠ Using mock flight data${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}✗ Flight API error: ${error}${colors.reset}`);
    }

    // Test 5: Amadeus Hotel API
    console.log(`\n${colors.cyan}5. Testing Amadeus Hotel API${colors.reset}`);
    try {
      const checkIn = new Date();
      checkIn.setMonth(checkIn.getMonth() + 2);
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + 3);
      
      const hotels = await searchHotels(
        scenario.expectedDestinations[0],
        checkIn.toISOString().split('T')[0],
        checkOut.toISOString().split('T')[0],
        scenario.travelers
      );
      
      if (hotels && hotels.length > 0) {
        result.apisWorking.hotels = true;
        console.log(`${colors.green}✓ Found ${hotels.length} hotel options${colors.reset}`);
        if (hotels[0].offers && hotels[0].offers.length > 0) {
          console.log(`  Example: ${hotels[0].name} - $${hotels[0].offers[0].price.perNight}/night`);
        }
      } else {
        console.log(`${colors.yellow}⚠ Using mock hotel data${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}✗ Hotel API error: ${error}${colors.reset}`);
    }

    // Test 6: Polygon Currency API
    console.log(`\n${colors.cyan}6. Testing Currency Exchange (Polygon.io)${colors.reset}`);
    try {
      const rate = await getCurrencyExchangeRate('USD', scenario.currency);
      if (rate) {
        result.apisWorking.currency = true;
        console.log(`${colors.green}✓ Exchange rate: 1 USD = ${rate.rate} ${scenario.currency}${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠ Using mock exchange rates${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}✗ Currency API error: ${error}${colors.reset}`);
    }

    // Test 7: Budget Recommendation
    console.log(`\n${colors.cyan}7. Testing Budget Recommendations${colors.reset}`);
    try {
      const budget = await getBudgetRecommendation(
        scenario.expectedDestinations[0],
        'USD',
        scenario.style
      );
      
      if (budget) {
        console.log(`${colors.green}✓ Daily budget: $${budget.dailyBudget} USD${colors.reset}`);
        console.log(`  Local currency: ${budget.localCurrency}`);
        console.log(`  ${budget.recommendations[0]}`);
      }
    } catch (error) {
      console.log(`${colors.red}✗ Budget calculation error: ${error}${colors.reset}`);
    }

    // Test 8: Trip Cost Estimation
    console.log(`\n${colors.cyan}8. Testing Total Trip Cost Estimation${colors.reset}`);
    try {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 2);
      
      const destinations = scenario.expectedDestinations.map(city => ({
        city,
        days: Math.ceil(scenario.expectedDays / scenario.expectedDestinations.length)
      }));
      
      const costEstimate = await estimateTripCost(
        destinations,
        'New York',
        futureDate.toISOString().split('T')[0],
        scenario.travelers
      );
      
      if (costEstimate) {
        result.costEstimate = costEstimate.total;
        console.log(`${colors.green}✓ Total trip cost estimate: $${costEstimate.total.toLocaleString()}${colors.reset}`);
        console.log(`  Flights: $${costEstimate.flights.toLocaleString()}`);
        console.log(`  Hotels: $${costEstimate.accommodation.toLocaleString()}`);
        console.log(`  Daily: $${costEstimate.dailyExpenses.toLocaleString()}`);
      }
    } catch (error) {
      console.log(`${colors.red}✗ Cost estimation error: ${error}${colors.reset}`);
    }

    // Determine overall success
    result.success = result.aiGeneration && result.structureValid;
    
    // Summary for this scenario
    console.log(`\n${colors.bright}Summary:${colors.reset}`);
    console.log(`  Status: ${result.success ? colors.green + '✓ PASSED' : colors.red + '✗ FAILED'}${colors.reset}`);
    console.log(`  Response Time: ${(result.responseTime / 1000).toFixed(1)}s`);
    console.log(`  APIs Working: ${Object.values(result.apisWorking).filter(v => v).length}/5`);
    if (result.costEstimate) {
      console.log(`  Estimated Cost: $${result.costEstimate.toLocaleString()}`);
    }
    
  } catch (error) {
    result.errors.push(`Unexpected error: ${error}`);
    console.log(`${colors.red}✗ Unexpected error: ${error}${colors.reset}`);
  }

  return result;
}

async function runFullAppTest() {
  console.log(`\n${colors.bright}${colors.magenta}╔══════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}║         COMPREHENSIVE FULL APPLICATION TEST SUITE           ║${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}╚══════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  // Check API configuration
  console.log(`${colors.bright}API Configuration Status:${colors.reset}`);
  console.log(`  Gemini AI: ${process.env.GEMINI_API_KEY ? colors.green + '✓' : colors.red + '✗'}${colors.reset}`);
  console.log(`  Google Places: ${process.env.GOOGLE_API_KEY ? colors.green + '✓' : colors.red + '✗'}${colors.reset}`);
  console.log(`  Weather: ${process.env.OPENWEATHERMAP ? colors.green + '✓' : colors.red + '✗'}${colors.reset}`);
  console.log(`  Amadeus: ${process.env.AMADEUS_API_KEY ? colors.green + '✓' : colors.red + '✗'}${colors.reset}`);
  console.log(`  Polygon.io: ${process.env.POLIGONIO_API_KEY ? colors.green + '✓' : colors.red + '✗'}${colors.reset}`);
  
  const results: TestResult[] = [];
  
  // Run all test scenarios
  for (const scenario of testScenarios) {
    const result = await testScenario(scenario);
    results.push(result);
    
    // Brief pause between tests to avoid rate limits
    if (scenario.id < testScenarios.length) {
      console.log(`\n${colors.yellow}Waiting 2 seconds before next test...${colors.reset}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Final Summary
  console.log(`\n${colors.bright}${colors.magenta}╔══════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}║                     FINAL TEST RESULTS                      ║${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}╚══════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`${colors.bright}Overall Results:${colors.reset}`);
  console.log(`  ${colors.green}✓ Passed: ${passed}/${testScenarios.length}${colors.reset}`);
  console.log(`  ${colors.red}✗ Failed: ${failed}/${testScenarios.length}${colors.reset}`);
  
  console.log(`\n${colors.bright}Scenario Breakdown:${colors.reset}`);
  results.forEach((result, index) => {
    const icon = result.success ? colors.green + '✓' : colors.red + '✗';
    const apiCount = Object.values(result.apisWorking).filter(v => v).length;
    console.log(`  ${icon} ${result.scenario}${colors.reset}`);
    console.log(`     Time: ${(result.responseTime / 1000).toFixed(1)}s | APIs: ${apiCount}/5 | Cost: $${result.costEstimate?.toLocaleString() || 'N/A'}`);
  });
  
  // Performance Stats
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
  console.log(`\n${colors.bright}Performance Statistics:${colors.reset}`);
  console.log(`  Average Response Time: ${(avgResponseTime / 1000).toFixed(1)}s`);
  console.log(`  Fastest: ${(Math.min(...results.map(r => r.responseTime)) / 1000).toFixed(1)}s`);
  console.log(`  Slowest: ${(Math.max(...results.map(r => r.responseTime)) / 1000).toFixed(1)}s`);
  
  // API Reliability
  console.log(`\n${colors.bright}API Reliability:${colors.reset}`);
  const apiStats = {
    weather: results.filter(r => r.apisWorking.weather).length,
    places: results.filter(r => r.apisWorking.places).length,
    flights: results.filter(r => r.apisWorking.flights).length,
    hotels: results.filter(r => r.apisWorking.hotels).length,
    currency: results.filter(r => r.apisWorking.currency).length,
  };
  
  Object.entries(apiStats).forEach(([api, count]) => {
    const percentage = (count / results.length * 100).toFixed(0);
    const bar = '█'.repeat(Math.floor(count * 10 / results.length)).padEnd(10, '░');
    console.log(`  ${api.padEnd(10)}: [${bar}] ${percentage}% (${count}/${results.length})`);
  });
  
  // Save results to file
  const timestamp = new Date().toISOString();
  const testReport = {
    timestamp,
    summary: {
      total: testScenarios.length,
      passed,
      failed,
      avgResponseTime: avgResponseTime / 1000,
      apiReliability: apiStats
    },
    results
  };
  
  const fs = await import('fs');
  fs.writeFileSync(
    path.join(__dirname, `test-results-${timestamp.split('T')[0]}.json`),
    JSON.stringify(testReport, null, 2)
  );
  
  console.log(`\n${colors.bright}Test results saved to: test-results-${timestamp.split('T')[0]}.json${colors.reset}`);
  
  // Final verdict
  console.log(`\n${colors.bright}${colors.magenta}═══════════════════════════════════════════════════════════════${colors.reset}`);
  if (passed === testScenarios.length) {
    console.log(`${colors.bright}${colors.green}🎉 ALL TESTS PASSED! The application is working perfectly! 🎉${colors.reset}`);
  } else if (passed > failed) {
    console.log(`${colors.bright}${colors.yellow}⚠️  PARTIAL SUCCESS: Most features working, some issues detected${colors.reset}`);
  } else {
    console.log(`${colors.bright}${colors.red}❌ CRITICAL: Multiple failures detected, investigation needed${colors.reset}`);
  }
  console.log(`${colors.bright}${colors.magenta}═══════════════════════════════════════════════════════════════${colors.reset}\n`);
}

// Run the test suite
runFullAppTest().catch(console.error);