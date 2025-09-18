/**
 * Complex AI Conversation Test Suite
 * Tests multi-turn conversations, edge cases, and absurd requests
 */

import { AIConversationController, ResponseType } from '../../src/services/ai/conversation/ai-conversation-controller';

// Color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

async function runTest(name: string, testFn: () => Promise<boolean>): Promise<TestResult> {
  const startTime = Date.now();
  try {
    console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.blue}${colors.bold}Running: ${name}${colors.reset}`);
    const passed = await testFn();
    const duration = Date.now() - startTime;

    if (passed) {
      console.log(`${colors.green}✓ PASSED${colors.reset} (${duration}ms)`);
    } else {
      console.log(`${colors.red}✗ FAILED${colors.reset} (${duration}ms)`);
    }

    return { name, passed, duration };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`${colors.red}✗ ERROR: ${error.message}${colors.reset} (${duration}ms)`);
    return { name, passed: false, duration, error: error.message };
  }
}

// Test 1: Vague Request with Follow-ups
async function testVagueConversation(): Promise<boolean> {
  const controller = new AIConversationController('test-vague');

  console.log(`${colors.dim}Turn 1: "I want to travel somewhere nice"${colors.reset}`);
  const response1 = await controller.processMessage("I want to travel somewhere nice");

  if (response1.type !== 'question') {
    console.log('  ❌ Should ask for destination');
    return false;
  }
  console.log(`  ✓ AI asks: "${response1.message?.substring(0, 50)}..."`);

  console.log(`${colors.dim}Turn 2: "Barcelona sounds good"${colors.reset}`);
  const response2 = await controller.processMessage("Barcelona sounds good");

  if (response2.type !== 'question' && response2.type !== 'itinerary') {
    console.log('  ❌ Should ask for duration or generate');
    return false;
  }
  console.log(`  ✓ AI response type: ${response2.type}`);

  if (response2.type === 'question') {
    console.log(`${colors.dim}Turn 3: "5 days next month"${colors.reset}`);
    const response3 = await controller.processMessage("5 days next month");

    const context = JSON.parse(response3.conversationContext || '{}');
    const hasBarcelona = context.data?.destination?.includes('Barcelona');
    const has5Days = context.data?.duration === 5;

    console.log(`  Destination extracted: ${hasBarcelona ? '✓' : '✗'}`);
    console.log(`  Duration extracted: ${has5Days ? '✓' : '✗'}`);

    return hasBarcelona && has5Days;
  }

  return true;
}

// Test 2: Absurd Request - Beach in Antarctica
async function testAntarcticaBeach(): Promise<boolean> {
  const controller = new AIConversationController('test-absurd');

  console.log(`${colors.dim}Request: "I want a beach vacation in Antarctica for 500 days"${colors.reset}`);
  const response = await controller.processMessage(
    "I want a beach vacation in Antarctica for 500 days"
  );

  const context = JSON.parse(response.conversationContext || '{}');
  const hasAntarctica = context.data?.destination?.includes('Antarctica');
  const has500Days = context.data?.duration === 500;

  console.log(`  Detected Antarctica: ${hasAntarctica ? '✓' : '✗'}`);
  console.log(`  Detected 500 days: ${has500Days ? '✓' : '✗'}`);
  console.log(`  Response type: ${response.type}`);

  // AI should either generate something creative or ask for clarification
  // Both are valid responses to an absurd request
  return response.type === 'itinerary' || response.type === 'question';
}

// Test 3: Ultra Long Multi-City Trip
async function testMegaTrip(): Promise<boolean> {
  const controller = new AIConversationController('test-mega');

  console.log(`${colors.dim}Request: 30-day trip across 10 cities${colors.reset}`);
  const response = await controller.processMessage(
    "I want to visit London, Paris, Rome, Barcelona, Amsterdam, Berlin, Prague, Vienna, Budapest, and Athens over 30 days"
  );

  const context = JSON.parse(response.conversationContext || '{}');
  const destination = context.data?.destination || '';
  const duration = context.data?.duration;

  // Count how many cities were detected
  const cities = ['London', 'Paris', 'Rome', 'Barcelona', 'Amsterdam',
                  'Berlin', 'Prague', 'Vienna', 'Budapest', 'Athens'];
  const detectedCities = cities.filter(city => destination.includes(city));

  console.log(`  Cities detected: ${detectedCities.length}/10`);
  console.log(`  Duration: ${duration} days`);
  console.log(`  Response type: ${response.type}`);

  // Should detect at least some cities and the duration
  return detectedCities.length >= 2 && duration === 30;
}

// Test 4: Change Mind Mid-Conversation
async function testChangingMind(): Promise<boolean> {
  const controller = new AIConversationController('test-change');

  console.log(`${colors.dim}Turn 1: "I want to go to Paris for a week"${colors.reset}`);
  const response1 = await controller.processMessage("I want to go to Paris for a week");
  console.log(`  Response type: ${response1.type}`);

  console.log(`${colors.dim}Turn 2: "Actually, make it Rome for 10 days instead"${colors.reset}`);
  const response2 = await controller.processMessage("Actually, make it Rome for 10 days instead");

  const context = JSON.parse(response2.conversationContext || '{}');
  const hasRome = context.data?.destination?.includes('Rome');
  const has10Days = context.data?.duration === 10;
  const noParis = !context.data?.destination?.includes('Paris');

  console.log(`  Changed to Rome: ${hasRome ? '✓' : '✗'}`);
  console.log(`  Changed to 10 days: ${has10Days ? '✓' : '✗'}`);
  console.log(`  Paris removed: ${noParis ? '✓' : '✗'}`);

  return hasRome && has10Days;
}

// Test 5: Minimal Input - Just a City Name
async function testMinimalInput(): Promise<boolean> {
  const controller = new AIConversationController('test-minimal');

  console.log(`${colors.dim}Message: "Tokyo"${colors.reset}`);
  const response = await controller.processMessage("Tokyo");

  const context = JSON.parse(response.conversationContext || '{}');
  const hasTokyo = context.data?.destination?.includes('Tokyo');

  console.log(`  Detected Tokyo: ${hasTokyo ? '✓' : '✗'}`);
  console.log(`  Response type: ${response.type}`);
  console.log(`  Awaiting: ${response.awaitingInput}`);

  // Should understand Tokyo as destination and ask for more info
  return hasTokyo && response.type === 'question';
}

// Test 6: Business Trip with Specific Needs
async function testBusinessTrip(): Promise<boolean> {
  const controller = new AIConversationController('test-business');

  console.log(`${colors.dim}Request: Business trip with coworking needs${colors.reset}`);
  const response = await controller.processMessage(
    "I need a 5-day business trip to Singapore with coworking spaces"
  );

  const context = JSON.parse(response.conversationContext || '{}');
  const hasSingapore = context.data?.destination?.includes('Singapore');
  const has5Days = context.data?.duration === 5;
  const hasCoworking = context.data?.preferences?.needsCoworking === true ||
                       context.data?.preferences?.tripType === 'workation' ||
                       context.data?.preferences?.tripType === 'business';

  console.log(`  Singapore detected: ${hasSingapore ? '✓' : '✗'}`);
  console.log(`  5 days detected: ${has5Days ? '✓' : '✗'}`);
  console.log(`  Business/coworking detected: ${hasCoworking ? '✓' : '✗'}`);

  return hasSingapore && has5Days;
}

// Test 7: Weekend Trip
async function testWeekendTrip(): Promise<boolean> {
  const controller = new AIConversationController('test-weekend');

  console.log(`${colors.dim}Request: "Weekend in Amsterdam"${colors.reset}`);
  const response = await controller.processMessage("Weekend in Amsterdam");

  const context = JSON.parse(response.conversationContext || '{}');
  const hasAmsterdam = context.data?.destination?.includes('Amsterdam');
  const duration = context.data?.duration;
  const isWeekendDuration = duration === 2 || duration === 3;

  console.log(`  Amsterdam detected: ${hasAmsterdam ? '✓' : '✗'}`);
  console.log(`  Weekend duration (2-3 days): ${isWeekendDuration ? '✓' : '✗'} (got ${duration})`);

  return hasAmsterdam && (isWeekendDuration || response.type === 'question');
}

// Test 8: Gibberish/Unclear Request
async function testGibberish(): Promise<boolean> {
  const controller = new AIConversationController('test-gibberish');

  console.log(`${colors.dim}Request: "asdfghjkl qwerty"${colors.reset}`);
  const response = await controller.processMessage("asdfghjkl qwerty");

  console.log(`  Response type: ${response.type}`);
  console.log(`  Is asking for clarification: ${response.type === 'question' ? '✓' : '✗'}`);

  // Should ask for clarification on gibberish
  return response.type === 'question';
}

// Test 9: Same Day Trip (Edge Case)
async function testSameDayTrip(): Promise<boolean> {
  const controller = new AIConversationController('test-same-day');

  console.log(`${colors.dim}Request: "Day trip to Brighton"${colors.reset}`);
  const response = await controller.processMessage("Day trip to Brighton");

  const context = JSON.parse(response.conversationContext || '{}');
  const hasBrighton = context.data?.destination?.includes('Brighton');
  const duration = context.data?.duration;

  console.log(`  Brighton detected: ${hasBrighton ? '✓' : '✗'}`);
  console.log(`  Duration: ${duration} day(s)`);

  return hasBrighton && (duration === 1 || response.type === 'question');
}

// Test 10: Emoji and Special Characters
async function testEmojiRequest(): Promise<boolean> {
  const controller = new AIConversationController('test-emoji');

  console.log(`${colors.dim}Request: "🏖️ Beach trip to 🇪🇸 Spain for 7️⃣ days"${colors.reset}`);
  const response = await controller.processMessage("🏖️ Beach trip to 🇪🇸 Spain for 7️⃣ days");

  const context = JSON.parse(response.conversationContext || '{}');
  const hasSpain = context.data?.destination?.includes('Spain');
  const has7Days = context.data?.duration === 7;

  console.log(`  Spain detected: ${hasSpain ? '✓' : '✗'}`);
  console.log(`  7 days detected: ${has7Days ? '✓' : '✗'}`);

  return hasSpain || has7Days || response.type === 'question';
}

// Main test runner
async function runAllTests() {
  console.log(`\n${colors.bold}🧪 Complex AI Conversation Test Suite${colors.reset}`);
  console.log('Testing edge cases, multi-turn conversations, and absurd requests\n');

  const tests = [
    { name: '1. Vague Multi-Turn Conversation', fn: testVagueConversation },
    { name: '2. Absurd Request (Antarctica Beach)', fn: testAntarcticaBeach },
    { name: '3. Mega 10-City 30-Day Trip', fn: testMegaTrip },
    { name: '4. Changing Mind Mid-Conversation', fn: testChangingMind },
    { name: '5. Minimal Input (Just City Name)', fn: testMinimalInput },
    { name: '6. Business Trip with Coworking', fn: testBusinessTrip },
    { name: '7. Weekend Trip Detection', fn: testWeekendTrip },
    { name: '8. Gibberish/Unclear Request', fn: testGibberish },
    { name: '9. Same Day Trip Edge Case', fn: testSameDayTrip },
    { name: '10. Emoji and Special Characters', fn: testEmojiRequest }
  ];

  const results: TestResult[] = [];

  for (const test of tests) {
    const result = await runTest(test.name, test.fn);
    results.push(result);
  }

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log(`\n${colors.bold}Test Summary:${colors.reset}`);

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

  results.forEach(r => {
    const icon = r.passed ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    console.log(`  ${icon} ${r.name} (${r.duration}ms)`);
    if (r.error) {
      console.log(`     ${colors.red}Error: ${r.error}${colors.reset}`);
    }
  });

  console.log(`\n${colors.bold}Results:${colors.reset}`);
  console.log(`  Passed: ${colors.green}${passed}${colors.reset}`);
  console.log(`  Failed: ${colors.red}${failed}${colors.reset}`);
  console.log(`  Total time: ${totalTime}ms`);

  const successRate = (passed / tests.length * 100).toFixed(1);
  const rateColor = passed === tests.length ? colors.green :
                    passed >= tests.length * 0.7 ? colors.yellow : colors.red;

  console.log(`  Success rate: ${rateColor}${successRate}%${colors.reset}`);

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
console.log(`${colors.dim}Initializing AI...${colors.reset}`);
runAllTests().catch(error => {
  console.error(`\n${colors.red}Fatal error running tests:${colors.reset}`, error);
  process.exit(1);
});