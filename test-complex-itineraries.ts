/**
 * Comprehensive Itinerary Test Suite
 * Tests 5 complex travel scenarios to ensure data accuracy
 */

import dotenv from 'dotenv';
dotenv.config();

import { generatePersonalizedItinerary } from './src/ai/flows/generate-personalized-itinerary';
import { logger } from './src/lib/logger';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

interface TestResult {
  testName: string;
  passed: boolean;
  issues: string[];
  data: any;
}

const testCases = [
  {
    name: '1. Multi-City Japan (3 weeks)',
    prompt: 'Plan 3 weeks in Japan from Los Angeles. Visit Tokyo, Kyoto, and Osaka. I want to experience culture, food, and technology.',
    expectations: {
      totalDays: 22, // 21 days + 1 return day
      destinations: ['Tokyo', 'Kyoto', 'Osaka'],
      origin: 'Los Angeles',
      hasReturnFlight: true,
      minFlightPrice: 800,
      maxFlightPrice: 2000,
      minHotelPrice: 50,
      maxHotelPrice: 400,
    }
  },
  {
    name: '2. European Grand Tour (2 weeks)',
    prompt: 'I want to travel from New York to Europe for 2 weeks. Visit London, Paris, Rome, and Barcelona.',
    expectations: {
      totalDays: 15,
      destinations: ['London', 'Paris', 'Rome', 'Barcelona'],
      origin: 'New York',
      hasReturnFlight: true,
      minFlightPrice: 400,
      maxFlightPrice: 1500,
      minHotelPrice: 60,
      maxHotelPrice: 500,
    }
  },
  {
    name: '3. Southeast Asia Adventure (10 days)',
    prompt: 'Plan a 10-day trip from San Francisco to Southeast Asia. Include Bangkok, Singapore, and Bali.',
    expectations: {
      totalDays: 11,
      destinations: ['Bangkok', 'Singapore', 'Bali'],
      origin: 'San Francisco',
      hasReturnFlight: true,
      minFlightPrice: 600,
      maxFlightPrice: 1800,
      minHotelPrice: 30,
      maxHotelPrice: 300,
    }
  },
  {
    name: '4. South America Discovery (2 weeks)',
    prompt: 'From Miami, I want to explore South America for 14 days. Visit Buenos Aires, Rio de Janeiro, and Lima.',
    expectations: {
      totalDays: 15,
      destinations: ['Buenos Aires', 'Rio de Janeiro', 'Lima'],
      origin: 'Miami',
      hasReturnFlight: true,
      minFlightPrice: 300,
      maxFlightPrice: 1200,
      minHotelPrice: 40,
      maxHotelPrice: 250,
    }
  },
  {
    name: '5. Australia & New Zealand (3 weeks)',
    prompt: 'Plan 3 weeks from Los Angeles to Australia and New Zealand. Visit Sydney, Melbourne, and Auckland.',
    expectations: {
      totalDays: 22,
      destinations: ['Sydney', 'Melbourne', 'Auckland'],
      origin: 'Los Angeles',
      hasReturnFlight: true,
      minFlightPrice: 800,
      maxFlightPrice: 2500,
      minHotelPrice: 70,
      maxHotelPrice: 400,
    }
  }
];

