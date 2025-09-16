/**
 * Simple AI Testing Monitor
 * Tests the LocationIQ integration and AI itinerary generation
 */

import { generatePersonalizedItinerary } from '@/services/ai/flows/generate-personalized-itinerary';
import { locationIQ } from '@/services/api/locationiq';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Test cases
const testCases = [
  {
    name: 'Simple London Trip',
    prompt: '3 days in London',
    expectedDays: 3,
    expectedDestination: 'London',
  },
  {
    name: 'Paris Weekend',
    prompt: 'Weekend trip to Paris',
    expectedDays: 2,
    expectedDestination: 'Paris',
  },
  {
    name: 'Multi-city Europe',
    prompt: 'One week visiting London and Paris',
    expectedDays: 7,
    expectedDestination: ['London', 'Paris'],
  },
];

async function runTest(testCase: typeof testCases[0]) {
  console.log(`\n${colors.cyan}Testing: ${testCase.name}${colors.reset}`);
  console.log(`Prompt: "${testCase.prompt}"`);

  const startTime = Date.now();

  try {
    // Test AI generation
    const result = await generatePersonalizedItinerary({
      prompt: testCase.prompt,
    });

    const duration = Date.now() - startTime;

    // Validate results
    const passed = [];
    const failed = [];

    // Check days
    if (result.itinerary.length === testCase.expectedDays) {
      passed.push(`✓ Days: ${result.itinerary.length}`);
    } else {
      failed.push(`✗ Days: expected ${testCase.expectedDays}, got ${result.itinerary.length}`);
    }

    // Check destination
    const destination = result.destination;
    if (Array.isArray(testCase.expectedDestination)) {
      const hasAll = testCase.expectedDestination.every(d =>
        destination.toLowerCase().includes(d.toLowerCase())
      );
      if (hasAll) {
        passed.push(`✓ Destination: ${destination}`);
      } else {
        failed.push(`✗ Destination: expected ${testCase.expectedDestination.join(', ')}, got ${destination}`);
      }
    } else {
      if (destination.toLowerCase().includes(testCase.expectedDestination.toLowerCase())) {
        passed.push(`✓ Destination: ${destination}`);
      } else {
        failed.push(`✗ Destination: expected ${testCase.expectedDestination}, got ${destination}`);
      }
    }

    // Check activities
    const totalActivities = result.itinerary.reduce((sum, day) =>
      sum + (day.activities?.length || 0), 0
    );
    if (totalActivities > 0) {
      passed.push(`✓ Activities: ${totalActivities} total`);
    } else {
      failed.push(`✗ No activities generated`);
    }

    // Check for LocationIQ enrichment
    const hasLocationData = result.itinerary.some(day =>
      day.activities?.some((activity: any) =>
        activity.coordinates || activity.venue_name
      )
    );

    if (hasLocationData) {
      passed.push(`✓ LocationIQ enrichment detected`);
    } else {
      console.log(`  ${colors.yellow}⚠ No LocationIQ enrichment found (API key may be missing)${colors.reset}`);
    }

    // Print results
    if (failed.length === 0) {
      console.log(`${colors.green}✅ PASSED (${duration}ms)${colors.reset}`);
      passed.forEach(p => console.log(`  ${colors.green}${p}${colors.reset}`));
    } else {
      console.log(`${colors.red}❌ FAILED (${duration}ms)${colors.reset}`);
      failed.forEach(f => console.log(`  ${colors.red}${f}${colors.reset}`));
      passed.forEach(p => console.log(`  ${colors.green}${p}${colors.reset}`));
    }

    return { passed: failed.length === 0, duration };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`${colors.red}❌ ERROR (${duration}ms)${colors.reset}`);
    console.log(`  ${colors.red}${error.message}${colors.reset}`);
    return { passed: false, duration, error };
  }
}

async function checkLocationIQConfig() {
  console.log(`\n${colors.cyan}Checking LocationIQ Configuration...${colors.reset}`);

  const hasKey = locationIQ.isConfigured();

  if (hasKey) {
    console.log(`${colors.green}✓ LocationIQ API key is configured${colors.reset}`);

    // Try a simple search to verify it works
    try {
      const result = await locationIQ.searchPlaces({
        query: 'Eiffel Tower Paris',
        limit: 1,
      });

      if (result.length > 0) {
        console.log(`${colors.green}✓ LocationIQ API is working${colors.reset}`);
        console.log(`  Found: ${result[0].display_name}`);
      } else {
        console.log(`${colors.yellow}⚠ LocationIQ returned no results${colors.reset}`);
      }
    } catch (error: any) {
      console.log(`${colors.red}✗ LocationIQ API error: ${error.message}${colors.reset}`);
    }
  } else {
    console.log(`${colors.yellow}⚠ LocationIQ API key not configured${colors.reset}`);
    console.log(`  Add LOCATIONIQ_API_KEY to your .env.local file`);
    console.log(`  Get a free key from: https://locationiq.com/`);
  }

  return hasKey;
}

async function checkOpenAIConfig() {
  console.log(`\n${colors.cyan}Checking OpenAI Configuration...${colors.reset}`);

  const hasKey = !!process.env.OPENAI_API_KEY;

  if (hasKey) {
    console.log(`${colors.green}✓ OpenAI API key is configured${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ OpenAI API key not configured${colors.reset}`);
    console.log(`  Add OPENAI_API_KEY to your .env.local file`);
  }

  return hasKey;
}

async function main() {
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}AI Testing Monitor - LocationIQ Integration${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);

  // Check configuration
  const hasOpenAI = await checkOpenAIConfig();
  const hasLocationIQ = await checkLocationIQConfig();

  if (!hasOpenAI) {
    console.log(`\n${colors.red}Cannot run tests without OpenAI API key${colors.reset}`);
    process.exit(1);
  }

  if (!hasLocationIQ) {
    console.log(`\n${colors.yellow}Warning: Running without LocationIQ enrichment${colors.reset}`);
  }

  // Determine which tests to run
  const isBaseline = process.argv.includes('--baseline');
  const testsToRun = isBaseline ? testCases.slice(0, 1) : testCases;

  console.log(`\n${colors.cyan}Running ${isBaseline ? 'baseline' : 'all'} tests...${colors.reset}`);

  // Run tests
  const results = [];
  for (const testCase of testsToRun) {
    const result = await runTest(testCase);
    results.push(result);

    // Add delay between tests to avoid rate limiting
    if (testsToRun.indexOf(testCase) < testsToRun.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}Test Summary${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`Total: ${results.length} tests`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  if (failed > 0) {
    console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  }
  console.log(`Total time: ${totalDuration}ms`);
  console.log(`Average time: ${Math.round(totalDuration / results.length)}ms`);

  if (!hasLocationIQ) {
    console.log(`\n${colors.yellow}Note: Tests ran without LocationIQ enrichment${colors.reset}`);
    console.log(`Add LOCATIONIQ_API_KEY to enable venue enrichment and route optimization`);
  }

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run the tests
main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});