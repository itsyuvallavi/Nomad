#!/usr/bin/env tsx
/**
 * Parser Tests - Enhanced Dialog System
 * Tests traditional, AI, and hybrid parsing components
 */

import { parseDestinations } from '@/ai/utils/destination-parser';

interface TestCase {
  id: string;
  input: string;
  description: string;
  expectedDestinations: Array<{ city: string; days: number }>;
  expectedTotalDays: number;
  expectedOrigin?: string | null;
  shouldFail?: boolean;
}

interface TestResult {
  testId: string;
  input: string;
  passed: boolean;
  errors: string[];
  actualResult?: any;
  responseTime: number;
}

class ParserTester {
  private testCases: TestCase[] = [
    {
      id: 'lisbon_granada_original',
      input: '2 weeks in Lisbon and Granada, 10 days lisbon, 4 granada',
      description: 'Original Lisbon/Granada problem case',
      expectedDestinations: [
        { city: 'Lisbon', days: 10 },
        { city: 'Granada', days: 4 }
      ],
      expectedTotalDays: 14
    },
    {
      id: 'simple_london',
      input: '3 days in London',
      description: 'Simple single destination',
      expectedDestinations: [{ city: 'London', days: 3 }],
      expectedTotalDays: 3
    },
    {
      id: 'london_with_origin',
      input: '3 days in London from NYC',
      description: 'Single destination with origin',
      expectedDestinations: [{ city: 'London', days: 3 }],
      expectedTotalDays: 3,
      expectedOrigin: 'NYC'
    },
    {
      id: 'weekend_paris',
      input: 'weekend in Paris',
      description: 'Weekend duration parsing',
      expectedDestinations: [{ city: 'Paris', days: 2 }],
      expectedTotalDays: 2
    },
    {
      id: 'tokyo_kyoto',
      input: 'one week in Tokyo and 3 days in Kyoto',
      description: 'Multi-destination with week format',
      expectedDestinations: [
        { city: 'Tokyo', days: 7 },
        { city: 'Kyoto', days: 3 }
      ],
      expectedTotalDays: 10
    },
    {
      id: 'paris_rome_pattern',
      input: '5 days in Paris and 3 days in Rome',
      description: 'X days in City and Y days in City2 pattern',
      expectedDestinations: [
        { city: 'Paris', days: 5 },
        { city: 'Rome', days: 3 }
      ],
      expectedTotalDays: 8
    },
    {
      id: 'empty_input',
      input: '',
      description: 'Empty input should fail gracefully',
      expectedDestinations: [],
      expectedTotalDays: 0,
      shouldFail: false // Should return empty result, not fail
    },
    {
      id: 'invalid_city',
      input: '3 days in XYZ123',
      description: 'Invalid city name',
      expectedDestinations: [],
      expectedTotalDays: 0,
      shouldFail: false // Should return empty result
    }
  ];

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Parser Tests...\n');
    
    const results: TestResult[] = [];
    
    for (const testCase of this.testCases) {
      console.log(`Testing: ${testCase.description}`);
      const result = await this.runSingleTest(testCase);
      results.push(result);
      
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} - ${result.responseTime}ms`);
      
      if (!result.passed) {
        console.log(`Errors: ${result.errors.join(', ')}\n`);
      } else {
        console.log('');
      }
    }

    this.printSummary(results);
  }

  async runSingleTest(testCase: TestCase): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      console.log(`   Input: "${testCase.input}"`);
      console.log(`   Expected: ${testCase.expectedDestinations.map(d => `${d.city}(${d.days}d)`).join(', ')} - Total: ${testCase.expectedTotalDays} days`);
      
      // Call the parser
      const result = parseDestinations(testCase.input);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log(`   Actual: ${result.destinations.map(d => `${d.name}(${d.duration}d)`).join(', ')} - Total: ${result.totalDays} days`);
      if (result.origin) {
        console.log(`   Origin: ${result.origin}`);
      }
      
      // Validate the result
      const validation = this.validateResult(result, testCase);
      
      return {
        testId: testCase.id,
        input: testCase.input,
        passed: validation.passed,
        errors: validation.errors,
        actualResult: result,
        responseTime
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`   ❌ Error: ${errorMessage}`);
      
      return {
        testId: testCase.id,
        input: testCase.input,
        passed: false,
        errors: [`Error: ${errorMessage}`],
        responseTime: Date.now() - startTime
      };
    }
  }

  private validateResult(
    result: any,
    testCase: TestCase
  ): { passed: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check total days
    if (result.totalDays !== testCase.expectedTotalDays) {
      errors.push(`Expected ${testCase.expectedTotalDays} total days, got ${result.totalDays}`);
    }

    // Check number of destinations
    if (result.destinations.length !== testCase.expectedDestinations.length) {
      errors.push(`Expected ${testCase.expectedDestinations.length} destinations, got ${result.destinations.length}`);
    }

    // Check each destination
    for (const expectedDest of testCase.expectedDestinations) {
      const actualDest = result.destinations.find((d: any) => 
        d.name.toLowerCase().includes(expectedDest.city.toLowerCase()) ||
        expectedDest.city.toLowerCase().includes(d.name.toLowerCase())
      );
      
      if (!actualDest) {
        errors.push(`Missing destination: ${expectedDest.city}`);
      } else if (actualDest.duration !== expectedDest.days) {
        errors.push(`${expectedDest.city}: expected ${expectedDest.days} days, got ${actualDest.duration}`);
      }
    }

    // Check origin if specified
    if (testCase.expectedOrigin !== undefined) {
      if (result.origin !== testCase.expectedOrigin) {
        errors.push(`Expected origin "${testCase.expectedOrigin}", got "${result.origin}"`);
      }
    }

    return { passed: errors.length === 0, errors };
  }

  private printSummary(results: TestResult[]): void {
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const passRate = ((passed / total) * 100).toFixed(1);
    
    const avgResponseTime = Math.round(
      results.reduce((sum, r) => sum + r.responseTime, 0) / total
    );
    
    console.log('\n📊 PARSER TEST SUMMARY');
    console.log('======================');
    console.log(`Pass Rate: ${passed}/${total} (${passRate}%)`);
    console.log(`Average Response Time: ${avgResponseTime}ms`);
    
    // Show failed tests
    const failed = results.filter(r => !r.passed);
    if (failed.length > 0) {
      console.log('\n❌ Failed Tests:');
      failed.forEach(result => {
        console.log(`- ${result.testId}: ${result.errors.join(', ')}`);
      });
    } else {
      console.log('\n✅ All parser tests passed!');
    }
    
    // Performance check
    if (avgResponseTime > 100) {
      console.log('\n⚠️  WARNING: Parser response time exceeds 100ms target');
    } else {
      console.log('\n✅ Parser performance is within target (<100ms)');
    }
  }
}

// Run the tests
async function main() {
  try {
    const tester = new ParserTester();
    await tester.runAllTests();
  } catch (error) {
    console.error('Fatal error running parser tests:', error);
    process.exit(1);
  }
}

// Only run if this is the main module
if (require.main === module) {
  main();
}

export { ParserTester };