async function validateItinerary(itinerary: any, expectations: any): Promise<TestResult> {
  const issues: string[] = [];
  let passed = true;

  console.log(`\n${colors.cyan}Validating: ${expectations.name || 'Itinerary'}${colors.reset}`);
  console.log('─'.repeat(60));

  // 1. Check total days
  const actualDays = itinerary.itinerary?.length || 0;
  console.log(`📅 Days: ${actualDays} (expected: ${expectations.totalDays})`);
  if (Math.abs(actualDays - expectations.totalDays) > 1) {
    issues.push(`❌ Day count mismatch: got ${actualDays}, expected ${expectations.totalDays}`);
    passed = false;
  }

  // 2. Check destinations
  const destinations = itinerary.destination?.split(',').map((d: string) => d.trim()) || [];
  console.log(`📍 Destinations: ${destinations.join(', ')}`);
  
  for (const expectedDest of expectations.destinations) {
    if (!destinations.some((d: string) => d.includes(expectedDest))) {
      issues.push(`❌ Missing destination: ${expectedDest}`);
      passed = false;
    }
  }

  // 3. Check for return flight
  const hasReturnDay = itinerary.itinerary?.some((day: any) => 
    day.title?.includes('→') && day.title?.includes(expectations.origin)
  );
  console.log(`✈️  Return flight: ${hasReturnDay ? 'Yes' : 'No'}`);
  if (expectations.hasReturnFlight && !hasReturnDay) {
    issues.push(`❌ Missing return flight to ${expectations.origin}`);
    passed = false;
  }

  // 4. Validate activities and addresses
  let totalActivities = 0;
  let activitiesWithAddresses = 0;
  let activitiesWithVenues = 0;
  const badAddresses: string[] = [];

  itinerary.itinerary?.forEach((day: any) => {
    day.activities?.forEach((activity: any) => {
      totalActivities++;
      
      // Check for address
      if (activity.address && activity.address !== 'Travel Day city center') {
        activitiesWithAddresses++;
        
        // Check for bad addresses
        if (activity.address.includes('Travel Day')) {
          badAddresses.push(`Day ${day.day}: "${activity.description}" has bad address: ${activity.address}`);
        }
      }
      
      // Check for venue names (from Google Places)
      if (activity.venue_name) {
        activitiesWithVenues++;
      }
    });
  });

  const addressPercentage = (activitiesWithAddresses / totalActivities * 100).toFixed(1);
  const venuePercentage = (activitiesWithVenues / totalActivities * 100).toFixed(1);
  
  console.log(`📍 Activities with addresses: ${activitiesWithAddresses}/${totalActivities} (${addressPercentage}%)`);
  console.log(`🏢 Activities with venue names: ${activitiesWithVenues}/${totalActivities} (${venuePercentage}%)`);
  
  if (badAddresses.length > 0) {
    issues.push(...badAddresses.map(addr => `❌ Bad address: ${addr}`));
    passed = false;
  }

  // 5. Check cost estimates
  if (itinerary._costEstimate) {
    const cost = itinerary._costEstimate;
    console.log(`\n💰 Cost Breakdown:`);
    console.log(`   Flights: $${cost.flights}`);
    console.log(`   Hotels: $${cost.accommodation}`);
    console.log(`   Daily: $${cost.dailyExpenses}`);
    console.log(`   TOTAL: $${cost.total}`);
    
    // Validate flight prices
    const avgFlightPrice = cost.flights / 2; // Assuming round trip
    if (avgFlightPrice < expectations.minFlightPrice || avgFlightPrice > expectations.maxFlightPrice) {
      issues.push(`⚠️  Flight price seems off: $${avgFlightPrice} per flight`);
    }
    
    // Validate hotel prices
    const avgHotelPerNight = cost.accommodation / actualDays;
    if (avgHotelPerNight < expectations.minHotelPrice || avgHotelPerNight > expectations.maxHotelPrice) {
      issues.push(`⚠️  Hotel price seems off: $${avgHotelPerNight.toFixed(0)} per night`);
    }
  } else {
    issues.push('❌ No cost estimate provided');
    passed = false;
  }

  // 6. Check for proper city separation
  const daysByCity = new Map<string, number>();
  itinerary.itinerary?.forEach((day: any) => {
    const city = day._destination || day.title?.split(' in ')[1] || 'Unknown';
    daysByCity.set(city, (daysByCity.get(city) || 0) + 1);
  });
  
  console.log(`\n🌍 Days per city:`);
  daysByCity.forEach((days, city) => {
    if (city !== 'Travel Day' && city !== 'Unknown') {
      console.log(`   ${city}: ${days} days`);
    }
  });

  // 7. Sample activities check
  console.log(`\n📋 Sample Activities:`);
  const sampleDays = [0, Math.floor(actualDays / 2), actualDays - 1];
  sampleDays.forEach(dayIndex => {
    const day = itinerary.itinerary?.[dayIndex];
    if (day) {
      console.log(`\n   Day ${day.day}: ${day.title}`);
      day.activities?.slice(0, 2).forEach((activity: any) => {
        console.log(`   • ${activity.time}: ${activity.description}`);
        if (activity.venue_name) {
          console.log(`     📍 ${activity.venue_name}`);
        }
        console.log(`     📮 ${activity.address}`);
      });
    }
  });

  return {
    testName: expectations.name || 'Test',
    passed,
    issues,
    data: {
      days: actualDays,
      destinations,
      addressPercentage,
      venuePercentage,
      cost: itinerary._costEstimate
    }
  };
}

