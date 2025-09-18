/**
 * Simple AI Test Suite
 * Tests core AI functionality after recent fixes
 */

import { AIConversationController } from '../../src/services/ai/conversation/ai-conversation-controller';
import { generateConversationalItinerary } from '../../src/services/ai/utils/conversational-generator';
import { understandTripIntent } from '../../src/services/ai/utils/intent-understanding';

// Color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
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
    console.log(`\n${colors.blue}Running: ${name}${colors.reset}`);
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

// Test 1: Basic Destination Extraction
async function testBasicExtraction(): Promise<boolean> {
  const controller = new AIConversationController('test-basic');

  const response = await controller.processMessage(
    "I want to go to Paris for 5 days"
  );

  // Check if destination and duration were extracted
  const context = JSON.parse(response.conversationContext || '{}');
  const hasDestination = context.data?.destination === 'Paris';
  const hasDuration = context.data?.duration === 5;

  console.log('  Extracted destination:', context.data?.destination || 'none');
  console.log('  Extracted duration:', context.data?.duration || 'none');

  return hasDestination && hasDuration;
}

// Test 2: Simple London Trip
async function testSimpleLondonTrip(): Promise<boolean> {
  const controller = new AIConversationController('test-london');

  const response = await controller.processMessage("3 days in London");

  // Should either generate an itinerary or ask for minimal clarification
  const isItinerary = response.type === 'itinerary';
  const isQuestion = response.type === 'question';

  console.log('  Response type:', response.type);
  console.log('  Awaiting input:', response.awaitingInput);
  console.log('  Has itinerary:', !!response.itinerary);

  // Either generating or asking for more info is correct behavior
  // The AI being cautious and asking questions is GOOD
  return isItinerary || isQuestion;
}

// Test 3: Multi-City Trip
async function testMultiCityTrip(): Promise<boolean> {
  try {
    const intent = await understandTripIntent(
      "I want to visit London and Paris for 7 days",
      ""
    );

    console.log('  Detected location:', intent.location);
    console.log('  Detected duration:', intent.duration);

    // Should extract both cities
    const hasLondonParis = !!(intent.location?.includes('London') && intent.location?.includes('Paris'));
    const hasDuration = intent.duration === 7;

    return hasLondonParis && hasDuration;
  } catch (error) {
    console.error('  Error:', error);
    return false;
  }
}

// Test 4: Intent Understanding Basics
async function testIntentUnderstanding(): Promise<boolean> {
  const intent = await understandTripIntent(
    "5 day Barcelona trip for business",
    ""
  );

  console.log('  Location:', intent.location);
  console.log('  Duration:', intent.duration);
  console.log('  Trip type:', intent.tripType);

  return intent.location === 'Barcelona' &&
         intent.duration === 5 &&
         intent.tripType === 'business';
}

// Test 5: Quick Itinerary Generation
async function testQuickGeneration(): Promise<boolean> {
  try {
    console.log('  Generating 3-day Paris itinerary...');
    const itinerary = await generateConversationalItinerary(
      "3 days in Paris",
      ""
    );

    const hasItinerary = itinerary.itinerary && itinerary.itinerary.length === 3;
    const hasTitle = !!itinerary.title;

    console.log('  Days generated:', itinerary.itinerary?.length || 0);
    console.log('  Has title:', hasTitle);

    return hasItinerary && hasTitle;
  } catch (error: any) {
    console.error('  Generation error:', error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log(`\n${colors.bold}🧪 Simple AI Test Suite${colors.reset}`);
  console.log('Testing core AI functionality after fixes\n');
  console.log('=' .repeat(50));

  const tests = [
    { name: '1. Basic Extraction', fn: testBasicExtraction },
    { name: '2. Simple London Trip', fn: testSimpleLondonTrip },
    { name: '3. Multi-City Trip Understanding', fn: testMultiCityTrip },
    { name: '4. Intent Understanding', fn: testIntentUnderstanding },
    { name: '5. Quick Itinerary Generation', fn: testQuickGeneration }
  ];

  const results: TestResult[] = [];

  for (const test of tests) {
    const result = await runTest(test.name, test.fn);
    results.push(result);
  }

  // Summary
  console.log('\n' + '=' .repeat(50));
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
                    passed > tests.length / 2 ? colors.yellow : colors.red;

  console.log(`  Success rate: ${rateColor}${successRate}%${colors.reset}`);

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error(`\n${colors.red}Fatal error running tests:${colors.reset}`, error);
  process.exit(1);
});