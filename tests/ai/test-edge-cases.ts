/**
 * Edge Case Testing for AI Trip Generation
 * Tests how the AI handles incomplete, vague, or challenging inputs
 */

import { generatePersonalizedItinerary } from '@/services/ai/flows/generate-personalized-itinerary';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Test cases with increasingly vague or incomplete information
const testCases = [
  {
    name: "No destination specified",
    prompt: "I want to travel for 3 days",
    expectedBehavior: "Should ask for destination or suggest popular options",
    criticalCheck: "Must not crash"
  },
  {
    name: "No duration specified",
    prompt: "I want to visit Paris",
    expectedBehavior: "Should default to reasonable duration (e.g., 3-5 days)",
    criticalCheck: "Must generate some itinerary"
  },
  {
    name: "Just one word",
    prompt: "London",
    expectedBehavior: "Should interpret as destination and use default duration",
    criticalCheck: "Must generate London itinerary"
  },
  {
    name: "Empty string",
    prompt: "",
    expectedBehavior: "Should handle gracefully, possibly return error",
    criticalCheck: "Must not crash"
  },
  {
    name: "Just numbers",
    prompt: "5",
    expectedBehavior: "Should handle gracefully or interpret as days",
    criticalCheck: "Must not crash"
  },
  {
    name: "Nonsense text",
    prompt: "asdfghjkl qwerty",
    expectedBehavior: "Should handle gracefully, return error or ask for clarification",
    criticalCheck: "Must not crash"
  },
  {
    name: "Extremely vague",
    prompt: "somewhere nice",
    expectedBehavior: "Should suggest destinations or ask for more info",
    criticalCheck: "Must not crash"
  },
  {
    name: "Conflicting information",
    prompt: "3 days in Paris for 5 days",
    expectedBehavior: "Should pick one duration and proceed",
    criticalCheck: "Must resolve conflict"
  },
  {
    name: "Non-existent destination",
    prompt: "Trip to Atlantis",
    expectedBehavior: "Should handle gracefully, suggest alternatives",
    criticalCheck: "Must not crash"
  },
  {
    name: "Mixed languages",
    prompt: "Viaje a París pour trois días",
    expectedBehavior: "Should extract Paris and 3 days",
    criticalCheck: "Should understand intent"
  },
  {
    name: "Question instead of statement",
    prompt: "Can you help me plan a trip?",
    expectedBehavior: "Should ask for destination and duration",
    criticalCheck: "Must respond helpfully"
  },
  {
    name: "Extremely long duration",
    prompt: "6 months in Europe",
    expectedBehavior: "Should cap at maximum (e.g., 30 days) or handle gracefully",
    criticalCheck: "Must not generate 180 days"
  },
  {
    name: "Zero days",
    prompt: "0 days in Rome",
    expectedBehavior: "Should default to minimum viable duration",
    criticalCheck: "Must not generate 0 days"
  },
  {
    name: "Negative days",
    prompt: "-3 days in Tokyo",
    expectedBehavior: "Should handle as error or use default",
    criticalCheck: "Must not crash"
  },
  {
    name: "Special characters only",
    prompt: "!@#$%^&*()",
    expectedBehavior: "Should handle gracefully",
    criticalCheck: "Must not crash"
  },
  {
    name: "Emoji only",
    prompt: "✈️ 🗼 3️⃣",
    expectedBehavior: "Might interpret travel + Eiffel Tower + 3 or handle as error",
    criticalCheck: "Must not crash"
  },
  {
    name: "Multiple destinations no duration",
    prompt: "London Paris Rome",
    expectedBehavior: "Should split time between cities",
    criticalCheck: "Must handle multi-city"
  },
  {
    name: "Impossible request",
    prompt: "1 day visiting 10 cities",
    expectedBehavior: "Should limit to reasonable number",
    criticalCheck: "Must be realistic"
  },
  {
    name: "Past date request",
    prompt: "Trip to Paris last week",
    expectedBehavior: "Should use future dates",
    criticalCheck: "Must use future dates"
  },
  {
    name: "Just punctuation",
    prompt: "...",
    expectedBehavior: "Should handle gracefully",
    criticalCheck: "Must not crash"
  }
];