async function runAllTests() {
  console.log(`\n${colors.blue}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.blue}🧪 COMPREHENSIVE ITINERARY TEST SUITE${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(80)}${colors.reset}`);
  console.log(`Running ${testCases.length} complex travel scenarios...`);
  
  const results: TestResult[] = [];
  
  for (const testCase of testCases) {
    console.log(`\n${colors.yellow}${'═'.repeat(80)}${colors.reset}`);
    console.log(`${colors.yellow}TEST: ${testCase.name}${colors.reset}`);
    console.log(`${colors.yellow}${'═'.repeat(80)}${colors.reset}`);
    console.log(`Prompt: "${testCase.prompt}"`);
    
    try {
      const startTime = Date.now();
      console.log(`\n⏳ Generating itinerary...`);
      
      const itinerary = await generatePersonalizedItinerary({
        prompt: testCase.prompt,
        attachedFile: undefined,
        conversationHistory: undefined
      });
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ Generated in ${duration}s`);
      
      const result = await validateItinerary(itinerary, testCase.expectations);
      results.push(result);
      
      if (result.passed) {
        console.log(`\n${colors.green}✅ TEST PASSED${colors.reset}`);
      } else {
        console.log(`\n${colors.red}❌ TEST FAILED${colors.reset}`);
        console.log(`Issues found:`);
        result.issues.forEach(issue => console.log(`  ${issue}`));
      }
      
    } catch (error: any) {
      console.log(`\n${colors.red}❌ TEST ERROR: ${error.message}${colors.reset}`);
      results.push({
        testName: testCase.name,
        passed: false,
        issues: [`Error: ${error.message}`],
        data: null
      });
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Final Summary
  console.log(`\n${colors.magenta}${'═'.repeat(80)}${colors.reset}`);
  console.log(`${colors.magenta}📊 FINAL TEST SUMMARY${colors.reset}`);
  console.log(`${colors.magenta}${'═'.repeat(80)}${colors.reset}`);
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`\nTests Passed: ${colors.green}${passed}/${testCases.length}${colors.reset}`);
  console.log(`Tests Failed: ${colors.red}${failed}/${testCases.length}${colors.reset}`);
  
  console.log(`\nDetailed Results:`);
  results.forEach((result, index) => {
    const status = result.passed 
      ? `${colors.green}✅ PASS${colors.reset}` 
      : `${colors.red}❌ FAIL${colors.reset}`;
    console.log(`\n${index + 1}. ${result.testName}: ${status}`);
    
    if (result.data) {
      console.log(`   • Days: ${result.data.days}`);
      console.log(`   • Destinations: ${result.data.destinations.join(', ')}`);
      console.log(`   • Address coverage: ${result.data.addressPercentage}%`);
      console.log(`   • Venue coverage: ${result.data.venuePercentage}%`);
      if (result.data.cost) {
        console.log(`   • Total cost: $${result.data.cost.total}`);
      }
    }
    
    if (result.issues.length > 0) {
      console.log(`   Issues:`);
      result.issues.slice(0, 3).forEach(issue => {
        console.log(`   - ${issue}`);
      });
      if (result.issues.length > 3) {
        console.log(`   ... and ${result.issues.length - 3} more issues`);
      }
    }
  });
  
  const overallSuccess = passed === testCases.length;
  console.log(`\n${colors.cyan}${'═'.repeat(80)}${colors.reset}`);
  if (overallSuccess) {
    console.log(`${colors.green}🎉 ALL TESTS PASSED! The system is working correctly.${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️  Some tests failed. Review the issues above.${colors.reset}`);
  }
  console.log(`${colors.cyan}${'═'.repeat(80)}${colors.reset}\n`);
}

// Run the tests
runAllTests().catch(console.error);