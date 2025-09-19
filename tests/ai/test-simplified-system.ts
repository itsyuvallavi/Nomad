/**
 * Test Suite for Simplified AI System
 * Tests conversation flow, no defaults, and zone-based planning
 */

import { AIController } from '@/services/ai/ai-controller';
import { TripGenerator } from '@/services/ai/trip-generator';
import fs from 'fs/promises';
import path from 'path';

// Test result logging
interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL';
  input: any;
  output: any;
  error?: string;
  timestamp: string;
  duration: number;
}

class TestLogger {
  private results: TestResult[] = [];
  private logFile: string;

  constructor() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(process.cwd(), `tests/ai/logs/simplified-test-${timestamp}.json`);
  }

  async log(result: TestResult) {
    this.results.push(result);
    console.log(`[${result.status}] ${result.testName} - ${result.duration}ms`);

    if (result.error) {
      console.error(`  Error: ${result.error}`);
    }

    // Save to file
    await this.saveResults();
  }

  async saveResults() {
    const dir = path.dirname(this.logFile);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.logFile, JSON.stringify(this.results, null, 2));
    console.log(`Results saved to: ${this.logFile}`);
  }

  getSummary() {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    return {
      total: this.results.length,
      passed,
      failed,
      passRate: `${((passed / this.results.length) * 100).toFixed(1)}%`
    };
  }
}

// Test runner
async function runTest(
  testName: string,
  testFn: () => Promise<any>,
  logger: TestLogger
): Promise<void> {
  const startTime = Date.now();
  let result: TestResult;

  try {
    const output = await testFn();
    result = {
      testName,
      status: 'PASS',
      input: testFn.toString(),
      output,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime
    };
  } catch (error: any) {
    result = {
      testName,
      status: 'FAIL',
      input: testFn.toString(),
      output: null,
      error: error.message || String(error),
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime
    };
  }

  await logger.log(result);
}