async function runTest(testCase: typeof testCases[0]) {
  console.log(`\n${colors.cyan}Testing: ${testCase.name}${colors.reset}`);
  console.log(`Prompt: "${testCase.prompt}"`);
  console.log(`Expected: ${testCase.expectedBehavior}`);

  const startTime = Date.now();

  try {
    const result = await generatePersonalizedItinerary({
      prompt: testCase.prompt
    });

    const duration = Date.now() - startTime;

    // Check if we got a valid response
    if (result && typeof result === 'object') {
      const hasDestination = result.destination && result.destination !== '';
      const hasItinerary = result.itinerary && Array.isArray(result.itinerary);
      const dayCount = hasItinerary ? result.itinerary.length : 0;
      const hasActivities = hasItinerary && result.itinerary.some(day =>
        day.activities && day.activities.length > 0
      );

      console.log(`${colors.green}✓ Response received (${duration}ms)${colors.reset}`);
      console.log(`  Destination: ${hasDestination ? result.destination : 'NONE'}`);
      console.log(`  Days: ${dayCount}`);
      console.log(`  Has activities: ${hasActivities ? 'Yes' : 'No'}`);

      // Specific checks based on test case
      if (testCase.name === "No destination specified" && hasDestination) {
        console.log(`  ${colors.yellow}⚠ AI picked destination: ${result.destination}${colors.reset}`);
      }

      if (testCase.name === "No duration specified" && dayCount > 0) {
        console.log(`  ${colors.green}✓ AI defaulted to ${dayCount} days${colors.reset}`);
      }

      if (testCase.name === "Just one word" && result.destination?.toLowerCase().includes('london')) {
        console.log(`  ${colors.green}✓ Correctly interpreted as London${colors.reset}`);
      }

      if (testCase.name === "Extremely long duration" && dayCount > 30) {
        console.log(`  ${colors.red}✗ Generated ${dayCount} days (should cap at 30)${colors.reset}`);
      }

      if (testCase.name === "Zero days" && dayCount === 0) {
        console.log(`  ${colors.red}✗ Generated 0 days (should use default)${colors.reset}`);
      }

      return { success: true, result, duration };
    } else {
      console.log(`${colors.yellow}⚠ Received invalid response${colors.reset}`);
      return { success: false, error: 'Invalid response format', duration };
    }

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`${colors.red}✗ Error: ${error.message} (${duration}ms)${colors.reset}`);

    // Check if this is an expected error
    if (testCase.name === "Empty string" || testCase.name === "Special characters only") {
      console.log(`  ${colors.green}✓ Handled gracefully with error${colors.reset}`);
      return { success: true, error: error.message, duration };
    }

    return { success: false, error: error.message, duration };
  }
}

async function runAllTests() {
  console.log(`${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}AI Edge Case Testing${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}\n`);

  const results = {
    passed: 0,
    failed: 0,
    crashed: 0,
    details: [] as any[]
  };

  // Run tests sequentially to avoid rate limiting
  for (const testCase of testCases) {
    const result = await runTest(testCase);

    if (result.error && !result.success) {
      results.crashed++;
      results.details.push({ ...testCase, status: 'CRASHED', error: result.error });
    } else if (result.success) {
      results.passed++;
      results.details.push({ ...testCase, status: 'PASSED' });
    } else {
      results.failed++;
      results.details.push({ ...testCase, status: 'FAILED' });
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Print summary
  console.log(`\n${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}Test Summary${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`Total: ${testCases.length} tests`);
  console.log(`${colors.green}Handled: ${results.passed}${colors.reset}`);
  console.log(`${colors.yellow}Issues: ${results.failed}${colors.reset}`);
  console.log(`${colors.red}Crashed: ${results.crashed}${colors.reset}`);

  // Group by status
  console.log(`\n${colors.bright}Critical Issues:${colors.reset}`);
  results.details.filter(d => d.status === 'CRASHED').forEach(d => {
    console.log(`  ${colors.red}✗ ${d.name}: ${d.error}${colors.reset}`);
  });

  console.log(`\n${colors.bright}Handled Well:${colors.reset}`);
  results.details.filter(d => d.status === 'PASSED').forEach(d => {
    console.log(`  ${colors.green}✓ ${d.name}${colors.reset}`);
  });

  // Recommendations
  console.log(`\n${colors.bright}${colors.cyan}Recommendations:${colors.reset}`);
  console.log("1. Add input validation to handle empty/invalid inputs");
  console.log("2. Set default duration when not specified (e.g., 3 days)");
  console.log("3. Cap maximum duration at 30 days");
  console.log("4. Validate destination names against known places");
  console.log("5. Provide helpful error messages for unclear inputs");
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { runAllTests, testCases };