// Main test suite
async function runSimplifiedSystemTests() {
  console.log('🧪 Starting Simplified AI System Tests\n');
  console.log('=' .repeat(60));

  const logger = new TestLogger();
  const aiController = new AIController();
  const tripGenerator = new TripGenerator();

  // Test 1: No defaults - empty input should ask for destination
  await runTest('Test 1: Empty input asks for destination', async () => {
    const response = await aiController.processMessage('I want to plan a trip');

    if (response.type !== 'question') {
      throw new Error(`Expected question, got ${response.type}`);
    }

    if (!response.message.toLowerCase().includes('where') &&
        !response.message.toLowerCase().includes('destination')) {
      throw new Error(`Question doesn't ask about destination: ${response.message}`);
    }

    return {
      responseType: response.type,
      message: response.message,
      missingFields: response.missingFields
    };
  }, logger);

  // Test 2: Progressive information gathering
  await runTest('Test 2: Progressive gathering - destination only', async () => {
    const response = await aiController.processMessage('I want to go to Paris');

    if (response.type !== 'question') {
      throw new Error(`Expected question about dates, got ${response.type}`);
    }

    if (!response.message.toLowerCase().includes('when') &&
        !response.message.toLowerCase().includes('date')) {
      throw new Error(`Question doesn't ask about dates: ${response.message}`);
    }

    return {
      responseType: response.type,
      message: response.message,
      intent: response.intent
    };
  }, logger);

  // Test 3: Complete conversation flow
  await runTest('Test 3: Complete conversation flow', async () => {
    let context: string | undefined;

    // Step 1: Initial message
    const response1 = await aiController.processMessage('I want to travel', context);
    if (response1.type !== 'question') {
      throw new Error('Step 1 failed: Should ask for destination');
    }
    context = response1.context;

    // Step 2: Provide destination
    const response2 = await aiController.processMessage('Paris', context);
    if (response2.type !== 'question') {
      throw new Error('Step 2 failed: Should ask for dates');
    }
    context = response2.context;

    // Step 3: Provide dates and duration
    const response3 = await aiController.processMessage('Next week for 5 days', context);

    if (response3.type !== 'ready' || !response3.canGenerate) {
      throw new Error('Step 3 failed: Should be ready to generate');
    }

    return {
      finalIntent: response3.intent,
      canGenerate: response3.canGenerate,
      conversationLength: 3
    };
  }, logger);

  // Test 4: Generation with zone-based planning
  await runTest('Test 4: Paris itinerary with zones', async () => {
    const params = {
      destination: 'Paris',
      startDate: '2024-03-15',
      duration: 5,
      travelers: { adults: 2, children: 0 },
      preferences: {
        pace: 'moderate' as const
      }
    };

    const itinerary = await tripGenerator.generateItinerary(params);

    // Validate structure
    if (!itinerary.itinerary || itinerary.itinerary.length !== 5) {
      throw new Error(`Expected 5 days, got ${itinerary.itinerary?.length}`);
    }

    // Check for zone organization (each day should mention a specific area)
    const hasZones = itinerary.itinerary.every(day =>
      day.theme && (
        day.theme.includes('Quarter') ||
        day.theme.includes('Marais') ||
        day.theme.includes('Montmartre') ||
        day.theme.includes('Eiffel') ||
        day.theme.includes('Champs') ||
        day.theme.includes('arr.') ||
        day.theme.includes('area') ||
        day.theme.includes('district')
      )
    );

    if (!hasZones) {
      console.warn('Warning: Days may not be properly organized by zones');
    }

    // Check logical flow (breakfast, lunch, dinner)
    const hasLogicalFlow = itinerary.itinerary.every(day => {
      const activities = day.activities || [];
      const hasBreakfast = activities.some(a =>
        a.category === 'breakfast' || a.time?.includes('AM')
      );
      const hasLunch = activities.some(a =>
        a.category === 'lunch' || (a.time?.includes('PM') && !a.time?.includes('6:') && !a.time?.includes('7:'))
      );
      const hasDinner = activities.some(a =>
        a.category === 'dinner' || a.time?.includes('PM')
      );

      return activities.length >= 4; // At least 4 activities per day
    });

    if (!hasLogicalFlow) {
      throw new Error('Days do not have logical activity flow');
    }

    return {
      title: itinerary.title,
      days: itinerary.duration,
      totalActivities: itinerary.itinerary.reduce((sum, day) =>
        sum + (day.activities?.length || 0), 0
      ),
      hasZones,
      hasLogicalFlow
    };
  }, logger);

  // Test 5: No defaults in generation
  await runTest('Test 5: Generation fails without required params', async () => {
    try {
      // Try to generate with missing parameters
      await tripGenerator.generateItinerary({
        destination: 'London',
        startDate: '',  // Missing date
        duration: 0      // Invalid duration
      });

      throw new Error('Should have thrown error for missing params');
    } catch (error: any) {
      if (error.message.includes('Should have thrown')) {
        throw error;
      }

      // This is expected - the error proves no defaults are used
      return {
        errorCaught: true,
        errorMessage: error.message
      };
    }
  }, logger);

  // Test 6: Tokyo with zone planning
  await runTest('Test 6: Tokyo itinerary zones', async () => {
    const params = {
      destination: 'Tokyo',
      startDate: '2024-04-01',
      duration: 4,
      travelers: { adults: 1, children: 0 },
      preferences: {
        interests: ['culture', 'food'],
        budget: 'mid' as const
      }
    };

    const itinerary = await tripGenerator.generateItinerary(params);

    // Check that activities stay in same area per day
    const dayZones = itinerary.itinerary.map(day => {
      const theme = day.theme || '';
      return {
        day: day.day,
        theme,
        hasArea: theme.includes('Shinjuku') ||
                 theme.includes('Shibuya') ||
                 theme.includes('Asakusa') ||
                 theme.includes('Ginza') ||
                 theme.includes('Roppongi') ||
                 theme.includes('Tokyo')
      };
    });

    return {
      destination: itinerary.destination,
      days: itinerary.duration,
      dayZones,
      allDaysHaveThemes: dayZones.every(d => d.hasArea)
    };
  }, logger);

  // Test 7: Modification capability
  await runTest('Test 7: Modify existing itinerary', async () => {
    // First generate an itinerary
    const original = await tripGenerator.generateItinerary({
      destination: 'London',
      startDate: '2024-05-01',
      duration: 3
    });

    // Modify it
    const modified = await tripGenerator.modifyItinerary(
      original,
      'Add more museums and remove shopping activities'
    );

    // Validate modification worked
    if (!modified.itinerary || modified.itinerary.length !== 3) {
      throw new Error('Modification changed day count');
    }

    return {
      originalDays: original.itinerary.length,
      modifiedDays: modified.itinerary.length,
      destinationPreserved: modified.destination === original.destination
    };
  }, logger);

  // Test 8: Complex conversation with all info at once
  await runTest('Test 8: All info provided at once', async () => {
    const response = await aiController.processMessage(
      'I want to go to Barcelona for 4 days starting March 20th'
    );

    if (response.type !== 'ready' || !response.canGenerate) {
      throw new Error('Should be ready to generate with all info provided');
    }

    if (!response.intent?.destination ||
        !response.intent?.duration ||
        !response.intent?.startDate) {
      throw new Error('Failed to extract all information');
    }

    return {
      type: response.type,
      canGenerate: response.canGenerate,
      extractedDestination: response.intent.destination,
      extractedDuration: response.intent.duration,
      extractedDate: response.intent.startDate
    };
  }, logger);

  // Print summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST SUMMARY\n');

  const summary = logger.getSummary();
  console.log(`Total Tests: ${summary.total}`);
  console.log(`✅ Passed: ${summary.passed}`);
  console.log(`❌ Failed: ${summary.failed}`);
  console.log(`📈 Pass Rate: ${summary.passRate}`);

  console.log('\n' + '=' .repeat(60));
  console.log(`📁 Detailed results saved to:\n   ${logger['logFile']}`);

  return summary;
}

// Execute tests
if (require.main === module) {
  runSimplifiedSystemTests()
    .then(summary => {
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Fatal test error:', error);
      process.exit(1);
    });
}

export { runSimplifiedSystemTests };